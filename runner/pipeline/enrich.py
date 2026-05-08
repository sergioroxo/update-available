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
from datetime import datetime
import json
import re
import shutil
from pathlib import Path

try:
    from runner.config import Config
    from runner.models.document import AnalysisResult, PreprocessResult
    from runner.models.enrichment import EnrichmentResult
except ImportError:
    from ..config import Config
    from ..models.document import AnalysisResult, PreprocessResult
    from ..models.enrichment import EnrichmentResult

PROMPT_VERSION = "enrichment-v1.1"

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
    model: str | None = None,
) -> EnrichmentResult:
    """Run Stage 3c enrichment and return an EnrichmentResult."""
    system_prompt = _build_system_prompt(config, analysis)
    user_message  = _build_user_message(doc_id, preprocess)

    raw = _call_enrichment_model(llm, system_prompt, user_message, config, model)
    try:
        return _validate_response(doc_id, raw, llm)
    except ValueError as exc:
        if len(preprocess.text) < 8_000:
            raise
        return _run_chunked_enrichment(
            doc_id=doc_id,
            preprocess=preprocess,
            analysis=analysis,
            config=config,
            llm=llm,
            model=model,
            first_error=exc,
        )


def save(doc_id: str, result: EnrichmentResult, config: Config) -> Path:
    """Write enrichment.json to the document's corpus directory."""
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    out = doc_dir / "enrichment.json"
    if out.exists():
        archive = doc_dir / f"enrichment_{_timestamp()}.json"
        shutil.copy2(out, archive)
    result.run_type = "main"
    out.write_text(result.model_dump_json(indent=2, by_alias=True), encoding="utf-8")
    return out


def save_alt(doc_id: str, result: EnrichmentResult, config: Config, label: str = "alt") -> Path:
    """Write a comparison enrichment result without touching enrichment.json."""
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    result.run_type = "alt"
    out = doc_dir / f"enrichment_{label}_{_timestamp()}.json"
    out.write_text(result.model_dump_json(indent=2, by_alias=True), encoding="utf-8")
    return out


def list_history(doc_id: str, config: Config) -> list[dict]:
    """Return archived main runs and second opinions with their inferred file type."""
    doc_dir = config.corpus_dir / doc_id
    history: list[dict] = []
    for path in sorted(doc_dir.glob("enrichment_*.json")):
        if path.name == "enrichment.json":
            continue
        run_type = "alt" if path.name.startswith("enrichment_alt_") else "main_archive"
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            run_type = data.get("run_type") or run_type
            model = data.get("enrichment_model", "")
        except Exception:
            model = ""
        history.append({"path": path, "filename": path.name, "run_type": run_type, "model": model})
    return history


def push_approved_to_sanity(doc_id: str, config: Config) -> dict:
    """Push all approved (not yet pushed) enrichment proposals to Sanity.

    Marks each pushed item with pushed_to_sanity=True and its sanity_id, then
    saves enrichment.json back so the state persists across sessions.

    Returns pushed counts by proposal family plus any errors.
    """
    try:
        from runner.clients.sanity import (
            append_extractable_asset_from_proposal,
            write_entity_from_proposal,
            write_lexicon_draft_from_proposal,
            write_practice_from_proposal,
            write_tactic_from_proposal,
        )
    except ImportError:
        from ..clients.sanity import (
            append_extractable_asset_from_proposal,
            write_entity_from_proposal,
            write_lexicon_draft_from_proposal,
            write_practice_from_proposal,
            write_tactic_from_proposal,
        )

    result = load(doc_id, config)
    if result is None:
        raise FileNotFoundError(f"No enrichment.json found for {doc_id}")

    pushed_lexicon = 0
    pushed_entities = 0
    pushed_tactics = 0
    pushed_practices = 0
    pushed_claims = 0
    errors: list[str] = []

    for prop in result.lexicon_proposals:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = write_lexicon_draft_from_proposal(prop.model_dump(by_alias=True), doc_id, config)
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            pushed_lexicon += 1
        except Exception as exc:
            errors.append(f"lexicon/{prop.term}: {exc}")

    for prop in result.entity_proposals:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = write_entity_from_proposal(prop.model_dump(), doc_id, config)
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            pushed_entities += 1
        except Exception as exc:
            errors.append(f"entity/{prop.name}: {exc}")

    for prop in result.tactic_proposals:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = write_tactic_from_proposal(prop.model_dump(), doc_id, config)
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            pushed_tactics += 1
        except Exception as exc:
            errors.append(f"tactic/{prop.tactic}: {exc}")

    for prop in result.practice_descriptions:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = write_practice_from_proposal(prop.model_dump(), doc_id, config)
            append_extractable_asset_from_proposal(
                prop.model_dump(),
                doc_id,
                config,
                asset_type="practice_description",
                content=prop.exact_description,
                target_module="practice_registry",
            )
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            pushed_practices += 1
        except Exception as exc:
            errors.append(f"practice/{prop.practice_id}: {exc}")

    for prop in result.statistical_claims:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = append_extractable_asset_from_proposal(
                prop.model_dump(),
                doc_id,
                config,
                asset_type="statistical_claim",
                content=prop.claim,
                target_module="fact_checking",
            )
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            pushed_claims += 1
        except Exception as exc:
            errors.append(f"statistical_claim/{prop.claim[:80]}: {exc}")

    # Persist updated state
    out = config.corpus_dir / doc_id / "enrichment.json"
    out.write_text(result.model_dump_json(indent=2, by_alias=True), encoding="utf-8")

    return {
        "lexicon": pushed_lexicon,
        "entities": pushed_entities,
        "tactics": pushed_tactics,
        "practices": pushed_practices,
        "statistical_claims": pushed_claims,
        "errors": errors,
    }


