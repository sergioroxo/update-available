"""Model-free complete-text, slicing-receipt, and extraction-quality contracts.

This module never scans configured roots or calls extraction/model/network
services.  Callers provide synthetic or explicitly copied text and metadata.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from runner.models.reprocessing import require_relative_path, require_safe_id, require_sha256
from .atomic_io import atomic_write_bytes, atomic_write_json


MODEL_INPUT_POLICY_VERSION = "model-input-slice-v1.0"
MODEL_INPUT_FILENAME = "model_input.txt"
MODEL_INPUT_RECEIPT_FILENAME = "model_input_slice_receipt.json"
TRUNCATION_MARKER_PREFIX = "[TRUNCATED MIDDLE"


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def canonical_json_bytes(value: BaseModel | dict) -> bytes:
    payload = value.model_dump(mode="json") if isinstance(value, BaseModel) else value
    return (json.dumps(
        payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"),
    ) + "\n").encode("utf-8")


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)


class ModelInputSegmentV1(_StrictModel):
    char_start: int = Field(ge=0)
    char_end: int = Field(ge=0)
    text_sha256: str

    @field_validator("text_sha256")
    @classmethod
    def _hash(cls, value: str) -> str:
        return require_sha256(value, field="text_sha256")

    @model_validator(mode="after")
    def _range(self) -> "ModelInputSegmentV1":
        if self.char_end <= self.char_start:
            raise ValueError("model-input segment must have a positive range")
        return self


class ModelInputSliceReceiptV1(_StrictModel):
    schema_version: Literal["model-input-slice-receipt-v1.0"] = (
        "model-input-slice-receipt-v1.0"
    )
    policy_version: Literal["model-input-slice-v1.0"] = MODEL_INPUT_POLICY_VERSION
    canonical_text_sha256: str
    canonical_char_count: int = Field(ge=0)
    canonical_utf8_bytes: int = Field(ge=0)
    limit_chars: int = Field(ge=0)
    head_chars: int = Field(ge=0)
    tail_chars: int = Field(ge=0)
    selected_segments: tuple[ModelInputSegmentV1, ...]
    separator_sha256: str
    separator_char_count: int = Field(ge=0)
    emitted_text_sha256: str
    emitted_char_count: int = Field(ge=0)
    omitted_char_count: int = Field(ge=0)
    sliced: bool

    @field_validator(
        "canonical_text_sha256", "separator_sha256", "emitted_text_sha256",
    )
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name)

    @model_validator(mode="after")
    def _relationships(self) -> "ModelInputSliceReceiptV1":
        previous_end = 0
        selected_chars = 0
        for index, segment in enumerate(self.selected_segments):
            if segment.char_end > self.canonical_char_count:
                raise ValueError("model-input segment exceeds canonical text")
            if index and segment.char_start < previous_end:
                raise ValueError("model-input segments overlap or are unordered")
            previous_end = segment.char_end
            selected_chars += segment.char_end - segment.char_start
        if selected_chars + self.omitted_char_count != self.canonical_char_count:
            raise ValueError("model-input selected and omitted counts are inconsistent")
        if self.emitted_char_count != selected_chars + self.separator_char_count:
            raise ValueError("model-input emitted count is inconsistent")
        if self.sliced != (self.omitted_char_count > 0):
            raise ValueError("model-input sliced flag is inconsistent")
        if not self.sliced:
            expected_segments = 0 if self.canonical_char_count == 0 else 1
            if len(self.selected_segments) != expected_segments:
                raise ValueError("unsliced input must select the complete canonical text")
            if self.selected_segments and (
                self.selected_segments[0].char_start != 0
                or self.selected_segments[0].char_end != self.canonical_char_count
            ):
                raise ValueError("unsliced input must select the complete canonical range")
            if self.separator_char_count != 0:
                raise ValueError("unsliced input cannot contain a separator")
            if self.separator_sha256 != sha256_text(""):
                raise ValueError("unsliced separator hash must bind the empty string")
            if self.limit_chars > 0 and self.canonical_char_count > self.limit_chars:
                raise ValueError("unsliced input exceeds its declared limit")
        else:
            if self.limit_chars <= 0:
                raise ValueError("sliced input requires a positive limit")
            if selected_chars > self.limit_chars:
                raise ValueError("selected canonical characters exceed the model-input limit")
            expected_ranges = _expected_sliced_ranges(
                canonical_char_count=self.canonical_char_count,
                limit_chars=self.limit_chars,
                head_chars=self.head_chars,
                tail_chars=self.tail_chars,
            )
            actual_ranges = tuple(
                (segment.char_start, segment.char_end)
                for segment in self.selected_segments
            )
            if actual_ranges != expected_ranges:
                raise ValueError(
                    "selected segments do not match the declared deterministic head/tail policy"
                )
            expected_separator = _truncation_separator(
                omitted_char_count=self.omitted_char_count,
                has_head=bool(expected_ranges and expected_ranges[0][0] == 0),
                has_tail=bool(expected_ranges and expected_ranges[-1][1] == self.canonical_char_count),
            )
            if self.separator_sha256 != sha256_text(expected_separator):
                raise ValueError("sliced separator hash does not match truncation policy")
            if self.separator_char_count != len(expected_separator):
                raise ValueError("sliced separator count does not match truncation policy")
        return self


def _expected_sliced_ranges(
    *,
    canonical_char_count: int,
    limit_chars: int,
    head_chars: int,
    tail_chars: int,
) -> tuple[tuple[int, int], ...]:
    expected_head = min(head_chars, limit_chars)
    expected_tail = min(tail_chars, limit_chars - expected_head)
    if expected_head == 0 and expected_tail == 0:
        expected_head = limit_chars
    ranges: list[tuple[int, int]] = []
    if expected_head:
        ranges.append((0, expected_head))
    if expected_tail:
        ranges.append((canonical_char_count - expected_tail, canonical_char_count))
    return tuple(ranges)


def _truncation_separator(
    *, omitted_char_count: int, has_head: bool, has_tail: bool,
) -> str:
    marker = f"[TRUNCATED MIDDLE — {omitted_char_count:,} chars omitted]"
    if has_tail:
        return f"\n\n{marker}\n\n"
    if has_head:
        return f"\n\n{marker}"
    raise ValueError("sliced model input requires a head or tail range")


def build_model_input_slice(
    canonical_text: str,
    *,
    limit_chars: int | None,
    head_chars: int,
    tail_chars: int,
) -> tuple[str, ModelInputSliceReceiptV1]:
    """Derive bounded model text without changing canonical text."""
    if not isinstance(canonical_text, str):
        raise TypeError("canonical_text must be a string")
    limit = 0 if limit_chars is None else int(limit_chars)
    if limit <= 0 or len(canonical_text) <= limit:
        emitted = canonical_text
        separator = ""
        segments = (() if not canonical_text else (
            ModelInputSegmentV1(
                char_start=0, char_end=len(canonical_text),
                text_sha256=sha256_text(canonical_text),
            ),
        ))
    else:
        head_size = min(max(0, int(head_chars)), limit)
        tail_size = min(max(0, int(tail_chars)), limit - head_size)
        if head_size + tail_size == 0:
            head_size = limit
        omitted = len(canonical_text) - head_size - tail_size
        head = canonical_text[:head_size]
        tail = canonical_text[-tail_size:] if tail_size else ""
        separator = _truncation_separator(
            omitted_char_count=omitted,
            has_head=bool(head),
            has_tail=bool(tail),
        )
        emitted = head + separator + tail
        rows = []
        if head_size:
            rows.append(ModelInputSegmentV1(
                char_start=0, char_end=head_size, text_sha256=sha256_text(head),
            ))
        if tail_size:
            rows.append(ModelInputSegmentV1(
                char_start=len(canonical_text) - tail_size,
                char_end=len(canonical_text),
                text_sha256=sha256_text(tail),
            ))
        segments = tuple(rows)
    selected_chars = sum(row.char_end - row.char_start for row in segments)
    receipt = ModelInputSliceReceiptV1(
        canonical_text_sha256=sha256_text(canonical_text),
        canonical_char_count=len(canonical_text),
        canonical_utf8_bytes=len(canonical_text.encode("utf-8")),
        limit_chars=max(0, limit),
        head_chars=max(0, int(head_chars)),
        tail_chars=max(0, int(tail_chars)),
        selected_segments=segments,
        separator_sha256=sha256_text(separator),
        separator_char_count=len(separator),
        emitted_text_sha256=sha256_text(emitted),
        emitted_char_count=len(emitted),
        omitted_char_count=len(canonical_text) - selected_chars,
        sliced=len(canonical_text) > selected_chars,
    )
    validate_model_input_slice(receipt, canonical_text=canonical_text, emitted_text=emitted)
    return emitted, receipt


def validate_model_input_slice(
    receipt: ModelInputSliceReceiptV1,
    *,
    canonical_text: str,
    emitted_text: str,
) -> None:
    if receipt.canonical_text_sha256 != sha256_text(canonical_text):
        raise ValueError("model-input receipt canonical hash mismatch")
    if receipt.canonical_char_count != len(canonical_text):
        raise ValueError("model-input receipt canonical character count mismatch")
    if receipt.canonical_utf8_bytes != len(canonical_text.encode("utf-8")):
        raise ValueError("model-input receipt canonical byte count mismatch")
    for segment in receipt.selected_segments:
        selected = canonical_text[segment.char_start:segment.char_end]
        if segment.text_sha256 != sha256_text(selected):
            raise ValueError("model-input segment hash mismatch")
    if receipt.emitted_text_sha256 != sha256_text(emitted_text):
        raise ValueError("model-input emitted hash mismatch")
    if receipt.emitted_char_count != len(emitted_text):
        raise ValueError("model-input emitted character count mismatch")
    if render_model_input_slice(receipt, canonical_text=canonical_text) != emitted_text:
        raise ValueError("model-input text does not match selected canonical ranges")


def render_model_input_slice(
    receipt: ModelInputSliceReceiptV1,
    *,
    canonical_text: str,
) -> str:
    """Reconstruct a model input from its content-free canonical-range receipt."""
    if receipt.canonical_text_sha256 != sha256_text(canonical_text):
        raise ValueError("model-input receipt canonical hash mismatch")
    selected = [canonical_text[row.char_start:row.char_end] for row in receipt.selected_segments]
    if not receipt.sliced:
        emitted = "".join(selected)
    else:
        if len(selected) not in (1, 2):
            raise ValueError("sliced model input must contain one or two ranges")
        has_head = receipt.selected_segments[0].char_start == 0
        has_tail = receipt.selected_segments[-1].char_end == receipt.canonical_char_count
        separator = _truncation_separator(
            omitted_char_count=receipt.omitted_char_count,
            has_head=has_head,
            has_tail=has_tail,
        )
        if receipt.separator_sha256 != sha256_text(separator):
            raise ValueError("model-input separator hash mismatch")
        if receipt.separator_char_count != len(separator):
            raise ValueError("model-input separator count mismatch")
        if len(selected) == 2:
            emitted = selected[0] + separator + selected[1]
        elif receipt.selected_segments[0].char_start == 0:
            emitted = selected[0] + separator
        else:
            emitted = separator + selected[0]
    if receipt.emitted_text_sha256 != sha256_text(emitted):
        raise ValueError("model-input reconstructed hash mismatch")
    return emitted


QualityReason = Literal[
    "missing_text", "unreadable_text", "empty_text", "integrity_mismatch",
    "historical_truncation_marker", "source_truncated",
]
_REASON_ORDER: tuple[QualityReason, ...] = (
    "missing_text", "unreadable_text", "empty_text", "integrity_mismatch",
    "historical_truncation_marker", "source_truncated",
)


class ExtractionQualityV1(_StrictModel):
    schema_version: Literal["extraction-quality-v1.0"] = "extraction-quality-v1.0"
    status: Literal["passed", "held"]
    reasons: tuple[QualityReason, ...]
    text_present: bool
    text_readable: bool
    integrity_valid: bool
    source_truncated: bool
    truncation_marker_detected: bool
    canonical_text_sha256: str = ""
    canonical_char_count: int = Field(ge=0)
    canonical_utf8_bytes: int = Field(ge=0)

    @field_validator("canonical_text_sha256")
    @classmethod
    def _optional_hash(cls, value: str) -> str:
        return require_sha256(value, field="canonical_text_sha256") if value else value

    @model_validator(mode="after")
    def _quality_invariants(self) -> "ExtractionQualityV1":
        derived: list[QualityReason] = []
        if not self.text_present:
            derived.append("missing_text")
            if self.text_readable:
                raise ValueError("missing text cannot be readable")
            if self.canonical_text_sha256 or self.canonical_char_count or self.canonical_utf8_bytes:
                raise ValueError("missing text cannot carry canonical identity")
            if self.truncation_marker_detected:
                raise ValueError("missing text cannot contain a truncation marker")
        elif not self.text_readable:
            derived.append("unreadable_text")
            if self.canonical_text_sha256 or self.canonical_char_count or self.canonical_utf8_bytes:
                raise ValueError("unreadable text cannot carry canonical identity")
            if self.truncation_marker_detected:
                raise ValueError("unreadable text cannot contain a truncation marker")
        else:
            if self.canonical_char_count == 0:
                derived.append("empty_text")
                if self.canonical_utf8_bytes != 0:
                    raise ValueError("empty text must have zero UTF-8 bytes")
            elif self.canonical_utf8_bytes < self.canonical_char_count:
                raise ValueError("UTF-8 byte count cannot be below character count")
            if not self.integrity_valid:
                derived.append("integrity_mismatch")
            if self.truncation_marker_detected:
                derived.append("historical_truncation_marker")
            if not self.canonical_text_sha256:
                raise ValueError("readable canonical text requires a SHA-256")
        if self.source_truncated:
            derived.append("source_truncated")
        expected = tuple(reason for reason in _REASON_ORDER if reason in derived)
        if self.reasons != expected:
            raise ValueError("extraction quality reasons are inconsistent")
        expected_status = "held" if expected else "passed"
        if self.status != expected_status:
            raise ValueError("extraction quality status is inconsistent")
        return self


def assess_extraction_text(
    text: str | None,
    *,
    text_readable: bool = True,
    integrity_valid: bool = True,
    source_truncated: bool = False,
) -> ExtractionQualityV1:
    present = text is not None
    readable = bool(present and text_readable)
    value = text if readable and isinstance(text, str) else ""
    marker = bool(readable and TRUNCATION_MARKER_PREFIX in value)
    reasons: list[QualityReason] = []
    if not present:
        reasons.append("missing_text")
    elif not readable:
        reasons.append("unreadable_text")
    else:
        if not value:
            reasons.append("empty_text")
        if not integrity_valid:
            reasons.append("integrity_mismatch")
        if marker:
            reasons.append("historical_truncation_marker")
    if source_truncated:
        reasons.append("source_truncated")
    ordered = tuple(reason for reason in _REASON_ORDER if reason in reasons)
    return ExtractionQualityV1(
        status="held" if ordered else "passed",
        reasons=ordered,
        text_present=present,
        text_readable=readable,
        integrity_valid=bool(integrity_valid),
        source_truncated=bool(source_truncated),
        truncation_marker_detected=marker,
        canonical_text_sha256=sha256_text(value) if readable else "",
        canonical_char_count=len(value),
        canonical_utf8_bytes=len(value.encode("utf-8")),
    )


class ExtractionManifestV2(_StrictModel):
    schema_version: Literal["extraction-manifest-v2.0"] = "extraction-manifest-v2.0"
    doc_id: str
    source_artifact_path: str
    canonical_artifact_path: str
    source_sha256: str = ""
    extraction_tool: str
    canonical_text_sha256: str
    canonical_char_count: int = Field(ge=0)
    canonical_utf8_bytes: int = Field(ge=0)
    source_truncated: bool
    truncation_marker_detected: bool
    sections_schema_version: str = ""
    sections_artifact_sha256: str = ""
    units_schema_version: str = ""
    units_artifact_sha256: str = ""
    quality: ExtractionQualityV1

    @field_validator("doc_id")
    @classmethod
    def _doc_id(cls, value: str) -> str:
        return require_safe_id(value, field="doc_id")

    @field_validator("source_artifact_path", "canonical_artifact_path")
    @classmethod
    def _paths(cls, value: str, info) -> str:
        return require_relative_path(value, field=info.field_name)

    @field_validator(
        "canonical_text_sha256", "source_sha256", "sections_artifact_sha256",
        "units_artifact_sha256",
    )
    @classmethod
    def _hashes(cls, value: str, info) -> str:
        return require_sha256(value, field=info.field_name) if value else value

    @model_validator(mode="after")
    def _manifest_invariants(self) -> "ExtractionManifestV2":
        if not self.extraction_tool or self.extraction_tool != self.extraction_tool.strip():
            raise ValueError("extraction_tool is missing or malformed")
        if self.canonical_text_sha256 != self.quality.canonical_text_sha256:
            raise ValueError("manifest and quality canonical hashes differ")
        if self.canonical_char_count != self.quality.canonical_char_count:
            raise ValueError("manifest and quality character counts differ")
        if self.canonical_utf8_bytes != self.quality.canonical_utf8_bytes:
            raise ValueError("manifest and quality byte counts differ")
        if self.source_truncated != self.quality.source_truncated:
            raise ValueError("manifest and quality source truncation differ")
        if self.truncation_marker_detected != self.quality.truncation_marker_detected:
            raise ValueError("manifest and quality marker detection differ")
        for version, digest, label in (
            (self.sections_schema_version, self.sections_artifact_sha256, "sections"),
            (self.units_schema_version, self.units_artifact_sha256, "units"),
        ):
            if bool(version) != bool(digest):
                raise ValueError(f"{label} version and artifact hash must be paired")
        return self


def build_extraction_manifest(
    *,
    doc_id: str,
    canonical_text: str,
    extraction_tool: str,
    source_artifact_path: str = "fixtures/source.txt",
    canonical_artifact_path: str = "extracted.txt",
    source_sha256: str = "",
    source_truncated: bool = False,
    sections_schema_version: str = "",
    sections_artifact_sha256: str = "",
    units_schema_version: str = "",
    units_artifact_sha256: str = "",
) -> ExtractionManifestV2:
    quality = assess_extraction_text(
        canonical_text, source_truncated=source_truncated,
    )
    return ExtractionManifestV2(
        doc_id=doc_id,
        source_artifact_path=source_artifact_path,
        canonical_artifact_path=canonical_artifact_path,
        source_sha256=source_sha256,
        extraction_tool=extraction_tool,
        canonical_text_sha256=quality.canonical_text_sha256,
        canonical_char_count=quality.canonical_char_count,
        canonical_utf8_bytes=quality.canonical_utf8_bytes,
        source_truncated=source_truncated,
        truncation_marker_detected=quality.truncation_marker_detected,
        sections_schema_version=sections_schema_version,
        sections_artifact_sha256=sections_artifact_sha256,
        units_schema_version=units_schema_version,
        units_artifact_sha256=units_artifact_sha256,
        quality=quality,
    )


def validate_extraction_manifest(manifest: ExtractionManifestV2, canonical_text: str) -> None:
    expected = assess_extraction_text(
        canonical_text, source_truncated=manifest.source_truncated,
    )
    if manifest.quality != expected:
        raise ValueError("extraction manifest does not match canonical text")


class ArtifactDispositionRequest(_StrictModel):
    doc_id: str
    canonical_text: str | None = None
    text_readable: bool = True
    source_truncated: bool = False
    preserved_source_available: bool = False
    declared_text_sha256: str = ""
    declared_char_count: int | None = Field(default=None, ge=0)
    declared_utf8_bytes: int | None = Field(default=None, ge=0)

    @field_validator("doc_id")
    @classmethod
    def _id(cls, value: str) -> str:
        return require_safe_id(value, field="doc_id")

    @field_validator("declared_text_sha256")
    @classmethod
    def _declared_hash(cls, value: str) -> str:
        return require_sha256(value, field="declared_text_sha256") if value else value


class ArtifactDispositionDecision(_StrictModel):
    doc_id: str
    classification: Literal["reuse_complete", "re_extract", "hold_repair"]
    reasons: tuple[QualityReason, ...]

    @field_validator("doc_id")
    @classmethod
    def _id(cls, value: str) -> str:
        return require_safe_id(value, field="doc_id")


class ArtifactDispositionPlan(_StrictModel):
    schema_version: Literal["artifact-disposition-plan-v1.0"] = (
        "artifact-disposition-plan-v1.0"
    )
    report_only: Literal[True] = True
    decisions: tuple[ArtifactDispositionDecision, ...]
    counts: dict[str, int]
    plan_sha256: str

    @field_validator("plan_sha256")
    @classmethod
    def _plan_hash(cls, value: str) -> str:
        return require_sha256(value, field="plan_sha256")

    @model_validator(mode="after")
    def _plan_invariants(self) -> "ArtifactDispositionPlan":
        if tuple(row.doc_id for row in self.decisions) != tuple(
            sorted({row.doc_id for row in self.decisions})
        ):
            raise ValueError("disposition decisions must be sorted and unique")
        expected_counts = {
            name: sum(row.classification == name for row in self.decisions)
            for name in ("reuse_complete", "re_extract", "hold_repair")
        }
        if self.counts != expected_counts:
            raise ValueError("disposition counts are inconsistent")
        stable = {
            "schema_version": self.schema_version,
            "report_only": self.report_only,
            "decisions": [row.model_dump(mode="json") for row in self.decisions],
            "counts": self.counts,
        }
        if self.plan_sha256 != hashlib.sha256(canonical_json_bytes(stable)).hexdigest():
            raise ValueError("disposition plan hash mismatch")
        return self


def plan_artifact_disposition(
    requests: list[ArtifactDispositionRequest] | tuple[ArtifactDispositionRequest, ...],
) -> ArtifactDispositionPlan:
    by_doc: dict[str, ArtifactDispositionRequest] = {}
    for request in requests:
        previous = by_doc.get(request.doc_id)
        if previous is not None and previous != request:
            raise ValueError(f"conflicting duplicate doc_id: {request.doc_id}")
        by_doc[request.doc_id] = request
    decisions: list[ArtifactDispositionDecision] = []
    for doc_id in sorted(by_doc):
        request = by_doc[doc_id]
        text = request.canonical_text
        integrity_valid = True
        if text is not None and request.text_readable:
            integrity_valid = all((
                not request.declared_text_sha256
                or request.declared_text_sha256 == sha256_text(text),
                request.declared_char_count is None
                or request.declared_char_count == len(text),
                request.declared_utf8_bytes is None
                or request.declared_utf8_bytes == len(text.encode("utf-8")),
            ))
        quality = assess_extraction_text(
            text,
            text_readable=request.text_readable,
            integrity_valid=integrity_valid,
            source_truncated=request.source_truncated,
        )
        if quality.status == "passed":
            classification = "reuse_complete"
        elif request.preserved_source_available:
            classification = "re_extract"
        else:
            classification = "hold_repair"
        decisions.append(ArtifactDispositionDecision(
            doc_id=doc_id, classification=classification, reasons=quality.reasons,
        ))
    ordered = tuple(decisions)
    counts = {
        name: sum(row.classification == name for row in ordered)
        for name in ("reuse_complete", "re_extract", "hold_repair")
    }
    stable = {
        "schema_version": "artifact-disposition-plan-v1.0",
        "report_only": True,
        "decisions": [row.model_dump(mode="json") for row in ordered],
        "counts": counts,
    }
    return ArtifactDispositionPlan(
        decisions=ordered,
        counts=counts,
        plan_sha256=hashlib.sha256(canonical_json_bytes(stable)).hexdigest(),
    )


def write_canonical_text(path: Path, canonical_text: str) -> Path:
    """Persist exact UTF-8 bytes without newline or whitespace normalization."""
    if not isinstance(canonical_text, str):
        raise TypeError("canonical_text must be a string")
    return atomic_write_bytes(Path(path), canonical_text.encode("utf-8"))


def validate_preprocess_text_artifacts(
    *,
    canonical_text: str | None,
    model_text: str,
    model_input_receipt: ModelInputSliceReceiptV1 | dict | None,
) -> tuple[str, ModelInputSliceReceiptV1 | None]:
    """Resolve legacy/new text meanings and validate before any persistence."""
    if not isinstance(model_text, str):
        raise TypeError("model_text must be a string")
    receipt_absent = model_input_receipt is None or model_input_receipt == {}
    if receipt_absent:
        if canonical_text is None:
            return model_text, None
        if not isinstance(canonical_text, str):
            raise TypeError("canonical_text must be a string or None")
        if canonical_text != model_text:
            raise ValueError("distinct model input requires model_input_receipt")
        return canonical_text, None
    if canonical_text is None:
        raise ValueError("model-input receipt requires complete canonical_text")
    if not isinstance(canonical_text, str):
        raise TypeError("canonical_text must be a string")
    if isinstance(model_input_receipt, ModelInputSliceReceiptV1):
        receipt = model_input_receipt
    elif isinstance(model_input_receipt, dict):
        receipt = ModelInputSliceReceiptV1.model_validate_json(
            json.dumps(model_input_receipt, ensure_ascii=False)
        )
    else:
        raise TypeError("model_input_receipt must be a receipt, dict, or None")
    validate_model_input_slice(
        receipt,
        canonical_text=canonical_text,
        emitted_text=model_text,
    )
    return canonical_text, receipt


def persist_preprocess_text_artifacts(
    directory: Path,
    *,
    canonical_text: str | None,
    model_text: str,
    model_input_receipt: ModelInputSliceReceiptV1 | dict | None,
) -> tuple[str, ModelInputSliceReceiptV1 | None]:
    """Atomically persist validated canonical and optional bounded text artifacts."""
    resolved_canonical, receipt = validate_preprocess_text_artifacts(
        canonical_text=canonical_text,
        model_text=model_text,
        model_input_receipt=model_input_receipt,
    )
    directory = Path(directory)
    if receipt is None:
        stale_sidecars = tuple(
            path.name
            for path in (
                directory / MODEL_INPUT_FILENAME,
                directory / MODEL_INPUT_RECEIPT_FILENAME,
            )
            if path.exists() or path.is_symlink()
        )
        if stale_sidecars:
            raise ValueError(
                "no-receipt save blocked by existing model-input sidecars: "
                + ", ".join(stale_sidecars)
            )
    write_canonical_text(directory / "extracted.txt", resolved_canonical)
    if receipt is not None:
        write_canonical_text(directory / MODEL_INPUT_FILENAME, model_text)
        atomic_write_json(
            directory / MODEL_INPUT_RECEIPT_FILENAME,
            receipt.model_dump(mode="json"),
            ensure_ascii=False,
        )
    return resolved_canonical, receipt


def read_canonical_text(path: Path) -> str:
    """Read exact UTF-8 bytes without universal-newline translation."""
    return Path(path).read_bytes().decode("utf-8")


def load_model_input_text(directory: Path) -> tuple[str, str, ModelInputSliceReceiptV1 | None]:
    """Load canonical evidence and the bounded legacy-model view when declared.

    Legacy directories without a receipt retain their historical behavior.
    New directories never fall back from a declared bounded view to uncontrolled
    canonical text: an invalid declared receipt raises instead.
    """
    directory = Path(directory)
    canonical = read_canonical_text(directory / "extracted.txt")
    receipt_path = directory / MODEL_INPUT_RECEIPT_FILENAME
    if not receipt_path.is_file():
        return canonical, canonical, None
    receipt = ModelInputSliceReceiptV1.model_validate_json(receipt_path.read_bytes())
    model_path = directory / MODEL_INPUT_FILENAME
    if model_path.is_file():
        emitted = read_canonical_text(model_path)
        validate_model_input_slice(
            receipt, canonical_text=canonical, emitted_text=emitted,
        )
    else:
        emitted = render_model_input_slice(receipt, canonical_text=canonical)
    return canonical, emitted, receipt
