"""
Stage 2 — Document preprocessing.

Routing:
  PDF / EPUB / DOCX  → Docling (primary)  → Unstructured (fallback)
  URL / HTML         → Trafilatura
  Video / Audio      → yt-dlp subtitles → faster-whisper fallback
  SRT                → strip timestamps, clean text

Writes extracted.md and extracted.txt to the local corpus directory.
"""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path

from ..config import Config
from ..models.document import IntakeResult, PreprocessResult
from .transcripts import (
    chunks_to_text,
    compare_transcript_versions,
    deoverlap_caption_chunks,
    parse_timed_text,
    transcript_version,
)
from .media_evidence import (
    comment_evidence_from_ytdlp,
    discovery_seed_queue_from_media,
    duplicate_candidates_from_media,
)
from .system_tools import ensure_tool_path_env, tool_path

# Fallback constants — overridden by config or --max-chars CLI flag
_DEFAULT_LIMIT      = 24_000
_DEFAULT_HEAD_CHARS = 16_000
_DEFAULT_TAIL_CHARS =  6_000


def run(intake: IntakeResult, config: Config, max_chars: int | None = None) -> PreprocessResult:
    st = intake.source_type
    if st == "url":
        result = _preprocess_url(intake.source, snapshot_dir=intake.local_dir)
    elif st == "html":
        result = _preprocess_url(intake.source)
    elif st == "pdf":
        result = _preprocess_pdf(Path(intake.source))
    elif st == "epub":
        result = _preprocess_pdf(Path(intake.source))  # Docling handles EPUB
    elif st in ("video", "audio"):
        result = _preprocess_video(intake.source, config=config)
    elif st == "srt":
        result = _preprocess_srt(Path(intake.source))
    else:
        raise ValueError(f"Unknown source type: {st!r}")

    result.doc_id = intake.doc_id

    # Determine effective limit: CLI/app flag > env var > default.
    # max_chars=0 is intentional: _maybe_truncate treats 0 as no truncation.
    limit = max_chars if max_chars is not None else config.truncation_limit
    text, truncated = _maybe_truncate(
        result.text, limit,
        head_chars=config.truncation_head_chars,
        tail_chars=config.truncation_tail_chars,
    )
    result.text = text
    result.truncated = truncated
    result.char_count = len(result.text)

    if intake.local_dir:
        if result.source_html_sha256:
            _update_intake_html_hash(intake.local_dir, result.source_html_sha256)
        _save_artifacts(result, intake.local_dir)
        # Preservation status assessment — non-fatal, never blocks ingest.
        try:
            from .preservation import assess_preservation, write_preservation_status
            _html_text = ""
            _html_file = intake.local_dir / "source.html"
            if _html_file.exists():
                _html_text = _html_file.read_text(encoding="utf-8", errors="replace")
            _pstatus = assess_preservation(
                source=intake.source,
                source_type=intake.source_type,
                wayback_status=intake.wayback_status,
                preprocess_quality=result.quality,
                local_html_sha256=result.source_html_sha256,
                local_html_path=result.source_html_path,
                captured_html=_html_text,
            )
            write_preservation_status(intake.local_dir, _pstatus)
        except Exception:
            pass  # preservation assessment must never block ingestion

    return result


def _preprocess_url(url: str, snapshot_dir: Path | None = None) -> PreprocessResult:
    try:
        import trafilatura
    except ImportError:
        raise RuntimeError("trafilatura is not installed. Run: pip install trafilatura")

    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        raise ValueError(f"trafilatura: could not fetch {url}")
    snapshot_meta = _save_html_snapshot(downloaded, url, snapshot_dir) if snapshot_dir else {}

    # JSON output gives us structured metadata alongside the text
    import json as _json
    json_str = trafilatura.extract(
        downloaded,
        output_format="json",
        include_comments=True,   # reader comments often contain SOGICE rhetoric
        include_tables=True,     # tables may contain data (survey results, legislation)
        favor_recall=True,       # capture more content; LLM can filter noise
    )
    metadata: dict = _json.loads(json_str) if json_str else {}
    text = metadata.get("text") or trafilatura.extract(downloaded) or ""
    md   = trafilatura.extract(
        downloaded,
        output_format="markdown",
        include_comments=True,
        include_tables=True,
        favor_recall=True,
    ) or text

    # Full page intelligence extraction
    intel = _extract_page_intelligence(downloaded, base_url=url)

    # Deterministic language detection from og:locale / <html lang> (no model).
    from ..models.document import language_country_from_locale
    lang_from_locale, _ = language_country_from_locale(intel.og_locale or intel.html_lang)

    return PreprocessResult(
        doc_id="",
        tool_used="trafilatura",
        quality=_rate_quality(text, "trafilatura"),
        text=text,
        markdown=md,
        language_detected=lang_from_locale or None,
        title=metadata.get("title", "") or intel.og_title,
        author=metadata.get("author", ""),
        # Published-only: a modified date (e.g. og:updated_time) is NOT a
        # publication date. It is preserved in page_intel.date_modified and
        # surfaced separately as a review candidate downstream.
        date_published=metadata.get("date", "") or intel.date_published,
        sitename=metadata.get("sitename", "") or intel.publisher,
        description=metadata.get("description", "") or intel.og_description,
        hostname=metadata.get("hostname", ""),
        outbound_links=intel.outbound_links,
        page_intel=intel,
        source_html_path=snapshot_meta.get("path", ""),
        source_html_sha256=snapshot_meta.get("sha256", ""),
    )


