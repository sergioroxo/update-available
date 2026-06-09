"""Slice S1 — source offload package builder + verifier tests.

All tests are local-only and side-effect-free:
  - no network, no model, no Sanity/Supabase calls
  - no live corpus writes
  - no source_queue.db mutation

Packages are built into ``tmp_path`` source-offload roots.
"""
from __future__ import annotations

import json
import stat
from pathlib import Path

import pytest
from typer.testing import CliRunner

from runner import main
from runner.pipeline import offload_source as src
from runner.pipeline.offload_source import (
    PACKAGE_KIND_SOURCE,
    SOURCE_SCHEMA_VERSION,
    SourceItemSpec,
    build_source_package,
    load_source_manifest,
    verify_source_package,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _url_spec(doc_id="urldoc01", url="https://example.org/a", **kw) -> SourceItemSpec:
    return SourceItemSpec(
        source_kind="url",
        declared_source_type="url",
        doc_id=doc_id,
        url=url,
        queue_item_id=kw.pop("queue_item_id", "qi_1"),
        url_hash=kw.pop("url_hash", "hash_1"),
        **kw,
    )


def _file_spec(tmp_path, doc_id="filedoc01", name="paper.pdf", content=b"%PDF-1.4 data") -> SourceItemSpec:
    p = tmp_path / name
    p.write_bytes(content)
    return SourceItemSpec(
        source_kind="file",
        declared_source_type="pdf",
        doc_id=doc_id,
        file_path=str(p),
    )


def _read_manifest(package_dir: Path) -> dict:
    return json.loads((package_dir / "source_manifest.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Builder — URL items
# ---------------------------------------------------------------------------

def test_url_item_package_has_no_blob_and_preserves_metadata(tmp_path):
    root = tmp_path / "source_offload"
    manifest = build_source_package(
        specs=[_url_spec(url="https://example.org/article", queue_item_id="qi_42", url_hash="abcd")],
        source_offload_root=root,
        package_id="source-test-url",
    )
    assert manifest.package_kind == PACKAGE_KIND_SOURCE
    assert manifest.schema_version == SOURCE_SCHEMA_VERSION
    assert manifest.lifecycle_state == "inbox"

    pkg = root / "inbox" / "source-test-url"
    item_dir = pkg / "items" / "urldoc01"
    # No blob written for URL items.
    assert not any(child.name.startswith("source.") for child in item_dir.iterdir())
    assert (item_dir / "source_item.json").is_file()

    rec = manifest.items[0]
    assert rec.source_kind == "url"
    assert rec.url == "https://example.org/article"
    assert rec.queue_item_id == "qi_42"
    assert rec.url_hash == "abcd"
    assert rec.relative_path == ""
    assert rec.sha256 == ""
    assert rec.bytes == 0

    # source_item.json carries the queue linkage.
    item = json.loads((item_dir / "source_item.json").read_text(encoding="utf-8"))
    assert item["queue_item_id"] == "qi_42"
    assert item["url"] == "https://example.org/article"
    assert item["source_blob"] == ""

    assert verify_source_package(pkg)["ok"] is True


# ---------------------------------------------------------------------------
# Builder — file items
# ---------------------------------------------------------------------------

def test_file_item_package_copies_blob_with_hash_and_bytes(tmp_path):
    root = tmp_path / "source_offload"
    content = b"%PDF-1.7 hello world payload"
    manifest = build_source_package(
        specs=[_file_spec(tmp_path, content=content)],
        source_offload_root=root,
        package_id="source-test-file",
    )
    pkg = root / "inbox" / "source-test-file"
    blob = pkg / "items" / "filedoc01" / "source.pdf"
    assert blob.is_file()
    assert blob.read_bytes() == content

    rec = manifest.items[0]
    assert rec.source_kind == "file"
    assert rec.relative_path == "items/filedoc01/source.pdf"
    assert rec.bytes == len(content)
    import hashlib
    assert rec.sha256 == hashlib.sha256(content).hexdigest()

    assert verify_source_package(pkg)["ok"] is True


def test_file_blob_and_records_are_owner_only(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(
        specs=[_file_spec(tmp_path)],
        source_offload_root=root,
        package_id="source-perms",
    )
    blob = root / "inbox" / "source-perms" / "items" / "filedoc01" / "source.pdf"
    manifest = root / "inbox" / "source-perms" / "source_manifest.json"
    # No group/other permission bits.
    assert (stat.S_IMODE(blob.stat().st_mode) & 0o077) == 0
    assert (stat.S_IMODE(manifest.stat().st_mode) & 0o077) == 0


def test_mixed_package_roundtrips_and_verifies(tmp_path):
    root = tmp_path / "source_offload"
    manifest = build_source_package(
        specs=[_url_spec(doc_id="u1"), _file_spec(tmp_path, doc_id="f1")],
        source_offload_root=root,
        package_id="source-mixed",
    )
    pkg = root / "inbox" / "source-mixed"
    loaded = load_source_manifest(pkg)
    assert {it.doc_id for it in loaded.items} == {"u1", "f1"}
    assert verify_source_package(pkg)["ok"] is True


# ---------------------------------------------------------------------------
# Builder — refusals (no partial package)
# ---------------------------------------------------------------------------

def test_unsafe_doc_id_rejected_without_partial_package(tmp_path):
    root = tmp_path / "source_offload"
    with pytest.raises(ValueError):
        build_source_package(
            specs=[_url_spec(doc_id="../evil")],
            source_offload_root=root,
            package_id="source-bad",
        )
    # Validation happens before any directory is created.
    inbox = root / "inbox"
    assert not inbox.exists() or not any(inbox.iterdir())


def test_missing_local_file_rejected_without_partial_package(tmp_path):
    root = tmp_path / "source_offload"
    spec = SourceItemSpec(
        source_kind="file",
        declared_source_type="pdf",
        doc_id="missing01",
        file_path=str(tmp_path / "does_not_exist.pdf"),
    )
    with pytest.raises(FileNotFoundError):
        build_source_package(specs=[spec], source_offload_root=root, package_id="source-missing")
    inbox = root / "inbox"
    assert not inbox.exists() or not any(inbox.iterdir())


def test_duplicate_doc_id_rejected(tmp_path):
    root = tmp_path / "source_offload"
    with pytest.raises(ValueError):
        build_source_package(
            specs=[_url_spec(doc_id="dup"), _url_spec(doc_id="dup", url="https://example.org/b")],
            source_offload_root=root,
            package_id="source-dup",
        )


def test_invalid_url_rejected(tmp_path):
    root = tmp_path / "source_offload"
    with pytest.raises(ValueError):
        build_source_package(
            specs=[_url_spec(url="ftp://nope")],
            source_offload_root=root,
            package_id="source-badurl",
        )


def test_existing_package_dir_refused(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec()], source_offload_root=root, package_id="source-dupdir")
    with pytest.raises(FileExistsError):
        build_source_package(specs=[_url_spec()], source_offload_root=root, package_id="source-dupdir")


def test_write_failure_removes_partial_package(tmp_path, monkeypatch):
    """If a blob copy fails mid-build, the partial package dir is removed."""
    root = tmp_path / "source_offload"

    def _boom(*_a, **_k):
        raise RuntimeError("disk full")

    monkeypatch.setattr(src.shutil, "copy2", _boom)
    with pytest.raises(RuntimeError):
        build_source_package(
            specs=[_file_spec(tmp_path)],
            source_offload_root=root,
            package_id="source-ioerr",
        )
    assert not (root / "inbox" / "source-ioerr").exists()


# ---------------------------------------------------------------------------
# Verifier — failure surfaces
# ---------------------------------------------------------------------------

def test_tampered_source_file_fails_verify(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_file_spec(tmp_path)], source_offload_root=root, package_id="source-tamper")
    pkg = root / "inbox" / "source-tamper"
    blob = pkg / "items" / "filedoc01" / "source.pdf"
    blob.write_bytes(b"tampered different bytes")  # change content + size

    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("blob_hash_mismatch" in e for e in report["errors"])


def test_missing_source_item_json_fails_verify(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec()], source_offload_root=root, package_id="source-noitem")
    pkg = root / "inbox" / "source-noitem"
    (pkg / "items" / "urldoc01" / "source_item.json").unlink()

    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("missing_source_item" in e for e in report["errors"])


def test_path_traversal_in_manifest_fails_verify(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_file_spec(tmp_path)], source_offload_root=root, package_id="source-traverse")
    pkg = root / "inbox" / "source-traverse"
    data = _read_manifest(pkg)
    data["items"][0]["relative_path"] = "../../../etc/passwd"
    (pkg / "source_manifest.json").write_text(json.dumps(data), encoding="utf-8")

    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("Unsafe manifest path" in e for e in report["errors"])


