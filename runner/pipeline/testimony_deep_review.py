"""Model-assisted testimony segment review.

This pass sits after ``testimony_candidates.json``. Candidate generation is a
local, conservative lead finder; this module asks a model to decide whether a
candidate is actual testimony, mediated testimony, a clinical case story, or
only contextual material about testimony. It writes derived sidecars only and
never mutates analysis, enrichment, Sanity, or Supabase state.
"""
from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any

from ..config import Config
from .archive_summary import read_json_safe
from .audit import current_git_commit
from .citation_units import locate_quote, quote_hash
from .research_annotate import (
    AnnotationModelResponse,
    _call_annotation_model,
    _model_name_for_llm,
    _parse_json_response,
    _provider_for_llm,
)
from .testimony_candidates import (
    TESTIMONY_CANDIDATES_FILENAME,
    build_testimony_candidates,
)


SCHEMA_VERSION = "testimony-deep-review-v0.1"
ANALYSES_FILENAME = "testimony_segment_analyses.jsonl"
SEGMENTS_FILENAME = "testimony_segments.json"

ModelCall = Callable[[str, str, str, str | None, Config], dict[str, Any] | str | AnnotationModelResponse]

TESTIMONY_SEGMENT_TYPES = (
    "direct_survivor_testimony",
    "mediated_survivor_testimony",
    "ex_gay_promotional_testimony",
    "clinical_case_story",
    "parent_or_family_testimony",
    "institutional_witness",
    "founder_or_perpetrator_memory",
    "about_testimony_not_testimony",
    "not_testimony",
    "unclear",
)

MEDIATION_TYPES = (
    "direct_quote",
    "first_person_narrative",
    "reported_speech",
    "editorial_summary",
    "clinical_case_composite",
    "interview_excerpt",
    "institutional_summary",
    "not_applicable",
    "unclear",
)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_text(text: str) -> str:
    return hashlib.sha256(str(text or "").encode("utf-8")).hexdigest()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
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


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


def load_or_build_candidates(doc_dir: Path) -> dict[str, Any]:
    path = Path(doc_dir) / TESTIMONY_CANDIDATES_FILENAME
    payload = read_json_safe(path, {})
    if isinstance(payload, dict) and isinstance(payload.get("candidates"), list):
        return payload
    return build_testimony_candidates(Path(doc_dir))


def default_model_call(
    system_prompt: str,
    user_message: str,
    llm: str,
    model: str | None,
    config: Config,
) -> AnnotationModelResponse:
    return _call_annotation_model(
        llm=llm,
        system_prompt=system_prompt,
        user_message=user_message,
        config=config,
        model=model,
    )


def coerce_model_result(value: dict[str, Any] | str | AnnotationModelResponse) -> tuple[dict[str, Any], str, str, str]:
    requested = ""
    resolved = ""
    if isinstance(value, AnnotationModelResponse):
        requested = value.requested_model
        resolved = value.resolved_model
        return _parse_json_response(value.content), value.content, requested, resolved
    if isinstance(value, str):
        return _parse_json_response(value), value, requested, resolved
    return value, json.dumps(value, ensure_ascii=False), requested, resolved


