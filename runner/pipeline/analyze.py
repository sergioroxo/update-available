"""
Stage 3b — LLM analysis.

Builds the ingestion-v3.3 prompt, calls Claude or Ollama, validates the JSON
response with Pydantic, and writes analysis.json to the local corpus directory.

LLM routing (controlled by --llm flag):
  claude          → Anthropic API only (gold standard)
  local           → Ollama LOCAL_ANALYSIS_MODEL (qwen3.5:9b — everyday default)
  local-heavy     → Ollama LOCAL_ANALYSIS_MODEL_HEAVY (gemma-4-26B — long/complex docs)
  local-reasoning → Ollama LOCAL_ANALYSIS_MODEL_REASONING (Ministral — ambiguous docs)
  openrouter      → OpenRouter API (set OPENROUTER_MODEL in .env)
  both            → run both Claude + local, review.py shows diff at Checkpoint 3
  prefer-local    → Ollama first, Claude fallback on low confidence or error
  prefer-claude   → Claude first, Ollama fallback on API failure
"""
from __future__ import annotations
import json
import re
from pathlib import Path

from ..config import Config
from ..models.document import AnalysisResult, PreprocessResult

PROMPT_VERSION = "ingestion-v3.3"

_PROMPT_FILE = (
    Path(__file__).parents[2]
    / "02_working_tools"
    / "Claude_Ingestion_Prompt.md"
)

# Cached at module level after first load
_SYSTEM_PROMPT: str | None = None


def _load_system_prompt() -> str:
    global _SYSTEM_PROMPT
    if _SYSTEM_PROMPT is None:
        raw = _PROMPT_FILE.read_text(encoding="utf-8")
        # Extract text between first ``` block after "## SYSTEM PROMPT"
        match = re.search(r"## SYSTEM PROMPT\s*\n```\n(.*?)```", raw, re.DOTALL)
        if not match:
            raise RuntimeError(f"Cannot parse system prompt from {_PROMPT_FILE}")
        _SYSTEM_PROMPT = match.group(1).strip()
    return _SYSTEM_PROMPT


def run(
    preprocess: PreprocessResult,
    llm: str,
    config: Config,
) -> AnalysisResult:
    if llm == "claude":
        return _analyze_with_claude(preprocess, config)
    if llm == "local":
        return _analyze_with_ollama(preprocess, config, config.local_analysis_model)
    if llm == "local-heavy":
        return _analyze_with_ollama(preprocess, config, config.local_analysis_model_heavy)
    if llm == "local-reasoning":
        return _analyze_with_ollama(preprocess, config, config.local_analysis_model_reasoning)
    if llm == "litelm":
        return _analyze_with_litelm(preprocess, config, config.litelm_analysis_model)
    if llm == "litelm-heavy":
        return _analyze_with_litelm(preprocess, config, config.litelm_analysis_model_heavy)
    if llm == "litelm-reasoning":
        return _analyze_with_litelm(preprocess, config, config.litelm_analysis_model_reasoning)
    if llm == "openrouter":
        return _analyze_with_openrouter(preprocess, config)
    if llm == "both":
        claude_result = _analyze_with_claude(preprocess, config)
        local_result  = _analyze_with_ollama(preprocess, config, config.local_analysis_model)
        return _merge_for_review(claude_result, local_result)
    if llm == "prefer-local":
        try:
            result = _analyze_with_ollama(preprocess, config, config.local_analysis_model)
            if result.confidence.status == "low":
                return _analyze_with_claude(preprocess, config)
            return result
        except Exception:
            return _analyze_with_claude(preprocess, config)
    if llm == "prefer-claude":
        try:
            return _analyze_with_claude(preprocess, config)
        except Exception:
            return _analyze_with_ollama(preprocess, config, config.local_analysis_model)
    raise ValueError(f"Unknown LLM option: {llm!r}")


def _analyze_with_claude(preprocess: PreprocessResult, config: Config) -> AnalysisResult:
    import anthropic
    client = anthropic.Anthropic(api_key=config.anthropic_api_key)
    static_prompt, dynamic_prompt = _build_system_prompt_with_lexicon(
        config, split_for_claude=True
    )
    user_message  = _build_user_message(preprocess)

    response = client.messages.create(
        model=config.claude_model,
        max_tokens=4096,
        system=[
            {
                "type": "text",
                "text": static_prompt,
                "cache_control": {"type": "ephemeral"},
            },
            {"type": "text", "text": dynamic_prompt},
        ],
        messages=[{"role": "user", "content": user_message}],
    )
    raw_json = response.content[0].text
    return _validate_response(raw_json)


