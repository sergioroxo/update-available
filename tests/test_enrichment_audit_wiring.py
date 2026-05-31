"""Tests for enrichment audit wiring (TASK C).

Verifies that _audit dicts are populated through:
  - _validate_response(): validation_path, validation_attempts,
    normalization_repairs, errors
  - run(): llm_flag, input_char_count, chunked/chunk_count/chunks defaults
  - _call_enrichment_model(): model name per routing branch
  - _run_chunked_enrichment(): chunked=True, chunk_count, chunks list
  - save(): writes enrichment_audit.json when _audit provided;
    leaves it absent when _audit=None (backward compat)

All HTTP calls are monkeypatched; no real network or LLM traffic.
"""
from __future__ import annotations

import json
import types
from pathlib import Path

import pytest

from runner.models.document import AnalysisResult, PreprocessResult
from runner.models.enrichment import EnrichmentResult
from runner.pipeline import enrich
from runner.pipeline.enrich import _validate_response, _normalize_enrichment_payload


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _minimal_enrichment_payload(**overrides) -> dict:
    data = {
        "lexicon_proposals": [],
        "entity_proposals": [],
        "tactic_proposals": [],
        "ingestion_queue": [],
        "corpus_connections": [],
        "practice_descriptions": [],
        "statistical_claims": [],
    }
    data.update(overrides)
    return data


def _enrichment_json(**overrides) -> str:
    return json.dumps(_minimal_enrichment_payload(**overrides))


