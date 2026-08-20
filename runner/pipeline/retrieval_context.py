"""Immutable source evidence packs and fail-closed grounded Enrichment boundary."""
from __future__ import annotations

import hashlib
import json
from typing import Any, Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from runner.models.reprocessing import require_safe_id, require_sha256
from runner.models.retrieval import (
    RetrievalContextV1,
    RetrievalExclusionV1,
    RetrievalHitV1,
    RetrievalQueryV1,
    canonical_contract_sha256,
)


class RetrievalContextError(ValueError):
    """Content-free retrieval/Enrichment boundary failure."""


def _canonical_sha(value: Any) -> str:
    return hashlib.sha256(json.dumps(
        value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), default=str,
    ).encode()).hexdigest()


def build_retrieval_query(
    *, query_id: str, requesting_document_id: str,
    analysis_payload: dict[str, Any], source_metadata: dict[str, Any],
) -> RetrievalQueryV1:
    components: list[str] = []
    for key in ("title", "author", "language", "source_type"):
        value = source_metadata.get(key)
        if isinstance(value, str) and value.strip():
            components.append(value.strip())
    for key in ("type", "format", "scope", "summary"):
        value = analysis_payload.get(key)
        if isinstance(value, str) and value.strip():
            components.append(value.strip()[:1000])
    for key in ("tactic", "evidence", "candidate_terms"):
        value = analysis_payload.get(key)
        if isinstance(value, list):
            for row in value[:20]:
                if isinstance(row, str) and row.strip():
                    components.append(row.strip()[:1000])
                elif isinstance(row, dict):
                    text = row.get("term") or row.get("name") or row.get("label")
                    if isinstance(text, str) and text.strip():
                        components.append(text.strip()[:1000])
    components = list(dict.fromkeys(components))[:50]
    if not components:
        raise RetrievalContextError("retrieval_query_has_no_components")
    values = dict(
        schema_version="retrieval-query-v1.0", query_id=query_id,
        requesting_document_id=requesting_document_id,
        components=tuple(components), analysis_sha256=_canonical_sha(analysis_payload),
        source_metadata_sha256=_canonical_sha(source_metadata), query_sha256="0" * 64,
    )
    draft = RetrievalQueryV1.model_construct(**values)
    values["query_sha256"] = canonical_contract_sha256(draft, omit={"query_sha256"})
    return RetrievalQueryV1.model_validate(values)