def _save_html_snapshot(html: str | bytes, source_url: str, doc_dir: Path) -> dict:
    """Store the fetched HTML exactly as preprocessing saw it."""
    from datetime import datetime, timezone

    if isinstance(html, str):
        html_text = html
        html_bytes = html.encode("utf-8", errors="replace")
    else:
        html_bytes = html
        html_text = html.decode("utf-8", errors="replace")
    sha256 = hashlib.sha256(html_bytes).hexdigest()
    doc_dir.mkdir(parents=True, exist_ok=True)
    snapshot = doc_dir / "source.html"
    snapshot.write_text(html_text, encoding="utf-8", errors="replace")
    meta = {
        "source_url": source_url,
        "path": str(snapshot),
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "bytes": len(html_bytes),
        "sha256": sha256,
    }
    (doc_dir / "html_snapshot.json").write_text(
        json.dumps(meta, indent=2),
        encoding="utf-8",
    )
    return meta


def _preprocess_pdf(path: Path) -> PreprocessResult:
    """Docling primary, Unstructured fallback."""
    try:
        from docling.document_converter import DocumentConverter
        converter = DocumentConverter()
        doc = converter.convert(str(path))
        md   = doc.document.export_to_markdown()
        text = doc.document.export_to_text()
        quality = _rate_quality(text, "docling")
        return PreprocessResult(
            doc_id="",
            tool_used="docling",
            quality=quality,
            text=text,
            markdown=md,
        )
    except ImportError:
        pass
    except Exception as exc:
        import sys
        print(f"[docling error] {exc} — falling back to unstructured", file=sys.stderr)

    # Unstructured fallback
    try:
        from unstructured.partition.auto import partition
        elements = partition(filename=str(path))
        text = "\n\n".join(str(e) for e in elements)
        quality = _rate_quality(text, "unstructured")
        return PreprocessResult(
            doc_id="",
            tool_used="unstructured",
            quality=quality,
            text=text,
        )
    except ImportError:
        raise RuntimeError(
            "Neither docling nor unstructured is installed.\n"
            "Run: pip install docling  (or pip install unstructured)"
        )


