"""Parallel, evidence-bound section Analysis over exact V2 citation units.

The module contains no model client. Callers inject a bounded executor and may
use the durable SQLite store only in host-local state outside transfer trees.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from runner.models.reprocessing import require_safe_id, require_sha256
from runner.models.retrieval import canonical_contract_sha256
from runner.pipeline.citation_units_v2 import CitationUnitsV2, EvidenceSpanV2


REGISTRY_VERSION = "analysis-prompt-registry-v1.0"
PLAN_POLICY_VERSION = "adaptive-section-plan-v1.0"
MAPPER_SCHEMA_RETRY_REASON = "section_mapper_schema_validation_retryable"
MAPPER_OUTPUT_RETRY_REASON = "section_mapper_output_contract_retryable"
MAPPER_REPAIRABLE_REASONS = frozenset({
    MAPPER_SCHEMA_RETRY_REASON,
    MAPPER_OUTPUT_RETRY_REASON,
})


class SectionAnalysisError(ValueError):
    """Deterministic, content-free section hold."""


class RetryableSectionError(RuntimeError):
    """Transient execution failure eligible for bounded retry."""


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class PromptSpecV1(_Strict):
    prompt_id: str
    prompt_version: str
    role: Literal["explicit", "implicit", "counterevidence", "high_consequence"]
    instruction: str
    cue_terms: tuple[str, ...] = ()

    @field_validator("prompt_id", "prompt_version")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)


PROMPT_REGISTRY: dict[str, PromptSpecV1] = {
    row.prompt_id: row for row in (
        PromptSpecV1(
            prompt_id="explicit-claims", prompt_version="explicit-claims-v1.0",
            role="explicit", instruction="Extract explicit claims and findings with exact support.",
        ),
        PromptSpecV1(
            prompt_id="actors-terms", prompt_version="actors-terms-v1.0",
            role="explicit", instruction="Extract named actors, institutions, and source-attested terms.",
        ),
        PromptSpecV1(
            prompt_id="methods-limitations", prompt_version="methods-limitations-v1.0",
            role="explicit", instruction="Extract methods, data limitations, and stated uncertainty.",
            cue_terms=("method", "sample", "interview", "survey", "limitation", "participant"),
        ),
        PromptSpecV1(
            prompt_id="policy-legal", prompt_version="policy-legal-v1.0",
            role="high_consequence", instruction="Extract policy or legal positions without issuing a legal conclusion.",
            cue_terms=("law", "legal", "policy", "regulation", "government", "court", "ban"),
        ),
        PromptSpecV1(
            prompt_id="implicit-framing", prompt_version="implicit-framing-v1.0",
            role="implicit", instruction="Identify implicit framing as a hypothesis and bind any supporting language.",
            cue_terms=("frame", "natural", "normal", "choice", "freedom", "rights", "protect"),
        ),
        PromptSpecV1(
            prompt_id="contradictions", prompt_version="contradictions-v1.0",
            role="counterevidence", instruction="Identify internal tension, qualification, or counterevidence.",
            cue_terms=("however", "although", "but", "contrary", "despite", "uncertain"),
        ),
        PromptSpecV1(
            prompt_id="network-funding", prompt_version="network-funding-v1.0",
            role="high_consequence", instruction="Extract only explicit network or funding assertions with exact support.",
            cue_terms=("fund", "donor", "network", "partner", "affiliate", "grant"),
        ),
    )
}


class ProcessingSectionV1(_Strict):
    schema_version: Literal["processing-section-v1.0"] = "processing-section-v1.0"
    document_id: str
    section_id: str
    sequence: int = Field(ge=1)
    canonical_text_sha256: str
    unit_ids: tuple[str, ...]
    unit_text_sha256s: tuple[str, ...]
    char_start: int = Field(ge=0)
    char_end: int = Field(gt=0)
    text: str = Field(min_length=1)
    text_sha256: str
    overlap_unit_ids: tuple[str, ...] = ()

    @field_validator("document_id", "section_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("canonical_text_sha256", "text_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _section_invariants(self) -> "ProcessingSectionV1":
        if not self.unit_ids or len(set(self.unit_ids)) != len(self.unit_ids):
            raise ValueError("processing section unit IDs must be non-empty and unique")
        if len(self.unit_ids) != len(self.unit_text_sha256s):
            raise ValueError("processing section unit hashes disagree")
        if self.char_end - self.char_start != len(self.text):
            raise ValueError("processing section offsets and text disagree")
        if hashlib.sha256(self.text.encode()).hexdigest() != self.text_sha256:
            raise ValueError("processing section text hash mismatch")
        if any(unit_id not in self.unit_ids for unit_id in self.overlap_unit_ids):
            raise ValueError("overlap unit is not present in section")
        return self


class SectionPromptJobV1(_Strict):
    schema_version: Literal["section-prompt-job-v1.0"] = "section-prompt-job-v1.0"
    run_id: str
    document_id: str
    section_id: str
    job_id: str
    prompt_id: str
    prompt_version: str
    registry_version: Literal["analysis-prompt-registry-v1.0"] = REGISTRY_VERSION
    model_route: str
    repair_model_route: str | None = None
    input_sha256: str
    unit_ids: tuple[str, ...]
    maximum_attempts: int = Field(default=2, ge=1, le=3)
    maximum_output_items: int = Field(default=20, ge=1, le=100)
    job_sha256: str

    @field_validator("run_id", "document_id", "section_id", "job_id", "prompt_id", "prompt_version", "model_route")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("repair_model_route")
    @classmethod
    def _optional_repair_route(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return require_safe_id(value, field="repair_model_route")

    @field_validator("input_sha256", "job_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _job_invariants(self) -> "SectionPromptJobV1":
        spec = PROMPT_REGISTRY.get(self.prompt_id)
        if spec is None or spec.prompt_version != self.prompt_version:
            raise ValueError("unknown or mismatched prompt registry entry")
        if not self.unit_ids or len(set(self.unit_ids)) != len(self.unit_ids):
            raise ValueError("job unit IDs must be non-empty and unique")
        if self.repair_model_route is not None:
            if self.repair_model_route == self.model_route:
                raise ValueError("repair model route must differ from primary route")
            if self.maximum_attempts != 2:
                raise ValueError("repair model route requires exactly two attempts")
        hashes = {canonical_contract_sha256(self, omit={"job_sha256"})}
        if self.repair_model_route is None:
            # Read historical v1.0 jobs whose hash predates the additive null field.
            hashes.add(canonical_contract_sha256(
                self, omit={"job_sha256", "repair_model_route"},
            ))
        if self.job_sha256 not in hashes:
            raise ValueError("section job hash mismatch")
        return self


class AdaptiveAnalysisPlanV1(_Strict):
    schema_version: Literal["adaptive-analysis-plan-v1.0"] = "adaptive-analysis-plan-v1.0"
    run_id: str
    document_id: str
    canonical_text_sha256: str
    registry_version: Literal["analysis-prompt-registry-v1.0"] = REGISTRY_VERSION
    policy_version: Literal["adaptive-section-plan-v1.0"] = PLAN_POLICY_VERSION
    maximum_prompts_per_section: int = Field(ge=2, le=7)
    sections: tuple[ProcessingSectionV1, ...]
    jobs: tuple[SectionPromptJobV1, ...]
    plan_sha256: str

    @field_validator("run_id", "document_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("canonical_text_sha256", "plan_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _plan_invariants(self) -> "AdaptiveAnalysisPlanV1":
        if not self.sections or not self.jobs:
            raise ValueError("analysis plan cannot be empty")
        if tuple(row.sequence for row in self.sections) != tuple(range(1, len(self.sections) + 1)):
            raise ValueError("processing sections are not ordered")
        section_map = {row.section_id: row for row in self.sections}
        if len(section_map) != len(self.sections) or len({row.job_id for row in self.jobs}) != len(self.jobs):
            raise ValueError("duplicate section or job identity")
        counts: dict[str, int] = {}
        for job in self.jobs:
            section = section_map.get(job.section_id)
            if section is None or job.document_id != self.document_id:
                raise ValueError("job section/document mismatch")
            if job.unit_ids != section.unit_ids or job.input_sha256 != section.text_sha256:
                raise ValueError("job input does not bind its processing section")
            counts[job.section_id] = counts.get(job.section_id, 0) + 1
        if any(count > self.maximum_prompts_per_section for count in counts.values()):
            raise ValueError("analysis plan exceeds prompt budget")
        hashes = {canonical_contract_sha256(self, omit={"plan_sha256"})}
        if all(job.repair_model_route is None for job in self.jobs):
            legacy = self.model_dump(mode="json", exclude={"plan_sha256"})
            for job in legacy["jobs"]:
                job.pop("repair_model_route", None)
            hashes.add(hashlib.sha256(json.dumps(
                legacy, sort_keys=True, ensure_ascii=False, separators=(",", ":"),
            ).encode()).hexdigest())
        if self.plan_sha256 not in hashes:
            raise ValueError("analysis plan hash mismatch")
        return self


class SectionFindingV1(_Strict):
    finding_id: str
    prompt_id: str
    statement: str = Field(min_length=1, max_length=4000)
    evidence_state: Literal["supported", "hypothesis", "unsupported"]
    citation_unit_ids: tuple[str, ...] = ()
    confidence: float = Field(ge=0, le=1)

    @field_validator("finding_id", "prompt_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @model_validator(mode="after")
    def _finding_invariants(self) -> "SectionFindingV1":
        if self.evidence_state == "supported" and not self.citation_unit_ids:
            raise ValueError("supported finding requires source citations")
        if len(set(self.citation_unit_ids)) != len(self.citation_unit_ids):
            raise ValueError("duplicate finding citation")
        return self


class SectionPassResultV1(_Strict):
    schema_version: Literal["section-pass-result-v1.0"] = "section-pass-result-v1.0"
    job_id: str
    job_sha256: str
    document_id: str
    section_id: str
    prompt_id: str
    requested_model: str
    provider_resolved_model: str
    attempt: int = Field(ge=1)
    repair_error_code: Literal[
        "section_mapper_schema_validation_retryable",
        "section_mapper_output_contract_retryable",
    ] | None = None
    findings: tuple[SectionFindingV1, ...]
    output_sha256: str

    @field_validator("job_id", "document_id", "section_id", "prompt_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("requested_model", "provider_resolved_model")
    @classmethod
    def _model_identities(cls, value: str, info) -> str:
        if (
            not value or value != value.strip() or len(value) > 300
            or any(char in value for char in ("\n", "\r", "\x00"))
        ):
            raise ValueError(f"{info.field_name} is malformed")
        return value

    @field_validator("job_sha256", "output_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _result_hash(self) -> "SectionPassResultV1":
        if len({row.finding_id for row in self.findings}) != len(self.findings):
            raise ValueError("duplicate finding identity")
        hashes = {canonical_contract_sha256(self, omit={"output_sha256"})}
        if self.repair_error_code is None:
            # Read historical v1.0 results whose hash predates the additive null field.
            hashes.add(canonical_contract_sha256(
                self, omit={"output_sha256", "repair_error_code"},
            ))
        if self.output_sha256 not in hashes:
            raise ValueError("section result hash mismatch")
        return self


class CompilerEvidenceV1(_Strict):
    finding_id: str
    statement: str
    evidence_state: Literal["supported", "hypothesis", "unsupported"]
    citation_unit_ids: tuple[str, ...]
    exact_source_excerpts: tuple[str, ...]
    source_excerpt_sha256s: tuple[str, ...]


class DocumentCompilerPacketV1(_Strict):
    schema_version: Literal["document-compiler-packet-v1.0"] = "document-compiler-packet-v1.0"
    document_id: str
    canonical_text_sha256: str
    small_model_route: str
    compiler_model_route: str
    evidence: tuple[CompilerEvidenceV1, ...]
    disagreement_finding_ids: tuple[str, ...]
    unsupported_finding_ids: tuple[str, ...]
    packet_sha256: str

    @field_validator("document_id", "small_model_route", "compiler_model_route")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("canonical_text_sha256", "packet_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _packet_hash(self) -> "DocumentCompilerPacketV1":
        if self.packet_sha256 != canonical_contract_sha256(self, omit={"packet_sha256"}):
            raise ValueError("compiler packet hash mismatch")
        return self


class CompilerClaimV1(_Strict):
    claim_id: str
    statement: str = Field(min_length=1, max_length=5000)
    citation_unit_ids: tuple[str, ...]
    support_status: Literal["supported", "unsupported"]


class DocumentCompilationV1(_Strict):
    schema_version: Literal["document-compilation-v1.0"] = "document-compilation-v1.0"
    document_id: str
    packet_sha256: str
    requested_model: str
    provider_resolved_model: str
    claims: tuple[CompilerClaimV1, ...]
    output_sha256: str

    @model_validator(mode="after")
    def _hash(self) -> "DocumentCompilationV1":
        if self.output_sha256 != canonical_contract_sha256(self, omit={"output_sha256"}):
            raise ValueError("document compilation hash mismatch")
        return self


def _draft(model, **values):
    draft = model.model_construct(**values)
    hash_field = next(name for name in ("job_sha256", "plan_sha256", "output_sha256", "packet_sha256") if name in model.model_fields)
    values[hash_field] = canonical_contract_sha256(draft, omit={hash_field})
    return model.model_validate(values)


def build_processing_sections(
    units: CitationUnitsV2, *, target_chars: int = 6000, overlap_units: int = 1,
) -> tuple[ProcessingSectionV1, ...]:
    if target_chars < units.hard_max_chars:
        raise ValueError("processing target cannot be smaller than a V2 unit")
    if overlap_units < 0 or overlap_units > 3:
        raise ValueError("overlap unit budget is invalid")
    spans = units.spans
    sections: list[ProcessingSectionV1] = []
    start = 0
    previous_ids: tuple[str, ...] = ()
    while start < len(spans):
        end = start
        size = 0
        while end < len(spans):
            candidate = spans[end]
            if end > start and size + candidate.char_count > target_chars:
                break
            size += candidate.char_count
            end += 1
        group = spans[start:end]
        text = "".join(row.text for row in group)
        overlap = tuple(row.span_id for row in group if row.span_id in previous_ids)
        digest = hashlib.sha256(text.encode()).hexdigest()
        sections.append(ProcessingSectionV1(
            document_id=units.doc_id,
            section_id=f"{units.doc_id}-section-{len(sections) + 1:05d}-{digest[:12]}",
            sequence=len(sections) + 1,
            canonical_text_sha256=units.canonical_text_sha256,
            unit_ids=tuple(row.span_id for row in group),
            unit_text_sha256s=tuple(row.text_sha256 for row in group),
            char_start=group[0].char_start,
            char_end=group[-1].char_end,
            text=text,
            text_sha256=digest,
            overlap_unit_ids=overlap,
        ))
        if end == len(spans):
            break
        previous_ids = tuple(row.span_id for row in group[-overlap_units:]) if overlap_units else ()
        start = end - min(overlap_units, max(0, len(group) - 1))
    return tuple(sections)


def select_prompt_ids(text: str, *, maximum: int = 6) -> tuple[str, ...]:
    if maximum < 2 or maximum > len(PROMPT_REGISTRY):
        raise ValueError("prompt selection budget is invalid")
    lowered = text.casefold()
    selected = ["explicit-claims", "actors-terms"]
    if len(selected) >= maximum:
        return tuple(selected[:maximum])
    for prompt_id, spec in PROMPT_REGISTRY.items():
        if prompt_id in selected:
            continue
        if spec.cue_terms and any(term in lowered for term in spec.cue_terms):
            selected.append(prompt_id)
        if len(selected) == maximum:
            break
    return tuple(selected)


def build_adaptive_analysis_plan(
    *, run_id: str, units: CitationUnitsV2, small_model_route: str,
    repair_model_route: str | None = None,
    target_chars: int = 6000, overlap_units: int = 1,
    maximum_prompts_per_section: int = 6, maximum_attempts: int = 2,
) -> AdaptiveAnalysisPlanV1:
    sections = build_processing_sections(
        units, target_chars=target_chars, overlap_units=overlap_units,
    )
    jobs: list[SectionPromptJobV1] = []
    for section in sections:
        for prompt_id in select_prompt_ids(section.text, maximum=maximum_prompts_per_section):
            spec = PROMPT_REGISTRY[prompt_id]
            values = dict(
                schema_version="section-prompt-job-v1.0", run_id=run_id,
                document_id=units.doc_id, section_id=section.section_id,
                job_id=f"{section.section_id}-{prompt_id}", prompt_id=prompt_id,
                prompt_version=spec.prompt_version, registry_version=REGISTRY_VERSION,
                model_route=small_model_route, repair_model_route=repair_model_route,
                input_sha256=section.text_sha256,
                unit_ids=section.unit_ids, maximum_attempts=maximum_attempts,
                maximum_output_items=20, job_sha256="0" * 64,
            )
            jobs.append(_draft(SectionPromptJobV1, **values))
    values = dict(
        schema_version="adaptive-analysis-plan-v1.0", run_id=run_id,
        document_id=units.doc_id, canonical_text_sha256=units.canonical_text_sha256,
        registry_version=REGISTRY_VERSION, policy_version=PLAN_POLICY_VERSION,
        maximum_prompts_per_section=maximum_prompts_per_section,
        sections=sections, jobs=tuple(jobs), plan_sha256="0" * 64,
    )
    return _draft(AdaptiveAnalysisPlanV1, **values)


def validate_section_result(
    job: SectionPromptJobV1, section: ProcessingSectionV1, result: SectionPassResultV1,
) -> None:
    if result.job_id != job.job_id or result.job_sha256 != job.job_sha256:
        raise SectionAnalysisError("section_result_job_mismatch")
    if result.document_id != job.document_id or result.section_id != section.section_id:
        raise SectionAnalysisError("section_result_identity_mismatch")
    if result.attempt > job.maximum_attempts:
        raise SectionAnalysisError("section_result_attempt_exceeds_job_limit")
    if result.repair_error_code is None:
        expected_route = job.model_route
    else:
        if result.attempt != 2 or job.repair_model_route is None:
            raise SectionAnalysisError("section_result_undeclared_repair")
        expected_route = job.repair_model_route
    if result.prompt_id != job.prompt_id or result.requested_model != expected_route:
        raise SectionAnalysisError("section_result_route_or_prompt_mismatch")
    if len(result.findings) > job.maximum_output_items:
        raise SectionAnalysisError("section_mapper_findings_contract_mismatch")
    allowed = set(section.unit_ids)
    for finding in result.findings:
        if finding.prompt_id != job.prompt_id:
            raise SectionAnalysisError("finding_prompt_mismatch")
        if not set(finding.citation_unit_ids).issubset(allowed):
            raise SectionAnalysisError("finding_unknown_source_citation")


class SectionExecutor(Protocol):
    def execute(
        self, job: SectionPromptJobV1, section: ProcessingSectionV1, attempt: int,
    ) -> SectionPassResultV1: ...


class DocumentCompilerExecutor(Protocol):
    def execute(self, packet: DocumentCompilerPacketV1) -> DocumentCompilationV1: ...


class SectionAnalysisStore:
    def __init__(self, path: Path, *, forbidden_roots: tuple[Path, ...] = ()):
        path = Path(path).resolve(strict=False)
        for root in forbidden_roots:
            root = Path(root).resolve(strict=False)
            if path == root or root in path.parents:
                raise ValueError("section analysis database cannot be inside transfer tree")
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.connection = sqlite3.connect(path, timeout=30, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS section_jobs (
                job_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL,
                state TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 0,
                lease_token TEXT, lease_expires_at TEXT, result_json TEXT,
                terminal_reason TEXT NOT NULL DEFAULT ''
            )
        """)
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()

    def seed(self, plan: AdaptiveAnalysisPlanV1) -> None:
        with self.connection:
            for job in plan.jobs:
                payload = json.dumps(
                    job.model_dump(mode="json", exclude_none=True),
                    sort_keys=True, separators=(",", ":"),
                )
                existing = self.connection.execute(
                    "SELECT payload_json FROM section_jobs WHERE job_id=?", (job.job_id,),
                ).fetchone()
                if existing and existing["payload_json"] != payload:
                    raise SectionAnalysisError("occupied_section_job_identity")
                self.connection.execute(
                    "INSERT OR IGNORE INTO section_jobs(job_id,payload_json,state) VALUES(?,?,'pending')",
                    (job.job_id, payload),
                )

    def recover_expired(self, now: datetime) -> int:
        with self.connection:
            cursor = self.connection.execute(
                "UPDATE section_jobs SET state='pending',lease_token=NULL,lease_expires_at=NULL "
                "WHERE state='running' AND lease_expires_at<=?", (now.isoformat(),),
            )
        return cursor.rowcount

    def claim(self, now: datetime, *, lease_seconds: int = 60) -> tuple[SectionPromptJobV1, str, int] | None:
        self.connection.execute("BEGIN IMMEDIATE")
        try:
            row = self.connection.execute(
                "SELECT * FROM section_jobs WHERE state='pending' ORDER BY job_id LIMIT 1"
            ).fetchone()
            if row is None:
                self.connection.commit()
                return None
            job = SectionPromptJobV1.model_validate_json(row["payload_json"])
            attempt = int(row["attempt"]) + 1
            token = uuid.uuid4().hex
            expiry = now + timedelta(seconds=lease_seconds)
            self.connection.execute(
                "UPDATE section_jobs SET state='running',attempt=?,lease_token=?,lease_expires_at=? WHERE job_id=?",
                (attempt, token, expiry.isoformat(), job.job_id),
            )
            self.connection.commit()
            return job, token, attempt
        except Exception:
            self.connection.rollback()
            raise

    def commit(self, result: SectionPassResultV1, token: str, now: datetime) -> None:
        payload = json.dumps(
            result.model_dump(mode="json", exclude_none=True),
            sort_keys=True, separators=(",", ":"),
        )
        with self.connection:
            cursor = self.connection.execute(
                "UPDATE section_jobs SET state='succeeded',result_json=?,terminal_reason='',lease_token=NULL,lease_expires_at=NULL "
                "WHERE job_id=? AND state='running' AND lease_token=? AND lease_expires_at>?",
                (payload, result.job_id, token, now.isoformat()),
            )
            if cursor.rowcount != 1:
                raise SectionAnalysisError("stale_section_lease_commit")

    def fail(self, job: SectionPromptJobV1, token: str, *, retryable: bool, reason: str) -> None:
        row = self.connection.execute(
            "SELECT attempt FROM section_jobs WHERE job_id=? AND state='running' AND lease_token=?",
            (job.job_id, token),
        ).fetchone()
        if row is None:
            raise SectionAnalysisError("stale_section_lease_failure")
        next_state = "pending" if retryable and int(row["attempt"]) < job.maximum_attempts else "held"
        with self.connection:
            self.connection.execute(
                "UPDATE section_jobs SET state=?,terminal_reason=?,lease_token=NULL,lease_expires_at=NULL WHERE job_id=?",
                (next_state, reason, job.job_id),
            )

    def results(self) -> tuple[SectionPassResultV1, ...]:
        rows = self.connection.execute(
            "SELECT result_json FROM section_jobs WHERE state='succeeded' ORDER BY job_id"
        ).fetchall()
        return tuple(SectionPassResultV1.model_validate_json(row["result_json"]) for row in rows)

    def counts(self) -> dict[str, int]:
        rows = self.connection.execute(
            "SELECT state,COUNT(*) AS count FROM section_jobs GROUP BY state"
        ).fetchall()
        return {row["state"]: int(row["count"]) for row in rows}

    def attempts(self) -> dict[str, int]:
        return {row["job_id"]: int(row["attempt"]) for row in self.connection.execute(
            "SELECT job_id,attempt FROM section_jobs ORDER BY job_id"
        )}

    def retry_context(self, job_id: str, token: str) -> str:
        row = self.connection.execute(
            "SELECT terminal_reason FROM section_jobs "
            "WHERE job_id=? AND state='running' AND lease_token=?",
            (job_id, token),
        ).fetchone()
        if row is None:
            raise SectionAnalysisError("stale_section_retry_context")
        return str(row["terminal_reason"] or "")

    def targeted_resume_snapshot(self) -> tuple[dict[str, object], ...]:
        """Return content-free durable state used by the synthetic resume gate."""
        rows = self.connection.execute(
            "SELECT job_id,state,attempt,result_json,terminal_reason,lease_token,lease_expires_at "
            "FROM section_jobs ORDER BY job_id"
        ).fetchall()
        return tuple({
            "job_id": str(row["job_id"]),
            "state": str(row["state"]),
            "attempt": int(row["attempt"]),
            "has_result": row["result_json"] is not None,
            "terminal_reason": str(row["terminal_reason"] or ""),
            "has_lease": bool(row["lease_token"] or row["lease_expires_at"]),
        } for row in rows)

    def requeue_legacy_held_contract_jobs(self, job_ids: tuple[str, ...]) -> int:
        """Requeue only prevalidated Run-020C legacy holds without erasing attempts."""
        if not job_ids or len(job_ids) != len(set(job_ids)):
            raise SectionAnalysisError("targeted_resume_job_ids_invalid")
        placeholders = ",".join("?" for _ in job_ids)
        with self.connection:
            cursor = self.connection.execute(
                "UPDATE section_jobs SET state='pending',terminal_reason=?,"
                "lease_token=NULL,lease_expires_at=NULL "
                f"WHERE job_id IN ({placeholders}) AND state='held' AND attempt=1 "
                "AND result_json IS NULL AND terminal_reason='invalid_or_terminal_executor_failure' "
                "AND lease_token IS NULL AND lease_expires_at IS NULL",
                (MAPPER_OUTPUT_RETRY_REASON, *job_ids),
            )
            if cursor.rowcount != len(job_ids):
                raise SectionAnalysisError("targeted_resume_state_changed")
        return cursor.rowcount


