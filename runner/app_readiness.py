"""
Per-document **Readiness / Next Actions** layer for the Streamlit UI.

This module unifies the fragmented "what do I do next with this document?"
signals into one calm, ordered summary:

    "Needs review before push"     — hard blockers (must fix before push-enrichment)
    "Review / quality actions remain" — non-blocking review/push work
    "Provenance notes"             — informational only, no action required

It composes two existing sources of truth:

* ``runner.app_provenance._collect_provenance_warnings`` — structured
  ``ProvenanceWarning`` findings (missing date/languages, missing
  ``existing_entity_id``, invalid network connection types, commit mismatch, …).
* The document's own ``enrichment.json`` — proposal lifecycle state
  (pending review, approved-not-pushed, registry-fit holds) so that
  **complement enrichment feels like part of the same lifecycle**, not a
  separate mysterious action.

No ``streamlit`` imports — this module is pure and safe to import in headless
test and CLI contexts. ``runner/app.py`` renders the dataclasses it returns.

Public API:
    ReadinessItem                       — one categorized next-action
    DocumentReadiness                   — the per-document summary
    STATUS_LABELS                       — status code → human label
    summarize_enrichment_lifecycle(d)   → dict of proposal-state counts
    build_document_readiness(doc_dir)   → DocumentReadiness
    collect_corpus_readiness(corpus_dir)→ list[dict] — corpus-wide summary rows
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from runner.app_provenance import (
    ProvenanceWarning,
    _collect_provenance_warnings,
)


# ---------------------------------------------------------------------------
# Status vocabulary — text labels, never colour alone
# ---------------------------------------------------------------------------

STATUS_NEEDS_REVIEW = "needs_review_before_push"
STATUS_QUALITY = "quality_improvements_optional"
STATUS_READY = "ready_to_push"
STATUS_NO_DATA = "no_analysis_yet"

STATUS_LABELS = {
    STATUS_NEEDS_REVIEW: "Needs review before push",
    STATUS_QUALITY: "Review / quality actions remain",
    STATUS_READY: "Ready to push",
    STATUS_NO_DATA: "No analysis yet",
}

STATUS_EXPLANATIONS = {
    STATUS_NEEDS_REVIEW: (
        "One or more issues must be resolved before pushing enrichment "
        "proposals to Sanity."
    ),
    STATUS_QUALITY: (
        "No hard blockers found, but review, push, or quality-improvement "
        "work remains before this document feels settled."
    ),
    STATUS_READY: (
        "No blockers or pending review found. Metadata and enrichment "
        "proposals are in order; push to Sanity when ready."
    ),
    STATUS_NO_DATA: (
        "This document has no `analysis.json` yet. Run analysis before "
        "reviewing readiness."
    ),
}

# Categories used by ReadinessItem (kept text-first for accessibility).
CATEGORY_BLOCKER = "blocker"   # → "Needs review before push"
CATEGORY_QUALITY = "quality"   # → "Review / quality actions remain"
CATEGORY_NOTE = "note"         # → "Provenance notes"

# Enrichment proposal families inspected for lifecycle state.
ENRICHMENT_FAMILIES = (
    "lexicon_proposals",
    "entity_proposals",
    "tactic_proposals",
    "practice_descriptions",
    "statistical_claims",
)


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class ReadinessItem:
    """A single next-action for the researcher.

    category
        ``blocker`` — must be resolved before ``push-enrichment``.
        ``quality`` — non-blocking improvement or pending review work.
        ``note``    — informational; no action required.
    title
        Short, scannable label.
    detail
        One or two sentences on what was observed / why it matters.
    where_to_fix
        Concrete app navigation path or command to resolve it.
    handler
        Optional UI hook key the renderer can use to attach a widget
        (e.g. ``"entity_resolver"`` or ``"complement_enrichment"``).
    """

    category: str
    title: str
    detail: str
    where_to_fix: str
    handler: str = ""


@dataclass
class DocumentReadiness:
    """The unified per-document readiness summary."""

    status: str
    status_label: str
    status_explanation: str
    blockers: list[ReadinessItem] = field(default_factory=list)
    quality: list[ReadinessItem] = field(default_factory=list)
    notes: list[ReadinessItem] = field(default_factory=list)
    lifecycle: dict = field(default_factory=dict)

    @property
    def actionable_count(self) -> int:
        """Blockers + quality items — the work the researcher still owns."""
        return len(self.blockers) + len(self.quality)


# ---------------------------------------------------------------------------
# Internal I/O helper
# ---------------------------------------------------------------------------

def _read_json_safe(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _proposal_state(item: dict) -> str:
    """Return ``"pending" | "approved" | "rejected" | "pushed"`` for a proposal.

    Mirrors ``runner.app._proposal_review_status`` but boolean-first and
    Streamlit-free.  ``proposal_status`` (P2) wins when present and valid;
    otherwise the authoritative booleans are used for backward compatibility.
    """
    status = item.get("proposal_status")
    if status in {"pending", "approved", "rejected", "pushed"}:
        return status
    if item.get("rejected"):
        return "rejected"
    if item.get("approved") and item.get("pushed_to_sanity"):
        return "pushed"
    if item.get("approved"):
        return "approved"
    return "pending"


# ---------------------------------------------------------------------------
# Enrichment lifecycle summary
# ---------------------------------------------------------------------------

def summarize_enrichment_lifecycle(doc_dir: Path) -> dict:
    """Summarize proposal lifecycle state from a document's ``enrichment.json``.

    Returns a dict with::

        exists              — whether enrichment.json is present
        total               — total proposals across all families
        pending             — proposals awaiting a researcher decision
        approved_unpushed   — approved, not yet pushed to Sanity
        pushed              — already pushed
        rejected            — rejected locally
        registry_fit_holds  — entity proposals intentionally held out of the
                              organization/person registry (media/source/etc.)

    Pure: reads one local file, no network.
    """
    enrichment = _read_json_safe(doc_dir / "enrichment.json", {})
    summary = {
        "exists": bool(enrichment),
        "total": 0,
        "pending": 0,
        "approved_unpushed": 0,
        "pushed": 0,
        "rejected": 0,
        "registry_fit_holds": 0,
    }
    if not isinstance(enrichment, dict):
        return summary

    for family in ENRICHMENT_FAMILIES:
        for item in enrichment.get(family) or []:
            if not isinstance(item, dict):
                continue
            summary["total"] += 1
            state = _proposal_state(item)
            if state == "pending":
                summary["pending"] += 1
            elif state == "approved":
                summary["approved_unpushed"] += 1
            elif state == "pushed":
                summary["pushed"] += 1
            elif state == "rejected":
                summary["rejected"] += 1

    # Registry-fit holds — entity proposals not eligible for the registry and
    # not rejected.  Imported lazily to keep this module dependency-light.
    try:
        from runner.models.enrichment import infer_entity_registry_fit
    except Exception:
        infer_entity_registry_fit = None  # pragma: no cover
    if infer_entity_registry_fit is not None:
        for item in enrichment.get("entity_proposals") or []:
            if not isinstance(item, dict):
                continue
            if _proposal_state(item) == "rejected":
                continue
            fit = infer_entity_registry_fit(item)
            if fit and fit != "registry_entity":
                summary["registry_fit_holds"] += 1

    return summary


# ---------------------------------------------------------------------------
# Warning → ReadinessItem mapping
# ---------------------------------------------------------------------------

_SEVERITY_TO_CATEGORY = {
    "pre_push_blocker": CATEGORY_BLOCKER,
    "action_needed": CATEGORY_QUALITY,
    "provenance_note": CATEGORY_NOTE,
}

# UI handler hooks keyed by warning title, so the renderer can attach the
# matching repair widget (the resolver / dropdown already exist in app.py).
_TITLE_TO_HANDLER = {
    "Missing existing_entity_id": "entity_resolver",
    "Invalid network connection type": "network_repair",
}


def _warning_to_item(warning: ProvenanceWarning) -> ReadinessItem:
    return ReadinessItem(
        category=_SEVERITY_TO_CATEGORY.get(warning.severity, CATEGORY_NOTE),
        title=warning.title,
        detail=warning.explanation,
        where_to_fix=warning.suggested_action,
        handler=_TITLE_TO_HANDLER.get(warning.title, ""),
    )


# ---------------------------------------------------------------------------
# Lifecycle → ReadinessItem mapping (ties complement enrichment into the flow)
# ---------------------------------------------------------------------------

def _lifecycle_items(lifecycle: dict) -> list[ReadinessItem]:
    items: list[ReadinessItem] = []

    if not lifecycle.get("exists"):
        items.append(ReadinessItem(
            category=CATEGORY_QUALITY,
            title="Enrichment not yet run",
            detail=(
                "No enrichment proposals exist for this document. Enrichment "
                "mines the full text for lexicon terms, entities, tactics, "
                "practices, and claims to propose for review."
            ),
            where_to_fix=(
                "Use the ✨ Complement enrichment button on this document, or "
                "run `runner enrich <doc_id>`. It is part of the same review "
                "lifecycle — proposals still require your approval before push."
            ),
            handler="complement_enrichment",
        ))
        return items

    pending = lifecycle.get("pending", 0)
    if pending:
        items.append(ReadinessItem(
            category=CATEGORY_QUALITY,
            title=f"{pending} enrichment proposal(s) await review",
            detail=(
                "Lexicon/entity/tactic/practice/claim proposals are still "
                "pending your decision. They will not reach the registry until "
                "you approve them and then push approved enrichment."
            ),
            where_to_fix=(
                "Review in: Lexicon → Local Proposals, and Tag Registry. "
                "✨ Complement enrichment re-runs enrichment and merge-preserves "
                "your reviewed proposals, so it is safe to run again here."
            ),
            handler="complement_enrichment",
        ))

    approved_unpushed = lifecycle.get("approved_unpushed", 0)
    if approved_unpushed:
        items.append(ReadinessItem(
            category=CATEGORY_QUALITY,
            title=f"{approved_unpushed} approved proposal(s) ready to push",
            detail=(
                "These proposals are approved but not yet in Sanity. Pushing "
                "them updates the living registry."
            ),
            where_to_fix=(
                "Run `runner push-enrichment <doc_id>`, or use the push controls "
                "in Lexicon → Local Proposals."
            ),
        ))

    holds = lifecycle.get("registry_fit_holds", 0)
    if holds:
        items.append(ReadinessItem(
            category=CATEGORY_NOTE,
            title=f"{holds} entity proposal(s) held out of the registry",
            detail=(
                "Some entity proposals are marked as media/source, not-an-entity, "
                "or needs-decision. These will not be pushed as "
                "organizations/persons — this is the registry-fit safety guard "
                "working as intended."
            ),
            where_to_fix=(
                "Tag Registry → Entity Queue → Registry fit. Set the correct "
                "routing, or ingest a media/source item as its own document "
                "instead of pushing it as an entity."
            ),
        ))

    return items


# ---------------------------------------------------------------------------
# Builder
# ---------------------------------------------------------------------------

def build_document_readiness(doc_dir: Path, *, config=None) -> DocumentReadiness:
    """Compose provenance warnings + enrichment lifecycle into one summary.

    Status is the highest-severity bucket that has items:
        any blocker            → ``needs_review_before_push``
        else any quality item  → ``quality_improvements_optional``
        else                   → ``ready_to_push``
    A document with no ``analysis.json`` is ``no_analysis_yet``.

    All inputs are local files — no network, no Sanity/Supabase calls.
    """
    has_analysis = (doc_dir / "analysis.json").exists()

    warnings = _collect_provenance_warnings(doc_dir, config=config)
    lifecycle = summarize_enrichment_lifecycle(doc_dir)

    items = [_warning_to_item(w) for w in warnings]
    items.extend(_lifecycle_items(lifecycle))

    blockers = [i for i in items if i.category == CATEGORY_BLOCKER]
    quality = [i for i in items if i.category == CATEGORY_QUALITY]
    notes = [i for i in items if i.category == CATEGORY_NOTE]

    if not has_analysis:
        status = STATUS_NO_DATA
    elif blockers:
        status = STATUS_NEEDS_REVIEW
    elif quality:
        status = STATUS_QUALITY
    else:
        status = STATUS_READY

    return DocumentReadiness(
        status=status,
        status_label=STATUS_LABELS[status],
        status_explanation=STATUS_EXPLANATIONS[status],
        blockers=blockers,
        quality=quality,
        notes=notes,
        lifecycle=lifecycle,
    )


# ---------------------------------------------------------------------------
# Corpus-wide summary
# ---------------------------------------------------------------------------

def _get_short_title(doc_dir: Path) -> str:
    """Return a short display title for a document directory.

    Priority: ``preprocess.json → title`` → ``analysis.json → summary``
    (truncated to 80 chars) → ``""`` (caller decides fallback).

    Pure: reads local files only, never raises.
    """
    preprocess = _read_json_safe(doc_dir / "preprocess.json", {})
    if isinstance(preprocess, dict):
        title = str(preprocess.get("title") or "").strip()
        if title:
            return title[:120]
    analysis = _read_json_safe(doc_dir / "analysis.json", {})
    if isinstance(analysis, dict):
        summary = str(analysis.get("summary") or "").strip()
        if summary:
            return (summary[:80] + "…") if len(summary) > 80 else summary
    return ""


def _get_source_url(doc_dir: Path) -> str:
    """Return the source URL or local path for a document directory.

    Reads ``intake.json``; returns ``""`` when absent or unreadable.
    Pure: local files only, never raises.
    """
    intake = _read_json_safe(doc_dir / "intake.json", {})
    if isinstance(intake, dict):
        return str(intake.get("source_url") or intake.get("source") or "").strip()
    return ""


def collect_corpus_readiness(corpus_dir: Path, *, config=None) -> list[dict]:
    """Scan ``corpus_dir`` and return one summary row per document directory.

    Each row is a plain ``dict`` with::

        doc_id               — directory name
        status               — one of the STATUS_* constants
        status_label         — human-readable text label
        blocker_count        — number of pre-push blockers
        quality_count        — number of quality / review items
        note_count           — number of informational notes
        pending              — pending enrichment proposals
        approved_unpushed    — approved but not yet pushed to Sanity
        registry_fit_holds   — entity proposals held out of the registry
        title                — short display title (from preprocess or analysis)
        source               — source URL or path (from intake.json)
        next_action_title    — title of the first blocker or quality item

    Rows are sorted by ``doc_id`` (directory name) for a stable, reproducible
    order independent of filesystem ordering.

    Pure: reads local files only, no network calls, tolerates missing or
    corrupt JSON in every file it touches.  Non-directory entries in
    ``corpus_dir`` are silently skipped.
    """
    if not corpus_dir.exists():
        return []

    rows: list[dict] = []
    for doc_dir in sorted(corpus_dir.iterdir()):
        if not doc_dir.is_dir():
            continue

        readiness = build_document_readiness(doc_dir, config=config)
        lifecycle = readiness.lifecycle

        first_action_title = ""
        if readiness.blockers:
            first_action_title = readiness.blockers[0].title
        elif readiness.quality:
            first_action_title = readiness.quality[0].title

        rows.append({
            "doc_id": doc_dir.name,
            "status": readiness.status,
            "status_label": readiness.status_label,
            "blocker_count": len(readiness.blockers),
            "quality_count": len(readiness.quality),
            "note_count": len(readiness.notes),
            "pending": lifecycle.get("pending", 0),
            "approved_unpushed": lifecycle.get("approved_unpushed", 0),
            "registry_fit_holds": lifecycle.get("registry_fit_holds", 0),
            "title": _get_short_title(doc_dir),
            "source": _get_source_url(doc_dir),
            "next_action_title": first_action_title,
        })

    return rows
