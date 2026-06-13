"""Tests for analysis audit wiring (Slice 2).

Verifies that _audit dicts are populated through:
  - _validate_response(): validation_path, validation_attempts, errors
  - analyze.run(): llm_flag
  - _analyze_with_litelm() / _analyze_with_claude(): model, input_char_count,
    input_truncated, raw_response_chars
  - upload.save_locally(): writes analysis_audit.json when _audit provided;
    leaves it absent when _audit=None (backward compat)

All HTTP calls are monkeypatched; no real network or LLM traffic.
"""
from __future__ import annotations

import json
import sys
import types
from pathlib import Path

import pytest

from runner.models.document import AnalysisResult, IntakeResult, PreprocessResult
from runner.pipeline import analyze
from runner.pipeline.analyze import _validate_response
from runner.pipeline.upload import save_locally


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _minimal_payload(**overrides) -> dict:
    data = {
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["A clear anti-SOGICE statement."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "Short summary.",
        "confidence": {"overall_score": 0.85, "status": "high", "reasons": []},
    }
    data.update(overrides)
    return data


def _analysis(**overrides) -> AnalysisResult:
    return AnalysisResult.model_validate(_minimal_payload(**overrides))


def _preprocess(text: str = "Document text here.", truncated: bool = False) -> PreprocessResult:
    result = PreprocessResult(
        doc_id="doc-test-01",
        tool_used="trafilatura",
        quality="high",
        text=text,
    )
    result.truncated = truncated
    return result


def _intake(doc_id: str = "doc-test-01", tmp_path: Path | None = None) -> IntakeResult:
    return IntakeResult(
        doc_id=doc_id,
        source="https://example.org/doc",
        source_type="url",
        declared_type="url",
        tier=2,
        batch_id="batch-01",
        language="en",
        source_url="https://example.org/doc",
        original_filename="",
        local_copy_path="",
        local_dir=tmp_path,
    )


def _config(tmp_path: Path) -> object:
    return types.SimpleNamespace(
        corpus_dir=tmp_path,
        embedding_model="qwen3-embedding:8b",
        litelm_base_url="http://mac-studio:4000",
        litelm_api_key="test",
        litelm_analysis_model="core-qwen",
        litelm_analysis_model_heavy="core-gemma",
        litelm_analysis_model_reasoning="review-qwen",
        local_analysis_model="qwen3.5:9b",
        local_analysis_model_heavy="gemma-4-26B",
        local_analysis_model_reasoning="ministral",
        local_output_tokens=4096,
        local_context_tokens=262144,
        claude_model="claude-sonnet-4-6",
        claude_output_tokens=8192,
        anthropic_api_key="test-key",
        openrouter_api_key="",
        openrouter_model="",
        ollama_base_url="http://localhost:11434",
        truncation_limit=24000,
        truncation_limit_local=250000,
        truncation_head_chars=20000,
        truncation_tail_chars=8000,
    )


# ---------------------------------------------------------------------------
# _validate_response -- validation_path and validation_attempts
# ---------------------------------------------------------------------------

def test_validate_response_outside_think_tags_path():
    raw = json.dumps(_minimal_payload())
    audit: dict = {}
    _validate_response(raw, _audit=audit)
    assert audit["validation_path"] == "outside_think_tags"
    assert audit["validation_attempts"] == 1


def test_validate_response_inside_think_tags_path():
    payload = json.dumps(_minimal_payload())
    raw = f"<think>private reasoning only</think>\n{payload}"
    # The outside-think-tags pass strips the think block, leaving only the payload.
    # That succeeds on the first attempt.
    audit: dict = {}
    _validate_response(raw, _audit=audit)
    assert audit["validation_path"] == "outside_think_tags"
    assert audit["validation_attempts"] == 1


def test_validate_response_inside_think_tags_path_only():
    # Valid JSON ONLY inside the think block; outside is garbage.
    payload = json.dumps(_minimal_payload())
    raw = f"<think>{payload}</think>\nnot valid json"
    audit: dict = {}
    _validate_response(raw, _audit=audit)
    assert audit["validation_path"] == "inside_think_tags"
    assert audit["validation_attempts"] == 2


def test_validate_response_raw_path():
    # JSON with no think tags and no markdown fence -- falls straight to raw path
    # (outside-think-tags attempt strips nothing and also finds it, so this
    # actually succeeds on attempt 1 as outside_think_tags)
    raw = json.dumps(_minimal_payload())
    audit: dict = {}
    _validate_response(raw, _audit=audit)
    assert audit["validation_path"] in ("outside_think_tags", "raw")


def test_validate_response_attempts_count_increases_on_failure():
    # Force multiple attempts by embedding JSON only inside think tag.
    payload = json.dumps(_minimal_payload())
    raw = f"<think>{payload}</think>garbage outside"
    audit: dict = {}
    _validate_response(raw, _audit=audit)
    # attempt 1: outside (finds "garbage outside" -- no valid JSON)
    # attempt 2: inside think block (finds payload) -- succeeds
    assert audit["validation_attempts"] == 2


def test_validate_response_failed_path_populates_errors():
    raw = "not json at all"
    audit: dict = {}
    with pytest.raises(ValueError):
        _validate_response(raw, _audit=audit)
    assert audit["validation_path"] == "failed"
    assert audit["validation_attempts"] >= 1
    assert len(audit["errors"]) >= 1
    assert "Could not extract" in audit["errors"][0]


def test_validate_response_no_audit_unchanged_behavior():
    # Calling without _audit should work exactly as before.
    raw = json.dumps(_minimal_payload())
    result = _validate_response(raw)
    assert result.type == "Anti-SOGICE"


def test_validate_response_marks_explicit_confidence_score_not_derived():
    audit: dict = {}
    _validate_response(json.dumps(_minimal_payload()), _audit=audit)
    assert audit["score_derived_from_status"] is False


def test_validate_response_marks_missing_confidence_score_as_derived():
    payload = _minimal_payload(confidence={"status": "medium", "reasons": []})
    audit: dict = {}
    result = _validate_response(json.dumps(payload), _audit=audit)
    assert result.confidence.overall_score == 0.75
    assert audit["score_derived_from_status"] is True


def test_validate_response_repairs_blocked_placeholder_labels():
    payload = _minimal_payload(
        type="Unclassified",
        format="Unknown",
        narrative_register="Unclassified",
        confidence={
            "overall": 0.0,
            "status": "low",
            "reasons": ["Document text is empty or blocked"],
        },
        research_summary="Blocked placeholder awaiting capture.",
    )
    payload.pop("summary")

    result = _validate_response(json.dumps(payload))

    assert result.type == "Mixed"
    assert result.format == "Other"
    assert result.narrative_register == "Mixed"
    assert result.needs_review is True
    assert any("invalid document type 'Unclassified'" in w for w in result.normalisation_warnings)
    assert any("invalid format 'Unknown'" in w for w in result.normalisation_warnings)
    assert any("invalid narrative_register 'Unclassified'" in w for w in result.normalisation_warnings)


# ---------------------------------------------------------------------------
# analyze.run() -- llm_flag
# ---------------------------------------------------------------------------

def test_run_sets_llm_flag_in_audit(monkeypatch, tmp_path):
    def _fake_litelm(preprocess, config, model, *, _audit=None):
        if _audit is not None:
            _audit["model"] = model
            _audit["input_char_count"] = len(preprocess.text)
            _audit["input_truncated"] = False
            _audit["raw_response_chars"] = 100
            _audit["validation_path"] = "outside_think_tags"
            _audit["validation_attempts"] = 1
        return _analysis()

    monkeypatch.setattr(analyze, "_analyze_with_litelm", _fake_litelm)

    audit: dict = {}
    analyze.run(_preprocess(), "litelm", _config(tmp_path), _audit=audit)
    assert audit["llm_flag"] == "litelm"
    assert "duration_ms" in audit


def test_run_initialises_errors_list(monkeypatch, tmp_path):
    def _fake_litelm(preprocess, config, model, *, _audit=None):
        return _analysis()

    monkeypatch.setattr(analyze, "_analyze_with_litelm", _fake_litelm)

    audit: dict = {}
    analyze.run(_preprocess(), "litelm", _config(tmp_path), _audit=audit)
    assert "errors" in audit
    assert isinstance(audit["errors"], list)


def test_run_without_audit_unchanged_behavior(monkeypatch, tmp_path):
    def _fake_litelm(preprocess, config, model, *, _audit=None):
        return _analysis()

    monkeypatch.setattr(analyze, "_analyze_with_litelm", _fake_litelm)

    result = analyze.run(_preprocess(), "litelm", _config(tmp_path))
    assert result.type == "Anti-SOGICE"


# ---------------------------------------------------------------------------
# _analyze_with_litelm -- model, input_char_count, raw_response_chars
# ---------------------------------------------------------------------------

def test_analyze_with_litelm_populates_audit(monkeypatch, tmp_path):
    raw_payload = json.dumps(_minimal_payload())

    class FakeResponse:
        def raise_for_status(self): pass
        def json(self):
            return {"choices": [{"message": {"content": raw_payload}}]}

    monkeypatch.setattr(analyze, "call_with_http_retries", lambda fn: fn())
    import httpx
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: FakeResponse())

    cfg = _config(tmp_path)
    preprocess = _preprocess("Some document text of known length.", truncated=True)
    audit: dict = {}

    analyze._analyze_with_litelm(preprocess, cfg, "core-qwen", _audit=audit)

    assert audit["model"] == "core-qwen"
    assert audit["input_char_count"] == len(preprocess.text)
    assert audit["input_truncated"] is True
    assert len(audit["prompt_sha256"]) == 64
    assert len(audit["prompt_template_sha256"]) == 64
    assert audit["model_parameters"]["temperature"] == 0.1
    assert audit["model_parameters"]["max_tokens"] == cfg.local_output_tokens
    assert audit["raw_response_chars"] == len(raw_payload)


