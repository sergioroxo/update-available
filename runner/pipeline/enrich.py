"""
Stage 3c — Enrichment pass.

Runs after the main analysis (Stage 3b). Calls the 'lexicon-llm' LiteLLM alias
(qwen3.6:35b-a3b on Mac Studio) with the full enrichment prompt, injecting:
  - Current lexicon terms from Sanity
  - Current entity registry from Sanity
  - Main analysis result summary

Output: EnrichmentResult stored as enrichment.json in the corpus dir.

LLM routing:
  --llm litelm*   → 'lexicon-llm' on Mac Studio (preferred)
  --llm claude    → Claude API
  --llm local*    → local qwen3.5:9b via Ollama
  fallback        → tries litelm then local
"""
from __future__ import annotations
import json
import re
from pathlib import Path

from ..config import Config
from ..models.document import AnalysisResult, PreprocessResult
from ..models.enrichment import EnrichmentResult

PROMPT_VERSION = "enrichment-v1.0"

_PROMPT_FILE = (
    Path(__file__).parents[2]
    / "02_working_tools"
    / "ENRICHMENT_PROMPT_v1.0.md"
)

_SYSTEM_PROMPT: str | None = None


def _load_system_prompt() -> str:
    global _SYSTEM_PROMPT
    if _SYSTEM_PROMPT is None:
        raw = _PROMPT_FILE.read_text(encoding="utf-8")
        match = re.search(r"## SYSTEM PROMPT\s*\n```\n(.*?)```", raw, re.DOTALL)
        if not match:
            raise RuntimeError(f"Cannot parse system prompt from {_PROMPT_FILE}")
        _SYSTEM_PROMPT = match.group(1).strip()
    return _SYSTEM_PROMPT


def run(
    doc_id: str,
    preprocess: PreprocessResult,
    analysis: AnalysisResult,
    config: Config,
    llm: str = "litelm",
    enrich_model: str | None = None,   # override the LiteLLM model name (e.g. "core-gemma")
) -> EnrichmentResult:
    """Run Stage 3c enrichment and return an EnrichmentResult.

    enrich_model overrides the default 'lexicon-llm' alias — useful when you
    want a second opinion from a different model (e.g. 'core-gemma' for Gemma4).
    """
    system_prompt = _build_system_prompt(config, analysis)
    user_message  = _build_user_message(doc_id, preprocess)

    raw: str | None = None
    model_used = enrich_model or config.litelm_enrichment_model  # default: "lexicon-llm"

    if llm == "claude":
        raw = _call_claude(system_prompt, user_message, config)
    elif llm.startswith("local"):
        raw = _call_ollama(system_prompt, user_message, config,
                           config.local_analysis_model)
    else:
        # litelm* or default: use configured enrichment model on Mac Studio
        if config.litelm_base_url:
            try:
                raw = _call_litelm(system_prompt, user_message, config, model=model_used)
            except Exception:
                if llm.startswith("litelm"):
                    raise  # user explicitly asked for litelm — don't hide the error
        if raw is None:
            raw = _call_ollama(system_prompt, user_message, config,
                               config.local_analysis_model)

    return _validate_response(doc_id, raw, model_used)


def run_second_opinion(
    doc_id: str,
    preprocess: PreprocessResult,
    analysis: AnalysisResult,
    config: Config,
) -> EnrichmentResult:
    """Run enrichment with the alternate model (litelm_enrichment_model_alt).
    Useful for comparing results or when the primary model's output is suspect.
    The result is saved as enrichment_alt_{timestamp}.json, never as enrichment.json."""
    return run(
        doc_id, preprocess, analysis, config,
        llm="litelm",
        enrich_model=config.litelm_enrichment_model_alt,
    )


def save(doc_id: str, result: EnrichmentResult, config: Config) -> Path:
    """Write enrichment.json, archiving any previous version first.

    Previous enrichment.json is renamed to enrichment_{timestamp}.json so that
    researcher decisions (approved/rejected flags) are never silently lost.
    """
    from datetime import datetime, timezone
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    out = doc_dir / "enrichment.json"

    if out.exists():
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        out.rename(doc_dir / f"enrichment_{ts}.json")

    out.write_text(result.model_dump_json(indent=2), encoding="utf-8")
    return out


def save_alt(doc_id: str, result: EnrichmentResult, config: Config) -> Path:
    """Save a second-opinion enrichment run without touching enrichment.json."""
    from datetime import datetime, timezone
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out = doc_dir / f"enrichment_alt_{ts}.json"
    out.write_text(result.model_dump_json(indent=2), encoding="utf-8")
    return out


def load(doc_id: str, config: Config) -> EnrichmentResult | None:
    """Load the current enrichment.json, or None if not found."""
    path = config.corpus_dir / doc_id / "enrichment.json"
    if not path.exists():
        return None
    return EnrichmentResult.model_validate(json.loads(path.read_text()))