def test_unexpected_item_file_is_surfaced(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec()], source_offload_root=root, package_id="source-stray")
    pkg = root / "inbox" / "source-stray"
    (pkg / "items" / "urldoc01" / "stray.txt").write_text("oops", encoding="utf-8")

    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("stray.txt" in u for u in report["unexpected"])


def test_unexpected_item_dir_is_surfaced(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec()], source_offload_root=root, package_id="source-straydir")
    pkg = root / "inbox" / "source-straydir"
    (pkg / "items" / "ghostdoc").mkdir()

    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("ghostdoc" in u for u in report["unexpected"])


def test_unexpected_top_level_file_is_surfaced(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec()], source_offload_root=root, package_id="source-toplevel")
    pkg = root / "inbox" / "source-toplevel"
    (pkg / "transfer_ledger.json").write_text("{}", encoding="utf-8")

    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("transfer_ledger.json" in u for u in report["unexpected"])


def test_lifecycle_mismatch_is_flagged(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec()], source_offload_root=root, package_id="source-life")
    import shutil as _sh

    src_dir = root / "inbox" / "source-life"
    dst_dir = root / "processing" / "source-life"
    dst_dir.parent.mkdir(parents=True, exist_ok=True)
    _sh.move(str(src_dir), str(dst_dir))  # manifest still says inbox

    report = verify_source_package(dst_dir)
    assert report["ok"] is False
    assert any("lifecycle_mismatch" in e for e in report["errors"])