def pending_push_counts(doc_id: str, config: Config) -> dict:
    """Return counts of approved-not-pushed proposals without modifying anything."""
    result = load(doc_id, config)
    if result is None:
        return {"lexicon": 0, "entities": 0, "tactics": 0, "practices": 0, "statistical_claims": 0, "queue": 0}
    return {
        "lexicon": sum(1 for p in result.lexicon_proposals if p.approved and not p.rejected and not p.pushed_to_sanity),
        "entities": sum(1 for p in result.entity_proposals if p.approved and not p.rejected and not p.pushed_to_sanity),
        "tactics": sum(1 for p in result.tactic_proposals if p.approved and not p.rejected and not p.pushed_to_sanity),
        "practices": sum(1 for p in result.practice_descriptions if p.approved and not p.rejected and not p.pushed_to_sanity),
        "statistical_claims": sum(1 for p in result.statistical_claims if p.approved and not p.rejected and not p.pushed_to_sanity),
        "queue": len(result.ingestion_queue),
    }


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def load(doc_id: str, config: Config) -> EnrichmentResult | None:
    """Load a previously saved enrichment.json, or None if not found."""
    path = config.corpus_dir / doc_id / "enrichment.json"
    if not path.exists():
        return None
    return EnrichmentResult.model_validate(json.loads(path.read_text()))


# ---------------------------------------------------------------------------
# Chunked fallback
# ---------------------------------------------------------------------------

def _call_enrichment_model(
    llm: str,
    system_prompt: str,
    user_message: str,
    config: Config,
    model: str | None = None,
) -> str:
    raw: str | None = None

    if llm == "claude":
        return _call_claude(system_prompt, user_message, config)
    if llm.startswith("local"):
        return _call_ollama(system_prompt, user_message, config, config.local_analysis_model)

    # litelm* or default: try lexicon-llm on Mac Studio
    if config.litelm_base_url:
        try:
            return _call_litelm(system_prompt, user_message, config, model or config.litelm_enrichment_model)
        except Exception:
            if llm.startswith("litelm"):
                raise  # user explicitly asked for litelm — don't hide the error
            # fallback path: try local
    if raw is None:
        return _call_ollama(system_prompt, user_message, config, config.local_analysis_model)
    return raw


def _run_chunked_enrichment(
    doc_id: str,
    preprocess: PreprocessResult,
    analysis: AnalysisResult,
    config: Config,
    llm: str,
    model: str | None,
    first_error: ValueError,
) -> EnrichmentResult:
    system_prompt = _build_system_prompt(config, analysis)
    chunks = _chunk_text(preprocess.text)
    results: list[EnrichmentResult] = []
    errors: list[str] = []

    for index, chunk in enumerate(chunks, start=1):
        user_message = _build_user_message(
            doc_id,
            preprocess,
            text_override=chunk,
            chunk_label=f"section {index} of {len(chunks)}",
        )
        try:
            raw = _call_enrichment_model(llm, system_prompt, user_message, config, model)
            results.append(_validate_response(doc_id, raw, llm))
        except Exception as exc:
            errors.append(f"chunk {index}/{len(chunks)}: {exc}")

    if not results:
        detail = "\n".join(errors[:5])
        raise ValueError(
            f"Whole-document enrichment failed, and chunked enrichment also failed.\n"
            f"Original error: {first_error}\n"
            f"Chunk errors:\n{detail}"
        )

    merged = _merge_enrichment_results(doc_id, llm, results)
    note = (
        f"Chunked enrichment fallback used after whole-document validation failed. "
        f"Successful chunks: {len(results)}/{len(chunks)}."
    )
    if errors:
        note += " Failed chunks: " + " | ".join(errors[:3])
    merged.researcher_notes = (merged.researcher_notes + "\n" + note).strip()
    return merged


