from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from runner.models.reprocessing import (
    CANARY_CONFIRMATION_TEXT,
    PRODUCTION_CANARY_STATIONS,
    CopiedTextCanaryApprovalV1,
)
from runner.pipeline.factory_auth import (
    AuthenticatedFactoryMessageV1,
    FactoryAuthenticationError,
    generate_keypair,
    public_key_allowlist,
    sign_factory_message,
)
from runner.pipeline.factory_controller import (
    demo_production_canary, publish_production_canary_release,
)
from runner.pipeline.factory_messages import canonical_json_bytes, sha256_bytes
from runner.pipeline.factory_messages import publish_checksum_bound_json
from runner.pipeline.factory_service import (
    FactoryServiceLock, ProductionCanaryWorker, ProductionLeaseRejected,
    ProductionWorkerCrash, run_service_once,
)
from runner.pipeline.syncthing_exchange import (
    assert_clean_transfer_tree, observe_authenticated_receipts,
    publish_exchange_json, verify_authenticated_result_bundle,
)


NOW = datetime(2026, 8, 12, 12, tzinfo=timezone.utc)


def _setup(tmp_path: Path, run_id="production-service-009", approval_hours=1):
    keys = tmp_path / "keys"
    keys.mkdir()
    mb_private, mb_public = keys / "mb.private.pem", keys / "mb.public.pem"
    st_private, st_public = keys / "st.private.pem", keys / "st.public.pem"
    generate_keypair(mb_private, mb_public)
    generate_keypair(st_private, st_public)
    source = tmp_path / "fixture.md"
    data = ("  Blåbær\r\n\r\n" + "Sentence. " * 700 + "end  ").encode("utf-8")
    source.write_bytes(data)
    approval = CopiedTextCanaryApprovalV1(
        approval_id="approval-009", run_id=run_id, document_id="copied-doc-009",
        source_sha256=sha256_bytes(data), source_bytes=len(data),
        safe_display_filename="fixture.md", media_type="text/markdown",
        public_provenance_label="synthetic fixture", approved_at=NOW-timedelta(seconds=1),
        expires_at=NOW+timedelta(hours=approval_hours),
        researcher_id="researcher-synthetic",
        source_is_public=True, source_is_non_sensitive=True,
        not_anonymous_platform_testimony=True,
        contains_no_private_or_restricted_material=True,
        copied_local_bytes_only=True, authorized_station_ids=PRODUCTION_CANARY_STATIONS,
        researcher_confirmation_text=CANARY_CONFIRMATION_TEXT,
    )
    to_studio = tmp_path / "exchange" / "to"
    from_studio = tmp_path / "exchange" / "from"
    publish_production_canary_release(
        to_studio=to_studio, source_path=source, approval=approval,
        command_signing_private_key=mb_private, now=NOW,
    )
    return {
        "run_id": run_id, "data": data, "approval": approval,
        "to": to_studio, "from": from_studio, "state": tmp_path / "state",
        "logs": tmp_path / "logs", "mb_private": mb_private,
        "mb_public": mb_public, "st_private": st_private, "st_public": st_public,
    }


def _publish_command(
    context,
    *,
    sequence: int,
    command_id: str,
    issued_at: datetime,
    expires_at: datetime,
    action: str = "start_approved",
    private_key: Path | None = None,
    relative_path: str | None = None,
    campaign_sha256: str | None = None,
):
    campaign_message = AuthenticatedFactoryMessageV1.model_validate_json(
        (
            context["to"] / "campaigns" / context["run_id"]
            / "production" / "campaign.auth.json"
        ).read_bytes()
    )
    bound_campaign_sha256 = campaign_sha256 or sha256_bytes(
        canonical_json_bytes(campaign_message.payload)
    )
    command = {
        "schema_version": "factory-command-v1.0",
        "run_id": context["run_id"],
        "command_id": command_id,
        "sequence": sequence,
        "action": action,
        "issued_at": issued_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "campaign_sha256": bound_campaign_sha256,
    }
    message = sign_factory_message(
        command,
        purpose="command",
        run_id=context["run_id"],
        message_id=command_id,
        private_key_path=private_key or context["mb_private"],
        issued_at=issued_at,
        expires_at=expires_at,
    )
    relative = relative_path or (
        f"commands/{context['run_id']}/{sequence:06d}-{command_id}.auth.json"
    )
    publish_exchange_json(context["to"], relative, message)
    return message


