from __future__ import annotations

import json

import httpx
import pytest
from pydantic import ValidationError

from runner.pipeline.analysis_sections import (
    RetryableSectionError,
    SectionAnalysisStore,
    build_adaptive_analysis_plan,
    build_compiler_packet,
    run_parallel_jobs,
    validate_compilation,
)
from runner.pipeline.citation_units_v2 import build_citation_units_v2
from runner.pipeline.semantic_model_adapters import (
    LocalDocumentCompilerExecutor,
    LocalEmbeddingProvider,
    LocalModelRouteV1,
    LocalSectionExecutor,
    OpenAICompatibleLocalClient,
    SemanticAdapterError,
    SemanticEndpointConfigV1,
)


def _routes(include_shadow=True):
    rows = [
        LocalModelRouteV1(
            route_id="mapper", purpose="section_mapper", requested_model="core-qwen",
            expected_resolved_models=("ollama_chat/qwen3.6:35b-mlx",),
            maximum_output_tokens=2048,
        ),
        LocalModelRouteV1(
            route_id="compiler", purpose="document_compiler", requested_model="core-gemma",
            expected_resolved_models=("ollama_chat/gemma4:31b-mlx",),
            maximum_output_tokens=4096,
        ),
        LocalModelRouteV1(
            route_id="embedding", purpose="qwen_embedding",
            requested_model="research-embedding",
            expected_resolved_models=("ollama/qwen3-embedding:8b",),
            expected_dimension=4096,
        ),
    ]
    if include_shadow:
        rows.append(LocalModelRouteV1(
            route_id="shadow", purpose="bge_shadow", requested_model="bge-m3-shadow",
            expected_resolved_fragments=("bge-m3",), expected_dimension=1024,
        ))
    return tuple(rows)


def _config(**overrides):
    values = dict(base_url="http://127.0.0.1:4000", routes=_routes())
    values.update(overrides)
    return SemanticEndpointConfigV1(**values)


def _model_info():
    return {
        "data": [
            {"model_name": "core-qwen", "litellm_params": {"model": "ollama_chat/qwen3.6:35b-mlx"}},
            {"model_name": "core-gemma", "litellm_params": {"model": "ollama_chat/gemma4:31b-mlx"}},
            {"model_name": "research-embedding", "litellm_params": {"model": "ollama/qwen3-embedding:8b"}},
            {"model_name": "bge-m3-shadow", "litellm_params": {"model": "ollama/bge-m3"}},
        ]
    }


def test_endpoint_rejects_cloud_and_unapproved_hosts():
    with pytest.raises(ValidationError, match="local/allowed"):
        _config(base_url="https://api.openai.com")
    with pytest.raises(ValidationError, match="forbidden credentials"):
        _config(base_url="http://secret@127.0.0.1:4000")


def test_preflight_requires_explicit_alias_to_local_model_binding():
    def handler(request):
        return httpx.Response(200, json=_model_info())

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    bindings = client.preflight()
    assert bindings["mapper"] == "ollama_chat/qwen3.6:35b-mlx"
    assert bindings["compiler"] == "ollama_chat/gemma4:31b-mlx"
    client.close()


@pytest.mark.parametrize("resolved", [
    "ollama_chat/qwen3.6:35b-a3b",
    "ollama/qwen3.6:35b-mlx",
    "ollama_chat/qwen3.6:27b-mlx",
    "ollama_chat/qwen3.6:35b-mlx-shadow",
    "core-qwen",
    "openai/qwen3.6:35b-mlx",
])
def test_preflight_rejects_every_nonidentical_mapper_route(resolved):
    payload = _model_info()
    payload["data"][0]["litellm_params"]["model"] = resolved
    client = OpenAICompatibleLocalClient(
        _config(),
        transport=httpx.MockTransport(
            lambda request: httpx.Response(200, json=payload),
        ),
    )
    with pytest.raises(SemanticAdapterError, match="identity_mismatch"):
        client.preflight()
    client.close()


