"""Deterministic, complete partitions of canonical text for v2 evidence.

The builders in this module are model-free.  They preserve every Python
character in the supplied canonical string and never scan configured roots.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Callable, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from runner.models.reprocessing import require_relative_path, require_safe_id, require_sha256
from .atomic_io import atomic_write_json
from .extraction_quality import canonical_json_bytes, sha256_text


SECTIONS_V2_FILENAME = "sections_v2.json"
CITATION_UNITS_V2_FILENAME = "citation_units_v2.json"
V2_READY_FILENAME = "v2_artifacts.ready.json"
SECTION_POLICY_VERSION = "complete-section-partition-v2.0"
UNIT_POLICY_VERSION = "complete-citation-unit-partition-v2.0"


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class EvidenceSpanV2(_StrictModel):
    doc_id: str
    span_id: str
    sequence: int = Field(ge=1)
    canonical_text_sha256: str
    char_start: int = Field(ge=0)
    char_end: int = Field(ge=1)
    char_count: int = Field(ge=1)
    text: str
    text_sha256: str
    source_artifact: str
    source_version: str

    @field_validator("doc_id", "span_id")
    @classmethod
    def _ids(cls, value: str, info) -> str:
        return require_safe_id(value, field=info.field_name)

    @field_validator("canonical_text_sha256", "text_sha256")
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @field_validator("source_artifact")
    @classmethod
    def _source_path(cls, value: str) -> str:
        return require_relative_path(value, field="source_artifact")

    @field_validator("source_version")
    @classmethod
    def _source_version(cls, value: str) -> str:
        if not value or value != value.strip() or len(value) > 100:
            raise ValueError("source_version is invalid")
        return value

    @model_validator(mode="after")
    def _span_invariants(self) -> "EvidenceSpanV2":
        if self.char_end <= self.char_start:
            raise ValueError("evidence span must have a positive range")
        if self.char_count != self.char_end - self.char_start:
            raise ValueError("evidence span character count is inconsistent")
        if self.char_count != len(self.text):
            raise ValueError("evidence span offsets and text disagree")
        if self.text_sha256 != sha256_text(self.text):
            raise ValueError("evidence span text hash mismatch")
        return self


class SpanSizeDistributionV2(_StrictModel):
    count: int = Field(ge=1)
    minimum: int = Field(ge=1)
    maximum: int = Field(ge=1)
    p50: int = Field(ge=1)
    p95: int = Field(ge=1)
    total: int = Field(ge=1)

    @model_validator(mode="after")
    def _relationships(self) -> "SpanSizeDistributionV2":
        if not self.minimum <= self.p50 <= self.p95 <= self.maximum:
            raise ValueError("span size distribution is inconsistent")
        return self


class _PartitionBase(_StrictModel):
    doc_id: str
    canonical_text_sha256: str
    canonical_char_count: int = Field(ge=1)
    source_artifact: str
    source_version: str
    policy_version: str
    target_chars: int = Field(ge=1)
    hard_max_chars: int = Field(ge=1)
    spans: tuple[EvidenceSpanV2, ...]
    size_distribution: SpanSizeDistributionV2

    @field_validator("doc_id")
    @classmethod
    def _doc_id(cls, value: str) -> str:
        return require_safe_id(value, field="doc_id")

    @field_validator("canonical_text_sha256")
    @classmethod
    def _canonical_hash(cls, value: str) -> str:
        return require_sha256(value, field="canonical_text_sha256")

    @field_validator("source_artifact")
    @classmethod
    def _artifact(cls, value: str) -> str:
        return require_relative_path(value, field="source_artifact")

    @model_validator(mode="after")
    def _partition_invariants(self) -> "_PartitionBase":
        if self.hard_max_chars < self.target_chars:
            raise ValueError("hard maximum must be at least the target size")
        if not self.spans:
            raise ValueError("partition cannot be empty")
        if len({span.span_id for span in self.spans}) != len(self.spans):
            raise ValueError("duplicate evidence span IDs")
        expected_start = 0
        for sequence, span in enumerate(self.spans, start=1):
            if span.sequence != sequence:
                raise ValueError("evidence spans are not deterministically ordered")
            if span.doc_id != self.doc_id:
                raise ValueError("evidence span document ID mismatch")
            if span.canonical_text_sha256 != self.canonical_text_sha256:
                raise ValueError("evidence span canonical hash mismatch")
            if span.source_artifact != self.source_artifact:
                raise ValueError("evidence span source artifact mismatch")
            if span.source_version != self.source_version:
                raise ValueError("evidence span source version mismatch")
            if span.char_start != expected_start:
                raise ValueError("evidence spans contain a gap, overlap, or reordering")
            if span.char_count > self.hard_max_chars:
                raise ValueError("evidence span exceeds the hard maximum")
            expected_start = span.char_end
        if expected_start != self.canonical_char_count:
            raise ValueError("evidence spans do not cover canonical text")
        reconstructed = "".join(span.text for span in self.spans)
        if len(reconstructed) != self.canonical_char_count:
            raise ValueError("reconstructed text character count mismatch")
        if sha256_text(reconstructed) != self.canonical_text_sha256:
            raise ValueError("reconstructed text hash mismatch")
        if self.size_distribution != _distribution(
            tuple(span.char_count for span in self.spans)
        ):
            raise ValueError("span size distribution is inconsistent")
        return self


class SectionsV2(_PartitionBase):
    schema_version: Literal["sections-v2.0"] = "sections-v2.0"
    policy_version: Literal["complete-section-partition-v2.0"] = SECTION_POLICY_VERSION


class CitationUnitsV2(_PartitionBase):
    schema_version: Literal["citation-units-v2.0"] = "citation-units-v2.0"
    policy_version: Literal["complete-citation-unit-partition-v2.0"] = UNIT_POLICY_VERSION


def _distribution(sizes: tuple[int, ...]) -> SpanSizeDistributionV2:
    ordered = sorted(sizes)

    def percentile(fraction: float) -> int:
        return ordered[max(0, math.ceil(fraction * len(ordered)) - 1)]

    return SpanSizeDistributionV2(
        count=len(ordered),
        minimum=ordered[0],
        maximum=ordered[-1],
        p50=percentile(0.50),
        p95=percentile(0.95),
        total=sum(ordered),
    )


_SENTENCE_END_RE = re.compile(r"[.!?](?:[\"'\u2019\u201d)]*)\s", re.UNICODE)


def _choose_end(text: str, start: int, target: int, hard_max: int) -> int:
    hard_end = min(len(text), start + hard_max)
    if hard_end == len(text):
        return hard_end
    ideal = min(hard_end, start + target)
    lower = start + max(1, target // 2)
    window = text[lower:hard_end]

    structural = [lower + match.end() for match in re.finditer(r"(?:\r?\n){2,}", window)]
    candidates = [value for value in structural if value <= ideal]
    if candidates:
        return candidates[-1]

    sentences = [lower + match.end() for match in _SENTENCE_END_RE.finditer(window)]
    candidates = [value for value in sentences if value <= ideal]
    if candidates:
        return candidates[-1]

    whitespace = [lower + match.end() for match in re.finditer(r"\s+", window)]
    candidates = [value for value in whitespace if value <= ideal]
    if candidates:
        return candidates[-1]
    return ideal


def _partition_offsets(text: str, *, target_chars: int, hard_max_chars: int) -> tuple[tuple[int, int], ...]:
    if not isinstance(text, str):
        raise TypeError("canonical_text must be a string")
    if not text:
        raise ValueError("canonical text cannot be empty")
    if target_chars <= 0 or hard_max_chars < target_chars:
        raise ValueError("invalid partition sizing policy")
    rows: list[tuple[int, int]] = []
    start = 0
    while start < len(text):
        end = _choose_end(text, start, target_chars, hard_max_chars)
        if end <= start:
            raise RuntimeError("partition policy failed to advance")
        rows.append((start, end))
        start = end
    return tuple(rows)


def _build_spans(
    canonical_text: str,
    *,
    doc_id: str,
    prefix: str,
    source_artifact: str,
    source_version: str,
    target_chars: int,
    hard_max_chars: int,
) -> tuple[EvidenceSpanV2, ...]:
    canonical_hash = sha256_text(canonical_text)
    rows: list[EvidenceSpanV2] = []
    for sequence, (start, end) in enumerate(
        _partition_offsets(
            canonical_text, target_chars=target_chars, hard_max_chars=hard_max_chars,
        ),
        start=1,
    ):
        span_text = canonical_text[start:end]
        text_hash = sha256_text(span_text)
        rows.append(EvidenceSpanV2(
            doc_id=doc_id,
            span_id=f"{prefix}-{sequence:06d}-{text_hash[:12]}",
            sequence=sequence,
            canonical_text_sha256=canonical_hash,
            char_start=start,
            char_end=end,
            char_count=end - start,
            text=span_text,
            text_sha256=text_hash,
            source_artifact=source_artifact,
            source_version=source_version,
        ))
    return tuple(rows)


def build_sections_v2(
    canonical_text: str,
    *,
    doc_id: str,
    source_artifact: str = "extracted.txt",
    source_version: str = "canonical-text-v2.0",
    target_chars: int = 16_000,
    hard_max_chars: int = 24_000,
) -> SectionsV2:
    spans = _build_spans(
        canonical_text,
        doc_id=doc_id,
        prefix="section",
        source_artifact=source_artifact,
        source_version=source_version,
        target_chars=target_chars,
        hard_max_chars=hard_max_chars,
    )
    return SectionsV2(
        doc_id=doc_id,
        canonical_text_sha256=sha256_text(canonical_text),
        canonical_char_count=len(canonical_text),
        source_artifact=source_artifact,
        source_version=source_version,
        policy_version=SECTION_POLICY_VERSION,
        target_chars=target_chars,
        hard_max_chars=hard_max_chars,
        spans=spans,
        size_distribution=_distribution(tuple(span.char_count for span in spans)),
    )


def build_citation_units_v2(
    canonical_text: str,
    *,
    doc_id: str,
    source_artifact: str = "extracted.txt",
    source_version: str = "canonical-text-v2.0",
    target_chars: int = 1_500,
    hard_max_chars: int = 1_900,
) -> CitationUnitsV2:
    spans = _build_spans(
        canonical_text,
        doc_id=doc_id,
        prefix="unit",
        source_artifact=source_artifact,
        source_version=source_version,
        target_chars=target_chars,
        hard_max_chars=hard_max_chars,
    )
    return CitationUnitsV2(
        doc_id=doc_id,
        canonical_text_sha256=sha256_text(canonical_text),
        canonical_char_count=len(canonical_text),
        source_artifact=source_artifact,
        source_version=source_version,
        policy_version=UNIT_POLICY_VERSION,
        target_chars=target_chars,
        hard_max_chars=hard_max_chars,
        spans=spans,
        size_distribution=_distribution(tuple(span.char_count for span in spans)),
    )


def artifact_sha256(artifact: BaseModel) -> str:
    return hashlib.sha256(canonical_json_bytes(artifact)).hexdigest()


def canonical_artifact_bytes(artifact: BaseModel) -> bytes:
    return canonical_json_bytes(artifact)


def publish_v2_artifact_set(
    directory: Path,
    *,
    sections: SectionsV2,
    units: CitationUnitsV2,
    write_json: Callable[..., Path] = atomic_write_json,
) -> dict[str, str]:
    """Publish two artifacts and expose readiness only after both are durable."""
    if sections.doc_id != units.doc_id:
        raise ValueError("sections and units document IDs differ")
    if sections.canonical_text_sha256 != units.canonical_text_sha256:
        raise ValueError("sections and units canonical hashes differ")
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    section_hash = artifact_sha256(sections)
    unit_hash = artifact_sha256(units)
    write_json(
        directory / SECTIONS_V2_FILENAME,
        sections.model_dump(mode="json"),
        indent=None,
        ensure_ascii=False,
    )
    write_json(
        directory / CITATION_UNITS_V2_FILENAME,
        units.model_dump(mode="json"),
        indent=None,
        ensure_ascii=False,
    )
    ready = {
        "schema_version": "v2-artifact-set-ready-v1.0",
        "doc_id": sections.doc_id,
        "canonical_text_sha256": sections.canonical_text_sha256,
        "sections_path": SECTIONS_V2_FILENAME,
        "sections_sha256": section_hash,
        "units_path": CITATION_UNITS_V2_FILENAME,
        "units_sha256": unit_hash,
    }
    write_json(directory / V2_READY_FILENAME, ready, indent=None, ensure_ascii=False)
    return ready


def inspect_v2_artifact_set(directory: Path) -> tuple[Literal["ready", "held"], str]:
    directory = Path(directory)
    marker = directory / V2_READY_FILENAME
    if not marker.is_file():
        return "held", "readiness_marker_missing"
    try:
        ready = json.loads(marker.read_text(encoding="utf-8"))
        expected_keys = {
            "schema_version", "doc_id", "canonical_text_sha256",
            "sections_path", "sections_sha256", "units_path", "units_sha256",
        }
        if set(ready) != expected_keys:
            return "held", "readiness_marker_malformed"
        for key in ("sections_path", "units_path"):
            require_relative_path(ready[key], field=key)
        section_path = directory / ready["sections_path"]
        unit_path = directory / ready["units_path"]
        sections = SectionsV2.model_validate_json(section_path.read_bytes())
        units = CitationUnitsV2.model_validate_json(unit_path.read_bytes())
        if artifact_sha256(sections) != ready["sections_sha256"]:
            return "held", "sections_hash_mismatch"
        if artifact_sha256(units) != ready["units_sha256"]:
            return "held", "units_hash_mismatch"
        if sections.doc_id != units.doc_id or sections.doc_id != ready["doc_id"]:
            return "held", "document_identity_mismatch"
        if (
            sections.canonical_text_sha256 != units.canonical_text_sha256
            or sections.canonical_text_sha256 != ready["canonical_text_sha256"]
        ):
            return "held", "canonical_identity_mismatch"
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return "held", "artifact_set_invalid"
    return "ready", "verified_complete_pair"
