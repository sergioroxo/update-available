from __future__ import annotations

import json

from runner.pipeline.audit import EnrichmentRunMeta, write_enrichment_audit
import pytest

from runner.pipeline.input_receipt import (
    build_aggregate_input_receipt,
    build_resolved_input_receipt,
    canonical_fingerprint,
    validate_aggregate_input_receipt,
    validate_resolved_input_receipt,
)
from runner.pipeline.dependency_impact import _stage_snapshot
from runner.dependency_impact_ui import receipt_table_rows
from runner.models.enrichment import EnrichmentResult


def _enrichment() -> EnrichmentResult:
    return EnrichmentResult.model_validate({"doc_id": "doc-receipt", "enrichment_model": "core-gemma"})


def _fp(label: str) -> str:
    return canonical_fingerprint({"identity": label})


def _analysis_unused_memory_fp() -> str:
    return canonical_fingerprint({
        "used": False,
        "reason": "provisional memory is not an Analysis input",
    })


def test_resolved_receipt_is_exact_content_free_and_sensitive():
    receipt = build_resolved_input_receipt(
        stage="enrichment",
        extracted_text="sensitive testimony",
        system_input="complete system prompt",
        user_input="complete user message",
        resolved_model="core-gemma",
        model_parameters={"temperature": 0.1, "max_tokens": 1000},
        lexicon_fingerprint=_fp("lexicon"),
        provisional_memory_fingerprint=_fp("memory"),
        tag_registry_fingerprint=_fp("tags"),
        policy_fingerprint=_fp("policy"),
    )
    assert receipt["exact"] is True
    assert receipt["resolved_model"] == "core-gemma"
    assert receipt["routing_model_alias"] == "core-gemma"
    assert receipt["provider_resolved_model"] == ""
    assert receipt["model_identity_scope"] == "routing_alias"
    assert len(receipt["request_sha256"]) == 64
    serialized = json.dumps(receipt)
    assert "sensitive testimony" not in serialized
    assert "complete system prompt" not in serialized
    changed = build_resolved_input_receipt(
        stage="enrichment",
        extracted_text="different",
        system_input="complete system prompt",
        user_input="complete user message",
        resolved_model="core-gemma",
        model_parameters={"temperature": 0.1, "max_tokens": 1000},
        lexicon_fingerprint=_fp("lexicon"),
        provisional_memory_fingerprint=_fp("memory"),
        tag_registry_fingerprint=_fp("tags"),
        policy_fingerprint=_fp("policy"),
    )
    assert changed["request_sha256"] != receipt["request_sha256"]


def test_strict_receipt_validation_recomputes_fields_hashes_and_dependencies():
    dependencies = {
        "lexicon_fingerprint": _fp("lexicon"),
        "provisional_memory_fingerprint": _fp("memory"),
        "tag_registry_fingerprint": _fp("tags"),
        "policy_fingerprint": _fp("policy"),
    }
    receipt = build_resolved_input_receipt(
        stage="enrichment", extracted_text="text", system_input="system", user_input="user",
        resolved_model="route-alias", provider_resolved_model="provider/model@revision",
        model_parameters={"temperature": 0.1},
        lexicon_fingerprint=dependencies["lexicon_fingerprint"],
        provisional_memory_fingerprint=dependencies["provisional_memory_fingerprint"],
        tag_registry_fingerprint=dependencies["tag_registry_fingerprint"],
        policy_fingerprint=dependencies["policy_fingerprint"],
    )
    validated = validate_resolved_input_receipt(
        receipt, expected_stage="enrichment", top_level_dependencies=dependencies,
    )
    assert validated["valid"] is True
    assert validated["model_identity_scope"] == "provider_resolved"

    tampered = json.loads(json.dumps(receipt))
    tampered["model_parameters"]["temperature"] = 0.9
    with pytest.raises(ValueError, match="model-parameter fingerprint"):
        validate_resolved_input_receipt(
            tampered, expected_stage="enrichment", top_level_dependencies=dependencies,
        )

    tampered = json.loads(json.dumps(receipt))
    tampered["dependencies"]["policy_fingerprint"] = _fp("different-policy")
    tampered["request_sha256"] = canonical_fingerprint({
        key: value for key, value in tampered.items() if key != "request_sha256"
    })
    with pytest.raises(ValueError, match="top-level audit provenance"):
        validate_resolved_input_receipt(
            tampered, expected_stage="enrichment", top_level_dependencies=dependencies,
        )

    with pytest.raises(ValueError, match="artifact stage"):
        validate_resolved_input_receipt(
            receipt, expected_stage="analysis", top_level_dependencies=dependencies,
        )

    tampered = json.loads(json.dumps(receipt))
    tampered["unexpected"] = True
    with pytest.raises(ValueError, match="fields do not match"):
        validate_resolved_input_receipt(tampered, expected_stage="enrichment")


