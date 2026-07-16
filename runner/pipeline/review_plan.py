"""Deterministic exception queue for enrichment proposals.

The long tail stays AI-managed and visibly provisional.  Only already-approved
work, sensitive/key-document material, and recurring evidence-backed concepts
enter the bounded human queue.  The plan never approves, rejects, merges,
uploads, or publishes anything.
"""
from __future__ import annotations

import json
import hashlib
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "review-plan-v1.1"
FAMILIES = (
    "lexicon_proposals",
    "entity_proposals",
    "tactic_proposals",
    "practice_descriptions",
    "statistical_claims",
)
LABEL_FIELDS = {
    "lexicon_proposals": ("term",),
    "entity_proposals": ("name",),
    "tactic_proposals": ("tactic",),
    "practice_descriptions": ("practice_id", "exact_description"),
    "statistical_claims": ("claim",),
}
FAMILY_LABELS = {
    "lexicon_proposals": "lexicon",
    "entity_proposals": "entity",
    "tactic_proposals": "tactic",
    "practice_descriptions": "practice",
    "statistical_claims": "claim",
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _normalise(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _state(item: dict) -> str:
    explicit = item.get("proposal_status")
    if explicit in {"pending", "approved", "rejected", "pushed"}:
        return str(explicit)
    if item.get("rejected"):
        return "rejected"
    if item.get("approved") and item.get("pushed_to_sanity"):
        return "pushed"
    if item.get("approved"):
        return "approved"
    return "pending"


def _label(family: str, item: dict) -> str:
    for field in LABEL_FIELDS[family]:
        value = str(item.get(field) or "").strip()
        if value:
            return value
    return "(unlabelled)"


def _has_evidence(item: dict) -> bool:
    return any(
        str(item.get(field) or "").strip()
        for field in (
            "exact_quote", "evidence_quote", "harm_quote", "exact_description",
            "source_cited",
        )
    )


def _group_key(family: str, normalised_label: str) -> str:
    raw = f"{family}\0{normalised_label}".encode("utf-8")
    return f"review-group-{hashlib.sha256(raw).hexdigest()[:16]}"


def collect_review_items(corpus_dir: Path) -> list[dict]:
    """Collect pending and approved-unpushed proposal references."""
    rows: list[dict] = []
    corpus_dir = Path(corpus_dir)
    if not corpus_dir.exists():
        return rows
    for doc_dir in sorted(path for path in corpus_dir.iterdir() if path.is_dir() and not path.name.startswith(".")):
        enrichment = _read_json(doc_dir / "enrichment.json", {})
        if not isinstance(enrichment, dict):
            continue
        analysis = _read_json(doc_dir / "analysis.json", {})
        if not isinstance(analysis, dict):
            analysis = {}
        intake = _read_json(doc_dir / "intake.json", {})
        if not isinstance(intake, dict):
            intake = {}
        for family in FAMILIES:
            for index, item in enumerate(enrichment.get(family) or []):
                if not isinstance(item, dict):
                    continue
                state = _state(item)
                if state not in {"pending", "approved"}:
                    continue
                label = _label(family, item)
                rows.append({
                    "doc_id": doc_dir.name,
                    "family": family,
                    "family_label": FAMILY_LABELS[family],
                    "index": index,
                    "label": label,
                    "normalised_label": _normalise(label),
                    "state": state,
                    "has_evidence": _has_evidence(item),
                    "source_uploaded": (doc_dir / "sanity_record.json").exists(),
                    "document_type": str(analysis.get("type") or analysis.get("primary_type") or "unknown"),
                    "testimony_flag": bool(analysis.get("testimony_flag")),
                    "key_document": int(intake.get("tier") or 0) == 3,
                })
    return rows


def _group_score(group: dict) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []
    if group["approved_unpushed"]:
        score += 100
        reasons.append("already approved; finish the push lifecycle")
    if group["family"] == "statistical_claims":
        score += 55
        reasons.append("claim verdict and citation checking are human-owned")
    elif group["family"] == "entity_proposals":
        score += 45
        reasons.append("identity resolution can create reputational risk")
    elif group["family"] == "tactic_proposals":
        score += 35
        reasons.append("controlled-vocabulary decision affects later analysis")
    elif group["family"] == "practice_descriptions":
        score += 25
    else:
        score += 20
    if group["document_count"] > 1:
        score += min(30, group["document_count"] * 5)
        reasons.append(f"repeated across {group['document_count']} documents; review once as a cluster")
    if group["evidence_count"]:
        score += 8
        reasons.append("evidence text is available")
    else:
        score -= 10
        reasons.append("no evidence text; verify source before any approval")
    if group["testimony_related"]:
        score += 40
        reasons.append("testimony-related material requires careful human review")
    return score, reasons


def build_review_plan(
    corpus_dir: Path,
    *,
    group_limit: int = 25,
    recurrence_threshold: int = 3,
    focus_doc_ids: set[str] | None = None,
) -> dict:
    """Return a human exception queue plus an AI-managed long-tail summary.

    ``focus_doc_ids`` limits the returned groups to concepts attested in the
    selected documents, while recurrence and evidence counts still use the
    whole corpus.  This makes a batch review benefit from accumulated archive
    memory without pretending that the batch is an isolated mini-corpus.
    """
    items = collect_review_items(corpus_dir)
    focus = {str(doc_id) for doc_id in (focus_doc_ids or set()) if str(doc_id)}
    grouped: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for item in items:
        grouped[(item["family"], item["normalised_label"] or item["label"])].append(item)
    groups = []
    for (family, _), refs in grouped.items():
        if focus and not any(ref["doc_id"] in focus for ref in refs):
            continue
        labels = Counter(ref["label"] for ref in refs)
        group = {
            "group_key": _group_key(family, refs[0]["normalised_label"] or refs[0]["label"]),
            "family": family,
            "family_label": FAMILY_LABELS[family],
            "label": labels.most_common(1)[0][0],
            "proposal_count": len(refs),
            "document_count": len({ref["doc_id"] for ref in refs}),
            "evidence_count": sum(1 for ref in refs if ref["has_evidence"]),
            "approved_unpushed": sum(1 for ref in refs if ref["state"] == "approved"),
            "pending": sum(1 for ref in refs if ref["state"] == "pending"),
            "testimony_related": any(ref["testimony_flag"] for ref in refs),
            "key_document_related": any(ref["key_document"] for ref in refs),
            "references": [
                {key: ref[key] for key in ("doc_id", "index", "state", "has_evidence", "source_uploaded")}
                for ref in refs
            ],
            "safe_ai_assistance": [
                "cluster spelling/label variants",
                "summarize the supplied evidence without adding facts",
                "retrieve candidate source passages for researcher verification",
            ],
        }
        if group["approved_unpushed"]:
            group["review_lane"] = "finish_existing_human_decision"
        elif group["testimony_related"]:
            group["review_lane"] = "sensitive_human_exception"
        elif group["key_document_related"]:
            group["review_lane"] = "key_document_human_exception"
        elif group["document_count"] >= max(2, int(recurrence_threshold)) and group["evidence_count"]:
            group["review_lane"] = "recurring_candidate_for_human_promotion"
        else:
            group["review_lane"] = "ai_managed_long_tail"
        group["human_decision_required"] = group["review_lane"] != "ai_managed_long_tail"
        group["priority_score"], group["priority_reasons"] = _group_score(group)
        groups.append(group)
    groups.sort(key=lambda row: (-row["priority_score"], -row["proposal_count"], row["family"], row["label"].lower()))
    limit = max(1, int(group_limit))
    human_candidates = [group for group in groups if group["human_decision_required"]]
    ai_managed = [group for group in groups if not group["human_decision_required"]]
    selected = human_candidates[:limit]
    deferred_human = human_candidates[limit:]
    selected_keys = {group["group_key"] for group in selected}
    group_index = [
        {
            "group_key": group["group_key"],
            "family": group["family"],
            "label": group["label"],
            "review_lane": group["review_lane"],
            "human_decision_required": group["human_decision_required"],
            "selected_for_current_review": group["group_key"] in selected_keys,
            "document_count": group["document_count"],
            "evidence_count": group["evidence_count"],
            "references": [
                {"doc_id": ref["doc_id"], "index": ref["index"], "state": ref["state"]}
                for ref in group["references"]
            ],
        }
        for group in groups
    ]
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _now(),
        "corpus_dir": str(Path(corpus_dir)),
        "focus_doc_ids": sorted(focus),
        "raw_actionable_proposals": len(items),
        "review_groups": len(groups),
        "human_candidate_groups": len(human_candidates),
        "ai_managed_groups": len(ai_managed),
        "daily_group_limit": limit,
        "recurrence_threshold": max(2, int(recurrence_threshold)),
        "selected_groups": selected,
        "deferred_human_candidate_groups": len(deferred_human),
        "deferred_human_groups": deferred_human,
        "ai_managed_examples": ai_managed[:20],
        "group_index": group_index,
        "counts_by_family": dict(sorted(Counter(item["family_label"] for item in items).items())),
        "policy": {
            "ai_may": "cluster, sort, summarize supplied evidence, and retrieve candidate passages",
            "ai_must_not": "approve, reject, merge identities/terms, verify claims, assert network edges, or publish",
            "decision_owner": (
                "AI manages provisional long-tail descriptions. The researcher owns promotion into "
                "canonical registries, sensitive decisions, and consequential public claims."
            ),
        },
    }


def review_plan_markdown(plan: dict) -> str:
    lines = [
        "# Bounded Enrichment Review Plan",
        "",
        f"Generated: `{plan.get('generated_at')}`",
        f"Actionable proposals: **{plan.get('raw_actionable_proposals', 0)}**",
        f"All grouped concepts: **{plan.get('review_groups', 0)}**",
        f"Human-candidate groups: **{plan.get('human_candidate_groups', 0)}**",
        f"AI-managed long-tail groups: **{plan.get('ai_managed_groups', 0)}**",
        f"Today's human limit: **{plan.get('daily_group_limit', 0)} groups**",
        "",
        "> The long tail remains visibly AI-generated and provisional. Human work is reserved for promotion, sensitive material, key documents, and recurring evidence-backed concepts.",
        "",
    ]
    for number, group in enumerate(plan.get("selected_groups") or [], start=1):
        refs = ", ".join(ref["doc_id"] for ref in group["references"][:5])
        lines.extend([
            f"## {number}. {group['family_label']}: {group['label']}",
            f"- Priority: {group['priority_score']}",
            f"- Proposals/documents: {group['proposal_count']}/{group['document_count']}",
            f"- Pending / approved-unpushed: {group['pending']} / {group['approved_unpushed']}",
            f"- Documents: `{refs}`",
            f"- Why now: {'; '.join(group['priority_reasons'])}",
            "",
        ])
    return "\n".join(lines)