def _analyze_with_ollama(preprocess: PreprocessResult, config: Config, model: str) -> AnalysisResult:
    import httpx
    system_prompt = _build_system_prompt_with_lexicon(config)
    user_message  = _build_user_message(preprocess)

    response = httpx.post(
        f"{config.ollama_base_url}/api/chat",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "stream": False,
            "format": "json",   # constrained decoding — forces valid JSON output
            "think": False,     # disable thinking mode — 9B models exhaust tokens reasoning in prose
            "options": {
                "temperature": 0.1,
                "num_ctx": 32768,  # Qwen3's actual context window (16k was our own cap)
                "num_predict": 8192,
            },
        },
        timeout=300,
    )
    response.raise_for_status()
    msg = response.json()["message"]
    # Qwen3 thinking models: content holds the response, thinking holds the reasoning.
    # If content is empty the model only thought and forgot to output — fall back to
    # extracting JSON from the thinking field itself.
    raw_json = msg.get("content", "").strip() or msg.get("thinking", "")
    if not raw_json:
        raise ValueError(
            f"Ollama returned empty response. Message keys: {list(msg.keys())}"
        )
    return _validate_response(raw_json)


def _analyze_with_litelm(preprocess: PreprocessResult, config: Config, model: str) -> AnalysisResult:
    import httpx
    system_prompt = _build_system_prompt_with_lexicon(config)
    user_message  = _build_user_message(preprocess)

    response = httpx.post(
        f"{config.litelm_base_url}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {config.litelm_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "temperature": 0.1,
            "max_tokens": 8192,
        },
        timeout=600,
    )
    response.raise_for_status()
    raw_json = response.json()["choices"][0]["message"]["content"]
    return _validate_response(raw_json)


def _analyze_with_openrouter(preprocess: PreprocessResult, config: Config) -> AnalysisResult:
    import httpx
    if not config.openrouter_api_key:
        raise EnvironmentError(
            "OPENROUTER_API_KEY is not set in runner/.env\n"
            "Get a free key at https://openrouter.ai — no credit card required."
        )
    system_prompt = _build_system_prompt_with_lexicon(config)
    user_message  = _build_user_message(preprocess)

    response = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {config.openrouter_api_key}",
            "HTTP-Referer":  "https://github.com/sergioroxo/surviving-sogice-ingest",
            "X-Title":       "SurvivingSOGICE",
            "Content-Type":  "application/json",
        },
        json={
            "model": config.openrouter_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "temperature": 0.1,
        },
        timeout=300,
    )
    response.raise_for_status()
    raw_json = response.json()["choices"][0]["message"]["content"]
    return _validate_response(raw_json)


def _build_system_prompt_with_lexicon(
    config: Config,
    split_for_claude: bool = False,
) -> str | tuple[str, str]:
    base = _load_system_prompt()
    try:
        terms = _fetch_active_lexicon_terms(config)
    except Exception:
        terms = []

    if not terms:
        return (base, "") if split_for_claude else base

    term_lines = "\n".join(_format_lexicon_prompt_line(t) for t in terms)
    lexicon_injection = (
        f"\n\nCURRENT LEXICON TERMS (do not propose these as candidates):\n{term_lines}"
    )
    if split_for_claude:
        return base, lexicon_injection
    return base + lexicon_injection


def _build_user_message(preprocess: PreprocessResult) -> str:
    lines = [
        f"DOCUMENT ID: {preprocess.doc_id}",
        f"PREPROCESSING QUALITY: {preprocess.quality}",
        f"LANGUAGE (if known): {preprocess.language_detected or 'unknown'}",
    ]
    if preprocess.title:
        lines.append(f"TITLE: {preprocess.title}")
    if preprocess.sitename:
        lines.append(f"PUBLISHER / SITE NAME: {preprocess.sitename}")
    if preprocess.hostname:
        lines.append(f"DOMAIN: {preprocess.hostname}")
    if preprocess.author:
        lines.append(f"AUTHOR: {preprocess.author}")
    if preprocess.date_published:
        lines.append(f"DATE PUBLISHED: {preprocess.date_published}")
    if preprocess.description:
        lines.append(f"PAGE DESCRIPTION: {preprocess.description}")

    intel = preprocess.page_intel
    if intel:
        if intel.categories:
            lines.append(f"SITE CATEGORIES: {', '.join(intel.categories)}")
        if intel.tags:
            lines.append(f"SITE TAGS / TOPICS: {', '.join(intel.tags[:15])}")
        if intel.keywords:
            lines.append(f"META KEYWORDS: {', '.join(intel.keywords[:10])}")
        if intel.social_profiles:
            profiles = ", ".join(
                f"{p['platform']}:{p['handle']}" if p.get("handle") else p["platform"]
                for p in intel.social_profiles
            )
            lines.append(f"SOCIAL MEDIA PROFILES ON PAGE: {profiles}")
        if intel.document_links:
            doc_lines = "; ".join(
                f"{d['file_type'].upper()}: \"{d['anchor_text']}\" → {d['url']}"
                for d in intel.document_links[:8]
            )
            lines.append(f"LINKED DOCUMENTS ({len(intel.document_links)} total): {doc_lines}")
        if intel.media_embeds:
            embeds = "; ".join(
                f"{e['platform']} id={e['id']} title=\"{e.get('title','')}\""
                for e in intel.media_embeds[:5]
            )
            lines.append(f"EMBEDDED MEDIA: {embeds}")
        if intel.emails:
            lines.append(f"CONTACT EMAILS ON PAGE: {', '.join(intel.emails[:5])}")
        if intel.json_ld:
            # Summarise org/person/event JSON-LD for the LLM
            for obj in intel.json_ld[:3]:
                if isinstance(obj, dict):
                    t = obj.get("@type", "")
                    name = obj.get("name", "")
                    if t and name:
                        lines.append(f"STRUCTURED DATA ({t}): {name}")
        if preprocess.outbound_links:
            domains = list(dict.fromkeys(
                lnk["domain"] for lnk in preprocess.outbound_links if lnk["domain"]
            ))[:20]
            lines.append(
                f"OUTBOUND DOMAINS ({len(preprocess.outbound_links)} links): {', '.join(domains)}"
            )

    return "\n".join(lines) + "\n\n---\n\nDOCUMENT TEXT:\n" + preprocess.text + "\n\n---\n\nOutput ONLY a valid JSON object. Start with { and end with }. No explanation, no prose, no markdown fences."


