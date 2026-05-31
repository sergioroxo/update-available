"""G5 tests for suppressing ungrounded corpus connections.

These tests are pure Python: no network calls, no Sanity/Supabase writes.
"""
from __future__ import annotations

import json
import types

from runner.models.document import AnalysisResult, PreprocessResult
from runner.models.enrichment import CorpusConnection
from runner.pipeline import enrich
from runner.pipeline.enrich import _normalize_enrichment_payload


def _payload_with_connections() -> dict:
    return {
        "lexicon_proposals": [],
        "entity_proposals": [],
        "tactic_proposals": [],
        "ingestion_queue": [],
        "corpus_connections": [
            {
                "doc_id": "doc-existing-1",
                "connection_type": "same_term",
                "shared_element": "unwanted same-sex attraction",
                "evidence": "Both documents use the same term.",
            },
            {
                "doc_id": "doc-existing-2",
                "connection_type": "same_organization",
                "shared_element": "Example Ministry",
                "evidence": "Both documents name Example Ministry.",
            },
        ],
        "practice_descriptions": [],
        "statistical_claims": [],
    }


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


def _config(tmp_path):
    return types.SimpleNamespace(
        corpus_dir=tmp_path,
        litelm_base_url="http://mac-studio:4000",
        litelm_api_key="test",
        litelm_enrichment_model="core-gemma",
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


def test_corpus_connections_suppressed_when_not_grounded():
    normalized, repairs = _normalize_enrichment_payload(
        _payload_with_connections(),
        retrieval_grounded=False,
    )
    assert normalized["corpus_connections"] == []
    assert repairs == 0


def test_corpus_connections_preserved_when_grounded():
    normalized, repairs = _normalize_enrichment_payload(
        _payload_with_connections(),
        retrieval_grounded=True,
    )
    assert len(normalized["corpus_connections"]) == 2
    assert repairs == 0
    assert normalized["corpus_connections"][0]["doc_id"] == "doc-existing-1"
    assert normalized["corpus_connections"][0]["is_retrieval_grounded"] is True


def test_corpus_connection_model_has_review_and_grounding_fields():
    connection = CorpusConnection(
        doc_id="doc-existing-1",
        connection_type="same_term",
        shared_element="unwanted same-sex attraction",
    )
    assert connection.approved is False
    assert connection.rejected is False
    assert connection.pushed_to_sanity is False
    assert connection.is_retrieval_grounded is False


def test_enrichment_audit_records_corpus_connection_suppression(monkeypatch, tmp_path):
    monkeypatch.setattr(
        enrich,
        "_call_enrichment_model",
        lambda *args, **kwargs: json.dumps(_payload_with_connections()),
    )
    monkeypatch.setattr(enrich, "_build_system_prompt", lambda *args, **kwargs: "system")
    monkeypatch.setattr(enrich, "_build_user_message", lambda *args, **kwargs: "user")

    audit: dict = {}
    result = enrich.run(
        "doc-test-01",
        _preprocess(),
        _analysis(),
        _config(tmp_path),
        _audit=audit,
    )

    assert result.corpus_connections == []
    assert audit["corpus_connections_suppressed"] is True
    assert audit["corpus_connections_suppression_reason"] == "retrieval_not_wired"

    enrich.save("doc-test-01", result, _config(tmp_path), _audit=audit)
    payload = json.loads((tmp_path / "doc-test-01" / "enrichment_audit.json").read_text())
    assert payload["corpus_connections_count"] == 0
    assert payload["corpus_connections_suppressed"] is True
    assert payload["corpus_connections_suppression_reason"] == "retrieval_not_wired"


def test_prompt_instructs_empty_corpus_connections_when_retrieval_not_grounded(tmp_path):
    prompt = enrich._build_system_prompt(
        _config(tmp_path),
        _analysis(),
        retrieval_grounded=False,
    )
    assert "Return corpus_connections as an empty array []" in prompt
    assert "Do not invent doc_ids" in prompt
