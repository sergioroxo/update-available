"""Pure helpers for the batch-aware Review Inbox.

The existing Review Inbox remains the document-readiness authority.  These
helpers project an immutable dossier index into researcher-facing filters and
resolve stable proposal IDs into the existing Local Proposals editor.  They do
not write proposals, decisions, canonical records, or remote services.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


FILTER_OPTIONS = (
    "All batch dossiers",
    "Human exceptions",
    "Specialist / second opinion",
    "Evidence conflicts",
    "Recurring provisional",
    "Consequential promotion",
    "Publication blocked",
    "Contains AI-disclosed eligible document(s)",
    "Contains researcher-verified document(s)",
    "Undecided locally",
    "Decided locally",
    "Prior snapshot decisions",
)

FAMILY_EDITOR = {
    "lexicon_proposals": ("Lexicon Queue", "lexicon_queue_selected_proposal"),
    "entity_proposals": ("Entity Queue", "entity_queue_selected_proposal"),
    "tactic_proposals": ("Tactic Queue", "tactic_queue_selected_proposal"),
    "practice_descriptions": ("Practice Evidence", "practice_queue_selected_proposal"),
    "statistical_claims": ("Claims Queue", "claim_queue_selected_proposal"),
}


def _signals(dossier: dict[str, Any]) -> dict[str, bool]:
    supplied = dossier.get("signals") if isinstance(dossier.get("signals"), dict) else {}
    review = dossier.get("review") if isinstance(dossier.get("review"), dict) else {}
    publication = (
        dossier.get("publication") if isinstance(dossier.get("publication"), dict) else {}
    )
    item_publication = [
        row.get("publication_readiness") or {}
        for row in dossier.get("batch_item_signals") or []
        if isinstance(row, dict) and isinstance(row.get("publication_readiness") or {}, dict)
    ]
    specialist = dossier.get("specialist")
    specialist_attention = bool(
        supplied.get("specialist_attention")
        or (isinstance(specialist, dict) and specialist.get("attention_required"))
        or (isinstance(specialist, list) and specialist)
    )
    lane = str(review.get("review_lane") or dossier.get("review_lane") or "")
    trust = str(dossier.get("trust_state") or "")
    recommended = str(publication.get("recommended_lane") or "")
    recommended_lanes = {
        str(row.get("recommended_lane") or "") for row in item_publication
    }
    return {
        "human_exception": bool(
            supplied.get("human_exception")
            or review.get("human_decision_required")
            or dossier.get("human_decision_required")
        ),
        "specialist_attention": specialist_attention,
        "evidence_conflict": bool(
            supplied.get("evidence_conflict") or dossier.get("conflict_detected")
        ),
        "recurring": bool(
            supplied.get("recurring")
            or supplied.get("recurring_provisional")
            or trust == "recurring_provisional"
        ),
        "consequential": bool(
            supplied.get("consequential")
            or lane in {
                "finish_existing_human_decision",
                "sensitive_human_exception",
                "key_document_human_exception",
                "recurring_candidate_for_human_promotion",
            }
        ),
        "publication_blocked": bool(
            supplied.get("publication_blocked")
            or publication.get("blocked")
            or publication.get("all_blocked")
            or "blocked" in recommended_lanes
        ),
        "ai_disclosed": bool(
            supplied.get("ai_disclosed_release_candidate")
            or recommended == "ai_disclosed_summary_tags"
            or "ai_disclosed_summary_tags" in recommended_lanes
            or publication.get("ai_disclosed_ready")
        ),
        "researcher_verified": bool(
            supplied.get("researcher_verified_release_candidate")
            or recommended == "researcher_verified"
            or "researcher_verified" in recommended_lanes
            or publication.get("researcher_verified_ready")
        ),
    }


def filter_dossiers(
    dossiers: list[dict[str, Any]], focus: str, *,
    decision_states: dict[str, dict] | None = None,
    prior_clusters: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Return dossiers matching one visible focus without changing their order."""
    states = decision_states or {}
    prior = prior_clusters or set()
    if focus not in FILTER_OPTIONS:
        raise ValueError(f"Unsupported Review Inbox focus: {focus}")
    result: list[dict[str, Any]] = []
    for dossier in dossiers:
        signals = _signals(dossier)
        dossier_fp = str(dossier.get("dossier_fingerprint") or "")
        state = states.get(dossier_fp) or {}
        disposition_value = state.get("disposition")
        disposition = (
            str(disposition_value.get("action") or "undecided")
            if isinstance(disposition_value, dict)
            else str(disposition_value or "undecided")
        )
        include = {
            "All batch dossiers": True,
            "Human exceptions": signals["human_exception"],
            "Specialist / second opinion": signals["specialist_attention"],
            "Evidence conflicts": signals["evidence_conflict"],
            "Recurring provisional": signals["recurring"],
            "Consequential promotion": signals["consequential"],
            "Publication blocked": signals["publication_blocked"],
            "Contains AI-disclosed eligible document(s)": signals["ai_disclosed"],
            "Contains researcher-verified document(s)": signals["researcher_verified"],
            "Undecided locally": disposition == "undecided",
            "Decided locally": disposition != "undecided",
            "Prior snapshot decisions": str(dossier.get("cluster_id") or "") in prior,
        }[focus]
        if include:
            result.append(dossier)
    return result


