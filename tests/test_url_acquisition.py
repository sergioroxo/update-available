"""U1 — Robust URL acquisition (fetch separated from extraction).

No real network: trafilatura.fetch_url and httpx.get are monkeypatched. Covers
challenge classification, the no-crash blocked path, httpx fallback success,
saved-local-HTML extraction, ImportError reporting, and shared regular-ingest /
source-worker behavior.
"""
from __future__ import annotations

import json
import types
from pathlib import Path

import pytest

from runner.pipeline import acquire
from runner.pipeline.acquire import (
    AcquisitionResult,
    acquire_local_html,
    acquire_url,
    classify_challenge,
)
from runner.pipeline.preservation import assess_preservation


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _Resp:
    def __init__(self, status, text, headers=None, url="https://example.org/a"):
        self.status_code = status
        self.text = text
        self.headers = headers or {}
        self.url = url


class _JsonResp(_Resp):
    def __init__(self, status, payload, headers=None, url="https://archive.org/wayback/available"):
        super().__init__(status, json.dumps(payload), headers=headers, url=url)
        self._payload = payload

    def json(self):
        return self._payload


def _patch_traf(monkeypatch, value):
    mod = types.SimpleNamespace(fetch_url=lambda url: value,
                                extract=lambda *a, **k: "")
    monkeypatch.setitem(__import__("sys").modules, "trafilatura", mod)


def _patch_httpx(monkeypatch, resp=None, raises=None):
    def _get(url, **kw):
        if raises is not None:
            raise raises
        return resp
    mod = types.SimpleNamespace(get=_get)
    monkeypatch.setitem(__import__("sys").modules, "httpx", mod)


# ---------------------------------------------------------------------------
# classify_challenge
# ---------------------------------------------------------------------------

def test_classify_cf_mitigated_header():
    assert classify_challenge(status=200, headers={"cf-mitigated": "challenge"}, body="") \
        == "cf-mitigated:challenge"


@pytest.mark.parametrize("status", [403, 429, 503])
def test_classify_cloudflare_blocking_status(status):
    sig = classify_challenge(status=status, headers={"server": "cloudflare"}, body="")
    assert sig == f"cloudflare_http:{status}"


def test_classify_blocker_body_text():
    assert classify_challenge(status=200, headers={}, body="<html>Just a moment...</html>") \
        == "blocker_text"


def test_classify_clean_page_is_not_challenge():
    assert classify_challenge(status=200, headers={"server": "nginx"},
                              body="<html><p>Real article</p></html>") == ""


def test_classify_403_without_cloudflare_is_not_challenge():
    # A bare 403 with no Cloudflare markers is a failed fetch, not a proven challenge.
    assert classify_challenge(status=403, headers={"server": "nginx"}, body="") == ""


# ---------------------------------------------------------------------------
# acquire_url
# ---------------------------------------------------------------------------

def test_acquire_url_trafilatura_first_path(monkeypatch):
    _patch_traf(monkeypatch, "<html><p>Real content</p></html>")
    acq = acquire_url("https://example.org/a")
    assert acq.ok is True
    assert acq.fetch_tool == "trafilatura"
    assert acq.challenge is False


def test_acquire_url_cf_mitigated_challenge_via_httpx(monkeypatch):
    _patch_traf(monkeypatch, None)  # trafilatura fails → httpx fallback
    _patch_httpx(monkeypatch, _Resp(403, "<html>blocked</html>",
                                    headers={"cf-mitigated": "challenge", "server": "cloudflare"}))
    acq = acquire_url("https://example.org/a")
    assert acq.ok is False
    assert acq.challenge is True
    assert acq.challenge_signal == "cf-mitigated:challenge"
    assert acq.http_status == 403
    assert acq.fetch_tool == "httpx"


def test_acquire_url_httpx_fallback_success(monkeypatch):
    _patch_traf(monkeypatch, None)
    _patch_httpx(monkeypatch, _Resp(200, "<html><p>Recovered via httpx</p></html>",
                                    headers={"server": "nginx"}))
    acq = acquire_url("https://example.org/a")
    assert acq.ok is True
    assert acq.fetch_tool == "httpx"
    assert acq.http_status == 200
    assert "Recovered via httpx" in acq.html