def _preprocess_video(source: str, config: Config | None = None) -> PreprocessResult:
    """yt-dlp subtitle extraction; faster-whisper transcription fallback."""
    import tempfile, os

    ensure_tool_path_env()
    last_info: dict = {}
    _ytdlp_diagnostics: str = ""
    # Try yt-dlp subtitles first (fast, no compute)
    try:
        import yt_dlp
        with tempfile.TemporaryDirectory() as tmp:
            opts = {
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": ["en", "de", "fr", "nl", "no", "sv", "pt", "es"],
                "skip_download": True,
                "outtmpl": os.path.join(tmp, "%(id)s.%(ext)s"),
                "quiet": True,
                "writeinfojson": True,
                # YouTube may rate-limit or fail one caption language while others
                # are still usable. Do not force Whisper fallback just because a
                # non-selected subtitle download failed.
                "ignoreerrors": True,
                "getcomments": bool(getattr(config, "media_collect_comments", False)),
            }
            ffmpeg = tool_path("ffmpeg")
            if ffmpeg:
                opts["ffmpeg_location"] = ffmpeg
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(source, download=True)
                last_info = info or {}
            srt_files = list(Path(tmp).glob("*.vtt")) + list(Path(tmp).glob("*.srt"))
            if srt_files:
                versions: list[dict] = []
                texts_by_label: dict[str, str] = {}
                chunks_by_label: dict[str, list[dict]] = {}
                for caption_path in sorted(srt_files):
                    chunks = parse_timed_text(
                        caption_path.read_text(encoding="utf-8", errors="replace"),
                        source_format=caption_path.suffix.lstrip(".") or "caption",
                    )
                    chunks = deoverlap_caption_chunks(chunks)
                    if not chunks:
                        continue
                    label = caption_path.stem
                    language = _caption_language(caption_path)
                    kind = _caption_kind(info, language)
                    version = transcript_version(
                        label=label,
                        chunks=chunks,
                        language=language,
                        source="yt-dlp",
                        kind=kind,
                    )
                    versions.append(version)
                    texts_by_label[label] = chunks_to_text(chunks, include_timestamps=False)
                    chunks_by_label[label] = chunks
                if not versions:
                    raise ValueError("yt-dlp downloaded captions but no timed transcript chunks parsed")
                selected = _select_caption_version(versions)
                selected_chunks = chunks_by_label[selected["label"]]
                text = chunks_to_text(selected_chunks, include_timestamps=True)
                if text.strip():
                    quality = _rate_quality(text, "yt-dlp")
                    media_metadata, media_comments, duplicate_candidates, discovery_seed_queue = (
                        _media_sidecars_from_info(info or {}, source, config)
                    )
                    media_metadata["transcriptEvidence"] = {
                        "selectedTranscriptLabel": selected.get("label", ""),
                        "transcriptVersionCount": len(versions),
                        "transcriptChunkCount": len(selected_chunks),
                    }
                    return PreprocessResult(
                        doc_id="",
                        tool_used="yt-dlp",
                        quality=quality,
                        text=text,
                        title=(info or {}).get("title", ""),
                        author=(info or {}).get("uploader", "") or (info or {}).get("channel", ""),
                        date_published=_yt_upload_date((info or {}).get("upload_date", "")),
                        sitename=_platform_name(info or {}, source),
                        description=(info or {}).get("description", ""),
                        hostname=(info or {}).get("webpage_url_domain", ""),
                        language_detected=selected.get("language", "") or None,
                        media_metadata=media_metadata,
                        transcript_chunks=selected_chunks,
                        transcript_versions=versions,
                        transcript_comparison=compare_transcript_versions(versions, texts_by_label),
                        media_comments=media_comments,
                        duplicate_candidates=duplicate_candidates,
                        discovery_seed_queue=discovery_seed_queue,
                    )
    except ImportError:
        pass
    except Exception as _ytdlp_exc:
        _ytdlp_diagnostics = str(_ytdlp_exc)

    if not getattr(config, "media_allow_whisper", True):
        msg = "No usable platform captions were extracted."
        if _ytdlp_diagnostics:
            low = _ytdlp_diagnostics.lower()
            if "429" in _ytdlp_diagnostics or "too many requests" in low:
                msg += (
                    " YouTube rate-limited this request (HTTP 429). "
                    "Wait a few minutes and retry, or try from a different network."
                )
            elif any(kw in low for kw in ("sign in", "signin", "challenge", "bot detection", "js challenge")):
                msg += (
                    " YouTube returned a sign-in or bot-detection challenge. "
                    "Try a different network, or provide a cookies file via yt-dlp."
                )
            else:
                msg += f" yt-dlp diagnostic: {_ytdlp_diagnostics[:300]}"
        msg += " Upload an SRT/VTT transcript, or enable Whisper fallback for local transcription."
        raise RuntimeError(msg)

    # faster-whisper fallback (local file or downloaded audio)
    try:
        from faster_whisper import WhisperModel
        with tempfile.TemporaryDirectory() as tmp:
            audio_source, downloaded_info = _audio_source_for_whisper(source, Path(tmp))
            if downloaded_info:
                last_info = {**last_info, **downloaded_info}
            model = WhisperModel("small", device="cpu", compute_type="int8")
            segments, info = model.transcribe(audio_source, beam_size=5)
            segment_list = list(segments)
            text = " ".join(seg.text.strip() for seg in segment_list)
            chunks = [
                {
                    "index": i,
                    "start": _seconds_to_timestamp(getattr(seg, "start", 0.0)),
                    "end": _seconds_to_timestamp(getattr(seg, "end", 0.0)),
                    "text": seg.text.strip(),
                    "sourceFormat": "whisper",
                }
                for i, seg in enumerate(segment_list)
                if seg.text.strip()
            ]
        if chunks:
            text = chunks_to_text(chunks, include_timestamps=True)
        quality = _rate_quality(text, "whisper")
        version = transcript_version(
            label="whisper-local",
            chunks=chunks,
            language=info.language,
            source="faster-whisper",
            kind="local_transcription",
        )
        media_metadata, media_comments, duplicate_candidates, discovery_seed_queue = (
            _media_sidecars_from_info(last_info, source, config)
        )
        if media_metadata:
            media_metadata["transcriptEvidence"] = {
                "selectedTranscriptLabel": "whisper-local",
                "transcriptVersionCount": 1 if chunks else 0,
                "transcriptChunkCount": len(chunks),
            }
        return PreprocessResult(
            doc_id="",
            tool_used="whisper",
            quality=quality,
            text=text,
            language_detected=info.language,
            title=last_info.get("title", ""),
            author=last_info.get("uploader", "") or last_info.get("channel", ""),
            date_published=_yt_upload_date(last_info.get("upload_date", "")),
            sitename=_platform_name(last_info, source) if last_info else "",
            description=last_info.get("description", ""),
            hostname=last_info.get("webpage_url_domain", ""),
            media_metadata=media_metadata,
            transcript_chunks=chunks,
            transcript_versions=[version] if chunks else [],
            transcript_comparison={"versionCount": 1, "comparisons": []} if chunks else {},
            media_comments=media_comments,
            duplicate_candidates=duplicate_candidates,
            discovery_seed_queue=discovery_seed_queue,
        )
    except ImportError:
        raise RuntimeError(
            "Neither yt-dlp nor faster-whisper is installed.\n"
            "Run: pip install yt-dlp faster-whisper"
        )