def list_history(doc_id: str, config: Config) -> list[Path]:
    """Return all archived enrichment files for a document, oldest first."""
    doc_dir = config.corpus_dir / doc_id
    return sorted(doc_dir.glob("enrichment_*.json"))


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def _build_system_prompt(config: Config, analysis: AnalysisResult) -> str:
    base = _load_system_prompt()

    lexicon_block = "(not available — Sanity query failed)"
    entity_block  = "(not available — Sanity query failed)"

    try:
        terms = _fetch_lexicon_entries(config)
        lexicon_block = (
            "\n".join(
                f"- {t['term']} (cluster={t.get('proposedCluster','?')}, "
                f"function={t.get('function','?')})"
                for t in terms
            ) or "(none yet)"
        )
    except Exception:
        pass

    try:
        entities = _fetch_entity_registry(config)
        entity_block = (
            "\n".join(
                f"- [{e.get('_type','?')}] {e.get('name','?')}"
                for e in entities
            ) or "(none yet)"
        )
    except Exception:
        pass

    injection = (
        f"\n\nCURRENT LEXICON ENTRIES (do not re-propose — add variant or evidence instead):\n"
        f"{lexicon_block}\n\n"
        f"CURRENT ENTITY REGISTRY (do not re-propose — use enrich_existing if found):\n"
        f"{entity_block}\n\n"
        f"RELATED CORPUS DOCUMENTS:\n(vector similarity deferred — not yet available)\n\n"
        f"MAIN ANALYSIS RESULT:\n{_summarise_analysis(analysis)}"
    )
    return base + injection


def _build_user_message(doc_id: str, preprocess: PreprocessResult) -> str:
    lines = [f"DOCUMENT ID: {doc_id}"]
    if preprocess.title:
        lines.append(f"TITLE: {preprocess.title}")
    if preprocess.author:
        lines.append(f"AUTHOR: {preprocess.author}")
    if preprocess.date_published:
        lines.append(f"DATE: {preprocess.date_published}")
    if preprocess.hostname:
        lines.append(f"SOURCE: {preprocess.hostname}")

    return (
        "\n".join(lines)
        + "\n\n---\n\nDOCUMENT TEXT:\n"
        + preprocess.text
        + "\n\n---\n\n"
        "Output ONLY a valid JSON object. Start with { and end with }. "
        "No explanation, no prose, no markdown fences."
    )


def _summarise_analysis(analysis: AnalysisResult) -> str:
    lines = [
        f"type={analysis.type}",
        f"format={analysis.format}",
        f"confidence={analysis.confidence.status} ({analysis.confidence.overall_score:.2f})",
    ]
    if analysis.candidate_terms:
        terms_str = ", ".join(
            t.term for t in analysis.candidate_terms[:10]
        )
        lines.append(f"candidate_terms=[{terms_str}]")
    if analysis.suggested_actors:
        actors_str = ", ".join(
            a.name for a in analysis.suggested_actors[:5]
        )
        lines.append(f"suggested_actors=[{actors_str}]")
    if analysis.tactic:
        lines.append(f"tactics={analysis.tactic}")
    if analysis.summary:
        lines.append(f"summary={analysis.summary[:300]}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# LLM backends
# ---------------------------------------------------------------------------

def _call_litelm(
    system_prompt: str, user_message: str, config: Config,
    model: str = "lexicon-llm",
) -> str:
    import httpx
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
    return response.json()["choices"][0]["message"]["content"]


def _call_claude(system_prompt: str, user_message: str, config: Config) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=config.anthropic_api_key)
    response = client.messages.create(
        model=config.claude_model,
        max_tokens=8192,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def _call_ollama(
    system_prompt: str, user_message: str, config: Config, model: str
) -> str:
    import httpx
    response = httpx.post(
        f"{config.ollama_base_url}/api/chat",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "stream": False,
            "format": "json",
            "think": False,
            "options": {"temperature": 0.1, "num_ctx": 32768, "num_predict": 8192},
        },
        timeout=600,
    )
    response.raise_for_status()
    msg = response.json()["message"]
    raw = msg.get("content", "").strip() or msg.get("thinking", "")
    if not raw:
        raise ValueError(
            f"Ollama returned empty response for enrichment. "
            f"Message keys: {list(msg.keys())}"
        )
    return raw


# ---------------------------------------------------------------------------
# Sanity queries
# ---------------------------------------------------------------------------

def _fetch_lexicon_entries(config: Config) -> list[dict]:
    import httpx
    query = (
        '*[_type == "lexiconEntry" && status in ["draft","validated"]]'
        '{ term, proposedCluster, function }'
    )
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    r = httpx.get(
        url,
        params={"query": query},
        headers={"Authorization": f"Bearer {config.sanity_write_token}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json().get("result", [])


def _fetch_entity_registry(config: Config) -> list[dict]:
    import httpx
    query = '*[_type in ["organization","person"]]{ _type, name }'
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    r = httpx.get(
        url,
        params={"query": query},
        headers={"Authorization": f"Bearer {config.sanity_write_token}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json().get("result", [])


# ---------------------------------------------------------------------------
# Response validation
# ---------------------------------------------------------------------------

def _validate_response(doc_id: str, raw: str, llm: str) -> EnrichmentResult:
    original = raw.strip()

    def _try(text: str) -> EnrichmentResult | None:
        text = re.sub(r"^```(?:json)?\s*", "", text.strip())
        text = re.sub(r"\s*```$", "", text.strip())
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            return None
        try:
            data = json.loads(m.group(0))
            data["doc_id"] = doc_id
            data["enrichment_model"] = llm
            data["enrichment_prompt_version"] = PROMPT_VERSION
            return EnrichmentResult.model_validate(data)
        except Exception:
            return None

    # Try outside think tags first
    outside = re.sub(r"<think>.*?</think>", "", original, flags=re.DOTALL).strip()
    result = _try(outside)
    if result:
        return result

    # Try inside think tags (model embedded JSON in reasoning)
    for block in re.findall(r"<think>(.*?)</think>", original, re.DOTALL):
        result = _try(block)
        if result:
            return result

    # Try raw
    result = _try(original)
    if result:
        return result

    raise ValueError(
        f"Could not extract valid EnrichmentResult JSON.\n"
        f"Raw response (first 2 000 chars): {original[:2000]}"
    )
