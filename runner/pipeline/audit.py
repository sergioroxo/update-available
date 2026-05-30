"""
Audit trace for LLM analysis and enrichment runs.

Writes analysis_audit.json and enrichment_audit.json beside the normal
corpus outputs. Each file records structured metadata about a model run:
model name, input size, validation path, proposal counts, schema
normalisation warnings, and timestamps.

Chain-of-thought content and raw model responses are never stored here.
Audit write failures are non-fatal: any exception is caught and appended
to audit.log; the pipeline continues normally.
"""
from __future__ import annotations

import json
import shutil
from dataclasses import asdict, dataclass, field, fields
from datetime import datetime, timezone
from pathlib import Path

try:
    from runner.models.document import AnalysisResult
    from runner.models.enrichment import EnrichmentResult
except ImportError:
    from ..models.document import AnalysisResult
    from ..models.enrichment import EnrichmentResult

_SCHEMA_VERSION = "1"


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


@dataclass
class AnalysisRunMeta:
    """Metadata captured during a Stage 3b analysis run.

    All fields default to safe empty values so audit files are valid even
    before the threading wiring in analyze.py is added (Slice 2).
    """
    llm_flag: str = ""              # --llm flag value, e.g. "litelm"
    model: str = ""                 # resolved model alias, e.g. "core-qwen"
    input_char_count: int = 0       # len(preprocess.text) sent to the model
    input_truncated: bool = False   # whether _maybe_truncate fired
    lexicon_terms_injected: int = 0 # count of lexicon terms in the system prompt
    raw_response_chars: int = 0     # len(raw_json) returned by the model
    validation_path: str = ""       # "outside_think_tags" | "inside_think_tags" | "raw"
    validation_attempts: int = 0    # extraction paths tried before success
    errors: list[str] = field(default_factory=list)


@dataclass
class EnrichmentRunMeta:
    """Metadata captured during a Stage 3c enrichment run.

    All fields default to safe empty values so audit files are valid even
    before the threading wiring in enrich.py is added (Slice 2).
    """
    llm_flag: str = ""
    model: str = ""
    input_char_count: int = 0
    chunked: bool = False
    chunk_count: int | None = None
    chunks: list[dict] | None = None  # [{index, char_count, succeeded, error}]
    validation_path: str = ""
    validation_attempts: int = 0
    normalization_repairs: int = 0
    errors: list[str] = field(default_factory=list)


def _to_analysis_meta(run_meta: AnalysisRunMeta | dict | None) -> AnalysisRunMeta:
    if run_meta is None:
        return AnalysisRunMeta()
    if isinstance(run_meta, AnalysisRunMeta):
        return run_meta
    known = {f.name for f in fields(AnalysisRunMeta)}
    return AnalysisRunMeta(**{k: v for k, v in run_meta.items() if k in known})


def _to_enrichment_meta(run_meta: EnrichmentRunMeta | dict | None) -> EnrichmentRunMeta:
    if run_meta is None:
        return EnrichmentRunMeta()
    if isinstance(run_meta, EnrichmentRunMeta):
        return run_meta
    known = {f.name for f in fields(EnrichmentRunMeta)}
    return EnrichmentRunMeta(**{k: v for k, v in run_meta.items() if k in known})


def write_analysis_audit(
    doc_dir: Path,
    run_meta: AnalysisRunMeta | dict | None,
    analysis: AnalysisResult,
    *,
    doc_id: str = "",
    prompt_version: str = "",
    ontology_version: str = "",
) -> None:
    """Write analysis_audit.json to doc_dir.

    Archives the previous file if one exists. Non-fatal on any failure.
    """
    out = doc_dir / "analysis_audit.json"
    try:
        payload = {
            "schema_version": _SCHEMA_VERSION,
            "doc_id": doc_id or doc_dir.name,
            "run_at": _utcnow(),
            "prompt_version": prompt_version,
            "ontology_version": ontology_version,
            **asdict(_to_analysis_meta(run_meta)),
            # Derived from AnalysisResult -- parsed fields only, no LLM text
            "normalisation_warnings": list(analysis.normalisation_warnings),
            "confidence_score": analysis.confidence.overall_score,
            "confidence_status": analysis.confidence.status,
            "doc_type": analysis.type,
            "needs_review": analysis.needs_review,
            "testimony_flag": analysis.testimony_flag,
            "candidate_terms_count": len(analysis.candidate_terms),
            "evidence_count": len(analysis.evidence),
        }
        _archive_if_exists(out)
        out.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    except Exception as exc:
        _fallback_log(doc_dir, f"audit_write_failed analysis_audit: {exc}")


def write_enrichment_audit(
    doc_dir: Path,
    run_meta: EnrichmentRunMeta | dict | None,
    result: EnrichmentResult,
) -> None:
    """Write enrichment_audit.json to doc_dir.

    Archives the previous file if one exists. Non-fatal on any failure.
    """
    out = doc_dir / "enrichment_audit.json"
    try:
        payload = {
            "schema_version": _SCHEMA_VERSION,
            "doc_id": result.doc_id,
            "run_at": _utcnow(),
            "prompt_version": result.enrichment_prompt_version,
            "run_type": result.run_type,
            **asdict(_to_enrichment_meta(run_meta)),
            # Derived from EnrichmentResult -- counts only, no proposal content
            "enrichment_model": result.enrichment_model,
            "lexicon_proposals_count": len(result.lexicon_proposals),
            "entity_proposals_count": len(result.entity_proposals),
            "tactic_proposals_count": len(result.tactic_proposals),
            "ingestion_queue_count": len(result.ingestion_queue),
            "corpus_connections_count": len(result.corpus_connections),
            "practice_descriptions_count": len(result.practice_descriptions),
            "statistical_claims_count": len(result.statistical_claims),
        }
        _archive_if_exists(out)
        out.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    except Exception as exc:
        _fallback_log(doc_dir, f"audit_write_failed enrichment_audit: {exc}")


def _archive_if_exists(path: Path) -> None:
    if path.exists():
        archive = path.with_name(f"{path.stem}_{_timestamp()}.json")
        shutil.copy2(path, archive)


def _fallback_log(doc_dir: Path, message: str) -> None:
    try:
        with (doc_dir / "audit.log").open("a", encoding="utf-8") as f:
            f.write(f"{_utcnow()} {message}\n")
    except Exception:
        pass