def test_missing_dependency_identity_is_not_claimed_exact():
    receipt = build_resolved_input_receipt(
        stage="analysis",
        extracted_text="text",
        system_input="system",
        user_input="user",
        resolved_model="model",
        model_parameters={},
        lexicon_fingerprint="",
        provisional_memory_fingerprint=_fp("unused"),
        tag_registry_fingerprint=_fp("unused"),
        policy_fingerprint=_fp("policy"),
    )
    assert receipt["exact"] is False


def test_enrichment_meta_preserves_phase_10b_receipt_fields(tmp_path):
    receipt = build_resolved_input_receipt(
        stage="enrichment",
        extracted_text="text",
        system_input="system",
        user_input="user",
        resolved_model="model",
        model_parameters={},
        lexicon_fingerprint=_fp("lexicon"),
        provisional_memory_fingerprint=_fp("memory"),
        tag_registry_fingerprint=_fp("tags"),
        policy_fingerprint=_fp("policy"),
    )
    meta = EnrichmentRunMeta(
        input_receipt=receipt,
        lexicon_fingerprint=_fp("lexicon"),
        provisional_memory_fingerprint=_fp("memory"),
        provisional_memory_clusters_injected=2,
        provisional_memory_cluster_ids=["cluster-a", "cluster-b"],
        tag_registry_fingerprint=_fp("tags"),
        policy_fingerprint=_fp("policy"),
        govuk_definition_memory={"manifest_fingerprint": _fp("govuk")},
    )
    write_enrichment_audit(tmp_path, meta, _enrichment())
    saved = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert saved["input_receipt"]["exact"] is True
    assert saved["provisional_memory_cluster_ids"] == ["cluster-a", "cluster-b"]
    assert saved["govuk_definition_memory"]["manifest_fingerprint"] == _fp("govuk")


def test_dependency_snapshot_calls_only_valid_new_receipts_exact(tmp_path):
    receipt = build_resolved_input_receipt(
        stage="analysis", extracted_text="text", system_input="system", user_input="user",
        resolved_model="model", model_parameters={}, lexicon_fingerprint=_fp("lexicon"),
        provisional_memory_fingerprint=_analysis_unused_memory_fp(), tag_registry_fingerprint=_fp("unused-tags"),
        policy_fingerprint=_fp("policy"),
    )
    (tmp_path / "analysis.json").write_text("{}", encoding="utf-8")
    (tmp_path / "analysis_audit.json").write_text(json.dumps({
        "input_receipt": receipt,
        "lexicon_fingerprint": receipt["dependencies"]["lexicon_fingerprint"],
        "tag_registry_fingerprint": receipt["dependencies"]["tag_registry_fingerprint"],
        "policy_fingerprint": receipt["dependencies"]["policy_fingerprint"],
    }), encoding="utf-8")
    stage = {"status": "complete", "dependencies": [], "evidence": ["analysis.json"]}
    assert _stage_snapshot(tmp_path, "analysis", stage)["provenance_coverage"] == "exact"

    (tmp_path / "analysis_audit.json").write_text(json.dumps({"model": "legacy-model"}), encoding="utf-8")
    assert _stage_snapshot(tmp_path, "analysis", stage)["provenance_coverage"] == "partial"


def test_dependency_snapshot_never_trusts_exact_boolean_or_recomputed_self_assertion(tmp_path):
    receipt = build_resolved_input_receipt(
        stage="analysis", extracted_text="text", system_input="system", user_input="user",
        resolved_model="model", model_parameters={}, lexicon_fingerprint=_fp("lexicon"),
        provisional_memory_fingerprint=_analysis_unused_memory_fp(), tag_registry_fingerprint=_fp("tags"),
        policy_fingerprint=_fp("policy"),
    )
    # A producer can recompute its own internal request hash, but it cannot
    # rewrite the separately recorded top-level dependency identity.
    receipt["dependencies"]["policy_fingerprint"] = _fp("forged")
    receipt["request_sha256"] = canonical_fingerprint({
        key: value for key, value in receipt.items() if key != "request_sha256"
    })
    (tmp_path / "analysis.json").write_text("{}", encoding="utf-8")
    (tmp_path / "analysis_audit.json").write_text(json.dumps({
        "input_receipt": receipt,
        "lexicon_fingerprint": _fp("lexicon"),
        "tag_registry_fingerprint": _fp("tags"),
        "policy_fingerprint": _fp("policy"),
    }), encoding="utf-8")
    stage = {"status": "complete", "dependencies": [], "evidence": ["analysis.json"]}
    snapshot = _stage_snapshot(tmp_path, "analysis", stage)
    assert snapshot["provenance_coverage"] == "partial"
    assert snapshot["input_receipt_validation"]["valid"] is False


