"""Append-only researcher decisions layered over Phase 11A source identity.

Decision records never mutate the derived identity snapshot or corpus sidecars.
Every record binds the exact snapshot and document inputs reviewed by the
researcher.  Relationship review is deliberately separate from family
assignment: accepting a relationship cannot change source-family counts.
"""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
from typing import Any
from urllib.parse import urlsplit

from .atomic_io import atomic_write_json
from .source_identity import (
    load_latest_identity_snapshot,
    summarize_identity_counts,
    validate_identity_snapshot,
    write_identity_snapshot,
)
from .workflow_integrity import canonical_fingerprint, valid_fingerprint


DECISION_SCHEMA_VERSION = "source-identity-decision-v1.0"
PROJECTION_SCHEMA_VERSION = "source-identity-reviewed-projection-v1.0"
DECISION_TYPES = {"field_resolution", "family_assignment", "relationship_review"}
RELATIONSHIP_OUTCOMES = {"accepted", "rejected", "deferred"}
FIELD_OUTCOMES = {"selected_candidate", "manual_correction", "unresolved", "deferred"}
FAMILY_OUTCOMES = {"assigned", "unassigned", "deferred"}
MAX_DECISION_BYTES = 256 * 1024
_SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$")
_DECISION_KEYS = {
    "schema_version", "decision_id", "decision_fingerprint", "decision_type", "decided_at",
    "researcher_id", "rationale", "source_snapshot_fingerprint", "document_input_fingerprints",
    "subject", "outcome", "supersedes_decision_id", "automatic_merge", "affects_family_counts",
}


def candidate_fingerprint(candidate: dict[str, Any]) -> str:
    """Stable reference to an observed Phase 11A candidate."""
    return canonical_fingerprint(candidate)


def _decision_stable(record: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in record.items() if key != "decision_fingerprint"}


def _subject_key(record: dict[str, Any]) -> str:
    return canonical_fingerprint({
        "decision_type": record.get("decision_type"),
        "subject": record.get("subject"),
    })


