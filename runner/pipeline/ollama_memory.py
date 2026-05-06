from __future__ import annotations

import httpx

from ..config import Config


def unload_model(base_url: str, model: str, timeout: int = 30) -> bool:
    response = httpx.post(
        f"{base_url.rstrip('/')}/api/generate",
        json={"model": model, "keep_alive": 0},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json().get("done_reason") == "unload"


def unload_litelm_embedding(config: Config) -> bool:
    if not config.litelm_ollama_base_url or "<" in config.litelm_ollama_base_url:
        return False
    # LiteLLM exposes aliases; Ollama unloads require the backing Ollama model name.
    return unload_model(
        config.litelm_ollama_base_url,
        config.litelm_ollama_embedding_model,
    )