def test_missing_manifest_fails_verify(tmp_path):
    report = verify_source_package(tmp_path / "nope")
    assert report["ok"] is False
    assert "source_manifest_not_found" in report["errors"]


# ---------------------------------------------------------------------------
# Verifier — canonical item paths + manifest/record drift
# ---------------------------------------------------------------------------

def _rewrite_manifest(pkg: Path, mutate) -> None:
    data = _read_manifest(pkg)
    mutate(data)
    (pkg / "source_manifest.json").write_text(json.dumps(data), encoding="utf-8")


def _rehash_item_record(pkg: Path, doc_id: str) -> None:
    """Recompute the source_item.json hash into the manifest so only the field
    drift check (not the hash check) catches an edit."""
    rec_path = pkg / "items" / doc_id / "source_item.json"
    new_hash = src.sha256_file(rec_path)

    def _mut(data):
        for row in data["items"]:
            if row["doc_id"] == doc_id:
                row["item_record_sha256"] = new_hash

    _rewrite_manifest(pkg, _mut)


def test_valid_builder_package_passes_canonical_checks(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(
        specs=[_url_spec(doc_id="doca"), _file_spec(tmp_path, doc_id="docb")],
        source_offload_root=root,
        package_id="source-canon-ok",
    )
    pkg = root / "inbox" / "source-canon-ok"
    report = verify_source_package(pkg)
    assert report["ok"] is True, report["errors"] + report["unexpected"]


def test_noncanonical_item_record_path_fails_verify(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec(doc_id="doca")], source_offload_root=root, package_id="source-rec-path")
    pkg = root / "inbox" / "source-rec-path"

    def _mut(data):
        data["items"][0]["item_record_path"] = "items/docb/source_item.json"

    _rewrite_manifest(pkg, _mut)
    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("noncanonical_item_record_path" in e for e in report["errors"])


def test_blob_pointing_into_other_item_dir_fails_verify(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_file_spec(tmp_path, doc_id="doca")], source_offload_root=root, package_id="source-blob-path")
    pkg = root / "inbox" / "source-blob-path"

    def _mut(data):
        data["items"][0]["relative_path"] = "items/docb/source.pdf"

    _rewrite_manifest(pkg, _mut)
    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("blob_outside_item_dir" in e for e in report["errors"])


def test_noncanonical_blob_name_fails_verify(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_file_spec(tmp_path, doc_id="doca", name="paper.pdf")], source_offload_root=root, package_id="source-blob-name")
    pkg = root / "inbox" / "source-blob-name"
    # Rename the real blob and repoint the manifest so only the name rule fails.
    item_dir = pkg / "items" / "doca"
    (item_dir / "source.pdf").rename(item_dir / "weird.pdf")
    new_hash = src.sha256_file(item_dir / "weird.pdf")

    def _mut(data):
        data["items"][0]["relative_path"] = "items/doca/weird.pdf"
        data["items"][0]["sha256"] = new_hash

    _rewrite_manifest(pkg, _mut)
    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any("noncanonical_blob_name" in e for e in report["errors"])


def test_source_item_doc_id_drift_fails_verify(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec(doc_id="doca")], source_offload_root=root, package_id="source-drift-id")
    pkg = root / "inbox" / "source-drift-id"
    rec_path = pkg / "items" / "doca" / "source_item.json"
    rec = json.loads(rec_path.read_text(encoding="utf-8"))
    rec["doc_id"] = "docb"  # drift vs manifest doc_id
    rec_path.write_text(json.dumps(rec), encoding="utf-8")
    _rehash_item_record(pkg, "doca")  # keep hash valid so only drift triggers

    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any(e.startswith("doca:item_record_drift:doc_id") for e in report["errors"])
    assert not any("item_record_hash_mismatch" in e for e in report["errors"])


