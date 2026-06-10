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
from dataclasses import dataclass
import json
import re
import time
from pathlib import Path

from ..config import Config
from ..models.document import AnalysisResult, PreprocessResult
from .audit import current_git_commit, sha256_text
from .http_retry import call_with_http_retries
from .sanity_reads import fetch_analysis_orientation_terms

PROMPT_VERSION = "ingestion-v3.3"


@dataclass
class DualAnalysisResult:
    """Returned by analyze.run() when --llm both is used.

    Replaces the former ``object.__setattr__`` hack that stashed the local
    result as a hidden attribute on the Claude AnalysisResult.  Callers that
    only need the primary result should check::

        primary = result.primary if isinstance(result, DualAnalysisResult) else result
    """
    primary: AnalysisResult       # Claude result (authoritative)
    comparison: AnalysisResult    # Local-model result (for diff display only)


def enrich_preprocess_from_intake(preprocess: PreprocessResult, intake_path: Path) -> None:
    """Populate intake context fields on a PreprocessResult from a saved intake.json.

    Mutates preprocess in-place. Safe to call even if the file does not exist.
    """
    try:
        intake_data = json.loads(intake_path.read_text(encoding="utf-8"))
    except Exception:
        return
    preprocess.intake_declared_type = intake_data.get("declared_type") or None
    preprocess.intake_batch_id = intake_data.get("batch_id") or None
    preprocess.intake_source_url = intake_data.get("source_url") or None

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
    *,
    _audit: dict | None = None,
) -> AnalysisResult:
    _started = time.perf_counter()
    if _audit is not None:
        _audit["llm_flag"] = llm
        _audit.setdefault("errors", [])
        _audit["git_commit"] = current_git_commit()
    try:
        if llm == "claude":
            return _analyze_with_claude(preprocess, config, _audit=_audit)
        if llm == "local":
            return _analyze_with_ollama(preprocess, config, config.local_analysis_model, _audit=_audit)
        if llm == "local-heavy":
            return _analyze_with_ollama(preprocess, config, config.local_analysis_model_heavy, _audit=_audit)
        if llm == "local-reasoning":
            return _analyze_with_ollama(preprocess, config, config.local_analysis_model_reasoning, _audit=_audit)
        if llm == "litelm":
            return _analyze_with_litelm(preprocess, config, config.litelm_analysis_model, _audit=_audit)
        if llm == "litelm-heavy":
            return _analyze_with_litelm(preprocess, config, config.litelm_analysis_model_heavy, _audit=_audit)
        if llm == "litelm-reasoning":
            return _analyze_with_litelm(preprocess, config, config.litelm_analysis_model_reasoning, _audit=_audit)
        if llm == "openrouter":
            return _analyze_with_openrouter(preprocess, config, _audit=_audit)
        if llm == "both":
            # Thread _audit to the primary (Claude) result only; comparison run is display-only.
            claude_result = _analyze_with_claude(preprocess, config, _audit=_audit)
            local_result  = _analyze_with_ollama(preprocess, config, config.local_analysis_model)
            return DualAnalysisResult(primary=claude_result, comparison=local_result)
        if llm == "prefer-local":
            try:
                result = _analyze_with_ollama(preprocess, config, config.local_analysis_model, _audit=_audit)
                if result.confidence.status == "low":
                    return _analyze_with_claude(preprocess, config, _audit=_audit)
                return result
            except Exception as exc:
                if _audit is not None:
                    _audit.setdefault("errors", []).append(f"prefer-local primary failed: {exc}")
                return _analyze_with_claude(preprocess, config, _audit=_audit)
        if llm == "prefer-claude":
            try:
                return _analyze_with_claude(preprocess, config, _audit=_audit)
            except Exception as exc:
                if _audit is not None:
                    _audit.setdefault("errors", []).append(f"prefer-claude primary failed: {exc}")
                return _analyze_with_ollama(preprocess, config, config.local_analysis_model, _audit=_audit)
        raise ValueError(f"Unknown LLM option: {llm!r}")
    finally:
        if _audit is not None:
            _audit["duration_ms"] = int((time.perf_counter() - _started) * 1000)


