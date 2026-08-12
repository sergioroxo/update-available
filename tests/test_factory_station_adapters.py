from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from pydantic import ValidationError

from runner.models.reprocessing import (
    CANARY_CONFIRMATION_TEXT,
    PRODUCTION_CANARY_STATIONS,
    CopiedTextCanaryApprovalV1,
    ImmutableArtifactManifestV1,
    ProductionCanaryJobV1,
)
from runner.pipeline.factory_controller import publish_production_canary_release
from runner.pipeline.factory_messages import sha256_bytes
from runner.pipeline.factory_auth import generate_keypair


NOW = datetime(2026, 8, 12, 12, tzinfo=timezone.utc)


def approval_for(data: bytes, *, run_id="adapter-run", filename="fixture.md"):
    return CopiedTextCanaryApprovalV1(
        approval_id="approval-009", run_id=run_id, document_id="copied-doc-009",
        source_sha256=sha256_bytes(data), source_bytes=len(data),
        safe_display_filename=filename,
        media_type="text/markdown" if filename.endswith(".md") else "text/plain",
        public_provenance_label="synthetic public fixture",
        approved_at=NOW - timedelta(seconds=1), expires_at=NOW + timedelta(hours=1),
        researcher_id="researcher-synthetic", source_is_public=True,
        source_is_non_sensitive=True, not_anonymous_platform_testimony=True,
        contains_no_private_or_restricted_material=True,
        copied_local_bytes_only=True, authorized_station_ids=PRODUCTION_CANARY_STATIONS,
        researcher_confirmation_text=CANARY_CONFIRMATION_TEXT,
    )


def test_copied_canary_contract_is_strict_expiring_and_one_text_only():
    data = b"valid"
    approval = approval_for(data)
    approval.assert_current(NOW)
    with pytest.raises(ValueError, match="currently valid"):
        approval.assert_current(NOW + timedelta(hours=2))
    with pytest.raises(ValidationError):
        CopiedTextCanaryApprovalV1.model_validate({
            **approval.model_dump(), "source_is_public": False,
        })
    with pytest.raises(ValidationError, match="only .txt or .md"):
        CopiedTextCanaryApprovalV1.model_validate({
            **approval.model_dump(), "safe_display_filename": "fixture.pdf",
        })
    with pytest.raises(ValidationError, match="exactly the three"):
        CopiedTextCanaryApprovalV1.model_validate({
            **approval.model_dump(), "authorized_station_ids": ("source_verify",),
        })


def test_real_adapters_preserve_exact_utf8_crlf_whitespace_and_multiple_units(tmp_path):
    data = (
        "  Unicode blåbær\r\n\r\n" + "Sentence. " * 1000 + "tail  "
    ).encode("utf-8")
    source = tmp_path / "fixture.md"
    source.write_bytes(data)
    private = tmp_path / "keys" / "private.pem"
    public = tmp_path / "keys" / "public.pem"
    generate_keypair(private, public)
    release = publish_production_canary_release(
        to_studio=tmp_path / "exchange" / "to",
        source_path=source,
        approval=approval_for(data),
        command_signing_private_key=private,
        now=NOW,
    )
    materials = release["predicted_materials"]
    assert tuple(job.station_id for job in release["package"].jobs) == PRODUCTION_CANARY_STATIONS
    canonical = materials[1]
    assert canonical.artifacts["extracted.txt"] == data
    units = materials[2]
    import json
    unit_payload = json.loads(units.artifacts["citation_units_v2.json"])
    assert len(unit_payload["spans"]) > 1
    assert "".join(row["text"] for row in unit_payload["spans"]) == data.decode("utf-8")
    assert max(row["char_count"] for row in unit_payload["spans"]) <= 1900


def test_invalid_utf8_symlink_changed_bytes_and_oversize_are_rejected(tmp_path):
    private = tmp_path / "private.pem"
    public = tmp_path / "public.pem"
    generate_keypair(private, public)
    invalid = tmp_path / "invalid.txt"
    invalid.write_bytes(b"\xff")
    with pytest.raises(ValueError, match="strict UTF-8"):
        publish_production_canary_release(
            to_studio=tmp_path / "to-invalid", source_path=invalid,
            approval=approval_for(b"\xff", filename="invalid.txt"),
            command_signing_private_key=private, now=NOW,
        )
    valid = tmp_path / "valid.txt"
    valid.write_bytes(b"valid")
    link = tmp_path / "link.txt"
    link.symlink_to(valid)
    with pytest.raises(ValueError, match="non-symlink"):
        publish_production_canary_release(
            to_studio=tmp_path / "to-link", source_path=link,
            approval=approval_for(b"valid", filename="link.txt"),
            command_signing_private_key=private, now=NOW,
        )
    with pytest.raises(ValueError, match="size limit"):
        publish_production_canary_release(
            to_studio=tmp_path / "to-size", source_path=valid,
            approval=approval_for(b"valid", filename="valid.txt"),
            command_signing_private_key=private, now=NOW, maximum_source_bytes=4,
        )
    valid.write_bytes(b"changed")
    with pytest.raises(ValueError, match="does not match"):
        publish_production_canary_release(
            to_studio=tmp_path / "to-change", source_path=valid,
            approval=approval_for(b"valid", filename="valid.txt"),
            command_signing_private_key=private, now=NOW,
        )


def test_artifact_manifest_rejects_unknown_fields_operational_paths_and_identity_changes(tmp_path):
    data = b"hello"
    source = tmp_path / "fixture.txt"
    source.write_bytes(data)
    private, public = tmp_path / "private.pem", tmp_path / "public.pem"
    generate_keypair(private, public)
    release = publish_production_canary_release(
        to_studio=tmp_path / "to", source_path=source,
        approval=approval_for(data, filename="fixture.txt"),
        command_signing_private_key=private, now=NOW,
    )
    manifest = release["predicted_materials"][1].manifest
    row = manifest.model_dump()
    row["unknown"] = True
    with pytest.raises(ValidationError):
        ImmutableArtifactManifestV1.model_validate(row)
    row = manifest.model_dump()
    row["artifacts"][0]["relative_path"] = "worker.db"
    row["artifacts"] = tuple(sorted(row["artifacts"], key=lambda item: item["relative_path"]))
    with pytest.raises(ValidationError, match="operational"):
        ImmutableArtifactManifestV1.model_validate(row)
    row = manifest.model_dump()
    row["artifacts"][0]["document_id"] = "other-doc"
    with pytest.raises(ValidationError, match="contradicts"):
        ImmutableArtifactManifestV1.model_validate(row)
