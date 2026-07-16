"""Exact, content-free receipts for model inputs produced by new runs.

Receipts store hashes, sizes, resolved model settings, and dependency identities;
they never store raw document text, prompts, testimony, or model responses.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any


SCHEMA_VERSION = "resolved-model-input-v1"
AGGREGATE_SCHEMA_VERSION = "resolved-model-input-aggregate-v1"
_STAGES = {"analysis", "enrichment"}
_DEPENDENCY_FIELDS = (
    "lexicon_fingerprint",
    "provisional_memory_fingerprint",
    "tag_registry_fingerprint",
    "policy_fingerprint",
)
_RECEIPT_FIELDS = {
    "schema_version", "stage", "extracted_text_sha256", "extracted_text_chars",
    "system_input_sha256", "system_input_chars", "user_input_sha256",
    "user_input_chars", "resolved_model", "routing_model_alias",
    "provider_resolved_model", "model_identity_scope", "model_parameters",
    "model_parameters_sha256", "dependencies", "exact", "request_sha256",
}
_AGGREGATE_FIELDS = {
    "schema_version", "stage", "extracted_text_sha256", "extracted_text_chars",
    "chunk_count", "successful_chunk_count", "failed_chunk_count",
    "contributing_request_sha256", "dependencies", "coverage", "exact",
    "request_sha256",
}


def canonical_fingerprint(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def build_resolved_input_receipt(
    *,
    stage: str,
    extracted_text: str,
    system_input: str,
    user_input: str,
    resolved_model: str,
    model_parameters: dict,
    lexicon_fingerprint: str,
    provisional_memory_fingerprint: str = "",
    tag_registry_fingerprint: str = "",
    policy_fingerprint: str = "",
    provider_resolved_model: str = "",
) -> dict[str, Any]:
    dependencies = {
        "lexicon_fingerprint": lexicon_fingerprint,
        "provisional_memory_fingerprint": provisional_memory_fingerprint,
        "tag_registry_fingerprint": tag_registry_fingerprint,
        "policy_fingerprint": policy_fingerprint,
    }
    params = dict(model_parameters or {})
    route = str(resolved_model or "").strip()
    provider_model = str(provider_resolved_model or "").strip()
    core = {
        "schema_version": SCHEMA_VERSION,
        "stage": stage,
        "extracted_text_sha256": hashlib.sha256(extracted_text.encode("utf-8")).hexdigest(),
        "extracted_text_chars": len(extracted_text),
        "system_input_sha256": hashlib.sha256(system_input.encode("utf-8")).hexdigest(),
        "system_input_chars": len(system_input),
        "user_input_sha256": hashlib.sha256(user_input.encode("utf-8")).hexdigest(),
        "user_input_chars": len(user_input),
        # ``resolved_model`` remains the route value for compatibility.  It is
        # not a claim that the provider exposed an immutable weights identity.
        "resolved_model": route,
        "routing_model_alias": route,
        "provider_resolved_model": provider_model,
        "model_identity_scope": "provider_resolved" if provider_model else "routing_alias",
        "model_parameters": params,
        "model_parameters_sha256": canonical_fingerprint(params),
        "dependencies": dependencies,
    }
    required_hashes = (
        core["extracted_text_sha256"], core["system_input_sha256"], core["user_input_sha256"],
        core["model_parameters_sha256"], dependencies["lexicon_fingerprint"],
        dependencies["provisional_memory_fingerprint"], dependencies["tag_registry_fingerprint"],
        dependencies["policy_fingerprint"],
    )
    core["exact"] = bool(
        stage in _STAGES
        and core["resolved_model"]
        and all(_is_sha256(value) for value in required_hashes)
    )
    core["request_sha256"] = canonical_fingerprint(core)
    return core


def validate_resolved_input_receipt(
    receipt: dict[str, Any],
    *,
    expected_stage: str | None = None,
    top_level_dependencies: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Strictly validate a single-call receipt and recompute every derived hash.

    The stored ``exact`` boolean is never accepted as evidence by itself.  A
    caller may describe coverage as exact only after this function returns.
    """
    _require_object(receipt, "Resolved input receipt")
    _require_exact_fields(receipt, _RECEIPT_FIELDS, "Resolved input receipt")
    if receipt.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported resolved input receipt schema")
    stage = _validate_stage(receipt.get("stage"), expected_stage)
    for field in ("extracted_text_sha256", "system_input_sha256", "user_input_sha256"):
        _require_sha256(receipt.get(field), field)
    for field in ("extracted_text_chars", "system_input_chars", "user_input_chars"):
        _require_nonnegative_int(receipt.get(field), field)

    route = receipt.get("resolved_model")
    alias = receipt.get("routing_model_alias")
    provider = receipt.get("provider_resolved_model")
    scope = receipt.get("model_identity_scope")
    if not isinstance(route, str) or not route.strip() or route != route.strip():
        raise ValueError("Resolved input receipt model route is missing or malformed")
    if alias != route:
        raise ValueError("Resolved input receipt routing alias differs from resolved_model")
    if not isinstance(provider, str) or provider != provider.strip():
        raise ValueError("Resolved input receipt provider model identity is malformed")
    derived_scope = "provider_resolved" if provider else "routing_alias"
    if scope != derived_scope:
        raise ValueError("Resolved input receipt model identity scope is inconsistent")

    params = receipt.get("model_parameters")
    if not isinstance(params, dict):
        raise ValueError("Resolved input receipt model parameters must be an object")
    expected_params_hash = canonical_fingerprint(params)
    if receipt.get("model_parameters_sha256") != expected_params_hash:
        raise ValueError("Resolved input receipt model-parameter fingerprint does not match")
    dependencies = _validate_dependencies(
        receipt.get("dependencies"), top_level_dependencies=top_level_dependencies
    )
    if receipt.get("exact") is not True:
        raise ValueError("Resolved input receipt does not claim complete producer coverage")
    expected_request = canonical_fingerprint({
        key: receipt[key] for key in _RECEIPT_FIELDS if key != "request_sha256"
    })
    if receipt.get("request_sha256") != expected_request:
        raise ValueError("Resolved input receipt request fingerprint does not match")
    return {
        "valid": True,
        "exact": True,
        "schema_version": SCHEMA_VERSION,
        "stage": stage,
        "request_sha256": expected_request,
        "model_route": route,
        "provider_resolved_model": provider,
        "model_identity_scope": derived_scope,
        "dependencies": dependencies,
    }


