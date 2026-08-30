"""Unified semantic campaign contracts and additive factory adapters.

This module deliberately owns no transfer daemon, queue database, worker
database, or canonical review registry.  It binds the accepted semantic runtime
to the existing authenticated factory protocol and exposes read-only inventory
and review projections for the two Streamlit consoles.
"""
from __future__ import annotations

import hashlib
import json
import tarfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Literal, Mapping, Protocol

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from runner.models.reprocessing import (
    AnalysisLexiconSnapshotV1,
    AnalysisLexiconTermV1,
    AnalysisLexiconVariantV1,
    CampaignSourceReferenceV1,
    ImmutableArtifactManifestV1,
    ResultArtifactEntryV1,
    require_relative_path,
    require_safe_id,
    require_sha256,
)
from runner.pipeline.factory_messages import canonical_json_bytes, sha256_bytes
from runner.pipeline.factory_station_adapters import StationMaterial
from runner.pipeline.source_queue import exclusion_reason, list_items, open_db_readonly


SEMANTIC_CAMPAIGN_STATIONS = (
    "source_verify",
    "canonical_text_prepare",
    "complete_units_v2",
    "independent_analysis",
    "primary_and_comparison_compilation",
    "unit_embeddings",
    "frozen_index",
    "grounded_enrichment",
    "sealed_results",
)
SEMANTIC_ROUTE_PURPOSES = (
    "section_mapper",
    "qwen38_mapper_repair",
    "document_compiler",
    "qwen38_compiler_candidate",
    "qwen_embedding",
    "bge_shadow",
    "grounded_enrichment",
)
SEMANTIC_RESULT_ALLOW_LIST = (
    "analysis",
    "compiler-input",
    "compilers",
    "enrichment",
    "retrieval",
    "anchor_candidates.json",
    "content_free_failures.json",
    "execution_summary.json",
    "index_manifest.json",
    "model_receipts.json",
    "pilot_projection.json",
    "researcher_comparison_report.json",
    "route_provenance.json",
    "source_partition_manifest.json",
)
SEMANTIC_CONFIRMATION = (
    "I approve this exact frozen semantic campaign for local Mac Studio processing only."
)


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


