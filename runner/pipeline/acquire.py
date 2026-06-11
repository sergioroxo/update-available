"""URL / local-HTML acquisition — separated from text extraction.

This layer is responsible ONLY for *getting bytes*, never for extracting
article text. It returns an :class:`AcquisitionResult` describing what was
fetched, the HTTP status / headers seen, which tool succeeded, and — crucially
— whether the response is a Cloudflare / bot-challenge / JS-wall rather than the
real document.

Design rules:
- Trafilatura ``fetch_url`` stays the first path for normal pages.
- httpx is a *fallback only*, with ordinary browser-like headers and redirects.
  We do NOT solve challenges, run JS, use cookies/credentials, or evade bots —
  a detected challenge is reported, not bypassed. Manual researcher capture is
  the intended remedy (handled downstream by the preservation router).
- Pure of model/Sanity/Supabase/queue access; the only side effect is the
  network read itself.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from pathlib import Path

# Browser-like request headers for the httpx fallback. Ordinary values a normal
# desktop browser sends — NOT a bot-evasion fingerprint.
_BROWSER_HEADERS: dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

_DEFAULT_TIMEOUT = 20.0

# HTTP statuses that, combined with Cloudflare markers, indicate a challenge.
_CHALLENGE_STATUSES: frozenset[int] = frozenset({403, 429, 503})

# Body text that definitively marks a challenge / bot-detection / JS wall.
_CHALLENGE_TEXT_RE = re.compile(
    r"just a moment\.\.\.|checking your browser|verify you are human|"
    r"enable javascript and cookies to continue|javascript is required|"
    r"cf-browser-verification|cf_chl_opt|cdn-cgi/challenge-platform|"
    r"ddos.*?protection|please complete the security check|"
    r"attention required.*?cloudflare|ray id",
    re.IGNORECASE,
)

# Only scan the first N chars of a body for challenge markers.
_CHALLENGE_SCAN_CHARS = 12_000


@dataclass
class AcquisitionResult:
    """Outcome of one acquisition attempt.

    ``ok`` is True only when a *real* document body was retrieved (not a
    challenge page and not empty). ``challenge`` is True when the response is a
    Cloudflare/bot/JS wall; in that case ``ok`` is False and ``challenge_signal``
    names the deterministic trigger.
    """

    ok: bool
    html: str = ""
    final_url: str = ""
    http_status: int | None = None
    headers: dict = field(default_factory=dict)  # lowercased subset
    fetch_tool: str = ""        # "trafilatura" | "httpx" | "local_file" | ""
    challenge: bool = False
    challenge_signal: str = ""  # "cf-mitigated:challenge" | "cloudflare_http:403" | "blocker_text" | ""
    note: str = ""

    def to_provenance(self) -> dict:
        """Serializable provenance for the ``acquisition.json`` sidecar.

        The full HTML body is intentionally omitted (it lives in source.html);
        only its length is recorded here.
        """
        data = asdict(self)
        data["html_chars"] = len(self.html)
        data.pop("html", None)
        return data


# ---------------------------------------------------------------------------
# Challenge classification (deterministic)
# ---------------------------------------------------------------------------

def _is_cloudflare(headers: dict) -> bool:
    server = str(headers.get("server", "")).lower()
    return "cloudflare" in server or "cf-ray" in headers


def classify_challenge(
    *, status: int | None, headers: dict, body: str
) -> str:
    """Return a challenge signal string, or ``""`` if no challenge is detected.

    Order: explicit ``cf-mitigated: challenge`` header → Cloudflare + blocking
    HTTP status → challenge/JS-wall body text.
    """
    cf_mitigated = str(headers.get("cf-mitigated", "")).lower()
    if "challenge" in cf_mitigated:
        return "cf-mitigated:challenge"
    if status in _CHALLENGE_STATUSES and _is_cloudflare(headers):
        return f"cloudflare_http:{status}"
    if body and _CHALLENGE_TEXT_RE.search(body[:_CHALLENGE_SCAN_CHARS]):
        return "blocker_text"
    return ""


def _lower_headers(raw) -> dict:
    """Lowercase header keys and keep only a small, useful subset."""
    keep = {
        "content-type", "server", "cf-ray", "cf-mitigated", "cf-cache-status",
        "retry-after", "location", "x-frame-options",
    }
    out: dict = {}
    try:
        for k, v in raw.items():
            lk = str(k).lower()
            if lk in keep:
                out[lk] = str(v)
    except Exception:
        pass
    return out


# ---------------------------------------------------------------------------
# Acquisition entry points
# ---------------------------------------------------------------------------

def acquire_url(url: str, *, timeout: float = _DEFAULT_TIMEOUT) -> AcquisitionResult:
    """Acquire a URL: Trafilatura first, httpx fallback, challenge-aware.

    Never raises for network/challenge problems — returns an
    :class:`AcquisitionResult` with ``ok=False`` so the caller can route the
    source to manual capture instead of crashing.
    """
    # ── 1. Trafilatura first path ─────────────────────────────────────────
    try:
        import trafilatura
    except ImportError as exc:
        # Surface the *actual* missing dependency (e.g. lxml_html_clean), not a
        # misleading "trafilatura is not installed" when it is.
        raise RuntimeError(
            f"trafilatura import failed ({exc.__class__.__name__}: {exc}). "
            "A dependency of trafilatura may be missing (e.g. lxml_html_clean). "
            "Install/repair with: pip install 'trafilatura' lxml_html_clean"
        ) from exc

    try:
        downloaded = trafilatura.fetch_url(url)
    except Exception as exc:  # noqa: BLE001 — network failure must not crash ingest
        downloaded = None
        traf_note = f"trafilatura.fetch_url raised: {exc}"
    else:
        traf_note = "" if downloaded else "trafilatura.fetch_url returned None"

    if downloaded:
        body = downloaded if isinstance(downloaded, str) else downloaded.decode("utf-8", "replace")
        signal = classify_challenge(status=None, headers={}, body=body)
        if signal:
            return AcquisitionResult(
                ok=False, html=body, final_url=url, fetch_tool="trafilatura",
                challenge=True, challenge_signal=signal,
                note="Trafilatura body matched a challenge/JS-wall pattern.",
            )
        return AcquisitionResult(
            ok=True, html=body, final_url=url, fetch_tool="trafilatura",
            note="Fetched via trafilatura.",
        )

    # ── 2. httpx fallback with browser-like headers ───────────────────────
    try:
        import httpx
    except ImportError as exc:  # httpx is a core dep; report honestly if absent
        return AcquisitionResult(
            ok=False, final_url=url, fetch_tool="",
            note=f"{traf_note}; httpx unavailable: {exc}",
        )

    try:
        resp = httpx.get(
            url, timeout=timeout, follow_redirects=True, headers=_BROWSER_HEADERS,
        )
    except Exception as exc:  # noqa: BLE001
        return AcquisitionResult(
            ok=False, final_url=url, fetch_tool="httpx",
            note=f"{traf_note}; httpx GET failed: {exc}",
        )

    headers = _lower_headers(resp.headers)
    body = resp.text or ""
    signal = classify_challenge(status=resp.status_code, headers=headers, body=body)
    if signal:
        return AcquisitionResult(
            ok=False, html=body, final_url=str(resp.url), http_status=resp.status_code,
            headers=headers, fetch_tool="httpx", challenge=True, challenge_signal=signal,
            note=f"{traf_note}; httpx classified a challenge ({signal}).",
        )
    if resp.status_code == 200 and body.strip():
        return AcquisitionResult(
            ok=True, html=body, final_url=str(resp.url), http_status=200,
            headers=headers, fetch_tool="httpx",
            note=f"{traf_note}; fetched {len(body)} chars via httpx fallback.",
        )
    # Non-200 / empty body that isn't a recognised challenge — still a failed
    # fetch; route to capture but do not assert a challenge we can't prove.
    return AcquisitionResult(
        ok=False, html=body, final_url=str(resp.url), http_status=resp.status_code,
        headers=headers, fetch_tool="httpx",
        note=f"{traf_note}; httpx returned status {resp.status_code} with "
             f"{len(body)} body chars (no usable document).",
    )


def acquire_local_html(path: str) -> AcquisitionResult:
    """Read a saved local ``.html`` / ``.htm`` file from disk (no network).

    Fixes the prior bug where local HTML was passed to ``trafilatura.fetch_url``
    (which expects a URL). A saved challenge page is still classified so it is
    routed to capture rather than mistaken for the document.
    """
    p = Path(path)
    if not p.is_file():
        return AcquisitionResult(
            ok=False, final_url=str(p), fetch_tool="local_file",
            note=f"Local HTML file not found: {path}",
        )
    try:
        body = p.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        return AcquisitionResult(
            ok=False, final_url=str(p), fetch_tool="local_file",
            note=f"Could not read local HTML file: {exc}",
        )
    signal = classify_challenge(status=None, headers={}, body=body)
    if signal:
        return AcquisitionResult(
            ok=False, html=body, final_url=str(p), fetch_tool="local_file",
            challenge=True, challenge_signal=signal,
            note="Saved HTML matched a challenge/JS-wall pattern.",
        )
    if not body.strip():
        return AcquisitionResult(
            ok=False, html="", final_url=str(p), fetch_tool="local_file",
            note="Saved HTML file is empty.",
        )
    return AcquisitionResult(
        ok=True, html=body, final_url=str(p), fetch_tool="local_file",
        note=f"Read {len(body)} chars from saved HTML file.",
    )