def _worker(context):
    return ProductionCanaryWorker(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], run_id=context["run_id"],
        command_public_keys=public_key_allowlist((context["mb_public"],)),
        receipt_signing_private_key=context["st_private"],
        now=NOW + timedelta(seconds=2),
    )


def test_real_service_runs_three_ordered_stations_and_receipt_only_observer(tmp_path):
    context = _setup(tmp_path)
    result = run_service_once(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], log_root=context["logs"],
        run_id=context["run_id"], command_public_key_paths=(context["mb_public"],),
        receipt_signing_private_key=context["st_private"], host_role="synthetic",
        now=NOW + timedelta(seconds=2),
    )
    assert result["status"] == "succeeded"
    allowed = public_key_allowlist((context["st_public"],))
    projection = observe_authenticated_receipts(
        context["from"], run_id=context["run_id"], allowed_public_keys=allowed,
        now=NOW + timedelta(minutes=10),
    )
    assert {row.entity_id for row in projection.stations} == set(PRODUCTION_CANARY_STATIONS)
    assert all(row.state == "succeeded" for row in projection.stations)
    canonical = (
        context["state"] / context["run_id"] / "results" / "copied-doc-009"
        / "canonical_text_prepare" / "extracted.txt"
    )
    assert canonical.read_bytes() == context["data"]
    for station in PRODUCTION_CANARY_STATIONS:
        verify_authenticated_result_bundle(
            context["from"], run_id=context["run_id"], document_id="copied-doc-009",
            station_id=station, allowed_public_keys=allowed,
            now=NOW + timedelta(minutes=10),
        )
    assert_clean_transfer_tree(context["to"])
    assert_clean_transfer_tree(context["from"])
    assert not list((tmp_path / "exchange").rglob("*.db"))
    assert not list((tmp_path / "exchange").rglob("*.pem"))


@pytest.mark.parametrize("station", ["source_verify", "canonical_text_prepare"])
def test_crash_restart_reconciles_immutable_result_without_reexecution(tmp_path, station):
    context = _setup(tmp_path, run_id=f"crash-{station}")
    worker = _worker(context)
    worker.run_once()  # campaign running
    if station == "canonical_text_prepare":
        worker.run_once()  # source_verify
    with pytest.raises(ProductionWorkerCrash):
        worker.run_once(crash_point=f"after_result_write:{station}")
    worker.close()
    restarted = _worker(context)
    restarted.run_until_idle()
    assert all(row["state"] == "succeeded" for row in restarted.store.jobs())
    assert all(row["attempt"] == 1 for row in restarted.store.jobs())
    restarted.close()


def test_crash_after_database_commit_reconstructs_receipt(tmp_path):
    context = _setup(tmp_path, run_id="crash-after-db")
    worker = _worker(context)
    worker.run_once()
    with pytest.raises(ProductionWorkerCrash):
        worker.run_once(crash_point="after_database_commit:source_verify")
    worker.close()
    restarted = _worker(context)
    restarted.run_until_idle()
    assert restarted.store.has_transition(
        entity_kind="document", entity_id="copied-doc-009",
        station_id="source_verify", to_state="succeeded",
    )
    restarted.close()


def test_expired_lease_late_commit_and_changed_predecessor_are_rejected(tmp_path):
    context = _setup(tmp_path, run_id="lease-run")
    worker = _worker(context)
    worker.ingest()
    row = worker.store.claim(NOW + timedelta(seconds=2))
    assert row is not None
    with worker.store.connection:
        worker.store.connection.execute(
            "UPDATE production_jobs SET lease_expiry=? WHERE station_id=?",
            ((NOW - timedelta(seconds=1)).isoformat(), row["station_id"]),
        )
    with pytest.raises(ProductionLeaseRejected, match="expired"):
        worker.store.succeed(
            row, row["lease_token"], NOW + timedelta(seconds=2), "f" * 64,
        )
    worker.close()


