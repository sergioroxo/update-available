"""
Stage 0.5 — Document triage.

Runs a fast model on a bounded context built by build_triage_context(): a head
window, any detected structural markers (headings/chapter lines), and a tail
window. This gives more signal than a fixed first-N-chars slice while staying
within the triage model's token budget. Called when --triage flag is passed to
`runner ingest`.

Model routing:
  Mac Studio available  → "triage" LiteLLM alias (gemma4:e4b)
  Mac Studio unavailable → local qwen3.5:9b fallback
  Both fail             → return safe default (litelm / moderate)
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
import re
from pathlib import Path
from typing import Optional

try:
    from runner.config import Config
    from runner.models.triage import TriageResult
except ImportError:
    from ..config import Config
    from ..models.triage import TriageResult

_SNIPPET_CHARS = 3_000   # legacy; build_triage_context() is preferred
_TRIAGE_HEAD_CHARS = 2_000
_TRIAGE_TAIL_CHARS = 1_000
_TRIAGE_MAX_HEADINGS = 20

_HEADING_LINE_RE = re.compile(
    r'^(?:#{1,6}\s|(?:Chapter|Section|Part|CHAPTER|SECTION|PART)\s|\d+\.\s)',
)

_SYSTEM_PROMPT = """\
You are a document routing assistant for the SurvivingSOGICE research archive.
You receive a short snippet from an unclassified document and must quickly decide
which analysis model and process route to use.

Output ONLY valid JSON — no prose, no markdown fences. Start with { and end with }.

Schema:
{
  "doc_type_hint": "promotional|policy|legal|academic|testimony|news|media|unknown",
  "languages": ["en"],
  "complexity": "simple|moderate|complex",
  "estimated_tokens": 5000,
  "recommended_llm": "litelm|litelm-heavy|litelm-reasoning|claude|local",
  "routing_reason": "one-sentence explanation",
  "needs_book_splitting": false,
  "needs_testimony_review": false,
  "needs_media_review": false,
  "needs_legal_review": false,
  "overnight_batch_safe": true,
  "suggested_process_route": "standard"
}

LLM routing rules:
- litelm-heavy     : document is clearly long (book, transcript, multi-section report),
                     or complexity=complex
- litelm-reasoning : SOGICE relevance is ambiguous, or requires careful evidence weighing
- claude           : official court judgments, legislative submissions, government policy
                     (high accuracy matters more than speed)
- litelm           : everything else — promotional web content, NGO articles, press releases
- local            : only if litelm unavailable and document is short/simple

Workflow flag rules:
- needs_book_splitting   : true if document is a book, multi-chapter report, or thesis
                           (set suggested_process_route to "split-book")
- needs_testimony_review : true if document is or contains personal testimony
                           (requires researcher consent review before processing)
- needs_media_review     : true if document is video, audio, or requires transcript
                           (set suggested_process_route to "media-ingest")
- needs_legal_review     : true if document is a court judgment, legislative submission,
                           or official legal instrument
- overnight_batch_safe   : false when ANY of the following are true:
                             needs_testimony_review, needs_legal_review,
                             needs_book_splitting, needs_media_review
                           These all require a route-specific runner or researcher
                           confirmation before unattended batch processing.
                           Set to true only for standard promotional, news, or simple
                           academic content with no special handling required.
- suggested_process_route: "split-book" if needs_book_splitting; "media-ingest" if
                           needs_media_review; "standard" otherwise
"""


def build_triage_context(
    text: str,
    source_label: str = "",
    head_chars: int = _TRIAGE_HEAD_CHARS,
    tail_chars: int = _TRIAGE_TAIL_CHARS,
) -> str:
    """Build a bounded triage context from document text and optional metadata.

    For short documents (<= head_chars) returns the full text.
    For long documents returns: source label, head, detected headings/structure
    found in the middle section, and the tail.

    Total output is bounded to head_chars + tail_chars + modest heading overhead,
    well within a 4096-token triage context window.
    """
    parts: list[str] = []
    if source_label:
        parts.append(f"SOURCE: {source_label}")

    if not text.strip():
        return "\n\n".join(parts) if parts else ""

    if len(text) <= head_chars:
        parts.append(text)
        return "\n\n".join(parts)

    # Long document: head + extracted structure + tail
    parts.append(text[:head_chars])

    middle_end = max(head_chars, len(text) - tail_chars)
    middle = text[head_chars:middle_end]
    headings: list[str] = []
    for line in middle.splitlines():
        stripped = line.strip()
        if stripped and _HEADING_LINE_RE.match(stripped):
            headings.append(stripped)
            if len(headings) >= _TRIAGE_MAX_HEADINGS:
                break
    if headings:
        parts.append("STRUCTURE DETECTED IN MIDDLE:\n" + "\n".join(headings))

    omitted = len(text) - head_chars - tail_chars
    parts.append(f"[... {omitted:,} chars omitted ...]\n\n{text[-tail_chars:]}")

    return "\n\n".join(parts)


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


def run(text: str, config: Config, *, source_label: str = "") -> TriageResult:
    """Triage a document. Never raises -- returns a safe default on failure."""
    context = build_triage_context(text, source_label=source_label)
    user_msg = f"Document context:\n\n{context}\n\n---\nOutput JSON only."

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
            "max_tokens": 400,
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
            "options": {"temperature": 0.0, "num_ctx": 4096, "num_predict": 400},
        },
        timeout=120,
    )
    r.raise_for_status()
    msg = r.json()["message"]
    return msg.get("content", "").strip() or msg.get("thinking", "")


def save_triage_result(doc_id: str, result: "TriageResult", config: "Config") -> Path:
    """Persist a TriageResult to {corpus_dir}/{doc_id}/triage_result.json.

    Creates the doc folder if it does not yet exist (e.g. new-doc triage before
    intake runs). The caller is responsible for ensuring doc_id is valid.
    """
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    path = doc_dir / "triage_result.json"
    data = result.model_dump(mode="json")
    data["saved_at"] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path


def load_triage_result(doc_id: str, config: "Config") -> "Optional[TriageResult]":
    """Load a previously saved TriageResult from the doc folder.

    Returns None if no file exists or the file cannot be parsed.
    """
    path = config.corpus_dir / doc_id / "triage_result.json"
    if not path.exists():
        return None
    try:
        return TriageResult.model_validate_json(path.read_text(encoding="utf-8"))
    except Exception:
        return None


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