def build_retrieval_context(
    *, context_id: str, index_manifest_sha256: str, query: RetrievalQueryV1,
    hits: tuple[RetrievalHitV1, ...], exclusions: tuple[RetrievalExclusionV1, ...],
    per_family_cap: int, contradiction_slots: int,
) -> RetrievalContextV1:
    if not hits:
        raise RetrievalContextError("retrieval_context_has_no_hits")
    index_id = hits[0].index_id
    audit_sha = hashlib.sha256(json.dumps({
        "index_id": index_id, "query_sha256": query.query_sha256,
        "unit_ids": [[row.document_id, row.unit_id] for row in hits],
        "unit_hashes": [row.unit_text_sha256 for row in hits],
    }, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    values = dict(
        schema_version="retrieval-context-v1.0", context_id=context_id,
        index_id=index_id, index_manifest_sha256=index_manifest_sha256,
        retrieval_policy_version="hybrid-rrf-source-only-v1.0", query=query,
        selected_hits=hits, exclusions=exclusions, per_family_cap=per_family_cap,
        contradiction_slots_requested=contradiction_slots,
        contradiction_slots_filled=min(
            contradiction_slots, sum(row.stance == "opposed" for row in hits),
        ),
        context_char_count=sum(len(row.text) for row in hits),
        content_audit_sha256=audit_sha, context_sha256="0" * 64,
    )
    draft = RetrievalContextV1.model_construct(**values)
    values["context_sha256"] = canonical_contract_sha256(draft, omit={"context_sha256"})
    return RetrievalContextV1.model_validate(values)


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class GroundedEnrichmentRequestV1(_Strict):
    schema_version: Literal["grounded-enrichment-request-v1.0"] = (
        "grounded-enrichment-request-v1.0"
    )
    run_id: str
    document_id: str
    analysis_sha256: str
    retrieval_context: RetrievalContextV1
    lexicon_snapshot_sha256: str
    entity_snapshot_sha256: str
    requested_model: str
    prompt_version: str
    request_sha256: str

    @field_validator("run_id", "document_id", "requested_model", "prompt_version")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator(
        "analysis_sha256", "lexicon_snapshot_sha256", "entity_snapshot_sha256",
        "request_sha256",
    )
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _request_invariants(self) -> "GroundedEnrichmentRequestV1":
        if self.retrieval_context.query.requesting_document_id != self.document_id:
            raise ValueError("grounded Enrichment document/context mismatch")
        if self.retrieval_context.query.analysis_sha256 != self.analysis_sha256:
            raise ValueError("grounded Enrichment analysis/context mismatch")
        if self.request_sha256 != canonical_contract_sha256(self, omit={"request_sha256"}):
            raise ValueError("grounded Enrichment request hash mismatch")
        return self


def build_grounded_enrichment_request(
    *, run_id: str, document_id: str, analysis_payload: dict[str, Any],
    context: RetrievalContextV1, lexicon_snapshot_sha256: str,
    entity_snapshot_sha256: str, requested_model: str,
    prompt_version: str = "enrichment-v1.1-grounded",
) -> GroundedEnrichmentRequestV1:
    values = dict(
        schema_version="grounded-enrichment-request-v1.0", run_id=run_id,
        document_id=document_id, analysis_sha256=_canonical_sha(analysis_payload),
        retrieval_context=context, lexicon_snapshot_sha256=lexicon_snapshot_sha256,
        entity_snapshot_sha256=entity_snapshot_sha256, requested_model=requested_model,
        prompt_version=prompt_version, request_sha256="0" * 64,
    )
    draft = GroundedEnrichmentRequestV1.model_construct(**values)
    values["request_sha256"] = canonical_contract_sha256(draft, omit={"request_sha256"})
    return GroundedEnrichmentRequestV1.model_validate(values)


class GroundedEnrichmentExecutor(Protocol):
    def execute(self, request: GroundedEnrichmentRequestV1) -> dict[str, Any]: ...


def validate_grounded_enrichment_output(
    request: GroundedEnrichmentRequestV1, payload: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise RetrievalContextError("grounded_enrichment_output_not_object")
    if payload.get("document_id") != request.document_id:
        raise RetrievalContextError("grounded_enrichment_output_document_mismatch")
    if payload.get("retrieval_context_sha256") != request.retrieval_context.context_sha256:
        raise RetrievalContextError("grounded_enrichment_output_context_mismatch")
    allowed_docs = {row.document_id for row in request.retrieval_context.selected_hits}
    allowed_units = {
        (row.document_id, row.unit_id) for row in request.retrieval_context.selected_hits
    }
    connections = payload.get("corpus_connections", [])
    if not isinstance(connections, list):
        raise RetrievalContextError("grounded_enrichment_connections_not_list")
    for row in connections:
        if not isinstance(row, dict) or row.get("document_id") not in allowed_docs:
            raise RetrievalContextError("grounded_enrichment_invented_document")
        key = (row.get("document_id"), row.get("unit_id"))
        if key not in allowed_units:
            raise RetrievalContextError("grounded_enrichment_invalid_locator")
    output = dict(payload)
    output["output_sha256"] = _canonical_sha(payload)
    return output


def execute_grounded_enrichment(
    request: GroundedEnrichmentRequestV1, executor: GroundedEnrichmentExecutor,
) -> dict[str, Any]:
    return validate_grounded_enrichment_output(request, executor.execute(request))