def test_service_single_instance_lock_and_host_role_gate(tmp_path):
    context = _setup(tmp_path, run_id="lock-run")
    with FactoryServiceLock(context["state"]):
        with pytest.raises(RuntimeError, match="already running"):
            with FactoryServiceLock(context["state"]):
                pass
    with pytest.raises(PermissionError, match="Mac Studio"):
        run_service_once(
            to_studio=context["to"], from_studio=context["from"],
            state_root=context["state"], log_root=context["logs"],
            run_id=context["run_id"], command_public_key_paths=(context["mb_public"],),
            receipt_signing_private_key=context["st_private"], host_role="macbook",
            now=NOW + timedelta(seconds=2),
        )


def test_complete_production_shaped_demo_is_idempotent_and_tamper_resistant(tmp_path):
    report = demo_production_canary(tmp_path, run_id="demo-production-009")
    assert report["first_source_published_bytes"] == report["source_bytes"]
    assert report["second_source_published_bytes"] == 0
    assert report["second_source_reused_bytes"] == report["source_bytes"]
    assert report["second_station_steps"] == 0
    assert report["projection_parity"] is True
    assert report["canonical_round_trip"] is True
    assert report["complete_unit_reconstruction"] is True
    assert report["tampered_command_rejected"] is True
    assert report["tampered_result_rejected"] is True
    assert report["expired_command_rejected"] is True


def test_expired_sequence_one_is_inactive_and_valid_replacement_runs(tmp_path):
    context = _setup(tmp_path, run_id="expired-then-replacement", approval_hours=24)
    _publish_command(
        context,
        sequence=2,
        command_id="production-command-000002-start-replacement",
        issued_at=NOW + timedelta(minutes=30),
        expires_at=NOW + timedelta(hours=8),
    )
    worker = ProductionCanaryWorker(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], run_id=context["run_id"],
        command_public_keys=public_key_allowlist((context["mb_public"],)),
        receipt_signing_private_key=context["st_private"],
        now=NOW + timedelta(hours=2),
    )
    assert worker.run_until_idle() > 0
    assert all(row["state"] == "succeeded" for row in worker.store.jobs())
    assert worker.store.get_meta("approved") == "1"
    assert worker.store.get_meta("last_command_sequence") == "2"
    applied = worker.store.connection.execute(
        "SELECT sequence FROM production_messages WHERE purpose='command'"
    ).fetchall()
    assert [row["sequence"] for row in applied] == [2]
    worker.ingest()
    applied_again = worker.store.connection.execute(
        "SELECT sequence FROM production_messages WHERE purpose='command'"
    ).fetchall()
    assert [row["sequence"] for row in applied_again] == [2]
    worker.close()


def test_expired_only_command_is_authenticated_but_never_applied(tmp_path):
    context = _setup(tmp_path, run_id="expired-only", approval_hours=24)
    worker = ProductionCanaryWorker(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], run_id=context["run_id"],
        command_public_keys=public_key_allowlist((context["mb_public"],)),
        receipt_signing_private_key=context["st_private"],
        now=NOW + timedelta(hours=2),
    )
    worker.ingest()
    assert worker.store.get_meta("approved", "0") == "0"
    assert worker.store.get_meta("last_command_sequence", "0") == "0"
    assert worker.store.connection.execute(
        "SELECT COUNT(*) FROM production_messages WHERE purpose='command'"
    ).fetchone()[0] == 0
    worker.close()