def dossier_table_rows(
    dossiers: list[dict[str, Any]], *, decision_states: dict[str, dict] | None = None,
) -> list[dict[str, Any]]:
    """Flatten high-value dossier fields while keeping batch/archive counts distinct."""
    states = decision_states or {}
    rows: list[dict[str, Any]] = []
    for dossier in dossiers:
        review = dossier.get("review") if isinstance(dossier.get("review"), dict) else {}
        fp = str(dossier.get("dossier_fingerprint") or "")
        state = states.get(fp) or {}
        disposition_value = state.get("disposition")
        disposition = (
            str(disposition_value.get("action") or "undecided")
            if isinstance(disposition_value, dict)
            else str(disposition_value or "undecided")
        )
        batch_refs = dossier.get("batch_references") or dossier.get("batch_refs") or []
        context_refs = (
            dossier.get("archive_context_references")
            or dossier.get("archive_context_refs")
            or []
        )
        publication_rows = [
            row.get("publication_readiness") or {}
            for row in dossier.get("batch_item_signals") or []
            if isinstance(row, dict)
        ]
        rows.append({
            "Family": str(dossier.get("family") or "").replace("_", " "),
            "Draft label": dossier.get("preferred_draft_label") or dossier.get("label") or "(unlabelled)",
            "Proposal records in batch": len(batch_refs),
            "Proposal records across archive": len(context_refs) + len(batch_refs),
            "Evidence located": dossier.get("located_evidence_count")
            or sum(
                1 for ref in [*batch_refs, *context_refs]
                if ((ref.get("record") or {}).get("evidence") or {}).get("located")
            ),
            "Trust": dossier.get("trust_state") or "raw_proposal",
            "Review lane": review.get("review_lane") or dossier.get("review_lane") or "AI-managed long tail",
            "Local decision": disposition,
            "AI-disclosed eligible docs": sum(
                row.get("recommended_lane") == "ai_disclosed_summary_tags"
                for row in publication_rows
            ),
            "Researcher-verified docs": sum(
                row.get("recommended_lane") == "researcher_verified"
                for row in publication_rows
            ),
            "Publication-blocked docs": sum(
                row.get("recommended_lane") == "blocked" for row in publication_rows
            ),
        })
    return rows


def resolve_proposal_editor_target(
    corpus_dir: Path, *, family: str, doc_id: str, proposal_id: str,
) -> dict[str, str] | None:
    """Resolve one immutable proposal ID to the current legacy editor position.

    Positional indexes are intentionally never accepted as identity.  A missing
    or duplicated stable ID means the proposal has drifted and cannot be opened
    automatically.
    """
    if family not in FAMILY_EDITOR or not doc_id or not proposal_id:
        return None
    corpus = Path(corpus_dir)
    doc_path = corpus / doc_id
    try:
        corpus_resolved = corpus.resolve(strict=True)
        if (
            doc_path.parent.resolve(strict=True) != corpus_resolved
            or not doc_path.is_dir()
            or doc_path.is_symlink()
            or doc_path.resolve(strict=True).parent != corpus_resolved
        ):
            return None
    except (OSError, FileNotFoundError):
        return None
    path = doc_path / "enrichment.json"
    if not path.is_file() or path.is_symlink() or path.stat().st_size > 20 * 1024 * 1024:
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    values = payload.get(family) if isinstance(payload, dict) else None
    if not isinstance(values, list):
        return None
    matches = [
        index for index, item in enumerate(values)
        if isinstance(item, dict) and str(item.get("proposal_id") or "") == proposal_id
    ]
    if len(matches) != 1:
        return None
    queue, widget = FAMILY_EDITOR[family]
    index = matches[0]
    return {
        "page": "Lexicon",
        "section": "Local Proposals",
        "queue": queue,
        "widget_key": widget,
        "widget_value": f"{path}::{doc_id}::{index}",
    }
