"""Report-only source-depot planning and conservative two-host storage gates.

The planner hashes local fixture/source bytes in place but never copies them and
never opens the corpus, Source Queue, workflow ledger, Syncthing tree, or a
remote service.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Literal
from urllib.parse import SplitResult, urlsplit, urlunsplit

from pydantic import ConfigDict, BaseModel, Field, field_validator, model_validator

from runner.models.reprocessing import (
    CampaignSourceReferenceV1,
    HostStorageAssessmentV1,
    StorageComponentsV1,
    StudioInventoryV1,
    TwoHostStoragePreflightV1,
    require_safe_id,
    require_sha256,
)
from .factory_messages import (
    canonical_json_bytes,
    checksum_sidecar_path,
    publish_checksum_bound_bytes,
    publish_checksum_bound_json,
    sha256_bytes,
    verify_checksum_pair,
)


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class SourcePlanRequest(_StrictModel):
    doc_id: str
    source_ref_kind: Literal["local_file", "source_object", "url_descriptor"]
    local_path: str = ""
    source_sha256: str = ""
    expected_sha256: str = ""
    url: str = ""
    media_type: str = "application/octet-stream"
    safe_extension: str = "bin"
    acquisition_policy: Literal[
        "preserved_capture_only", "public_network_allowed", "descriptor_only"
    ] = "preserved_capture_only"

    @field_validator("doc_id")
    @classmethod
    def _doc_id(cls, value: str) -> str:
        return require_safe_id(value, field="doc_id")

    @field_validator("source_sha256", "expected_sha256")
    @classmethod
    def _optional_hash(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name) if value else value

    @field_validator("safe_extension")
    @classmethod
    def _extension(cls, value: str) -> str:
        if not value or not value.isalnum() or value.lower() != value or len(value) > 16:
            raise ValueError("safe_extension is invalid")
        return value

    @model_validator(mode="after")
    def _shape(self) -> "SourcePlanRequest":
        if self.source_ref_kind == "local_file":
            if not self.local_path or self.source_sha256 or self.url:
                raise ValueError("local_file request fields are inconsistent")
        elif self.source_ref_kind == "source_object":
            require_sha256(self.source_sha256, field="source_sha256")
            if self.local_path or self.url or self.expected_sha256:
                raise ValueError("source_object request fields are inconsistent")
        else:
            if not self.url or self.local_path or self.source_sha256 or self.expected_sha256:
                raise ValueError("url_descriptor request fields are inconsistent")
        return self


class SourceDepotDecision(_StrictModel):
    doc_id: str
    classification: Literal["reuse", "publish", "url_capture", "held"]
    reason: str
    source_bytes: int = Field(ge=0)
    reference: CampaignSourceReferenceV1 | None


class SourceDepotPlan(_StrictModel):
    schema_version: Literal["source-depot-plan-v1.0"] = "source-depot-plan-v1.0"
    report_only: Literal[True] = True
    inventory_id: str
    decisions: tuple[SourceDepotDecision, ...]
    counts: dict[str, int]
    plan_sha256: str

    @field_validator("plan_sha256")
    @classmethod
    def _plan_hash(cls, value: str) -> str:
        return require_sha256(value, field="plan_sha256")


class SourceObjectMetadataV2(_StrictModel):
    schema_version: Literal["source-object-v2.0"] = "source-object-v2.0"
    source_sha256: str
    source_bytes: int = Field(ge=0)
    media_type: str
    safe_extension: str
    relative_object_path: str

    @field_validator("source_sha256")
    @classmethod
    def _source_hash(cls, value: str) -> str:
        return require_sha256(value, field="source_sha256")

    @model_validator(mode="after")
    def _metadata_path(self) -> "SourceObjectMetadataV2":
        expected = content_object_relative_path(self.source_sha256, self.safe_extension)
        if self.relative_object_path != expected:
            raise ValueError("source object metadata path mismatch")
        return self


class SourcePublicationResult(_StrictModel):
    doc_id: str
    reference: CampaignSourceReferenceV1
    metadata: SourceObjectMetadataV2
    published_bytes: int = Field(ge=0)
    reused_bytes: int = Field(ge=0)
    reused: bool

    @field_validator("doc_id")
    @classmethod
    def _publication_doc(cls, value: str) -> str:
        return require_safe_id(value, field="doc_id")


def content_object_relative_path(source_sha256: str, safe_extension: str) -> str:
    digest = require_sha256(source_sha256, field="source_sha256")
    if not safe_extension or not safe_extension.isalnum() or safe_extension.lower() != safe_extension:
        raise ValueError("safe_extension is invalid")
    return f"sources/sha256/{digest[:2]}/{digest}/source.{safe_extension}"


def publish_source_object(
    source_path: Path,
    transfer_root: Path,
    *,
    doc_id: str,
    safe_extension: str | None = None,
    media_type: str = "application/octet-stream",
) -> SourcePublicationResult:
    """Publish one explicitly supplied regular file into a content depot."""
    source_path = Path(source_path)
    transfer_root = Path(transfer_root)
    if source_path.is_symlink() or not source_path.is_file():
        raise ValueError("source must be an existing non-symlink regular file")
    extension = safe_extension or source_path.suffix.lstrip(".").lower() or "bin"
    if not extension.isalnum() or extension.lower() != extension or len(extension) > 16:
        raise ValueError("safe_extension is invalid")
    data = source_path.read_bytes()
    digest = sha256_bytes(data)
    relative = content_object_relative_path(digest, extension)
    payload_path = transfer_root / relative
    metadata_path = payload_path.parent / "object.json"
    paths = (
        payload_path, checksum_sidecar_path(payload_path),
        metadata_path, checksum_sidecar_path(metadata_path),
    )
    metadata = SourceObjectMetadataV2(
        source_sha256=digest,
        source_bytes=len(data),
        media_type=media_type,
        safe_extension=extension,
        relative_object_path=relative,
    )
    reused = False
    if any(path.exists() or path.is_symlink() for path in paths):
        if not all(path.is_file() and not path.is_symlink() for path in paths):
            raise FileExistsError("source object is incomplete or contradictory")
        verified = verify_checksum_pair(payload_path, relative_path=relative)
        verify_checksum_pair(
            metadata_path,
            relative_path=(payload_path.parent / "object.json").relative_to(transfer_root).as_posix(),
        )
        existing = SourceObjectMetadataV2.model_validate_json(metadata_path.read_bytes())
        if verified["sha256"] != digest or payload_path.read_bytes() != data or existing != metadata:
            raise ValueError("existing source object is corrupted or contradictory")
        reused = True
    else:
        publish_checksum_bound_bytes(data, payload_path, relative_path=relative)
        publish_checksum_bound_json(
            metadata,
            metadata_path,
            relative_path=metadata_path.relative_to(transfer_root).as_posix(),
        )
        verify_checksum_pair(payload_path, relative_path=relative)
        verify_checksum_pair(
            metadata_path, relative_path=metadata_path.relative_to(transfer_root).as_posix(),
        )
    request = SourcePlanRequest(
        doc_id=doc_id,
        source_ref_kind="local_file",
        local_path=str(source_path),
        media_type=media_type,
        safe_extension=extension,
    )
    reference = _reference_for_hash(request, digest)
    return SourcePublicationResult(
        doc_id=doc_id,
        reference=reference,
        metadata=metadata,
        published_bytes=0 if reused else len(data),
        reused_bytes=len(data) if reused else 0,
        reused=reused,
    )


def _file_identity(path: Path) -> tuple[int, int, int, int, int]:
    stat = path.stat()
    return (stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns, stat.st_ino, stat.st_dev)


def _hash_regular_file(path: Path) -> tuple[str, int]:
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise FileNotFoundError(path)
    before = _file_identity(path)
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    after = _file_identity(path)
    if before != after:
        raise ValueError("source changed while it was being hashed")
    return digest.hexdigest(), before[0]


def normalize_url(value: str) -> str:
    raw = value.strip()
    parsed = urlsplit(raw)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        raise ValueError("URL descriptor must contain an HTTP(S) URL")
    if parsed.username or parsed.password:
        raise ValueError("URL descriptor must not contain credentials")
    host = parsed.hostname.lower()
    port = parsed.port
    if port and not ((parsed.scheme.lower() == "http" and port == 80) or (
        parsed.scheme.lower() == "https" and port == 443
    )):
        host = f"{host}:{port}"
    normalized = SplitResult(
        parsed.scheme.lower(), host, parsed.path or "/", parsed.query, "",
    )
    return urlunsplit(normalized)


def _url_descriptor_digest(url: str, acquisition_policy: str) -> str:
    return sha256_bytes(canonical_json_bytes({
        "schema_version": "url-source-descriptor-v1.0",
        "normalized_url": normalize_url(url),
        "acquisition_policy": acquisition_policy,
    }))


def _reference_for_hash(request: SourcePlanRequest, digest: str) -> CampaignSourceReferenceV1:
    path = content_object_relative_path(digest, request.safe_extension)
    ref_seed = sha256_bytes(canonical_json_bytes({
        "doc_id": request.doc_id, "source_sha256": digest, "path": path,
    }))
    return CampaignSourceReferenceV1(
        ref_id=f"ref-{ref_seed[:24]}",
        doc_id=request.doc_id,
        source_ref_kind="source_object",
        source_sha256=digest,
        relative_object_path=path,
        acquisition_policy=request.acquisition_policy,
    )


def _decision(request: SourcePlanRequest, inventory: StudioInventoryV1) -> SourceDepotDecision:
    known = set(inventory.verified_source_hashes) | set(inventory.preserved_capture_hashes)
    if request.source_ref_kind == "source_object":
        reference = _reference_for_hash(request, request.source_sha256)
        if request.source_sha256 in known:
            return SourceDepotDecision(
                doc_id=request.doc_id, classification="reuse",
                reason="verified_object_in_studio_inventory", source_bytes=0,
                reference=reference,
            )
        return SourceDepotDecision(
            doc_id=request.doc_id, classification="held", reason="missing_source_object",
            source_bytes=0, reference=reference,
        )
    if request.source_ref_kind == "url_descriptor":
        descriptor_sha = _url_descriptor_digest(request.url, request.acquisition_policy)
        reference = CampaignSourceReferenceV1(
            ref_id=f"ref-{descriptor_sha[:24]}",
            doc_id=request.doc_id,
            source_ref_kind="url_descriptor",
            url_descriptor_sha256=descriptor_sha,
            acquisition_policy=request.acquisition_policy,
        )
        return SourceDepotDecision(
            doc_id=request.doc_id, classification="url_capture",
            reason="exact_acquired_bytes_not_yet_preserved", source_bytes=0,
            reference=reference,
        )
    try:
        digest, size = _hash_regular_file(Path(request.local_path))
    except FileNotFoundError:
        return SourceDepotDecision(
            doc_id=request.doc_id, classification="held", reason="local_source_missing",
            source_bytes=0, reference=None,
        )
    if request.expected_sha256 and request.expected_sha256 != digest:
        raise ValueError(f"checksum mismatch for source {request.doc_id}")
    reference = _reference_for_hash(request, digest)
    if digest in known:
        return SourceDepotDecision(
            doc_id=request.doc_id, classification="reuse",
            reason="verified_object_in_studio_inventory", source_bytes=size,
            reference=reference,
        )
    return SourceDepotDecision(
        doc_id=request.doc_id, classification="publish",
        reason="object_absent_from_studio_inventory", source_bytes=size,
        reference=reference,
    )


def plan_source_depot(
    requests: list[SourcePlanRequest] | tuple[SourcePlanRequest, ...],
    inventory: StudioInventoryV1,
) -> SourceDepotPlan:
    """Classify sources without copying or publishing any bytes."""
    by_doc: dict[str, SourcePlanRequest] = {}
    for request in requests:
        previous = by_doc.get(request.doc_id)
        if previous is not None and previous != request:
            raise ValueError(f"conflicting duplicate doc_id: {request.doc_id}")
        by_doc[request.doc_id] = request
    decisions = tuple(_decision(by_doc[key], inventory) for key in sorted(by_doc))
    counts = {
        classification: sum(row.classification == classification for row in decisions)
        for classification in ("reuse", "publish", "url_capture", "held")
    }
    stable = {
        "schema_version": "source-depot-plan-v1.0",
        "report_only": True,
        "inventory_id": inventory.inventory_id,
        "decisions": [row.model_dump(mode="json") for row in decisions],
        "counts": counts,
    }
    return SourceDepotPlan(
        decisions=decisions,
        inventory_id=inventory.inventory_id,
        counts=counts,
        plan_sha256=sha256_bytes(canonical_json_bytes(stable)),
    )


def _host_assessment(
    host_id: Literal["macbook", "mac-studio"],
    components: StorageComponentsV1,
    available_bytes: int | None,
) -> HostStorageAssessmentV1:
    required = components.required_bytes
    if available_bytes is None:
        status, reason = "held_storage", "capacity_unknown"
    elif available_bytes < required:
        status, reason = "held_storage", "insufficient_disk"
    else:
        status, reason = "ready", "capacity_sufficient"
    return HostStorageAssessmentV1(
        host_id=host_id,
        components=components,
        required_bytes=required,
        available_bytes=available_bytes,
        status=status,
        reason=reason,
    )


def estimate_two_host_storage(
    *,
    macbook_components: StorageComponentsV1,
    studio_components: StorageComponentsV1,
    macbook_available_bytes: int | None,
    studio_available_bytes: int | None,
) -> TwoHostStoragePreflightV1:
    macbook = _host_assessment("macbook", macbook_components, macbook_available_bytes)
    studio = _host_assessment("mac-studio", studio_components, studio_available_bytes)
    assessments = (macbook, studio)
    reasons = tuple(
        f"{row.host_id}:{row.reason}" for row in assessments if row.status == "held_storage"
    )
    return TwoHostStoragePreflightV1(
        macbook=macbook,
        mac_studio=studio,
        status="held_storage" if reasons else "ready",
        reasons=reasons,
    )
