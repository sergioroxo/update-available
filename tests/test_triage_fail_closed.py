"""TASK G1 -- triage fails closed.

A triage that cannot run, cannot reach a model, or cannot parse a response must
NEVER present as overnight-safe. Covers:

- TriageResult fail-closed defaults + TriageResult.failed()
- triage.run(): litelm failure, ollama-fallback failure, unparseable JSON,
  successful parse, and valid-but-incomplete JSON (missing overnight_batch_safe)
- source_queue.is_overnight_safe(): only triaged/ready + model recorded +
  safe flag + no special-review flags returns True; new/untriaged/legacy/failed
  and any special-review flag return False

No network, no LLM, no Sanity/Supabase.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.models.triage import TriageResult
from runner.pipeline import triage as triage_mod
from runner.pipeline.source_queue import (
    add_item,
    apply_triage_result,
    get_item,
    is_overnight_safe,
    open_db,
    queue_db_path,
    update_status,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db(tmp_path: Path) -> sqlite3.Connection:
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    return open_db(queue_db_path(corpus))


def _cfg(*, litelm: bool) -> SimpleNamespace:
    """Minimal config: run() only branches on litelm_base_url; the model call
    functions are monkeypatched so no other attributes are touched."""
    return SimpleNamespace(
        litelm_base_url="http://studio.local" if litelm else "",
        litelm_api_key="k",
        ollama_base_url="http://localhost:11434",
        local_analysis_model="qwen3.5:9b",
    )


_VALID_JSON = (
    '{"doc_type_hint": "promotional", "languages": ["en"], '
    '"complexity": "simple", "recommended_llm": "litelm", '
    '"routing_reason": "promo page", "overnight_batch_safe": true, '
    '"suggested_process_route": "standard"}'
)


# ---------------------------------------------------------------------------
# TriageResult -- fail-closed model
# ---------------------------------------------------------------------------

def test_bare_result_is_fail_closed():
    result = TriageResult()
    assert result.triage_succeeded is False
    assert result.overnight_batch_safe is False


def test_failed_constructor_is_fail_closed():
    result = TriageResult.failed("boom")
    assert result.triage_succeeded is False
    assert result.overnight_batch_safe is False
    assert "boom" in result.routing_reason


def test_failed_constructor_without_reason():
    result = TriageResult.failed()
    assert result.triage_succeeded is False
    assert result.overnight_batch_safe is False
    assert result.routing_reason  # some message present


# ---------------------------------------------------------------------------
# triage.run() -- failure paths
# ---------------------------------------------------------------------------

def test_run_litelm_failure_then_ollama_failure_is_fail_closed(monkeypatch):
    def _boom(*a, **k):
        raise RuntimeError("model down")

    monkeypatch.setattr(triage_mod, "_call_litelm", _boom)
    monkeypatch.setattr(triage_mod, "_call_ollama", _boom)
    result = triage_mod.run("some document text", _cfg(litelm=True))
    assert result.triage_succeeded is False
    assert result.overnight_batch_safe is False
    assert "litelm" in result.routing_reason


def test_run_ollama_fallback_failure_is_fail_closed(monkeypatch):
    # No litelm configured -> goes straight to ollama, which fails.
    def _boom(*a, **k):
        raise RuntimeError("ollama unreachable")

    monkeypatch.setattr(triage_mod, "_call_ollama", _boom)
    result = triage_mod.run("text", _cfg(litelm=False))
    assert result.triage_succeeded is False
    assert result.overnight_batch_safe is False
    assert "ollama" in result.routing_reason


def test_run_unparseable_json_is_fail_closed(monkeypatch):
    monkeypatch.setattr(triage_mod, "_call_litelm", lambda *a, **k: "not json at all")
    result = triage_mod.run("text", _cfg(litelm=True))
    assert result.triage_succeeded is False
    assert result.overnight_batch_safe is False


def test_run_invalid_schema_json_is_fail_closed(monkeypatch):
    # Valid JSON object but a Literal field has an illegal value -> validation fails.
    bad = '{"complexity": "extremely-complex"}'
    monkeypatch.setattr(triage_mod, "_call_litelm", lambda *a, **k: bad)
    result = triage_mod.run("text", _cfg(litelm=True))
    assert result.triage_succeeded is False
    assert result.overnight_batch_safe is False


def test_run_litelm_failure_falls_back_to_ollama_success(monkeypatch):
    def _boom(*a, **k):
        raise RuntimeError("litelm down")

    monkeypatch.setattr(triage_mod, "_call_litelm", _boom)
    monkeypatch.setattr(triage_mod, "_call_ollama", lambda *a, **k: _VALID_JSON)
    result = triage_mod.run("text", _cfg(litelm=True))
    assert result.triage_succeeded is True
    assert result.overnight_batch_safe is True
    assert result.doc_type_hint == "promotional"


# ---------------------------------------------------------------------------
# triage.run() -- success paths
# ---------------------------------------------------------------------------

def test_run_successful_parse_sets_triage_succeeded(monkeypatch):
    monkeypatch.setattr(triage_mod, "_call_litelm", lambda *a, **k: _VALID_JSON)
    result = triage_mod.run("text", _cfg(litelm=True))
    assert result.triage_succeeded is True
    assert result.overnight_batch_safe is True
    assert result.doc_type_hint == "promotional"


def test_run_valid_json_missing_overnight_flag_is_not_safe(monkeypatch):
    # Parses and validates, but the model omitted overnight_batch_safe.
    incomplete = (
        '{"doc_type_hint": "news", "complexity": "simple", '
        '"recommended_llm": "litelm", "routing_reason": "ok"}'
    )
    monkeypatch.setattr(triage_mod, "_call_litelm", lambda *a, **k: incomplete)
    result = triage_mod.run("text", _cfg(litelm=True))
    assert result.triage_succeeded is True          # it DID parse
    assert result.overnight_batch_safe is False     # but absence != safe


def test_run_parse_honours_explicit_false(monkeypatch):
    payload = (
        '{"doc_type_hint": "testimony", "complexity": "simple", '
        '"needs_testimony_review": true, "overnight_batch_safe": false, '
        '"routing_reason": "testimony"}'
    )
    monkeypatch.setattr(triage_mod, "_call_litelm", lambda *a, **k: payload)
    result = triage_mod.run("text", _cfg(litelm=True))
    assert result.triage_succeeded is True
    assert result.needs_testimony_review is True
    assert result.overnight_batch_safe is False


# ---------------------------------------------------------------------------
# is_overnight_safe()
# ---------------------------------------------------------------------------

def _triaged_safe_ns() -> SimpleNamespace:
    return SimpleNamespace(
        doc_type_hint="promotional",
        recommended_llm="litelm",
        routing_reason="ok",
        complexity="simple",
        needs_book_splitting=False,
        needs_testimony_review=False,
        needs_media_review=False,
        needs_legal_review=False,
        overnight_batch_safe=True,
        suggested_process_route="standard",
    )


def test_overnight_safe_true_for_triaged_clean_item(db):
    item = add_item(db, "https://example.org/promo")
    apply_triage_result(db, item.id, _triaged_safe_ns(), model_name="litelm/triage")
    assert is_overnight_safe(get_item(db, item.id)) is True


def test_overnight_safe_true_for_ready_to_ingest(db):
    item = add_item(db, "https://example.org/ready")
    apply_triage_result(db, item.id, _triaged_safe_ns(), model_name="litelm/triage")
    update_status(db, item.id, "ready_to_ingest")
    assert is_overnight_safe(get_item(db, item.id)) is True


def test_overnight_safe_false_for_new_untriaged_item(db):
    # Freshly added: status='new', no triage model recorded. DB flag defaults to
    # 1, but is_overnight_safe must still reject it.
    item = add_item(db, "https://example.org/new")
    loaded = get_item(db, item.id)
    assert loaded.overnight_batch_safe is True   # DB column default unchanged
    assert is_overnight_safe(loaded) is False    # ...but not actually safe


def test_overnight_safe_false_when_triage_model_missing(db):
    # Status forced to triaged but no triage_model_used (legacy-style row).
    item = add_item(db, "https://example.org/legacy")
    update_status(db, item.id, "triaged")
    loaded = get_item(db, item.id)
    assert loaded.triage_model_used == ""
    assert is_overnight_safe(loaded) is False


def test_overnight_safe_false_for_failed_triage(db):
    item = add_item(db, "https://example.org/failed")
    apply_triage_result(db, item.id, TriageResult.failed("model down"),
                        model_name="litelm/triage")
    loaded = get_item(db, item.id)
    assert loaded.status == "triaged"
    assert loaded.triage_model_used == "litelm/triage"
    assert is_overnight_safe(loaded) is False    # overnight_batch_safe=0


@pytest.mark.parametrize("flag", [
    "needs_testimony_review",
    "needs_legal_review",
    "needs_media_review",
    "needs_book_splitting",
])
def test_overnight_safe_false_for_any_special_flag(db, flag):
    ns = _triaged_safe_ns()
    setattr(ns, flag, True)
    # A real triage would also clear overnight_batch_safe, but verify the flag
    # alone is sufficient to reject even if overnight_batch_safe were left True.
    ns.overnight_batch_safe = True
    item = add_item(db, f"https://example.org/{flag}")
    apply_triage_result(db, item.id, ns, model_name="litelm/triage")
    assert is_overnight_safe(get_item(db, item.id)) is False


def test_overnight_safe_false_for_ingested_status(db):
    item = add_item(db, "https://example.org/done")
    apply_triage_result(db, item.id, _triaged_safe_ns(), model_name="litelm/triage")
    update_status(db, item.id, "ingested")
    assert is_overnight_safe(get_item(db, item.id)) is False
