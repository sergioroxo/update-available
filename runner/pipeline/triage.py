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
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

try:
    from runner.config import Config
    from runner.models.triage import TriageResult
    from runner.pipeline.audit import current_git_commit, sha256_text, write_triage_audit
except ImportError:
    from ..config import Config
    from ..models.triage import TriageResult
    from .audit import current_git_commit, sha256_text, write_triage_audit

_SNIPPET_CHARS = 3_000   # legacy; build_triage_context() is preferred
_TRIAGE_HEAD_CHARS = 2_000
_TRIAGE_TAIL_CHARS = 1_000
_TRIAGE_MAX_HEADINGS = 20

_HEADING_LINE_RE = re.compile(
    r'^(?:#{1,6}\s|(?:Chapter|Section|Part|CHAPTER|SECTION|PART)\s|\d+\.\s)',
)

_ACADEMIC_HOST_HINTS = (
    "doi.org",
    "onlinelibrary.wiley.com",
    "journals.sagepub.com",
    "tandfonline.com",
    "pubmed.ncbi.nlm.nih.gov",
    "springer.com",
    "link.springer.com",
    "sciencedirect.com",
    "cambridge.org",
    "academic.oup.com",
)

_SOCIAL_HOST_HINTS = (
    "x.com",
    "twitter.com",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
)

_VIDEO_HOST_HINTS = (
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "rumble.com",
    "odysee.com",
    "bitchute.com",
    "dailymotion.com",
    "facebook.com",
    "fb.watch",
)

_BLOCKER_TEXT_RE = re.compile(
    r"cloudflare|verify you are human|enable javascript|access denied|"
    r"technical error|something went wrong|sign in|login|cookie|website footer",
    re.IGNORECASE,
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


def _host_matches(host: str, hints: tuple[str, ...]) -> bool:
    return host in hints or any(host.endswith(f".{h}") for h in hints)


def _is_videoish_url(source: str) -> bool:
    parsed = urlparse(source or "")
    host = parsed.netloc.lower().removeprefix("www.")
    path = parsed.path.lower()
    if _host_matches(host, _VIDEO_HOST_HINTS):
        return True
    return "/watch" in path or "/video/" in path or path.endswith((".mp4", ".mov", ".webm", ".m4v"))


def _text_from_yt_dlp_info(info: dict) -> str:
    """Build a bounded triage snippet from public media metadata.

    Triage needs routing signal, not the full media transcript. If subtitles are
    unavailable or extraction is blocked, title/channel/description metadata is
    still enough to route the item into media review instead of treating it like
    a generic broken web page.
    """
    if not isinstance(info, dict):
        return ""
    parts: list[str] = []
    title = str(info.get("title") or "").strip()
    if title:
        parts.append(f"Title: {title}")
    uploader = str(info.get("uploader") or info.get("channel") or "").strip()
    if uploader:
        parts.append(f"Channel/uploader: {uploader}")
    webpage_url = str(info.get("webpage_url") or info.get("original_url") or "").strip()
    if webpage_url:
        parts.append(f"Media URL: {webpage_url}")
    duration = info.get("duration")
    if duration:
        parts.append(f"Duration seconds: {duration}")
    categories = info.get("categories")
    if isinstance(categories, list) and categories:
        parts.append("Categories: " + ", ".join(str(c) for c in categories[:8] if c))
    tags = info.get("tags")
    if isinstance(tags, list) and tags:
        parts.append("Tags: " + ", ".join(str(t) for t in tags[:18] if t))
    description = str(info.get("description") or "").strip()
    if description:
        parts.append("Description:\n" + description)
    return "\n\n".join(part for part in parts if part).strip()


def _extract_media_metadata_snippet(source: str, max_chars: int) -> tuple[str, str]:
    """Try public yt-dlp metadata before generic URL acquisition for media URLs."""
    try:
        import yt_dlp
    except ImportError as exc:
        raise RuntimeError(f"yt-dlp unavailable for media metadata: {exc}") from exc

    opts = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": True,
        "extract_flat": False,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(source, download=False)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"yt-dlp metadata extraction failed: {exc}") from exc
    if not isinstance(info, dict):
        raise RuntimeError("yt-dlp returned no media metadata")
    text = _text_from_yt_dlp_info(info)
    if not text:
        raise RuntimeError("yt-dlp media metadata contained no triage text")
    return text[:max_chars], f"Extracted media metadata with yt-dlp ({len(text)} chars)"


