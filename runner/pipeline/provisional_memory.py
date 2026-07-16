"""Deterministic provisional corpus memory and derived document tag projections.

Raw Analysis and Enrichment artifacts remain authoritative historical records.
This module creates rebuildable, local-only projections; it never calls a model,
publishes, or promotes a draft concept into a canonical registry.
"""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .atomic_io import atomic_write_json
from .citation_units import attach_locators_to_enrichment_payload, locate_quote
from .tag_registry import load_tag_registry


MEMORY_SCHEMA_VERSION = "provisional-memory-v1.2"
PROJECTION_SCHEMA_VERSION = "tag-projection-v1.0"
FAMILIES = (
    "lexicon_proposals", "entity_proposals", "tactic_proposals",
    "practice_descriptions", "statistical_claims", "ingestion_queue",
    "corpus_connections",
)
LABEL_FIELDS = {
    "lexicon_proposals": ("term",),
    "entity_proposals": ("name",),
    "tactic_proposals": ("tactic",),
    "practice_descriptions": ("practice_id", "exact_description"),
    "statistical_claims": ("claim",),
    "ingestion_queue": ("title", "url"),
    "corpus_connections": ("shared_element", "doc_id"),
}
EVIDENCE_FIELDS = {
    "lexicon_proposals": ("exact_quote",),
    "entity_proposals": ("evidence_quote",),
    "tactic_proposals": ("evidence_quote",),
    "practice_descriptions": ("harm_quote", "exact_description"),
    "statistical_claims": ("claim", "source_cited"),
    "ingestion_queue": ("anchor_text", "relevance"),
    "corpus_connections": ("evidence",),
}
ANALYSIS_TAG_FIELDS = {
    "type": "Type", "primary_type": "Type", "secondary_type": "Type",
    "format": "Format", "scope": "Scope", "narrative_register": "Narrative Register",
    "tactic": "Tactic",
    "actor": "Actor", "network": "Network", "practice": "Practice",
    "term": "Term", "harm": "Harm", "migration": "Migration",
    "function": "Function", "country": "Country", "languages": "Language",
    "landmark": "Landmark", "flags": "Evidence",
}
CONFIDENCE_FIELD_MAP = {
    "primary_type": "type", "secondary_type": "type",
}


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _read(path: Path, default: Any, *, max_bytes: int = 100 * 1024 * 1024) -> Any:
    """Read optional local JSON without following links or hiding corruption."""
    path = Path(path)
    if path.is_symlink():
        raise ValueError(f"Provisional-memory input is not a safe regular file: {path}")
    if not path.exists():
        return default
    if not path.is_file():
        raise ValueError(f"Provisional-memory input is not a safe regular file: {path}")
    if path.stat().st_size > max_bytes:
        raise ValueError(f"Provisional-memory input exceeds the bounded JSON size limit: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Provisional-memory input is malformed JSON: {path}: {exc}") from exc
    return value


def _normalise(value: str) -> str:
    value = re.sub(
        r"^(type|format|term|tactic|practice|network|actor|country|evidence|function|harm|migration|flag)\s*:\s*",
        "", value.strip(), flags=re.I,
    )
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", ascii_value.casefold()).strip()