def test_tampered_expired_command_still_fails_closed(tmp_path):
    context = _setup(tmp_path, run_id="tampered-expired", approval_hours=24)
    message = _publish_command(
        context,
        sequence=2,
        command_id="production-command-000002-expired",
        issued_at=NOW + timedelta(minutes=10),
        expires_at=NOW + timedelta(minutes=20),
    )
    tampered = message.model_dump()
    tampered["envelope"]["signature_b64"] = "A" * 86 + "=="
    forged = AuthenticatedFactoryMessageV1.model_validate(tampered)
    relative = (
        f"commands/{context['run_id']}/000003-"
        "production-command-000003-tampered.auth.json"
    )
    # Keep the payload untouched here: publication under a conflicting path is
    # independently rejected after signature verification.  The zeroed
    # signature itself must be the first fail-closed boundary.
    publish_exchange_json(context["to"], relative, forged)
    worker = ProductionCanaryWorker(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], run_id=context["run_id"],
        command_public_keys=public_key_allowlist((context["mb_public"],)),
        receipt_signing_private_key=context["st_private"],
        now=NOW + timedelta(hours=2),
    )
    with pytest.raises(FactoryAuthenticationError, match="signature is invalid"):
        worker.ingest()
    worker.close()


def test_untrusted_expired_command_still_fails_closed(tmp_path):
    context = _setup(tmp_path, run_id="untrusted-expired", approval_hours=24)
    other_private = tmp_path / "other.private.pem"
    other_public = tmp_path / "other.public.pem"
    generate_keypair(other_private, other_public)
    _publish_command(
        context,
        sequence=2,
        command_id="production-command-000002-untrusted",
        issued_at=NOW + timedelta(minutes=10),
        expires_at=NOW + timedelta(minutes=20),
        private_key=other_private,
    )
    worker = ProductionCanaryWorker(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], run_id=context["run_id"],
        command_public_keys=public_key_allowlist((context["mb_public"],)),
        receipt_signing_private_key=context["st_private"],
        now=NOW + timedelta(hours=2),
    )
    with pytest.raises(FactoryAuthenticationError, match="key is not trusted"):
        worker.ingest()
    worker.close()


@pytest.mark.parametrize("defect", ["purpose", "run", "campaign", "filename"])
def test_expired_command_identity_and_campaign_defects_fail_closed(tmp_path, defect):
    context = _setup(tmp_path, run_id=f"expired-{defect}", approval_hours=24)
    sequence = 2
    command_id = f"production-command-000002-{defect}"
    issued_at = NOW + timedelta(minutes=10)
    expires_at = NOW + timedelta(minutes=20)
    if defect == "campaign":
        _publish_command(
            context, sequence=sequence, command_id=command_id,
            issued_at=issued_at, expires_at=expires_at,
            campaign_sha256="f" * 64,
        )
    elif defect == "filename":
        _publish_command(
            context, sequence=sequence, command_id=command_id,
            issued_at=issued_at, expires_at=expires_at,
            relative_path=(
                f"commands/{context['run_id']}/000003-{command_id}.auth.json"
            ),
        )
    else:
        campaign_message = AuthenticatedFactoryMessageV1.model_validate_json(
            (
                context["to"] / "campaigns" / context["run_id"]
                / "production" / "campaign.auth.json"
            ).read_bytes()
        )
        command = {
            "schema_version": "factory-command-v1.0",
            "run_id": context["run_id"],
            "command_id": command_id,
            "sequence": sequence,
            "action": "start_approved",
            "issued_at": issued_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "campaign_sha256": sha256_bytes(
                canonical_json_bytes(campaign_message.payload)
            ),
        }
        message = sign_factory_message(
            command,
            purpose=("receipt" if defect == "purpose" else "command"),
            run_id=("another-run" if defect == "run" else context["run_id"]),
            message_id=command_id,
            private_key_path=context["mb_private"],
            issued_at=issued_at,
            expires_at=expires_at,
        )
        publish_exchange_json(
            context["to"],
            f"commands/{context['run_id']}/{sequence:06d}-{command_id}.auth.json",
            message,
        )
    worker = ProductionCanaryWorker(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], run_id=context["run_id"],
        command_public_keys=public_key_allowlist((context["mb_public"],)),
        receipt_signing_private_key=context["st_private"],
        now=NOW + timedelta(hours=2),
    )
    with pytest.raises((FactoryAuthenticationError, ValueError), match="mismatch"):
        worker.ingest()
    worker.close()


