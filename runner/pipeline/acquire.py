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
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from urllib.parse import urlparse, urlunparse

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
_WAYBACK_AVAILABLE_URL = "https://archive.org/wayback/available"
_WAYBACK_CDX_URL = "https://web.archive.org/cdx"

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


def _httpx_verify_arg():
    """Return the certificate bundle argument for httpx GET fallback.

    macOS virtualenvs can disagree about which CA bundle to use. Prefer an
    explicit env override when present, then the certifi bundle if installed,
    falling back to httpx defaults. This keeps verification ON; it only makes
    the trusted CA path explicit.
    """
    for env_name in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE"):
        candidate = os.getenv(env_name, "").strip()
        if candidate and Path(candidate).exists():
            return candidate
    try:
        import certifi
        return certifi.where()
    except Exception:
        return True


def _wayback_raw_url(archive_url: str) -> str:
    """Return a raw-content Wayback URL when possible.

    ``id_`` suppresses the Wayback toolbar/rewrite shell, which is much safer
    for extraction. If the shape is not recognised, return the archive URL.
    """
    match = re.match(r"^(https://web\.archive\.org/web/)(\d+)([a-z_]*?)/(.*)$", archive_url)
    if not match:
        return archive_url
    prefix, timestamp, _modifier, original = match.groups()
    return f"{prefix}{timestamp}id_/{original}"


def _unique_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            out.append(value)
    return out


def _wayback_candidate_urls(url: str) -> list[str]:
    """Return conservative URL variants for Wayback lookup.

    Older sites and archive captures often differ only by http/https,
    ``www.`` prefix, or a trailing slash. Trying those variants improves
    capture recovery without changing the live-site fetch path.
    """
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return [url]

    paths = [parsed.path or ""]
    if parsed.path and not parsed.path.endswith("/"):
        paths.append(parsed.path + "/")
    elif parsed.path.endswith("/") and parsed.path != "/":
        paths.append(parsed.path.rstrip("/"))

    hosts = [parsed.netloc]
    if parsed.netloc.startswith("www."):
        hosts.append(parsed.netloc[4:])
    else:
        hosts.append("www." + parsed.netloc)

    schemes = [parsed.scheme, "http" if parsed.scheme == "https" else "https"]
    candidates: list[str] = []
    for scheme in schemes:
        for host in hosts:
            for path in paths:
                candidates.append(urlunparse((scheme, host, path, parsed.params, parsed.query, "")))
    return _unique_preserve_order(candidates)


def _wayback_available_snapshot(httpx, url: str, *, timeout: float) -> tuple[str, str]:
    """Return ``(raw_archive_url, note)`` for the closest public snapshot."""
    try:
        resp = httpx.get(
            _WAYBACK_AVAILABLE_URL,
            params={"url": url},
            timeout=timeout,
            follow_redirects=True,
            headers=_BROWSER_HEADERS,
            verify=_httpx_verify_arg(),
        )
    except Exception as exc:  # noqa: BLE001
        return "", f"wayback availability failed: {exc}"

    try:
        data = resp.json()
    except Exception as exc:  # noqa: BLE001
        return "", f"wayback availability returned non-JSON status {getattr(resp, 'status_code', '?')}: {exc}"

    closest = ((data.get("archived_snapshots") or {}).get("closest") or {})
    available = closest.get("available")
    snapshot_url = str(closest.get("url") or "").strip()
    if available and snapshot_url:
        return _wayback_raw_url(snapshot_url), "wayback closest snapshot found"
    return "", "wayback closest snapshot unavailable"


def _wayback_available_snapshot_for_variants(httpx, url: str, *, timeout: float) -> tuple[str, str]:
    notes: list[str] = []
    for candidate in _wayback_candidate_urls(url):
        archive_url, note = _wayback_available_snapshot(httpx, candidate, timeout=timeout)
        if archive_url:
            suffix = "" if candidate == url else f" for variant {candidate}"
            return archive_url, note + suffix
        notes.append(f"{candidate}: {note}")
    return "", "wayback closest snapshot unavailable for variants (" + " | ".join(notes[:4]) + ")"


