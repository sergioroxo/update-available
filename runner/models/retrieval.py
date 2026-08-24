"""Strict source-only retrieval contracts for the additive factory path."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from runner.models.reprocessing import (
    require_relative_path,
    require_safe_id,
    require_sha256,
)


EMBEDDING_MODEL_REQUESTED = "research-embedding"
EMBEDDING_MODEL_RESOLVED = "qwen3-embedding:8b"
EMBEDDING_DIMENSION = 4096


class RetrievalContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


def canonical_contract_bytes(value: BaseModel, *, omit: set[str] | None = None) -> bytes:
    payload = value.model_dump(mode="json", exclude=omit or set())
    return json.dumps(
        payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"),
    ).encode("utf-8")


def canonical_contract_sha256(value: BaseModel, *, omit: set[str] | None = None) -> str:
    return hashlib.sha256(canonical_contract_bytes(value, omit=omit)).hexdigest()


class SourceUnitRowV1(RetrievalContract):
    schema_version: Literal["source-unit-row-v1.0"] = "source-unit-row-v1.0"
    run_id: str
    document_id: str
    unit_id: str
    source_family_id: str
    stance: Literal["supporting", "opposed", "neutral", "unknown"] = "unknown"
    language: str = "und"
    canonical_text_sha256: str
    unit_text_sha256: str
    char_start: int = Field(ge=0)
    char_end: int = Field(gt=0)
    text: str = Field(min_length=1)
    source_artifact: str
    source_version: str
    provenance_kind: Literal["source_v2_unit"] = "source_v2_unit"

    @field_validator("run_id", "document_id", "unit_id", "source_family_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("canonical_text_sha256", "unit_text_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("source_artifact")
    @classmethod
    def _path(cls, value: str) -> str:
        return require_relative_path(value, field="source_artifact")

    @field_validator("language")
    @classmethod
    def _language(cls, value: str) -> str:
        if not value or len(value) > 20 or value != value.strip():
            raise ValueError("language is malformed")
        return value

    @model_validator(mode="after")
    def _row_invariants(self) -> "SourceUnitRowV1":
        if self.char_end <= self.char_start:
            raise ValueError("source unit range is empty")
        if self.char_end - self.char_start != len(self.text):
            raise ValueError("source unit offsets and text disagree")
        if hashlib.sha256(self.text.encode("utf-8")).hexdigest() != self.unit_text_sha256:
            raise ValueError("source unit text hash mismatch")
        return self


class UnitEmbeddingRecordV1(RetrievalContract):
    schema_version: Literal["unit-embedding-record-v1.0"] = "unit-embedding-record-v1.0"
    run_id: str
    document_id: str
    unit_id: str
    unit_text_sha256: str
    embedding_model_requested: Literal["research-embedding"] = EMBEDDING_MODEL_REQUESTED
    embedding_model_resolved: Literal["qwen3-embedding:8b"] = EMBEDDING_MODEL_RESOLVED
    dimension: Literal[4096] = EMBEDDING_DIMENSION
    numeric_storage: Literal["float32"] = "float32"
    normalized: Literal[True] = True
    vector_index: int = Field(ge=0)
    produced_at: datetime
    record_sha256: str

    @field_validator("run_id", "document_id", "unit_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("unit_text_sha256", "record_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _record_invariants(self) -> "UnitEmbeddingRecordV1":
        expected = canonical_contract_sha256(self, omit={"record_sha256"})
        if self.record_sha256 != expected:
            raise ValueError("embedding record hash mismatch")
        return self


class UnitSizeDistributionV1(RetrievalContract):
    minimum: int = Field(ge=1)
    maximum: int = Field(ge=1)
    p50: int = Field(ge=1)
    p95: int = Field(ge=1)
    total: int = Field(ge=1)

    @model_validator(mode="after")
    def _ordered(self) -> "UnitSizeDistributionV1":
        if not self.minimum <= self.p50 <= self.p95 <= self.maximum:
            raise ValueError("unit size distribution is inconsistent")
        return self


class RetrievalIndexManifestV1(RetrievalContract):
    schema_version: Literal["retrieval-index-manifest-v1.1"] = (
        "retrieval-index-manifest-v1.1"
    )
    index_id: str
    run_id: str
    build_host_id: Literal["mac-studio", "synthetic"]
    unit_schema_version: Literal["citation-units-v2.0"] = "citation-units-v2.0"
    embedding_model_requested: Literal["research-embedding"] = EMBEDDING_MODEL_REQUESTED
    embedding_model_resolved: Literal["qwen3-embedding:8b"] = EMBEDDING_MODEL_RESOLVED
    embedding_dimension: Literal[4096] = EMBEDDING_DIMENSION
    numeric_storage: Literal["float32"] = "float32"
    unit_count: int = Field(ge=1)
    document_count: int = Field(ge=1)
    source_policy_snapshot_sha256: str
    testimony_policy_version: str
    database_sha256: str
    vectors_sha256: str
    embedding_records_sha256: str
    analysis_rows_rejected: int = Field(ge=0)
    unit_size_distribution: UnitSizeDistributionV1
    sqlite_integrity_check: Literal["ok"] = "ok"
    exact_backend_version: Literal["sqlite-fts5-numpy-cosine-v1.0"] = (
        "sqlite-fts5-numpy-cosine-v1.0"
    )
    sealed_at: datetime
    restore_test_status: Literal["passed"] = "passed"
    manifest_sha256: str

    @field_validator("index_id", "run_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator(
        "source_policy_snapshot_sha256", "database_sha256", "vectors_sha256",
        "embedding_records_sha256", "manifest_sha256",
    )
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _manifest_invariants(self) -> "RetrievalIndexManifestV1":
        expected = canonical_contract_sha256(self, omit={"manifest_sha256"})
        if self.manifest_sha256 != expected:
            raise ValueError("retrieval index manifest hash mismatch")
        return self


class RetrievalQueryV1(RetrievalContract):
    schema_version: Literal["retrieval-query-v1.0"] = "retrieval-query-v1.0"
    query_id: str
    requesting_document_id: str
    components: tuple[str, ...]
    analysis_sha256: str
    source_metadata_sha256: str
    query_sha256: str

    @field_validator("query_id", "requesting_document_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("analysis_sha256", "source_metadata_sha256", "query_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("components")
    @classmethod
    def _components(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if not value or value != tuple(dict.fromkeys(value)):
            raise ValueError("query components must be non-empty and unique")
        if any(not row or row != row.strip() or len(row) > 1000 for row in value):
            raise ValueError("query component is malformed")
        return value

    @model_validator(mode="after")
    def _query_invariants(self) -> "RetrievalQueryV1":
        if self.query_sha256 != canonical_contract_sha256(self, omit={"query_sha256"}):
            raise ValueError("retrieval query hash mismatch")
        return self


class RetrievalHitV1(RetrievalContract):
    schema_version: Literal["retrieval-hit-v1.0"] = "retrieval-hit-v1.0"
    index_id: str
    document_id: str
    unit_id: str
    source_family_id: str
    stance: Literal["supporting", "opposed", "neutral", "unknown"]
    language: str
    char_start: int = Field(ge=0)
    char_end: int = Field(gt=0)
    text: str = Field(min_length=1)
    unit_text_sha256: str
    vector_rank: int | None = Field(default=None, ge=1)
    lexical_rank: int | None = Field(default=None, ge=1)
    vector_score: float | None = None
    lexical_score: float | None = None
    fused_score: float = Field(ge=0)
    final_rank: int = Field(ge=1)

    @field_validator("index_id", "document_id", "unit_id", "source_family_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("unit_text_sha256")
    @classmethod
    def _hash(cls, value: str) -> str:
        return require_sha256(value, field="unit_text_sha256")

    @model_validator(mode="after")
    def _hit_invariants(self) -> "RetrievalHitV1":
        if self.char_end - self.char_start != len(self.text):
            raise ValueError("retrieval hit offsets and text disagree")
        if hashlib.sha256(self.text.encode("utf-8")).hexdigest() != self.unit_text_sha256:
            raise ValueError("retrieval hit text hash mismatch")
        if self.vector_rank is None and self.lexical_rank is None:
            raise ValueError("retrieval hit has no retrieval path")
        return self


class RetrievalExclusionV1(RetrievalContract):
    document_id: str
    reason: Literal["requesting_document", "family_cap", "context_limit"]

    @field_validator("document_id")
    @classmethod
    def _id(cls, value: str) -> str:
        return require_safe_id(value, field="document_id")


class RetrievalContextV1(RetrievalContract):
    schema_version: Literal["retrieval-context-v1.0"] = "retrieval-context-v1.0"
    context_id: str
    index_id: str
    index_manifest_sha256: str
    retrieval_policy_version: Literal["hybrid-rrf-source-only-v1.0"] = (
        "hybrid-rrf-source-only-v1.0"
    )
    query: RetrievalQueryV1
    selected_hits: tuple[RetrievalHitV1, ...]
    exclusions: tuple[RetrievalExclusionV1, ...] = ()
    retrieval_scope: Literal[
        "cross_document_source_grounding",
        "within_document_source_grounding",
    ]
    cross_document_support_present: bool
    per_family_cap: int = Field(ge=1, le=20)
    contradiction_slots_requested: int = Field(ge=0, le=10)
    contradiction_slots_filled: int = Field(ge=0, le=10)
    context_char_count: int = Field(ge=1)
    content_audit_sha256: str
    context_sha256: str

    @field_validator("context_id", "index_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("index_manifest_sha256", "content_audit_sha256", "context_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _context_invariants(self) -> "RetrievalContextV1":
        if not self.selected_hits:
            raise ValueError("retrieval context cannot be empty")
        if tuple(row.final_rank for row in self.selected_hits) != tuple(
            range(1, len(self.selected_hits) + 1)
        ):
            raise ValueError("retrieval context hits are not ordered")
        if any(row.index_id != self.index_id for row in self.selected_hits):
            raise ValueError("cross-index retrieval hit")
        if len({(row.document_id, row.unit_id) for row in self.selected_hits}) != len(self.selected_hits):
            raise ValueError("duplicate retrieval unit")
        if self.context_char_count != sum(len(row.text) for row in self.selected_hits):
            raise ValueError("retrieval context character count mismatch")
        same_document = all(
            row.document_id == self.query.requesting_document_id
            for row in self.selected_hits
        )
        if self.retrieval_scope == "within_document_source_grounding":
            if not same_document or self.cross_document_support_present:
                raise ValueError("within-document retrieval scope mismatch")
            if any(row.stance in {"supporting", "opposed"} for row in self.selected_hits):
                raise ValueError("within-document hits cannot claim independent stance")
            if self.contradiction_slots_requested or self.contradiction_slots_filled:
                raise ValueError("within-document contradiction budget must be zero")
        elif same_document or not self.cross_document_support_present:
            raise ValueError("cross-document retrieval scope mismatch")
        filled = sum(row.stance == "opposed" for row in self.selected_hits)
        if self.contradiction_slots_filled != min(filled, self.contradiction_slots_requested):
            raise ValueError("contradiction slot accounting mismatch")
        expected_audit = hashlib.sha256(json.dumps({
            "index_id": self.index_id,
            "query_sha256": self.query.query_sha256,
            "retrieval_scope": self.retrieval_scope,
            "cross_document_support_present": self.cross_document_support_present,
            "unit_ids": [[row.document_id, row.unit_id] for row in self.selected_hits],
            "unit_hashes": [row.unit_text_sha256 for row in self.selected_hits],
        }, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        if self.content_audit_sha256 != expected_audit:
            raise ValueError("retrieval content audit hash mismatch")
        if self.context_sha256 != canonical_contract_sha256(self, omit={"context_sha256"}):
            raise ValueError("retrieval context hash mismatch")
        return self
