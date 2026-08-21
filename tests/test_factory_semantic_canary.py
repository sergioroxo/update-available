from __future__ import annotations

import json

import httpx
import pytest

from runner.pipeline.factory_semantic_canary import (
    PhysicalCanaryError,
    default_endpoint_config,
    run_physical_canary,
    verify_physical_canary_host,
)


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
            for index, text in enumerate(body["input"]):
                vector = [0.0] * 4096
                vector[hash(text) % 4096] = 1.0
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
