from __future__ import annotations

import json
import hashlib

import httpx
import pytest

from runner.pipeline.factory_semantic_canary import (
    PhysicalCanaryError,
    RUN_ID,
    _fixture_texts,
    default_endpoint_config,
    run_physical_canary,
    verify_physical_canary_host,
)
from runner.models.retrieval import canonical_contract_sha256
from runner.pipeline.analysis_sections import (
    SectionAnalysisStore,
    SectionFindingV1,
    SectionPassResultV1,
    build_adaptive_analysis_plan,
    run_parallel_jobs,
)
from runner.pipeline.citation_units_v2 import build_citation_units_v2


def _model_info():
    return {"data": [
        {"model_name": "core-qwen", "litellm_params": {"model": "ollama_chat/qwen3.6:35b-mlx"}},
        {"model_name": "core-gemma", "litellm_params": {"model": "ollama_chat/gemma4:31b-mlx"}},
        {"model_name": "research-embedding", "litellm_params": {"model": "ollama/qwen3-embedding:8b"}},
        {"model_name": "compiler-qwen38", "litellm_params": {"model": "ollama_chat/qwen3.8:27b-mlx"}},
        {"model_name": "bge-m3-shadow", "litellm_params": {"model": "ollama/bge-m3:latest"}},
    ]}


def _handler(counter):
    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        counter[body["model"]] = counter.get(body["model"], 0) + 1
        if request.url.path == "/v1/embeddings":
            rows = []
            dimension = 1024 if body["model"] == "bge-m3-shadow" else 4096
            for index, text in enumerate(body["input"]):
                vector = [0.0] * dimension
                vector[hash(text) % dimension] = 1.0
                rows.append({"index": index, "embedding": vector})
            return httpx.Response(200, json={"model": body["model"], "data": rows})
        user = json.loads(body["messages"][1]["content"])
        if "allowed_unit_ids" in user:
            payload = {"findings": [{
                "statement": "Synthetic source-attested finding.",
                "evidence_state": "supported",
                "citation_unit_ids": [user["allowed_unit_ids"][0]],
                "confidence": 0.8,
            }]}
        else:
            supported = next(row for row in user["evidence"] if row["evidence_state"] == "supported")
            payload = {"claims": [{
                "statement": "Synthetic compiled claim.",
                "citation_unit_ids": [supported["citation_unit_ids"][0]],
                "support_status": "supported",
            }]}
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"message": {"content": json.dumps(payload)}}],
        })
    return handler


def test_physical_canary_host_preflight_requires_studio_space_and_no_overlap(tmp_path):
    with pytest.raises(PhysicalCanaryError, match="mac_studio"):
        verify_physical_canary_host(
            workspace=tmp_path / "state", host_role="macbook", shared_roots=(),
            minimum_free_bytes=0,
        )
    shared = tmp_path / "shared"
    with pytest.raises(PhysicalCanaryError, match="overlaps"):
        verify_physical_canary_host(
            workspace=shared / "state", host_role="mac-studio", shared_roots=(shared,),
            minimum_free_bytes=0,
        )
    result = verify_physical_canary_host(
        workspace=tmp_path / "local-state", host_role="mac-studio",
        shared_roots=(tmp_path / "elsewhere",), minimum_free_bytes=0,
    )
    assert result["workspace_outside_exchange"]


def test_mocked_physical_canary_runs_real_boundaries_and_second_run_is_model_idle(tmp_path):
    counter = {}
    transport = httpx.MockTransport(_handler(counter))
    config = default_endpoint_config(base_url="http://127.0.0.1:4000")
    first = run_physical_canary(
        workspace=tmp_path / "canary", endpoint_config=config,
        host_role="mac-studio", shared_roots=(tmp_path / "shared",),
        transport=transport, minimum_free_bytes=0,
    )
    first_calls = dict(counter)
    assert first["document_count"] == 3
    assert first["maximum_safe_mapper_concurrency"] == 4
    assert first["embedding_dimension"] == 4096
    assert first["contradiction_slots_filled"] == 1
    assert first["new_model_call_count"] > 0
    assert first["bge_shadow"]["status"] == "SHADOW_ROUTE_NOT_CONFIGURED"
    assert first["qwen38_candidate"]["status"] == "QWEN38_ROUTE_NOT_CONFIGURED"
    assert first["research_documents"] == first["remote_writes"] == first["imports"] == 0

    counter.clear()
    second = run_physical_canary(
        workspace=tmp_path / "canary", endpoint_config=config,
        host_role="mac-studio", shared_roots=(tmp_path / "shared",),
        transport=transport, minimum_free_bytes=0,
    )
    assert first_calls
    assert counter == {}
    assert second["new_model_call_count"] == 0
    assert second["index_reused"]
    assert second["projection_sha256"] == first["projection_sha256"]


