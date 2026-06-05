from __future__ import annotations

import httpx

from ..config import Config


def _control_headers(token: str = "") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"} if token else {}


def unload_model_via_control(
    control_url: str,
    model: str,
    *,
    token: str = "",
    timeout: int = 30,
) -> bool:
    response = httpx.post(
        f"{control_url.rstrip('/')}/unload",
        json={"model": model},
        headers=_control_headers(token),
        timeout=timeout,
    )
    response.raise_for_status()
    return bool(response.json().get("ok"))


def unload_model(base_url: str, model: str, timeout: int = 30) -> bool:
    response = httpx.post(
        f"{base_url.rstrip('/')}/api/generate",
        json={"model": model, "keep_alive": 0},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json().get("done_reason") == "unload"


def unload_litelm_embedding(config: Config) -> bool:
    if config.mac_studio_model_control_url:
        return unload_model_via_control(
            config.mac_studio_model_control_url,
            config.litelm_ollama_embedding_model,
            token=config.mac_studio_model_control_token,
        )
    if not config.litelm_ollama_base_url or "<" in config.litelm_ollama_base_url:
        return False
    # LiteLLM exposes aliases; Ollama unloads require the backing Ollama model name.
    return unload_model(
        config.litelm_ollama_base_url,
        config.litelm_ollama_embedding_model,
    )


def unload_litelm_analysis(config: Config, llm: str) -> bool:
    if llm == "litelm-heavy":
        model = config.litelm_ollama_analysis_model_heavy
    elif llm == "litelm-reasoning":
        model = config.litelm_ollama_analysis_model_reasoning
    else:
        model = config.litelm_ollama_analysis_model
    if config.mac_studio_model_control_url:
        return unload_model_via_control(
            config.mac_studio_model_control_url,
            model,
            token=config.mac_studio_model_control_token,
        )
    if not config.litelm_ollama_base_url or "<" in config.litelm_ollama_base_url:
        return False
    return unload_model(config.litelm_ollama_base_url, model)


def unload_litelm_enrichment(config: Config, model_alias: str = "") -> bool:
    """Unload the Ollama backing model for a LiteLLM enrichment alias.

    LiteLLM routes by alias, but Ollama unloads by concrete model name.  The
    enrichment aliases used in this project currently map to the same backing
    families as the analysis aliases, so keep the mapping conservative and
    explicit enough for Mac Studio RAM management.
    """
    alias = (model_alias or config.litelm_enrichment_model or "").lower()
    if "gemma" in alias:
        model = config.litelm_ollama_analysis_model_heavy
    elif "reason" in alias or "review-qwen" in alias:
        model = config.litelm_ollama_analysis_model_reasoning
    else:
        model = config.litelm_ollama_analysis_model
    if config.mac_studio_model_control_url:
        return unload_model_via_control(
            config.mac_studio_model_control_url,
            model,
            token=config.mac_studio_model_control_token,
        )
    if not config.litelm_ollama_base_url or "<" in config.litelm_ollama_base_url:
        return False
    return unload_model(config.litelm_ollama_base_url, model)