def run_testimony_deep_review(
    doc_dir: Path,
    *,
    config: Config,
    candidate_id: str | None = None,
    llm: str = "litelm-heavy",
    model: str | None = None,
    limit: int = 0,
    overwrite: bool = False,
    dry_run: bool = False,
    model_call: ModelCall | None = None,
) -> dict[str, Any]:
    """Run testimony deep review for one document.

    ``overwrite=False`` resumes safely by skipping already-succeeded candidate
    rows. Failed rows can be retried by using ``overwrite=True`` for a specific
    candidate or by deleting the failed row.
    """
    doc_dir = Path(doc_dir)
    candidates_payload = load_or_build_candidates(doc_dir)
    candidates = [
        candidate
        for candidate in candidates_payload.get("candidates") or []
        if isinstance(candidate, dict)
    ]
    if candidate_id:
        candidates = [
            candidate for candidate in candidates
            if str(candidate.get("candidate_id") or "") == candidate_id
        ]
    if limit and limit > 0:
        candidates = candidates[:limit]

    analyses_path = doc_dir / ANALYSES_FILENAME
    segments_path = doc_dir / SEGMENTS_FILENAME
    existing_rows = read_jsonl(analyses_path)
    existing_success = {
        str(row.get("candidate_id") or "")
        for row in existing_rows
        if row.get("status") == "succeeded"
    }
    selected = [
        candidate for candidate in candidates
        if overwrite or str(candidate.get("candidate_id") or "") not in existing_success
    ]
    if dry_run:
        return {
            "doc_id": doc_dir.name,
            "dry_run": True,
            "candidate_count": len(candidates),
            "selected_count": len(selected),
            "paths": {"analyses": str(analyses_path), "segments": str(segments_path)},
        }

    # Resolve every selected lead against canonical extracted text before any
    # overwrite or file creation. An evidence hold must never erase a previous
    # successful analysis or cause a model call.
    text = _read_text(doc_dir)
    preflight_contexts: dict[str, dict[str, Any]] = {}
    evidence_holds: list[dict[str, str]] = []
    runnable: list[dict[str, Any]] = []
    for candidate in selected:
        cid = str(candidate.get("candidate_id") or "")
        try:
            preflight_contexts[cid] = context_for_candidate(doc_dir, candidate, text)
        except TestimonyEvidenceNotLocatedError as exc:
            evidence_holds.append({"candidate_id": cid, "reason": str(exc)})
        else:
            runnable.append(candidate)
    selected = runnable

    runnable_ids = {
        str(candidate.get("candidate_id") or "") for candidate in selected
        if str(candidate.get("candidate_id") or "")
    }
    if overwrite and runnable_ids:
        existing_rows = [
            row for row in existing_rows
            if str(row.get("candidate_id") or "") not in runnable_ids
        ]
        write_jsonl(analyses_path, existing_rows)
    call = model_call or default_model_call
    provider = _provider_for_llm(llm)
    requested_model = _model_name_for_llm(llm, config, model)
    citation_units = read_json_safe(doc_dir / "citation_units.json", {})
    rows = list(existing_rows)
    failures = 0
    for candidate in selected:
        cid = str(candidate.get("candidate_id") or "")
        context = preflight_contexts[cid]
        row: dict[str, Any] = {
            "schema_version": SCHEMA_VERSION,
            "doc_id": doc_dir.name,
            "candidate_id": cid,
            "generated_at": utcnow_iso(),
            "generator_git_commit": current_git_commit(),
            "model_provider": provider,
            "model_name": requested_model,
            "status": "succeeded",
            "candidate_source": {
                "source_artifact": candidate.get("source_artifact") or "",
                "source_kind": candidate.get("source_kind") or "",
                "source_index": candidate.get("source_index"),
                "testimony_type": candidate.get("testimony_type") or "",
            },
            "context": {
                "source": context.get("source") or "",
                "char_start": context.get("char_start"),
                "char_end": context.get("char_end"),
                "quote_hash": context.get("quote_hash") or "",
            },
            "analysis": {},
        }
        try:
            system, user = testimony_prompt(doc_dir.name, candidate, context)
            parsed, raw, req, resolved = coerce_model_result(call(system, user, llm, model, config))
            parsed = normalize_deep_review(parsed, candidate, citation_units)
            row["analysis"] = parsed
            if req:
                row["model_name"] = req
            if resolved:
                row["resolved_model_name"] = resolved
            row["raw_response_hash"] = sha256_text(raw)
        except Exception as exc:
            row["status"] = "failed"
            row["error"] = str(exc)
            failures += 1
        rows.append(row)
        with analyses_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    consolidated = build_segments_sidecar(doc_dir.name, rows, candidates_payload)
    if rows or segments_path.exists():
        write_json(segments_path, consolidated)
    return {
        "doc_id": doc_dir.name,
        "candidate_count": len(candidates),
        "selected_count": len(selected),
        "analyses_count": len([row for row in rows if row.get("status") == "succeeded"]),
        "failed_count": failures,
        "evidence_hold_count": len(evidence_holds),
        "evidence_holds": evidence_holds,
        "segment_count": consolidated.get("segment_count", 0),
        "paths": {"analyses": str(analyses_path), "segments": str(segments_path)},
    }


