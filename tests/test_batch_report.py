"""TASK F Slice 4 — batch run report.

Covers:
  _next_action():
    - no eligible items → queue-triage hint
    - rehearsal (execute flag not provided) → --execute hint
    - preflight_failed:sanity_credentials → SANITY env vars hint
    - preflight_failed:supabase_credentials → SUPABASE env vars hint
    - preflight_failed:litelm_endpoint → doctor/LiteLLM hint
    - preflight_failed:unknown_check → generic fix hint
    - failed:<item_id> → review failed item hint
    - completed=True → push-enrichment hint
    - empty stop_reason and incomplete → ""

  format_batch_report():
    - contains batch_id
    - contains stop_reason
    - mode is "Rehearsal" for execute=False
    - mode is "Live execution" for execute=True
    - result line for each scenario
    - candidate counts
    - item status counts
    - ledger path in footer
    - failed item URL and error
    - next action section present
    - queue notes included when present

  write_batch_report():
    - creates {batch_id}_report.md
    - content matches format_batch_report()
    - creates ledger_dir if missing

  CLI integration:
    - rehearsal → report file written
    - no eligible items → report file written
    - execute success → report file written
    - execute failure → report file written
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest
from typer.testing import CliRunner

from runner import main
from runner.pipeline.batch import (
    BatchLedger,
    LedgerItem,
    BatchManifest,
    ManifestItem,
    _next_action,
    format_batch_report,
    write_batch_report,
)
from runner.pipeline.source_queue import (
    add_item,
    apply_triage_result,
    get_item,
    open_db,
    queue_db_path,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ledger(
    *,
    batch_id: str = "batch-test",
    stop_reason: str = "",
    completed: bool = False,
    execute: bool = True,
    items: list[LedgerItem] | None = None,
) -> BatchLedger:
    """Minimal BatchLedger for testing."""
    return BatchLedger(
        batch_id=batch_id,
        generated_at="2026-01-01T00:00:00+00:00",
        execute=execute,
        manifest={
            "total_candidates": 3,
            "total_included": 2,
            "total_excluded": 1,
            "notes": [],
        },
        completed=completed,
        stop_reason=stop_reason,
        items=items or [],
    )


def _ledger_with_notes(*notes: str) -> BatchLedger:
    led = _ledger()
    led.manifest = dict(led.manifest)
    led.manifest["notes"] = list(notes)
    return led


def _ledger_items(*statuses: str, url: str = "https://example.org/doc", error: str = "") -> list[LedgerItem]:
    items = []
    for i, status in enumerate(statuses):
        items.append(LedgerItem(
            item_id=f"item-{i}",
            url=url,
            recommended_llm="litelm",
            status=status,
            error=error if status == "failed" else "",
        ))
    return items


# ---------------------------------------------------------------------------
# _next_action() tests
# ---------------------------------------------------------------------------

def test_next_action_no_eligible_items():
    led = _ledger(stop_reason="no eligible items")
    act = _next_action(led)
    assert "queue-triage" in act


def test_next_action_rehearsal():
    led = _ledger(stop_reason="execute flag not provided")
    act = _next_action(led)
    assert "--execute" in act


def test_next_action_preflight_sanity():
    led = _ledger(stop_reason="preflight_failed:sanity_credentials")
    act = _next_action(led)
    assert "SANITY" in act
    assert "SANITY_DATASET" in act


def test_next_action_preflight_supabase():
    led = _ledger(stop_reason="preflight_failed:supabase_credentials")
    act = _next_action(led)
    assert "SUPABASE" in act


def test_next_action_preflight_litelm():
    led = _ledger(stop_reason="preflight_failed:litelm_endpoint")
    act = _next_action(led)
    assert "doctor" in act.lower() or "litelm" in act.lower() or "mac studio" in act.lower()


def test_next_action_preflight_ledger_dir():
    led = _ledger(stop_reason="preflight_failed:ledger_dir_writable")
    act = _next_action(led)
    assert "--out-dir" in act or "writable" in act.lower()


def test_next_action_preflight_unknown_check():
    led = _ledger(stop_reason="preflight_failed:something_new")
    act = _next_action(led)
    assert act  # non-empty
    assert "fix" in act.lower() or "pre-flight" in act.lower()


def test_next_action_execute_failure():
    led = _ledger(stop_reason="failed:item-abc-123")
    act = _next_action(led)
    assert "failed item" in act.lower() or "review" in act.lower()


def test_next_action_completed():
    led = _ledger(completed=True)
    act = _next_action(led)
    assert "push-enrichment" in act


def test_next_action_empty_stop_reason_incomplete():
    led = _ledger(stop_reason="", completed=False)
    assert _next_action(led) == ""


# ---------------------------------------------------------------------------
# format_batch_report() tests — structure
# ---------------------------------------------------------------------------

def test_report_contains_batch_id(tmp_path):
    led = _ledger(batch_id="batch-20260531-120000")
    text = format_batch_report(led, ledger_path=tmp_path / "batch-20260531-120000_ledger.json")
    assert "batch-20260531-120000" in text


def test_report_contains_stop_reason(tmp_path):
    led = _ledger(stop_reason="preflight_failed:sanity_credentials")
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Stop reason: preflight_failed:sanity_credentials" in text


def test_report_empty_stop_reason_is_explicit(tmp_path):
    led = _ledger(completed=True, stop_reason="")
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Stop reason: none" in text


def test_report_rehearsal_mode(tmp_path):
    led = _ledger(execute=False, stop_reason="execute flag not provided")
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Rehearsal" in text
    assert "Live" not in text


def test_report_live_mode(tmp_path):
    led = _ledger(execute=True, completed=True)
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Live execution" in text


def test_report_result_complete(tmp_path):
    led = _ledger(completed=True)
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "✓ Complete" in text


def test_report_result_no_eligible_items(tmp_path):
    led = _ledger(stop_reason="no eligible items")
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "no eligible items" in text.lower()


def test_report_result_rehearsal_planned_only(tmp_path):
    led = _ledger(stop_reason="execute flag not provided", execute=False)
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Planned only" in text


def test_report_result_preflight_failed(tmp_path):
    led = _ledger(stop_reason="preflight_failed:sanity_credentials")
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Pre-flight failed" in text
    assert "sanity_credentials" in text


def test_report_result_stopped_on_failure(tmp_path):
    items = _ledger_items("succeeded", "failed", "not_executed",
                          url="https://example.org/doc", error="boom")
    led = _ledger(stop_reason="failed:item-1", items=items)
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Stopped on failure" in text


def test_report_candidate_counts(tmp_path):
    led = _ledger()
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "3" in text   # total_candidates
    assert "2" in text   # total_included
    assert "1" in text   # total_excluded


def test_report_item_status_counts(tmp_path):
    items = _ledger_items("succeeded", "succeeded", "not_executed")
    led = _ledger(completed=True, items=items)
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "2 succeeded" in text
    assert "1 not_executed" in text


def test_report_item_no_items(tmp_path):
    led = _ledger(stop_reason="no eligible items", items=[])
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "none" in text.lower()


def test_report_contains_ledger_path(tmp_path):
    lp = tmp_path / "batch-test_ledger.json"
    text = format_batch_report(_ledger(), ledger_path=lp)
    assert str(lp) in text


def test_report_failed_item_url_and_error(tmp_path):
    items = _ledger_items("failed", url="https://example.org/broken", error="RuntimeError: boom")
    led = _ledger(stop_reason="failed:item-0", items=items)
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "https://example.org/broken" in text
    assert "RuntimeError: boom" in text


def test_report_next_action_section_present(tmp_path):
    led = _ledger(stop_reason="execute flag not provided", execute=False)
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Next Action" in text
    assert "--execute" in text


def test_report_no_next_action_section_when_empty(tmp_path):
    """Unknown stop_reason + incomplete → no Next Action section."""
    led = _ledger(stop_reason="", completed=False)
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "Next Action" not in text


def test_report_queue_notes_included(tmp_path):
    led = _ledger_with_notes(
        "2 item(s) need triage first — run: python -m runner queue-triage"
    )
    text = format_batch_report(led, ledger_path=tmp_path / "x_ledger.json")
    assert "queue-triage" in text


# ---------------------------------------------------------------------------
# write_batch_report() tests
# ---------------------------------------------------------------------------

def test_write_report_creates_md_file(tmp_path):
    led = _ledger(batch_id="batch-20260531-120000")
    report_path = write_batch_report(led, tmp_path / "ledgers")
    assert report_path.exists()
    assert report_path.suffix == ".md"


def test_write_report_filename_pattern(tmp_path):
    led = _ledger(batch_id="batch-abc")
    report_path = write_batch_report(led, tmp_path / "ledgers")
    assert report_path.name == "batch-abc_report.md"


def test_write_report_content_matches_format(tmp_path):
    ledger_dir = tmp_path / "ledgers"
    led = _ledger(batch_id="batch-cmp")
    report_path = write_batch_report(led, ledger_dir)
    expected = format_batch_report(
        led, ledger_path=ledger_dir / "batch-cmp_ledger.json"
    )
    assert report_path.read_text(encoding="utf-8") == expected


def test_write_report_creates_dir_if_missing(tmp_path):
    ledger_dir = tmp_path / "new" / "subdir" / "ledgers"
    assert not ledger_dir.exists()
    write_batch_report(_ledger(), ledger_dir)
    assert ledger_dir.exists()


# ---------------------------------------------------------------------------
# CLI integration tests — report file written at each exit path
# ---------------------------------------------------------------------------

class _CliConfig:
    def __init__(self, base: Path):
        self.corpus_dir = base / "corpus"
        self.exports_dir = base / "exports"
        self.corpus_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.sanity_project_id    = "proj-test"
        self.sanity_dataset       = "production"
        self.sanity_write_token   = "tok-test"
        self.supabase_url         = "https://xxx.supabase.co"
        self.supabase_service_key = "key-test"
        self.litelm_base_url      = ""
        self.litelm_api_key       = ""


def _patch_config(monkeypatch, tmp_path: Path) -> _CliConfig:
    cfg = _CliConfig(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *a, **kw: cfg)
    return cfg


def _safe_triage(**kwargs):
    defaults = dict(
        doc_type_hint="promotional", recommended_llm="litelm",
        routing_reason="ok", complexity="simple",
        needs_book_splitting=False, needs_testimony_review=False,
        needs_media_review=False, needs_legal_review=False,
        overnight_batch_safe=True, suggested_process_route="standard",
        triage_succeeded=True,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _add_safe_item(db: sqlite3.Connection, url: str) -> object:
    item = add_item(db, url)
    apply_triage_result(db, item.id, _safe_triage(), model_name="litelm/triage")
    return get_item(db, item.id)


def test_cli_rehearsal_writes_report(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/rehearsal")
    ledger_dir = tmp_path / "ledgers"

    result = CliRunner().invoke(
        main.app, ["batch-run", "--out-dir", str(ledger_dir)],
    )

    assert result.exit_code == 0
    reports = list(ledger_dir.glob("*_report.md"))
    assert len(reports) == 1
    content = reports[0].read_text(encoding="utf-8")
    assert "Rehearsal" in content
    assert "Planned only" in content
    assert "--execute" in content   # next action


def test_cli_no_eligible_items_writes_report(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    ledger_dir = tmp_path / "ledgers"

    result = CliRunner().invoke(
        main.app, ["batch-run", "--out-dir", str(ledger_dir)],
    )

    assert result.exit_code == 0
    reports = list(ledger_dir.glob("*_report.md"))
    assert len(reports) == 1
    content = reports[0].read_text(encoding="utf-8")
    assert "no eligible items" in content.lower()


def test_cli_execute_success_writes_report(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/success")
    ledger_dir = tmp_path / "ledgers"

    monkeypatch.setattr(main, "ingest", lambda *a, **kw: "doc-xyz")

    result = CliRunner().invoke(
        main.app,
        ["batch-run", "--execute", "--skip-preflight", "--out-dir", str(ledger_dir)],
    )

    assert result.exit_code == 0
    reports = list(ledger_dir.glob("*_report.md"))
    assert len(reports) == 1
    content = reports[0].read_text(encoding="utf-8")
    assert "✓ Complete" in content
    assert "push-enrichment" in content   # next action


def test_cli_execute_failure_writes_report(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    db = open_db(queue_db_path(cfg.corpus_dir))
    _add_safe_item(db, "https://example.org/failure")
    ledger_dir = tmp_path / "ledgers"

    monkeypatch.setattr(main, "ingest", lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("boom")))

    result = CliRunner().invoke(
        main.app,
        ["batch-run", "--execute", "--skip-preflight", "--out-dir", str(ledger_dir)],
    )

    assert result.exit_code == 1
    reports = list(ledger_dir.glob("*_report.md"))
    assert len(reports) == 1
    content = reports[0].read_text(encoding="utf-8")
    assert "Stopped on failure" in content
    assert "https://example.org/failure" in content
    assert "boom" in content
    assert "review" in content.lower()   # next action


def test_cli_report_path_printed_to_stdout(monkeypatch, tmp_path):
    cfg = _patch_config(monkeypatch, tmp_path)
    ledger_dir = tmp_path / "ledgers"

    result = CliRunner().invoke(
        main.app, ["batch-run", "--out-dir", str(ledger_dir)],
    )

    assert result.exit_code == 0
    assert "Report" in result.stdout or "report" in result.stdout