def test_canary_report_is_content_free(tmp_path):
    config = default_endpoint_config(base_url="http://localhost:4000")
    report = run_physical_canary(
        workspace=tmp_path / "canary", endpoint_config=config,
        host_role="mac-studio", transport=httpx.MockTransport(_handler({})),
        minimum_free_bytes=0,
    )
    serialized = json.dumps(report)
    assert "source_text" not in serialized
    assert "Synthetic source-attested finding" not in serialized
    assert "Policy" not in serialized
    assert "api_key" not in serialized


def test_concurrency_one_schema_retry_succeeds_and_is_recorded(tmp_path):
    counter = {}
    valid_handler = _handler(counter)
    state = {"mapper_calls": 0}

    def handler(request):
        if request.url.path == "/model/info":
            return valid_handler(request)
        body = json.loads(request.content)
        if request.url.path == "/v1/chat/completions" and body["model"] == "core-qwen":
            state["mapper_calls"] += 1
            if state["mapper_calls"] == 1:
                return httpx.Response(200, json={
                    "model": body["model"],
                    "choices": [{"finish_reason": "stop", "message": {
                        "content": json.dumps({"findings": [{
                            "statement": "", "evidence_state": "supported",
                            "citation_unit_ids": ["unused"], "confidence": 0.8,
                        }]})
                    }}],
                })
        return valid_handler(request)

    workspace = tmp_path / "retry-canary"
    report = run_physical_canary(
        workspace=workspace,
        endpoint_config=default_endpoint_config(
            base_url="http://127.0.0.1:4000",
            qwen38_alias="compiler-qwen38",
        ),
        host_role="mac-studio", transport=httpx.MockTransport(handler),
        minimum_free_bytes=0,
    )
    benchmark = json.loads((workspace / "concurrency_benchmark.json").read_text())
    assert report["maximum_safe_mapper_concurrency"] == 4
    assert benchmark["levels"][0]["schema_retry_count"] == 1
    assert benchmark["levels"][0]["retry_count"] == 1
    assert benchmark["levels"][0]["model_call_count"] == 2
    assert benchmark["levels"][0]["completed_jobs"] == 1
    assert benchmark["levels"][0]["requested_model_counts"] == {
        "compiler-qwen38": 1, "core-qwen": 1,
    }
    assert benchmark["levels"][0]["schema_diagnostics"] == [{
        "attempt": 1,
        "issues": [{
            "location": "findings.*.statement",
            "type_code": "string_too_short",
        }],
    }]


def test_repeated_schema_failure_persists_content_free_benchmark(tmp_path):
    source_marker = "FORBIDDEN-SYNTHETIC-SOURCE-CONTENT"

    def handler(request):
        if request.url.path == "/model/info":
            return httpx.Response(200, json=_model_info())
        body = json.loads(request.content)
        return httpx.Response(200, json={
            "model": body["model"],
            "choices": [{"finish_reason": "stop", "message": {
                "content": json.dumps({"findings": [{
                    "statement": "", "evidence_state": "supported",
                    "citation_unit_ids": [source_marker], "confidence": 0.8,
                }]})
            }}],
        })

    workspace = tmp_path / "held-canary"
    with pytest.raises(PhysicalCanaryError, match="concurrency_one_failed"):
        run_physical_canary(
            workspace=workspace,
            endpoint_config=default_endpoint_config(
                base_url="http://127.0.0.1:4000",
                qwen38_alias="compiler-qwen38",
            ),
            host_role="mac-studio", transport=httpx.MockTransport(handler),
            minimum_free_bytes=0,
        )
    benchmark_path = workspace / "concurrency_benchmark.json"
    assert benchmark_path.exists()
    serialized = benchmark_path.read_text()
    payload = json.loads(serialized)
    level = payload["levels"][0]
    assert level["status"] == "failed"
    assert level["model_call_count"] == 2
    assert level["error_code"] == "section_mapper_schema_validation_retryable"
    assert level["requested_model_counts"] == {
        "compiler-qwen38": 1, "core-qwen": 1,
    }
    assert source_marker not in serialized
    assert "source_text" not in serialized
    assert '"statement": ""' not in serialized
    assert "citation_unit_ids" not in serialized


