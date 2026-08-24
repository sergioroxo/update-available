from __future__ import annotations

import hashlib
import json
from pathlib import Path

import httpx
import pytest
from pydantic import ValidationError

from runner.pipeline.factory_semantic_pilot import (
    SemanticPilotError,
    build_contract,
    build_results_archive,
    endpoint_config,
    run_copied_semantic_pilot,
    validate_sealed_results,
)


def _contract(tmp_path: Path, texts: tuple[str, ...] = ("Public policy evidence.", "Contrary public evidence.")):
    workspace = tmp_path / "factory" / "pilot"
    documents = []
    for index, text in enumerate(texts, start=1):
        document_id = f"pilot-doc-{index}"
        path = workspace / "input" / document_id / "source.txt"
        path.parent.mkdir(parents=True)
        path.write_text(text, encoding="utf-8")
        raw = path.read_bytes()
        documents.append({
            "document_id": document_id,
            "title": f"Public source {index}",
            "source_sha256": hashlib.sha256(raw).hexdigest(),
            "source_bytes": len(raw),
            "source_characters": len(text),
            "source_path": str(path),
            "source_family_id": f"family-{index}",
            "stance": "opposed" if index == 2 else "supporting",
            "language": "en",
        })
    return build_contract({
        "schema_version": "copied-semantic-pilot-contract-v1.0",
        "run_id": "test-copied-pilot",
        "prompt_id": "test-prompt",
        "prompt_body_sha256": hashlib.sha256(b"prompt").hexdigest(),
        "prompt_body_bytes": 6,
        "approval_text": "Approved for local-only copied-text testing.",
        "approved_document_count": len(documents),
        "documents": documents,
        "workspace": str(workspace),
        "forbidden_roots": (str(tmp_path / "exchange"),),
        "sections_version": "sections-v2.0",
        "citation_units_version": "citation-units-v2.0",
        "mapper_maximum_concurrency": 4,
        "mapper_maximum_attempts": 2,
        "mapper_repair_attempts": 1,
        "retrieval_policy": "hybrid-rrf-source-only-v1.0",
        "retrieval_limit": 1,
        "per_family_cap": 1,
        "contradiction_slots": 1,
        "remote_writes": False,
        "publication": False,
        "corpus_import": False,
    })


def test_contract_rejects_extra_documents_stale_selection_and_unsafe_paths(tmp_path):
    contract = _contract(tmp_path)
    payload = contract.model_dump(mode="python")
    payload["approved_document_count"] = 1
    with pytest.raises(ValidationError, match="document count"):
        type(contract).model_validate(payload)

    payload = contract.model_dump(mode="python")
    payload["selection_sha256"] = "0" * 64
    with pytest.raises(ValidationError, match="selection hash"):
        type(contract).model_validate(payload)

    payload = contract.model_dump(mode="python")
    payload["documents"][0]["source_path"] = str(tmp_path / "outside.txt")
    with pytest.raises(ValidationError, match="bound input slot"):
        build_contract(payload)


def test_contract_rejects_remote_authority_and_truncation_marker(tmp_path):
    contract = _contract(tmp_path)
    payload = contract.model_dump(mode="python")
    payload["remote_writes"] = True
    with pytest.raises(ValidationError):
        type(contract).model_validate(payload)

    text = "Public [TRUNCATED MIDDLE — removed] evidence."
    truncated = _contract(tmp_path / "second", (text, "Other evidence."))
    with pytest.raises(SemanticPilotError, match="historical_truncation"):
        run_copied_semantic_pilot(
            contract=truncated,
            endpoint=endpoint_config(base_url="http://localhost:4000", api_key=""),
            host_role="mac-studio",
            transport=httpx.MockTransport(lambda _request: httpx.Response(500)),
        )


