"""Planner-only, append-only attempt proposals for verified workflow bundles.

This module deliberately has no execution capability.  Command arrays are
validated and stored as inert JSON evidence for a later, separately authorized
executor.  It does not spawn processes, acquire execution leases, import corpus
artifacts, or perform remote writes.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .workflow_attestation import validate_attestation_against_bundle
from .workflow_integrity import (
    canonical_fingerprint,
    require_bound_fingerprint,
    safe_workflow_batch_id,
    valid_fingerprint,
    write_immutable_snapshot,
    write_latest_projection,
)


SCHEMA_VERSION = "workflow-attempt-plan-v1.0"
DB_SCHEMA_VERSION = "workflow-attempt-ledger-v1.1"
LEGACY_DB_SCHEMA_VERSION = "workflow-attempt-ledger-v1.0"
PLAN_MODES = {"run_missing", "run_selected", "retry_failed", "resume_interrupted"}
DISPOSITIONS = {
    "planned_not_authorized",
    "held_prerequisite",
    "human_required",
    "satisfied",
    "settled",
}
ALLOWED_COMMANDS = {
    "media-report": "media",
    "testimony-candidates-build": "testimony",
    "testimony-deep-review": "testimony",
    "longform-build": "longform",
    "longform-review": "longform",
    "second-opinion": "second_opinion",
}
MAX_STAGE_INPUT_FILES = 100
MAX_STAGE_INPUT_BYTES = 1024 * 1024 * 1024
STAGE_INPUT_FILENAMES = {
    "media-report": {
        "media_metadata.json", "transcript_versions.json", "transcript_comparison.json",
        "transcript_chunks.json", "comment_queue.json", "candidate_sources.json",
        "duplicate_candidates.json",
    },
    "testimony-candidates-build": {
        "citation_units.json", "analysis.json", "analysis_audit.json", "enrichment.json",
        "enrichment_audit.json", "longform_section_analyses.jsonl", "longform_synthesis.json",
    },
    "testimony-deep-review": {
        "testimony_candidates.json", "citation_units.json", "testimony_segment_analyses.jsonl",
        "testimony_segments.json",
    },
    "longform-build": {
        "source.pdf", "source.epub", "source.docx", "source.doc", "source.odt", "source.md",
        "source.txt", "source.html", "extracted.txt", "intake.json", "preprocess.json",
        "analysis.json", "source_item.json", "offload_import.json",
    },
    "longform-review": {
        "text_blocks.jsonl", "bibliographic.json", "longform_quality.json",
        "longform_sections.json", "longform_section_analyses.jsonl", "longform_synthesis.json",
    },
    "second-opinion": {"analysis.json", "enrichment.json", "citation_units.json"},
}
STAGE_COMPLETION_FILES = {
    "testimony-candidates-build": ("testimony_candidates.json",),
    "longform-build": (
        "longform_source.json", "bibliographic.json", "page_map.jsonl", "text_blocks.jsonl",
        "longform_quality.json",
    ),
}
FILTER_STAGES = ({"local_base", *ALLOWED_COMMANDS} | {
    f"specialist:{route}"
    for route in {"media", "testimony", "legal", "longform", "second_opinion"}
})
PLAN_FIELDS = {
    "schema_version", "workflow_batch_id", "workflow_fingerprint", "dispatch_fingerprint",
    "attestation_fingerprint", "planner_only", "execution_authorized", "remote_writes",
    "request", "rows", "summary", "generated_at", "evidence_fingerprint",
}
ROW_FIELDS = {
    "attempt_id", "intent_key", "request_key", "workflow_batch_id", "queue_item_id",
    "item_ordinal", "route_sequence", "depends_on_attempt_ids", "doc_id", "stage", "route",
    "disposition", "reason", "command", "command_fingerprint",
    "proposal_input_fingerprint", "stage_input_status", "stage_input_fingerprint",
    "stage_input_evidence", "workflow_fingerprint", "dispatch_fingerprint",
    "attestation_fingerprint", "execution_authorized",
    "lease_required", "lease_acquired", "log_path", "human_authority",
}
HashCache = dict[tuple[str, int, int, int, int, int], str]


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


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
        raise ValueError("Attempt doc_id is not safe")
    return doc_id


def _validate_inert_command(command: Any, *, route: str, doc_id: str) -> list[str]:
    if not isinstance(command, list) or not all(type(value) is str for value in command):
        raise ValueError("Attempt command must be an argv list of text values")
    if len(command) != 5 or command[:3] != [".venv/bin/python", "-m", "runner.main"]:
        raise ValueError("Attempt command shape is not allowlisted")
    verb = command[3]
    if ALLOWED_COMMANDS.get(verb) != route:
        raise ValueError("Attempt command is not allowlisted for its specialist route")
    if not doc_id or command[4] != doc_id or _safe_doc_id(command[4]) != doc_id:
        raise ValueError("Attempt command document identity does not match the plan")
    return command


def _plan_stable(plan: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in plan.items() if key not in {"generated_at", "evidence_fingerprint"}}


def validate_attempt_bundle(
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    corpus_dir: Path,
) -> None:
    """Jointly validate all planning evidence against current local artifacts."""
    validate_attestation_against_bundle(attestation, workflow, dispatch, Path(corpus_dir))


def _request(
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    *,
    mode: str,
    selected_item_ids: list[str] | None,
    selected_stages: list[str] | None,
) -> dict[str, Any]:
    if mode not in PLAN_MODES:
        raise ValueError("Unsupported attempt planning mode")
    workflow_order = [str(row["queue_item_id"]) for row in workflow["items"]]
    requested_ids = list(selected_item_ids or [])
    if any(type(value) is not str or not value or value != value.strip() for value in requested_ids):
        raise ValueError("Selected queue IDs must be non-empty text values")
    if len(set(requested_ids)) != len(requested_ids):
        raise ValueError("Selected queue IDs must be unique")
    unknown = set(requested_ids) - set(workflow_order)
    if unknown:
        raise ValueError("Selected queue IDs are not present in the bound workflow")
    if mode == "run_selected" and not requested_ids:
        raise ValueError("run_selected requires at least one queue ID")
    normalized_ids = [value for value in workflow_order if not requested_ids or value in requested_ids]

    requested_stages = list(selected_stages or [])
    if len(set(requested_stages)) != len(requested_stages):
        raise ValueError("Selected stages must be unique")
    if any(stage not in FILTER_STAGES for stage in requested_stages):
        raise ValueError("Selected stage is not supported by the planner")
    no_eligible_reason = (
        "planner_only_has_no_execution_events"
        if mode in {"retry_failed", "resume_interrupted"}
        else ""
    )
    stable = {
        "mode": mode,
        "selected_queue_item_ids": normalized_ids,
        "selected_stages": sorted(requested_stages),
        "no_eligible_reason": no_eligible_reason,
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
        "attestation_fingerprint": attestation["evidence_fingerprint"],
    }
    return {**stable, "request_key": canonical_fingerprint(stable)}


def _file_identity(path: Path) -> tuple[str, int, int, int, int, int]:
    stat = path.stat()
    return (
        str(path.resolve()), stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns,
        stat.st_ino, stat.st_dev,
    )


def _hash_file(path: Path, hash_cache: HashCache | None = None) -> tuple[str, int]:
    before = _file_identity(path)
    if hash_cache is not None and before in hash_cache:
        return hash_cache[before], before[1]
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    after = _file_identity(path)
    if before != after:
        raise ValueError(f"Planned stage input changed while it was being hashed: {path.name}")
    value = digest.hexdigest()
    if hash_cache is not None:
        hash_cache[before] = value
    return value, before[1]


def _stage_input_snapshot(
    corpus_dir: Path,
    doc_id: str,
    stage: str,
    *,
    hash_cache: HashCache | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    """Hash bounded, direct local inputs without following links or copying files."""
    doc_id = _safe_doc_id(doc_id)
    doc_dir = Path(corpus_dir) / doc_id
    if not doc_id or not doc_dir.is_dir() or doc_dir.is_symlink():
        raise ValueError(f"Planned stage input directory is unavailable for {doc_id or 'empty doc_id'}")
    allowed_names = STAGE_INPUT_FILENAMES.get(stage)
    if not allowed_names:
        raise ValueError(f"Planned stage has no declared input policy: {stage}")
    paths = sorted(
        (path for path in doc_dir.iterdir() if path.is_file() and path.name in allowed_names),
        key=lambda path: path.name,
    )
    if len(paths) > MAX_STAGE_INPUT_FILES:
        raise ValueError(f"Planned stage input set exceeds its file-count safety bound for {doc_id}")
    evidence: list[dict[str, Any]] = []
    total_bytes = 0
    for path in paths:
        if path.is_symlink():
            raise ValueError(f"Planned stage input cannot be a symbolic link: {path.name}")
        digest, size = _hash_file(path, hash_cache)
        total_bytes += size
        if total_bytes > MAX_STAGE_INPUT_BYTES:
            raise ValueError(f"Planned stage input set exceeds its byte safety bound for {doc_id}")
        evidence.append({"name": path.name, "size": size, "sha256": digest})
    if not evidence:
        raise ValueError(f"Planned stage has no direct local input files for {doc_id}")
    fingerprint = canonical_fingerprint({"doc_id": doc_id, "stage": stage, "files": evidence})
    return fingerprint, evidence


def _stage_complete(
    corpus_dir: Path,
    doc_id: str,
    stage: str,
) -> bool:
    required = STAGE_COMPLETION_FILES.get(stage)
    if not required:
        return False
    doc_dir = Path(corpus_dir) / _safe_doc_id(doc_id)
    output_paths = [doc_dir / name for name in required]
    if (
        not doc_dir.is_dir()
        or any(path.is_symlink() for path in output_paths)
        or not all(path.is_file() for path in output_paths)
    ):
        return False
    if stage == "testimony-candidates-build":
        if (doc_dir / "testimony_candidates.execution_hold.json").exists():
            return False
        try:
            payload = json.loads((doc_dir / "testimony_candidates.json").read_text(encoding="utf-8"))
            from .testimony_candidates import validate_testimony_candidates_payload
            validate_testimony_candidates_payload(payload, doc_id=doc_id)
        except (OSError, json.JSONDecodeError):
            return False
        except ValueError:
            return False
    if stage == "longform-build":
        for name in ("longform_source.json", "bibliographic.json", "longform_quality.json"):
            try:
                payload = json.loads((doc_dir / name).read_text(encoding="utf-8"))
                if not isinstance(payload, dict) or payload.get("doc_id") != doc_id:
                    return False
            except (OSError, json.JSONDecodeError):
                return False
        try:
            text_blocks = [
                json.loads(line) for line in (doc_dir / "text_blocks.jsonl").read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]
            if not text_blocks or not all(isinstance(value, dict) for value in text_blocks):
                return False
        except (OSError, json.JSONDecodeError):
            return False
    declared_inputs = [
        doc_dir / name
        for name in STAGE_INPUT_FILENAMES.get(stage, set())
        if (doc_dir / name).is_file() and not (doc_dir / name).is_symlink()
    ]
    if declared_inputs and min(path.stat().st_mtime_ns for path in output_paths) < max(
        path.stat().st_mtime_ns for path in declared_inputs
    ):
        return False
    return True


def _row(
    *,
    request: dict[str, Any],
    workflow_batch_id: str,
    workflow_fingerprint: str,
    dispatch_fingerprint: str,
    attestation_fingerprint: str,
    corpus_dir: Path,
    item_ordinal: int,
    route_sequence: int,
    depends_on_attempt_ids: list[str] | None,
    hash_cache: HashCache | None,
    workflow_item: dict[str, Any],
    dispatch_item: dict[str, Any],
    stage: str,
    route: str,
    disposition: str,
    reason: str,
    command: list[str] | None = None,
    human_authority: str = "",
) -> dict[str, Any]:
    command = list(command or [])
    source = {
        "workflow_item": workflow_item,
        "dispatch_item": dispatch_item,
        "stage": stage,
        "route": route,
        "disposition": disposition,
        "command": command,
    }
    proposal_input_fingerprint = canonical_fingerprint(source)
    planned = disposition == "planned_not_authorized"
    if planned:
        stage_input_fingerprint, stage_input_evidence = _stage_input_snapshot(
            Path(corpus_dir), str(dispatch_item.get("doc_id") or ""), stage,
            hash_cache=hash_cache,
        )
        stage_input_status = "captured"
    else:
        stage_input_fingerprint, stage_input_evidence = "", []
        stage_input_status = (
            "pending_dependency"
            if disposition == "held_prerequisite" and depends_on_attempt_ids
            else "not_applicable"
        )
    dependencies = list(depends_on_attempt_ids or [])
    intent = {
        "request_key": request["request_key"],
        "queue_item_id": workflow_item["queue_item_id"],
        "doc_id": str(dispatch_item.get("doc_id") or ""),
        "stage": stage,
        "route": route,
        "disposition": disposition,
        "command": command,
        "item_ordinal": item_ordinal,
        "route_sequence": route_sequence,
        "depends_on_attempt_ids": dependencies,
        "proposal_input_fingerprint": proposal_input_fingerprint,
        "stage_input_status": stage_input_status,
        "stage_input_fingerprint": stage_input_fingerprint,
        "stage_input_evidence": stage_input_evidence,
        "workflow_fingerprint": workflow_fingerprint,
        "dispatch_fingerprint": dispatch_fingerprint,
        "attestation_fingerprint": attestation_fingerprint,
    }
    intent_key = canonical_fingerprint(intent)
    attempt_id = f"attempt-{intent_key[:24]}"
    return {
        "attempt_id": attempt_id,
        "intent_key": intent_key,
        "request_key": request["request_key"],
        "workflow_batch_id": workflow_batch_id,
        "queue_item_id": workflow_item["queue_item_id"],
        "item_ordinal": item_ordinal,
        "route_sequence": route_sequence,
        "depends_on_attempt_ids": dependencies,
        "doc_id": str(dispatch_item.get("doc_id") or ""),
        "stage": stage,
        "route": route,
        "disposition": disposition,
        "reason": reason,
        "command": command,
        "command_fingerprint": canonical_fingerprint(command),
        "proposal_input_fingerprint": proposal_input_fingerprint,
        "stage_input_status": stage_input_status,
        "stage_input_fingerprint": stage_input_fingerprint,
        "stage_input_evidence": stage_input_evidence,
        "workflow_fingerprint": workflow_fingerprint,
        "dispatch_fingerprint": dispatch_fingerprint,
        "attestation_fingerprint": attestation_fingerprint,
        "execution_authorized": False,
        "lease_required": disposition == "planned_not_authorized",
        "lease_acquired": False,
        "log_path": f"logs/{attempt_id}.log",
        "human_authority": str(human_authority or ""),
    }


def build_attempt_plan(
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    corpus_dir: Path,
    *,
    mode: str = "run_missing",
    selected_item_ids: list[str] | None = None,
    selected_stages: list[str] | None = None,
    hash_cache: HashCache | None = None,
) -> dict[str, Any]:
    """Build inert attempt proposals; never executes any stored command."""
    validate_attempt_bundle(workflow, dispatch, attestation, Path(corpus_dir))
    request = _request(
        workflow,
        dispatch,
        attestation,
        mode=mode,
        selected_item_ids=selected_item_ids,
        selected_stages=selected_stages,
    )
    workflow_by_id = {row["queue_item_id"]: row for row in workflow["items"]}
    dispatch_by_id = {row["queue_item_id"]: row for row in dispatch["items"]}
    rows: list[dict[str, Any]] = []
    stage_filter = set(request["selected_stages"])

    if not request["no_eligible_reason"]:
        workflow_ordinals = {
            str(value["queue_item_id"]): index
            for index, value in enumerate(workflow["items"], start=1)
        }
        for item_id in request["selected_queue_item_ids"]:
            workflow_item = workflow_by_id[item_id]
            dispatch_item = dispatch_by_id[item_id]
            item_ordinal = workflow_ordinals[item_id]
            base_route = str(dispatch_item["base_route"])
            base_status = str(dispatch_item["base_status"])
            if base_route == "deferred":
                base_disposition, base_reason = "settled", "already_settled"
            elif base_route == "technical_hold":
                base_disposition, base_reason = "held_prerequisite", str(workflow_item.get("hold_code") or "technical_hold")
            elif base_status == "already_processed":
                base_disposition, base_reason = "satisfied", "base_artifacts_already_present"
            else:
                base_disposition, base_reason = "held_prerequisite", "local_base_adapter_not_implemented"
            if not stage_filter or "local_base" in stage_filter:
                rows.append(_row(
                    request=request,
                    workflow_batch_id=workflow["workflow_batch_id"],
                    workflow_fingerprint=workflow["evidence_fingerprint"],
                    dispatch_fingerprint=dispatch["evidence_fingerprint"],
                    attestation_fingerprint=attestation["evidence_fingerprint"],
                    corpus_dir=Path(corpus_dir),
                    item_ordinal=item_ordinal,
                    route_sequence=0,
                    depends_on_attempt_ids=[],
                    hash_cache=hash_cache,
                    workflow_item=workflow_item,
                    dispatch_item=dispatch_item,
                    stage="local_base",
                    route=base_route,
                    disposition=base_disposition,
                    reason=base_reason,
                ))

            for specialist in dispatch_item.get("specialists") or []:
                route = str(specialist.get("route") or "")
                commands = specialist.get("commands") or []
                if commands:
                    selected_route = (
                        not stage_filter
                        or f"specialist:{route}" in stage_filter
                        or any(
                            isinstance(command, list)
                            and len(command) > 3
                            and command[3] in stage_filter
                            for command in commands
                        )
                    )
                    if not selected_route:
                        continue
                    previous_attempt_id = ""
                    previous_disposition = "satisfied"
                    previous_stage = ""
                    for route_sequence, command in enumerate(commands, start=1):
                        validated = _validate_inert_command(
                            command,
                            route=route,
                            doc_id=str(dispatch_item.get("doc_id") or ""),
                        )
                        stage = validated[3]
                        already_complete = _stage_complete(
                            Path(corpus_dir), str(dispatch_item.get("doc_id") or ""), stage,
                        )
                        if already_complete:
                            disposition = "satisfied"
                            reason = "stage_artifacts_already_present"
                            stored_command: list[str] = []
                        elif previous_disposition != "satisfied":
                            disposition = "held_prerequisite"
                            reason = f"replan_after_dependency:{previous_stage}"
                            stored_command = []
                        else:
                            disposition = "planned_not_authorized"
                            reason = f"dispatch_status:{specialist.get('status')}"
                            stored_command = validated
                        row = _row(
                            request=request,
                            workflow_batch_id=workflow["workflow_batch_id"],
                            workflow_fingerprint=workflow["evidence_fingerprint"],
                            dispatch_fingerprint=dispatch["evidence_fingerprint"],
                            attestation_fingerprint=attestation["evidence_fingerprint"],
                            corpus_dir=Path(corpus_dir),
                            item_ordinal=item_ordinal,
                            route_sequence=route_sequence,
                            depends_on_attempt_ids=[previous_attempt_id] if previous_attempt_id else [],
                            hash_cache=hash_cache,
                            workflow_item=workflow_item,
                            dispatch_item=dispatch_item,
                            stage=stage,
                            route=route,
                            disposition=disposition,
                            reason=reason,
                            command=stored_command,
                            human_authority=str(specialist.get("human_authority") or ""),
                        )
                        rows.append(row)
                        previous_attempt_id = row["attempt_id"]
                        previous_disposition = row["disposition"]
                        previous_stage = stage
                else:
                    stage = f"specialist:{route}"
                    if stage_filter and stage not in stage_filter:
                        continue
                    status = str(specialist.get("status") or "")
                    if status == "complete":
                        disposition = "satisfied"
                    elif status == "human_required" or route == "legal":
                        disposition = "human_required"
                    else:
                        disposition = "held_prerequisite"
                    rows.append(_row(
                        request=request,
                        workflow_batch_id=workflow["workflow_batch_id"],
                        workflow_fingerprint=workflow["evidence_fingerprint"],
                        dispatch_fingerprint=dispatch["evidence_fingerprint"],
                        attestation_fingerprint=attestation["evidence_fingerprint"],
                        corpus_dir=Path(corpus_dir),
                        item_ordinal=item_ordinal,
                        route_sequence=1,
                        depends_on_attempt_ids=[],
                        hash_cache=hash_cache,
                        workflow_item=workflow_item,
                        dispatch_item=dispatch_item,
                        stage=stage,
                        route=route,
                        disposition=disposition,
                        reason=f"dispatch_status:{status or 'unknown'}",
                        human_authority=str(specialist.get("human_authority") or ""),
                    ))

    summary = {"rows": len(rows), **{value: sum(row["disposition"] == value for row in rows) for value in sorted(DISPOSITIONS)}}
    stable = {
        "schema_version": SCHEMA_VERSION,
        "workflow_batch_id": workflow["workflow_batch_id"],
        "workflow_fingerprint": workflow["evidence_fingerprint"],
        "dispatch_fingerprint": dispatch["evidence_fingerprint"],
        "attestation_fingerprint": attestation["evidence_fingerprint"],
        "planner_only": True,
        "execution_authorized": False,
        "remote_writes": False,
        "request": request,
        "rows": rows,
        "summary": summary,
    }
    plan = {**stable, "generated_at": _now(), "evidence_fingerprint": canonical_fingerprint(stable)}
    validate_attempt_plan(plan)
    return plan


def _expected_summary(rows: list[dict[str, Any]]) -> dict[str, int]:
    return {"rows": len(rows), **{value: sum(row["disposition"] == value for row in rows) for value in sorted(DISPOSITIONS)}}


def validate_attempt_plan(plan: dict[str, Any]) -> None:
    if not isinstance(plan, dict) or set(plan) != PLAN_FIELDS:
        raise ValueError("Attempt plan fields do not match the planner schema")
    if plan.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported attempt plan schema")
    batch_id = safe_workflow_batch_id(plan.get("workflow_batch_id"))
    for field in ("workflow_fingerprint", "dispatch_fingerprint", "attestation_fingerprint"):
        if not valid_fingerprint(plan.get(field)):
            raise ValueError(f"Attempt plan {field} is malformed")
    if plan.get("planner_only") is not True or plan.get("execution_authorized") is not False or plan.get("remote_writes") is not False:
        raise ValueError("Attempt plan must remain planner-only and non-authorizing")
    request = plan.get("request")
    expected_request_fields = {
        "mode", "selected_queue_item_ids", "selected_stages", "no_eligible_reason",
        "workflow_fingerprint", "dispatch_fingerprint", "attestation_fingerprint", "request_key",
    }
    if not isinstance(request, dict) or set(request) != expected_request_fields:
        raise ValueError("Attempt request fields do not match the planner schema")
    if request.get("mode") not in PLAN_MODES:
        raise ValueError("Attempt request mode is unsupported")
    request_stable = {key: value for key, value in request.items() if key != "request_key"}
    if canonical_fingerprint(request_stable) != request.get("request_key"):
        raise ValueError("Attempt request key does not bind the request")
    for field in ("workflow_fingerprint", "dispatch_fingerprint", "attestation_fingerprint"):
        if request.get(field) != plan.get(field):
            raise ValueError("Attempt request does not bind the plan artifacts")
    selected_ids = request.get("selected_queue_item_ids")
    selected_stages = request.get("selected_stages")
    if (
        not isinstance(selected_ids, list)
        or len(selected_ids) > 15
        or not all(type(value) is str and value and value == value.strip() for value in selected_ids)
        or len(set(selected_ids)) != len(selected_ids)
    ):
        raise ValueError("Attempt request queue IDs must be unique bounded text values")
    if (
        not isinstance(selected_stages, list)
        or selected_stages != sorted(selected_stages)
        or len(set(selected_stages)) != len(selected_stages)
        or any(value not in FILTER_STAGES for value in selected_stages)
    ):
        raise ValueError("Attempt request stages must be normalized and supported")
    expected_no_eligible = (
        "planner_only_has_no_execution_events"
        if request["mode"] in {"retry_failed", "resume_interrupted"}
        else ""
    )
    if request.get("no_eligible_reason") != expected_no_eligible:
        raise ValueError("Attempt request eligibility reason does not match its mode")
    rows = plan.get("rows")
    if not isinstance(rows, list) or len(rows) > 120 or not all(isinstance(row, dict) for row in rows):
        raise ValueError("Attempt plan rows must be a bounded list of objects")
    if expected_no_eligible and rows:
        raise ValueError("Retry/resume planning cannot invent execution events")
    attempt_ids: list[str] = []
    intent_keys: list[str] = []
    route_rows: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in rows:
        if set(row) != ROW_FIELDS:
            raise ValueError("Attempt row fields do not match the planner schema")
        if row.get("workflow_batch_id") != batch_id or row.get("request_key") != request.get("request_key"):
            raise ValueError("Attempt row is not bound to the plan request")
        if (
            type(row.get("queue_item_id")) is not str
            or row.get("queue_item_id") not in selected_ids
            or type(row.get("stage")) is not str
            or type(row.get("route")) is not str
            or type(row.get("reason")) is not str
            or not row.get("reason")
            or type(row.get("human_authority")) is not str
        ):
            raise ValueError("Attempt row identity and descriptive fields are invalid")
        if (
            type(row.get("item_ordinal")) is not int
            or not 1 <= row["item_ordinal"] <= 15
            or type(row.get("route_sequence")) is not int
            or row["route_sequence"] < 0
        ):
            raise ValueError("Attempt row ordering fields are invalid")
        dependencies = row.get("depends_on_attempt_ids")
        if (
            not isinstance(dependencies, list)
            or len(set(dependencies)) != len(dependencies)
            or not all(type(value) is str and value.startswith("attempt-") for value in dependencies)
        ):
            raise ValueError("Attempt dependencies must be unique attempt IDs")
        selected_route_commands = {
            ALLOWED_COMMANDS[stage]
            for stage in selected_stages
            if stage in ALLOWED_COMMANDS
        }
        if (
            selected_stages
            and row.get("stage") not in selected_stages
            and f"specialist:{row.get('route')}" not in selected_stages
            and row.get("route") not in selected_route_commands
        ):
            raise ValueError("Attempt row stage is outside the selected stage filter")
        for field in ("workflow_fingerprint", "dispatch_fingerprint", "attestation_fingerprint"):
            if row.get(field) != plan.get(field):
                raise ValueError("Attempt row is not bound to the plan artifacts")
        if row.get("disposition") not in DISPOSITIONS:
            raise ValueError("Attempt disposition is unsupported")
        if row.get("execution_authorized") is not False or row.get("lease_acquired") is not False:
            raise ValueError("Attempt rows cannot authorize execution or acquire a lease")
        planned = row.get("disposition") == "planned_not_authorized"
        if row.get("lease_required") is not planned:
            raise ValueError("Attempt lease requirement does not match its disposition")
        doc_id = _safe_doc_id(row.get("doc_id"))
        command = row.get("command")
        if planned:
            validated = _validate_inert_command(command, route=str(row.get("route") or ""), doc_id=doc_id)
            if row.get("stage") != validated[3]:
                raise ValueError("Attempt stage does not match its command")
            evidence = row.get("stage_input_evidence")
            if row.get("stage_input_status") != "captured" or not isinstance(evidence, list) or not evidence:
                raise ValueError("Planned attempt must carry captured stage input evidence")
            names: list[str] = []
            for value in evidence:
                if (
                    not isinstance(value, dict)
                    or set(value) != {"name", "size", "sha256"}
                    or type(value.get("name")) is not str
                    or not value["name"]
                    or Path(value["name"]).name != value["name"]
                    or type(value.get("size")) is not int
                    or value["size"] < 0
                    or not valid_fingerprint(value.get("sha256"))
                ):
                    raise ValueError("Attempt stage input evidence is malformed")
                names.append(value["name"])
            if names != sorted(names) or len(set(names)) != len(names) or len(names) > 500:
                raise ValueError("Attempt stage input evidence must be sorted, unique, and bounded")
            expected_stage_input = canonical_fingerprint({
                "doc_id": doc_id, "stage": row["stage"], "files": evidence,
            })
            if row.get("stage_input_fingerprint") != expected_stage_input:
                raise ValueError("Attempt stage input fingerprint is invalid")
        elif command != []:
            raise ValueError("Held or satisfied attempt rows cannot carry commands")
        elif (
            row.get("stage_input_status") not in {"not_applicable", "pending_dependency"}
            or row.get("stage_input_fingerprint") != ""
            or row.get("stage_input_evidence") != []
        ):
            raise ValueError("Non-planned attempts cannot claim captured stage inputs")
        elif row.get("stage_input_status") == "pending_dependency" and (
            row.get("disposition") != "held_prerequisite" or not row.get("depends_on_attempt_ids")
        ):
            raise ValueError("Pending stage inputs require a held dependency")
        if row.get("command_fingerprint") != canonical_fingerprint(command):
            raise ValueError("Attempt command fingerprint is invalid")
        if not valid_fingerprint(row.get("proposal_input_fingerprint")):
            raise ValueError("Attempt proposal input fingerprint is malformed")
        intent = {
            "request_key": row["request_key"], "queue_item_id": row["queue_item_id"],
            "doc_id": row["doc_id"], "stage": row["stage"], "route": row["route"],
            "disposition": row["disposition"], "command": row["command"],
            "item_ordinal": row["item_ordinal"],
            "route_sequence": row["route_sequence"],
            "depends_on_attempt_ids": row["depends_on_attempt_ids"],
            "proposal_input_fingerprint": row["proposal_input_fingerprint"],
            "stage_input_status": row["stage_input_status"],
            "stage_input_fingerprint": row["stage_input_fingerprint"],
            "stage_input_evidence": row["stage_input_evidence"],
            "workflow_fingerprint": row["workflow_fingerprint"],
            "dispatch_fingerprint": row["dispatch_fingerprint"],
            "attestation_fingerprint": row["attestation_fingerprint"],
        }
        expected_intent = canonical_fingerprint(intent)
        if row.get("intent_key") != expected_intent or row.get("attempt_id") != f"attempt-{expected_intent[:24]}":
            raise ValueError("Attempt identity does not bind the row")
        if row.get("log_path") != f"logs/{row['attempt_id']}.log":
            raise ValueError("Attempt log path is not the bounded planner path")
        attempt_ids.append(row["attempt_id"])
        intent_keys.append(row["intent_key"])
        route_rows.setdefault((row["queue_item_id"], row["route"]), []).append(row)
    if len(set(attempt_ids)) != len(attempt_ids) or len(set(intent_keys)) != len(intent_keys):
        raise ValueError("Attempt plan contains duplicate identities")
    attempt_by_id = {row["attempt_id"]: row for row in rows}
    for row in rows:
        for dependency_id in row["depends_on_attempt_ids"]:
            dependency = attempt_by_id.get(dependency_id)
            if (
                dependency is None
                or dependency["queue_item_id"] != row["queue_item_id"]
                or dependency["route"] != row["route"]
                or dependency["route_sequence"] >= row["route_sequence"]
            ):
                raise ValueError("Attempt dependency is missing, cross-route, or out of order")
    for grouped in route_rows.values():
        sequenced = [row for row in grouped if row["route_sequence"] > 0]
        if len(sequenced) > 1:
            ordered = sorted(sequenced, key=lambda row: row["route_sequence"])
            if [row["route_sequence"] for row in ordered] != list(range(1, len(ordered) + 1)):
                raise ValueError("Specialist stage sequence must be contiguous")
            for index, row in enumerate(ordered):
                expected_dependencies = [] if index == 0 else [ordered[index - 1]["attempt_id"]]
                if row["depends_on_attempt_ids"] != expected_dependencies:
                    raise ValueError("Specialist stage dependency chain is incomplete")
                if index and ordered[index - 1]["disposition"] != "satisfied" and row["disposition"] == "planned_not_authorized":
                    raise ValueError("A downstream stage cannot be planned before its dependency is satisfied")
    expected_summary = _expected_summary(rows)
    summary = plan.get("summary")
    if (
        not isinstance(summary, dict)
        or set(summary) != set(expected_summary)
        or any(type(value) is not int for value in summary.values())
        or summary != expected_summary
    ):
        raise ValueError("Attempt plan summary does not match its rows")
    require_bound_fingerprint(plan, _plan_stable, label="Attempt plan")


def validate_attempt_plan_against_bundle(
    plan: dict[str, Any],
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    corpus_dir: Path,
    *,
    hash_cache: HashCache | None = None,
) -> None:
    """Regenerate a proposal from bound current evidence and compare exactly."""
    validate_attempt_plan(plan)
    validate_attempt_bundle(workflow, dispatch, attestation, Path(corpus_dir))
    if plan.get("workflow_batch_id") != workflow.get("workflow_batch_id"):
        raise ValueError("Attempt plan batch ID differs from its workflow")
    bindings = {
        "workflow_fingerprint": workflow.get("evidence_fingerprint"),
        "dispatch_fingerprint": dispatch.get("evidence_fingerprint"),
        "attestation_fingerprint": attestation.get("evidence_fingerprint"),
    }
    if any(plan.get(field) != value for field, value in bindings.items()):
        raise ValueError("Attempt plan does not bind the supplied workflow bundle")
    request = plan["request"]
    regenerated = build_attempt_plan(
        workflow,
        dispatch,
        attestation,
        Path(corpus_dir),
        mode=request["mode"],
        selected_item_ids=request["selected_queue_item_ids"],
        selected_stages=request["selected_stages"],
        hash_cache=hash_cache,
    )
    if _plan_stable(regenerated) != _plan_stable(plan):
        raise ValueError("Attempt plan does not match its current workflow bundle")


def write_attempt_plan(
    plan: dict[str, Any],
    out_root: Path,
    *,
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    corpus_dir: Path,
    hash_cache: HashCache | None = None,
) -> Path:
    validate_attempt_plan_against_bundle(
        plan, workflow, dispatch, attestation, Path(corpus_dir), hash_cache=hash_cache,
    )
    batch_id = safe_workflow_batch_id(plan["workflow_batch_id"])
    fingerprint = str(plan["evidence_fingerprint"])
    path = Path(out_root) / batch_id / "plans" / f"{batch_id}--{fingerprint[:12]}.json"
    stored = write_immutable_snapshot(path, plan, label="workflow attempt plan")
    validate_attempt_plan(stored)
    write_latest_projection(Path(out_root) / batch_id / "latest_workflow_attempt_plan.json", stored)
    return path


def _validate_ledger_schema(db: sqlite3.Connection) -> None:
    versions = [row[0] for row in db.execute("SELECT schema_version FROM ledger_metadata")]
    if versions != [DB_SCHEMA_VERSION]:
        raise ValueError("Unsupported workflow attempt ledger schema")
    required_tables = {
        "ledger_metadata", "attempt_intents", "attempt_events", "ledger_migrations",
    }
    tables = {
        str(row[0]) for row in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
    }
    if not required_tables <= tables:
        raise ValueError("Workflow attempt ledger schema is incomplete")
    expected_columns = {
        "ledger_metadata": {"schema_version", "created_at"},
        "attempt_intents": {
            "attempt_id", "intent_key", "plan_fingerprint", "request_key",
            "workflow_batch_id", "queue_item_id", "item_ordinal", "route_sequence",
            "depends_on_json", "doc_id", "stage", "route", "disposition", "reason",
            "command_json", "command_fingerprint", "proposal_input_fingerprint",
            "stage_input_status", "stage_input_fingerprint", "stage_input_evidence_json",
            "workflow_fingerprint", "dispatch_fingerprint", "attestation_fingerprint",
            "execution_authorized", "lease_required", "lease_acquired", "log_path",
            "human_authority", "created_at",
        },
        "attempt_events": {
            "event_id", "event_key", "attempt_id", "sequence", "event_type",
            "disposition", "detail_json", "previous_event_fingerprint",
            "event_fingerprint", "recorded_at",
        },
        "ledger_migrations": {
            "migration_id", "from_version", "to_version", "applied_at",
            "migration_fingerprint",
        },
    }
    for table, expected in expected_columns.items():
        actual = {str(row[1]) for row in db.execute(f"PRAGMA table_info({table})")}
        if actual != expected:
            raise ValueError(f"Workflow attempt ledger table is malformed: {table}")
    expected_triggers = {
        "attempt_intents_no_update", "attempt_intents_no_delete",
        "attempt_events_no_update", "attempt_events_no_delete",
        "ledger_migrations_no_update", "ledger_migrations_no_delete",
    }
    trigger_rows = db.execute(
        "SELECT name,sql FROM sqlite_master WHERE type='trigger'"
    ).fetchall()
    triggers = {str(row[0]) for row in trigger_rows}
    if not expected_triggers <= triggers:
        raise ValueError("Workflow attempt ledger append-only protections are incomplete")
    trigger_sql = {
        str(row[0]): " ".join(str(row[1] or "").lower().split()) for row in trigger_rows
    }
    trigger_requirements = {
        "attempt_intents_no_update": ("before update on attempt_intents", "raise(abort"),
        "attempt_intents_no_delete": ("before delete on attempt_intents", "raise(abort"),
        "attempt_events_no_update": ("before update on attempt_events", "raise(abort"),
        "attempt_events_no_delete": ("before delete on attempt_events", "raise(abort"),
        "ledger_migrations_no_update": ("before update on ledger_migrations", "raise(abort"),
        "ledger_migrations_no_delete": ("before delete on ledger_migrations", "raise(abort"),
    }
    if any(
        any(fragment not in trigger_sql.get(name, "") for fragment in fragments)
        for name, fragments in trigger_requirements.items()
    ):
        raise ValueError("Workflow attempt ledger append-only trigger definitions are malformed")
    table_sql = {
        str(row[0]): " ".join(str(row[1] or "").lower().split())
        for row in db.execute(
            "SELECT name,sql FROM sqlite_master WHERE type='table' AND name IN ('attempt_intents','attempt_events')"
        )
    }
    required_ddl = {
        "attempt_intents": (
            "attempt_id text primary key", "intent_key text not null unique",
            "check(execution_authorized=0)", "check(lease_acquired=0)",
        ),
        "attempt_events": (
            "event_key text not null unique", "references attempt_intents(attempt_id)",
            "unique(attempt_id, sequence)",
        ),
    }
    if any(
        any(fragment not in table_sql.get(table, "") for fragment in fragments)
        for table, fragments in required_ddl.items()
    ):
        raise ValueError("Workflow attempt ledger constraints are incomplete")
    migrations = db.execute(
        "SELECT * FROM ledger_migrations ORDER BY applied_at,migration_id"
    ).fetchall()
    if len(migrations) != 1:
        raise ValueError("Workflow attempt ledger migration history is missing")
    for migration in migrations:
        stable = {
            "migration_id": migration["migration_id"],
            "from_version": migration["from_version"],
            "to_version": migration["to_version"],
            "applied_at": migration["applied_at"],
        }
        if migration["migration_fingerprint"] != canonical_fingerprint(stable):
            raise ValueError("Workflow attempt ledger migration history is malformed")
    if migrations[-1]["to_version"] != DB_SCHEMA_VERSION:
        raise ValueError("Workflow attempt ledger migration history does not reach this schema")
    lineage = (
        migrations[0]["migration_id"], migrations[0]["from_version"],
        migrations[0]["to_version"],
    )
    if lineage not in {
        ("initial-v1.1", "", DB_SCHEMA_VERSION),
        ("v1.0-to-v1.1", LEGACY_DB_SCHEMA_VERSION, DB_SCHEMA_VERSION),
    }:
        raise ValueError("Workflow attempt ledger migration lineage is unsupported")
    foreign_keys = db.execute("PRAGMA foreign_key_list(attempt_events)").fetchall()
    if not any(
        str(row[2]) == "attempt_intents" and str(row[3]) == "attempt_id"
        and str(row[4]) == "attempt_id"
        for row in foreign_keys
    ):
        raise ValueError("Workflow attempt ledger event foreign key is missing")


_LEDGER_SCHEMA_STATEMENTS = (
    """CREATE TABLE IF NOT EXISTS attempt_intents (
        attempt_id TEXT PRIMARY KEY,
        intent_key TEXT NOT NULL UNIQUE,
        plan_fingerprint TEXT NOT NULL,
        request_key TEXT NOT NULL,
        workflow_batch_id TEXT NOT NULL,
        queue_item_id TEXT NOT NULL,
        item_ordinal INTEGER NOT NULL,
        route_sequence INTEGER NOT NULL,
        depends_on_json TEXT NOT NULL,
        doc_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        route TEXT NOT NULL,
        disposition TEXT NOT NULL,
        reason TEXT NOT NULL,
        command_json TEXT NOT NULL,
        command_fingerprint TEXT NOT NULL,
        proposal_input_fingerprint TEXT NOT NULL,
        stage_input_status TEXT NOT NULL,
        stage_input_fingerprint TEXT NOT NULL,
        stage_input_evidence_json TEXT NOT NULL,
        workflow_fingerprint TEXT NOT NULL,
        dispatch_fingerprint TEXT NOT NULL,
        attestation_fingerprint TEXT NOT NULL,
        execution_authorized INTEGER NOT NULL CHECK(execution_authorized=0),
        lease_required INTEGER NOT NULL,
        lease_acquired INTEGER NOT NULL CHECK(lease_acquired=0),
        log_path TEXT NOT NULL,
        human_authority TEXT NOT NULL,
        created_at TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS attempt_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_key TEXT NOT NULL UNIQUE,
        attempt_id TEXT NOT NULL REFERENCES attempt_intents(attempt_id),
        sequence INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        disposition TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        previous_event_fingerprint TEXT NOT NULL,
        event_fingerprint TEXT NOT NULL UNIQUE,
        recorded_at TEXT NOT NULL,
        UNIQUE(attempt_id, sequence)
    )""",
    """CREATE TABLE IF NOT EXISTS ledger_migrations (
        migration_id TEXT PRIMARY KEY,
        from_version TEXT NOT NULL,
        to_version TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        migration_fingerprint TEXT NOT NULL UNIQUE
    )""",
    """CREATE TRIGGER IF NOT EXISTS attempt_intents_no_update
        BEFORE UPDATE ON attempt_intents BEGIN SELECT RAISE(ABORT, 'attempt intents are append-only'); END""",
    """CREATE TRIGGER IF NOT EXISTS attempt_intents_no_delete
        BEFORE DELETE ON attempt_intents BEGIN SELECT RAISE(ABORT, 'attempt intents are append-only'); END""",
    """CREATE TRIGGER IF NOT EXISTS attempt_events_no_update
        BEFORE UPDATE ON attempt_events BEGIN SELECT RAISE(ABORT, 'attempt events are append-only'); END""",
    """CREATE TRIGGER IF NOT EXISTS attempt_events_no_delete
        BEFORE DELETE ON attempt_events BEGIN SELECT RAISE(ABORT, 'attempt events are append-only'); END""",
    """CREATE TRIGGER IF NOT EXISTS ledger_migrations_no_update
        BEFORE UPDATE ON ledger_migrations BEGIN SELECT RAISE(ABORT, 'ledger migrations are append-only'); END""",
    """CREATE TRIGGER IF NOT EXISTS ledger_migrations_no_delete
        BEFORE DELETE ON ledger_migrations BEGIN SELECT RAISE(ABORT, 'ledger migrations are append-only'); END""",
)


def _record_ledger_migration(
    db: sqlite3.Connection,
    *,
    migration_id: str,
    from_version: str,
    to_version: str,
    applied_at: str,
) -> None:
    fingerprint = canonical_fingerprint({
        "migration_id": migration_id,
        "from_version": from_version,
        "to_version": to_version,
        "applied_at": applied_at,
    })
    db.execute(
        """INSERT INTO ledger_migrations
           (migration_id,from_version,to_version,applied_at,migration_fingerprint)
           VALUES (?,?,?,?,?)""",
        (migration_id, from_version, to_version, applied_at, fingerprint),
    )


def open_attempt_ledger(path: Path, *, create: bool = True) -> sqlite3.Connection:
    path = Path(path)
    if not create:
        if not path.is_file():
            raise FileNotFoundError(f"Workflow attempt ledger does not exist: {path}")
        db = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA query_only=ON")
        _validate_ledger_schema(db)
        return db
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        preexisting_tables = {
            str(row[0]) for row in db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
        }
        if preexisting_tables and "ledger_metadata" not in preexisting_tables:
            raise ValueError("Refusing to initialize a non-ledger SQLite database")
        db.execute("""CREATE TABLE IF NOT EXISTS ledger_metadata (
            schema_version TEXT PRIMARY KEY,
            created_at TEXT NOT NULL
        )""")
        existing_versions = [row[0] for row in db.execute(
            "SELECT schema_version FROM ledger_metadata"
        )]
        if existing_versions not in ([], [LEGACY_DB_SCHEMA_VERSION], [DB_SCHEMA_VERSION]):
            raise ValueError("Unsupported workflow attempt ledger schema")
        if existing_versions == [DB_SCHEMA_VERSION]:
            _validate_ledger_schema(db)
            db.commit()
            return db
        db.commit()
        db.execute("BEGIN IMMEDIATE")
        for statement in _LEDGER_SCHEMA_STATEMENTS:
            db.execute(statement)
        now = _now()
        if not existing_versions:
            db.execute(
                "INSERT INTO ledger_metadata(schema_version,created_at) VALUES (?,?)",
                (DB_SCHEMA_VERSION, now),
            )
            _record_ledger_migration(
                db,
                migration_id="initial-v1.1",
                from_version="",
                to_version=DB_SCHEMA_VERSION,
                applied_at=now,
            )
        elif existing_versions == [LEGACY_DB_SCHEMA_VERSION]:
            _record_ledger_migration(
                db,
                migration_id="v1.0-to-v1.1",
                from_version=LEGACY_DB_SCHEMA_VERSION,
                to_version=DB_SCHEMA_VERSION,
                applied_at=now,
            )
            db.execute(
                "UPDATE ledger_metadata SET schema_version=? WHERE schema_version=?",
                (DB_SCHEMA_VERSION, LEGACY_DB_SCHEMA_VERSION),
            )
        _validate_ledger_schema(db)
        db.commit()
        return db
    except Exception:
        db.rollback()
        db.close()
        raise


def _intent_record(plan: dict[str, Any], row: dict[str, Any], created_at: str) -> dict[str, Any]:
    return {
        "attempt_id": row["attempt_id"], "intent_key": row["intent_key"],
        "plan_fingerprint": plan["evidence_fingerprint"], "request_key": row["request_key"],
        "workflow_batch_id": row["workflow_batch_id"], "queue_item_id": row["queue_item_id"],
        "item_ordinal": row["item_ordinal"], "route_sequence": row["route_sequence"],
        "depends_on_json": json.dumps(row["depends_on_attempt_ids"], sort_keys=True, separators=(",", ":")),
        "doc_id": row["doc_id"], "stage": row["stage"], "route": row["route"],
        "disposition": row["disposition"], "reason": row["reason"],
        "command_json": json.dumps(row["command"], sort_keys=True, separators=(",", ":")),
        "command_fingerprint": row["command_fingerprint"],
        "proposal_input_fingerprint": row["proposal_input_fingerprint"],
        "stage_input_status": row["stage_input_status"],
        "stage_input_fingerprint": row["stage_input_fingerprint"],
        "stage_input_evidence_json": json.dumps(row["stage_input_evidence"], sort_keys=True, separators=(",", ":")),
        "workflow_fingerprint": row["workflow_fingerprint"], "dispatch_fingerprint": row["dispatch_fingerprint"],
        "attestation_fingerprint": row["attestation_fingerprint"], "execution_authorized": 0,
        "lease_required": int(row["lease_required"]), "lease_acquired": 0,
        "log_path": row["log_path"], "human_authority": row["human_authority"],
        "created_at": created_at,
    }


def _assert_existing_intent(existing: sqlite3.Row, expected: dict[str, Any]) -> None:
    for key, value in expected.items():
        if key == "created_at":
            continue
        if existing[key] != value:
            raise ValueError(f"Attempt intent collision for {expected['attempt_id']}")


def _initial_event_expected(plan: dict[str, Any], row: dict[str, Any]) -> tuple[str, str]:
    detail = {
        "plan_fingerprint": plan["evidence_fingerprint"],
        "reason": row["reason"],
        "planner_only": True,
        "execution_authorized": False,
    }
    detail_json = json.dumps(detail, sort_keys=True, separators=(",", ":"))
    event_key = canonical_fingerprint({
        "attempt_id": row["attempt_id"], "event_type": "proposal_recorded",
        "disposition": row["disposition"], "detail": detail,
    })
    return event_key, detail_json


def _validate_initial_event(event: sqlite3.Row, plan: dict[str, Any], row: dict[str, Any]) -> None:
    event_key, detail_json = _initial_event_expected(plan, row)
    stable = {
        "event_key": event["event_key"], "attempt_id": event["attempt_id"],
        "sequence": event["sequence"], "event_type": event["event_type"],
        "disposition": event["disposition"], "detail_json": event["detail_json"],
        "previous_event_fingerprint": event["previous_event_fingerprint"],
        "recorded_at": event["recorded_at"],
    }
    if (
        event["event_key"] != event_key
        or event["attempt_id"] != row["attempt_id"]
        or event["sequence"] != 1
        or event["event_type"] != "proposal_recorded"
        or event["disposition"] != row["disposition"]
        or event["detail_json"] != detail_json
        or event["previous_event_fingerprint"] != ""
        or canonical_fingerprint(stable) != event["event_fingerprint"]
    ):
        raise ValueError(f"Attempt event integrity mismatch for {row['attempt_id']}")


EXECUTION_EVENT_DISPOSITIONS = {
    "execution_authorized": "authorized_local_sidecar",
    "lease_acquired": "leased",
    "preservation_recorded": "preserved",
    "execution_started": "running",
    "execution_succeeded": "succeeded",
    "execution_failed": "failed",
    "execution_recovery_hold": "recovery_hold",
    "lease_released": "released",
}
EXECUTION_TERMINAL_EVENTS = {
    "execution_succeeded", "execution_failed", "execution_recovery_hold",
}
SUPPORTED_EXECUTION_ADAPTERS = {
    ("testimony-candidates-build", "testimony-candidates-local-v1.0"),
}


def _event_stable(event: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    return {
        "event_key": event["event_key"], "attempt_id": event["attempt_id"],
        "sequence": event["sequence"], "event_type": event["event_type"],
        "disposition": event["disposition"], "detail_json": event["detail_json"],
        "previous_event_fingerprint": event["previous_event_fingerprint"],
        "recorded_at": event["recorded_at"],
    }


def _parse_execution_time(value: Any, *, label: str) -> datetime:
    if type(value) is not str or not value:
        raise ValueError(f"Attempt execution {label} is missing")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"Attempt execution {label} is malformed") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"Attempt execution {label} must include a timezone")
    return parsed


def _execution_event_types_are_valid(types: list[str]) -> bool:
    if not types:
        return True
    if types == ["execution_authorized"]:
        return True
    if len(types) < 2 or types[:2] != ["execution_authorized", "lease_acquired"]:
        return False
    rest = types[2:]
    prefix: list[str] = []
    if rest and rest[0] == "preservation_recorded":
        prefix.append(rest.pop(0))
    if rest and rest[0] == "execution_started":
        if prefix != ["preservation_recorded"]:
            return False
        prefix.append(rest.pop(0))
    if not rest:
        return True
    terminal = rest.pop(0)
    if terminal not in EXECUTION_TERMINAL_EVENTS:
        return False
    if terminal == "execution_succeeded" and prefix != [
        "preservation_recorded", "execution_started",
    ]:
        return False
    if rest and rest[0] == "lease_released":
        rest.pop(0)
    return not rest


def _validate_execution_event_detail(
    event_type: str,
    detail: dict[str, Any],
    *,
    plan: dict[str, Any],
    row: dict[str, Any],
    run_id: str,
) -> None:
    common = {
        "run_id", "attempt_id", "plan_fingerprint", "request_key", "doc_id", "stage",
        "adapter_version", "adapter_fingerprint", "remote_writes", "model_calls",
        "source_files_modified", "publication",
    }
    required_extra = {
        "execution_authorized": {"authorization_scope", "confirmed_attempt_id"},
        "lease_acquired": {"lease_token_hash", "owner_pid", "acquired_at", "expires_at"},
        "preservation_recorded": {
            "receipt_fingerprint", "prior_artifact_present", "prior_artifact_sha256",
            "prior_artifact_bytes", "prior_artifact_mtime_ns",
        },
        "execution_started": {"started_at", "input_fingerprint"},
        "execution_succeeded": {
            "completed_at", "input_fingerprint_after", "output_sha256", "output_bytes",
            "receipt_fingerprint", "reattestation_required",
        },
        "execution_failed": {
            "completed_at", "error_code", "receipt_fingerprint", "prior_artifact_restored",
            "reattestation_required",
        },
        "execution_recovery_hold": {
            "completed_at", "error_code", "receipt_fingerprint", "reattestation_required",
        },
        "lease_released": {"released_at", "lease_token_hash", "outcome"},
    }[event_type]
    if set(detail) != common | required_extra:
        raise ValueError(f"Attempt {event_type} detail fields do not match the execution schema")
    if (
        detail.get("run_id") != run_id
        or detail.get("attempt_id") != row["attempt_id"]
        or detail.get("plan_fingerprint") != plan["evidence_fingerprint"]
        or detail.get("request_key") != plan["request"]["request_key"]
        or detail.get("doc_id") != row["doc_id"]
        or detail.get("stage") != row["stage"]
    ):
        raise ValueError("Attempt execution event is not bound to its plan row")
    if (
        detail.get("remote_writes") is not False
        or detail.get("model_calls") is not False
        or detail.get("source_files_modified") is not False
        or detail.get("publication") is not False
        or type(detail.get("adapter_version")) is not str
        or not detail["adapter_version"]
        or not valid_fingerprint(detail.get("adapter_fingerprint"))
    ):
        raise ValueError("Attempt execution event exceeds the deterministic local authority boundary")
    if (row.get("stage"), detail.get("adapter_version")) not in SUPPORTED_EXECUTION_ADAPTERS:
        raise ValueError("Attempt execution adapter is outside the Phase 6B.1 allowlist")
    for key, value in detail.items():
        if key.endswith("fingerprint") or key.endswith("sha256") or key == "lease_token_hash":
            if value and not valid_fingerprint(value):
                raise ValueError(f"Attempt execution event {key} is malformed")
    if event_type == "execution_authorized" and (
        detail.get("authorization_scope") != "local_testimony_candidates_sidecar"
        or detail.get("confirmed_attempt_id") != row["attempt_id"]
    ):
        raise ValueError("Attempt execution authorization scope is invalid")
    if event_type == "lease_acquired" and (
        type(detail.get("owner_pid")) is not int or detail["owner_pid"] <= 0
    ):
        raise ValueError("Attempt execution lease owner is invalid")
    time_fields = {
        "lease_acquired": ("acquired_at", "expires_at"),
        "execution_started": ("started_at",),
        "execution_succeeded": ("completed_at",),
        "execution_failed": ("completed_at",),
        "execution_recovery_hold": ("completed_at",),
        "lease_released": ("released_at",),
    }.get(event_type, ())
    parsed_times = {
        key: _parse_execution_time(detail.get(key), label=key) for key in time_fields
    }
    if event_type == "lease_acquired" and parsed_times["expires_at"] <= parsed_times["acquired_at"]:
        raise ValueError("Attempt execution lease expiry must follow acquisition")
    for key in ("prior_artifact_bytes", "prior_artifact_mtime_ns", "output_bytes"):
        if key in detail and (type(detail[key]) is not int or detail[key] < 0):
            raise ValueError(f"Attempt execution event {key} is invalid")
    if "reattestation_required" in detail and detail["reattestation_required"] is not True:
        raise ValueError("Attempt execution terminal event must require re-attestation")


def validate_attempt_event_chain(
    events: list[sqlite3.Row],
    plan: dict[str, Any],
    row: dict[str, Any],
) -> str:
    """Validate proposal plus any append-only Phase 6B execution prefix."""
    if not events:
        raise ValueError(f"Attempt event history is missing for {row['attempt_id']}")
    _validate_initial_event(events[0], plan, row)
    execution_types = [str(event["event_type"]) for event in events[1:]]
    if not _execution_event_types_are_valid(execution_types):
        raise ValueError(f"Attempt execution transition sequence is invalid for {row['attempt_id']}")
    previous = str(events[0]["event_fingerprint"])
    run_id = ""
    execution_details: list[tuple[str, dict[str, Any]]] = []
    for expected_sequence, event in enumerate(events[1:], start=2):
        event_type = str(event["event_type"])
        if event["attempt_id"] != row["attempt_id"] or event["sequence"] != expected_sequence:
            raise ValueError("Attempt execution event identity or sequence is invalid")
        if event["disposition"] != EXECUTION_EVENT_DISPOSITIONS[event_type]:
            raise ValueError("Attempt execution event disposition is invalid")
        try:
            detail = json.loads(event["detail_json"])
        except (TypeError, json.JSONDecodeError) as exc:
            raise ValueError("Attempt execution event detail is not valid JSON") from exc
        if not isinstance(detail, dict):
            raise ValueError("Attempt execution event detail must be an object")
        if not run_id:
            run_id = str(detail.get("run_id") or "")
        if not run_id or str(detail.get("run_id") or "") != run_id:
            raise ValueError("Attempt execution run identity changed inside its event chain")
        _validate_execution_event_detail(event_type, detail, plan=plan, row=row, run_id=run_id)
        execution_details.append((event_type, detail))
        expected_key = canonical_fingerprint({
            "attempt_id": row["attempt_id"], "sequence": expected_sequence,
            "event_type": event_type, "detail": detail,
        })
        if (
            event["event_key"] != expected_key
            or event["previous_event_fingerprint"] != previous
            or canonical_fingerprint(_event_stable(event)) != event["event_fingerprint"]
        ):
            raise ValueError("Attempt execution event hash chain is invalid")
        previous = str(event["event_fingerprint"])
    if execution_details:
        first = execution_details[0][1]
        invariant_fields = {
            "run_id", "attempt_id", "plan_fingerprint", "request_key", "doc_id", "stage",
            "adapter_version", "adapter_fingerprint", "remote_writes", "model_calls",
            "source_files_modified", "publication",
        }
        if any(
            any(detail.get(field) != first.get(field) for field in invariant_fields)
            for _, detail in execution_details[1:]
        ):
            raise ValueError("Attempt execution invariants changed inside its event chain")
        detail_by_type = {event_type: detail for event_type, detail in execution_details}
        started = detail_by_type.get("execution_started")
        if started and started.get("input_fingerprint") != row["stage_input_fingerprint"]:
            raise ValueError("Attempt execution start does not bind its planned input")
        succeeded = detail_by_type.get("execution_succeeded")
        if succeeded and succeeded.get("input_fingerprint_after") != row["stage_input_fingerprint"]:
            raise ValueError("Attempt execution success does not preserve its planned input")
        released = detail_by_type.get("lease_released")
        lease = detail_by_type.get("lease_acquired")
        terminal_types = [value for value in EXECUTION_TERMINAL_EVENTS if value in detail_by_type]
        if len(terminal_types) > 1:
            raise ValueError("Attempt execution has more than one terminal outcome")
        if released:
            if not lease or released.get("lease_token_hash") != lease.get("lease_token_hash"):
                raise ValueError("Attempt lease release does not match its acquisition")
            expected_outcome = {
                "execution_succeeded": "succeeded",
                "execution_failed": "failed",
                "execution_recovery_hold": "recovery_hold",
            }.get(terminal_types[0] if terminal_types else "")
            if released.get("outcome") != expected_outcome:
                raise ValueError("Attempt lease release outcome does not match its terminal event")
        acquired_time = (
            _parse_execution_time(lease.get("acquired_at"), label="acquired_at")
            if lease else None
        )
        started_time = (
            _parse_execution_time(started.get("started_at"), label="started_at")
            if started else None
        )
        terminal_detail = detail_by_type.get(terminal_types[0]) if terminal_types else None
        completed_time = (
            _parse_execution_time(terminal_detail.get("completed_at"), label="completed_at")
            if terminal_detail else None
        )
        released_time = (
            _parse_execution_time(released.get("released_at"), label="released_at")
            if released else None
        )
        if acquired_time and started_time and started_time < acquired_time:
            raise ValueError("Attempt execution started before its lease")
        if completed_time and completed_time < (started_time or acquired_time):
            raise ValueError("Attempt execution completed before it began")
        if released_time and completed_time and released_time < completed_time:
            raise ValueError("Attempt execution lease released before completion")
    return execution_types[-1] if execution_types else "proposal_recorded"


def append_attempt_event(
    db: sqlite3.Connection,
    *,
    plan: dict[str, Any],
    row: dict[str, Any],
    event_type: str,
    detail: dict[str, Any],
) -> sqlite3.Row:
    """Append one strictly validated execution event inside the caller transaction."""
    if event_type not in EXECUTION_EVENT_DISPOSITIONS:
        raise ValueError("Unsupported attempt execution event type")
    existing = db.execute(
        "SELECT * FROM attempt_events WHERE attempt_id=? ORDER BY sequence", (row["attempt_id"],)
    ).fetchall()
    validate_attempt_event_chain(existing, plan, row)
    sequence = len(existing) + 1
    event_key = canonical_fingerprint({
        "attempt_id": row["attempt_id"], "sequence": sequence,
        "event_type": event_type, "detail": detail,
    })
    recorded_at = _now()
    detail_json = json.dumps(detail, sort_keys=True, separators=(",", ":"))
    previous = str(existing[-1]["event_fingerprint"])
    stable = {
        "event_key": event_key, "attempt_id": row["attempt_id"], "sequence": sequence,
        "event_type": event_type, "disposition": EXECUTION_EVENT_DISPOSITIONS[event_type],
        "detail_json": detail_json, "previous_event_fingerprint": previous,
        "recorded_at": recorded_at,
    }
    event_fingerprint = canonical_fingerprint(stable)
    db.execute(
        """INSERT INTO attempt_events
           (event_key,attempt_id,sequence,event_type,disposition,detail_json,
            previous_event_fingerprint,event_fingerprint,recorded_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            event_key, row["attempt_id"], sequence, event_type,
            EXECUTION_EVENT_DISPOSITIONS[event_type], detail_json, previous,
            event_fingerprint, recorded_at,
        ),
    )
    appended = db.execute(
        "SELECT * FROM attempt_events WHERE attempt_id=? AND sequence=?",
        (row["attempt_id"], sequence),
    ).fetchone()
    validate_attempt_event_chain([*existing, appended], plan, row)
    return appended


