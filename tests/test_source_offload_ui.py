"""Tests for the Streamlit Source Offload UX — pure helpers only.

These cover the pure-Python glue helpers added to ``runner/app.py`` for the
source-offload page. They never launch a Streamlit session, never SSH/rsync,
never launch the worker, and never touch the network. Packages are built with
the real ``build_source_package`` in ``tmp_path``.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

import runner.app as app_mod
from runner.pipeline.offload_source import (
    INGEST_RESULT_MANIFEST_NAME,
    SourceItemSpec,
    archive_source_package,
    build_source_package,
    move_source_package_state,
)
from runner.pipeline.source_queue import QueueItem


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _url_spec(doc_id="urldoc", url="https://example.org/a", **kw) -> SourceItemSpec:
    return SourceItemSpec(
        source_kind="url", declared_source_type="url", doc_id=doc_id, url=url,
        queue_item_id=kw.pop("queue_item_id", "qi_1"), url_hash=kw.pop("url_hash", "h_1"), **kw,
    )


def _build_inbox(tmp_path, doc_id="urldoc", package_id="src-ui"):
    root = tmp_path / "source_offload"
    build_source_package(specs=[_url_spec(doc_id=doc_id)], source_offload_root=root, package_id=package_id)
    return root


# ---------------------------------------------------------------------------
# _source_offload_root / _source_cli_command
# ---------------------------------------------------------------------------

def test_source_offload_root_is_separate_from_result_root(tmp_path):
    config = type("Cfg", (), {"exports_dir": tmp_path / "exports"})()
    assert app_mod._source_offload_root(config) == tmp_path / "exports" / "source_offload"
    # Distinct from the result-stage root.
    assert app_mod._source_offload_root(config) != app_mod._offload_root(config)


@pytest.mark.parametrize("verb", ["source-offload-export", "source-offload-verify",
                                  "source-offload-import"])
def test_source_cli_command_uses_venv_python(verb):
    """MacBook-local commands use sys.executable, never bare python3."""
    import sys
    cmd = app_mod._source_cli_command(verb, "/x/pkg")
    assert cmd == [sys.executable, "-m", "runner", verb, "/x/pkg"]
    assert cmd[0] != "python3"


def test_source_cli_command_accepts_no_args():
    import sys
    assert app_mod._source_cli_command("source-offload-export") == [
        sys.executable, "-m", "runner", "source-offload-export",
    ]


def test_mac_studio_python_env_then_placeholder(monkeypatch):
    monkeypatch.delenv("MAC_STUDIO_PYTHON", raising=False)
    assert app_mod._mac_studio_python() == "<MAC_STUDIO_REPO>/.venv/bin/python"
    monkeypatch.setenv("MAC_STUDIO_PYTHON", "/Users/cdn-ai/surviving-sogice-ingest/.venv/bin/python")
    assert app_mod._mac_studio_python() == "/Users/cdn-ai/surviving-sogice-ingest/.venv/bin/python"


# ---------------------------------------------------------------------------
# Move targets / import gate
# ---------------------------------------------------------------------------

def test_browser_move_targets_outbox_excludes_imported():
    targets = app_mod._source_browser_move_targets("outbox")
    assert "imported" not in targets
    assert "failed" in targets and "archive" in targets


def test_move_targets_match_graph_and_failed_can_retry_to_inbox():
    assert "inbox" in app_mod._source_browser_move_targets("failed")  # retry path
    assert app_mod._source_browser_move_targets("archive") == []      # terminal


@pytest.mark.parametrize("state", ["inbox", "processing", "imported", "failed", "archive"])
def test_browser_move_targets_match_graph_for_non_outbox(state):
    assert app_mod._source_browser_move_targets(state) == app_mod._source_move_targets(state)


@pytest.mark.parametrize(
    "state,dry,conf,expected",
    [
        ("outbox", True, True, True),
        ("outbox", True, False, False),
        ("outbox", False, True, False),
        ("inbox", True, True, False),
        ("imported", True, True, False),
    ],
)
def test_source_import_allowed_matrix(state, dry, conf, expected):
    assert app_mod._source_import_allowed(state, dry, conf) is expected


# ---------------------------------------------------------------------------
# Eligible queue items + spec mapping
# ---------------------------------------------------------------------------

def _make_db(tmp_path):
    from runner.pipeline.source_queue import open_db, queue_db_path
    corpus = tmp_path / "corpus"
    corpus.mkdir(parents=True, exist_ok=True)
    return open_db(queue_db_path(corpus))


def test_eligible_items_includes_not_ingested_excludes_ingested(tmp_path):
    from runner.pipeline.source_queue import add_item, update_status
    db = _make_db(tmp_path)
    a = add_item(db, url="https://example.org/new")              # status new
    b = add_item(db, url="https://example.org/done")
    update_status(db, b.id, "ingested")
    c = add_item(db, url="https://example.org/skip")
    update_status(db, c.id, "skipped")

    eligible = app_mod._source_offload_eligible_items(db)
    ids = {e["id"] for e in eligible}
    assert a.id in ids
    assert b.id not in ids and c.id not in ids
    db.close()


def test_eligible_items_surfaces_review_flags(tmp_path):
    from runner.pipeline.source_queue import add_item
    db = _make_db(tmp_path)
    item = add_item(db, url="https://example.org/testimony")
    db.execute(
        "UPDATE source_queue SET needs_testimony_review = 1 WHERE id = ?", (item.id,)
    )
    db.commit()
    eligible = app_mod._source_offload_eligible_items(db)
    row = next(e for e in eligible if e["id"] == item.id)
    assert row["flagged"] is True
    assert "needs_testimony_review" in row["flags"]
    db.close()


def test_specs_from_queue_items_map_url_and_linkage():
    item = QueueItem(id="qi9", url="https://example.org/doc.pdf", url_hash="hh",
                     title="T", priority="high", recommended_llm="litelm")
    specs = app_mod._source_specs_from_queue_items([item])
    assert len(specs) == 1
    s = specs[0]
    assert s.source_kind == "url"
    assert s.url == "https://example.org/doc.pdf"
    assert s.queue_item_id == "qi9"
    assert s.url_hash == "hh"
    # declared_source_type comes from intake._detect_source_type (http → "url";
    # the worker re-detects the real type at intake time).
    from runner.pipeline import intake as intake_mod
    assert s.declared_source_type == intake_mod._detect_source_type(item.url)
    assert s.declared_source_type == "url"


# ---------------------------------------------------------------------------
# _source_package_rows
# ---------------------------------------------------------------------------

def test_package_rows_summarise_inbox_source_package(tmp_path):
    root = _build_inbox(tmp_path)
    rows = app_mod._source_package_rows(root)
    assert len(rows) == 1
    r = rows[0]
    assert r["package_id"] == "src-ui"
    assert r["folder_state"] == "inbox"
    assert r["manifest_state"] == "inbox"
    assert r["consistent"] is True
    assert r["item_count"] == 1
    assert r["package_kind"] == "source_package"
    assert r["has_result_manifest"] is False
    assert r["error"] == ""


def test_package_rows_flag_result_manifest_in_outbox(tmp_path):
    root = _build_inbox(tmp_path)
    move_source_package_state(offload_root=root, package_id="src-ui", from_state="inbox", to_state="processing")
    out = move_source_package_state(offload_root=root, package_id="src-ui", from_state="processing", to_state="outbox")
    (out / INGEST_RESULT_MANIFEST_NAME).write_text("{}", encoding="utf-8")
    rows = app_mod._source_package_rows(root)
    r = next(x for x in rows if x["folder_state"] == "outbox")
    assert r["has_result_manifest"] is True
    assert r["consistent"] is True


def test_package_rows_surface_broken_manifest(tmp_path):
    root = tmp_path / "source_offload"
    broken = root / "inbox" / "broken"
    broken.mkdir(parents=True)
    (broken / "source_manifest.json").write_text("{not json", encoding="utf-8")
    rows = app_mod._source_package_rows(root)
    assert rows[0]["error"] != ""
    assert rows[0]["consistent"] is None


# ---------------------------------------------------------------------------
# Transfer command builders
# ---------------------------------------------------------------------------

def test_mac_studio_target_uses_env_then_placeholder(monkeypatch):
    monkeypatch.delenv("MAC_STUDIO_SSH_HOST", raising=False)
    monkeypatch.delenv("MAC_STUDIO_OFFLOAD_ROOT", raising=False)
    host, root = app_mod._mac_studio_transfer_target()
    assert host == "<MAC_STUDIO_HOST>"
    assert root == "/Users/cdn-ai/sogice-offload"

    monkeypatch.setenv("MAC_STUDIO_SSH_HOST", "cdn-ai@studio.ts.net")
    monkeypatch.setenv("MAC_STUDIO_OFFLOAD_ROOT", "/Users/cdn-ai/private")
    host, root = app_mod._mac_studio_transfer_target()
    assert host == "cdn-ai@studio.ts.net"
    assert root == "/Users/cdn-ai/private"


def test_source_transfer_root_defaults_and_env(monkeypatch):
    monkeypatch.delenv("SOURCE_OFFLOAD_TRANSFER_ROOT", raising=False)
    monkeypatch.delenv("SOGICE_TRANSFER_ROOT", raising=False)
    monkeypatch.delenv("MACBOOK_TRANSFER_ROOT", raising=False)
    monkeypatch.delenv("MAC_STUDIO_TRANSFER_ROOT", raising=False)

    assert app_mod._source_transfer_root(mac_studio=False).name == "surviving-sogice-studio"
    assert str(app_mod._source_transfer_root(mac_studio=True)) == "/Users/cdn-ai/sogice-transfer"

    monkeypatch.setenv("SOURCE_OFFLOAD_TRANSFER_ROOT", "/tmp/shared")
    assert str(app_mod._source_transfer_root(mac_studio=False)) == "/tmp/shared"
    assert str(app_mod._source_transfer_root(mac_studio=True)) == "/tmp/shared"
    assert str(app_mod._source_to_mac_studio_dir(mac_studio=False)) == "/tmp/shared/to-mac-studio"
    assert str(app_mod._source_from_mac_studio_dir(mac_studio=True)) == "/tmp/shared/from-mac-studio"


def test_source_archive_rows_reports_checksum_ok(tmp_path):
    root = _build_inbox(tmp_path)
    out = tmp_path / "transfer" / "to-mac-studio"
    result = archive_source_package(root / "inbox" / "src-ui", output_dir=out)

    rows = app_mod._source_archive_rows(out)

    assert len(rows) == 1
    assert rows[0]["package_id"] == "src-ui"
    assert rows[0]["checksum_ok"] is True
    assert rows[0]["archive_path"] == result["archive_path"]
    assert rows[0]["sha256_exists"] is True
    assert rows[0]["error"] == ""


def test_source_archive_rows_surfaces_checksum_problem(tmp_path):
    root = _build_inbox(tmp_path)
    out = tmp_path / "transfer" / "to-mac-studio"
    archive_source_package(root / "inbox" / "src-ui", output_dir=out)
    (out / "src-ui.tar.gz.sha256").write_text("0" * 64 + "  src-ui.tar.gz\n", encoding="utf-8")

    rows = app_mod._source_archive_rows(out)

    assert rows[0]["checksum_ok"] is False
    assert "checksum_mismatch" in rows[0]["error"]


def test_source_transfer_folder_rows_reports_direct_package_folder(tmp_path):
    root = _build_inbox(tmp_path)
    incoming = tmp_path / "transfer" / "to-mac-studio"
    incoming.mkdir(parents=True)
    (incoming / "trial-folder").mkdir()
    # Simulate a direct folder sync by copying the built package tree.
    import shutil
    shutil.copytree(root / "inbox" / "src-ui", incoming / "src-ui")
    (incoming / "src-ui" / ".DS_Store").write_text("finder", encoding="utf-8")

    rows = app_mod._source_transfer_folder_rows(incoming)
    by_id = {r["package_id"]: r for r in rows}

    assert by_id["src-ui"]["ok"] is True
    assert by_id["src-ui"]["state"] == "inbox"
    assert by_id["src-ui"]["unexpected"] == []
    assert by_id["trial-folder"]["ok"] is False


def test_source_unpacked_package_exists(tmp_path):
    root = _build_inbox(tmp_path)
    assert app_mod._source_unpacked_package_exists(root, "inbox", "src-ui") is True
    assert app_mod._source_unpacked_package_exists(root, "outbox", "src-ui") is False


def test_source_existing_package_states_lists_local_lifecycle_presence(tmp_path):
    root = _build_inbox(tmp_path)
    move_source_package_state(offload_root=root, package_id="src-ui", from_state="inbox", to_state="processing")
    move_source_package_state(offload_root=root, package_id="src-ui", from_state="processing", to_state="outbox")
    imported = root / "imported" / "old-copy"
    imported.mkdir(parents=True)

    assert app_mod._source_existing_package_states(root, "src-ui") == ["outbox"]
    assert app_mod._source_existing_package_states(root, "old-copy") == ["imported"]
    assert app_mod._source_existing_package_states(root, "missing") == []


def test_transfer_commands_build_up_worker_back(tmp_path):
    root = _build_inbox(tmp_path)
    pkg_dir = root / "inbox" / "src-ui"
    cmds = app_mod._source_offload_transfer_commands(
        pkg_dir, "cdn-ai@studio.ts.net", "/Users/cdn-ai/sogice-offload",
        "/Users/cdn-ai/repo/.venv/bin/python",
    )
    assert cmds["rsync_up"].startswith("rsync -avz --chmod=D700,F600")
    assert "cdn-ai@studio.ts.net:/Users/cdn-ai/sogice-offload/inbox/" in cmds["rsync_up"]
    # Worker line uses the Mac Studio venv python, never bare python3.
    assert cmds["worker"] == (
        "/Users/cdn-ai/repo/.venv/bin/python -m runner source-worker "
        "/Users/cdn-ai/sogice-offload/inbox/src-ui --llm litelm --enrich-model core-gemma"
    )
    assert "python3 -m runner" not in cmds["worker"]
    assert "cdn-ai@studio.ts.net:/Users/cdn-ai/sogice-offload/outbox/src-ui" in cmds["rsync_back"]


def test_transfer_commands_default_worker_python_is_placeholder(tmp_path):
    root = _build_inbox(tmp_path)
    cmds = app_mod._source_offload_transfer_commands(
        root / "inbox" / "src-ui", "host", "/root",
    )
    assert cmds["worker"].startswith("<MAC_STUDIO_REPO>/.venv/bin/python ")
    assert cmds["worker"].endswith("--llm litelm --enrich-model core-gemma")


# ---------------------------------------------------------------------------
# Safety guard — no SSH / rsync / worker execution
# ---------------------------------------------------------------------------

def test_no_ssh_rsync_or_worker_subprocess_launch():
    """Transfer/worker commands must be display-only — never executed."""
    text = Path(app_mod.__file__).read_text(encoding="utf-8")
    exec_re = re.compile(r"subprocess|Popen|os\.system|check_output|check_call|\.run\(")
    for line in text.splitlines():
        if "rsync" in line or "source-worker" in line:
            assert not exec_re.search(line), f"must not execute transfer/worker: {line.strip()}"


def test_no_source_worker_launch_helper():
    """Only the dedicated Mac Studio console helper may launch the source worker."""
    for name in dir(app_mod):
        low = name.lower()
        if "source" in low and "worker" in low:
            assert name in {
                "_source_cli_command",
                "_start_source_worker_job",
                "_render_source_worker_job",
                "_SOURCE_WORKER_DEFAULT_LLM",
                "_SOURCE_WORKER_DEFAULT_ENRICH_MODEL",
            }, f"unexpected source-worker helper: {name}"