def _analysis() -> AnalysisResult:
    return AnalysisResult.model_validate({
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["A clear statement."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "Short summary.",
    })


def _preprocess(text: str = "Document text here.") -> PreprocessResult:
    return PreprocessResult(
        doc_id="doc-test-01",
        tool_used="trafilatura",
        quality="high",
        text=text,
    )


def _config(tmp_path: Path) -> object:
    return types.SimpleNamespace(
        corpus_dir=tmp_path,
        litelm_base_url="http://mac-studio:4000",
        litelm_api_key="test",
        litelm_enrichment_model="core-gemma",
        litelm_enrichment_model_alt="review-gemma",
        local_analysis_model="qwen3.5:9b",
        local_output_tokens=4096,
        local_context_tokens=262144,
        claude_model="claude-sonnet-4-6",
        ollama_base_url="http://localhost:11434",
        sanity_project_id="proj",
        sanity_dataset="production",
        sanity_api_token="tok",
        anthropic_api_key="test-key",
    )


# ---------------------------------------------------------------------------
# _normalize_enrichment_payload — repair counting
# ---------------------------------------------------------------------------

def test_normalize_returns_tuple():
    data = _minimal_enrichment_payload()
    result = _normalize_enrichment_payload(data)
    assert isinstance(result, tuple)
    assert len(result) == 2
    normalized, repairs = result
    assert isinstance(normalized, dict)
    assert isinstance(repairs, int)


def test_normalize_zero_repairs_for_valid_payload():
    data = _minimal_enrichment_payload(lexicon_proposals=[{
        "action": "add_new",
        "term": "therapeutic journey",
        "exact_quote": "quote",
        "proposed_cluster": "Pastoral-Coercion",
        "function": "Euphemism",
        "register": "promotional",
    }])
    _, repairs = _normalize_enrichment_payload(data)
    assert repairs == 0


def test_normalize_counts_invalid_action_as_repair():
    data = _minimal_enrichment_payload(lexicon_proposals=[{
        "action": "create",       # not in _LEXICON_ACTIONS → repair
        "term": "t",
        "exact_quote": "q",
        "proposed_cluster": "Unknown",
        "function": "Unknown",
    }])
    _, repairs = _normalize_enrichment_payload(data)
    assert repairs >= 1


def test_normalize_counts_invalid_cluster_as_repair():
    data = _minimal_enrichment_payload(lexicon_proposals=[{
        "action": "add_new",
        "term": "t",
        "exact_quote": "q",
        "proposed_cluster": "NotARealCluster",   # repair
        "function": "Unknown",
    }])
    _, repairs = _normalize_enrichment_payload(data)
    assert repairs >= 1


def test_normalize_counts_multiple_repairs_across_proposals():
    data = _minimal_enrichment_payload(
        lexicon_proposals=[{"action": "invent", "term": "t", "exact_quote": "q",
                            "proposed_cluster": "BOGUS", "function": "BAD"}],
        entity_proposals=[{"action": "invent", "entity_type": "robot",
                           "name": "Org", "evidence_quote": "q"}],
    )
    _, repairs = _normalize_enrichment_payload(data)
    assert repairs >= 3


def test_normalize_alias_does_not_count_as_repair():
    # "Moral-Purity-Frame" is a known alias for "Moral-Purity Frame" — not a repair
    data = _minimal_enrichment_payload(lexicon_proposals=[{
        "action": "add_new",
        "term": "t",
        "exact_quote": "q",
        "proposed_cluster": "Unknown",
        "function": "Moral-Purity-Frame",  # alias, not a repair
    }])
    _, repairs = _normalize_enrichment_payload(data)
    assert repairs == 0


# ---------------------------------------------------------------------------
# _validate_response — validation_path, validation_attempts, repairs
# ---------------------------------------------------------------------------

def test_validate_response_outside_think_tags_path():
    raw = _enrichment_json()
    audit: dict = {}
    _validate_response("doc-1", raw, "litelm", _audit=audit)
    assert audit["validation_path"] == "outside_think_tags"
    assert audit["validation_attempts"] == 1


def test_validate_response_inside_think_tags_path():
    payload = _enrichment_json()
    raw = f"<think>{payload}</think>not valid json at all"
    audit: dict = {}
    _validate_response("doc-1", raw, "litelm", _audit=audit)
    assert audit["validation_path"] == "inside_think_tags"
    assert audit["validation_attempts"] == 2


def test_validate_response_raw_path():
    raw = _enrichment_json()
    audit: dict = {}
    _validate_response("doc-1", raw, "litelm", _audit=audit)
    assert audit["validation_path"] in ("outside_think_tags", "raw")


def test_validate_response_failed_path_populates_errors():
    raw = "not json at all"
    audit: dict = {}
    with pytest.raises(ValueError):
        _validate_response("doc-1", raw, "litelm", _audit=audit)
    assert audit["validation_path"] == "failed"
    assert audit["validation_attempts"] >= 1
    assert len(audit["errors"]) >= 1
    assert "Could not extract" in audit["errors"][0]


def test_validate_response_no_audit_unchanged_behavior():
    raw = _enrichment_json()
    result = _validate_response("doc-1", raw, "litelm")
    assert isinstance(result, EnrichmentResult)


def test_validate_response_records_normalization_repairs():
    data = _minimal_enrichment_payload(lexicon_proposals=[{
        "action": "create",        # invalid → repair
        "term": "t",
        "exact_quote": "q",
        "proposed_cluster": "Unknown",
        "function": "Unknown",
    }])
    raw = json.dumps(data)
    audit: dict = {}
    _validate_response("doc-1", raw, "litelm", _audit=audit)
    assert audit.get("normalization_repairs", 0) >= 1


def test_validate_response_zero_repairs_for_clean_payload():
    data = _minimal_enrichment_payload(lexicon_proposals=[{
        "action": "add_new",
        "term": "t",
        "exact_quote": "q",
        "proposed_cluster": "Unknown",
        "function": "Unknown",
        "register": "neutral",
    }])
    raw = json.dumps(data)
    audit: dict = {}
    _validate_response("doc-1", raw, "litelm", _audit=audit)
    assert audit.get("normalization_repairs", 0) == 0


# ---------------------------------------------------------------------------
# run() — llm_flag, input_char_count, chunked defaults
# ---------------------------------------------------------------------------

def test_run_sets_llm_flag(monkeypatch, tmp_path):
    def _fake_model(llm, sp, um, config, model=None, *, _audit=None):
        if _audit is not None:
            _audit["model"] = "core-gemma"
        return _enrichment_json()

    monkeypatch.setattr(enrich, "_call_enrichment_model", _fake_model)
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    audit: dict = {}
    enrich.run("doc-1", _preprocess(), _analysis(), _config(tmp_path), _audit=audit)
    assert audit["llm_flag"] == "litelm"
    assert len(audit["prompt_sha256"]) == 64
    assert len(audit["prompt_template_sha256"]) == 64
    assert audit["prompt_template_sha256"] != audit["prompt_sha256"]
    assert "duration_ms" in audit


def test_run_sets_input_char_count(monkeypatch, tmp_path):
    def _fake_model(llm, sp, um, config, model=None, *, _audit=None):
        if _audit is not None:
            _audit["model"] = "core-gemma"
        return _enrichment_json()

    monkeypatch.setattr(enrich, "_call_enrichment_model", _fake_model)
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    text = "Document text with known length."
    audit: dict = {}
    enrich.run("doc-1", _preprocess(text), _analysis(), _config(tmp_path), _audit=audit)
    assert audit["input_char_count"] == len(text)


def test_run_sets_chunked_false_for_non_chunked(monkeypatch, tmp_path):
    def _fake_model(llm, sp, um, config, model=None, *, _audit=None):
        if _audit is not None:
            _audit["model"] = "core-gemma"
        return _enrichment_json()

    monkeypatch.setattr(enrich, "_call_enrichment_model", _fake_model)
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    audit: dict = {}
    enrich.run("doc-1", _preprocess(), _analysis(), _config(tmp_path), _audit=audit)
    assert audit["chunked"] is False
    assert audit["chunk_count"] is None
    assert audit["chunks"] is None


def test_run_initializes_errors_list(monkeypatch, tmp_path):
    def _fake_model(llm, sp, um, config, model=None, *, _audit=None):
        if _audit is not None:
            _audit["model"] = "core-gemma"
        return _enrichment_json()

    monkeypatch.setattr(enrich, "_call_enrichment_model", _fake_model)
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    audit: dict = {}
    enrich.run("doc-1", _preprocess(), _analysis(), _config(tmp_path), _audit=audit)
    assert "errors" in audit
    assert isinstance(audit["errors"], list)


def test_run_without_audit_unchanged_behavior(monkeypatch, tmp_path):
    def _fake_model(llm, sp, um, config, model=None, *, _audit=None):
        return _enrichment_json()

    monkeypatch.setattr(enrich, "_call_enrichment_model", _fake_model)
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    result = enrich.run("doc-1", _preprocess(), _analysis(), _config(tmp_path))
    assert isinstance(result, EnrichmentResult)


# ---------------------------------------------------------------------------
# _call_enrichment_model — model name capture
# ---------------------------------------------------------------------------

def test_call_enrichment_model_litelm_sets_model(monkeypatch, tmp_path):
    class FakeResponse:
        def raise_for_status(self): pass
        def json(self):
            return {"choices": [{"message": {"content": _enrichment_json()}}]}

    monkeypatch.setattr(enrich, "call_with_http_retries", lambda fn: fn())
    import httpx
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: FakeResponse())

    cfg = _config(tmp_path)
    audit: dict = {}
    enrich._call_enrichment_model("litelm", "sys", "usr", cfg, _audit=audit)
    assert audit["model"] == cfg.litelm_enrichment_model
    assert audit["model_parameters"]["temperature"] == 0.1
    assert audit["model_parameters"]["max_tokens"] == cfg.local_output_tokens