def test_analyze_with_litelm_no_audit_unchanged(monkeypatch, tmp_path):
    raw_payload = json.dumps(_minimal_payload())

    class FakeResponse:
        def raise_for_status(self): pass
        def json(self):
            return {"choices": [{"message": {"content": raw_payload}}]}

    monkeypatch.setattr(analyze, "call_with_http_retries", lambda fn: fn())
    import httpx
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: FakeResponse())

    result = analyze._analyze_with_litelm(_preprocess(), _config(tmp_path), "core-qwen")
    assert result.type == "Anti-SOGICE"


# ---------------------------------------------------------------------------
# _analyze_with_claude -- model, input_char_count, raw_response_chars
# ---------------------------------------------------------------------------

def test_analyze_with_claude_populates_audit(monkeypatch, tmp_path):
    raw_payload = json.dumps(_minimal_payload())

    class FakeMessage:
        content = [types.SimpleNamespace(text=raw_payload)]

    class FakeMessages:
        @staticmethod
        def create(**kwargs):
            return FakeMessage()

    class FakeClient:
        messages = FakeMessages()
        def __init__(self, **kwargs): pass

    monkeypatch.setattr("anthropic.Anthropic", lambda **kw: FakeClient())

    cfg = _config(tmp_path)
    preprocess = _preprocess("Claude input text.", truncated=False)
    audit: dict = {}

    analyze._analyze_with_claude(preprocess, cfg, _audit=audit)

    assert audit["model"] == cfg.claude_model
    assert audit["input_char_count"] == len(preprocess.text)
    assert audit["input_truncated"] is False
    assert len(audit["prompt_sha256"]) == 64
    assert len(audit["prompt_template_sha256"]) == 64
    assert audit["model_parameters"]["max_tokens"] == cfg.claude_output_tokens
    assert audit["model_parameters"]["system_cache_control"] == "ephemeral"
    assert audit["raw_response_chars"] == len(raw_payload)