def _fetch_active_lexicon_terms(config: Config) -> list[dict]:
    """GROQ query for draft + validated lexicon terms via Sanity Content API."""
    import httpx
    query = (
        '*[_type == "lexiconEntry" && status in ["draft","validated"]]'
        '{ term, proposedCluster, function, multilingualVariants }'
    )
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    headers = {"Authorization": f"Bearer {config.sanity_write_token}"}
    r = httpx.get(url, params={"query": query}, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json().get("result", [])


def _format_lexicon_prompt_line(term: dict) -> str:
    variants = term.get("multilingualVariants") or []
    variant_text = ", ".join(
        f"{v.get('variantTerm')}[{v.get('language', 'unknown')}]"
        for v in variants[:12]
        if v.get("variantTerm")
    )
    suffix = f"; variants: {variant_text}" if variant_text else ""
    return f"- {term['term']} ({term.get('proposedCluster', '')}, function={term.get('function', '')}{suffix})"


def _validate_response(raw_json: str) -> AnalysisResult:
    """Extract and validate JSON from LLM response, handling think tags and markdown fences."""
    original = raw_json.strip()
    last_error: Exception | None = None

    def _try_extract(text: str) -> AnalysisResult | None:
        nonlocal last_error
        text = re.sub(r"^```(?:json)?\s*", "", text.strip())
        text = re.sub(r"\s*```$", "", text.strip())
        # Use brace-counting to find the first COMPLETE JSON object, not greedy
        # regex (which matches to the last } and breaks on truncated responses)
        candidate = _extract_first_json_object(text)
        if not candidate:
            return None
        try:
            return AnalysisResult.model_validate(json.loads(candidate))
        except Exception as exc:
            last_error = exc
            return None

    # 1. Try content outside think tags (normal case)
    outside = re.sub(r"<think>.*?</think>", "", original, flags=re.DOTALL).strip()
    result = _try_extract(outside)
    if result:
        return result

    # 2. Try content inside think tags (model embedded JSON in its reasoning)
    inside_blocks = re.findall(r"<think>(.*?)</think>", original, re.DOTALL)
    for block in inside_blocks:
        result = _try_extract(block)
        if result:
            return result

    # 3. Try the raw text with no tag stripping (non-thinking model)
    result = _try_extract(original)
    if result:
        return result

    # Detect likely truncation: response starts with { but never closes
    stripped = re.sub(r"<think>.*?</think>", "", original, flags=re.DOTALL).strip()
    looks_truncated = stripped.startswith("{") and not stripped.rstrip().endswith("}")
    hint = (
        "\nResponse looks truncated (starts with { but no closing }). "
        "If using LiteLLM, add max_tokens: 8192 to each model in config.yaml."
    ) if looks_truncated else ""

    validation_detail = f"\nValidation error: {last_error}" if last_error else ""

    raise ValueError(
        f"Could not extract valid JSON from model response.{hint}{validation_detail}\n"
        f"Raw response (first 2000 chars): {original[:2000]}"
    )


def _extract_first_json_object(text: str) -> str | None:
    """Return the first complete JSON object from text using brace counting.
    More robust than a greedy regex: stops at the matching closing brace rather
    than the last } in the string, so truncated responses don't produce
    partial matches that look like valid JSON."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape_next = False
    for i, ch in enumerate(text[start:], start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None  # JSON object not closed — response truncated


def _merge_for_review(claude: AnalysisResult, local: AnalysisResult) -> AnalysisResult:
    """When --llm both is used, return Claude's result but store local result
    in a private attribute so review.py can show a diff at Checkpoint 3."""
    object.__setattr__(claude, "_local_comparison", local)
    return claude


def save(doc_id: str, result: AnalysisResult, config: Config) -> None:
    doc_dir = config.corpus_dir / doc_id
    (doc_dir / "analysis.json").write_text(
        result.model_dump_json(indent=2), encoding="utf-8"
    )