def deep_review_status(doc_dir: Path) -> dict[str, Any]:
    """Return resumable deep-review status for one document.

    This is intentionally side-effect-light: it reads existing candidates,
    analyses, and consolidated segments, then reports how much of the document's
    candidate set has already been reviewed. If a document has no candidates
    sidecar yet, ``load_or_build_candidates`` derives the candidate payload in
    memory without writing files.
    """
    doc_dir = Path(doc_dir)
    candidates_payload = load_or_build_candidates(doc_dir)
    candidates = [
        candidate
        for candidate in candidates_payload.get("candidates") or []
        if isinstance(candidate, dict)
    ]
    candidate_ids = {
        str(candidate.get("candidate_id") or "")
        for candidate in candidates
        if str(candidate.get("candidate_id") or "")
    }
    rows = read_jsonl(doc_dir / ANALYSES_FILENAME)
    succeeded = {
        str(row.get("candidate_id") or "")
        for row in rows
        if row.get("status") == "succeeded" and str(row.get("candidate_id") or "") in candidate_ids
    }
    failed = {
        str(row.get("candidate_id") or "")
        for row in rows
        if row.get("status") == "failed" and str(row.get("candidate_id") or "") in candidate_ids
    }
    segments_payload = read_json_safe(doc_dir / SEGMENTS_FILENAME, {})
    segments = segments_payload.get("segments") if isinstance(segments_payload, dict) else []
    segment_count = len(segments) if isinstance(segments, list) else 0
    return {
        "doc_id": doc_dir.name,
        "candidate_count": len(candidate_ids),
        "reviewed_count": len(succeeded),
        "failed_count": len(failed),
        "pending_count": max(0, len(candidate_ids - succeeded)),
        "segment_count": segment_count,
        "candidate_ids": sorted(candidate_ids),
        "reviewed_candidate_ids": sorted(succeeded),
        "failed_candidate_ids": sorted(failed),
        "pending_candidate_ids": sorted(candidate_ids - succeeded),
        "paths": {
            "candidates": str(doc_dir / TESTIMONY_CANDIDATES_FILENAME),
            "analyses": str(doc_dir / ANALYSES_FILENAME),
            "segments": str(doc_dir / SEGMENTS_FILENAME),
        },
    }


def testimony_prompt(doc_id: str, candidate: dict[str, Any], context: dict[str, Any]) -> tuple[str, str]:
    system = """You are a senior testimony and archival ethics analyst for the SurvivingSOGICE project.

Return valid JSON only. Decide whether the supplied candidate contains actual
testimony, mediated testimony, clinical case-story material, perpetrator/movement
memory, or only contextual material about testimony. Do not invent testimony.
Preserve uncertainty. Keep survivor-sensitive material private by default."""
    user = f"""DOCUMENT ID: {doc_id}
CANDIDATE ID: {candidate.get('candidate_id')}
CANDIDATE TYPE: {candidate.get('testimony_type')}
SOURCE: {candidate.get('source_artifact')} / {candidate.get('source_kind')}
MODEL-SUGGESTED SUMMARY:
{candidate.get('summary') or ''}

MODEL-SUGGESTED EXTRACTED TEXT:
{candidate.get('extracted_text') or candidate.get('evidence_quote') or ''}

SURROUNDING SOURCE CONTEXT:
{context.get('text') or ''}

Return this JSON shape:
{{
  "candidate_assessment": {{
    "is_testimony": true,
    "assessment": "actual_testimony|mediated_testimony|case_story|about_testimony_not_testimony|not_testimony|unclear",
    "recommended_review_state": "approved|rejected|research_only|needs_more_context",
    "reason": "short explanation"
  }},
  "segments": [
    {{
      "segment_type": "direct_survivor_testimony|mediated_survivor_testimony|ex_gay_promotional_testimony|clinical_case_story|parent_or_family_testimony|institutional_witness|founder_or_perpetrator_memory|about_testimony_not_testimony|not_testimony|unclear",
      "speaker_label": "name, pseudonym, role, or unknown",
      "speaker_position": "survivor|ex_gay_or_changed_person|therapist_or_clinician|minister_or_pastor|parent_or_family|organization_representative|journalist_mediated|anonymous_or_pseudonymized|unknown",
      "testimony_text": "actual testimony segment if present; otherwise empty",
      "summary": "what this segment says or how it functions",
      "mediation": "direct_quote|first_person_narrative|reported_speech|editorial_summary|clinical_case_composite|interview_excerpt|institutional_summary|not_applicable|unclear",
      "narrative_function": "harm_account|change_or_redemption_narrative|testimony_as_proof|clinical_legitimation|movement_memory|contextual_witness|none",
      "practice_descriptions": [{{"practice": "...", "description": "...", "evidence": "...", "confidence": 0.0}}],
      "lexicon_terms": [{{"term": "...", "definition_as_used": "...", "evidence": "...", "confidence": 0.0}}],
      "tactics": [{{"name": "...", "description": "...", "evidence": "...", "confidence": 0.0}}],
      "actors": [{{"name": "...", "role": "...", "evidence": "...", "confidence": 0.0}}],
      "evidence_quote": "best short quote grounding this segment",
      "confidence": 0.0,
      "public_recommendation": {{
        "public_display": false,
        "public_readiness": "private_review_required|research_only|public_excerpt_candidate|public_display_candidate",
        "consent_status": "unclear|not_applicable|needs_review",
        "sensitivity": "low|medium|high",
        "reason": "short explanation"
      }}
    }}
  ],
  "limitations": ["..."]
}}
"""
    return system, user


