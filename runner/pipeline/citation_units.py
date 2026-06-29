"""Deterministic citation-unit helpers for extracted text.

Citation units are local, regenerable provenance records that let later graph,
Wikia, search, and chatbot layers trace model-proposed evidence quotes back to
stable spans in ``extracted.txt``. They are intentionally model-free and do not
make public-safety decisions; public redaction belongs in a later export layer.
"""
from __future__ import annotations

import hashlib
import copy
import re
from typing import Any


SCHEMA_VERSION = "citation-units-v1.0"
CITATION_UNITS_FILENAME = "citation_units.json"


def sha256_text(value: str) -> str:
    return hashlib.sha256((value or "").encode("utf-8")).hexdigest()


def quote_hash(value: str) -> str:
    """Stable hash for a quoted/evidence string."""
    return sha256_text(_normalize_space(value))


def build_citation_units(
    text: str,
    *,
    doc_id: str = "",
    source_artifact: str = "extracted.txt",
) -> dict[str, Any]:
    """Return a citation-unit sidecar for ``text``.

    Units are paragraph-like spans separated by blank lines. Offsets are Python
    string character offsets into the canonical extracted text. The unit id uses
    both sequence and content hash so it remains readable while still changing
    when the underlying evidence changes.
    """
    text = text or ""
    units: list[dict[str, Any]] = []
    for idx, match in enumerate(re.finditer(r"\S(?:.*?\S)?(?=\n\s*\n|\Z)", text, flags=re.S), start=1):
        unit_text = match.group(0)
        start = match.start()
        end = match.end()
        digest = sha256_text(unit_text)
        units.append({
            "unit_id": f"p{idx:04d}-{digest[:12]}",
            "sequence": idx,
            "source_artifact": source_artifact,
            "char_start": start,
            "char_end": end,
            "char_count": len(unit_text),
            "text_sha256": digest,
            "text": unit_text,
        })
    return {
        "schema_version": SCHEMA_VERSION,
        "doc_id": doc_id,
        "source_artifact": source_artifact,
        "text_sha256": sha256_text(text),
        "char_count": len(text),
        "unit_count": len(units),
        "units": units,
    }


def citation_summary(sidecar: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(sidecar, dict) or not sidecar:
        return {
            "exists": False,
            "schema_version": "",
            "source_artifact": "",
            "unit_count": 0,
            "char_count": 0,
            "text_sha256": "",
        }
    return {
        "exists": True,
        "schema_version": str(sidecar.get("schema_version") or ""),
        "source_artifact": str(sidecar.get("source_artifact") or ""),
        "unit_count": _int(sidecar.get("unit_count")),
        "char_count": _int(sidecar.get("char_count")),
        "text_sha256": str(sidecar.get("text_sha256") or ""),
    }


def locate_quote(
    sidecar: dict[str, Any] | None,
    quote: str,
    *,
    max_context_chars: int = 260,
) -> dict[str, Any]:
    """Best-effort locate ``quote`` in a citation-unit sidecar.

    Returns an empty locator when no quote or unit match is available. Exact
    matching is attempted first; normalized whitespace matching follows. The
    returned offsets are global offsets into ``extracted.txt`` whenever they can
    be computed.
    """
    raw_quote = (quote or "").strip()
    if not raw_quote or not isinstance(sidecar, dict):
        return _empty_locator(raw_quote)
    units = sidecar.get("units")
    if not isinstance(units, list):
        return _empty_locator(raw_quote)

    normalized_quote = _normalize_space(raw_quote)
    for unit in units:
        if not isinstance(unit, dict):
            continue
        text = str(unit.get("text") or "")
        base_start = _int(unit.get("char_start"))
        exact_idx = text.find(raw_quote)
        if exact_idx >= 0:
            return _locator(
                unit,
                raw_quote,
                base_start + exact_idx,
                base_start + exact_idx + len(raw_quote),
                "exact",
                raw_quote[:max_context_chars],
            )

        normalized_text = _normalize_space(text)
        norm_idx = normalized_text.find(normalized_quote)
        if norm_idx >= 0:
            return _locator(
                unit,
                raw_quote,
                base_start,
                _int(unit.get("char_end")),
                "normalized_unit",
                text[:max_context_chars],
            )

    return _empty_locator(raw_quote)


def attach_locators_to_enrichment_payload(
    payload: dict[str, Any],
    citation_sidecar: dict[str, Any] | None,
) -> dict[str, Any]:
    """Return an enrichment payload with best-effort ``evidence_locator`` fields.

    The EnrichmentResult Pydantic models deliberately ignore unknown fields for
    validation stability, so locator attachment happens on the serialized JSON
    payload. Existing locator fields are refreshed deterministically from the
    current ``citation_units.json`` sidecar.
    """
    data = copy.deepcopy(payload or {})

    for item in _items(data, "lexicon_proposals"):
        _attach(item, "exact_quote", citation_sidecar)
        for rel in item.get("relationships") or []:
            if isinstance(rel, dict):
                _attach(rel, "evidence", citation_sidecar)

    for item in _items(data, "entity_proposals"):
        _attach(item, "evidence_quote", citation_sidecar)
        for conn in item.get("network_connections") or []:
            if isinstance(conn, dict):
                _attach(conn, "evidence_quote", citation_sidecar)
        for person in item.get("key_individuals") or []:
            if isinstance(person, dict):
                _attach(person, "quote", citation_sidecar)

    for item in _items(data, "tactic_proposals"):
        _attach(item, "evidence_quote", citation_sidecar)

    for item in _items(data, "practice_descriptions"):
        _attach(item, "harm_quote", citation_sidecar)
        if not item.get("evidence_locator", {}).get("unit_id"):
            _attach(item, "exact_description", citation_sidecar)

    for item in _items(data, "statistical_claims"):
        _attach(item, "claim", citation_sidecar)

    for item in _items(data, "corpus_connections"):
        _attach(item, "evidence", citation_sidecar)

    return data


def _locator(
    unit: dict[str, Any],
    quote: str,
    start: int,
    end: int,
    match_kind: str,
    context: str,
) -> dict[str, Any]:
    return {
        "status": "located",
        "match_kind": match_kind,
        "unit_id": str(unit.get("unit_id") or ""),
        "source_artifact": str(unit.get("source_artifact") or "extracted.txt"),
        "char_start": start,
        "char_end": end,
        "quote_hash": quote_hash(quote),
        "context": context,
    }


def _items(data: dict[str, Any], key: str) -> list[dict[str, Any]]:
    value = data.get(key)
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _attach(item: dict[str, Any], quote_field: str, citation_sidecar: dict[str, Any] | None) -> None:
    quote = str(item.get(quote_field) or "")
    item["evidence_locator"] = locate_quote(citation_sidecar, quote)
    item["evidence_quote_hash"] = item["evidence_locator"].get("quote_hash", "")


def _empty_locator(quote: str) -> dict[str, Any]:
    return {
        "status": "missing_quote" if not (quote or "").strip() else "not_found",
        "match_kind": "",
        "unit_id": "",
        "source_artifact": "",
        "char_start": "",
        "char_end": "",
        "quote_hash": quote_hash(quote) if (quote or "").strip() else "",
        "context": "",
    }


def _normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0
