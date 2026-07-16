"""Deterministic, policy-versioned compilation of batch outcomes.

This module is deliberately local-only: it does not call a model, access the
network, mutate the corpus, or publish anything.  A compilation is an audit
snapshot.  When the policy or source artifacts change, a new snapshot is
created and compared with the previous one; older snapshots remain intact.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .atomic_io import atomic_write_json, atomic_write_text
from .archive_summary import build_archive_summary
from .publication_gate import assess_publication_readiness
from .provisional_memory import build_provisional_memory, build_tag_projections
from .compilation_manifest import (
    begin_compilation_attempt,
    load_latest_completed,
    publish_completed_compilation,
)
from .source_identity import load_latest_identity_snapshot
from .source_identity_decisions import (
    apply_identity_decisions,
    load_identity_decisions,
    partition_identity_decisions,
    validate_reviewed_identity_projection,
)
from .review_plan import build_review_plan
from .artifact_validation import validate_preservation_stage, validate_specialist, validate_stage
from .workflow_integrity import (
    canonical_fingerprint,
    valid_fingerprint,
    write_immutable_snapshot,
    write_immutable_text_snapshot,
    write_latest_projection,
)


SCHEMA_VERSION = "batch-outcome-v2.1"
ROUTE_SCHEMA_VERSION = "batch-route-plan-v2.1"
BOUND_SCHEMA_VERSION = "batch-outcome-v2.2"
BOUND_ROUTE_SCHEMA_VERSION = "batch-route-plan-v2.2"
WORKFLOW_INPUT_SCHEMA_VERSION = "workflow-outcome-input-v1.0"
DEFAULT_POLICY: dict[str, Any] = {
    "policy_version": "batch-outcome-policy-v2.1",
    "description": "Local consolidation for the real Analysis + Enrichment workflows.",
    "required_capture_artifacts": ["intake.json", "preprocess.json"],
    "required_analysis_artifacts": ["analysis.json", "analysis_audit.json"],
    "required_enrichment_artifacts": ["enrichment.json"],
    "testimony_types": ["Testimony", "Survivor-Network"],
    "legal_types": ["Legal-Instrument", "Regulatory-Policy-Document"],
    "specialist_flags": [
        "needs_media_review",
        "needs_testimony_review",
        "needs_legal_review",
        "needs_book_splitting",
    ],
    "proposal_fields": [
        "lexicon_proposals",
        "entity_proposals",
        "tactic_proposals",
        "practice_descriptions",
        "statistical_claims",
        "ingestion_queue",
        "corpus_connections",
    ],
    "review_group_limit": 25,
    "recurrence_threshold": 3,
    "failed_ledger_statuses": ["failed"],
    "deferred_ledger_statuses": ["planned", "not_executed", "running", "routed_hold"],
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _canonical_hash(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _read_json_snapshot(path: Path, *, max_bytes: int = 100 * 1024 * 1024) -> tuple[dict[str, Any], str]:
    """Parse and hash the same bounded regular-file bytes exactly once."""
    path = Path(path)
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Input is not a safe regular file: {path}")
    if path.stat().st_size > max_bytes:
        raise ValueError(f"Input exceeds the bounded JSON size limit: {path}")
    raw = path.read_bytes()
    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise ValueError(f"Input is not valid UTF-8 JSON: {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"Input must be a JSON object: {path}")
    return payload, hashlib.sha256(raw).hexdigest()


def _read_text_snapshot(path: Path, *, max_bytes: int = 20 * 1024 * 1024) -> str:
    path = Path(path)
    if not path.is_file() or path.is_symlink() or path.stat().st_size > max_bytes:
        raise ValueError(f"Snapshot is not a safe bounded regular text file: {path}")
    try:
        return path.read_text(encoding="utf-8")
    except Exception as exc:
        raise ValueError(f"Snapshot is not valid UTF-8 text: {path}: {exc}") from exc


def workflow_binding(
    workflow: dict[str, Any], dispatch: dict[str, Any], *, corpus_dir: Path | None = None,
) -> dict[str, str]:
    """Validate and return the immutable identity shared by workflow tail artifacts."""
    from .specialist_dispatch import validate_dispatch_plan
    from .workflow_batch import validate_workflow_manifest

    validate_workflow_manifest(workflow)
    # Frozen dispatch base status may legitimately lag current corpus state.
    validate_dispatch_plan(
        dispatch, workflow, corpus_dir=Path(corpus_dir) if corpus_dir is not None else None,
        verify_current_base_status=False,
    )
    return {
        "workflow_batch_id": str(workflow["workflow_batch_id"]),
        "workflow_fingerprint": str(workflow["evidence_fingerprint"]),
        "dispatch_fingerprint": str(dispatch["evidence_fingerprint"]),
    }


def _workflow_input_stable(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        key: payload.get(key)
        for key in ("schema_version", "batch_id", "workflow_binding", "items")
    }


def validate_workflow_outcome_input(
    payload: dict[str, Any], workflow: dict[str, Any], dispatch: dict[str, Any],
    *, corpus_dir: Path | None = None,
) -> None:
    """Validate the deterministic adapter consumed by the existing compiler."""
    if not isinstance(payload, dict):
        raise ValueError("Workflow outcome input must be an object")
    if payload.get("schema_version") != WORKFLOW_INPUT_SCHEMA_VERSION:
        raise ValueError("Unsupported workflow outcome input schema")
    if set(payload) != {
        "schema_version", "batch_id", "workflow_binding", "items",
        "generated_at", "evidence_fingerprint",
    }:
        raise ValueError("Workflow outcome input fields differ from its versioned contract")
    binding = workflow_binding(workflow, dispatch, corpus_dir=corpus_dir)
    if payload.get("batch_id") != binding["workflow_batch_id"]:
        raise ValueError("Workflow outcome input batch ID differs from the workflow")
    if payload.get("workflow_binding") != binding:
        raise ValueError("Workflow outcome input binding differs from the frozen bundle")
    items = payload.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= 15:
        raise ValueError("Workflow outcome input must contain between 1 and 15 items")
    expected_queue_ids = [str(row["queue_item_id"]) for row in workflow["items"]]
    actual_queue_ids = [str(row.get("item_id") or "") for row in items if isinstance(row, dict)]
    if actual_queue_ids != expected_queue_ids:
        raise ValueError("Workflow outcome input items/order differ from the workflow")
    linked_docs = [
        str(row.get("doc_id") or "") for row in dispatch["items"]
        if str(row.get("doc_id") or "")
    ]
    if len(linked_docs) != len(set(linked_docs)):
        raise ValueError("Workflow outcome input cannot account for a linked document more than once")
    for item, workflow_item, dispatch_item in zip(items, workflow["items"], dispatch["items"]):
        if not isinstance(item, dict):
            raise ValueError("Workflow outcome input items must be objects")
        if set(item) != {"item_id", "doc_id", "url", "status", "base_route", "specialist_routes"}:
            raise ValueError("Workflow outcome input item fields differ from its versioned contract")
        if item.get("doc_id") != str(dispatch_item.get("doc_id") or ""):
            raise ValueError("Workflow outcome input document identity differs from dispatch")
        if item.get("url") != str(workflow_item.get("url") or ""):
            raise ValueError("Workflow outcome input URL differs from workflow")
        if item.get("base_route") != workflow_item.get("base_route"):
            raise ValueError("Workflow outcome input base route differs from workflow")
        doc_id = str(dispatch_item.get("doc_id") or "")
        base_route = str(workflow_item.get("base_route") or "")
        expected_status = (
            "not_executed" if base_route == "deferred" else
            "routed_hold" if base_route == "technical_hold" else
            "succeeded" if (
                doc_id and corpus_dir is not None
                and (Path(corpus_dir) / doc_id).is_dir()
                and not (Path(corpus_dir) / doc_id).is_symlink()
            ) else "planned"
        )
        if item.get("status") != expected_status:
            raise ValueError("Workflow outcome input status differs from current frozen-link state")
        expected_routes = [
            str(value.get("route") or "") for value in dispatch_item.get("specialists") or []
        ]
        if item.get("specialist_routes") != expected_routes:
            raise ValueError("Workflow outcome input specialist routes differ from dispatch")
    if not valid_fingerprint(payload.get("evidence_fingerprint")):
        raise ValueError("Workflow outcome input fingerprint is malformed")
    if payload["evidence_fingerprint"] != canonical_fingerprint(_workflow_input_stable(payload)):
        raise ValueError("Workflow outcome input fingerprint does not match its content")


def build_workflow_outcome_input(
    workflow: dict[str, Any], dispatch: dict[str, Any], corpus_dir: Path,
) -> dict[str, Any]:
    """Project a frozen workflow into the existing compiler's item contract."""
    binding = workflow_binding(workflow, dispatch, corpus_dir=corpus_dir)
    corpus_dir = Path(corpus_dir)
    items: list[dict[str, Any]] = []
    for workflow_item, dispatch_item in zip(workflow["items"], dispatch["items"]):
        doc_id = str(dispatch_item.get("doc_id") or "")
        base_route = str(workflow_item.get("base_route") or "")
        if base_route == "deferred":
            status = "not_executed"
        elif base_route == "technical_hold":
            status = "routed_hold"
        elif doc_id and (corpus_dir / doc_id).is_dir() and not (corpus_dir / doc_id).is_symlink():
            status = "succeeded"
        else:
            status = "planned"
        items.append({
            "item_id": str(workflow_item["queue_item_id"]),
            "doc_id": doc_id,
            "url": str(workflow_item.get("url") or ""),
            "status": status,
            "base_route": base_route,
            "specialist_routes": [
                str(value.get("route") or "")
                for value in dispatch_item.get("specialists") or []
            ],
        })
    stable = {
        "schema_version": WORKFLOW_INPUT_SCHEMA_VERSION,
        "batch_id": binding["workflow_batch_id"],
        "workflow_binding": binding,
        "items": items,
    }
    payload = {
        **stable,
        "generated_at": _now(),
        "evidence_fingerprint": canonical_fingerprint(stable),
    }
    validate_workflow_outcome_input(payload, workflow, dispatch, corpus_dir=corpus_dir)
    return payload


