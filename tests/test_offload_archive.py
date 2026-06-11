"""Slice D — single-archive transfer (SSH/rsync-free).

archive_source_package / unpack_source_archive + the CLI and the Streamlit
display-only command helper. No network / model / Sanity / Supabase. Archives
are tar.gz + a sha256 sidecar; the original is never deleted on archive and the
archive is never deleted on unpack.
"""
from __future__ import annotations

import hashlib
import io
import re
import sys
import tarfile
from pathlib import Path

import pytest
from typer.testing import CliRunner

import runner.app as app_mod
from runner import main
from runner.pipeline.offload_source import (
    SourceItemSpec,
    archive_source_package,
    build_source_package,
    inspect_source_archive,
    load_source_manifest,
    move_source_package_state,
    unpack_source_archive,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _build_inbox(tmp_path, package_id="pkg-d"):
    root = tmp_path / "source_offload"
    spec = SourceItemSpec(source_kind="url", declared_source_type="url", doc_id="d1",
                          url="https://example.org/a", queue_item_id="q1", url_hash="h1")
    build_source_package(specs=[spec], source_offload_root=root, package_id=package_id)
    return root, root / "inbox" / package_id


def _craft_archive(path: Path, members: dict, *, valid_sha=True, special=None):
    """Write a tar.gz with the given {name: bytes} members (+ optional special
    TarInfo), and a sha256 sidecar (correct unless valid_sha=False)."""
    with tarfile.open(path, "w:gz") as t:
        for name, data in members.items():
            ti = tarfile.TarInfo(name)
            ti.size = len(data)
            t.addfile(ti, io.BytesIO(data))
        if special is not None:
            t.addfile(special)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if not valid_sha:
        digest = "0" * 64
    Path(str(path) + ".sha256").write_text(f"{digest}  {path.name}\n", encoding="utf-8")


# ---------------------------------------------------------------------------
# Roundtrip
# ---------------------------------------------------------------------------

def test_archive_unpack_roundtrip(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    res = archive_source_package(pkg, output_dir=tmp_path / "out")
    assert Path(res["archive_path"]).is_file()
    assert Path(res["sha256_path"]).is_file()
    assert res["warnings"] == []
    assert pkg.is_dir()  # original never deleted

    dest_root = tmp_path / "dest"
    out = unpack_source_archive(res["archive_path"], source_offload_root=dest_root)
    assert out["state"] == "inbox"
    assert out["verify"]["ok"] is True
    unpacked = Path(out["package_dir"])
    assert unpacked == dest_root / "inbox" / "pkg-d"
    m = load_source_manifest(unpacked)
    assert m.package_id == "pkg-d" and m.lifecycle_state == "inbox" and len(m.items) == 1
    assert Path(res["archive_path"]).is_file()  # archive never deleted on unpack


def test_archive_default_output_dir_is_state_folder(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    res = archive_source_package(pkg)  # no output_dir
    assert Path(res["archive_path"]) == root / "inbox" / "pkg-d.tar.gz"


# ---------------------------------------------------------------------------
# Checksum
# ---------------------------------------------------------------------------

def test_checksum_mismatch_refused(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    res = archive_source_package(pkg, output_dir=tmp_path / "out")
    Path(res["sha256_path"]).write_text("0" * 64 + "  pkg-d.tar.gz\n", encoding="utf-8")
    with pytest.raises(ValueError, match="checksum_mismatch"):
        unpack_source_archive(res["archive_path"], source_offload_root=tmp_path / "dest")


def test_missing_sidecar_refused(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    res = archive_source_package(pkg, output_dir=tmp_path / "out")
    Path(res["sha256_path"]).unlink()
    with pytest.raises(ValueError, match="missing checksum sidecar"):
        inspect_source_archive(res["archive_path"])


def test_malformed_checksum_sidecar_refused(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    res = archive_source_package(pkg, output_dir=tmp_path / "out")
    Path(res["sha256_path"]).write_text("not-a-digest\n", encoding="utf-8")
    with pytest.raises(ValueError, match="malformed checksum"):
        inspect_source_archive(res["archive_path"])


# ---------------------------------------------------------------------------
# Malformed / hostile archives refused
# ---------------------------------------------------------------------------

def test_path_traversal_refused(tmp_path):
    arc = tmp_path / "evil.tar.gz"
    _craft_archive(arc, {"../evil.txt": b"x", "evilpkg/source_manifest.json": b"{}"})
    with pytest.raises(ValueError, match="path traversal"):
        inspect_source_archive(arc)


def test_absolute_path_refused(tmp_path):
    arc = tmp_path / "abs.tar.gz"
    _craft_archive(arc, {"/etc/passwd": b"x", "evilpkg/source_manifest.json": b"{}"})
    with pytest.raises(ValueError, match="absolute path"):
        inspect_source_archive(arc)


def test_symlink_member_refused(tmp_path):
    arc = tmp_path / "sym.tar.gz"
    link = tarfile.TarInfo("evilpkg/link")
    link.type = tarfile.SYMTYPE
    link.linkname = "/etc/passwd"
    _craft_archive(arc, {"evilpkg/source_manifest.json": b"{}"}, special=link)
    with pytest.raises(ValueError, match="unsupported archive member type"):
        inspect_source_archive(arc)


def test_multiple_top_level_dirs_refused(tmp_path):
    arc = tmp_path / "multi.tar.gz"
    _craft_archive(arc, {"a/source_manifest.json": b"{}", "b/x.txt": b"y"})
    with pytest.raises(ValueError, match="exactly one top-level"):
        inspect_source_archive(arc)


def test_missing_manifest_in_archive_refused(tmp_path):
    arc = tmp_path / "nomani.tar.gz"
    _craft_archive(arc, {"goodpkg/other.txt": b"x"})
    with pytest.raises(ValueError, match="missing goodpkg/source_manifest.json"):
        inspect_source_archive(arc)


# ---------------------------------------------------------------------------
# Overwrite + lifecycle state
# ---------------------------------------------------------------------------

def test_unpack_refuses_overwrite(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    res = archive_source_package(pkg, output_dir=tmp_path / "out")
    dest_root = tmp_path / "dest"
    unpack_source_archive(res["archive_path"], source_offload_root=dest_root)
    with pytest.raises(FileExistsError):
        unpack_source_archive(res["archive_path"], source_offload_root=dest_root)


def test_state_override_reconciles_manifest(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    res = archive_source_package(pkg, output_dir=tmp_path / "out")
    dest_root = tmp_path / "dest"
    out = unpack_source_archive(res["archive_path"], source_offload_root=dest_root, state="outbox")
    assert out["state"] == "outbox"
    unpacked = Path(out["package_dir"])
    assert unpacked == dest_root / "outbox" / "pkg-d"
    assert load_source_manifest(unpacked).lifecycle_state == "outbox"
    assert out["verify"]["ok"] is True  # folder/manifest consistent


def test_invalid_state_refused(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    res = archive_source_package(pkg, output_dir=tmp_path / "out")
    with pytest.raises(ValueError, match="invalid lifecycle state"):
        unpack_source_archive(res["archive_path"], source_offload_root=tmp_path / "dest",
                              state="nonsense")


def test_outbox_ingest_result_archive_roundtrips(tmp_path):
    """An outbox package carrying worker-owned siblings (docs/, result_manifest)
    archives and unpacks; post-unpack verify tolerates the siblings."""
    root, pkg = _build_inbox(tmp_path)
    move_source_package_state(offload_root=root, package_id="pkg-d",
                              from_state="inbox", to_state="processing")
    outbox = move_source_package_state(offload_root=root, package_id="pkg-d",
                                       from_state="processing", to_state="outbox")
    (outbox / "docs" / "d1").mkdir(parents=True)
    (outbox / "docs" / "d1" / "analysis.json").write_text("{}", encoding="utf-8")
    (outbox / "result_manifest.json").write_text("{}", encoding="utf-8")

    res = archive_source_package(outbox, output_dir=tmp_path / "out")
    dest_root = tmp_path / "dest"
    out = unpack_source_archive(res["archive_path"], source_offload_root=dest_root)
    assert out["state"] == "outbox"
    assert out["verify"]["ok"] is True
    assert (Path(out["package_dir"]) / "docs" / "d1" / "analysis.json").is_file()


def test_archive_refuses_existing_archive(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    archive_source_package(pkg, output_dir=tmp_path / "out")
    with pytest.raises(FileExistsError):
        archive_source_package(pkg, output_dir=tmp_path / "out")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def test_cli_archive_and_unpack(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    out_dir = tmp_path / "out"
    r1 = CliRunner().invoke(main.app, ["source-offload-archive", str(pkg),
                                       "--output-dir", str(out_dir)])
    assert r1.exit_code == 0, r1.output
    archive = out_dir / "pkg-d.tar.gz"
    assert archive.is_file() and (out_dir / "pkg-d.tar.gz.sha256").is_file()

    dest_root = tmp_path / "dest" / "source_offload"
    r2 = CliRunner().invoke(main.app, ["source-offload-unpack", str(archive),
                                       "--source-offload-root", str(dest_root)])
    assert r2.exit_code == 0, r2.output
    assert (dest_root / "inbox" / "pkg-d" / "source_manifest.json").is_file()


def test_cli_unpack_checksum_mismatch_exit1(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    out_dir = tmp_path / "out"
    CliRunner().invoke(main.app, ["source-offload-archive", str(pkg), "--output-dir", str(out_dir)])
    (out_dir / "pkg-d.tar.gz.sha256").write_text("0" * 64 + "  pkg-d.tar.gz\n", encoding="utf-8")
    r = CliRunner().invoke(main.app, ["source-offload-unpack", str(out_dir / "pkg-d.tar.gz"),
                                      "--source-offload-root", str(tmp_path / "dest")])
    assert r.exit_code == 1
    assert "checksum_mismatch" in r.output


# ---------------------------------------------------------------------------
# Streamlit display-only command helper
# ---------------------------------------------------------------------------

def test_archive_commands_use_venv_python_and_are_display_only(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    cmds = app_mod._source_offload_archive_commands(
        pkg, "/Users/cdn-ai/sogice-offload",
        local_python="/repo/.venv/bin/python",
        mac_python="/Users/cdn-ai/repo/.venv/bin/python",
    )
    assert cmds["archive_local"].startswith("/repo/.venv/bin/python -m runner source-offload-archive ")
    assert cmds["unpack_remote_inbox"].startswith(
        "/Users/cdn-ai/repo/.venv/bin/python -m runner source-offload-unpack ")
    assert "--state inbox" in cmds["unpack_remote_inbox"]
    assert cmds["archive_remote_outbox"].endswith("/outbox/pkg-d")
    assert "--state outbox" in cmds["unpack_local_outbox"]
    assert cmds["verify_checksum"].startswith("shasum -a 256 -c ")
    for c in cmds.values():
        assert "python3 -m runner" not in c


def test_archive_commands_default_local_python_is_sys_executable(tmp_path):
    root, pkg = _build_inbox(tmp_path)
    cmds = app_mod._source_offload_archive_commands(pkg, "/root")
    assert cmds["archive_local"].startswith(sys.executable + " -m runner source-offload-archive ")


def test_app_never_executes_archive_or_checksum_commands():
    text = Path(app_mod.__file__).read_text(encoding="utf-8")
    exec_re = re.compile(r"subprocess|Popen|os\.system|check_output|check_call|\.run\(")
    for line in text.splitlines():
        if "source-offload-archive" in line or "source-offload-unpack" in line or "shasum" in line:
            assert not exec_re.search(line), f"must not execute transfer command: {line.strip()}"