def _transport(request: httpx.Request) -> httpx.Response:
    payload = json.loads(request.content)
    if request.url.path == "/v1/embeddings":
        dimension = 4096 if payload["model"] == "research-embedding" else 1024
        rows = []
        for index, _text in enumerate(payload["input"]):
            vector = [0.0] * dimension
            vector[index % dimension] = 1.0
            rows.append({"index": index, "embedding": vector})
        return httpx.Response(200, json={"model": payload["model"], "data": rows})
    schema_name = payload["response_format"]["json_schema"]["name"]
    user = json.loads(payload["messages"][1]["content"])
    if schema_name == "mapper_response_v1":
        content = {"findings": [{
            "statement": "Source-attested public finding.",
            "evidence_state": "supported",
            "citation_unit_ids": [user["allowed_unit_ids"][0]],
            "confidence": 0.8,
        }]}
    elif schema_name == "compiler_response_v1":
        unit_id = user["evidence"][0]["citation_unit_ids"][0]
        content = {"claims": [{
            "statement": "Compiled public finding.",
            "citation_unit_ids": [unit_id],
            "support_status": "supported",
        }]}
    else:
        assert payload["reasoning_effort"] == "none"
        hit = user["retrieved_source_units"][0]
        content = {
            "document_id": user["document_id"],
            "retrieval_context_sha256": user["retrieval_context_sha256"],
            "corpus_connections": [{
                "document_id": hit["document_id"],
                "unit_id": hit["unit_id"],
                "reason_code": "related_public_evidence",
            }],
        }
    encoded = json.dumps(content)
    if schema_name == "grounded_enrichment_response_v1":
        encoded = f"```json\n{encoded}\n```"
    return httpx.Response(200, json={
        "model": payload["model"],
        "choices": [{"message": {"content": encoded}, "finish_reason": "stop"}],
    })


def test_complete_pilot_resumes_with_zero_calls_and_same_projection(tmp_path):
    contract = _contract(tmp_path)
    endpoint = endpoint_config(base_url="http://localhost:4000", api_key="secret-not-persisted")
    first = run_copied_semantic_pilot(
        contract=contract, endpoint=endpoint, host_role="mac-studio",
        transport=httpx.MockTransport(_transport),
    )
    second = run_copied_semantic_pilot(
        contract=contract, endpoint=endpoint, host_role="mac-studio",
        transport=httpx.MockTransport(_transport),
    )
    assert first["new_call_counts"]["new_model_call_count"] > 0
    assert second["new_call_counts"]["new_model_call_count"] == 0
    assert first["projection_sha256"] == second["projection_sha256"]
    assert second["self_retrieval_hits"] == 0
    assert second["remote_writes"] == 0
    assert all(
        row["purpose"] != "grounded_enrichment" or row["requested_model"] == "core-gemma"
        for row in json.loads(
            (Path(contract.workspace) / "state" / "model_receipts.json").read_text()
        )["receipts"]
    )


def test_sealed_allowlist_rejects_state_and_builds_deterministic_archive(tmp_path):
    sealed = tmp_path / "sealed"
    sealed.mkdir()
    (sealed / "pilot_projection.json").write_text("{}", encoding="utf-8")
    assert validate_sealed_results(sealed)
    forbidden = sealed / "state.sqlite"
    forbidden.write_bytes(b"sqlite")
    with pytest.raises(SemanticPilotError, match="forbidden"):
        validate_sealed_results(sealed)
    forbidden.unlink()
    first = tmp_path / "one.tar.gz"
    second = tmp_path / "two.tar.gz"
    commit = "a" * 40
    manifest_a = build_results_archive(
        sealed_directory=sealed, archive_path=first, source_commit=commit,
    )
    manifest_b = build_results_archive(
        sealed_directory=sealed, archive_path=second, source_commit=commit,
    )
    assert manifest_a["archive_sha256"] == manifest_b["archive_sha256"]
    assert manifest_a["source_payload_members"] == 0
    assert manifest_a["raw_vector_members"] == 0
    with pytest.raises(SemanticPilotError, match="source_commit_malformed"):
        build_results_archive(
            sealed_directory=sealed, archive_path=tmp_path / "bad.tar.gz",
            source_commit="not-a-git-object",
        )