def _contract_sha(value: BaseModel, *, omit: set[str]) -> str:
    payload = value.model_dump(mode="json", exclude=omit)
    return hashlib.sha256(json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")).hexdigest()


class SemanticDocumentV1(_Strict):
    document_id: str
    title: str = Field(min_length=1, max_length=300)
    source_sha256: str
    source_bytes: int = Field(ge=1)
    source_characters: int = Field(ge=1)
    safe_display_filename: str = Field(min_length=1, max_length=255)
    media_type: Literal["text/plain", "text/markdown"]
    language: str = Field(min_length=2, max_length=20)
    source_family_id: str
    stance: Literal["supporting", "opposed", "neutral", "unknown"] = "unknown"
    inventory_origin: Literal["source_queue", "corpus", "synthetic_fixture"]
    source_available: Literal[True] = True
    canonical_quality: Literal["complete"] = "complete"
    prior_analysis: bool = False

    @field_validator("document_id", "source_family_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("source_sha256")
    @classmethod
    def _hash(cls, value: str) -> str:
        return require_sha256(value, field="source_sha256")

    @field_validator("title", "safe_display_filename", "language")
    @classmethod
    def _bounded_text(cls, value: str, info) -> str:
        if value != value.strip() or any(char in value for char in ("\n", "\r", "\x00")):
            raise ValueError(f"{info.field_name} is not canonical text")
        if info.field_name == "safe_display_filename" and Path(value).name != value:
            raise ValueError("safe_display_filename must not contain a path")
        return value


class SemanticRoutesV1(_Strict):
    section_mapper: Literal["core-qwen"] = "core-qwen"
    qwen38_mapper_repair: Literal["compiler-qwen38"] = "compiler-qwen38"
    document_compiler: Literal["core-gemma"] = "core-gemma"
    qwen38_compiler_candidate: Literal["compiler-qwen38"] = "compiler-qwen38"
    qwen_embedding: Literal["research-embedding"] = "research-embedding"
    bge_shadow: Literal["bge-m3-shadow"] = "bge-m3-shadow"
    grounded_enrichment: Literal["core-gemma"] = "core-gemma"


class SemanticMemoryPolicyV1(_Strict):
    global_model_lease: Literal[True] = True
    maximum_resident_models: Literal[1] = 1
    route_transition_concurrency: Literal[1] = 1
    explicit_unload_required: Literal[True] = True
    maximum_swap_growth_bytes: int = Field(default=2 * 1024**3, ge=0, le=8 * 1024**3)


class SemanticCampaignApprovalV1(_Strict):
    schema_version: Literal["semantic-campaign-approval-v1.0"] = (
        "semantic-campaign-approval-v1.0"
    )
    approval_id: str
    run_id: str
    researcher_id: str
    researcher_confirmation_text: Literal[
        "I approve this exact frozen semantic campaign for local Mac Studio processing only."
    ]
    approved_at: datetime
    expires_at: datetime
    documents: tuple[SemanticDocumentV1, ...]
    lexicon_snapshot_id: str
    lexicon_snapshot_sha256: str
    station_ids: tuple[str, ...] = SEMANTIC_CAMPAIGN_STATIONS
    routes: SemanticRoutesV1 = SemanticRoutesV1()
    complete_text_version: Literal["canonical-text-v2.0"] = "canonical-text-v2.0"
    sections_version: Literal["sections-v2.0"] = "sections-v2.0"
    citation_units_version: Literal["citation-units-v2.0"] = "citation-units-v2.0"
    analysis_prompt_version: Literal["ingestion-v3.3"] = "ingestion-v3.3"
    analysis_policy_version: Literal["independent-sections-v1.0"] = (
        "independent-sections-v1.0"
    )
    maximum_attempts_per_document: int = Field(default=2, ge=1, le=3)
    memory_policy: SemanticMemoryPolicyV1 = SemanticMemoryPolicyV1()
    remote_writes: Literal[False] = False
    corpus_import: Literal[False] = False
    publication: Literal[False] = False
    automatic_promotion: Literal[False] = False
    approval_sha256: str

    @field_validator("approval_id", "run_id", "researcher_id", "lexicon_snapshot_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("lexicon_snapshot_sha256", "approval_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _invariants(self) -> "SemanticCampaignApprovalV1":
        if not 1 <= len(self.documents) <= 12:
            raise ValueError("semantic campaign requires 1–12 explicit documents")
        ids = tuple(row.document_id for row in self.documents)
        if ids != tuple(sorted(set(ids))):
            raise ValueError("semantic campaign documents must be sorted and unique")
        hashes = tuple(row.source_sha256 for row in self.documents)
        if len(set(hashes)) != len(hashes):
            raise ValueError("semantic campaign source hashes must be unique")
        if self.station_ids != SEMANTIC_CAMPAIGN_STATIONS:
            raise ValueError("semantic campaign station sequence changed")
        if self.expires_at <= self.approved_at:
            raise ValueError("semantic campaign approval expiry is invalid")
        if self.approval_sha256 != _contract_sha(self, omit={"approval_sha256"}):
            raise ValueError("semantic campaign approval hash mismatch")
        return self

    def assert_current(self, now: datetime) -> None:
        if now.tzinfo is None or now.utcoffset() is None:
            raise ValueError("approval observation time must include a timezone")
        if now < self.approved_at or now >= self.expires_at:
            raise ValueError("semantic campaign approval is not current")


class SemanticCampaignJobV1(_Strict):
    schema_version: Literal["semantic-campaign-job-v1.0"] = "semantic-campaign-job-v1.0"
    run_id: str
    package_id: str
    document_id: str
    station_id: str
    station_sequence: int = Field(ge=1, le=9)
    predecessor_station_id: str = ""
    predecessor_output_sha256: str = ""
    source_reference: CampaignSourceReferenceV1
    input_fingerprint: str
    executor_version: Literal["unified-semantic-station-adapter-v1.0"] = (
        "unified-semantic-station-adapter-v1.0"
    )
    policy_version: Literal["unified-semantic-campaign-policy-v1.0"] = (
        "unified-semantic-campaign-policy-v1.0"
    )
    maximum_attempts: int = Field(default=2, ge=1, le=3)
    retry_classification: Literal["bounded_infrastructure_only"] = (
        "bounded_infrastructure_only"
    )
    barrier_id: str

    @field_validator("run_id", "package_id", "document_id", "station_id", "barrier_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("predecessor_station_id")
    @classmethod
    def _optional_id(cls, value: str) -> str:
        return require_safe_id(value, field="predecessor_station_id") if value else value

    @field_validator("predecessor_output_sha256", "input_fingerprint")
    @classmethod
    def _job_hashes(cls, value: str, info) -> str:
        if value or info.field_name == "input_fingerprint":
            return require_sha256(value, field=info.field_name)
        return value

    @model_validator(mode="after")
    def _job_invariants(self) -> "SemanticCampaignJobV1":
        if self.station_id not in SEMANTIC_CAMPAIGN_STATIONS:
            raise ValueError("semantic job station is not authorized")
        expected = SEMANTIC_CAMPAIGN_STATIONS.index(self.station_id) + 1
        if self.station_sequence != expected:
            raise ValueError("semantic job station sequence changed")
        predecessor = "" if expected == 1 else SEMANTIC_CAMPAIGN_STATIONS[expected - 2]
        if self.predecessor_station_id != predecessor:
            raise ValueError("semantic job predecessor changed")
        if self.source_reference.doc_id != self.document_id:
            raise ValueError("semantic job source identity mismatch")
        return self


class SemanticCampaignPackageV1(_Strict):
    schema_version: Literal["semantic-campaign-package-v1.0"] = (
        "semantic-campaign-package-v1.0"
    )
    run_id: str
    package_id: str
    document_ids: tuple[str, ...]
    jobs: tuple[SemanticCampaignJobV1, ...]

    @field_validator("run_id", "package_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @model_validator(mode="after")
    def _package_invariants(self) -> "SemanticCampaignPackageV1":
        if self.document_ids != tuple(sorted(set(self.document_ids))):
            raise ValueError("semantic package document IDs must be sorted and unique")
        expected = tuple(
            (document_id, station)
            for station in SEMANTIC_CAMPAIGN_STATIONS
            for document_id in self.document_ids
        )
        actual = tuple(
            (job.document_id, job.station_id)
            for job in sorted(self.jobs, key=lambda row: (row.station_sequence, row.document_id))
        )
        if actual != expected:
            raise ValueError("semantic package must bind every document/station pair")
        return self


class SemanticCampaignV1(_Strict):
    schema_version: Literal["semantic-production-campaign-v1.0"] = (
        "semantic-production-campaign-v1.0"
    )
    run_id: str
    campaign_id: str
    execution_mode: Literal["production_semantic_campaign"] = "production_semantic_campaign"
    created_at: datetime
    creator_id: Literal["macbook-production-controller-v1"] = (
        "macbook-production-controller-v1"
    )
    approval_id: str
    approval_sha256: str
    document_ids: tuple[str, ...]
    source_references: tuple[CampaignSourceReferenceV1, ...]
    package_id: str
    package_manifest_sha256: str
    lexicon_snapshot_id: str
    lexicon_snapshot_sha256: str
    lexicon_snapshot_relative_path: str
    authorized_station_ids: tuple[str, ...] = SEMANTIC_CAMPAIGN_STATIONS
    stage_barriers: tuple[str, ...] = SEMANTIC_CAMPAIGN_STATIONS
    routes: SemanticRoutesV1 = SemanticRoutesV1()
    memory_policy: SemanticMemoryPolicyV1 = SemanticMemoryPolicyV1()
    result_allow_list: tuple[str, ...] = SEMANTIC_RESULT_ALLOW_LIST
    authenticated_receipts_required: Literal[True] = True
    authenticated_result_manifests_required: Literal[True] = True
    remote_writes: Literal[False] = False
    corpus_import: Literal[False] = False
    publication: Literal[False] = False
    automatic_promotion: Literal[False] = False

    @field_validator("run_id", "campaign_id", "approval_id", "package_id", "lexicon_snapshot_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("approval_sha256", "package_manifest_sha256", "lexicon_snapshot_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("lexicon_snapshot_relative_path")
    @classmethod
    def _path(cls, value: str) -> str:
        return require_relative_path(value, field="lexicon_snapshot_relative_path")

    @model_validator(mode="after")
    def _campaign_invariants(self) -> "SemanticCampaignV1":
        if self.authorized_station_ids != SEMANTIC_CAMPAIGN_STATIONS:
            raise ValueError("semantic campaign station authority changed")
        if self.stage_barriers != SEMANTIC_CAMPAIGN_STATIONS:
            raise ValueError("semantic campaign barriers changed")
        if self.result_allow_list != SEMANTIC_RESULT_ALLOW_LIST:
            raise ValueError("semantic campaign result allow-list changed")
        if self.document_ids != tuple(row.doc_id for row in self.source_references):
            raise ValueError("semantic campaign source references are incomplete")
        expected_snapshot = f"campaigns/{self.run_id}/semantic/lexicon_snapshot.json"
        if self.lexicon_snapshot_relative_path != expected_snapshot:
            raise ValueError("semantic lexicon snapshot path is not run-scoped")
        return self


def build_semantic_approval(values: Mapping[str, Any]) -> SemanticCampaignApprovalV1:
    payload = dict(values)
    payload["documents"] = tuple(
        SemanticDocumentV1.model_validate(row) for row in payload["documents"]
    )
    payload.setdefault("approval_sha256", "0" * 64)
    draft = SemanticCampaignApprovalV1.model_construct(**payload)
    payload["approval_sha256"] = _contract_sha(draft, omit={"approval_sha256"})
    return SemanticCampaignApprovalV1.model_validate(payload)


def freeze_trusted_lexicon_snapshot(
    terms: list[dict[str, Any]], *, snapshot_id: str, source_version: str,
    created_at: datetime,
) -> AnalysisLexiconSnapshotV1:
    """Freeze exactly the existing Analysis trust rule into one immutable snapshot."""
    trusted: dict[str, AnalysisLexiconTermV1] = {}
    for raw in terms:
        status = str(raw.get("status") or "")
        if status != "validated" and not (
            status == "draft" and raw.get("includeInAnalysisLexicon") is True
        ):
            continue
        preferred = str(raw.get("term") or "").strip()
        if not preferred:
            continue
        term_id = str(raw.get("_id") or f"term-{hashlib.sha256(preferred.casefold().encode()).hexdigest()[:20]}")
        variants = []
        for variant in raw.get("multilingualVariants") or []:
            language = str(variant.get("language") or "").strip().lower()
            value = str(variant.get("variantTerm") or "").strip()
            if language and value:
                variants.append(AnalysisLexiconVariantV1(language=language, value=value))
        definition = str(raw.get("definition") or raw.get("function") or "Trusted analysis vocabulary.").strip()
        trusted[term_id] = AnalysisLexiconTermV1(
            term_id=term_id, preferred_term=preferred, definition=definition,
            variants=tuple(sorted(set(variants), key=lambda row: (row.language, row.value))),
        )
    rows = tuple(sorted(trusted.values(), key=lambda row: row.term_id))
    payload = {
        "snapshot_id": snapshot_id,
        "source_version": source_version,
        "created_at": created_at,
        "terms": rows,
        "canonical_sha256": "0" * 64,
    }
    draft = AnalysisLexiconSnapshotV1.model_construct(**payload)
    payload["canonical_sha256"] = _contract_sha(draft, omit={"canonical_sha256"})
    return AnalysisLexiconSnapshotV1.model_validate(payload)


@dataclass(frozen=True)
class SourceInventoryRow:
    document_id: str
    title: str
    source_path: Path | None
    origin: str
    language: str
    media_type: str
    byte_count: int
    source_sha256: str
    source_characters: int
    prior_analysis: bool
    eligible: bool
    hold_reason: str

    def display(self) -> dict[str, Any]:
        """Safe UI projection intentionally omitting all host and database paths."""
        return {
            "document_id": self.document_id,
            "title": self.title,
            "origin": self.origin,
            "language": self.language,
            "type": self.media_type,
            "bytes": self.byte_count,
            "source_sha256": self.source_sha256,
            "source_available": self.source_path is not None,
            "canonical_quality": "complete" if self.eligible else "held",
            "prior_analysis": self.prior_analysis,
            "eligible": self.eligible,
            "hold_reason": self.hold_reason,
        }


def _inventory_file(
    *, document_id: str, title: str, path: Path | None, origin: str,
    language: str = "unknown", prior_analysis: bool = False, hold_reason: str = "",
) -> SourceInventoryRow:
    if path is None or path.is_symlink() or not path.is_file():
        return SourceInventoryRow(
            document_id, title or document_id, None, origin, language, "text/plain",
            0, "", 0, prior_analysis, False, hold_reason or "source_file_not_found",
        )
    data = path.read_bytes()
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        return SourceInventoryRow(
            document_id, title or document_id, path, origin, language, "text/plain",
            len(data), sha256_bytes(data), 0, prior_analysis, False, "not_strict_utf8",
        )
    reason = hold_reason
    if not text:
        reason = reason or "source_empty"
    if "\x00" in text:
        reason = reason or "source_contains_nul"
    if "[TRUNCATED MIDDLE" in text:
        reason = reason or "historical_truncation_marker"
    media = "text/markdown" if path.suffix.lower() == ".md" else "text/plain"
    return SourceInventoryRow(
        document_id, title or document_id, path, origin, language, media,
        len(data), sha256_bytes(data), len(text), prior_analysis, not reason, reason,
    )


def source_queue_inventory(queue_database: Path, *, limit: int = 500) -> tuple[SourceInventoryRow, ...]:
    """Read the established Source Queue through its read-only connection API."""
    connection = open_db_readonly(queue_database)
    try:
        rows = list_items(connection, limit=limit)
    finally:
        connection.close()
    result = []
    for item in rows:
        source = Path(item.source_file_path).expanduser() if item.source_file_path.strip() else None
        result.append(_inventory_file(
            document_id=item.corpus_doc_id or f"queue-{item.id}",
            title=item.title or item.url or item.id,
            path=source, origin="source_queue", language="unknown",
            prior_analysis=bool(item.corpus_doc_id), hold_reason=exclusion_reason(item),
        ))
    return tuple(result)


def corpus_inventory(corpus_root: Path) -> tuple[SourceInventoryRow, ...]:
    """Report copied corpus artifacts without mutating or opening any database."""
    root = Path(corpus_root)
    if not root.is_dir():
        return ()
    result = []
    for document_dir in sorted(root.iterdir(), key=lambda path: path.name):
        if not document_dir.is_dir() or document_dir.name.startswith("."):
            continue
        source = next((
            path for path in (
                document_dir / "extracted.txt", document_dir / "extracted.md",
                document_dir / "source.txt", document_dir / "source.md",
            ) if path.is_file()
        ), None)
        metadata = {}
        for name in ("preprocess.json", "analysis.json", "intake.json"):
            candidate = document_dir / name
            if candidate.is_file():
                try:
                    value = json.loads(candidate.read_text(encoding="utf-8"))
                    if isinstance(value, dict):
                        metadata.update(value)
                except (OSError, UnicodeError, json.JSONDecodeError):
                    pass
        result.append(_inventory_file(
            document_id=document_dir.name,
            title=str(metadata.get("title") or metadata.get("source_title") or document_dir.name),
            path=source, origin="corpus",
            language=str(metadata.get("language") or "unknown")[:20],
            prior_analysis=(document_dir / "analysis.json").is_file(),
        ))
    return tuple(result)


class SemanticStationAdapter(Protocol):
    def execute(
        self, *, campaign: SemanticCampaignV1, approval: SemanticCampaignApprovalV1,
        job: SemanticCampaignJobV1, run_state: Path, completed_at: datetime,
    ) -> StationMaterial: ...


class DeterministicNoModelSemanticAdapter:
    """Safe validation adapter exercising the production contracts with zero models."""

    def execute(
        self, *, campaign: SemanticCampaignV1, approval: SemanticCampaignApprovalV1,
        job: SemanticCampaignJobV1, run_state: Path, completed_at: datetime,
    ) -> StationMaterial:
        if job.station_id in SEMANTIC_CAMPAIGN_STATIONS[:3]:
            raise ValueError("complete-text stations must use existing station adapters")
        payload = {
            "schema_version": "semantic-no-model-station-result-v1.0",
            "run_id": campaign.run_id,
            "document_id": job.document_id,
            "station_id": job.station_id,
            "lexicon_snapshot_sha256": campaign.lexicon_snapshot_sha256,
            "source_only_index": True,
            "same_run_proposals_consumed": False,
            "model_calls": 0,
            "remote_writes": 0,
        }
        name = "station_result.json"
        data = canonical_json_bytes(payload)
        entry = ResultArtifactEntryV1(
            relative_path=name, media_type="application/json", byte_count=len(data),
            sha256=sha256_bytes(data), producing_station=job.station_id,
            document_id=job.document_id, source_sha256=job.source_reference.source_sha256,
            canonical_text_sha256=job.source_reference.source_sha256,
            executor_version=job.executor_version, completed_at=completed_at,
        )
        manifest = ImmutableArtifactManifestV1(
            run_id=job.run_id, package_id=job.package_id, document_id=job.document_id,
            station_id=job.station_id, source_sha256=job.source_reference.source_sha256,
            canonical_text_sha256=job.source_reference.source_sha256,
            executor_version=job.executor_version, completed_at=completed_at,
            artifacts=(entry,),
        )
        return StationMaterial(
            artifacts={name: data}, manifest=manifest,
            manifest_sha256=sha256_bytes(canonical_json_bytes(manifest)),
        )


class AcceptedSemanticRuntimeAdapter:
    """Publish accepted runtime artifacts through durable factory station leases.

    The caller supplies the host-local runner explicitly.  Construction and
    import are inert; a missing runner fails closed and can never fall back to a
    model or network route.  The factory service additionally requires an
    authenticated start command before any station lease can reach this method.
    """

    def __init__(
        self, *, runtime_runner: Callable[..., Path] | None,
    ):
        self.runtime_runner = runtime_runner
        self._sealed_by_run: dict[str, Path] = {}

    @staticmethod
    def _material(
        *, job: SemanticCampaignJobV1, completed_at: datetime,
        files: Mapping[str, bytes],
    ) -> StationMaterial:
        entries = tuple(ResultArtifactEntryV1(
            relative_path=name,
            media_type=("application/gzip" if name.endswith(".tar.gz") else "application/json"),
            byte_count=len(data), sha256=sha256_bytes(data),
            producing_station=job.station_id, document_id=job.document_id,
            source_sha256=job.source_reference.source_sha256,
            canonical_text_sha256=job.source_reference.source_sha256,
            executor_version=job.executor_version, completed_at=completed_at,
        ) for name, data in sorted(files.items()))
        manifest = ImmutableArtifactManifestV1(
            run_id=job.run_id, package_id=job.package_id, document_id=job.document_id,
            station_id=job.station_id, source_sha256=job.source_reference.source_sha256,
            canonical_text_sha256=job.source_reference.source_sha256,
            executor_version=job.executor_version, completed_at=completed_at,
            artifacts=entries,
        )
        return StationMaterial(
            artifacts=dict(files), manifest=manifest,
            manifest_sha256=sha256_bytes(canonical_json_bytes(manifest)),
        )

    def execute(
        self, *, campaign: SemanticCampaignV1, approval: SemanticCampaignApprovalV1,
        job: SemanticCampaignJobV1, run_state: Path, completed_at: datetime,
    ) -> StationMaterial:
        if self.runtime_runner is None:
            raise ValueError("semantic runtime is not explicitly enabled on this host")
        sealed = self._sealed_by_run.get(campaign.run_id)
        if sealed is None:
            sealed = Path(self.runtime_runner(
                campaign=campaign, approval=approval, run_state=Path(run_state),
            ))
            self._sealed_by_run[campaign.run_id] = sealed
        if sealed.is_symlink() or not sealed.is_dir():
            raise ValueError("semantic runtime did not return a sealed result directory")
        document_id = job.document_id
        if job.station_id == "independent_analysis":
            files = {"analysis.json": (sealed / "analysis" / f"{document_id}.json").read_bytes()}
        elif job.station_id == "primary_and_comparison_compilation":
            files = {
                "primary.json": (sealed / "compilers" / f"{document_id}-primary.json").read_bytes(),
                "qwen38-comparison.json": (
                    sealed / "compilers" / f"{document_id}-qwen38-comparison.json"
                ).read_bytes(),
            }
        elif job.station_id == "unit_embeddings":
            files = {"embedding_summary.json": canonical_json_bytes({
                "schema_version": "semantic-embedding-summary-v1.0",
                "run_id": campaign.run_id, "document_id": document_id,
                "primary_route": campaign.routes.qwen_embedding,
                "primary_dimension": 4096,
                "shadow_route": campaign.routes.bge_shadow,
                "shadow_dimension": 1024,
                "raw_vectors_transferred": False,
            })}
        elif job.station_id == "frozen_index":
            files = {
                "index_manifest.json": (sealed / "index_manifest.json").read_bytes(),
                "retrieval_context.json": (
                    sealed / "retrieval" / f"{document_id}-qwen.json"
                ).read_bytes(),
            }
        elif job.station_id == "grounded_enrichment":
            files = {"enrichment.json": (
                sealed / "enrichment" / f"{document_id}.json"
            ).read_bytes()}
        elif job.station_id == "sealed_results":
            files = {
                "execution_summary.json": (sealed / "execution_summary.json").read_bytes(),
                "pilot_projection.json": (sealed / "pilot_projection.json").read_bytes(),
                "researcher_comparison_report.json": (
                    sealed / "researcher_comparison_report.json"
                ).read_bytes(),
            }
        else:
            raise ValueError("unsupported semantic runtime station")
        return self._material(job=job, completed_at=completed_at, files=files)


def verify_run021_results(
    archive: Path, manifest_path: Path, *, expected_archive_sha256: str,
) -> dict[str, Any]:
    """Strict read-only import projection for the accepted Run-021 sealed archive."""
    archive = Path(archive)
    manifest_path = Path(manifest_path)
    data = archive.read_bytes()
    actual_archive_sha = sha256_bytes(data)
    if actual_archive_sha != expected_archive_sha256:
        raise ValueError("sealed results archive identity mismatch")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("archive_sha256") != actual_archive_sha:
        raise ValueError("sealed results manifest/archive mismatch")
    declared = {row["path"]: row for row in manifest.get("members") or []}
    observed: dict[str, bytes] = {}
    with tarfile.open(archive, "r:gz") as handle:
        for member in handle.getmembers():
            if not member.isfile() or member.name not in declared:
                raise ValueError("sealed results contain an undeclared member")
            extracted = handle.extractfile(member)
            if extracted is None:
                raise ValueError("sealed result member is unreadable")
            observed[member.name] = extracted.read()
    if set(observed) != set(declared):
        raise ValueError("sealed results member set mismatch")
    for name, content in observed.items():
        row = declared[name]
        if len(content) != row["bytes"] or sha256_bytes(content) != row["sha256"]:
            raise ValueError("sealed result member identity mismatch")
    projection = json.loads(observed["pilot_projection.json"])
    comparison = json.loads(observed["researcher_comparison_report.json"])
    execution = json.loads(observed["execution_summary.json"])
    enrichments = {
        Path(name).stem: json.loads(content)
        for name, content in observed.items() if name.startswith("enrichment/")
    }
    analyses = {
        Path(name).stem: json.loads(content)
        for name, content in observed.items() if name.startswith("analysis/")
    }
    retrieval = {
        Path(name).stem.removesuffix("-qwen"): json.loads(content)
        for name, content in observed.items()
        if name.startswith("retrieval/") and name.endswith("-qwen.json")
    }
    receipt_log = json.loads(observed["model_receipts.json"])
    receipts = tuple(receipt_log.get("receipts") or ())
    receipt_ids = tuple(row.get("receipt_sha256") for row in receipts)
    if (
        receipt_log.get("schema_version") != "copied-pilot-model-receipts-v1.0"
        or not receipts or len(set(receipt_ids)) != len(receipt_ids)
        or any(not isinstance(value, str) for value in receipt_ids)
    ):
        raise ValueError("sealed model receipt log is incomplete")
    return {
        "schema_version": "semantic-read-only-review-v1.0",
        "campaign_state": "already_complete_read_only",
        "archive_sha256": actual_archive_sha,
        "member_count": len(observed),
        "projection_sha256": projection.get("projection_sha256", ""),
        "model_calls": 0,
        "mutation_count": 0,
        "analysis": analyses,
        "enrichment": enrichments,
        "retrieval": retrieval,
        "comparison": comparison,
        "execution": execution,
        "receipt_count": len(receipts),
        "receipt_gaps": (),
        "methodological_warnings": (
            "Analysis, comparisons, retrieval, and Enrichment remain provisional.",
            "Neither compiler nor embedding ranking is declared correct.",
        ),
    }