def run_parallel_jobs(
    *, store: SectionAnalysisStore, plan: AdaptiveAnalysisPlanV1,
    executor: SectionExecutor, max_workers: int = 4,
) -> tuple[SectionPassResultV1, ...]:
    if max_workers < 1 or max_workers > 16:
        raise ValueError("parallel worker limit is invalid")
    sections = {row.section_id: row for row in plan.sections}
    while True:
        claimed = []
        now = datetime.now(timezone.utc)
        store.recover_expired(now)
        for _ in range(max_workers):
            row = store.claim(now)
            if row is None:
                break
            job, token, attempt = row
            claimed.append((job, token, attempt, store.retry_context(job.job_id, token)))
        if not claimed:
            break
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            def execute_claim(job, attempt, retry_context):
                contextual = getattr(executor, "execute_with_retry_context", None)
                if (
                    retry_context in MAPPER_REPAIRABLE_REASONS
                    and job.repair_model_route is not None
                    and callable(contextual)
                ):
                    return contextual(
                        job, sections[job.section_id], attempt,
                        retry_error_code=retry_context,
                    )
                return executor.execute(job, sections[job.section_id], attempt)

            futures = {
                pool.submit(execute_claim, job, attempt, retry_context): (job, token, attempt)
                for job, token, attempt, retry_context in claimed
            }
            for future in as_completed(futures):
                job, token, _attempt = futures[future]
                try:
                    result = future.result()
                    validate_section_result(job, sections[job.section_id], result)
                    store.commit(result, token, datetime.now(timezone.utc))
                except RetryableSectionError as exc:
                    reason = (
                        str(exc) if str(exc) in MAPPER_REPAIRABLE_REASONS
                        else "retryable_executor_failure"
                    )
                    store.fail(job, token, retryable=True, reason=reason)
                except Exception:
                    store.fail(job, token, retryable=False, reason="invalid_or_terminal_executor_failure")
    return store.results()


