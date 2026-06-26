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
    verify_source_package,
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


def test_source_misplaced_return_rows_detects_result_in_inbox(tmp_path):
    root = _build_inbox(tmp_path)
    pkg = root / "inbox" / "src-ui"
    (pkg / INGEST_RESULT_MANIFEST_NAME).write_text(
        json.dumps({"package_kind": "ingest_result", "documents": []}),
        encoding="utf-8",
    )
    app_mod._source_reconcile_manifest_state(pkg, "outbox")

    rows = app_mod._source_misplaced_return_rows(root)

    assert len(rows) == 1
    assert rows[0]["package_id"] == "src-ui"
    assert rows[0]["folder_state"] == "inbox"
    assert rows[0]["manifest_state"] == "outbox"


def test_source_misplaced_return_rows_ignores_imported_and_archive_history(tmp_path):
    root = _build_inbox(tmp_path)
    move_source_package_state(offload_root=root, package_id="src-ui", from_state="inbox", to_state="processing")
    outbox = move_source_package_state(
        offload_root=root, package_id="src-ui", from_state="processing", to_state="outbox"
    )
    (outbox / INGEST_RESULT_MANIFEST_NAME).write_text(
        json.dumps({"package_kind": "ingest_result", "documents": []}),
        encoding="utf-8",
    )
    move_source_package_state(offload_root=root, package_id="src-ui", from_state="outbox", to_state="imported")

    archived = root / "archive" / "archived-copy"
    archived.mkdir(parents=True)
    (archived / "source_manifest.json").write_text(
        json.dumps({
            "schema_version": 1,
            "package_id": "archived-copy",
            "package_kind": "source_package",
            "lifecycle_state": "archive",
            "created_at": "2026-01-01T00:00:00Z",
            "retention_policy": {},
            "privacy_policy": {},
            "items": [],
        }),
        encoding="utf-8",
    )
    (archived / INGEST_RESULT_MANIFEST_NAME).write_text(
        json.dumps({"package_kind": "ingest_result", "documents": []}),
        encoding="utf-8",
    )

    assert app_mod._source_misplaced_return_rows(root) == []


def test_source_repair_misplaced_return_quarantines_old_outbox(tmp_path):
    root = _build_inbox(tmp_path)
    move_source_package_state(offload_root=root, package_id="src-ui", from_state="inbox", to_state="processing")
    old_outbox = move_source_package_state(
        offload_root=root, package_id="src-ui", from_state="processing", to_state="outbox"
    )
    (old_outbox / INGEST_RESULT_MANIFEST_NAME).write_text(
        json.dumps({"package_kind": "ingest_result", "documents": [{"doc_id": "old"}]}),
        encoding="utf-8",
    )

    # Simulate a newer returned folder copied into the wrong local lifecycle dir.
    import shutil

    misplaced = root / "inbox" / "src-ui"
    shutil.copytree(old_outbox, misplaced)
    (misplaced / INGEST_RESULT_MANIFEST_NAME).write_text(
        json.dumps({"package_kind": "ingest_result", "documents": [{"doc_id": "new"}]}),
        encoding="utf-8",
    )

    repaired = app_mod._source_repair_misplaced_return(root, "src-ui", from_state="inbox")

    assert repaired == root / "outbox" / "src-ui"
    assert (root / "failed" / "src-ui").is_dir()
    assert json.loads((root / "outbox" / "src-ui" / INGEST_RESULT_MANIFEST_NAME).read_text())[
        "documents"
    ][0]["doc_id"] == "new"
    assert app_mod._source_package_rows(root)
    assert app_mod._source_existing_package_states(root, "src-ui") == ["outbox", "failed"]


def test_source_worker_report_summary_lists_failed_queue_items(tmp_path):
    root = _build_inbox(tmp_path, doc_id="okdoc")
    pkg = root / "inbox" / "src-ui"
    data = json.loads((pkg / "source_manifest.json").read_text())
    data["items"].append({
        **data["items"][0],
        "doc_id": "baddoc",
        "url": "https://example.org/bad",
        "item_record_path": "items/baddoc/source_item.json",
        "item_record_sha256": "0" * 64,
        "queue_item_id": "qi_bad",
        "url_hash": "hash_bad",
    })
    (pkg / "source_manifest.json").write_text(json.dumps(data), encoding="utf-8")
    (pkg / INGEST_RESULT_MANIFEST_NAME).write_text(
        json.dumps({"package_kind": "ingest_result", "documents": [{"doc_id": "okdoc"}]}),
        encoding="utf-8",
    )
    (pkg / "worker_report.json").write_text(
        json.dumps({
            "worker_status": "partial",
            "documents": [
                {"doc_id": "okdoc", "status": "succeeded"},
                {"doc_id": "baddoc", "status": "failed", "error": "preprocess_blocked:capture_needed"},
            ],
        }),
        encoding="utf-8",
    )

    summary = app_mod._source_worker_report_summary(pkg)

    assert summary["worker_status"] == "partial"
    assert summary["importable_doc_ids"] == ["okdoc"]
    assert summary["failed"] == [{
        "doc_id": "baddoc",
        "queue_item_id": "qi_bad",
        "source_url": "https://example.org/bad",
        "status": "failed",
        "error": "preprocess_blocked:capture_needed",
    }]


# ---------------------------------------------------------------------------
# Suggested source-offload batch builder
# ---------------------------------------------------------------------------

def _safe_triage(doc_type_hint="academic", recommended_llm="litelm", **flags):
    from runner.models.triage import TriageResult

    return TriageResult(
        doc_type_hint=doc_type_hint,
        complexity="moderate",
        recommended_llm=recommended_llm,
        routing_reason="safe test item",
        triage_succeeded=True,
        overnight_batch_safe=True,
        suggested_process_route="standard",
        **flags,
    )