def test_baseline_route_contract_forbids_fragment_only_acceptance():
    with pytest.raises(ValidationError, match="one exact"):
        LocalModelRouteV1(
            route_id="mapper", purpose="section_mapper",
            requested_model="core-qwen",
            expected_resolved_fragments=("qwen3.6", "35b"),
        )

    bad = _model_info()
    bad["data"][0]["litellm_params"]["model"] = "openai/gpt-5"
    client = OpenAICompatibleLocalClient(
        _config(), transport=httpx.MockTransport(lambda request: httpx.Response(200, json=bad)),
    )
    with pytest.raises(SemanticAdapterError, match="identity_mismatch"):
        client.preflight()
    client.close()


def test_model_info_is_required_instead_of_trusting_alias_only():
    client = OpenAICompatibleLocalClient(
        _config(), transport=httpx.MockTransport(lambda request: httpx.Response(404)),
    )
    with pytest.raises(SemanticAdapterError, match="model_info_required"):
        client.preflight()
    client.close()


def test_embedding_validates_order_count_dimension_and_finite_values():
    mode = {"kind": "valid"}

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        dimension = 4096
        rows = [
            {"index": index, "embedding": [float(index + 1)] * dimension}
            for index, _text in enumerate(body["input"])
        ]
        if mode["kind"] == "wrong-dimension":
            rows[0]["embedding"] = [1.0] * 1024
        elif mode["kind"] == "duplicate-index":
            rows[-1]["index"] = 0
        elif mode["kind"] == "non-finite":
            rows[0]["embedding"][0] = float("nan")
        payload = {"model": body["model"], "data": rows}
        if mode["kind"] == "non-finite":
            return httpx.Response(
                200, content=json.dumps(payload, allow_nan=True).encode(),
                headers={"Content-Type": "application/json"},
            )
        return httpx.Response(200, json=payload)

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    provider = LocalEmbeddingProvider(client)
    vectors = provider.embed(["one", "two"])
    assert len(vectors) == 2 and len(vectors[0]) == 4096
    assert pytest.approx(sum(value * value for value in vectors[0]), rel=1e-5) == 1.0
    mode["kind"] = "wrong-dimension"
    with pytest.raises(SemanticAdapterError, match="dimension"):
        provider.embed(["one"])
    mode["kind"] = "duplicate-index"
    with pytest.raises(SemanticAdapterError, match="order"):
        provider.embed(["one", "two"])
    mode["kind"] = "non-finite"
    with pytest.raises(SemanticAdapterError, match="non_finite"):
        provider.embed(["one"])
    client.close()


def test_section_and_compiler_adapters_preserve_exact_citation_boundary():
    units = build_citation_units_v2(
        "Policy evidence with a limitation. " * 80, doc_id="doc-a",
        target_chars=500, hard_max_chars=700,
    )
    plan = build_adaptive_analysis_plan(
        run_id="run-020", units=units, small_model_route="core-qwen",
        target_chars=2000, maximum_prompts_per_section=2,
    )
    section = plan.sections[0]
    job = plan.jobs[0]

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        if body["model"] == "core-qwen":
            payload = {"findings": [{
                "statement": "The section contains policy evidence.",
                "evidence_state": "supported",
                "citation_unit_ids": [section.unit_ids[0]],
                "confidence": 0.8,
            }]}
        else:
            payload = {"claims": [{
                "statement": "The document contains policy evidence.",
                "support_status": "supported",
                "citation_unit_ids": [section.unit_ids[0]],
            }]}
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps(payload)}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    mapper = LocalSectionExecutor(client, concurrency_level=2)
    result = mapper.execute(job, section, 1)
    packet = build_compiler_packet(
        plan=plan, results=(result,), units=units, compiler_model_route="core-gemma",
    )
    compiled = LocalDocumentCompilerExecutor(client).execute(packet)
    validate_compilation(packet, compiled)
    assert compiled.claims[0].citation_unit_ids == (section.unit_ids[0],)
    assert [row.purpose for row in client.receipts] == ["section_mapper", "document_compiler"]
    assert all("source_text" not in row.model_dump_json() for row in client.receipts)
    client.close()


