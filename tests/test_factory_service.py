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
from runner.pipeline.factory_auth import generate_keypair, public_key_allowlist
from runner.pipeline.factory_controller import (
    demo_production_canary, publish_production_canary_release,
)
from runner.pipeline.factory_messages import sha256_bytes
from runner.pipeline.factory_messages import publish_checksum_bound_json
from runner.pipeline.factory_service import (
    FactoryServiceLock, ProductionCanaryWorker, ProductionLeaseRejected,
    ProductionWorkerCrash, run_service_once,
)
from runner.pipeline.syncthing_exchange import (
    assert_clean_transfer_tree, observe_authenticated_receipts,
    verify_authenticated_result_bundle,
)


NOW = datetime(2026, 8, 12, 12, tzinfo=timezone.utc)


def _setup(tmp_path: Path, run_id="production-service-009"):
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
        expires_at=NOW+timedelta(hours=1), researcher_id="researcher-synthetic",
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