def persist_attempt_plan(
    plan: dict[str, Any],
    db_path: Path,
    *,
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    corpus_dir: Path,
    hash_cache: HashCache | None = None,
) -> dict[str, Any]:
    """Insert immutable proposals/events transactionally; identical calls reuse."""
    validate_attempt_plan_against_bundle(
        plan, workflow, dispatch, attestation, Path(corpus_dir), hash_cache=hash_cache,
    )
    db = open_attempt_ledger(db_path)
    inserted = reused = events_inserted = 0
    columns = [row[1] for row in db.execute("PRAGMA table_info(attempt_intents)")]
    try:
        db.execute("BEGIN IMMEDIATE")
        expected_ids = {row["attempt_id"] for row in plan["rows"]}
        associated = db.execute(
            """SELECT attempt_id,plan_fingerprint,request_key FROM attempt_intents
               WHERE plan_fingerprint=? OR request_key=?""",
            (plan["evidence_fingerprint"], plan["request"]["request_key"]),
        ).fetchall()
        unexpected = [
            str(value["attempt_id"])
            for value in associated
            if value["attempt_id"] not in expected_ids
            or value["plan_fingerprint"] != plan["evidence_fingerprint"]
            or value["request_key"] != plan["request"]["request_key"]
        ]
        if unexpected:
            raise ValueError("Attempt ledger contains unexpected or mismatched plan associations")
        for row in plan["rows"]:
            created_at = _now()
            record = _intent_record(plan, row, created_at)
            placeholders = ",".join("?" for _ in columns)
            values = [record[column] for column in columns]
            cursor = db.execute(
                f"INSERT OR IGNORE INTO attempt_intents ({','.join(columns)}) VALUES ({placeholders})",
                values,
            )
            if cursor.rowcount == 1:
                inserted += 1
            else:
                existing = db.execute(
                    "SELECT * FROM attempt_intents WHERE attempt_id=?", (row["attempt_id"],)
                ).fetchone()
                if existing is None:
                    raise ValueError("Attempt intent key collided with another attempt")
                _assert_existing_intent(existing, record)
                reused += 1

            event_key, detail_json = _initial_event_expected(plan, row)
            existing_events = db.execute(
                "SELECT * FROM attempt_events WHERE attempt_id=? ORDER BY sequence", (row["attempt_id"],)
            ).fetchall()
            if not existing_events:
                sequence = 1
                previous_fingerprint = ""
                recorded_at = _now()
                event_fingerprint = canonical_fingerprint({
                    "event_key": event_key, "attempt_id": row["attempt_id"], "sequence": sequence,
                    "event_type": "proposal_recorded", "disposition": row["disposition"],
                    "detail_json": detail_json, "previous_event_fingerprint": previous_fingerprint,
                    "recorded_at": recorded_at,
                })
                db.execute(
                    """INSERT INTO attempt_events
                       (event_key,attempt_id,sequence,event_type,disposition,detail_json,
                        previous_event_fingerprint,event_fingerprint,recorded_at)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (event_key, row["attempt_id"], sequence, "proposal_recorded", row["disposition"],
                     detail_json, previous_fingerprint, event_fingerprint, recorded_at),
                )
                events_inserted += 1
            else:
                validate_attempt_event_chain(existing_events, plan, row)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    return {
        "plan_fingerprint": plan["evidence_fingerprint"],
        "inserted": inserted,
        "reused": reused,
        "events_inserted": events_inserted,
        "execution_authorized": False,
    }


def reconcile_attempt_plan(
    plan: dict[str, Any],
    db_path: Path,
    *,
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    corpus_dir: Path,
    hash_cache: HashCache | None = None,
) -> dict[str, Any]:
    """Read-only integrity/restart audit; never changes attempt state."""
    validate_attempt_plan_against_bundle(
        plan, workflow, dispatch, attestation, Path(corpus_dir), hash_cache=hash_cache,
    )
    db = open_attempt_ledger(db_path, create=False)
    missing: list[str] = []
    inconsistent: list[str] = []
    unexpected: list[str] = []
    try:
        expected_ids = {row["attempt_id"] for row in plan["rows"]}
        associated = db.execute(
            """SELECT attempt_id,plan_fingerprint,request_key FROM attempt_intents
               WHERE plan_fingerprint=? OR request_key=?""",
            (plan["evidence_fingerprint"], plan["request"]["request_key"]),
        ).fetchall()
        actual_ids = {str(row["attempt_id"]) for row in associated}
        unexpected.extend(sorted(actual_ids - expected_ids))
        unexpected.extend(sorted(
            str(row["attempt_id"])
            for row in associated
            if row["plan_fingerprint"] != plan["evidence_fingerprint"]
            or row["request_key"] != plan["request"]["request_key"]
        ))
        for row in plan["rows"]:
            existing = db.execute(
                "SELECT * FROM attempt_intents WHERE attempt_id=?", (row["attempt_id"],)
            ).fetchone()
            expected = _intent_record(plan, row, "ignored")
            if existing is None:
                missing.append(row["attempt_id"])
                continue
            try:
                _assert_existing_intent(existing, expected)
            except ValueError:
                inconsistent.append(row["attempt_id"])
                continue
            events = db.execute(
                "SELECT * FROM attempt_events WHERE attempt_id=? ORDER BY sequence", (row["attempt_id"],)
            ).fetchall()
            try:
                validate_attempt_event_chain(events, plan, row)
            except ValueError:
                inconsistent.append(row["attempt_id"])
    finally:
        db.close()
    missing = sorted(set(missing))
    inconsistent = sorted(set(inconsistent))
    unexpected = sorted(set(unexpected))
    return {
        "plan_fingerprint": plan["evidence_fingerprint"],
        "expected": len(plan["rows"]),
        "consistent": len(plan["rows"]) - len(missing) - len(inconsistent),
        "missing": missing,
        "inconsistent": inconsistent,
        "unexpected": unexpected,
        "ok": not missing and not inconsistent and not unexpected,
        "execution_authorized": False,
    }


def reconcile_attempt_plan_history(
    plan: dict[str, Any],
    db_path: Path,
) -> dict[str, Any]:
    """Verify immutable plan/intent/event history without requiring current corpus equality."""
    validate_attempt_plan(plan)
    db = open_attempt_ledger(db_path, create=False)
    missing: list[str] = []
    inconsistent: list[str] = []
    unexpected: list[str] = []
    states: dict[str, str] = {}
    try:
        expected_ids = {row["attempt_id"] for row in plan["rows"]}
        associated = db.execute(
            """SELECT attempt_id,plan_fingerprint,request_key FROM attempt_intents
               WHERE plan_fingerprint=? OR request_key=?""",
            (plan["evidence_fingerprint"], plan["request"]["request_key"]),
        ).fetchall()
        actual_ids = {str(value["attempt_id"]) for value in associated}
        unexpected.extend(sorted(actual_ids - expected_ids))
        unexpected.extend(sorted(
            str(value["attempt_id"])
            for value in associated
            if value["plan_fingerprint"] != plan["evidence_fingerprint"]
            or value["request_key"] != plan["request"]["request_key"]
        ))
        for row in plan["rows"]:
            existing = db.execute(
                "SELECT * FROM attempt_intents WHERE attempt_id=?", (row["attempt_id"],)
            ).fetchone()
            if existing is None:
                missing.append(row["attempt_id"])
                continue
            try:
                _assert_existing_intent(existing, _intent_record(plan, row, "ignored"))
                events = db.execute(
                    "SELECT * FROM attempt_events WHERE attempt_id=? ORDER BY sequence",
                    (row["attempt_id"],),
                ).fetchall()
                states[row["attempt_id"]] = validate_attempt_event_chain(events, plan, row)
            except ValueError:
                inconsistent.append(row["attempt_id"])
    finally:
        db.close()
    missing = sorted(set(missing))
    inconsistent = sorted(set(inconsistent))
    unexpected = sorted(set(unexpected))
    return {
        "plan_fingerprint": plan["evidence_fingerprint"],
        "expected": len(plan["rows"]),
        "consistent": len(plan["rows"]) - len(missing) - len(inconsistent),
        "missing": missing,
        "inconsistent": inconsistent,
        "unexpected": unexpected,
        "execution_states": states,
        "ok": not missing and not inconsistent and not unexpected,
        "current_corpus_checked": False,
        "execution_authorized": False,
    }


def list_attempts(
    db_path: Path, *, limit: int = 100, workflow_batch_id: str = "",
) -> list[dict[str, Any]]:
    if not Path(db_path).is_file():
        return []
    db = open_attempt_ledger(db_path, create=False)
    try:
        bounded_limit = max(1, min(int(limit), 5000 if workflow_batch_id else 1000))
        if workflow_batch_id:
            rows = db.execute(
                """SELECT i.* FROM attempt_intents AS i
                   WHERE i.workflow_batch_id=?
                   ORDER BY COALESCE(
                       (SELECT MAX(e.rowid) FROM attempt_events AS e WHERE e.attempt_id=i.attempt_id),
                       i.rowid
                   ) DESC, i.attempt_id
                   LIMIT ?""",
                (workflow_batch_id, bounded_limit),
            ).fetchall()
        else:
            rows = db.execute(
                """SELECT i.* FROM attempt_intents AS i
                   ORDER BY i.created_at DESC, i.workflow_batch_id, i.item_ordinal,
                            i.route, i.route_sequence, i.attempt_id
                   LIMIT ?""",
                (bounded_limit,),
            ).fetchall()
        results: list[dict[str, Any]] = []
        for row in rows:
            decoded_command = json.loads(row["command_json"])
            decoded_dependencies = json.loads(row["depends_on_json"])
            decoded_input_evidence = json.loads(row["stage_input_evidence_json"])
            events = db.execute(
                "SELECT * FROM attempt_events WHERE attempt_id=? ORDER BY sequence",
                (row["attempt_id"],),
            ).fetchall()
            hash_chain_valid = True
            previous = ""
            for sequence, event in enumerate(events, start=1):
                if (
                    event["sequence"] != sequence
                    or event["attempt_id"] != row["attempt_id"]
                    or event["previous_event_fingerprint"] != previous
                    or canonical_fingerprint(_event_stable(event)) != event["event_fingerprint"]
                ):
                    hash_chain_valid = False
                    break
                previous = str(event["event_fingerprint"])
            semantic_row = {
                **dict(row),
                "command": decoded_command,
                "depends_on_attempt_ids": decoded_dependencies,
                "stage_input_evidence": decoded_input_evidence,
            }
            semantic_plan = {
                "evidence_fingerprint": row["plan_fingerprint"],
                "request": {"request_key": row["request_key"]},
            }
            semantic_valid = hash_chain_valid
            if semantic_valid:
                try:
                    validate_attempt_event_chain(events, semantic_plan, semantic_row)
                except ValueError:
                    semantic_valid = False
            event_types = [str(event["event_type"]) for event in events]
            execution_state = (
                event_types[-1] if event_types and semantic_valid else
                "inconsistent_event_history" if events else "missing_event_history"
            )
            terminal_outcome = next((
                value.removeprefix("execution_")
                for value in reversed(event_types)
                if value in EXECUTION_TERMINAL_EVENTS
            ), "") if semantic_valid else ""
            execution_details: list[dict[str, Any]] = []
            if semantic_valid:
                for event in events[1:]:
                    try:
                        detail = json.loads(event["detail_json"])
                    except (TypeError, ValueError):
                        # Semantic validation above normally makes this impossible. Keep
                        # the read projection fail closed if a future schema disagrees.
                        semantic_valid = False
                        execution_details = []
                        break
                    if not isinstance(detail, dict):
                        semantic_valid = False
                        execution_details = []
                        break
                    execution_details.append(detail)
            if not semantic_valid:
                execution_state = "inconsistent_event_history" if events else "missing_event_history"
                terminal_outcome = ""
            execution_run_id = (
                str(execution_details[0].get("run_id") or "")
                if execution_details else ""
            )
            results.append({
                **dict(row),
                "command": decoded_command,
                "depends_on_attempt_ids": decoded_dependencies,
                "stage_input_evidence": decoded_input_evidence,
                "intent_execution_authorized": False,
                "intent_lease_acquired": False,
                "execution_authorized": False,
                "lease_acquired": False,
                "execution_state": execution_state,
                "grant_recorded": semantic_valid and "execution_authorized" in event_types,
                "preservation_recorded": semantic_valid and "preservation_recorded" in event_types,
                "execution_started_recorded": semantic_valid and "execution_started" in event_types,
                "terminal_recorded": semantic_valid and bool(terminal_outcome),
                "terminal_outcome": terminal_outcome,
                "lease_released": semantic_valid and "lease_released" in event_types,
                "execution_run_id": execution_run_id if semantic_valid else "",
                "recovery_check_required": (
                    semantic_valid
                    and "execution_authorized" in event_types
                    and not bool(terminal_outcome)
                ),
                "hash_chain_valid": hash_chain_valid,
                "event_history_valid": semantic_valid,
                "event_count": len(events),
            })
        return results
    finally:
        db.close()


def list_attempts_for_workflow(
    db_path: Path, workflow_batch_id: str, *, limit: int = 5000,
) -> dict[str, Any]:
    """Return one exact batch slice plus an explicit truncation signal."""
    if not Path(db_path).is_file():
        return {"rows": [], "total": 0, "truncated": False}
    db = open_attempt_ledger(db_path, create=False)
    try:
        total = int(db.execute(
            "SELECT COUNT(*) FROM attempt_intents WHERE workflow_batch_id=?",
            (workflow_batch_id,),
        ).fetchone()[0])
    finally:
        db.close()
    rows = list_attempts(
        db_path, limit=limit, workflow_batch_id=workflow_batch_id,
    )
    return {"rows": rows, "total": total, "truncated": len(rows) < total}
