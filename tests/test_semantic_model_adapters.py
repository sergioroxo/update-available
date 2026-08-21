from __future__ import annotations

import json

import httpx
import pytest
from pydantic import ValidationError

from runner.pipeline.analysis_sections import (
    RetryableSectionError,
    SectionAnalysisError,
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
    MapperOutputContractRetryableError,
    MapperSchemaRetryableError,
    OpenAICompatibleLocalClient,
    SemanticAdapterError,
    SemanticEndpointConfigV1,
    compiler_response_json_schema,
    mapper_response_json_schema,
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
            route_id="repair", purpose="qwen38_mapper_repair",
            requested_model="compiler-qwen38",
            expected_resolved_fragments=("qwen3.8", "27b"),
            maximum_output_tokens=2048,
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
            {"model_name": "compiler-qwen38", "litellm_params": {"model": "ollama_chat/qwen3.8:27b-mlx"}},
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
    requests = []

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        requests.append(body)
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
    compiler_format = requests[-1]["response_format"]
    assert compiler_format["type"] == "json_schema"
    assert compiler_format["json_schema"]["name"] == "compiler_response_v1"
    assert compiler_format["json_schema"]["schema"] == compiler_response_json_schema()
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
    with pytest.raises(
        MapperOutputContractRetryableError,
        match="output_contract_retryable",
    ) as caught:
        mapper.execute(plan.jobs[0], plan.sections[0], 1)
    assert caught.value.issues[0].type_code == "enum"
    response_content["value"] = "not-json"
    with pytest.raises(SectionAnalysisError, match="json_not_object_prefixed") as malformed:
        mapper.execute(plan.jobs[0], plan.sections[0], 1)
    assert malformed.value.stage == "response_json"
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
    requests = []

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        requests.append(body)
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
    system_prompt = requests[0]["messages"][0]["content"]
    assert '{"findings":[]}' in system_prompt
    assert "never emit a placeholder or a blank statement" in system_prompt
    response_format = requests[0]["response_format"]
    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["strict"] is True
    schema = response_format["json_schema"]["schema"]
    assert schema == mapper_response_json_schema(plan.jobs[0], plan.sections[0])
    assert json.dumps(schema, sort_keys=True, separators=(",", ":")) in system_prompt
    client.close()


def test_mapper_schema_is_strict_and_derived_from_contract():
    schema = mapper_response_json_schema()
    assert schema["additionalProperties"] is False
    assert schema["required"] == ["findings"]
    finding = schema["$defs"]["_MapperFindingPayloadV1"]
    assert finding["additionalProperties"] is False
    assert set(finding["required"]) == {
        "statement", "evidence_state", "citation_unit_ids", "confidence",
    }
    assert finding["properties"]["statement"]["minLength"] == 1
    assert finding["properties"]["evidence_state"]["enum"] == [
        "supported", "hypothesis", "unsupported",
    ]
    assert finding["properties"]["confidence"]["minimum"] == 0
    assert finding["properties"]["confidence"]["maximum"] == 1


def test_mapper_provider_schema_stays_base_structural_for_exact_job():
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020d", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2,
    )
    job, section = plan.jobs[0], plan.sections[0]
    schema = mapper_response_json_schema(job, section)
    assert schema == mapper_response_json_schema()
    finding = schema["$defs"]["_MapperFindingPayloadV1"]
    citations = finding["properties"]["citation_unit_ids"]
    assert citations["items"] == {"type": "string"}
    assert "uniqueItems" not in citations
    assert "maxItems" not in schema["properties"]["findings"]
    assert "allOf" not in finding


@pytest.mark.parametrize(("citations", "evidence_state", "expected_type"), [
    ([], "supported", "supported_citation_required"),
    (["duplicate", "duplicate"], "hypothesis", "unique_items"),
    (["unknown"], "unsupported", "enum"),
])
def test_job_bound_output_contract_failures_are_retryable_and_sanitized(
    citations, evidence_state, expected_type,
):
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020d", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2,
    )
    job, section = plan.jobs[0], plan.sections[0]
    if citations == ["duplicate", "duplicate"]:
        citations = [section.unit_ids[0], section.unit_ids[0]]

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        payload = {"findings": [{
            "statement": "Synthetic finding.", "evidence_state": evidence_state,
            "citation_unit_ids": citations, "confidence": 0.8,
        }]}
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps(payload)}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    try:
        with pytest.raises(MapperOutputContractRetryableError) as caught:
            LocalSectionExecutor(client, concurrency_level=1).execute(job, section, 1)
        assert [row.type_code for row in caught.value.issues] == [expected_type]
        assert set(caught.value.issues[0].model_dump()) == {"location", "type_code"}
    finally:
        client.close()


def test_job_bound_finding_limit_is_retryable():
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020d", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2,
    )
    job, section = plan.jobs[0], plan.sections[0]
    finding = {
        "statement": "Synthetic finding.", "evidence_state": "supported",
        "citation_unit_ids": [section.unit_ids[0]], "confidence": 0.8,
    }

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps({
                "findings": [finding] * (job.maximum_output_items + 1),
            })}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    try:
        with pytest.raises(MapperOutputContractRetryableError) as caught:
            LocalSectionExecutor(client, concurrency_level=1).execute(job, section, 1)
        assert caught.value.issues[0].type_code == "too_long"
    finally:
        client.close()


