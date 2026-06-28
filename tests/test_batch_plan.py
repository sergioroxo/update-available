"""TASK F Slice 1 — batch-plan dry-run manifest.

Covers:
  exclusion_reason():
    - returns "" for a clean overnight-safe item
    - returns "not_triaged" when triage_model_used is empty
    - returns "status:<value>" for ineligible statuses
    - returns "triage_flagged_unsafe" when overnight_batch_safe=False
    - returns "needs_review:<flag>" for each special-review flag

  plan_batch():
    - empty queue → empty manifest
    - safe items are included, unsafe excluded with correct reasons
    - limit is enforced; over-limit items go to excluded with "over_limit"
    - limit is capped at MAX_BATCH_LIMIT (15)
    - included items are priority-sorted (high → medium → low)
    - batch_group filter restricts candidates
    - priority_filter restricts candidates
    - total_candidates counts all inspected items
    - notes list summarises actionable exclusion categories
    - already-ingested items are excluded with status reason
    - to_dict() includes computed total_included / total_excluded
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner import main
from runner.pipeline.source_queue import (
    add_item,
    apply_triage_result,
    exclusion_reason,
    get_item,
    open_db,
    queue_db_path,
    update_status,
)
from runner.pipeline.batch import (
    BatchManifest,
    MAX_BATCH_LIMIT,
    build_batch_ledger,
    plan_batch,
    write_batch_ledger,
)


# ---------------------------------------------------------------------------
# Fixtures and helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def db(tmp_path: Path) -> sqlite3.Connection:
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    return open_db(queue_db_path(corpus))


def _safe_triage(**kwargs) -> SimpleNamespace:
    """Triage result that marks a document as batch-safe."""
    defaults = dict(
        doc_type_hint="promotional",
        recommended_llm="litelm",
        routing_reason="Standard document",
        complexity="simple",
        needs_book_splitting=False,
        needs_testimony_review=False,
        needs_media_review=False,
        needs_legal_review=False,
        overnight_batch_safe=True,
        suggested_process_route="standard",
        triage_succeeded=True,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _add_safe_item(db: sqlite3.Connection, url: str, *, batch_group: str = "") -> object:
    """Add an item and apply a safe triage result to it.

    Note: priority is determined by priority_from_triage() inside
    apply_triage_result(), not by the add_item() priority argument.
    _safe_triage() defaults produce priority="low" (promotional + simple).
    Use explicit apply_triage_result() calls in priority-sensitive tests.
    """
    item = add_item(db, url, batch_group=batch_group)
    apply_triage_result(db, item.id, _safe_triage(), model_name="litelm/triage")
    return get_item(db, item.id)


# ---------------------------------------------------------------------------
# exclusion_reason() unit tests
# ---------------------------------------------------------------------------

def test_exclusion_reason_empty_for_safe_item(db):
    item = _add_safe_item(db, "https://example.org/safe")
    assert exclusion_reason(item) == ""


def test_exclusion_reason_not_triaged_when_no_model(db):
    item = add_item(db, "https://example.org/new")
    loaded = get_item(db, item.id)
    assert exclusion_reason(loaded) == "not_triaged"


def test_exclusion_reason_status_new_untriaged(db):
    """An untriaged item returns 'not_triaged', not 'status:new' — model check fires first."""
    item = add_item(db, "https://example.org/new2")
    assert exclusion_reason(get_item(db, item.id)) == "not_triaged"


def test_exclusion_reason_status_ingested(db):
    item = _add_safe_item(db, "https://example.org/ingested")
    update_status(db, item.id, "ingested")
    loaded = get_item(db, item.id)
    assert exclusion_reason(loaded) == "status:ingested"


def test_exclusion_reason_status_skipped(db):
    item = _add_safe_item(db, "https://example.org/skipped")
    update_status(db, item.id, "skipped")
    loaded = get_item(db, item.id)
    assert exclusion_reason(loaded) == "status:skipped"


def test_exclusion_reason_triage_flagged_unsafe(db):
    item = add_item(db, "https://example.org/unsafe")
    apply_triage_result(
        db, item.id,
        _safe_triage(overnight_batch_safe=False),
        model_name="litelm/triage",
    )
    loaded = get_item(db, item.id)
    assert exclusion_reason(loaded) == "triage_flagged_unsafe"


@pytest.mark.parametrize("flag", [
    "needs_testimony_review",
    "needs_legal_review",
    "needs_media_review",
    "needs_book_splitting",
])
def test_exclusion_reason_special_review_flags(db, flag):
    item = add_item(db, f"https://example.org/{flag}")
    apply_triage_result(
        db, item.id,
        _safe_triage(**{flag: True}),
        model_name="litelm/triage",
    )
    loaded = get_item(db, item.id)
    assert exclusion_reason(loaded) == f"needs_review:{flag}"


# ---------------------------------------------------------------------------
# plan_batch() tests
# ---------------------------------------------------------------------------

def test_plan_batch_empty_queue(db):
    manifest = plan_batch(db)
    assert manifest.total_candidates == 0
    assert manifest.total_included == 0
    assert manifest.total_excluded == 0
    assert manifest.included == []
    assert manifest.excluded == []


def test_plan_batch_includes_safe_items(db):
    _add_safe_item(db, "https://example.org/a")
    _add_safe_item(db, "https://example.org/b")
    manifest = plan_batch(db)
    assert manifest.total_included == 2
    assert all(i.included for i in manifest.included)
    assert all(i.exclusion_reason == "" for i in manifest.included)


def test_plan_batch_excludes_untriaged_with_reason(db):
    add_item(db, "https://example.org/untriaged")
    manifest = plan_batch(db)
    assert manifest.total_included == 0
    assert manifest.total_excluded == 1
    assert manifest.excluded[0].exclusion_reason == "not_triaged"


def test_plan_batch_excludes_testimony_flag(db):
    item = add_item(db, "https://example.org/testimony")
    apply_triage_result(
        db, item.id,
        _safe_triage(needs_testimony_review=True),
        model_name="litelm/triage",
    )
    manifest = plan_batch(db)
    assert manifest.total_included == 0
    assert "needs_review:needs_testimony_review" in manifest.excluded[0].exclusion_reason


def test_plan_batch_excludes_legal_flag(db):
    item = add_item(db, "https://example.org/legal")
    apply_triage_result(
        db, item.id,
        _safe_triage(needs_legal_review=True),
        model_name="litelm/triage",
    )
    manifest = plan_batch(db)
    assert manifest.total_included == 0
    assert manifest.excluded[0].exclusion_reason == "needs_review:needs_legal_review"


def test_plan_batch_excludes_already_ingested(db):
    item = _add_safe_item(db, "https://example.org/done")
    update_status(db, item.id, "ingested")
    manifest = plan_batch(db)
    assert manifest.total_included == 0
    assert manifest.excluded[0].exclusion_reason == "status:ingested"


def test_plan_batch_limit_caps_included(db):
    for i in range(12):
        _add_safe_item(db, f"https://example.org/doc{i:02d}")
    manifest = plan_batch(db, limit=5)
    assert manifest.total_included == 5
    assert manifest.limit == 5
    # Over-limit items must appear in excluded with reason "over_limit"
    over = [e for e in manifest.excluded if e.exclusion_reason == "over_limit"]
    assert len(over) == 7


def test_plan_batch_limit_hard_cap_at_max(db):
    for i in range(20):
        _add_safe_item(db, f"https://example.org/big{i:02d}")
    manifest = plan_batch(db, limit=99)   # exceeds MAX_BATCH_LIMIT
    assert manifest.limit == MAX_BATCH_LIMIT
    assert manifest.total_included == MAX_BATCH_LIMIT


def test_plan_batch_priority_ordering(db):
    # apply_triage_result overwrites priority via priority_from_triage():
    #   legal/complex → "high",  anything else → "medium",  promotional+simple → "low"
    item_low = add_item(db, "https://example.org/low")
    apply_triage_result(
        db, item_low.id,
        _safe_triage(doc_type_hint="promotional", complexity="simple"),
        model_name="m",
    )
    item_high = add_item(db, "https://example.org/high")
    apply_triage_result(
        db, item_high.id,
        _safe_triage(doc_type_hint="legal"),
        model_name="m",
    )
    item_medium = add_item(db, "https://example.org/medium")
    apply_triage_result(
        db, item_medium.id,
        _safe_triage(doc_type_hint="news", complexity="moderate"),
        model_name="m",
    )
    manifest = plan_batch(db)
    priorities = [i.priority for i in manifest.included]
    assert priorities == ["high", "medium", "low"]


def test_plan_batch_priority_mix_selects_requested_quotas(db):
    for i in range(3):
        item = add_item(db, f"https://high.example.org/{i}")
        apply_triage_result(db, item.id, _safe_triage(doc_type_hint="legal"), model_name="m")
    for i in range(3):
        item = add_item(db, f"https://medium.example.org/{i}")
        apply_triage_result(
            db,
            item.id,
            _safe_triage(doc_type_hint="news", complexity="moderate"),
            model_name="m",
        )
    for i in range(3):
        item = add_item(db, f"https://low.example.org/{i}")
        apply_triage_result(
            db,
            item.id,
            _safe_triage(doc_type_hint="promotional", complexity="simple"),
            model_name="m",
        )

    manifest = plan_batch(
        db,
        limit=6,
        priority_mix={"high": 2, "medium": 2, "low": 1},
    )

    assert manifest.priority_mix == {"high": 2, "medium": 2, "low": 1}
    assert [i.priority for i in manifest.included] == [
        "high", "high", "medium", "medium", "low",
    ]
    assert len([e for e in manifest.excluded if e.exclusion_reason == "over_limit"]) == 4


def test_plan_batch_priority_filter_ignores_priority_mix(db):
    high = add_item(db, "https://example.org/high")
    apply_triage_result(db, high.id, _safe_triage(doc_type_hint="legal"), model_name="m")
    low = add_item(db, "https://example.org/low")
    apply_triage_result(
        db,
        low.id,
        _safe_triage(doc_type_hint="promotional", complexity="simple"),
        model_name="m",
    )

    manifest = plan_batch(
        db,
        priority_filter="high",
        priority_mix={"low": 5},
    )

    assert manifest.priority_mix == {}
    assert [i.priority for i in manifest.included] == ["high"]
    assert manifest.total_candidates == 1


def test_plan_batch_same_host_cap_excludes_duplicate_host(db):
    _add_safe_item(db, "https://example.org/a")
    _add_safe_item(db, "https://www.example.org/b")
    _add_safe_item(db, "https://other.example.org/c")

    manifest = plan_batch(db, limit=5, max_per_host=1)

    assert manifest.max_per_host == 1
    assert manifest.total_included == 2
    reasons = [e.exclusion_reason for e in manifest.excluded]
    assert "same_host_limit:example.org" in reasons
    assert any("same-website cap" in note for note in manifest.notes)


def test_plan_batch_batch_group_filter(db):
    _add_safe_item(db, "https://example.org/a", batch_group="group-A")
    _add_safe_item(db, "https://example.org/b", batch_group="group-B")
    manifest = plan_batch(db, batch_group="group-A")
    assert manifest.total_included == 1
    assert manifest.included[0].batch_group == "group-A"
    assert manifest.total_candidates == 1   # filter applied before counting


def test_plan_batch_total_candidates_counts_all_inspected(db):
    _add_safe_item(db, "https://example.org/safe")
    add_item(db, "https://example.org/untriaged")  # will be excluded
    manifest = plan_batch(db)
    assert manifest.total_candidates == 2


def test_plan_batch_notes_mention_untriaged(db):
    add_item(db, "https://example.org/needs-triage")
    manifest = plan_batch(db)
    assert any("queue-triage" in note for note in manifest.notes)


def test_plan_batch_notes_mention_review_flags(db):
    item = add_item(db, "https://example.org/testimony")
    apply_triage_result(db, item.id, _safe_triage(needs_testimony_review=True), model_name="m")
    manifest = plan_batch(db)
    assert any("review flag" in note for note in manifest.notes)


def test_plan_batch_notes_mention_over_limit(db):
    for i in range(12):
        _add_safe_item(db, f"https://example.org/over{i}")
    manifest = plan_batch(db, limit=5)
    assert any("over the batch limit" in note for note in manifest.notes)


def test_plan_batch_to_dict_includes_computed_counts(db):
    _add_safe_item(db, "https://example.org/x")
    manifest = plan_batch(db)
    d = manifest.to_dict()
    assert d["total_included"] == 1
    assert d["total_excluded"] == 0
    assert "generated_at" in d
    assert "included" in d
    assert "excluded" in d


# ---------------------------------------------------------------------------
# batch-run ledger and CLI tests
# ---------------------------------------------------------------------------

class _CliConfig:
    def __init__(self, base: Path):
        self.corpus_dir = base / "corpus"
        self.exports_dir = base / "exports"
        self.corpus_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        # Credential fields required by batch_preflight() (wired since Slice 3).
        # Set to valid non-placeholder values so the execute tests reach the ingest loop.
        self.sanity_project_id   = "proj-test"
        self.sanity_dataset      = "production"
        self.sanity_write_token  = "tok-test"
        self.supabase_url        = "https://xxx.supabase.co"
        self.supabase_service_key = "key-test"
        self.litelm_base_url     = ""   # no litelm probe needed — items use fake ingest
        self.litelm_api_key      = ""


def _patch_config(monkeypatch, tmp_path: Path) -> _CliConfig:
    cfg = _CliConfig(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *args, **kwargs: cfg)
    return cfg


def test_build_and_write_batch_ledger(db, tmp_path):
    _add_safe_item(db, "https://example.org/ledger")
    manifest = plan_batch(db)

    ledger = build_batch_ledger(manifest, batch_id="batch-test", execute=False)
    path = write_batch_ledger(ledger, tmp_path)

    data = json.loads(path.read_text(encoding="utf-8"))
    assert path.name == "batch-test_ledger.json"
    assert data["batch_id"] == "batch-test"
    assert data["execute"] is False
    assert data["items"][0]["status"] == "planned"
    assert data["manifest"]["total_included"] == 1


def test_batch_plan_cli_accepts_priority_mix_and_host_cap(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    db = open_db(queue_db_path(cfg.corpus_dir))
    high_a = add_item(db, "https://example.org/high-a")
    apply_triage_result(db, high_a.id, _safe_triage(doc_type_hint="legal"), model_name="m")
    high_b = add_item(db, "https://www.example.org/high-b")
    apply_triage_result(db, high_b.id, _safe_triage(doc_type_hint="legal"), model_name="m")
    low = add_item(db, "https://other.example.org/low")
    apply_triage_result(
        db,
        low.id,
        _safe_triage(doc_type_hint="promotional", complexity="simple"),
        model_name="m",
    )
    out = tmp_path / "manifest.json"

    result = CliRunner().invoke(
        main.app,
        [
            "batch-plan",
            "--mix-high", "2",
            "--mix-low", "1",
            "--max-per-host", "1",
            "--out", str(out),
        ],
    )

    assert result.exit_code == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["priority_mix"] == {"high": 2, "low": 1}
    assert data["max_per_host"] == 1
    assert data["total_included"] == 2
    assert any(
        row["exclusion_reason"] == "same_host_limit:example.org"
        for row in data["excluded"]
    )


def test_batch_run_without_execute_writes_rehearsal_ledger(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/rehearsal")
    calls = []
    monkeypatch.setattr(main, "ingest", lambda *args, **kwargs: calls.append((args, kwargs)))

    result = CliRunner().invoke(main.app, ["batch-run", "--out-dir", str(tmp_path / "ledgers")])

    assert result.exit_code == 0
    assert "Rehearsal only" in result.stdout
    assert calls == []
    ledgers = list((tmp_path / "ledgers").glob("*_ledger.json"))
    assert len(ledgers) == 1
    data = json.loads(ledgers[0].read_text(encoding="utf-8"))
    assert data["execute"] is False
    assert data["completed"] is False
    assert data["stop_reason"] == "execute flag not provided"
    assert data["items"][0]["status"] == "not_executed"


def test_batch_run_execute_marks_successful_item_ingested(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    db = open_db(queue_db_path(cfg.corpus_dir))
    item = _add_safe_item(db, "https://example.org/success")
    calls = []

    def fake_ingest(*args, **kwargs):
        calls.append((args, kwargs))
        return "doc-success"

    monkeypatch.setattr(main, "ingest", fake_ingest)

    result = CliRunner().invoke(
        main.app,
        ["batch-run", "--execute", "--skip-preflight", "--out-dir", str(tmp_path / "ledgers")],
    )

    assert result.exit_code == 0
    assert len(calls) == 1
    args, kwargs = calls[0]
    assert args == ("https://example.org/success",)
    assert kwargs["yes"] is True
    assert kwargs["run_triage"] is False
    assert kwargs["run_enrich"] is True
    assert kwargs["batch"].startswith("batch-")
    loaded = get_item(db, item.id)
    assert loaded.status == "ingested"
    assert loaded.corpus_doc_id == "doc-success"
    data = json.loads(next((tmp_path / "ledgers").glob("*_ledger.json")).read_text(encoding="utf-8"))
    assert data["completed"] is True
    assert data["items"][0]["status"] == "succeeded"
    assert data["items"][0]["doc_id"] == "doc-success"


def test_batch_run_execute_passes_enrich_model(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/success")
    calls = []

    def fake_ingest(*args, **kwargs):
        calls.append((args, kwargs))
        return "doc-success"

    monkeypatch.setattr(main, "ingest", fake_ingest)

    result = CliRunner().invoke(
        main.app,
        [
            "batch-run",
            "--execute",
            "--skip-preflight",
            "--enrich-model",
            "core-gemma",
            "--out-dir",
            str(tmp_path / "ledgers"),
        ],
    )

    assert result.exit_code == 0
    assert calls[0][1]["enrich_model"] == "core-gemma"


def test_batch_run_execute_stops_on_first_failure(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    db = open_db(queue_db_path(cfg.corpus_dir))
    item = _add_safe_item(db, "https://example.org/failure")

    def fake_ingest(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(main, "ingest", fake_ingest)

    result = CliRunner().invoke(
        main.app,
        ["batch-run", "--execute", "--skip-preflight", "--out-dir", str(tmp_path / "ledgers")],
    )

    assert result.exit_code == 1
    loaded = get_item(db, item.id)
    assert loaded.status == "triaged"
    assert loaded.corpus_doc_id == ""
    data = json.loads(next((tmp_path / "ledgers").glob("*_ledger.json")).read_text(encoding="utf-8"))
    assert data["completed"] is False
    assert data["stop_reason"] == f"failed:{item.id}"
    assert data["items"][0]["status"] == "failed"
    assert data["items"][0]["error"] == "boom"
