"""MacBook controller and runnable synthetic three-document factory CLI."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from runner.models.reprocessing import (
    CampaignStatusSummaryV2,
    CopiedTextCanaryApprovalV1,
    FactoryCommandV1,
    PRODUCTION_CANARY_STATIONS,
    ProductionCanaryCampaignV1,
    ProductionCanaryJobV1,
    ProductionRecoveryUnitV1,
    RecoveryUnitManifestV1,
    ResearchCampaignV2,
    RuntimeDocumentJobV1,
)
from .atomic_io import atomic_write_bytes
from .factory_messages import canonical_json_bytes, publish_checksum_bound_json, sha256_bytes
from .factory_auth import sign_factory_message
from .factory_auth import (
    AuthenticatedFactoryMessageV1,
    FactoryAuthenticationError,
    generate_keypair,
    public_key_allowlist,
    verify_factory_message,
)
from .factory_station_adapters import (
    EXECUTOR_VERSIONS,
    POLICY_VERSIONS,
    build_canonical_text_material,
    build_complete_units_material,
    build_source_verify_material,
)
from .reprocessing_worker import (
    ReprocessingWorker,
    SyntheticCrash,
    SyntheticNoModelExecutor,
    validate_campaign_packages,
)
from .source_depot import SourcePublicationResult, publish_source_object
from .syncthing_exchange import (
    assert_clean_transfer_tree,
    load_factory_receipts,
    observe_authenticated_receipts,
    observe_receipts,
    publish_exchange_json,
    verify_authenticated_result_bundle,
)


DOCUMENT_IDS = ("fixture-good-a", "fixture-good-b", "fixture-poison")
FIXTURE_BYTES = {
    "fixture-good-a": b"synthetic fixture A\n",
    "fixture-good-b": b"synthetic fixture B\r\n",
    "fixture-poison": b"synthetic fixture poison\n",
}
FIXED_TIME = datetime(2026, 8, 11, tzinfo=timezone.utc)


def _production_input_fingerprint(
    *, station_id: str, source_sha256: str, predecessor_output_sha256: str,
) -> str:
    return sha256_bytes(canonical_json_bytes({
        "station_id": station_id,
        "source_sha256": source_sha256,
        "predecessor_output_sha256": predecessor_output_sha256,
        "executor_version": EXECUTOR_VERSIONS[station_id],
        "policy_version": POLICY_VERSIONS[station_id],
    }))


def build_production_canary_package(
    *,
    run_id: str,
    document_id: str,
    source_reference,
    source_bytes: bytes,
    source_metadata,
    approval: CopiedTextCanaryApprovalV1,
    created_at: datetime,
) -> tuple[ProductionRecoveryUnitV1, tuple]:
    """Build deterministic declarations and predicted immutable outputs."""
    jobs: list[ProductionCanaryJobV1] = []
    materials = []
    predecessor_hash = ""
    for sequence, station_id in enumerate(PRODUCTION_CANARY_STATIONS, start=1):
        job = ProductionCanaryJobV1(
            run_id=run_id,
            package_id="package-001",
            document_id=document_id,
            station_id=station_id,
            station_sequence=sequence,
            predecessor_station_id=("" if sequence == 1 else PRODUCTION_CANARY_STATIONS[sequence - 2]),
            predecessor_output_sha256=predecessor_hash,
            source_reference=source_reference,
            input_fingerprint=_production_input_fingerprint(
                station_id=station_id,
                source_sha256=source_reference.source_sha256,
                predecessor_output_sha256=predecessor_hash,
            ),
            executor_version=EXECUTOR_VERSIONS[station_id],
            policy_version=POLICY_VERSIONS[station_id],
            maximum_attempts=(2 if station_id == "complete_units_v2" else 1),
            retry_classification=(
                "infrastructure_retryable" if station_id == "complete_units_v2"
                else "deterministic_non_retryable"
            ),
        )
        completed_at = created_at + timedelta(seconds=sequence)
        if station_id == "source_verify":
            material = build_source_verify_material(
                job=job,
                source_bytes=source_bytes,
                metadata=source_metadata,
                approval=approval,
                completed_at=completed_at,
            )
        elif station_id == "canonical_text_prepare":
            material = build_canonical_text_material(
                job=job, source_bytes=source_bytes, completed_at=completed_at,
            )
        else:
            material = build_complete_units_material(
                job=job, canonical_bytes=source_bytes, completed_at=completed_at,
            )
        jobs.append(job)
        materials.append(material)
        predecessor_hash = material.manifest_sha256
    return ProductionRecoveryUnitV1(
        run_id=run_id,
        package_id="package-001",
        document_id=document_id,
        jobs=tuple(jobs),
    ), tuple(materials)


def publish_production_canary_release(
    *,
    to_studio: Path,
    source_path: Path,
    approval: CopiedTextCanaryApprovalV1,
    command_signing_private_key: Path,
    now: datetime,
    maximum_source_bytes: int = 1_048_576,
    include_start: bool = True,
) -> dict[str, Any]:
    """Publish one authenticated copied-text release from explicit local bytes."""
    approval.assert_current(now)
    source_path = Path(source_path)
    if source_path.is_symlink() or not source_path.is_file():
        raise ValueError("copied canary source must be a regular non-symlink file")
    data = source_path.read_bytes()
    if len(data) > maximum_source_bytes:
        raise ValueError("copied canary source exceeds the configured size limit")
    if len(data) != approval.source_bytes or sha256_bytes(data) != approval.source_sha256:
        raise ValueError("copied canary approval does not match supplied bytes")
    try:
        data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ValueError("copied canary source is not strict UTF-8") from exc
    extension = source_path.suffix.lower().lstrip(".")
    if extension not in {"txt", "md"}:
        raise ValueError("copied canary supports only .txt and .md")
    publication = publish_source_object(
        source_path,
        to_studio,
        doc_id=approval.document_id,
        safe_extension=extension,
        media_type=approval.media_type,
    )
    package, predicted_materials = build_production_canary_package(
        run_id=approval.run_id,
        document_id=approval.document_id,
        source_reference=publication.reference,
        source_bytes=data,
        source_metadata=publication.metadata,
        approval=approval,
        created_at=now,
    )
    approval_hash = sha256_bytes(canonical_json_bytes(approval))
    package_hash = sha256_bytes(canonical_json_bytes(package))
    campaign = ProductionCanaryCampaignV1(
        run_id=approval.run_id,
        execution_mode="production_copied_text_canary",
        created_at=now,
        creator_id="macbook-production-controller-v1",
        approval_id=approval.approval_id,
        approval_sha256=approval_hash,
        document_id=approval.document_id,
        source_reference=publication.reference,
        package_id=package.package_id,
        package_manifest_sha256=package_hash,
        authorized_station_ids=PRODUCTION_CANARY_STATIONS,
    )
    production_root = f"campaigns/{campaign.run_id}/production"
    approval_result = publish_exchange_json(
        to_studio, f"{production_root}/approval.json", approval,
    )
    package_result = publish_exchange_json(
        to_studio, f"{production_root}/package.json", package,
    )
    campaign_message = sign_factory_message(
        campaign,
        purpose="campaign_release",
        run_id=campaign.run_id,
        message_id=f"campaign-release-{campaign.run_id}",
        private_key_path=command_signing_private_key,
        issued_at=now,
        shared_roots=(Path(to_studio),),
    )
    campaign_result = publish_exchange_json(
        to_studio, f"{production_root}/campaign.auth.json", campaign_message,
    )
    command_result: dict[str, Any] = {"reused": False, "sha256": ""}
    command = None
    if include_start:
        command = FactoryCommandV1(
            run_id=campaign.run_id,
            command_id="production-command-000001-start",
            sequence=1,
            action="start_approved",
            issued_at=now,
            expires_at=now + timedelta(hours=1),
            campaign_sha256=sha256_bytes(canonical_json_bytes(campaign)),
        )
        command_message = sign_factory_message(
            command,
            purpose="command",
            run_id=campaign.run_id,
            message_id=command.command_id,
            private_key_path=command_signing_private_key,
            issued_at=now,
            expires_at=command.expires_at,
            shared_roots=(Path(to_studio),),
        )
        command_result = publish_exchange_json(
            to_studio,
            f"commands/{campaign.run_id}/{command.sequence:06d}-{command.command_id}.auth.json",
            command_message,
        )
    return {
        "run_id": campaign.run_id,
        "campaign": campaign,
        "package": package,
        "approval": approval,
        "command": command,
        "predicted_materials": predicted_materials,
        "source_published_bytes": publication.published_bytes,
        "source_reused_bytes": publication.reused_bytes,
        "campaign_reused": campaign_result["reused"],
        "package_reused": package_result["reused"],
        "approval_reused": approval_result["reused"],
        "command_reused": command_result["reused"],
    }


def _campaign_identity_seed(
    *, run_id: str, source_references: tuple, package_ids: tuple[str, ...],
) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "execution_mode": "synthetic_no_model",
        "documents": list(DOCUMENT_IDS),
        "source_references": [row.model_dump(mode="json") for row in source_references],
        "package_ids": list(package_ids),
        "station": "synthetic_prepare",
        "policy_version": "factory-runtime-policy-v1.0",
    }


def campaign_identity_sha256(
    *, run_id: str, source_references: tuple, package_ids: tuple[str, ...],
) -> str:
    return sha256_bytes(canonical_json_bytes(_campaign_identity_seed(
        run_id=run_id, source_references=source_references, package_ids=package_ids,
    )))


def build_campaign_and_packages(
    *, run_id: str, publications: tuple[SourcePublicationResult, ...],
) -> tuple[ResearchCampaignV2, tuple[RecoveryUnitManifestV1, ...]]:
    references = tuple(row.reference for row in sorted(publications, key=lambda row: row.doc_id))
    package_ids = ("package-001",)
    identity = campaign_identity_sha256(
        run_id=run_id, source_references=references, package_ids=package_ids,
    )
    jobs = tuple(
        RuntimeDocumentJobV1(
            run_id=run_id,
            package_id="package-001",
            document_id=reference.doc_id,
            source_reference=reference,
            input_fingerprint=sha256_bytes(canonical_json_bytes({
                "source_sha256": reference.source_sha256,
                "station_id": "synthetic_prepare",
                "executor_version": "synthetic-no-model-v1.0",
            })),
            max_attempts=2,
        )
        for reference in references
    )
    package = RecoveryUnitManifestV1(
        run_id=run_id,
        package_id="package-001",
        package_sequence=1,
        campaign_identity_sha256=identity,
        documents=jobs,
    )
    campaign = ResearchCampaignV2(
        run_id=run_id,
        campaign_type="three_document_vertical_slice",
        execution_mode="synthetic_no_model",
        created_at=FIXED_TIME,
        creator_id="macbook-controller-007",
        baseline_identity="phase1-runs-004-006",
        code_identity="run-007-worktree",
        worktree_identity_sha256="29b1858b00175a102e425592f2d9701eb0d07df75eb34026ccaa4ef4191ff935",
        selected_document_ids=DOCUMENT_IDS,
        source_references=references,
        package_ids=package_ids,
        package_manifest_sha256s=(sha256_bytes(canonical_json_bytes(package)),),
        authorized_station_ids=("synthetic_prepare",),
        required_source_hashes=tuple(sorted(row.source_sha256 for row in references)),
        stage_barriers=("synthetic_prepare",),
        storage_preflight_identity="synthetic-storage-ready-007",
        manifest_status_summary=CampaignStatusSummaryV2(
            selected=3, packaged=3, held=0,
        ),
        campaign_identity_sha256=identity,
    )
    validate_campaign_packages(campaign, (package,))
    return campaign, (package,)


def publish_campaign_release(
    to_studio: Path,
    *,
    campaign: ResearchCampaignV2,
    packages: tuple[RecoveryUnitManifestV1, ...], include_start: bool = True,
) -> dict[str, Any]:
    to_studio = Path(to_studio)
    for package in packages:
        publish_exchange_json(
            to_studio,
            f"campaigns/{campaign.run_id}/packages/{package.package_id}.json",
            package,
        )
    campaign_result = publish_exchange_json(
        to_studio, f"campaigns/{campaign.run_id}/campaign.json", campaign,
    )
    if not include_start:
        return {
            "campaign_sha256": campaign_result["sha256"],
            "campaign_reused": campaign_result["reused"],
            "command_reused": False,
        }
    command = FactoryCommandV1(
        run_id=campaign.run_id,
        command_id="command-000001-start",
        sequence=1,
        action="start_approved",
        issued_at=FIXED_TIME,
        expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
        campaign_sha256=campaign_result["sha256"],
    )
    command_result = publish_exchange_json(
        to_studio,
        f"commands/{campaign.run_id}/000001-{command.command_id}.json",
        command,
    )
    return {
        "campaign_sha256": campaign_result["sha256"],
        "campaign_reused": campaign_result["reused"],
        "command_reused": command_result["reused"],
    }


def publish_campaign_command(
    to_studio: Path, *, run_id: str, campaign_sha256: str,
    sequence: int, action: str, issued_at: datetime | None = None,
) -> dict[str, Any]:
    issued = issued_at or datetime.now(timezone.utc)
    command_id = f"command-{sequence:06d}-{action.replace('_', '-')}"
    command = FactoryCommandV1(
        run_id=run_id, command_id=command_id, sequence=sequence, action=action,
        issued_at=issued, expires_at=issued + timedelta(days=365),
        campaign_sha256=campaign_sha256,
    )
    result = publish_exchange_json(
        to_studio, f"commands/{run_id}/{sequence:06d}-{command_id}.json", command,
    )
    return {**result, "command": command}


def publish_synthetic_campaign(
    *, to_studio: Path, fixture_root: Path, run_id: str,
    start_approved: bool = True,
) -> dict[str, Any]:
    """MacBook-side publication only; this never creates or runs a worker."""
    fixtures = Path(fixture_root)
    to_studio = Path(to_studio)
    _ensure_fixtures(fixtures)
    publications = tuple(
        publish_source_object(
            fixtures / f"{doc_id}.txt", to_studio, doc_id=doc_id,
            safe_extension="txt", media_type="text/plain",
        )
        for doc_id in DOCUMENT_IDS
    )
    campaign, packages = build_campaign_and_packages(
        run_id=run_id, publications=publications,
    )
    release = publish_campaign_release(
        to_studio, campaign=campaign, packages=packages,
        include_start=start_approved,
    )
    return {
        "run_id": run_id, "campaign": campaign, "packages": packages,
        "to_studio": to_studio,
        "source_published_bytes": sum(row.published_bytes for row in publications),
        "source_reused_bytes": sum(row.reused_bytes for row in publications),
        **release,
    }


def create_synthetic_campaign(workspace: Path, *, run_id: str) -> dict[str, Any]:
    workspace = Path(workspace)
    return publish_synthetic_campaign(
        to_studio=workspace / "exchange" / "to-mac-studio",
        fixture_root=workspace / "fixtures", run_id=run_id,
    )


def _ensure_fixtures(fixtures: Path) -> None:
    fixtures.mkdir(parents=True, exist_ok=True)
    for doc_id, data in FIXTURE_BYTES.items():
        path = fixtures / f"{doc_id}.txt"
        if path.exists() and path.read_bytes() != data:
            raise ValueError("synthetic fixture path is occupied by contradictory bytes")
        if not path.exists():
            atomic_write_bytes(path, data)


def _report_jobs(worker: ReprocessingWorker) -> dict[str, dict[str, Any]]:
    return {
        row["document_id"]: {
            "state": row["state"],
            "attempt": row["attempt"],
            "terminal_reason": row["terminal_reason"],
        }
        for row in worker.store.jobs()
    }


def simulate_three_documents(workspace: Path, *, run_id: str) -> dict[str, Any]:
    workspace = Path(workspace)
    fixtures = workspace / "fixtures"
    to_studio = workspace / "exchange" / "to-mac-studio"
    from_studio = workspace / "exchange" / "from-mac-studio"
    state_root = workspace / "studio-local"
    state_dir = state_root / run_id
    report_path = workspace / "simulation_report.json"
    first_execution = not (state_dir / "worker.db").exists()
    _ensure_fixtures(fixtures)

    created = create_synthetic_campaign(workspace, run_id=run_id)
    campaign, packages = created["campaign"], created["packages"]
    release = created

    executor = SyntheticNoModelExecutor(
        poison_document_ids=frozenset({"fixture-poison"}),
    )
    worker = ReprocessingWorker(
        to_studio=to_studio,
        from_studio=from_studio,
        state_dir=state_dir,
        executor=executor,
        run_id=run_id,
    )
    crash_restart_exercised = worker.store.get_meta("crash_restart_exercised", "0") == "1"
    lease_fencing_rejected = worker.store.get_meta("lease_fencing_rejected", "0") == "1"
    if first_execution:
        worker.ingest()
        lease_fencing_rejected = worker.store.verify_expired_lease_fence(FIXED_TIME)
        worker.store.set_meta("lease_fencing_rejected", "1" if lease_fencing_rejected else "0")
        worker.run_once()  # campaign/station running transitions
        try:
            worker.run_once(crash_after_output_document="fixture-good-a")
        except SyntheticCrash:
            crash_restart_exercised = True
            worker.store.set_meta("crash_restart_exercised", "1")
        finally:
            worker.close()
        worker = ReprocessingWorker(
            to_studio=to_studio,
            from_studio=from_studio,
            state_dir=state_dir,
            executor=executor,
            run_id=run_id,
        )
    worker.run_until_idle()
    studio_projection = worker.projection()
    observer_projection = observe_receipts(from_studio, run_id=run_id)
    jobs = _report_jobs(worker)
    receipt_count = len(load_factory_receipts(from_studio, run_id=run_id))
    inventory = worker.publish_inventory()
    worker.close()

    assert jobs["fixture-good-a"]["state"] == "succeeded"
    assert jobs["fixture-good-b"]["state"] == "succeeded"
    assert jobs["fixture-poison"]["state"] == "held"
    assert jobs["fixture-good-a"]["attempt"] == 1
    assert jobs["fixture-good-b"]["attempt"] == 1
    assert jobs["fixture-poison"]["attempt"] == 2
    assert studio_projection.projection_sha256 == observer_projection.projection_sha256
    assert lease_fencing_rejected
    assert_clean_transfer_tree(to_studio)
    assert_clean_transfer_tree(from_studio)

    report = {
        "schema_version": "factory-three-document-simulation-v1.0",
        "run_id": run_id,
        "execution_number": 1 if first_execution else 2,
        "source_published_bytes": created["source_published_bytes"],
        "source_reused_bytes": created["source_reused_bytes"],
        "jobs": jobs,
        "executor_invocations": dict(sorted(executor.invocations.items())),
        "receipt_count": receipt_count,
        "projection_sha256": observer_projection.projection_sha256,
        "studio_projection_sha256": studio_projection.projection_sha256,
        "projection_parity": True,
        "last_sequence": observer_projection.last_sequence,
        "barrier_eligible": inventory["barrier_eligible"],
        "crash_restart_exercised": crash_restart_exercised,
        "lease_fencing_rejected": lease_fencing_rejected,
        "worker_database": f"studio-local/{run_id}/worker.db",
        "shared_tree_database_files": [],
        "campaign_reused": release["campaign_reused"],
        "command_reused": release["command_reused"],
        "content_free": True,
    }
    atomic_write_bytes(
        report_path,
        (json.dumps(report, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8"),
    )
    return report


def _wait_for_supervised_worker(job_root: Path, run_id: str, timeout: float = 15.0) -> dict:
    from .factory_supervisor import worker_status
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        status = worker_status(job_root, run_id)
        if status["status"] in {"completed", "failed", "stale"}:
            return status
        time.sleep(0.05)
    raise TimeoutError("synthetic worker did not reach a durable terminal record")


def demo_console(workspace: Path, *, run_id: str) -> dict[str, Any]:
    """One-machine run-scoped demo using the same controller/supervisor/observer."""
    from .factory_supervisor import launch_worker
    workspace = Path(workspace)
    to_studio = workspace / "exchange" / "to-mac-studio"
    from_studio = workspace / "exchange" / "from-mac-studio"
    state_root = workspace / "studio-local"
    job_root = workspace / "factory-jobs"
    first = create_synthetic_campaign(workspace, run_id=run_id)
    first_source = (
        first["source_published_bytes"], first["source_reused_bytes"],
    )
    first_job = launch_worker(
        to_studio=to_studio, from_studio=from_studio, state_root=state_root,
        job_root=job_root, run_id=run_id,
    )
    del first
    first_status = _wait_for_supervised_worker(job_root, run_id)
    if first_status["status"] != "completed":
        raise RuntimeError("first supervised worker failed")
    first_projection = observe_receipts(from_studio, run_id=run_id)
    first_receipts = len(load_factory_receipts(from_studio, run_id=run_id))
    first_result = from_studio / "campaigns" / run_id / "results" / "fixture-good-a" / "result.json"
    first_result_hash = sha256_bytes(first_result.read_bytes())

    second = create_synthetic_campaign(workspace, run_id=run_id)
    second_source = (
        second["source_published_bytes"], second["source_reused_bytes"],
    )
    second_job = launch_worker(
        to_studio=to_studio, from_studio=from_studio, state_root=state_root,
        job_root=job_root, run_id=run_id,
    )
    del second
    second_status = _wait_for_supervised_worker(job_root, run_id)
    if second_status["status"] != "completed":
        raise RuntimeError("second supervised worker failed")
    second_projection = observe_receipts(from_studio, run_id=run_id)
    second_receipts = len(load_factory_receipts(from_studio, run_id=run_id))
    if second_projection.projection_sha256 != first_projection.projection_sha256:
        raise AssertionError("terminal receipt projection changed on idempotent rerun")
    if second_receipts != first_receipts or sha256_bytes(first_result.read_bytes()) != first_result_hash:
        raise AssertionError("successful work or receipts were duplicated")
    report = {
        "schema_version": "factory-console-demo-v1.0", "run_id": run_id,
        "first_source_published_bytes": first_source[0],
        "first_source_reused_bytes": first_source[1],
        "second_source_published_bytes": second_source[0],
        "second_source_reused_bytes": second_source[1],
        "first_receipt_count": first_receipts, "second_receipt_count": second_receipts,
        "projection_sha256": first_projection.projection_sha256,
        "projection_parity": True, "successful_reexecution": False,
        "first_worker_pid": first_job["pid"], "second_worker_pid": second_job["pid"],
        "second_worker_reused": bool(second_job.get("reused")),
        "first_worker_status": first_status["status"],
        "second_worker_status": second_status["status"],
        "worker_database": f"studio-local/{run_id}/worker.db",
        "shared_tree_database_files": [], "content_free": True,
    }
    atomic_write_bytes(
        workspace / "console_demo_report.json",
        (json.dumps(report, sort_keys=True, separators=(",", ":")) + "\n").encode(),
    )
    return report


def demo_production_canary(workspace: Path, *, run_id: str) -> dict[str, Any]:
    """Production-shaped synthetic proof for the three authenticated stations."""
    def run_service_cli_once(validation_now: datetime) -> dict[str, Any]:
        completed = subprocess.run([
            sys.executable, "-m", "runner.pipeline.factory_service", "run",
            "--to-studio", str(to_studio),
            "--from-studio", str(from_studio),
            "--state-root", str(state_root),
            "--log-root", str(log_root),
            "--run-id", run_id,
            "--command-public-key", str(macbook_public),
            "--receipt-private-key", str(studio_private),
            "--host-role", "synthetic",
            "--once",
            "--validation-now", validation_now.isoformat(),
        ], cwd=Path(__file__).resolve().parents[2], capture_output=True, text=True)
        if completed.returncode != 0:
            raise RuntimeError("production canary service --once failed")
        lines = [line for line in completed.stdout.splitlines() if line.strip()]
        return json.loads(lines[-1])

    workspace = Path(workspace)
    to_studio = workspace / "exchange" / "to-mac-studio"
    from_studio = workspace / "exchange" / "from-mac-studio"
    state_root = workspace / "studio-local"
    log_root = workspace / "service-logs"
    key_root = workspace / "host-local-keys"
    key_root.mkdir(parents=True, exist_ok=True)
    macbook_private = key_root / "macbook-command.private.pem"
    macbook_public = key_root / "macbook-command.public.pem"
    studio_private = key_root / "studio-receipt.private.pem"
    studio_public = key_root / "studio-receipt.public.pem"
    if not macbook_private.exists() and not macbook_public.exists():
        generate_keypair(
            macbook_private, macbook_public,
            shared_roots=(to_studio, from_studio),
        )
    if not studio_private.exists() and not studio_public.exists():
        generate_keypair(
            studio_private, studio_public,
            shared_roots=(to_studio, from_studio),
        )
    fixture = workspace / "synthetic-copied-fixture.md"
    fixture_bytes = (
        "  Synthetic public canary — blåbær\r\n\r\n"
        + "Complete evidence sentence. " * 400
        + "\r\nTrailing whitespace stays.  "
    ).encode("utf-8")
    if fixture.exists() and fixture.read_bytes() != fixture_bytes:
        raise ValueError("production-shaped synthetic fixture path is occupied")
    if not fixture.exists():
        atomic_write_bytes(fixture, fixture_bytes)
    created_at = datetime(2026, 8, 12, 12, tzinfo=timezone.utc)
    approval = CopiedTextCanaryApprovalV1(
        approval_id=f"approval-{run_id}",
        run_id=run_id,
        document_id="synthetic-copied-text-009",
        source_sha256=sha256_bytes(fixture_bytes),
        source_bytes=len(fixture_bytes),
        safe_display_filename=fixture.name,
        media_type="text/markdown",
        public_provenance_label="synthetic production-shaped Run-009 fixture",
        approved_at=created_at - timedelta(seconds=1),
        expires_at=created_at + timedelta(days=3650),
        researcher_id="synthetic-researcher-009",
        source_is_public=True,
        source_is_non_sensitive=True,
        not_anonymous_platform_testimony=True,
        contains_no_private_or_restricted_material=True,
        copied_local_bytes_only=True,
        authorized_station_ids=PRODUCTION_CANARY_STATIONS,
    )
    first_release = publish_production_canary_release(
        to_studio=to_studio,
        source_path=fixture,
        approval=approval,
        command_signing_private_key=macbook_private,
        now=created_at,
    )
    first_service = run_service_cli_once(created_at + timedelta(seconds=2))
    receipt_keys = public_key_allowlist(
        (studio_public,), shared_roots=(to_studio, from_studio),
    )
    observation_time = created_at + timedelta(hours=1)
    first_projection = observe_authenticated_receipts(
        from_studio,
        run_id=run_id,
        allowed_public_keys=receipt_keys,
        now=observation_time,
    )
    manifests = tuple(
        verify_authenticated_result_bundle(
            from_studio,
            run_id=run_id,
            document_id=approval.document_id,
            station_id=station,
            allowed_public_keys=receipt_keys,
            now=observation_time,
        )
        for station in PRODUCTION_CANARY_STATIONS
    )
    canonical_path = (
        state_root / run_id / "results" / approval.document_id
        / "canonical_text_prepare" / "extracted.txt"
    )
    units_path = (
        state_root / run_id / "results" / approval.document_id
        / "complete_units_v2" / "citation_units_v2.json"
    )
    units = json.loads(units_path.read_text(encoding="utf-8"))
    reconstructed = "".join(row["text"] for row in units["spans"])
    canonical_text = fixture_bytes.decode("utf-8")

    second_release = publish_production_canary_release(
        to_studio=to_studio,
        source_path=fixture,
        approval=approval,
        command_signing_private_key=macbook_private,
        now=created_at,
    )
    second_service = run_service_cli_once(created_at + timedelta(seconds=3))
    second_projection = observe_authenticated_receipts(
        from_studio,
        run_id=run_id,
        allowed_public_keys=receipt_keys,
        now=observation_time,
    )

    command_relative = (
        f"commands/{run_id}/000001-production-command-000001-start.auth.json"
    )
    command_message = AuthenticatedFactoryMessageV1.model_validate_json(
        (to_studio / command_relative).read_bytes()
    )
    tampered = command_message.model_dump()
    tampered["payload"]["sequence"] = 2
    tampered_command_rejected = False
    try:
        AuthenticatedFactoryMessageV1.model_validate(tampered)
    except ValueError:
        tampered_command_rejected = True
    expired_command_rejected = False
    try:
        verify_factory_message(
            command_message,
            expected_purpose="command",
            expected_run_id=run_id,
            allowed_public_keys=public_key_allowlist((macbook_public,)),
            now=created_at + timedelta(hours=2),
        )
    except FactoryAuthenticationError:
        expired_command_rejected = True
    result_manifest_relative = (
        f"campaigns/{run_id}/results/{approval.document_id}/stations/"
        "complete_units_v2/artifact_manifest.auth.json"
    )
    result_message = AuthenticatedFactoryMessageV1.model_validate_json(
        (from_studio / result_manifest_relative).read_bytes()
    )
    tampered_result = result_message.model_dump()
    tampered_result["payload"]["artifacts"][0]["byte_count"] += 1
    tampered_result_rejected = False
    try:
        AuthenticatedFactoryMessageV1.model_validate(tampered_result)
    except ValueError:
        tampered_result_rejected = True

    assert_clean_transfer_tree(to_studio)
    assert_clean_transfer_tree(from_studio)
    report = {
        "schema_version": "factory-production-canary-demo-v1.0",
        "run_id": run_id,
        "source_bytes": len(fixture_bytes),
        "first_source_published_bytes": first_release["source_published_bytes"],
        "first_source_reused_bytes": first_release["source_reused_bytes"],
        "second_source_published_bytes": second_release["source_published_bytes"],
        "second_source_reused_bytes": second_release["source_reused_bytes"],
        "first_station_steps": first_service["steps"],
        "second_station_steps": second_service["steps"],
        "station_states": {
            row.entity_id: row.state for row in first_projection.stations
        },
        "projection_sha256": first_projection.projection_sha256,
        "second_projection_sha256": second_projection.projection_sha256,
        "projection_parity": (
            first_projection.projection_sha256 == second_projection.projection_sha256
            == first_service["projection_sha256"] == second_service["projection_sha256"]
        ),
        "canonical_round_trip": canonical_path.read_bytes() == fixture_bytes,
        "complete_unit_reconstruction": reconstructed == canonical_text,
        "result_manifest_count": len(manifests),
        "tampered_command_rejected": tampered_command_rejected,
        "tampered_result_rejected": tampered_result_rejected,
        "expired_command_rejected": expired_command_rejected,
        "service_restart_exercised": True,
        "worker_database": f"studio-local/{run_id}/worker.db",
        "shared_tree_forbidden_files": [],
        "content_free": True,
    }
    if not all((
        report["projection_parity"], report["canonical_round_trip"],
        report["complete_unit_reconstruction"], report["tampered_command_rejected"],
        report["tampered_result_rejected"], report["expired_command_rejected"],
        report["second_source_published_bytes"] == 0,
        report["second_station_steps"] == 0,
    )):
        raise AssertionError("production-shaped synthetic demonstration failed")
    atomic_write_bytes(
        workspace / "production_canary_demo_report.json",
        (json.dumps(report, sort_keys=True, separators=(",", ":")) + "\n").encode(),
    )
    return report


def _main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="factory_controller")
    sub = parser.add_subparsers(dest="command", required=True)
    simulate = sub.add_parser("simulate-three-docs")
    simulate.add_argument("--workspace", required=True, type=Path)
    simulate.add_argument("--run-id", required=True)
    demo = sub.add_parser("demo-console")
    demo.add_argument("--workspace", required=True, type=Path)
    demo.add_argument("--run-id", required=True)
    production_demo = sub.add_parser("demo-production-canary")
    production_demo.add_argument("--workspace", required=True, type=Path)
    production_demo.add_argument("--run-id", required=True)
    args = parser.parse_args(argv)
    if args.command == "simulate-three-docs":
        report = simulate_three_documents(args.workspace, run_id=args.run_id)
        print(json.dumps(report, sort_keys=True, separators=(",", ":")))
        return 0
    if args.command == "demo-console":
        print(json.dumps(demo_console(args.workspace, run_id=args.run_id), sort_keys=True, separators=(",", ":")))
        return 0
    if args.command == "demo-production-canary":
        print(json.dumps(
            demo_production_canary(args.workspace, run_id=args.run_id),
            sort_keys=True, separators=(",", ":"),
        ))
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(_main())