def source_context_label(
    source: str,
    *,
    extraction_note: str = "",
    snippet: str = "",
    researcher_note: str = "",
) -> str:
    """Return source metadata for triage context.

    The triage model should not mistake Cloudflare/login/footer text for the
    document itself. This helper adds URL-derived hints so blocked pages,
    DOI/article landing pages, social profiles, and videos still route sensibly.
    """
    source = (source or "").strip()
    if not source:
        return ""

    parsed = urlparse(source)
    host = parsed.netloc.lower().removeprefix("www.")
    path = parsed.path.lower()
    hints: list[str] = []
    researcher_note = (researcher_note or "").strip()
    if researcher_note:
        hints.append(
            f"researcher note: {researcher_note}; use this researcher-provided "
            "source rationale when extraction text is blocked or boilerplate"
        )

    if _is_videoish_url(source):
        hints.append(
            "video platform URL; extraction may show page boilerplate; "
            "route as media/video and require transcript/media review when needed"
        )
    if host in _SOCIAL_HOST_HINTS or any(host.endswith(f".{h}") for h in _SOCIAL_HOST_HINTS):
        hints.append(
            "social media profile/post URL; extraction may show login or technical shell; "
            "do not classify the shell page as the source content; for profile/account "
            "URLs, use suggested_process_route=standard and needs_media_review=false "
            "unless the URL or note specifically indicates video, audio, or transcript work"
        )
    if (
        host in _ACADEMIC_HOST_HINTS
        or any(host.endswith(f".{h}") for h in _ACADEMIC_HOST_HINTS)
        or host == "doi.org"
        or "/doi/" in path
    ):
        hints.append(
            "academic/research article or DOI landing page; if extraction is blocked, "
            "route from URL metadata rather than classifying the blocker page"
        )
    if path.endswith(".pdf"):
        hints.append("direct PDF URL; likely report, article, or official document")

    blocker_probe = f"{extraction_note}\n{snippet[:700]}"
    if _BLOCKER_TEXT_RE.search(blocker_probe):
        hints.append(
            "extracted text appears to be access/login/challenge/boilerplate; "
            "treat it as extraction failure metadata, not as the document substance; "
            "set overnight_batch_safe=false because unattended ingest may capture the blocker page"
        )

    if not hints:
        return source

    return source + "\nSOURCE_HINTS: " + " | ".join(hints)


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
        media_note = ""
        if _is_videoish_url(source):
            try:
                return _extract_media_metadata_snippet(source, max_chars)
            except Exception as exc:  # noqa: BLE001
                media_note = f"Media metadata fallback failed: {exc}"

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
        if media_note:
            fallback_note = f"{fallback_note}; {media_note}"

        try:
            from runner.pipeline.acquire import acquire_url
        except ImportError:
            from .acquire import acquire_url

        acquired = acquire_url(source, timeout=15)
        if acquired.ok and acquired.html.strip():
            text = acquired.html.strip()
            return text[:max_chars], (
                f"{fallback_note}; acquired {len(text)} raw HTML chars via "
                f"{acquired.fetch_tool or 'acquisition fallback'}"
            )

        detail = acquired.challenge_signal or acquired.note or "no usable document body"
        raise RuntimeError(f"{fallback_note}; acquisition failed: {detail}")

    text = Path(source).read_text(encoding="utf-8", errors="ignore")
    return text[:max_chars], f"Read {len(text)} chars from local file"


