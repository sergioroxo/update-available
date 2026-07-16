"""Unified enrichment research-memory provider (Stage 3c).

Stage 3b analysis uses a small, curated orientation lexicon for classification
stability. Stage 3c enrichment is the lexicon-mining stage and needs the widest
*memory* possible so it connects new wording to concepts the project already
knows — even concepts that live only in previous-system curation and have not yet
been pushed to Sanity.

This module merges three memory sources into one labelled list:

  - live Sanity ``lexiconEntry`` (draft + validated) — already-canonical vocabulary
  - seed markdown lexicon (``SOGICE_Lexicon_v2.1.md``) — curated "seed draft" memory
  - legacy April glossary (``03_data/sogice_glossary_2026-04-03.json``) — "legacy draft"

Seed/legacy terms are **draft memory only**. They are labelled by source so the
model can weight them, and they are *never* auto-validated by being visible here.
Validation stays a manual, evidence-backed researcher action.

Pure module: no Streamlit, no network of its own. The Sanity terms are passed in
already-fetched by the caller. Seed/legacy reads are local files and degrade to an
empty list on any parse/IO failure, so enrichment never breaks if a file is absent.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

try:
    from runner.pipeline import seed as seed_module
    from runner.pipeline.govuk_glossary import seed_memory_terms as govuk_seed_memory_terms
except ImportError:  # pragma: no cover - import shim
    from . import seed as seed_module  # type: ignore[no-redef]
    from .govuk_glossary import seed_memory_terms as govuk_seed_memory_terms

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_LEGACY_GLOSSARY = _PROJECT_ROOT / "03_data" / "sogice_glossary_2026-04-03.json"
_GENDER_DYSPHORIA_LEGACY_HINTS = (
    "gender dysphoria",
    "dysphorie de genre",
    "geschlechtsdysphorie",
    "dysforia płciowa",
    "nemi diszfória",
    "disforia di genere",
    "disforija tal-ġeneru",
    "rodová dysfória",
    "δυσφορία φύλου",
    "cinsiyet disforisi",
    "гендерна дисфорія",
)


def canonical_key(term: str) -> str:
    """Canonical lexiconEntry id for a term.

    Mirrors clients.sanity._slugify / app._lexicon_canonical_id so the same concept
    dedupes across Sanity, seed, and legacy, and so a seed/legacy term's id equals
    the live Sanity _id once it is materialised.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", str(term or "").strip().lower()).strip("-")
    return f"lexicon-{slug or 'untitled'}"


