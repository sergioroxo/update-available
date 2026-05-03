"""
Stage 0.5 — Document triage.

Runs a fast model on a short snippet (first 3 000 chars) to recommend which
analysis model to use. Called when --triage flag is passed to `runner ingest`.

Model routing:
  Mac Studio available  → "triage" LiteLLM alias (gemma4:e4b-it)
  Mac Studio unavailable → local qwen3.5:9b fallback
  Both fail             → return safe default (litelm / moderate)
"""
from __future__ import annotations
import json
import re
from pathlib import Path

try:
    from runner.config import Config
    from runner.models.triage import TriageResult
except ImportError:
    from ..config import Config
    from ..models.triage import TriageResult

_SNIPPET_CHARS = 3_000

_SYSTEM_PROMPT = """\
You are a document routing assistant for the SurvivingSOGICE research archive.
You receive a short snippet from an unclassified document and must quickly decide
which analysis model to route it to.

Output ONLY valid JSON — no prose, no markdown fences. Start with { and end with }.

Schema:
{
  "doc_type_hint": "promotional|policy|legal|academic|testimony|news|media|unknown",
  "languages": ["en"],
  "complexity": "simple|moderate|complex",
  "estimated_tokens": 5000,
  "recommended_llm": "litelm|litelm-heavy|litelm-reasoning|claude|local",
  "routing_reason": "one-sentence explanation"
}

Routing rules:
- litelm-heavy   : document is clearly long (book, transcript, multi-section report),
                   or complexity=complex
- litelm-reasoning : SOGICE relevance is ambiguous, or requires careful evidence weighing
- claude         : official court judgments, legislative submissions, government policy
                   (high accuracy matters more than speed)
- litelm         : everything else — promotional web content, NGO articles, press releases
- local          : only if litelm unavailable and document is short/simple
"""


def extract_snippet(source: str, max_chars: int = _SNIPPET_CHARS) -> tuple[str, str]:
    """Extract a triage snippet from a URL or local file.

    URL triage should see readable article text, not raw HTML or a short bot
    response. Prefer the same Trafilatura path used by preprocessing, then fall
    back to a direct HTTP body only as a last resort.
    """
    if source.startswith(("http://", "https://")):
        try:
            from runner.pipeline.preprocess import _preprocess_url
        except ImportError:
            from .preprocess import _preprocess_url

        try:
            result = _preprocess_url(source)
            if result.text.strip():
                return result.text[:max_chars], (
                    f"Extracted {len(result.text)} chars with {result.tool_used}"
                    f" (quality: {result.quality})"
                )
        except Exception as exc:
            fallback_note = f"Trafilatura extraction failed: {exc}"
        else:
            fallback_note = "Trafilatura extraction returned no readable text"

        try:
            import httpx
            response = httpx.get(source, timeout=15, follow_redirects=True)
            text = response.text.strip()
            return text[:max_chars], f"{fallback_note}; fetched {len(text)} raw HTML chars"
        except Exception as exc:
            raise RuntimeError(f"{fallback_note}; direct fetch failed: {exc}") from exc

    text = Path(source).read_text(encoding="utf-8", errors="ignore")
    return text[:max_chars], f"Read {len(text)} chars from local file"


def run(text: str, config: Config) -> TriageResult:
    """Triage a document snippet. Never raises — returns a safe default on failure."""
    user_msg = (
        "Document snippet:\n\n"
        + text[:_SNIPPET_CHARS]
        + "\n\n---\nOutput JSON only."
    )

    raw: str | None = None

    if config.litelm_base_url:
        try:
            raw = _call_litelm(user_msg, config)
        except Exception:
            pass

    if raw is None:
        try:
            raw = _call_ollama(user_msg, config)
        except Exception:
            return TriageResult()

    return _parse(raw)


def _call_litelm(user_msg: str, config: Config) -> str:
    import httpx
    r = httpx.post(
        f"{config.litelm_base_url}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {config.litelm_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "triage",
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            "temperature": 0.0,
            "max_tokens": 256,
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def _call_ollama(user_msg: str, config: Config) -> str:
    import httpx
    r = httpx.post(
        f"{config.ollama_base_url}/api/chat",
        json={
            "model": config.local_analysis_model,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            "stream": False,
            "format": "json",
            "think": False,
            "options": {"temperature": 0.0, "num_ctx": 4096, "num_predict": 256},
        },
        timeout=120,
    )
    r.raise_for_status()
    msg = r.json()["message"]
    return msg.get("content", "").strip() or msg.get("thinking", "")


def _parse(raw: str) -> TriageResult:
    text = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return TriageResult()
    try:
        return TriageResult.model_validate(json.loads(m.group(0)))
    except Exception:
        return TriageResult()