def test_source_item_source_blob_drift_fails_verify(tmp_path):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec(doc_id="doca")], source_offload_root=root, package_id="source-drift-blob")
    pkg = root / "inbox" / "source-drift-blob"
    rec_path = pkg / "items" / "doca" / "source_item.json"
    rec = json.loads(rec_path.read_text(encoding="utf-8"))
    rec["source_blob"] = "items/doca/source.pdf"  # manifest says "" (url item)
    rec_path.write_text(json.dumps(rec), encoding="utf-8")
    _rehash_item_record(pkg, "doca")

    report = verify_source_package(pkg)
    assert report["ok"] is False
    assert any(e.startswith("doca:item_record_drift:source_blob") for e in report["errors"])


# ---------------------------------------------------------------------------
# Static guard — no network / model / service imports
# ---------------------------------------------------------------------------

def test_module_has_no_network_or_model_imports():
    text = Path(src.__file__).read_text(encoding="utf-8")
    for forbidden in ("import httpx", "import requests", "supabase", "sanity", "ollama", "litellm"):
        assert forbidden not in text, f"offload_source must not reference {forbidden!r}"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

class _CliConfig:
    def __init__(self, base: Path):
        self.corpus_dir = base / "corpus"
        self.exports_dir = base / "exports"
        self.corpus_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)


def _patch_config(monkeypatch, tmp_path: Path) -> _CliConfig:
    cfg = _CliConfig(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *a, **k: cfg)
    return cfg


def test_cli_export_url_writes_package(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    runner = CliRunner()
    result = runner.invoke(
        main.app,
        ["source-offload-export", "--url", "https://example.org/x", "--package-id", "cli-url"],
    )
    assert result.exit_code == 0, result.output
    pkg = cfg.exports_dir / "source_offload" / "inbox" / "cli-url"
    assert (pkg / "source_manifest.json").is_file()
    assert verify_source_package(pkg)["ok"] is True
    # No corpus doc dirs created.
    assert not any(p.is_dir() for p in cfg.corpus_dir.iterdir())


def test_cli_export_requires_input(monkeypatch, tmp_path):
    _patch_config(monkeypatch, tmp_path)
    result = CliRunner().invoke(main.app, ["source-offload-export"])
    assert result.exit_code == 1


def test_cli_verify_exit_codes(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    runner = CliRunner()
    runner.invoke(main.app, ["source-offload-export", "--url", "https://example.org/y", "--package-id", "cli-v"])
    pkg = cfg.exports_dir / "source_offload" / "inbox" / "cli-v"

    ok = runner.invoke(main.app, ["source-offload-verify", str(pkg)])
    assert ok.exit_code == 0, ok.output

    (pkg / "items" / next(iter((pkg / "items").iterdir())).name / "source_item.json").unlink()
    bad = runner.invoke(main.app, ["source-offload-verify", str(pkg)])
    assert bad.exit_code == 1


def test_cli_export_from_queue_does_not_mutate_queue(monkeypatch, tmp_path):
    """Exporting by --queue-id reads the queue but must not change it."""
    cfg = _patch_config(monkeypatch, tmp_path)
    from runner.pipeline.source_queue import open_db, queue_db_path, add_item

    db_path = queue_db_path(cfg.corpus_dir)
    db = open_db(db_path)
    item = add_item(db, url="https://example.org/queued", title="Queued doc", notes="note here")
    db.commit()
    before = {
        r[0]: tuple(r) for r in db.execute("SELECT id, url, status, corpus_doc_id, notes FROM source_queue")
    }
    db.close()

    result = CliRunner().invoke(
        main.app,
        ["source-offload-export", "--queue-id", item.id, "--package-id", "cli-q"],
    )
    assert result.exit_code == 0, result.output

    db2 = open_db(db_path)
    after = {
        r[0]: tuple(r) for r in db2.execute("SELECT id, url, status, corpus_doc_id, notes FROM source_queue")
    }
    db2.close()
    assert before == after  # status/corpus_doc_id/notes all unchanged

    pkg = cfg.exports_dir / "source_offload" / "inbox" / "cli-q"
    manifest = load_source_manifest(pkg)
    assert manifest.items[0].queue_item_id == item.id
    assert manifest.items[0].url_hash == item.url_hash
    assert manifest.items[0].url == "https://example.org/queued"
    assert verify_source_package(pkg)["ok"] is True
