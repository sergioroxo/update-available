"""
Researcher review overrides for already-imported corpus documents.

Three small, auditable, **local-only** review actions the researcher can take
on a document that is already in the corpus, without re-running the model and
without touching Sanity / Supabase:

1. ``clear_testimony_gate`` — record a researcher decision that a document is
   *not* testimony after all (false-positive ``testimony_flag`` /
   ``Flag: Testimony-Extraction-Required``). Sets ``testimony_flag = False``,
   removes the testimony-extraction flag, stamps
   ``_manual_overrides.testimony_flag = "researcher_confirmed_false"`` and
   appends a timestamped normalisation/review warning. Because the flag is
   removed, the model validator ``reconcile_testimony_flag`` will not silently
   re-raise the boolean on the next round-trip.

2. ``mark_legal_review_complete`` — write a ``legal_review.json`` sidecar
   recording that a human legal-accuracy review happened. Does **not** change
   the model classification.

3. ``mark_analysis_reviewed`` — write a ``review_status.json`` sidecar recording
   that the researcher reviewed a low-confidence / ``needs_review`` analysis.
   Does **not** fight the validator (``needs_review`` / ``overall_score`` stay
   exactly as the model left them).

This module is intentionally pure: no ``streamlit`` import, no network, no
Sanity / Supabase clients, no model imports. ``runner/app.py`` renders the UI;
these functions do the file I/O so they can be unit-tested headlessly.

The visibility predicates (``*_available``) let the UI decide whether to show
each action. They are dict-first (read the already-parsed ``analysis.json``)
so callers never need to construct a Pydantic model.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


# Canonical testimony-extraction flag, matched case-insensitively against the
# model's ``flags`` list. Kept in sync with
# ``AnalysisResult.reconcile_testimony_flag`` in ``runner/models/document.py``.
_TESTIMONY_FLAG = "flag: testimony-extraction-required"

# Document types whose legal accuracy warrants a human review hold before
# publication. Mirrors ``upload._LEGAL_SENSITIVE_TYPES`` (single source of truth
# lives there; duplicated here to keep this module free of the upload module's
# Sanity/Supabase client imports).
_LEGAL_SENSITIVE_TYPES = frozenset({"Legal-Instrument", "Regulatory-Policy-Document"})

# Below this overall confidence the model forces ``needs_review = True``; the
# "Analysis reviewed" marker is offered for these documents.
_REVIEW_CONFIDENCE_FLOOR = 0.70


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------

def _read_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _now(now: str | None) -> str:
    return now if now else datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Visibility predicates (dict-first, pure)
# ---------------------------------------------------------------------------

def _is_testimony_flag(value) -> bool:
    return isinstance(value, str) and value.strip().lower() == _TESTIMONY_FLAG


def testimony_override_available(analysis: dict | None) -> bool:
    """True when the document carries a testimony signal the researcher may clear.

    Fires on ``testimony_flag`` being truthy OR any
    ``Flag: Testimony-Extraction-Required`` present in ``flags``.
    """
    if not isinstance(analysis, dict):
        return False
    if analysis.get("testimony_flag"):
        return True
    return any(_is_testimony_flag(f) for f in (analysis.get("flags") or []))


def legal_review_available(analysis: dict | None) -> bool:
    """True for legal-sensitive documents (Legal-Instrument / Regulatory-Policy).

    Mirrors ``upload.requires_legal_review`` type triggers (``legal_status`` is
    intentionally excluded — it over-holds non-legal documents).
    """
    if not isinstance(analysis, dict):
        return False
    types = {
        str(analysis.get("type") or ""),
        str(analysis.get("primary_type") or ""),
        str(analysis.get("secondary_type") or ""),
    }
    return bool(types & _LEGAL_SENSITIVE_TYPES)


def analysis_review_marker_available(analysis: dict | None) -> bool:
    """True for low-confidence / ``needs_review`` documents.

    Offered when the model set ``needs_review`` OR the overall confidence is
    below the review floor (``< 0.70``).
    """
    if not isinstance(analysis, dict):
        return False
    if analysis.get("needs_review"):
        return True
    score = analysis.get("confidence", {}).get("overall_score")
    try:
        return score is not None and float(score) < _REVIEW_CONFIDENCE_FLOOR
    except (TypeError, ValueError):
        return False


# ---------------------------------------------------------------------------
# Existing-state readers (so the UI can reflect prior decisions)
# ---------------------------------------------------------------------------

def testimony_gate_cleared(doc_dir: Path) -> bool:
    """True when a researcher previously cleared the testimony gate locally."""
    analysis = _read_json(Path(doc_dir) / "analysis.json", {})
    if not isinstance(analysis, dict):
        return False
    overrides = analysis.get("_manual_overrides") or {}
    return overrides.get("testimony_flag") == "researcher_confirmed_false"


def legal_review_record(doc_dir: Path) -> dict:
    """Return the ``legal_review.json`` sidecar dict, or ``{}`` if absent."""
    data = _read_json(Path(doc_dir) / "legal_review.json", {})
    return data if isinstance(data, dict) else {}


def analysis_review_record(doc_dir: Path) -> dict:
    """Return the ``review_status.json`` sidecar dict, or ``{}`` if absent."""
    data = _read_json(Path(doc_dir) / "review_status.json", {})
    return data if isinstance(data, dict) else {}


# ---------------------------------------------------------------------------
# Action 1 — clear the testimony gate (false-positive correction)
# ---------------------------------------------------------------------------

def clear_testimony_gate(
    doc_dir: Path,
    *,
    note: str,
    reviewed_by: str = "researcher",
    now: str | None = None,
) -> dict:
    """Record a researcher decision that a document is *not* testimony.

    Mutates ``analysis.json`` in place:
      * ``testimony_flag`` → ``False``
      * removes every ``Flag: Testimony-Extraction-Required`` from ``flags``
        (case-insensitive) so the model validator will not re-raise the boolean
      * ``_manual_overrides.testimony_flag`` → ``"researcher_confirmed_false"``
      * appends a timestamped review warning to ``normalisation_warnings``

    Does **not** change ``type`` — a typed ``Testimony`` document still trips the
    type-based consent gate; this action only corrects a false-positive flag.

    Idempotent: if the gate is already cleared and no testimony flag remains, no
    write occurs and ``changed`` is ``False``.

    Returns ``{"ok", "changed", "removed_flags", "warning", "reason"}``.
    """
    note = (note or "").strip()
    if not note:
        return {"ok": False, "changed": False, "removed_flags": [], "warning": None,
                "reason": "note_required"}

    analysis_path = Path(doc_dir) / "analysis.json"
    analysis = _read_json(analysis_path, None)
    if not isinstance(analysis, dict):
        return {"ok": False, "changed": False, "removed_flags": [], "warning": None,
                "reason": "no_analysis"}

    flags = list(analysis.get("flags") or [])
    removed_flags = [f for f in flags if _is_testimony_flag(f)]
    kept_flags = [f for f in flags if not _is_testimony_flag(f)]

    already_cleared = (
        not analysis.get("testimony_flag")
        and not removed_flags
        and (analysis.get("_manual_overrides") or {}).get("testimony_flag")
        == "researcher_confirmed_false"
    )
    if already_cleared:
        return {"ok": True, "changed": False, "removed_flags": [], "warning": None,
                "reason": "already_cleared"}

    timestamp = _now(now)
    analysis["flags"] = kept_flags
    analysis["testimony_flag"] = False
    overrides = analysis.setdefault("_manual_overrides", {})
    overrides["testimony_flag"] = "researcher_confirmed_false"

    warning = (
        f"[{timestamp}] testimony gate cleared by {reviewed_by}: testimony_flag set "
        f"False and 'Flag: Testimony-Extraction-Required' removed "
        f"(researcher_confirmed_false). Note: {note}"
    )
    warnings = list(analysis.get("normalisation_warnings") or [])
    warnings.append(warning)
    analysis["normalisation_warnings"] = warnings

    _write_json(analysis_path, analysis)
    return {"ok": True, "changed": True, "removed_flags": removed_flags,
            "warning": warning, "reason": "cleared"}


# ---------------------------------------------------------------------------
# Action 2 — mark legal review complete (sidecar, no classification change)
# ---------------------------------------------------------------------------

def mark_legal_review_complete(
    doc_dir: Path,
    *,
    note: str,
    reviewed_by: str = "researcher",
    now: str | None = None,
) -> dict:
    """Write ``legal_review.json`` recording a completed human legal review.

    Does not change the model classification or any analysis field. Returns
    ``{"ok", "path", "record", "reason"}``.
    """
    note = (note or "").strip()
    if not note:
        return {"ok": False, "path": None, "record": None, "reason": "note_required"}

    doc_dir = Path(doc_dir)
    if not doc_dir.exists():
        return {"ok": False, "path": None, "record": None, "reason": "no_document"}

    record = {
        "reviewed": True,
        "reviewed_at": _now(now),
        "reviewed_by": reviewed_by,
        "notes": note,
    }
    path = doc_dir / "legal_review.json"
    _write_json(path, record)
    return {"ok": True, "path": str(path), "record": record, "reason": "saved"}


# ---------------------------------------------------------------------------
# Action 3 — mark analysis reviewed (sidecar, does not fight the validator)
# ---------------------------------------------------------------------------

def mark_analysis_reviewed(
    doc_dir: Path,
    *,
    note: str,
    reviewed_by: str = "researcher",
    now: str | None = None,
) -> dict:
    """Write ``review_status.json`` recording a human analysis review.

    Intended for ``needs_review`` / low-confidence documents. Does **not**
    modify ``analysis.json`` — confidence and ``needs_review`` stay exactly as
    the model left them. Returns ``{"ok", "path", "record", "reason"}``.
    """
    note = (note or "").strip()
    if not note:
        return {"ok": False, "path": None, "record": None, "reason": "note_required"}

    doc_dir = Path(doc_dir)
    if not doc_dir.exists():
        return {"ok": False, "path": None, "record": None, "reason": "no_document"}

    record = {
        "analysis_reviewed": True,
        "reviewed_at": _now(now),
        "reviewed_by": reviewed_by,
        "notes": note,
    }
    path = doc_dir / "review_status.json"
    _write_json(path, record)
    return {"ok": True, "path": str(path), "record": record, "reason": "saved"}