def test_call_enrichment_model_litelm_uses_override_model(monkeypatch, tmp_path):
    class FakeResponse:
        def raise_for_status(self): pass
        def json(self):
            return {"choices": [{"message": {"content": _enrichment_json()}}]}

    monkeypatch.setattr(enrich, "call_with_http_retries", lambda fn: fn())
    import httpx
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: FakeResponse())

    cfg = _config(tmp_path)
    audit: dict = {}
    enrich._call_enrichment_model("litelm", "sys", "usr", cfg, model="review-gemma", _audit=audit)
    assert audit["model"] == "review-gemma"


def test_call_enrichment_model_no_audit_unchanged(monkeypatch, tmp_path):
    class FakeResponse:
        def raise_for_status(self): pass
        def json(self):
            return {"choices": [{"message": {"content": _enrichment_json()}}]}

    monkeypatch.setattr(enrich, "call_with_http_retries", lambda fn: fn())
    import httpx
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: FakeResponse())

    cfg = _config(tmp_path)
    raw = enrich._call_enrichment_model("litelm", "sys", "usr", cfg)
    assert isinstance(raw, str)


# ---------------------------------------------------------------------------
# _run_chunked_enrichment — chunked audit fields
# ---------------------------------------------------------------------------

def test_chunked_enrichment_sets_chunked_true(monkeypatch, tmp_path):
    call_count = [0]

    def _fake_model(llm, sp, um, config, model=None, *, _audit=None):
        call_count[0] += 1
        return _enrichment_json()

    monkeypatch.setattr(enrich, "_call_enrichment_model", _fake_model)
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    audit: dict = {}
    enrich._run_chunked_enrichment(
        doc_id="doc-1",
        preprocess=_preprocess("x" * 500),
        analysis=_analysis(),
        config=_config(tmp_path),
        llm="litelm",
        model=None,
        first_error=ValueError("test"),
        _audit=audit,
    )
    assert audit["chunked"] is True


