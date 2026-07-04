"""Deep longform review sidecars.

This module runs a section-by-section model review over longform sidecars
created by :mod:`runner.pipeline.longform`. It intentionally writes separate
derived files and never overwrites ``analysis.json`` or enrichment proposals.
"""
from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any

from ..config import Config
from .audit import current_git_commit
from .archive_summary import read_json_safe
from .longform import (
    BIBLIOGRAPHIC_FILENAME,
    LONGFORM_QUALITY_FILENAME,
    TEXT_BLOCKS_FILENAME,
    build_longform_sidecars,
)
from .research_annotate import (
    AnnotationModelResponse,
    _call_annotation_model,
    _model_name_for_llm,
    _parse_json_response,
    _provider_for_llm,
)


SCHEMA_VERSION = "longform-review-v0.1"
SECTIONS_FILENAME = "longform_sections.json"
SECTION_ANALYSES_FILENAME = "longform_section_analyses.jsonl"
SYNTHESIS_FILENAME = "longform_synthesis.json"
CANDIDATES_FILENAME = "longform_candidates.json"

ModelCall = Callable[[str, str, str, str | None, Config], dict[str, Any] | str | AnnotationModelResponse]


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not path.exists():
        return rows
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
    path.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )


def section_map(sections_payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Return current section definitions keyed by stable section id."""
    sections = sections_payload.get("sections") if isinstance(sections_payload, dict) else []
    if not isinstance(sections, list):
        return {}
    return {
        str(section.get("section_id")): section
        for section in sections
        if isinstance(section, dict) and section.get("section_id")
    }


def row_matches_section(row: dict[str, Any], sections_by_id: dict[str, dict[str, Any]]) -> bool:
    """Whether a saved section-analysis row belongs to the current section plan."""
    section = sections_by_id.get(str(row.get("section_id") or ""))
    if not section:
        return False
    row_hash = str(row.get("text_hash") or "")
    section_hash = str(section.get("text_hash") or "")
    return bool(row_hash and section_hash and row_hash == section_hash)


def filter_rows_for_section_plan(
    rows: list[dict[str, Any]],
    sections_payload: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Split saved rows into reusable and stale rows for a section plan."""
    sections_by_id = section_map(sections_payload)
    usable: list[dict[str, Any]] = []
    stale: list[dict[str, Any]] = []
    for row in rows:
        if row_matches_section(row, sections_by_id):
            usable.append(row)
        else:
            stale.append(row)
    return usable, stale


def build_longform_sections(
    doc_dir: Path,
    *,
    max_section_chars: int = 30000,
) -> dict[str, Any]:
    """Build deterministic review sections from ``text_blocks.jsonl``.

    Sections preserve page ranges, block IDs, character counts, and text hashes
    so later model output can be inspected against stable source spans.
    """
    doc_dir = Path(doc_dir)
    blocks = read_jsonl(doc_dir / TEXT_BLOCKS_FILENAME)
    if not blocks:
        raise FileNotFoundError(
            f"{TEXT_BLOCKS_FILENAME} is missing or empty. Run longform-build first."
        )
    if max_section_chars < 5000:
        raise ValueError("max_section_chars must be at least 5000")

    sections: list[dict[str, Any]] = []
    current: list[dict[str, Any]] = []
    current_chars = 0

    def flush() -> None:
        nonlocal current, current_chars
        if not current:
            return
        section_index = len(sections) + 1
        parts: list[str] = []
        block_spans: list[dict[str, Any]] = []
        cursor = 0
        for block in current:
            block_text = str(block.get("text") or "").strip()
            if not block_text:
                continue
            if parts:
                parts.append("\n\n")
                cursor += 2
            start = cursor
            parts.append(block_text)
            cursor += len(block_text)
            block_spans.append(
                {
                    "block_id": str(block.get("block_id") or ""),
                    "page_label": str(block.get("page_label") or ""),
                    "page_index": block.get("page_index"),
                    "section_char_start": start,
                    "section_char_end": cursor,
                    "text_hash": sha256_text(block_text),
                }
            )
        text = "".join(parts).strip()
        first = current[0]
        last = current[-1]
        start_page = first.get("page_label") or str(int(first.get("page_index") or 0) + 1)
        end_page = last.get("page_label") or str(int(last.get("page_index") or 0) + 1)
        title = infer_section_title(current, section_index, start_page, end_page)
        sections.append(
            {
                "section_id": f"{doc_dir.name}-section-{section_index:03d}",
                "section_index": section_index,
                "title": title,
                "page_start": start_page,
                "page_end": end_page,
                "char_count": len(text),
                "text_hash": sha256_text(text),
                "block_ids": [str(block.get("block_id") or "") for block in current if block.get("block_id")],
                "block_spans": block_spans,
                "start_block_id": str(first.get("block_id") or ""),
                "end_block_id": str(last.get("block_id") or ""),
                "text": text,
            }
        )
        current = []
        current_chars = 0

    for block in blocks:
        text = str(block.get("text") or "").strip()
        if not text:
            continue
        projected = current_chars + len(text) + (2 if current else 0)
        if current and projected > max_section_chars:
            flush()
        current.append(block)
        current_chars += len(text) + (2 if current_chars else 0)
    flush()

    biblio = read_json_safe(doc_dir / BIBLIOGRAPHIC_FILENAME, {})
    quality = read_json_safe(doc_dir / LONGFORM_QUALITY_FILENAME, {})
    payload = {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_dir.name,
        "generated_at": utcnow_iso(),
        "generator_git_commit": current_git_commit(),
        "max_section_chars": max_section_chars,
        "section_count": len(sections),
        "source": {
            "text_blocks": TEXT_BLOCKS_FILENAME,
            "bibliographic": BIBLIOGRAPHIC_FILENAME if biblio else "",
            "longform_quality": LONGFORM_QUALITY_FILENAME if quality else "",
            "longform_char_count": quality.get("char_count", 0) if isinstance(quality, dict) else 0,
        },
        "sections": sections,
    }
    return payload


def infer_section_title(
    blocks: list[dict[str, Any]],
    section_index: int,
    start_page: str,
    end_page: str,
) -> str:
    """Infer a conservative section label from source blocks."""
    for block in blocks[:8]:
        text = " ".join(str(block.get("text") or "").split())
        if 8 <= len(text) <= 120:
            if text.isupper() or text.istitle() or len(text.split()) <= 10:
                return text
    if start_page == end_page:
        return f"Section {section_index} (page {start_page})"
    return f"Section {section_index} (pages {start_page}-{end_page})"


def section_prompt(doc_id: str, biblio: dict[str, Any], section: dict[str, Any]) -> tuple[str, str]:
    system = """You are a senior archive analyst for the SurvivingSOGICE project.

Return valid JSON only. Review only the supplied section, do not claim you read
the whole book. Preserve uncertainty. Every finding should be grounded in the
section text, with page/block references where possible. Distinguish material
that promotes SOGICE from material that documents or criticizes it."""
    title = (
        ((biblio.get("titles") or {}).get("main") or {}).get("value")
        if isinstance(biblio.get("titles"), dict)
        else ""
    )
    user = f"""DOCUMENT ID: {doc_id}
TITLE CANDIDATE: {title or 'unknown'}
SECTION: {section.get('section_id')} — {section.get('title')}
PAGE RANGE: {section.get('page_start')}–{section.get('page_end')}
BLOCK RANGE: {section.get('start_block_id')}–{section.get('end_block_id')}

Return this JSON shape:
{{
  "section_summary": "short paragraph",
  "sogice_relevance": "how this section matters to the archive, or 'none/unclear'",
  "key_arguments": ["..."],
  "actors": [{{"name": "...", "role": "...", "evidence": "quote or paraphrase", "confidence": 0.0}}],
  "terms": [{{"term": "...", "meaning_as_used": "...", "evidence": "quote", "confidence": 0.0, "candidate_action": "lexicon_candidate|context_only"}}],
  "tactics": [{{"name": "...", "evidence": "quote", "confidence": 0.0, "candidate_action": "tag_candidate|context_only"}}],
  "practices": [{{"name": "...", "evidence": "quote", "confidence": 0.0, "candidate_action": "practice_candidate|context_only"}}],
  "evidence_quotes": [
    {{"quote": "...", "page_label": "{section.get('page_start')}", "block_id": "{section.get('start_block_id')}", "note": "..."}}
  ],
  "limitations": ["..."]
}}

SECTION TEXT:
{section.get('text') or ''}
"""
    return system, user


def synthesis_prompt(
    doc_id: str,
    biblio: dict[str, Any],
    section_rows: list[dict[str, Any]],
) -> tuple[str, str]:
    system = """You are a senior archive analyst synthesizing a longform document review.

Return valid JSON only. Base the synthesis only on the section analyses supplied.
Be explicit about coverage, limitations, and uncertainty. Do not invent facts."""
    compact_sections = [
        {
            "section_id": row.get("section_id"),
            "title": row.get("title"),
            "page_start": row.get("page_start"),
            "page_end": row.get("page_end"),
            "analysis": row.get("analysis", {}),
        }
        for row in section_rows
    ]
    title = (
        ((biblio.get("titles") or {}).get("main") or {}).get("value")
        if isinstance(biblio.get("titles"), dict)
        else ""
    )
    user = f"""DOCUMENT ID: {doc_id}
TITLE CANDIDATE: {title or 'unknown'}
SECTION ANALYSES COUNT: {len(compact_sections)}

Return this JSON shape:
{{
  "archive_abstract": "substantial archive-facing abstract",
  "full_document_summary": "longer synthesis of the document as a whole",
  "coverage_statement": "what was and was not covered",
  "section_overview": [{{"section_id": "...", "pages": "...", "summary": "..."}}],
  "bibliographic_needs": ["missing metadata to verify, e.g. ISBN/editor/publisher/edition"],
  "key_arguments": ["..."],
  "sogice_contribution": ["..."],
  "actors_networks": [{{"name": "...", "role": "...", "evidence": "...", "confidence": 0.0}}],
  "lexicon_candidates": [{{"term": "...", "definition_as_used": "...", "evidence": "...", "confidence": 0.0}}],
  "tactics_practices": [{{"name": "...", "kind": "tactic|practice", "evidence": "...", "confidence": 0.0}}],
  "evidence_highlights": [{{"quote": "...", "section_id": "...", "page_label": "...", "why_it_matters": "..."}}],
  "limitations": ["..."]
}}

SECTION ANALYSES JSON:
{json.dumps(compact_sections, ensure_ascii=False)}
"""
    return system, user


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
    """Return parsed JSON, raw content, requested model, resolved model."""
    requested = ""
    resolved = ""
    if isinstance(value, AnnotationModelResponse):
        raw = value.content
        requested = value.requested_model
        resolved = value.resolved_model
        return _parse_json_response(raw), raw, requested, resolved
    if isinstance(value, str):
        return _parse_json_response(value), value, requested, resolved
    return value, json.dumps(value, ensure_ascii=False), requested, resolved


def _find_quote_span(text: str, quote: str) -> tuple[int, int, str]:
    quote = " ".join(str(quote or "").split())
    if not text or not quote:
        return -1, -1, ""
    exact = text.find(quote)
    if exact >= 0:
        return exact, exact + len(quote), "exact"

    # Whitespace-insensitive match while preserving offsets in the original text.
    import re

    pattern = r"\s+".join(re.escape(part) for part in quote.split())
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if match:
        return match.start(), match.end(), "whitespace_insensitive"
    return -1, -1, ""


def _block_for_offset(section: dict[str, Any], offset: int) -> dict[str, Any]:
    for span in section.get("block_spans") or []:
        try:
            start = int(span.get("section_char_start") or 0)
            end = int(span.get("section_char_end") or 0)
        except Exception:
            continue
        if start <= offset < end:
            return span
    return {}


def attach_evidence_locators(analysis: dict[str, Any], section: dict[str, Any]) -> dict[str, Any]:
    """Attach deterministic quote locators to model-supplied evidence quotes."""
    quotes = analysis.get("evidence_quotes")
    if not isinstance(quotes, list):
        return analysis
    text = str(section.get("text") or "")
    resolved: list[dict[str, Any]] = []
    for item in quotes:
        if not isinstance(item, dict):
            resolved.append(item)
            continue
        quote = str(item.get("quote") or "")
        start, end, match_type = _find_quote_span(text, quote)
        new_item = dict(item)
        new_item["quote_hash"] = sha256_text(" ".join(quote.split())) if quote.strip() else ""
        if start >= 0:
            block = _block_for_offset(section, start)
            new_item["locator_status"] = "matched"
            new_item["locator"] = {
                "section_id": section.get("section_id"),
                "section_char_start": start,
                "section_char_end": end,
                "match_type": match_type,
                "block_id": block.get("block_id") or "",
                "page_label": block.get("page_label") or item.get("page_label") or "",
            }
        else:
            new_item["locator_status"] = "unmatched"
        resolved.append(new_item)
    analysis["evidence_quotes"] = resolved
    return analysis


def _slug(value: str) -> str:
    import re

    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _float_or_none(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number < 0:
        return 0.0
    if number > 1:
        return 1.0
    return number


def _candidate_label(family: str, item: dict[str, Any]) -> str:
    if family == "terms":
        return str(item.get("term") or item.get("name") or "").strip()
    return str(item.get("name") or item.get("term") or "").strip()


def _candidate_definition(family: str, item: dict[str, Any]) -> str:
    if family == "terms":
        return str(item.get("meaning_as_used") or item.get("definition_as_used") or "").strip()
    if family == "actors":
        return str(item.get("role") or "").strip()
    return str(item.get("description") or item.get("kind") or "").strip()


def build_candidates(section_rows: list[dict[str, Any]], *, doc_id: str) -> dict[str, Any]:
    """Aggregate section-level candidates into a reviewable register.

    This is a model-proposed aide-memoire, not a registry write. It lets the
    researcher see repeated terms/tactics/entities before deciding what belongs
    in enrichment or Sanity.
    """
    buckets: dict[tuple[str, str], dict[str, Any]] = {}
    family_map = {
        "actors": "entity",
        "terms": "lexicon",
        "tactics": "tactic",
        "practices": "practice",
    }
    for row in section_rows:
        analysis = row.get("analysis") if isinstance(row.get("analysis"), dict) else {}
        for source_family, family in family_map.items():
            items = analysis.get(source_family)
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict):
                    continue
                label = _candidate_label(source_family, item)
                if not label:
                    continue
                key = (family, _slug(label))
                bucket = buckets.setdefault(
                    key,
                    {
                        "candidate_id": f"longform-{family}-{_slug(label)}",
                        "family": family,
                        "label": label,
                        "normalized_label": _slug(label),
                        "review_state": "model_proposed",
                        "count": 0,
                        "sections": [],
                        "confidence_values": [],
                        "confidence": None,
                        "candidate_actions": [],
                        "definitions": [],
                        "evidence": [],
                    },
                )
                bucket["count"] += 1
                section_id = str(row.get("section_id") or "")
                if section_id and section_id not in bucket["sections"]:
                    bucket["sections"].append(section_id)
                confidence = _float_or_none(item.get("confidence"))
                if confidence is not None:
                    bucket["confidence_values"].append(confidence)
                action = str(item.get("candidate_action") or "").strip()
                if action and action not in bucket["candidate_actions"]:
                    bucket["candidate_actions"].append(action)
                definition = _candidate_definition(source_family, item)
                if definition and definition not in bucket["definitions"]:
                    bucket["definitions"].append(definition)
                evidence_text = str(item.get("evidence") or "").strip()
                if evidence_text:
                    bucket["evidence"].append(
                        {
                            "section_id": section_id,
                            "page_start": row.get("page_start"),
                            "page_end": row.get("page_end"),
                            "quote_or_note": evidence_text,
                            "quote_hash": sha256_text(" ".join(evidence_text.split())),
                        }
                    )

    candidates = []
    for bucket in buckets.values():
        values = bucket.pop("confidence_values")
        if values:
            bucket["confidence"] = round(sum(values) / len(values), 3)
        bucket["evidence"] = bucket["evidence"][:8]
        candidates.append(bucket)
    candidates.sort(key=lambda item: (item["family"], -int(item["count"]), item["label"].lower()))
    return {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "generated_at": utcnow_iso(),
        "generator_git_commit": current_git_commit(),
        "review_state": "model_proposed",
        "candidate_count": len(candidates),
        "counts_by_family": {
            family: len([item for item in candidates if item["family"] == family])
            for family in ("entity", "lexicon", "tactic", "practice")
        },
        "candidates": candidates,
    }


def run_longform_review(
    doc_dir: Path,
    *,
    config: Config,
    llm: str = "litelm-heavy",
    model: str | None = None,
    max_section_chars: int = 30000,
    section_limit: int = 0,
    overwrite: bool = True,
    retry_failed: bool = False,
    dry_run: bool = False,
    model_call: ModelCall | None = None,
) -> dict[str, Any]:
    """Run section reviews and final synthesis for one longform document."""
    doc_dir = Path(doc_dir)
    if not (doc_dir / TEXT_BLOCKS_FILENAME).exists():
        build_longform_sidecars(doc_dir, overwrite=False)

    sections_path = doc_dir / SECTIONS_FILENAME
    analyses_path = doc_dir / SECTION_ANALYSES_FILENAME
    synthesis_path = doc_dir / SYNTHESIS_FILENAME
    candidates_path = doc_dir / CANDIDATES_FILENAME

    if sections_path.exists() and not overwrite:
        sections_payload = read_json_safe(sections_path, {})
        if not sections_payload.get("sections"):
            sections_payload = build_longform_sections(doc_dir, max_section_chars=max_section_chars)
    else:
        sections_payload = build_longform_sections(doc_dir, max_section_chars=max_section_chars)
    sections = list(sections_payload.get("sections") or [])
    biblio = read_json_safe(doc_dir / BIBLIOGRAPHIC_FILENAME, {})

    write_json(sections_path, sections_payload)
    if dry_run:
        sections_for_run = sections[:section_limit] if section_limit and section_limit > 0 else sections
        return {
            "doc_id": doc_dir.name,
            "dry_run": True,
            "section_count": len(sections),
            "sections_selected": len(sections_for_run),
            "paths": {"sections": str(sections_path)},
        }

    call = model_call or default_model_call
    rows: list[dict[str, Any]] = []
    stale_rows: list[dict[str, Any]] = []
    sections_by_id = section_map(sections_payload)
    retry_ids: set[str] = set()
    if analyses_path.exists() and not overwrite:
        saved_rows = read_jsonl(analyses_path)
        rows, stale_rows = filter_rows_for_section_plan(saved_rows, sections_payload)
        if retry_failed:
            retry_ids = {
                str(row.get("section_id") or "")
                for row in rows
                if row.get("status") == "failed"
            }
            rows = [row for row in rows if str(row.get("section_id") or "") not in retry_ids]
            write_jsonl(analyses_path, rows + stale_rows)
    else:
        analyses_path.write_text("", encoding="utf-8")

    if retry_failed:
        sections_for_run = [
            section
            for section in sections
            if str(section.get("section_id") or "") in retry_ids
        ]
        if section_limit and section_limit > 0:
            sections_for_run = sections_for_run[:section_limit]
    else:
        sections_for_run = sections[:section_limit] if section_limit and section_limit > 0 else sections

    existing_ids = {
        str(row.get("section_id"))
        for row in rows
        if row.get("status") == "succeeded" and row_matches_section(row, sections_by_id)
    }
    requested_model = _model_name_for_llm(llm, config, model)
    provider = _provider_for_llm(llm)
    for section in sections_for_run:
        section_id = str(section.get("section_id"))
        if section_id in existing_ids and not overwrite:
            continue
        system, user = section_prompt(doc_dir.name, biblio, section)
        row: dict[str, Any] = {
            "schema_version": SCHEMA_VERSION,
            "doc_id": doc_dir.name,
            "section_id": section_id,
            "section_index": section.get("section_index"),
            "title": section.get("title"),
            "page_start": section.get("page_start"),
            "page_end": section.get("page_end"),
            "char_count": section.get("char_count"),
            "text_hash": section.get("text_hash"),
            "block_ids": section.get("block_ids", []),
            "generated_at": utcnow_iso(),
            "model_provider": provider,
            "model_name": requested_model,
            "status": "succeeded",
            "analysis": {},
        }
        try:
            parsed, raw, req, resolved = coerce_model_result(call(system, user, llm, model, config))
            parsed = attach_evidence_locators(parsed, section)
            row["analysis"] = parsed
            if req:
                row["model_name"] = req
            if resolved:
                row["resolved_model_name"] = resolved
            row["raw_response_hash"] = sha256_text(raw)
        except Exception as exc:
            row["status"] = "failed"
            row["error"] = str(exc)
        rows.append(row)
        with analyses_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    succeeded = [
        row
        for row in rows
        if row.get("status") == "succeeded" and row_matches_section(row, sections_by_id)
    ]
    failed = [
        row
        for row in rows
        if row.get("status") == "failed" and row_matches_section(row, sections_by_id)
    ]
    candidates = build_candidates(succeeded, doc_id=doc_dir.name)
    write_json(candidates_path, candidates)
    synthesis_status = "skipped"
    if len(succeeded) == len(sections) and succeeded:
        system, user = synthesis_prompt(doc_dir.name, biblio, succeeded)
        try:
            parsed, raw, req, resolved = coerce_model_result(call(system, user, llm, model, config))
            synthesis = {
                "schema_version": SCHEMA_VERSION,
                "doc_id": doc_dir.name,
                "generated_at": utcnow_iso(),
                "generator_git_commit": current_git_commit(),
                "model_provider": provider,
                "model_name": req or requested_model,
                "resolved_model_name": resolved,
                "section_count": len(sections),
                "section_analyses_count": len(succeeded),
                "analysis_scope": "full_longform_sections",
                "source_files": {
                    "sections": SECTIONS_FILENAME,
                    "section_analyses": SECTION_ANALYSES_FILENAME,
                },
                "synthesis": parsed,
                "raw_response_hash": sha256_text(raw),
            }
            write_json(synthesis_path, synthesis)
            synthesis_status = "succeeded"
        except Exception as exc:
            write_json(
                synthesis_path,
                {
                    "schema_version": SCHEMA_VERSION,
                    "doc_id": doc_dir.name,
                    "generated_at": utcnow_iso(),
                    "status": "failed",
                    "error": str(exc),
                    "section_count": len(sections),
                    "section_analyses_count": len(succeeded),
                },
            )
            synthesis_status = "failed"
    elif section_limit:
        synthesis_status = "skipped_section_limit"

    return {
        "doc_id": doc_dir.name,
        "section_count": len(sections),
        "sections_reviewed": len(succeeded),
        "sections_failed": len(failed),
        "stale_section_rows": len(stale_rows),
        "synthesis_status": synthesis_status,
        "paths": {
            "sections": str(sections_path),
            "section_analyses": str(analyses_path),
            "candidates": str(candidates_path),
            "synthesis": str(synthesis_path),
        },
    }
