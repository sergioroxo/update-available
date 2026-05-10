"""Bounded related-source search from reviewed media discovery seeds.

This module deliberately creates a candidate queue only. It does not ingest,
upload, merge duplicates, or mark candidates as approved.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlencode, urlparse, urlunparse

import httpx

from ..config import Config
from .doc_ids import resolve_doc_dir
from .intake import find_existing_by_source
from .media_evidence import platform_for_url


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""


def run_related_source_search(
    doc_id: str,
    config: Config,
    provider: str = "duckduckgo",
    max_queries: int = 5,
    max_results_per_query: int = 5,
    dry_run: bool = False,
) -> dict:
    """Search for related sources from discovery_seed_queue.json."""
    doc_id, doc_dir = resolve_doc_dir(doc_id, config)
    seeds = load_discovery_seeds(doc_dir)
    selected_seeds = seeds[: max(0, max_queries)]

    candidates: list[dict] = []
    errors: list[dict] = []
    seen_urls: set[str] = set()
    for seed in selected_seeds:
        if dry_run:
            continue
        try:
            results = search(seed["query"], provider=provider, limit=max_results_per_query)
        except Exception as exc:
            errors.append(
                {
                    "query": seed.get("query", ""),
                    "seedType": seed.get("seedType", ""),
                    "error": str(exc),
                }
            )
            continue
        for result in results:
            normalised = normalise_candidate_url(result.url)
            if not normalised or normalised in seen_urls:
                continue
            seen_urls.add(normalised)
            candidates.append(
                build_candidate(
                    result=result,
                    seed=seed,
                    normalised_url=normalised,
                    config=config,
                )
            )

    payload = {
        "doc_id": doc_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "provider": provider,
        "dryRun": dry_run,
        "maxQueries": max_queries,
        "maxResultsPerQuery": max_results_per_query,
        "seedsUsed": selected_seeds,
        "candidateCount": len(candidates),
        "errorCount": len(errors),
        "errors": errors,
        "reviewStatus": "needs_review",
        "autonomousIngestAllowed": False,
        "candidates": sorted(
            candidates,
            key=lambda row: (-float(row.get("score", 0)), row.get("url", "")),
        ),
    }
    if not dry_run:
        save_candidate_sources(doc_dir, payload)
    return payload


def load_discovery_seeds(doc_dir: Path) -> list[dict]:
    path = doc_dir / "discovery_seed_queue.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        return []
    return [
        seed for seed in data
        if isinstance(seed, dict)
        and seed.get("query")
        and seed.get("reviewStatus", "needs_review") != "rejected"
    ]


def save_candidate_sources(doc_dir: Path, payload: dict) -> Path:
    path = doc_dir / "candidate_sources.json"
    if path.exists():
        archive_dir = doc_dir / "candidate_sources_archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        archive = archive_dir / f"candidate_sources_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.json"
        archive.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def search(query: str, provider: str = "duckduckgo", limit: int = 5) -> list[SearchResult]:
    if provider != "duckduckgo":
        raise ValueError("Only provider='duckduckgo' is currently implemented")
    return search_duckduckgo(query, limit=limit)


def search_duckduckgo(query: str, limit: int = 5) -> list[SearchResult]:
    response = httpx.get(
        "https://duckduckgo.com/html/",
        params={"q": query},
        headers={"User-Agent": "SurvivingSOGICE research discovery bot"},
        timeout=20,
        follow_redirects=True,
    )
    response.raise_for_status()
    parser = _DuckDuckGoHTMLParser()
    parser.feed(response.text)
    return parser.results[:limit]


def build_candidate(
    result: SearchResult,
    seed: dict,
    normalised_url: str,
    config: Config,
) -> dict:
    existing = find_existing_by_source(normalised_url, config)
    platform = platform_for_url(normalised_url)
    category = categorize_candidate(result, seed, platform)
    return {
        "url": normalised_url,
        "title": result.title,
        "snippet": result.snippet,
        "platform": platform,
        "candidateCategory": category,
        "relationship": category,
        "seedQuery": seed.get("query", ""),
        "seedType": seed.get("seedType", ""),
        "seedReason": seed.get("reason", ""),
        "sourceUrl": seed.get("sourceUrl", ""),
        "sourceTitle": seed.get("sourceTitle", ""),
        "score": score_candidate(result, seed, platform),
        "alreadyInCorpus": bool(existing),
        "existingDocIds": [item.get("doc_id", "") for item in existing],
        "reviewStatus": "needs_review",
        "autonomousIngestAllowed": False,
    }


def categorize_candidate(result: SearchResult, seed: dict, platform: str) -> str:
    """Assign a review category, not an automated duplicate decision."""
    seed_type = seed.get("seedType", "")
    title = result.title.lower()
    source_title = str(seed.get("sourceTitle") or "").lower()
    source_platform = platform_for_url(seed.get("sourceUrl", ""))
    query = str(seed.get("query") or "").strip('"').lower()
    if source_title and source_title in title and platform and platform != source_platform:
        return "possible_mirror_or_reupload"
    if seed_type == "title_channel":
        return "same_creator_or_channel_candidate"
    if source_title and source_title in title:
        return "same_title_candidate"
    if seed_type in {"platform_tag", "hashtag"}:
        return "tag_or_hashtag_related"
    if query and query in title:
        return "query_title_match"
    return "related_context_candidate"


def score_candidate(result: SearchResult, seed: dict, platform: str) -> float:
    score = 0.0
    title = result.title.lower()
    source_title = str(seed.get("sourceTitle") or "").lower()
    query = str(seed.get("query") or "").strip('"').lower()
    if platform != "other":
        score += 1.0
    if source_title and source_title in title:
        score += 3.0
    if query and query in title:
        score += 1.5
    if seed.get("seedType") in {"exact_title", "title_channel"}:
        score += 1.0
    return round(score, 3)


def normalise_candidate_url(url: str) -> str:
    if not url:
        return ""
    url = _unwrap_duckduckgo_url(url)
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    query = parse_qs(parsed.query, keep_blank_values=True)
    drop_prefixes = ("utm_",)
    drop_keys = {"fbclid", "gclid", "si", "feature"}
    kept = {
        key: values for key, values in query.items()
        if key not in drop_keys and not any(key.startswith(prefix) for prefix in drop_prefixes)
    }
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc.lower(),
            parsed.path.rstrip("/") or "/",
            "",
            urlencode(kept, doseq=True),
            "",
        )
    )


def _unwrap_duckduckgo_url(url: str) -> str:
    parsed = urlparse(url)
    if "duckduckgo.com" not in parsed.netloc:
        return url
    qs = parse_qs(parsed.query)
    if "uddg" in qs and qs["uddg"]:
        return unquote(qs["uddg"][0])
    return url


class _DuckDuckGoHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results: list[SearchResult] = []
        self._in_link = False
        self._in_snippet = False
        self._current_href = ""
        self._current_title: list[str] = []
        self._current_snippet: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        classes = attrs_dict.get("class", "")
        if tag == "a" and "result__a" in classes:
            self._in_link = True
            self._current_href = attrs_dict.get("href", "")
            self._current_title = []
            self._current_snippet = []
        elif "result__snippet" in classes:
            self._in_snippet = True

    def handle_endtag(self, tag):
        if tag == "a" and self._in_link:
            self._in_link = False
            title = _clean_text("".join(self._current_title))
            url = normalise_candidate_url(self._current_href)
            if title and url:
                self.results.append(SearchResult(title=title, url=url))
        elif self._in_snippet and tag in {"a", "div"}:
            self._in_snippet = False
            if self.results:
                self.results[-1].snippet = _clean_text("".join(self._current_snippet))

    def handle_data(self, data):
        if self._in_link:
            self._current_title.append(data)
        elif self._in_snippet:
            self._current_snippet.append(data)


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()
