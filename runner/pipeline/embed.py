"""
Stage 3a — Embedding generation.

Uses qwen3-embedding:8b via Ollama by default (direct REST call, no library
version dependency). Writes embedding.json to the local corpus directory.

IMPORTANT: Run `python -m runner embed-test` before Phase 0-B to verify the
output dimension of qwen3-embedding:8b. Record the result in CLAUDE.md (Q22).
The Supabase vector column dimension must match exactly.

Ollama API note: Ollama 0.4+ uses POST /api/embed (input=, returns embeddings[])
instead of the older POST /api/embeddings (prompt=, returns embedding).
"""
from __future__ import annotations
import json

import httpx

from ..config import Config

_TIMEOUT = 120  # seconds — embedding a long document can be slow on first run


def _call(ollama_base_url: str, model: str, text: str) -> list[float]:
    """Call Ollama embed API. Tries the current endpoint first, falls back to legacy."""
    try:
        response = httpx.post(
            f"{ollama_base_url}/api/embed",
            json={"model": model, "input": text, "keep_alive": 0},
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        # /api/embed returns {"embeddings": [[...floats...]]}
        return data["embeddings"][0]
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code != 404:
            raise
    # Legacy endpoint fallback (Ollama < 0.4)
    response = httpx.post(
        f"{ollama_base_url}/api/embeddings",
        json={"model": model, "prompt": text, "keep_alive": 0},
        timeout=_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()["embedding"]


def run(text: str, config: Config) -> list[float]:
    """Generate embedding vector for the given text via Ollama REST API."""
    return _call(config.ollama_base_url, config.embedding_model, text)


def run_litelm(text: str, config: Config) -> list[float]:
    """Generate embedding via LiteLLM proxy (OpenAI-compatible /v1/embeddings)."""
    response = httpx.post(
        f"{config.litelm_base_url}/v1/embeddings",
        headers={
            "Authorization": f"Bearer {config.litelm_api_key}",
            "Content-Type": "application/json",
        },
        json={"model": config.litelm_embedding_model, "input": text},
        timeout=_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()["data"][0]["embedding"]


def test_dimension(ollama_base_url: str, model: str) -> int:
    """Embed a short test string via local Ollama and return the vector dimension."""
    vector = _call(ollama_base_url, model, "SurvivingSOGICE embedding dimension test.")
    return len(vector)


def test_dimension_litelm(litelm_base_url: str, model: str) -> int:
    """Embed a short test string via LiteLLM proxy (Mac Studio) and return the vector dimension."""
    import os
    api_key = os.getenv("LITELM_API_KEY", "sk-dummy")
    response = httpx.post(
        f"{litelm_base_url}/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": model, "input": "SurvivingSOGICE embedding dimension test."},
        timeout=_TIMEOUT,
    )
    response.raise_for_status()
    return len(response.json()["data"][0]["embedding"])


def save(doc_id: str, vector: list[float], config: Config) -> None:
    doc_dir = config.corpus_dir / doc_id
    payload = {
        "doc_id": doc_id,
        "model": config.embedding_model,
        "dimension": len(vector),
        "vector": vector,
    }
    (doc_dir / "embedding.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
