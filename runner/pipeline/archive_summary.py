"""Derived archive profiles for knowledge-graph and public-archive layers.

``archive_summary.json`` is a deterministic, regenerable index card for a
corpus document. It consolidates existing local artifacts without mutating
analysis, enrichment, uploads, or review sidecars.

The module is intentionally local-only: no model calls, no Sanity/Supabase
writes, no network. It is the KG-0 foundation for later evidence graph exports.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from runner.app_readiness import build_document_readiness, summarize_enrichment_lifecycle
from runner.pipeline.audit import current_git_commit
from runner.pipeline.citation_units import (
    CITATION_UNITS_FILENAME,
    build_citation_units,
    citation_summary,
)


SCHEMA_VERSION = "archive-summary-v1.0"
SUMMARY_FILENAME = "archive_summary.json"
KNOWLEDGE_EXPORT_DIR = "knowledge"
DOCUMENT_PROFILES_JSONL = "document_profiles.jsonl"

_ARTIFACT_FILES = {
    "intake": "intake.json",
    "preprocess": "preprocess.json",
    "citation_units": CITATION_UNITS_FILENAME,
    "analysis": "analysis.json",
    "analysis_audit": "analysis_audit.json",
    "enrichment": "enrichment.json",
    "enrichment_audit": "enrichment_audit.json",
    "embedding": "embedding.json",
    "metadata": "metadata.json",
    "sanity_record": "sanity_record.json",
    "review_status": "review_status.json",
    "legal_review": "legal_review.json",
    "testimony_review": "testimony_review.json",
    "offload_import": "offload_import.json",
    "source_item": "source_item.json",
}

_ENRICHMENT_FAMILIES = (
    "lexicon_proposals",
    "entity_proposals",
    "tactic_proposals",
    "practice_descriptions",
    "statistical_claims",
    "ingestion_queue",
    "corpus_connections",
)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json_safe(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _artifact_labels(doc_dir: Path) -> list[str]:
    return sorted(
        label for label, filename in _ARTIFACT_FILES.items()
        if (doc_dir / filename).exists()
    )


def _hostname(url: str) -> str:
    if not url:
        return ""
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return ""


def _is_web_url(value: str) -> bool:
    try:
        parsed = urlparse(str(value or "").strip())
    except Exception:
        return False
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _int(value, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _confidence_score(analysis: dict) -> float:
    conf = analysis.get("confidence") or {}
    if isinstance(conf, dict):
        try:
            return float(conf.get("overall_score") or conf.get("overall") or 0.0)
        except Exception:
            return 0.0
    return 0.0


def _confidence_status(analysis: dict) -> str:
    conf = analysis.get("confidence") or {}
    if isinstance(conf, dict):
        return str(conf.get("status") or "").strip()
    return ""


def _embedding_metadata(embedding: dict) -> dict:
    vector = embedding.get("embedding")
    if vector is None:
        vector = embedding.get("vector")
    dimension = embedding.get("dimension")
    if dimension in (None, "") and isinstance(vector, list):
        dimension = len(vector)
    return {
        "model": str(embedding.get("model") or embedding.get("embedding_model") or "").strip(),
        "dimension": _int(dimension),
        "has_vector": isinstance(vector, list) and bool(vector),
    }


def _proposal_counts(enrichment: dict) -> dict:
    counts: dict[str, int] = {}
    if not isinstance(enrichment, dict):
        return {family: 0 for family in _ENRICHMENT_FAMILIES}
    for family in _ENRICHMENT_FAMILIES:
        items = enrichment.get(family) or []
        counts[family] = len(items) if isinstance(items, list) else 0
    return counts


def _manual_overrides(analysis: dict) -> dict:
    overrides = analysis.get("_manual_overrides") or {}
    return overrides if isinstance(overrides, dict) else {}


def _is_review_status_reviewed(review_status: dict) -> bool:
    if not isinstance(review_status, dict):
        return False
    if review_status.get("reviewed") is True:
        return True
    if review_status.get("analysis_reviewed") is True:
        return True
    status = str(review_status.get("status") or "").lower()
    return status in {"reviewed", "complete", "completed", "approved"}


def _is_legal_reviewed(legal_review: dict) -> bool:
    return isinstance(legal_review, dict) and legal_review.get("reviewed") is True


def _is_testimony_reviewed(testimony_review: dict) -> bool:
    if not isinstance(testimony_review, dict) or not testimony_review:
        return False
    status = str(
        testimony_review.get("status")
        or testimony_review.get("consent_status")
        or testimony_review.get("decision")
        or ""
    ).lower()
    return bool(testimony_review.get("reviewed") is True or status)


def derive_trust_state(
    *,
    analysis: dict,
    sanity_record: dict,
    review_status: dict,
    legal_review: dict,
    testimony_review: dict,
) -> str:
    """Return ``incomplete | model_proposed | researcher_reviewed | uploaded``.

    The state is local-observable only. Sanity ``published``/``verified`` states
    require a later read from Sanity and are deliberately not inferred here.
    """
    if sanity_record:
        return "uploaded"
    if not analysis:
        return "incomplete"
    if (
        _manual_overrides(analysis)
        or _is_review_status_reviewed(review_status)
        or _is_legal_reviewed(legal_review)
        or _is_testimony_reviewed(testimony_review)
    ):
        return "researcher_reviewed"
    return "model_proposed"


def build_archive_summary(doc_dir: Path, *, config=None, generated_at: str | None = None) -> dict:
    """Build a derived archive profile for one corpus document directory."""
    doc_dir = Path(doc_dir)
    doc_id = doc_dir.name

    intake = read_json_safe(doc_dir / "intake.json", {})
    preprocess = read_json_safe(doc_dir / "preprocess.json", {})
    analysis = read_json_safe(doc_dir / "analysis.json", {})
    analysis_audit = read_json_safe(doc_dir / "analysis_audit.json", {})
    enrichment = read_json_safe(doc_dir / "enrichment.json", {})
    enrichment_audit = read_json_safe(doc_dir / "enrichment_audit.json", {})
    embedding = read_json_safe(doc_dir / "embedding.json", {})
    metadata = read_json_safe(doc_dir / "metadata.json", {})
    sanity_record = read_json_safe(doc_dir / "sanity_record.json", {})
    review_status = read_json_safe(doc_dir / "review_status.json", {})
    legal_review = read_json_safe(doc_dir / "legal_review.json", {})
    testimony_review = read_json_safe(doc_dir / "testimony_review.json", {})
    offload_import = read_json_safe(doc_dir / "offload_import.json", {})
    source_item = read_json_safe(doc_dir / "source_item.json", {})
    citation_units = read_json_safe(doc_dir / CITATION_UNITS_FILENAME, {})

    source_value = str(intake.get("source") or "").strip()
    source_url_candidates = [
        str(intake.get("source_url") or "").strip(),
        str(offload_import.get("source_url") or "").strip(),
        str(source_item.get("url") or "").strip(),
        source_value,
    ]
    source_url = next((candidate for candidate in source_url_candidates if _is_web_url(candidate)), "")
    wayback = intake.get("wayback") if isinstance(intake.get("wayback"), dict) else {}
    wayback_status = str(intake.get("wayback_status") or wayback.get("status") or "").strip()
    acquisition = preprocess.get("acquisition") or {}
    if not isinstance(acquisition, dict):
        acquisition = {}

    readiness = build_document_readiness(doc_dir, config=config)
    lifecycle = summarize_enrichment_lifecycle(doc_dir)
    embedding_meta = _embedding_metadata(embedding if isinstance(embedding, dict) else {})

    summary = {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "generated_at": generated_at or utcnow_iso(),
        "generator_git_commit": current_git_commit(),
        "artifacts_present": _artifact_labels(doc_dir),
        "source": {
            "source_url": source_url,
            "source": str(intake.get("source") or "").strip(),
            "source_type": str(intake.get("source_type") or intake.get("declared_type") or "").strip(),
            "hostname": _hostname(source_url),
            "archive_url": str(intake.get("archive_url") or "").strip(),
            "wayback_status": wayback_status,
            "original_filename": str(intake.get("original_filename") or "").strip(),
            "ingested_at": str(intake.get("ingested_at") or "").strip(),
            "batch_id": str(intake.get("batch_id") or "").strip(),
            "tier": intake.get("tier"),
            "source_html_sha256": str(
                preprocess.get("source_html_sha256")
                or preprocess.get("html_sha256")
                or ""
            ).strip(),
            "acquisition_quality": str(preprocess.get("quality") or "").strip(),
            "acquisition_challenge": bool(acquisition.get("challenge")),
            "acquisition_tool": str(acquisition.get("fetch_tool") or "").strip(),
            "acquisition_signal": str(acquisition.get("challenge_signal") or "").strip(),
        },
        "content": {
            "title": str(preprocess.get("title") or analysis.get("title") or "").strip(),
            "author": str(preprocess.get("author") or "").strip(),
            "date_published": str(preprocess.get("date_published") or "").strip(),
            "date_modified": str(preprocess.get("date_modified") or "").strip(),
            "languages": _list(preprocess.get("languages") or preprocess.get("language_detected")),
            "char_count": _int(preprocess.get("char_count") or preprocess.get("text_char_count")),
            "preprocess_tool": str(preprocess.get("tool_used") or preprocess.get("tool") or "").strip(),
            "preprocess_quality": str(preprocess.get("quality") or "").strip(),
        },
        "citation_units": citation_summary(citation_units),
        "classification": {
            "type": str(analysis.get("type") or "").strip(),
            "primary_type": str(analysis.get("primary_type") or "").strip(),
            "secondary_type": str(analysis.get("secondary_type") or "").strip(),
            "format": str(analysis.get("format") or "").strip(),
            "scope": str(analysis.get("scope") or "").strip(),
            "narrative_register": str(analysis.get("narrative_register") or "").strip(),
            "rhetorical_intensity": str(analysis.get("rhetorical_intensity") or "").strip(),
            "framing_balance": str(analysis.get("framing_balance") or "").strip(),
            "country": _list(analysis.get("country")),
            "languages": _list(analysis.get("languages")),
            "tactic": _list(analysis.get("tactic")),
            "practice": _list(analysis.get("practice")),
            "term": _list(analysis.get("term")),
            "actor": _list(analysis.get("actor")),
            "network": _list(analysis.get("network")),
            "harm": _list(analysis.get("harm")),
            "migration": _list(analysis.get("migration")),
            "function": _list(analysis.get("function")),
            "landmark": _list(analysis.get("landmark")),
            "flags": _list(analysis.get("flags")),
            "legal_status": analysis.get("legal_status") if isinstance(analysis.get("legal_status"), dict) else {},
            "summary": str(analysis.get("summary") or "").strip(),
            "confidence_score": _confidence_score(analysis),
            "confidence_status": _confidence_status(analysis),
            "needs_review": bool(analysis.get("needs_review")),
            "testimony_flag": bool(analysis.get("testimony_flag")),
            "prompt_version": str(analysis.get("prompt_version") or analysis_audit.get("prompt_version") or "").strip(),
            "ontology_version": str(analysis.get("ontology_version") or analysis_audit.get("ontology_version") or "").strip(),
            "llm_used": str(metadata.get("llm_used") or analysis_audit.get("llm_flag") or "").strip(),
            "analysis_model": str(analysis_audit.get("model") or "").strip(),
            "analysis_git_commit": str(analysis_audit.get("git_commit") or "").strip(),
            "normalisation_warnings": _list(analysis.get("normalisation_warnings")),
        },
        "review": {
            "manual_overrides": _manual_overrides(analysis),
            "testimony": {
                "flag": bool(analysis.get("testimony_flag")),
                "consent_status": str(intake.get("testimony_consent") or testimony_review.get("consent_status") or "").strip(),
                "reviewed": _is_testimony_reviewed(testimony_review),
                "reviewed_at": str(testimony_review.get("reviewed_at") or testimony_review.get("decided_at") or "").strip(),
            },
            "legal_review": {
                "reviewed": _is_legal_reviewed(legal_review),
                "reviewed_at": str(legal_review.get("reviewed_at") or "").strip(),
                "reviewed_by": str(legal_review.get("reviewed_by") or "").strip(),
            },
            "analysis_reviewed": {
                "reviewed": _is_review_status_reviewed(review_status),
                "reviewed_at": str(review_status.get("reviewed_at") or "").strip(),
            },
        },
        "enrichment": {
            "exists": bool(enrichment),
            "counts": _proposal_counts(enrichment),
            "lifecycle": lifecycle,
            "enrichment_model": str(enrichment.get("enrichment_model") or enrichment_audit.get("enrichment_model") or "").strip(),
            "enrichment_git_commit": str(enrichment_audit.get("git_commit") or "").strip(),
            "corpus_connections_suppressed": bool(enrichment_audit.get("corpus_connections_suppressed")),
        },
        "readiness": {
            "status": readiness.status,
            "status_label": readiness.status_label,
            "blocker_count": len(readiness.blockers),
            "quality_count": len(readiness.quality),
            "note_count": len(readiness.notes),
            "next_action_titles": [item.title for item in [*readiness.blockers, *readiness.quality]][:5],
        },
        "publication": {
            "uploaded": bool(sanity_record),
            "sanity_id": str(sanity_record.get("sanity_id") or sanity_record.get("_id") or "").strip(),
            "uploaded_at": str(sanity_record.get("uploaded_at") or sanity_record.get("created_at") or "").strip(),
            "embedding_model": embedding_meta["model"],
            "embedding_dimension": embedding_meta["dimension"],
            "embedding_present": embedding_meta["has_vector"],
            "supabase_present": bool(read_json_safe(doc_dir / "supabase_record.json", {})),
        },
        "offload": {
            "imported": bool(offload_import),
            "package_id": str(offload_import.get("package_id") or "").strip(),
            "package_kind": str(offload_import.get("package_kind") or "").strip(),
            "imported_at": str(offload_import.get("imported_at") or "").strip(),
            "queue_item_id": str(offload_import.get("queue_item_id") or source_item.get("queue_item_id") or "").strip(),
            "url_hash": str(offload_import.get("url_hash") or source_item.get("url_hash") or "").strip(),
            "path_rewrites": offload_import.get("path_rewrites") if isinstance(offload_import.get("path_rewrites"), list) else [],
            "wayback_retry": offload_import.get("wayback_retry") if isinstance(offload_import.get("wayback_retry"), dict) else {},
        },
        "trust_state": derive_trust_state(
            analysis=analysis,
            sanity_record=sanity_record,
            review_status=review_status,
            legal_review=legal_review,
            testimony_review=testimony_review,
        ),
    }
    return summary


def write_archive_summary(doc_dir: Path, *, config=None) -> Path:
    summary = build_archive_summary(doc_dir, config=config)
    out = Path(doc_dir) / SUMMARY_FILENAME
    out.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def write_citation_units_for_doc(doc_dir: Path, *, overwrite: bool = False) -> dict:
    """Build ``citation_units.json`` from ``extracted.txt`` for one doc.

    This is a deterministic backfill helper for existing corpus documents. It
    never touches analysis/enrichment/upload state and skips docs without
    extracted text.
    """
    doc_dir = Path(doc_dir)
    extracted = doc_dir / "extracted.txt"
    out = doc_dir / CITATION_UNITS_FILENAME
    if not extracted.exists():
        return {"doc_id": doc_dir.name, "status": "missing_extracted", "path": str(out)}
    if out.exists() and not overwrite:
        return {"doc_id": doc_dir.name, "status": "exists", "path": str(out)}
    text = extracted.read_text(encoding="utf-8")
    out.write_text(
        json.dumps(
            build_citation_units(text, doc_id=doc_dir.name, source_artifact="extracted.txt"),
            indent=2,
            ensure_ascii=False,
        ) + "\n",
        encoding="utf-8",
    )
    return {"doc_id": doc_dir.name, "status": "written", "path": str(out)}


def backfill_citation_units(corpus_dir: Path, *, overwrite: bool = False) -> dict:
    """Write missing citation-unit sidecars for every corpus doc with text."""
    results = [write_citation_units_for_doc(doc_dir, overwrite=overwrite) for doc_dir in iter_corpus_doc_dirs(corpus_dir)]
    counts: dict[str, int] = {}
    for item in results:
        status = str(item.get("status") or "unknown")
        counts[status] = counts.get(status, 0) + 1
    return {
        "ok": True,
        "corpus_dir": str(Path(corpus_dir)),
        "counts": counts,
        "documents": results,
    }


def iter_corpus_doc_dirs(corpus_dir: Path):
    corpus_dir = Path(corpus_dir)
    if not corpus_dir.exists():
        return
    for doc_dir in sorted(corpus_dir.iterdir()):
        if doc_dir.is_dir() and not doc_dir.name.startswith("."):
            yield doc_dir


def build_corpus_archive_summaries(corpus_dir: Path, *, config=None, write: bool = True) -> list[dict]:
    summaries: list[dict] = []
    for doc_dir in iter_corpus_doc_dirs(corpus_dir):
        summary = build_archive_summary(doc_dir, config=config)
        summaries.append(summary)
        if write:
            (doc_dir / SUMMARY_FILENAME).write_text(
                json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
    return summaries


def export_document_profiles(
    corpus_dir: Path,
    exports_dir: Path,
    *,
    config=None,
    out_path: Path | None = None,
    write_doc_summaries: bool = False,
) -> dict:
    """Write central JSONL document-profile export and return a summary dict."""
    summaries = build_corpus_archive_summaries(
        corpus_dir,
        config=config,
        write=write_doc_summaries,
    )
    if out_path is None:
        out_dir = Path(exports_dir) / KNOWLEDGE_EXPORT_DIR
        out_path = out_dir / DOCUMENT_PROFILES_JSONL
    else:
        out_path = Path(out_path)
        out_dir = out_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        for summary in summaries:
            fh.write(json.dumps(summary, ensure_ascii=False) + "\n")
    return {
        "ok": True,
        "path": str(out_path),
        "count": len(summaries),
        "schema_version": SCHEMA_VERSION,
        "write_doc_summaries": write_doc_summaries,
    }