def test_chunked_enrichment_sets_chunk_count(monkeypatch, tmp_path):
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    text = "word " * 5000   # long enough to produce multiple chunks
    audit: dict = {}
    enrich._run_chunked_enrichment(
        doc_id="doc-1",
        preprocess=_preprocess(text),
        analysis=_analysis(),
        config=_config(tmp_path),
        llm="litelm",
        model=None,
        first_error=ValueError("test"),
        _audit=audit,
    )
    assert isinstance(audit["chunk_count"], int)
    assert audit["chunk_count"] >= 1


def test_chunked_enrichment_builds_chunks_list(monkeypatch, tmp_path):
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    text = "word " * 5000
    audit: dict = {}
    enrich._run_chunked_enrichment(
        doc_id="doc-1",
        preprocess=_preprocess(text),
        analysis=_analysis(),
        config=_config(tmp_path),
        llm="litelm",
        model=None,
        first_error=ValueError("test"),
        _audit=audit,
    )
    assert isinstance(audit["chunks"], list)
    assert len(audit["chunks"]) == audit["chunk_count"]
    for entry in audit["chunks"]:
        assert "index" in entry
        assert "char_count" in entry
        assert "succeeded" in entry
        assert "error" in entry


def test_chunked_enrichment_marks_successful_chunks(monkeypatch, tmp_path):
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    text = "word " * 3000
    audit: dict = {}
    enrich._run_chunked_enrichment(
        doc_id="doc-1",
        preprocess=_preprocess(text),
        analysis=_analysis(),
        config=_config(tmp_path),
        llm="litelm",
        model=None,
        first_error=ValueError("test"),
        _audit=audit,
    )
    assert all(c["succeeded"] is True for c in audit["chunks"])
    assert all(c["error"] is None for c in audit["chunks"])


def test_chunked_enrichment_records_failed_chunk(monkeypatch, tmp_path):
    call_count = [0]

    def _fail_second(llm, sp, um, config, model=None, *, _audit=None):
        call_count[0] += 1
        if call_count[0] == 2:
            raise ValueError("model timeout on chunk 2")
        return _enrichment_json()

    monkeypatch.setattr(enrich, "_call_enrichment_model", _fail_second)
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    text = "word " * 5000
    audit: dict = {}
    enrich._run_chunked_enrichment(
        doc_id="doc-1",
        preprocess=_preprocess(text),
        analysis=_analysis(),
        config=_config(tmp_path),
        llm="litelm",
        model=None,
        first_error=ValueError("test"),
        _audit=audit,
    )
    failed = [c for c in audit["chunks"] if not c["succeeded"]]
    assert len(failed) >= 1
    assert failed[0]["error"] is not None


def test_chunked_enrichment_no_audit_unchanged_behavior(monkeypatch, tmp_path):
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    text = "word " * 3000
    result = enrich._run_chunked_enrichment(
        doc_id="doc-1",
        preprocess=_preprocess(text),
        analysis=_analysis(),
        config=_config(tmp_path),
        llm="litelm",
        model=None,
        first_error=ValueError("test"),
    )
    assert isinstance(result, EnrichmentResult)