def batch_outcome_content_projection(outcome: dict[str, Any]) -> dict[str, Any]:
    """Return the complete stored content except its self-referential hash."""
    stable = json.loads(json.dumps(outcome, ensure_ascii=False))
    stable.pop("content_fingerprint", None)
    stable.pop("generated_at", None)
    return stable


def batch_outcome_content_fingerprint(outcome: dict[str, Any]) -> str:
    return canonical_fingerprint(batch_outcome_content_projection(outcome))


def route_plan_content_fingerprint(route_plan: dict[str, Any]) -> str:
    stable = json.loads(json.dumps(route_plan, ensure_ascii=False))
    stable.pop("content_fingerprint", None)
    return canonical_fingerprint(stable)


def validate_route_plan(route_plan: dict[str, Any], outcome: dict[str, Any]) -> None:
    """Validate that an immutable route plan is the exact sibling of its outcome."""
    if not isinstance(route_plan, dict) or route_plan.get("schema_version") not in {
        ROUTE_SCHEMA_VERSION, BOUND_ROUTE_SCHEMA_VERSION,
    }:
        raise ValueError("Unsupported Batch Outcome route-plan schema")
    if (
        route_plan.get("audit_id") != outcome.get("audit_id")
        or route_plan.get("batch_id") != outcome.get("batch_id")
    ):
        raise ValueError("Batch Outcome route plan identity differs from its outcome")
    routes = route_plan.get("routes")
    held_routes = route_plan.get("held_routes")
    if not isinstance(routes, list) or not isinstance(held_routes, list):
        raise ValueError("Batch Outcome route-plan rows are malformed")
    expected = [{
        "item_id": row["item_id"],
        "doc_id": row["doc_id"],
        "primary_outcome": row["primary_outcome"],
        "review_assignment": row["review_assignment"],
        "specialist_routes": row["specialist_routes"],
        "stages": row["stages"],
        "publication_readiness": row["publication_readiness"],
        **ROUTES[row["primary_outcome"]],
    } for row in outcome.get("items") or [] if isinstance(row, dict)]
    if routes != expected:
        raise ValueError("Batch Outcome route-plan accounting differs from its outcome")
    expected_held = [{
        "item_id": row["item_id"],
        "url": row["url"],
        "primary_outcome": row["primary_outcome"],
        "specialist_routes": row["specialist_routes"],
        "action": "attended_specialist_processing",
        "human_attention": "route_required",
    } for row in outcome.get("routed_holds") or [] if isinstance(row, dict)]
    if held_routes != expected_held:
        raise ValueError("Batch Outcome held-route accounting differs from its outcome")
    is_bound = route_plan.get("schema_version") == BOUND_ROUTE_SCHEMA_VERSION
    if is_bound:
        if (
            route_plan.get("workflow_binding") != outcome.get("workflow_binding")
            or route_plan.get("outcome_content_fingerprint") != outcome.get("content_fingerprint")
        ):
            raise ValueError("Bound route plan differs from its Batch Outcome binding")
        fingerprint = str(route_plan.get("content_fingerprint") or "")
        if not valid_fingerprint(fingerprint) or fingerprint != route_plan_content_fingerprint(route_plan):
            raise ValueError("Bound route-plan content fingerprint does not match stored content")
    elif route_plan.get("workflow_binding") is not None or route_plan.get("content_fingerprint") is not None:
        raise ValueError("Legacy route-plan schema cannot claim a bound content identity")


def validate_batch_outcome(
    outcome: dict[str, Any], *, workflow: dict[str, Any] | None = None,
    dispatch: dict[str, Any] | None = None, corpus_dir: Path | None = None,
    require_bound: bool = False,
) -> None:
    """Strictly validate accounting, fingerprints, and optional workflow binding."""
    if not isinstance(outcome, dict) or outcome.get("schema_version") not in {
        SCHEMA_VERSION, BOUND_SCHEMA_VERSION,
    }:
        raise ValueError("Unsupported Batch Outcome schema")
    items = outcome.get("items")
    summary = outcome.get("summary")
    if not isinstance(items, list) or not isinstance(summary, dict):
        raise ValueError("Batch Outcome items/summary are malformed")
    item_ids = [str(row.get("item_id") or "") for row in items if isinstance(row, dict)]
    if len(item_ids) != len(items) or not all(item_ids) or len(set(item_ids)) != len(item_ids):
        raise ValueError("Batch Outcome item IDs must be unique and non-empty")
    if summary.get("expected_items") != len(items) or summary.get("accounted_for") != len(items):
        raise ValueError("Batch Outcome accounting does not match its items")
    evidence_fingerprint = str(outcome.get("evidence_fingerprint") or "")
    if not valid_fingerprint(evidence_fingerprint):
        raise ValueError("Batch Outcome evidence fingerprint is malformed")
    if not str(outcome.get("audit_id") or "").endswith(evidence_fingerprint[:12]):
        raise ValueError("Batch Outcome audit ID is not bound to its evidence fingerprint")
    content_fingerprint = str(outcome.get("content_fingerprint") or "")
    if content_fingerprint:
        if not valid_fingerprint(content_fingerprint):
            raise ValueError("Batch Outcome content fingerprint is malformed")
        if content_fingerprint != batch_outcome_content_fingerprint(outcome):
            raise ValueError("Batch Outcome content fingerprint does not match stored content")
    binding = outcome.get("workflow_binding")
    is_bound_schema = outcome.get("schema_version") == BOUND_SCHEMA_VERSION
    if is_bound_schema and (not isinstance(binding, dict) or not content_fingerprint):
        raise ValueError("Bound Batch Outcome lacks its workflow binding/content fingerprint")
    if not is_bound_schema and binding is not None:
        raise ValueError("Legacy Batch Outcome schema cannot claim a workflow binding")
    if require_bound and not is_bound_schema:
        raise ValueError("Batch Outcome is not a bound v2.2 artifact")
    if require_bound and (not isinstance(binding, dict) or not content_fingerprint):
        raise ValueError("Batch Outcome lacks a verifiable workflow binding/content fingerprint")
    if binding is not None:
        if not isinstance(binding, dict) or set(binding) != {
            "workflow_batch_id", "workflow_fingerprint", "dispatch_fingerprint",
        }:
            raise ValueError("Batch Outcome workflow binding is malformed")
        if not valid_fingerprint(binding.get("workflow_fingerprint")) or not valid_fingerprint(binding.get("dispatch_fingerprint")):
            raise ValueError("Batch Outcome workflow binding fingerprints are malformed")
        if outcome.get("batch_id") != binding.get("workflow_batch_id"):
            raise ValueError("Batch Outcome batch ID differs from its workflow binding")
        for row in items:
            if not isinstance(row.get("artifact_state"), dict):
                raise ValueError("Bound Batch Outcome item lacks source-artifact fingerprint state")
    if workflow is not None or dispatch is not None:
        if workflow is None or dispatch is None:
            raise ValueError("Workflow and dispatch must be supplied together")
        expected_binding = workflow_binding(workflow, dispatch, corpus_dir=corpus_dir)
        if binding != expected_binding:
            raise ValueError("Batch Outcome is not bound to the supplied workflow/dispatch")
        expected_ids = [str(row["queue_item_id"]) for row in workflow["items"]]
        if item_ids != expected_ids:
            raise ValueError("Batch Outcome item order differs from the supplied workflow")
        expected_docs = [str(row.get("doc_id") or "") for row in dispatch["items"]]
        actual_docs = [str(row.get("doc_id") or "") for row in items]
        if actual_docs != expected_docs:
            raise ValueError("Batch Outcome document order differs from the supplied dispatch")