def test_acquire_url_httpx_fallback_uses_explicit_verify_bundle(monkeypatch):
    _patch_traf(monkeypatch, None)
    captured = {}

    def _get(url, **kw):
        captured.update(kw)
        return _Resp(200, "<html><p>Recovered via httpx</p></html>",
                     headers={"server": "nginx"})

    monkeypatch.setattr(acquire, "_httpx_verify_arg", lambda: "/tmp/certifi.pem")
    monkeypatch.setitem(__import__("sys").modules, "httpx", types.SimpleNamespace(get=_get))

    acq = acquire_url("https://example.org/a")

    assert acq.ok is True
    assert captured["verify"] == "/tmp/certifi.pem"


def test_acquire_url_cloudflare_403_body_challenge(monkeypatch):
    _patch_traf(monkeypatch, None)
    _patch_httpx(monkeypatch, _Resp(503, "Attention Required! Cloudflare ray id 123",
                                    headers={"server": "cloudflare", "cf-ray": "abc"}))
    acq = acquire_url("https://example.org/a")
    assert acq.challenge is True
    assert acq.challenge_signal == "cloudflare_http:503"


def test_acquire_url_httpx_error_is_not_raised(monkeypatch):
    _patch_traf(monkeypatch, None)
    _patch_httpx(monkeypatch, raises=RuntimeError("conn reset"))
    acq = acquire_url("https://example.org/a")
    assert acq.ok is False
    assert acq.challenge is False
    assert "httpx GET failed" in acq.note


def test_acquire_url_ssl_failure_recovers_from_wayback(monkeypatch):
    _patch_traf(monkeypatch, None)
    calls = []

    def _get(url, **kw):
        calls.append(url)
        if url == "https://example.org/broken-cert":
            raise RuntimeError("[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed")
        if url == acquire._WAYBACK_AVAILABLE_URL:
            return _JsonResp(200, {
                "archived_snapshots": {
                    "closest": {
                        "available": True,
                        "url": "https://web.archive.org/web/20240102030405/https://example.org/broken-cert",
                    }
                }
            })
        if url == "https://web.archive.org/web/20240102030405id_/https://example.org/broken-cert":
            return _Resp(200, "<html><p>Archived copy text</p></html>",
                         headers={"server": "nginx"}, url=url)
        raise AssertionError(f"unexpected URL {url}")

    monkeypatch.setitem(__import__("sys").modules, "httpx", types.SimpleNamespace(get=_get))

    acq = acquire_url("https://example.org/broken-cert")

    assert acq.ok is True
    assert acq.fetch_tool == "wayback-httpx"
    assert acq.final_url.endswith("id_/https://example.org/broken-cert")
    assert "Archived copy text" in acq.html
    assert "httpx GET failed" in acq.note
    assert "Wayback raw snapshot" in acq.note


def test_acquire_url_challenge_recovers_from_wayback(monkeypatch):
    _patch_traf(monkeypatch, None)

    def _get(url, **kw):
        if url == "https://example.org/challenged":
            return _Resp(403, "<html>blocked</html>",
                         headers={"cf-mitigated": "challenge", "server": "cloudflare"},
                         url=url)
        if url == acquire._WAYBACK_AVAILABLE_URL:
            return _JsonResp(200, {
                "archived_snapshots": {
                    "closest": {
                        "available": True,
                        "url": "https://web.archive.org/web/20230101000000/https://example.org/challenged",
                    }
                }
            })
        if url == "https://web.archive.org/web/20230101000000id_/https://example.org/challenged":
            return _Resp(200, "<html><p>Archived challenge-free page</p></html>",
                         headers={"server": "nginx"}, url=url)
        raise AssertionError(f"unexpected URL {url}")

    monkeypatch.setitem(__import__("sys").modules, "httpx", types.SimpleNamespace(get=_get))

    acq = acquire_url("https://example.org/challenged")

    assert acq.ok is True
    assert acq.challenge is False
    assert acq.fetch_tool == "wayback-httpx"
    assert "Archived challenge-free page" in acq.html


