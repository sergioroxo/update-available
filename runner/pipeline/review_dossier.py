"""Immutable, read-only proposal dossiers for one exact workflow outcome.

The dossier index is a derived research aid.  It preserves the complete
provisional-memory evidence and provenance records, but never changes proposal
state, enrichment files, canonical registries, or publication state.
"""
from __future__ import annotations

import copy
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .batch_outcome import validate_batch_outcome
from .provisional_memory import MEMORY_SCHEMA_VERSION
from .workflow_integrity import (
    canonical_fingerprint,
    safe_workflow_batch_id,
    valid_fingerprint,
    write_immutable_snapshot,
    write_latest_projection,
)


SCHEMA_VERSION = "proposal-dossier-index-v1.0"
DOSSIER_SCHEMA_VERSION = "proposal-dossier-snapshot-v1.0"
MAX_MEMORY_BYTES = 100 * 1024 * 1024
_MEMORY_FIELDS = {
    "schema_version", "label", "recurrence_threshold", "focus_doc_ids",
    "source_identity_review",
    "records", "clusters", "focused_cluster_ids", "generated_at",
    "evidence_fingerprint", "sensitivity", "summary", "policy",
}
_RECORD_FIELDS = {
    "draft_id", "family", "label", "label_field", "normalised_label",
    "proposal_index", "proposal_state", "trust_state", "document",
    "evidence", "model_confidence", "provenance", "proposal",
}
_DOSSIER_FIELDS = {
    "schema_version", "dossier_id", "workflow_batch_id", "workflow_fingerprint",
    "dispatch_fingerprint", "outcome_content_fingerprint", "memory_fingerprint",
    "cluster_id", "review_group_key", "family", "label", "normalised_label",
    "trust_state", "conflict_detected", "conflict_signals", "review_lane",
    "human_decision_required", "selected_for_current_review", "batch_references",
    "archive_context_references", "batch_item_signals", "signals", "counts",
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _normalise(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def _memory_stable(memory: dict[str, Any]) -> dict[str, Any]:
    return {
        key: memory.get(key)
        for key in (
            "schema_version", "label", "recurrence_threshold", "focus_doc_ids",
            "source_identity_review",
            "records", "clusters", "focused_cluster_ids",
        )
    }


def validate_provisional_memory(memory: dict[str, Any]) -> None:
    """Recompute and validate the complete v1.1 evidence-bearing contract."""
    if not isinstance(memory, dict) or set(memory) != _MEMORY_FIELDS:
        raise ValueError("Provisional memory fields differ from its v1.1 contract")
    if memory.get("schema_version") != MEMORY_SCHEMA_VERSION:
        raise ValueError("Unsupported provisional-memory schema")
    if not isinstance(memory.get("label"), str) or not memory["label"]:
        raise ValueError("Provisional memory label is missing")
    recurrence = memory.get("recurrence_threshold")
    if isinstance(recurrence, bool) or not isinstance(recurrence, int) or recurrence < 2:
        raise ValueError("Provisional memory recurrence threshold is malformed")
    focus_doc_ids = memory.get("focus_doc_ids")
    records = memory.get("records")
    clusters = memory.get("clusters")
    focused = memory.get("focused_cluster_ids")
    if (
        not isinstance(focus_doc_ids, list)
        or not all(isinstance(value, str) and value for value in focus_doc_ids)
        or focus_doc_ids != sorted(set(focus_doc_ids))
    ):
        raise ValueError("Provisional memory focus document IDs are malformed")
    if not isinstance(records, list) or not isinstance(clusters, list) or not isinstance(focused, list):
        raise ValueError("Provisional memory records/clusters are malformed")
    identity_review = memory.get("source_identity_review")
    if not isinstance(identity_review, dict) or set(identity_review) != {
        "available", "source_snapshot_fingerprint", "decision_ledger_fingerprint",
        "projection_fingerprint",
        "applied_decision_ids", "reviewed_document_families", "reason", "independence_claim",
        "corpus_scope_complete",
        "corpus_review_complete",
    }:
        raise ValueError("Provisional memory source identity review is malformed")
    if identity_review.get("independence_claim") is not False:
        raise ValueError("Provisional memory cannot claim source independence")
    reviewed_families = identity_review.get("reviewed_document_families")
    if not isinstance(reviewed_families, dict):
        raise ValueError("Provisional memory reviewed family mapping is malformed")
    if identity_review.get("available"):
        if (
            not valid_fingerprint(identity_review.get("source_snapshot_fingerprint"))
            or not valid_fingerprint(identity_review.get("decision_ledger_fingerprint"))
            or not valid_fingerprint(identity_review.get("projection_fingerprint"))
        ):
            raise ValueError("Provisional memory identity review fingerprints are malformed")
    elif reviewed_families:
        raise ValueError("Unavailable identity review cannot contain reviewed assignments")

    records_by_id: dict[str, dict[str, Any]] = {}
    for record in records:
        if not isinstance(record, dict) or set(record) != _RECORD_FIELDS:
            raise ValueError("Provisional memory record fields are malformed")
        draft_id = record.get("draft_id")
        if not isinstance(draft_id, str) or not draft_id:
            raise ValueError("Provisional memory draft ID is missing")
        if draft_id in records_by_id:
            raise ValueError(f"Duplicate provisional-memory draft ID: {draft_id}")
        if not isinstance(record.get("family"), str) or not record["family"]:
            raise ValueError("Provisional memory record family is missing")
        if not isinstance(record.get("document"), dict):
            raise ValueError("Provisional memory record document is malformed")
        doc_id = record["document"].get("doc_id")
        if not isinstance(doc_id, str) or not doc_id:
            raise ValueError("Provisional memory record document ID is missing")
        if not isinstance(record.get("evidence"), dict) or not isinstance(record.get("provenance"), dict):
            raise ValueError("Provisional memory evidence/provenance is malformed")
        if not isinstance(record.get("proposal"), dict):
            raise ValueError("Provisional memory proposal payload is malformed")
        records_by_id[draft_id] = record

    cluster_ids: set[str] = set()
    for cluster in clusters:
        if not isinstance(cluster, dict):
            raise ValueError("Provisional memory cluster is malformed")
        cluster_id = cluster.get("cluster_id")
        if not isinstance(cluster_id, str) or not cluster_id or cluster_id in cluster_ids:
            raise ValueError("Provisional memory cluster IDs must be unique and non-empty")
        cluster_ids.add(cluster_id)
        draft_ids = cluster.get("draft_ids")
        if not isinstance(draft_ids, list) or len(draft_ids) != len(set(draft_ids)):
            raise ValueError("Provisional memory cluster draft IDs are malformed")
        if any(draft_id not in records_by_id for draft_id in draft_ids):
            raise ValueError("Provisional memory cluster references a missing draft")
        for draft_id in draft_ids:
            record = records_by_id[draft_id]
            if record["family"] != cluster.get("family") or record.get("normalised_label") != cluster.get("normalised_label"):
                raise ValueError("Provisional memory cluster contains a mismatched draft")
    if len(focused) != len(set(focused)) or any(value not in cluster_ids for value in focused):
        raise ValueError("Provisional memory focused cluster IDs are malformed")

    fingerprint = memory.get("evidence_fingerprint")
    if not valid_fingerprint(fingerprint) or canonical_fingerprint(_memory_stable(memory)) != fingerprint:
        raise ValueError("Provisional memory evidence fingerprint does not bind its stable content")


def load_provisional_memory(path: Path, *, max_bytes: int = MAX_MEMORY_BYTES) -> dict[str, Any]:
    """Read one bounded, regular, non-symlink memory artifact exactly once."""
    path = Path(path)
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Provisional memory is not a safe regular file: {path}")
    size = path.stat().st_size
    if size > max_bytes:
        raise ValueError(f"Provisional memory exceeds the bounded JSON size limit: {path}")
    raw = path.read_bytes()
    try:
        memory = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise ValueError(f"Provisional memory is not valid UTF-8 JSON: {path}: {exc}") from exc
    validate_provisional_memory(memory)
    return memory


def _record_ref(record: dict[str, Any]) -> dict[str, Any]:
    stored = copy.deepcopy(record)
    proposal_id = str((stored.get("provenance") or {}).get("proposal_id") or "")
    return {
        "draft_id": str(stored["draft_id"]),
        "proposal_id": proposal_id,
        "record_fingerprint": canonical_fingerprint(stored),
        "record": stored,
    }


def _dossier_stable(dossier: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in dossier.items() if key != "dossier_fingerprint"}


def validate_review_dossier_snapshot(
    dossier: dict[str, Any], *, require_fingerprint: bool = True,
) -> str:
    """Validate one exact evidence-bearing dossier before storage/decision use."""
    if not isinstance(dossier, dict):
        raise ValueError("Proposal dossier snapshot must be an object")
    expected_fields = set(_DOSSIER_FIELDS)
    if require_fingerprint:
        expected_fields.add("dossier_fingerprint")
    if set(dossier) != expected_fields or dossier.get("schema_version") != DOSSIER_SCHEMA_VERSION:
        raise ValueError("Proposal dossier snapshot fields differ from its versioned contract")
    for field in (
        "workflow_fingerprint", "dispatch_fingerprint", "outcome_content_fingerprint",
        "memory_fingerprint",
    ):
        if not valid_fingerprint(dossier.get(field)):
            raise ValueError(f"Proposal dossier {field} is malformed")
    cluster_id = str(dossier.get("cluster_id") or "")
    family = str(dossier.get("family") or "")
    if not cluster_id or not family or not str(dossier.get("workflow_batch_id") or ""):
        raise ValueError("Proposal dossier identity is incomplete")
    expected_id = "dossier-" + canonical_fingerprint([
        dossier["outcome_content_fingerprint"], cluster_id,
    ])[:20]
    if dossier.get("dossier_id") != expected_id:
        raise ValueError("Proposal dossier ID is not bound to its outcome and cluster")
    signals = dossier.get("signals")
    counts = dossier.get("counts")
    item_signals = dossier.get("batch_item_signals")
    if not isinstance(signals, dict) or set(signals) != {
        "specialist_attention", "publication_blocked", "evidence_conflict",
        "recurring_provisional", "human_exception",
    }:
        raise ValueError("Proposal dossier signals are malformed")
    if not isinstance(counts, dict) or set(counts) != {
        "all_records", "batch_records", "archive_context_records", "all_documents",
    }:
        raise ValueError("Proposal dossier counts are malformed")
    if not isinstance(item_signals, list):
        raise ValueError("Proposal dossier batch-item signals are malformed")
    item_doc_ids: set[str] = set()
    for item in item_signals:
        if not isinstance(item, dict) or set(item) != {
            "doc_id", "item_id", "review_assignment", "specialist_routes",
            "publication_readiness",
        }:
            raise ValueError("Proposal dossier batch-item signal is malformed")
        doc_id = str(item.get("doc_id") or "")
        if not doc_id or doc_id in item_doc_ids:
            raise ValueError("Proposal dossier batch-item document identities are malformed")
        if not isinstance(item.get("specialist_routes"), list) or not isinstance(item.get("publication_readiness"), dict):
            raise ValueError("Proposal dossier specialist/publication signal is malformed")
        item_doc_ids.add(doc_id)

    all_refs: list[dict[str, Any]] = []
    seen_drafts: set[str] = set()
    all_doc_ids: set[str] = set()
    for lane, in_batch in (("batch_references", True), ("archive_context_references", False)):
        refs = dossier.get(lane)
        if not isinstance(refs, list):
            raise ValueError("Proposal dossier references are malformed")
        for ref in refs:
            if not isinstance(ref, dict) or set(ref) != {
                "draft_id", "proposal_id", "record_fingerprint", "record",
            }:
                raise ValueError("Proposal dossier reference fields are malformed")
            record = ref.get("record")
            if not isinstance(record, dict) or set(record) != _RECORD_FIELDS:
                raise ValueError("Proposal dossier record contract is malformed")
            draft_id = str(ref.get("draft_id") or "")
            doc_id = str((record.get("document") or {}).get("doc_id") or "")
            if (
                not draft_id or draft_id in seen_drafts
                or draft_id != record.get("draft_id")
                or record.get("family") != family
                or record.get("normalised_label") != dossier.get("normalised_label")
                or (doc_id in item_doc_ids) != in_batch
            ):
                raise ValueError("Proposal dossier reference identity/partition is inconsistent")
            proposal_id = str((record.get("provenance") or {}).get("proposal_id") or "")
            if ref.get("proposal_id") != proposal_id:
                raise ValueError("Proposal dossier proposal identity is inconsistent")
            if not valid_fingerprint(ref.get("record_fingerprint")) or ref["record_fingerprint"] != canonical_fingerprint(record):
                raise ValueError("Proposal dossier record fingerprint does not bind its content")
            seen_drafts.add(draft_id)
            all_doc_ids.add(doc_id)
            all_refs.append(ref)
    if item_doc_ids != {
        str((ref["record"].get("document") or {}).get("doc_id") or "")
        for ref in dossier.get("batch_references") or []
    }:
        raise ValueError("Proposal dossier item signals differ from batch evidence documents")
    expected_counts = {
        "all_records": len(all_refs),
        "batch_records": len(dossier["batch_references"]),
        "archive_context_records": len(dossier["archive_context_references"]),
        "all_documents": len(all_doc_ids),
    }
    if counts != expected_counts:
        raise ValueError("Proposal dossier counts do not match its references")
    expected_signals = {
        "specialist_attention": any(row["specialist_routes"] for row in item_signals),
        "publication_blocked": any(
            str(row["publication_readiness"].get("recommended_lane") or "") == "blocked"
            for row in item_signals
        ),
        "evidence_conflict": bool(dossier.get("conflict_detected")),
        "recurring_provisional": dossier.get("trust_state") == "recurring_provisional",
        "human_exception": bool(dossier.get("human_decision_required")),
    }
    if signals != expected_signals:
        raise ValueError("Proposal dossier signals do not match their bound evidence")
    fingerprint = canonical_fingerprint(_dossier_stable(dossier))
    if require_fingerprint and dossier.get("dossier_fingerprint") != fingerprint:
        raise ValueError("Proposal dossier fingerprint does not bind its content")
    return fingerprint


def dossier_index_content_projection(payload: dict[str, Any]) -> dict[str, Any]:
    stable = copy.deepcopy(payload)
    stable.pop("content_fingerprint", None)
    stable.pop("generated_at", None)
    return stable


def dossier_index_content_fingerprint(payload: dict[str, Any]) -> str:
    return canonical_fingerprint(dossier_index_content_projection(payload))


def _review_groups(review_plan: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    result: dict[tuple[str, str], dict[str, Any]] = {}
    for group in review_plan.get("group_index") or []:
        if not isinstance(group, dict):
            raise ValueError("Batch Outcome review-plan group is malformed")
        family = str(group.get("family") or "")
        label = _normalise(str(group.get("label") or ""))
        key = (family, label)
        if not family or not label or key in result:
            raise ValueError("Batch Outcome review-plan group identity is malformed or duplicated")
        result[key] = copy.deepcopy(group)
    return result


def build_review_dossier_index(
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    outcome: dict[str, Any],
    memory_path: Path,
    *,
    corpus_dir: Path | None = None,
    _validate_result: bool = True,
) -> dict[str, Any]:
    """Build, without writes, dossiers bound to one exact Batch Outcome v2.2."""
    validate_batch_outcome(
        outcome, workflow=workflow, dispatch=dispatch, corpus_dir=corpus_dir,
        require_bound=True,
    )
    memory_path = Path(memory_path)
    declared_path = Path(str((outcome.get("provisional_memory") or {}).get("path") or ""))
    if not str(declared_path) or not declared_path.is_absolute():
        raise ValueError("Batch Outcome provisional-memory path is missing or not absolute")
    try:
        if declared_path.is_symlink() or memory_path.resolve(strict=True) != declared_path.resolve(strict=True):
            raise ValueError("Supplied provisional memory is not the artifact declared by the Batch Outcome")
    except FileNotFoundError as exc:
        raise ValueError("Batch Outcome provisional-memory artifact is missing") from exc
    memory = load_provisional_memory(memory_path)
    memory_summary = outcome.get("provisional_memory") or {}
    if (
        memory_summary.get("schema_version") != memory.get("schema_version")
        or memory_summary.get("evidence_fingerprint") != memory.get("evidence_fingerprint")
    ):
        raise ValueError("Provisional memory is not exactly bound to the Batch Outcome")

    memory_clusters = {str(row["cluster_id"]): row for row in memory["clusters"]}
    focused_clusters = outcome.get("provisional_memory", {}).get("clusters") or []
    if not isinstance(focused_clusters, list):
        raise ValueError("Batch Outcome focused provisional-memory clusters are malformed")
    focused_ids: list[str] = []
    for cluster in focused_clusters:
        if not isinstance(cluster, dict) or not str(cluster.get("cluster_id") or ""):
            raise ValueError("Batch Outcome focused cluster is malformed")
        cluster_id = str(cluster["cluster_id"])
        if cluster_id in focused_ids or memory_clusters.get(cluster_id) != cluster:
            raise ValueError("Batch Outcome focused cluster differs from the bound full memory")
        focused_ids.append(cluster_id)

    batch_doc_ids = [
        str(row.get("doc_id") or "")
        for row in outcome["items"]
        if isinstance(row, dict) and str(row.get("doc_id") or "")
    ]
    if len(batch_doc_ids) != len(set(batch_doc_ids)):
        raise ValueError("Batch Outcome contains duplicate linked document IDs")
    batch_docs = set(batch_doc_ids)
    records_by_id = {str(row["draft_id"]): row for row in memory["records"]}
    review_groups = _review_groups(outcome.get("review_plan") or {})
    outcome_items_by_doc = {
        str(row.get("doc_id") or ""): row
        for row in outcome["items"]
        if isinstance(row, dict) and str(row.get("doc_id") or "")
    }

    dossiers: list[dict[str, Any]] = []
    for cluster_id in focused_ids:
        cluster = memory_clusters[cluster_id]
        refs = [_record_ref(records_by_id[str(draft_id)]) for draft_id in cluster.get("draft_ids") or []]
        refs.sort(key=lambda row: (
            str((row["record"].get("document") or {}).get("doc_id") or ""),
            str(row["draft_id"]),
        ))
        batch_refs = [
            row for row in refs
            if str((row["record"].get("document") or {}).get("doc_id") or "") in batch_docs
        ]
        context_refs = [
            row for row in refs
            if str((row["record"].get("document") or {}).get("doc_id") or "") not in batch_docs
        ]
        group = review_groups.get((str(cluster.get("family") or ""), str(cluster.get("normalised_label") or "")))
        dossier_batch_doc_ids = sorted({
            str((row["record"].get("document") or {}).get("doc_id") or "") for row in batch_refs
        })
        item_signals = [{
            "doc_id": doc_id,
            "item_id": str(outcome_items_by_doc[doc_id].get("item_id") or ""),
            "review_assignment": copy.deepcopy(outcome_items_by_doc[doc_id].get("review_assignment") or {}),
            "specialist_routes": copy.deepcopy(outcome_items_by_doc[doc_id].get("specialist_routes") or []),
            "publication_readiness": copy.deepcopy(outcome_items_by_doc[doc_id].get("publication_readiness") or {}),
        } for doc_id in dossier_batch_doc_ids]
        dossier = {
            "schema_version": DOSSIER_SCHEMA_VERSION,
            "dossier_id": f"dossier-{canonical_fingerprint([outcome['content_fingerprint'], cluster_id])[:20]}",
            "workflow_batch_id": str(outcome["workflow_binding"]["workflow_batch_id"]),
            "workflow_fingerprint": str(outcome["workflow_binding"]["workflow_fingerprint"]),
            "dispatch_fingerprint": str(outcome["workflow_binding"]["dispatch_fingerprint"]),
            "outcome_content_fingerprint": str(outcome["content_fingerprint"]),
            "memory_fingerprint": str(memory["evidence_fingerprint"]),
            "cluster_id": cluster_id,
            "review_group_key": str((group or {}).get("group_key") or ""),
            "family": str(cluster.get("family") or ""),
            "label": str(cluster.get("preferred_draft_label") or ""),
            "normalised_label": str(cluster.get("normalised_label") or ""),
            "trust_state": str(cluster.get("trust_state") or ""),
            "conflict_detected": bool(cluster.get("conflict_detected")),
            "conflict_signals": copy.deepcopy(cluster.get("conflict_signals") or {}),
            "review_lane": str((group or {}).get("review_lane") or "not_in_review_plan"),
            "human_decision_required": bool((group or {}).get("human_decision_required")),
            "selected_for_current_review": bool((group or {}).get("selected_for_current_review")),
            "batch_references": batch_refs,
            "archive_context_references": context_refs,
            "batch_item_signals": item_signals,
            "signals": {
                "specialist_attention": any(row["specialist_routes"] for row in item_signals),
                "publication_blocked": any(
                    str(row["publication_readiness"].get("recommended_lane") or "") == "blocked"
                    for row in item_signals
                ),
                "evidence_conflict": bool(cluster.get("conflict_detected")),
                "recurring_provisional": str(cluster.get("trust_state") or "") == "recurring_provisional",
                "human_exception": bool((group or {}).get("human_decision_required")),
            },
            "counts": {
                "all_records": len(refs),
                "batch_records": len(batch_refs),
                "archive_context_records": len(context_refs),
                "all_documents": len({
                    str((row["record"].get("document") or {}).get("doc_id") or "") for row in refs
                }),
            },
        }
        dossier["dossier_fingerprint"] = canonical_fingerprint(_dossier_stable(dossier))
        dossiers.append(dossier)
    dossiers.sort(key=lambda row: (row["family"], row["normalised_label"], row["cluster_id"]))

    payload: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _now(),
        "workflow_binding": copy.deepcopy(outcome["workflow_binding"]),
        "outcome_binding": {
            "audit_id": str(outcome["audit_id"]),
            "evidence_fingerprint": str(outcome["evidence_fingerprint"]),
            "content_fingerprint": str(outcome["content_fingerprint"]),
        },
        "memory_binding": {
            "schema_version": str(memory["schema_version"]),
            "evidence_fingerprint": str(memory["evidence_fingerprint"]),
            "path": str(memory_path.resolve()),
        },
        "batch_doc_ids": batch_doc_ids,
        "dossiers": dossiers,
        "summary": {
            "dossiers": len(dossiers),
            "batch_records": sum(len(row["batch_references"]) for row in dossiers),
            "archive_context_records": sum(len(row["archive_context_references"]) for row in dossiers),
            "human_decision_dossiers": sum(1 for row in dossiers if row["human_decision_required"]),
            "conflicted_dossiers": sum(1 for row in dossiers if row["conflict_detected"]),
        },
        "authority": {
            "mode": "read_only_derived_projection",
            "may": "group and display bound proposal evidence and provenance",
            "must_not": "change proposal state, canonical records, uploads, or publication state",
        },
    }
    payload["content_fingerprint"] = dossier_index_content_fingerprint(payload)
    if _validate_result:
        validate_review_dossier_index(payload, workflow, dispatch, outcome, memory)
    return payload


def validate_review_dossier_index(
    payload: dict[str, Any], workflow: dict[str, Any], dispatch: dict[str, Any],
    outcome: dict[str, Any], memory: dict[str, Any],
) -> None:
    validate_batch_outcome(outcome, workflow=workflow, dispatch=dispatch, require_bound=True)
    validate_provisional_memory(memory)
    _validate_dossier_index_self(payload)
    if payload.get("workflow_binding") != outcome.get("workflow_binding"):
        raise ValueError("Proposal dossier workflow binding differs from its outcome")
    if payload.get("outcome_binding") != {
        "audit_id": outcome.get("audit_id"),
        "evidence_fingerprint": outcome.get("evidence_fingerprint"),
        "content_fingerprint": outcome.get("content_fingerprint"),
    }:
        raise ValueError("Proposal dossier outcome binding differs from its outcome")
    binding = payload.get("memory_binding") or {}
    if (
        binding.get("schema_version") != memory.get("schema_version")
        or binding.get("evidence_fingerprint") != memory.get("evidence_fingerprint")
    ):
        raise ValueError("Proposal dossier memory binding differs from its memory")

    # Self-hashes prove internal consistency, not completeness. Rebuild the
    # deterministic projection from the exact bound outcome and memory, then
    # require every derived dossier, reference, signal, and summary to match.
    expected = build_review_dossier_index(
        workflow,
        dispatch,
        outcome,
        Path(str(binding.get("path") or "")),
        _validate_result=False,
    )
    if dossier_index_content_projection(payload) != dossier_index_content_projection(expected):
        raise ValueError(
            "Proposal dossier index is incomplete or not exactly derived from bound evidence"
        )


def _validate_dossier_index_self(payload: dict[str, Any]) -> None:
    expected_fields = {
        "schema_version", "generated_at", "workflow_binding", "outcome_binding",
        "memory_binding", "batch_doc_ids", "dossiers", "summary", "authority",
        "content_fingerprint",
    }
    if not isinstance(payload, dict) or set(payload) != expected_fields or payload.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Proposal dossier index fields differ from its versioned contract")
    workflow_binding_value = payload.get("workflow_binding") or {}
    if set(workflow_binding_value) != {
        "workflow_batch_id", "workflow_fingerprint", "dispatch_fingerprint",
    } or not valid_fingerprint(workflow_binding_value.get("workflow_fingerprint")) \
            or not valid_fingerprint(workflow_binding_value.get("dispatch_fingerprint")):
        raise ValueError("Proposal dossier workflow binding is malformed")
    outcome_binding = payload.get("outcome_binding") or {}
    if set(outcome_binding) != {"audit_id", "evidence_fingerprint", "content_fingerprint"} \
            or not valid_fingerprint(outcome_binding.get("evidence_fingerprint")) \
            or not valid_fingerprint(outcome_binding.get("content_fingerprint")):
        raise ValueError("Proposal dossier outcome binding is malformed")
    memory_binding = payload.get("memory_binding") or {}
    if set(memory_binding) != {"schema_version", "evidence_fingerprint", "path"} \
            or not valid_fingerprint(memory_binding.get("evidence_fingerprint")):
        raise ValueError("Proposal dossier memory binding is malformed")
    batch_doc_ids = payload.get("batch_doc_ids")
    if not isinstance(batch_doc_ids, list) or len(batch_doc_ids) != len(set(batch_doc_ids)) \
            or not all(isinstance(value, str) and value for value in batch_doc_ids):
        raise ValueError("Proposal dossier batch document IDs are malformed")
    dossiers = payload.get("dossiers")
    if not isinstance(dossiers, list):
        raise ValueError("Proposal dossiers are malformed")
    dossier_ids: set[str] = set()
    draft_ids: set[str] = set()
    for dossier in dossiers:
        if not isinstance(dossier, dict) or not str(dossier.get("dossier_id") or ""):
            raise ValueError("Proposal dossier is malformed")
        if dossier["dossier_id"] in dossier_ids:
            raise ValueError("Proposal dossier IDs are duplicated")
        dossier_ids.add(dossier["dossier_id"])
        validate_review_dossier_snapshot(dossier)
        for field, expected in (
            ("workflow_batch_id", workflow_binding_value.get("workflow_batch_id")),
            ("workflow_fingerprint", workflow_binding_value.get("workflow_fingerprint")),
            ("dispatch_fingerprint", workflow_binding_value.get("dispatch_fingerprint")),
            ("outcome_content_fingerprint", outcome_binding.get("content_fingerprint")),
            ("memory_fingerprint", memory_binding.get("evidence_fingerprint")),
        ):
            if dossier.get(field) != expected:
                raise ValueError(f"Proposal dossier {field} differs from its index binding")
        if not valid_fingerprint(dossier.get("dossier_fingerprint")) or dossier["dossier_fingerprint"] != canonical_fingerprint(_dossier_stable(dossier)):
            raise ValueError("Proposal dossier fingerprint does not bind its content")
        for lane, is_batch in (("batch_references", True), ("archive_context_references", False)):
            refs = dossier.get(lane)
            if not isinstance(refs, list):
                raise ValueError("Proposal dossier references are malformed")
            for ref in refs:
                if not isinstance(ref, dict) or set(ref) != {"draft_id", "proposal_id", "record_fingerprint", "record"}:
                    raise ValueError("Proposal dossier record reference is malformed")
                if ref.get("draft_id") != (ref.get("record") or {}).get("draft_id"):
                    raise ValueError("Proposal dossier draft identity is inconsistent")
                if ref["draft_id"] in draft_ids:
                    raise ValueError("Proposal dossier draft references are duplicated")
                draft_ids.add(ref["draft_id"])
                provenance_id = str(((ref.get("record") or {}).get("provenance") or {}).get("proposal_id") or "")
                if ref.get("proposal_id") != provenance_id:
                    raise ValueError("Proposal dossier proposal identity is inconsistent")
                if not valid_fingerprint(ref.get("record_fingerprint")) or ref["record_fingerprint"] != canonical_fingerprint(ref["record"]):
                    raise ValueError("Proposal dossier record fingerprint does not bind its content")
                doc_id = str(((ref.get("record") or {}).get("document") or {}).get("doc_id") or "")
                if (doc_id in set(batch_doc_ids)) != is_batch:
                    raise ValueError("Proposal dossier batch/archive partition is inconsistent")
    expected_summary = {
        "dossiers": len(dossiers),
        "batch_records": sum(len(row["batch_references"]) for row in dossiers),
        "archive_context_records": sum(len(row["archive_context_references"]) for row in dossiers),
        "human_decision_dossiers": sum(1 for row in dossiers if row.get("human_decision_required")),
        "conflicted_dossiers": sum(1 for row in dossiers if row.get("conflict_detected")),
    }
    if payload.get("summary") != expected_summary:
        raise ValueError("Proposal dossier index summary does not match its dossiers")
    if not valid_fingerprint(payload.get("content_fingerprint")) or payload["content_fingerprint"] != dossier_index_content_fingerprint(payload):
        raise ValueError("Proposal dossier index content fingerprint does not bind its content")

def write_review_dossier_index(payload: dict[str, Any], exports_dir: Path) -> dict[str, Path]:
    """Write immutable history and an atomic latest projection after validation."""
    _validate_dossier_index_self(payload)
    workflow_id = safe_workflow_batch_id((payload.get("workflow_binding") or {}).get("workflow_batch_id"))
    outcome_fingerprint = str((payload.get("outcome_binding") or {}).get("content_fingerprint") or "")
    content_fingerprint = str(payload.get("content_fingerprint") or "")
    if not valid_fingerprint(outcome_fingerprint) or not valid_fingerprint(content_fingerprint):
        raise ValueError("Proposal dossier output fingerprints are malformed")
    root = Path(exports_dir) / "review_dossiers" / workflow_id / outcome_fingerprint
    snapshot_path = root / "snapshots" / content_fingerprint / "proposal_dossier_index.json"
    latest_path = root / "latest_proposal_dossier_index.json"
    stored = write_immutable_snapshot(snapshot_path, payload, label="proposal dossier index")
    write_latest_projection(latest_path, stored)
    return {"snapshot_path": snapshot_path, "latest_path": latest_path}
