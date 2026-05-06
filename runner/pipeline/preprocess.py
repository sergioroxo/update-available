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

# Fallback constants — overridden by config or --max-chars CLI flag
_DEFAULT_LIMIT = 24_000
_HEAD_RATIO    = 0.67   # 2/3 of limit from the front
_TAIL_RATIO    = 0.25   # 1/4 of limit from the end


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
        result = _preprocess_video(intake.source)
    elif st == "srt":
        result = _preprocess_srt(Path(intake.source))
    else:
        raise ValueError(f"Unknown source type: {st!r}")

    result.doc_id = intake.doc_id

    # Determine effective limit: CLI flag > env var > default
    limit = max_chars if max_chars is not None else config.truncation_limit
    text, truncated = _maybe_truncate(result.text, limit)
    result.text = text
    result.truncated = truncated
    result.char_count = len(result.text)

    if intake.local_dir:
        if result.source_html_sha256:
            _update_intake_html_hash(intake.local_dir, result.source_html_sha256)
        _save_artifacts(result, intake.local_dir)

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

    return PreprocessResult(
        doc_id="",
        tool_used="trafilatura",
        quality=_rate_quality(text, "trafilatura"),
        text=text,
        markdown=md,
        title=metadata.get("title", "") or intel.og_title,
        author=metadata.get("author", ""),
        date_published=metadata.get("date", ""),
        sitename=metadata.get("sitename", ""),
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


def _preprocess_video(source: str) -> PreprocessResult:
    """yt-dlp subtitle extraction; faster-whisper transcription fallback."""
    import tempfile, os

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
            }
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([source])
            srt_files = list(Path(tmp).glob("*.vtt")) + list(Path(tmp).glob("*.srt"))
            if srt_files:
                text = _strip_srt(srt_files[0].read_text(encoding="utf-8"))
                if text.strip():
                    quality = _rate_quality(text, "yt-dlp")
                    return PreprocessResult(
                        doc_id="",
                        tool_used="yt-dlp",
                        quality=quality,
                        text=text,
                    )
    except ImportError:
        pass
    except Exception:
        pass

    # faster-whisper fallback (local file or downloaded audio)
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("small", device="cpu", compute_type="int8")
        segments, info = model.transcribe(source, beam_size=5)
        text = " ".join(seg.text.strip() for seg in segments)
        quality = _rate_quality(text, "whisper")
        return PreprocessResult(
            doc_id="",
            tool_used="whisper",
            quality=quality,
            text=text,
            language_detected=info.language,
        )
    except ImportError:
        raise RuntimeError(
            "Neither yt-dlp nor faster-whisper is installed.\n"
            "Run: pip install yt-dlp faster-whisper"
        )


def _preprocess_srt(path: Path) -> PreprocessResult:
    raw  = path.read_text(encoding="utf-8", errors="replace")
    text = _strip_srt(raw)
    quality = _rate_quality(text, "srt")
    return PreprocessResult(
        doc_id="",
        tool_used="srt",
        quality=quality,
        text=text,
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


def _rate_quality(text: str, tool: str) -> str:
    n = len(text)
    if n == 0:
        return "blocked"
    if n < 500:
        return "low"
    if n < 3000:
        return "medium"
    return "high"


def _maybe_truncate(text: str, limit: int | None = _DEFAULT_LIMIT) -> tuple[str, bool]:
    if limit is None or limit <= 0:
        return text, False
    if len(text) <= limit:
        return text, False
    head_size = int(limit * _HEAD_RATIO)
    tail_size = int(limit * _TAIL_RATIO)
    head = text[:head_size]
    tail = text[-tail_size:]
    truncated = f"{head}\n\n[TRUNCATED — {len(text)} total chars, showing first {head_size} + last {tail_size}]\n\n{tail}"
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

    og_title       = _meta("og:title") or _meta("twitter:title", "name")
    og_description = _meta("og:description") or _meta("twitter:description", "name")
    og_image       = _meta("og:image") or _meta("twitter:image", "name")
    og_type        = _meta("og:type")

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

    # Extract categories/tags from JSON-LD Article or NewsArticle
    tags: list[str] = []
    categories: list[str] = []
    author_url = ""
    for obj in json_ld:
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
        tags=list(dict.fromkeys(tags))[:30],
        categories=list(dict.fromkeys(categories))[:10],
        keywords=keywords[:20],
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
    }


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
