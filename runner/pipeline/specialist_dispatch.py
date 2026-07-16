"""Dry-run plans for existing specialist workflows; executes nothing."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .artifact_validation import validate_specialist
from .workflow_batch import BASE_ROUTES, validate_workflow_manifest
from .workflow_integrity import (
    canonical_fingerprint,
    require_bound_fingerprint,
    safe_workflow_batch_id,
    valid_fingerprint,
    write_immutable_snapshot,
    write_latest_projection,
)


SCHEMA_VERSION = "specialist-dispatch-plan-v1.0"
SUPPORTED_SPECIALIST_ROUTES = {"media", "testimony", "legal", "longform", "second_opinion"}
DISPATCH_TOP_LEVEL_FIELDS = {
    "schema_version", "workflow_batch_id", "workflow_fingerprint", "dry_run",
    "lock_policy", "remote_writes", "items", "summary", "generated_at",
    "evidence_fingerprint",
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _fingerprint(payload: Any) -> str:
    return canonical_fingerprint(payload)


def dispatch_stable_projection(dispatch: dict[str, Any]) -> dict[str, Any]:
    return {
        key: dispatch.get(key)
        for key in (
            "schema_version", "workflow_batch_id", "workflow_fingerprint", "dry_run",
            "lock_policy", "remote_writes", "items", "summary",
        )
    }


def _dispatch_summary(items: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "items": len(items),
        "specialist_routes": sum(len(row.get("specialists") or []) for row in items),
        "blocked_or_human": sum(
            plan.get("status") in {
                "blocked", "invalid", "stale", "human_required", "waiting_for_base_processing",
            }
            for row in items for plan in row.get("specialists") or []
        ),
    }


def _safe_doc_id(value: Any) -> str:
    doc_id = str(value or "")
    if doc_id and (
        doc_id in {".", ".."}
        or doc_id != doc_id.strip()
        or "\x00" in doc_id
        or Path(doc_id).is_absolute()
        or ".." in Path(doc_id).parts
        or "/" in doc_id
        or "\\" in doc_id
    ):
        raise ValueError("Dispatch doc_id is not safe for a corpus path")
    return doc_id


def validate_dispatch_plan(
    plan: dict[str, Any],
    workflow_manifest: dict[str, Any] | None = None,
    *,
    corpus_dir: Path | None = None,
    verify_current_base_status: bool = True,
) -> None:
    """Validate a dispatch artifact and, when supplied, its workflow binding."""
    if not isinstance(plan, dict):
        raise ValueError("Dispatch plan must be an object")
    unexpected = set(plan) - DISPATCH_TOP_LEVEL_FIELDS
    if unexpected:
        raise ValueError("Dispatch plan has unsupported top-level fields: " + ", ".join(sorted(unexpected)))
    if plan.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported specialist dispatch schema")
    safe_workflow_batch_id(plan.get("workflow_batch_id"))
    if plan.get("dry_run") is not True or plan.get("remote_writes") is not False:
        raise ValueError("Dispatch plan must remain dry-run with remote writes disabled")
    if not valid_fingerprint(plan.get("workflow_fingerprint")):
        raise ValueError("Dispatch workflow fingerprint is missing or malformed")
    items = plan.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= 15:
        raise ValueError("Dispatch items must contain between 1 and 15 rows")
    if not all(isinstance(row, dict) for row in items):
        raise ValueError("Dispatch items must be objects")
    raw_queue_ids = [row.get("queue_item_id") for row in items]
    if not all(type(value) is str and value and value == value.strip() for value in raw_queue_ids):
        raise ValueError("Dispatch queue item IDs must be strings without surrounding whitespace")
    queue_ids = list(raw_queue_ids)
    if len(set(queue_ids)) != len(queue_ids):
        raise ValueError("Dispatch queue item IDs must be unique and non-empty")
    for row in items:
        if row.get("doc_id") is not None and type(row.get("doc_id")) is not str:
            raise ValueError("Dispatch doc_id must be a string")
        doc_id = _safe_doc_id(row.get("doc_id"))
        base_route = str(row.get("base_route") or "")
        if base_route not in BASE_ROUTES:
            raise ValueError("Dispatch base route is unsupported")
        specialists = row.get("specialists")
        if not isinstance(specialists, list) or not all(isinstance(value, dict) for value in specialists):
            raise ValueError("Dispatch specialists must be a list of objects")
        routes = [str(value.get("route") or "") for value in specialists]
        if (
            not all(route in SUPPORTED_SPECIALIST_ROUTES for route in routes)
            or len(set(routes)) != len(routes)
        ):
            raise ValueError("Dispatch specialist routes must be supported, unique, and non-empty")
        if row.get("next_action") != _next_action(base_route, doc_id, specialists):
            raise ValueError("Dispatch next action does not match route state")
        if corpus_dir is not None and verify_current_base_status:
            expected_base_status = (
                "already_processed"
                if doc_id and (Path(corpus_dir) / doc_id).is_dir()
                else "waiting_for_base_processing"
            )
            if row.get("base_status") != expected_base_status:
                raise ValueError("Dispatch base status does not match corpus state")
    expected_summary = _dispatch_summary(items)
    summary = plan.get("summary")
    if (
        not isinstance(summary, dict)
        or set(summary) != set(expected_summary)
        or any(type(value) is not int for value in summary.values())
        or summary != expected_summary
    ):
        raise ValueError("Dispatch summary does not match dispatch items")
    require_bound_fingerprint(plan, dispatch_stable_projection, label="Dispatch")

    if workflow_manifest is not None:
        validate_workflow_manifest(workflow_manifest)
        if plan.get("workflow_batch_id") != workflow_manifest.get("workflow_batch_id"):
            raise ValueError("Dispatch and workflow batch IDs differ")
        if plan.get("workflow_fingerprint") != workflow_manifest.get("evidence_fingerprint"):
            raise ValueError("Dispatch is not bound to this workflow fingerprint")
        workflow_items = workflow_manifest.get("items") or []
        workflow_ids = [str(row.get("queue_item_id") or "") for row in workflow_items]
        if queue_ids != workflow_ids:
            raise ValueError("Dispatch item order/identity differs from workflow")
        for dispatch_row, workflow_row in zip(items, workflow_items):
            if dispatch_row.get("doc_id") != str(workflow_row.get("corpus_doc_id") or ""):
                raise ValueError("Dispatch document identity differs from workflow")
            if dispatch_row.get("base_route") != workflow_row.get("base_route"):
                raise ValueError("Dispatch base route differs from workflow")
            expected = [str(route) for route in workflow_row.get("specialist_routes") or []]
            actual = [str(value.get("route") or "") for value in dispatch_row.get("specialists") or []]
            if actual != expected and actual != [*expected, "second_opinion"]:
                raise ValueError("Dispatch specialist routes differ from workflow")
            if actual == [*expected, "second_opinion"]:
                if corpus_dir is None:
                    raise ValueError("Derived second_opinion route requires corpus evidence validation")
                doc_id = _safe_doc_id(dispatch_row.get("doc_id"))
                analysis = _read(Path(corpus_dir) / doc_id / "analysis.json", {}) if doc_id else {}
                if not isinstance(analysis, dict) or analysis.get("needs_review") is not True:
                    raise ValueError("Derived second_opinion route lacks analysis needs_review evidence")


def _read(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _command(*parts: str) -> list[str]:
    return [".venv/bin/python", "-m", "runner.main", *parts]


def _commands_when_runnable(route: str, status: str, future: list[list[str]], doc_id: str) -> list[list[str]]:
    runnable = {
        "media": {"ready_for_report"},
        "testimony": {"pending", "in_progress", "invalid", "stale"},
        "longform": {"pending", "in_progress", "invalid", "stale"},
        "second_opinion": {"pending", "invalid", "stale"},
    }
    return future if doc_id and status in runnable.get(route, set()) else []


def _next_action(base_route: str, doc_id: str, plans: list[dict]) -> str:
    if base_route == "technical_hold":
        return "resolve_technical_hold"
    if base_route == "deferred":
        return "leave_settled"
    if not doc_id:
        return "run_existing_base_pipeline"
    statuses = {str(plan.get("status") or "") for plan in plans}
    if "blocked" in statuses:
        return "resolve_specialist_hold"
    if statuses & {"invalid", "stale"}:
        return "repair_or_rebuild_specialist_artifacts"
    if "waiting_for_base_processing" in statuses:
        return "wait_for_base_processing"
    if "human_required" in statuses:
        return "researcher_decision_required"
    if statuses & {"pending", "in_progress", "ready_for_report"}:
        return "run_missing_specialists"
    return "compile_outcome"


def _route_plan(route: str, doc_id: str, doc_dir: Path) -> dict[str, Any]:
    analysis = _read(doc_dir / "analysis.json", {}) if doc_dir.is_dir() else {}
    validation = validate_specialist(doc_dir, route)
    if route == "media":
        future = [_command("media-report", doc_id or "<doc_id>")]
        return {
            "route": route, "status": validation["status"],
            "prerequisites": [] if validation["status"] == "ready_for_report" else ["valid media metadata or transcript evidence"],
            "commands": _commands_when_runnable(route, validation["status"], future, doc_id), "planned_after_base": future,
            "estimated_model_work": "none for report; optional annotation profile is separate",
            "completion_rule": validation["completion_rule"],
            "human_authority": validation["human_authority"],
            "artifact_validation": validation,
        }
    if route == "testimony":
        future = [_command("testimony-candidates-build", doc_id or "<doc_id>"), _command("testimony-deep-review", doc_id or "<doc_id>")]
        return {
            "route": route, "status": validation["status"],
            "prerequisites": [] if doc_dir.is_dir() else ["completed private base processing"],
            "commands": _commands_when_runnable(route, validation["status"], future, doc_id), "planned_after_base": future,
            "estimated_model_work": "high when deep segment review is selected",
            "completion_rule": validation["completion_rule"],
            "human_authority": validation["human_authority"],
            "artifact_validation": validation,
        }
    if route == "legal":
        return {
            "route": route, "status": validation["status"],
            "prerequisites": ["jurisdiction, instrument version/date, and citation evidence"],
            "commands": [], "planned_after_base": [],
            "estimated_model_work": "none automatically",
            "completion_rule": validation["completion_rule"],
            "human_authority": validation["human_authority"],
            "artifact_validation": validation,
        }
    if route == "longform":
        future = [_command("longform-build", doc_id or "<doc_id>"), _command("longform-review", doc_id or "<doc_id>")]
        return {
            "route": route, "status": validation["status"],
            "prerequisites": [] if doc_dir.is_dir() else ["local PDF/base document"],
            "commands": _commands_when_runnable(route, validation["status"], future, doc_id), "planned_after_base": future,
            "estimated_model_work": "high; section-level and resumable",
            "completion_rule": validation["completion_rule"],
            "human_authority": validation["human_authority"],
            "artifact_validation": validation,
        }
    if route == "second_opinion":
        future = [_command("second-opinion", doc_id or "<doc_id>")]
        return {
            "route": route, "status": validation["status"],
            "prerequisites": ["analysis.json"] if not (doc_dir / "analysis.json").is_file() else [],
            "commands": _commands_when_runnable(route, validation["status"], future, doc_id), "planned_after_base": future,
            "estimated_model_work": "medium",
            "completion_rule": validation["completion_rule"],
            "human_authority": validation["human_authority"],
            "artifact_validation": validation,
        }
    return {"route": route, "status": "unsupported", "prerequisites": [], "commands": []}


def build_dispatch_plan(workflow_manifest: dict, corpus_dir: Path) -> dict[str, Any]:
    validate_workflow_manifest(workflow_manifest)
    rows = []
    for item in workflow_manifest.get("items") or []:
        doc_id = str(item.get("corpus_doc_id") or "")
        doc_dir = Path(corpus_dir) / doc_id if doc_id else Path(corpus_dir) / "__not_ingested__"
        routes = list(item.get("specialist_routes") or [])
        analysis = _read(doc_dir / "analysis.json", {}) if doc_id else {}
        if isinstance(analysis, dict) and analysis.get("needs_review") and "second_opinion" not in routes:
            routes.append("second_opinion")
        specialist_plans = [_route_plan(route, doc_id, doc_dir) for route in routes]
        rows.append({
            "queue_item_id": item.get("queue_item_id"),
            "doc_id": doc_id,
            "base_route": item.get("base_route"),
            "base_status": "already_processed" if doc_id and doc_dir.is_dir() else "waiting_for_base_processing",
            "specialists": specialist_plans,
            "next_action": _next_action(str(item.get("base_route") or ""), doc_id, specialist_plans),
        })
    stable = {
        "schema_version": SCHEMA_VERSION,
        "workflow_batch_id": workflow_manifest.get("workflow_batch_id"),
        "workflow_fingerprint": workflow_manifest.get("evidence_fingerprint"),
        "dry_run": True,
        "lock_policy": "Reuse existing app/worker model locks; this plan acquires none.",
        "remote_writes": False,
        "items": rows,
        "summary": {
            "items": len(rows),
            "specialist_routes": sum(len(row["specialists"]) for row in rows),
            "blocked_or_human": sum(
                plan.get("status") in {"blocked", "invalid", "stale", "human_required", "waiting_for_base_processing"}
                for row in rows for plan in row["specialists"]
            ),
        },
    }
    plan = {
        **stable,
        "generated_at": _now(),
        "evidence_fingerprint": _fingerprint(stable),
    }
    validate_dispatch_plan(plan, workflow_manifest, corpus_dir=corpus_dir)
    return plan


def write_dispatch_plan(
    plan: dict,
    out_root: Path,
    *,
    workflow_manifest: dict[str, Any],
    corpus_dir: Path | None = None,
) -> Path:
    validate_dispatch_plan(plan, workflow_manifest, corpus_dir=corpus_dir)
    batch_id = safe_workflow_batch_id(plan.get("workflow_batch_id"))
    fingerprint = str(plan["evidence_fingerprint"])
    path = Path(out_root) / batch_id / "plans" / f"{batch_id}--{fingerprint[:12]}.json"
    stored = write_immutable_snapshot(path, plan, label="specialist dispatch")
    validate_dispatch_plan(stored, workflow_manifest, corpus_dir=corpus_dir)
    write_latest_projection(Path(out_root) / batch_id / "latest_specialist_dispatch.json", stored)
    return path
