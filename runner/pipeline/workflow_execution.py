"""Phase 6B.1 deterministic execution canary.

Only ``testimony-candidates-build`` is supported.  Plans remain non-authorizing;
one exact attempt receives a separately confirmed, one-use local-sidecar grant.
No stored argv is executed and this module has no subprocess, model, network,
corpus-import, upload, publication, or remote-write capability.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from .atomic_io import atomic_write_bytes, atomic_write_json
from . import archive_summary, citation_units
from .testimony_candidates import (
    TESTIMONY_CANDIDATES_FILENAME,
    build_testimony_candidates,
    validate_testimony_candidates_payload,
)
from .triage_jobs import acquire_worker_lock, release_worker_lock
from .workflow_attempts import (
    _safe_doc_id,
    _stage_input_snapshot,
    append_attempt_event,
    open_attempt_ledger,
    reconcile_attempt_plan,
    reconcile_attempt_plan_history,
    validate_attempt_plan,
)
from .workflow_integrity import (
    canonical_fingerprint,
    require_bound_fingerprint,
    safe_workflow_batch_id,
    valid_fingerprint,
    write_immutable_snapshot,
)


ADAPTER_VERSION = "testimony-candidates-local-v1.0"
SUPPORTED_STAGE = "testimony-candidates-build"
MAX_PRESERVED_SIDECAR_BYTES = 50 * 1024 * 1024
RECEIPT_SCHEMA_VERSION = "workflow-local-execution-receipt-v1.0"
PRESERVATION_SCHEMA_VERSION = "workflow-local-preservation-receipt-v1.0"
EXECUTION_HOLD_FILENAME = "testimony_candidates.execution_hold.json"
FaultFn = Callable[[str], None]
_TEST_FAULT_INJECTOR: FaultFn | None = None


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _durable_remove(path: Path) -> None:
    path = Path(path)
    path.unlink(missing_ok=True)
    try:
        fd = os.open(path.parent, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


def adapter_fingerprint() -> str:
    paths = [
        Path(__file__),
        Path(build_testimony_candidates.__code__.co_filename),
        Path(archive_summary.__file__),
        Path(citation_units.__file__),
    ]
    return canonical_fingerprint({
        "adapter_version": ADAPTER_VERSION,
        "source_files": [
            {"name": path.name, "sha256": _sha256_file(path)}
            for path in sorted(set(paths), key=lambda value: value.name)
        ],
    })


def _stable_receipt(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if key != "evidence_fingerprint"}


def _receipt_time(value: Any, *, label: str) -> datetime:
    if type(value) is not str or not value:
        raise ValueError(f"Local execution receipt {label} is missing")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"Local execution receipt {label} is malformed") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"Local execution receipt {label} must include a timezone")
    return parsed


def _validate_receipt(payload: dict[str, Any]) -> None:
    required = {
        "schema_version", "run_id", "attempt_id", "plan_fingerprint", "request_key",
        "workflow_batch_id", "doc_id", "stage", "adapter_version", "adapter_fingerprint",
        "status", "authorization_scope", "remote_writes", "model_calls",
        "source_files_modified", "publication", "input_fingerprint_before",
        "input_fingerprint_after", "prior_artifact", "output_artifact", "error",
        "started_at", "completed_at", "reattestation_required", "evidence_fingerprint",
    }
    if not isinstance(payload, dict) or set(payload) != required:
        raise ValueError("Local execution receipt fields do not match its schema")
    if payload.get("schema_version") != RECEIPT_SCHEMA_VERSION:
        raise ValueError("Unsupported local execution receipt schema")
    safe_workflow_batch_id(payload.get("workflow_batch_id"))
    if (
        payload.get("stage") != SUPPORTED_STAGE
        or payload.get("adapter_version") != ADAPTER_VERSION
        or not valid_fingerprint(payload.get("adapter_fingerprint"))
        or payload.get("status") not in {"succeeded", "failed", "recovery_hold"}
        or payload.get("authorization_scope") != "local_testimony_candidates_sidecar"
        or payload.get("remote_writes") is not False
        or payload.get("model_calls") is not False
        or payload.get("source_files_modified") is not False
        or payload.get("publication") is not False
        or payload.get("reattestation_required") is not True
    ):
        raise ValueError("Local execution receipt exceeds its authority boundary")
    for field in ("plan_fingerprint", "input_fingerprint_before"):
        if not valid_fingerprint(payload.get(field)):
            raise ValueError(f"Local execution receipt {field} is malformed")
    after = payload.get("input_fingerprint_after")
    if after and not valid_fingerprint(after):
        raise ValueError("Local execution receipt post-input fingerprint is malformed")
    for artifact_field in ("prior_artifact", "output_artifact"):
        artifact = payload.get(artifact_field)
        if artifact is not None and (
            not isinstance(artifact, dict)
            or set(artifact) != {"filename", "sha256", "bytes", "mtime_ns", "evidence_copy"}
            or artifact.get("filename") != TESTIMONY_CANDIDATES_FILENAME
            or not valid_fingerprint(artifact.get("sha256"))
            or type(artifact.get("bytes")) is not int
            or artifact["bytes"] < 0
            or type(artifact.get("mtime_ns")) is not int
            or artifact["mtime_ns"] < 0
            or type(artifact.get("evidence_copy")) is not str
        ):
            raise ValueError("Local execution receipt artifact evidence is malformed")
        if artifact is not None:
            relative = Path(artifact["evidence_copy"])
            if relative.is_absolute() or ".." in relative.parts or relative.name != TESTIMONY_CANDIDATES_FILENAME:
                raise ValueError("Local execution receipt artifact path is unsafe")
    prior = payload.get("prior_artifact")
    if prior is not None and prior.get("evidence_copy") != f"before/{TESTIMONY_CANDIDATES_FILENAME}":
        raise ValueError("Local execution receipt prior artifact path is invalid")
    error = payload.get("error")
    if error is not None and (
        not isinstance(error, dict)
        or set(error) != {"code", "message"}
        or not all(type(value) is str for value in error.values())
    ):
        raise ValueError("Local execution receipt error evidence is malformed")
    status = payload["status"]
    output = payload.get("output_artifact")
    if status == "succeeded" and (
        output is None
        or output.get("evidence_copy") != f"after/{TESTIMONY_CANDIDATES_FILENAME}"
        or error is not None
        or payload.get("input_fingerprint_after") != payload.get("input_fingerprint_before")
    ):
        raise ValueError("Successful execution receipt lacks exact output evidence")
    if status == "failed" and (output is not None or error is None):
        raise ValueError("Failed execution receipt has invalid outcome evidence")
    if status == "recovery_hold" and error is None:
        raise ValueError("Recovery-hold receipt must explain the hold")
    started = _receipt_time(payload.get("started_at"), label="started_at")
    completed = _receipt_time(payload.get("completed_at"), label="completed_at")
    if completed < started:
        raise ValueError("Local execution receipt completed before it started")
    require_bound_fingerprint(payload, _stable_receipt, label="Local execution receipt")


def _validate_preservation_receipt(payload: dict[str, Any]) -> None:
    required = {
        "schema_version", "run_id", "attempt_id", "plan_fingerprint", "doc_id",
        "stage", "input_fingerprint", "prior_artifact", "source_files_modified",
        "recorded_at", "evidence_fingerprint",
    }
    if not isinstance(payload, dict) or set(payload) != required:
        raise ValueError("Local preservation receipt fields do not match its schema")
    if (
        payload.get("schema_version") != PRESERVATION_SCHEMA_VERSION
        or payload.get("stage") != SUPPORTED_STAGE
        or payload.get("source_files_modified") is not False
        or not valid_fingerprint(payload.get("plan_fingerprint"))
        or not valid_fingerprint(payload.get("input_fingerprint"))
    ):
        raise ValueError("Local preservation receipt exceeds its authority boundary")
    artifact = payload.get("prior_artifact")
    if artifact is not None and (
        not isinstance(artifact, dict)
        or set(artifact) != {"filename", "sha256", "bytes", "mtime_ns", "evidence_copy"}
        or artifact.get("filename") != TESTIMONY_CANDIDATES_FILENAME
        or not valid_fingerprint(artifact.get("sha256"))
        or type(artifact.get("bytes")) is not int
        or artifact["bytes"] < 0
        or type(artifact.get("mtime_ns")) is not int
        or artifact["mtime_ns"] < 0
        or artifact.get("evidence_copy") != f"before/{TESTIMONY_CANDIDATES_FILENAME}"
    ):
        raise ValueError("Local preservation artifact evidence is malformed")
    stable = {key: value for key, value in payload.items() if key != "evidence_fingerprint"}
    require_bound_fingerprint(payload, lambda _: stable, label="Local preservation receipt")


def _read_json_object(path: Path, *, label: str) -> dict[str, Any]:
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"{label} is missing or linked")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"{label} is not valid JSON") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"{label} must contain a JSON object")
    return payload


def _verify_artifact_copy(run_dir: Path, artifact: dict[str, Any] | None) -> None:
    if artifact is None:
        return
    relative = Path(str(artifact["evidence_copy"]))
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError("Execution artifact evidence path is unsafe")
    path = run_dir / relative
    if path.is_symlink() or not path.is_file():
        raise ValueError("Execution artifact evidence copy is missing or linked")
    if path.stat().st_size != artifact["bytes"] or _sha256_file(path) != artifact["sha256"]:
        raise ValueError("Execution artifact evidence copy does not match its receipt")


def _validate_receipt_binding(
    receipt: dict[str, Any],
    *,
    plan: dict[str, Any],
    row: dict[str, Any],
    run_id: str,
    adapter_version: str,
    adapter_hash: str,
) -> None:
    if (
        receipt["run_id"] != run_id
        or receipt["attempt_id"] != row["attempt_id"]
        or receipt["plan_fingerprint"] != plan["evidence_fingerprint"]
        or receipt["request_key"] != plan["request"]["request_key"]
        or receipt["workflow_batch_id"] != plan["workflow_batch_id"]
        or receipt["doc_id"] != row["doc_id"]
        or receipt["stage"] != row["stage"]
        or receipt["adapter_version"] != adapter_version
        or receipt["adapter_fingerprint"] != adapter_hash
        or receipt["input_fingerprint_before"] != row["stage_input_fingerprint"]
    ):
        raise ValueError("Execution receipt is not fully bound to its plan and run")


def _load_bound_preservation(
    run_dir: Path,
    *,
    plan: dict[str, Any],
    row: dict[str, Any],
    run_id: str,
    event_detail: dict[str, Any],
) -> dict[str, Any]:
    preservation = _read_json_object(
        run_dir / "preservation_receipt.json", label="Local preservation receipt",
    )
    _validate_preservation_receipt(preservation)
    if (
        preservation["run_id"] != run_id
        or preservation["attempt_id"] != row["attempt_id"]
        or preservation["plan_fingerprint"] != plan["evidence_fingerprint"]
        or preservation["doc_id"] != row["doc_id"]
        or preservation["stage"] != row["stage"]
        or preservation["input_fingerprint"] != row["stage_input_fingerprint"]
        or preservation["evidence_fingerprint"] != event_detail["receipt_fingerprint"]
    ):
        raise ValueError("Preservation receipt is not bound to the execution event")
    prior = preservation["prior_artifact"]
    if (
        event_detail["prior_artifact_present"] is not (prior is not None)
        or event_detail["prior_artifact_sha256"] != (prior["sha256"] if prior else "")
        or event_detail["prior_artifact_bytes"] != (prior["bytes"] if prior else 0)
        or event_detail["prior_artifact_mtime_ns"] != (prior["mtime_ns"] if prior else 0)
    ):
        raise ValueError("Preservation event contradicts its archived artifact")
    _verify_artifact_copy(run_dir, prior)
    return preservation


def _validate_declared_inputs(doc_dir: Path, evidence: list[dict[str, Any]]) -> None:
    """Refuse malformed present JSON/JSONL instead of treating it as absent."""
    for row in evidence:
        name = str(row.get("name") or "")
        if not name or Path(name).name != name:
            raise ValueError("Declared stage input name is unsafe")
        path = Path(doc_dir) / name
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Declared stage input is missing or linked: {name}")
        raw = path.read_text(encoding="utf-8")
        try:
            if name.endswith(".json"):
                value = json.loads(raw)
                if not isinstance(value, (dict, list)):
                    raise ValueError("top-level value is not an object or list")
            elif name.endswith(".jsonl"):
                for line in raw.splitlines():
                    if line.strip() and not isinstance(json.loads(line), dict):
                        raise ValueError("JSONL row is not an object")
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
            raise ValueError(f"Declared stage input is malformed: {name}") from exc


def _select_row(plan: dict[str, Any], attempt_id: str) -> dict[str, Any]:
    validate_attempt_plan(plan)
    matches = [row for row in plan["rows"] if row["attempt_id"] == attempt_id]
    if len(matches) != 1:
        raise ValueError("The requested attempt is not uniquely present in the plan")
    row = matches[0]
    expected_command = [
        ".venv/bin/python", "-m", "runner.main", SUPPORTED_STAGE, row["doc_id"],
    ]
    if (
        row["stage"] != SUPPORTED_STAGE
        or row["route"] != "testimony"
        or row["disposition"] != "planned_not_authorized"
        or row["command"] != expected_command
        or row["depends_on_attempt_ids"]
    ):
        raise ValueError("Attempt is not an eligible deterministic testimony-candidate stage")
    return row


def _common_event_detail(
    *, plan: dict[str, Any], row: dict[str, Any], run_id: str, adapter_hash: str,
) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "attempt_id": row["attempt_id"],
        "plan_fingerprint": plan["evidence_fingerprint"],
        "request_key": plan["request"]["request_key"],
        "doc_id": row["doc_id"],
        "stage": row["stage"],
        "adapter_version": ADAPTER_VERSION,
        "adapter_fingerprint": adapter_hash,
        "remote_writes": False,
        "model_calls": False,
        "source_files_modified": False,
        "publication": False,
    }


def _event_state_for_attempt(plan: dict[str, Any], ledger_path: Path, attempt_id: str) -> str:
    audit = reconcile_attempt_plan_history(plan, ledger_path)
    if not audit["ok"]:
        raise ValueError("Attempt history failed immutable reconciliation")
    return str(audit["execution_states"].get(attempt_id) or "")


def _validate_output_target(corpus_dir: Path, doc_id: str) -> None:
    doc_dir = Path(corpus_dir) / _safe_doc_id(doc_id)
    if not doc_dir.is_dir() or doc_dir.is_symlink():
        raise ValueError("Attempt document directory is unavailable or linked")
    output = doc_dir / TESTIMONY_CANDIDATES_FILENAME
    hold = doc_dir / EXECUTION_HOLD_FILENAME
    if hold.exists():
        raise ValueError("Testimony candidate execution is held for manual recovery review")
    if output.is_symlink():
        raise ValueError("Refusing to replace a linked testimony candidate sidecar")
    if output.exists() and not output.is_file():
        raise ValueError("Refusing to replace a non-regular testimony candidate sidecar")
    if output.is_file() and output.stat().st_size > MAX_PRESERVED_SIDECAR_BYTES:
        raise ValueError("Existing testimony candidate output exceeds the preservation bound")


def preflight_selected_testimony_attempt(
    plan: dict[str, Any],
    attempt_id: str,
    ledger_path: Path,
    *,
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    corpus_dir: Path,
    evidence_root: Path | None = None,
) -> dict[str, Any]:
    if evidence_root is not None:
        _validate_execution_roots(Path(corpus_dir), Path(evidence_root))
    row = _select_row(plan, attempt_id)
    if _event_state_for_attempt(plan, Path(ledger_path), attempt_id) != "proposal_recorded":
        raise ValueError("Attempt has already received a one-use execution grant")
    _validate_output_target(Path(corpus_dir), row["doc_id"])
    audit = reconcile_attempt_plan(
        plan,
        ledger_path,
        workflow=workflow,
        dispatch=dispatch,
        attestation=attestation,
        corpus_dir=Path(corpus_dir),
    )
    if not audit["ok"]:
        raise ValueError("Attempt plan and ledger do not reconcile against current evidence")
    return _preflight_selected_row(
        plan, row, Path(ledger_path), Path(corpus_dir),
        evidence_root_validated=evidence_root is not None,
    )


def _preflight_selected_row(
    plan: dict[str, Any], row: dict[str, Any], ledger_path: Path, corpus_dir: Path,
    *, evidence_root_validated: bool = False,
) -> dict[str, Any]:
    if _event_state_for_attempt(plan, ledger_path, row["attempt_id"]) != "proposal_recorded":
        raise ValueError("Attempt has already received a one-use execution grant")
    doc_id = _safe_doc_id(row["doc_id"])
    doc_dir = Path(corpus_dir) / doc_id
    _validate_output_target(Path(corpus_dir), doc_id)
    current_fingerprint, current_evidence = _stage_input_snapshot(
        Path(corpus_dir), doc_id, SUPPORTED_STAGE,
    )
    if (
        current_fingerprint != row["stage_input_fingerprint"]
        or current_evidence != row["stage_input_evidence"]
    ):
        raise ValueError("Attempt stage inputs changed; re-attest and re-plan")
    _validate_declared_inputs(doc_dir, current_evidence)
    return {
        "ok": True,
        "planner_only_authority": False,
        "requires_explicit_attempt_confirmation": True,
        "attempt_id": row["attempt_id"],
        "doc_id": doc_id,
        "stage": SUPPORTED_STAGE,
        "input_fingerprint": current_fingerprint,
        "adapter_version": ADAPTER_VERSION,
        "adapter_fingerprint": adapter_fingerprint(),
        "output_filename": TESTIMONY_CANDIDATES_FILENAME,
        "evidence_root_validated": evidence_root_validated,
        "remote_writes": False,
        "model_calls": False,
        "publication": False,
    }


def _artifact_evidence(
    path: Path, *, evidence_copy: str, source_mtime_ns: int | None = None,
) -> dict[str, Any]:
    return {
        "filename": TESTIMONY_CANDIDATES_FILENAME,
        "sha256": _sha256_file(path),
        "bytes": path.stat().st_size,
        "mtime_ns": path.stat().st_mtime_ns if source_mtime_ns is None else source_mtime_ns,
        "evidence_copy": evidence_copy,
    }


def _load_execution_history(
    plan: dict[str, Any], row: dict[str, Any], ledger_path: Path,
) -> tuple[list[sqlite3.Row], list[tuple[str, dict[str, Any]]]]:
    audit = reconcile_attempt_plan_history(plan, ledger_path)
    if not audit["ok"]:
        raise ValueError("Attempt history failed immutable reconciliation")
    db = open_attempt_ledger(ledger_path, create=False)
    try:
        events = db.execute(
            "SELECT * FROM attempt_events WHERE attempt_id=? ORDER BY sequence",
            (row["attempt_id"],),
        ).fetchall()
    finally:
        db.close()
    execution: list[tuple[str, dict[str, Any]]] = []
    for event in events[1:]:
        detail = json.loads(event["detail_json"])
        execution.append((str(event["event_type"]), detail))
    return events, execution


def _run_evidence_dir(
    evidence_root: Path, plan: dict[str, Any], attempt_id: str, run_id: str,
) -> Path:
    if (
        not attempt_id.startswith("attempt-")
        or Path(attempt_id).name != attempt_id
        or not run_id.startswith("run-")
        or Path(run_id).name != run_id
    ):
        raise ValueError("Execution evidence identity is unsafe")
    return (
        Path(evidence_root) / safe_workflow_batch_id(plan["workflow_batch_id"])
        / attempt_id / run_id
    )


def _validate_execution_roots(corpus_dir: Path, evidence_root: Path) -> None:
    corpus_dir = Path(corpus_dir)
    evidence_root = Path(evidence_root)
    if corpus_dir.is_symlink() or not corpus_dir.is_dir():
        raise ValueError("Execution corpus root is missing or linked")
    if evidence_root.is_symlink():
        raise ValueError("Execution evidence root cannot be a symbolic link")
    corpus_resolved = corpus_dir.resolve()
    evidence_resolved = evidence_root.resolve()
    if evidence_resolved == corpus_resolved or corpus_resolved in evidence_resolved.parents:
        raise ValueError("Execution evidence must be stored outside the corpus")


def _execution_lock_path(corpus_dir: Path, doc_id: str) -> Path:
    return Path(corpus_dir) / ".workflow_execution_locks" / f"{doc_id}--{SUPPORTED_STAGE}.lock"


def verify_testimony_execution_evidence(
    plan: dict[str, Any],
    attempt_id: str,
    ledger_path: Path,
    *,
    corpus_dir: Path,
    evidence_root: Path,
    check_current_output: bool = True,
) -> dict[str, Any]:
    """Verify the DB chain against immutable receipts and archived bytes."""
    row = _select_row(plan, attempt_id)
    _, execution = _load_execution_history(plan, row, Path(ledger_path))
    if not execution:
        raise ValueError("Attempt has no execution evidence")
    run_id = str(execution[0][1]["run_id"])
    run_dir = _run_evidence_dir(Path(evidence_root), plan, attempt_id, run_id)
    if run_dir.is_symlink() or not run_dir.is_dir():
        raise ValueError("Execution evidence directory is missing or linked")
    by_type = {event_type: detail for event_type, detail in execution}
    preservation: dict[str, Any] | None = None
    if "preservation_recorded" in by_type:
        preservation = _load_bound_preservation(
            run_dir, plan=plan, row=row, run_id=run_id,
            event_detail=by_type["preservation_recorded"],
        )
    terminal_type = next(
        (value for value in EXECUTION_TERMINAL_TYPES if value in by_type), None,
    )
    if terminal_type is None:
        return {
            "ok": True, "state": execution[-1][0], "run_id": run_id,
            "terminal": False, "receipt": None,
        }
    receipt_name = (
        "recovery_receipt.json"
        if terminal_type == "execution_recovery_hold"
        else "execution_receipt.json"
    )
    receipt = _read_json_object(run_dir / receipt_name, label="Local execution receipt")
    _validate_receipt(receipt)
    expected_status = {
        "execution_succeeded": "succeeded",
        "execution_failed": "failed",
        "execution_recovery_hold": "recovery_hold",
    }[terminal_type]
    terminal_detail = by_type[terminal_type]
    _validate_receipt_binding(
        receipt, plan=plan, row=row, run_id=run_id,
        adapter_version=terminal_detail["adapter_version"],
        adapter_hash=terminal_detail["adapter_fingerprint"],
    )
    if (
        receipt["status"] != expected_status
        or receipt["evidence_fingerprint"] != terminal_detail["receipt_fingerprint"]
    ):
        raise ValueError("Execution receipt is not bound to its terminal event")
    terminal_event = by_type[terminal_type]
    if expected_status == "succeeded":
        output = receipt["output_artifact"]
        if (
            terminal_event["output_sha256"] != output["sha256"]
            or terminal_event["output_bytes"] != output["bytes"]
            or terminal_event["input_fingerprint_after"] != receipt["input_fingerprint_after"]
        ):
            raise ValueError("Execution success event contradicts its output receipt")
    if expected_status in {"failed", "recovery_hold"} and (
        terminal_event["error_code"] != receipt["error"]["code"]
    ):
        raise ValueError("Execution terminal event contradicts its error receipt")
    if preservation is not None and receipt["prior_artifact"] != preservation["prior_artifact"]:
        raise ValueError("Execution receipt contradicts the preservation receipt")
    _verify_artifact_copy(run_dir, receipt["prior_artifact"])
    _verify_artifact_copy(run_dir, receipt["output_artifact"])
    if expected_status == "succeeded" and check_current_output:
        output_path = Path(corpus_dir) / row["doc_id"] / TESTIMONY_CANDIDATES_FILENAME
        if output_path.is_symlink() or not output_path.is_file():
            raise ValueError("Successful execution output is missing or linked")
        output = receipt["output_artifact"]
        if output_path.stat().st_size != output["bytes"] or _sha256_file(output_path) != output["sha256"]:
            raise ValueError("Current testimony candidate output differs from the success receipt")
        validate_testimony_candidates_payload(
            _read_json_object(output_path, label="Current testimony candidate output"),
            doc_id=row["doc_id"],
        )
    if expected_status == "failed" and check_current_output:
        output_path = Path(corpus_dir) / row["doc_id"] / TESTIMONY_CANDIDATES_FILENAME
        prior = receipt["prior_artifact"]
        restored = (
            not output_path.exists()
            if prior is None
            else (
                output_path.is_file() and not output_path.is_symlink()
                and output_path.stat().st_size == prior["bytes"]
                and _sha256_file(output_path) == prior["sha256"]
                and output_path.stat().st_mtime_ns == prior["mtime_ns"]
            )
        )
        if not restored:
            raise ValueError("Failed execution did not restore the exact prior sidecar state")
    return {
        "ok": True, "state": execution[-1][0], "run_id": run_id,
        "terminal": True, "receipt": receipt,
    }


def execute_testimony_candidates_attempt(
    plan: dict[str, Any],
    attempt_id: str,
    ledger_path: Path,
    *,
    workflow: dict[str, Any],
    dispatch: dict[str, Any],
    attestation: dict[str, Any],
    corpus_dir: Path,
    evidence_root: Path,
    authorize_local_sidecar: bool,
    confirmed_attempt_id: str,
) -> dict[str, Any]:
    """Execute exactly one deterministic sidecar build after a one-use grant."""
    if authorize_local_sidecar is not True or confirmed_attempt_id != attempt_id:
        raise ValueError("Exact local-sidecar authorization and attempt confirmation are required")
    _validate_execution_roots(Path(corpus_dir), Path(evidence_root))
    preflight = preflight_selected_testimony_attempt(
        plan, attempt_id, ledger_path,
        workflow=workflow, dispatch=dispatch, attestation=attestation,
        corpus_dir=Path(corpus_dir), evidence_root=Path(evidence_root),
    )
    row = _select_row(plan, attempt_id)
    lock_path = _execution_lock_path(Path(corpus_dir), row["doc_id"])
    lock_fd = acquire_worker_lock(lock_path)
    db: sqlite3.Connection | None = None
    run_id = f"run-{uuid.uuid4().hex}"
    lease_token = uuid.uuid4().hex
    lease_token_hash = _sha256_bytes(lease_token.encode("utf-8"))
    adapter_hash = preflight["adapter_fingerprint"]
    started_at = _now()
    run_dir = _run_evidence_dir(Path(evidence_root), plan, attempt_id, run_id)
    output_path = Path(corpus_dir) / row["doc_id"] / TESTIMONY_CANDIDATES_FILENAME
    prior_bytes: bytes | None = None
    prior_artifact: dict[str, Any] | None = None
    output_written = False
    terminal_status = "failed"
    terminal_committed = False
    fault = _TEST_FAULT_INJECTOR or (lambda _boundary: None)
    try:
        # Re-check after the OS lock closes the preflight/claim race.
        preflight = preflight_selected_testimony_attempt(
            plan, attempt_id, ledger_path,
            workflow=workflow, dispatch=dispatch, attestation=attestation,
            corpus_dir=Path(corpus_dir), evidence_root=Path(evidence_root),
        )
        db = open_attempt_ledger(Path(ledger_path))
        common = _common_event_detail(
            plan=plan, row=row, run_id=run_id, adapter_hash=adapter_hash,
        )
        db.execute("BEGIN IMMEDIATE")
        # A different plan for the same doc/stage may not hold an unfinished grant.
        active = db.execute(
            """SELECT DISTINCT i.attempt_id FROM attempt_intents i
               JOIN attempt_events e ON e.attempt_id=i.attempt_id
               WHERE i.doc_id=? AND i.stage=? AND e.event_type='execution_authorized'
               AND NOT EXISTS (
                   SELECT 1 FROM attempt_events r
                   WHERE r.attempt_id=i.attempt_id AND r.event_type='lease_released'
               )""",
            (row["doc_id"], row["stage"]),
        ).fetchall()
        if active:
            raise ValueError("This document stage already has an unfinished execution grant")
        append_attempt_event(
            db, plan=plan, row=row, event_type="execution_authorized",
            detail={
                **common,
                "authorization_scope": "local_testimony_candidates_sidecar",
                "confirmed_attempt_id": attempt_id,
            },
        )
        append_attempt_event(
            db, plan=plan, row=row, event_type="lease_acquired",
            detail={
                **common,
                "lease_token_hash": lease_token_hash,
                "owner_pid": os.getpid(),
                "acquired_at": started_at,
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(hours=6)
                ).replace(microsecond=0).isoformat(),
            },
        )
        db.commit()
        fault("after_lease_commit")

        run_dir.mkdir(parents=True, exist_ok=False)
        fault("after_run_dir_create")
        if output_path.exists():
            if not output_path.is_file() or output_path.is_symlink():
                raise ValueError("Existing testimony candidate output is not a regular file")
            if output_path.stat().st_size > MAX_PRESERVED_SIDECAR_BYTES:
                raise ValueError("Existing testimony candidate output exceeds the preservation bound")
            prior_stat = output_path.stat()
            prior_bytes = output_path.read_bytes()
            before_path = run_dir / "before" / TESTIMONY_CANDIDATES_FILENAME
            atomic_write_bytes(before_path, prior_bytes)
            prior_artifact = _artifact_evidence(
                before_path, evidence_copy=f"before/{TESTIMONY_CANDIDATES_FILENAME}",
                source_mtime_ns=prior_stat.st_mtime_ns,
            )
        preservation_stable = {
            "schema_version": PRESERVATION_SCHEMA_VERSION,
            "run_id": run_id,
            "attempt_id": attempt_id,
            "plan_fingerprint": plan["evidence_fingerprint"],
            "doc_id": row["doc_id"],
            "stage": row["stage"],
            "input_fingerprint": row["stage_input_fingerprint"],
            "prior_artifact": prior_artifact,
            "source_files_modified": False,
            "recorded_at": _now(),
        }
        preservation = {
            **preservation_stable,
            "evidence_fingerprint": canonical_fingerprint(preservation_stable),
        }
        preservation_path = run_dir / "preservation_receipt.json"
        write_immutable_snapshot(
            preservation_path, preservation, label="local sidecar preservation receipt",
        )
        fault("after_preservation_receipt")
        db.execute("BEGIN IMMEDIATE")
        append_attempt_event(
            db, plan=plan, row=row, event_type="preservation_recorded",
            detail={
                **common,
                "receipt_fingerprint": preservation["evidence_fingerprint"],
                "prior_artifact_present": prior_artifact is not None,
                "prior_artifact_sha256": prior_artifact["sha256"] if prior_artifact else "",
                "prior_artifact_bytes": prior_artifact["bytes"] if prior_artifact else 0,
                "prior_artifact_mtime_ns": prior_artifact["mtime_ns"] if prior_artifact else 0,
            },
        )
        append_attempt_event(
            db, plan=plan, row=row, event_type="execution_started",
            detail={
                **common,
                "started_at": started_at,
                "input_fingerprint": row["stage_input_fingerprint"],
            },
        )
        db.commit()
        fault("after_start_commit")

        payload = build_testimony_candidates(
            output_path.parent,
            generated_at=started_at,
            generator_git_commit="",
        )
        validate_testimony_candidates_payload(payload, doc_id=row["doc_id"])
        atomic_write_json(output_path, payload)
        output_written = True
        fault("after_output_replace")
        stored_payload = json.loads(output_path.read_text(encoding="utf-8"))
        validate_testimony_candidates_payload(stored_payload, doc_id=row["doc_id"])
        input_after, _ = _stage_input_snapshot(
            Path(corpus_dir), row["doc_id"], SUPPORTED_STAGE,
        )
        if input_after != row["stage_input_fingerprint"]:
            raise ValueError("Stage inputs changed during deterministic execution")
        after_path = run_dir / "after" / TESTIMONY_CANDIDATES_FILENAME
        atomic_write_bytes(after_path, output_path.read_bytes())
        fault("after_after_copy")
        output_artifact = _artifact_evidence(
            after_path, evidence_copy=f"after/{TESTIMONY_CANDIDATES_FILENAME}",
            source_mtime_ns=output_path.stat().st_mtime_ns,
        )
        completed_at = _now()
        receipt_stable = {
            "schema_version": RECEIPT_SCHEMA_VERSION,
            "run_id": run_id,
            "attempt_id": attempt_id,
            "plan_fingerprint": plan["evidence_fingerprint"],
            "request_key": plan["request"]["request_key"],
            "workflow_batch_id": plan["workflow_batch_id"],
            "doc_id": row["doc_id"],
            "stage": row["stage"],
            "adapter_version": ADAPTER_VERSION,
            "adapter_fingerprint": adapter_hash,
            "status": "succeeded",
            "authorization_scope": "local_testimony_candidates_sidecar",
            "remote_writes": False,
            "model_calls": False,
            "source_files_modified": False,
            "publication": False,
            "input_fingerprint_before": row["stage_input_fingerprint"],
            "input_fingerprint_after": input_after,
            "prior_artifact": prior_artifact,
            "output_artifact": output_artifact,
            "error": None,
            "started_at": started_at,
            "completed_at": completed_at,
            "reattestation_required": True,
        }
        receipt = {
            **receipt_stable,
            "evidence_fingerprint": canonical_fingerprint(receipt_stable),
        }
        _validate_receipt(receipt)
        receipt_path = run_dir / "execution_receipt.json"
        write_immutable_snapshot(receipt_path, receipt, label="local sidecar execution receipt")
        fault("after_success_receipt")
        db.execute("BEGIN IMMEDIATE")
        append_attempt_event(
            db, plan=plan, row=row, event_type="execution_succeeded",
            detail={
                **common,
                "completed_at": completed_at,
                "input_fingerprint_after": input_after,
                "output_sha256": output_artifact["sha256"],
                "output_bytes": output_artifact["bytes"],
                "receipt_fingerprint": receipt["evidence_fingerprint"],
                "reattestation_required": True,
            },
        )
        fault("after_success_event_before_release")
        append_attempt_event(
            db, plan=plan, row=row, event_type="lease_released",
            detail={
                **common,
                "released_at": _now(),
                "lease_token_hash": lease_token_hash,
                "outcome": "succeeded",
            },
        )
        db.commit()
        terminal_status = "succeeded"
        terminal_committed = True
        fault("after_terminal_commit")
        historical = reconcile_attempt_plan_history(plan, ledger_path)
        if not historical["ok"]:
            raise ValueError("Post-execution historical reconciliation failed")
        evidence_audit = verify_testimony_execution_evidence(
            plan, attempt_id, ledger_path,
            corpus_dir=Path(corpus_dir), evidence_root=Path(evidence_root),
        )
        return {
            "ok": True,
            "status": "succeeded",
            "run_id": run_id,
            "attempt_id": attempt_id,
            "receipt_path": receipt_path,
            "receipt": receipt,
            "historical_reconciliation": historical,
            "evidence_audit": evidence_audit,
            "execution_committed": True,
            "verification_ok": True,
            "reattestation_required": True,
            "remote_writes": False,
        }
    except Exception as exc:
        if db is not None:
            db.rollback()
        restoration_ok = True
        restoration_error = ""
        if output_written and not terminal_committed:
            try:
                if prior_bytes is None:
                    _durable_remove(output_path)
                    restoration_ok = not output_path.exists()
                else:
                    atomic_write_bytes(output_path, prior_bytes)
                    os.utime(
                        output_path,
                        ns=(prior_artifact["mtime_ns"], prior_artifact["mtime_ns"]),
                    )
                    restoration_ok = (
                        output_path.is_file() and not output_path.is_symlink()
                        and output_path.read_bytes() == prior_bytes
                        and output_path.stat().st_mtime_ns == prior_artifact["mtime_ns"]
                    )
            except Exception as restore_exc:
                restoration_ok = False
                restoration_error = f"{type(restore_exc).__name__}: {str(restore_exc)[:300]}"
        evidence_error = ""
        if db is not None:
            try:
                common = _common_event_detail(
                    plan=plan, row=row, run_id=run_id, adapter_hash=adapter_hash,
                )
                events = db.execute(
                    "SELECT event_type FROM attempt_events WHERE attempt_id=? ORDER BY sequence",
                    (attempt_id,),
                ).fetchall()
                types = [str(value[0]) for value in events]
                terminal_committed = any(value in types for value in EXECUTION_TERMINAL_TYPES)
                if restoration_ok and "execution_authorized" in types and not any(
                    value in types for value in EXECUTION_TERMINAL_TYPES
                ):
                    failed_stable = {
                        "schema_version": RECEIPT_SCHEMA_VERSION,
                        "run_id": run_id,
                        "attempt_id": attempt_id,
                        "plan_fingerprint": plan["evidence_fingerprint"],
                        "request_key": plan["request"]["request_key"],
                        "workflow_batch_id": plan["workflow_batch_id"],
                        "doc_id": row["doc_id"],
                        "stage": row["stage"],
                        "adapter_version": ADAPTER_VERSION,
                        "adapter_fingerprint": adapter_hash,
                        "status": "failed",
                        "authorization_scope": "local_testimony_candidates_sidecar",
                        "remote_writes": False,
                        "model_calls": False,
                        "source_files_modified": False,
                        "publication": False,
                        "input_fingerprint_before": row["stage_input_fingerprint"],
                        "input_fingerprint_after": "",
                        "prior_artifact": prior_artifact,
                        "output_artifact": None,
                        "error": {"code": type(exc).__name__, "message": str(exc)[:500]},
                        "started_at": started_at,
                        "completed_at": _now(),
                        "reattestation_required": True,
                    }
                    failed_receipt = {
                        **failed_stable,
                        "evidence_fingerprint": canonical_fingerprint(failed_stable),
                    }
                    _validate_receipt(failed_receipt)
                    run_dir.mkdir(parents=True, exist_ok=True)
                    failed_path = run_dir / "execution_receipt.json"
                    write_immutable_snapshot(
                        failed_path, failed_receipt, label="failed local sidecar execution receipt",
                    )
                    db.execute("BEGIN IMMEDIATE")
                    append_attempt_event(
                        db, plan=plan, row=row, event_type="execution_failed",
                        detail={
                            **common,
                            "completed_at": failed_receipt["completed_at"],
                            "error_code": type(exc).__name__,
                            "receipt_fingerprint": failed_receipt["evidence_fingerprint"],
                            "prior_artifact_restored": True,
                            "reattestation_required": True,
                        },
                    )
                    append_attempt_event(
                        db, plan=plan, row=row, event_type="lease_released",
                        detail={
                            **common,
                            "released_at": _now(),
                            "lease_token_hash": lease_token_hash,
                            "outcome": "failed",
                        },
                    )
                    db.commit()
                    terminal_status = "failed"
                    terminal_committed = True
            except Exception as evidence_exc:
                evidence_error = f"{type(evidence_exc).__name__}: {str(evidence_exc)[:300]}"
                if db is not None:
                    db.rollback()
        if not terminal_committed:
            terminal_status = "recovery_required"
        return {
            "ok": False,
            "status": terminal_status,
            "run_id": run_id,
            "attempt_id": attempt_id,
            "error": {"code": type(exc).__name__, "message": str(exc)[:500]},
            "restoration_ok": restoration_ok,
            "restoration_error": restoration_error,
            "evidence_error": evidence_error,
            "post_commit_audit_error": (
                {"code": type(exc).__name__, "message": str(exc)[:500]}
                if terminal_committed else None
            ),
            "execution_committed": terminal_committed,
            "verification_ok": False,
            "reattestation_required": True,
            "remote_writes": False,
        }
    finally:
        if db is not None:
            db.close()
        release_worker_lock(lock_path, lock_fd)


def recover_interrupted_testimony_attempt(
    plan: dict[str, Any],
    attempt_id: str,
    ledger_path: Path,
    *,
    corpus_dir: Path,
    evidence_root: Path,
    confirmed_attempt_id: str,
) -> dict[str, Any]:
    """Reconcile an interrupted grant without ever invoking the adapter again."""
    if confirmed_attempt_id != attempt_id:
        raise ValueError("Exact interrupted-attempt confirmation is required")
    _validate_execution_roots(Path(corpus_dir), Path(evidence_root))
    row = _select_row(plan, attempt_id)
    lock_path = _execution_lock_path(Path(corpus_dir), row["doc_id"])
    lock_fd = acquire_worker_lock(lock_path)
    db: sqlite3.Connection | None = None
    try:
        _, execution = _load_execution_history(plan, row, Path(ledger_path))
        if not execution:
            raise ValueError("Attempt has no execution grant to recover")
        by_type = {event_type: detail for event_type, detail in execution}
        common = dict(execution[0][1])
        common = {
            key: common[key]
            for key in {
                "run_id", "attempt_id", "plan_fingerprint", "request_key", "doc_id",
                "stage", "adapter_version", "adapter_fingerprint", "remote_writes",
                "model_calls", "source_files_modified", "publication",
            }
        }
        run_id = str(common["run_id"])
        run_dir = _run_evidence_dir(Path(evidence_root), plan, attempt_id, run_id)
        lease = by_type.get("lease_acquired")
        if lease is None:
            raise ValueError("Interrupted execution has no durable lease")
        lease_hash = str(lease["lease_token_hash"])
        if "lease_released" in by_type:
            evidence = verify_testimony_execution_evidence(
                plan, attempt_id, ledger_path,
                corpus_dir=Path(corpus_dir), evidence_root=Path(evidence_root),
            )
            return {
                "ok": True, "status": "already_reconciled", "attempt_id": attempt_id,
                "run_id": run_id, "evidence_audit": evidence, "adapter_invoked": False,
            }

        db = open_attempt_ledger(Path(ledger_path))
        terminal_type = next(
            (value for value in EXECUTION_TERMINAL_TYPES if value in by_type), None,
        )
        if terminal_type is not None:
            evidence = verify_testimony_execution_evidence(
                plan, attempt_id, ledger_path,
                corpus_dir=Path(corpus_dir), evidence_root=Path(evidence_root),
            )
            outcome = {
                "execution_succeeded": "succeeded",
                "execution_failed": "failed",
                "execution_recovery_hold": "recovery_hold",
            }[terminal_type]
            db.execute("BEGIN IMMEDIATE")
            append_attempt_event(
                db, plan=plan, row=row, event_type="lease_released",
                detail={
                    **common, "released_at": _now(), "lease_token_hash": lease_hash,
                    "outcome": outcome,
                },
            )
            db.commit()
            return {
                "ok": True, "status": outcome, "attempt_id": attempt_id, "run_id": run_id,
                "evidence_audit": evidence, "adapter_invoked": False,
            }

        bound_preservation: dict[str, Any] | None = None
        preservation_valid = False
        if "preservation_recorded" in by_type:
            try:
                bound_preservation = _load_bound_preservation(
                    run_dir, plan=plan, row=row, run_id=run_id,
                    event_detail=by_type["preservation_recorded"],
                )
                preservation_valid = True
            except ValueError:
                bound_preservation = None
        recoverable_receipt: dict[str, Any] | None = None
        receipt_path = run_dir / "execution_receipt.json"
        if receipt_path.is_file() and not receipt_path.is_symlink():
            try:
                candidate = _read_json_object(receipt_path, label="Interrupted execution receipt")
                _validate_receipt(candidate)
                _validate_receipt_binding(
                    candidate, plan=plan, row=row, run_id=run_id,
                    adapter_version=common["adapter_version"],
                    adapter_hash=common["adapter_fingerprint"],
                )
                expected_prior = (
                    bound_preservation["prior_artifact"] if preservation_valid else None
                )
                if candidate["prior_artifact"] == expected_prior:
                    _verify_artifact_copy(run_dir, candidate["prior_artifact"])
                    _verify_artifact_copy(run_dir, candidate["output_artifact"])
                    if candidate["status"] == "succeeded" and preservation_valid and {
                        "preservation_recorded", "execution_started",
                    } <= set(by_type):
                        output_path = (
                            Path(corpus_dir) / row["doc_id"] / TESTIMONY_CANDIDATES_FILENAME
                        )
                        output = candidate["output_artifact"]
                        if (
                            output_path.is_file() and not output_path.is_symlink()
                            and output_path.stat().st_size == output["bytes"]
                            and _sha256_file(output_path) == output["sha256"]
                        ):
                            validate_testimony_candidates_payload(
                                _read_json_object(
                                    output_path, label="Interrupted testimony candidate output",
                                ),
                                doc_id=row["doc_id"],
                            )
                            recoverable_receipt = candidate
                    elif candidate["status"] == "failed":
                        output_path = (
                            Path(corpus_dir) / row["doc_id"] / TESTIMONY_CANDIDATES_FILENAME
                        )
                        prior = candidate["prior_artifact"]
                        restored = (
                            not output_path.exists()
                            if prior is None
                            else (
                                output_path.is_file() and not output_path.is_symlink()
                                and output_path.stat().st_size == prior["bytes"]
                                and _sha256_file(output_path) == prior["sha256"]
                                and output_path.stat().st_mtime_ns == prior["mtime_ns"]
                            )
                        )
                        if restored:
                            recoverable_receipt = candidate
            except (OSError, ValueError):
                recoverable_receipt = None

        db.execute("BEGIN IMMEDIATE")
        if recoverable_receipt is not None:
            status = str(recoverable_receipt["status"])
            if status == "succeeded":
                output = recoverable_receipt["output_artifact"]
                append_attempt_event(
                    db, plan=plan, row=row, event_type="execution_succeeded",
                    detail={
                        **common,
                        "completed_at": recoverable_receipt["completed_at"],
                        "input_fingerprint_after": recoverable_receipt["input_fingerprint_after"],
                        "output_sha256": output["sha256"], "output_bytes": output["bytes"],
                        "receipt_fingerprint": recoverable_receipt["evidence_fingerprint"],
                        "reattestation_required": True,
                    },
                )
            else:
                append_attempt_event(
                    db, plan=plan, row=row, event_type="execution_failed",
                    detail={
                        **common,
                        "completed_at": recoverable_receipt["completed_at"],
                        "error_code": recoverable_receipt["error"]["code"],
                        "receipt_fingerprint": recoverable_receipt["evidence_fingerprint"],
                        "prior_artifact_restored": True,
                        "reattestation_required": True,
                    },
                )
        else:
            run_dir.mkdir(parents=True, exist_ok=True)
            output_path = Path(corpus_dir) / row["doc_id"] / TESTIMONY_CANDIDATES_FILENAME
            observed: dict[str, Any] | None = None
            if (
                output_path.is_file() and not output_path.is_symlink()
                and output_path.stat().st_size <= MAX_PRESERVED_SIDECAR_BYTES
            ):
                observed_path = run_dir / "recovery_observed" / TESTIMONY_CANDIDATES_FILENAME
                atomic_write_bytes(observed_path, output_path.read_bytes())
                observed = _artifact_evidence(
                    observed_path,
                    evidence_copy=f"recovery_observed/{TESTIMONY_CANDIDATES_FILENAME}",
                    source_mtime_ns=output_path.stat().st_mtime_ns,
                )
            prior = bound_preservation["prior_artifact"] if preservation_valid else None
            restoration_proven = False
            if preservation_valid:
                try:
                    if prior is None:
                        _durable_remove(output_path)
                        restoration_proven = not output_path.exists()
                    else:
                        prior_copy = run_dir / str(prior["evidence_copy"])
                        atomic_write_bytes(output_path, prior_copy.read_bytes())
                        os.utime(
                            output_path,
                            ns=(prior["mtime_ns"], prior["mtime_ns"]),
                        )
                        restoration_proven = (
                            output_path.is_file() and not output_path.is_symlink()
                            and output_path.stat().st_size == prior["bytes"]
                            and _sha256_file(output_path) == prior["sha256"]
                            and output_path.stat().st_mtime_ns == prior["mtime_ns"]
                        )
                except (OSError, ValueError):
                    restoration_proven = False
            marker_stable = {
                "schema_version": "testimony-execution-hold-v1.0",
                "workflow_batch_id": plan["workflow_batch_id"],
                "plan_fingerprint": plan["evidence_fingerprint"],
                "attempt_id": attempt_id,
                "run_id": run_id,
                "doc_id": row["doc_id"],
                "reason": "interrupted_execution_requires_manual_review",
                "prior_state_restored": restoration_proven,
                "public_display": False,
                "created_at": _now(),
            }
            marker = {
                **marker_stable,
                "evidence_fingerprint": canonical_fingerprint(marker_stable),
            }
            atomic_write_json(output_path.parent / EXECUTION_HOLD_FILENAME, marker)
            completed_at = _now()
            hold_stable = {
                "schema_version": RECEIPT_SCHEMA_VERSION,
                "run_id": run_id, "attempt_id": attempt_id,
                "plan_fingerprint": plan["evidence_fingerprint"],
                "request_key": plan["request"]["request_key"],
                "workflow_batch_id": plan["workflow_batch_id"],
                "doc_id": row["doc_id"], "stage": row["stage"],
                "adapter_version": common["adapter_version"],
                "adapter_fingerprint": common["adapter_fingerprint"],
                "status": "recovery_hold",
                "authorization_scope": "local_testimony_candidates_sidecar",
                "remote_writes": False, "model_calls": False,
                "source_files_modified": False, "publication": False,
                "input_fingerprint_before": row["stage_input_fingerprint"],
                "input_fingerprint_after": "", "prior_artifact": prior,
                "output_artifact": observed,
                "error": {
                    "code": "InterruptedExecutionAmbiguous",
                    "message": "Interrupted execution could not be proven complete; no adapter rerun occurred.",
                },
                "started_at": str(by_type.get("execution_started", {}).get("started_at") or lease["acquired_at"]),
                "completed_at": completed_at, "reattestation_required": True,
            }
            hold = {
                **hold_stable,
                "evidence_fingerprint": canonical_fingerprint(hold_stable),
            }
            _validate_receipt(hold)
            write_immutable_snapshot(
                run_dir / "recovery_receipt.json", hold,
                label="interrupted local sidecar recovery receipt",
            )
            append_attempt_event(
                db, plan=plan, row=row, event_type="execution_recovery_hold",
                detail={
                    **common, "completed_at": completed_at,
                    "error_code": "InterruptedExecutionAmbiguous",
                    "receipt_fingerprint": hold["evidence_fingerprint"],
                    "reattestation_required": True,
                },
            )
            recoverable_receipt = hold
            status = "recovery_hold"
        append_attempt_event(
            db, plan=plan, row=row, event_type="lease_released",
            detail={
                **common, "released_at": _now(), "lease_token_hash": lease_hash,
                "outcome": status,
            },
        )
        db.commit()
        evidence = verify_testimony_execution_evidence(
            plan, attempt_id, ledger_path,
            corpus_dir=Path(corpus_dir), evidence_root=Path(evidence_root),
        )
        return {
            "ok": True, "status": status, "attempt_id": attempt_id, "run_id": run_id,
            "evidence_audit": evidence, "adapter_invoked": False,
        }
    except Exception:
        if db is not None:
            db.rollback()
        raise
    finally:
        if db is not None:
            db.close()
        release_worker_lock(lock_path, lock_fd)


EXECUTION_TERMINAL_TYPES = {
    "execution_succeeded", "execution_failed", "execution_recovery_hold",
}
