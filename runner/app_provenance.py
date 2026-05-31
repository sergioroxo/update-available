"""
Pure helper functions for the Provenance / Audit view in the Streamlit UI.

No ``streamlit`` imports — this module is safe to import in headless test
environments and CLI contexts.  ``runner/app.py`` imports from here so that the
Streamlit render functions can call these helpers.

Public API:
    _load_analysis_audit(doc_dir)          → dict
    _load_enrichment_audit(doc_dir)        → dict
    _load_preservation_status_dict(doc_dir) → dict
    _check_artifact_completeness(doc_dir)  → dict[str, bool]
    _collect_provenance_warnings(doc_dir, *, config=None) → list[str]
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path


# ---------------------------------------------------------------------------
# Internal I/O helper
# ---------------------------------------------------------------------------

def _read_json_safe(path: Path, default):
    """Load a JSON file, returning *default* on absent or corrupt file."""
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def _load_analysis_audit(doc_dir: Path) -> dict:
    """Load ``analysis_audit.json``, returning ``{}`` on absent or corrupt file."""
    return _read_json_safe(doc_dir / "analysis_audit.json", {})


def _load_enrichment_audit(doc_dir: Path) -> dict:
    """Load ``enrichment_audit.json``, returning ``{}`` on absent or corrupt file."""
    return _read_json_safe(doc_dir / "enrichment_audit.json", {})


def _load_preservation_status_dict(doc_dir: Path) -> dict:
    """Load ``preservation_status.json`` as a plain dict.

    Returns ``{}`` on absent or corrupt file.
    """
    result = _read_json_safe(doc_dir / "preservation_status.json", {})
    return result if isinstance(result, dict) else {}


# ---------------------------------------------------------------------------
# Artifact completeness
# ---------------------------------------------------------------------------

def _check_artifact_completeness(doc_dir: Path) -> dict[str, bool]:
    """Return a dict mapping artifact label → whether the file is present.

    The "extracted text" entry is True when either ``extracted.txt`` or
    ``extracted.md`` exists.
    """
    return {
        "intake.json":            (doc_dir / "intake.json").exists(),
        "preprocess.json":        (doc_dir / "preprocess.json").exists(),
        "extracted text":         (
            (doc_dir / "extracted.txt").exists()
            or (doc_dir / "extracted.md").exists()
        ),
        "analysis.json":          (doc_dir / "analysis.json").exists(),
        "analysis_audit.json":    (doc_dir / "analysis_audit.json").exists(),
        "embedding.json":         (doc_dir / "embedding.json").exists(),
        "sanity_record.json":     (doc_dir / "sanity_record.json").exists(),
        "enrichment.json":        (doc_dir / "enrichment.json").exists(),
        "enrichment_audit.json":  (doc_dir / "enrichment_audit.json").exists(),
        "preservation_status.json": (doc_dir / "preservation_status.json").exists(),
    }


# ---------------------------------------------------------------------------
# Warning collector — pure logic, no I/O besides local file reads
# ---------------------------------------------------------------------------

def _collect_provenance_warnings(doc_dir: Path, *, config=None) -> list[str]:
    """Return a list of human-readable Markdown warning strings.

    Checks (all derived from local files — no network, no Sanity/Supabase):

    1. Missing ``languages`` in analysis output.
    2. Missing document/publication date.
    3. Queue ``source_type`` disagrees with intake ``source_type`` (needs config).
    4. ``enrich_existing`` entity proposals that lack an ``existing_entity_id``.
    """
    warnings_out: list[str] = []

    analysis = _read_json_safe(doc_dir / "analysis.json", {})

    # 1. Missing languages
    if not analysis.get("languages"):
        warnings_out.append(
            "**Languages missing** — `analysis.languages` is empty. "
            "Consider reanalysing or editing manually to add ISO 639-1 code(s)."
        )

    # 2. Missing document/publication date
    doc_date = analysis.get("document_date") or {}
    preprocess = _read_json_safe(doc_dir / "preprocess.json", {})
    preprocess_date = str(preprocess.get("date_published") or "").strip()
    if not doc_date.get("year") and not preprocess_date:
        warnings_out.append(
            "**Date unknown** — neither `document_date.year` nor "
            "`preprocess.date_published` is set. "
            "The document has no dateable anchor for the archive timeline."
        )

    # 3. Queue source_type / intake source_type disagreement
    if config is not None:
        try:
            from runner.pipeline.source_queue import queue_db_path as _qdb_path
            db_path = _qdb_path(config.corpus_dir)
            if db_path.exists():
                intake = _read_json_safe(doc_dir / "intake.json", {})
                actual_st = str(intake.get("source_type") or "").strip()
                conn = sqlite3.connect(str(db_path))
                conn.row_factory = sqlite3.Row
                row = conn.execute(
                    "SELECT source_type, doc_type_hint FROM source_queue "
                    "WHERE corpus_doc_id = ? LIMIT 1",
                    (doc_dir.name,),
                ).fetchone()
                conn.close()
                if row:
                    q_st  = str(row["source_type"]  or "").strip()
                    q_dth = str(row["doc_type_hint"] or "").strip()
                    if q_st and actual_st and q_st != actual_st:
                        warnings_out.append(
                            f"**Triage source_type mismatch** — queue has `{q_st}`, "
                            f"intake recorded `{actual_st}` (doc_type_hint: `{q_dth}`). "
                            "Triage may have misclassified the source type; "
                            "ingestion used the correct intake value."
                        )
        except Exception:
            pass

    # 4. enrich_existing proposals with no existing_entity_id
    enrichment = _read_json_safe(doc_dir / "enrichment.json", {})
    missing_ids = [
        str(p.get("name") or "?")
        for p in (enrichment.get("entity_proposals") or [])
        if p.get("action") == "enrich_existing" and not p.get("existing_entity_id")
    ]
    if missing_ids:
        names = ", ".join(f"`{n}`" for n in missing_ids)
        warnings_out.append(
            f"**Missing `existing_entity_id`** on `enrich_existing` "
            f"proposal(s): {names}. "
            "Look up the Sanity document ID for each before pushing to Sanity."
        )

    return warnings_out
