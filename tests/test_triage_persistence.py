"""Tests for U6 — triage result persistence (save / load)."""
import json
from dataclasses import dataclass
from pathlib import Path

import pytest

from runner.models.triage import TriageResult
from runner.pipeline.triage import load_triage_result, save_triage_result


# ---------------------------------------------------------------------------
# Minimal config stub
# ---------------------------------------------------------------------------

@dataclass
class _Config:
    corpus_dir: Path


def _cfg(tmp_path: Path) -> _Config:
    return _Config(corpus_dir=tmp_path)


def _result(**kwargs) -> TriageResult:
    defaults = {
        "doc_type_hint": "promotional",
        "languages": ["en"],
        "complexity": "simple",
        "estimated_tokens": 2000,
        "recommended_llm": "litelm",
        "routing_reason": "Short promotional page.",
    }
    defaults.update(kwargs)
    return TriageResult.model_validate(defaults)


# ---------------------------------------------------------------------------
# save_triage_result
# ---------------------------------------------------------------------------

def test_save_triage_result_creates_file(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-1").mkdir()
    result = _result()
    path = save_triage_result("doc-1", result, cfg)

    assert path.exists()
    assert path.name == "triage_result.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["recommended_llm"] == "litelm"
    assert data["doc_type_hint"] == "promotional"
    assert "saved_at" in data  # timestamp must be written
    assert (tmp_path / "doc-1" / "triage_audit.json").exists()


def test_save_triage_result_writes_triage_audit_when_meta_provided(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-audit").mkdir()
    audit = {
        "model": "triage",
        "context_char_count": 1234,
        "prompt_sha256": "d" * 64,
        "prompt_template_sha256": "e" * 64,
        "model_parameters": {"temperature": 0.0, "max_tokens": 400},
        "duration_ms": 42,
        "raw_response_chars": 250,
        "validation_path": "json_object",
        "validation_attempts": 1,
    }
    save_triage_result("doc-audit", _result(triage_succeeded=True), cfg, _audit=audit)
    payload = json.loads((tmp_path / "doc-audit" / "triage_audit.json").read_text())
    assert payload["model"] == "triage"
    assert payload["context_char_count"] == 1234
    assert payload["prompt_sha256"] == "d" * 64
    assert payload["prompt_template_sha256"] == "e" * 64
    assert payload["model_parameters"]["max_tokens"] == 400
    assert payload["duration_ms"] == 42
    assert payload["validation_path"] == "json_object"


def test_save_triage_result_creates_missing_doc_dir(tmp_path):
    """Doc folder need not exist before save — save_triage_result creates it."""
    cfg = _cfg(tmp_path)
    assert not (tmp_path / "new-doc").exists()
    save_triage_result("new-doc", _result(), cfg)
    assert (tmp_path / "new-doc" / "triage_result.json").exists()


def test_save_triage_result_overwrites_previous(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-2").mkdir()
    save_triage_result("doc-2", _result(recommended_llm="litelm"), cfg)
    save_triage_result("doc-2", _result(recommended_llm="claude"), cfg)
    data = json.loads((tmp_path / "doc-2" / "triage_result.json").read_text())
    assert data["recommended_llm"] == "claude"


def test_save_triage_result_stores_all_fields(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-3").mkdir()
    result = _result(
        recommended_llm="litelm-reasoning",
        doc_type_hint="legal",
        complexity="complex",
        estimated_tokens=12000,
        languages=["en", "de"],
        routing_reason="Court document with mixed languages.",
    )
    save_triage_result("doc-3", result, cfg)
    data = json.loads((tmp_path / "doc-3" / "triage_result.json").read_text())
    assert data["recommended_llm"] == "litelm-reasoning"
    assert data["doc_type_hint"] == "legal"
    assert data["complexity"] == "complex"
    assert data["estimated_tokens"] == 12000
    assert "en" in data["languages"]
    assert "de" in data["languages"]
    assert data["routing_reason"] == "Court document with mixed languages."


# ---------------------------------------------------------------------------
# load_triage_result
# ---------------------------------------------------------------------------

def test_load_triage_result_returns_none_when_file_missing(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-no-triage").mkdir()
    assert load_triage_result("doc-no-triage", cfg) is None


def test_load_triage_result_returns_none_when_doc_dir_missing(tmp_path):
    cfg = _cfg(tmp_path)
    assert load_triage_result("nonexistent", cfg) is None


def test_load_triage_result_round_trips(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-rt").mkdir()
    original = _result(recommended_llm="claude", doc_type_hint="legal")
    save_triage_result("doc-rt", original, cfg)
    loaded = load_triage_result("doc-rt", cfg)
    assert loaded is not None
    assert loaded.recommended_llm == "claude"
    assert loaded.doc_type_hint == "legal"


def test_load_triage_result_returns_none_on_corrupt_json(tmp_path):
    cfg = _cfg(tmp_path)
    doc_dir = tmp_path / "doc-bad"
    doc_dir.mkdir()
    (doc_dir / "triage_result.json").write_text("not json at all", encoding="utf-8")
    assert load_triage_result("doc-bad", cfg) is None


def test_load_triage_result_ignores_extra_fields(tmp_path):
    """saved_at and any future fields should be silently ignored (extra='ignore')."""
    cfg = _cfg(tmp_path)
    doc_dir = tmp_path / "doc-extra"
    doc_dir.mkdir()
    (doc_dir / "triage_result.json").write_text(
        json.dumps({
            "recommended_llm": "litelm",
            "doc_type_hint": "news",
            "complexity": "simple",
            "languages": ["en"],
            "estimated_tokens": 500,
            "routing_reason": "News article.",
            "saved_at": "2026-05-17T10:00:00+00:00",
            "future_field": "ignored",
        }),
        encoding="utf-8",
    )
    loaded = load_triage_result("doc-extra", cfg)
    assert loaded is not None
    assert loaded.recommended_llm == "litelm"