def seed_lexicon_terms() -> list[dict]:
    """Curated seed-draft terms with their multilingual variants attached.

    Shaped like a Sanity term dict so the prompt formatter is uniform:
    ``{term, status, proposedCluster, function, multilingualVariants, source, sourceNote}``
    with ``status='seed_draft'`` and ``source='seed'``. Pure; ``[]`` on failure.
    """
    try:
        base = seed_module.parse_lexicon_md()
    except Exception:
        base = []
    try:
        variant_rows = seed_module.parse_multilingual_variants_md()
    except Exception:
        variant_rows = []

    variants_by_id: dict[str, list[dict]] = {}
    canonical_terms: dict[str, str] = {}
    for v in variant_rows:
        cid = str(v.get("canonical_id") or "").strip() or canonical_key(v.get("canonical_term", ""))
        canonical_terms.setdefault(cid, str(v.get("canonical_term") or "").strip())
        variant_term = str(v.get("variant_term") or "").strip()
        if variant_term:
            variants_by_id.setdefault(cid, []).append(
                {"variantTerm": variant_term, "language": v.get("language") or "unknown"}
            )

    terms: list[dict] = []
    seen: set[str] = set()
    for entry in base:
        term = str(entry.get("term") or "").strip()
        if not term:
            continue
        cid = canonical_key(term)
        if cid in seen:
            continue
        seen.add(cid)
        terms.append({
            "term": term,
            "status": "seed_draft",
            "proposedCluster": entry.get("proposed_cluster") or "Unknown",
            "function": entry.get("function") or "Unknown",
            "multilingualVariants": variants_by_id.get(cid, []),
            "source": "seed",
            "sourceNote": entry.get("source_note") or "",
        })

    # Canonicals that exist only in the §11 multilingual table (no standalone term
    # heading) — surface them too so their variants are searchable memory.
    for cid, cterm in canonical_terms.items():
        if cid in seen or not cterm:
            continue
        seen.add(cid)
        terms.append({
            "term": cterm,
            "status": "seed_draft",
            "proposedCluster": "Unknown",
            "function": "Unknown",
            "multilingualVariants": variants_by_id.get(cid, []),
            "source": "seed",
        })

    # Structured authority manifest. It is source-attested reference memory,
    # not researcher validation and not automatically trusted by Analysis.
    try:
        govuk_rows = govuk_seed_memory_terms()
    except Exception:
        govuk_rows = []
    by_canonical = {canonical_key(row.get("term", "")): row for row in terms}
    for govuk_row in govuk_rows:
        cid = canonical_key(govuk_row.get("term", ""))
        existing = by_canonical.get(cid)
        if existing is None:
            terms.append(govuk_row)
            by_canonical[cid] = govuk_row
            continue
        if existing.get("proposedCluster") in {None, "", "Unknown"}:
            existing["proposedCluster"] = govuk_row.get("proposedCluster") or "Unknown"
        if existing.get("function") in {None, ""}:
            existing["function"] = govuk_row.get("function") or "Unknown"
        if not existing.get("sourceNote"):
            existing["sourceNote"] = govuk_row.get("sourceNote") or ""
        _merge_variants(existing, govuk_row)
        attestations = existing.setdefault("sourceAttestations", [])
        seen_attestations = {str(row.get("sourceId") or "") for row in attestations if isinstance(row, dict)}
        for attestation in govuk_row.get("sourceAttestations") or []:
            if str(attestation.get("sourceId") or "") not in seen_attestations:
                attestations.append(attestation)
                seen_attestations.add(str(attestation.get("sourceId") or ""))

    return terms


def legacy_lexicon_terms(path: Path | None = None) -> list[dict]:
    """Legacy April-glossary terms as draft memory. Pure; ``[]`` on failure."""
    glossary = path or _LEGACY_GLOSSARY
    try:
        data = json.loads(Path(glossary).read_text(encoding="utf-8"))
    except Exception:
        return []

    terms: list[dict] = []
    seen: set[str] = set()
    by_id: dict[str, dict] = {}
    for entry in data.get("entries", []) if isinstance(data, dict) else []:
        term = str(entry.get("term") or "").strip()
        if not term:
            continue
        canonical_term, variant_term = _legacy_canonical_and_variant(entry)
        cid = canonical_key(canonical_term)
        variant = (
            {"variantTerm": variant_term, "language": entry.get("language") or "unknown"}
            if variant_term and variant_term.casefold() != canonical_term.casefold()
            else None
        )
        if cid in seen:
            if variant:
                _merge_variants(by_id.get(cid), {"multilingualVariants": [variant]})
            continue
        seen.add(cid)
        row = {
            "term": canonical_term,
            "status": "legacy_draft",
            "proposedCluster": "Unknown",
            "function": "Unknown",
            "multilingualVariants": [variant] if variant else [],
            "source": "legacy",
        }
        terms.append(row)
        by_id[cid] = row
    return terms


def _legacy_canonical_and_variant(entry: dict) -> tuple[str, str]:
    """Map obvious previous-system variants onto known canonical concepts.

    The legacy glossary contains reviewed terms such as ``GD – disforia di
    genere``. Those should not become independent canonical concepts in
    enrichment memory; they are evidence-bearing forms of ``Gender Dysphoria``.
    Keep the original string as a variant so the model can still match the exact
    wording found in older documents.
    """
    term = str(entry.get("term") or "").strip()
    # Use the legacy term itself, not its definition/context. A definition may
    # merely mention gender dysphoria ("Trauma Causation Claims" does), and that
    # should not collapse the whole concept into Gender Dysphoria.
    haystack = term.casefold()
    if any(hint.casefold() in haystack for hint in _GENDER_DYSPHORIA_LEGACY_HINTS):
        if term.casefold() not in {"gender dysphoria", "term: gender dysphoria"}:
            return "Gender Dysphoria", term
    return term, ""


