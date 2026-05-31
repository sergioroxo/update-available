"""
Stage 2.5 — Preservation status assessment.

Classifies how well a source has been captured and whether additional
capture tools are needed.  Written as ``preservation_status.json`` in the
corpus document directory after preprocessing completes.

Design rules:
- Pure assessment only — no network requests, no live captures.
- Never blocks ingestion — callers must wrap in try/except.
- Do not pretend Browsertrix/ArchiveBox ran; only recommend a route.
- Uses only existing pipeline signals:
    - wayback_status from intake
    - source_type from intake
    - preprocess quality (text length / tool output)
    - source URL domain / path
    - raw captured HTML for blocker-pattern detection
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict, field
from pathlib import Path

# ---------------------------------------------------------------------------
# Blocker patterns — definitive indicators that the captured HTML is a
# challenge/bot-detection page, not the actual document.
# Kept narrower than triage.py's _BLOCKER_TEXT_RE to avoid false positives.
# ---------------------------------------------------------------------------
_BLOCKER_RE = re.compile(
    r"cloudflare|verify you are human|enable javascript to continue|"
    r"ddos.*?protection|cf-browser-verification|"
    r"please complete the security check|"
    r"javascript is required|just a moment\.\.\.",
    re.IGNORECASE,
)

# Only check the first N chars of captured HTML — we don't need to scan the whole page.
_BLOCKER_SCAN_CHARS = 10_000

# ---------------------------------------------------------------------------
# Domain sets for capture-route routing
# ---------------------------------------------------------------------------
_SOCIAL_DOMAINS: frozenset[str] = frozenset({
    "x.com", "twitter.com", "facebook.com", "instagram.com", "tiktok.com",
    "threads.net", "bsky.app",
})

_DOI_DOMAINS: frozenset[str] = frozenset({
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
    "jstor.org",
    "researchgate.net",
})

# Wayback statuses that represent a confirmed public archive copy.
_WAYBACK_ARCHIVED: frozenset[str] = frozenset({
    "existing", "existing-memento", "existing-cdx", "saved",
})

# Wayback statuses treated as absence of public archive (for notes).
_WAYBACK_FAILED: frozenset[str] = frozenset({
    "failed", "unavailable", "not-found",
})


# ---------------------------------------------------------------------------
# Data structure
# ---------------------------------------------------------------------------

@dataclass
class PreservationStatus:
    """Result of preservation/capture assessment for one corpus document.

    ``preservation_status`` is the primary classifier:
    - ``captured_html``   — Full HTML captured locally; extraction quality OK.
    - ``capture_needed``  — Source is blocked/dynamic/social; additional capture
                            tool is recommended before the document can be fully archived.
    - ``metadata_only``   — Source type only supports metadata (video/audio URL);
                            use yt-dlp metadata + transcript extraction.
    - ``not_applicable``  — Local file (PDF, EPUB, SRT, video/audio file) — no
                            HTML capture applies.

    ``suggested_capture_route`` names the recommended tool:
    - ``browsertrix``     — Dynamic/JS-heavy/Cloudflare-blocked pages.
    - ``manual_pdf``      — Paywalled academic articles / DOI landing pages.
    - ``screenshot``      — Social media posts or profiles.
    - ``media_metadata``  — Video/audio URLs — use yt-dlp metadata + transcript.
    - ``metadata_only``   — URL with no accessible content; record URL+metadata only.
    - ``""``              — No additional capture needed.
    """
    preservation_status: str     # see class docstring
    capture_needed: bool
    capture_reason: str
    suggested_capture_route: str  # see class docstring
    public_archive_status: str    # wayback_status value from intake (or "skipped")
    local_html_path: str
    local_html_sha256: str
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Core assessment — pure function, no I/O
# ---------------------------------------------------------------------------

def assess_preservation(
    *,
    source: str,
    source_type: str,
    wayback_status: str,
    preprocess_quality: str,
    local_html_sha256: str = "",
    local_html_path: str = "",
    captured_html: str = "",
) -> PreservationStatus:
    """Classify preservation/capture status from existing pipeline signals.

    Parameters
    ----------
    source:
        Original source string (URL or local file path).
    source_type:
        Detected source type from intake (``"url"``/``"pdf"``/``"video"``/…).
    wayback_status:
        ``wayback_status`` field from ``intake.json`` / ``IntakeResult``.
    preprocess_quality:
        ``quality`` field from ``PreprocessResult`` (``"high"``/…/``"blocked"``).
    local_html_sha256:
        SHA-256 of captured ``source.html``, or ``""`` if not captured.
    local_html_path:
        File path of captured ``source.html``, or ``""``.
    captured_html:
        Raw HTML content of the captured page.  Only the first
        ``_BLOCKER_SCAN_CHARS`` chars are scanned for blocker patterns.
        Pass ``""`` to skip blocker detection.

    Returns
    -------
    PreservationStatus
        Pure assessment — no side effects.
    """
    notes: list[str] = []
    public_archive_status = wayback_status or "skipped"
    is_local_file = not source.startswith(("http://", "https://"))

    # ── 1. Local files (PDF, EPUB, SRT, local video/audio) ───────────────
    if is_local_file and (
        source_type in ("pdf", "epub", "srt", "html", "video", "audio")
    ):
        return PreservationStatus(
            preservation_status="not_applicable",
            capture_needed=False,
            capture_reason="",
            suggested_capture_route="",
            public_archive_status=public_archive_status,
            local_html_path=local_html_path,
            local_html_sha256=local_html_sha256,
        )

    # For URL sources: parse domain once for subsequent checks.
    from urllib.parse import urlparse
    parsed = urlparse(source)
    host = parsed.netloc.lower().removeprefix("www.")
    path = parsed.path.lower()

    # ── 2. Social media domains ──────────────────────────────────────────
    # This runs before video/audio routing because intake deliberately treats
    # some social platforms (notably facebook.com) as possible media sources.
    # A profile/post shell still needs visual capture, not ordinary HTML.
    if any(host == d or host.endswith(f".{d}") for d in _SOCIAL_DOMAINS):
        notes.append(
            "Social media URL — HTML extraction typically shows a login wall "
            "or minimal platform shell, not the post/profile content."
        )
        return PreservationStatus(
            preservation_status="capture_needed",
            capture_needed=True,
            capture_reason=(
                "Social media page — HTML extraction shows platform shell, not content."
            ),
            suggested_capture_route="screenshot",
            public_archive_status=public_archive_status,
            local_html_path=local_html_path,
            local_html_sha256=local_html_sha256,
            notes=notes,
        )

    # ── 3. Video/audio platform URLs ────────────────────────────────────
    if source_type in ("video", "audio"):
        return PreservationStatus(
            preservation_status="metadata_only",
            capture_needed=False,
            capture_reason=(
                "Video/audio URL — use yt-dlp metadata and transcript extraction, "
                "not HTML capture."
            ),
            suggested_capture_route="media_metadata",
            public_archive_status=public_archive_status,
            local_html_path=local_html_path,
            local_html_sha256=local_html_sha256,
            notes=["Media sources use transcript extraction, not HTML capture."],
        )

    # ── 4. Blocker/challenge page detected in captured HTML ──────────────
    if captured_html and _BLOCKER_RE.search(captured_html[:_BLOCKER_SCAN_CHARS]):
        notes.append(
            "Captured HTML contains blocker/challenge page indicators "
            "(Cloudflare, DDoS protection, or JS-required wall)."
        )
        return PreservationStatus(
            preservation_status="capture_needed",
            capture_needed=True,
            capture_reason=(
                "Captured HTML appears to be a challenge/blocker page, "
                "not the document content."
            ),
            suggested_capture_route="browsertrix",
            public_archive_status=public_archive_status,
            local_html_path=local_html_path,
            local_html_sha256=local_html_sha256,
            notes=notes,
        )

    # ── 5. DOI / academic domains with poor extraction ───────────────────
    is_doi = (
        any(host == d or host.endswith(f".{d}") for d in _DOI_DOMAINS)
        or host == "doi.org"
        or "/doi/" in path
    )
    if is_doi and preprocess_quality in ("blocked", "low"):
        notes.append(
            "Academic/DOI URL with poor extraction quality — "
            "article is likely paywalled or requires institutional access."
        )
        return PreservationStatus(
            preservation_status="capture_needed",
            capture_needed=True,
            capture_reason=(
                "Academic/DOI page with failed or low-quality extraction — "
                "paywall or access restriction likely."
            ),
            suggested_capture_route="manual_pdf",
            public_archive_status=public_archive_status,
            local_html_path=local_html_path,
            local_html_sha256=local_html_sha256,
            notes=notes,
        )
    if is_doi and preprocess_quality in ("medium", "high"):
        notes.append(
            "Academic/DOI URL with acceptable extraction quality."
        )

    # ── 6. Extraction quality failure (no text extracted) ────────────────
    if preprocess_quality == "blocked":
        notes.append(
            "Preprocess quality=blocked — extraction returned no usable text."
        )
        return PreservationStatus(
            preservation_status="capture_needed",
            capture_needed=True,
            capture_reason=(
                "Preprocessing returned no text — source may be dynamically "
                "rendered or access-controlled."
            ),
            suggested_capture_route="browsertrix",
            public_archive_status=public_archive_status,
            local_html_path=local_html_path,
            local_html_sha256=local_html_sha256,
            notes=notes,
        )

    # ── 7. Local HTML captured successfully ──────────────────────────────
    if local_html_sha256:
        if public_archive_status in _WAYBACK_FAILED:
            notes.append(
                f"Local HTML snapshot captured. "
                f"Wayback status: {public_archive_status} — "
                "no confirmed public archive copy."
            )
        elif public_archive_status not in _WAYBACK_ARCHIVED:
            notes.append(
                f"Local HTML snapshot captured. "
                f"Wayback status: {public_archive_status}."
            )
        return PreservationStatus(
            preservation_status="captured_html",
            capture_needed=False,
            capture_reason="",
            suggested_capture_route="",
            public_archive_status=public_archive_status,
            local_html_path=local_html_path,
            local_html_sha256=local_html_sha256,
            notes=notes,
        )

    # ── 8. URL with no HTML captured ─────────────────────────────────────
    notes.append(
        "No local HTML snapshot found — preprocessing may not have captured the page."
    )
    return PreservationStatus(
        preservation_status="capture_needed",
        capture_needed=True,
        capture_reason="No local HTML captured — preprocessing did not run or failed.",
        suggested_capture_route="browsertrix",
        public_archive_status=public_archive_status,
        local_html_path="",
        local_html_sha256="",
        notes=notes,
    )


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------

def write_preservation_status(doc_dir: Path, status: PreservationStatus) -> Path:
    """Write preservation status to ``{doc_dir}/preservation_status.json``.

    The directory is created if it does not exist.  Returns the written path.
    """
    doc_dir.mkdir(parents=True, exist_ok=True)
    path = doc_dir / "preservation_status.json"
    path.write_text(
        json.dumps(status.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return path


def load_preservation_status(doc_dir: Path) -> PreservationStatus | None:
    """Load and deserialise ``preservation_status.json`` from ``doc_dir``.

    Returns ``None`` if the file does not exist or cannot be parsed.
    """
    path = doc_dir / "preservation_status.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return PreservationStatus(
            preservation_status=data.get("preservation_status", ""),
            capture_needed=bool(data.get("capture_needed", False)),
            capture_reason=data.get("capture_reason", ""),
            suggested_capture_route=data.get("suggested_capture_route", ""),
            public_archive_status=data.get("public_archive_status", ""),
            local_html_path=data.get("local_html_path", ""),
            local_html_sha256=data.get("local_html_sha256", ""),
            notes=list(data.get("notes", [])),
        )
    except Exception:
        return None
