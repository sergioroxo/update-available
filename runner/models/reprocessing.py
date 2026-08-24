"""Strict, versioned contracts for the no-model factory foundation.

These models are portable evidence contracts. They deliberately reject unknown
fields, coercion, machine-absolute paths, and ambiguous source identities.
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timedelta
from pathlib import PurePosixPath
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$")
SAFE_EXTENSION_RE = re.compile(r"^[a-z0-9]{1,16}$")


def require_sha256(value: str, *, field: str) -> str:
    if not SHA256_RE.fullmatch(value):
        raise ValueError(f"{field} must be a lowercase SHA-256 digest")
    return value


def require_safe_id(value: str, *, field: str) -> str:
    if not SAFE_ID_RE.fullmatch(value):
        raise ValueError(f"{field} is not a safe portable identifier")
    return value


def require_relative_path(value: str, *, field: str) -> str:
    if not value or value != value.strip() or "\\" in value or "\x00" in value:
        raise ValueError(f"{field} is not a safe relative path")
    path = PurePosixPath(value)
    if value.startswith("/") or path.is_absolute() or ".." in path.parts:
        raise ValueError(f"{field} is not a safe relative path")
    if any(part in {"", "."} for part in path.parts):
        raise ValueError(f"{field} is not a canonical relative path")
    first = path.parts[0]
    if len(first) >= 2 and first[1] == ":":
        raise ValueError(f"{field} must not contain a drive-qualified path")
    return value


def _require_timezone(value: datetime, *, field: str) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{field} must include a timezone")
    return value


class StrictContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class SourceObjectV1(StrictContract):
    schema_version: Literal["source-object-v1.0"] = "source-object-v1.0"
    source_sha256: str
    bytes: int = Field(ge=0)
    media_type: str
    safe_extension: str
    relative_object_path: str
    acquired_at: datetime
    acquisition_type: Literal["local_file", "preserved_url_capture", "copied_fixture"]
    source_url_hash: str = ""
    provenance_sha256: str
    verification_status: Literal["verified"] = "verified"

    @field_validator("source_sha256", "provenance_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("source_url_hash")
    @classmethod
    def _optional_hash(cls, value: str) -> str:
        return require_sha256(value, field="source_url_hash") if value else value

    @field_validator("media_type")
    @classmethod
    def _media_type(cls, value: str) -> str:
        if not value or value != value.strip() or len(value) > 200:
            raise ValueError("media_type is invalid")
        return value

    @field_validator("safe_extension")
    @classmethod
    def _extension(cls, value: str) -> str:
        if not SAFE_EXTENSION_RE.fullmatch(value):
            raise ValueError("safe_extension is invalid")
        return value

    @field_validator("relative_object_path")
    @classmethod
    def _path(cls, value: str) -> str:
        return require_relative_path(value, field="relative_object_path")

    @field_validator("acquired_at")
    @classmethod
    def _acquired_at(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="acquired_at")

    @model_validator(mode="after")
    def _canonical_object_path(self) -> "SourceObjectV1":
        expected = (
            f"sources/sha256/{self.source_sha256[:2]}/{self.source_sha256}/"
            f"source.{self.safe_extension}"
        )
        if self.relative_object_path != expected:
            raise ValueError("relative_object_path is not derived from source_sha256")
        return self


class StudioInventoryV1(StrictContract):
    schema_version: Literal["studio-inventory-v1.0"] = "studio-inventory-v1.0"
    inventory_id: str
    host_id: str
    emitted_at: datetime
    verified_source_hashes: tuple[str, ...] = ()
    preserved_capture_hashes: tuple[str, ...] = ()
    index_versions: tuple[str, ...] = ()
    available_bytes: int | None = Field(default=None, ge=0)

    @field_validator("inventory_id", "host_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("emitted_at")
    @classmethod
    def _emitted_at(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="emitted_at")

    @field_validator("verified_source_hashes", "preserved_capture_hashes")
    @classmethod
    def _hash_sets(cls, value: tuple[str, ...], info) -> tuple[str, ...]:
        if value != tuple(sorted(set(value))):
            raise ValueError(f"{info.field_name} must be sorted and unique")
        for digest in value:
            require_sha256(digest, field=info.field_name)
        return value

    @field_validator("index_versions")
    @classmethod
    def _index_versions(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if value != tuple(sorted(set(value))):
            raise ValueError("index_versions must be sorted and unique")
        for item in value:
            require_safe_id(item, field="index_versions")
        return value


class CampaignSourceReferenceV1(StrictContract):
    schema_version: Literal["campaign-source-reference-v1.0"] = (
        "campaign-source-reference-v1.0"
    )
    ref_id: str
    doc_id: str
    source_ref_kind: Literal["source_object", "url_descriptor"]
    source_sha256: str = ""
    url_descriptor_sha256: str = ""
    relative_object_path: str = ""
    acquisition_policy: Literal[
        "preserved_capture_only", "public_network_allowed", "descriptor_only"
    ] = "preserved_capture_only"

    @field_validator("ref_id", "doc_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @model_validator(mode="after")
    def _source_identity(self) -> "CampaignSourceReferenceV1":
        if self.source_ref_kind == "source_object":
            require_sha256(self.source_sha256, field="source_sha256")
            require_relative_path(self.relative_object_path, field="relative_object_path")
            if self.url_descriptor_sha256:
                raise ValueError("source_object cannot claim a URL descriptor identity")
            expected_prefix = (
                f"sources/sha256/{self.source_sha256[:2]}/{self.source_sha256}/"
            )
            if not self.relative_object_path.startswith(expected_prefix):
                raise ValueError("source object path is not content-addressed")
        else:
            require_sha256(self.url_descriptor_sha256, field="url_descriptor_sha256")
            if self.source_sha256 or self.relative_object_path:
                raise ValueError("URL descriptors cannot pretend to identify source bytes")
        return self


class FactoryCommandV1(StrictContract):
    schema_version: Literal["factory-command-v1.0"] = "factory-command-v1.0"
    run_id: str
    command_id: str
    sequence: int = Field(ge=1)
    action: Literal["start_approved", "pause_after_current", "resume", "cancel_unstarted"]
    issued_at: datetime
    expires_at: datetime
    campaign_sha256: str

    @field_validator("run_id", "command_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("campaign_sha256")
    @classmethod
    def _campaign_hash(cls, value: str) -> str:
        return require_sha256(value, field="campaign_sha256")

    @field_validator("issued_at", "expires_at")
    @classmethod
    def _times(cls, value: datetime, info) -> datetime:
        return _require_timezone(value, field=info.field_name)

    @model_validator(mode="after")
    def _expiry(self) -> "FactoryCommandV1":
        if self.expires_at <= self.issued_at:
            raise ValueError("expires_at must follow issued_at")
        return self


FactoryEntityKind = Literal["campaign", "station", "document"]
FactoryState = Literal[
    "pending", "ready", "running", "paused", "held", "held_storage",
    "succeeded", "failed", "cancelled",
]


class FactoryEventV1(StrictContract):
    schema_version: Literal["factory-event-v1.0"] = "factory-event-v1.0"
    run_id: str
    event_id: str
    sequence: int = Field(ge=1)
    entity_kind: FactoryEntityKind
    entity_id: str
    station_id: str = ""
    document_id: str = ""
    from_state: FactoryState
    to_state: FactoryState
    attempt: int = Field(ge=0)
    occurred_at: datetime
    worker_id: str
    input_fingerprint: str = ""
    output_sha256: str = ""
    error_class: str = ""

    @field_validator("run_id", "event_id", "entity_id", "worker_id")
    @classmethod
    def _required_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("station_id", "document_id")
    @classmethod
    def _optional_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name) if value else value

    @field_validator("input_fingerprint", "output_sha256")
    @classmethod
    def _optional_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name) if value else value

    @field_validator("occurred_at")
    @classmethod
    def _occurred_at(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="occurred_at")

    @field_validator("error_class")
    @classmethod
    def _error_class(cls, value: str) -> str:
        if len(value) > 200 or "\n" in value or "\r" in value:
            raise ValueError("error_class must be bounded content-free text")
        return value

    @model_validator(mode="after")
    def _entity_binding(self) -> "FactoryEventV1":
        if self.entity_kind == "campaign":
            if self.entity_id != self.run_id:
                raise ValueError("campaign event entity_id must equal run_id")
            if self.station_id or self.document_id:
                raise ValueError("campaign event cannot bind station or document identity")
        elif self.entity_kind == "station":
            if self.station_id != self.entity_id:
                raise ValueError("station event must bind station_id")
            if self.document_id:
                raise ValueError("station event cannot bind document identity")
        elif self.document_id != self.entity_id or not self.station_id:
            raise ValueError("document event must bind document_id and station_id")
        return self

    @property
    def document_station_key(self) -> tuple[str, str]:
        """Return the explicit per-station identity for document work."""
        if self.entity_kind != "document":
            raise ValueError("only document events have a document/station key")
        return (self.document_id, self.station_id)


class FactoryReceiptV1(StrictContract):
    schema_version: Literal["factory-receipt-v1.0"] = "factory-receipt-v1.0"
    receipt_id: str
    event: FactoryEventV1
    received_at: datetime

    @field_validator("receipt_id")
    @classmethod
    def _receipt_id(cls, value: str) -> str:
        return require_safe_id(value, field="receipt_id")

    @field_validator("received_at")
    @classmethod
    def _received_at(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="received_at")


class StorageComponentsV1(StrictContract):
    schema_version: Literal["factory-storage-components-v1.0"] = (
        "factory-storage-components-v1.0"
    )
    new_source_bytes: int = Field(ge=0)
    local_cache_bytes: int = Field(ge=0)
    result_archive_bytes: int = Field(ge=0)
    temporary_space_bytes: int = Field(ge=0)
    current_index_bytes: int = Field(ge=0)
    previous_index_bytes: int = Field(ge=0)
    safety_reserve_bytes: int = Field(ge=0)

    @property
    def required_bytes(self) -> int:
        return sum(
            (
                self.new_source_bytes,
                self.local_cache_bytes,
                self.result_archive_bytes,
                self.temporary_space_bytes,
                self.current_index_bytes,
                self.previous_index_bytes,
                self.safety_reserve_bytes,
            )
        )


class HostStorageAssessmentV1(StrictContract):
    schema_version: Literal["factory-host-storage-assessment-v1.0"] = (
        "factory-host-storage-assessment-v1.0"
    )
    host_id: Literal["macbook", "mac-studio"]
    components: StorageComponentsV1
    required_bytes: int = Field(ge=0)
    available_bytes: int | None = Field(default=None, ge=0)
    status: Literal["ready", "held_storage"]
    reason: Literal["capacity_sufficient", "capacity_unknown", "insufficient_disk"]

    @model_validator(mode="after")
    def _capacity_invariants(self) -> "HostStorageAssessmentV1":
        if self.required_bytes != self.components.required_bytes:
            raise ValueError("required_bytes must equal the component total")
        if self.available_bytes is None:
            expected = ("held_storage", "capacity_unknown")
        elif self.available_bytes < self.required_bytes:
            expected = ("held_storage", "insufficient_disk")
        else:
            expected = ("ready", "capacity_sufficient")
        if (self.status, self.reason) != expected:
            raise ValueError("storage status and reason contradict available capacity")
        return self


class TwoHostStoragePreflightV1(StrictContract):
    schema_version: Literal["factory-storage-preflight-v1.0"] = (
        "factory-storage-preflight-v1.0"
    )
    macbook: HostStorageAssessmentV1
    mac_studio: HostStorageAssessmentV1
    status: Literal["ready", "held_storage"]
    reasons: tuple[str, ...]

    @model_validator(mode="after")
    def _aggregate_invariants(self) -> "TwoHostStoragePreflightV1":
        if self.macbook.host_id != "macbook":
            raise ValueError("macbook field must contain the macbook assessment")
        if self.mac_studio.host_id != "mac-studio":
            raise ValueError("mac_studio field must contain the mac-studio assessment")
        assessments = (self.macbook, self.mac_studio)
        expected_status = (
            "ready" if all(row.status == "ready" for row in assessments)
            else "held_storage"
        )
        expected_reasons = tuple(
            f"{row.host_id}:{row.reason}"
            for row in assessments
            if row.status == "held_storage"
        )
        if self.status != expected_status:
            raise ValueError("aggregate status contradicts host assessments")
        if self.reasons != expected_reasons:
            raise ValueError("aggregate reasons contradict host assessments")
        return self


class RuntimeDocumentJobV1(StrictContract):
    schema_version: Literal["factory-document-job-v1.0"] = "factory-document-job-v1.0"
    run_id: str
    package_id: str
    document_id: str
    station_id: Literal["synthetic_prepare"] = "synthetic_prepare"
    source_reference: CampaignSourceReferenceV1
    input_fingerprint: str
    max_attempts: int = Field(default=2, ge=1, le=10)

    @field_validator("run_id", "package_id", "document_id")
    @classmethod
    def _runtime_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("input_fingerprint")
    @classmethod
    def _fingerprint(cls, value: str) -> str:
        return require_sha256(value, field="input_fingerprint")

    @model_validator(mode="after")
    def _document_binding(self) -> "RuntimeDocumentJobV1":
        if self.source_reference.doc_id != self.document_id:
            raise ValueError("job source reference document mismatch")
        if self.source_reference.source_ref_kind != "source_object":
            raise ValueError("runtime jobs require preserved source bytes")
        return self


class RecoveryUnitManifestV1(StrictContract):
    schema_version: Literal["factory-recovery-unit-v1.0"] = "factory-recovery-unit-v1.0"
    run_id: str
    package_id: str
    package_sequence: int = Field(ge=1)
    campaign_identity_sha256: str
    station_id: Literal["synthetic_prepare"] = "synthetic_prepare"
    documents: tuple[RuntimeDocumentJobV1, ...]

    @field_validator("run_id", "package_id")
    @classmethod
    def _package_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("campaign_identity_sha256")
    @classmethod
    def _campaign_identity(cls, value: str) -> str:
        return require_sha256(value, field="campaign_identity_sha256")

    @model_validator(mode="after")
    def _package_invariants(self) -> "RecoveryUnitManifestV1":
        if not 1 <= len(self.documents) <= 15:
            raise ValueError("recovery unit must contain 1-15 documents")
        ids = tuple(row.document_id for row in self.documents)
        if ids != tuple(sorted(set(ids))):
            raise ValueError("package documents must be sorted and unique")
        for row in self.documents:
            if row.run_id != self.run_id or row.package_id != self.package_id:
                raise ValueError("package/document identity mismatch")
            if row.station_id != self.station_id:
                raise ValueError("package/document station mismatch")
        return self


class CampaignStatusSummaryV2(StrictContract):
    selected: int = Field(ge=1)
    packaged: int = Field(ge=1)
    held: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def _summary(self) -> "CampaignStatusSummaryV2":
        if self.packaged + self.held != self.selected:
            raise ValueError("campaign status summary is inconsistent")
        return self


class FactoryResultEvidenceV1(StrictContract):
    schema_version: Literal["factory-result-evidence-v1.0"] = (
        "factory-result-evidence-v1.0"
    )
    run_id: str
    package_id: str
    document_id: str
    station_id: Literal["synthetic_prepare"]
    attempt: int = Field(ge=1)
    source_sha256: str
    input_fingerprint: str
    output_sha256: str
    executor_version: str
    completed_at: datetime

    @field_validator("run_id", "package_id", "document_id", "executor_version")
    @classmethod
    def _result_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("source_sha256", "input_fingerprint", "output_sha256")
    @classmethod
    def _result_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("completed_at")
    @classmethod
    def _completed(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="completed_at")


class ResearchCampaignV2(StrictContract):
    """Safe executable Phase-2A subset, not the complete production schema."""

    schema_version: Literal["research-campaign-v2.0"] = "research-campaign-v2.0"
    run_id: str
    campaign_type: Literal["three_document_vertical_slice"]
    execution_mode: Literal["synthetic_no_model"]
    created_at: datetime
    creator_id: str
    baseline_identity: str
    code_identity: str
    worktree_identity_sha256: str
    selected_document_ids: tuple[str, ...]
    source_references: tuple[CampaignSourceReferenceV1, ...]
    package_ids: tuple[str, ...]
    package_manifest_sha256s: tuple[str, ...]
    maximum_package_size: Literal[15] = 15
    authorized_station_ids: tuple[Literal["synthetic_prepare"], ...]
    required_source_hashes: tuple[str, ...]
    network_acquisition_policy: Literal["forbidden"] = "forbidden"
    stage_barriers: tuple[Literal["synthetic_prepare"], ...]
    storage_preflight_identity: str
    remote_writes: Literal[False] = False
    publication: Literal[False] = False
    verified_local_import_authority: Literal[False] = False
    policy_version: Literal["factory-runtime-policy-v1.0"] = "factory-runtime-policy-v1.0"
    manifest_status_summary: CampaignStatusSummaryV2
    campaign_identity_sha256: str

    @field_validator(
        "run_id", "creator_id", "baseline_identity", "code_identity",
        "storage_preflight_identity",
    )
    @classmethod
    def _campaign_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("created_at")
    @classmethod
    def _created(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="created_at")

    @field_validator("worktree_identity_sha256", "campaign_identity_sha256")
    @classmethod
    def _campaign_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("package_manifest_sha256s")
    @classmethod
    def _package_hashes(cls, values: tuple[str, ...]) -> tuple[str, ...]:
        for value in values:
            require_sha256(value, field="package_manifest_sha256s")
        return values

    @model_validator(mode="after")
    def _campaign_invariants(self) -> "ResearchCampaignV2":
        docs = self.selected_document_ids
        if not docs or docs != tuple(sorted(set(docs))):
            raise ValueError("selected documents must be sorted and unique")
        if self.package_ids != tuple(sorted(set(self.package_ids))):
            raise ValueError("package IDs must be sorted and unique")
        if len(self.package_manifest_sha256s) != len(self.package_ids):
            raise ValueError("every package ID requires one ordered manifest hash")
        if self.authorized_station_ids != ("synthetic_prepare",):
            raise ValueError("Phase 2A authorizes exactly synthetic_prepare")
        if self.stage_barriers != ("synthetic_prepare",):
            raise ValueError("Phase 2A barrier must stop after synthetic_prepare")
        refs = tuple(row.doc_id for row in self.source_references)
        if refs != docs or len(set(refs)) != len(refs):
            raise ValueError("every selected document requires exactly one ordered source reference")
        if any(row.source_ref_kind != "source_object" for row in self.source_references):
            raise ValueError("Phase 2A requires caller-supplied preserved source bytes")
        expected_hashes = tuple(sorted(row.source_sha256 for row in self.source_references))
        if self.required_source_hashes != expected_hashes:
            raise ValueError("required source hashes must equal referenced object hashes")
        if self.manifest_status_summary.selected != len(docs):
            raise ValueError("campaign summary selected count mismatch")
        return self


PRODUCTION_CANARY_STATIONS = (
    "source_verify", "canonical_text_prepare", "complete_units_v2",
)
CANARY_CONFIRMATION_TEXT = (
    "I approve this one public, non-sensitive copied text artifact for the "
    "three non-model canary stations only."
)


class CopiedTextCanaryApprovalV1(StrictContract):
    """One expiring researcher approval for copied UTF-8 bytes.

    Run-009 validates this contract only with temporary synthetic bytes.  A
    real approval and source are reserved for a separately governed run.
    """

    schema_version: Literal["copied-text-canary-approval-v1.0"] = (
        "copied-text-canary-approval-v1.0"
    )
    approval_id: str
    run_id: str
    document_id: str
    source_sha256: str
    source_bytes: int = Field(ge=1)
    safe_display_filename: str
    media_type: Literal["text/plain", "text/markdown"]
    public_source_url: str = ""
    public_provenance_label: str = ""
    approved_at: datetime
    expires_at: datetime
    researcher_id: str
    source_is_public: Literal[True]
    source_is_non_sensitive: Literal[True]
    not_anonymous_platform_testimony: Literal[True]
    contains_no_private_or_restricted_material: Literal[True]
    copied_local_bytes_only: Literal[True]
    authorized_station_ids: tuple[str, ...]
    network_acquisition: Literal[False] = False
    research_model_calls: Literal[False] = False
    remote_writes: Literal[False] = False
    corpus_import: Literal[False] = False
    publication: Literal[False] = False
    researcher_confirmation_text: Literal[
        "I approve this one public, non-sensitive copied text artifact for the three non-model canary stations only."
    ] = CANARY_CONFIRMATION_TEXT

    @field_validator("approval_id", "run_id", "document_id", "researcher_id")
    @classmethod
    def _approval_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("source_sha256")
    @classmethod
    def _approval_hash(cls, value: str) -> str:
        return require_sha256(value, field="source_sha256")

    @field_validator("approved_at", "expires_at")
    @classmethod
    def _approval_times(cls, value: datetime, info) -> datetime:
        return _require_timezone(value, field=info.field_name)

    @field_validator("safe_display_filename")
    @classmethod
    def _display_filename(cls, value: str) -> str:
        if (
            not value or value != value.strip() or "/" in value or "\\" in value
            or "\x00" in value or value in {".", ".."}
            or value.lower().endswith((".partial", ".sha256"))
        ):
            raise ValueError("safe_display_filename is not a portable filename")
        suffix = PurePosixPath(value).suffix.lower()
        if suffix not in {".txt", ".md"}:
            raise ValueError("copied canary supports only .txt or .md")
        return value

    @model_validator(mode="after")
    def _approval_invariants(self) -> "CopiedTextCanaryApprovalV1":
        if self.expires_at <= self.approved_at:
            raise ValueError("approval expiry must follow approval time")
        if self.authorized_station_ids != PRODUCTION_CANARY_STATIONS:
            raise ValueError("approval must authorize exactly the three canary stations")
        expected_media = (
            "text/markdown" if self.safe_display_filename.lower().endswith(".md")
            else "text/plain"
        )
        if self.media_type != expected_media:
            raise ValueError("media type does not match copied text extension")
        if not self.public_source_url and not self.public_provenance_label:
            raise ValueError("public provenance must be declared")
        for value, field in (
            (self.public_source_url, "public_source_url"),
            (self.public_provenance_label, "public_provenance_label"),
        ):
            if value and (value != value.strip() or len(value) > 500 or "\n" in value):
                raise ValueError(f"{field} is malformed")
        return self

    def assert_current(self, now: datetime) -> None:
        _require_timezone(now, field="now")
        if now < self.approved_at or now >= self.expires_at:
            raise ValueError("copied-text approval is not currently valid")


ProductionStationId = Literal[
    "source_verify", "canonical_text_prepare", "complete_units_v2",
    "independent_analysis", "primary_and_comparison_compilation",
    "unit_embeddings", "frozen_index", "grounded_enrichment", "sealed_results",
]


class ProductionCanaryJobV1(StrictContract):
    schema_version: Literal["production-canary-job-v1.0"] = (
        "production-canary-job-v1.0"
    )
    run_id: str
    package_id: str
    document_id: str
    station_id: ProductionStationId
    station_sequence: int = Field(ge=1, le=3)
    predecessor_station_id: str = ""
    predecessor_output_sha256: str = ""
    source_reference: CampaignSourceReferenceV1
    input_fingerprint: str
    executor_version: str
    policy_version: str
    maximum_attempts: int = Field(default=2, ge=1, le=3)
    retry_classification: Literal["deterministic_non_retryable", "infrastructure_retryable"]
    barrier_id: Literal[
        "copied-text-canary-complete-units-v2", "copied-text-pilot-complete-units-v2"
    ] = (
        "copied-text-canary-complete-units-v2"
    )

    @field_validator("run_id", "package_id", "document_id", "executor_version", "policy_version")
    @classmethod
    def _production_job_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("predecessor_station_id")
    @classmethod
    def _predecessor_station(cls, value: str) -> str:
        if value and value not in PRODUCTION_CANARY_STATIONS:
            raise ValueError("unknown predecessor station")
        return value

    @field_validator("predecessor_output_sha256", "input_fingerprint")
    @classmethod
    def _production_hashes(cls, value: str, info) -> str:
        if value or info.field_name == "input_fingerprint":
            return require_sha256(value, field=info.field_name)
        return value

    @model_validator(mode="after")
    def _job_order(self) -> "ProductionCanaryJobV1":
        expected_index = PRODUCTION_CANARY_STATIONS.index(self.station_id) + 1
        if self.station_sequence != expected_index:
            raise ValueError("station sequence is not canonical")
        expected_predecessor = (
            "" if expected_index == 1 else PRODUCTION_CANARY_STATIONS[expected_index - 2]
        )
        if self.predecessor_station_id != expected_predecessor:
            raise ValueError("station predecessor is not canonical")
        if expected_predecessor and not self.predecessor_output_sha256:
            raise ValueError("downstream station requires predecessor output identity")
        if not expected_predecessor and self.predecessor_output_sha256:
            raise ValueError("first station cannot declare predecessor output")
        if self.source_reference.doc_id != self.document_id:
            raise ValueError("production job source/document identity mismatch")
        if self.source_reference.source_ref_kind != "source_object":
            raise ValueError("production canary requires copied source bytes")
        return self


class ProductionRecoveryUnitV1(StrictContract):
    schema_version: Literal["production-recovery-unit-v1.0"] = (
        "production-recovery-unit-v1.0"
    )
    run_id: str
    package_id: str
    package_sequence: Literal[1] = 1
    document_id: str
    jobs: tuple[ProductionCanaryJobV1, ...]

    @field_validator("run_id", "package_id", "document_id")
    @classmethod
    def _production_package_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @model_validator(mode="after")
    def _package_jobs(self) -> "ProductionRecoveryUnitV1":
        if tuple(job.station_id for job in self.jobs) != PRODUCTION_CANARY_STATIONS:
            raise ValueError("production package requires exactly three ordered stations")
        if any(
            job.run_id != self.run_id or job.package_id != self.package_id
            or job.document_id != self.document_id
            for job in self.jobs
        ):
            raise ValueError("production package/job identity mismatch")
        return self


class ProductionCanaryCampaignV1(StrictContract):
    schema_version: Literal["production-canary-campaign-v1.0"] = (
        "production-canary-campaign-v1.0"
    )
    run_id: str
    execution_mode: Literal["production_copied_text_canary"]
    created_at: datetime
    creator_id: str
    approval_id: str
    approval_sha256: str
    document_id: str
    source_reference: CampaignSourceReferenceV1
    package_id: str
    package_manifest_sha256: str
    authorized_station_ids: tuple[str, ...]
    barrier_id: Literal["copied-text-canary-complete-units-v2"] = (
        "copied-text-canary-complete-units-v2"
    )
    network_acquisition: Literal[False] = False
    research_model_calls: Literal[False] = False
    remote_writes: Literal[False] = False
    corpus_import: Literal[False] = False
    publication: Literal[False] = False
    policy_version: Literal["production-canary-policy-v1.0"] = (
        "production-canary-policy-v1.0"
    )

    @field_validator("run_id", "creator_id", "approval_id", "document_id", "package_id")
    @classmethod
    def _production_campaign_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("approval_sha256", "package_manifest_sha256")
    @classmethod
    def _production_campaign_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("created_at")
    @classmethod
    def _production_created_at(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="created_at")

    @model_validator(mode="after")
    def _production_campaign_invariants(self) -> "ProductionCanaryCampaignV1":
        if self.authorized_station_ids != PRODUCTION_CANARY_STATIONS:
            raise ValueError("production canary requires exactly three ordered stations")
        if self.source_reference.doc_id != self.document_id:
            raise ValueError("campaign source/document identity mismatch")
        if self.source_reference.source_ref_kind != "source_object":
            raise ValueError("production canary requires copied source bytes")
        return self


PILOT_CONFIRMATION_TEXT = (
    "I approve these copied public, non-sensitive text artifacts for the "
    "three non-model pilot stations only."
)


class CopiedTextPilotArtifactV1(StrictContract):
    """One explicitly selected member of a bounded copied-text pilot."""

    schema_version: Literal["copied-text-pilot-artifact-v1.0"] = (
        "copied-text-pilot-artifact-v1.0"
    )
    document_id: str
    source_sha256: str
    source_bytes: int = Field(ge=1)
    source_characters: int = Field(ge=1)
    safe_display_filename: str
    media_type: Literal["text/plain", "text/markdown"]
    public_title: str
    public_provenance_label: str
    public_source_url: str = ""
    source_is_public: Literal[True]
    source_is_non_sensitive: Literal[True]
    not_anonymous_platform_testimony: Literal[True]
    contains_no_private_or_restricted_material: Literal[True]
    copied_local_bytes_only: Literal[True]

    @field_validator("document_id")
    @classmethod
    def _artifact_id(cls, value: str) -> str:
        return require_safe_id(value, field="document_id")

    @field_validator("source_sha256")
    @classmethod
    def _artifact_hash(cls, value: str) -> str:
        return require_sha256(value, field="source_sha256")

    @field_validator("safe_display_filename")
    @classmethod
    def _artifact_filename(cls, value: str) -> str:
        if (
            not value or value != value.strip() or "/" in value or "\\" in value
            or "\x00" in value or value in {".", ".."}
            or value.lower().endswith((".partial", ".sha256"))
        ):
            raise ValueError("safe_display_filename is not a portable filename")
        if PurePosixPath(value).suffix.lower() not in {".txt", ".md"}:
            raise ValueError("copied pilot supports only .txt or .md")
        return value

    @field_validator("public_title", "public_provenance_label", "public_source_url")
    @classmethod
    def _public_text(cls, value: str, info) -> str:
        if value != value.strip() or len(value) > 500 or "\n" in value or "\x00" in value:
            raise ValueError(f"{info.field_name} is malformed")
        if info.field_name != "public_source_url" and not value:
            raise ValueError(f"{info.field_name} is required")
        return value

    @model_validator(mode="after")
    def _artifact_media(self) -> "CopiedTextPilotArtifactV1":
        expected = (
            "text/markdown" if self.safe_display_filename.lower().endswith(".md")
            else "text/plain"
        )
        if self.media_type != expected:
            raise ValueError("media type does not match copied text extension")
        return self


class CopiedTextPilotApprovalV1(StrictContract):
    """Expiring authority for exactly 6–12 named copied text artifacts."""

    schema_version: Literal["copied-text-pilot-approval-v1.0"] = (
        "copied-text-pilot-approval-v1.0"
    )
    approval_id: str
    run_id: str
    approved_at: datetime
    expires_at: datetime
    researcher_id: str
    artifacts: tuple[CopiedTextPilotArtifactV1, ...]
    authorized_station_ids: tuple[str, ...]
    maximum_package_size: Literal[15] = 15
    macbook_code_identity_sha256: str
    macbook_worktree_identity_sha256: str
    storage_preflight_identity_sha256: str
    network_acquisition: Literal[False] = False
    research_model_calls: Literal[False] = False
    embeddings: Literal[False] = False
    rag: Literal[False] = False
    analysis: Literal[False] = False
    enrichment: Literal[False] = False
    remote_writes: Literal[False] = False
    corpus_import: Literal[False] = False
    publication: Literal[False] = False
    researcher_confirmation_text: Literal[
        "I approve these copied public, non-sensitive text artifacts for the three non-model pilot stations only."
    ] = PILOT_CONFIRMATION_TEXT

    @field_validator("approval_id", "run_id", "researcher_id")
    @classmethod
    def _pilot_approval_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("approved_at", "expires_at")
    @classmethod
    def _pilot_approval_times(cls, value: datetime, info) -> datetime:
        return _require_timezone(value, field=info.field_name)

    @field_validator(
        "macbook_code_identity_sha256", "macbook_worktree_identity_sha256",
        "storage_preflight_identity_sha256",
    )
    @classmethod
    def _pilot_identity_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _pilot_approval_invariants(self) -> "CopiedTextPilotApprovalV1":
        if self.expires_at - self.approved_at != timedelta(hours=24):
            raise ValueError("pilot approval requires an exact 24-hour window")
        if self.authorized_station_ids != PRODUCTION_CANARY_STATIONS:
            raise ValueError("pilot approval requires exactly the three ordered stations")
        if not 6 <= len(self.artifacts) <= 12:
            raise ValueError("real copied-text pilot requires 6–12 artifacts")
        document_ids = tuple(row.document_id for row in self.artifacts)
        if document_ids != tuple(sorted(set(document_ids))):
            raise ValueError("pilot artifacts must use sorted unique document IDs")
        hashes = tuple(row.source_sha256 for row in self.artifacts)
        if len(set(hashes)) != len(hashes):
            raise ValueError("pilot artifacts must not duplicate source hashes")
        return self

    def assert_current(self, now: datetime) -> None:
        _require_timezone(now, field="now")
        if now < self.approved_at or now >= self.expires_at:
            raise ValueError("copied-text pilot approval is not currently valid")


class ProductionPilotPackageV1(StrictContract):
    schema_version: Literal["production-pilot-package-v1.0"] = (
        "production-pilot-package-v1.0"
    )
    run_id: str
    package_id: str
    package_sequence: Literal[1] = 1
    document_ids: tuple[str, ...]
    jobs: tuple[ProductionCanaryJobV1, ...]
    maximum_package_size: Literal[15] = 15

    @field_validator("run_id", "package_id")
    @classmethod
    def _pilot_package_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @model_validator(mode="after")
    def _pilot_package_jobs(self) -> "ProductionPilotPackageV1":
        if not 6 <= len(self.document_ids) <= 12:
            raise ValueError("production pilot package requires 6–12 documents")
        if self.document_ids != tuple(sorted(set(self.document_ids))):
            raise ValueError("pilot package documents must be sorted and unique")
        expected = tuple(
            (document_id, station_id)
            for document_id in self.document_ids
            for station_id in PRODUCTION_CANARY_STATIONS
        )
        actual = tuple((job.document_id, job.station_id) for job in self.jobs)
        if actual != expected:
            raise ValueError("pilot jobs must follow deterministic document/station order")
        if any(job.run_id != self.run_id or job.package_id != self.package_id for job in self.jobs):
            raise ValueError("pilot package/job identity mismatch")
        return self


class ProductionPilotCampaignV1(StrictContract):
    schema_version: Literal["production-pilot-campaign-v1.0"] = (
        "production-pilot-campaign-v1.0"
    )
    run_id: str
    execution_mode: Literal["production_copied_text_pilot"]
    created_at: datetime
    creator_id: str
    approval_id: str
    approval_sha256: str
    document_ids: tuple[str, ...]
    source_references: tuple[CampaignSourceReferenceV1, ...]
    package_id: str
    package_manifest_sha256: str
    authorized_station_ids: tuple[str, ...]
    barrier_id: Literal["copied-text-pilot-complete-units-v2"] = (
        "copied-text-pilot-complete-units-v2"
    )
    command_expiry_hours: Literal[24] = 24
    network_acquisition: Literal[False] = False
    research_model_calls: Literal[False] = False
    embeddings: Literal[False] = False
    rag: Literal[False] = False
    analysis: Literal[False] = False
    enrichment: Literal[False] = False
    remote_writes: Literal[False] = False
    corpus_import: Literal[False] = False
    publication: Literal[False] = False
    policy_version: Literal["production-pilot-policy-v1.0"] = (
        "production-pilot-policy-v1.0"
    )

    @field_validator("run_id", "creator_id", "approval_id", "package_id")
    @classmethod
    def _pilot_campaign_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("approval_sha256", "package_manifest_sha256")
    @classmethod
    def _pilot_campaign_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("created_at")
    @classmethod
    def _pilot_created_at(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="created_at")

    @model_validator(mode="after")
    def _pilot_campaign_invariants(self) -> "ProductionPilotCampaignV1":
        if self.authorized_station_ids != PRODUCTION_CANARY_STATIONS:
            raise ValueError("production pilot requires exactly the three ordered stations")
        if not 6 <= len(self.document_ids) <= 12:
            raise ValueError("production pilot requires 6–12 documents")
        if self.document_ids != tuple(sorted(set(self.document_ids))):
            raise ValueError("campaign documents must be sorted and unique")
        if tuple(row.doc_id for row in self.source_references) != self.document_ids:
            raise ValueError("campaign source references must bind every ordered document")
        if any(row.source_ref_kind != "source_object" for row in self.source_references):
            raise ValueError("production pilot requires copied source bytes")
        return self


class ResultArtifactEntryV1(StrictContract):
    relative_path: str
    media_type: str
    byte_count: int = Field(ge=0)
    sha256: str
    producing_station: ProductionStationId
    document_id: str
    source_sha256: str
    canonical_text_sha256: str = ""
    executor_version: str
    completed_at: datetime

    @field_validator("relative_path")
    @classmethod
    def _result_path(cls, value: str) -> str:
        return require_relative_path(value, field="relative_path")

    @field_validator("document_id", "executor_version")
    @classmethod
    def _result_entry_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("sha256", "source_sha256", "canonical_text_sha256")
    @classmethod
    def _result_entry_hashes(cls, value: str, info) -> str:
        if value or info.field_name != "canonical_text_sha256":
            return require_sha256(value, field=info.field_name)
        return value

    @field_validator("completed_at")
    @classmethod
    def _result_completed(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="completed_at")


class ImmutableArtifactManifestV1(StrictContract):
    schema_version: Literal["immutable-result-artifact-manifest-v1.0"] = (
        "immutable-result-artifact-manifest-v1.0"
    )
    run_id: str
    package_id: str
    document_id: str
    station_id: ProductionStationId
    source_sha256: str
    canonical_text_sha256: str = ""
    executor_version: str
    completed_at: datetime
    artifacts: tuple[ResultArtifactEntryV1, ...]

    @field_validator("run_id", "package_id", "document_id", "executor_version")
    @classmethod
    def _manifest_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("source_sha256", "canonical_text_sha256")
    @classmethod
    def _manifest_hashes(cls, value: str, info) -> str:
        if value or info.field_name != "canonical_text_sha256":
            return require_sha256(value, field=info.field_name)
        return value

    @field_validator("completed_at")
    @classmethod
    def _manifest_completed(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="completed_at")

    @model_validator(mode="after")
    def _artifact_invariants(self) -> "ImmutableArtifactManifestV1":
        if not self.artifacts:
            raise ValueError("artifact manifest cannot be empty")
        paths = tuple(row.relative_path for row in self.artifacts)
        if paths != tuple(sorted(set(paths))):
            raise ValueError("artifact paths must be sorted and unique")
        forbidden = (".db", ".sqlite", ".sqlite3", ".wal", ".journal", ".shm", ".lock", ".pid")
        for row in self.artifacts:
            name = PurePosixPath(row.relative_path).name.lower()
            if name == ".env" or name.endswith(forbidden) or any(
                token in name for token in ("secret", "private_key", "access_token")
            ):
                raise ValueError("artifact manifest contains an operational or secret file")
            if (
                row.document_id != self.document_id
                or row.producing_station != self.station_id
                or row.source_sha256 != self.source_sha256
                or row.executor_version != self.executor_version
            ):
                raise ValueError("artifact entry identity contradicts manifest")
            if row.canonical_text_sha256 != self.canonical_text_sha256:
                raise ValueError("artifact canonical identity contradicts manifest")
        return self


# Additive Phase-2D contracts.  The accepted three-station approval and job
# contracts above deliberately continue to validate against
# PRODUCTION_CANARY_STATIONS; adding the fourth station here does not broaden
# their authority.
RESEARCH_PASS_A_STATIONS = (
    "source_verify",
    "canonical_text_prepare",
    "complete_units_v2",
    "independent_analysis",
)


def _canonical_contract_sha256(value: BaseModel, *, omit: set[str] | None = None) -> str:
    payload = value.model_dump(mode="json", exclude=omit or set())
    encoded = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class AnalysisLexiconVariantV1(StrictContract):
    language: str = Field(min_length=2, max_length=35)
    value: str = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def _canonical_variant(self) -> "AnalysisLexiconVariantV1":
        if self.language != self.language.strip().lower() or self.value != self.value.strip():
            raise ValueError("lexicon variant is not canonical")
        if "\n" in self.value or "\x00" in self.value:
            raise ValueError("lexicon variant contains forbidden characters")
        return self


class AnalysisLexiconTermV1(StrictContract):
    term_id: str
    preferred_term: str = Field(min_length=1, max_length=200)
    definition: str = Field(min_length=1, max_length=1000)
    status: Literal["trusted"] = "trusted"
    variants: tuple[AnalysisLexiconVariantV1, ...] = ()

    @field_validator("term_id")
    @classmethod
    def _term_id(cls, value: str) -> str:
        return require_safe_id(value, field="term_id")

    @model_validator(mode="after")
    def _canonical_term(self) -> "AnalysisLexiconTermV1":
        if self.preferred_term != self.preferred_term.strip():
            raise ValueError("preferred term is not canonical")
        ordered = tuple((row.language, row.value) for row in self.variants)
        if ordered != tuple(sorted(set(ordered))):
            raise ValueError("lexicon variants must be sorted and unique")
        return self


class AnalysisLexiconSnapshotV1(StrictContract):
    schema_version: Literal["analysis-lexicon-snapshot-v1.0"] = (
        "analysis-lexicon-snapshot-v1.0"
    )
    snapshot_id: str
    source_version: str
    creation_policy: Literal["trusted_orientation_terms_only"] = (
        "trusted_orientation_terms_only"
    )
    created_at: datetime
    terms: tuple[AnalysisLexiconTermV1, ...]
    canonical_sha256: str

    @field_validator("snapshot_id", "source_version")
    @classmethod
    def _snapshot_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("created_at")
    @classmethod
    def _snapshot_time(cls, value: datetime) -> datetime:
        return _require_timezone(value, field="created_at")

    @field_validator("canonical_sha256")
    @classmethod
    def _snapshot_hash(cls, value: str) -> str:
        return require_sha256(value, field="canonical_sha256")

    @model_validator(mode="after")
    def _snapshot_invariants(self) -> "AnalysisLexiconSnapshotV1":
        ids = tuple(row.term_id for row in self.terms)
        if ids != tuple(sorted(set(ids))):
            raise ValueError("lexicon terms must be sorted and unique")
        expected = _canonical_contract_sha256(self, omit={"canonical_sha256"})
        if self.canonical_sha256 != expected:
            raise ValueError("lexicon snapshot canonical hash mismatch")
        return self


class ResearchPassADocumentV1(StrictContract):
    document_id: str
    source_sha256: str
    source_bytes: int = Field(ge=1)
    canonical_text_sha256: str = ""
    source_is_public: Literal[True]
    source_is_non_sensitive: Literal[True]
    not_testimony: Literal[True]
    contains_no_private_or_restricted_material: Literal[True]
    not_consent_gated: Literal[True]

    @field_validator("document_id")
    @classmethod
    def _document_id(cls, value: str) -> str:
        return require_safe_id(value, field="document_id")

    @field_validator("source_sha256", "canonical_text_sha256")
    @classmethod
    def _document_hashes(cls, value: str, info) -> str:
        if value or info.field_name == "source_sha256":
            return require_sha256(value, field=info.field_name)
        return value


class ResearchPassAApprovalV1(StrictContract):
    schema_version: Literal["research-pass-a-approval-v1.0"] = (
        "research-pass-a-approval-v1.0"
    )
    approval_id: str
    run_id: str
    documents: tuple[ResearchPassADocumentV1, ...]
    authorized_station_ids: tuple[str, ...]
    analysis_route: str
    prompt_version: Literal["ingestion-v3.3"] = "ingestion-v3.3"
    lexicon_snapshot_sha256: str
    researcher_id: str
    researcher_approval_text: str = Field(min_length=1, max_length=1000)
    issued_at: datetime
    expiry_policy: Literal["expires", "non_expiring_research_approval"]
    expires_at: datetime | None = None
    fingerprint_sha256: str

    @field_validator("approval_id", "run_id", "analysis_route", "researcher_id")
    @classmethod
    def _approval_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("lexicon_snapshot_sha256", "fingerprint_sha256")
    @classmethod
    def _approval_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("issued_at", "expires_at")
    @classmethod
    def _approval_times(cls, value: datetime | None, info):
        return None if value is None else _require_timezone(value, field=info.field_name)

    @model_validator(mode="after")
    def _approval_invariants(self) -> "ResearchPassAApprovalV1":
        if self.authorized_station_ids != RESEARCH_PASS_A_STATIONS:
            raise ValueError("Pass A requires exactly four ordered stations")
        ids = tuple(row.document_id for row in self.documents)
        if not ids or ids != tuple(sorted(set(ids))):
            raise ValueError("approval documents must be sorted and unique")
        if self.expiry_policy == "expires":
            if self.expires_at is None or self.expires_at <= self.issued_at:
                raise ValueError("expiring approval requires a future expiry")
        elif self.expires_at is not None:
            raise ValueError("non-expiring approval cannot declare expires_at")
        expected = _canonical_contract_sha256(self, omit={"fingerprint_sha256"})
        if self.fingerprint_sha256 != expected:
            raise ValueError("approval fingerprint mismatch")
        return self

    def assert_current(self, now: datetime) -> None:
        _require_timezone(now, field="now")
        if now < self.issued_at or (self.expires_at is not None and now >= self.expires_at):
            raise ValueError("Pass A approval is not currently valid")


class ResearchPassAJobV1(StrictContract):
    schema_version: Literal["research-pass-a-job-v1.0"] = "research-pass-a-job-v1.0"
    run_id: str
    package_id: str
    document_id: str
    station_id: ProductionStationId
    station_sequence: int = Field(ge=1, le=4)
    source_reference: CampaignSourceReferenceV1
    input_fingerprint: str
    maximum_attempts: int = Field(default=2, ge=1, le=3)

    @field_validator("run_id", "package_id", "document_id")
    @classmethod
    def _job_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("input_fingerprint")
    @classmethod
    def _job_hash(cls, value: str) -> str:
        return require_sha256(value, field="input_fingerprint")

    @model_validator(mode="after")
    def _job_invariants(self) -> "ResearchPassAJobV1":
        if self.station_id not in RESEARCH_PASS_A_STATIONS:
            raise ValueError("job station is not authorized for Pass A")
        if self.station_sequence != RESEARCH_PASS_A_STATIONS.index(self.station_id) + 1:
            raise ValueError("job station sequence is not canonical")
        if self.source_reference.doc_id != self.document_id:
            raise ValueError("job source/document identity mismatch")
        return self


class ResearchPassACampaignV1(StrictContract):
    schema_version: Literal["research-pass-a-campaign-v1.0"] = (
        "research-pass-a-campaign-v1.0"
    )
    run_id: str
    campaign_id: str
    approval_fingerprint_sha256: str
    station_sequence: tuple[str, ...]
    execution_policy: Literal["station_major"] = "station_major"
    package_ids: tuple[str, ...]
    document_ids: tuple[str, ...]
    source_references: tuple[CampaignSourceReferenceV1, ...]
    prompt_version: Literal["ingestion-v3.3"] = "ingestion-v3.3"
    analysis_output_schema_version: str
    analysis_route: str
    lexicon_snapshot_sha256: str
    maximum_attempts: int = Field(default=2, ge=1, le=3)
    model_lifecycle_policy: Literal["one_lifecycle_per_analysis_station"] = (
        "one_lifecycle_per_analysis_station"
    )
    remote_writes: Literal[False] = False
    corpus_import: Literal[False] = False
    publication: Literal[False] = False
    expected_output_contracts: tuple[str, ...]
    predecessor_campaign_ids: tuple[str, ...] = ()
    campaign_sha256: str

    @field_validator("run_id", "campaign_id", "analysis_route", "analysis_output_schema_version")
    @classmethod
    def _pass_a_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("approval_fingerprint_sha256", "lexicon_snapshot_sha256", "campaign_sha256")
    @classmethod
    def _pass_a_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _campaign_invariants(self) -> "ResearchPassACampaignV1":
        if self.station_sequence != RESEARCH_PASS_A_STATIONS:
            raise ValueError("Pass A campaign requires exactly four ordered stations")
        if self.document_ids != tuple(sorted(set(self.document_ids))) or not self.document_ids:
            raise ValueError("campaign document IDs must be sorted and unique")
        if self.package_ids != tuple(sorted(set(self.package_ids))) or not self.package_ids:
            raise ValueError("campaign package IDs must be sorted and unique")
        if tuple(row.doc_id for row in self.source_references) != self.document_ids:
            raise ValueError("campaign source references must bind every ordered document")
        expected_outputs = (
            "analysis.json", "analysis_audit.json", "resolved_input_receipt.json",
            "model_stage_result.json", "result_manifest.json",
        )
        if self.expected_output_contracts != expected_outputs:
            raise ValueError("Pass A expected output contracts are not canonical")
        if self.predecessor_campaign_ids != tuple(sorted(set(self.predecessor_campaign_ids))):
            raise ValueError("predecessor campaigns must be sorted and unique")
        expected = _canonical_contract_sha256(self, omit={"campaign_sha256"})
        if self.campaign_sha256 != expected:
            raise ValueError("campaign canonical hash mismatch")
        return self


class ModelStageResultV1(StrictContract):
    schema_version: Literal["model-stage-result-v1.0"] = "model-stage-result-v1.0"
    run_id: str
    stage_job_id: str
    document_id: str
    stage_id: Literal["independent_analysis"] = "independent_analysis"
    attempt: int = Field(ge=1)
    input_artifact_hashes: tuple[str, ...]
    system_input_sha256: str
    user_input_sha256: str
    requested_model: str
    provider_resolved_model: str
    model_parameters: dict[str, int | float | str | bool]
    prompt_version: Literal["ingestion-v3.3"] = "ingestion-v3.3"
    output_schema_version: str
    lexicon_snapshot_sha256: str
    index_version: Literal[""] = ""
    retrieval_context_sha256: Literal[""] = ""
    started_at: datetime
    completed_at: datetime
    duration_ms: int = Field(ge=0)
    validation_status: Literal["passed", "held"]
    output_sha256: str
    superseded_output_sha256: str = ""

    @field_validator("run_id", "stage_job_id", "document_id", "output_schema_version")
    @classmethod
    def _stage_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("requested_model", "provider_resolved_model")
    @classmethod
    def _model_identities(cls, value: str, info) -> str:
        if not value or value != value.strip() or len(value) > 300 or any(
            char in value for char in ("\n", "\r", "\x00")
        ):
            raise ValueError(f"{info.field_name} is malformed")
        return value

    @field_validator(
        "system_input_sha256", "user_input_sha256", "lexicon_snapshot_sha256",
        "output_sha256", "superseded_output_sha256",
    )
    @classmethod
    def _stage_hashes(cls, value: str, info) -> str:
        if value or info.field_name != "superseded_output_sha256":
            return require_sha256(value, field=info.field_name)
        return value

    @field_validator("input_artifact_hashes")
    @classmethod
    def _input_hashes(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if not value or value != tuple(sorted(set(value))):
            raise ValueError("input artifact hashes must be sorted and unique")
        for digest in value:
            require_sha256(digest, field="input_artifact_hashes")
        return value

    @field_validator("started_at", "completed_at")
    @classmethod
    def _stage_times(cls, value: datetime, info) -> datetime:
        return _require_timezone(value, field=info.field_name)

    @model_validator(mode="after")
    def _stage_invariants(self) -> "ModelStageResultV1":
        if self.completed_at < self.started_at:
            raise ValueError("model stage completion precedes start")
        elapsed = int((self.completed_at - self.started_at).total_seconds() * 1000)
        if self.duration_ms != elapsed:
            raise ValueError("model stage duration mismatch")
        return self


class AnalysisObserverMetadataV1(StrictContract):
    schema_version: Literal["analysis-observer-metadata-v1.0"] = (
        "analysis-observer-metadata-v1.0"
    )
    run_id: str
    document_id: str
    attempt: int = Field(ge=1)
    requested_route: str
    provider_resolved_model: str
    output_sha256: str
    lexicon_snapshot_sha256: str
    prompt_version: Literal["ingestion-v3.3"] = "ingestion-v3.3"
    validation_status: Literal["passed", "held"]
    reason_code: str = ""

    @field_validator("run_id", "document_id", "requested_route")
    @classmethod
    def _observer_ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("provider_resolved_model")
    @classmethod
    def _observer_model(cls, value: str) -> str:
        if not value or value != value.strip() or len(value) > 300 or any(
            char in value for char in ("\n", "\r", "\x00")
        ):
            raise ValueError("provider_resolved_model is malformed")
        return value

    @field_validator("output_sha256", "lexicon_snapshot_sha256")
    @classmethod
    def _observer_hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)
