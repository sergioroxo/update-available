from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from runner.models.reprocessing import (
    PILOT_CONFIRMATION_TEXT,
    PRODUCTION_CANARY_STATIONS,
    CopiedTextPilotApprovalV1,
    CopiedTextPilotArtifactV1,
)
from runner.pipeline.factory_auth import generate_keypair
from runner.pipeline.factory_controller import publish_production_pilot_release
from runner.pipeline.factory_messages import sha256_bytes
from runner.pipeline.factory_service import (
    ProductionCanaryWorker,
    discover_production_runs,
    run_service_scan_once,
)
from runner.pipeline.factory_station_adapters import DeterministicStationHold


NOW = datetime(2026, 8, 13, 12, tzinfo=timezone.utc)


def _pilot(tmp_path: Path, run_id: str = "synthetic-pilot-011") -> dict:
    key_root = tmp_path / "keys"
    key_root.mkdir(exist_ok=True)
    mb_private, mb_public = key_root / "mb.private.pem", key_root / "mb.public.pem"
    st_private, st_public = key_root / "st.private.pem", key_root / "st.public.pem"
    if not mb_private.exists():
        generate_keypair(mb_private, mb_public)
        generate_keypair(st_private, st_public)
    source_root = tmp_path / f"sources-{run_id}"
    source_root.mkdir()
    artifacts = []
    source_paths = {}
    source_bytes = {}
    for index in range(6):
        document_id = f"pilot-doc-{index + 1:02d}"
        filename = f"public-{index + 1:02d}.txt"
        data = f"Public synthetic document {index + 1}.\nBlåbær {index}.\n".encode()
        path = source_root / filename
        path.write_bytes(data)
        source_paths[document_id] = path
        source_bytes[document_id] = data
        artifacts.append(CopiedTextPilotArtifactV1(
            document_id=document_id, source_sha256=sha256_bytes(data),
            source_bytes=len(data), source_characters=len(data.decode()),
            safe_display_filename=filename, media_type="text/plain",
            public_title=f"Synthetic public fixture {index + 1}",
            public_provenance_label="Run-011 temporary synthetic fixture",
            source_is_public=True, source_is_non_sensitive=True,
            not_anonymous_platform_testimony=True,
            contains_no_private_or_restricted_material=True,
            copied_local_bytes_only=True,
        ))
    approval = CopiedTextPilotApprovalV1(
        approval_id=f"approval-{run_id}", run_id=run_id,
        approved_at=NOW, expires_at=NOW + timedelta(hours=24),
        researcher_id="researcher-synthetic", artifacts=tuple(artifacts),
        authorized_station_ids=PRODUCTION_CANARY_STATIONS,
        macbook_code_identity_sha256="a" * 64,
        macbook_worktree_identity_sha256="b" * 64,
        storage_preflight_identity_sha256="c" * 64,
        researcher_confirmation_text=PILOT_CONFIRMATION_TEXT,
    )
    to_studio = tmp_path / "exchange" / "to"
    from_studio = tmp_path / "exchange" / "from"
    release = publish_production_pilot_release(
        to_studio=to_studio, source_paths=source_paths, approval=approval,
        command_signing_private_key=mb_private, now=NOW,
    )
    return {
        "run_id": run_id, "approval": approval, "release": release,
        "source_bytes": source_bytes, "to": to_studio, "from": from_studio,
        "state": tmp_path / "state", "logs": tmp_path / "logs",
        "mb_public": mb_public, "st_private": st_private, "st_public": st_public,
    }


def _scan(context, when=NOW + timedelta(seconds=2)):
    return run_service_scan_once(
        to_studio=context["to"], from_studio=context["from"],
        state_root=context["state"], log_root=context["logs"],
        command_public_key_paths=(context["mb_public"],),
        receipt_signing_private_key=context["st_private"],
        host_role="synthetic", now=when,
    )


def test_strict_pilot_contract_requires_6_to_12_sorted_unique_artifacts(tmp_path):
    context = _pilot(tmp_path)
    payload = context["approval"].model_dump(mode="python")
    payload["artifacts"] = tuple(payload["artifacts"][:5])
    with pytest.raises(ValidationError, match="6–12"):
        CopiedTextPilotApprovalV1.model_validate(payload)
    payload = context["approval"].model_dump(mode="python")
    payload["artifacts"] = tuple(payload["artifacts"] + (payload["artifacts"][0],) * 7)
    with pytest.raises(ValidationError):
        CopiedTextPilotApprovalV1.model_validate(payload)