def test_aggregate_receipt_requires_complete_strictly_valid_ordered_chunks():
    deps = {
        "lexicon_fingerprint": _fp("lexicon"),
        "provisional_memory_fingerprint": _fp("memory"),
        "tag_registry_fingerprint": _fp("tags"),
        "policy_fingerprint": _fp("policy"),
    }
    def child(text):
        return build_resolved_input_receipt(
            stage="enrichment", extracted_text=text, system_input="system", user_input=text,
            resolved_model="route", model_parameters={},
            lexicon_fingerprint=deps["lexicon_fingerprint"],
            provisional_memory_fingerprint=deps["provisional_memory_fingerprint"],
            tag_registry_fingerprint=deps["tag_registry_fingerprint"],
            policy_fingerprint=deps["policy_fingerprint"],
        )

    chunks = [
        {"index": 1, "succeeded": True, "input_receipt": child("one")},
        {"index": 2, "succeeded": True, "input_receipt": child("two")},
    ]
    aggregate = build_aggregate_input_receipt("one\ntwo", chunks)
    assert aggregate["exact"] is True
    validated = validate_aggregate_input_receipt(
        aggregate, expected_stage="enrichment", top_level_dependencies=deps,
        chunk_entries=chunks,
    )
    assert validated["valid"] is True
    assert validated["chunk_count"] == 2

    partial_chunks = [chunks[0], {"index": 2, "succeeded": False, "error": "failed"}]
    partial = build_aggregate_input_receipt("one\ntwo", partial_chunks)
    assert partial["coverage"] == "partial"
    assert partial["exact"] is False
    with pytest.raises(ValueError, match="not complete and exact"):
        validate_aggregate_input_receipt(
            partial, expected_stage="enrichment", top_level_dependencies=deps,
            chunk_entries=partial_chunks,
        )

    reordered = [chunks[1], chunks[0]]
    with pytest.raises(ValueError, match="contributing requests"):
        validate_aggregate_input_receipt(
            aggregate, expected_stage="enrichment", top_level_dependencies=deps,
            chunk_entries=reordered,
        )


def test_dependency_snapshot_validates_aggregate_against_persisted_chunks(tmp_path):
    deps = {
        "lexicon_fingerprint": _fp("lexicon"),
        "provisional_memory_fingerprint": _fp("memory"),
        "tag_registry_fingerprint": _fp("tags"),
        "policy_fingerprint": _fp("policy"),
    }
    child = build_resolved_input_receipt(
        stage="enrichment", extracted_text="chunk", system_input="system", user_input="chunk",
        resolved_model="route", model_parameters={},
        lexicon_fingerprint=deps["lexicon_fingerprint"],
        provisional_memory_fingerprint=deps["provisional_memory_fingerprint"],
        tag_registry_fingerprint=deps["tag_registry_fingerprint"],
        policy_fingerprint=deps["policy_fingerprint"],
    )
    chunks = [{"index": 1, "succeeded": True, "input_receipt": child}]
    aggregate = build_aggregate_input_receipt("chunk", chunks)
    (tmp_path / "enrichment.json").write_text("{}", encoding="utf-8")
    audit = {
        "input_receipt": aggregate,
        "chunked": True,
        "chunks": chunks,
        **deps,
    }
    (tmp_path / "enrichment_audit.json").write_text(json.dumps(audit), encoding="utf-8")
    stage = {"status": "complete", "dependencies": [], "evidence": ["enrichment.json"]}
    snapshot = _stage_snapshot(tmp_path, "enrichment", stage)
    assert snapshot["provenance_coverage"] == "exact"
    assert snapshot["input_receipt_validation"]["schema_version"] == "resolved-model-input-aggregate-v1"

    audit["chunks"][0]["input_receipt"]["request_sha256"] = "0" * 64
    (tmp_path / "enrichment_audit.json").write_text(json.dumps(audit), encoding="utf-8")
    snapshot = _stage_snapshot(tmp_path, "enrichment", stage)
    assert snapshot["provenance_coverage"] == "partial"
    assert snapshot["input_receipt_validation"]["valid"] is False


def test_streamlit_receipt_rows_distinguish_exact_from_historical():
    snapshot = {"items": [{
        "doc_id": "doc-1",
        "stage_snapshots": {
            "analysis": {
                "provenance_coverage": "exact",
                "input_receipt_validation": {"valid": True, "request_sha256": "a" * 64, "model_route": "m", "model_identity_scope": "routing_alias"},
                "recorded_provenance": {"input_receipt": {"exact": True, "resolved_model": "m", "extracted_text_sha256": "b" * 64}},
            },
            "enrichment": {
                "provenance_coverage": "partial",
                "input_receipt_validation": {"valid": False},
                "recorded_provenance": {"input_receipt": {"exact": True, "resolved_model": "forged"}},
            },
        },
    }]}
    rows = receipt_table_rows(snapshot)
    assert rows[0]["Validated complete inputs"] == "yes"
    assert rows[0]["Model identity scope"] == "routing_alias"
    assert rows[1]["Validated complete inputs"] == "no — historical/partial/untrusted"
    assert rows[1]["Request fingerprint"] == "— (unvalidated)"
