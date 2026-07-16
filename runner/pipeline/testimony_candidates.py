"""Derived testimony-candidate extraction for archive review.

This module is deliberately local-only and model-free. It consolidates
testimony-like evidence already produced by analysis, enrichment, longform
review, and citation-unit sidecars into a reviewable register. Public-facing
use is prepared by explicit trust/publication fields, but every candidate
defaults to private review until a researcher decides otherwise.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from .audit import current_git_commit
from .atomic_io import atomic_write_json, atomic_write_text
from .archive_summary import read_json_safe
from .citation_units import locate_quote, quote_hash


SCHEMA_VERSION = "testimony-candidates-v0.1"
TESTIMONY_CANDIDATES_FILENAME = "testimony_candidates.json"
TESTIMONY_CANDIDATE_REVIEWS_FILENAME = "testimony_candidate_reviews.json"
TESTIMONY_CANDIDATES_JSONL = "testimony_candidates.jsonl"
TESTIMONY_CANDIDATE_HISTORY_JSONL = "testimony_candidate_history.jsonl"

TESTIMONY_TYPES = (
    "survivor_testimony",
    "ex_gay_promotional_testimony",
    "clinical_case_story",
    "parent_or_family_testimony",
    "institutional_witness",
    "media_interview_excerpt",
    "founder_or_perpetrator_memory",
    "unclear_testimony",
)

SPEAKER_POSITIONS = (
    "survivor",
    "ex_gay_or_changed_person",
    "therapist_or_clinician",
    "minister_or_pastor",
    "parent_or_family",
    "organization_representative",
    "journalist_mediated",
    "anonymous_or_pseudonymized",
    "unknown",
)

PUBLIC_READINESS = (
    "private_review_required",
    "public_excerpt_candidate",
    "public_display_candidate",
    "public_display_approved",
    "research_only",
)

_TESTIMONY_HINT_RE = re.compile(
    r"\b("
    r"testimon(?:y|ies)|case stor(?:y|ies)|case history|client|patient|"
    r"survivor|survived|abuse|coerc(?:ion|ed)|trauma|harm(?:ed)?|"
    r"ex[- ]?gay|changed|change story|healed|freedom from homosexuality|"
    r"father wound|mother wound|same-sex attraction|unwanted homosexuality|"
    r"conversion therap(?:y|ies)|reparative therap(?:y|ies)"
    r")\b",
    flags=re.I,
)
_OBSERVER_CONTEXT_RE = re.compile(
    r"\b("
    r"editor|author|researcher|documentarian|documentar(?:y|ies)|scholar|"
    r"journalist|publisher|compiler|curator"
    r")\b.{0,160}\b("
    r"survivor(?:s)?|testimon(?:y|ies)|stor(?:y|ies)|experiences|harms"
    r")\b",
    flags=re.I | re.S,
)
_DIRECT_TESTIMONY_SIGNAL_RE = re.compile(
    r"\b("
    r"I|me|my|mine|we|our|ours|client|patient|case stor(?:y|ies)|case history|"
    r"interview(?:ed)?|testified|affidavit|said|told|described|recalled|"
    r"survivor (?:said|described|recalled|reported|testified)"
    r")\b",
    flags=re.I,
)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_testimony_candidates(
    doc_dir: Path,
    *,
    generated_at: str | None = None,
    generator_git_commit: str | None = None,
) -> dict[str, Any]:
    """Build a testimony-candidate sidecar for one corpus document.

    The output is derived and overwrite-safe. It does not mutate analysis,
    enrichment, longform review, or upload state.
    """
    doc_dir = Path(doc_dir)
    doc_id = doc_dir.name
    citation_sidecar = read_json_safe(doc_dir / "citation_units.json", {})
    analysis = read_json_safe(doc_dir / "analysis.json", {})
    analysis_audit = read_json_safe(doc_dir / "analysis_audit.json", {})
    enrichment = read_json_safe(doc_dir / "enrichment.json", {})
    enrichment_audit = read_json_safe(doc_dir / "enrichment_audit.json", {})
    section_rows = _read_jsonl(doc_dir / "longform_section_analyses.jsonl")
    synthesis = read_json_safe(doc_dir / "longform_synthesis.json", {})

    candidates: list[dict[str, Any]] = []
    candidates.extend(_from_analysis_assets(doc_id, analysis, analysis_audit, citation_sidecar))
    candidates.extend(_from_longform_sections(doc_id, section_rows))
    candidates.extend(_from_longform_synthesis(doc_id, synthesis))
    candidates.extend(_from_enrichment(doc_id, enrichment, enrichment_audit, citation_sidecar))

    merged = _merge_candidates(candidates)
    counts = Counter(str(item.get("testimony_type") or "unclear_testimony") for item in merged)
    speaker_counts = Counter(str(item.get("speaker_position") or "unknown") for item in merged)
    payload = {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "generated_at": generated_at or utcnow_iso(),
        "generator_git_commit": (
            current_git_commit() if generator_git_commit is None else generator_git_commit
        ),
        "source_files": {
            "analysis": "analysis.json" if analysis else "",
            "analysis_audit": "analysis_audit.json" if analysis_audit else "",
            "enrichment": "enrichment.json" if enrichment else "",
            "enrichment_audit": "enrichment_audit.json" if enrichment_audit else "",
            "citation_units": "citation_units.json" if citation_sidecar else "",
            "longform_section_analyses": "longform_section_analyses.jsonl" if section_rows else "",
            "longform_synthesis": "longform_synthesis.json" if synthesis else "",
        },
        "public_policy": {
            "default_public_display": False,
            "default_public_readiness": "private_review_required",
            "requires_researcher_review": True,
            "note": (
                "Candidates are evidence leads. Public display requires a researcher "
                "decision in testimony_candidate_reviews.json or a later Sanity review."
            ),
        },
        "candidate_count": len(merged),
        "counts_by_type": dict(sorted(counts.items())),
        "counts_by_speaker_position": dict(sorted(speaker_counts.items())),
        "candidates": merged,
    }
    validate_testimony_candidates_payload(payload, doc_id=doc_id)
    return payload


def validate_testimony_candidates_payload(payload: dict[str, Any], *, doc_id: str) -> None:
    """Validate the deterministic per-document candidate register."""
    if not isinstance(payload, dict) or payload.get("schema_version") != SCHEMA_VERSION:
        raise ValueError("Unsupported testimony candidate register schema")
    if payload.get("doc_id") != doc_id or not doc_id:
        raise ValueError("Testimony candidate register document identity is invalid")
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not all(isinstance(value, dict) for value in candidates):
        raise ValueError("Testimony candidate register must contain a candidate list")
    candidate_ids = [str(value.get("candidate_id") or "") for value in candidates]
    if candidates and (not all(candidate_ids) or len(set(candidate_ids)) != len(candidate_ids)):
        raise ValueError("Testimony candidate IDs must be non-empty and unique")
    for candidate in candidates:
        public = candidate.get("public")
        if candidate.get("doc_id") != doc_id or candidate.get("review_state") != "model_proposed":
            raise ValueError("Testimony candidate identity or review state is invalid")
        if (
            not isinstance(public, dict)
            or public.get("public_display") is not False
            or public.get("public_readiness") != "private_review_required"
            or public.get("requires_researcher_review") is not True
        ):
            raise ValueError("Every testimony candidate must remain private pending researcher review")
    if type(payload.get("candidate_count")) is not int or payload["candidate_count"] != len(candidates):
        raise ValueError("Testimony candidate count does not match its records")
    source_files = payload.get("source_files")
    if not isinstance(source_files, dict) or not all(
        type(key) is str and type(value) is str for key, value in source_files.items()
    ):
        raise ValueError("Testimony candidate source-file evidence is malformed")
    policy = payload.get("public_policy")
    if (
        not isinstance(policy, dict)
        or policy.get("default_public_display") is not False
        or policy.get("requires_researcher_review") is not True
        or policy.get("default_public_readiness") != "private_review_required"
    ):
        raise ValueError("Testimony candidates must remain private and researcher-reviewed by default")
    for field in ("generated_at", "generator_git_commit"):
        if type(payload.get(field)) is not str:
            raise ValueError(f"Testimony candidate {field} must be text")


def write_testimony_candidates(doc_dir: Path) -> Path:
    out = Path(doc_dir) / TESTIMONY_CANDIDATES_FILENAME
    payload = build_testimony_candidates(Path(doc_dir))
    validate_testimony_candidates_payload(payload, doc_id=Path(doc_dir).name)
    atomic_write_json(out, payload)
    return out


def preview_testimony_candidate_refresh(doc_dir: Path) -> dict[str, Any]:
    """Compare a saved candidate sidecar with today's deterministic builder.

    The preview is read-only. Reviews remain in their separate ledger, so a
    researcher can inspect decisions attached to leads that a later builder
    removes instead of having them silently disappear.
    """
    doc_dir = Path(doc_dir)
    saved = read_json_safe(doc_dir / TESTIMONY_CANDIDATES_FILENAME, {})
    current = build_testimony_candidates(doc_dir)
    saved_rows = saved.get("candidates") if isinstance(saved, dict) else []
    current_rows = current.get("candidates") if isinstance(current, dict) else []
    saved_by_id = {
        str(row.get("candidate_id") or ""): row
        for row in saved_rows or [] if isinstance(row, dict) and row.get("candidate_id")
    }
    current_by_id = {
        str(row.get("candidate_id") or ""): row
        for row in current_rows or [] if isinstance(row, dict) and row.get("candidate_id")
    }
    saved_ids, current_ids = set(saved_by_id), set(current_by_id)
    changed = sorted(
        cid for cid in saved_ids & current_ids
        if _candidate_refresh_signature(saved_by_id[cid]) != _candidate_refresh_signature(current_by_id[cid])
    )
    return {
        "doc_id": doc_dir.name,
        "saved_count": len(saved_ids),
        "current_count": len(current_ids),
        "added_ids": sorted(current_ids - saved_ids),
        "removed_ids": sorted(saved_ids - current_ids),
        "changed_ids": changed,
        "is_stale": bool((saved_ids ^ current_ids) or changed) or not bool(saved),
        "source_fingerprint": testimony_candidate_source_fingerprint(doc_dir),
        "current_payload": current,
    }


def _candidate_refresh_signature(row: dict[str, Any]) -> str:
    fields = {
        key: row.get(key)
        for key in (
            "source_artifact", "source_kind", "source_index", "testimony_type",
            "summary", "extracted_text", "evidence_quote", "evidence_locator",
            "linked_terms", "linked_tactics", "linked_practices", "linked_actors",
        )
    }
    return quote_hash(json.dumps(fields, sort_keys=True, ensure_ascii=False))


def testimony_candidate_source_fingerprint(doc_dir: Path) -> str:
    """Fingerprint only the inputs used by ``build_testimony_candidates``."""
    digest = hashlib.sha256()
    for name in (
        "analysis.json", "analysis_audit.json", "enrichment.json", "enrichment_audit.json",
        "citation_units.json", "longform_section_analyses.jsonl", "longform_synthesis.json",
    ):
        path = Path(doc_dir) / name
        digest.update(name.encode("utf-8"))
        digest.update(b"\0")
        if path.is_file():
            digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def apply_testimony_candidate_refresh(doc_dir: Path, preview: dict[str, Any]) -> Path:
    """Archive the prior derived register, then atomically apply one preview."""
    doc_dir = Path(doc_dir)
    if str(preview.get("doc_id") or "") != doc_dir.name:
        raise ValueError("Candidate refresh preview belongs to a different document.")
    if preview.get("source_fingerprint") != testimony_candidate_source_fingerprint(doc_dir):
        raise ValueError("Candidate inputs changed after preview; preview again before applying.")
    current_payload = preview.get("current_payload")
    validate_testimony_candidates_payload(current_payload, doc_id=doc_dir.name)
    existing_path = doc_dir / TESTIMONY_CANDIDATES_FILENAME
    if existing_path.is_file():
        history_path = doc_dir / TESTIMONY_CANDIDATE_HISTORY_JSONL
        history = history_path.read_text(encoding="utf-8") if history_path.exists() else ""
        history_row = {
            "schema_version": "testimony-candidate-history-v0.1",
            "doc_id": doc_dir.name,
            "archived_at": utcnow_iso(),
            "reason": "scoped_researcher_applied_refresh",
            "removed_ids": preview.get("removed_ids") or [],
            "changed_ids": preview.get("changed_ids") or [],
            "source_fingerprint": preview.get("source_fingerprint") or "",
            "prior_payload": read_json_safe(existing_path, {}),
        }
        atomic_write_text(history_path, history + json.dumps(history_row, ensure_ascii=False) + "\n")
    atomic_write_json(existing_path, current_payload)
    return existing_path


def build_corpus_testimony_candidates(corpus_dir: Path, *, write: bool = True) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []
    for doc_dir in iter_doc_dirs(corpus_dir):
        payload = build_testimony_candidates(doc_dir)
        if write:
            (doc_dir / TESTIMONY_CANDIDATES_FILENAME).write_text(
                json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
        payloads.append(payload)
    return payloads


def export_testimony_candidates(
    corpus_dir: Path,
    exports_dir: Path,
    *,
    refresh_sidecars: bool = False,
    out_path: Path | None = None,
) -> dict[str, Any]:
    """Write central testimony_candidates.jsonl for review/public-export tooling."""
    records = build_corpus_testimony_candidates(corpus_dir, write=refresh_sidecars)
    if not refresh_sidecars:
        records = []
        for doc_dir in iter_doc_dirs(corpus_dir):
            existing = read_json_safe(doc_dir / TESTIMONY_CANDIDATES_FILENAME, {})
            records.append(existing if existing else build_testimony_candidates(doc_dir))
    out = out_path or Path(exports_dir) / "review" / TESTIMONY_CANDIDATES_JSONL
    out.parent.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    for payload in records:
        for candidate in payload.get("candidates") or []:
            if isinstance(candidate, dict):
                rows.append({"doc_id": payload.get("doc_id"), **candidate})
    out.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    return {
        "ok": True,
        "path": str(out),
        "doc_count": len(records),
        "candidate_count": len(rows),
    }


def iter_doc_dirs(corpus_dir: Path):
    corpus_dir = Path(corpus_dir)
    if not corpus_dir.exists():
        return
    for path in sorted(corpus_dir.iterdir()):
        if (
            path.is_dir()
            and not path.name.startswith(".")
            and any((path / filename).exists() for filename in (
                "intake.json",
                "analysis.json",
                "extracted.txt",
                "source_item.json",
            ))
        ):
            yield path


def _from_analysis_assets(
    doc_id: str,
    analysis: dict[str, Any],
    analysis_audit: dict[str, Any],
    citation_sidecar: dict[str, Any],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    assets = analysis.get("extractable_assets") if isinstance(analysis, dict) else []
    if not isinstance(assets, list):
        assets = []
    for index, asset in enumerate(assets, start=1):
        if not isinstance(asset, dict) or asset.get("asset_type") != "testimony_excerpt":
            continue
        text = _first_text(asset, ("text", "excerpt", "quote", "description", "summary"))
        if not text:
            continue
        rows.append(_candidate(
            doc_id=doc_id,
            source_artifact="analysis.json",
            source_kind="analysis_extractable_asset",
            source_index=index,
            extracted_text=text,
            summary=str(asset.get("description") or asset.get("summary") or ""),
            evidence_quote=text,
            locator=locate_quote(citation_sidecar, text),
            model_provider=str(analysis_audit.get("provider") or analysis_audit.get("llm_flag") or ""),
            model_name=str(analysis_audit.get("model") or ""),
            confidence=_float(asset.get("confidence") or asset.get("model_confidence")),
            tags=_tags_from_analysis(analysis),
        ))
    if analysis.get("testimony_flag") and not rows:
        summary = str(analysis.get("summary") or "")
        if summary:
            rows.append(_candidate(
                doc_id=doc_id,
                source_artifact="analysis.json",
                source_kind="analysis_testimony_flag",
                source_index=1,
                extracted_text="",
                summary=summary,
                evidence_quote="",
                locator={},
                model_provider=str(analysis_audit.get("provider") or analysis_audit.get("llm_flag") or ""),
                model_name=str(analysis_audit.get("model") or ""),
                confidence=_float((analysis.get("confidence") or {}).get("overall_score") if isinstance(analysis.get("confidence"), dict) else None),
                tags=_tags_from_analysis(analysis),
            ))
    return rows


def _from_longform_sections(doc_id: str, section_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in section_rows:
        if not isinstance(row, dict) or row.get("status") != "succeeded":
            continue
        analysis = row.get("analysis") if isinstance(row.get("analysis"), dict) else {}
        section_id = str(row.get("section_id") or "")
        section_ref = {
            "section_id": section_id,
            "section_index": row.get("section_index"),
            "page_start": row.get("page_start"),
            "page_end": row.get("page_end"),
        }
        for index, item in enumerate(analysis.get("evidence_quotes") or [], start=1):
            if not isinstance(item, dict):
                continue
            quote = str(item.get("quote") or "").strip()
            note = str(item.get("note") or "").strip()
            if not _looks_like_testimony(" ".join([quote, note])):
                continue
            locator = item.get("locator") if isinstance(item.get("locator"), dict) else {}
            rows.append(_candidate(
                doc_id=doc_id,
                source_artifact="longform_section_analyses.jsonl",
                source_kind="longform_evidence_quote",
                source_index=index,
                extracted_text=quote,
                summary=note or str(analysis.get("section_summary") or ""),
                evidence_quote=quote,
                locator=locator,
                model_provider=str(row.get("model_provider") or ""),
                model_name=str(row.get("resolved_model_name") or row.get("model_name") or ""),
                confidence=None,
                tags=_tags_from_longform_analysis(analysis),
                section_ref=section_ref,
            ))
        summary_text = " ".join([
            str(analysis.get("section_summary") or ""),
            str(analysis.get("sogice_relevance") or ""),
        ])
        if _looks_like_testimony(summary_text):
            rows.append(_candidate(
                doc_id=doc_id,
                source_artifact="longform_section_analyses.jsonl",
                source_kind="longform_section_summary",
                source_index=0,
                extracted_text="",
                summary=summary_text,
                evidence_quote="",
                locator={},
                model_provider=str(row.get("model_provider") or ""),
                model_name=str(row.get("resolved_model_name") or row.get("model_name") or ""),
                confidence=None,
                tags=_tags_from_longform_analysis(analysis),
                section_ref=section_ref,
            ))
    return rows


def _from_longform_synthesis(doc_id: str, synthesis_payload: dict[str, Any]) -> list[dict[str, Any]]:
    synthesis = synthesis_payload.get("synthesis") if isinstance(synthesis_payload.get("synthesis"), dict) else {}
    rows: list[dict[str, Any]] = []
    for index, item in enumerate(synthesis.get("evidence_highlights") or [], start=1):
        if not isinstance(item, dict):
            continue
        quote = str(item.get("quote") or "").strip()
        why = str(item.get("why_it_matters") or "").strip()
        if not _looks_like_testimony(" ".join([quote, why])):
            continue
        rows.append(_candidate(
            doc_id=doc_id,
            source_artifact="longform_synthesis.json",
            source_kind="longform_synthesis_highlight",
            source_index=index,
            extracted_text=quote,
            summary=why,
            evidence_quote=quote,
            locator={
                "section_id": item.get("section_id") or "",
                "page_label": item.get("page_label") or "",
                "quote_hash": quote_hash(quote) if quote else "",
            },
            model_provider=str(synthesis_payload.get("model_provider") or ""),
            model_name=str(synthesis_payload.get("resolved_model_name") or synthesis_payload.get("model_name") or ""),
            confidence=None,
            tags={
                "terms": [],
                "tactics": [],
                "practices": [],
                "actors": [],
            },
        ))
    return rows


def _from_enrichment(
    doc_id: str,
    enrichment: dict[str, Any],
    enrichment_audit: dict[str, Any],
    citation_sidecar: dict[str, Any],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not isinstance(enrichment, dict):
        return rows
    model_name = str(enrichment.get("enrichment_model") or enrichment_audit.get("enrichment_model") or "")
    for family, quote_field, label_field in (
        ("lexicon_proposals", "exact_quote", "term"),
        ("tactic_proposals", "evidence_quote", "tactic"),
        ("practice_descriptions", "harm_quote", "practice"),
    ):
        items = enrichment.get(family)
        if not isinstance(items, list):
            continue
        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                continue
            quote = str(item.get(quote_field) or "").strip()
            context = " ".join([
                quote,
                str(item.get(label_field) or item.get("name") or item.get("term") or ""),
                str(item.get("definition_as_used") or item.get("description") or item.get("role_in_sogice") or ""),
            ])
            if not _looks_like_testimony(context):
                continue
            rows.append(_candidate(
                doc_id=doc_id,
                source_artifact="enrichment.json",
                source_kind=f"enrichment_{family}",
                source_index=index,
                extracted_text=quote,
                summary=str(item.get("definition_as_used") or item.get("description") or item.get("role_in_sogice") or ""),
                evidence_quote=quote,
                locator=item.get("evidence_locator") if isinstance(item.get("evidence_locator"), dict) else locate_quote(citation_sidecar, quote),
                model_provider="enrichment",
                model_name=model_name,
                confidence=_float(item.get("model_confidence") or item.get("confidence")),
                tags=_tags_from_enrichment_item(family, item),
            ))
    return rows


def _candidate(
    *,
    doc_id: str,
    source_artifact: str,
    source_kind: str,
    source_index: int,
    extracted_text: str,
    summary: str,
    evidence_quote: str,
    locator: dict[str, Any],
    model_provider: str,
    model_name: str,
    confidence: float | None,
    tags: dict[str, list[str]],
    section_ref: dict[str, Any] | None = None,
) -> dict[str, Any]:
    combined = " ".join([extracted_text, summary, evidence_quote])
    testimony_type = classify_testimony_type(combined)
    speaker_position = infer_speaker_position(combined, testimony_type)
    candidate_id = _candidate_id(doc_id, source_artifact, source_kind, source_index, evidence_quote or summary)
    return {
        "candidate_id": candidate_id,
        "doc_id": doc_id,
        "review_state": "model_proposed",
        "testimony_type": testimony_type,
        "speaker_position": speaker_position,
        "narrative_function": infer_narrative_function(combined, testimony_type),
        "source_artifact": source_artifact,
        "source_kind": source_kind,
        "source_index": source_index,
        "section": section_ref or {},
        "extracted_text": extracted_text,
        "summary": summary,
        "evidence_quote": evidence_quote,
        "evidence_quote_hash": quote_hash(evidence_quote) if evidence_quote else "",
        "evidence_locator": locator or {},
        "confidence": confidence,
        "model_attribution": {
            "provider": model_provider,
            "model": model_name,
            "extracted_by": "model_derived_artifact" if model_name else "deterministic_scan",
        },
        "linked_terms": tags.get("terms", []),
        "linked_tactics": tags.get("tactics", []),
        "linked_practices": tags.get("practices", []),
        "linked_actors": tags.get("actors", []),
        "public": {
            "public_display": False,
            "public_readiness": "private_review_required",
            "public_excerpt": "",
            "consent_status": "unclear",
            "sensitivity": infer_sensitivity(testimony_type, combined),
            "requires_researcher_review": True,
        },
    }


def classify_testimony_type(text: str) -> str:
    value = text.lower()
    if any(token in value for token in ("survivor", "survived", "abuse", "coercion", "trauma", "harmed")):
        return "survivor_testimony"
    if any(token in value for token in ("case story", "case history", "client", "patient", "clinical", "therapist")):
        return "clinical_case_story"
    if any(token in value for token in ("ex-gay", "ex gay", "changed", "healed", "freedom from homosexuality")):
        return "ex_gay_promotional_testimony"
    if any(token in value for token in ("father", "mother", "parent", "family")):
        return "parent_or_family_testimony"
    if any(token in value for token in ("court", "parliament", "hearing", "testified", "affidavit")):
        return "institutional_witness"
    if any(token in value for token in ("interview", "journalist", "reported", "media")):
        return "media_interview_excerpt"
    if any(token in value for token in ("founder", "founded", "narther", "narth", "nicolosi", "socarides")):
        return "founder_or_perpetrator_memory"
    return "unclear_testimony"


def infer_speaker_position(text: str, testimony_type: str) -> str:
    value = text.lower()
    if testimony_type == "survivor_testimony":
        return "survivor"
    if testimony_type == "ex_gay_promotional_testimony":
        return "ex_gay_or_changed_person"
    if testimony_type == "clinical_case_story":
        return "anonymous_or_pseudonymized" if any(t in value for t in ("pseudonym", "composite", "client", "patient")) else "therapist_or_clinician"
    if testimony_type == "parent_or_family_testimony":
        return "parent_or_family"
    if testimony_type == "institutional_witness":
        return "organization_representative"
    if testimony_type == "media_interview_excerpt":
        return "journalist_mediated"
    if testimony_type == "founder_or_perpetrator_memory":
        return "organization_representative"
    return "unknown"


def infer_narrative_function(text: str, testimony_type: str) -> str:
    value = text.lower()
    if any(token in value for token in ("proof", "evidence", "shows", "demonstrates", "success")):
        return "testimony_as_proof"
    if any(token in value for token in ("healed", "changed", "freedom", "redemption", "repent")):
        return "change_or_redemption_narrative"
    if any(token in value for token in ("harm", "abuse", "trauma", "coercion", "surviv")):
        return "harm_account"
    if testimony_type == "clinical_case_story":
        return "clinical_legitimation"
    if testimony_type == "founder_or_perpetrator_memory":
        return "movement_memory"
    return "contextual_witness"


def infer_sensitivity(testimony_type: str, text: str) -> str:
    value = text.lower()
    if testimony_type == "survivor_testimony":
        return "high"
    if any(token in value for token in ("minor", "child", "abuse", "trauma", "suicide", "self-harm")):
        return "high"
    if testimony_type in {"clinical_case_story", "ex_gay_promotional_testimony"}:
        return "medium"
    return "medium"


def _merge_candidates(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: dict[tuple[str, str, str], dict[str, Any]] = {}
    for item in candidates:
        quote = str(item.get("evidence_quote") or item.get("summary") or "")
        key = (
            str(item.get("testimony_type") or ""),
            str(item.get("source_artifact") or ""),
            quote_hash(quote) if quote else str(item.get("candidate_id") or ""),
        )
        if key not in seen:
            seen[key] = item
            continue
        existing = seen[key]
        existing.setdefault("also_seen_in", []).append({
            "candidate_id": item.get("candidate_id"),
            "source_artifact": item.get("source_artifact"),
            "source_kind": item.get("source_kind"),
            "section": item.get("section") or {},
        })
        for field in ("linked_terms", "linked_tactics", "linked_practices", "linked_actors"):
            merged = list(dict.fromkeys([*existing.get(field, []), *item.get(field, [])]))
            existing[field] = merged
    rows = list(seen.values())
    rows.sort(key=lambda item: (
        str(item.get("testimony_type") or ""),
        str((item.get("section") or {}).get("section_id") or ""),
        str(item.get("candidate_id") or ""),
    ))
    return rows


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except Exception:
            continue
        if isinstance(value, dict):
            rows.append(value)
    return rows


def _looks_like_testimony(text: str) -> bool:
    value = str(text or "")
    if not _TESTIMONY_HINT_RE.search(value):
        return False
    if _OBSERVER_CONTEXT_RE.search(value) and not _DIRECT_TESTIMONY_SIGNAL_RE.search(value):
        return False
    return True


def _candidate_id(doc_id: str, source_artifact: str, source_kind: str, index: int, text: str) -> str:
    basis = "|".join([doc_id, source_artifact, source_kind, str(index), quote_hash(text)[:16]])
    return "testimony-" + re.sub(r"[^a-z0-9]+", "-", basis.lower()).strip("-")[:96]


def _first_text(item: dict[str, Any], fields: tuple[str, ...]) -> str:
    for field in fields:
        value = str(item.get(field) or "").strip()
        if value:
            return value
    return ""


def _float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number < 0:
        return 0.0
    if number > 1:
        return 1.0
    return number


def _tags_from_analysis(analysis: dict[str, Any]) -> dict[str, list[str]]:
    return {
        "terms": _as_strings(analysis.get("term")),
        "tactics": _as_strings(analysis.get("tactic")),
        "practices": _as_strings(analysis.get("practice")),
        "actors": _as_strings(analysis.get("actor") or analysis.get("network")),
    }


def _tags_from_longform_analysis(analysis: dict[str, Any]) -> dict[str, list[str]]:
    return {
        "terms": _labels(analysis.get("terms"), "term"),
        "tactics": _labels(analysis.get("tactics"), "name"),
        "practices": _labels(analysis.get("practices"), "name"),
        "actors": _labels(analysis.get("actors"), "name"),
    }


def _tags_from_enrichment_item(family: str, item: dict[str, Any]) -> dict[str, list[str]]:
    tags = {"terms": [], "tactics": [], "practices": [], "actors": []}
    if family == "lexicon_proposals":
        tags["terms"] = _as_strings(item.get("term"))
    elif family == "entity_proposals":
        tags["actors"] = _as_strings(item.get("name"))
    elif family == "tactic_proposals":
        tags["tactics"] = _as_strings(item.get("tactic") or item.get("name"))
    elif family == "practice_descriptions":
        tags["practices"] = _as_strings(item.get("practice") or item.get("name"))
    return tags


def _labels(value: Any, field: str) -> list[str]:
    if not isinstance(value, list):
        return []
    labels: list[str] = []
    for item in value:
        if isinstance(item, dict):
            label = str(item.get(field) or item.get("name") or item.get("term") or "").strip()
            if label:
                labels.append(label)
    return list(dict.fromkeys(labels))


def _as_strings(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return list(dict.fromkeys(str(item).strip() for item in value if str(item).strip()))
    text = str(value).strip()
    return [text] if text else []
