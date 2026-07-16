"""Bounded, read-only Processing Queue projection.

This module composes existing workflow, dispatch, artifact, specialist, review,
and local-receipt evidence.  It creates no status database, performs no network
calls, and has no execution, import, upload, or publication capability.
"""
from __future__ import annotations

import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from runner.app_readiness import summarize_enrichment_lifecycle

from .artifact_validation import (
    validate_preservation_stage,
    validate_specialist,
    validate_stage,
)
from .publication_gate import assess_publication_readiness
from .batch_outcome import validate_batch_outcome
from .review_pack import validate_review_pack
from .specialist_dispatch import validate_dispatch_plan
from .workflow_batch import validate_workflow_manifest
from .workflow_integrity import canonical_fingerprint
from .compilation_manifest import compilation_batch_key, load_latest_completed


SCHEMA_VERSION = "processing-queue-projection-v1.0"
MAX_LOCAL_JSON_BYTES = 100 * 1024 * 1024
BASE_STAGES = (
    "acquisition", "preservation", "extraction", "citation_units",
    "analysis", "enrichment", "embedding",
)
TAIL_STAGES = (
    "specialist", "second_opinion", "draft_review", "compilation",
    "review_pack", "sanity_upload", "supabase_reconciliation", "public_release",
)
STAGE_ORDER = (*BASE_STAGES, *TAIL_STAGES)
ATTENTION_STATES = {
    "inconsistent", "invalid", "failed", "stale", "held", "human_required",
    "missing", "waiting", "partial", "running", "ready",
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _compilation_batch_root(exports_dir: Path, batch_id: str) -> Path:
    return Path(exports_dir) / "compilations" / compilation_batch_key(str(batch_id))


def _read_json(path: Path) -> tuple[dict[str, Any] | None, str]:
    path = Path(path)
    if not path.is_file():
        return None, "missing"
    if path.is_symlink():
        return None, "invalid symbolic link"
    if path.stat().st_size > MAX_LOCAL_JSON_BYTES:
        return None, "file exceeds the bounded local JSON size limit"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return None, f"invalid JSON: {exc}"
    if not isinstance(payload, dict):
        return None, "expected a JSON object"
    return payload, ""


def load_optional_local_json(path: Path) -> dict[str, Any] | None:
    """Load one optional bounded local artifact, rejecting malformed evidence."""
    payload, error = _read_json(Path(path))
    if error == "missing":
        return None
    if error:
        raise ValueError(f"{Path(path).name}: {error}")
    return payload


def discover_bound_tail_artifact(
    exports_dir: Path, folder: str, filename: str,
    *, workflow: dict[str, Any], dispatch: dict[str, Any], limit: int = 100,
) -> dict[str, Any] | None:
    """Find only an artifact carrying the exact immutable workflow binding."""
    record = discover_bound_tail_artifact_record(
        exports_dir, folder, filename, workflow=workflow, dispatch=dispatch, limit=limit,
    )
    return record["payload"] if record else None


def discover_bound_tail_artifact_record(
    exports_dir: Path, folder: str, filename: str,
    *, workflow: dict[str, Any], dispatch: dict[str, Any], limit: int = 100,
) -> dict[str, Any] | None:
    """Return only a completed-manifest artifact, or a disclosed legacy fallback.

    Once a batch has entered the compilation-manifest workflow, replaceable
    ``latest_*`` files are never read directly.  A staging/abandoned attempt
    without a completed manifest therefore stays invisible to readers.
    """
    batch_id = str(workflow.get("workflow_batch_id") or "")
    kind = {
        ("batch_outcomes", "latest_batch_outcome.json"): "batch_outcome",
        ("review_packs", "latest_review_pack.json"): "review_pack_index",
    }.get((folder, filename))
    if batch_id and kind:
        manifest = load_latest_completed(exports_dir, batch_id)
        if manifest is not None:
            ref = next((row for row in manifest.get("artifacts") or [] if row.get("kind") == kind), None)
            if ref is None:
                return None
            path = Path(str(ref.get("path") or ""))
            payload, error = _read_json(path)
            if error or not payload:
                raise ValueError(f"Completed compilation artifact is unreadable: {error}")
            return {
                "payload": payload, "path": path,
                "visibility_mode": "completed_manifest",
                "manifest_fingerprint": manifest.get("manifest_fingerprint"),
                "manifest_artifacts": {
                    str(row.get("kind")): str(row.get("path"))
                    for row in manifest.get("artifacts") or [] if isinstance(row, dict)
                },
                "disclosure": "Loaded from an atomically completed compilation manifest.",
            }
        attempt_root = _compilation_batch_root(exports_dir, batch_id) / "attempts"
        if attempt_root.is_dir() and any(attempt_root.glob("*/attempt.json")):
            return None

    # Compatibility is intentionally limited to batches that have never
    # entered Phase 12.  The caller can disclose this mode in the UI.
    paths = sorted(
        (Path(exports_dir) / folder).glob(f"*/{filename}"),
        key=lambda path: path.stat().st_mtime_ns if path.is_file() else 0,
        reverse=True,
    )[:max(1, min(int(limit), 100))]
    expected = {
        "workflow_batch_id": workflow.get("workflow_batch_id"),
        "workflow_fingerprint": workflow.get("evidence_fingerprint"),
        "dispatch_fingerprint": dispatch.get("evidence_fingerprint"),
    }
    for path in paths:
        payload, error = _read_json(path)
        if error or not payload:
            continue
        if payload.get("workflow_binding") == expected:
            return {
                "payload": payload, "path": path,
                "visibility_mode": "legacy_fallback",
                "manifest_fingerprint": "",
                "manifest_artifacts": {},
                "disclosure": "Legacy pre-Phase-12 artifact: no atomic completion manifest exists for this batch.",
            }
    return None


def discover_latest_completed_artifact(
    exports_dir: Path, kind: str, *, legacy_path: Path | None = None,
) -> dict[str, Any] | None:
    """Find the newest manifest-completed artifact across batches.

    ``legacy_path`` is considered only when no compilation attempt exists
    anywhere, keeping pre-Phase-12 installations usable without exposing a
    half-written Phase-12 attempt.
    """
    root = Path(exports_dir) / "compilations"
    candidates: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    for path in root.glob("*/latest_completed_compilation.json"):
        manifest = load_latest_completed(exports_dir, path.parent.name)
        if manifest is None:
            continue
        ref = next((row for row in manifest.get("artifacts") or [] if row.get("kind") == kind), None)
        if ref:
            candidates.append((str(manifest.get("completed_at") or ""), manifest, ref))
    if candidates:
        _, manifest, ref = max(candidates, key=lambda row: (row[0], str(row[1].get("attempt_id") or "")))
        path = Path(str(ref["path"]))
        payload, error = _read_json(path)
        if error or not payload:
            raise ValueError(f"Completed compilation artifact is unreadable: {error}")
        return {
            "payload": payload, "path": path, "visibility_mode": "completed_manifest",
            "manifest_fingerprint": manifest.get("manifest_fingerprint"),
            "disclosure": "Loaded from an atomically completed compilation manifest.",
        }
    if root.is_dir() and any(root.glob("*/attempts/*/attempt.json")):
        return None
    if legacy_path is not None:
        payload, error = _read_json(Path(legacy_path))
        if not error and payload:
            return {
                "payload": payload, "path": Path(legacy_path), "visibility_mode": "legacy_fallback",
                "manifest_fingerprint": "",
                "disclosure": "Legacy pre-Phase-12 artifact: no compilation attempt exists.",
            }
    return None


def compilation_visibility_status(exports_dir: Path, batch_id: str) -> dict[str, Any]:
    """Explain the atomic visibility state without exposing staged artifacts."""
    manifest = load_latest_completed(exports_dir, batch_id)
    if manifest is not None:
        return {
            "state": "completed_manifest", "visible": True,
            "manifest_fingerprint": manifest.get("manifest_fingerprint"),
            "disclosure": "The last atomically completed compilation is visible; any newer staging attempt remains hidden.",
        }
    attempt_root = _compilation_batch_root(exports_dir, batch_id) / "attempts"
    states: list[str] = []
    for path in attempt_root.glob("*/attempt.json") if attempt_root.is_dir() else []:
        payload, error = _read_json(path)
        states.append(str((payload or {}).get("status") or "invalid") if not error else "invalid")
    if states:
        return {
            "state": "phase12_incomplete", "visible": False,
            "attempt_states": sorted(states),
            "disclosure": "A Phase 12 compilation attempt exists but no completed manifest is available. Its partial artifacts are intentionally hidden.",
        }
    return {
        "state": "legacy_eligible", "visible": False,
        "disclosure": "No Phase 12 attempt exists; validated legacy fallback may be shown with disclosure.",
    }


def discover_workflow_bundles(exports_dir: Path, *, limit: int = 20) -> list[dict[str, Any]]:
    """Return recent paired workflow/dispatch projections without trusting them yet."""
    exports_dir = Path(exports_dir)
    rows: list[dict[str, Any]] = []
    for workflow_path in (exports_dir / "workflow_batches").glob(
        "*/latest_workflow_batch.json"
    ):
        batch_id = workflow_path.parent.name
        dispatch_path = (
            exports_dir / "specialist_dispatch" / batch_id
            / "latest_specialist_dispatch.json"
        )
        rows.append({
            "workflow_batch_id": batch_id,
            "workflow_path": workflow_path,
            "dispatch_path": dispatch_path,
            "paired": dispatch_path.is_file(),
            "modified_ns": max(
                workflow_path.stat().st_mtime_ns,
                dispatch_path.stat().st_mtime_ns if dispatch_path.is_file() else 0,
            ),
        })
    rows.sort(key=lambda row: (-int(row["modified_ns"]), row["workflow_batch_id"]))
    return rows[:max(1, min(int(limit), 100))]


def load_workflow_bundle(bundle: dict[str, Any]) -> tuple[dict, dict]:
    workflow, workflow_error = _read_json(Path(bundle["workflow_path"]))
    dispatch, dispatch_error = _read_json(Path(bundle["dispatch_path"]))
    if workflow_error:
        raise ValueError(f"Workflow manifest is unavailable: {workflow_error}")
    if dispatch_error:
        raise ValueError(f"Specialist dispatch is unavailable: {dispatch_error}")
    return workflow or {}, dispatch or {}


def _normalize(raw: str) -> str:
    mapping = {
        "complete": "complete",
        "succeeded": "complete",
        "ready_for_report": "ready",
        "ready": "ready",
        "pending": "missing",
        "not_started": "missing",
        "missing": "missing",
        "not_recorded": "missing",
        "waiting": "waiting",
        "waiting_for_base_processing": "waiting",
        "in_progress": "partial",
        "partial": "partial",
        "running": "running",
        "failed": "failed",
        "invalid": "invalid",
        "inconsistent": "inconsistent",
        "stale": "stale",
        "blocked": "held",
        "held": "held",
        "human_required": "human_required",
        "receipt_present_unverified": "receipt_present_unverified",
        "not_applicable": "not_applicable",
        "unknown": "unknown",
    }
    return mapping.get(str(raw or ""), "unknown")


def _stage(
    stage_id: str,
    raw_status: str,
    *,
    required: bool,
    authority: str,
    evidence: list[str] | None = None,
    dependencies: list[str] | None = None,
    detail: str = "",
    completion_rule: str = "",
    human_authority: str = "",
    present: bool | None = None,
    valid: bool | None = None,
    completed: bool | None = None,
    fresh: bool | None = None,
    last_operation: dict[str, Any] | None = None,
    artifact_status: str | None = None,
    operation_status: str = "not_recorded",
    consistency_status: str = "not_applicable",
) -> dict[str, Any]:
    status = _normalize(raw_status)
    return {
        "stage_id": stage_id,
        "required": bool(required),
        "status": status,
        "raw_status": str(raw_status or "unknown"),
        "artifact_status": artifact_status or status,
        "operation_status": str(operation_status or "not_recorded"),
        "consistency_status": str(consistency_status or "not_applicable"),
        "authority": authority,
        "present": present,
        "valid": valid,
        "completed": completed if completed is not None else status == "complete",
        "fresh": fresh,
        "evidence": list(evidence or []),
        "dependencies": list(dependencies or []),
        "detail": str(detail or ""),
        "completion_rule": str(completion_rule or ""),
        "human_authority": str(human_authority or ""),
        "last_operation": dict(last_operation or {}),
    }


def _validated_stage(doc_dir: Path, stage_id: str) -> dict[str, Any]:
    try:
        result = (
            validate_preservation_stage(doc_dir)
            if stage_id == "preservation" else validate_stage(doc_dir, stage_id)
        )
    except Exception as exc:
        return _stage(
            stage_id, "invalid", required=stage_id != "preservation",
            authority="artifact_validation", detail=f"Validation failed closed: {exc}",
            valid=False, completed=False,
        )
    required = stage_id != "preservation"
    if stage_id == "preservation" and str(result.get("status") or "") in {
        "blocked", "invalid", "stale",
    }:
        required = True
    return _stage(
        stage_id, str(result.get("status") or "unknown"),
        required=required, authority="artifact_validation",
        evidence=result.get("evidence") or [], dependencies=result.get("dependencies") or [],
        detail=str(result.get("detail") or ""),
        completion_rule=str(result.get("completion_rule") or ""),
        human_authority=str(result.get("human_authority") or ""),
        present=result.get("present"), valid=result.get("valid"),
        completed=result.get("completed"), fresh=result.get("fresh"),
    )


def _waiting_stage(stage_id: str, *, required: bool) -> dict[str, Any]:
    return _stage(
        stage_id, "waiting", required=required, authority="workflow_linkage",
        detail="No linked local corpus document exists for this workflow row.",
        valid=False, completed=False,
    )


def _aggregate_specialists(
    doc_dir: Path, routes: list[str], *, attempts: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    projections: list[dict[str, Any]] = []
    for route in routes:
        try:
            result = validate_specialist(doc_dir, route)
        except Exception as exc:
            result = {
                "status": "invalid", "detail": f"Validation failed closed: {exc}",
                "evidence": [], "dependencies": [], "valid": False,
                "completed": False, "fresh": None, "completion_rule": "",
                "human_authority": "",
            }
        projections.append(_stage(
            route, str(result.get("status") or "unknown"), required=True,
            authority="artifact_validation.validate_specialist",
            evidence=result.get("evidence") or [], dependencies=result.get("dependencies") or [],
            detail=str(result.get("detail") or ""),
            completion_rule=str(result.get("completion_rule") or ""),
            human_authority=str(result.get("human_authority") or ""),
            present=result.get("present"), valid=result.get("valid"),
            completed=result.get("completed"), fresh=result.get("fresh"),
        ))
    if not projections:
        return _stage(
            "specialist", "not_applicable", required=False,
            authority="workflow_manifest", detail="No specialist route was selected.",
        ), []

    precedence = (
        "inconsistent", "invalid", "failed", "stale", "held", "human_required",
        "running", "partial", "missing", "waiting", "ready", "complete",
    )
    states = {row["status"] for row in projections}
    aggregate = next((value for value in precedence if value in states), "unknown")

    last_operation: dict[str, Any] = {}
    operation_status = "not_recorded"
    consistency_status = "not_applicable"
    invalid_chains = [row for row in attempts if row.get("event_history_valid") is not True]
    valid_chains = [row for row in attempts if row.get("event_history_valid") is True]
    if invalid_chains:
        consistency_status = "conflict"
        last_operation = {
            "state": "inconsistent_event_history",
            "attempt_id": invalid_chains[0].get("attempt_id", ""),
        }
        operation_status = "unverified"
    elif valid_chains:
        latest = valid_chains[0]
        consistency_status = "unverified_history"
        outcome = str(latest.get("terminal_outcome") or "")
        operation_status = outcome or (
            "running" if latest.get("recovery_check_required")
            else str(latest.get("execution_state") or "recorded")
        )
        last_operation = {
            "state": latest.get("execution_state", ""),
            "outcome": outcome,
            "attempt_id": latest.get("attempt_id", ""),
            "run_id": latest.get("execution_run_id", ""),
        }
    detail = "; ".join(
        f"{row['stage_id']}={row['raw_status']}" for row in projections
    )
    return _stage(
        "specialist", aggregate, required=True, authority="specialist_aggregate",
        evidence=[row["stage_id"] for row in projections], detail=detail,
        completed=aggregate == "complete", valid=aggregate not in {"invalid", "inconsistent"},
        last_operation=last_operation, artifact_status=aggregate,
        operation_status=operation_status, consistency_status=consistency_status,
    ), projections


def _attempt_binding(
    row: dict[str, Any], *, workflow: dict[str, Any], dispatch: dict[str, Any],
    queue_id: str, doc_id: str, permitted_pairs: set[tuple[str, str]],
) -> bool:
    return (
        row.get("workflow_batch_id") == workflow.get("workflow_batch_id")
        and row.get("workflow_fingerprint") == workflow.get("evidence_fingerprint")
        and row.get("dispatch_fingerprint") == dispatch.get("evidence_fingerprint")
        and row.get("queue_item_id") == queue_id
        and str(row.get("doc_id") or "") == doc_id
        and (str(row.get("route") or ""), str(row.get("stage") or "")) in permitted_pairs
    )


def _permitted_attempt_pairs(dispatch_item: dict[str, Any]) -> set[tuple[str, str]]:
    """Derive the only route/stage pairs the frozen dispatch can have planned."""
    pairs = {(str(dispatch_item.get("base_route") or ""), "local_base")}
    for specialist in dispatch_item.get("specialists") or []:
        route = str(specialist.get("route") or "")
        commands = [
            command for command in [
                *(specialist.get("commands") or []),
                *(specialist.get("planned_after_base") or []),
            ]
            if isinstance(command, list) and len(command) > 3
        ]
        if commands:
            pairs.update((route, str(command[3])) for command in commands)
        else:
            pairs.add((route, f"specialist:{route}"))
    return pairs


def _draft_review_stage(doc_dir: Path) -> dict[str, Any]:
    lifecycle = summarize_enrichment_lifecycle(doc_dir)
    if not lifecycle["exists"]:
        return _stage(
            "draft_review", "waiting", required=False, authority="app_readiness",
            detail="Enrichment has not produced a draft register.", completed=False,
        )
    if lifecycle["total"] == 0:
        raw = "complete"
        detail = "Enrichment contains no draft records requiring review."
    elif lifecycle["pending"] or lifecycle["approved_unpushed"]:
        raw = "ready"
        detail = (
            f"{lifecycle['pending']} pending and {lifecycle['approved_unpushed']} approved-unpushed "
            "draft(s). Drafts remain usable as provisional memory; grouped validation is separate."
        )
    else:
        raw = "complete"
        detail = f"All {lifecycle['total']} draft record(s) have a recorded lifecycle state."
    return _stage(
        "draft_review", raw, required=False, authority="app_readiness",
        evidence=["enrichment.json"], detail=detail, completed=raw == "complete",
        valid=True,
    )


def _local_receipt_stage(doc_dir: Path, filename: str, stage_id: str) -> dict[str, Any]:
    payload, error = _read_json(doc_dir / filename)
    if error == "missing":
        return _stage(
            stage_id, "unknown" if stage_id == "supabase_reconciliation" else "not_started",
            required=False, authority="local_receipt",
            detail=(
                "No local Supabase receipt exists; remote state was not checked."
                if stage_id == "supabase_reconciliation" else
                "No local Sanity upload receipt exists; remote state was not checked."
            ), completed=False,
        )
    if error or not payload:
        return _stage(
            stage_id, "invalid", required=False, authority="local_receipt",
            evidence=[filename], detail=error or "Local receipt is empty.",
            valid=False, completed=False,
        )
    if stage_id == "supabase_reconciliation":
        return _stage(
            stage_id, "invalid", required=False, authority="unsupported_local_receipt",
            evidence=[filename],
            detail=(
                "A supabase_record.json file exists, but this system has no versioned producer or "
                "validation contract for it. Remote Supabase state was not checked."
            ),
            present=True, valid=False, completed=False,
        )
    uploaded_at = str(payload.get("uploaded_at") or "")
    try:
        parsed_uploaded_at = datetime.fromisoformat(uploaded_at.replace("Z", "+00:00"))
    except ValueError:
        parsed_uploaded_at = None
    valid_receipt = (
        isinstance(payload.get("sanity_id"), str) and bool(payload["sanity_id"].strip())
        and payload.get("doc_id") == doc_dir.name
        and parsed_uploaded_at is not None and parsed_uploaded_at.tzinfo is not None
    )
    if not valid_receipt:
        return _stage(
            stage_id, "invalid", required=False, authority="local_receipt",
            evidence=[filename],
            detail="Sanity receipt requires sanity_id, matching doc_id, and timezone-aware uploaded_at.",
            present=True, valid=False, completed=False,
        )
    return _stage(
        stage_id, "receipt_present_unverified", required=False,
        authority="local_receipt", evidence=[filename],
        detail="A local receipt is present. Remote state was deliberately not checked.",
        present=True, valid=True, completed=False,
    )


def _bound_tail_stage(
    stage_id: str, artifact: dict[str, Any] | None, *, batch_id: str, doc_id: str,
    workflow_fingerprint: str, dispatch_fingerprint: str,
    source_outcome: dict[str, Any] | None = None,
    doc_dir: Path | None = None,
) -> dict[str, Any]:
    if artifact is None:
        return _stage(
            stage_id, "not_started", required=False, authority=stage_id,
            detail=f"No {stage_id.replace('_', ' ')} is bound to this workflow batch.",
            completed=False,
        )
    expected_binding = {
        "workflow_batch_id": batch_id,
        "workflow_fingerprint": workflow_fingerprint,
        "dispatch_fingerprint": dispatch_fingerprint,
    }
    try:
        if artifact.get("workflow_binding") != expected_binding:
            raise ValueError("workflow binding differs")
        if stage_id == "compilation":
            validate_batch_outcome(artifact, require_bound=True)
            docs = {
                str(row.get("doc_id") or "") for row in artifact.get("items") or []
                if isinstance(row, dict) and str(row.get("doc_id") or "")
            }
        else:
            if source_outcome is None:
                raise ValueError("the exact source Batch Outcome is unavailable")
            validate_review_pack(
                artifact, expected_workflow_binding=expected_binding,
                source_outcome=source_outcome, require_bound=True,
            )
            docs = {
                str(row.get("doc_id") or "") for row in artifact.get("documents") or []
                if isinstance(row, dict) and str(row.get("doc_id") or "")
            }
    except Exception as exc:
        return _stage(
            stage_id, "invalid", required=False, authority=stage_id,
            detail=(
                f"{stage_id.replace('_', ' ').title()} is not valid or not exactly bound "
                f"to this workflow batch: {exc}"
            ),
            valid=False, completed=False,
        )
    freshness_source = artifact if stage_id == "compilation" else source_outcome
    source_item = next((
        row for row in (freshness_source or {}).get("items") or []
        if isinstance(row, dict) and str(row.get("doc_id") or "") == doc_id
    ), None)
    recorded_state = source_item.get("artifact_state") if isinstance(source_item, dict) else None
    if doc_id in docs and doc_dir is not None and isinstance(recorded_state, dict):
        for filename, recorded in recorded_state.items():
            if not isinstance(recorded, dict):
                return _stage(
                    stage_id, "invalid", required=False, authority=stage_id,
                    detail="Bound artifact contains malformed source-artifact state.",
                    valid=False, completed=False,
                )
            path = doc_dir / str(filename)
            safe_present = path.is_file() and not path.is_symlink()
            current_hash = hashlib.sha256(path.read_bytes()).hexdigest() if safe_present else ""
            if (
                bool(recorded.get("present")) != safe_present
                or str(recorded.get("sha256") or "") != current_hash
            ):
                return _stage(
                    stage_id, "stale", required=False, authority=stage_id,
                    evidence=[str(filename)],
                    detail=(
                        "Current local source artifacts differ from the evidence compiled into this "
                        f"{stage_id.replace('_', ' ')}. Recheck the batch before treating it as current."
                    ),
                    valid=True, completed=False, fresh=False,
                )
    return _stage(
        stage_id, "complete" if doc_id in docs else "missing", required=False,
        authority=stage_id, detail=(
            "Document is included in an exactly workflow-bound, content-fingerprinted local artifact."
            if doc_id in docs else "Bound artifact does not account for this linked document."
        ), valid=doc_id in docs, completed=doc_id in docs,
    )


def _public_release_stage(doc_dir: Path) -> dict[str, Any]:
    try:
        readiness = assess_publication_readiness(doc_dir)
    except Exception as exc:
        return _stage(
            "public_release", "invalid", required=False, authority="publication_gate",
            detail=f"Publication readiness failed closed: {exc}", valid=False,
        )
    recommended_lane = str(readiness.get("recommended_lane") or "blocked")
    lane = (readiness.get("lanes") or {}).get(recommended_lane) or {}
    blockers = lane.get("blockers") or readiness.get("blockers") or []
    return _stage(
        "public_release", "human_required",
        required=False, authority="publication_gate",
        detail=(
            f"Candidate lane: {recommended_lane}. "
            + ("; ".join(str(value) for value in blockers[:5]) if blockers else "Local prerequisites appear satisfied.")
            + " Remote state was not checked and a separate release-policy decision is required."
        ),
        human_authority="Public release is always a separate researcher decision.",
        valid=True, completed=False,
    )


def _next_action(item: dict[str, Any]) -> tuple[str, str]:
    if item["base_route"] == "deferred":
        return "Leave the settled queue item unchanged", item["linkage_detail"]
    if item["base_route"] == "technical_hold":
        return "Resolve the existing triage technical hold", item["linkage_detail"]
    if item.get("attempt_binding_status") == "conflict" or any(
        stage.get("consistency_status") == "conflict"
        for stage in item.get("stages", {}).values()
    ):
        return "Audit attempt-ledger integrity before further work", (
            item.get("attempt_binding_detail") or "An attempt event chain is inconsistent."
        )
    if item["linkage_state"] != "linked":
        return "Run or repair base processing", item["linkage_detail"]
    for stage_id in BASE_STAGES:
        stage = item["stages"][stage_id]
        if stage["required"] and stage["status"] != "complete":
            action = {
                "invalid": "Inspect malformed stage evidence",
                "stale": "Create a fresh plan before rebuilding the stale stage",
                "missing": "Run the missing existing base stage",
                "waiting": "Resolve the preceding base-stage dependency",
                "held": "Resolve the recorded preservation or technical hold",
            }.get(stage["status"], "Inspect base-stage evidence")
            return action, stage["detail"]
    specialist = item["stages"]["specialist"]
    if specialist["required"] and specialist["status"] != "complete":
        action = {
            "human_required": "Open the relevant human specialist review",
            "ready": "Run the missing specialist only after a fresh eligible plan",
            "running": "Refresh status; do not submit the stage again",
            "failed": "Inspect failure evidence before retry planning",
            "held": "Resolve the specialist hold without rerunning blindly",
            "inconsistent": "Audit artifact and attempt evidence",
        }.get(specialist["status"], "Inspect specialist evidence")
        return action, specialist["detail"]
    second = item["stages"]["second_opinion"]
    if second["required"] and second["status"] != "complete":
        action = {
            "human_required": "Record the researcher decision on the second opinion",
            "missing": "Run the already-planned second opinion after a fresh preflight",
            "stale": "Rebuild the stale second opinion against current analysis",
            "invalid": "Inspect malformed second-opinion evidence",
            "held": "Resolve the second-opinion hold",
        }.get(second["status"], "Inspect second-opinion evidence")
        return action, second["detail"]
    if item["stages"]["compilation"]["status"] != "complete":
        if item["stages"]["compilation"]["status"] == "receipt_present_unverified":
            return (
                "Verify or recompile with a formal workflow binding",
                item["stages"]["compilation"]["detail"],
            )
        return "Compile the stable batch outcome", item["stages"]["compilation"]["detail"]
    if item["stages"]["draft_review"]["status"] in {"ready", "human_required", "invalid"}:
        return "Review and consolidate the batch's draft findings", item["stages"]["draft_review"]["detail"]
    if item["stages"]["review_pack"]["status"] != "complete":
        return "Generate a bounded Review Pack", item["stages"]["review_pack"]["detail"]
    return "Review optional draft, upload, and release gates", "Core local processing evidence is complete."


def _overall(item: dict[str, Any]) -> str:
    if item.get("attempt_binding_status") == "conflict" or any(
        stage.get("consistency_status") == "conflict"
        for stage in item.get("stages", {}).values()
    ):
        return "inconsistent"
    if item["linkage_state"] in {"conflict", "invalid"}:
        return "inconsistent"
    required = [stage for stage in item["stages"].values() if stage["required"]]
    precedence = (
        "inconsistent", "invalid", "failed", "stale", "held", "human_required",
        "running", "partial", "missing", "waiting", "ready",
    )
    states = {stage["status"] for stage in required}
    return next((state for state in precedence if state in states), "complete")


def build_processing_projection(
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    corpus_dir: Path,
    *,
    attempts: list[dict[str, Any]] | None = None,
    outcome: dict[str, Any] | None = None,
    review_pack: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Project one frozen <=15 workflow batch from current local evidence."""
    corpus_dir = Path(corpus_dir)
    validate_workflow_manifest(workflow)
    # The dispatch is frozen evidence. Its base_status records planning-time
    # state and is expected to become outdated as ingestion progresses. Keep
    # validating every other binding, including derived second-opinion proof,
    # while projecting the current corpus state separately below.
    validate_dispatch_plan(
        dispatch, workflow, corpus_dir=corpus_dir,
        verify_current_base_status=False,
    )
    batch_id = str(workflow["workflow_batch_id"])
    attempt_rows = [row for row in (attempts or []) if row.get("workflow_batch_id") == batch_id]
    duplicates = {
        doc_id for doc_id in (
            str(row.get("doc_id") or "") for row in dispatch["items"]
        ) if doc_id and sum(
            str(row.get("doc_id") or "") == doc_id for row in dispatch["items"]
        ) > 1
    }
    items: list[dict[str, Any]] = []
    for workflow_item, dispatch_item in zip(workflow["items"], dispatch["items"]):
        queue_id = str(workflow_item["queue_item_id"])
        doc_id = str(dispatch_item.get("doc_id") or "")
        doc_dir = corpus_dir / doc_id if doc_id else corpus_dir / "__unlinked__"
        base_route = str(workflow_item.get("base_route") or "")
        if base_route == "deferred":
            linkage_state = "settled"
            linkage_detail = "Triage deliberately left this already-settled queue item unchanged."
        elif base_route == "technical_hold":
            linkage_state = "held"
            prerequisites = workflow_item.get("prerequisites") or []
            linkage_detail = (
                "; ".join(str(value) for value in prerequisites)
                or str(workflow_item.get("hold_reason") or "A triage technical hold remains unresolved.")
            )
        elif not doc_id:
            linkage_state = "unlinked"
            linkage_detail = "Queue item is not yet linked to a corpus document; no fuzzy match was attempted."
        elif doc_id in duplicates:
            linkage_state = "conflict"
            linkage_detail = "The workflow contains the same corpus document more than once."
        elif not doc_dir.is_dir() or doc_dir.is_symlink():
            linkage_state = "conflict"
            linkage_detail = "The frozen workflow link does not resolve to a safe local document directory."
        else:
            linkage_state = "linked"
            linkage_detail = "Frozen workflow and dispatch identify the same local document."

        if linkage_state == "linked":
            stages = {stage_id: _validated_stage(doc_dir, stage_id) for stage_id in BASE_STAGES}
            routes = [
                str(plan.get("route") or "")
                for plan in dispatch_item.get("specialists") or []
                if str(plan.get("route") or "") != "second_opinion"
            ]
            candidate_attempts = sorted(
                [row for row in attempt_rows if row.get("queue_item_id") == queue_id],
                key=lambda row: str(row.get("created_at") or ""), reverse=True,
            )
            permitted_attempt_pairs = _permitted_attempt_pairs(dispatch_item)
            item_attempts = [
                row for row in candidate_attempts
                if _attempt_binding(
                    row, workflow=workflow, dispatch=dispatch,
                    queue_id=queue_id, doc_id=doc_id,
                    permitted_pairs=permitted_attempt_pairs,
                )
            ]
            rejected_attempts = [row for row in candidate_attempts if row not in item_attempts]
            specialist_attempts = [
                row for row in item_attempts
                if str(row.get("route") or "") in set(routes)
                and str(row.get("stage") or "") != "local_base"
            ]
            specialist, specialist_routes = _aggregate_specialists(
                doc_dir, routes, attempts=specialist_attempts,
            )
            stages["specialist"] = specialist
            second_required = any(
                str(plan.get("route") or "") == "second_opinion"
                for plan in dispatch_item.get("specialists") or []
            )
            if second_required:
                second = validate_specialist(doc_dir, "second_opinion")
                second_attempts = [
                    row for row in item_attempts
                    if str(row.get("route") or "") == "second_opinion"
                ]
                invalid_second_history = any(
                    row.get("event_history_valid") is not True for row in second_attempts
                )
                latest_second = second_attempts[0] if second_attempts else {}
                stages["second_opinion"] = _stage(
                    "second_opinion", str(second.get("status") or "unknown"),
                    required=True, authority="artifact_validation.validate_specialist",
                    evidence=second.get("evidence") or [], dependencies=second.get("dependencies") or [],
                    detail=str(second.get("detail") or second.get("completion_rule") or ""),
                    human_authority=str(second.get("human_authority") or ""),
                    valid=second.get("valid"), completed=second.get("completed"), fresh=second.get("fresh"),
                    artifact_status=_normalize(str(second.get("status") or "unknown")),
                    operation_status=(
                        str(latest_second.get("terminal_outcome") or "")
                        or str(latest_second.get("execution_state") or "not_recorded")
                    ),
                    consistency_status=(
                        "conflict" if invalid_second_history else
                        "unverified_history" if second_attempts else "not_applicable"
                    ),
                )
            else:
                stages["second_opinion"] = _stage(
                    "second_opinion", "not_applicable", required=False,
                    authority="specialist_dispatch", detail="No second-opinion route is required.",
                )
            stages["draft_review"] = _draft_review_stage(doc_dir)
            stages["compilation"] = _bound_tail_stage(
                "compilation", outcome, batch_id=batch_id, doc_id=doc_id,
                workflow_fingerprint=str(workflow["evidence_fingerprint"]),
                dispatch_fingerprint=str(dispatch["evidence_fingerprint"]),
                doc_dir=doc_dir,
            )
            stages["review_pack"] = _bound_tail_stage(
                "review_pack", review_pack, batch_id=batch_id, doc_id=doc_id,
                workflow_fingerprint=str(workflow["evidence_fingerprint"]),
                dispatch_fingerprint=str(dispatch["evidence_fingerprint"]),
                source_outcome=outcome,
                doc_dir=doc_dir,
            )
            stages["sanity_upload"] = _local_receipt_stage(doc_dir, "sanity_record.json", "sanity_upload")
            stages["supabase_reconciliation"] = _local_receipt_stage(
                doc_dir, "supabase_record.json", "supabase_reconciliation",
            )
            stages["public_release"] = _public_release_stage(doc_dir)
        elif linkage_state == "settled":
            stages = {
                stage_id: _stage(
                    stage_id, "not_applicable", required=False,
                    authority="workflow_manifest",
                    detail="This frozen workflow row is deferred because the queue item was already settled.",
                )
                for stage_id in STAGE_ORDER
            }
            specialist_routes = []
            item_attempts = []
            rejected_attempts = []
        elif linkage_state == "held":
            stages = {
                stage_id: _waiting_stage(stage_id, required=False)
                for stage_id in STAGE_ORDER
            }
            stages["acquisition"] = _stage(
                "acquisition", "held", required=True,
                authority="workflow_manifest", detail=linkage_detail,
                completed=False, valid=False,
            )
            specialist_routes = []
            item_attempts = []
            rejected_attempts = []
        else:
            specialist_required = bool(workflow_item.get("specialist_routes") or [])
            stages = {
                stage_id: _waiting_stage(
                    stage_id,
                    required=(
                        stage_id in {"acquisition", "extraction", "citation_units", "analysis", "enrichment", "embedding"}
                        or (stage_id == "specialist" and specialist_required)
                    ),
                )
                for stage_id in STAGE_ORDER
            }
            specialist_routes = []
            item_attempts = []
            rejected_attempts = []

        item = {
            "queue_item_id": queue_id,
            "doc_id": doc_id,
            "title": str(workflow_item.get("title") or ""),
            "source_url": str(workflow_item.get("url") or ""),
            "base_route": base_route,
            "linkage_state": linkage_state,
            "linkage_detail": linkage_detail,
            "stages": {stage_id: stages[stage_id] for stage_id in STAGE_ORDER},
            "specialist_routes": specialist_routes,
            "attempts": [{
                "attempt_id": row.get("attempt_id", ""),
                "stage": row.get("stage", ""),
                "execution_state": row.get("execution_state", ""),
                "terminal_outcome": row.get("terminal_outcome", ""),
                "event_history_valid": row.get("event_history_valid", False),
            } for row in item_attempts],
            "rejected_attempts": [{
                "attempt_id": row.get("attempt_id", ""),
                "doc_id": row.get("doc_id", ""),
                "stage": row.get("stage", ""),
                "route": row.get("route", ""),
                "reason": "Attempt row is not exactly bound to the current workflow, dispatch, item, document, route, and stage.",
            } for row in rejected_attempts],
            "attempt_binding_status": "conflict" if rejected_attempts else "bound",
            "attempt_binding_detail": (
                f"{len(rejected_attempts)} ledger row(s) claimed this batch/item but did not match its immutable binding."
                if rejected_attempts else "All displayed attempt rows match the selected workflow and dispatch binding."
            ),
        }
        item["overall_status"] = _overall(item)
        item["next_action"], item["attention_reason"] = _next_action(item)
        item["needs_attention"] = (
            item["overall_status"] != "complete"
            or (
                item["base_route"] != "deferred"
                and item["stages"]["compilation"]["status"] != "complete"
            )
            or (
                item["base_route"] != "deferred"
                and item["stages"]["review_pack"]["status"] != "complete"
            )
        )
        items.append(item)

    stable = {
        "schema_version": SCHEMA_VERSION,
        "workflow_batch_id": batch_id,
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
        "read_only": True,
        "execution_authorized": False,
        "remote_checked": False,
        "items": items,
        "summary": {
            "items": len(items),
            "linked": sum(row["linkage_state"] == "linked" for row in items),
            "unlinked_or_conflict": sum(row["linkage_state"] != "linked" for row in items),
            "needs_attention": sum(row["needs_attention"] for row in items),
            "complete": sum(row["overall_status"] == "complete" for row in items),
        },
    }
    return {
        **stable,
        "verified_at": _now(),
        "projection_fingerprint": canonical_fingerprint(stable),
    }


def filter_processing_items(items: list[dict[str, Any]], focus: str) -> list[dict[str, Any]]:
    if focus == "Needs attention":
        return [row for row in items if row.get("needs_attention")]
    if focus == "Failed / invalid":
        return [row for row in items if row.get("overall_status") in {"failed", "invalid", "inconsistent"}]
    if focus == "Stale / missing":
        return [row for row in items if row.get("overall_status") in {"stale", "missing", "waiting", "partial"}]
    if focus == "Specialist / human":
        return [row for row in items if row["stages"]["specialist"]["required"] or row.get("overall_status") in {"held", "human_required"}]
    if focus == "Unlinked":
        return [row for row in items if row.get("linkage_state") != "linked"]
    if focus in {"Complete", "Core processing complete"}:
        return [row for row in items if row.get("overall_status") == "complete"]
    return list(items)
