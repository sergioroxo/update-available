from __future__ import annotations

import hashlib
import json

import httpx
import pytest

from runner.models.retrieval import RetrievalHitV1
from runner.pipeline.analysis_sections import SectionAnalysisError
from runner.pipeline.factory_semantic_pilot import (
    _validate_or_execute_enrichment,
    endpoint_config,
    reuse_run021_bindings,
)
from runner.pipeline.retrieval_context import (
    build_grounded_enrichment_request,
    build_retrieval_context,
    build_retrieval_query,
)
from runner.pipeline.semantic_model_adapters import (
    LocalGroundedEnrichmentExecutor,
    OpenAICompatibleLocalClient,
)


H = hashlib.sha256(b"none").hexdigest()


def _request():
    analysis = {"type": "independent_section_analysis", "evidence": ["Provisional finding"]}
    metadata = {"title": "Public source", "language": "en"}
    query = build_retrieval_query(
        query_id="query-doc-a", requesting_document_id="doc-a",
        analysis_payload=analysis, source_metadata=metadata,
    )
    text = "Exact retrieved source unit."
    hit = RetrievalHitV1(
        index_id="index-021", document_id="doc-b", unit_id="unit-b",
        source_family_id="family-b", stance="opposed", language="en",
        char_start=0, char_end=len(text), text=text,
        unit_text_sha256=hashlib.sha256(text.encode()).hexdigest(),
        vector_rank=1, lexical_rank=1, vector_score=0.5, lexical_score=-1.0,
        fused_score=0.03, final_rank=1,
    )
    context = build_retrieval_context(
        context_id="context-doc-a", index_manifest_sha256=H, query=query,
        hits=(hit,), exclusions=(), per_family_cap=1, contradiction_slots=1,
    )
    return build_grounded_enrichment_request(
        run_id="run-021", document_id="doc-a", analysis_payload=analysis,
        source_metadata=metadata, context=context,
        lexicon_snapshot_sha256=H, entity_snapshot_sha256=H,
        requested_model="core-gemma",
    )


def test_grounded_local_adapter_uses_distinct_route_and_structural_schema():
    captured = {}

    def handler(request: httpx.Request):
        payload = json.loads(request.content)
        captured.update(payload)
        user = json.loads(payload["messages"][1]["content"])
        hit = user["retrieved_source_units"][0]
        return httpx.Response(200, json={
            "model": "core-gemma",
            "choices": [{"message": {"content": json.dumps({
                "document_id": user["document_id"],
                "retrieval_context_sha256": user["retrieval_context_sha256"],
                "corpus_connections": [{
                    "document_id": hit["document_id"], "unit_id": hit["unit_id"],
                    "reason_code": "retrieved_context_match",
                }],
            })}, "finish_reason": "stop"}],
        })

    client = OpenAICompatibleLocalClient(
        endpoint_config(base_url="http://localhost:4000", api_key=""),
        transport=httpx.MockTransport(handler),
    )
    reuse_run021_bindings(client)
    try:
        output = LocalGroundedEnrichmentExecutor(client).execute(_request())
        assert output["corpus_connections"][0]["unit_id"] == "unit-b"
        assert captured["model"] == "core-gemma"
        assert captured["response_format"]["json_schema"]["name"] == "grounded_enrichment_response_v1"
        assert client.receipts[0].purpose == "grounded_enrichment"
    finally:
        client.close()


def test_grounded_local_adapter_rejects_invented_and_duplicate_locators():
    request_value = _request()

    def response(connections):
        def handler(_request: httpx.Request):
            return httpx.Response(200, json={
                "model": "core-gemma",
                "choices": [{"message": {"content": json.dumps({
                    "document_id": request_value.document_id,
                    "retrieval_context_sha256": request_value.retrieval_context.context_sha256,
                    "corpus_connections": connections,
                })}, "finish_reason": "stop"}],
            })
        return handler

    invented = [{"document_id": "invented", "unit_id": "unit-x", "reason_code": "bad_locator"}]
    client = OpenAICompatibleLocalClient(
        endpoint_config(base_url="http://localhost:4000", api_key=""),
        transport=httpx.MockTransport(response(invented)),
    )
    reuse_run021_bindings(client)
    with pytest.raises(SectionAnalysisError, match="invalid_locator"):
        LocalGroundedEnrichmentExecutor(client).execute(request_value)
    client.close()

    valid = {"document_id": "doc-b", "unit_id": "unit-b", "reason_code": "same_locator"}
    client = OpenAICompatibleLocalClient(
        endpoint_config(base_url="http://localhost:4000", api_key=""),
        transport=httpx.MockTransport(response([valid, valid])),
    )
    reuse_run021_bindings(client)
    with pytest.raises(SectionAnalysisError, match="duplicate_locator"):
        LocalGroundedEnrichmentExecutor(client).execute(request_value)
    client.close()


def test_grounded_schema_failure_uses_one_distinct_bounded_repair(tmp_path):
    request_value = _request()
    calls = []

    def handler(request: httpx.Request):
        body = json.loads(request.content)
        calls.append(body["messages"][0]["content"])
        invalid = len(calls) == 1
        return httpx.Response(200, json={
            "model": "core-gemma",
            "choices": [{"message": {"content": json.dumps({
                "document_id": request_value.document_id,
                "retrieval_context_sha256": request_value.retrieval_context.context_sha256,
                "corpus_connections": [{
                    "document_id": "doc-b", "unit_id": "unit-b",
                    "reason_code": "Invalid reason" if invalid else "schema_repaired",
                }],
            })}, "finish_reason": "stop"}],
        })

    client = OpenAICompatibleLocalClient(
        endpoint_config(base_url="http://localhost:4000", api_key=""),
        transport=httpx.MockTransport(handler),
    )
    reuse_run021_bindings(client)
    try:
        output = _validate_or_execute_enrichment(
            path=tmp_path / "enrichment.json", request=request_value,
            executor=LocalGroundedEnrichmentExecutor(client),
            failure_log=tmp_path / "failures.json",
        )
        assert output["corpus_connections"][0]["reason_code"] == "schema_repaired"
        assert len(calls) == 2
        assert "single bounded schema repair" not in calls[0]
        assert "single bounded schema repair" in calls[1]
    finally:
        client.close()