def build_aggregate_input_receipt(
    extracted_text: str,
    chunk_entries: list[dict[str, Any]],
    *,
    stage: str = "enrichment",
) -> dict[str, Any]:
    """Build a full-document receipt from ordered chunk execution entries."""
    _validate_stage(stage, stage)
    if not isinstance(chunk_entries, list):
        raise ValueError("Aggregate input receipt chunk entries must be a list")
    successful = [row for row in chunk_entries if isinstance(row, dict) and row.get("succeeded") is True]
    failed_count = len(chunk_entries) - len(successful)
    contributing = [
        str((row.get("input_receipt") or {}).get("request_sha256") or "")
        for row in successful
    ]
    dependency_rows = [
        (row.get("input_receipt") or {}).get("dependencies")
        for row in successful if isinstance(row.get("input_receipt"), dict)
    ]
    dependencies = dict(dependency_rows[0]) if dependency_rows and isinstance(dependency_rows[0], dict) else {
        key: "" for key in _DEPENDENCY_FIELDS
    }
    coverage = "complete" if chunk_entries and failed_count == 0 else "partial"
    children_valid = bool(successful) and len(successful) == len(chunk_entries)
    if children_valid:
        try:
            for row in successful:
                validate_resolved_input_receipt(
                    row.get("input_receipt"), expected_stage=stage,
                    top_level_dependencies=dependencies,
                )
        except (TypeError, ValueError):
            children_valid = False
    exact = bool(coverage == "complete" and children_valid)
    core = {
        "schema_version": AGGREGATE_SCHEMA_VERSION,
        "stage": stage,
        "extracted_text_sha256": hashlib.sha256(str(extracted_text or "").encode("utf-8")).hexdigest(),
        "extracted_text_chars": len(str(extracted_text or "")),
        "chunk_count": len(chunk_entries),
        "successful_chunk_count": len(successful),
        "failed_chunk_count": failed_count,
        "contributing_request_sha256": contributing,
        "dependencies": dependencies,
        "coverage": coverage,
        "exact": exact,
    }
    return {**core, "request_sha256": canonical_fingerprint(core)}


