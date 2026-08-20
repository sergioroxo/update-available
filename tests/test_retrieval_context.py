from __future__ import annotations

import hashlib

import pytest
from pydantic import ValidationError

from runner.models.retrieval import RetrievalHitV1, RetrievalContextV1
from runner.pipeline.retrieval_context import (
    RetrievalContextError,
    build_grounded_enrichment_request,
    build_retrieval_context,
    build_retrieval_query,
    execute_grounded_enrichment,
    validate_grounded_enrichment_output,
)


H = hashlib.sha256(b"snapshot").hexdigest()
ANALYSIS = {"type": "Research", "summary": "Policy and contrary evidence."}


def _query():
    return build_retrieval_query(
        query_id="query-a", requesting_document_id="doc-a",
        analysis_payload=ANALYSIS, source_metadata={"title": "Policy report"},
    )


def _hit(doc, unit, stance, rank):
    text = f"Exact source evidence {doc} {unit}."
    return RetrievalHitV1(
        index_id="index-019", document_id=doc, unit_id=unit,
        source_family_id=f"family-{doc}", stance=stance, language="en",
        char_start=0, char_end=len(text), text=text,
        unit_text_sha256=hashlib.sha256(text.encode()).hexdigest(),
        vector_rank=rank, lexical_rank=rank, vector_score=0.8,
        lexical_score=-1.0, fused_score=0.03, final_rank=rank,
    )


def _context():
    return build_retrieval_context(
        context_id="context-a", index_manifest_sha256=H, query=_query(),
        hits=(_hit("doc-b", "unit-b", "supporting", 1),
              _hit("doc-c", "unit-c", "opposed", 2)),
        exclusions=(), per_family_cap=2, contradiction_slots=1,
    )


def test_query_binds_analysis_as_orientation_not_evidence():
    query = _query()
    assert query.analysis_sha256
    assert query.components
    assert not hasattr(query, "evidence_rows")


def test_context_binds_index_units_and_contradiction_accounting():
    context = _context()
    assert context.contradiction_slots_filled == 1
    assert context.context_char_count == sum(len(row.text) for row in context.selected_hits)
    payload = context.model_dump(mode="python")
    payload["selected_hits"][0]["index_id"] = "other-index"
    with pytest.raises(ValidationError, match="cross-index"):
        RetrievalContextV1.model_validate(payload)
    payload = context.model_dump(mode="python")
    payload["contradiction_slots_filled"] = 0
    with pytest.raises(ValidationError, match="contradiction"):
        RetrievalContextV1.model_validate(payload)


def test_grounded_request_rejects_stale_analysis_or_context():
    context = _context()
    request = build_grounded_enrichment_request(
        run_id="run-019", document_id="doc-a", analysis_payload=ANALYSIS,
        context=context, lexicon_snapshot_sha256=H, entity_snapshot_sha256=H,
        requested_model="small-moe",
    )
    assert request.retrieval_context.context_sha256 == context.context_sha256
    bad = request.model_dump(mode="python")
    bad["analysis_sha256"] = "0" * 64
    with pytest.raises(ValidationError, match="analysis/context"):
        type(request).model_validate(bad)


class _ValidExecutor:
    def execute(self, request):
        hit = request.retrieval_context.selected_hits[0]
        return {
            "document_id": request.document_id,
            "retrieval_context_sha256": request.retrieval_context.context_sha256,
            "corpus_connections": [{"document_id": hit.document_id, "unit_id": hit.unit_id}],
        }


def test_grounded_enrichment_accepts_only_context_bound_connections():
    request = build_grounded_enrichment_request(
        run_id="run-019", document_id="doc-a", analysis_payload=ANALYSIS,
        context=_context(), lexicon_snapshot_sha256=H, entity_snapshot_sha256=H,
        requested_model="small-moe",
    )
    output = execute_grounded_enrichment(request, _ValidExecutor())
    assert output["output_sha256"]
    invented = {
        "document_id": "doc-a", "retrieval_context_sha256": request.retrieval_context.context_sha256,
        "corpus_connections": [{"document_id": "invented", "unit_id": "unit-x"}],
    }
    with pytest.raises(RetrievalContextError, match="invented"):
        validate_grounded_enrichment_output(request, invented)
    stale_locator = {
        "document_id": "doc-a", "retrieval_context_sha256": request.retrieval_context.context_sha256,
        "corpus_connections": [{"document_id": "doc-b", "unit_id": "unknown"}],
    }
    with pytest.raises(RetrievalContextError, match="locator"):
        validate_grounded_enrichment_output(request, stale_locator)


def test_no_query_components_fails_closed():
    with pytest.raises(RetrievalContextError, match="no_components"):
        build_retrieval_query(
            query_id="query-empty", requesting_document_id="doc-a",
            analysis_payload={}, source_metadata={},
        )