def _hash(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _source(doc_dir: Path, intake: dict, source_item: dict, offload: dict) -> dict:
    candidates = (
        intake.get("source_url"), offload.get("source_url"), source_item.get("url"),
        intake.get("source"),
    )
    url = next((str(value) for value in candidates if str(value or "").startswith(("http://", "https://"))), "")
    hostname = (urlparse(url).hostname or "").lower().removeprefix("www.")
    # Hostname is deliberately transparent and conservative. It is not proof
    # that two documents are editorially independent.
    family = hostname or f"local-document:{doc_dir.name}"
    return {
        "url": url,
        "hostname": hostname,
        "source_family": family,
        "source_family_method": "hostname-or-local-doc-v1",
        "independence_warning": "Source-family counts are descriptive; mirrors and common producers may remain dependent.",
    }


def _proposal_state(item: dict) -> str:
    explicit = str(item.get("proposal_status") or "")
    if explicit in {"pending", "approved", "rejected", "pushed"}:
        return explicit
    if item.get("rejected"):
        return "rejected"
    if item.get("approved") and item.get("pushed_to_sanity"):
        return "pushed"
    if item.get("approved"):
        return "approved"
    return "pending"


def _first_text(item: dict, fields: tuple[str, ...]) -> tuple[str, str]:
    for field in fields:
        value = str(item.get(field) or "").strip()
        if value:
            return field, value
    return "", ""


def _record(
    *, doc_id: str, family: str, index: int, item: dict, analysis: dict,
    analysis_audit: dict, enrichment: dict, enrichment_audit: dict, source: dict,
) -> dict:
    label_field, label = _first_text(item, LABEL_FIELDS[family])
    evidence_field, evidence = _first_text(item, EVIDENCE_FIELDS[family])
    locator = item.get("evidence_locator") if isinstance(item.get("evidence_locator"), dict) else {}
    proposal_id = str(item.get("proposal_id") or "")
    # Model-supplied proposal IDs are not guaranteed globally unique. Bind the
    # draft identity to its family and exact document while retaining the
    # original proposal_id separately for navigation and provenance.
    draft_id = f"draft-{_hash([family, doc_id, proposal_id, index, label])[:20]}"
    analysis_confidence = analysis.get("confidence") if isinstance(analysis.get("confidence"), dict) else {}
    state = _proposal_state(item)
    located = str(locator.get("status") or "") == "located" and bool(locator.get("unit_id"))
    trust_state = (
        "rejected_match" if state == "rejected" else
        "canonical_trusted" if state == "pushed" else
        "promotion_candidate" if state == "approved" else
        "source_attested" if located else
        "raw_proposal"
    )
    return {
        "draft_id": draft_id,
        "family": family,
        "label": label or "(unlabelled)",
        "label_field": label_field,
        "normalised_label": _normalise(label),
        "proposal_index": index,
        "proposal_state": state,
        "trust_state": trust_state,
        "document": {
            "doc_id": doc_id,
            "source_url": source["url"],
            "source_family": source["source_family"],
            "source_family_method": source["source_family_method"],
        },
        "evidence": {
            "field": evidence_field,
            "text": evidence,
            "located": located,
            "locator": locator,
        },
        "model_confidence": {
            "proposal_score": item.get("model_confidence"),
            "proposal_rationale": str(item.get("confidence_rationale") or ""),
            "researcher_score": item.get("researcher_confidence"),
            "analysis_overall_score": analysis_confidence.get("overall_score"),
            "analysis_status": analysis_confidence.get("status"),
            "analysis_reasons": analysis_confidence.get("reasons") or [],
            "not_a_truth_probability": True,
        },
        "provenance": {
            "origin_stage": str(item.get("_origin_stage") or "enrichment"),
            "proposal_id": proposal_id,
            "proposal_created_at": item.get("proposal_created_at"),
            "proposal_updated_at": item.get("proposal_updated_at"),
            "analysis_model": analysis_audit.get("model") or analysis_audit.get("resolved_model"),
            "analysis_prompt_version": analysis.get("prompt_version") or analysis_audit.get("prompt_version"),
            "analysis_prompt_hash": analysis_audit.get("prompt_sha256") or analysis_audit.get("prompt_hash"),
            "analysis_ontology_version": analysis.get("ontology_version") or analysis_audit.get("ontology_version"),
            "enrichment_model": enrichment.get("enrichment_model") or enrichment_audit.get("enrichment_model"),
            "enrichment_prompt_version": enrichment.get("enrichment_prompt_version") or enrichment_audit.get("prompt_version"),
            "enrichment_prompt_hash": enrichment_audit.get("prompt_sha256") or enrichment_audit.get("prompt_hash"),
            "analysis_git_commit": analysis_audit.get("git_commit"),
            "enrichment_git_commit": enrichment_audit.get("git_commit"),
        },
        "proposal": item,
    }


def collect_draft_records(corpus_dir: Path) -> list[dict]:
    records: list[dict] = []
    if not Path(corpus_dir).is_dir():
        return records
    for doc_dir in sorted(
        path for path in Path(corpus_dir).iterdir()
        if path.is_dir() and not path.is_symlink() and not path.name.startswith(".")
    ):
        enrichment = _read(doc_dir / "enrichment.json", {})
        if not isinstance(enrichment, dict):
            continue
        analysis = _read(doc_dir / "analysis.json", {})
        analysis_audit = _read(doc_dir / "analysis_audit.json", {})
        enrichment_audit = _read(doc_dir / "enrichment_audit.json", {})
        intake = _read(doc_dir / "intake.json", {})
        source_item = _read(doc_dir / "source_item.json", {})
        offload = _read(doc_dir / "offload_import.json", {})
        citation_units = _read(doc_dir / "citation_units.json", {})
        located = attach_locators_to_enrichment_payload(enrichment, citation_units)
        source = _source(doc_dir, intake, source_item, offload)
        for family in FAMILIES:
            values = located.get(family) or []
            if not isinstance(values, list):
                continue
            for index, item in enumerate(values):
                if isinstance(item, dict):
                    records.append(_record(
                        doc_id=doc_dir.name, family=family, index=index, item=item,
                        analysis=analysis if isinstance(analysis, dict) else {},
                        analysis_audit=analysis_audit if isinstance(analysis_audit, dict) else {},
                        enrichment=enrichment,
                        enrichment_audit=enrichment_audit if isinstance(enrichment_audit, dict) else {},
                        source=source,
                    ))
        # Analysis candidate terms are discovery hints, not authoritative
        # Enrichment proposals. Preserve them in the same draft evidence stream
        # with an explicit origin marker so they can be compared, never silently
        # promoted or counted as an independent source.
        field_confidence = analysis.get("field_confidence") if isinstance(analysis, dict) and isinstance(analysis.get("field_confidence"), dict) else {}
        for index, candidate in enumerate(analysis.get("candidate_terms") or [] if isinstance(analysis, dict) else []):
            if not isinstance(candidate, dict) or not str(candidate.get("term") or "").strip():
                continue
            item = {
                "proposal_id": f"analysis-candidate-{_hash([doc_dir.name, index, candidate.get('term')])[:18]}",
                "term": candidate.get("term"),
                "exact_quote": candidate.get("context_quote") or "",
                "model_confidence": field_confidence.get("term"),
                "confidence_rationale": "Inherited from Analysis field_confidence.term; this is a discovery hint.",
                "proposal_status": "pending",
                "_origin_stage": "analysis_candidate_terms",
                "analysis_candidate": candidate,
            }
            item["evidence_locator"] = locate_quote(
                citation_units, str(item.get("exact_quote") or "")
            )
            records.append(_record(
                doc_id=doc_dir.name, family="lexicon_proposals", index=index,
                item=item,
                analysis=analysis, analysis_audit=analysis_audit if isinstance(analysis_audit, dict) else {},
                enrichment=enrichment, enrichment_audit=enrichment_audit if isinstance(enrichment_audit, dict) else {},
                source=source,
            ))
    return records


def _reviewed_family_context(
    identity_projection: dict[str, Any] | Path | None, eligible_corpus_doc_ids: set[str],
    *, identity_snapshot: dict[str, Any] | Path | None = None,
    identity_decisions: list[dict[str, Any]] | Path | None = None,
    unavailable_reason: str = "",
) -> dict[str, Any]:
    """Return a bounded, fail-closed view of explicit family assignments.

    The identity decision module owns the full append-only ledger contract.  Memory
    only consumes its applied projection and binds the exact ledger/snapshot
    fingerprints plus the reviewed doc-to-family mapping into its own fingerprint.
    """
    unavailable = {
        "available": False,
        "source_snapshot_fingerprint": "",
        "decision_ledger_fingerprint": "",
        "projection_fingerprint": "",
        "applied_decision_ids": [],
        "reviewed_document_families": {},
        "corpus_scope_complete": False,
        "corpus_review_complete": False,
        "reason": unavailable_reason or "No validated researcher-reviewed identity projection supplied.",
        "independence_claim": False,
    }
    if identity_projection is None:
        return unavailable
    try:
        projection = (
            _read(Path(identity_projection), {}, max_bytes=25 * 1024 * 1024)
            if isinstance(identity_projection, (str, Path)) else identity_projection
        )
        if not isinstance(projection, dict):
            return {**unavailable, "reason": "Identity projection is not an object."}
        if identity_snapshot is None or identity_decisions is None:
            return {**unavailable, "reason": "Identity projection lacks its bound snapshot/decision ledger validation inputs."}
        snapshot = (
            _read(Path(identity_snapshot), {}, max_bytes=25 * 1024 * 1024)
            if isinstance(identity_snapshot, (str, Path)) else identity_snapshot
        )
        decisions = (
            _read(Path(identity_decisions), [], max_bytes=25 * 1024 * 1024)
            if isinstance(identity_decisions, (str, Path)) else identity_decisions
        )
        if not isinstance(snapshot, dict) or not isinstance(decisions, list):
            return {**unavailable, "reason": "Identity validation snapshot or decision ledger is malformed."}
        from .source_identity_decisions import apply_identity_decisions
        if apply_identity_decisions(snapshot, decisions) != projection:
            return {**unavailable, "reason": "Identity projection differs from its bound snapshot/decision ledger."}
        from .workflow_integrity import valid_fingerprint
        snapshot_fp = str(projection.get("source_snapshot_fingerprint") or "")
        ledger_fp = str(projection.get("decision_ledger_fingerprint") or "")
        projection_fp = str(projection.get("projection_fingerprint") or "")
        decisions = projection.get("applied_decision_ids")
        documents = projection.get("documents")
        if (
            projection.get("schema_version") != "source-identity-reviewed-projection-v1.0"
            or not valid_fingerprint(snapshot_fp)
            or not valid_fingerprint(ledger_fp)
            or not valid_fingerprint(projection_fp)
            or _hash({key: value for key, value in projection.items() if key != "projection_fingerprint"}) != projection_fp
        ):
            return {**unavailable, "reason": "Identity projection fingerprints are missing or invalid."}
        if not isinstance(decisions, list) or decisions != sorted(set(decisions)):
            return {**unavailable, "reason": "Identity projection decision references are malformed."}
        if not isinstance(documents, list):
            return {**unavailable, "reason": "Identity projection document assignments are missing."}
        reviewed: dict[str, str] = {}
        projected_doc_ids: set[str] = set()
        for row in documents:
            if not isinstance(row, dict):
                return {**unavailable, "reason": "Identity projection contains an invalid document row."}
            doc_id = str(row.get("doc_id") or "")
            if not doc_id or doc_id in projected_doc_ids:
                return {**unavailable, "reason": "Identity projection contains a missing or duplicate document."}
            projected_doc_ids.add(doc_id)
            family_id = str(row.get("confirmed_document_family_id") or "")
            state = str(row.get("family_resolution_state") or "")
            if state == "researcher_confirmed":
                if not doc_id or not family_id or doc_id in reviewed:
                    return {**unavailable, "reason": "Identity projection contains an invalid reviewed family assignment."}
                reviewed[doc_id] = family_id
        corpus_scope_complete = projected_doc_ids == eligible_corpus_doc_ids
        return {
            "available": True,
            "source_snapshot_fingerprint": snapshot_fp,
            "decision_ledger_fingerprint": ledger_fp,
            "projection_fingerprint": projection_fp,
            "applied_decision_ids": decisions,
            "reviewed_document_families": dict(sorted(reviewed.items())),
            "corpus_scope_complete": corpus_scope_complete,
            "corpus_review_complete": corpus_scope_complete and set(reviewed) == eligible_corpus_doc_ids,
            "reason": "Only explicit researcher-confirmed family assignments are included.",
            "independence_claim": False,
        }
    except (OSError, ValueError, TypeError) as exc:
        return {**unavailable, "reason": f"Identity projection was rejected: {exc}"}


def _cluster(
    records: list[dict], recurrence_threshold: int, identity_review: dict[str, Any],
) -> list[dict]:
    grouped: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for record in records:
        grouped[(record["family"], record["normalised_label"] or record["label"])].append(record)
    clusters = []
    for (family, normalised), refs in grouped.items():
        active = [ref for ref in refs if ref["proposal_state"] not in {"rejected", "pushed"}]
        labels = Counter(ref["label"] for ref in (active or refs))
        hostname_proxies = sorted({ref["document"]["source_family"] for ref in active})
        docs = sorted({ref["document"]["doc_id"] for ref in active})
        reviewed_map = identity_review.get("reviewed_document_families") or {}
        reviewed_families = sorted({reviewed_map[doc_id] for doc_id in docs if doc_id in reviewed_map})
        reviewed_coverage = len([doc_id for doc_id in docs if doc_id in reviewed_map]) / len(docs) if docs else 0.0
        complete_family_review = bool(docs) and reviewed_coverage == 1.0
        scores = [
            float(ref["model_confidence"]["proposal_score"])
            for ref in active if isinstance(ref["model_confidence"]["proposal_score"], (int, float))
        ]
        conflict_by_field: dict[str, set[str]] = defaultdict(set)
        for ref in active:
            proposal = ref["proposal"]
            for field in ("definition_as_used", "function", "usage_register", "verification_status"):
                value = str(proposal.get(field) or "").strip()
                if value:
                    conflict_by_field[field].add(_normalise(value))
        conflicting_fields = {
            field: sorted(values) for field, values in conflict_by_field.items() if len(values) > 1
        }
        has_conflict = family in {"lexicon_proposals", "statistical_claims"} and bool(conflicting_fields)
        if not active:
            state = "inactive_history"
        elif has_conflict:
            state = "conflicted_provisional"
        elif len(hostname_proxies) >= max(2, recurrence_threshold) and any(ref["evidence"]["located"] for ref in active):
            state = "recurring_provisional"
        elif any(ref["evidence"]["located"] for ref in active):
            state = "source_attested"
        else:
            state = "raw_proposal"
        clusters.append({
            "cluster_id": f"memory-{_hash([family, normalised])[:18]}",
            "family": family,
            "preferred_draft_label": labels.most_common(1)[0][0],
            "normalised_label": normalised,
            "trust_state": state,
            "proposal_count": len(refs),
            "active_proposal_count": len(active),
            "document_count": len(docs),
            "source_family_count": (
                len(reviewed_families)
                if complete_family_review and identity_review.get("corpus_review_complete") else None
            ),
            "source_families": (
                reviewed_families
                if complete_family_review and identity_review.get("corpus_review_complete") else []
            ),
            "reviewed_family_count_for_selected_scope": len(reviewed_families) if complete_family_review else None,
            "source_hostname_proxy_count": len(hostname_proxies),
            "source_hostname_proxies": hostname_proxies,
            "document_ids": docs,
            "located_evidence_count": sum(1 for ref in active if ref["evidence"]["located"]),
            "conflict_detected": has_conflict,
            "conflict_signals": conflicting_fields if has_conflict else {},
            "model_confidence_summary": {
                "reported_count": len(scores),
                "missing_count": len(active) - len(scores),
                "minimum": min(scores) if scores else None,
                "maximum": max(scores) if scores else None,
                "mean": sum(scores) / len(scores) if scores else None,
                "interpretation": "Describes model self-assessment only; evidence strength is stored separately.",
            },
            "draft_ids": [ref["draft_id"] for ref in refs],
            "source_independence": {
                "method": "researcher-confirmed-document-family-v1" if complete_family_review else "incomplete-researcher-family-review",
                "reviewed_document_coverage": round(reviewed_coverage, 6),
                "count_complete": complete_family_review and bool(identity_review.get("corpus_review_complete")),
                "selected_scope_review_complete": complete_family_review,
                "corpus_scope_complete": bool(identity_review.get("corpus_scope_complete")),
                "corpus_review_complete": bool(identity_review.get("corpus_review_complete")),
                "decision_ledger_fingerprint": identity_review.get("decision_ledger_fingerprint") or "",
                "independence_claim": False,
                "warning": "A reviewed document-family count describes resolved families; it is not proof of editorial independence. Incomplete review leaves the count null.",
            },
        })
    return sorted(clusters, key=lambda row: (-row["source_hostname_proxy_count"], -row["document_count"], row["family"], row["preferred_draft_label"].casefold()))


def build_provisional_memory(
    corpus_dir: Path,
    out_root: Path,
    *,
    label: str = "corpus",
    focus_doc_ids: set[str] | None = None,
    recurrence_threshold: int = 2,
    identity_projection: dict[str, Any] | Path | None = None,
    identity_snapshot: dict[str, Any] | Path | None = None,
    identity_decisions: list[dict[str, Any]] | Path | None = None,
    identity_unavailable_reason: str = "",
) -> dict[str, Any]:
    records = collect_draft_records(corpus_dir)
    eligible_corpus_doc_ids = {
        path.name for path in Path(corpus_dir).iterdir()
        if path.is_dir() and not path.is_symlink() and not path.name.startswith(".")
        and ((path / "intake.json").is_file() or (path / "preprocess.json").is_file())
    } if Path(corpus_dir).is_dir() else set()
    identity_review = _reviewed_family_context(
        identity_projection, eligible_corpus_doc_ids,
        identity_snapshot=identity_snapshot, identity_decisions=identity_decisions,
        unavailable_reason=identity_unavailable_reason,
    )
    clusters = _cluster(records, max(2, int(recurrence_threshold)), identity_review)
    # Corpus directory names are the authoritative document identities.  A
    # leading ``doc-`` can be part of that identity; stripping it makes a
    # focused batch silently miss the corresponding evidence.
    focus = {str(value) for value in (focus_doc_ids or set())}
    focused_clusters = [row for row in clusters if not focus or focus.intersection(row["document_ids"])]
    stable = {
        "schema_version": MEMORY_SCHEMA_VERSION,
        "label": label,
        "recurrence_threshold": max(2, int(recurrence_threshold)),
        "focus_doc_ids": sorted(focus),
        "source_identity_review": identity_review,
        "records": records,
        "clusters": clusters,
        "focused_cluster_ids": [row["cluster_id"] for row in focused_clusters],
    }
    fingerprint = _hash(stable)
    payload = {
        **stable,
        "generated_at": _now(),
        "evidence_fingerprint": fingerprint,
        "sensitivity": {
            "classification": "internal_research_evidence",
            "external_sharing": "prohibited without explicit researcher review and redaction",
            "contains": ["source URLs", "evidence quotes", "model proposals", "possible sensitive entities/testimony"],
            "retention": "Versioned research artifact; define project retention/removal policy before public deployment.",
        },
        "summary": {
            "draft_records": len(records),
            "all_clusters": len(clusters),
            "focused_clusters": len(focused_clusters),
            "source_attested_or_better": sum(1 for row in focused_clusters if row["located_evidence_count"]),
            "recurring_provisional": sum(1 for row in focused_clusters if row["trust_state"] == "recurring_provisional"),
            "conflicted_provisional": sum(1 for row in focused_clusters if row["trust_state"] == "conflicted_provisional"),
        },
        "policy": {
            "analysis_use": "Provisional memory is excluded from baseline Analysis.",
            "enrichment_use": "Source-attested and recurring provisional clusters may be retrieved with explicit trust labels.",
            "promotion": "No cluster becomes canonical without an existing recorded human decision.",
        },
    }
    safe_label = re.sub(r"[^a-zA-Z0-9_.-]+", "-", label).strip("-") or "corpus"
    snapshot = Path(out_root) / safe_label / "snapshots" / f"{safe_label}--{fingerprint[:12]}" / "provisional_memory.json"
    existed = snapshot.is_file()
    if not existed:
        atomic_write_json(snapshot, payload)
    atomic_write_json(Path(out_root) / safe_label / "latest_provisional_memory.json", payload)
    atomic_write_json(Path(out_root) / "latest_provisional_memory.json", payload)
    return {"memory": payload, "path": snapshot, "reused": existed}


def enrichment_memory_context(
    memory: dict,
    analysis: dict,
    *,
    max_clusters: int = 30,
) -> dict[str, Any]:
    """Select a small, explicitly provisional lexical context for Enrichment."""
    query_values = [str(analysis.get("summary") or "")]
    for field in ("term", "tactic", "practice", "actor", "network", "harm", "function"):
        value = analysis.get(field)
        query_values.extend(str(item) for item in value if str(item).strip()) if isinstance(value, list) else None
    for item in analysis.get("candidate_terms") or []:
        if isinstance(item, dict):
            query_values.append(str(item.get("term") or ""))
    query = _normalise(" ".join(query_values))
    query_tokens = set(query.split())
    candidates = []
    for cluster in memory.get("clusters") or []:
        if not isinstance(cluster, dict) or cluster.get("trust_state") not in {
            "source_attested", "recurring_provisional", "conflicted_provisional",
        }:
            continue
        label = str(cluster.get("normalised_label") or "")
        tokens = set(label.split())
        overlap = len(tokens & query_tokens)
        exact = bool(label and label in query)
        if not exact and not overlap:
            continue
        score = (100 if exact else 0) + overlap * 10 + min(9, int(cluster.get("source_family_count") or 0))
        candidates.append((score, cluster))
    selected = [row for _, row in sorted(
        candidates, key=lambda pair: (-pair[0], str(pair[1].get("preferred_draft_label") or "").casefold())
    )[:max(1, int(max_clusters))]]
    lines = [
        "PROVISIONAL CORPUS MEMORY — retrieval hints only; independently confirm against the current source.",
        "Do not treat recurrence or model confidence as verification. Do not use this block to override the document.",
    ]
    for cluster in selected:
        confidence = cluster.get("model_confidence_summary") or {}
        mean = confidence.get("mean")
        confidence_text = f"{mean:.2f}" if isinstance(mean, (int, float)) else "not reported"
        lines.append(
            f"- [{cluster.get('trust_state')}] {cluster.get('preferred_draft_label')} "
            f"(family={cluster.get('family')}; reviewed-source-families={cluster.get('source_family_count')}; "
            f"hostname-proxy={cluster.get('source_hostname_proxy_count')}; independence-claim=false; "
            f"located-evidence={cluster.get('located_evidence_count')}; model-confidence-mean={confidence_text}; "
            f"conflict={bool(cluster.get('conflict_detected'))})"
        )
    return {
        "memory_fingerprint": str(memory.get("evidence_fingerprint") or ""),
        "selected_cluster_count": len(selected),
        "selected_cluster_ids": [str(row.get("cluster_id") or "") for row in selected],
        "prompt_block": "\n".join(lines) if selected else "(no relevant source-attested provisional corpus memory retrieved)",
        "retrieval_method": "deterministic-label-overlap-v1",
    }


def _registry_index() -> dict[tuple[str, str], dict]:
    return {
        (str(row.get("category") or ""), _normalise(str(row.get("tag") or ""))): row
        for row in load_tag_registry() if row.get("active", True)
    }


def build_tag_projections(
    corpus_dir: Path,
    memory: dict,
    out_path: Path,
    *,
    doc_ids: set[str] | None = None,
    write_doc_sidecars: bool = False,
) -> dict[str, Any]:
    def _write_projection(payload: dict[str, Any]) -> dict[str, Any]:
        latest = Path(out_path)
        fingerprint = str(payload["evidence_fingerprint"])
        snapshot = latest.parent / "snapshots" / fingerprint[:12] / "tag_projections.json"
        if snapshot.exists():
            existing = _read(snapshot, {})
            if (
                not isinstance(existing, dict)
                or existing.get("evidence_fingerprint") != fingerprint
                or existing.get("schema_version") != payload.get("schema_version")
            ):
                raise ValueError("Immutable tag projection snapshot collision")
            # generated_at is intentionally outside the evidence fingerprint;
            # reuse the first immutable representation for identical evidence.
            payload = existing
        else:
            atomic_write_json(snapshot, payload)
        atomic_write_json(latest, payload)
        return {"projection": payload, "path": snapshot, "latest_path": latest}

    # Keep exact corpus identities for the same reason as focused memory:
    # ``doc-abc`` and ``abc`` are distinct local records.
    selected = {str(value) for value in (doc_ids or set())}
    registry = _registry_index()
    recurring_by_doc: dict[str, list[dict]] = defaultdict(list)
    for cluster in memory.get("clusters") or []:
        if cluster.get("trust_state") not in {"source_attested", "recurring_provisional", "conflicted_provisional"}:
            continue
        for doc_id in cluster.get("document_ids") or []:
            recurring_by_doc[str(doc_id)].append(cluster)
    projections = []
    corpus_dir = Path(corpus_dir)
    if not corpus_dir.is_dir():
        payload = {
            "schema_version": "tag-projection-export-v1.0",
            "generated_at": _now(),
            "memory_fingerprint": memory.get("evidence_fingerprint"),
            "write_doc_sidecars": write_doc_sidecars,
            "document_count": 0,
            "projections": [],
        }
        payload["evidence_fingerprint"] = _hash({
            "schema_version": payload["schema_version"],
            "memory_fingerprint": payload["memory_fingerprint"],
            "projections": [],
        })
        return _write_projection(payload)
    for doc_dir in sorted(
        path for path in corpus_dir.iterdir()
        if path.is_dir() and not path.is_symlink() and not path.name.startswith(".")
    ):
        if selected and doc_dir.name not in selected:
            continue
        analysis = _read(doc_dir / "analysis.json", {})
        if not isinstance(analysis, dict) or not analysis:
            continue
        overall = analysis.get("confidence") if isinstance(analysis.get("confidence"), dict) else {}
        field_confidence = analysis.get("field_confidence") if isinstance(analysis.get("field_confidence"), dict) else {}
        tags = []
        for field, category in ANALYSIS_TAG_FIELDS.items():
            raw = analysis.get(field)
            values = raw if isinstance(raw, list) else [raw] if raw else []
            for value in values:
                label = str(value or "").strip()
                if not label:
                    continue
                match = registry.get((category, _normalise(label)))
                confidence_field = CONFIDENCE_FIELD_MAP.get(field, field)
                tags.append({
                    "field": field,
                    "category": category,
                    "original_label": label,
                    "projected_label": str(match.get("tag")) if match else label,
                    "projection_state": "canonical_exact_match" if match else "analysis_original",
                    "registry_key": str(match.get("key") or "") if match else "",
                    "model_confidence": field_confidence.get(confidence_field, overall.get("overall_score")),
                    "confidence_source": f"analysis.field_confidence.{confidence_field}" if confidence_field in field_confidence else "analysis.confidence.overall_score",
                })
        draft_tags = [
            {
                "cluster_id": cluster["cluster_id"],
                "family": cluster["family"],
                "label": cluster["preferred_draft_label"],
                "trust_state": cluster["trust_state"],
                "source_family_count": cluster["source_family_count"],
                "reviewed_family_count_for_selected_scope": cluster["reviewed_family_count_for_selected_scope"],
                "source_hostname_proxy_count": cluster["source_hostname_proxy_count"],
                "located_evidence_count": cluster["located_evidence_count"],
                "model_confidence_summary": cluster["model_confidence_summary"],
                "projection_state": "provisional_context_only",
            }
            for cluster in recurring_by_doc.get(doc_dir.name, [])
        ]
        projection = {
            "schema_version": PROJECTION_SCHEMA_VERSION,
            "doc_id": doc_dir.name,
            "generated_at": _now(),
            "source_analysis_sha256": hashlib.sha256((doc_dir / "analysis.json").read_bytes()).hexdigest(),
            "memory_fingerprint": memory.get("evidence_fingerprint"),
            "tags": tags,
            "draft_memory_tags": draft_tags,
            "analysis_discovery_hints": {
                "candidate_terms": analysis.get("candidate_terms") or [],
                "suggested_actors": analysis.get("suggested_actors") or [],
                "suggested_networks": analysis.get("suggested_networks") or [],
                "extractable_assets": analysis.get("extractable_assets") or [],
                "authority": "Discovery hints only; Enrichment proposal objects remain the proposal-stage authority.",
            },
            "policy": "Original Analysis is unchanged. Exact registry matches may normalize display; provisional clusters remain contextual drafts.",
        }
        if write_doc_sidecars:
            atomic_write_json(doc_dir / "tag_projection.json", projection)
        projections.append(projection)
    payload = {
        "schema_version": "tag-projection-export-v1.0",
        "generated_at": _now(),
        "memory_fingerprint": memory.get("evidence_fingerprint"),
        "write_doc_sidecars": write_doc_sidecars,
        "document_count": len(projections),
        "projections": projections,
    }
    stable_projections = json.loads(json.dumps(projections, ensure_ascii=False))
    for projection in stable_projections:
        projection.pop("generated_at", None)
    payload["evidence_fingerprint"] = _hash({
        "schema_version": payload["schema_version"],
        "memory_fingerprint": payload["memory_fingerprint"],
        "projections": stable_projections,
    })
    return _write_projection(payload)