def build_compiler_packet(
    *, plan: AdaptiveAnalysisPlanV1, results: tuple[SectionPassResultV1, ...],
    units: CitationUnitsV2, compiler_model_route: str,
) -> DocumentCompilerPacketV1:
    unit_map: dict[str, EvidenceSpanV2] = {row.span_id: row for row in units.spans}
    jobs = {row.job_id: row for row in plan.jobs}
    evidence: list[CompilerEvidenceV1] = []
    unsupported: list[str] = []
    statements: dict[str, list[str]] = {}
    for result in sorted(results, key=lambda row: row.job_id):
        job = jobs.get(result.job_id)
        if job is None:
            raise SectionAnalysisError("compiler_result_job_unknown")
        validate_section_result(job, next(row for row in plan.sections if row.section_id == job.section_id), result)
        for finding in result.findings:
            excerpts = tuple(unit_map[unit_id].text for unit_id in finding.citation_unit_ids)
            hashes = tuple(unit_map[unit_id].text_sha256 for unit_id in finding.citation_unit_ids)
            if finding.evidence_state != "supported":
                unsupported.append(finding.finding_id)
            statements.setdefault(finding.statement.casefold(), []).append(finding.finding_id)
            evidence.append(CompilerEvidenceV1(
                finding_id=finding.finding_id, statement=finding.statement,
                evidence_state=finding.evidence_state,
                citation_unit_ids=finding.citation_unit_ids,
                exact_source_excerpts=excerpts, source_excerpt_sha256s=hashes,
            ))
    disagreements = tuple(sorted(
        finding_id for ids in statements.values() if len(ids) > 1 for finding_id in ids
    ))
    values = dict(
        schema_version="document-compiler-packet-v1.0", document_id=plan.document_id,
        canonical_text_sha256=plan.canonical_text_sha256,
        small_model_route=plan.jobs[0].model_route,
        compiler_model_route=compiler_model_route,
        evidence=tuple(evidence), disagreement_finding_ids=disagreements,
        unsupported_finding_ids=tuple(sorted(unsupported)), packet_sha256="0" * 64,
    )
    return _draft(DocumentCompilerPacketV1, **values)


def validate_compilation(packet: DocumentCompilerPacketV1, output: DocumentCompilationV1) -> None:
    if output.document_id != packet.document_id or output.packet_sha256 != packet.packet_sha256:
        raise SectionAnalysisError("compiler_output_packet_mismatch")
    allowed = {
        unit_id for row in packet.evidence if row.evidence_state == "supported"
        for unit_id in row.citation_unit_ids
    }
    for claim in output.claims:
        if claim.support_status == "supported" and not claim.citation_unit_ids:
            raise SectionAnalysisError("compiler_supported_claim_missing_citation")
        if not set(claim.citation_unit_ids).issubset(allowed):
            raise SectionAnalysisError("compiler_claim_unknown_source_citation")


def execute_document_compiler(
    packet: DocumentCompilerPacketV1, executor: DocumentCompilerExecutor,
) -> DocumentCompilationV1:
    output = DocumentCompilationV1.model_validate(
        executor.execute(packet).model_dump(mode="python")
    )
    validate_compilation(packet, output)
    return output
