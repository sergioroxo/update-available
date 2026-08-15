"""Independent Analysis station foundation for a future governed Pass A run.

This module is deliberately inert until a caller supplies a strict Pass A
campaign, complete canonical/model-input artifacts, an immutable lexicon
snapshot, and an executor.  Importing it performs no network or corpus work.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Protocol

from pydantic import BaseModel

from runner.models.document import AnalysisResult, PreprocessResult
from runner.models.reprocessing import (
    AnalysisLexiconSnapshotV1,
    AnalysisObserverMetadataV1,
    ImmutableArtifactManifestV1,
    ModelStageResultV1,
    RESEARCH_PASS_A_STATIONS,
    ResearchPassAApprovalV1,
    ResearchPassACampaignV1,
    ResultArtifactEntryV1,
)
from . import analyze
from .atomic_io import atomic_write_bytes
from .extraction_quality import validate_preprocess_text_artifacts
from .factory_messages import canonical_json_bytes, publish_checksum_bound_bytes, sha256_bytes
from .factory_auth import AuthenticatedFactoryMessageV1, verify_factory_message
from .input_receipt import validate_resolved_input_receipt


PROMPT_VERSION = "ingestion-v3.3"
EXECUTOR_VERSION = "independent-analysis-station-v1.0"
_FORBIDDEN_ROUTES = {"both", "prefer-local", "prefer-claude"}


class AnalysisStationError(ValueError):
    """Content-free deterministic hold."""


class RetryableAnalysisError(RuntimeError):
    """Content-free infrastructure failure eligible for bounded retry."""


def verify_authenticated_pass_a_approval(
    message: AuthenticatedFactoryMessageV1,
    *,
    expected_run_id: str,
    allowed_public_keys,
    now: datetime,
) -> ResearchPassAApprovalV1:
    payload = verify_factory_message(
        message,
        expected_purpose="campaign_release",
        expected_run_id=expected_run_id,
        allowed_public_keys=allowed_public_keys,
        now=now,
    )
    approval = ResearchPassAApprovalV1.model_validate(payload)
    approval.assert_current(now)
    return approval


@dataclass(frozen=True)
class AnalysisStationRequest:
    run_id: str
    package_id: str
    document_id: str
    source_sha256: str
    canonical_sha256: str
    attempt: int
    route: str
    preprocess: PreprocessResult
    lexicon_snapshot: AnalysisLexiconSnapshotV1


@dataclass(frozen=True)
class AnalysisExecutorResult:
    analysis: AnalysisResult
    audit: dict


class AnalysisStationExecutor(Protocol):
    def open(self) -> None: ...
    def execute(self, request: AnalysisStationRequest) -> AnalysisExecutorResult: ...
    def close(self) -> None: ...


def snapshot_prompt_terms(snapshot: AnalysisLexiconSnapshotV1) -> list[dict]:
    """Render only the validated snapshot into the legacy prompt shape."""
    return [
        {
            "_id": term.term_id,
            "term": term.preferred_term,
            "status": "validated",
            "proposedCluster": "orientation",
            "function": "orientation",
            "multilingualVariants": [
                {"language": row.language, "variantTerm": row.value}
                for row in term.variants
            ],
        }
        for term in snapshot.terms
    ]


def validate_analysis_request(request: AnalysisStationRequest) -> tuple[str, str]:
    if request.route in _FORBIDDEN_ROUTES or not request.route:
        raise AnalysisStationError("analysis_route_not_independently_authorized")
    canonical, receipt = validate_preprocess_text_artifacts(
        canonical_text=request.preprocess.canonical_text,
        model_text=request.preprocess.text,
        model_input_receipt=request.preprocess.model_input_receipt,
    )
    if "[TRUNCATED MIDDLE" in canonical:
        raise AnalysisStationError("canonical_text_truncation_marker")
    if hashlib.sha256(canonical.encode("utf-8")).hexdigest() != request.canonical_sha256:
        raise AnalysisStationError("stale_canonical_text")
    if request.preprocess.text != canonical and receipt is None:
        raise AnalysisStationError("model_input_receipt_missing")
    if request.lexicon_snapshot.canonical_sha256 == request.canonical_sha256:
        raise AnalysisStationError("lexicon_snapshot_identity_collision")
    return canonical, request.preprocess.text


class ExistingAnalysisPipelineExecutor:
    """Adapter for the established typed pipeline; never instantiated by tests.

    Route selection is exact and fallback routes are refused.  Frozen terms are
    supplied directly, so the pipeline cannot perform a live lexicon lookup.
    """

    def __init__(self, *, config, approved_route: str):
        if approved_route in _FORBIDDEN_ROUTES:
            raise AnalysisStationError("analysis_route_fallback_forbidden")
        self.config = config
        self.approved_route = approved_route

    def open(self) -> None:
        return None

    def execute(self, request: AnalysisStationRequest) -> AnalysisExecutorResult:
        if request.route != self.approved_route:
            raise AnalysisStationError("analysis_route_mismatch")
        validate_analysis_request(request)
        audit: dict = {"prompt_version": PROMPT_VERSION}
        result = analyze.run(
            request.preprocess,
            request.route,
            self.config,
            _audit=audit,
            _frozen_lexicon_terms=snapshot_prompt_terms(request.lexicon_snapshot),
            _frozen_lexicon_sha256=request.lexicon_snapshot.canonical_sha256,
        )
        if not isinstance(result, AnalysisResult):
            raise AnalysisStationError("analysis_output_not_independent")
        return AnalysisExecutorResult(analysis=result, audit=audit)

    def close(self) -> None:
        return None


def _content_free_audit(audit: dict) -> dict:
    allowed = {
        "prompt_version", "model", "provider_resolved_model", "model_parameters",
        "prompt_sha256", "prompt_template_sha256", "lexicon_fingerprint",
        "lexicon_source", "input_char_count", "input_truncated", "duration_ms",
        "validation_path", "validation_attempts", "input_receipt",
    }
    return {key: audit[key] for key in sorted(allowed) if key in audit}


def validate_executor_result(
    request: AnalysisStationRequest, result: AnalysisExecutorResult,
) -> tuple[AnalysisResult, dict]:
    analysis = AnalysisResult.model_validate(result.analysis.model_dump(mode="python"))
    audit = _content_free_audit(dict(result.audit))
    if audit.get("prompt_version") != PROMPT_VERSION:
        raise AnalysisStationError("analysis_prompt_version_mismatch")
    if audit.get("lexicon_fingerprint") != request.lexicon_snapshot.canonical_sha256:
        raise AnalysisStationError("analysis_lexicon_snapshot_mismatch")
    if audit.get("lexicon_source") != "frozen_snapshot":
        raise AnalysisStationError("analysis_lexicon_source_not_frozen")
    if not str(audit.get("provider_resolved_model") or "").strip():
        raise AnalysisStationError("provider_resolved_model_missing")
    receipt = audit.get("input_receipt")
    if not isinstance(receipt, dict):
        raise AnalysisStationError("resolved_input_receipt_missing")
    validated = validate_resolved_input_receipt(receipt, expected_stage="analysis")
    if validated["model_route"] != request.route:
        raise AnalysisStationError("resolved_input_route_mismatch")
    if validated["provider_resolved_model"] != audit["provider_resolved_model"]:
        raise AnalysisStationError("resolved_model_identity_mismatch")
    if receipt["dependencies"]["lexicon_fingerprint"] != request.lexicon_snapshot.canonical_sha256:
        raise AnalysisStationError("resolved_input_lexicon_mismatch")
    return analysis, audit


def build_analysis_bundle(
    request: AnalysisStationRequest,
    result: AnalysisExecutorResult,
    *,
    completed_at: datetime,
    started_at: datetime,
) -> tuple[dict[str, bytes], ImmutableArtifactManifestV1, AnalysisObserverMetadataV1]:
    canonical, model_input = validate_analysis_request(request)
    analysis, audit = validate_executor_result(request, result)
    analysis_bytes = canonical_json_bytes(analysis.model_dump(mode="json"))
    audit_bytes = canonical_json_bytes(audit)
    receipt_bytes = canonical_json_bytes(audit["input_receipt"])
    output_sha = sha256_bytes(analysis_bytes)
    model_stage = ModelStageResultV1(
        run_id=request.run_id,
        stage_job_id=f"{request.document_id}-independent-analysis-{request.attempt}",
        document_id=request.document_id,
        attempt=request.attempt,
        input_artifact_hashes=tuple(sorted({
            request.source_sha256,
            request.canonical_sha256,
            sha256_bytes(model_input.encode("utf-8")),
        })),
        system_input_sha256=audit["input_receipt"]["system_input_sha256"],
        user_input_sha256=audit["input_receipt"]["user_input_sha256"],
        requested_model=request.route,
        provider_resolved_model=audit["provider_resolved_model"],
        model_parameters=dict(audit.get("model_parameters") or {}),
        output_schema_version="analysis-result-ingestion-v3.3",
        lexicon_snapshot_sha256=request.lexicon_snapshot.canonical_sha256,
        started_at=started_at,
        completed_at=completed_at,
        duration_ms=int((completed_at - started_at).total_seconds() * 1000),
        validation_status="passed",
        output_sha256=output_sha,
    )
    artifacts = {
        "analysis.json": analysis_bytes,
        "analysis_audit.json": audit_bytes,
        "resolved_input_receipt.json": receipt_bytes,
        "model_stage_result.json": canonical_json_bytes(model_stage),
    }
    entries = tuple(
        ResultArtifactEntryV1(
            relative_path=name,
            media_type="application/json",
            byte_count=len(data),
            sha256=sha256_bytes(data),
            producing_station="independent_analysis",
            document_id=request.document_id,
            source_sha256=request.source_sha256,
            canonical_text_sha256=request.canonical_sha256,
            executor_version=EXECUTOR_VERSION,
            completed_at=completed_at,
        )
        for name, data in sorted(artifacts.items())
    )
    manifest = ImmutableArtifactManifestV1(
        run_id=request.run_id,
        package_id=request.package_id,
        document_id=request.document_id,
        station_id="independent_analysis",
        source_sha256=request.source_sha256,
        canonical_text_sha256=request.canonical_sha256,
        executor_version=EXECUTOR_VERSION,
        completed_at=completed_at,
        artifacts=entries,
    )
    artifacts["result_manifest.json"] = canonical_json_bytes(manifest)
    observer = AnalysisObserverMetadataV1(
        run_id=request.run_id,
        document_id=request.document_id,
        attempt=request.attempt,
        requested_route=request.route,
        provider_resolved_model=audit["provider_resolved_model"],
        output_sha256=output_sha,
        lexicon_snapshot_sha256=request.lexicon_snapshot.canonical_sha256,
        validation_status="passed",
    )
    return artifacts, manifest, observer


def publish_analysis_bundle(directory: Path, artifacts: dict[str, bytes]) -> dict[str, str]:
    """Publish a closed bundle.  The manifest is deliberately published last."""
    directory = Path(directory)
    if directory.is_symlink():
        raise AnalysisStationError("analysis_result_path_is_symlink")
    directory.mkdir(parents=True, exist_ok=True)
    expected = {
        "analysis.json", "analysis_audit.json", "resolved_input_receipt.json",
        "model_stage_result.json", "result_manifest.json",
    }
    if set(artifacts) != expected:
        raise AnalysisStationError("analysis_result_bundle_incomplete")
    published: dict[str, str] = {}
    for name in sorted(expected - {"result_manifest.json"}):
        outcome = publish_checksum_bound_bytes(artifacts[name], directory / name)
        published[name] = outcome["sha256"]
    outcome = publish_checksum_bound_bytes(
        artifacts["result_manifest.json"], directory / "result_manifest.json"
    )
    published["result_manifest.json"] = outcome["sha256"]
    return published


def _inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


class PassAWorkerStore:
    """Small station-major, lease-fenced, run-local durable store."""

    def __init__(self, path: Path, *, shared_roots: tuple[Path, ...] = ()):
        self.path = Path(path)
        if any(_inside(self.path, root) for root in shared_roots):
            raise AnalysisStationError("worker_database_inside_exchange")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.executescript("""
            CREATE TABLE IF NOT EXISTS jobs (
              run_id TEXT NOT NULL, document_id TEXT NOT NULL, station_id TEXT NOT NULL,
              station_sequence INTEGER NOT NULL, state TEXT NOT NULL, attempt INTEGER NOT NULL,
              maximum_attempts INTEGER NOT NULL, lease_token TEXT NOT NULL DEFAULT '',
              lease_expiry TEXT NOT NULL DEFAULT '', output_sha256 TEXT NOT NULL DEFAULT '',
              reason_code TEXT NOT NULL DEFAULT '', PRIMARY KEY(run_id,document_id,station_id)
            );
        """)
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()

    def initialize(self, campaign: ResearchPassACampaignV1) -> None:
        with self.connection:
            for sequence, station in enumerate(RESEARCH_PASS_A_STATIONS, 1):
                for document_id in campaign.document_ids:
                    self.connection.execute(
                        "INSERT OR IGNORE INTO jobs VALUES (?,?,?,?, 'pending',0,?, '', '', '', '')",
                        (campaign.run_id, document_id, station, sequence, campaign.maximum_attempts),
                    )

    def recover_expired(self, *, now: datetime) -> int:
        with self.connection:
            cursor = self.connection.execute(
                "UPDATE jobs SET state='pending',lease_token='',lease_expiry='' "
                "WHERE state='running' AND lease_expiry<=?", (now.isoformat(),),
            )
        return cursor.rowcount

    def claim(self, *, run_id: str, now: datetime, lease_seconds: int = 60):
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            # A station advances only after every member of the prior station is terminal.
            row = self.connection.execute(
                "SELECT * FROM jobs WHERE run_id=? AND state='pending' AND station_sequence=("
                "SELECT MIN(station_sequence) FROM jobs WHERE run_id=? AND state IN ('pending','running')) "
                "ORDER BY document_id LIMIT 1", (run_id, run_id),
            ).fetchone()
            if row is None:
                self.connection.commit()
                return None
            if row["station_sequence"] > 1:
                predecessor = self.connection.execute(
                    "SELECT state FROM jobs WHERE run_id=? AND document_id=? AND station_sequence=?",
                    (run_id, row["document_id"], row["station_sequence"] - 1),
                ).fetchone()
                if predecessor is None or predecessor["state"] != "succeeded":
                    self.connection.execute(
                        "UPDATE jobs SET state='held',reason_code='predecessor_not_successful' "
                        "WHERE run_id=? AND document_id=? AND station_id=?",
                        (run_id, row["document_id"], row["station_id"]),
                    )
                    self.connection.commit()
                    return self.claim(run_id=run_id, now=now, lease_seconds=lease_seconds)
            token = uuid.uuid4().hex
            expiry = (now + timedelta(seconds=lease_seconds)).isoformat()
            self.connection.execute(
                "UPDATE jobs SET state='running',attempt=attempt+1,lease_token=?,lease_expiry=? "
                "WHERE run_id=? AND document_id=? AND station_id=?",
                (token, expiry, run_id, row["document_id"], row["station_id"]),
            )
            self.connection.commit()
            return dict(self.connection.execute(
                "SELECT * FROM jobs WHERE run_id=? AND document_id=? AND station_id=?",
                (run_id, row["document_id"], row["station_id"]),
            ).fetchone())
        except Exception:
            self.connection.rollback()
            raise

    def commit(self, job: dict, *, lease_token: str, now: datetime, output_sha256: str) -> None:
        with self.connection:
            cursor = self.connection.execute(
                "UPDATE jobs SET state='succeeded',output_sha256=?,lease_token='',lease_expiry='' "
                "WHERE run_id=? AND document_id=? AND station_id=? AND state='running' "
                "AND lease_token=? AND lease_expiry>?",
                (output_sha256, job["run_id"], job["document_id"], job["station_id"], lease_token, now.isoformat()),
            )
            if cursor.rowcount != 1:
                raise AnalysisStationError("stale_or_expired_lease_commit")

    def fail(self, job: dict, *, lease_token: str, retryable: bool, reason_code: str) -> None:
        state = "pending" if retryable and job["attempt"] < job["maximum_attempts"] else "held"
        with self.connection:
            cursor = self.connection.execute(
                "UPDATE jobs SET state=?,reason_code=?,lease_token='',lease_expiry='' "
                "WHERE run_id=? AND document_id=? AND station_id=? AND state='running' AND lease_token=?",
                (state, reason_code, job["run_id"], job["document_id"], job["station_id"], lease_token),
            )
            if cursor.rowcount != 1:
                raise AnalysisStationError("stale_lease_failure")

    def snapshot(self, run_id: str) -> tuple[dict, ...]:
        return tuple(dict(row) for row in self.connection.execute(
            "SELECT * FROM jobs WHERE run_id=? ORDER BY station_sequence,document_id", (run_id,),
        ))


class PassAWorker:
    """Station-major scheduler with one Analysis executor lifecycle."""

    def __init__(self, store: PassAWorkerStore, executor: AnalysisStationExecutor):
        self.store = store
        self.executor = executor

    def run_until_idle(self, campaign: ResearchPassACampaignV1, execute_job) -> tuple[dict, ...]:
        self.store.initialize(campaign)
        lifecycle_open = False
        try:
            while True:
                now = datetime.now(timezone.utc)
                self.store.recover_expired(now=now)
                job = self.store.claim(run_id=campaign.run_id, now=now)
                if job is None:
                    break
                token = job["lease_token"]
                try:
                    if job["station_id"] == "independent_analysis" and not lifecycle_open:
                        self.executor.open()
                        lifecycle_open = True
                    output_sha = execute_job(job, self.executor)
                    self.store.commit(job, lease_token=token, now=datetime.now(timezone.utc), output_sha256=output_sha)
                except RetryableAnalysisError:
                    self.store.fail(job, lease_token=token, retryable=True, reason_code="retryable_infrastructure_failure")
                except Exception:
                    self.store.fail(job, lease_token=token, retryable=False, reason_code="deterministic_validation_hold")
        finally:
            if lifecycle_open:
                self.executor.close()
        return self.store.snapshot(campaign.run_id)
