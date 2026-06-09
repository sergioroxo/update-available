"""Tests for the Streamlit Offload Packages UX — pure helpers only.

These cover the pure-Python glue helpers added to ``runner/app.py`` for the
offload lifecycle page. They never launch a Streamlit session, never call a
model, and never touch the network. Packages are built with the real
``build_analysis_package`` against ``tmp_path`` corpora so the helpers are
exercised against genuine manifests.

The page deliberately does NOT launch the Mac Studio worker; the only
worker-related surface is a copy-paste command string, asserted below.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

import runner.app as app_mod
from runner.pipeline.offload import build_analysis_package, move_package_state


# ---------------------------------------------------------------------------
# Corpus / package fixtures
# ---------------------------------------------------------------------------

def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _make_doc(corpus_dir: Path, doc_id: str, *, extracted: str = "extracted.txt") -> Path:
    doc_dir = corpus_dir / doc_id
    doc_dir.mkdir(parents=True)
    _write_json(doc_dir / "intake.json", {"doc_id": doc_id, "source": "https://example.org/doc"})
    _write_json(
        doc_dir / "preprocess.json",
        {"doc_id": doc_id, "quality": "high", "tool_used": "trafilatura", "ocr_images": []},
    )
    (doc_dir / extracted).write_text("Extracted source text", encoding="utf-8")
    return doc_dir


def _build_inbox(corpus_dir: Path, offload_root: Path, doc_ids, package_id=None):
    return build_analysis_package(
        corpus_dir=corpus_dir,
        doc_ids=doc_ids,
        offload_root=offload_root,
        package_id=package_id,
    )


# ---------------------------------------------------------------------------
# _offload_root
# ---------------------------------------------------------------------------

def test_offload_root_is_under_exports_dir(tmp_path):
    config = type("Cfg", (), {"exports_dir": tmp_path / "exports"})()
    assert app_mod._offload_root(config) == tmp_path / "exports" / "offload"


# ---------------------------------------------------------------------------
# _offload_cli_command — worker command is text-only, never executed
# ---------------------------------------------------------------------------

def test_offload_cli_command_builds_worker_invocation():
    cmd = app_mod._offload_cli_command("offload-worker", "/data/offload/inbox/pkg-1")
    assert cmd == ["python3", "-m", "runner", "offload-worker", "/data/offload/inbox/pkg-1"]


@pytest.mark.parametrize("verb", ["offload-worker", "offload-verify", "offload-import"])
def test_offload_cli_command_covers_all_displayed_verbs(verb):
    cmd = app_mod._offload_cli_command(verb, Path("/x/pkg"))
    assert cmd[:4] == ["python3", "-m", "runner", verb]
    assert cmd[4] == "/x/pkg"


# ---------------------------------------------------------------------------
# _offload_move_targets — mirrors ALLOWED_TRANSITIONS exactly
# ---------------------------------------------------------------------------

def test_offload_move_targets_match_allowed_transitions():
    from runner.pipeline.offload import ALLOWED_TRANSITIONS

    for state, allowed in ALLOWED_TRANSITIONS.items():
        assert app_mod._offload_move_targets(state) == sorted(allowed)


def test_offload_move_targets_archive_is_terminal():
    assert app_mod._offload_move_targets("archive") == []


def test_offload_move_targets_unknown_state_is_empty():
    assert app_mod._offload_move_targets("nonsense") == []


# ---------------------------------------------------------------------------
# _offload_browser_move_targets — outbox -> imported is NOT a normal move
# ---------------------------------------------------------------------------

def test_browser_move_targets_outbox_excludes_imported():
    """The browser must not let a researcher mark a package imported by hand."""
    targets = app_mod._offload_browser_move_targets("outbox")
    assert "imported" not in targets
    # The other outbox targets remain available.
    assert "failed" in targets
    assert "archive" in targets


def test_transition_graph_still_allows_outbox_to_imported():
    """The underlying lifecycle graph is unchanged — only the UI hides it."""
    assert "imported" in app_mod._offload_move_targets("outbox")


@pytest.mark.parametrize("state", ["inbox", "processing", "imported", "failed", "archive"])
def test_browser_move_targets_match_graph_for_non_outbox(state):
    """Only outbox differs from the raw graph (no `imported` to remove elsewhere)."""
    assert app_mod._offload_browser_move_targets(state) == app_mod._offload_move_targets(state)


# ---------------------------------------------------------------------------
# _offload_import_allowed — outbox + dry-run-ok + confirmed
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "state,dry_run_ok,confirmed,expected",
    [
        ("outbox", True, True, True),
        ("outbox", True, False, False),
        ("outbox", False, True, False),
        ("outbox", False, False, False),
        ("inbox", True, True, False),
        ("processing", True, True, False),
        ("imported", True, True, False),
        ("failed", True, True, False),
        ("archive", True, True, False),
    ],
)
def test_offload_import_allowed_matrix(state, dry_run_ok, confirmed, expected):
    assert app_mod._offload_import_allowed(state, dry_run_ok, confirmed) is expected


def test_offload_import_allowed_coerces_truthiness():
    # Non-bool truthy/falsey values must still gate correctly.
    assert app_mod._offload_import_allowed("outbox", 1, "yes") is True
    assert app_mod._offload_import_allowed("outbox", 0, "yes") is False


# ---------------------------------------------------------------------------
# _offload_exportable_doc_ids
# ---------------------------------------------------------------------------

def test_exportable_doc_ids_lists_complete_docs(tmp_path):
    corpus = tmp_path / "corpus"
    _make_doc(corpus, "alpha")
    _make_doc(corpus, "beta", extracted="extracted.md")
    assert app_mod._offload_exportable_doc_ids(corpus) == ["alpha", "beta"]


def test_exportable_doc_ids_excludes_incomplete_docs(tmp_path):
    corpus = tmp_path / "corpus"
    _make_doc(corpus, "good")

    # Missing extracted text
    d2 = corpus / "no_text"
    d2.mkdir(parents=True)
    _write_json(d2 / "intake.json", {"doc_id": "no_text"})
    _write_json(d2 / "preprocess.json", {"doc_id": "no_text"})

    # Missing preprocess
    d3 = corpus / "no_pre"
    d3.mkdir(parents=True)
    _write_json(d3 / "intake.json", {"doc_id": "no_pre"})
    (d3 / "extracted.txt").write_text("x", encoding="utf-8")

    # Dotfile / hidden dir ignored
    (corpus / ".hidden").mkdir()

    assert app_mod._offload_exportable_doc_ids(corpus) == ["good"]


def test_exportable_doc_ids_missing_corpus_is_empty(tmp_path):
    assert app_mod._offload_exportable_doc_ids(tmp_path / "nope") == []
    assert app_mod._offload_exportable_doc_ids(None) == []


# ---------------------------------------------------------------------------
# _offload_package_rows
# ---------------------------------------------------------------------------

def test_package_rows_summarise_inbox_package(tmp_path):
    corpus = tmp_path / "corpus"
    _make_doc(corpus, "alpha")
    _make_doc(corpus, "beta")
    offload_root = tmp_path / "offload"
    manifest = _build_inbox(corpus, offload_root, ["alpha", "beta"], package_id="offload-test-1")

    rows = app_mod._offload_package_rows(offload_root)
    assert len(rows) == 1
    row = rows[0]
    assert row["package_id"] == "offload-test-1"
    assert row["folder_state"] == "inbox"
    assert row["manifest_state"] == "inbox"
    assert row["consistent"] is True
    assert row["doc_count"] == 2
    assert row["package_kind"] == manifest.package_kind
    assert row["error"] == ""


def test_package_rows_flag_lifecycle_inconsistency(tmp_path):
    """A folder whose manifest state disagrees must be flagged, not hidden."""
    corpus = tmp_path / "corpus"
    _make_doc(corpus, "alpha")
    offload_root = tmp_path / "offload"
    _build_inbox(corpus, offload_root, ["alpha"], package_id="offload-drift-1")

    # Simulate a died-mid-move: physically move the folder to processing/
    # without updating the manifest's lifecycle_state.
    import shutil

    src = offload_root / "inbox" / "offload-drift-1"
    dst = offload_root / "processing" / "offload-drift-1"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))

    rows = app_mod._offload_package_rows(offload_root)
    assert len(rows) == 1
    row = rows[0]
    assert row["folder_state"] == "processing"
    assert row["manifest_state"] == "inbox"
    assert row["consistent"] is False


def test_package_rows_report_unreadable_manifest_without_hiding(tmp_path):
    offload_root = tmp_path / "offload"
    broken = offload_root / "inbox" / "broken-pkg"
    broken.mkdir(parents=True)
    (broken / "offload_manifest.json").write_text("{not json", encoding="utf-8")

    rows = app_mod._offload_package_rows(offload_root)
    assert len(rows) == 1
    row = rows[0]
    assert row["package_id"] == "broken-pkg"
    assert row["error"] != ""
    assert row["consistent"] is None


def test_package_rows_empty_when_no_packages(tmp_path):
    assert app_mod._offload_package_rows(tmp_path / "offload") == []


# ---------------------------------------------------------------------------
# _offload_verify_reports — base vs result verification
# ---------------------------------------------------------------------------

def test_verify_reports_non_outbox_is_base_only(tmp_path):
    corpus = tmp_path / "corpus"
    _make_doc(corpus, "alpha")
    offload_root = tmp_path / "offload"
    _build_inbox(corpus, offload_root, ["alpha"], package_id="offload-base-1")
    pkg_dir = offload_root / "inbox" / "offload-base-1"

    reports = app_mod._offload_verify_reports("inbox", pkg_dir, corpus)
    assert [r["title"] for r in reports] == ["Base package verification"]
    assert reports[0]["report"]["ok"] is True


def test_verify_reports_outbox_includes_result_verification(tmp_path):
    """An outbox package with no result_manifest must show base OK + result FAIL.

    This is exactly the bug guarded against: base verification of the original
    artifacts can pass while the returned result is missing/invalid.
    """
    corpus = tmp_path / "corpus"
    _make_doc(corpus, "alpha")
    offload_root = tmp_path / "offload"
    _build_inbox(corpus, offload_root, ["alpha"], package_id="offload-out-1")
    # Move to outbox the clean way so the manifest lifecycle_state == "outbox".
    move_package_state(
        offload_root=offload_root,
        package_id="offload-out-1",
        from_state="inbox",
        to_state="outbox",
    )
    pkg_dir = offload_root / "outbox" / "offload-out-1"

    reports = app_mod._offload_verify_reports("outbox", pkg_dir, corpus)
    assert [r["title"] for r in reports] == [
        "Base package verification",
        "Result package verification",
    ]
    # Base artifacts are intact -> base verifies OK.
    assert reports[0]["report"]["ok"] is True
    # No worker output yet -> result verification fails (not hidden).
    result_report = reports[1]["report"]
    assert result_report["ok"] is False
    assert "result_manifest_not_found" in result_report["errors"]


# ---------------------------------------------------------------------------
# Post-import move semantics the Import tab relies on
# ---------------------------------------------------------------------------

def test_post_import_move_outbox_to_imported_is_not_verify_gated(tmp_path):
    """The UI moves outbox -> imported with verify=False after a corpus write.

    Even an outbox package whose result verification would fail must still be
    moveable to imported, so the move never blocks after a successful import.
    """
    from runner.pipeline.offload import transition_package_state

    corpus = tmp_path / "corpus"
    _make_doc(corpus, "alpha")
    offload_root = tmp_path / "offload"
    _build_inbox(corpus, offload_root, ["alpha"], package_id="offload-imp-1")
    move_package_state(
        offload_root=offload_root,
        package_id="offload-imp-1",
        from_state="inbox",
        to_state="outbox",
    )
    transition_package_state(
        offload_root=offload_root,
        package_id="offload-imp-1",
        from_state="outbox",
        to_state="imported",
        verify=False,
    )
    assert (offload_root / "imported" / "offload-imp-1").is_dir()
    assert not (offload_root / "outbox" / "offload-imp-1").exists()


def test_post_import_move_raises_when_destination_exists(tmp_path):
    """If the move fails, the UI shows the 'imported but not marked' warning.

    Reproduce the failure condition: a stale imported/<pkg> already exists.
    """
    from runner.pipeline.offload import transition_package_state

    corpus = tmp_path / "corpus"
    _make_doc(corpus, "alpha")
    offload_root = tmp_path / "offload"
    _build_inbox(corpus, offload_root, ["alpha"], package_id="offload-clash-1")
    move_package_state(
        offload_root=offload_root,
        package_id="offload-clash-1",
        from_state="inbox",
        to_state="outbox",
    )
    # Pre-create the destination so the move cannot complete.
    (offload_root / "imported" / "offload-clash-1").mkdir(parents=True)

    with pytest.raises(Exception):
        transition_package_state(
            offload_root=offload_root,
            package_id="offload-clash-1",
            from_state="outbox",
            to_state="imported",
            verify=False,
        )


# ---------------------------------------------------------------------------
# _offload_worker_lock_info — display-only, never created/cleared here
# ---------------------------------------------------------------------------

def test_worker_lock_info_none_when_absent(tmp_path):
    assert app_mod._offload_worker_lock_info(tmp_path / "offload") is None


def test_worker_lock_info_reads_pid_payload(tmp_path):
    offload_root = tmp_path / "offload"
    offload_root.mkdir(parents=True)
    _write_json(offload_root / ".worker.lock", {"pid": 4321, "started_at": "2026-06-09T00:00:00Z"})
    info = app_mod._offload_worker_lock_info(offload_root)
    assert info == {"pid": 4321, "started_at": "2026-06-09T00:00:00Z"}


def test_worker_lock_info_tolerates_corrupt_lock(tmp_path):
    offload_root = tmp_path / "offload"
    offload_root.mkdir(parents=True)
    (offload_root / ".worker.lock").write_text("{bad", encoding="utf-8")
    info = app_mod._offload_worker_lock_info(offload_root)
    assert "raw" in info  # surfaced as raw text, not crashing


# ---------------------------------------------------------------------------
# Guard: no worker-start subprocess helper exists on this page
# ---------------------------------------------------------------------------

def test_no_offload_worker_start_subprocess_helper():
    """The slice must not add a function that launches the worker."""
    for name in dir(app_mod):
        lowered = name.lower()
        if "offload" in lowered and "worker" in lowered:
            # Only the pure command-string builder and lock-reader are allowed.
            assert name in {"_offload_cli_command", "_offload_worker_lock_info"}, (
                f"Unexpected offload-worker helper that may launch the worker: {name}"
            )