def _chunk_text(text: str, max_chars: int = 10_000, overlap: int = 600) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + max_chars)
        if end < len(text):
            boundary = max(
                text.rfind("\n\n", start, end),
                text.rfind(". ", start, end),
            )
            if boundary > start + int(max_chars * 0.55):
                end = boundary + 1
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return [chunk for chunk in chunks if chunk]


def _merge_enrichment_results(
    doc_id: str,
    llm: str,
    results: list[EnrichmentResult],
) -> EnrichmentResult:
    merged = EnrichmentResult(
        doc_id=doc_id,
        enrichment_model=llm,
        enrichment_prompt_version=PROMPT_VERSION,
    )
    merged.lexicon_proposals = _dedupe(
        [item for result in results for item in result.lexicon_proposals],
        lambda item: (item.action, item.term.lower(), item.exact_quote[:120]),
    )
    merged.entity_proposals = _dedupe(
        [item for result in results for item in result.entity_proposals],
        lambda item: (item.entity_type, item.name.lower(), item.evidence_quote[:120]),
    )
    merged.tactic_proposals = _dedupe(
        [item for result in results for item in result.tactic_proposals],
        lambda item: (item.tactic.lower(), item.evidence_quote[:120]),
    )
    merged.ingestion_queue = _dedupe(
        [item for result in results for item in result.ingestion_queue],
        lambda item: item.url,
    )
    merged.corpus_connections = _dedupe(
        [item for result in results for item in result.corpus_connections],
        lambda item: (item.doc_id, item.connection_type, item.shared_element.lower()),
    )
    merged.practice_descriptions = _dedupe(
        [item for result in results for item in result.practice_descriptions],
        lambda item: (item.practice_id.lower(), item.exact_description[:160]),
    )
    merged.statistical_claims = _dedupe(
        [item for result in results for item in result.statistical_claims],
        lambda item: item.claim.lower(),
    )
    return merged


def _dedupe(items: list, key_fn) -> list:
    seen: set[str] = set()
    deduped = []
    for item in items:
        key = json.dumps(key_fn(item), sort_keys=True, default=str)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


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
                _format_lexicon_prompt_line(t)
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


def _build_user_message(
    doc_id: str,
    preprocess: PreprocessResult,
    text_override: str | None = None,
    chunk_label: str | None = None,
) -> str:
    lines = [f"DOCUMENT ID: {doc_id}"]
    if chunk_label:
        lines.append(f"DOCUMENT SECTION: {chunk_label}")
        lines.append(
            "IMPORTANT: Extract only proposals evidenced in this section. "
            "Do not infer proposals from sections you cannot see."
        )
    if preprocess.title:
        lines.append(f"TITLE: {preprocess.title}")
    if preprocess.author:
        lines.append(f"AUTHOR: {preprocess.author}")
    if preprocess.date_published:
        lines.append(f"DATE: {preprocess.date_published}")
    if preprocess.hostname:
        lines.append(f"SOURCE: {preprocess.hostname}")

    text = preprocess.text if text_override is None else text_override
    tag_block = ""
    try:
        from runner.pipeline.tag_registry import detect_tag_matches, format_matches_for_prompt
    except ImportError:
        from .tag_registry import detect_tag_matches, format_matches_for_prompt
    try:
        tag_block = format_matches_for_prompt(detect_tag_matches(text))
    except Exception:
        tag_block = ""

    tag_section = (
        "\n\nTAG REGISTRY MATCHES FOUND IN TEXT (use as connection hints, not proof):\n"
        + tag_block
        if tag_block else ""
    )

    return (
        "\n".join(lines)
        + tag_section
        + "\n\n---\n\nDOCUMENT TEXT:\n"
        + text
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

def _call_litelm(system_prompt: str, user_message: str, config: Config, model: str) -> str:
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
            "max_tokens": config.local_output_tokens,
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
        max_tokens=config.local_output_tokens,
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
            "keep_alive": 0,
            "format": "json",
            "think": False,
            "options": {
                "temperature": 0.1,
                "num_ctx": config.local_context_tokens,
                "num_predict": config.local_output_tokens,
            },
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
        '{ term, proposedCluster, function, multilingualVariants }'
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


def _format_lexicon_prompt_line(term: dict) -> str:
    variants = term.get("multilingualVariants") or []
    variant_text = ", ".join(
        f"{v.get('variantTerm')}[{v.get('language', 'unknown')}]"
        for v in variants[:12]
        if v.get("variantTerm")
    )
    suffix = f"; variants: {variant_text}" if variant_text else ""
    return (
        f"- {term['term']} (cluster={term.get('proposedCluster','?')}, "
        f"function={term.get('function','?')}{suffix})"
    )


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