def _postfill_locale_fields(result: AnalysisResult, preprocess: PreprocessResult) -> AnalysisResult:
    """Fill empty ``languages``/``country`` from the page locale when the model
    left them blank. Deterministic (og:locale / <html lang>), researcher-reviewed,
    and recorded as a normalisation warning so provenance shows it was derived.
    Never overrides values the model already produced."""
    intel = preprocess.page_intel
    if intel is None:
        return result
    locale = getattr(intel, "og_locale", "") or getattr(intel, "html_lang", "")
    if not locale:
        return result
    from ..models.document import language_country_from_locale
    lang, country = language_country_from_locale(locale)
    notes: list[str] = []
    if lang and not result.languages:
        result.languages = [lang]
        notes.append(f"languages derived from page locale '{locale}' → ['{lang}']")
    if country and not result.country:
        result.country = [country]
        notes.append(f"country derived from page locale '{locale}' → ['{country}']")
    if notes:
        result.normalisation_warnings = list(result.normalisation_warnings) + [
            "locale-fill: " + "; ".join(notes)
        ]
    return result


def _analyze_with_claude(preprocess: PreprocessResult, config: Config, *, _audit: dict | None = None) -> AnalysisResult:
    import anthropic
    client = anthropic.Anthropic(api_key=config.anthropic_api_key)
    static_prompt, dynamic_prompt = _build_system_prompt_with_lexicon(
        config, split_for_claude=True, _audit=_audit
    )
    user_message  = _build_user_message(preprocess)

    if _audit is not None:
        _audit["model"] = config.claude_model
        _audit["input_char_count"] = len(preprocess.text)
        _audit["input_truncated"] = preprocess.truncated
        _audit["prompt_sha256"] = sha256_text(static_prompt + dynamic_prompt)
        _audit["prompt_template_sha256"] = sha256_text(static_prompt)
        _audit["model_parameters"] = {
            "max_tokens": config.claude_output_tokens,
            "system_cache_control": "ephemeral",
        }

    response = client.messages.create(
        model=config.claude_model,
        max_tokens=config.claude_output_tokens,
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
    if _audit is not None:
        _audit["raw_response_chars"] = len(raw_json)
    return _postfill_locale_fields(_validate_response(raw_json, _audit=_audit), preprocess)


def _analyze_with_ollama(preprocess: PreprocessResult, config: Config, model: str, *, _audit: dict | None = None) -> AnalysisResult:
    import httpx
    system_prompt = _build_system_prompt_with_lexicon(config, _audit=_audit)
    user_message  = _build_user_message(preprocess)

    if _audit is not None:
        _audit["model"] = model
        _audit["input_char_count"] = len(preprocess.text)
        _audit["input_truncated"] = preprocess.truncated
        _audit["prompt_sha256"] = sha256_text(system_prompt)
        _audit["prompt_template_sha256"] = sha256_text(_load_system_prompt())
        _audit["model_parameters"] = {
            "temperature": 0.1,
            "num_ctx": config.local_context_tokens,
            "num_predict": config.local_output_tokens,
            "format": "json",
            "think": False,
        }

    response = call_with_http_retries(lambda: httpx.post(
        f"{config.ollama_base_url}/api/chat",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "stream": False,
            "keep_alive": 0,
            "format": "json",   # constrained decoding — forces valid JSON output
            "think": False,     # disable thinking mode — 9B models exhaust tokens reasoning in prose
            "options": {
                "temperature": 0.1,
                "num_ctx": config.local_context_tokens,
                "num_predict": config.local_output_tokens,
            },
        },
        timeout=300,
    ))
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
    if _audit is not None:
        _audit["raw_response_chars"] = len(raw_json)
    return _postfill_locale_fields(_validate_response(raw_json, _audit=_audit), preprocess)