def normalize_deep_review(
    payload: dict[str, Any],
    candidate: dict[str, Any],
    citation_units: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        payload = {}
    assessment = payload.get("candidate_assessment")
    if not isinstance(assessment, dict):
        assessment = {
            "is_testimony": False,
            "assessment": "unclear",
            "recommended_review_state": "needs_more_context",
            "reason": "Model did not return candidate_assessment.",
        }
    segments = payload.get("segments")
    if not isinstance(segments, list):
        segments = []
    normalized_segments: list[dict[str, Any]] = []
    for index, segment in enumerate(segments, start=1):
        if not isinstance(segment, dict):
            continue
        evidence = str(segment.get("evidence_quote") or segment.get("testimony_text") or "").strip()
        locator = locate_quote(citation_units, evidence) if evidence else {}
        public = segment.get("public_recommendation") if isinstance(segment.get("public_recommendation"), dict) else {}
        normalized_segments.append({
            "segment_id": _segment_id(candidate, index, evidence or segment.get("summary", "")),
            "segment_index": index,
            "segment_type": _controlled(
                segment.get("segment_type"),
                TESTIMONY_SEGMENT_TYPES,
                "unclear",
            ),
            "speaker_label": str(segment.get("speaker_label") or "").strip(),
            "speaker_position": str(segment.get("speaker_position") or "unknown").strip() or "unknown",
            "testimony_text": str(segment.get("testimony_text") or "").strip(),
            "summary": str(segment.get("summary") or "").strip(),
            "mediation": _controlled(segment.get("mediation"), MEDIATION_TYPES, "unclear"),
            "narrative_function": str(segment.get("narrative_function") or "").strip(),
            "practice_descriptions": _list_of_dicts(segment.get("practice_descriptions")),
            "lexicon_terms": _list_of_dicts(segment.get("lexicon_terms")),
            "tactics": _list_of_dicts(segment.get("tactics")),
            "actors": _list_of_dicts(segment.get("actors")),
            "evidence_quote": evidence,
            "evidence_quote_hash": quote_hash(evidence) if evidence else "",
            "evidence_locator": locator or {
                "status": "not_found" if evidence else "missing_quote",
                "quote_hash": quote_hash(evidence) if evidence else "",
            },
            "confidence": _float(segment.get("confidence")),
            "public_recommendation": {
                "public_display": bool(public.get("public_display", False)),
                "public_readiness": str(public.get("public_readiness") or "private_review_required"),
                "consent_status": str(public.get("consent_status") or "unclear"),
                "sensitivity": str(public.get("sensitivity") or "high"),
                "reason": str(public.get("reason") or ""),
            },
        })
    return {
        "candidate_assessment": {
            "is_testimony": bool(assessment.get("is_testimony", False)),
            "assessment": str(assessment.get("assessment") or "unclear"),
            "recommended_review_state": str(assessment.get("recommended_review_state") or "needs_more_context"),
            "reason": str(assessment.get("reason") or ""),
        },
        "segments": normalized_segments,
        "limitations": [str(item) for item in payload.get("limitations") or [] if str(item).strip()],
    }


def build_segments_sidecar(
    doc_id: str,
    rows: list[dict[str, Any]],
    candidates_payload: dict[str, Any],
) -> dict[str, Any]:
    segments: list[dict[str, Any]] = []
    assessments: list[dict[str, Any]] = []
    for row in rows:
        if row.get("status") != "succeeded":
            continue
        analysis = row.get("analysis") if isinstance(row.get("analysis"), dict) else {}
        assessment = analysis.get("candidate_assessment") if isinstance(analysis.get("candidate_assessment"), dict) else {}
        assessments.append({
            "candidate_id": row.get("candidate_id"),
            **assessment,
            "model_name": row.get("resolved_model_name") or row.get("model_name"),
        })
        for segment in analysis.get("segments") or []:
            if isinstance(segment, dict):
                segments.append({
                    "doc_id": doc_id,
                    "candidate_id": row.get("candidate_id"),
                    "model_name": row.get("resolved_model_name") or row.get("model_name"),
                    **segment,
                })
    return {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "generated_at": utcnow_iso(),
        "generator_git_commit": current_git_commit(),
        "source_files": {
            "testimony_candidates": TESTIMONY_CANDIDATES_FILENAME if candidates_payload else "",
            "testimony_segment_analyses": ANALYSES_FILENAME,
        },
        "candidate_count": int(candidates_payload.get("candidate_count") or 0) if isinstance(candidates_payload, dict) else 0,
        "analysis_count": len(assessments),
        "segment_count": len(segments),
        "assessments": assessments,
        "segments": segments,
    }


class TestimonyEvidenceNotLocatedError(ValueError):
    """Raised when a model-proposed lead cannot be tied to canonical source text."""


def context_for_candidate(doc_dir: Path, candidate: dict[str, Any], text: str | None = None, *, window: int = 1800) -> dict[str, Any]:
    source_name = "extracted.txt" if (Path(doc_dir) / "extracted.txt").exists() else "extracted.md"
    text = text if text is not None else _read_text(doc_dir)
    locator = candidate.get("evidence_locator") if isinstance(candidate.get("evidence_locator"), dict) else {}
    quote = str(candidate.get("evidence_quote") or candidate.get("extracted_text") or "").strip()
    start = _int_or_none(locator.get("char_start"))
    end = _int_or_none(locator.get("char_end"))
    locator_is_valid = bool(quote) and start is not None and end is not None and start >= 0 and end > start
    if locator_is_valid and quote and text[start:end] != quote:
        locator_is_valid = False
    if not locator_is_valid:
        start = text.find(quote) if quote else -1
        end = start + len(quote) if start >= 0 else -1
    if start is not None and start >= 0 and end is not None and end > start:
        left = max(0, start - window)
        right = min(len(text), end + window)
        return {
            "source": source_name,
            "char_start": left,
            "char_end": right,
            "quote_hash": quote_hash(quote),
            "text": text[left:right],
        }
    raise TestimonyEvidenceNotLocatedError(
        "Deep testimony review was not run because this AI lead could not be located "
        "in extracted.txt/extracted.md. Refresh the candidate or correct its evidence "
        "before sending testimony text to another model."
    )


def _read_text(doc_dir: Path) -> str:
    for name in ("extracted.txt", "extracted.md"):
        path = Path(doc_dir) / name
        if path.exists():
            return path.read_text(encoding="utf-8", errors="replace")
    return ""


def _controlled(value: Any, options: tuple[str, ...], default: str) -> str:
    text = str(value or "").strip()
    return text if text in options else default


def _list_of_dicts(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


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


def _int_or_none(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _segment_id(candidate: dict[str, Any], index: int, text: str) -> str:
    basis = "|".join([
        str(candidate.get("candidate_id") or ""),
        str(index),
        quote_hash(str(text or ""))[:16],
    ])
    return "testimony-segment-" + hashlib.sha256(basis.encode("utf-8")).hexdigest()[:24]
