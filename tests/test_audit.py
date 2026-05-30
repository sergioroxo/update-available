"""Tests for runner/pipeline/audit.py.

All tests are pure Python -- no network calls, no LLM, no Sanity/Supabase.
Filesystem interaction uses pytest's tmp_path fixture.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner.models.document import AnalysisResult
from runner.models.enrichment import EnrichmentResult
from runner.pipeline.audit import (
    AnalysisRunMeta,
    EnrichmentRunMeta,
    write_analysis_audit,
    write_enrichment_audit,
)


# ---------------------------------------------------------------------------
# Minimal model fixtures
# ---------------------------------------------------------------------------

def _analysis(**overrides) -> AnalysisResult:
    data = {
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["Evidence quote one.", "Evidence quote two."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "A test summary.",
    }
    data.update(overrides)
    return AnalysisResult.model_validate(data)


def _enrichment(**overrides) -> EnrichmentResult:
    data = {"doc_id": "doc-test-01", "enrichment_model": "core-gemma"}
    data.update(overrides)
    return EnrichmentResult.model_validate(data)


# ---------------------------------------------------------------------------
# write_analysis_audit -- basic file creation
# ---------------------------------------------------------------------------

def test_write_analysis_audit_creates_file(tmp_path):
    write_analysis_audit(tmp_path, None, _analysis())
    assert (tmp_path / "analysis_audit.json").exists()


def test_write_analysis_audit_valid_json(tmp_path):
    write_analysis_audit(tmp_path, None, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert isinstance(payload, dict)


def test_write_analysis_audit_schema_keys_present(tmp_path):
    write_analysis_audit(tmp_path, None, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    expected_keys = {
        "schema_version", "doc_id", "run_at", "prompt_version", "ontology_version",
        "llm_flag", "model", "input_char_count", "input_truncated",
        "lexicon_terms_injected", "raw_response_chars",
        "validation_path", "validation_attempts", "errors",
        "normalisation_warnings", "confidence_score", "confidence_status",
        "doc_type", "needs_review", "testimony_flag",
        "candidate_terms_count", "evidence_count",
    }
    assert expected_keys.issubset(payload.keys())


def test_write_analysis_audit_schema_version(tmp_path):
    write_analysis_audit(tmp_path, None, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["schema_version"] == "1"


# ---------------------------------------------------------------------------
# write_analysis_audit -- derived fields from AnalysisResult
# ---------------------------------------------------------------------------

def test_write_analysis_audit_derives_doc_type(tmp_path):
    write_analysis_audit(tmp_path, None, _analysis(type="Pro-SOGICE"))
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["doc_type"] == "Pro-SOGICE"


def test_write_analysis_audit_derives_confidence(tmp_path):
    analysis = _analysis(confidence={"status": "high", "overall_score": 0.92, "reasons": []})
    write_analysis_audit(tmp_path, None, analysis)
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["confidence_status"] == "high"
    assert abs(payload["confidence_score"] - 0.92) < 1e-6


def test_write_analysis_audit_derives_evidence_count(tmp_path):
    analysis = _analysis(evidence=["Q1", "Q2", "Q3"])
    write_analysis_audit(tmp_path, None, analysis)
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["evidence_count"] == 3


def test_write_analysis_audit_derives_candidate_terms_count(tmp_path):
    analysis = _analysis(candidate_terms=[
        {"term": "conversion therapy", "language": "en"},
        {"term": "unwanted same-sex attraction", "language": "en"},
    ])
    write_analysis_audit(tmp_path, None, analysis)
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["candidate_terms_count"] == 2


def test_write_analysis_audit_testimony_flag(tmp_path):
    analysis = _analysis()
    analysis.testimony_flag = True
    write_analysis_audit(tmp_path, None, analysis)
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["testimony_flag"] is True


def test_write_analysis_audit_doc_id_from_param(tmp_path):
    write_analysis_audit(tmp_path, None, _analysis(), doc_id="doc-abc123")
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["doc_id"] == "doc-abc123"


def test_write_analysis_audit_doc_id_falls_back_to_dirname(tmp_path):
    doc_dir = tmp_path / "doc-xyz999"
    doc_dir.mkdir()
    write_analysis_audit(doc_dir, None, _analysis())
    payload = json.loads((doc_dir / "analysis_audit.json").read_text())
    assert payload["doc_id"] == "doc-xyz999"


def test_write_analysis_audit_prompt_and_ontology_versions(tmp_path):
    write_analysis_audit(
        tmp_path, None, _analysis(),
        prompt_version="ingestion-v3.3",
        ontology_version="v3.0",
    )
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["prompt_version"] == "ingestion-v3.3"
    assert payload["ontology_version"] == "v3.0"


# ---------------------------------------------------------------------------
# write_analysis_audit -- run_meta fields
# ---------------------------------------------------------------------------

def test_write_analysis_audit_none_meta_uses_defaults(tmp_path):
    write_analysis_audit(tmp_path, None, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["llm_flag"] == ""
    assert payload["model"] == ""
    assert payload["input_char_count"] == 0
    assert payload["input_truncated"] is False
    assert payload["validation_path"] == ""
    assert payload["validation_attempts"] == 0
    assert payload["errors"] == []


def test_write_analysis_audit_populated_run_meta(tmp_path):
    meta = AnalysisRunMeta(
        llm_flag="litelm",
        model="core-qwen",
        input_char_count=18500,
        input_truncated=False,
        lexicon_terms_injected=12,
        raw_response_chars=3200,
        validation_path="outside_think_tags",
        validation_attempts=1,
        errors=[],
    )
    write_analysis_audit(tmp_path, meta, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert payload["model"] == "core-qwen"
    assert payload["input_char_count"] == 18500
    assert payload["lexicon_terms_injected"] == 12
    assert payload["raw_response_chars"] == 3200
    assert payload["validation_path"] == "outside_think_tags"
    assert payload["validation_attempts"] == 1


def test_write_analysis_audit_errors_list(tmp_path):
    meta = AnalysisRunMeta(errors=["Validation failed on attempt 1."])
    write_analysis_audit(tmp_path, meta, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["errors"] == ["Validation failed on attempt 1."]


# ---------------------------------------------------------------------------
# write_analysis_audit -- archive behavior
# ---------------------------------------------------------------------------

def test_write_analysis_audit_archives_previous(tmp_path):
    write_analysis_audit(tmp_path, None, _analysis())
    write_analysis_audit(tmp_path, None, _analysis())

    audit_files = list(tmp_path.glob("analysis_audit*.json"))
    assert len(audit_files) == 2
    assert (tmp_path / "analysis_audit.json").exists()
    archived = [f for f in audit_files if f.name != "analysis_audit.json"]
    assert len(archived) == 1
    assert archived[0].name.startswith("analysis_audit_")


def test_write_analysis_audit_three_writes_leave_two_archives(tmp_path):
    for _ in range(3):
        write_analysis_audit(tmp_path, None, _analysis())
    audit_files = list(tmp_path.glob("analysis_audit*.json"))
    assert len(audit_files) == 3


# ---------------------------------------------------------------------------
# write_enrichment_audit -- basic file creation
# ---------------------------------------------------------------------------

def test_write_enrichment_audit_creates_file(tmp_path):
    write_enrichment_audit(tmp_path, None, _enrichment())
    assert (tmp_path / "enrichment_audit.json").exists()


def test_write_enrichment_audit_valid_json(tmp_path):
    write_enrichment_audit(tmp_path, None, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert isinstance(payload, dict)


def test_write_enrichment_audit_schema_keys_present(tmp_path):
    write_enrichment_audit(tmp_path, None, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    expected_keys = {
        "schema_version", "doc_id", "run_at", "prompt_version", "run_type",
        "llm_flag", "model", "input_char_count",
        "chunked", "chunk_count", "chunks",
        "whole_doc_fallback_reason",
        "validation_path", "validation_attempts", "normalization_repairs", "errors",
        "enrichment_model",
        "lexicon_proposals_count", "entity_proposals_count", "tactic_proposals_count",
        "ingestion_queue_count", "corpus_connections_count",
        "practice_descriptions_count", "statistical_claims_count",
    }
    assert expected_keys.issubset(payload.keys())


# ---------------------------------------------------------------------------
# write_enrichment_audit -- derived fields from EnrichmentResult
# ---------------------------------------------------------------------------

def test_write_enrichment_audit_derives_doc_id(tmp_path):
    write_enrichment_audit(tmp_path, None, _enrichment(doc_id="doc-enrich-42"))
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["doc_id"] == "doc-enrich-42"


def test_write_enrichment_audit_derives_model(tmp_path):
    write_enrichment_audit(tmp_path, None, _enrichment(enrichment_model="core-gemma"))
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["enrichment_model"] == "core-gemma"


def test_write_enrichment_audit_derives_proposal_counts(tmp_path):
    result = _enrichment()
    # Manually inject minimal proposals via model_validate to get non-zero counts
    result2 = EnrichmentResult.model_validate({
        "doc_id": "doc-01",
        "enrichment_model": "core-gemma",
        "lexicon_proposals": [
            {
                "action": "add_new",
                "term": "therapeutic journey",
                "exact_quote": "they described it as a therapeutic journey",
                "proposed_cluster": "Pastoral-Coercion",
                "function": "Euphemism",
            },
        ],
        "ingestion_queue": [
            {"url": "https://example.org/doc.pdf", "source_type": "pdf", "priority": "high"},
        ],
    })
    write_enrichment_audit(tmp_path, None, result2)
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["lexicon_proposals_count"] == 1
    assert payload["ingestion_queue_count"] == 1
    assert payload["entity_proposals_count"] == 0


def test_write_enrichment_audit_none_meta_uses_defaults(tmp_path):
    write_enrichment_audit(tmp_path, None, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["llm_flag"] == ""
    assert payload["model"] == ""
    assert payload["chunked"] is False
    assert payload["chunk_count"] is None
    assert payload["chunks"] is None
    assert payload["normalization_repairs"] == 0
    assert payload["errors"] == []


def test_write_enrichment_audit_populated_run_meta(tmp_path):
    meta = EnrichmentRunMeta(
        llm_flag="litelm",
        model="core-gemma",
        input_char_count=9500,
        chunked=True,
        chunk_count=3,
        chunks=[
            {"index": 1, "char_count": 9800, "succeeded": True, "error": None},
            {"index": 2, "char_count": 9500, "succeeded": True, "error": None},
            {"index": 3, "char_count": 4200, "succeeded": False, "error": "Timeout"},
        ],
        validation_path="outside_think_tags",
        validation_attempts=1,
        normalization_repairs=2,
    )
    write_enrichment_audit(tmp_path, meta, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["chunked"] is True
    assert payload["chunk_count"] == 3
    assert len(payload["chunks"]) == 3
    assert payload["chunks"][2]["succeeded"] is False
    assert payload["normalization_repairs"] == 2


# ---------------------------------------------------------------------------
# write_enrichment_audit -- archive behavior
# ---------------------------------------------------------------------------

def test_write_enrichment_audit_archives_previous(tmp_path):
    write_enrichment_audit(tmp_path, None, _enrichment())
    write_enrichment_audit(tmp_path, None, _enrichment())

    audit_files = list(tmp_path.glob("enrichment_audit*.json"))
    assert len(audit_files) == 2
    assert (tmp_path / "enrichment_audit.json").exists()
    archived = [f for f in audit_files if f.name != "enrichment_audit.json"]
    assert len(archived) == 1
    assert archived[0].name.startswith("enrichment_audit_")


# ---------------------------------------------------------------------------
# Non-fatal failure behavior
# ---------------------------------------------------------------------------

def test_analysis_audit_nonfatal_on_write_failure(tmp_path, monkeypatch):
    def _fail(*args, **kwargs):
        raise IOError("disk full")
    monkeypatch.setattr(Path, "write_text", _fail)

    # Must not raise, even though write_text is broken
    write_analysis_audit(tmp_path, None, _analysis())


def test_analysis_audit_logs_failure_to_audit_log(tmp_path, monkeypatch):
    def _fail(*args, **kwargs):
        raise IOError("disk full")
    monkeypatch.setattr(Path, "write_text", _fail)

    write_analysis_audit(tmp_path, None, _analysis())

    log = (tmp_path / "audit.log").read_text(encoding="utf-8")
    assert "audit_write_failed" in log
    assert "analysis_audit" in log


def test_enrichment_audit_nonfatal_on_write_failure(tmp_path, monkeypatch):
    def _fail(*args, **kwargs):
        raise IOError("disk full")
    monkeypatch.setattr(Path, "write_text", _fail)

    write_enrichment_audit(tmp_path, None, _enrichment())


def test_enrichment_audit_logs_failure_to_audit_log(tmp_path, monkeypatch):
    def _fail(*args, **kwargs):
        raise IOError("disk full")
    monkeypatch.setattr(Path, "write_text", _fail)

    write_enrichment_audit(tmp_path, None, _enrichment())

    log = (tmp_path / "audit.log").read_text(encoding="utf-8")
    assert "audit_write_failed" in log
    assert "enrichment_audit" in log


# ---------------------------------------------------------------------------
# Dict input -- analysis
# ---------------------------------------------------------------------------

def test_analysis_audit_accepts_partial_dict(tmp_path):
    run_meta = {"llm_flag": "litelm", "model": "core-qwen", "input_char_count": 5000}
    write_analysis_audit(tmp_path, run_meta, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert payload["model"] == "core-qwen"
    assert payload["input_char_count"] == 5000
    # Fields absent from the dict use dataclass defaults
    assert payload["input_truncated"] is False
    assert payload["validation_path"] == ""
    assert payload["validation_attempts"] == 0


def test_analysis_audit_empty_dict_uses_all_defaults(tmp_path):
    write_analysis_audit(tmp_path, {}, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["llm_flag"] == ""
    assert payload["model"] == ""
    assert payload["input_char_count"] == 0
    assert payload["errors"] == []


def test_analysis_audit_dict_unknown_keys_ignored(tmp_path):
    run_meta = {"llm_flag": "litelm", "future_field_not_yet_defined": "ignored"}
    write_analysis_audit(tmp_path, run_meta, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert "future_field_not_yet_defined" not in payload


def test_analysis_audit_dataclass_input_still_works(tmp_path):
    meta = AnalysisRunMeta(llm_flag="claude", model="claude-sonnet-4-6", validation_attempts=2)
    write_analysis_audit(tmp_path, meta, _analysis())
    payload = json.loads((tmp_path / "analysis_audit.json").read_text())
    assert payload["llm_flag"] == "claude"
    assert payload["model"] == "claude-sonnet-4-6"
    assert payload["validation_attempts"] == 2


# ---------------------------------------------------------------------------
# Dict input -- enrichment
# ---------------------------------------------------------------------------

def test_enrichment_audit_accepts_partial_dict(tmp_path):
    run_meta = {"llm_flag": "litelm", "model": "core-gemma", "chunked": True, "chunk_count": 5}
    write_enrichment_audit(tmp_path, run_meta, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert payload["model"] == "core-gemma"
    assert payload["chunked"] is True
    assert payload["chunk_count"] == 5
    # Fields absent from the dict use dataclass defaults
    assert payload["normalization_repairs"] == 0
    assert payload["errors"] == []


def test_enrichment_audit_empty_dict_uses_all_defaults(tmp_path):
    write_enrichment_audit(tmp_path, {}, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["llm_flag"] == ""
    assert payload["chunked"] is False
    assert payload["chunk_count"] is None
    assert payload["normalization_repairs"] == 0


def test_enrichment_audit_dict_unknown_keys_ignored(tmp_path):
    run_meta = {"model": "core-gemma", "future_field": "ignored"}
    write_enrichment_audit(tmp_path, run_meta, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["model"] == "core-gemma"
    assert "future_field" not in payload


def test_enrichment_audit_dataclass_input_still_works(tmp_path):
    meta = EnrichmentRunMeta(llm_flag="litelm", normalization_repairs=3)
    write_enrichment_audit(tmp_path, meta, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["llm_flag"] == "litelm"
    assert payload["normalization_repairs"] == 3


# ---------------------------------------------------------------------------
# whole_doc_fallback_reason -- survives into enrichment_audit.json
# ---------------------------------------------------------------------------

def test_whole_doc_fallback_reason_persists_via_dataclass(tmp_path):
    meta = EnrichmentRunMeta(
        chunked=True,
        whole_doc_fallback_reason="Could not extract valid JSON after 3 attempts",
    )
    write_enrichment_audit(tmp_path, meta, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["whole_doc_fallback_reason"] == "Could not extract valid JSON after 3 attempts"


def test_whole_doc_fallback_reason_persists_via_dict(tmp_path):
    run_meta = {
        "chunked": True,
        "whole_doc_fallback_reason": "Whole-doc parse failed",
    }
    write_enrichment_audit(tmp_path, run_meta, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["whole_doc_fallback_reason"] == "Whole-doc parse failed"


def test_whole_doc_fallback_reason_defaults_to_empty_string(tmp_path):
    write_enrichment_audit(tmp_path, None, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["whole_doc_fallback_reason"] == ""


def test_whole_doc_fallback_reason_empty_when_not_chunked(tmp_path):
    meta = EnrichmentRunMeta(chunked=False)
    write_enrichment_audit(tmp_path, meta, _enrichment())
    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["whole_doc_fallback_reason"] == ""