def _analyze_with_litelm(preprocess: PreprocessResult, config: Config, model: str, *, _audit: dict | None = None) -> AnalysisResult:
    import httpx
    system_prompt = _build_system_prompt_with_lexicon(config, _audit=_audit)
    user_message  = _build_user_message(preprocess)

    if _audit is not None:
        _audit["model"] = model
        _audit["input_char_count"] = len(preprocess.text)
        _audit["input_truncated"] = preprocess.truncated
        _audit["prompt_sha256"] = sha256_text(system_prompt)
        _audit["prompt_template_sha256"] = sha256_text(_load_system_prompt())
        _audit["model_parameters"] = {
            "temperature": 0.1,
            "max_tokens": config.local_output_tokens,
        }

    response = call_with_http_retries(lambda: httpx.post(
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
            "max_tokens": config.local_output_tokens,
        },
        timeout=600,
    ))
    response.raise_for_status()
    raw_json = response.json()["choices"][0]["message"]["content"]
    if _audit is not None:
        _audit["raw_response_chars"] = len(raw_json)
    return _postfill_locale_fields(_validate_response(raw_json, _audit=_audit), preprocess)


def _analyze_with_openrouter(preprocess: PreprocessResult, config: Config, *, _audit: dict | None = None) -> AnalysisResult:
    import httpx
    if not config.openrouter_api_key:
        raise EnvironmentError(
            "OPENROUTER_API_KEY is not set in runner/.env\n"
            "Get a free key at https://openrouter.ai — no credit card required."
        )
    system_prompt = _build_system_prompt_with_lexicon(config, _audit=_audit)
    user_message  = _build_user_message(preprocess)

    if _audit is not None:
        _audit["model"] = config.openrouter_model
        _audit["input_char_count"] = len(preprocess.text)
        _audit["input_truncated"] = preprocess.truncated
        _audit["prompt_sha256"] = sha256_text(system_prompt)
        _audit["prompt_template_sha256"] = sha256_text(_load_system_prompt())
        _audit["model_parameters"] = {
            "temperature": 0.1,
        }

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
    if _audit is not None:
        _audit["raw_response_chars"] = len(raw_json)
    return _postfill_locale_fields(_validate_response(raw_json, _audit=_audit), preprocess)


def _build_system_prompt_with_lexicon(
    config: Config,
    split_for_claude: bool = False,
    *,
    _audit: dict | None = None,
) -> str | tuple[str, str]:
    base = _load_system_prompt()
    try:
        terms = _fetch_active_lexicon_terms(config)
    except Exception:
        terms = []

    _LEXICON_INJECTION_CAP = 200
    terms_available = len(terms)

    if not terms:
        if _audit is not None:
            _audit["lexicon_terms_available"] = 0
            _audit["lexicon_terms_injected"] = 0
            _audit["lexicon_injection_cap"] = _LEXICON_INJECTION_CAP
        return (base, "") if split_for_claude else base

    if len(terms) > _LEXICON_INJECTION_CAP:
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "Lexicon has %d active terms — capping injection at %d. "
            "Analysis prompt uses the first %d terms as a compact orientation layer; "
            "enrichment and registry matching should use deeper lexicon context.",
            len(terms), _LEXICON_INJECTION_CAP, _LEXICON_INJECTION_CAP,
        )
        terms = terms[:_LEXICON_INJECTION_CAP]

    if _audit is not None:
        _audit["lexicon_terms_available"] = terms_available
        _audit["lexicon_terms_injected"] = len(terms)
        _audit["lexicon_injection_cap"] = _LEXICON_INJECTION_CAP

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

    # Researcher-declared intake context — included as non-authoritative hints.
    # The model should use these as a starting signal, not as ground truth.
    intake_hints = []
    if preprocess.intake_declared_type:
        intake_hints.append(f"RESEARCHER-DECLARED TYPE: {preprocess.intake_declared_type}")
    if preprocess.intake_batch_id:
        intake_hints.append(f"BATCH ID: {preprocess.intake_batch_id}")
    if preprocess.intake_source_url:
        intake_hints.append(f"CANONICAL SOURCE URL: {preprocess.intake_source_url}")
    if intake_hints:
        lines.append("")
        lines.append("RESEARCHER INTAKE CONTEXT (non-authoritative — use as a starting signal only):")
        lines.extend(intake_hints)

    return "\n".join(lines) + "\n\n---\n\nDOCUMENT TEXT:\n" + preprocess.text + "\n\n---\n\nOutput ONLY a valid JSON object. Start with { and end with }. No explanation, no prose, no markdown fences."