def run(
    text: str,
    config: Config,
    *,
    source_label: str = "",
    _audit: dict | None = None,
) -> TriageResult:
    """Triage a document. Never raises -- returns a FAIL-CLOSED result on failure.

    A model/network/parse failure yields ``TriageResult.failed(...)`` with
    triage_succeeded=False and overnight_batch_safe=False, so an item is never
    mistaken for overnight-safe just because triage could not complete.
    """
    context = build_triage_context(text, source_label=source_label)
    user_msg = f"Document context:\n\n{context}\n\n---\nOutput JSON only."
    _started = time.perf_counter()
    if _audit is not None:
        _audit["context_char_count"] = len(context)
        _audit["prompt_sha256"] = sha256_text(_SYSTEM_PROMPT)
        _audit["prompt_template_sha256"] = sha256_text(_SYSTEM_PROMPT)
        _audit["git_commit"] = current_git_commit()
        _audit["validation_path"] = ""
        _audit["validation_attempts"] = 0
        _audit.setdefault("errors", [])

    raw: str | None = None
    errors: list[str] = []

    if config.litelm_base_url:
        try:
            if _audit is not None:
                _audit["model"] = "triage"
                _audit["model_parameters"] = {
                    "temperature": 0.0,
                    "max_tokens": 400,
                }
            raw = _call_litelm(user_msg, config)
        except Exception as exc:
            errors.append(f"litelm: {exc}")
            if _audit is not None:
                _audit.setdefault("errors", []).append(f"litelm: {exc}")

    if raw is None:
        try:
            if _audit is not None:
                _audit["model"] = config.local_analysis_model
                _audit["model_parameters"] = {
                    "temperature": 0.0,
                    "num_ctx": 4096,
                    "num_predict": 400,
                    "format": "json",
                    "think": False,
                }
            raw = _call_ollama(user_msg, config)
        except Exception as exc:
            errors.append(f"ollama: {exc}")
            if _audit is not None:
                _audit.setdefault("errors", []).append(f"ollama: {exc}")
                _audit["duration_ms"] = int((time.perf_counter() - _started) * 1000)
            return TriageResult.failed("; ".join(errors) or "no triage model available")

    if _audit is not None:
        _audit["raw_response_chars"] = len(raw)
    try:
        return _parse(raw, _audit=_audit)
    finally:
        if _audit is not None:
            _audit["duration_ms"] = int((time.perf_counter() - _started) * 1000)


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
            "think": False,
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


def save_triage_result(
    doc_id: str,
    result: "TriageResult",
    config: "Config",
    *,
    _audit: dict | None = None,
) -> Path:
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
    write_triage_audit(doc_dir, _audit, result, doc_id=doc_id)
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


def _parse(raw: str, *, _audit: dict | None = None) -> TriageResult:
    """Parse a triage model response. Fail closed on any non-parse.

    Only a clean JSON parse + schema validation marks triage_succeeded=True.
    overnight_batch_safe reflects the model's own value; if the model omits it,
    the schema default (False) applies -- a valid-but-incomplete response is not
    treated as overnight-safe.
    """
    text = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        if _audit is not None:
            _audit["validation_path"] = "failed"
            _audit["validation_attempts"] = 1
            _audit.setdefault("errors", []).append("response contained no JSON object")
        return TriageResult.failed("response contained no JSON object")
    try:
        result = TriageResult.model_validate(json.loads(m.group(0)))
    except Exception as exc:
        if _audit is not None:
            _audit["validation_path"] = "failed"
            _audit["validation_attempts"] = 1
            _audit.setdefault("errors", []).append(f"invalid triage JSON: {exc}")
        return TriageResult.failed(f"invalid triage JSON: {exc}")
    result.triage_succeeded = True
    if _audit is not None:
        _audit["validation_path"] = "json_object"
        _audit["validation_attempts"] = 1
    return result