def test_acquire_url_challenge_recovers_from_wordpress_rest(monkeypatch):
    _patch_traf(monkeypatch, None)

    def _get(url, **kw):
        if url == "https://example.org/2020/01/sample-post":
            return _Resp(403, "<html>blocked</html>",
                         headers={"cf-mitigated": "challenge", "server": "cloudflare"},
                         url=url)
        if url == "https://example.org/wp-json/wp/v2/posts?slug=sample-post":
            return _JsonResp(200, [
                {
                    "id": 10,
                    "link": "https://example.org/2020/01/sample-post/",
                    "title": {"rendered": "Sample post"},
                    "excerpt": {"rendered": "<p>Excerpt</p>"},
                    "content": {"rendered": "<p>Recovered WordPress content</p>"},
                }
            ], headers={"server": "nginx"}, url=url)
        raise AssertionError(f"unexpected URL {url}")

    monkeypatch.setitem(__import__("sys").modules, "httpx", types.SimpleNamespace(get=_get))

    acq = acquire_url("https://example.org/2020/01/sample-post")

    assert acq.ok is True
    assert acq.fetch_tool == "wordpress-rest"
    assert acq.final_url == "https://example.org/2020/01/sample-post/"
    assert "Recovered WordPress content" in acq.html


def test_acquire_url_wayback_tries_url_variants(monkeypatch):
    _patch_traf(monkeypatch, None)
    seen_available_urls = []

    def _get(url, **kw):
        if url == "https://example.org/article":
            raise RuntimeError("[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed")
        if url == acquire._WAYBACK_AVAILABLE_URL:
            candidate = kw.get("params", {}).get("url")
            seen_available_urls.append(candidate)
            if candidate == "http://www.example.org/article":
                return _JsonResp(200, {
                    "archived_snapshots": {
                        "closest": {
                            "available": True,
                            "url": "https://web.archive.org/web/20190101000000/http://www.example.org/article",
                        }
                    }
                })
            return _JsonResp(200, {"archived_snapshots": {}})
        if url == acquire._WAYBACK_CDX_URL:
            return _JsonResp(200, [])
        if url == "https://web.archive.org/web/20190101000000id_/http://www.example.org/article":
            return _Resp(200, "<html><p>Variant archived text</p></html>",
                         headers={"server": "nginx"}, url=url)
        raise AssertionError(f"unexpected URL {url}")

    monkeypatch.setitem(__import__("sys").modules, "httpx", types.SimpleNamespace(get=_get))

    acq = acquire_url("https://example.org/article")

    assert acq.ok is True
    assert acq.fetch_tool == "wayback-httpx"
    assert "Variant archived text" in acq.html
    assert "http://www.example.org/article" in seen_available_urls


def test_acquire_url_wayback_tries_cdx_after_bad_closest(monkeypatch):
    _patch_traf(monkeypatch, None)

    def _get(url, **kw):
        if url == "https://example.org/old":
            return _Resp(403, "Forbidden", headers={"server": "nginx"}, url=url)
        if url == "https://example.org/wp-json/wp/v2/posts?slug=old":
            return _Resp(404, "not found", headers={"server": "nginx"}, url=url)
        if url == "https://example.org/wp-json/wp/v2/pages?slug=old":
            return _Resp(404, "not found", headers={"server": "nginx"}, url=url)
        if url == acquire._WAYBACK_AVAILABLE_URL:
            return _JsonResp(200, {
                "archived_snapshots": {
                    "closest": {
                        "available": True,
                        "url": "https://web.archive.org/web/20240101000000/https://example.org/old",
                    }
                }
            })
        if url == acquire._WAYBACK_CDX_URL:
            return _JsonResp(200, [
                ["timestamp", "original", "statuscode", "mimetype"],
                ["20200101000000", "https://example.org/old", "200", "text/html"],
            ])
        if url == "https://web.archive.org/web/20240101000000id_/https://example.org/old":
            return _Resp(200, "Just a moment...", headers={"server": "cloudflare"}, url=url)
        if url == "https://web.archive.org/web/20200101000000id_/https://example.org/old":
            return _Resp(200, "<html><p>Older usable capture</p></html>",
                         headers={"server": "nginx"}, url=url)
        raise AssertionError(f"unexpected URL {url}")

    monkeypatch.setitem(__import__("sys").modules, "httpx", types.SimpleNamespace(get=_get))

    acq = acquire_url("https://example.org/old")

    assert acq.ok is True
    assert "Older usable capture" in acq.html
    assert "CDX snapshot" in acq.note


def test_acquire_url_importerror_reports_underlying(monkeypatch):
    import builtins
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "trafilatura":
            raise ImportError("No module named 'lxml_html_clean'")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    with pytest.raises(RuntimeError) as exc:
        acquire_url("https://example.org/a")
    assert "lxml_html_clean" in str(exc.value)


