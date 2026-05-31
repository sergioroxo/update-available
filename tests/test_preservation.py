"""TASK P — Preservation status assessment.

Covers:
  assess_preservation() unit tests:
    - normal HTML captured (high quality, sha256 present) → captured_html
    - Wayback failed but local HTML captured → captured_html, public_archive_status=failed
    - Wayback disabled but local HTML captured → captured_html, public_archive_status=disabled
    - Cloudflare/challenge text in captured HTML → capture_needed, browsertrix
    - preprocess quality=blocked (no text) → capture_needed, browsertrix
    - social URL (Twitter/X) → capture_needed, screenshot
    - social URL (Instagram) → capture_needed, screenshot
    - social URL classified as video by intake → capture_needed, screenshot
    - YouTube video URL (source_type=video) → metadata_only, media_metadata
    - Video file path (not URL) → not_applicable
    - DOI URL with poor extraction → capture_needed, manual_pdf
    - DOI URL with high-quality extraction → captured_html
    - PDF local file → not_applicable
    - SRT file → not_applicable
    - URL with no HTML captured (no sha256) → capture_needed, browsertrix
    - Wayback existing + local HTML → captured_html, no Wayback note

  write_preservation_status() / load_preservation_status():
    - creates preservation_status.json
    - round-trip: load matches write
    - load returns None when file absent
    - load returns None on corrupt file

  preprocess.run() integration:
    - preservation_status.json is written by preprocess.run()
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner.pipeline.preservation import (
    PreservationStatus,
    assess_preservation,
    load_preservation_status,
    write_preservation_status,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _assess(**kwargs) -> PreservationStatus:
    """Call assess_preservation with sensible defaults; override with kwargs."""
    defaults = dict(
        source="https://example.org/article",
        source_type="url",
        wayback_status="existing",
        preprocess_quality="high",
        local_html_sha256="a" * 64,
        local_html_path="/corpus/abc/source.html",
        captured_html="<html><body>Article content here.</body></html>",
    )
    defaults.update(kwargs)
    return assess_preservation(**defaults)


# ---------------------------------------------------------------------------
# assess_preservation() — normal and edge cases
# ---------------------------------------------------------------------------

def test_normal_html_captured():
    """High-quality extraction, local sha256 present, Wayback existing → captured_html."""
    ps = _assess()
    assert ps.preservation_status == "captured_html"
    assert ps.capture_needed is False
    assert ps.suggested_capture_route == ""
    assert ps.local_html_sha256 == "a" * 64
    assert ps.public_archive_status == "existing"


def test_wayback_failed_local_html_captured():
    """Wayback failed but HTML was captured locally → captured_html, public_archive_status=failed."""
    ps = _assess(wayback_status="failed")
    assert ps.preservation_status == "captured_html"
    assert ps.capture_needed is False
    assert ps.public_archive_status == "failed"
    # Notes should mention the Wayback failure
    assert any("failed" in n.lower() for n in ps.notes)


def test_wayback_disabled_local_html_captured():
    """Wayback disabled (config setting) but local HTML present → captured_html."""
    ps = _assess(wayback_status="disabled")
    assert ps.preservation_status == "captured_html"
    assert ps.capture_needed is False
    assert ps.public_archive_status == "disabled"


def test_wayback_existing_local_html_no_notes():
    """Wayback existing + good quality → no Wayback warning in notes."""
    ps = _assess(wayback_status="existing")
    assert ps.preservation_status == "captured_html"
    # No note about Wayback failure
    assert not any("failed" in n.lower() for n in ps.notes)
    assert not any("no confirmed" in n.lower() for n in ps.notes)


def test_wayback_saved_counts_as_archived():
    ps = _assess(wayback_status="saved")
    assert ps.preservation_status == "captured_html"
    assert ps.capture_needed is False


def test_cloudflare_blocked():
    """Captured HTML contains Cloudflare challenge → capture_needed, browsertrix."""
    ps = _assess(
        captured_html="<html><body>Cloudflare — verify you are human</body></html>",
        preprocess_quality="low",
        local_html_sha256="b" * 64,
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.capture_needed is True
    assert ps.suggested_capture_route == "browsertrix"


def test_enable_javascript_blocker():
    """'Enable JavaScript to continue' in HTML → capture_needed, browsertrix."""
    ps = _assess(
        captured_html="<html><body>Please enable JavaScript to continue.</body></html>",
        preprocess_quality="low",
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.suggested_capture_route == "browsertrix"


def test_just_a_moment_cloudflare():
    """Cloudflare 'Just a moment...' page → capture_needed, browsertrix."""
    ps = _assess(
        captured_html="<title>Just a moment...</title><body>Checking your browser</body>",
        preprocess_quality="low",
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.suggested_capture_route == "browsertrix"


def test_preprocess_quality_blocked_no_html():
    """quality=blocked, no sha256 → capture_needed, browsertrix."""
    ps = _assess(
        preprocess_quality="blocked",
        local_html_sha256="",
        local_html_path="",
        captured_html="",
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.capture_needed is True
    assert ps.suggested_capture_route == "browsertrix"


def test_preprocess_quality_blocked_with_sha256():
    """quality=blocked (no text extracted), sha256 present (HTML was saved) → capture_needed.

    The raw HTML was saved but extraction failed — still needs capture review.
    """
    ps = _assess(
        preprocess_quality="blocked",
        local_html_sha256="c" * 64,
        captured_html="",  # no blocker text (the empty test), rely on quality check
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.suggested_capture_route == "browsertrix"


def test_social_url_twitter():
    """Twitter URL → capture_needed, screenshot."""
    ps = _assess(
        source="https://twitter.com/user/status/123456",
        captured_html="<html><body>Twitter page</body></html>",
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.capture_needed is True
    assert ps.suggested_capture_route == "screenshot"


def test_social_url_x_com():
    """x.com URL → capture_needed, screenshot."""
    ps = _assess(source="https://x.com/someone/status/789")
    assert ps.preservation_status == "capture_needed"
    assert ps.suggested_capture_route == "screenshot"


def test_social_url_instagram():
    """Instagram → capture_needed, screenshot."""
    ps = _assess(source="https://instagram.com/p/abc123/")
    assert ps.preservation_status == "capture_needed"
    assert ps.suggested_capture_route == "screenshot"


def test_social_url_facebook_video_type_still_screenshot():
    """Facebook can be source_type=video in intake but remains a social shell."""
    ps = _assess(
        source="https://facebook.com/example.page/posts/123",
        source_type="video",
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.suggested_capture_route == "screenshot"


def test_video_platform_url_youtube():
    """YouTube video URL (source_type=video) → metadata_only, media_metadata."""
    ps = _assess(
        source="https://youtube.com/watch?v=abc123",
        source_type="video",
        preprocess_quality="low",  # HTML extraction would fail
        local_html_sha256="",
    )
    assert ps.preservation_status == "metadata_only"
    assert ps.capture_needed is False
    assert ps.suggested_capture_route == "media_metadata"


def test_video_url_vimeo():
    ps = _assess(
        source="https://vimeo.com/12345678",
        source_type="video",
    )
    assert ps.preservation_status == "metadata_only"
    assert ps.suggested_capture_route == "media_metadata"


def test_audio_url():
    ps = _assess(
        source="https://soundcloud.com/artist/track",
        source_type="audio",
    )
    assert ps.preservation_status == "metadata_only"
    assert ps.suggested_capture_route == "media_metadata"


def test_local_video_file():
    """Local video file (not URL) → not_applicable."""
    ps = _assess(
        source="/home/user/recording.mp4",
        source_type="video",
        wayback_status="skipped",
        local_html_sha256="",
        local_html_path="",
        captured_html="",
    )
    assert ps.preservation_status == "not_applicable"
    assert ps.capture_needed is False
    assert ps.suggested_capture_route == ""


def test_local_pdf_file():
    """Local PDF → not_applicable."""
    ps = _assess(
        source="/home/user/document.pdf",
        source_type="pdf",
        wayback_status="skipped",
        local_html_sha256="",
        local_html_path="",
        captured_html="",
    )
    assert ps.preservation_status == "not_applicable"
    assert ps.capture_needed is False


def test_local_html_file():
    """Local HTML file → not_applicable (already researcher-held local source)."""
    ps = _assess(
        source="/home/user/page.html",
        source_type="html",
        wayback_status="skipped",
        local_html_sha256="",
        local_html_path="",
        captured_html="",
    )
    assert ps.preservation_status == "not_applicable"
    assert ps.capture_needed is False


def test_srt_file():
    """SRT transcript file → not_applicable."""
    ps = _assess(
        source="/home/user/subtitles.srt",
        source_type="srt",
        wayback_status="skipped",
        local_html_sha256="",
        local_html_path="",
        captured_html="",
    )
    assert ps.preservation_status == "not_applicable"


def test_doi_poor_extraction():
    """DOI URL with low extraction quality → capture_needed, manual_pdf."""
    ps = _assess(
        source="https://doi.org/10.1234/some-paper",
        source_type="url",
        preprocess_quality="low",
        captured_html="<html><body>Sign in to view full text.</body></html>",
        local_html_sha256="d" * 64,
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.capture_needed is True
    assert ps.suggested_capture_route == "manual_pdf"


def test_doi_blocked_extraction():
    """DOI URL with blocked extraction → capture_needed, manual_pdf."""
    ps = _assess(
        source="https://doi.org/10.1234/blocked-paper",
        source_type="url",
        preprocess_quality="blocked",
        captured_html="<html><body>Please sign in.</body></html>",
        local_html_sha256="",
    )
    # blocked preprocess_quality on a DOI → manual_pdf (DOI check fires before quality=blocked)
    assert ps.preservation_status == "capture_needed"
    assert ps.suggested_capture_route == "manual_pdf"


def test_academic_domain_poor_extraction():
    """Academic journal with poor extraction → capture_needed, manual_pdf."""
    ps = _assess(
        source="https://journals.sagepub.com/doi/10.1177/0003122414524219",
        source_type="url",
        preprocess_quality="low",
        local_html_sha256="e" * 64,
        captured_html="<html><body>Access restricted.</body></html>",
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.suggested_capture_route == "manual_pdf"


def test_doi_good_quality_captured():
    """DOI URL with high-quality extraction → captured_html (open access article)."""
    ps = _assess(
        source="https://doi.org/10.1234/open-access",
        source_type="url",
        preprocess_quality="high",
        local_html_sha256="f" * 64,
        captured_html="<html><body>Full article text here, very long content...</body></html>",
    )
    assert ps.preservation_status == "captured_html"
    assert ps.capture_needed is False


def test_url_no_html_captured():
    """URL source with no local HTML (sha256 empty) → capture_needed, browsertrix."""
    ps = _assess(
        preprocess_quality="low",
        local_html_sha256="",
        local_html_path="",
        captured_html="",
    )
    assert ps.preservation_status == "capture_needed"
    assert ps.capture_needed is True
    assert ps.suggested_capture_route == "browsertrix"


def test_public_archive_status_propagated():
    """public_archive_status is always the wayback_status value passed in."""
    for ws in ("existing", "saved", "failed", "disabled", "skipped", "unavailable"):
        ps = _assess(wayback_status=ws)
        assert ps.public_archive_status == ws


def test_assess_is_pure_no_io(tmp_path):
    """assess_preservation must not touch the filesystem."""
    import os
    before = list(tmp_path.iterdir())
    _assess()
    assert list(tmp_path.iterdir()) == before


# ---------------------------------------------------------------------------
# write_preservation_status() / load_preservation_status()
# ---------------------------------------------------------------------------

def test_write_creates_json_file(tmp_path):
    status = _assess()
    path = write_preservation_status(tmp_path, status)
    assert path.exists()
    assert path.name == "preservation_status.json"


def test_write_content_is_valid_json(tmp_path):
    status = _assess()
    write_preservation_status(tmp_path, status)
    data = json.loads((tmp_path / "preservation_status.json").read_text(encoding="utf-8"))
    assert data["preservation_status"] == "captured_html"
    assert data["capture_needed"] is False


def test_round_trip_load_matches_write(tmp_path):
    status = _assess(wayback_status="failed")
    write_preservation_status(tmp_path, status)
    loaded = load_preservation_status(tmp_path)
    assert loaded is not None
    assert loaded.preservation_status == status.preservation_status
    assert loaded.capture_needed == status.capture_needed
    assert loaded.suggested_capture_route == status.suggested_capture_route
    assert loaded.public_archive_status == status.public_archive_status
    assert loaded.local_html_sha256 == status.local_html_sha256
    assert loaded.notes == status.notes


def test_load_returns_none_when_absent(tmp_path):
    assert load_preservation_status(tmp_path) is None


def test_load_returns_none_on_corrupt_file(tmp_path):
    (tmp_path / "preservation_status.json").write_text("not json{{", encoding="utf-8")
    assert load_preservation_status(tmp_path) is None


def test_write_creates_dir_if_missing(tmp_path):
    doc_dir = tmp_path / "corpus" / "abc123"
    assert not doc_dir.exists()
    write_preservation_status(doc_dir, _assess())
    assert (doc_dir / "preservation_status.json").exists()


# ---------------------------------------------------------------------------
# preprocess.run() integration — preservation_status.json is written
# ---------------------------------------------------------------------------

def test_preprocess_writes_preservation_status(tmp_path):
    """preprocess.run() must write preservation_status.json in the doc dir."""
    from dataclasses import dataclass
    from pathlib import Path
    from types import SimpleNamespace
    from unittest.mock import patch, MagicMock

    # Build a minimal IntakeResult-like object with all needed fields
    doc_dir = tmp_path / "doc-abc"
    doc_dir.mkdir()

    # Write a source.html so preservation can read it
    (doc_dir / "source.html").write_text(
        "<html><body>Normal article content, no blockers.</body></html>",
        encoding="utf-8",
    )

    # Stub the intake object
    intake = SimpleNamespace(
        doc_id="doc-abc",
        source="https://example.org/article",
        source_type="url",
        wayback_status="existing",
        local_dir=doc_dir,
    )

    # Stub a pre-built PreprocessResult (don't run actual trafilatura)
    prep_result = SimpleNamespace(
        doc_id="doc-abc",
        tool_used="trafilatura",
        quality="high",
        text="Normal article content",
        markdown="Normal article content",
        title="Test",
        author="",
        date_published="",
        sitename="",
        description="",
        hostname="example.org",
        outbound_links=[],
        page_intel=None,
        source_html_path=str(doc_dir / "source.html"),
        source_html_sha256="a" * 64,
        ocr_images=[],
        char_count=100,
        truncated=False,
        language_detected=None,
        media_metadata={},
        transcript_chunks=[],
        transcript_versions=[],
        transcript_comparison={},
        media_comments=[],
        duplicate_candidates=[],
        discovery_seed_queue=[],
        intake_declared_type=None,
        intake_batch_id=None,
        intake_source_url=None,
    )

    # Patch the routing and internal calls so preprocess.run() does minimal work
    import runner.pipeline.preprocess as _pp
    with (
        patch.object(_pp, "_preprocess_url", return_value=prep_result),
        patch.object(_pp, "_update_intake_html_hash"),
        patch.object(_pp, "_save_artifacts"),
        patch.object(_pp, "_maybe_truncate", return_value=("text", False)),
    ):
        config = SimpleNamespace(
            truncation_limit=24000,
            truncation_head_chars=16000,
            truncation_tail_chars=6000,
            media_collect_comments=False,
            media_max_comments=50,
            media_allow_whisper=False,
        )
        _pp.run(intake, config)  # type: ignore[arg-type]

    pstatus_path = doc_dir / "preservation_status.json"
    assert pstatus_path.exists(), "preservation_status.json must be written by preprocess.run()"
    data = json.loads(pstatus_path.read_text(encoding="utf-8"))
    assert data["preservation_status"] == "captured_html"
    assert data["capture_needed"] is False