def test_mapper_rejects_unknown_source_citation_and_malformed_json():
    units = build_citation_units_v2("Evidence. " * 200, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2,
    )
    response_content = {"value": json.dumps({"findings": [{
        "statement": "Invented", "evidence_state": "supported",
        "citation_unit_ids": ["unknown-unit"], "confidence": 0.9,
    }]})}

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": response_content["value"]}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    mapper = LocalSectionExecutor(client, concurrency_level=1)
    result = mapper.execute(plan.jobs[0], plan.sections[0], 1)
    from runner.pipeline.analysis_sections import validate_section_result
    with pytest.raises(Exception, match="unknown_source"):
        validate_section_result(plan.jobs[0], plan.sections[0], result)
    response_content["value"] = "not-json"
    with pytest.raises(SemanticAdapterError, match="valid_json"):
        mapper.execute(plan.jobs[0], plan.sections[0], 1)
    client.close()


def test_optional_shadow_route_may_be_absent_without_weakening_baseline():
    config = SemanticEndpointConfigV1(
        base_url="http://localhost:4000", routes=_routes(include_shadow=False),
    )
    assert config.route("qwen_embedding").expected_dimension == 4096
    with pytest.raises(SemanticAdapterError, match="not_configured"):
        config.route("bge_shadow")


@pytest.mark.parametrize("finding", [
    {"statement": "", "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8},
    {"statement": "   ", "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8},
    {"statement": 7, "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8},
    {"statement": "Valid", "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": "0.8"},
    {"statement": "Valid", "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8, "extra": True},
])
def test_mapper_schema_rejects_blank_coerced_and_unknown_fields(finding):
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020b", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2,
    )
    finding = dict(finding)
    finding["citation_unit_ids"] = [plan.sections[0].unit_ids[0]]

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps({"findings": [finding]})}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    mapper = LocalSectionExecutor(client, concurrency_level=1)
    with pytest.raises(RetryableSectionError, match="schema_validation_retryable"):
        mapper.execute(plan.jobs[0], plan.sections[0], 1)
    assert "Synthetic evidence" not in str(mapper)
    client.close()


def test_mapper_empty_findings_is_valid_and_prompt_forbids_blank_statement():
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020b", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2,
    )
    system_prompts = []

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        system_prompts.append(body["messages"][0]["content"])
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps({"findings": []})}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    result = LocalSectionExecutor(client, concurrency_level=1).execute(
        plan.jobs[0], plan.sections[0], 1,
    )
    assert result.findings == ()
    assert '{"findings":[]}' in system_prompts[0]
    assert "never emit a placeholder or a blank statement" in system_prompts[0]
    client.close()


def test_durable_mapper_job_retries_once_then_succeeds(tmp_path):
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020b", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2, maximum_attempts=2,
    )
    calls = {"count": 0}

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        calls["count"] += 1
        job = plan.jobs[0]
        statement = "" if calls["count"] == 1 else "Synthetic supported finding."
        payload = {"findings": [{
            "statement": statement, "evidence_state": "supported",
            "citation_unit_ids": [job.unit_ids[0]], "confidence": 0.8,
        }]}
        body = json.loads(request.content)
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps(payload)}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    store = SectionAnalysisStore(tmp_path / "jobs.sqlite")
    try:
        store.seed(plan)
        results = run_parallel_jobs(
            store=store, plan=plan,
            executor=LocalSectionExecutor(client, concurrency_level=1), max_workers=1,
        )
        assert len(results) == len(plan.jobs)
        assert max(row.attempt for row in results) == 2
        assert max(store.attempts().values()) == 2
        assert calls["count"] == len(plan.jobs) + 1
    finally:
        store.close()
        client.close()


def test_two_invalid_mapper_responses_become_held(tmp_path):
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020b", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2, maximum_attempts=2,
    )

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        payload = {"findings": [{
            "statement": "", "evidence_state": "supported",
            "citation_unit_ids": [plan.jobs[0].unit_ids[0]], "confidence": 0.8,
        }]}
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps(payload)}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    store = SectionAnalysisStore(tmp_path / "held.sqlite")
    try:
        store.seed(plan)
        assert run_parallel_jobs(
            store=store, plan=plan,
            executor=LocalSectionExecutor(client, concurrency_level=1), max_workers=1,
        ) == ()
        assert store.counts() == {"held": len(plan.jobs)}
        assert set(store.attempts().values()) == {2}
    finally:
        store.close()
        client.close()