# ---------------------------------------------------------------------------
# acquire_local_html
# ---------------------------------------------------------------------------

def test_acquire_local_html_reads_disk(tmp_path):
    f = tmp_path / "saved.html"
    f.write_text("<html><body><p>Saved article body</p></body></html>", encoding="utf-8")
    acq = acquire_local_html(str(f))
    assert acq.ok is True
    assert acq.fetch_tool == "local_file"
    assert "Saved article body" in acq.html


def test_acquire_local_html_missing_file(tmp_path):
    acq = acquire_local_html(str(tmp_path / "nope.html"))
    assert acq.ok is False
    assert "not found" in acq.note


def test_acquire_local_html_challenge_page(tmp_path):
    f = tmp_path / "challenge.html"
    f.write_text("<html>Just a moment... checking your browser</html>", encoding="utf-8")
    acq = acquire_local_html(str(f))
    assert acq.ok is False and acq.challenge is True


def test_provenance_omits_body_keeps_length():
    acq = AcquisitionResult(ok=True, html="abcde", fetch_tool="httpx")
    prov = acq.to_provenance()
    assert "html" not in prov
    assert prov["html_chars"] == 5
    assert prov["fetch_tool"] == "httpx"


# ---------------------------------------------------------------------------
# _preprocess_url integration — no crash on challenge
# ---------------------------------------------------------------------------

def test_preprocess_url_challenge_returns_blocked_not_raise(monkeypatch, tmp_path):
    from runner.pipeline import preprocess as pp
    import runner.pipeline.acquire as acq_mod
    monkeypatch.setattr(acq_mod, "acquire_url",
                        lambda url, **kw: AcquisitionResult(
                            ok=False, html="", final_url=url, http_status=403,
                            headers={"cf-mitigated": "challenge"}, fetch_tool="httpx",
                            challenge=True, challenge_signal="cf-mitigated:challenge"))
    result = pp._preprocess_url("https://example.org/a", snapshot_dir=tmp_path)
    assert result.quality == "blocked"
    assert result.text == ""
    assert result.acquisition["challenge"] is True
    # acquisition.json sidecar written.
    prov = json.loads((tmp_path / "acquisition.json").read_text(encoding="utf-8"))
    assert prov["challenge_signal"] == "cf-mitigated:challenge"


def test_preprocess_url_local_html_extracts(monkeypatch, tmp_path):
    from runner.pipeline import preprocess as pp
    src = tmp_path / "saved.html"
    src.write_text(
        "<html><head><title>T</title></head><body>"
        + ("<p>Real saved article paragraph. </p>" * 40)
        + "</body></html>",
        encoding="utf-8",
    )
    snap = tmp_path / "doc"
    snap.mkdir()
    result = pp._preprocess_url(str(src), snapshot_dir=snap, is_local_file=True)
    assert result.quality in ("medium", "high")
    assert "Real saved article paragraph" in result.text
    assert result.acquisition["fetch_tool"] == "local_file"


# ---------------------------------------------------------------------------
# Preservation routing for an acquisition challenge (header-only, empty body)
# ---------------------------------------------------------------------------

def test_preservation_routes_header_only_challenge_to_browsertrix():
    status = assess_preservation(
        source="https://example.org/a", source_type="url", wayback_status="failed",
        preprocess_quality="blocked", local_html_sha256="", local_html_path="",
        captured_html="",  # header-only challenge: no body to pattern-match
        acquisition_challenge=True, acquisition_challenge_signal="cf-mitigated:challenge",
    )
    assert status.preservation_status == "capture_needed"
    assert status.capture_needed is True
    assert status.suggested_capture_route == "browsertrix"


def test_preservation_clean_page_still_captured_html():
    status = assess_preservation(
        source="https://example.org/a", source_type="url", wayback_status="existing",
        preprocess_quality="high", local_html_sha256="a" * 64,
        local_html_path="/x/source.html", captured_html="<html>Real content</html>",
        acquisition_challenge=False,
    )
    assert status.preservation_status == "captured_html"


# ---------------------------------------------------------------------------
# Shared regular-ingest / source-worker behavior
# ---------------------------------------------------------------------------