def validate_aggregate_input_receipt(
    receipt: dict[str, Any],
    *,
    expected_stage: str | None = None,
    top_level_dependencies: dict[str, Any] | None = None,
    chunk_entries: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Strictly validate an aggregate against its ordered contributing chunks."""
    _require_object(receipt, "Aggregate input receipt")
    _require_exact_fields(receipt, _AGGREGATE_FIELDS, "Aggregate input receipt")
    if receipt.get("schema_version") != AGGREGATE_SCHEMA_VERSION:
        raise ValueError("Unsupported aggregate input receipt schema")
    stage = _validate_stage(receipt.get("stage"), expected_stage)
    _require_sha256(receipt.get("extracted_text_sha256"), "extracted_text_sha256")
    _require_nonnegative_int(receipt.get("extracted_text_chars"), "extracted_text_chars")
    for field in ("chunk_count", "successful_chunk_count", "failed_chunk_count"):
        _require_nonnegative_int(receipt.get(field), field)
    if receipt["successful_chunk_count"] + receipt["failed_chunk_count"] != receipt["chunk_count"]:
        raise ValueError("Aggregate input receipt chunk counts are inconsistent")
    expected_coverage = "complete" if receipt["chunk_count"] > 0 and receipt["failed_chunk_count"] == 0 else "partial"
    if receipt.get("coverage") != expected_coverage:
        raise ValueError("Aggregate input receipt coverage is inconsistent with chunk counts")
    dependencies = _validate_dependencies(
        receipt.get("dependencies"), top_level_dependencies=top_level_dependencies
    )
    if not isinstance(chunk_entries, list) or len(chunk_entries) != receipt["chunk_count"]:
        raise ValueError("Aggregate input receipt requires every ordered chunk entry")
    successful = [row for row in chunk_entries if isinstance(row, dict) and row.get("succeeded") is True]
    if len(successful) != receipt["successful_chunk_count"]:
        raise ValueError("Aggregate input receipt successful-chunk count differs from evidence")
    expected_requests: list[str] = []
    for row in successful:
        child = row.get("input_receipt")
        child_validation = validate_resolved_input_receipt(
            child, expected_stage=stage, top_level_dependencies=dependencies,
        )
        expected_requests.append(child_validation["request_sha256"])
    if receipt.get("contributing_request_sha256") != expected_requests:
        raise ValueError("Aggregate input receipt contributing requests differ from chunk evidence")
    if receipt.get("exact") is not True or expected_coverage != "complete":
        raise ValueError("Aggregate input receipt is not complete and exact")
    expected_request = canonical_fingerprint({
        key: receipt[key] for key in _AGGREGATE_FIELDS if key != "request_sha256"
    })
    if receipt.get("request_sha256") != expected_request:
        raise ValueError("Aggregate input receipt request fingerprint does not match")
    return {
        "valid": True,
        "exact": True,
        "schema_version": AGGREGATE_SCHEMA_VERSION,
        "stage": stage,
        "request_sha256": expected_request,
        "model_route": "aggregate of validated chunks",
        "provider_resolved_model": "",
        "model_identity_scope": "chunk_aggregate",
        "dependencies": dependencies,
        "chunk_count": receipt["chunk_count"],
    }


def validate_input_receipt(
    receipt: dict[str, Any],
    *,
    expected_stage: str | None = None,
    top_level_dependencies: dict[str, Any] | None = None,
    chunk_entries: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Dispatch strict validation for supported producer receipt schemas."""
    if not isinstance(receipt, dict):
        raise ValueError("Input receipt must be an object")
    if receipt.get("schema_version") == SCHEMA_VERSION:
        return validate_resolved_input_receipt(
            receipt, expected_stage=expected_stage,
            top_level_dependencies=top_level_dependencies,
        )
    if receipt.get("schema_version") == AGGREGATE_SCHEMA_VERSION:
        return validate_aggregate_input_receipt(
            receipt, expected_stage=expected_stage,
            top_level_dependencies=top_level_dependencies,
            chunk_entries=chunk_entries,
        )
    raise ValueError("Unsupported input receipt schema")


def _validate_stage(value: Any, expected_stage: str | None) -> str:
    if value not in _STAGES:
        raise ValueError("Input receipt stage is unsupported")
    if expected_stage is not None and value != expected_stage:
        raise ValueError("Input receipt stage differs from the artifact stage")
    return str(value)


def _validate_dependencies(
    value: Any, *, top_level_dependencies: dict[str, Any] | None,
) -> dict[str, str]:
    _require_object(value, "Input receipt dependencies")
    _require_exact_fields(value, set(_DEPENDENCY_FIELDS), "Input receipt dependencies")
    dependencies = {key: str(value[key]) for key in _DEPENDENCY_FIELDS}
    for key, fingerprint in dependencies.items():
        _require_sha256(fingerprint, key)
    if top_level_dependencies is not None:
        _require_object(top_level_dependencies, "Top-level input dependencies")
        expected = {key: str(top_level_dependencies.get(key) or "") for key in _DEPENDENCY_FIELDS}
        if dependencies != expected:
            raise ValueError("Input receipt dependencies differ from top-level audit provenance")
    return dependencies


def _require_exact_fields(value: dict[str, Any], expected: set[str], label: str) -> None:
    if set(value) != expected:
        raise ValueError(f"{label} fields do not match its schema")


def _require_object(value: Any, label: str) -> None:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")


def _require_sha256(value: Any, label: str) -> None:
    if not isinstance(value, str) or not _is_sha256(value) or value != value.lower():
        raise ValueError(f"Input receipt {label} is not a canonical SHA-256 fingerprint")


def _require_nonnegative_int(value: Any, label: str) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"Input receipt {label} must be a non-negative integer")


def _is_sha256(value: Any) -> bool:
    text = str(value or "")
    return len(text) == 64 and all(ch in "0123456789abcdef" for ch in text.lower())