def _preprocess_srt(path: Path) -> PreprocessResult:
    raw  = path.read_text(encoding="utf-8", errors="replace")
    chunks = parse_timed_text(raw, source_format=path.suffix.lstrip(".") or "srt")
    text = chunks_to_text(chunks, include_timestamps=True) if chunks else _strip_srt(raw)
    quality = _rate_quality(text, "srt")
    version = transcript_version(
        label=path.stem,
        chunks=chunks,
        language="",
        source="researcher_provided",
        kind="uploaded_srt",
    ) if chunks else {}
    return PreprocessResult(
        doc_id="",
        tool_used="srt",
        quality=quality,
        text=text,
        title=path.stem,
        transcript_chunks=chunks,
        transcript_versions=[version] if version else [],
        transcript_comparison={"versionCount": 1, "comparisons": []} if version else {},
        media_metadata={
            "contentFormat": "other",
            "mediaMode": "video",
            "transcriptEvidence": {
                "providedTranscriptPath": str(path),
                "providedTranscriptFormat": path.suffix.lstrip(".").lower(),
            },
        },
    )


def _strip_srt(raw: str) -> str:
    """Remove SRT/VTT sequence numbers, timestamps, and HTML tags."""
    # VTT header
    raw = re.sub(r"^WEBVTT.*?\n\n", "", raw, flags=re.DOTALL)
    # Timestamps: 00:00:00,000 --> 00:00:00,000  or  00:00.000 --> ...
    raw = re.sub(r"\d+:\d+[\d:,\.]+\s*-->\s*\d+[\d:,\. ]+\n?", "", raw)
    # Sequence numbers on their own line
    raw = re.sub(r"^\d+\s*$", "", raw, flags=re.MULTILINE)
    # VTT cue tags
    raw = re.sub(r"<[^>]+>", "", raw)
    # Collapse blank lines
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    return raw.strip()


def _audio_source_for_whisper(source: str, tmp_dir: Path) -> tuple[str, dict]:
    if not source.startswith(("http://", "https://")):
        return source, {}
    try:
        import yt_dlp
    except ImportError as exc:
        raise RuntimeError(
            "Video URL has no usable captions and yt-dlp is required to download audio for Whisper."
        ) from exc

    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(tmp_dir / "%(id)s.%(ext)s"),
        "quiet": True,
        "ignoreerrors": False,
        "writeinfojson": True,
    }
    ffmpeg = tool_path("ffmpeg")
    if ffmpeg:
        opts["ffmpeg_location"] = ffmpeg
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(source, download=True) or {}
        requested = info.get("requested_downloads") or []
        candidates = [
            Path(item.get("filepath", ""))
            for item in requested
            if item.get("filepath")
        ]
        candidates.extend(
            path for path in tmp_dir.iterdir()
            if path.is_file() and path.suffix.lower() not in {".json", ".srt", ".vtt"}
        )
        for candidate in candidates:
            if candidate.exists():
                return str(candidate), info
    raise RuntimeError("yt-dlp did not produce an audio file for Whisper transcription.")


def _caption_language(path: Path) -> str:
    parts = path.name.split(".")
    if len(parts) >= 3:
        return parts[-2]
    return ""


def _caption_kind(info: dict, language: str) -> str:
    subtitles = info.get("subtitles") or {}
    automatic = info.get("automatic_captions") or {}
    if language and language in subtitles:
        return "platform_manual_caption"
    if language and language in automatic:
        return "platform_auto_caption"
    return "platform_caption"


def _select_caption_version(versions: list[dict]) -> dict:
    language_priority = {"en": 0, "no": 1, "nb": 1, "nn": 1, "pt": 2, "es": 3}
    kind_priority = {
        "platform_manual_caption": 0,
        "platform_caption": 1,
        "platform_auto_caption": 2,
    }
    return sorted(
        versions,
        key=lambda v: (
            language_priority.get(str(v.get("language") or ""), 50),
            kind_priority.get(str(v.get("kind") or ""), 50),
            -int(v.get("charCount") or 0),
        ),
    )[0]


