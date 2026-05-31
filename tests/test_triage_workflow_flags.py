"""Tests for TASK A -- triage workflow flags and triage context builder.

Covers:
- TriageResult new fields and their safe defaults
- overnight_batch_safe=False for all four special-handling flags
- save/load round-trip for new fields
- apply_triage_result() persistence to source queue DB
- QueueItem.from_row() INTEGER->bool conversion
- backward compat: existing triage objects without new fields still work
- build_triage_context(): short/long text, headings, source label, bounds

No network calls, no LLM, no Sanity/Supabase.
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.models.triage import TriageResult
from runner.pipeline.triage import build_triage_context, source_context_label
from runner.pipeline.source_queue import (
    QueueItem,
    add_item,
    apply_triage_result,
    get_item,
    open_db,
    queue_db_path,
)
from runner.pipeline.triage import load_triage_result, save_triage_result


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

@dataclass
class _Config:
    corpus_dir: Path


def _cfg(tmp_path: Path) -> _Config:
    return _Config(corpus_dir=tmp_path)


@pytest.fixture
def corpus_dir(tmp_path: Path) -> Path:
    d = tmp_path / "corpus"
    d.mkdir()
    return d


@pytest.fixture
def db(corpus_dir: Path) -> sqlite3.Connection:
    path = queue_db_path(corpus_dir)
    return open_db(path)


def _full_result(**overrides) -> TriageResult:
    defaults = {
        "doc_type_hint": "promotional",
        "languages": ["en"],
        "complexity": "simple",
        "estimated_tokens": 1500,
        "recommended_llm": "litelm",
        "routing_reason": "Short promotional page.",
        "needs_book_splitting": False,
        "needs_testimony_review": False,
        "needs_media_review": False,
        "needs_legal_review": False,
        "overnight_batch_safe": True,
        "suggested_process_route": "standard",
    }
    defaults.update(overrides)
    return TriageResult.model_validate(defaults)


# ---------------------------------------------------------------------------
# TriageResult -- defaults
# ---------------------------------------------------------------------------

def test_new_fields_have_safe_defaults():
    result = TriageResult()
    assert result.needs_book_splitting is False
    assert result.needs_testimony_review is False
    assert result.needs_media_review is False
    assert result.needs_legal_review is False
    # G1: a bare TriageResult() is the failure/absent fallback -> fail closed.
    assert result.triage_succeeded is False
    assert result.overnight_batch_safe is False
    assert result.suggested_process_route == ""


def test_existing_fields_unchanged():
    result = TriageResult()
    assert result.doc_type_hint == "unknown"
    assert result.complexity == "moderate"
    assert result.recommended_llm == "litelm"


# ---------------------------------------------------------------------------
# TriageResult -- flag logic
# ---------------------------------------------------------------------------

def test_testimony_flags_correctly():
    result = _full_result(
        doc_type_hint="testimony",
        needs_testimony_review=True,
        overnight_batch_safe=False,
    )
    assert result.needs_testimony_review is True
    assert result.overnight_batch_safe is False


def test_legal_flags_correctly():
    result = _full_result(
        doc_type_hint="legal",
        needs_legal_review=True,
        overnight_batch_safe=False,
        recommended_llm="claude",
    )
    assert result.needs_legal_review is True
    assert result.overnight_batch_safe is False


def test_book_splitting_flags_correctly():
    result = _full_result(
        needs_book_splitting=True,
        recommended_llm="litelm-heavy",
        suggested_process_route="split-book",
        overnight_batch_safe=False,   # book splitting requires route-specific runner
    )
    assert result.needs_book_splitting is True
    assert result.suggested_process_route == "split-book"
    assert result.overnight_batch_safe is False


def test_media_review_flags_correctly():
    result = _full_result(
        doc_type_hint="media",
        needs_media_review=True,
        overnight_batch_safe=False,   # media-ingest requires route-specific runner
        suggested_process_route="media-ingest",
    )
    assert result.needs_media_review is True
    assert result.overnight_batch_safe is False
    assert result.suggested_process_route == "media-ingest"


def test_promotional_is_batch_safe():
    result = _full_result(doc_type_hint="promotional", complexity="simple")
    assert result.overnight_batch_safe is True


# ---------------------------------------------------------------------------
# TriageResult -- save / load round-trip
# ---------------------------------------------------------------------------

def test_save_load_roundtrip_new_fields(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-1").mkdir()
    original = _full_result(
        needs_testimony_review=True,
        overnight_batch_safe=False,
        suggested_process_route="standard",
    )
    save_triage_result("doc-1", original, cfg)
    loaded = load_triage_result("doc-1", cfg)
    assert loaded is not None
    assert loaded.needs_testimony_review is True
    assert loaded.overnight_batch_safe is False
    assert loaded.suggested_process_route == "standard"


def test_save_load_book_splitting(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-book").mkdir()
    original = _full_result(
        needs_book_splitting=True,
        recommended_llm="litelm-heavy",
        suggested_process_route="split-book",
    )
    save_triage_result("doc-book", original, cfg)
    loaded = load_triage_result("doc-book", cfg)
    assert loaded.needs_book_splitting is True
    assert loaded.suggested_process_route == "split-book"


def test_save_load_all_flags_false_by_default(tmp_path):
    cfg = _cfg(tmp_path)
    (tmp_path / "doc-default").mkdir()
    original = _full_result()
    save_triage_result("doc-default", original, cfg)
    loaded = load_triage_result("doc-default", cfg)
    assert loaded.needs_book_splitting is False
    assert loaded.needs_testimony_review is False
    assert loaded.needs_media_review is False
    assert loaded.needs_legal_review is False
    assert loaded.overnight_batch_safe is True


# ---------------------------------------------------------------------------
# TriageResult -- backward compat (extra="ignore")
# ---------------------------------------------------------------------------

def test_load_legacy_json_without_new_fields(tmp_path):
    """A triage_result.json written before the new fields still loads with safe defaults."""
    cfg = _cfg(tmp_path)
    doc_dir = tmp_path / "doc-legacy"
    doc_dir.mkdir()
    (doc_dir / "triage_result.json").write_text(
        json.dumps({
            "doc_type_hint": "academic",
            "languages": ["en"],
            "complexity": "moderate",
            "estimated_tokens": 3000,
            "recommended_llm": "litelm",
            "routing_reason": "Academic paper.",
            "saved_at": "2026-01-01T10:00:00+00:00",
        }),
        encoding="utf-8",
    )
    loaded = load_triage_result("doc-legacy", cfg)
    assert loaded is not None
    assert loaded.doc_type_hint == "academic"
    # New fields fail closed: a legacy file with no overnight_batch_safe is NOT
    # treated as overnight-safe.
    assert loaded.needs_book_splitting is False
    assert loaded.overnight_batch_safe is False


# ---------------------------------------------------------------------------
# apply_triage_result -- persistence to source queue DB
# ---------------------------------------------------------------------------

class TestApplyTriageResultNewFlags:

    def test_testimony_flags_persisted(self, db):
        item = add_item(db, "https://example.org/testimony")
        triage = SimpleNamespace(
            doc_type_hint="testimony",
            recommended_llm="litelm",
            routing_reason="Personal testimony.",
            complexity="simple",
            needs_book_splitting=False,
            needs_testimony_review=True,
            needs_media_review=False,
            needs_legal_review=False,
            overnight_batch_safe=False,
            suggested_process_route="standard",
        )
        apply_triage_result(db, item.id, triage)
        updated = get_item(db, item.id)
        assert updated.needs_testimony_review is True
        assert updated.overnight_batch_safe is False
        assert updated.status == "triaged"

    def test_legal_flags_persisted(self, db):
        item = add_item(db, "https://example.org/judgment")
        triage = SimpleNamespace(
            doc_type_hint="legal",
            recommended_llm="claude",
            routing_reason="Court judgment.",
            complexity="complex",
            needs_book_splitting=False,
            needs_testimony_review=False,
            needs_media_review=False,
            needs_legal_review=True,
            overnight_batch_safe=False,
            suggested_process_route="standard",
        )
        apply_triage_result(db, item.id, triage)
        updated = get_item(db, item.id)
        assert updated.needs_legal_review is True
        assert updated.overnight_batch_safe is False

    def test_book_splitting_flag_persisted(self, db):
        item = add_item(db, "https://example.org/book.pdf")
        triage = SimpleNamespace(
            doc_type_hint="academic",
            recommended_llm="litelm-heavy",
            routing_reason="Book.",
            complexity="complex",
            needs_book_splitting=True,
            needs_testimony_review=False,
            needs_media_review=False,
            needs_legal_review=False,
            overnight_batch_safe=False,   # book splitting is not batch-safe
            suggested_process_route="split-book",
        )
        apply_triage_result(db, item.id, triage)
        updated = get_item(db, item.id)
        assert updated.needs_book_splitting is True
        assert updated.overnight_batch_safe is False
        assert updated.suggested_process_route == "split-book"

    def test_media_flag_persisted(self, db):
        item = add_item(db, "https://youtube.com/watch?v=abc")
        triage = SimpleNamespace(
            doc_type_hint="media",
            recommended_llm="litelm-heavy",
            routing_reason="Video content.",
            complexity="moderate",
            needs_book_splitting=False,
            needs_testimony_review=False,
            needs_media_review=True,
            needs_legal_review=False,
            overnight_batch_safe=False,   # media-ingest is not batch-safe
            suggested_process_route="media-ingest",
        )
        apply_triage_result(db, item.id, triage)
        updated = get_item(db, item.id)
        assert updated.needs_media_review is True
        assert updated.overnight_batch_safe is False
        assert updated.suggested_process_route == "media-ingest"

    def test_standard_promotional_all_flags_false(self, db):
        item = add_item(db, "https://example.org/promo")
        triage = SimpleNamespace(
            doc_type_hint="promotional",
            recommended_llm="litelm",
            routing_reason="Simple promo.",
            complexity="simple",
            needs_book_splitting=False,
            needs_testimony_review=False,
            needs_media_review=False,
            needs_legal_review=False,
            overnight_batch_safe=True,
            suggested_process_route="standard",
        )
        apply_triage_result(db, item.id, triage)
        updated = get_item(db, item.id)
        assert updated.needs_book_splitting is False
        assert updated.needs_testimony_review is False
        assert updated.overnight_batch_safe is True
        assert updated.suggested_process_route == "standard"

    def test_legacy_triage_without_new_fields_still_applies(self, db):
        """apply_triage_result works with old-style SimpleNamespace lacking new fields."""
        item = add_item(db, "https://example.org/legacy")
        triage = SimpleNamespace(
            doc_type_hint="news",
            recommended_llm="litelm",
            routing_reason="News article.",
            complexity="simple",
            # No new fields -- getattr defaults kick in
        )
        apply_triage_result(db, item.id, triage)
        updated = get_item(db, item.id)
        assert updated.status == "triaged"
        assert updated.needs_book_splitting is False
        # G1: a triage object missing overnight_batch_safe fails closed.
        assert updated.overnight_batch_safe is False


# ---------------------------------------------------------------------------
# QueueItem.from_row -- INTEGER -> bool conversion
# ---------------------------------------------------------------------------

class TestQueueItemFromRow:

    def _insert_raw(self, db: sqlite3.Connection, url: str, **flag_overrides) -> str:
        """Insert a row with explicit flag values and return its id."""
        item = add_item(db, url)
        flags = {
            "needs_book_splitting": 0,
            "needs_testimony_review": 0,
            "needs_media_review": 0,
            "needs_legal_review": 0,
            "overnight_batch_safe": 1,
            "suggested_process_route": "",
        }
        flags.update(flag_overrides)
        db.execute(
            """UPDATE source_queue SET
                   needs_book_splitting    = :needs_book_splitting,
                   needs_testimony_review  = :needs_testimony_review,
                   needs_media_review      = :needs_media_review,
                   needs_legal_review      = :needs_legal_review,
                   overnight_batch_safe    = :overnight_batch_safe,
                   suggested_process_route = :suggested_process_route
               WHERE id = :id""",
            {**flags, "id": item.id},
        )
        db.commit()
        return item.id

    def test_integer_zero_reads_as_false(self, db):
        item_id = self._insert_raw(db, "https://a.com", needs_testimony_review=0)
        item = get_item(db, item_id)
        assert item.needs_testimony_review is False
        assert isinstance(item.needs_testimony_review, bool)

    def test_integer_one_reads_as_true(self, db):
        item_id = self._insert_raw(db, "https://b.com", needs_book_splitting=1)
        item = get_item(db, item_id)
        assert item.needs_book_splitting is True
        assert isinstance(item.needs_book_splitting, bool)

    def test_overnight_batch_safe_default_is_true(self, db):
        item = add_item(db, "https://c.com")
        loaded = get_item(db, item.id)
        assert loaded.overnight_batch_safe is True

    def test_all_flags_false_reads_correctly(self, db):
        item_id = self._insert_raw(
            db, "https://d.com",
            needs_book_splitting=0,
            needs_testimony_review=0,
            needs_media_review=0,
            needs_legal_review=0,
            overnight_batch_safe=0,
        )
        item = get_item(db, item_id)
        assert item.needs_book_splitting is False
        assert item.needs_testimony_review is False
        assert item.needs_media_review is False
        assert item.needs_legal_review is False
        assert item.overnight_batch_safe is False


# ---------------------------------------------------------------------------
# build_triage_context
# ---------------------------------------------------------------------------

def _long(n: int = 5000) -> str:
    word = "Lorem ipsum dolor sit amet. "
    return (word * (n // len(word) + 1))[:n]


def test_context_short_text_returns_full_text():
    text = "A short document."
    ctx = build_triage_context(text)
    assert text in ctx
    assert "[... " not in ctx


def test_context_empty_text_returns_empty_or_label_only():
    assert build_triage_context("") == ""
    assert build_triage_context("   ") == ""
    result = build_triage_context("   ", source_label="test.pdf")
    assert "SOURCE: test.pdf" in result


def test_context_long_text_includes_head_and_tail():
    text = _long(6000)
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    assert text[:2000] in ctx
    assert text[-1000:] in ctx
    assert "[... " in ctx


def test_context_long_text_omission_marker_shows_char_count():
    text = _long(6000)
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    omitted = 6000 - 2000 - 1000
    assert f"{omitted:,}" in ctx


def test_context_source_label_prepended():
    text = "Document content."
    ctx = build_triage_context(text, source_label="https://example.org/doc")
    assert ctx.startswith("SOURCE: https://example.org/doc")
    assert "Document content." in ctx


def test_context_source_label_absent_when_empty():
    ctx = build_triage_context("Content.")
    assert "SOURCE:" not in ctx


def test_source_context_label_marks_doi_article_with_blocked_extraction():
    label = source_context_label(
        "https://acamh.onlinelibrary.wiley.com/doi/10.1111/camh.12380",
        snippet="Just a moment... Cloudflare is checking your browser.",
    )

    assert "SOURCE_HINTS:" in label
    assert "academic/research article or DOI landing page" in label
    assert "access/login/challenge/boilerplate" in label
    assert "overnight_batch_safe=false" in label


def test_source_context_label_marks_social_shell():
    label = source_context_label(
        "https://x.com/seja_bondoso",
        snippet="Something went wrong. Try reloading.",
    )

    assert "social media profile/post URL" in label
    assert "technical shell" in label


def test_source_context_label_marks_youtube_as_video():
    label = source_context_label(
        "https://www.youtube.com/watch?v=stBt7_NTT3o",
        snippet="About Press Copyright Contact us Creators Advertise",
    )

    assert "video platform URL" in label
    assert "page boilerplate" in label


def test_context_detects_markdown_headings_in_middle():
    head = _long(2000)
    middle = "\n# Chapter 1\n## Section 1.1\n" + _long(500)
    tail = _long(1000)
    text = head + middle + tail
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    assert "# Chapter 1" in ctx or "STRUCTURE" in ctx


def test_context_detects_numbered_section_headings():
    head = _long(2000)
    middle = "\n1. Introduction\n2. Methods\n3. Results\n" + _long(500)
    tail = _long(1000)
    text = head + middle + tail
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    assert "STRUCTURE" in ctx
    assert "1. Introduction" in ctx


def test_context_detects_chapter_keyword_headings():
    head = _long(2000)
    middle = "\nChapter 3 Policy Responses\nSection 4 Legal Analysis\n" + _long(500)
    tail = _long(1000)
    text = head + middle + tail
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    assert "STRUCTURE" in ctx


def test_context_no_headings_section_when_none_found():
    text = _long(6000)  # plain filler, no heading-like lines
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    assert "STRUCTURE" not in ctx


def test_context_bounded_even_for_very_long_input():
    text = _long(100_000)
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    # Headings section adds at most 20 lines * ~80 chars = ~1600 chars overhead
    # Total should stay well under 10k chars
    assert len(ctx) < 10_000


def test_context_text_at_head_boundary_not_truncated():
    text = _long(2000)  # exactly head_chars
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    assert text in ctx
    assert "[... " not in ctx


def test_context_headings_capped_at_max():
    head = _long(2000)
    # Generate 30 headings in the middle
    headings = "\n".join(f"# Heading {i}" for i in range(30))
    tail = _long(1000)
    text = head + "\n" + headings + "\n" + tail
    ctx = build_triage_context(text, head_chars=2000, tail_chars=1000)
    # Should not include all 30 headings -- capped at 20
    heading_count = ctx.count("# Heading")
    assert heading_count <= 20