@pytest.mark.parametrize("defect", ["message_id", "time"])
def test_expired_command_envelope_binding_defects_fail_closed(tmp_path, defect):
    context = _setup(tmp_path, run_id=f"expired-binding-{defect}", approval_hours=24)
    sequence = 2
    command_id = f"production-command-000002-{defect}"
    issued_at = NOW + timedelta(minutes=10)
    expires_at = NOW + timedelta(minutes=20)
    campaign_message = AuthenticatedFactoryMessageV1.model_validate_json(
        (
            context["to"] / "campaigns" / context["run_id"]
            / "production" / "campaign.auth.json"
        ).read_bytes()
    )
    command = {
        "schema_version": "factory-command-v1.0",
        "run_id": context["run_id"],
        "command_id": command_id,
        "sequence": sequence,
        "action": "start_approved",
        "issued_at": issued_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "campaign_sha256": sha256_bytes(
            canonical_json_bytes(campaign_message.payload)
        ),
    }
    message = sign_factory_message(
        command,
        purpose="command",
        run_id=context["run_id"],
        message_id=("different-message-id" if defect == "message_id" else command_id),
        private_key_path=context["mb_private"],
        issued_at=(issued_at + timedelta(minutes=1) if defect == "time" else issued_at),
        expires_at=expires_at,
    )
    publish_exchange_json(
        context["to"],
        f"commands/{context['run_id']}/{sequence:06d}-{command_id}.auth.json",
        message,
    )
    worker = ProductionCanaryWorker(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], run_id=context["run_id"],
        command_public_keys=public_key_allowlist((context["mb_public"],)),
        receipt_signing_private_key=context["st_private"],
        now=NOW + timedelta(hours=2),
    )
    with pytest.raises(FactoryAuthenticationError, match="mismatch"):
        worker.ingest()
    worker.close()


def test_unsigned_production_command_and_replayed_sequence_fail_closed(tmp_path):
    context = _setup(tmp_path, run_id="auth-command-run")
    unsigned = {
        "schema_version": "factory-command-v1.0",
        "run_id": context["run_id"], "command_id": "unsigned-command",
        "sequence": 2, "action": "resume", "issued_at": NOW.isoformat(),
        "expires_at": (NOW + timedelta(hours=1)).isoformat(),
        "campaign_sha256": "0" * 64,
    }
    relative = f"commands/{context['run_id']}/000002-unsigned-command.json"
    publish_checksum_bound_json(
        unsigned, context["to"] / relative, relative_path=relative,
    )
    worker = _worker(context)
    with pytest.raises(ValueError, match="unsigned production"):
        worker.ingest()
    worker.close()


def test_extra_or_missing_returned_artifact_is_rejected(tmp_path):
    context = _setup(tmp_path, run_id="result-tamper-run")
    run_service_once(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], log_root=context["logs"],
        run_id=context["run_id"], command_public_key_paths=(context["mb_public"],),
        receipt_signing_private_key=context["st_private"], host_role="synthetic",
        now=NOW + timedelta(seconds=2),
    )
    allowed = public_key_allowlist((context["st_public"],))
    root = (
        context["from"] / "campaigns" / context["run_id"] / "results"
        / "copied-doc-009" / "stations" / "source_verify"
    )
    (root / "unmanifested.json").write_text("{}", encoding="utf-8")
    with pytest.raises(ValueError, match="unmanifested"):
        verify_authenticated_result_bundle(
            context["from"], run_id=context["run_id"], document_id="copied-doc-009",
            station_id="source_verify", allowed_public_keys=allowed,
            now=NOW + timedelta(minutes=10),
        )
    (root / "unmanifested.json").unlink()
    (root / "source_verification.json").unlink()
    with pytest.raises(ValueError, match="missing"):
        verify_authenticated_result_bundle(
            context["from"], run_id=context["run_id"], document_id="copied-doc-009",
            station_id="source_verify", allowed_public_keys=allowed,
            now=NOW + timedelta(minutes=10),
        )