def _media_metadata_from_ytdlp(info: dict, source: str) -> dict:
    if not info:
        return {}
    webpage_url = info.get("webpage_url") or source
    platform = _platform_name(info, source).lower().replace(" ", "_") or "other"
    tags = info.get("tags") or []
    categories = info.get("categories") or []
    return {
        "contentFormat": "social_video",
        "mediaMode": "video",
        "general": {
            "durationMinutes": round((info.get("duration") or 0) / 60, 2) if info.get("duration") else None,
            "publicationDate": _yt_upload_date(info.get("upload_date", "")),
            "creator": info.get("uploader") or info.get("channel") or "",
            "channelUrl": info.get("channel_url") or "",
            "channelHandle": info.get("uploader_id") or "",
            "likeCount": info.get("like_count"),
            "commentCount": info.get("comment_count"),
            "availability": info.get("availability") or "",
            "seriesTitle": info.get("playlist_title") or "",
            "episodeTitle": info.get("title") or "",
            "synopsis": info.get("description") or "",
        },
        "platformDistribution": [
            {
                "platform": platform if platform in {
                    "youtube", "vimeo", "rumble", "odysee", "dailymotion",
                    "internet_archive", "facebook", "bitchute", "self_hosted",
                    "podcast_platform", "other",
                } else "other",
                "url": webpage_url,
                "viewCount": info.get("view_count"),
                "status": "active" if webpage_url else "unknown",
            }
        ],
        "reachMetrics": {
            "totalEstimatedViews": info.get("view_count"),
            "viewCountNote": "Captured from platform metadata via yt-dlp; platform metrics can change.",
        },
        "platformAlgorithmicSignals": {
            "tags": tags,
            "categories": categories,
            "hashtags": _hashtags(info.get("description") or ""),
            "chapters": [
                {
                    "title": c.get("title", ""),
                    "startTime": c.get("start_time"),
                    "endTime": c.get("end_time"),
                }
                for c in (info.get("chapters") or [])
            ],
            "thumbnails": [
                {
                    "url": t.get("url", ""),
                    "width": t.get("width"),
                    "height": t.get("height"),
                }
                for t in (info.get("thumbnails") or [])[:12]
            ],
            "note": "These are exposed platform metadata and presentation signals, not proof of recommendation algorithm behavior.",
        },
        "classificationProvenance": {
            "classificationSource": "model_suggested",
            "classificationReviewed": False,
            "classificationNotes": "Initial media metadata captured from yt-dlp.",
        },
        "rawYtDlpMetadata": _safe_ytdlp_info(info),
    }


def _safe_ytdlp_info(info: dict) -> dict:
    allowed = {
        "id", "title", "description", "webpage_url", "webpage_url_domain",
        "original_url", "uploader", "uploader_id", "channel", "channel_id",
        "channel_url", "upload_date", "timestamp", "duration", "view_count",
        "like_count", "comment_count", "tags", "categories", "availability",
        "age_limit", "live_status", "chapters", "thumbnails", "subtitles",
        "automatic_captions", "playlist", "playlist_title",
    }
    return {key: info.get(key) for key in sorted(allowed) if key in info}


def _media_sidecars_from_info(
    info: dict,
    source: str,
    config: Config | None = None,
) -> tuple[dict, list[dict], list[dict], list[dict]]:
    if not info:
        return {}, [], [], []
    media_metadata = _media_metadata_from_ytdlp(info, source)
    media_comments = comment_evidence_from_ytdlp(
        info,
        max_comments=int(getattr(config, "media_max_comments", 50)),
    )
    duplicate_candidates = duplicate_candidates_from_media(info, source)
    discovery_seed_queue = discovery_seed_queue_from_media(info, source)
    return media_metadata, media_comments, duplicate_candidates, discovery_seed_queue


def _yt_upload_date(value: str) -> str:
    if not value or not re.fullmatch(r"\d{8}", str(value)):
        return ""
    value = str(value)
    return f"{value[:4]}-{value[4:6]}-{value[6:8]}"


def _platform_name(info: dict, source: str) -> str:
    extractor = (info.get("extractor_key") or info.get("extractor") or "").lower()
    text = f"{extractor} {source}".lower()
    if "youtube" in text or "youtu.be" in text:
        return "youtube"
    if "vimeo" in text:
        return "vimeo"
    if "rumble" in text:
        return "rumble"
    if "odysee" in text:
        return "odysee"
    if "bitchute" in text:
        return "bitchute"
    if "facebook" in text:
        return "facebook"
    if "dailymotion" in text:
        return "dailymotion"
    if "archive.org" in text:
        return "internet_archive"
    return extractor or "other"


def _hashtags(text: str) -> list[str]:
    return sorted(set(re.findall(r"#[\w-]+", text or "")))


