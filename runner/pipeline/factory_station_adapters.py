"""Real deterministic non-model station adapters for the copied-text canary."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Mapping

from runner.models.reprocessing import (
    CopiedTextCanaryApprovalV1,
    ImmutableArtifactManifestV1,
    ProductionCanaryJobV1,
    ResultArtifactEntryV1,
)
from .atomic_io import atomic_write_bytes
from .citation_units_v2 import (
    CITATION_UNITS_V2_FILENAME,
    SECTIONS_V2_FILENAME,
    V2_READY_FILENAME,
    artifact_sha256,
    build_citation_units_v2,
    build_sections_v2,
    canonical_artifact_bytes,
)
from .extraction_quality import build_extraction_manifest, canonical_json_bytes, sha256_text
from .factory_messages import sha256_bytes, verify_checksum_pair
from .source_depot import SourceObjectMetadataV2


EXECUTOR_VERSIONS = {
    "source_verify": "source-verify-v1.0",
    "canonical_text_prepare": "canonical-text-prepare-v1.0",
    "complete_units_v2": "complete-units-v2-v1.0",
}
POLICY_VERSIONS = {
    "source_verify": "copied-source-verification-v1.0",
    "canonical_text_prepare": "strict-utf8-complete-text-v1.0",
    "complete_units_v2": "complete-v2-partition-v1.0",
}


class DeterministicStationHold(ValueError):
    """Non-retryable content-free station rejection."""

    def __init__(self, reason_code: str):
        self.reason_code = reason_code
        super().__init__(reason_code)


@dataclass(frozen=True)
class StationMaterial:
    artifacts: Mapping[str, bytes]
    manifest: ImmutableArtifactManifestV1
    manifest_sha256: str


def _media_type(path: str) -> str:
    if path.endswith(".txt"):
        return "text/plain; charset=utf-8"
    return "application/json"


def _manifest(
    *,
    job: ProductionCanaryJobV1,
    source_sha256: str,
    canonical_text_sha256: str,
    completed_at: datetime,
    artifacts: Mapping[str, bytes],
) -> ImmutableArtifactManifestV1:
    rows = tuple(
        ResultArtifactEntryV1(
            relative_path=path,
            media_type=_media_type(path),
            byte_count=len(data),
            sha256=sha256_bytes(data),
            producing_station=job.station_id,
            document_id=job.document_id,
            source_sha256=source_sha256,
            canonical_text_sha256=canonical_text_sha256,
            executor_version=job.executor_version,
            completed_at=completed_at,
        )
        for path, data in sorted(artifacts.items())
    )
    return ImmutableArtifactManifestV1(
        run_id=job.run_id,
        package_id=job.package_id,
        document_id=job.document_id,
        station_id=job.station_id,
        source_sha256=source_sha256,
        canonical_text_sha256=canonical_text_sha256,
        executor_version=job.executor_version,
        completed_at=completed_at,
        artifacts=rows,
    )


def _material(
    *,
    job: ProductionCanaryJobV1,
    source_sha256: str,
    canonical_text_sha256: str,
    completed_at: datetime,
    artifacts: Mapping[str, bytes],
) -> StationMaterial:
    manifest = _manifest(
        job=job,
        source_sha256=source_sha256,
        canonical_text_sha256=canonical_text_sha256,
        completed_at=completed_at,
        artifacts=artifacts,
    )
    return StationMaterial(
        artifacts=dict(artifacts),
        manifest=manifest,
        manifest_sha256=sha256_bytes(canonical_json_bytes(manifest)),
    )


def build_source_verify_material(
    *,
    job: ProductionCanaryJobV1,
    source_bytes: bytes,
    metadata: SourceObjectMetadataV2,
    approval: CopiedTextCanaryApprovalV1,
    completed_at: datetime,
) -> StationMaterial:
    digest = sha256_bytes(source_bytes)
    if digest != job.source_reference.source_sha256 or digest != metadata.source_sha256:
        raise DeterministicStationHold("source_hash_mismatch")
    if len(source_bytes) != metadata.source_bytes:
        raise DeterministicStationHold("source_size_mismatch")
    if digest != approval.source_sha256 or len(source_bytes) != approval.source_bytes:
        raise DeterministicStationHold("approval_source_mismatch")
    if metadata.media_type != approval.media_type:
        raise DeterministicStationHold("source_media_mismatch")
    payload = canonical_json_bytes({
        "schema_version": "source-verification-evidence-v1.0",
        "run_id": job.run_id,
        "document_id": job.document_id,
        "source_sha256": digest,
        "source_bytes": len(source_bytes),
        "media_type": metadata.media_type,
        "approval_id": approval.approval_id,
        "network_used": False,
        "executor_version": job.executor_version,
    })
    return _material(
        job=job,
        source_sha256=digest,
        canonical_text_sha256="",
        completed_at=completed_at,
        artifacts={"source_verification.json": payload},
    )


def build_canonical_text_material(
    *,
    job: ProductionCanaryJobV1,
    source_bytes: bytes,
    completed_at: datetime,
) -> StationMaterial:
    try:
        canonical_text = source_bytes.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise DeterministicStationHold("invalid_utf8") from exc
    if not canonical_text:
        raise DeterministicStationHold("empty_canonical_text")
    canonical_hash = sha256_text(canonical_text)
    manifest = build_extraction_manifest(
        doc_id=job.document_id,
        canonical_text=canonical_text,
        extraction_tool=job.executor_version,
        source_artifact_path=job.source_reference.relative_object_path,
        source_sha256=job.source_reference.source_sha256,
        source_truncated=False,
    )
    if manifest.quality.status != "passed":
        raise DeterministicStationHold("canonical_quality_held")
    artifacts = {
        "extracted.txt": source_bytes,
        "extraction_manifest.json": canonical_json_bytes(manifest),
    }
    return _material(
        job=job,
        source_sha256=job.source_reference.source_sha256,
        canonical_text_sha256=canonical_hash,
        completed_at=completed_at,
        artifacts=artifacts,
    )


def build_complete_units_material(
    *,
    job: ProductionCanaryJobV1,
    canonical_bytes: bytes,
    completed_at: datetime,
) -> StationMaterial:
    try:
        canonical_text = canonical_bytes.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise DeterministicStationHold("invalid_canonical_utf8") from exc
    sections = build_sections_v2(canonical_text, doc_id=job.document_id)
    units = build_citation_units_v2(canonical_text, doc_id=job.document_id)
    reconstructed = "".join(row.text for row in units.spans)
    if reconstructed != canonical_text:
        raise DeterministicStationHold("v2_reconstruction_mismatch")
    ready = {
        "schema_version": "v2-artifact-set-ready-v1.0",
        "doc_id": job.document_id,
        "canonical_text_sha256": sections.canonical_text_sha256,
        "sections_path": SECTIONS_V2_FILENAME,
        "sections_sha256": artifact_sha256(sections),
        "units_path": CITATION_UNITS_V2_FILENAME,
        "units_sha256": artifact_sha256(units),
    }
    artifacts = {
        SECTIONS_V2_FILENAME: canonical_artifact_bytes(sections),
        CITATION_UNITS_V2_FILENAME: canonical_artifact_bytes(units),
        V2_READY_FILENAME: canonical_json_bytes(ready),
    }
    return _material(
        job=job,
        source_sha256=job.source_reference.source_sha256,
        canonical_text_sha256=sha256_text(canonical_text),
        completed_at=completed_at,
        artifacts=artifacts,
    )


def load_verified_source(
    transfer_root: Path,
    *,
    job: ProductionCanaryJobV1,
) -> tuple[bytes, SourceObjectMetadataV2]:
    relative = job.source_reference.relative_object_path
    source_path = Path(transfer_root) / relative
    if source_path.is_symlink() or not source_path.is_file():
        raise DeterministicStationHold("source_path_unsafe")
    verified = verify_checksum_pair(source_path, relative_path=relative)
    if verified["sha256"] != job.source_reference.source_sha256:
        raise DeterministicStationHold("source_hash_mismatch")
    metadata_path = source_path.parent / "object.json"
    metadata_relative = metadata_path.relative_to(transfer_root).as_posix()
    verify_checksum_pair(metadata_path, relative_path=metadata_relative)
    metadata = SourceObjectMetadataV2.model_validate_json(metadata_path.read_bytes())
    return source_path.read_bytes(), metadata


def write_attempt_material(attempt_dir: Path, material: StationMaterial) -> None:
    attempt_dir = Path(attempt_dir)
    attempt_dir.mkdir(parents=True, exist_ok=False)
    for relative, data in sorted(material.artifacts.items()):
        atomic_write_bytes(attempt_dir / relative, data)
    atomic_write_bytes(
        attempt_dir / "artifact_manifest.json",
        canonical_json_bytes(material.manifest),
    )
    verify_artifact_manifest(attempt_dir, material.manifest, allow_manifest_file=True)


def finalize_attempt_material(attempt_dir: Path, final_dir: Path) -> None:
    attempt_dir, final_dir = Path(attempt_dir), Path(final_dir)
    if final_dir.exists():
        raise FileExistsError("immutable station result already exists")
    final_dir.parent.mkdir(parents=True, exist_ok=True)
    os.replace(attempt_dir, final_dir)


def verify_artifact_manifest(
    result_root: Path,
    manifest: ImmutableArtifactManifestV1,
    *,
    allow_manifest_file: bool = False,
) -> None:
    result_root = Path(result_root)
    expected = {row.relative_path for row in manifest.artifacts}
    actual: set[str] = set()
    for path in sorted(result_root.rglob("*")):
        if path.is_symlink():
            raise ValueError("result bundle contains a symlink")
        if not path.is_file():
            continue
        relative = path.relative_to(result_root).as_posix()
        if allow_manifest_file and relative == "artifact_manifest.json":
            continue
        actual.add(relative)
    if actual != expected:
        missing, extra = sorted(expected - actual), sorted(actual - expected)
        raise ValueError(f"artifact set mismatch: missing={missing}, extra={extra}")
    for row in manifest.artifacts:
        path = result_root / row.relative_path
        try:
            path.resolve().relative_to(result_root.resolve())
        except ValueError as exc:
            raise ValueError("artifact escapes result root") from exc
        data = path.read_bytes()
        if len(data) != row.byte_count or sha256_bytes(data) != row.sha256:
            raise ValueError("artifact checksum or byte count mismatch")