def test_source_batch_default_package_id_has_safe_prefix():
    pid = app_mod._source_batch_default_package_id("night")
    assert pid.startswith("night-")
    assert re.match(r"^night-\d{8}-\d{6}$", pid)


def test_source_manifest_item_rows_are_display_ready():
    from runner.pipeline.batch import ManifestItem

    rows = app_mod._source_manifest_item_rows([
        ManifestItem(
            item_id="qi1",
            url="https://example.org/a",
            status="triaged",
            priority="high",
            batch_group="",
            recommended_llm="",
            doc_type_hint="academic",
            included=True,
            exclusion_reason="",
        )
    ])

    assert rows == [{
        "item_id": "qi1",
        "priority": "high",
        "llm": "litelm",
        "type": "academic",
        "reason": "",
        "url": "https://example.org/a",
    }]


def test_source_build_and_archive_batch_uses_plan_and_does_not_mutate_queue(tmp_path):
    from runner.pipeline.batch import plan_batch
    from runner.pipeline.offload_source import inspect_source_archive
    from runner.pipeline.source_queue import add_item, apply_triage_result, get_item

    db = _make_db(tmp_path)
    item_a = add_item(db, url="https://example.org/a", title="A")
    item_b = add_item(db, url="https://example.org/b", title="B")
    unsafe = add_item(db, url="https://example.org/unsafe", title="Unsafe")
    assert item_a and item_b and unsafe
    apply_triage_result(db, item_a.id, _safe_triage("academic"), model_name="triage")
    apply_triage_result(db, item_b.id, _safe_triage("policy"), model_name="triage")
    apply_triage_result(
        db,
        unsafe.id,
        _safe_triage("legal", needs_legal_review=True),
        model_name="triage",
    )

    manifest = plan_batch(db, limit=5)
    config = type("Cfg", (), {"exports_dir": tmp_path / "exports"})()
    out = tmp_path / "transfer" / "to-mac-studio"

    result = app_mod._source_build_and_archive_batch(
        db,
        config,
        manifest,
        package_id="night-001",
        transfer_dir=out,
    )

    assert result["package_id"] == "night-001"
    assert result["item_count"] == 2
    assert set(result["queue_item_ids"]) == {item_a.id, item_b.id}
    assert (tmp_path / "exports" / "source_offload" / "inbox" / "night-001").is_dir()
    assert Path(result["archive_path"]) == out / "night-001.tar.gz"
    assert Path(result["sha256_path"]) == out / "night-001.tar.gz.sha256"
    inspected = inspect_source_archive(Path(result["archive_path"]))
    assert inspected["package_id"] == "night-001"
    assert inspected["manifest_state"] == "inbox"
    assert get_item(db, item_a.id).status == "triaged"
    assert get_item(db, item_b.id).status == "triaged"
    assert get_item(db, unsafe.id).status == "triaged"
    db.close()


def test_source_build_and_archive_batch_refuses_empty_manifest(tmp_path):
    from runner.pipeline.batch import plan_batch

    db = _make_db(tmp_path)
    manifest = plan_batch(db, limit=5)
    config = type("Cfg", (), {"exports_dir": tmp_path / "exports"})()

    with pytest.raises(ValueError, match="No eligible"):
        app_mod._source_build_and_archive_batch(
            db,
            config,
            manifest,
            package_id="empty",
            transfer_dir=tmp_path / "transfer",
        )
    db.close()


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


def test_source_reconcile_manifest_state_repairs_direct_copy(tmp_path):
    root = _build_inbox(tmp_path)
    pkg = root / "inbox" / "src-ui"

    app_mod._source_reconcile_manifest_state(pkg, "outbox")
    assert app_mod._source_transfer_folder_rows(root / "inbox")[0]["state"] == "outbox"

    app_mod._source_reconcile_manifest_state(pkg, "inbox")

    row = app_mod._source_transfer_folder_rows(root / "inbox")[0]
    assert row["ok"] is True
    assert row["state"] == "inbox"


def test_source_worker_verify_report_tolerates_retry_outputs(tmp_path):
    root = _build_inbox(tmp_path)
    pkg = root / "inbox" / "src-ui"
    (pkg / "docs").mkdir()
    (pkg / INGEST_RESULT_MANIFEST_NAME).write_text("{}", encoding="utf-8")
    (pkg / "worker_report.json").write_text("{}", encoding="utf-8")

    strict = verify_source_package(pkg)
    report = app_mod._source_worker_verify_report(pkg)

    assert strict["ok"] is False
    assert {"docs", INGEST_RESULT_MANIFEST_NAME, "worker_report.json"}.issubset(
        set(strict["unexpected"])
    )
    assert report["ok"] is True
    assert report["unexpected"] == []


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


def test_can_archive_inbox_then_unpack_only_for_returned_outbox_collision():
    assert app_mod._source_can_archive_inbox_then_unpack(["inbox"], "outbox") is True
    assert app_mod._source_can_archive_inbox_then_unpack(["inbox"], "inbox") is False
    assert app_mod._source_can_archive_inbox_then_unpack(["outbox"], "outbox") is False
    assert app_mod._source_can_archive_inbox_then_unpack(["inbox", "archive"], "outbox") is False
    assert app_mod._source_can_archive_inbox_then_unpack([], "outbox") is False


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
                "_source_worker_report_summary",
                "_source_worker_verify_report",
                "_start_source_worker_job",
                "_render_source_worker_job",
                "_SOURCE_WORKER_DEFAULT_LLM",
                "_SOURCE_WORKER_DEFAULT_ENRICH_MODEL",
            }, f"unexpected source-worker helper: {name}"
