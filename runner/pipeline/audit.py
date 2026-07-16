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
import subprocess
import hashlib
from dataclasses import asdict, dataclass, field, fields
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

try:
    from runner.models.document import AnalysisResult
    from runner.models.enrichment import EnrichmentResult
except ImportError:
    from ..models.document import AnalysisResult
    from ..models.enrichment import EnrichmentResult

_SCHEMA_VERSION = "4"
_REPO_ROOT = Path(__file__).parents[2]


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def sha256_text(text: str) -> str:
    """Return a stable SHA-256 hash for prompt text without storing the prompt."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@lru_cache(maxsize=1)
def current_git_commit() -> str:
    """Best-effort current repository commit hash for reproducibility metadata."""
    try:
        result = subprocess.run(
            ["git", "-C", str(_REPO_ROOT), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            timeout=2,
        )
        return result.stdout.strip()
    except Exception:
        return ""


@dataclass
class AnalysisRunMeta:
    """Metadata captured during a Stage 3b analysis run.

    All fields default to safe empty values so audit files are valid even
    before the threading wiring in analyze.py is added (Slice 2).
    """
    llm_flag: str = ""              # --llm flag value, e.g. "litelm"
    model: str = ""                 # resolved model alias, e.g. "core-qwen"
    provider_resolved_model: str = "" # provider response identity when exposed
    input_char_count: int = 0       # len(preprocess.text) sent to the model
    input_truncated: bool = False   # whether _maybe_truncate fired
    lexicon_terms_available: int = 0 # count fetched from Sanity before the analysis cap
    lexicon_terms_injected: int = 0  # count actually in the analysis prompt (after cap)
    lexicon_injection_cap: int = 0   # cap applied (200 for Stage 3b analysis)
    prompt_sha256: str = ""          # hash of resolved system prompt text
    prompt_template_sha256: str = "" # hash of bare prompt template before injections
    git_commit: str = ""             # current repo commit, best effort
    model_parameters: dict = field(default_factory=dict)
    input_receipt: dict = field(default_factory=dict)
    comparison_run: dict = field(default_factory=dict)
    attempt_history: list[dict] = field(default_factory=list)
    lexicon_fingerprint: str = ""
    tag_registry_fingerprint: str = ""
    policy_fingerprint: str = ""
    duration_ms: int = 0
    raw_response_chars: int = 0      # len(raw_json) returned by the model
    raw_response_sha256: str = ""     # response identity only; response text is never persisted
    validation_path: str = ""       # "outside_think_tags" | "inside_think_tags" | "raw"
    validation_attempts: int = 0    # extraction paths tried before success
    score_derived_from_status: bool = False
    errors: list[str] = field(default_factory=list)


@dataclass
class EnrichmentRunMeta:
    """Metadata captured during a Stage 3c enrichment run.

    All fields default to safe empty values so audit files are valid even
    before the threading wiring in enrich.py is added (Slice 2).
    """
    llm_flag: str = ""
    model: str = ""
    provider_resolved_model: str = ""
    input_char_count: int = 0
    # Stage 3c research-memory lexicon source counts (schema v4). Records how much
    # of each memory layer was injected so the lexicon coverage is auditable.
    lexicon_terms_sanity: int = 0   # live Sanity draft+validated terms injected
    lexicon_terms_seed: int = 0     # curated seed-draft terms injected
    lexicon_terms_legacy: int = 0   # legacy-glossary draft terms injected
    lexicon_terms_injected: int = 0 # total after dedupe (sanity > seed > legacy)
    chunked: bool = False
    chunk_count: int | None = None
    chunks: list[dict] | None = None  # [{index, char_count, succeeded, model, validation_path, validation_attempts, normalization_repairs, error}]
    whole_doc_fallback_reason: str = ""  # non-empty only when chunked=True; explains why whole-doc extraction failed
    prompt_sha256: str = ""
    prompt_template_sha256: str = ""
    git_commit: str = ""
    model_parameters: dict = field(default_factory=dict)
    input_receipt: dict = field(default_factory=dict)
    whole_doc_input_receipt: dict = field(default_factory=dict)
    lexicon_fingerprint: str = ""
    provisional_memory_fingerprint: str = ""
    provisional_memory_clusters_injected: int = 0
    provisional_memory_cluster_ids: list[str] = field(default_factory=list)
    provisional_memory_retrieval_method: str = ""
    provisional_memory_error: str = ""
    tag_registry_fingerprint: str = ""
    policy_fingerprint: str = ""
    govuk_definition_memory: dict = field(default_factory=dict)
    duration_ms: int = 0
    raw_response_chars: int = 0
    raw_response_sha256: str = ""
    validation_path: str = ""
    validation_attempts: int = 0
    normalization_repairs: int = 0
    corpus_connections_suppressed: bool = False
    corpus_connections_suppression_reason: str = ""
    merge_summary: dict = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


@dataclass
class TriageRunMeta:
    """Metadata captured for Stage 0.5 triage routing runs."""
    model: str = ""
    context_char_count: int = 0
    prompt_sha256: str = ""
    prompt_template_sha256: str = ""
    git_commit: str = ""
    model_parameters: dict = field(default_factory=dict)
    duration_ms: int = 0
    raw_response_chars: int = 0
    validation_path: str = ""
    validation_attempts: int = 0
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


def _to_triage_meta(run_meta: TriageRunMeta | dict | None) -> TriageRunMeta:
    if run_meta is None:
        return TriageRunMeta()
    if isinstance(run_meta, TriageRunMeta):
        return run_meta
    known = {f.name for f in fields(TriageRunMeta)}
    return TriageRunMeta(**{k: v for k, v in run_meta.items() if k in known})


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
        meta = asdict(_to_analysis_meta(run_meta))
        meta["git_commit"] = meta.get("git_commit") or current_git_commit()
        payload = {
            "schema_version": _SCHEMA_VERSION,
            "doc_id": doc_id or doc_dir.name,
            "run_at": _utcnow(),
            "prompt_version": prompt_version,
            "ontology_version": ontology_version,
            **meta,
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
        meta = asdict(_to_enrichment_meta(run_meta))
        meta["git_commit"] = meta.get("git_commit") or current_git_commit()
        payload = {
            "schema_version": _SCHEMA_VERSION,
            "doc_id": result.doc_id,
            "run_at": _utcnow(),
            "prompt_version": result.enrichment_prompt_version,
            "run_type": result.run_type,
            **meta,
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


def write_triage_audit(
    doc_dir: Path,
    run_meta: TriageRunMeta | dict | None,
    result,
    *,
    doc_id: str = "",
) -> None:
    """Write triage_audit.json to doc_dir.

    The sidecar captures routing provenance without storing the triage prompt,
    snippet, or raw model response.
    """
    out = doc_dir / "triage_audit.json"
    try:
        meta = asdict(_to_triage_meta(run_meta))
        meta["git_commit"] = meta.get("git_commit") or current_git_commit()
        payload = {
            "schema_version": _SCHEMA_VERSION,
            "doc_id": doc_id or doc_dir.name,
            "run_at": _utcnow(),
            "stage": "triage",
            **meta,
            "triage_succeeded": getattr(result, "triage_succeeded", False),
            "doc_type_hint": getattr(result, "doc_type_hint", "unknown"),
            "recommended_llm": getattr(result, "recommended_llm", ""),
            "complexity": getattr(result, "complexity", ""),
            "overnight_batch_safe": getattr(result, "overnight_batch_safe", False),
            "needs_book_splitting": getattr(result, "needs_book_splitting", False),
            "needs_testimony_review": getattr(result, "needs_testimony_review", False),
            "needs_media_review": getattr(result, "needs_media_review", False),
            "needs_legal_review": getattr(result, "needs_legal_review", False),
            "suggested_process_route": getattr(result, "suggested_process_route", ""),
            "routing_reason": getattr(result, "routing_reason", ""),
        }
        _archive_if_exists(out)
        out.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    except Exception as exc:
        _fallback_log(doc_dir, f"audit_write_failed triage_audit: {exc}")


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
