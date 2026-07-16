"""Evidence that a workflow plan covers ordinary and specialist routes."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .specialist_dispatch import dispatch_stable_projection, validate_dispatch_plan
from .workflow_batch import validate_workflow_manifest, workflow_stable_projection
from .workflow_integrity import (
    canonical_fingerprint,
    require_bound_fingerprint,
    safe_workflow_batch_id,
    valid_fingerprint,
    write_immutable_snapshot,
    write_latest_projection,
)


SCHEMA_VERSION = "mixed-workflow-rehearsal-v1.0"
DEFAULT_REQUIRED_ROUTES = ("ordinary", "media", "testimony", "legal", "longform")
REPORT_TOP_LEVEL_FIELDS = {
    "schema_version", "workflow_batch_id", "workflow_fingerprint", "dispatch_fingerprint",
    "required_routes", "route_items", "route_statuses", "technical_holds",
    "human_required", "errors", "routing_coverage_passed", "execution_readiness",
    "execution_authorized", "safety_statement", "generated_at", "evidence_fingerprint",
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _fingerprint(payload: Any) -> str:
    return canonical_fingerprint(payload)


def _valid_fingerprint(value: Any) -> bool:
    return valid_fingerprint(value)


def _workflow_stable(workflow: dict) -> dict:
    return workflow_stable_projection(workflow)


def _dispatch_stable(dispatch: dict) -> dict:
    return dispatch_stable_projection(dispatch)


def _safe_batch_id(value: Any) -> str:
    return safe_workflow_batch_id(value)


def _report_stable(report: dict) -> dict:
    return {
        key: value for key, value in report.items()
        if key not in {"generated_at", "evidence_fingerprint"}
    }


def validate_mixed_rehearsal_report(report: dict[str, Any]) -> None:
    """Enforce that an integrity-valid rehearsal still cannot authorize work."""
    if not isinstance(report, dict):
        raise ValueError("Mixed rehearsal report must be an object")
    if set(report) != REPORT_TOP_LEVEL_FIELDS:
        raise ValueError("Mixed rehearsal report fields do not match the report schema")
    if report.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported mixed rehearsal schema")
    _safe_batch_id(report.get("workflow_batch_id"))
    if not _valid_fingerprint(report.get("workflow_fingerprint")):
        raise ValueError("Mixed rehearsal workflow fingerprint is malformed")
    if not _valid_fingerprint(report.get("dispatch_fingerprint")):
        raise ValueError("Mixed rehearsal dispatch fingerprint is malformed")
    required_routes = report.get("required_routes")
    if (
        not isinstance(required_routes, list)
        or not required_routes
        or not all(type(route) is str and route for route in required_routes)
        or len(set(required_routes)) != len(required_routes)
    ):
        raise ValueError("Mixed rehearsal required routes must be unique non-empty text values")
    if not set(DEFAULT_REQUIRED_ROUTES).issubset(required_routes):
        raise ValueError("Mixed rehearsal must retain all default required routes")
    if not isinstance(report.get("route_items"), dict) or not isinstance(report.get("route_statuses"), dict):
        raise ValueError("Mixed rehearsal route evidence must be objects")
    if not set(required_routes).issubset(report["route_items"]):
        raise ValueError("Mixed rehearsal route_items do not cover required route keys")
    if not set(required_routes).issubset(report["route_statuses"]):
        raise ValueError("Mixed rehearsal route_statuses do not cover required route keys")
    for route in required_routes:
        route_ids = report["route_items"].get(route)
        statuses = report["route_statuses"].get(route)
        if not isinstance(route_ids, list) or not all(
            type(value) is str and value and value == value.strip() for value in route_ids
        ):
            raise ValueError(f"Mixed rehearsal route_items[{route}] must contain queue IDs")
        if len(set(route_ids)) != len(route_ids):
            raise ValueError(f"Mixed rehearsal route_items[{route}] contains duplicate queue IDs")
        if not isinstance(statuses, list) or not all(isinstance(value, dict) for value in statuses):
            raise ValueError(f"Mixed rehearsal route_statuses[{route}] must contain status objects")
        status_ids = [value.get("queue_item_id") for value in statuses]
        if status_ids != route_ids:
            raise ValueError(f"Mixed rehearsal route status identities differ for {route}")
        if not all(type(value.get("status")) is str and value.get("status") for value in statuses):
            raise ValueError(f"Mixed rehearsal route statuses are incomplete for {route}")
    errors = report.get("errors")
    if not isinstance(errors, list) or not all(isinstance(value, str) for value in errors):
        raise ValueError("Mixed rehearsal errors must be a list of text values")
    if type(report.get("routing_coverage_passed")) is not bool:
        raise ValueError("Mixed rehearsal coverage result must be boolean")
    if report.get("routing_coverage_passed") is not (not errors):
        raise ValueError("Mixed rehearsal coverage result does not match its errors")
    if report.get("routing_coverage_passed") is True and any(
        not report["route_items"].get(route) or not report["route_statuses"].get(route)
        for route in required_routes
    ):
        raise ValueError("Mixed rehearsal passed coverage requires non-empty evidence for every route")
    if report.get("execution_readiness") != "not_assessed":
        raise ValueError("Mixed rehearsal cannot assess execution readiness")
    if report.get("execution_authorized") is not False:
        raise ValueError("Mixed rehearsal cannot authorize execution")
    if not isinstance(report.get("safety_statement"), str) or not report["safety_statement"].strip():
        raise ValueError("Mixed rehearsal safety statement is required")
    require_bound_fingerprint(report, _report_stable, label="Mixed rehearsal")


def verify_mixed_rehearsal(
    workflow: dict,
    dispatch: dict,
    *,
    required_routes: tuple[str, ...] = DEFAULT_REQUIRED_ROUTES,
    corpus_dir: Path | None = None,
) -> dict[str, Any]:
    validate_workflow_manifest(workflow)
    validate_dispatch_plan(dispatch, workflow, corpus_dir=corpus_dir)
    workflow_fingerprint = workflow.get("evidence_fingerprint")
    dispatch_fingerprint = dispatch.get("evidence_fingerprint")

    items = workflow.get("items") or []
    dispatch_items = dispatch.get("items") or []
    workflow_ids = [str(row.get("queue_item_id") or "") for row in items]
    dispatch_ids = [str(row.get("queue_item_id") or "") for row in dispatch_items]
    errors: list[str] = []
    if workflow.get("dry_run") is not True or dispatch.get("dry_run") is not True:
        errors.append("workflow and dispatch must both be dry-run artifacts")
    if dispatch.get("remote_writes") is not False:
        errors.append("dispatcher remote_writes must be false")
    if len(items) > 15:
        errors.append("workflow exceeds the maximum of 15 sources")
    if not all(workflow_ids) or len(set(workflow_ids)) != len(workflow_ids):
        errors.append("workflow queue IDs must be unique and non-empty")
    if workflow_ids != dispatch_ids:
        errors.append("dispatcher item order/identity differs from workflow")

    route_items: dict[str, list[str]] = {route: [] for route in required_routes}
    route_statuses: dict[str, list[dict[str, str]]] = {route: [] for route in required_routes}
    for workflow_item, dispatch_item in zip(items, dispatch_items):
        item_id = str(workflow_item.get("queue_item_id") or "")
        if workflow_item.get("base_route") == "ordinary":
            route_items.setdefault("ordinary", []).append(item_id)
            route_statuses.setdefault("ordinary", []).append({
                "queue_item_id": item_id,
                "status": str(dispatch_item.get("base_status") or ""),
            })
        plans = {
            str(plan.get("route") or ""): plan
            for plan in dispatch_item.get("specialists") or [] if isinstance(plan, dict)
        }
        for route in workflow_item.get("specialist_routes") or []:
            route = str(route)
            route_items.setdefault(route, []).append(item_id)
            plan = plans.get(route) or {}
            route_statuses.setdefault(route, []).append({
                "queue_item_id": item_id,
                "status": str(plan.get("status") or "missing_dispatch_plan"),
                "next_action": str(dispatch_item.get("next_action") or ""),
            })
            if not plan:
                errors.append(f"{item_id}: specialist route {route} lacks a dispatch plan")

    missing_routes = [route for route in required_routes if not route_items.get(route)]
    if missing_routes:
        errors.append("required route coverage missing: " + ", ".join(missing_routes))
    technical_holds = [
        str(row.get("queue_item_id") or "") for row in items
        if row.get("base_route") == "technical_hold"
    ]
    human_required = [
        status["queue_item_id"]
        for values in route_statuses.values() for status in values
        if status.get("status") == "human_required"
    ]
    stable = {
        "schema_version": SCHEMA_VERSION,
        "workflow_batch_id": workflow.get("workflow_batch_id"),
        "workflow_fingerprint": workflow.get("evidence_fingerprint"),
        "dispatch_fingerprint": dispatch.get("evidence_fingerprint"),
        "required_routes": list(required_routes),
        "route_items": route_items,
        "route_statuses": route_statuses,
        "technical_holds": technical_holds,
        "human_required": sorted(set(human_required)),
        "errors": errors,
        "routing_coverage_passed": not errors,
        "execution_readiness": "not_assessed",
        "execution_authorized": False,
        "safety_statement": (
            "This verifies bounded dry-run route coverage only. It does not authorize model calls, "
            "commands, uploads, publication, or treating held/human states as complete."
        ),
    }
    report = {**stable, "generated_at": _now(), "evidence_fingerprint": _fingerprint(stable)}
    validate_mixed_rehearsal_report(report)
    return report


def write_mixed_rehearsal(
    report: dict,
    out_root: Path,
    *,
    workflow: dict,
    dispatch: dict,
    corpus_dir: Path | None = None,
) -> Path:
    validate_mixed_rehearsal_report(report)
    regenerated = verify_mixed_rehearsal(
        workflow,
        dispatch,
        required_routes=tuple(report["required_routes"]),
        corpus_dir=corpus_dir,
    )
    if _report_stable(regenerated) != _report_stable(report):
        raise ValueError("Mixed rehearsal report does not match its workflow and dispatch evidence")
    batch_id = _safe_batch_id(report.get("workflow_batch_id"))
    fingerprint = str(report["evidence_fingerprint"])
    path = Path(out_root) / batch_id / "rehearsals" / f"{batch_id}--{fingerprint[:12]}.json"
    payload = write_immutable_snapshot(path, report, label="mixed rehearsal")
    validate_mixed_rehearsal_report(payload)
    write_latest_projection(Path(out_root) / batch_id / "latest_mixed_rehearsal.json", payload)
    return path