def load_policy(path: Path | None = None) -> dict[str, Any]:
    """Load and minimally validate an adjustable routing policy."""
    policy = dict(DEFAULT_POLICY)
    if path is not None:
        supplied = _read_json(Path(path), None)
        if not isinstance(supplied, dict):
            raise ValueError(f"Policy is not valid JSON object: {path}")
        policy.update(supplied)
    version = str(policy.get("policy_version") or "").strip()
    if not version:
        raise ValueError("Policy must define a non-empty policy_version")
    for field in (
        "required_capture_artifacts", "required_analysis_artifacts",
        "required_enrichment_artifacts", "testimony_types", "legal_types",
        "specialist_flags", "proposal_fields", "failed_ledger_statuses",
        "deferred_ledger_statuses",
    ):
        value = policy.get(field)
        if not isinstance(value, list) or not all(isinstance(item, str) and item for item in value):
            raise ValueError(f"Policy field {field} must be a list of non-empty strings")
    unknown_flags = sorted(set(policy["specialist_flags"]) - set(_SPECIALIST_ROUTES))
    if unknown_flags:
        raise ValueError(f"Policy contains unsupported specialist flags: {', '.join(unknown_flags)}")
    for field in ("review_group_limit", "recurrence_threshold"):
        try:
            value = int(policy.get(field))
        except (TypeError, ValueError):
            raise ValueError(f"Policy field {field} must be an integer") from None
        if value < 1:
            raise ValueError(f"Policy field {field} must be positive")
    return policy


def write_default_policy(path: Path) -> Path:
    """Write a researcher-editable copy of the default policy."""
    return atomic_write_json(Path(path), DEFAULT_POLICY)


def _slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "-", value).strip("-") or "unknown"


def _artifact_state(doc_dir: Path, names: list[str]) -> dict[str, dict[str, Any]]:
    state: dict[str, dict[str, Any]] = {}
    for name in sorted(set(names)):
        path = doc_dir / name
        state[name] = {
            "present": path.is_file(),
            "sha256": _file_hash(path) if path.is_file() else "",
        }
    return state


def _proposal_count(enrichment: dict, fields: list[str]) -> int:
    count = 0
    for field in fields:
        rows = enrichment.get(field) or []
        if isinstance(rows, list):
            count += sum(
                1 for row in rows
                if isinstance(row, dict)
                and not row.get("rejected")
                and not row.get("pushed_to_sanity")
            )
    return count


