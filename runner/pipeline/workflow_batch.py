"""Maximum-15 research workflow selection before ordinary/specialist routing."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .source_queue import QueueItem, get_item, list_items
from .privacy import redact_local_paths
from .workflow_integrity import (
    canonical_fingerprint,
    require_bound_fingerprint,
    safe_workflow_batch_id,
    write_immutable_snapshot,
    write_latest_projection,
)


SCHEMA_VERSION = "workflow-batch-v1.0"
MAX_WORKFLOW_ITEMS = 15
SPECIALIST_FLAGS = {
    "needs_media_review": "media",
    "needs_testimony_review": "testimony",
    "needs_legal_review": "legal",
    "needs_book_splitting": "longform",
}
PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2, "skip": 3}
BASE_ROUTES = {"ordinary", "attended_base", "technical_hold", "deferred"}
WORKFLOW_TOP_LEVEL_FIELDS = {
    "schema_version", "workflow_batch_id", "limit", "selection", "policy", "items",
    "generated_at", "evidence_fingerprint", "dry_run", "summary",
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _fingerprint(payload: Any) -> str:
    return canonical_fingerprint(payload)


def workflow_stable_projection(workflow: dict[str, Any]) -> dict[str, Any]:
    return {
        key: workflow.get(key)
        for key in ("schema_version", "workflow_batch_id", "limit", "selection", "policy", "items")
    }


def _workflow_summary(items: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "selected": len(items),
        "ordinary": sum(item.get("base_route") == "ordinary" for item in items),
        "attended_base": sum(item.get("base_route") == "attended_base" for item in items),
        "technical_hold": sum(item.get("base_route") == "technical_hold" for item in items),
        "deferred": sum(item.get("base_route") == "deferred" for item in items),
        "specialist_routes": sum(len(item.get("specialist_routes") or []) for item in items),
    }


def validate_workflow_manifest(manifest: dict[str, Any]) -> None:
    """Validate a workflow artifact at every read/write trust boundary."""
    if not isinstance(manifest, dict):
        raise ValueError("Workflow manifest must be an object")
    unexpected = set(manifest) - WORKFLOW_TOP_LEVEL_FIELDS
    if unexpected:
        raise ValueError("Workflow manifest has unsupported top-level fields: " + ", ".join(sorted(unexpected)))
    if manifest.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported workflow batch schema")
    safe_workflow_batch_id(manifest.get("workflow_batch_id"))
    if manifest.get("dry_run") is not True:
        raise ValueError("Workflow manifest must remain dry-run")
    limit = manifest.get("limit")
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= MAX_WORKFLOW_ITEMS:
        raise ValueError("Workflow limit must be an integer from 1 to 15")
    items = manifest.get("items")
    if not isinstance(items, list) or not 1 <= len(items) <= limit:
        raise ValueError("Workflow items must contain between 1 and the selected limit")
    if not all(isinstance(item, dict) for item in items):
        raise ValueError("Workflow items must be objects")
    raw_queue_ids = [item.get("queue_item_id") for item in items]
    if not all(type(value) is str and value and value == value.strip() for value in raw_queue_ids):
        raise ValueError("Workflow queue item IDs must be strings without surrounding whitespace")
    queue_ids = list(raw_queue_ids)
    if len(set(queue_ids)) != len(queue_ids):
        raise ValueError("Workflow queue item IDs must be unique and non-empty")
    for item in items:
        base_route = str(item.get("base_route") or "")
        if base_route not in BASE_ROUTES:
            raise ValueError(f"Unsupported workflow base route: {base_route}")
        routes = item.get("specialist_routes")
        if not isinstance(routes, list):
            raise ValueError("Workflow specialist_routes must be a list")
        normalized_routes = [str(route or "") for route in routes]
        if (
            not all(route in set(SPECIALIST_FLAGS.values()) for route in normalized_routes)
            or len(set(normalized_routes)) != len(normalized_routes)
        ):
            raise ValueError("Workflow specialist routes must be supported, unique, and non-empty")
        raw_doc_id = item.get("corpus_doc_id")
        if raw_doc_id is not None and type(raw_doc_id) is not str:
            raise ValueError("Workflow corpus_doc_id must be a string")
        doc_id = str(raw_doc_id or "")
        if doc_id and (
            doc_id in {".", ".."}
            or doc_id != doc_id.strip()
            or "\x00" in doc_id
            or Path(doc_id).is_absolute()
            or ".." in Path(doc_id).parts
            or "/" in doc_id
            or "\\" in doc_id
        ):
            raise ValueError("Workflow corpus_doc_id is not safe for a corpus path")
    selection = manifest.get("selection")
    if not isinstance(selection, dict):
        raise ValueError("Workflow selection must be an object")
    if set(selection) != {"method", "batch_group", "selected_queue_item_ids"}:
        raise ValueError("Workflow selection fields do not match the selection schema")
    if selection.get("selected_queue_item_ids") != queue_ids:
        raise ValueError("Workflow selection IDs/order do not match workflow items")
    if selection.get("method") not in {"explicit_queue_ids", "batch_group_priority"}:
        raise ValueError("Workflow selection method is unsupported")
    policy = manifest.get("policy")
    if not isinstance(policy, dict):
        raise ValueError("Workflow policy must be an object")
    expected_policy_fields = set(WorkflowPolicy.__dataclass_fields__)
    if set(policy) != expected_policy_fields:
        raise ValueError("Workflow policy fields do not match the policy schema")
    WorkflowPolicy(**policy).validate()
    expected_summary = _workflow_summary(items)
    summary = manifest.get("summary")
    if (
        not isinstance(summary, dict)
        or set(summary) != set(expected_summary)
        or any(type(value) is not int for value in summary.values())
        or summary != expected_summary
    ):
        raise ValueError("Workflow summary does not match workflow items")
    require_bound_fingerprint(manifest, workflow_stable_projection, label="Workflow")


@dataclass
class WorkflowPolicy:
    policy_version: str = "workflow-policy-v1.0"
    research_purpose: str = ""
    research_questions: list[str] = field(default_factory=list)
    model_policy: str = "triage_recommended"
    remote_write_policy: str = "none"
    disclosure_mode: str = "internal_research"
    audit_sample_rule: str = "exceptions_and_researcher_selected"

    def validate(self) -> None:
        if not isinstance(self.research_purpose, str):
            raise ValueError("research_purpose must be text")
        if not isinstance(self.research_questions, list) or not all(
            isinstance(value, str) for value in self.research_questions
        ):
            raise ValueError("research_questions must be a list of text values")
        if not isinstance(self.audit_sample_rule, str) or not self.audit_sample_rule.strip():
            raise ValueError("audit_sample_rule is required")
        if self.model_policy not in {"triage_recommended", "local_preferred", "researcher_selected"}:
            raise ValueError("unsupported model_policy")
        if self.remote_write_policy not in {"none", "private_upload"}:
            raise ValueError("remote_write_policy must be none or private_upload")
        if self.disclosure_mode not in {"internal_research", "external_safe"}:
            raise ValueError("disclosure_mode must be internal_research or external_safe")
        if not self.policy_version.strip():
            raise ValueError("policy_version is required")


def _technical_hold(item: QueueItem) -> tuple[str, list[str], str] | None:
    if item.status in {"ingested", "skipped"}:
        return "already_settled", [], f"Queue status is {item.status}."
    if not item.triage_model_used:
        return "triage_required", ["run existing Source Queue triage"], "No completed triage record exists."
    if item.status not in {"triaged", "ready_to_ingest"}:
        return "queue_state", ["set queue state to triaged or ready_to_ingest"], f"Queue status is {item.status}."
    if item.needs_source_file and not item.source_file_path.strip():
        return "source_attachment", ["attach the required local source/PDF"], "Triage requires a source file."
    if item.source_file_path.strip() and not Path(item.source_file_path).expanduser().is_file():
        return "source_file_missing", ["hydrate or correct the attached source path"], "Attached source file is unavailable."
    return None


def _workflow_item(item: QueueItem) -> dict[str, Any]:
    hold = _technical_hold(item)
    specialist_routes = [
        route for flag, route in SPECIALIST_FLAGS.items() if bool(getattr(item, flag, False))
    ]
    if hold:
        hold_code, prerequisites, reason = hold
        base_route = "deferred" if hold_code == "already_settled" else "technical_hold"
        next_action = "leave_settled" if hold_code == "already_settled" else "resolve_prerequisites"
    elif specialist_routes or not item.overnight_batch_safe:
        hold_code, prerequisites = "", []
        reason = item.routing_reason or item.suggested_process_route or "Attended processing required by triage."
        base_route = "attended_base"
        next_action = "run_attended_base_then_specialists"
    else:
        hold_code, prerequisites = "", []
        reason = item.routing_reason or "Eligible for the existing ordinary base pipeline."
        base_route = "ordinary"
        next_action = "run_existing_base_pipeline"
    return {
        "queue_item_id": item.id,
        "url": item.url,
        "url_hash": item.url_hash,
        "title": item.title,
        "priority": item.priority,
        "queue_status": item.status,
        "corpus_doc_id": item.corpus_doc_id,
        "triage": {
            "triaged_at": item.triaged_at,
            "model": item.triage_model_used,
            "recommended_llm": item.recommended_llm,
            "doc_type_hint": item.doc_type_hint,
            "suggested_process_route": item.suggested_process_route,
            "overnight_batch_safe": item.overnight_batch_safe,
        },
        "source_attachment": {
            "required": item.needs_source_file,
            "path": item.source_file_path,
            "relation": item.source_file_relation,
            "source_url": item.source_file_url,
        },
        "base_route": base_route,
        "specialist_routes": specialist_routes,
        "route_reason": reason,
        "hold_code": hold_code,
        "prerequisites": prerequisites,
        "state": "planned" if base_route in {"ordinary", "attended_base"} else "held",
        "attempt_id": "",
        "next_action": next_action,
    }


def plan_workflow_batch(
    db,
    *,
    workflow_batch_id: str,
    selected_item_ids: list[str] | None = None,
    batch_group: str = "",
    limit: int = 15,
    policy: WorkflowPolicy | None = None,
) -> dict[str, Any]:
    """Select first, then route; never mutates the Source Queue or corpus."""
    workflow_batch_id = safe_workflow_batch_id(workflow_batch_id)
    policy = policy or WorkflowPolicy()
    policy.validate()
    effective_limit = min(max(1, int(limit)), MAX_WORKFLOW_ITEMS)
    if selected_item_ids is not None:
        unique_ids = list(dict.fromkeys(str(value) for value in selected_item_ids if str(value)))
        if len(unique_ids) > effective_limit:
            raise ValueError(f"Selected {len(unique_ids)} sources; workflow batch limit is {effective_limit}")
        items = []
        for item_id in unique_ids:
            item = get_item(db, item_id)
            if item is None:
                raise ValueError(f"Unknown Source Queue item: {item_id}")
            items.append(item)
        selection_method = "explicit_queue_ids"
    else:
        candidates = list_items(db, batch_group=batch_group or None, limit=500)
        candidates = [item for item in candidates if item.status not in {"ingested", "skipped"}]
        candidates.sort(key=lambda item: (PRIORITY_ORDER.get(item.priority, 9), item.added_at, item.id))
        items = candidates[:effective_limit]
        selection_method = "batch_group_priority"
    planned = [_workflow_item(item) for item in items]
    stable = {
        "schema_version": SCHEMA_VERSION,
        "workflow_batch_id": workflow_batch_id,
        "limit": effective_limit,
        "selection": {
            "method": selection_method,
            "batch_group": batch_group,
            "selected_queue_item_ids": [item["queue_item_id"] for item in planned],
        },
        "policy": asdict(policy),
        "items": planned,
    }
    if policy.disclosure_mode == "external_safe":
        stable = redact_local_paths(stable)
    manifest = {
        **stable,
        "generated_at": _now(),
        "evidence_fingerprint": _fingerprint(stable),
        "dry_run": True,
        "summary": _workflow_summary(planned),
    }
    validate_workflow_manifest(manifest)
    return manifest


def write_workflow_batch(manifest: dict, out_root: Path) -> Path:
    validate_workflow_manifest(manifest)
    batch_id = safe_workflow_batch_id(manifest.get("workflow_batch_id"))
    fingerprint = str(manifest["evidence_fingerprint"])
    path = Path(out_root) / batch_id / "plans" / f"{batch_id}--{fingerprint[:12]}.json"
    stored = write_immutable_snapshot(path, manifest, label="workflow batch")
    validate_workflow_manifest(stored)
    write_latest_projection(Path(out_root) / batch_id / "latest_workflow_batch.json", stored)
    return path
