"""
Pure helpers for resolving entity proposal names against the Sanity registry.

No Streamlit or network imports at module level — safe to import in headless
test environments.  The Sanity fetch helper is in
``runner/pipeline/sanity_reads.fetch_entities_for_resolver``.

Public API
----------
EntityMatch                                         — structured match result
normalize_entity_name(name)                         → str
match_entity_name(proposal_name, registry_entities) → list[EntityMatch]
fill_entity_id_in_enrichment(doc_dir, name, id)     → bool
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path


# ---------------------------------------------------------------------------
# Match result type
# ---------------------------------------------------------------------------

@dataclass
class EntityMatch:
    """A candidate match between a proposal name and a Sanity registry entity.

    Confidence levels
    -----------------
    ``"exact"``     — normalized names are identical; safe to offer as auto-fill.
    ``"candidate"`` — partial/contains match; must be shown as a suggestion
                      only — never auto-applied without researcher confirmation.
    """

    sanity_id: str
    """The Sanity ``_id`` of the matched record, e.g. ``organization-segm``."""

    sanity_type: str
    """``"organization"`` or ``"person"``."""

    name: str
    """The canonical name as stored in Sanity (primary ``name`` field)."""

    confidence: str
    """``"exact"`` or ``"candidate"`` — see class docstring."""

    match_type: str
    """``"name"`` (matched on primary name) or ``"full_name"`` (matched on fullName)."""


# ---------------------------------------------------------------------------
# Name normalization
# ---------------------------------------------------------------------------

def normalize_entity_name(name: str) -> str:
    """Return a normalised version of *name* for matching.

    Transformations applied (in order):

    1. NFD decomposition — separates base characters from combining diacritics.
    2. Strip combining characters (accents, cedillas, umlauts, etc.).
    3. Lowercase.
    4. Replace all non-alphanumeric, non-space characters with a single space.
    5. Collapse consecutive whitespace to one space.
    6. Strip leading/trailing whitespace.

    Examples::

        normalize_entity_name("SEGM")           == "segm"
        normalize_entity_name("Genspect")       == "genspect"
        normalize_entity_name("Väre-Institut")  == "vare institut"
        normalize_entity_name("L'Heure")        == "l heure"
        normalize_entity_name("JONAH  (US)")    == "jonah  us"
    """
    # Steps 1–2: strip diacritics
    decomposed = unicodedata.normalize("NFD", name)
    stripped = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    # Step 3: lowercase
    lower = stripped.lower()
    # Step 4: non-alphanumeric/non-space → space
    no_punct = re.sub(r"[^\w\s]", " ", lower)
    # Steps 5–6: collapse and strip
    return re.sub(r"\s+", " ", no_punct).strip()


# ---------------------------------------------------------------------------
# Internal confidence scorer
# ---------------------------------------------------------------------------

def _score(norm_query: str, norm_candidate: str) -> str | None:
    """Return ``"exact"`` / ``"candidate"`` / ``None``.

    ``"exact"``     — normalized strings are identical.
    ``"candidate"`` — one contains the other (order-independent).
    ``None``        — no meaningful similarity.
    """
    if not norm_query or not norm_candidate:
        return None
    if norm_query == norm_candidate:
        return "exact"
    if norm_query in norm_candidate or norm_candidate in norm_query:
        return "candidate"
    return None


# ---------------------------------------------------------------------------
# Match engine
# ---------------------------------------------------------------------------

def match_entity_name(
    proposal_name: str,
    registry_entities: list[dict],
) -> list[EntityMatch]:
    """Match *proposal_name* against a list of Sanity registry entity records.

    Parameters
    ----------
    proposal_name:
        The entity name from the enrichment proposal (e.g. ``"SEGM"``).
    registry_entities:
        List of dicts from Sanity; each must have ``_id``, ``_type``, ``name``.
        The optional ``fullName`` field (org expansion) is also checked.

    Returns
    -------
    list[EntityMatch]
        Sorted: ``"exact"`` matches first, then ``"candidate"`` matches,
        both sub-sorted alphabetically by canonical Sanity name.
        Each entity appears **at most once** (first match wins; primary
        name is checked before ``fullName``).

    Safety guarantee
    ----------------
    Only ``"exact"`` results should be offered as one-click auto-fill.
    ``"candidate"`` results must always require an explicit researcher action.
    """
    norm_query = normalize_entity_name(proposal_name)
    seen_ids: set[str] = set()
    results: list[EntityMatch] = []

    for entity in registry_entities:
        sanity_id   = (entity.get("_id")   or "").strip()
        sanity_type = (entity.get("_type") or "organization").strip()
        primary     = (entity.get("name")  or "").strip()
        full_name   = (entity.get("fullName") or "").strip()

        if not sanity_id or not primary or sanity_id in seen_ids:
            continue

        # Primary name check
        conf = _score(norm_query, normalize_entity_name(primary))
        if conf:
            seen_ids.add(sanity_id)
            results.append(EntityMatch(
                sanity_id=sanity_id,
                sanity_type=sanity_type,
                name=primary,
                confidence=conf,
                match_type="name",
            ))
            continue   # don't also check fullName for the same entity

        # Full name check (useful when primary is an abbreviation)
        if full_name:
            conf = _score(norm_query, normalize_entity_name(full_name))
            if conf:
                seen_ids.add(sanity_id)
                results.append(EntityMatch(
                    sanity_id=sanity_id,
                    sanity_type=sanity_type,
                    name=primary,        # show canonical name, not fullName
                    confidence=conf,
                    match_type="full_name",
                ))

    # Sort: exact before candidate; alphabetical within tier
    results.sort(key=lambda m: (0 if m.confidence == "exact" else 1, m.name.lower()))
    return results


# ---------------------------------------------------------------------------
# Local enrichment.json writer
# ---------------------------------------------------------------------------

def fill_entity_id_in_enrichment(
    doc_dir: Path,
    proposal_name: str,
    sanity_id: str,
) -> bool:
    """Write *sanity_id* into the ``existing_entity_id`` of the named proposal.

    Finds the first ``entity_proposals`` entry whose ``name`` matches
    *proposal_name* (case-insensitive) and sets ``existing_entity_id``.

    Parameters
    ----------
    doc_dir:       Local corpus document directory.
    proposal_name: ``name`` value of the proposal to update.
    sanity_id:     The Sanity ``_id`` to fill in.

    Returns
    -------
    bool
        ``True`` on success; ``False`` if the file was not found, could
        not be parsed, or no matching proposal was found.

    Notes
    -----
    - Only writes to local ``enrichment.json`` — zero Sanity API calls.
    - Only sets ``existing_entity_id``; all other fields are untouched.
    - Only updates the **first** matching proposal name.
    """
    enrichment_path = doc_dir / "enrichment.json"
    if not enrichment_path.exists():
        return False
    try:
        data = json.loads(enrichment_path.read_text(encoding="utf-8"))
    except Exception:
        return False

    proposals = data.get("entity_proposals") or []
    norm_target = proposal_name.strip().lower()
    found = False
    for proposal in proposals:
        if (proposal.get("name") or "").strip().lower() == norm_target:
            proposal["existing_entity_id"] = sanity_id
            found = True
            break

    if not found:
        return False

    try:
        enrichment_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return True
    except Exception:
        return False