def _wayback_cdx_snapshots(httpx, url: str, *, timeout: float, limit: int = 6) -> list[tuple[str, str]]:
    """Return recent successful Wayback raw snapshots from the CDX API.

    The ``available`` API gives one closest capture. For old/brittle sites that
    capture can itself be a blocker, redirect shell, or empty body, so CDX gives
    us a few more public captures to try before we give up and route to manual
    capture.
    """
    out: list[tuple[str, str]] = []
    try:
        resp = httpx.get(
            _WAYBACK_CDX_URL,
            params={
                "url": url,
                "output": "json",
                "fl": "timestamp,original,statuscode,mimetype",
                "filter": "statuscode:200",
                "collapse": "digest",
                "limit": str(-abs(limit)),
            },
            timeout=timeout,
            follow_redirects=True,
            headers=_BROWSER_HEADERS,
            verify=_httpx_verify_arg(),
        )
    except Exception:
        return out
    try:
        payload = resp.json()
    except Exception:
        return out
    if not isinstance(payload, list) or len(payload) < 2:
        return out
    for row in payload[1:]:
        if not isinstance(row, list) or len(row) < 2:
            continue
        timestamp = str(row[0] or "").strip()
        original = str(row[1] or url).strip()
        if timestamp and original:
            raw = f"https://web.archive.org/web/{timestamp}id_/{original}"
            out.append((raw, f"wayback CDX snapshot {timestamp} for {url}"))
    return out


def _wayback_snapshot_candidates(httpx, url: str, *, timeout: float) -> tuple[list[tuple[str, str]], str]:
    candidates: list[tuple[str, str]] = []
    notes: list[str] = []
    seen: set[str] = set()

    closest_url, closest_note = _wayback_available_snapshot_for_variants(httpx, url, timeout=timeout)
    if closest_url:
        candidates.append((closest_url, closest_note))
        seen.add(closest_url)
    else:
        notes.append(closest_note)

    for variant in _wayback_candidate_urls(url):
        for raw_url, note in _wayback_cdx_snapshots(httpx, variant, timeout=timeout):
            if raw_url not in seen:
                seen.add(raw_url)
                candidates.append((raw_url, note))

    return candidates, " | ".join(notes)


def _try_wayback_fallback(httpx, url: str, *, timeout: float, previous_note: str) -> AcquisitionResult | None:
    snapshot_candidates, snapshot_note = _wayback_snapshot_candidates(httpx, url, timeout=timeout)
    if not snapshot_candidates:
        return AcquisitionResult(
            ok=False,
            final_url=url,
            fetch_tool="wayback-httpx",
            note=f"{previous_note}; {snapshot_note or 'wayback snapshots unavailable'}",
        )

    failures: list[str] = []
    last_result: AcquisitionResult | None = None
    for archive_url, archive_note in snapshot_candidates:
        try:
            resp = httpx.get(
                archive_url,
                timeout=timeout,
                follow_redirects=True,
                headers=_BROWSER_HEADERS,
                verify=_httpx_verify_arg(),
            )
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{archive_note}: fetch failed: {exc}")
            continue

        headers = _lower_headers(resp.headers)
        body = resp.text or ""
        signal = classify_challenge(status=resp.status_code, headers=headers, body=body)
        if signal:
            failures.append(f"{archive_note}: challenge {signal}")
            last_result = AcquisitionResult(
                ok=False,
                html=body,
                final_url=str(resp.url),
                http_status=resp.status_code,
                headers=headers,
                fetch_tool="wayback-httpx",
                challenge=True,
                challenge_signal=signal,
                note=f"{previous_note}; {archive_note}; wayback snapshot classified a challenge ({signal}).",
            )
            continue
        if resp.status_code == 200 and body.strip():
            return AcquisitionResult(
                ok=True,
                html=body,
                final_url=str(resp.url),
                http_status=200,
                headers=headers,
                fetch_tool="wayback-httpx",
                note=f"{previous_note}; {archive_note}; fetched {len(body)} chars from Wayback raw snapshot.",
            )
        failures.append(f"{archive_note}: status {resp.status_code}, {len(body)} chars")
        last_result = AcquisitionResult(
            ok=False,
            html=body,
            final_url=str(resp.url),
            http_status=resp.status_code,
            headers=headers,
            fetch_tool="wayback-httpx",
            note=f"{previous_note}; {archive_note}; wayback returned status {resp.status_code} with "
                 f"{len(body)} body chars (no usable document).",
        )

    if last_result is not None:
        last_result.note = last_result.note + "; tried snapshots: " + " | ".join(failures[:6])
        return last_result
    return AcquisitionResult(
        ok=False, final_url=url, fetch_tool="wayback-httpx",
        note=f"{previous_note}; wayback snapshots failed: " + " | ".join(failures[:6]),
    )


def _wordpress_slug(url: str) -> str:
    path = urlparse(url).path.strip("/")
    if not path:
        return ""
    return path.split("/")[-1]


