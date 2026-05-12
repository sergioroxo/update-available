"""Read-only Sanity query helpers shared across pipeline stages."""
from __future__ import annotations

import time

from ..config import Config

_LEXICON_CACHE_TTL_SECONDS = 300.0
_LEXICON_CACHE: dict[tuple[str, str], tuple[float, list[dict]]] = {}


def sanity_read_headers(config: Config) -> dict[str, str]:
    """Return an Authorization header only when a dedicated read token exists."""
    token = getattr(config, "sanity_read_token", "") or ""
    return {"Authorization": f"Bearer {token}"} if token else {}


def fetch_active_lexicon_terms(config: Config, ttl_seconds: float = _LEXICON_CACHE_TTL_SECONDS) -> list[dict]:
    """Fetch draft/validated lexicon entries, caching briefly per dataset."""
    cache_key = (config.sanity_project_id, config.sanity_dataset)
    now = time.monotonic()
    cached = _LEXICON_CACHE.get(cache_key)
    if cached and now - cached[0] < ttl_seconds:
        return cached[1]

    import httpx

    query = (
        '*[_type == "lexiconEntry" && status in ["draft","validated"]]'
        '{ term, proposedCluster, function, multilingualVariants }'
    )
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
    terms = response.json().get("result", [])
    _LEXICON_CACHE[cache_key] = (now, terms)
    return terms


def clear_lexicon_cache() -> None:
    _LEXICON_CACHE.clear()
