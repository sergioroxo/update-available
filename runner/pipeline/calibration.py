"""Human-owned anchor-set audit for system versions.

This is not a plan to label the corpus or to treat model confidence as truth.
The researcher deliberately selects a small, durable set of difficult or
important documents.  The system can re-read those documents with updated
prompts, lexicon context, retrieval, and model routes; the ledger records only
the disagreements that merit human attention.  It never blocks long-tail
ingestion, calls a model, or changes a corpus document.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "anchor-audit-ledger-v1.0"
OUTCOMES = ("accepted", "minor_correction", "major_correction", "unusable")
_SEVERE_OUTCOMES = {"major_correction", "unusable"}


def _read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def build_anchor_set(
    corpus_dir: Path,
    doc_ids: list[str],
    *,
    title: str = "SOGICE system anchor set",
    rationale: str = "",
) -> dict:
    """Create a non-mutating manifest for selected system-audit documents.

    Selection should cover consequential documents and known hard cases rather
    than pretending to be a statistically representative labeled corpus.
    """
    corpus_dir = Path(corpus_dir)
    unique_ids = list(dict.fromkeys(str(value).strip() for value in doc_ids if str(value).strip()))
    if not unique_ids:
        raise ValueError("Select at least one anchor document")
    missing = [doc_id for doc_id in unique_ids if not (corpus_dir / doc_id / "analysis.json").exists()]
    if missing:
        raise ValueError("Anchor documents missing analysis.json: " + ", ".join(missing))
    documents = []
    for doc_id in unique_ids:
        doc_dir = corpus_dir / doc_id
        analysis = _read_json(doc_dir / "analysis.json", {})
        intake = _read_json(doc_dir / "intake.json", {})
        documents.append({
            "doc_id": doc_id,
            "document_type": str(analysis.get("type") or analysis.get("primary_type") or "unknown"),
            "languages": analysis.get("languages") or [],
            "tier": int(intake.get("tier") or 0),
            "selection_reason": "",
            "audit_questions": [],
        })
    return {
        "schema_version": "anchor-set-v1.0",
        "created_at": _now(),
        "title": title.strip() or "SOGICE system anchor set",
        "rationale": rationale.strip(),
        "documents": documents,
        "protocol": [
            "Read the full available source with the current SOGICE lexicon and ontology context.",
            "Retrieve related reviewed terms and documents; distinguish retrieved evidence from model memory.",
            "Run an independent second model on the same typed task without showing it the first answer.",
            "Compare classifications, evidence locators, omissions, and normalisation warnings.",
            "Escalate disagreements or consequential unsupported claims to the researcher; do not review agreements by default.",
            "Store model, prompt, lexicon, retrieval, and code versions so the same anchor set can audit future system versions.",
        ],
        "purpose": (
            "Detect system drift and important failure modes on selected anchors. "
            "This is not corpus-wide labeling and does not gate long-tail ingestion."
        ),
    }


def build_calibration_record(
    doc_dir: Path,
    *,
    outcome: str,
    corrected_fields: list[str] | None = None,
    review_minutes: float = 0.0,
    reviewer: str = "researcher",
    notes: str = "",
    reviewed_at: str | None = None,
) -> dict:
    """Build one ledger row from local artifacts and an explicit human verdict."""
    if outcome not in OUTCOMES:
        raise ValueError(f"outcome must be one of: {', '.join(OUTCOMES)}")
    doc_dir = Path(doc_dir)
    analysis = _read_json(doc_dir / "analysis.json", {})
    intake = _read_json(doc_dir / "intake.json", {})
    if not isinstance(analysis, dict) or not analysis:
        raise ValueError(f"No readable analysis.json in {doc_dir}")
    if not isinstance(intake, dict):
        intake = {}
    confidence = analysis.get("confidence") or {}
    if not isinstance(confidence, dict):
        confidence = {}
    languages = analysis.get("languages") or []
    if isinstance(languages, str):
        languages = [languages]
    audit = _read_json(doc_dir / "analysis_audit.json", {})
    if not isinstance(audit, dict):
        audit = {}
    return {
        "schema_version": SCHEMA_VERSION,
        "doc_id": str(analysis.get("doc_id") or intake.get("doc_id") or doc_dir.name),
        "reviewed_at": reviewed_at or _now(),
        "reviewer": reviewer.strip() or "researcher",
        "outcome": outcome,
        "corrected_fields": sorted({str(v).strip() for v in (corrected_fields or []) if str(v).strip()}),
        "review_minutes": max(0.0, _as_float(review_minutes)),
        "notes": notes.strip(),
        "model_confidence": _as_float(confidence.get("overall_score")),
        "model_confidence_status": str(confidence.get("status") or "unknown"),
        "document_type": str(analysis.get("type") or analysis.get("primary_type") or "unknown"),
        "tier": int(intake.get("tier") or 0),
        "languages": [str(v) for v in languages if str(v).strip()],
        "model": str(audit.get("resolved_model") or audit.get("model") or audit.get("llm_flag") or "unknown"),
        "prompt_version": str(analysis.get("prompt_version") or audit.get("prompt_version") or "unknown"),
    }


def read_ledger(path: Path) -> list[dict]:
    """Read valid JSON object rows from a JSONL ledger."""
    path = Path(path)
    if not path.exists():
        return []
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict) and row.get("doc_id") and row.get("outcome") in OUTCOMES:
            rows.append(row)
    return rows


def append_record(path: Path, record: dict) -> None:
    """Append one row, refusing duplicate document reviews by default."""
    path = Path(path)
    existing = read_ledger(path)
    doc_id = str(record.get("doc_id") or "")
    if any(str(row.get("doc_id")) == doc_id for row in existing):
        raise ValueError(f"Calibration already recorded for {doc_id}; edit the ledger intentionally instead")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    rows = [*existing, record]
    temporary.write_text(
        "".join(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n" for row in rows),
        encoding="utf-8",
    )
    temporary.replace(path)


def build_calibration_report(rows: list[dict]) -> dict:
    """Summarize anchor outcomes without deriving confidence thresholds."""
    valid = [row for row in rows if row.get("outcome") in OUTCOMES]
    outcomes = Counter(str(row["outcome"]) for row in valid)
    by_status: dict[str, Counter] = defaultdict(Counter)
    by_language: Counter = Counter()
    corrected_fields: Counter = Counter()
    high_confidence_severe: list[str] = []
    for row in valid:
        outcome = str(row["outcome"])
        status = str(row.get("model_confidence_status") or "unknown")
        by_status[status][outcome] += 1
        for lang in row.get("languages") or ["unknown"]:
            by_language[str(lang)] += 1
        corrected_fields.update(str(v) for v in (row.get("corrected_fields") or []))
        confidence = _as_float(row.get("model_confidence"))
        if outcome in _SEVERE_OUTCOMES:
            if confidence >= 0.85:
                high_confidence_severe.append(str(row.get("doc_id") or ""))

    reviewed = len(valid)
    acceptable = outcomes["accepted"] + outcomes["minor_correction"]
    warnings = []
    if not reviewed:
        warnings.append(
            "No anchor outcomes have been recorded. This does not block long-tail ingestion; "
            "record outcomes when a selected anchor comparison exposes a meaningful disagreement."
        )
    if high_confidence_severe:
        warnings.append(
            "High-confidence severe errors observed in: " + ", ".join(sorted(high_confidence_severe))
        )
    if reviewed and len(by_language) < 3:
        warnings.append("Language coverage is narrow; add reviewed examples from more project languages.")

    return {
        "schema_version": "anchor-audit-report-v1.0",
        "generated_at": _now(),
        "sample_size": reviewed,
        "outcomes": {name: outcomes[name] for name in OUTCOMES},
        "acceptable_rate": round(acceptable / reviewed, 3) if reviewed else 0.0,
        "outcomes_by_confidence_status": {
            status: {name: counts[name] for name in OUTCOMES}
            for status, counts in sorted(by_status.items())
        },
        "language_coverage": dict(sorted(by_language.items())),
        "most_corrected_fields": corrected_fields.most_common(12),
        "high_confidence_severe_error_docs": sorted(high_confidence_severe),
        "threshold_policy": (
            "No threshold is derived from model self-confidence. Anchor outcomes are used to compare "
            "system versions, find failure patterns, and choose where audits or second opinions are useful."
        ),
        "warnings": warnings,
    }
