"""
Stage 3a — Embedding generation.

Uses qwen3-embedding:8b via Ollama (confirmed: 4096d output).
Direct REST call — no library version dependency.
Writes embedding.json to the local corpus directory.

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
    """Embed a short test string and return the vector dimension.
    Called by `runner embed-test` to resolve Q22.
    Does not require API keys — only needs Ollama running locally."""
    vector = _call(ollama_base_url, model, "SurvivingSOGICE embedding dimension test.")
    return len(vector)


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