def _fetch_active_lexicon_terms(config: Config) -> list[dict]:
    """Fetch the Stage 3b analysis orientation lexicon.

    Returns only validated terms and researcher-trusted drafts
    (``status == "validated"`` or ``status == "draft" &&
    includeInAnalysisLexicon == true``).  Results are ordered so that
    validated entries come first, then trusted drafts alphabetically —
    making the 200-term cap deterministic.

    Stage 3c enrichment uses the full draft+validated set via
    ``fetch_active_lexicon_terms`` (a separate cached query).
    """
    return fetch_analysis_orientation_terms(config)


def _format_lexicon_prompt_line(term: dict) -> str:
    variants = term.get("multilingualVariants") or []
    variant_text = ", ".join(
        f"{v.get('variantTerm')}[{v.get('language', 'unknown')}]"
        for v in variants[:12]
        if v.get("variantTerm")
    )
    suffix = f"; variants: {variant_text}" if variant_text else ""
    return f"- {term['term']} ({term.get('proposedCluster', '')}, function={term.get('function', '')}{suffix})"


def _validate_response(raw_json: str, *, _audit: dict | None = None) -> AnalysisResult:
    """Extract and validate JSON from LLM response, handling think tags and markdown fences."""
    original = raw_json.strip()
    last_error: Exception | None = None
    _attempts = 0

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
            payload = json.loads(candidate)
            result = AnalysisResult.model_validate(payload)
            if _audit is not None:
                _audit["score_derived_from_status"] = _confidence_score_was_derived(payload)
            return result
        except Exception as exc:
            last_error = exc
            return None

    # 1. Try content outside think tags (normal case)
    _attempts += 1
    outside = re.sub(r"<think>.*?</think>", "", original, flags=re.DOTALL).strip()
    result = _try_extract(outside)
    if result:
        if _audit is not None:
            _audit["validation_path"] = "outside_think_tags"
            _audit["validation_attempts"] = _attempts
        return result

    # 2. Try content inside think tags (model embedded JSON in its reasoning)
    inside_blocks = re.findall(r"<think>(.*?)</think>", original, re.DOTALL)
    for block in inside_blocks:
        _attempts += 1
        result = _try_extract(block)
        if result:
            if _audit is not None:
                _audit["validation_path"] = "inside_think_tags"
                _audit["validation_attempts"] = _attempts
            return result

    # 3. Try the raw text with no tag stripping (non-thinking model)
    _attempts += 1
    result = _try_extract(original)
    if result:
        if _audit is not None:
            _audit["validation_path"] = "raw"
            _audit["validation_attempts"] = _attempts
        return result

    # Detect likely truncation: response starts with { but never closes
    stripped = re.sub(r"<think>.*?</think>", "", original, flags=re.DOTALL).strip()
    looks_truncated = stripped.startswith("{") and not stripped.rstrip().endswith("}")
    hint = (
        "\nResponse looks truncated (starts with { but no closing }). "
        "Increase LOCAL_OUTPUT_TOKENS or the LiteLLM model max_tokens setting."
    ) if looks_truncated else ""

    validation_detail = f"\nValidation error: {last_error}" if last_error else ""

    if _audit is not None:
        _audit["validation_path"] = "failed"
        _audit["validation_attempts"] = _attempts
        _audit.setdefault("errors", []).append(
            f"Could not extract valid JSON after {_attempts} attempt(s)"
        )

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


def _confidence_score_was_derived(payload: dict) -> bool:
    """True when Pydantic filled confidence.overall_score from status default."""
    confidence = payload.get("confidence")
    if not isinstance(confidence, dict):
        return True
    return "overall_score" not in confidence or confidence.get("overall_score") in (None, 0, 0.0)


def save(doc_id: str, result: AnalysisResult, config: Config) -> None:
    from .upload import _stamp_analysis_dict

    doc_dir = config.corpus_dir / doc_id
    (doc_dir / "analysis.json").write_text(
        json.dumps(_stamp_analysis_dict(result), indent=2), encoding="utf-8"
    )