def _proposal_summary(enrichment: dict, fields: list[str]) -> dict[str, Any]:
    """Count every real enrichment family without making a review decision."""
    counts: dict[str, int] = {}
    actionable: dict[str, int] = {}
    for field in fields:
        rows = enrichment.get(field) or []
        valid = [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
        counts[field] = len(valid)
        actionable[field] = sum(
            1 for row in valid
            if not row.get("rejected") and not row.get("pushed_to_sanity")
        )
    return {
        "counts_by_family": counts,
        "actionable_by_family": actionable,
        "total": sum(counts.values()),
        "actionable_total": sum(actionable.values()),
    }


def _normalise_input(path: Path, payload: dict) -> tuple[str, str, list[dict]]:
    """Adapt a batch ledger, worker report, or result manifest to one item list."""
    if (
        payload.get("schema_version") == WORKFLOW_INPUT_SCHEMA_VERSION
        and isinstance(payload.get("items"), list)
        and payload.get("batch_id")
    ):
        return "workflow_projection", str(payload["batch_id"]), payload["items"]
    if isinstance(payload.get("items"), list) and payload.get("batch_id"):
        return "batch_ledger", str(payload["batch_id"]), payload["items"]

    package_id = str(payload.get("package_id") or "").strip()
    documents = payload.get("documents")
    if package_id and isinstance(documents, list):
        rows: list[dict] = []
        for doc in documents:
            if not isinstance(doc, dict):
                continue
            doc_id = str(doc.get("doc_id") or "")
            rows.append({
                "item_id": str(doc.get("queue_item_id") or doc_id),
                "doc_id": doc_id,
                "url": str(doc.get("source_url") or ""),
                "status": str(doc.get("status") or "succeeded"),
                "error": str(doc.get("error") or ""),
                "stages": doc.get("stages") if isinstance(doc.get("stages"), dict) else {},
            })
        omitted = payload.get("omitted_documents") or []
        if isinstance(omitted, list):
            for doc in omitted:
                if not isinstance(doc, dict):
                    continue
                doc_id = str(doc.get("doc_id") or "")
                rows.append({
                    "item_id": str(doc.get("queue_item_id") or doc_id),
                    "doc_id": doc_id,
                    "url": str(doc.get("source_url") or ""),
                    "status": "failed",
                    "error": str(doc.get("error") or "Worker omitted this failed document"),
                    "stages": doc.get("stages") if isinstance(doc.get("stages"), dict) else {},
                })
        kind = "worker_report" if "worker_status" in payload else "result_manifest"
        return kind, package_id, rows
    raise ValueError(f"Unsupported batch/worker input: {path}")


def _routed_holds(payload: dict) -> list[dict]:
    """Return specialist-held manifest rows separately from the ≤15 execution items."""
    manifest = payload.get("manifest") if isinstance(payload.get("manifest"), dict) else {}
    excluded = manifest.get("excluded") if isinstance(manifest, dict) else []
    if not isinstance(excluded, list):
        return []
    rows = []
    for item in excluded:
        if not isinstance(item, dict):
            continue
        reason = str(item.get("exclusion_reason") or "")
        if not reason.startswith("needs_review:"):
            continue
        rows.append({
            "item_id": str(item.get("item_id") or ""),
            "doc_id": str(item.get("doc_id") or ""),
            "url": str(item.get("url") or ""),
            "status": "routed_hold",
            "error": reason,
        })
    return rows


def _read_queue_snapshot(corpus_dir: Path) -> dict[str, dict[str, Any]]:
    """Read triage decisions without opening the SQLite database for writes."""
    db_path = Path(corpus_dir).parent / "source_queue.db"
    if not db_path.is_file():
        return {}
    uri = f"file:{db_path.resolve()}?mode=ro"
    db = None
    try:
        db = sqlite3.connect(uri, uri=True)
        db.row_factory = sqlite3.Row
        columns = {str(row[1]) for row in db.execute("PRAGMA table_info(source_queue)")}
        wanted = [
            "id", "url", "url_hash", "corpus_doc_id", "doc_type_hint",
            "suggested_process_route", "needs_media_review",
            "needs_testimony_review", "needs_legal_review", "needs_book_splitting",
        ]
        selected = [name for name in wanted if name in columns]
        if not selected:
            return {}
        rows = [dict(row) for row in db.execute(f"SELECT {', '.join(selected)} FROM source_queue")]
    except sqlite3.Error:
        return {}
    finally:
        try:
            if db is not None:
                db.close()
        except Exception:
            pass
    snapshot: dict[str, dict[str, Any]] = {}
    for row in rows:
        for key in (row.get("id"), row.get("corpus_doc_id"), row.get("url_hash"), row.get("url")):
            if key:
                snapshot[str(key)] = row
    return snapshot


def _queue_row_for_item(
    item: dict,
    doc_dir: Path | None,
    queue_snapshot: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    source_item = _read_json(doc_dir / "source_item.json", {}) if doc_dir else {}
    offload = _read_json(doc_dir / "offload_import.json", {}) if doc_dir else {}
    candidates = [
        item.get("item_id"), item.get("doc_id"), item.get("url"),
        source_item.get("queue_item_id"), source_item.get("url_hash"), source_item.get("url"),
        offload.get("queue_item_id"), offload.get("url_hash"), offload.get("source_url"),
    ]
    for key in candidates:
        if key and str(key) in queue_snapshot:
            return dict(queue_snapshot[str(key)])
    # Offload packages preserve the suggested route even when the queue DB is
    # unavailable, so retain that provenance without inventing individual flags.
    if isinstance(source_item, dict) and source_item:
        return {
            "id": str(source_item.get("queue_item_id") or ""),
            "url": str(source_item.get("url") or ""),
            "url_hash": str(source_item.get("url_hash") or ""),
            "suggested_process_route": str(source_item.get("suggested_process_route") or ""),
        }
    return {}


_SPECIALIST_ROUTES = {
    "needs_media_review": ("media_report", "existing media extraction/evidence report", "policy_after_tool"),
    "needs_testimony_review": ("testimony_candidates_and_deep_review", "existing testimony candidate and consent-aware review", "required"),
    "needs_legal_review": ("legal_review", "legal review", "required"),
    "needs_book_splitting": ("longform_build_and_review", "existing longform build and section analysis", "policy_after_tool"),
}


def _specialist_status(flag: str, doc_dir: Path | None) -> tuple[str, str]:
    if doc_dir is None or not doc_dir.is_dir():
        return "waiting_for_base_processing", "No corpus document exists yet."
    route_by_flag = {
        "needs_testimony_review": "testimony",
        "needs_legal_review": "legal",
        "needs_book_splitting": "longform",
        "needs_media_review": "media",
    }
    route = route_by_flag.get(flag)
    if route:
        result = validate_specialist(doc_dir, route)
        return str(result["status"]), str(result["detail"] or result["completion_rule"])
    return "pending", "No completion rule exists."


def _specialist_routes(flags: list[str], doc_dir: Path | None) -> list[dict[str, str]]:
    routes = []
    for flag in flags:
        route, reason, attention = _SPECIALIST_ROUTES[flag]
        status, status_reason = _specialist_status(flag, doc_dir)
        routes.append({
            "flag": flag,
            "route": route,
            "reason": reason,
            "status": status,
            "status_reason": status_reason,
            "human_attention": attention,
        })
    return routes


_DISPATCH_ROUTE_META = {
    "media": ("needs_media_review", "media_report", "frozen media review route", "policy_after_tool"),
    "testimony": ("needs_testimony_review", "testimony_candidates_and_deep_review", "frozen consent-aware testimony route", "required"),
    "legal": ("needs_legal_review", "legal_review", "frozen legal review route", "required"),
    "longform": ("needs_book_splitting", "longform_build_and_review", "frozen longform route", "policy_after_tool"),
    "second_opinion": ("needs_second_opinion", "second_opinion", "frozen second-opinion route", "researcher_decision"),
}


def _dispatch_specialist_routes(route_names: list[str], doc_dir: Path | None) -> list[dict[str, str]]:
    """Project exact frozen dispatch routes through current artifact validators."""
    rows: list[dict[str, str]] = []
    for route_name in route_names:
        if route_name not in _DISPATCH_ROUTE_META:
            raise ValueError(f"Unsupported frozen specialist route: {route_name}")
        flag, public_route, reason, attention = _DISPATCH_ROUTE_META[route_name]
        if doc_dir is None or not doc_dir.is_dir():
            status, detail = "waiting_for_base_processing", "No corpus document exists yet."
        else:
            validated = validate_specialist(doc_dir, route_name)
            status = str(validated.get("status") or "unknown")
            detail = str(validated.get("detail") or validated.get("completion_rule") or "")
        rows.append({
            "flag": flag,
            "route": public_route,
            "dispatch_route": route_name,
            "reason": reason,
            "status": status,
            "status_reason": detail,
            "human_attention": attention,
        })
    return rows


def _stage_matrix(doc_dir: Path | None, specialist_routes: list[dict]) -> dict[str, dict[str, Any]]:
    """Return explicit local stage state without treating absence as hidden success."""
    def stage(status: str, *, required: bool, evidence: list[str], detail: str = "") -> dict:
        return {"status": status, "required": required, "evidence": evidence, "detail": detail}

    if doc_dir is None or not doc_dir.is_dir():
        return {
            name: stage("waiting", required=required, evidence=[])
            for name, required in (
                ("acquisition", True), ("preservation", False), ("extraction", True),
                ("citation_units", True), ("analysis", True), ("enrichment", True),
                ("embedding", True), ("specialist", False), ("second_opinion", False), ("import", False),
                ("sanity_upload", False), ("supabase_upload", False),
            )
        }
    validated = {
        name: validate_stage(doc_dir, name)
        for name in ("acquisition", "extraction", "citation_units", "analysis", "enrichment", "embedding")
    }
    preservation = validate_preservation_stage(doc_dir)
    ordinary_specialists = [
        route for route in specialist_routes if route.get("dispatch_route") != "second_opinion"
    ]
    second_opinions = [
        route for route in specialist_routes if route.get("dispatch_route") == "second_opinion"
    ]
    specialist_statuses = [str(route.get("status") or "") for route in ordinary_specialists]
    if not ordinary_specialists:
        specialist_status = "not_applicable"
    elif all(value == "complete" for value in specialist_statuses):
        specialist_status = "complete"
    else:
        precedence = (
            "invalid", "stale", "waiting_for_base_processing", "human_required",
            "in_progress", "ready_for_report", "pending",
        )
        specialist_status = next(
            (value for value in precedence if value in specialist_statuses),
            "pending",
        )
    second_status = (
        str(second_opinions[0].get("status") or "unknown")
        if second_opinions else "not_applicable"
    )
    return {
        "acquisition": stage(validated["acquisition"]["status"], required=True, evidence=validated["acquisition"]["evidence"], detail=validated["acquisition"]["detail"]),
        "preservation": stage(
            "not_recorded" if preservation["status"] == "missing" else preservation["status"],
            required=preservation["status"] in {"blocked", "invalid", "stale"},
            evidence=preservation["evidence"], detail=preservation["detail"],
        ),
        "extraction": stage(validated["extraction"]["status"], required=True, evidence=validated["extraction"]["evidence"], detail=validated["extraction"]["detail"]),
        "citation_units": stage(validated["citation_units"]["status"], required=True, evidence=validated["citation_units"]["evidence"], detail=validated["citation_units"]["detail"]),
        "analysis": stage(validated["analysis"]["status"], required=True, evidence=validated["analysis"]["evidence"], detail=validated["analysis"]["detail"]),
        "enrichment": stage(validated["enrichment"]["status"], required=True, evidence=validated["enrichment"]["evidence"], detail=validated["enrichment"]["detail"]),
        "embedding": stage(validated["embedding"]["status"], required=True, evidence=validated["embedding"]["evidence"], detail=validated["embedding"]["detail"]),
        "specialist": stage(specialist_status, required=bool(ordinary_specialists), evidence=[str(route.get("route") or "") for route in ordinary_specialists]),
        "second_opinion": stage(
            second_status, required=bool(second_opinions),
            evidence=["second_opinion"],
            detail=str(second_opinions[0].get("status_reason") or "") if second_opinions else "",
        ),
        "import": stage("complete" if (doc_dir / "offload_import.json").is_file() else "not_applicable", required=False, evidence=["offload_import.json"]),
        "sanity_upload": stage("complete" if (doc_dir / "sanity_record.json").is_file() else "pending", required=False, evidence=["sanity_record.json"]),
        "supabase_upload": stage(
            "complete" if (doc_dir / "supabase_record.json").is_file() else "not_recorded",
            required=False, evidence=["supabase_record.json"],
            detail="Absence of a local receipt does not prove the remote row is missing.",
        ),
    }


def _finding(code: str, message: str, *, severity: str, evidence: list[str]) -> dict:
    return {
        "code": code,
        "severity": severity,
        "message": message,
        "evidence": evidence,
    }


def _compile_item(
    item: dict,
    corpus_dir: Path,
    policy: dict,
    queue_snapshot: dict[str, dict[str, Any]],
) -> dict:
    item_id = str(item.get("item_id") or "")
    doc_id = str(item.get("doc_id") or "")
    status = str(item.get("status") or "planned")
    doc_dir = corpus_dir / doc_id if doc_id else None
    findings: list[dict] = []

    all_artifacts = [
        *policy["required_capture_artifacts"],
        *policy["required_analysis_artifacts"],
        *policy["required_enrichment_artifacts"],
        "embedding.json",
        "citation_units.json",
        "review_status.json",
        "testimony_review.json",
        "legal_review.json",
        "sanity_record.json", "worker_report.json", "offload_import.json",
        "supabase_record.json", "preservation_status.json", "enrichment_audit.json",
        "testimony_candidates.json", "testimony_segments.json",
        "longform_synthesis.json",
    ]
    artifacts = _artifact_state(doc_dir, all_artifacts) if doc_dir and doc_dir.is_dir() else {}

    if status in set(policy["failed_ledger_statuses"]):
        findings.append(_finding(
            "ledger_failed", str(item.get("error") or "Batch execution failed"),
            severity="error", evidence=["batch ledger"],
        ))
        outcome = "pipeline_exception"
    elif status in set(policy["deferred_ledger_statuses"]):
        findings.append(_finding(
            "not_processed", f"Ledger status is {status}", severity="info", evidence=["batch ledger"],
        ))
        outcome = "deferred"
    elif not doc_id or not doc_dir or not doc_dir.is_dir():
        findings.append(_finding(
            "corpus_document_missing", "The ledger does not resolve to a local corpus directory.",
            severity="error", evidence=["batch ledger"],
        ))
        outcome = "capture_exception"
    else:
        intake = _read_json(doc_dir / "intake.json", {})
        analysis = _read_json(doc_dir / "analysis.json", {})
        audit = _read_json(doc_dir / "analysis_audit.json", {})
        enrichment = _read_json(doc_dir / "enrichment.json", {})
        intake = intake if isinstance(intake, dict) else {}
        analysis = analysis if isinstance(analysis, dict) else {}
        audit = audit if isinstance(audit, dict) else {}
        enrichment = enrichment if isinstance(enrichment, dict) else {}

        missing_capture = [n for n in policy["required_capture_artifacts"] if not artifacts[n]["present"]]
        missing_analysis = [n for n in policy["required_analysis_artifacts"] if not artifacts[n]["present"]]
        missing_enrichment = [n for n in policy["required_enrichment_artifacts"] if not artifacts[n]["present"]]
        queue_row = _queue_row_for_item(item, doc_dir, queue_snapshot)
        types = {
            str(analysis.get("type") or ""),
            str(analysis.get("primary_type") or ""),
            str(analysis.get("secondary_type") or ""),
        }
        testimony = bool(analysis.get("testimony_flag")) or bool(types & set(policy["testimony_types"]))
        legal = bool(types & set(policy["legal_types"]))
        detected_flags = {
            flag for flag in policy["specialist_flags"]
            if bool(queue_row.get(flag) or intake.get(flag) or analysis.get(flag))
        }
        if testimony:
            detected_flags.add("needs_testimony_review")
        if legal:
            detected_flags.add("needs_legal_review")
        specialist_flags = sorted(detected_flags)
        audit_errors = audit.get("errors") if isinstance(audit.get("errors"), list) else []
        proposal_summary = _proposal_summary(enrichment, policy["proposal_fields"])
        core_validation = {
            name: validate_stage(doc_dir, name)
            for name in ("acquisition", "extraction", "analysis", "enrichment")
        }
        preservation_validation = validate_preservation_stage(doc_dir)

        capture_bad = [
            name for name in ("acquisition", "extraction")
            if core_validation[name]["status"] in {"missing", "invalid", "stale"}
        ]
        analysis_bad = [
            name for name in ("analysis", "enrichment")
            if core_validation[name]["status"] in {"missing", "invalid", "stale"}
        ]
        if preservation_validation["status"] in {"blocked", "invalid", "stale"}:
            findings.append(_finding(
                "preservation_exception",
                f"Preservation is {preservation_validation['status']}: {preservation_validation['detail']}",
                severity="error",
                evidence=preservation_validation.get("evidence") or ["preservation_status.json"],
            ))
            outcome = "capture_exception"
        elif missing_capture or capture_bad:
            detail_parts = []
            if missing_capture:
                detail_parts.append(f"Missing capture artifacts: {', '.join(missing_capture)}")
            if capture_bad:
                detail_parts.append(
                    "Invalid/stale capture stages: " + ", ".join(
                        f"{name}={core_validation[name]['status']}" for name in capture_bad
                    )
                )
            findings.append(_finding(
                "capture_incomplete", "; ".join(detail_parts),
                severity="error", evidence=sorted(set([*missing_capture, *capture_bad])),
            ))
            outcome = "capture_exception"
        elif missing_analysis or audit_errors or "analysis" in analysis_bad:
            detail = (
                f"Missing analysis artifacts: {', '.join(missing_analysis)}"
                if missing_analysis else f"Analysis audit reports {len(audit_errors)} error(s)"
                if audit_errors else f"Analysis validator reports {core_validation['analysis']['status']}: {core_validation['analysis']['detail']}"
            )
            findings.append(_finding(
                "analysis_incomplete", detail, severity="error",
                evidence=[*missing_analysis, "analysis_audit.json"],
            ))
            outcome = "reprocess_recommended"
        elif missing_enrichment or "enrichment" in analysis_bad:
            detail = (
                f"Missing enrichment artifacts: {', '.join(missing_enrichment)}"
                if missing_enrichment else
                f"Enrichment validator reports {core_validation['enrichment']['status']}: {core_validation['enrichment']['detail']}"
            )
            findings.append(_finding(
                "enrichment_incomplete", detail,
                severity="warning", evidence=missing_enrichment or ["enrichment", "enrichment_audit.json"],
            ))
            outcome = "reprocess_recommended"
        else:
            outcome = "ordinary_ready"

        if testimony:
            findings.append(_finding(
                "testimony_sensitive", "Testimony needs consent-aware review before public release.",
                severity="critical", evidence=["analysis.json", "testimony_review.json"],
            ))
        if legal:
            findings.append(_finding(
                "legal_sensitive", "The document type requires the existing legal-review lane.",
                severity="warning", evidence=["analysis.json", "legal_review.json"],
            ))
        if specialist_flags:
            findings.append(_finding(
                "specialist_routes", f"Existing specialist route(s): {', '.join(specialist_flags)}",
                severity="warning", evidence=["source_queue.db", "analysis.json"],
            ))
        if proposal_summary["actionable_total"]:
            findings.append(_finding(
                "knowledge_candidates",
                f"{proposal_summary['actionable_total']} provisional knowledge candidate(s) retained for consolidation.",
                severity="info", evidence=["enrichment.json"],
            ))

        readiness = assess_publication_readiness(doc_dir)
        if not readiness.get("ready"):
            findings.append(_finding(
                "publication_not_ready",
                "No public release lane is ready; this does not block local research use.",
                severity="info", evidence=["publication-gate-v2.0"],
            ))

    queue_row = _queue_row_for_item(item, doc_dir, queue_snapshot)
    proposal_summary = (
        _proposal_summary(_read_json(doc_dir / "enrichment.json", {}), policy["proposal_fields"])
        if doc_dir and doc_dir.is_dir() else _proposal_summary({}, policy["proposal_fields"])
    )
    specialist_flags = sorted(
        flag for flag in policy["specialist_flags"]
        if bool(queue_row.get(flag))
    )
    if doc_dir and doc_dir.is_dir():
        analysis = _read_json(doc_dir / "analysis.json", {})
        intake = _read_json(doc_dir / "intake.json", {})
        types = {
            str(analysis.get("type") or ""), str(analysis.get("primary_type") or ""),
            str(analysis.get("secondary_type") or ""),
        } if isinstance(analysis, dict) else set()
        for flag in policy["specialist_flags"]:
            if (
                isinstance(intake, dict) and intake.get(flag)
            ) or (
                isinstance(analysis, dict) and analysis.get(flag)
            ):
                specialist_flags = sorted(set(specialist_flags) | {flag})
        if isinstance(analysis, dict) and (
            analysis.get("testimony_flag") or types & set(policy["testimony_types"])
        ):
            specialist_flags = sorted(set(specialist_flags) | {"needs_testimony_review"})
        if types & set(policy["legal_types"]):
            specialist_flags = sorted(set(specialist_flags) | {"needs_legal_review"})
    specialist_routes = _specialist_routes(specialist_flags, doc_dir)
    frozen_route_names = [str(value) for value in item.get("specialist_routes") or []]
    frozen_routes = _dispatch_specialist_routes(frozen_route_names, doc_dir)
    existing_route_names = {str(row.get("route") or "") for row in specialist_routes}
    specialist_routes.extend(
        row for row in frozen_routes if str(row.get("route") or "") not in existing_route_names
    )
    validator_route_by_flag = {
        "needs_media_review": "media",
        "needs_testimony_review": "testimony",
        "needs_legal_review": "legal",
        "needs_book_splitting": "longform",
        "needs_second_opinion": "second_opinion",
    }
    if doc_dir and doc_dir.is_dir():
        specialist_evidence: set[str] = set()
        for row in specialist_routes:
            validator_route = str(
                row.get("dispatch_route")
                or validator_route_by_flag.get(str(row.get("flag") or ""), "")
            )
            if not validator_route:
                continue
            validation = validate_specialist(doc_dir, validator_route)
            specialist_evidence.update(str(value) for value in validation.get("evidence") or [])
            specialist_evidence.update(str(value) for value in validation.get("dependencies") or [])
        artifacts.update(_artifact_state(doc_dir, list(specialist_evidence)))
    unresolved_specialists = [
        row for row in specialist_routes
        if str(row.get("status") or "") not in {"complete", "not_applicable"}
    ]
    if unresolved_specialists:
        findings.append(_finding(
            "specialist_attention",
            "Frozen or triage-selected specialist work remains visible: "
            + ", ".join(
                f"{row.get('route')}={row.get('status')}" for row in unresolved_specialists
            ),
            severity="warning",
            evidence=[str(row.get("route") or "") for row in unresolved_specialists],
        ))
    stages = _stage_matrix(doc_dir, specialist_routes)
    publication = (
        assess_publication_readiness(doc_dir)
        if doc_dir and doc_dir.is_dir() else {
            "ready": False,
            "recommended_lane": "not_available",
            "lanes": {},
            "blockers": ["No local corpus document exists."],
        }
    )
    return {
        "item_id": item_id,
        "doc_id": doc_id,
        "url": str(item.get("url") or ""),
        "ledger_status": status,
        "primary_outcome": outcome,
        "findings": findings,
        "artifact_state": artifacts,
        "triage": {
            "queue_item_id": str(queue_row.get("id") or item_id),
            "suggested_process_route": str(queue_row.get("suggested_process_route") or ""),
            "specialist_flags": specialist_flags,
            "source": "source_queue" if queue_row.get("id") else ("source_item" if queue_row else "unavailable"),
        },
        "specialist_routes": specialist_routes,
        "stages": stages,
        "publication_readiness": publication,
        "knowledge_candidates": proposal_summary,
        "review_assignment": {"lane": "not_assigned", "group_count": 0},
    }


ROUTES: dict[str, dict[str, str]] = {
    "ordinary_ready": {"action": "local_research_ready", "human_attention": "policy_only"},
    "capture_exception": {"action": "repair_source_capture", "human_attention": "exception"},
    "pipeline_exception": {"action": "inspect_and_retry_pipeline", "human_attention": "exception"},
    "reprocess_recommended": {"action": "reprocess_missing_or_failed_stage", "human_attention": "exception"},
    "deferred": {"action": "leave_in_queue", "human_attention": "none"},
}


def _previous_snapshot(
    batch_root: Path, audit_id: str,
    *, workflow_binding_value: dict[str, str] | None = None,
) -> dict:
    candidates = sorted(
        (p for p in (batch_root / "audits").glob("*/batch_outcome.json") if p.parent.name != audit_id),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for candidate in candidates:
        previous, _ = _read_json_snapshot(candidate)
        if workflow_binding_value is not None:
            if previous.get("workflow_binding") is None:
                continue
            validate_batch_outcome(previous, require_bound=True)
            if previous.get("workflow_binding") != workflow_binding_value:
                continue
        else:
            if previous.get("workflow_binding") is not None:
                continue
            validate_batch_outcome(previous)
        return previous
    return {}


def _changes(previous: dict, current_items: list[dict]) -> dict:
    def state(row: dict) -> dict:
        return {
            "primary_outcome": row.get("primary_outcome"),
            "specialist_routes": sorted((
                {
                    "route": str(route.get("route") or ""),
                    "status": str(route.get("status") or ""),
                }
                for route in row.get("specialist_routes", [])
                if isinstance(route, dict)
            ), key=lambda value: (value["route"], value["status"])),
            "review_lane": (row.get("review_assignment") or {}).get("lane"),
            "stage_statuses": {
                name: stage.get("status")
                for name, stage in sorted((row.get("stages") or {}).items())
                if isinstance(stage, dict)
            },
            "publication_lane": (row.get("publication_readiness") or {}).get("recommended_lane"),
            "knowledge_actionable": (row.get("knowledge_candidates") or {}).get("actionable_total", 0),
        }

    old = {row.get("item_id"): state(row) for row in previous.get("items", [])}
    current = {row["item_id"]: state(row) for row in current_items}
    changed = [
        {"item_id": item_id, "from": old[item_id], "to": current[item_id]}
        for item_id in sorted(set(old) & set(current)) if old[item_id] != current[item_id]
    ]
    return {
        "previous_audit_id": str(previous.get("audit_id") or ""),
        "changed": changed,
        "added_item_ids": sorted(set(current) - set(old)),
        "removed_item_ids": sorted(set(old) - set(current)),
    }


def format_batch_outcome_markdown(outcome: dict, route_plan: dict) -> str:
    counts = outcome["summary"]["outcome_counts"]
    lines = [
        f"# Batch Outcome: {outcome['batch_id']}", "",
        f"Audit: `{outcome['audit_id']}`  ",
        f"Policy: `{outcome['policy']['policy_version']}`  ",
        f"Evidence fingerprint: `{outcome['evidence_fingerprint']}`  ",
        f"Generated: {outcome['generated_at']}", "", "## Summary", "",
        f"- Accounted for: {outcome['summary']['accounted_for']} of {outcome['summary']['expected_items']} items",
        f"- Specialist-held source candidates: {outcome['summary'].get('routed_holds', 0)}",
    ]
    lines.extend(f"- {name}: {counts[name]}" for name in sorted(counts))
    review_counts = outcome["summary"].get("review_lane_counts") or {}
    specialist_counts = outcome["summary"].get("specialist_route_counts") or {}
    lines.extend(["", "### Research review lanes", ""])
    lines.extend(f"- {name}: {review_counts[name]}" for name in sorted(review_counts))
    if specialist_counts:
        lines.extend(["", "### Existing specialist workflows", ""])
        lines.extend(f"- {name}: {specialist_counts[name]}" for name in sorted(specialist_counts))
    lines.extend(["", "## Routes", ""])
    for route in route_plan["routes"]:
        lines.append(
            f"- `{route['item_id']}` → **{route['primary_outcome']}** → "
            f"`{route['action']}` ({route['human_attention']})"
        )
    if route_plan.get("held_routes"):
        lines.extend(["", "### Triage-held specialist sources", ""])
        for route in route_plan["held_routes"]:
            specialists = ", ".join(
                str(item.get("route") or "") for item in route.get("specialist_routes") or []
            ) or "specialist route unresolved"
            lines.append(f"- `{route['item_id']}` → `{specialists}` (not silently discarded)")
    change = outcome["changes_from_previous"]
    lines.extend(["", "## Re-audit comparison", ""])
    if not change["previous_audit_id"]:
        lines.append("No earlier audit snapshot exists for this batch.")
    elif not change["changed"] and not change["added_item_ids"] and not change["removed_item_ids"]:
        lines.append(f"No outcome changes since `{change['previous_audit_id']}`.")
    else:
        lines.append(f"Compared with `{change['previous_audit_id']}`:")
        for row in change["changed"]:
            lines.append(f"- `{row['item_id']}`: {row['from']} → {row['to']}")
    lines.extend(["", "This report plans routes only. It does not publish or execute them.", ""])
    return "\n".join(lines)


def _compile_batch_outcome_impl(
    ledger_path: Path,
    corpus_dir: Path,
    out_root: Path,
    *,
    policy_path: Path | None = None,
    workflow: dict[str, Any] | None = None,
    dispatch: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compile an immutable audit from a ledger, worker report, or result manifest."""
    ledger_path = Path(ledger_path)
    ledger, ledger_sha256 = _read_json_snapshot(ledger_path)
    input_kind, batch_id, items = _normalise_input(ledger_path, ledger)
    if (workflow is None) != (dispatch is None):
        raise ValueError("Workflow and dispatch must be supplied together for bound compilation")
    workflow_binding_value = (
        workflow_binding(workflow, dispatch, corpus_dir=corpus_dir)
        if workflow is not None and dispatch is not None else None
    )
    if workflow_binding_value is not None:
        if input_kind != "workflow_projection":
            raise ValueError("Only a workflow outcome input can produce a bound Batch Outcome")
        if ledger.get("workflow_binding") != workflow_binding_value:
            raise ValueError("Workflow outcome input binding differs from the requested binding")
        if set(workflow_binding_value) != {
            "workflow_batch_id", "workflow_fingerprint", "dispatch_fingerprint",
        } or not valid_fingerprint(workflow_binding_value.get("workflow_fingerprint")) \
                or not valid_fingerprint(workflow_binding_value.get("dispatch_fingerprint")):
            raise ValueError("Requested workflow binding is malformed")
        if workflow_binding_value.get("workflow_batch_id") != batch_id:
            raise ValueError("Workflow binding batch ID differs from compiler input")
        validate_workflow_outcome_input(
            ledger, workflow, dispatch, corpus_dir=corpus_dir,
        )
    elif input_kind == "workflow_projection":
        raise ValueError("Workflow outcome input requires an explicit validated workflow binding")
    item_ids = [str(row.get("item_id") or "") for row in items if isinstance(row, dict)]
    if len(item_ids) != len(items) or not all(item_ids) or len(set(item_ids)) != len(item_ids):
        raise ValueError("Every ledger item must have one unique, non-empty item_id")

    policy = load_policy(policy_path)
    queue_snapshot = _read_queue_snapshot(Path(corpus_dir))
    compiled_items = [
        _compile_item(row, Path(corpus_dir), policy, queue_snapshot) for row in items
    ]
    held_items = [
        _compile_item(row, Path(corpus_dir), policy, queue_snapshot)
        for row in _routed_holds(ledger)
    ] if input_kind == "batch_ledger" else []
    focus_doc_ids = {row["doc_id"] for row in compiled_items if row.get("doc_id")}
    exports_root = Path(out_root).parent
    identity_projection = None
    identity_snapshot = None
    identity_decisions = None
    identity_unavailable_reason = "No saved Phase 11B reviewed identity projection is available."
    identity_manifest = (
        exports_root / "review" / "source_identity" / "latest_source_identity.json"
    )
    try:
        # Phase 11B is optional for ongoing ingestion. Consume it only when the
        # saved base snapshot and every applicable append-only decision replay
        # exactly; missing, stale, or corrupt state safely yields null reviewed
        # family counts without blocking the rest of Batch Outcome compilation.
        candidate_snapshot = load_latest_identity_snapshot(exports_root)
        ledger = load_identity_decisions(exports_root)
        applicable, _stale = partition_identity_decisions(candidate_snapshot, ledger)
        candidate_projection = apply_identity_decisions(candidate_snapshot, applicable)
        validate_reviewed_identity_projection(
            candidate_projection, candidate_snapshot, applicable,
        )
        identity_snapshot = candidate_snapshot
        identity_decisions = applicable
        identity_projection = candidate_projection
        identity_unavailable_reason = ""
    except (OSError, ValueError, TypeError):
        if identity_manifest.exists():
            identity_unavailable_reason = (
                "Saved Phase 11B identity evidence or its decision ledger failed validation; "
                "reviewed family counts were withheld."
            )
    # Phase 12 visibility marker must predate every derived child write. Readers
    # can therefore keep showing the previous committed manifest while this
    # attempt builds memory, projections, and outcome artifacts.
    previous_compilation = load_latest_completed(exports_root, batch_id)
    compilation_attempt = begin_compilation_attempt(
        exports_root, batch_id, source="batch_outcome",
    )
    memory_result = build_provisional_memory(
        Path(corpus_dir),
        exports_root / "provisional_memory",
        label=batch_id,
        focus_doc_ids=focus_doc_ids,
        recurrence_threshold=int(policy.get("recurrence_threshold") or 3),
        identity_projection=identity_projection,
        identity_snapshot=identity_snapshot,
        identity_decisions=identity_decisions,
        identity_unavailable_reason=identity_unavailable_reason,
    )
    memory = memory_result["memory"]
    focused_memory_ids = set(memory.get("focused_cluster_ids") or [])
    projection_result = build_tag_projections(
        Path(corpus_dir),
        memory,
        exports_root / "tag_projections" / _slug(batch_id) / "latest_tag_projections.json",
        doc_ids=focus_doc_ids,
        write_doc_sidecars=False,
    )
    review_plan = build_review_plan(
        Path(corpus_dir),
        group_limit=int(policy.get("review_group_limit") or 25),
        recurrence_threshold=int(policy.get("recurrence_threshold") or 3),
        focus_doc_ids=focus_doc_ids,
    )
    selected_human_by_doc: dict[str, int] = {}
    deferred_human_by_doc: dict[str, int] = {}
    ai_by_doc: dict[str, int] = {}
    for group in review_plan.get("group_index") or []:
        target = (
            selected_human_by_doc
            if group.get("human_decision_required") and group.get("selected_for_current_review")
            else deferred_human_by_doc
            if group.get("human_decision_required")
            else ai_by_doc
        )
        for ref in group.get("references") or []:
            doc_id = str(ref.get("doc_id") or "")
            if doc_id in focus_doc_ids:
                target[doc_id] = target.get(doc_id, 0) + 1
    for row in compiled_items:
        doc_id = row["doc_id"]
        if selected_human_by_doc.get(doc_id):
            row["review_assignment"] = {
                "lane": "bounded_human_exception",
                "group_count": selected_human_by_doc[doc_id],
            }
        elif deferred_human_by_doc.get(doc_id):
            row["review_assignment"] = {
                "lane": "deferred_human_exception",
                "group_count": deferred_human_by_doc[doc_id],
            }
        elif row["knowledge_candidates"]["actionable_total"]:
            row["review_assignment"] = {
                "lane": "ai_managed_provisional",
                "group_count": ai_by_doc.get(doc_id, 0),
            }
        else:
            row["review_assignment"] = {"lane": "none", "group_count": 0}
    evidence_payload = {
        "ledger_sha256": ledger_sha256,
        "policy_sha256": _canonical_hash(policy),
        "input_kind": input_kind,
        "workflow_binding": workflow_binding_value,
        "review_memory": {
            "focus_doc_ids": review_plan.get("focus_doc_ids") or [],
            "recurrence_threshold": review_plan.get("recurrence_threshold"),
            "group_index": review_plan.get("group_index") or [],
        },
        "provisional_memory_fingerprint": memory.get("evidence_fingerprint"),
        "tag_projection_fingerprint": (projection_result.get("projection") or {}).get("evidence_fingerprint"),
        "queue_triage": [
            {"item_id": row["item_id"], "triage": row["triage"]}
            for row in [*compiled_items, *held_items]
        ],
        "items": [
            {"item_id": row["item_id"], "doc_id": row["doc_id"], "artifact_state": row["artifact_state"]}
            for row in compiled_items
        ],
        "routed_holds": [
            {"item_id": row["item_id"], "triage": row["triage"], "specialist_routes": row["specialist_routes"]}
            for row in held_items
        ],
    }
    fingerprint = _canonical_hash(evidence_payload)
    audit_id = f"{_slug(batch_id)}--{_slug(policy['policy_version'])}--{fingerprint[:12]}"
    batch_root = Path(out_root) / _slug(batch_id)
    snapshot_dir = batch_root / "audits" / audit_id
    snapshot_json = snapshot_dir / "batch_outcome.json"
    if snapshot_json.exists():
        existing, _ = _read_json_snapshot(snapshot_json)
        validate_batch_outcome(existing, require_bound=workflow_binding_value is not None)
        if workflow_binding_value is not None and existing.get("workflow_binding") != workflow_binding_value:
            raise ValueError("Existing immutable Batch Outcome has a conflicting workflow binding")
        existing_route, _ = _read_json_snapshot(snapshot_dir / "route_plan.json")
        validate_route_plan(existing_route, existing)
        existing_markdown = _read_text_snapshot(snapshot_dir / "batch_outcome.md")
        if existing_markdown != format_batch_outcome_markdown(existing, existing_route):
            raise ValueError("Existing immutable Batch Outcome Markdown differs from validated JSON")
        # Point the convenience projection at the audit explicitly requested,
        # even when that immutable snapshot was created by an earlier run.
        atomic_write_json(batch_root / "latest_batch_outcome.json", existing)
        atomic_write_json(batch_root / "latest_route_plan.json", existing_route)
        atomic_write_text(batch_root / "latest_batch_outcome.md", existing_markdown)
        compilation = publish_completed_compilation(
            exports_root,
            batch_id,
            [
                ("provisional_memory", Path((existing.get("provisional_memory") or {}).get("path") or memory_result["path"])),
                ("tag_projection", Path((existing.get("tag_projection") or {}).get("path") or projection_result["path"])),
                ("batch_outcome", snapshot_json),
                ("route_plan", snapshot_dir / "route_plan.json"),
                ("batch_outcome_markdown", snapshot_dir / "batch_outcome.md"),
            ],
            source="batch_outcome_reuse",
            previous_manifest=previous_compilation,
            attempt_id=compilation_attempt["attempt_id"],
        )
        return {
            "outcome": existing,
            "outcome_path": snapshot_json,
            "markdown_path": snapshot_dir / "batch_outcome.md",
            "route_plan_path": snapshot_dir / "route_plan.json",
            "provisional_memory_path": Path((existing.get("provisional_memory") or {}).get("path") or memory_result["path"]),
            "tag_projection_path": Path((existing.get("tag_projection") or {}).get("path") or projection_result["path"]),
            "reused": True,
            "compilation_manifest_path": compilation["manifest_path"],
        }

    previous = _previous_snapshot(
        batch_root, audit_id, workflow_binding_value=workflow_binding_value,
    )
    counts: dict[str, int] = {}
    for row in compiled_items:
        counts[row["primary_outcome"]] = counts.get(row["primary_outcome"], 0) + 1
    review_lane_counts: dict[str, int] = {}
    specialist_route_counts: dict[str, int] = {}
    stage_status_counts: dict[str, dict[str, int]] = {}
    for row in compiled_items:
        lane = str(row["review_assignment"].get("lane") or "none")
        review_lane_counts[lane] = review_lane_counts.get(lane, 0) + 1
        for route in row["specialist_routes"]:
            name = str(route.get("route") or "unknown")
            specialist_route_counts[name] = specialist_route_counts.get(name, 0) + 1
        for stage_name, stage in row["stages"].items():
            status = str(stage.get("status") or "unknown")
            bucket = stage_status_counts.setdefault(stage_name, {})
            bucket[status] = bucket.get(status, 0) + 1
    outcome = {
        "schema_version": BOUND_SCHEMA_VERSION if workflow_binding_value is not None else SCHEMA_VERSION,
        "audit_id": audit_id,
        "batch_id": batch_id,
        "generated_at": _now(),
        "ledger_path": str(ledger_path.resolve()),
        "input_kind": input_kind,
        "evidence_fingerprint": fingerprint,
        "policy": {"policy_version": policy["policy_version"], "sha256": _canonical_hash(policy)},
        "summary": {
            "expected_items": len(items),
            "accounted_for": len(compiled_items),
            "outcome_counts": counts,
            "review_lane_counts": review_lane_counts,
            "specialist_route_counts": specialist_route_counts,
            "stage_status_counts": stage_status_counts,
            "routed_holds": len(held_items),
        },
        "items": compiled_items,
        "routed_holds": held_items,
        "review_plan": review_plan,
        "provisional_memory": {
            "schema_version": memory.get("schema_version"),
            "evidence_fingerprint": memory.get("evidence_fingerprint"),
            "summary": memory.get("summary") or {},
            "clusters": [
                cluster for cluster in memory.get("clusters") or []
                if cluster.get("cluster_id") in focused_memory_ids
            ],
            "path": str(memory_result["path"]),
        },
        "tag_projection": {
            "schema_version": (projection_result.get("projection") or {}).get("schema_version"),
            "document_count": (projection_result.get("projection") or {}).get("document_count", 0),
            "evidence_fingerprint": (projection_result.get("projection") or {}).get("evidence_fingerprint"),
            "path": str(projection_result["path"]),
            "doc_sidecars_written": False,
        },
        "changes_from_previous": _changes(previous, compiled_items),
    }
    if workflow_binding_value is not None:
        outcome["workflow_binding"] = dict(workflow_binding_value)
        outcome["content_fingerprint"] = batch_outcome_content_fingerprint(outcome)
    if outcome["summary"]["accounted_for"] != outcome["summary"]["expected_items"]:
        raise RuntimeError("Batch accounting invariant failed")
    validate_batch_outcome(outcome, require_bound=workflow_binding_value is not None)

    route_plan = {
        "schema_version": BOUND_ROUTE_SCHEMA_VERSION if workflow_binding_value is not None else ROUTE_SCHEMA_VERSION,
        "audit_id": audit_id,
        "batch_id": batch_id,
        "policy_version": policy["policy_version"],
        "dry_run": True,
        "routes": [
            {
                "item_id": row["item_id"],
                "doc_id": row["doc_id"],
                "primary_outcome": row["primary_outcome"],
                "review_assignment": row["review_assignment"],
                "specialist_routes": row["specialist_routes"],
                "stages": row["stages"],
                "publication_readiness": row["publication_readiness"],
                **ROUTES[row["primary_outcome"]],
            }
            for row in compiled_items
        ],
        "held_routes": [
            {
                "item_id": row["item_id"],
                "url": row["url"],
                "primary_outcome": row["primary_outcome"],
                "specialist_routes": row["specialist_routes"],
                "action": "attended_specialist_processing",
                "human_attention": "route_required",
            }
            for row in held_items
        ],
    }
    if workflow_binding_value is not None:
        route_plan["workflow_binding"] = dict(workflow_binding_value)
        route_plan["outcome_content_fingerprint"] = outcome["content_fingerprint"]
        route_plan["content_fingerprint"] = route_plan_content_fingerprint(route_plan)
    validate_route_plan(route_plan, outcome)
    markdown = format_batch_outcome_markdown(outcome, route_plan)
    write_immutable_snapshot(snapshot_json, outcome, label="Batch Outcome")
    write_immutable_snapshot(
        snapshot_dir / "route_plan.json", route_plan, label="Batch Outcome route plan",
    )
    write_immutable_text_snapshot(
        snapshot_dir / "batch_outcome.md", markdown, label="Batch Outcome Markdown",
    )
    # Convenience copies are projections; immutable history lives under audits/.
    atomic_write_json(batch_root / "latest_batch_outcome.json", outcome)
    atomic_write_json(batch_root / "latest_route_plan.json", route_plan)
    atomic_write_text(batch_root / "latest_batch_outcome.md", markdown)
    compilation = publish_completed_compilation(
        exports_root,
        batch_id,
        [
            ("provisional_memory", memory_result["path"]),
            ("tag_projection", projection_result["path"]),
            ("batch_outcome", snapshot_json),
            ("route_plan", snapshot_dir / "route_plan.json"),
            ("batch_outcome_markdown", snapshot_dir / "batch_outcome.md"),
        ],
        source="batch_outcome",
        previous_manifest=previous_compilation,
        attempt_id=compilation_attempt["attempt_id"],
    )
    return {
        "outcome": outcome,
        "outcome_path": snapshot_json,
        "markdown_path": snapshot_dir / "batch_outcome.md",
        "route_plan_path": snapshot_dir / "route_plan.json",
        "provisional_memory_path": memory_result["path"],
        "tag_projection_path": projection_result["path"],
        "reused": False,
        "compilation_manifest_path": compilation["manifest_path"],
    }


def compile_batch_outcome(
    ledger_path: Path, corpus_dir: Path, out_root: Path, *,
    policy_path: Path | None = None,
    workflow: dict[str, Any] | None = None,
    dispatch: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compile with Phase 12 pre-publication failure accounting."""
    try:
        return _compile_batch_outcome_impl(
            ledger_path, corpus_dir, out_root, policy_path=policy_path,
            workflow=workflow, dispatch=dispatch,
        )
    except Exception as exc:
        from .compilation_manifest import abandon_active_compilation
        abandon_active_compilation(exc)
        raise


def compile_workflow_batch_outcome(
    workflow: dict[str, Any], dispatch: dict[str, Any], corpus_dir: Path,
    out_root: Path, *, policy_path: Path | None = None,
) -> dict[str, Any]:
    """Compile the existing Batch Outcome from one exact frozen workflow bundle."""
    binding = workflow_binding(workflow, dispatch, corpus_dir=corpus_dir)
    payload = build_workflow_outcome_input(workflow, dispatch, Path(corpus_dir))
    validate_workflow_outcome_input(payload, workflow, dispatch, corpus_dir=corpus_dir)
    batch_root = Path(out_root) / _slug(binding["workflow_batch_id"])
    fingerprint = str(payload["evidence_fingerprint"])
    input_path = (
        batch_root / "inputs"
        / f"{_slug(binding['workflow_batch_id'])}--{fingerprint[:12]}.json"
    )
    stored = write_immutable_snapshot(
        input_path, payload, label="workflow Batch Outcome input",
    )
    validate_workflow_outcome_input(stored, workflow, dispatch, corpus_dir=corpus_dir)
    write_latest_projection(batch_root / "latest_workflow_input.json", stored)
    result = compile_batch_outcome(
        input_path, Path(corpus_dir), Path(out_root),
        policy_path=policy_path, workflow=workflow, dispatch=dispatch,
    )
    validate_batch_outcome(
        result["outcome"], workflow=workflow, dispatch=dispatch, require_bound=True,
        corpus_dir=corpus_dir,
    )
    result["workflow_input_path"] = input_path
    return result