def _document_map(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {row["doc_id"]: row for row in snapshot.get("documents") or []}


def _relationship_map(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {row["suggestion_id"]: row for row in snapshot.get("relationship_suggestions") or []}


def _valid_manual_value(field_name: str, value: Any) -> bool:
    if field_name == "authors":
        return isinstance(value, list) and 0 < len(value) <= 50 and all(
            isinstance(item, str) and 0 < len(item.strip()) <= 500 for item in value
        )
    if not isinstance(value, str) or not value.strip() or len(value) > 4000:
        return False
    if field_name == "canonical_url":
        try:
            parts = urlsplit(value.strip())
        except ValueError:
            return False
        return parts.scheme.casefold() in {"http", "https"} and bool(parts.hostname)
    if field_name == "doi":
        return bool(re.search(r"10\.\d{4,9}/\S+", value.casefold()))
    if field_name in {"source_artifact_sha256", "source_html_sha256"}:
        return bool(re.fullmatch(r"[0-9a-fA-F]{64}", value))
    return True


def create_identity_decision(
    snapshot: dict[str, Any],
    *,
    decision_type: str,
    subject: dict[str, Any],
    outcome: dict[str, Any],
    researcher_id: str,
    rationale: str = "",
    supersedes_decision_id: str = "",
    decided_at: str | None = None,
) -> dict[str, Any]:
    """Create and validate one immutable decision without writing it."""
    validate_identity_snapshot(snapshot)
    researcher_id = str(researcher_id or "").strip()
    rationale = str(rationale or "").strip()
    if not researcher_id or len(researcher_id) > 200:
        raise ValueError("A bounded researcher identifier is required")
    if len(rationale) > 4000:
        raise ValueError("Decision rationale exceeds 4000 characters")
    if decision_type not in DECISION_TYPES:
        raise ValueError("Unsupported source identity decision type")
    if not isinstance(subject, dict) or not isinstance(outcome, dict):
        raise ValueError("Decision subject and outcome must be objects")

    documents = _document_map(snapshot)
    relationships = _relationship_map(snapshot)
    bound_doc_ids: list[str]
    if decision_type == "field_resolution":
        doc_id, field_name = subject.get("doc_id"), subject.get("field_name")
        if doc_id not in documents or field_name not in (documents.get(doc_id, {}).get("fields") or {}):
            raise ValueError("Field decision references an unknown document or field")
        if set(subject) != {"doc_id", "field_name"}:
            raise ValueError("Field decision subject contains unsupported keys")
        state = outcome.get("state")
        if state not in FIELD_OUTCOMES:
            raise ValueError("Invalid field decision outcome")
        if state == "selected_candidate":
            expected = str(outcome.get("candidate_fingerprint") or "")
            candidates = documents[doc_id]["fields"][field_name].get("candidates") or []
            if not valid_fingerprint(expected) or expected not in {candidate_fingerprint(row) for row in candidates}:
                raise ValueError("Selected field candidate is not present in the bound snapshot")
            if set(outcome) != {"state", "candidate_fingerprint"}:
                raise ValueError("Selected-candidate outcome contains unsupported keys")
        elif state == "manual_correction":
            provenance = str(outcome.get("provenance") or "").strip()
            if (
                set(outcome) != {"state", "value", "provenance"}
                or not _valid_manual_value(field_name, outcome.get("value"))
                or not provenance or len(provenance) > 1000 or not rationale
            ):
                raise ValueError("Manual correction requires a bounded value, provenance, and rationale")
        elif set(outcome) != {"state"}:
            raise ValueError("Field outcome contains unsupported keys")
        bound_doc_ids = [doc_id]
    elif decision_type == "family_assignment":
        doc_id = subject.get("doc_id")
        if doc_id not in documents or set(subject) != {"doc_id"}:
            raise ValueError("Family decision references an unknown document")
        state = outcome.get("state")
        if state not in FAMILY_OUTCOMES:
            raise ValueError("Invalid family decision outcome")
        if state == "assigned":
            family_id = str(outcome.get("family_id") or "")
            if not _SAFE_ID.fullmatch(family_id) or set(outcome) != {"state", "family_id"}:
                raise ValueError("Assigned family identifier is invalid")
        elif set(outcome) != {"state"}:
            raise ValueError("Family outcome contains unsupported keys")
        bound_doc_ids = [doc_id]
    else:
        suggestion_id = subject.get("suggestion_id")
        relation = relationships.get(suggestion_id)
        if not relation or set(subject) != {"suggestion_id"}:
            raise ValueError("Relationship decision references an unknown suggestion")
        if outcome.get("status") not in RELATIONSHIP_OUTCOMES or set(outcome) != {"status"}:
            raise ValueError("Invalid relationship review outcome")
        bound_doc_ids = sorted([relation["source_doc_id"], relation["target_doc_id"]])

    if supersedes_decision_id and not _SAFE_ID.fullmatch(supersedes_decision_id):
        raise ValueError("Invalid superseded decision id")
    timestamp = decided_at or datetime.now(timezone.utc).isoformat()
    try:
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except (TypeError, ValueError) as exc:
        raise ValueError("Decision timestamp must be ISO 8601") from exc
    if parsed.tzinfo is None:
        raise ValueError("Decision timestamp must include a timezone")

    record = {
        "schema_version": DECISION_SCHEMA_VERSION,
        "decision_type": decision_type,
        "decided_at": timestamp,
        "researcher_id": researcher_id,
        "rationale": rationale,
        "source_snapshot_fingerprint": snapshot["snapshot_fingerprint"],
        "document_input_fingerprints": {
            doc_id: documents[doc_id]["input_fingerprint"] for doc_id in bound_doc_ids
        },
        "subject": deepcopy(subject),
        "outcome": deepcopy(outcome),
        "supersedes_decision_id": supersedes_decision_id,
        "automatic_merge": False,
        "affects_family_counts": decision_type == "family_assignment" and outcome.get("state") == "assigned",
    }
    fingerprint = canonical_fingerprint(record)
    record["decision_id"] = "source-decision-" + fingerprint[:24]
    record["decision_fingerprint"] = canonical_fingerprint(_decision_stable(record))
    validate_identity_decision(record)
    return record


def validate_identity_decision(record: dict[str, Any], snapshot: dict[str, Any] | None = None) -> None:
    if not isinstance(record, dict) or set(record) != _DECISION_KEYS:
        raise ValueError("Source identity decision fields are invalid")
    if record.get("schema_version") != DECISION_SCHEMA_VERSION:
        raise ValueError("Unsupported source identity decision schema")
    if record.get("decision_type") not in DECISION_TYPES or record.get("automatic_merge") is not False:
        raise ValueError("Invalid source identity decision")
    fingerprint = record.get("decision_fingerprint")
    if not valid_fingerprint(fingerprint) or canonical_fingerprint(_decision_stable(record)) != fingerprint:
        raise ValueError("Decision fingerprint does not bind its content")
    expected_id = "source-decision-" + canonical_fingerprint({
        key: value for key, value in record.items()
        if key not in {"decision_id", "decision_fingerprint"}
    })[:24]
    if record.get("decision_id") != expected_id:
        raise ValueError("Decision id does not bind its content")
    if not str(record.get("researcher_id") or "").strip() or len(str(record["researcher_id"])) > 200:
        raise ValueError("Decision researcher identifier is invalid")
    if len(str(record.get("rationale") or "")) > 4000:
        raise ValueError("Decision rationale is invalid")
    try:
        parsed = datetime.fromisoformat(str(record.get("decided_at") or "").replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("Decision timestamp is invalid") from exc
    if parsed.tzinfo is None:
        raise ValueError("Decision timestamp must include a timezone")
    if not valid_fingerprint(record.get("source_snapshot_fingerprint")):
        raise ValueError("Decision source snapshot fingerprint is invalid")
    bindings = record.get("document_input_fingerprints")
    if not isinstance(bindings, dict) or not bindings or any(
        not _SAFE_ID.fullmatch(str(doc_id)) or not valid_fingerprint(value)
        for doc_id, value in bindings.items()
    ):
        raise ValueError("Decision document bindings are invalid")
    if record.get("supersedes_decision_id") and not _SAFE_ID.fullmatch(str(record["supersedes_decision_id"])):
        raise ValueError("Decision supersedes identifier is invalid")
    subject, outcome, kind = record.get("subject"), record.get("outcome"), record.get("decision_type")
    if not isinstance(subject, dict) or not isinstance(outcome, dict):
        raise ValueError("Decision subject and outcome are invalid")
    if kind == "field_resolution":
        if set(subject) != {"doc_id", "field_name"} or subject.get("doc_id") not in bindings:
            raise ValueError("Field decision subject is invalid")
        state = outcome.get("state")
        expected = {"state", "candidate_fingerprint"} if state == "selected_candidate" else {"state", "value", "provenance"} if state == "manual_correction" else {"state"}
        if state not in FIELD_OUTCOMES or set(outcome) != expected:
            raise ValueError("Field decision outcome fields are invalid")
        if state == "selected_candidate" and not valid_fingerprint(outcome.get("candidate_fingerprint")):
            raise ValueError("Field candidate fingerprint is invalid")
        if state == "manual_correction" and (
            not _valid_manual_value(str(subject.get("field_name") or ""), outcome.get("value"))
            or not str(outcome.get("provenance") or "").strip() or len(str(outcome["provenance"])) > 1000
            or not str(record.get("rationale") or "").strip()
        ):
            raise ValueError("Manual correction is invalid")
    elif kind == "family_assignment":
        if set(subject) != {"doc_id"} or subject.get("doc_id") not in bindings:
            raise ValueError("Family decision subject is invalid")
        state = outcome.get("state")
        expected = {"state", "family_id"} if state == "assigned" else {"state"}
        if state not in FAMILY_OUTCOMES or set(outcome) != expected or (state == "assigned" and not _SAFE_ID.fullmatch(str(outcome.get("family_id") or ""))):
            raise ValueError("Family decision outcome is invalid")
    else:
        if set(subject) != {"suggestion_id"} or len(bindings) != 2 or set(outcome) != {"status"} or outcome.get("status") not in RELATIONSHIP_OUTCOMES:
            raise ValueError("Relationship decision is invalid")
    expected_affects = kind == "family_assignment" and outcome.get("state") == "assigned"
    if record.get("affects_family_counts") is not expected_affects:
        raise ValueError("Decision family-count effect is invalid")
    if snapshot is not None:
        documents, relations = _document_map(snapshot), _relationship_map(snapshot)
        for doc_id, bound_fingerprint in bindings.items():
            if doc_id not in documents or documents[doc_id].get("input_fingerprint") != bound_fingerprint:
                raise ValueError("Decision is stale because a bound document changed or is missing")
        if kind == "field_resolution":
            field = (documents[subject["doc_id"]].get("fields") or {}).get(subject["field_name"])
            if not field:
                raise ValueError("Decision is stale because its field is missing")
            if outcome["state"] == "selected_candidate" and outcome["candidate_fingerprint"] not in {
                candidate_fingerprint(row) for row in field.get("candidates") or []
            }:
                raise ValueError("Decision is stale because its candidate changed")
        elif kind == "relationship_review":
            relation = relations.get(subject["suggestion_id"])
            if not relation or set(bindings) != {relation["source_doc_id"], relation["target_doc_id"]}:
                raise ValueError("Decision is stale because its relationship suggestion changed")


def write_identity_decision(record: dict[str, Any], exports_dir: Path) -> Path:
    """Internal immutable writer used by replay fixtures and locked append.

    Researcher-facing code must call :func:`append_identity_decision`, which
    performs the compare-and-append concurrency check before reaching here.
    """
    validate_identity_decision(record)
    exports_dir = Path(exports_dir)
    root = exports_dir / "review" / "source_identity" / "decisions"
    for candidate in (exports_dir, exports_dir / "review", exports_dir / "review" / "source_identity", root):
        if candidate.is_symlink():
            raise ValueError("Source identity decision path cannot contain a symlink")
    root.mkdir(parents=True, exist_ok=True)
    path = root / f"source_identity_decision_{record['decision_fingerprint']}.json"
    if path.is_symlink():
        raise ValueError("Source identity decision file cannot be a symlink")
    if path.exists():
        if json.loads(path.read_text(encoding="utf-8")) != record:
            raise ValueError("Source identity decision path collision")
    else:
        atomic_write_json(path, record)
    return path


def append_identity_decision(record: dict[str, Any], exports_dir: Path) -> Path:
    """Compare-and-append one decision while holding the local ledger lock."""
    validate_identity_decision(record)
    exports_dir = Path(exports_dir)
    root = exports_dir / "review" / "source_identity" / "decisions"
    for candidate in (exports_dir, exports_dir / "review", exports_dir / "review" / "source_identity", root):
        if candidate.is_symlink():
            raise ValueError("Source identity decision path cannot contain a symlink")
    root.mkdir(parents=True, exist_ok=True)
    lock_path = root / ".decision_ledger.lock"
    if lock_path.is_symlink():
        raise ValueError("Source identity decision lock cannot be a symlink")
    fd = os.open(lock_path, os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0), 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        existing = load_identity_decisions(exports_dir)
        duplicate = next((row for row in existing if row["decision_id"] == record["decision_id"]), None)
        if duplicate:
            if duplicate != record:
                raise ValueError("Decision id collision")
            return root / f"source_identity_decision_{record['decision_fingerprint']}.json"
        subject_rows = [row for row in existing if _subject_key(row) == _subject_key(record)]
        active = _active_decisions(subject_rows) if subject_rows else {}
        current = next(iter(active.values()), None)
        expected = record.get("supersedes_decision_id") or ""
        actual = current["decision_id"] if current else ""
        if expected != actual:
            raise ValueError("Decision ledger changed; refresh before saving this decision")
        return write_identity_decision(record, exports_dir)
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
        os.close(fd)


def load_identity_decisions(exports_dir: Path) -> list[dict[str, Any]]:
    root = Path(exports_dir) / "review" / "source_identity" / "decisions"
    if not root.is_dir() or root.is_symlink():
        return []
    records = []
    for path in sorted(root.glob("source_identity_decision_*.json")):
        if path.is_symlink() or path.stat().st_size > MAX_DECISION_BYTES:
            raise ValueError("Unsafe source identity decision file")
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise ValueError(f"Unreadable source identity decision: {path.name}") from exc
        if not isinstance(record, dict):
            raise ValueError("Source identity decision must be an object")
        validate_identity_decision(record)
        if path.name != f"source_identity_decision_{record['decision_fingerprint']}.json":
            raise ValueError("Source identity decision filename does not match its content")
        records.append(record)
    return records


def partition_identity_decisions(
    snapshot: dict[str, Any], decisions: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Separate applicable decisions from records made stale by changed evidence."""
    applicable, stale = [], []
    for record in decisions:
        try:
            validate_identity_decision(record, snapshot)
        except ValueError:
            stale.append(record)
        else:
            applicable.append(record)
    return applicable, stale


def _active_decisions(decisions: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Resolve explicit supersession chains without trusting wall-clock order."""
    all_ids: dict[str, dict[str, Any]] = {}
    groups: dict[str, list[dict[str, Any]]] = {}
    for record in decisions:
        if record["decision_id"] in all_ids:
            raise ValueError("Decision ledger contains a duplicate decision id")
        all_ids[record["decision_id"]] = record
        groups.setdefault(_subject_key(record), []).append(record)
    active: dict[str, dict[str, Any]] = {}
    for key, rows in groups.items():
        row_ids = {row["decision_id"] for row in rows}
        roots = [row for row in rows if not row.get("supersedes_decision_id")]
        if len(roots) != 1:
            raise ValueError("Each decision subject must have exactly one supersession root")
        child_by_parent: dict[str, dict[str, Any]] = {}
        for row in rows:
            parent = row.get("supersedes_decision_id") or ""
            if not parent:
                continue
            if parent not in row_ids:
                raise ValueError("Decision supersedes a missing or different subject decision")
            if parent in child_by_parent:
                raise ValueError("Decision ledger contains a branched supersession chain")
            child_by_parent[parent] = row
        current, visited = roots[0], set()
        while current["decision_id"] in child_by_parent:
            if current["decision_id"] in visited:
                raise ValueError("Decision ledger contains a supersession cycle")
            visited.add(current["decision_id"])
            current = child_by_parent[current["decision_id"]]
        visited.add(current["decision_id"])
        if visited != row_ids:
            raise ValueError("Decision ledger contains a disconnected supersession chain")
        active[key] = current
    return active


def apply_identity_decisions(snapshot: dict[str, Any], decisions: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a reviewed projection while retaining the immutable derived snapshot."""
    validate_identity_snapshot(snapshot)
    documents = deepcopy(snapshot.get("documents") or [])
    relationships = deepcopy(snapshot.get("relationship_suggestions") or [])
    doc_map = {row["doc_id"]: row for row in documents}
    relation_map = {row["suggestion_id"]: row for row in relationships}
    ordered = sorted(decisions, key=lambda row: str(row.get("decision_id") or ""))
    for record in ordered:
        validate_identity_decision(record, snapshot)
    active_by_subject = _active_decisions(ordered)

    for record in active_by_subject.values():
        kind, subject, outcome = record["decision_type"], record["subject"], record["outcome"]
        audit = {"decision_id": record["decision_id"], "researcher_id": record["researcher_id"], "decided_at": record["decided_at"]}
        if kind == "field_resolution":
            field = doc_map[subject["doc_id"]]["fields"][subject["field_name"]]
            selected = None
            if outcome["state"] == "selected_candidate":
                selected = next(row for row in field["candidates"] if candidate_fingerprint(row) == outcome["candidate_fingerprint"])
            field["researcher_resolution"] = {
                **audit, "state": outcome["state"],
                **({"provenance": outcome["provenance"]} if outcome["state"] == "manual_correction" else {}),
            }
            field["effective_value"] = outcome["value"] if outcome["state"] == "manual_correction" else selected["value"] if selected else None
        elif kind == "family_assignment":
            document = doc_map[subject["doc_id"]]
            if outcome["state"] == "assigned":
                document["confirmed_document_family_id"] = outcome["family_id"]
                document["candidate_document_family_id"] = outcome["family_id"]
                document["family_resolution_state"] = "researcher_confirmed"
            else:
                document["confirmed_document_family_id"] = ""
                document["candidate_document_family_id"] = ""
                document["family_resolution_state"] = "researcher_unassigned" if outcome["state"] == "unassigned" else "deferred"
            document["family_researcher_decision"] = {**audit, "state": outcome["state"]}
        else:
            relation = relation_map[subject["suggestion_id"]]
            relation["suggested_status"] = relation.get("status") or "pending"
            relation["status"] = outcome["status"]
            relation["review_status"] = outcome["status"]
            relation["researcher_decision"] = audit
            relation["affects_family_counts"] = False

    counts = summarize_identity_counts(documents, relationships)
    source_scope = deepcopy(snapshot.get("scope") or {})
    if source_scope.get("is_complete_corpus") is not True:
        counts["source_family_count"] = None
        counts["source_family_count_reason"] = "Partial identity scope cannot establish a corpus source-family count"
    applied_ids = sorted(record["decision_id"] for record in active_by_subject.values())
    ledger_rows = sorted(
        ({"decision_id": row["decision_id"], "decision_fingerprint": row["decision_fingerprint"]} for row in ordered),
        key=lambda row: row["decision_id"],
    )
    projection = {
        "schema_version": PROJECTION_SCHEMA_VERSION,
        "source_snapshot_fingerprint": snapshot["snapshot_fingerprint"],
        "source_scope": source_scope,
        "decision_origin_snapshot_fingerprints": sorted({row["source_snapshot_fingerprint"] for row in ordered}),
        "decision_ledger_fingerprint": canonical_fingerprint(ledger_rows),
        "applied_decision_ids": applied_ids,
        "documents": documents,
        "relationships": relationships,
        "count_summary": counts,
        "automatic_merges": False,
        "independent_attestation_claim": False,
    }
    projection["projection_fingerprint"] = canonical_fingerprint(projection)
    return projection


def validate_reviewed_identity_projection(
    projection: dict[str, Any], snapshot: dict[str, Any], decisions: list[dict[str, Any]],
) -> None:
    """Fail closed unless a reviewed projection is the exact replay result."""
    if not isinstance(projection, dict) or projection.get("schema_version") != PROJECTION_SCHEMA_VERSION:
        raise ValueError("Unsupported reviewed source identity projection")
    fingerprint = projection.get("projection_fingerprint")
    stable = {key: value for key, value in projection.items() if key != "projection_fingerprint"}
    if not valid_fingerprint(fingerprint) or canonical_fingerprint(stable) != fingerprint:
        raise ValueError("Reviewed source identity projection fingerprint is invalid")
    expected = apply_identity_decisions(snapshot, decisions)
    if projection != expected:
        raise ValueError("Reviewed source identity projection is not reproducible from its snapshot and ledger")


def write_reviewed_identity_projection(
    projection: dict[str, Any], exports_dir: Path, snapshot: dict[str, Any], decisions: list[dict[str, Any]],
) -> Path:
    validate_reviewed_identity_projection(projection, snapshot, decisions)
    exports_dir = Path(exports_dir)
    # The reviewed artifact must always have a discoverable, validated replay base.
    write_identity_snapshot(snapshot, exports_dir)
    root = exports_dir / "review" / "source_identity" / "reviewed"
    for candidate in (exports_dir, exports_dir / "review", exports_dir / "review" / "source_identity", root):
        if candidate.is_symlink():
            raise ValueError("Reviewed source identity path cannot contain a symlink")
    root.mkdir(parents=True, exist_ok=True)
    immutable = root / f"source_identity_reviewed_{projection['projection_fingerprint']}.json"
    latest = root / "latest_reviewed_source_identity.json"
    if immutable.is_symlink() or latest.is_symlink():
        raise ValueError("Reviewed source identity output cannot be a symlink")
    if immutable.exists():
        if json.loads(immutable.read_text(encoding="utf-8")) != projection:
            raise ValueError("Reviewed source identity projection path collision")
    else:
        atomic_write_json(immutable, projection)
    atomic_write_json(latest, {
        "schema_version": "source-identity-reviewed-latest-v1.0",
        "projection_fingerprint": projection["projection_fingerprint"],
        "projection_file": immutable.name,
    })
    return immutable


def load_current_reviewed_identity_projection(exports_dir: Path) -> dict[str, Any]:
    """Recompute the current reviewed projection from validated local evidence.

    Stale decisions remain in the immutable ledger but are excluded from this
    current projection. Their count is surfaced without weakening replay.
    """
    snapshot = load_latest_identity_snapshot(exports_dir)
    ledger = load_identity_decisions(exports_dir)
    applicable, _stale = partition_identity_decisions(snapshot, ledger)
    projection = apply_identity_decisions(snapshot, applicable)
    validate_reviewed_identity_projection(projection, snapshot, applicable)
    # Stale records remain inspectable in the ledger; consumers receive only a
    # projection whose fingerprint is the exact validated replay.
    return projection
