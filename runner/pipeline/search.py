"""Semantic search across the ingested corpus via Supabase pgvector.

Usage:
    python -m runner search "conversion therapy Belgium 2019"
    python -m runner search "pastoral coercion" --top-k 5 --type Anti-SOGICE

Note: search_corpus requires a live Supabase connection and a running embedding
endpoint (Ollama local or LiteLLM proxy). Integration tests should be run
manually against a real environment; they are not included in the automated
test suite.
"""
from __future__ import annotations
from pathlib import Path
import json
from typing import Optional

from ..config import Config


def search_corpus(
    query_text: str,
    config: Config,
    top_k: int = 10,
    doc_type: str = "",
    scope: str = "",
    tier: str = "",
    llm_mode: str = "litelm",
) -> list[dict]:
    """Embed query_text and return top-k similar corpus documents.

    Each result includes: doc_id, similarity, type, scope, tier, source, title, summary.
    """
    from .embed import run_litelm, run
    from ..clients.supabase import search_similar

    # Embed the query
    try:
        if llm_mode.startswith("litelm"):
            query_vector = run_litelm(query_text, config)
        else:
            query_vector = run(query_text, config)
    except Exception as exc:
        raise RuntimeError(f"Could not embed query: {exc}") from exc

    # Search Supabase
    hits = search_similar(query_vector, config, top_k=top_k,
                          doc_type=doc_type, scope=scope, tier=tier)

    # Enrich with local corpus metadata
    results = []
    for hit in hits:
        doc_id = hit.get("doc_id", "")
        doc_dir = config.corpus_dir / doc_id
        extra = {"doc_id": doc_id, "similarity": hit.get("similarity", 0.0)}

        intake_path = doc_dir / "intake.json"
        if intake_path.exists():
            try:
                intake = json.loads(intake_path.read_text())
                extra["source"] = intake.get("source", "")
                extra["tier"] = intake.get("tier", hit.get("tier", ""))
            except Exception:
                pass

        analysis_path = doc_dir / "analysis.json"
        if analysis_path.exists():
            try:
                analysis = json.loads(analysis_path.read_text())
                extra["type"] = analysis.get("type", hit.get("doc_type", ""))
                extra["scope"] = analysis.get("scope", hit.get("scope", ""))
                extra["summary"] = analysis.get("summary", "")[:200]
                extra["languages"] = analysis.get("languages", [])
                extra["confidence"] = analysis.get("confidence", {}).get("overall_score", 0)
            except Exception:
                pass

        preprocess_path = doc_dir / "preprocess.json"
        if preprocess_path.exists():
            try:
                prep = json.loads(preprocess_path.read_text())
                extra["title"] = prep.get("title", "")
                extra["date_published"] = prep.get("date_published", "")
            except Exception:
                pass

        results.append(extra)

    return results
