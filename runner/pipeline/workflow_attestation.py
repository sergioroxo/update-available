"""Non-authorizing per-batch attestation for operational workflow planning.

The five-route mixed rehearsal is a system commissioning gate.  This artifact
validates the routes actually present in one ordinary or mixed workflow, so
normal batches are not forced to contain media, testimony, legal, and longform
examples merely to be planned.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .specialist_dispatch import (
    build_dispatch_plan,
    dispatch_stable_projection,
    validate_dispatch_plan,
)
from .workflow_batch import validate_workflow_manifest
from .workflow_integrity import (
    canonical_fingerprint,
    require_bound_fingerprint,
    safe_workflow_batch_id,
    valid_fingerprint,
    write_immutable_snapshot,
    write_latest_projection,
)


SCHEMA_VERSION = "workflow-planning-attestation-v1.0"
FIELDS = {
    "schema_version", "workflow_batch_id", "workflow_fingerprint", "dispatch_fingerprint",
    "observed_routes", "items", "summary", "planning_valid", "execution_readiness",
    "execution_authorized", "remote_writes", "safety_statement", "generated_at",
    "evidence_fingerprint",
}
ITEM_FIELDS = {"queue_item_id", "doc_id", "base_route", "base_status", "specialists", "next_action"}
SPECIALIST_FIELDS = {"route", "status"}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _stable(attestation: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value for key, value in attestation.items()
        if key not in {"generated_at", "evidence_fingerprint"}
    }


def _items(dispatch: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "queue_item_id": row["queue_item_id"],
            "doc_id": row["doc_id"],
            "base_route": row["base_route"],
            "base_status": row["base_status"],
            "specialists": [
                {"route": value["route"], "status": value["status"]}
                for value in row.get("specialists") or []
            ],
            "next_action": row["next_action"],
        }
        for row in dispatch["items"]
    ]


def _summary(items: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "items": len(items),
        "specialist_routes": sum(len(row["specialists"]) for row in items),
        "technical_holds": sum(row["base_route"] == "technical_hold" for row in items),
        "deferred": sum(row["base_route"] == "deferred" for row in items),
        "human_required": sum(
            value["status"] == "human_required"
            for row in items for value in row["specialists"]
        ),
    }


def build_workflow_attestation(
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    corpus_dir: Path,
) -> dict[str, Any]:
    validate_workflow_manifest(workflow)
    validate_dispatch_plan(dispatch, workflow, corpus_dir=Path(corpus_dir))
    rebuilt = build_dispatch_plan(workflow, Path(corpus_dir))
    if dispatch_stable_projection(rebuilt) != dispatch_stable_projection(dispatch):
        raise ValueError("Dispatch no longer matches current corpus state")
    items = _items(dispatch)
    observed_routes = sorted({
        *[str(row["base_route"]) for row in items],
        *[
            str(value["route"])
            for row in items for value in row["specialists"]
        ],
    })
    stable = {
        "schema_version": SCHEMA_VERSION,
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
        "observed_routes": observed_routes,
        "items": items,
        "summary": _summary(items),
        "planning_valid": True,
        "execution_readiness": "not_assessed",
        "execution_authorized": False,
        "remote_writes": False,
        "safety_statement": (
            "This attests current per-batch planning evidence only. It cannot authorize commands, "
            "model calls, corpus import, upload, or publication."
        ),
    }
    attestation = {
        **stable,
        "generated_at": _now(),
        "evidence_fingerprint": canonical_fingerprint(stable),
    }
    validate_workflow_attestation(attestation)
    return attestation


def validate_workflow_attestation(attestation: dict[str, Any]) -> None:
    if not isinstance(attestation, dict) or set(attestation) != FIELDS:
        raise ValueError("Workflow attestation fields do not match its schema")
    if attestation.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported workflow attestation schema")
    safe_workflow_batch_id(attestation.get("workflow_batch_id"))
    for field in ("workflow_fingerprint", "dispatch_fingerprint"):
        if not valid_fingerprint(attestation.get(field)):
            raise ValueError(f"Workflow attestation {field} is malformed")
    if (
        attestation.get("planning_valid") is not True
        or attestation.get("execution_readiness") != "not_assessed"
        or attestation.get("execution_authorized") is not False
        or attestation.get("remote_writes") is not False
    ):
        raise ValueError("Workflow attestation must remain valid, non-authorizing, and local-only")
    routes = attestation.get("observed_routes")
    if (
        not isinstance(routes, list)
        or routes != sorted(routes)
        or len(set(routes)) != len(routes)
        or not all(type(value) is str and value for value in routes)
    ):
        raise ValueError("Workflow attestation routes must be normalized")
    items = attestation.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= 15 or not all(isinstance(row, dict) for row in items):
        raise ValueError("Workflow attestation items must be a bounded list")
    for row in items:
        if set(row) != ITEM_FIELDS:
            raise ValueError("Workflow attestation item fields do not match its schema")
        if not all(type(row.get(field)) is str for field in ("queue_item_id", "doc_id", "base_route", "base_status", "next_action")):
            raise ValueError("Workflow attestation item values must be text")
        if not row["queue_item_id"] or not row["base_route"] or not row["base_status"] or not row["next_action"]:
            raise ValueError("Workflow attestation item identity and routing values are required")
        specialists = row.get("specialists")
        if not isinstance(specialists, list):
            raise ValueError("Workflow attestation specialists must be a list")
        for value in specialists:
            if (
                not isinstance(value, dict)
                or set(value) != SPECIALIST_FIELDS
                or type(value.get("route")) is not str
                or not value["route"]
                or type(value.get("status")) is not str
                or not value["status"]
            ):
                raise ValueError("Workflow attestation specialist evidence is malformed")
    ids = [row.get("queue_item_id") for row in items]
    if not all(type(value) is str and value for value in ids) or len(set(ids)) != len(ids):
        raise ValueError("Workflow attestation queue IDs must be unique text values")
    expected_routes = sorted({
        *[str(row.get("base_route") or "") for row in items],
        *[
            str(value.get("route") or "")
            for row in items for value in row.get("specialists") or []
            if isinstance(value, dict)
        ],
    })
    if routes != expected_routes:
        raise ValueError("Workflow attestation routes do not match its items")
    expected_summary = _summary(items)
    summary = attestation.get("summary")
    if (
        not isinstance(summary, dict)
        or set(summary) != set(expected_summary)
        or any(type(value) is not int for value in summary.values())
        or summary != expected_summary
    ):
        raise ValueError("Workflow attestation summary does not match its items")
    if not isinstance(attestation.get("generated_at"), str) or not attestation["generated_at"].strip():
        raise ValueError("Workflow attestation generation time is required")
    if not isinstance(attestation.get("safety_statement"), str) or not attestation["safety_statement"].strip():
        raise ValueError("Workflow attestation safety statement is required")
    require_bound_fingerprint(attestation, _stable, label="Workflow attestation")


def validate_attestation_against_bundle(
    attestation: dict[str, Any],
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    corpus_dir: Path,
) -> None:
    validate_workflow_attestation(attestation)
    regenerated = build_workflow_attestation(workflow, dispatch, Path(corpus_dir))
    if _stable(regenerated) != _stable(attestation):
        raise ValueError("Workflow attestation does not match its current workflow bundle")


def write_workflow_attestation(
    attestation: dict[str, Any],
    out_root: Path,
    *,
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    corpus_dir: Path,
) -> Path:
    validate_attestation_against_bundle(attestation, workflow, dispatch, Path(corpus_dir))
    batch_id = safe_workflow_batch_id(attestation["workflow_batch_id"])
    fingerprint = str(attestation["evidence_fingerprint"])
    path = Path(out_root) / batch_id / "attestations" / f"{batch_id}--{fingerprint[:12]}.json"
    stored = write_immutable_snapshot(path, attestation, label="workflow planning attestation")
    validate_attestation_against_bundle(stored, workflow, dispatch, Path(corpus_dir))
    write_latest_projection(Path(out_root) / batch_id / "latest_workflow_attestation.json", stored)
    return path