def _wordpress_api_urls(url: str) -> list[str]:
    parsed = urlparse(url)
    slug = _wordpress_slug(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not slug:
        return []
    base = f"{parsed.scheme}://{parsed.netloc}"
    return [
        f"{base}/wp-json/wp/v2/posts?slug={slug}",
        f"{base}/wp-json/wp/v2/pages?slug={slug}",
    ]


def _first_wordpress_record(payload) -> dict:
    if isinstance(payload, list) and payload and isinstance(payload[0], dict):
        return payload[0]
    if isinstance(payload, dict) and isinstance(payload.get("id"), int):
        return payload
    return {}


def _rendered_field(record: dict, key: str) -> str:
    value = record.get(key)
    if isinstance(value, dict):
        return str(value.get("rendered") or "")
    return str(value or "")


def _try_wordpress_fallback(httpx, url: str, *, timeout: float, previous_note: str) -> AcquisitionResult | None:
    """Try WordPress REST API for article/page URLs.

    This is not a bypass: it uses the site's public JSON API when exposed. Many
    older or poorly themed WordPress pages have broken article HTML but a usable
    REST payload.
    """
    notes: list[str] = []
    for api_url in _wordpress_api_urls(url):
        try:
            resp = httpx.get(
                api_url,
                timeout=timeout,
                follow_redirects=True,
                headers=_BROWSER_HEADERS,
                verify=_httpx_verify_arg(),
            )
        except Exception as exc:  # noqa: BLE001
            notes.append(f"{api_url}: {exc}")
            continue
        headers = _lower_headers(resp.headers)
        body = resp.text or ""
        signal = classify_challenge(status=resp.status_code, headers=headers, body=body)
        if signal:
            notes.append(f"{api_url}: challenge {signal}")
            continue
        if resp.status_code != 200:
            notes.append(f"{api_url}: status {resp.status_code}")
            continue
        try:
            record = _first_wordpress_record(resp.json())
        except Exception as exc:  # noqa: BLE001
            notes.append(f"{api_url}: non-json {exc}")
            continue
        title = _rendered_field(record, "title")
        excerpt = _rendered_field(record, "excerpt")
        content = _rendered_field(record, "content")
        html = "\n".join(part for part in (f"<h1>{title}</h1>" if title else "", excerpt, content) if part)
        if html.strip():
            return AcquisitionResult(
                ok=True,
                html=html,
                final_url=str(record.get("link") or url),
                http_status=200,
                headers=headers,
                fetch_tool="wordpress-rest",
                note=f"{previous_note}; fetched {len(html)} chars from public WordPress REST API.",
            )
        notes.append(f"{api_url}: empty record")
    if notes:
        return AcquisitionResult(
            ok=False,
            final_url=url,
            fetch_tool="wordpress-rest",
            note=f"{previous_note}; wordpress REST fallback failed: " + " | ".join(notes[:4]),
        )
    return None


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
            verify=_httpx_verify_arg(),
        )
    except Exception as exc:  # noqa: BLE001
        return _try_wayback_fallback(
            httpx, url, timeout=timeout,
            previous_note=f"{traf_note}; httpx GET failed: {exc}",
        ) or AcquisitionResult(
            ok=False, final_url=url, fetch_tool="httpx",
            note=f"{traf_note}; httpx GET failed: {exc}",
        )

    headers = _lower_headers(resp.headers)
    body = resp.text or ""
    signal = classify_challenge(status=resp.status_code, headers=headers, body=body)
    if signal:
        wordpress = _try_wordpress_fallback(
            httpx, url, timeout=timeout,
            previous_note=f"{traf_note}; httpx classified a challenge ({signal})",
        )
        if wordpress and wordpress.ok:
            return wordpress
        archived = _try_wayback_fallback(
            httpx, url, timeout=timeout,
            previous_note=f"{traf_note}; httpx classified a challenge ({signal})",
        )
        if archived and archived.ok:
            return archived
        return AcquisitionResult(
            ok=False, html=body, final_url=str(resp.url), http_status=resp.status_code,
            headers=headers, fetch_tool="httpx", challenge=True, challenge_signal=signal,
            note=(archived.note if archived else f"{traf_note}; httpx classified a challenge ({signal})."),
        )
    if resp.status_code == 200 and body.strip():
        return AcquisitionResult(
            ok=True, html=body, final_url=str(resp.url), http_status=200,
            headers=headers, fetch_tool="httpx",
            note=f"{traf_note}; fetched {len(body)} chars via httpx fallback.",
        )
    # Non-200 / empty body that isn't a recognised challenge — still a failed
    # fetch; route to capture but do not assert a challenge we can't prove.
    wordpress = _try_wordpress_fallback(
        httpx,
        url,
        timeout=timeout,
        previous_note=(
            f"{traf_note}; httpx returned status {resp.status_code} with "
            f"{len(body)} body chars (no usable document)"
        ),
    )
    if wordpress and wordpress.ok:
        return wordpress
    return _try_wayback_fallback(
        httpx, url, timeout=timeout,
        previous_note=(
            f"{traf_note}; httpx returned status {resp.status_code} with "
            f"{len(body)} body chars (no usable document)"
        ),
    ) or AcquisitionResult(
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