def test_regular_ingest_and_worker_share_acquire(monkeypatch, tmp_path):
    """preprocess.run (regular ingest) and the worker both route a challenged URL
    to a blocked result + capture_needed, because both call _preprocess_url which
    calls the shared acquire layer."""
    from runner.pipeline import preprocess as pp
    import runner.pipeline.acquire as acq_mod

    monkeypatch.setattr(acq_mod, "acquire_url",
                        lambda url, **kw: AcquisitionResult(
                            ok=False, html="", final_url=url, http_status=403,
                            headers={"cf-mitigated": "challenge"}, fetch_tool="httpx",
                            challenge=True, challenge_signal="cf-mitigated:challenge"))

    doc_dir = tmp_path / "corpus" / "docX"
    doc_dir.mkdir(parents=True)
    (doc_dir / "intake.json").write_text("{}", encoding="utf-8")
    intake = types.SimpleNamespace(
        doc_id="docX", source="https://example.org/a", source_type="url",
        wayback_status="failed", local_dir=doc_dir,
    )
    config = types.SimpleNamespace(
        truncation_limit=24000, truncation_head_chars=16000, truncation_tail_chars=6000,
        media_collect_comments=False, media_max_comments=50, media_allow_whisper=False,
    )
    result = pp.run(intake, config)
    assert result.quality == "blocked"
    pstatus = json.loads((doc_dir / "preservation_status.json").read_text(encoding="utf-8"))
    assert pstatus["preservation_status"] == "capture_needed"
    assert pstatus["suggested_capture_route"] == "browsertrix"


# ---------------------------------------------------------------------------
# Triage snippet acquisition fallback
# ---------------------------------------------------------------------------

def test_triage_extract_snippet_uses_acquisition_fallback(monkeypatch):
    from runner.models.document import PreprocessResult
    from runner.pipeline import acquire as acquire_mod
    from runner.pipeline import preprocess, triage

    monkeypatch.setattr(
        preprocess,
        "_preprocess_url",
        lambda url: PreprocessResult(
            doc_id="",
            tool_used="trafilatura",
            quality="blocked",
            text="",
            acquisition={"note": "empty"},
        ),
    )
    monkeypatch.setattr(
        acquire_mod,
        "acquire_url",
        lambda url, timeout=15: AcquisitionResult(
            ok=True,
            html="<html><body>Recovered text for triage</body></html>",
            fetch_tool="httpx",
        ),
    )

    snippet, note = triage.extract_snippet("https://example.org/article")

    assert "Recovered text for triage" in snippet
    assert "acquired" in note
    assert "via httpx" in note


def test_triage_extract_snippet_uses_media_metadata_before_page_fetch(monkeypatch):
    from runner.pipeline import triage

    class FakeYoutubeDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def extract_info(self, url, download=False):
            assert download is False
            return {
                "title": "A testimony video",
                "uploader": "Example Channel",
                "webpage_url": url,
                "description": "A long description that gives triage enough routing signal.",
                "tags": ["conversion therapy", "testimony"],
            }

    monkeypatch.setitem(
        __import__("sys").modules,
        "yt_dlp",
        types.SimpleNamespace(YoutubeDL=FakeYoutubeDL),
    )

    snippet, note = triage.extract_snippet("https://www.bitchute.com/video/abc123")

    assert "A testimony video" in snippet
    assert "Example Channel" in snippet
    assert "conversion therapy" in snippet
    assert "yt-dlp" in note


def test_triage_extract_snippet_reports_acquisition_failure_without_direct_fetch(monkeypatch):
    from runner.models.document import PreprocessResult
    from runner.pipeline import acquire as acquire_mod
    from runner.pipeline import preprocess, triage

    monkeypatch.setattr(
        preprocess,
        "_preprocess_url",
        lambda url: PreprocessResult(
            doc_id="",
            tool_used="trafilatura",
            quality="blocked",
            text="",
            acquisition={"note": "empty"},
        ),
    )
    monkeypatch.setattr(
        acquire_mod,
        "acquire_url",
        lambda url, timeout=15: AcquisitionResult(
            ok=False,
            fetch_tool="httpx",
            note="trafilatura.fetch_url returned None; httpx GET failed: certificate verify failed",
        ),
    )

    with pytest.raises(RuntimeError) as exc:
        triage.extract_snippet("https://example.org/article")

    message = str(exc.value)
    assert "acquisition failed" in message
    assert "certificate verify failed" in message
    assert "direct fetch failed" not in message