def merge_enrichment_lexicon(
    sanity_terms: list[dict],
    *,
    include_seed: bool = True,
    include_legacy: bool = True,
    seed_terms_fn=seed_lexicon_terms,
    legacy_terms_fn=legacy_lexicon_terms,
) -> tuple[list[dict], dict]:
    """Merge live Sanity terms with seed/legacy draft memory.

    Dedupe is by canonical slug with Sanity winning over seed winning over legacy,
    so a concept already live is shown once, as the Sanity entry. Every row carries
    a ``source`` tag (``sanity`` is stamped on the passed-in terms). Returns
    ``(merged_terms, counts)`` where counts is ``{sanity, seed, legacy, injected}``
    for the enrichment audit.
    """
    merged: list[dict] = []
    seen: set[str] = set()
    by_id: dict[str, dict] = {}
    counts = {"sanity": 0, "seed": 0, "legacy": 0, "injected": 0}

    for term in sanity_terms or []:
        text = str(term.get("term") or "").strip()
        if not text:
            continue
        cid = canonical_key(text)
        if cid in seen:
            continue
        seen.add(cid)
        row = dict(term)
        row["source"] = "sanity"
        row.setdefault("status", "draft")
        merged.append(row)
        by_id[cid] = row
        counts["sanity"] += 1

    if include_seed:
        try:
            seed_rows = seed_terms_fn() or []
        except Exception:
            seed_rows = []
        for term in seed_rows:
            text = str(term.get("term") or "").strip()
            cid = canonical_key(text)
            if not text:
                continue
            if cid in seen:
                _merge_variants(by_id.get(cid), term)
                _merge_source_attestations(by_id.get(cid), term)
                continue
            seen.add(cid)
            merged.append(term)
            by_id[cid] = term
            counts["seed"] += 1

    if include_legacy:
        try:
            legacy_rows = legacy_terms_fn() or []
        except Exception:
            legacy_rows = []
        for term in legacy_rows:
            text = str(term.get("term") or "").strip()
            cid = canonical_key(text)
            if not text:
                continue
            if cid in seen:
                _merge_variants(by_id.get(cid), term)
                continue
            seen.add(cid)
            merged.append(term)
            by_id[cid] = term
            counts["legacy"] += 1

    counts["injected"] = len(merged)
    return merged, counts


def _merge_variants(target: dict | None, lower_priority: dict) -> None:
    """Attach lower-priority variants to the winning canonical row."""
    if not target:
        return
    existing = target.setdefault("multilingualVariants", [])
    seen = {
        (
            str(row.get("variantTerm") or "").casefold(),
            str(row.get("language") or "unknown").casefold(),
        )
        for row in existing
    }
    for row in lower_priority.get("multilingualVariants") or []:
        key = (
            str(row.get("variantTerm") or "").casefold(),
            str(row.get("language") or "unknown").casefold(),
        )
        if key[0] and key not in seen:
            existing.append(row)
            seen.add(key)


def _merge_source_attestations(target: dict | None, lower_priority: dict) -> None:
    """Preserve authority provenance even when a live Sanity row wins dedupe."""
    if not target:
        return
    existing = target.setdefault("sourceAttestations", [])
    seen = {
        str(row.get("sourceId") or row.get("source_id") or "")
        for row in existing if isinstance(row, dict)
    }
    for row in lower_priority.get("sourceAttestations") or []:
        if not isinstance(row, dict):
            continue
        source_id = str(row.get("sourceId") or row.get("source_id") or "")
        if source_id and source_id not in seen:
            existing.append(dict(row))
            seen.add(source_id)