def _seconds_to_timestamp(value: float) -> str:
    total_ms = int(float(value or 0) * 1000)
    hours, rem = divmod(total_ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    seconds, ms = divmod(rem, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02}.{ms:03}"


def _rate_quality(text: str, tool: str) -> str:
    n = len(text)
    if n == 0:
        return "blocked"
    if n < 500:
        return "low"
    if n < 3000:
        return "medium"
    return "high"


def _maybe_truncate(
    text: str,
    limit: int | None = _DEFAULT_LIMIT,
    head_chars: int = _DEFAULT_HEAD_CHARS,
    tail_chars: int = _DEFAULT_TAIL_CHARS,
) -> tuple[str, bool]:
    if limit is None or limit <= 0:
        return text, False
    if len(text) <= limit:
        return text, False
    head_size = min(head_chars, limit)
    tail_size = min(tail_chars, limit - head_size)
    omitted = len(text) - head_size - tail_size
    head = text[:head_size]
    tail = text[-tail_size:] if tail_size > 0 else ""
    marker = f"[TRUNCATED MIDDLE — {omitted:,} chars omitted]"
    truncated = f"{head}\n\n{marker}\n\n{tail}" if tail else f"{head}\n\n{marker}"
    return truncated, True


def _extract_page_intelligence(html: str, base_url: str) -> "PageIntelligence":
    """Extract full web-page intelligence from raw HTML: links, documents, social
    profiles, structured data, Open Graph, JSON-LD, emails, media embeds."""
    import json as _json, re
    from urllib.parse import urljoin, urlparse
    from ..models.document import PageIntelligence

    try:
        from lxml import html as lxml_html
        tree = lxml_html.fromstring(html.encode() if isinstance(html, str) else html)
    except Exception:
        return PageIntelligence()

    base_domain = urlparse(base_url).netloc

    # ── Open Graph & meta tags ──────────────────────────────────────────────
    def _meta(prop: str, attr: str = "property") -> str:
        el = tree.find(f'.//meta[@{attr}="{prop}"]')
        return (el.get("content") or "") if el is not None else ""

    canonical_el = tree.find('.//link[@rel="canonical"]')
    canonical_url = canonical_el.get("href", "") if canonical_el is not None else ""

    # <html lang="..."> — fallback language signal when og:locale is absent.
    html_lang = ""
    try:
        root_el = tree if tree.tag == "html" else tree.getroottree().getroot()
        html_lang = (root_el.get("lang") or root_el.get("xml:lang") or "").strip()
    except Exception:
        html_lang = ""

    og_title       = _meta("og:title") or _meta("twitter:title", "name")
    og_description = _meta("og:description") or _meta("twitter:description", "name")
    og_image       = _meta("og:image") or _meta("twitter:image", "name")
    og_type        = _meta("og:type")
    og_locale      = _meta("og:locale")

    date_published = (
        _meta("article:published_time")
        or _meta("og:published_time")
        or _meta("date", "name")
        or _meta("dc.date", "name")
        or _meta("dc.date.issued", "name")
        or _meta("dcterms.created", "name")
        or _meta("pubdate", "name")
    )
    date_modified = (
        _meta("article:modified_time")
        or _meta("og:updated_time")
        or _meta("last-modified", "name")
        or _meta("dcterms.modified", "name")
    )
    publisher = _meta("og:site_name") or _meta("article:publisher")

    keywords_raw = _meta("keywords", "name")
    keywords = [k.strip() for k in keywords_raw.split(",") if k.strip()]

    # ── JSON-LD structured data ─────────────────────────────────────────────
    json_ld: list[dict] = []
    for script in tree.xpath('//script[@type="application/ld+json"]'):
        try:
            raw = (script.text or "").strip()
            if raw:
                obj = _json.loads(raw)
                if isinstance(obj, list):
                    json_ld.extend(obj)
                else:
                    json_ld.append(obj)
        except Exception:
            pass

    def _jsonld_nodes(value) -> list[dict]:
        nodes: list[dict] = []
        if isinstance(value, list):
            for item in value:
                nodes.extend(_jsonld_nodes(item))
        elif isinstance(value, dict):
            nodes.append(value)
            graph = value.get("@graph")
            if isinstance(graph, list):
                nodes.extend(_jsonld_nodes(graph))
        return nodes

    json_ld_nodes = []
    for obj in json_ld:
        json_ld_nodes.extend(_jsonld_nodes(obj))

    def _jsonld_text(value) -> str:
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, dict):
            for key in ("name", "url", "@id"):
                if value.get(key):
                    return str(value[key]).strip()
        return ""

    # Extract categories/tags, dates, and publisher from JSON-LD Article/NewsArticle
    tags: list[str] = []
    categories: list[str] = []
    author_url = ""
    for obj in json_ld_nodes:
        if isinstance(obj, dict):
            for k in ("keywords", "about"):
                v = obj.get(k)
                if isinstance(v, str):
                    tags.extend(x.strip() for x in v.split(",") if x.strip())
                elif isinstance(v, list):
                    tags.extend(str(x) for x in v if x)
            sect = obj.get("articleSection")
            if sect:
                categories.extend(sect if isinstance(sect, list) else [sect])
            au = obj.get("author")
            if isinstance(au, dict):
                author_url = au.get("url", "")
            date_published = date_published or _jsonld_text(
                obj.get("datePublished") or obj.get("dateCreated")
            )
            date_modified = date_modified or _jsonld_text(obj.get("dateModified"))
            pub = obj.get("publisher")
            if not publisher:
                if isinstance(pub, list) and pub:
                    publisher = _jsonld_text(pub[0])
                else:
                    publisher = _jsonld_text(pub)

    if not date_published:
        time_el = tree.find('.//time[@datetime]')
        if time_el is not None:
            date_published = (time_el.get("datetime") or "").strip()

    # ── Link classification ─────────────────────────────────────────────────
    _SOCIAL_DOMAINS: dict[str, str] = {
        "twitter.com": "twitter", "x.com": "twitter",
        "facebook.com": "facebook", "fb.com": "facebook",
        "youtube.com": "youtube", "youtu.be": "youtube",
        "instagram.com": "instagram",
        "linkedin.com": "linkedin",
        "tiktok.com": "tiktok",
        "vimeo.com": "vimeo",
        "rumble.com": "rumble",
        "telegram.me": "telegram", "t.me": "telegram",
        "odysee.com": "odysee",
        "bitchute.com": "bitchute",
        "gab.com": "gab",
        "gettr.com": "gettr",
        "truthsocial.com": "truthsocial",
        "substack.com": "substack",
    }
    _DOC_EXT = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".odt", ".epub", ".zip"}

    social_profiles: list[dict] = []
    document_links: list[dict] = []
    outbound_links: list[dict] = []
    internal_links: list[dict] = []
    seen_urls: set[str] = set()

    for a in tree.xpath("//a[@href]"):
        href = (a.get("href") or "").strip()
        if not href or href.startswith("#") or href.startswith("javascript:"):
            continue
        if href.startswith("mailto:"):
            email = href[7:].split("?")[0].strip()
            continue  # handled separately below
        full = urljoin(base_url, href)
        parsed = urlparse(full)
        if parsed.scheme not in ("http", "https"):
            continue
        if full in seen_urls:
            continue
        seen_urls.add(full)

        anchor = (a.text_content() or "").strip()[:150]
        domain = parsed.netloc.lstrip("www.")

        # Social media profiles
        for sd, platform in _SOCIAL_DOMAINS.items():
            if domain == sd or domain.endswith("." + sd):
                handle = parsed.path.strip("/").split("/")[0] if parsed.path.strip("/") else ""
                social_profiles.append({"platform": platform, "url": full, "handle": handle})
                break
        else:
            # Document / file links
            ext = re.search(r"\.\w{2,5}$", parsed.path.lower())
            if ext and ext.group() in _DOC_EXT:
                document_links.append({
                    "url": full,
                    "file_type": ext.group().lstrip("."),
                    "anchor_text": anchor,
                    "domain": domain,
                })
            # Internal vs outbound
            elif domain == base_domain.lstrip("www.") or parsed.netloc == base_domain:
                if len(internal_links) < 40:
                    internal_links.append({"url": full, "anchor_text": anchor})
            else:
                if len(outbound_links) < 80:
                    outbound_links.append({"url": full, "anchor_text": anchor, "domain": domain})

    # ── Embedded media ──────────────────────────────────────────────────────
    media_embeds: list[dict] = []
    for iframe in tree.xpath("//iframe[@src]"):
        src = iframe.get("src", "")
        title = iframe.get("title", "")
        yt = re.search(r"youtube\.com/embed/([A-Za-z0-9_-]+)", src)
        if yt:
            media_embeds.append({"platform": "youtube", "id": yt.group(1),
                                  "url": f"https://www.youtube.com/watch?v={yt.group(1)}", "title": title})
            continue
        vm = re.search(r"vimeo\.com/video/(\d+)", src)
        if vm:
            media_embeds.append({"platform": "vimeo", "id": vm.group(1),
                                  "url": f"https://vimeo.com/{vm.group(1)}", "title": title})

    # YouTube links in regular anchors
    for lnk in outbound_links:
        yt = re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]+)", lnk["url"])
        if yt and not any(e["id"] == yt.group(1) for e in media_embeds):
            media_embeds.append({"platform": "youtube", "id": yt.group(1),
                                  "url": lnk["url"], "title": lnk["anchor_text"]})

    # ── Email addresses ─────────────────────────────────────────────────────
    page_text = " ".join(tree.itertext())
    emails = list(dict.fromkeys(
        re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", page_text)
    ))[:10]

    return PageIntelligence(
        canonical_url=canonical_url,
        og_title=og_title,
        og_description=og_description,
        og_image=og_image,
        og_type=og_type,
        og_locale=og_locale,
        html_lang=html_lang,
        tags=list(dict.fromkeys(tags))[:30],
        categories=list(dict.fromkeys(categories))[:10],
        keywords=keywords[:20],
        date_published=date_published,
        date_modified=date_modified,
        publisher=publisher,
        author_url=author_url,
        social_profiles=social_profiles,
        document_links=document_links,
        media_embeds=media_embeds,
        emails=emails,
        json_ld=json_ld,
        internal_links=internal_links,
        outbound_links=outbound_links,
    )