# ---------------------------------------------------------------------------
# save_locally -- analysis_audit.json written iff _audit is provided
# ---------------------------------------------------------------------------

def test_save_locally_writes_analysis_audit_when_audit_provided(tmp_path):
    doc_id = "doc-audit-test"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    audit = {
        "llm_flag": "litelm",
        "model": "core-qwen",
        "input_char_count": 5000,
        "input_truncated": False,
        "lexicon_terms_available": 85,
        "lexicon_terms_injected": 85,
        "lexicon_injection_cap": 200,
        "raw_response_chars": 800,
        "validation_path": "outside_think_tags",
        "validation_attempts": 1,
        "errors": [],
    }

    save_locally(
        _intake(doc_id=doc_id, tmp_path=doc_dir),
        _preprocess(),
        [],
        _analysis(),
        types.SimpleNamespace(corpus_dir=tmp_path, embedding_model="qwen3-embedding:8b"),
        llm_used="litelm",
        _audit=audit,
    )

    assert (doc_dir / "analysis_audit.json").exists()
    payload = json.loads((doc_dir / "analysis_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert payload["model"] == "core-qwen"
    assert payload["doc_type"] == "Anti-SOGICE"
    assert payload["lexicon_terms_available"] == 85
    assert payload["lexicon_terms_injected"] == 85
    assert payload["lexicon_injection_cap"] == 200


def test_save_locally_no_audit_file_when_audit_none(tmp_path):
    doc_id = "doc-no-audit"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    save_locally(
        _intake(doc_id=doc_id, tmp_path=doc_dir),
        _preprocess(),
        [],
        _analysis(),
        types.SimpleNamespace(corpus_dir=tmp_path, embedding_model="qwen3-embedding:8b"),
        llm_used="litelm",
        _audit=None,
    )

    assert not (doc_dir / "analysis_audit.json").exists()


def test_save_locally_empty_audit_dict_writes_defaults(tmp_path):
    doc_id = "doc-empty-audit"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    save_locally(
        _intake(doc_id=doc_id, tmp_path=doc_dir),
        _preprocess(),
        [],
        _analysis(),
        types.SimpleNamespace(corpus_dir=tmp_path, embedding_model="qwen3-embedding:8b"),
        llm_used="litelm",
        _audit={},
    )

    payload = json.loads((doc_dir / "analysis_audit.json").read_text())
    assert payload["llm_flag"] == ""
    assert payload["model"] == ""
    assert payload["doc_type"] == "Anti-SOGICE"  # derived from analysis


def test_save_locally_persists_all_three_lexicon_fields(tmp_path):
    doc_id = "doc-lexicon-cap"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    audit = {
        "lexicon_terms_available": 250,
        "lexicon_terms_injected": 200,
        "lexicon_injection_cap": 200,
    }

    save_locally(
        _intake(doc_id=doc_id, tmp_path=doc_dir),
        _preprocess(),
        [],
        _analysis(),
        types.SimpleNamespace(corpus_dir=tmp_path, embedding_model="qwen3-embedding:8b"),
        llm_used="litelm",
        _audit=audit,
    )

    payload = json.loads((doc_dir / "analysis_audit.json").read_text())
    assert payload["lexicon_terms_available"] == 250
    assert payload["lexicon_terms_injected"] == 200
    assert payload["lexicon_injection_cap"] == 200


def test_save_locally_lexicon_zero_when_absent_from_audit(tmp_path):
    doc_id = "doc-lexicon-zero"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    # Audit dict with no lexicon fields at all — should default to 0
    save_locally(
        _intake(doc_id=doc_id, tmp_path=doc_dir),
        _preprocess(),
        [],
        _analysis(),
        types.SimpleNamespace(corpus_dir=tmp_path, embedding_model="qwen3-embedding:8b"),
        llm_used="litelm",
        _audit={},
    )

    payload = json.loads((doc_dir / "analysis_audit.json").read_text())
    assert payload["lexicon_terms_available"] == 0
    assert payload["lexicon_terms_injected"] == 0
    assert payload["lexicon_injection_cap"] == 0