# ---------------------------------------------------------------------------
# save() — enrichment_audit.json written iff _audit is provided
# ---------------------------------------------------------------------------

def _make_result(doc_id: str = "doc-save-test") -> EnrichmentResult:
    return EnrichmentResult.model_validate({"doc_id": doc_id, "enrichment_model": "core-gemma"})


def test_save_writes_enrichment_audit_when_audit_provided(tmp_path):
    doc_id = "doc-save-test"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    cfg = types.SimpleNamespace(corpus_dir=tmp_path)
    audit = {
        "llm_flag": "litelm",
        "model": "core-gemma",
        "input_char_count": 9000,
        "chunked": False,
        "chunk_count": None,
        "chunks": None,
        "validation_path": "outside_think_tags",
        "validation_attempts": 1,
        "normalization_repairs": 0,
        "errors": [],
    }

    enrich.save(doc_id, _make_result(doc_id), cfg, _audit=audit)

    assert (doc_dir / "enrichment_audit.json").exists()
    payload = json.loads((doc_dir / "enrichment_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert payload["model"] == "core-gemma"
    assert payload["chunked"] is False
    assert payload["validation_path"] == "outside_think_tags"


def test_save_no_audit_file_when_audit_none(tmp_path):
    doc_id = "doc-no-audit"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    cfg = types.SimpleNamespace(corpus_dir=tmp_path)
    enrich.save(doc_id, _make_result(doc_id), cfg, _audit=None)

    assert not (doc_dir / "enrichment_audit.json").exists()


def test_save_empty_audit_dict_writes_defaults(tmp_path):
    doc_id = "doc-empty-audit"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    cfg = types.SimpleNamespace(corpus_dir=tmp_path)
    enrich.save(doc_id, _make_result(doc_id), cfg, _audit={})

    payload = json.loads((doc_dir / "enrichment_audit.json").read_text())
    assert payload["llm_flag"] == ""
    assert payload["chunked"] is False
    assert payload["doc_id"] == doc_id


def test_save_backward_compat_no_audit_kwarg(tmp_path):
    doc_id = "doc-compat"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    cfg = types.SimpleNamespace(corpus_dir=tmp_path)
    path = enrich.save(doc_id, _make_result(doc_id), cfg)
    assert path.exists()
    assert not (doc_dir / "enrichment_audit.json").exists()


def test_save_archives_previous_enrichment_audit(tmp_path):
    doc_id = "doc-archive-test"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    cfg = types.SimpleNamespace(corpus_dir=tmp_path)
    audit = {"llm_flag": "litelm", "model": "core-gemma"}

    enrich.save(doc_id, _make_result(doc_id), cfg, _audit=audit)
    enrich.save(doc_id, _make_result(doc_id), cfg, _audit=audit)

    audit_files = list(doc_dir.glob("enrichment_audit*.json"))
    assert len(audit_files) == 2
    assert (doc_dir / "enrichment_audit.json").exists()
    archived = [f for f in audit_files if f.name != "enrichment_audit.json"]
    assert len(archived) == 1


# ---------------------------------------------------------------------------
# End-to-end: run() → save() — audit flows from run to disk
# ---------------------------------------------------------------------------

def test_run_to_save_audit_persisted(monkeypatch, tmp_path):
    def _fake_model(llm, sp, um, config, model=None, *, _audit=None):
        if _audit is not None:
            _audit["model"] = "core-gemma"
        return _enrichment_json()

    monkeypatch.setattr(enrich, "_call_enrichment_model", _fake_model)
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    doc_id = "doc-e2e"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    cfg = _config(tmp_path)
    audit: dict = {}
    result = enrich.run(doc_id, _preprocess("Some text"), _analysis(), cfg, _audit=audit)
    enrich.save(doc_id, result, cfg, _audit=audit)

    assert (doc_dir / "enrichment_audit.json").exists()
    payload = json.loads((doc_dir / "enrichment_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert payload["model"] == "core-gemma"
    assert payload["input_char_count"] == len("Some text")
    assert len(payload["prompt_sha256"]) == 64
    assert len(payload["prompt_template_sha256"]) == 64
    assert payload["prompt_template_sha256"] != payload["prompt_sha256"]
    assert "duration_ms" in payload
    assert payload["chunked"] is False
    assert payload["validation_path"] in ("outside_think_tags", "raw")


# ---------------------------------------------------------------------------
# Chunked fallback audit truthfulness
# ---------------------------------------------------------------------------

def _make_fake_validate_fail_once(succeed_result_factory):
    """Return a _validate_response fake that fails on first call (whole-doc)
    and succeeds on subsequent calls (per-chunk), exactly as real chunked
    fallback does in production.
    """
    call_count = [0]

    def _fake(doc_id, raw, llm, *, _audit=None):
        call_count[0] += 1
        if call_count[0] == 1:
            # Whole-doc attempt — fail (this is the expected trigger for chunked)
            if _audit is not None:
                _audit["validation_path"] = "failed"
                _audit["validation_attempts"] = 3
                _audit.setdefault("errors", []).append(
                    "Could not extract valid EnrichmentResult JSON after 3 attempt(s)"
                )
            raise ValueError("whole-doc validation failed")
        # Chunk attempts — succeed
        if _audit is not None:
            _audit["validation_path"] = "outside_think_tags"
            _audit["validation_attempts"] = 1
            _audit["normalization_repairs"] = 1
        return succeed_result_factory(doc_id, llm)

    return _fake


def _er(doc_id, llm):
    return EnrichmentResult.model_validate({"doc_id": doc_id, "enrichment_model": llm})


def test_run_chunked_fallback_validation_path_is_not_failed(monkeypatch, tmp_path):
    """After chunked fallback succeeds, validation_path must not be 'failed'."""
    monkeypatch.setattr(enrich, "_validate_response",
                        _make_fake_validate_fail_once(_er))
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")
    monkeypatch.setattr(enrich, "_chunk_text", lambda text, **kw: ["chunk1", "chunk2"])

    audit: dict = {}
    long_text = "x" * 20_000   # > 8_000 to trigger chunked path
    enrich.run("doc-1", _preprocess(long_text), _analysis(), _config(tmp_path), _audit=audit)

    assert audit["validation_path"] == "chunked_fallback"
    assert "failed" not in audit["validation_path"]


def test_run_chunked_fallback_errors_list_is_clean(monkeypatch, tmp_path):
    """After a successful chunked fallback, errors list must be empty."""
    monkeypatch.setattr(enrich, "_validate_response",
                        _make_fake_validate_fail_once(_er))
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")
    monkeypatch.setattr(enrich, "_chunk_text", lambda text, **kw: ["chunk1", "chunk2"])

    audit: dict = {}
    enrich.run("doc-1", _preprocess("x" * 20_000), _analysis(), _config(tmp_path), _audit=audit)

    assert audit.get("errors", []) == []


def test_run_chunked_fallback_preserves_whole_doc_reason(monkeypatch, tmp_path):
    """The whole-doc failure reason must be preserved as context, not discarded."""
    monkeypatch.setattr(enrich, "_validate_response",
                        _make_fake_validate_fail_once(_er))
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")
    monkeypatch.setattr(enrich, "_chunk_text", lambda text, **kw: ["chunk1", "chunk2"])

    audit: dict = {}
    enrich.run("doc-1", _preprocess("x" * 20_000), _analysis(), _config(tmp_path), _audit=audit)

    assert "whole_doc_fallback_reason" in audit
    assert audit["whole_doc_fallback_reason"]  # non-empty


def test_run_chunked_fallback_aggregates_normalization_repairs(monkeypatch, tmp_path):
    """normalization_repairs in top-level audit should aggregate successful chunks."""
    monkeypatch.setattr(enrich, "_validate_response",
                        _make_fake_validate_fail_once(_er))
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")
    # Two chunks, each fake validation sets normalization_repairs=1 → total=2
    monkeypatch.setattr(enrich, "_chunk_text", lambda text, **kw: ["chunk1", "chunk2"])

    audit: dict = {}
    enrich.run("doc-1", _preprocess("x" * 20_000), _analysis(), _config(tmp_path), _audit=audit)

    assert audit["normalization_repairs"] == 2


def test_run_chunked_fallback_validation_attempts_zero(monkeypatch, tmp_path):
    """validation_attempts on the top-level audit should be 0; details are in chunks[]."""
    monkeypatch.setattr(enrich, "_validate_response",
                        _make_fake_validate_fail_once(_er))
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")
    monkeypatch.setattr(enrich, "_chunk_text", lambda text, **kw: ["chunk1"])

    audit: dict = {}
    enrich.run("doc-1", _preprocess("x" * 20_000), _analysis(), _config(tmp_path), _audit=audit)

    assert audit["validation_attempts"] == 0


def test_chunked_chunk_entries_include_validation_metadata(monkeypatch, tmp_path):
    """Each chunk entry in the chunks list should include validation metadata."""
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    text = "word " * 5000
    audit: dict = {}
    enrich._run_chunked_enrichment(
        doc_id="doc-1",
        preprocess=_preprocess(text),
        analysis=_analysis(),
        config=_config(tmp_path),
        llm="litelm",
        model=None,
        first_error=ValueError("test"),
        _audit=audit,
    )

    assert len(audit["chunks"]) >= 1
    for entry in audit["chunks"]:
        assert "model" in entry
        assert "validation_path" in entry
        assert "validation_attempts" in entry
        assert "normalization_repairs" in entry


def test_chunked_chunk_entries_have_validation_path_on_success(monkeypatch, tmp_path):
    """Successful chunk entries should have a non-None, non-'failed' validation_path."""
    monkeypatch.setattr(enrich, "_call_enrichment_model",
                        lambda *a, **kw: _enrichment_json())
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *a: "sys")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *a, **kw: "usr")

    text = "word " * 3000
    audit: dict = {}
    enrich._run_chunked_enrichment(
        doc_id="doc-1",
        preprocess=_preprocess(text),
        analysis=_analysis(),
        config=_config(tmp_path),
        llm="litelm",
        model=None,
        first_error=ValueError("test"),
        _audit=audit,
    )

    for entry in [c for c in audit["chunks"] if c["succeeded"]]:
        assert entry["validation_path"] in ("outside_think_tags", "inside_think_tags", "raw")
        assert entry["validation_attempts"] >= 1


# ---------------------------------------------------------------------------
# Streamlit _workbench_enrich — audit threaded through run() and save()
# ---------------------------------------------------------------------------

def test_workbench_enrich_save_writes_audit(tmp_path, monkeypatch):
    """_workbench_enrich() should write enrichment_audit.json via save()."""
    # We test the save() side of the wiring directly since _workbench_enrich
    # depends on Streamlit session state and is hard to unit-test in isolation.
    # This verifies the same contract: save(_audit=non_empty_dict) → file written.
    doc_id = "doc-wb-test"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    cfg = types.SimpleNamespace(corpus_dir=tmp_path)
    # Simulate what _workbench_enrich does: create _audit, run, save with same _audit
    _enrich_audit: dict = {}
    result = _make_result(doc_id)
    # Inject what run() would have set
    _enrich_audit.update({
        "llm_flag": "litelm",
        "model": "core-gemma",
        "input_char_count": 5000,
        "chunked": False,
        "chunk_count": None,
        "chunks": None,
        "validation_path": "outside_think_tags",
        "validation_attempts": 1,
        "normalization_repairs": 0,
        "errors": [],
    })
    enrich.save(doc_id, result, cfg, _audit=_enrich_audit)

    assert (doc_dir / "enrichment_audit.json").exists()
    payload = json.loads((doc_dir / "enrichment_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert payload["validation_path"] == "outside_think_tags"


def test_workbench_enrich_no_audit_file_when_audit_is_none(tmp_path):
    """Backward compat: save() without _audit must not write enrichment_audit.json."""
    doc_id = "doc-wb-no-audit"
    doc_dir = tmp_path / doc_id
    doc_dir.mkdir()

    cfg = types.SimpleNamespace(corpus_dir=tmp_path)
    enrich.save(doc_id, _make_result(doc_id), cfg)   # no _audit kwarg

    assert not (doc_dir / "enrichment_audit.json").exists()