def test_six_document_pilot_runs_in_deterministic_order_and_is_idempotent(tmp_path):
    context = _pilot(tmp_path)
    result = _scan(context)
    assert result["status"] == "ready"
    assert result["run_count"] == 1
    assert result["runs"][0]["status"] == "succeeded"
    assert len(list((context["state"] / context["run_id"] / "results").glob("*"))) == 6
    for document_id, expected in context["source_bytes"].items():
        canonical = (
            context["state"] / context["run_id"] / "results" / document_id
            / "canonical_text_prepare" / "extracted.txt"
        )
        assert canonical.read_bytes() == expected
    database = context["state"] / context["run_id"] / "worker.db"
    assert database.is_file()
    assert not list((tmp_path / "exchange").rglob("*.db"))
    repeated = _scan(context, NOW + timedelta(seconds=3))
    assert repeated["runs"][0]["steps"] == 0
    assert repeated["health_published"] is False
    assert repeated["runs"][0]["projection_sha256"] == result["runs"][0]["projection_sha256"]


def test_one_held_document_does_not_prevent_sibling_success(tmp_path, monkeypatch):
    context = _pilot(tmp_path, "synthetic-mixed-011")
    original = ProductionCanaryWorker._build_material

    def hold_one(self, row):
        if row["document_id"] == "pilot-doc-03" and row["station_id"] == "source_verify":
            raise DeterministicStationHold("synthetic_document_hold")
        return original(self, row)

    monkeypatch.setattr(ProductionCanaryWorker, "_build_material", hold_one)
    result = _scan(context)
    assert result["runs"][0]["status"] == "held"
    held_root = context["state"] / context["run_id"] / "results" / "pilot-doc-03"
    assert not held_root.exists()
    for document_id in ("pilot-doc-01", "pilot-doc-02", "pilot-doc-04", "pilot-doc-05", "pilot-doc-06"):
        assert (
            context["state"] / context["run_id"] / "results" / document_id
            / "complete_units_v2" / "artifact_manifest.json"
        ).is_file()


def test_incomplete_candidate_is_isolated_and_idle_health_is_bounded(tmp_path):
    context = _pilot(tmp_path)
    bad = context["to"] / "campaigns" / "incomplete-run" / "production"
    bad.mkdir(parents=True)
    (bad / "campaign.auth.json").write_text("{}", encoding="utf-8")
    accepted, rejected = discover_production_runs(context["to"])
    assert accepted == (context["run_id"],)
    assert rejected == ("incomplete-run",)
    result = _scan(context)
    assert result["rejected_count"] == 1
    assert result["runs"][0]["status"] == "succeeded"

    idle = tmp_path / "idle"
    idle_context = {
        **context, "to": idle / "to", "from": idle / "from",
        "state": idle / "state", "logs": idle / "logs",
    }
    first = _scan(idle_context)
    second = _scan(idle_context, NOW + timedelta(seconds=1))
    assert first["status"] == second["status"] == "idle"
    assert first["health_published"] is True
    assert second["health_published"] is False
    assert len(list((idle / "from" / "service" / "host").glob("*.auth.json"))) == 1


def test_two_valid_runs_are_discovered_in_deterministic_order_with_separate_databases(tmp_path):
    second = _pilot(tmp_path, "b-pilot-run")
    first = _pilot(tmp_path, "a-pilot-run")
    result = _scan(first)
    assert tuple(row["run_id"] for row in result["runs"]) == (
        "a-pilot-run", "b-pilot-run",
    )
    assert all(row["status"] == "succeeded" for row in result["runs"])
    assert (first["state"] / "a-pilot-run" / "worker.db").is_file()
    assert (first["state"] / "b-pilot-run" / "worker.db").is_file()
    assert not list((tmp_path / "exchange").rglob("*.db"))


def test_cross_run_signed_payload_injection_is_held(tmp_path):
    context = _pilot(tmp_path)
    campaign_path = (
        context["to"] / "campaigns" / context["run_id"]
        / "production" / "campaign.auth.json"
    )
    message = json.loads(campaign_path.read_text(encoding="utf-8"))
    message["envelope"]["run_id"] = "different-run"
    campaign_path.write_text(json.dumps(message, sort_keys=True, separators=(",", ":")), encoding="utf-8")
    checksum = campaign_path.with_name(campaign_path.name + ".sha256")
    checksum.write_text(
        f"{sha256_bytes(campaign_path.read_bytes())}  campaign.auth.json\n",
        encoding="ascii",
    )
    result = _scan(context)
    assert result["runs"][0]["status"] == "held"
    assert result["runs"][0]["reason"] == "FactoryAuthenticationError"
