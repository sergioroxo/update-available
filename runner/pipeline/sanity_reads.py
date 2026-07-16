"""Read-only Sanity query helpers shared across pipeline stages."""
from __future__ import annotations

import time

from ..config import Config

_LEXICON_CACHE_TTL_SECONDS = 300.0

# Full draft+validated cache — used by Stage 3c enrichment.
_LEXICON_CACHE: dict[tuple[str, str], tuple[float, list[dict]]] = {}

# Orientation-only cache — used by Stage 3b analysis.
# Separate dict so the two caches do not interfere with each other.
_ORIENTATION_CACHE: dict[tuple[str, str], tuple[float, list[dict]]] = {}


def sanity_read_headers(config: Config) -> dict[str, str]:
    """Return an Authorization header only when a dedicated read token exists."""
    token = getattr(config, "sanity_read_token", "") or ""
    return {"Authorization": f"Bearer {token}"} if token else {}


def _sanity_get(config: Config, query: str) -> list[dict]:
    """Execute a GROQ query against the Sanity Content API and return the result list."""
    import httpx

    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    response = httpx.get(
        url,
        params={"query": query},
        headers=sanity_read_headers(config),
        timeout=10,
    )
    response.raise_for_status()
    return response.json().get("result", [])


def fetch_active_lexicon_terms(config: Config, ttl_seconds: float = _LEXICON_CACHE_TTL_SECONDS) -> list[dict]:
    """Fetch all draft+validated lexicon entries for Stage 3c enrichment.

    Returns every entry with status in ["draft", "validated"] — no curation
    filter applied. Stage 3c needs maximum coverage for lexicon mining.
    Results are cached per dataset for ``ttl_seconds`` (default 5 min).
    """
    cache_key = (config.sanity_project_id, config.sanity_dataset)
    now = time.monotonic()
    cached = _LEXICON_CACHE.get(cache_key)
    if cached and now - cached[0] < ttl_seconds:
        return cached[1]

    query = (
        '*[_type == "lexiconEntry" && status in ["draft","validated"]]'
        '{ term, status, proposedCluster, function, multilingualVariants, sourceAttestations }'
    )
    terms = _sanity_get(config, query)
    _LEXICON_CACHE[cache_key] = (now, terms)
    return terms


def fetch_analysis_orientation_terms(
    config: Config,
    ttl_seconds: float = _LEXICON_CACHE_TTL_SECONDS,
) -> list[dict]:
    """Fetch the compact orientation lexicon for Stage 3b analysis.

    Returns only:
    - All ``status == "validated"`` entries (canonical registry vocabulary), and
    - ``status == "draft"`` entries where ``includeInAnalysisLexicon == true``
      (researcher-trusted drafts explicitly curated for analysis injection).

    Unreviewed model-suggested drafts (``includeInAnalysisLexicon == false``, the
    default) are intentionally excluded — they do not enter the analysis prompt
    until the researcher explicitly marks them here.

    Results are ordered deterministically: validated entries first (status desc),
    then alphabetically by term within each group — so the analysis 200-term cap
    always keeps the highest-confidence terms.

    Cached separately from ``fetch_active_lexicon_terms`` to avoid cross-
    contamination between the two query scopes.
    """
    cache_key = (config.sanity_project_id, config.sanity_dataset)
    now = time.monotonic()
    cached = _ORIENTATION_CACHE.get(cache_key)
    if cached and now - cached[0] < ttl_seconds:
        return cached[1]

    # GROQ: validated always included; drafts only when explicitly flagged.
    # | order(status desc, term asc) puts "validated" before "draft" (v > d)
    # and sorts alphabetically within each group — deterministic cap behaviour.
    query = (
        '*[_type == "lexiconEntry"'
        ' && (status == "validated"'
        ' || (status == "draft" && includeInAnalysisLexicon == true))]'
        ' | order(status desc, term asc)'
        '{ term, proposedCluster, function, multilingualVariants }'
    )
    terms = _sanity_get(config, query)
    _ORIENTATION_CACHE[cache_key] = (now, terms)
    return terms


def fetch_entities_for_resolver(config: Config) -> list[dict]:
    """Fetch organization/person records for the entity ID resolver UI.

    Returns ``_id``, ``_type``, ``name``, and ``fullName`` (populated for
    organizations that have an expansion/abbreviation).

    This is an on-demand, uncached fetch used only by the Streamlit provenance
    panel resolver — it is not called during pipeline ingestion.  The results
    are intentionally not cached so the resolver always reflects the live
    Sanity registry state.
    """
    query = (
        '*[_type in ["organization","person"]]'
        '{ _id, _type, name, fullName }'
    )
    return _sanity_get(config, query)


def clear_lexicon_cache() -> None:
    """Clear both the active-lexicon cache and the orientation cache."""
    _LEXICON_CACHE.clear()
    _ORIENTATION_CACHE.clear()


def clear_orientation_cache() -> None:
    """Clear only the orientation cache (Stage 3b analysis)."""
    _ORIENTATION_CACHE.clear()
