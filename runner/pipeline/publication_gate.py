"""Two-lane publication readiness checks over local corpus artifacts.

The long tail may expose AI-generated summaries and document-level tags when
they are visibly disclosed, auditable, source-linked, and stripped of
unreviewed high-stakes claims.  Researcher-verified outputs remain a separate
lane for testimony, legal interpretation, canonical entities/edges/claims, and
curated research arguments.  This checker never publishes anything.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "publication-gate-v2.0"
LEGAL_TYPES = {"Legal-Instrument", "Regulatory-Policy-Document"}
TESTIMONY_TYPES = {"Testimony", "Survivor-Network-Material"}


def _read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _human_reviewed(doc_dir: Path, analysis: dict) -> bool:
    review = _read_json(doc_dir / "review_status.json", {})
    if isinstance(review, dict) and review.get("analysis_reviewed") is True:
        return True
    overrides = analysis.get("_manual_overrides") or {}
    return isinstance(overrides, dict) and bool(overrides.get("analysis_reviewed"))


def _second_opinion_state(doc_dir: Path) -> str:
    """Return absent | agreed | disagreed | researcher_resolved for latest comparison."""
    paths = sorted(doc_dir.glob("analysis_comparison_*.json"), reverse=True)
    if not paths:
        return "absent"
    comparison = _read_json(paths[0], {})
    if not isinstance(comparison, dict):
        return "absent"
    if comparison.get("outcome") in {"kept_original", "adopted_alt", "edited"}:
        return "researcher_resolved"
    consequential = {
        str(field) for field in (comparison.get("fields_that_differed") or [])
        if str(field) not in {"confidence.overall_score", "needs_review"}
    }
    return "disagreed" if consequential else "agreed"


def assess_publication_readiness(doc_dir: Path) -> dict:
    """Assess AI-disclosed and researcher-verified public lanes separately."""
    doc_dir = Path(doc_dir)
    common_blockers: list[str] = []
    ai_blockers: list[str] = []
    researcher_blockers: list[str] = []
    warnings: list[str] = []
    analysis = _read_json(doc_dir / "analysis.json", {})
    intake = _read_json(doc_dir / "intake.json", {})
    if not isinstance(analysis, dict) or not analysis:
        common_blockers.append("analysis.json is missing or unreadable")
        analysis = {}
    if not isinstance(intake, dict):
        intake = {}

    if not (doc_dir / "citation_units.json").exists():
        common_blockers.append("citation_units.json is missing; public text needs stable evidence locators")
    if not (doc_dir / "sanity_record.json").exists():
        common_blockers.append("document has not been uploaded to Sanity")

    audit = _read_json(doc_dir / "analysis_audit.json", {})
    if not isinstance(audit, dict) or not audit:
        ai_blockers.append("analysis audit metadata is missing")
    else:
        if str(audit.get("validation_path") or "") in {"", "failed"}:
            ai_blockers.append("analysis did not record a successful typed-output validation path")
        if audit.get("errors"):
            ai_blockers.append("analysis audit contains unresolved errors")
        if not str(audit.get("model") or audit.get("resolved_model") or "").strip():
            ai_blockers.append("analysis audit does not identify the model")
        if not str(audit.get("prompt_sha256") or audit.get("prompt_hash") or audit.get("prompt_version") or "").strip():
            ai_blockers.append("analysis audit does not identify the prompt/version")

    source = str(intake.get("source_url") or intake.get("source") or "")
    if not source.startswith(("http://", "https://")):
        ai_blockers.append("AI-disclosed public lane requires a public source URL or a separate rights decision")
    if not str(analysis.get("summary") or "").strip():
        ai_blockers.append("analysis summary is missing")

    if not _human_reviewed(doc_dir, analysis):
        researcher_blockers.append("no explicit human analysis-review marker")

    confidence = analysis.get("confidence") or {}
    confidence_status = confidence.get("status") if isinstance(confidence, dict) else ""
    if analysis.get("needs_review") or confidence_status in {"low", "medium"}:
        second_opinion = _second_opinion_state(doc_dir)
        if second_opinion not in {"agreed", "researcher_resolved"}:
            ai_blockers.append(
                "analysis needs additional scrutiny; AI-disclosed release requires an agreeing independent "
                "second opinion or a recorded researcher resolution"
            )
        warnings.append(f"additional-scrutiny route: second opinion state is {second_opinion}")
    if isinstance(confidence, dict) and confidence.get("status") in {"low", "medium"}:
        warnings.append(f"model confidence is {confidence.get('status')}; preserve this uncertainty publicly")

    types = {
        str(analysis.get("type") or ""),
        str(analysis.get("primary_type") or ""),
        str(analysis.get("secondary_type") or ""),
    }
    if types & LEGAL_TYPES:
        ai_blockers.append("legal-sensitive interpretation is excluded from the AI-disclosed lane")
        legal = _read_json(doc_dir / "legal_review.json", {})
        if not isinstance(legal, dict) or legal.get("reviewed") is not True:
            researcher_blockers.append("legal-sensitive document lacks completed human legal review")

    triage = _read_json(doc_dir / "triage_result.json", {})
    triage_testimony = bool(
        isinstance(triage, dict) and triage.get("needs_testimony_review")
    )
    testimony_flag = (
        bool(analysis.get("testimony_flag"))
        or bool(types & TESTIMONY_TYPES)
        or triage_testimony
    )
    if testimony_flag:
        ai_blockers.append("testimony-related material is excluded from the AI-disclosed lane")
        review = _read_json(doc_dir / "testimony_review.json", {})
        if not isinstance(review, dict) or review.get("reviewed") is not True:
            researcher_blockers.append("testimony-related document lacks a human testimony review")
        else:
            from .upload import reconcile_testimony_consent

            resolution = reconcile_testimony_consent(
                intake.get("testimony_consent"), review.get("consent_status")
            )
            if resolution["effective_status"] != "confirmed":
                researcher_blockers.append("testimony consent is not confirmed")
            if resolution["disagreement"]:
                researcher_blockers.append("testimony consent records disagree and require reconciliation")
            if review.get("public_display") is not True and not str(review.get("public_excerpt") or "").strip():
                researcher_blockers.append("testimony has neither approved public display nor a researcher-written public excerpt")

    tier = int(intake.get("tier") or 0)
    if tier != 3:
        warnings.append(f"trust tier is {tier or 'unknown'}, not publication Tier 3")

    ai_lane_blockers = [*common_blockers, *ai_blockers]
    researcher_lane_blockers = [*common_blockers, *researcher_blockers]
    ai_ready = not ai_lane_blockers
    researcher_ready = not researcher_lane_blockers
    return {
        "schema_version": SCHEMA_VERSION,
        "doc_id": str(analysis.get("doc_id") or intake.get("doc_id") or doc_dir.name),
        "ready": ai_ready or researcher_ready,
        "recommended_lane": (
            "researcher_verified" if researcher_ready
            else "ai_disclosed_summary_tags" if ai_ready
            else "blocked"
        ),
        "lanes": {
            "ai_disclosed_summary_tags": {
                "ready": ai_ready,
                "blockers": ai_lane_blockers,
                "allowed_public_fields": [
                    "source metadata",
                    "AI-generated summary",
                    "document-level controlled-vocabulary tags",
                    "citation/evidence links",
                    "model, prompt, lexicon, retrieval, and audit disclosure",
                ],
                "excluded_without_human_promotion": [
                    "canonical entity identity",
                    "funding/coordination/network assertions",
                    "claim verification verdicts",
                    "legal interpretation",
                    "testimony or public excerpts",
                ],
                "required_disclosure": (
                    "AI-generated archival description; not individually fact-checked. "
                    "Show source, evidence links, model/prompt versions, audit status, and a correction pathway."
                ),
            },
            "researcher_verified": {
                "ready": researcher_ready,
                "blockers": researcher_lane_blockers,
            },
        },
        "blockers": ai_lane_blockers if not ai_ready else [],
        "warnings": warnings,
        "release_policy_decision_required": True,
    }


def audit_corpus_publication_readiness(corpus_dir: Path) -> dict:
    rows = []
    corpus_dir = Path(corpus_dir)
    if corpus_dir.exists():
        for doc_dir in sorted(path for path in corpus_dir.iterdir() if path.is_dir() and not path.name.startswith(".")):
            rows.append(assess_publication_readiness(doc_dir))
    return {
        "schema_version": "publication-audit-v2.0",
        "generated_at": _now(),
        "corpus_dir": str(corpus_dir),
        "documents": len(rows),
        "ready_for_ai_disclosed_release": sum(
            1 for row in rows if row["lanes"]["ai_disclosed_summary_tags"]["ready"]
        ),
        "ready_for_researcher_verified_release": sum(
            1 for row in rows if row["lanes"]["researcher_verified"]["ready"]
        ),
        "ready_for_release_policy": sum(1 for row in rows if row["ready"]),
        "blocked": sum(1 for row in rows if not row["ready"]),
        "rows": rows,
        "policy": (
            "Two lanes: disclosed AI summaries/tags for the auditable low-risk long tail, and "
            "researcher-verified outputs for consequential material. This audit never publishes."
        ),
    }