def _extract_links(html: str, base_url: str, max_links: int = 80) -> list[dict]:
    """Thin wrapper used by _preprocess_url — returns outbound links only."""
    intel = _extract_page_intelligence(html, base_url)
    return intel.outbound_links


def _save_artifacts(result: PreprocessResult, doc_dir: Path) -> None:
    if result.markdown:
        (doc_dir / "extracted.md").write_text(result.markdown, encoding="utf-8")
    (doc_dir / "extracted.txt").write_text(result.text, encoding="utf-8")
    if result.media_metadata:
        (doc_dir / "media_metadata.json").write_text(
            json.dumps(result.media_metadata, indent=2),
            encoding="utf-8",
        )
        raw = result.media_metadata.get("rawYtDlpMetadata")
        if raw:
            (doc_dir / "video_metadata.json").write_text(
                json.dumps(raw, indent=2),
                encoding="utf-8",
            )
    if result.transcript_chunks:
        (doc_dir / "transcript_chunks.json").write_text(
            json.dumps(result.transcript_chunks, indent=2),
            encoding="utf-8",
        )
    if result.transcript_versions:
        (doc_dir / "transcript_versions.json").write_text(
            json.dumps(result.transcript_versions, indent=2),
            encoding="utf-8",
        )
    if result.transcript_comparison:
        (doc_dir / "transcript_comparison.json").write_text(
            json.dumps(result.transcript_comparison, indent=2),
            encoding="utf-8",
        )
    if result.media_comments:
        (doc_dir / "media_comments.json").write_text(
            json.dumps(
                {
                    "trustLevel": "lower_trust_platform_comment",
                    "reviewStatus": "needs_review",
                    "comments": result.media_comments,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    if result.duplicate_candidates:
        (doc_dir / "duplicate_candidates.json").write_text(
            json.dumps(result.duplicate_candidates, indent=2),
            encoding="utf-8",
        )
    if result.discovery_seed_queue:
        (doc_dir / "discovery_seed_queue.json").write_text(
            json.dumps(result.discovery_seed_queue, indent=2),
            encoding="utf-8",
        )
    (doc_dir / "preprocess.json").write_text(
        json.dumps(_preprocess_metadata(result), indent=2),
        encoding="utf-8",
    )


def _preprocess_metadata(result: PreprocessResult) -> dict:
    """Metadata-only JSON. Full text lives in extracted.txt as the source of truth."""
    page_intel = None
    if result.page_intel:
        page_intel = result.page_intel.__dict__
    return {
        "doc_id": result.doc_id,
        "tool_used": result.tool_used,
        "quality": result.quality,
        "ocr_images": result.ocr_images,
        "char_count": result.char_count,
        "truncated": result.truncated,
        "language_detected": result.language_detected,
        "title": result.title,
        "author": result.author,
        "date_published": result.date_published,
        "sitename": result.sitename,
        "description": result.description,
        "hostname": result.hostname,
        "outbound_links": result.outbound_links,
        "outbound_link_count": len(result.outbound_links),
        "page_intel": page_intel,
        "source_html_path": result.source_html_path,
        "source_html_sha256": result.source_html_sha256,
        "media_metadata_path": "media_metadata.json" if result.media_metadata else "",
        "transcript_chunks_path": "transcript_chunks.json" if result.transcript_chunks else "",
        "transcript_versions_path": "transcript_versions.json" if result.transcript_versions else "",
        "transcript_comparison_path": "transcript_comparison.json" if result.transcript_comparison else "",
        "media_comments_path": "media_comments.json" if result.media_comments else "",
        "duplicate_candidates_path": "duplicate_candidates.json" if result.duplicate_candidates else "",
        "discovery_seed_queue_path": "discovery_seed_queue.json" if result.discovery_seed_queue else "",
        "transcript_chunk_count": len(result.transcript_chunks),
        "transcript_version_count": len(result.transcript_versions),
        "media_comment_count": len(result.media_comments),
        "duplicate_candidate_count": len(result.duplicate_candidates),
        "discovery_seed_count": len(result.discovery_seed_queue),
    }


def repair_preprocess_metadata(data: dict, doc_dir: Path | None = None, base_url: str = "") -> dict:
    """Backfill publication metadata from saved page intelligence or source.html.

    This is used for older locally saved documents where HTML metadata existed
    but was not copied into top-level preprocess fields before upload.
    """
    repaired = dict(data or {})
    page_intel = repaired.get("page_intel")
    current_site = str(repaired.get("sitename") or "")
    needs_html_reparse = (
        not isinstance(page_intel, dict)
        or not (repaired.get("date_published") or page_intel.get("date_published"))
        or current_site.startswith(("http://", "https://"))
    )
    if needs_html_reparse and doc_dir:
        source_html = doc_dir / "source.html"
        if source_html.exists():
            try:
                intel = _extract_page_intelligence(
                    source_html.read_text(encoding="utf-8", errors="replace"),
                    base_url or repaired.get("canonical_url", ""),
                )
                page_intel = intel.__dict__
                repaired["page_intel"] = page_intel
            except Exception:
                page_intel = None

    if isinstance(page_intel, dict):
        if not repaired.get("date_published"):
            # Published-only — never backfill from a modified date here.
            repaired["date_published"] = page_intel.get("date_published", "")
        current_is_url = current_site.startswith(("http://", "https://"))
        if not current_site or current_is_url:
            repaired["sitename"] = page_intel.get("publisher", "")
        if not repaired.get("description"):
            repaired["description"] = page_intel.get("og_description", "")
        if not repaired.get("title"):
            repaired["title"] = page_intel.get("og_title", "")

    return repaired


def _update_intake_html_hash(doc_dir: Path, sha256: str) -> None:
    intake_path = doc_dir / "intake.json"
    if not intake_path.exists():
        return
    try:
        data = json.loads(intake_path.read_text(encoding="utf-8"))
    except Exception:
        return
    data["source_html_sha256"] = sha256
    intake_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