@pytest.mark.parametrize(("finding", "expected_type"), [
    ({"evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8}, "missing"),
    ({"statement": "", "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8}, "string_too_short"),
    ({"statement": "   ", "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8}, "value_error"),
    ({"statement": 7, "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8}, "string_type"),
    ({"statement": "Valid", "evidence_state": "invented", "citation_unit_ids": ["unit"], "confidence": 0.8}, "literal_error"),
    ({"statement": "Valid", "evidence_state": "supported", "citation_unit_ids": "unit", "confidence": 0.8}, "list_type"),
    ({"statement": "Valid", "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 2.0}, "less_than_equal"),
    ({"statement": "Valid", "evidence_state": "supported", "citation_unit_ids": ["unit"], "confidence": 0.8, "forbidden": "SECRET-VALUE"}, "extra_forbidden"),
])
def test_mapper_diagnostic_contains_only_location_and_type(finding, expected_type):
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020c", units=units, small_model_route="core-qwen",
        target_chars=3000, maximum_prompts_per_section=2,
    )
    finding = dict(finding)
    if isinstance(finding.get("citation_unit_ids"), list):
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
    with pytest.raises(MapperSchemaRetryableError) as caught:
        LocalSectionExecutor(client, concurrency_level=1).execute(
            plan.jobs[0], plan.sections[0], 1,
        )
    serialized = json.dumps([row.model_dump() for row in caught.value.issues])
    assert expected_type in serialized
    assert "SECRET-VALUE" not in serialized
    assert "Synthetic evidence" not in serialized
    assert set(caught.value.issues[0].model_dump()) == {"location", "type_code"}
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


def test_declared_schema_repair_uses_qwen38_and_binds_actual_provenance(tmp_path):
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020c", units=units, small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=3000,
        maximum_prompts_per_section=2, maximum_attempts=2,
    )
    calls = []
    reasoning = []

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        calls.append(body["model"])
        reasoning.append(body.get("reasoning_effort"))
        job = plan.jobs[0]
        payload = {"findings": [{
            "statement": "" if body["model"] == "core-qwen" else "Repaired finding.",
            "evidence_state": "supported",
            "citation_unit_ids": [job.unit_ids[0]], "confidence": 0.8,
        }]}
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps(payload)}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    mapper = LocalSectionExecutor(client, concurrency_level=1)
    job, section = plan.jobs[0], plan.sections[0]
    with pytest.raises(MapperSchemaRetryableError):
        mapper.execute(job, section, 1)
    result = mapper.execute_with_retry_context(
        job, section, 2,
        retry_error_code="section_mapper_schema_validation_retryable",
    )
    assert calls == ["core-qwen", "compiler-qwen38"]
    assert reasoning == [None, "none"]
    assert result.requested_model == "compiler-qwen38"
    assert result.provider_resolved_model == "ollama_chat/qwen3.8:27b-mlx"
    assert result.repair_error_code == "section_mapper_schema_validation_retryable"
    assert [row.purpose for row in client.receipts] == [
        "section_mapper", "qwen38_mapper_repair",
    ]
    client.close()


def test_declared_output_contract_repair_uses_qwen38_once():
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020d", units=units, small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=3000,
        maximum_prompts_per_section=2, maximum_attempts=2,
    )
    job, section = plan.jobs[0], plan.sections[0]
    calls = []

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        calls.append(body["model"])
        payload = {"findings": [{
            "statement": "Synthetic repaired finding.",
            "evidence_state": "supported",
            "citation_unit_ids": (
                ["unknown-unit"] if body["model"] == "core-qwen"
                else [section.unit_ids[0]]
            ),
            "confidence": 0.8,
        }]}
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps(payload)}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    executor = LocalSectionExecutor(client, concurrency_level=1)
    try:
        with pytest.raises(MapperOutputContractRetryableError):
            executor.execute(job, section, 1)
        result = executor.execute_with_retry_context(
            job, section, 2,
            retry_error_code="section_mapper_output_contract_retryable",
        )
        assert calls == ["core-qwen", "compiler-qwen38"]
        assert result.attempt == 2
        assert result.repair_error_code == "section_mapper_output_contract_retryable"
        assert result.requested_model == "compiler-qwen38"
    finally:
        client.close()


def test_transport_retry_stays_on_primary_route(tmp_path):
    units = build_citation_units_v2("Synthetic evidence. " * 80, doc_id="doc-a")
    plan = build_adaptive_analysis_plan(
        run_id="run-020c", units=units, small_model_route="core-qwen",
        repair_model_route="compiler-qwen38", target_chars=3000,
        maximum_prompts_per_section=2, maximum_attempts=2,
    )
    calls = []

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        calls.append(body["model"])
        if len(calls) == 1:
            return httpx.Response(503)
        user = json.loads(body["messages"][1]["content"])
        payload = {"findings": [{
            "statement": "Primary route recovered.", "evidence_state": "supported",
            "citation_unit_ids": [user["allowed_unit_ids"][0]], "confidence": 0.8,
        }]}
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps(payload)}}],
        })

    client = OpenAICompatibleLocalClient(_config(), transport=httpx.MockTransport(handler))
    client.preflight()
    store = SectionAnalysisStore(tmp_path / "transport.sqlite")
    try:
        store.seed(plan)
        results = run_parallel_jobs(
            store=store, plan=plan,
            executor=LocalSectionExecutor(client, concurrency_level=1), max_workers=1,
        )
        assert len(results) == len(plan.jobs)
        assert calls[:2] == ["core-qwen", "core-qwen"]
        assert "compiler-qwen38" not in calls
        assert all(row.repair_error_code is None for row in results)
        failures = store.failure_evidence()
        assert len(failures) == 1
        assert failures[0]["stage"] == "http_status"
        assert failures[0]["error_code"] == "local_chat_status_retryable"
        assert failures[0]["http_status_category"] == "5xx"
        assert failures[0]["requested_alias"] == "core-qwen"
        assert failures[0]["attempt"] == 1
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