def test_targeted_run020c_resume_preserves_successes_and_skips_benchmark_probe(tmp_path):
    workspace = tmp_path / "resume-canary"
    texts = _fixture_texts()
    units_by_doc = {
        doc: build_citation_units_v2(text, doc_id=doc)
        for doc, text in texts.items()
    }
    plans = {
        doc: build_adaptive_analysis_plan(
            run_id=RUN_ID, units=units, small_model_route="core-qwen",
            repair_model_route="compiler-qwen38", target_chars=5000,
            overlap_units=1, maximum_prompts_per_section=6,
        )
        for doc, units in units_by_doc.items()
    }
    policy_plan = plans["synthetic-policy"]
    held_ids = {row.job_id for row in policy_plan.jobs[-2:]}

    def result_for(job, section, attempt):
        finding = SectionFindingV1(
            finding_id=f"finding-{hashlib.sha256(job.job_id.encode()).hexdigest()[:16]}",
            prompt_id=job.prompt_id, statement="Synthetic supported finding.",
            evidence_state="supported", citation_unit_ids=(section.unit_ids[0],),
            confidence=0.8,
        )
        values = dict(
            schema_version="section-pass-result-v1.0", job_id=job.job_id,
            job_sha256=job.job_sha256, document_id=job.document_id,
            section_id=job.section_id, prompt_id=job.prompt_id,
            requested_model=job.model_route,
            provider_resolved_model="ollama_chat/qwen3.6:35b-mlx",
            attempt=attempt, repair_error_code=None, findings=(finding,),
            output_sha256="0" * 64,
        )
        draft = SectionPassResultV1.model_construct(**values)
        values["output_sha256"] = canonical_contract_sha256(
            draft, omit={"output_sha256"},
        )
        return SectionPassResultV1.model_validate(values)

    class LegacyExecutor:
        def execute(self, job, section, attempt):
            if job.job_id in held_ids:
                raise ValueError("legacy model-output contract failure")
            return result_for(job, section, attempt)

    store = SectionAnalysisStore(workspace / "state" / "synthetic-policy.sqlite")
    try:
        store.seed(policy_plan)
        assert len(run_parallel_jobs(
            store=store, plan=policy_plan, executor=LegacyExecutor(), max_workers=4,
        )) == 8
    finally:
        store.close()
    benchmark = {
        "schema_version": "semantic-concurrency-benchmark-v1.0",
        "maximum_safe_concurrency": 4,
        "levels": [
            {"concurrency": level, "status": "passed"}
            for level in (1, 2, 4)
        ],
    }
    workspace.mkdir(parents=True, exist_ok=True)
    (workspace / "concurrency_benchmark.json").write_text(
        json.dumps(benchmark), encoding="utf-8",
    )

    counter = {"model_info": 0, "mapper_core": 0, "mapper_repair": 0}
    model_counter = {}
    valid_handler = _handler(model_counter)

    def handler(request):
        if request.url.path == "/model/info":
            counter["model_info"] += 1
            raise AssertionError("Run-020C validated environment must be reused")
        if request.url.path == "/v1/chat/completions":
            body = json.loads(request.content)
            user = json.loads(body["messages"][1]["content"])
            if "allowed_unit_ids" in user:
                key = "mapper_repair" if body["model"] == "compiler-qwen38" else "mapper_core"
                counter[key] += 1
        return valid_handler(request)

    config = default_endpoint_config(
        base_url="http://127.0.0.1:4000",
        qwen38_alias="compiler-qwen38", bge_shadow_alias="bge-m3-shadow",
    )
    first = run_physical_canary(
        workspace=workspace, endpoint_config=config, host_role="mac-studio",
        transport=httpx.MockTransport(handler), minimum_free_bytes=0,
        resume_run020c_held_jobs=True,
        reuse_run020c_validated_environment=True,
    )
    assert first["benchmark_reused"] is True
    assert set(first["targeted_resume_job_ids"]) == held_ids
    assert counter["model_info"] == 0
    assert counter["mapper_repair"] == 2
    assert counter["mapper_core"] == 18
    reopened = SectionAnalysisStore(workspace / "state" / "synthetic-policy.sqlite")
    try:
        attempts = reopened.attempts()
    finally:
        reopened.close()
    assert {attempts[job_id] for job_id in held_ids} == {2}
    assert all(attempts[job_id] == 1 for job_id in attempts if job_id not in held_ids)

    for key in counter:
        counter[key] = 0
    model_counter.clear()
    second = run_physical_canary(
        workspace=workspace, endpoint_config=config, host_role="mac-studio",
        transport=httpx.MockTransport(handler), minimum_free_bytes=0,
        reuse_run020c_validated_environment=True,
    )
    assert counter == {"model_info": 0, "mapper_core": 0, "mapper_repair": 0}
    assert model_counter == {}
    assert second["new_model_call_count"] == 0
    assert second["projection_sha256"] == first["projection_sha256"]


def test_targeted_run020c_resume_rejects_wrong_held_count_before_model_call(tmp_path):
    workspace = tmp_path / "bad-resume"
    workspace.mkdir()
    (workspace / "concurrency_benchmark.json").write_text(json.dumps({
        "maximum_safe_concurrency": 4,
        "levels": [{"concurrency": level, "status": "passed"} for level in (1, 2, 4)],
    }), encoding="utf-8")
    counter = {"calls": 0}

    def handler(request):
        counter["calls"] += 1
        raise AssertionError("resume mismatch must stop before endpoint access")

    with pytest.raises(PhysicalCanaryError, match="database_set_mismatch"):
        run_physical_canary(
            workspace=workspace,
            endpoint_config=default_endpoint_config(
                base_url="http://127.0.0.1:4000",
                qwen38_alias="compiler-qwen38", bge_shadow_alias="bge-m3-shadow",
            ),
            host_role="mac-studio", transport=httpx.MockTransport(handler),
            minimum_free_bytes=0, resume_run020c_held_jobs=True,
            reuse_run020c_validated_environment=True,
        )
    assert counter["calls"] == 0
