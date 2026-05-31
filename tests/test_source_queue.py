"""Tests for runner/pipeline/source_queue.py.

All tests are pure Python / SQLite — no network calls, no Streamlit, no LLM.
The corpus dir and DB are created in pytest's tmp_path.
"""
from __future__ import annotations
import json
import sqlite3
from pathlib import Path

import pytest

from runner.pipeline.source_queue import (
    VALID_PRIORITIES,
    VALID_STATUSES,
    QueueItem,
    add_item,
    add_items_from_text,
    already_in_corpus,
    apply_triage_result,
    batch_groups,
    delete_item,
    detect_url_source_type,
    get_item,
    list_items,
    mark_ingested,
    normalise_url,
    open_db,
    parse_pasted_urls,
    priority_from_triage,
    queue_db_path,
    queue_stats,
    update_notes,
    update_priority,
    update_status,
    url_hash,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def corpus_dir(tmp_path: Path) -> Path:
    d = tmp_path / "corpus"
    d.mkdir()
    return d


@pytest.fixture
def db(corpus_dir: Path) -> sqlite3.Connection:
    path = queue_db_path(corpus_dir)
    return open_db(path)


# ---------------------------------------------------------------------------
# URL normalisation
# ---------------------------------------------------------------------------

class TestNormaliseUrl:
    def test_lowercase_scheme_and_host(self):
        assert normalise_url("HTTPS://Example.COM/path") == "https://example.com/path"

    def test_strips_trailing_slash_non_root(self):
        assert normalise_url("https://example.com/path/") == "https://example.com/path"

    def test_root_slash_canonicalised(self):
        # Both trailing-slash and no-slash forms map to the same canonical URL
        assert normalise_url("https://example.com/") == normalise_url("https://example.com")

    def test_drops_fragment(self):
        assert "#" not in normalise_url("https://example.com/page#section")

    def test_preserves_query_string(self):
        url = "https://example.com/search?q=sogice&lang=en"
        assert "q=sogice" in normalise_url(url)

    def test_strips_whitespace(self):
        assert normalise_url("  https://example.com  ") == "https://example.com"


class TestUrlHash:
    def test_same_url_same_hash(self):
        assert url_hash("https://example.com/page") == url_hash("https://example.com/page")

    def test_normalised_url_same_hash(self):
        assert url_hash("https://Example.COM/page/") == url_hash("https://example.com/page")

    def test_different_urls_different_hash(self):
        assert url_hash("https://a.com") != url_hash("https://b.com")

    def test_hash_length(self):
        assert len(url_hash("https://example.com")) == 24


# ---------------------------------------------------------------------------
# URL parsing
# ---------------------------------------------------------------------------

class TestParsePastedUrls:
    def test_plain_lines(self):
        text = "https://a.com\nhttps://b.com\n"
        assert parse_pasted_urls(text) == ["https://a.com", "https://b.com"]

    def test_skips_comment_lines(self):
        text = "# comment\nhttps://a.com\n"
        assert parse_pasted_urls(text) == ["https://a.com"]

    def test_skips_blank_lines(self):
        text = "\nhttps://a.com\n\nhttps://b.com\n"
        assert parse_pasted_urls(text) == ["https://a.com", "https://b.com"]

    def test_csv_takes_first_url(self):
        text = '"Title with comma, subtitle",https://a.com,extra'
        result = parse_pasted_urls(text)
        assert "https://a.com" in result

    def test_tab_separated_takes_url_column(self):
        text = "https://a.com\tSome title here"
        assert parse_pasted_urls(text) == ["https://a.com"]

    def test_zotero_ris_ur_field(self):
        text = "TY  - JOUR\nUR  - https://a.com\nER  -"
        assert parse_pasted_urls(text) == ["https://a.com"]

    def test_bibtex_url_field(self):
        text = "@article{key,\n  url = {https://a.com}\n}"
        assert parse_pasted_urls(text) == ["https://a.com"]

    def test_deduplicates_within_paste(self):
        text = "https://a.com\nhttps://a.com/\nhttps://b.com"
        # "https://a.com" and "https://a.com/" normalise to the same URL
        result = parse_pasted_urls(text)
        # b.com must be present; a.com appears once
        assert "https://b.com" in result
        a_count = sum(1 for u in result if "a.com" in u)
        assert a_count == 1

    def test_non_url_lines_skipped(self):
        text = "Just some text\nhttps://a.com\nanother non-url"
        assert parse_pasted_urls(text) == ["https://a.com"]

    def test_empty_string(self):
        assert parse_pasted_urls("") == []


# ---------------------------------------------------------------------------
# Corpus dedup check
# ---------------------------------------------------------------------------

class TestAlreadyInCorpus:
    def _make_doc(self, corpus_dir: Path, doc_id: str, source: str) -> None:
        d = corpus_dir / doc_id
        d.mkdir()
        (d / "intake.json").write_text(
            json.dumps({"source": source, "source_url": source}),
            encoding="utf-8",
        )

    def test_exact_match_returns_doc_id(self, corpus_dir: Path):
        self._make_doc(corpus_dir, "abc12345", "https://example.com/doc")
        assert already_in_corpus("https://example.com/doc", corpus_dir) == "abc12345"

    def test_normalised_match(self, corpus_dir: Path):
        self._make_doc(corpus_dir, "abc12345", "https://example.com/doc/")
        assert already_in_corpus("https://example.com/doc", corpus_dir) == "abc12345"

    def test_no_match_returns_none(self, corpus_dir: Path):
        self._make_doc(corpus_dir, "abc12345", "https://other.com/doc")
        assert already_in_corpus("https://example.com/doc", corpus_dir) is None

    def test_empty_corpus_returns_none(self, corpus_dir: Path):
        assert already_in_corpus("https://example.com", corpus_dir) is None


# ---------------------------------------------------------------------------
# DB open / schema
# ---------------------------------------------------------------------------

class TestOpenDb:
    def test_creates_table(self, corpus_dir: Path):
        db = open_db(queue_db_path(corpus_dir))
        row = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='source_queue'"
        ).fetchone()
        assert row is not None

    def test_idempotent_open(self, corpus_dir: Path):
        path = queue_db_path(corpus_dir)
        db1 = open_db(path)
        db2 = open_db(path)  # second open should not raise
        db1.close()
        db2.close()

    def test_db_path_adjacent_to_corpus(self, corpus_dir: Path):
        path = queue_db_path(corpus_dir)
        assert path.parent == corpus_dir.parent
        assert path.name == "source_queue.db"


# ---------------------------------------------------------------------------
# add_item
# ---------------------------------------------------------------------------

class TestAddItem:
    def test_adds_item_returns_queue_item(self, db):
        item = add_item(db, "https://example.com/doc1")
        assert item is not None
        assert item.url == "https://example.com/doc1"
        assert item.status == "new"
        assert len(item.id) == 8

    def test_duplicate_returns_none(self, db):
        add_item(db, "https://example.com/doc1")
        result = add_item(db, "https://example.com/doc1")
        assert result is None

    def test_normalised_duplicate_returns_none(self, db):
        add_item(db, "https://example.com/doc1/")
        result = add_item(db, "https://example.com/doc1")
        assert result is None

    def test_priority_stored(self, db):
        item = add_item(db, "https://a.com", priority="high")
        assert item is not None
        assert item.priority == "high"

    def test_invalid_priority_raises(self, db):
        with pytest.raises(ValueError, match="Invalid priority"):
            add_item(db, "https://a.com", priority="urgent")

    def test_batch_group_stored(self, db):
        item = add_item(db, "https://a.com", batch_group="UN sources")
        assert item is not None
        assert item.batch_group == "UN sources"

    def test_youtube_url_detected(self, db):
        item = add_item(db, "https://youtube.com/watch?v=abc123")
        assert item is not None
        assert item.source_type == "youtube"

    def test_pdf_url_detected(self, db):
        item = add_item(db, "https://example.com/report.pdf")
        assert item is not None
        assert item.source_type == "pdf"

    def test_webpage_url_detected(self, db):
        item = add_item(db, "https://www.christianconcern.com/article")
        assert item is not None
        assert item.source_type == "webpage"

    def test_docx_url_detected(self, db):
        item = add_item(db, "https://example.com/submission.docx")
        assert item is not None
        assert item.source_type == "docx"


# ---------------------------------------------------------------------------
# add_items_from_text
# ---------------------------------------------------------------------------

class TestAddItemsFromText:
    def test_adds_multiple_urls(self, db, corpus_dir: Path):
        text = "https://a.com\nhttps://b.com\nhttps://c.com"
        added, dup_q, dup_c = add_items_from_text(db, text, corpus_dir)
        assert added == 3
        assert dup_q == 0
        assert dup_c == 0

    def test_dedup_within_paste_via_parser(self, db, corpus_dir: Path):
        # "https://a.com" and "https://a.com/" normalise to the same URL;
        # parse_pasted_urls deduplicates them so only one reaches add_item()
        text = "https://a.com\nhttps://a.com/"
        added, dup_q, dup_c = add_items_from_text(db, text, corpus_dir)
        assert added == 1
        assert dup_q == 0  # parser deduped — never reached the DB

    def test_dedup_against_existing_queue(self, db, corpus_dir: Path):
        # First add populates the queue; second call finds a DB-level duplicate
        add_item(db, "https://a.com")
        text = "https://a.com\nhttps://b.com"
        added, dup_q, dup_c = add_items_from_text(db, text, corpus_dir)
        assert added == 1   # b.com is new
        assert dup_q == 1   # a.com already in queue

    def test_corpus_duplicate_association_noted_not_auto_ingested(self, db, corpus_dir: Path):
        """Corpus-matched URLs must enter the queue as status=new with corpus_doc_id set.
        Status is NOT automatically set to 'ingested' — researcher must confirm."""
        doc_dir = corpus_dir / "abc12345"
        doc_dir.mkdir()
        (doc_dir / "intake.json").write_text(
            json.dumps({"source": "https://already.com/doc", "source_url": ""}),
            encoding="utf-8",
        )
        text = "https://already.com/doc"
        added, dup_q, dup_c = add_items_from_text(db, text, corpus_dir)
        assert added == 0          # not counted as plain "added"
        assert dup_c == 1          # corpus association found
        # The item enters the queue with status=new (NOT ingested)
        items_new = list_items(db, status="new")
        assert len(items_new) == 1
        assert items_new[0].corpus_doc_id == "abc12345"
        # Confirm it is NOT in the ingested bucket
        items_ingested = list_items(db, status="ingested")
        assert len(items_ingested) == 0

    def test_returns_zero_for_empty_text(self, db, corpus_dir: Path):
        assert add_items_from_text(db, "", corpus_dir) == (0, 0, 0)


# ---------------------------------------------------------------------------
# list_items / get_item
# ---------------------------------------------------------------------------

class TestListItems:
    def test_list_all(self, db, corpus_dir: Path):
        add_item(db, "https://a.com")
        add_item(db, "https://b.com")
        assert len(list_items(db)) == 2

    def test_filter_by_status(self, db):
        a = add_item(db, "https://a.com")
        add_item(db, "https://b.com")
        update_status(db, a.id, "triaged")
        triaged = list_items(db, status="triaged")
        assert len(triaged) == 1
        assert triaged[0].id == a.id

    def test_filter_by_priority(self, db):
        add_item(db, "https://a.com", priority="high")
        add_item(db, "https://b.com", priority="low")
        high = list_items(db, priority="high")
        assert len(high) == 1
        assert high[0].priority == "high"

    def test_filter_by_batch(self, db):
        add_item(db, "https://a.com", batch_group="batch-1")
        add_item(db, "https://b.com", batch_group="batch-2")
        b1 = list_items(db, batch_group="batch-1")
        assert len(b1) == 1

    def test_get_item_returns_correct_item(self, db):
        item = add_item(db, "https://a.com")
        fetched = get_item(db, item.id)
        assert fetched is not None
        assert fetched.url == "https://a.com"

    def test_get_item_missing_returns_none(self, db):
        assert get_item(db, "notexist") is None


# ---------------------------------------------------------------------------
# Status / priority updates
# ---------------------------------------------------------------------------

class TestUpdateStatus:
    def test_valid_status_transition(self, db):
        item = add_item(db, "https://a.com")
        assert update_status(db, item.id, "ready_to_ingest") is True
        assert get_item(db, item.id).status == "ready_to_ingest"

    def test_invalid_status_raises(self, db):
        item = add_item(db, "https://a.com")
        with pytest.raises(ValueError, match="Invalid status"):
            update_status(db, item.id, "deleted_forever")

    def test_all_valid_statuses_accepted(self, db):
        for i, status in enumerate(sorted(VALID_STATUSES)):
            url = f"https://example{i}.com"
            item = add_item(db, url)
            # Should not raise
            update_status(db, item.id, status)

    def test_missing_id_returns_false(self, db):
        assert update_status(db, "notexist", "new") is False


class TestUpdatePriority:
    def test_valid_priority_transition(self, db):
        item = add_item(db, "https://a.com", priority="medium")
        assert update_priority(db, item.id, "high") is True
        assert get_item(db, item.id).priority == "high"

    def test_invalid_priority_raises(self, db):
        item = add_item(db, "https://a.com")
        with pytest.raises(ValueError, match="Invalid priority"):
            update_priority(db, item.id, "critical")

    def test_all_valid_priorities_accepted(self, db):
        for i, prio in enumerate(sorted(VALID_PRIORITIES)):
            url = f"https://prio{i}.com"
            item = add_item(db, url)
            update_priority(db, item.id, prio)  # should not raise


# ---------------------------------------------------------------------------
# mark_ingested
# ---------------------------------------------------------------------------

class TestMarkIngested:
    def test_sets_status_and_doc_id(self, db):
        item = add_item(db, "https://a.com")
        assert mark_ingested(db, item.id, "doc12345")
        fetched = get_item(db, item.id)
        assert fetched.status == "ingested"
        assert fetched.corpus_doc_id == "doc12345"


# ---------------------------------------------------------------------------
# update_notes
# ---------------------------------------------------------------------------

class TestUpdateNotes:
    def test_updates_notes_field(self, db):
        item = add_item(db, "https://a.com")
        update_notes(db, item.id, notes="important source")
        assert get_item(db, item.id).notes == "important source"

    def test_updates_batch_group(self, db):
        item = add_item(db, "https://a.com")
        update_notes(db, item.id, batch_group="batch-7")
        assert get_item(db, item.id).batch_group == "batch-7"

    def test_updates_title(self, db):
        item = add_item(db, "https://a.com")
        update_notes(db, item.id, title="My Title")
        assert get_item(db, item.id).title == "My Title"

    def test_no_fields_returns_false(self, db):
        item = add_item(db, "https://a.com")
        assert update_notes(db, item.id) is False


# ---------------------------------------------------------------------------
# apply_triage_result
# ---------------------------------------------------------------------------

class TestApplyTriageResult:
    def test_applies_triage_fields(self, db):
        from types import SimpleNamespace
        item = add_item(db, "https://a.com")
        triage = SimpleNamespace(
            doc_type_hint="legal",
            recommended_llm="claude",
            routing_reason="Court judgment — high accuracy needed",
            complexity="complex",
        )
        assert apply_triage_result(db, item.id, triage)
        updated = get_item(db, item.id)
        assert updated.status == "triaged"
        assert updated.doc_type_hint == "legal"
        assert updated.recommended_llm == "claude"
        assert updated.routing_reason == "Court judgment — high accuracy needed"
        assert updated.priority == "high"  # legal + complex → high

    def test_promotional_simple_gets_low_priority(self, db):
        from types import SimpleNamespace
        item = add_item(db, "https://b.com")
        triage = SimpleNamespace(
            doc_type_hint="promotional",
            recommended_llm="litelm",
            routing_reason="Simple NGO promo",
            complexity="simple",
        )
        apply_triage_result(db, item.id, triage)
        assert get_item(db, item.id).priority == "low"

    def test_social_media_triage_keeps_social_source_type(self, db):
        from types import SimpleNamespace
        item = add_item(db, "https://x.com/seja_bondoso")
        triage = SimpleNamespace(
            doc_type_hint="media",
            recommended_llm="litelm",
            routing_reason="Social media profile with researcher note.",
            complexity="simple",
            suggested_process_route="standard",
        )
        apply_triage_result(db, item.id, triage)
        assert get_item(db, item.id).source_type == "social"


# ---------------------------------------------------------------------------
# priority_from_triage
# ---------------------------------------------------------------------------

class TestPriorityFromTriage:
    def _t(self, doc_type, complexity):
        from types import SimpleNamespace
        return SimpleNamespace(doc_type_hint=doc_type, complexity=complexity)

    def test_legal_is_high(self):
        assert priority_from_triage(self._t("legal", "moderate")) == "high"

    def test_policy_is_high(self):
        assert priority_from_triage(self._t("policy", "simple")) == "high"

    def test_complex_any_type_is_high(self):
        assert priority_from_triage(self._t("news", "complex")) == "high"

    def test_promotional_simple_is_low(self):
        assert priority_from_triage(self._t("promotional", "simple")) == "low"

    def test_news_simple_is_low(self):
        assert priority_from_triage(self._t("news", "simple")) == "low"

    def test_academic_moderate_is_medium(self):
        assert priority_from_triage(self._t("academic", "moderate")) == "medium"


# ---------------------------------------------------------------------------
# queue_stats / batch_groups
# ---------------------------------------------------------------------------

class TestQueueStats:
    def test_counts_correctly(self, db):
        add_item(db, "https://a.com")
        item = add_item(db, "https://b.com")
        update_status(db, item.id, "triaged")
        stats = queue_stats(db)
        assert stats["total"] == 2
        assert stats["by_status"]["new"] == 1
        assert stats["by_status"]["triaged"] == 1

    def test_empty_queue(self, db):
        stats = queue_stats(db)
        assert stats["total"] == 0
        assert stats["by_status"] == {}


class TestBatchGroups:
    def test_returns_non_empty_groups(self, db):
        add_item(db, "https://a.com", batch_group="alpha")
        add_item(db, "https://b.com", batch_group="beta")
        add_item(db, "https://c.com")  # no batch
        groups = batch_groups(db)
        assert "alpha" in groups
        assert "beta" in groups
        assert "" not in groups

    def test_unique_sorted(self, db):
        add_item(db, "https://a.com", batch_group="zebra")
        add_item(db, "https://b.com", batch_group="apple")
        add_item(db, "https://c.com", batch_group="apple")
        groups = batch_groups(db)
        assert groups == sorted(set(groups))
        assert groups.count("apple") == 1


# ---------------------------------------------------------------------------
# delete_item
# ---------------------------------------------------------------------------

class TestDeleteItem:
    def test_removes_item(self, db):
        item = add_item(db, "https://a.com")
        assert delete_item(db, item.id) is True
        assert get_item(db, item.id) is None

    def test_missing_returns_false(self, db):
        assert delete_item(db, "notexist") is False

    def test_url_hash_freed_after_delete(self, db):
        """After deleting, the same URL can be re-added."""
        item = add_item(db, "https://a.com")
        delete_item(db, item.id)
        new_item = add_item(db, "https://a.com")
        assert new_item is not None


# ---------------------------------------------------------------------------
# queue_db_path / Config property
# ---------------------------------------------------------------------------

class TestQueueDbPath:
    def test_config_property(self, tmp_path: Path):
        from runner.config import Config
        from pathlib import Path as P
        # Build a minimal Config with a corpus_dir
        c = Config.__new__(Config)
        object.__setattr__(c, "corpus_dir", tmp_path / "corpus")
        assert c.source_queue_db_path == tmp_path / "source_queue.db"


# ---------------------------------------------------------------------------
# detect_url_source_type — public helper (task item 4)
# ---------------------------------------------------------------------------

class TestDetectUrlSourceType:
    """URL source type classification — heuristics only, no network."""

    def test_youtube_watch(self):
        assert detect_url_source_type("https://www.youtube.com/watch?v=abc") == "youtube"

    def test_youtu_be(self):
        assert detect_url_source_type("https://youtu.be/abc123") == "youtube"

    def test_youtube_shorts(self):
        assert detect_url_source_type("https://www.youtube.com/shorts/xyz") == "youtube"

    def test_vimeo_is_video(self):
        assert detect_url_source_type("https://vimeo.com/123456") == "video"

    def test_rumble_is_video(self):
        assert detect_url_source_type("https://rumble.com/v12345-title.html") == "video"

    def test_pdf_extension(self):
        assert detect_url_source_type("https://example.com/report.pdf") == "pdf"

    def test_pdf_uppercase_extension(self):
        assert detect_url_source_type("https://example.com/Report.PDF") == "pdf"

    def test_docx_extension(self):
        assert detect_url_source_type("https://example.com/submission.docx") == "docx"

    def test_doc_extension(self):
        assert detect_url_source_type("https://example.com/letter.doc") == "docx"

    def test_mp4_extension(self):
        assert detect_url_source_type("https://example.com/clip.mp4") == "video"

    def test_mp3_extension(self):
        assert detect_url_source_type("https://example.com/podcast.mp3") == "audio"

    def test_soundcloud_is_audio(self):
        assert detect_url_source_type("https://soundcloud.com/artist/track") == "audio"

    def test_x_profile_is_social(self):
        assert detect_url_source_type("https://x.com/seja_bondoso") == "social"

    def test_regular_webpage(self):
        assert detect_url_source_type("https://www.christianconcern.com/news/article") == "webpage"

    def test_http_without_extension_is_webpage(self):
        assert detect_url_source_type("http://www.example.com/page") == "webpage"

    def test_empty_string_is_unknown(self):
        assert detect_url_source_type("") == "unknown"

    def test_non_http_is_unknown(self):
        assert detect_url_source_type("ftp://example.com/file") == "unknown"

    def test_youtube_not_miscategorised_as_video(self):
        # YouTube must be "youtube", not "video"
        result = detect_url_source_type("https://youtube.com/watch?v=abc")
        assert result == "youtube"
        assert result != "video"


# ---------------------------------------------------------------------------
# triage_model_used — new metadata field (task item 3)
# ---------------------------------------------------------------------------

class TestTriageModelUsed:
    def test_apply_triage_stores_model_name(self, db):
        from types import SimpleNamespace
        item = add_item(db, "https://a.com")
        triage = SimpleNamespace(
            doc_type_hint="policy",
            recommended_llm="claude",
            routing_reason="Official government document",
            complexity="moderate",
        )
        apply_triage_result(db, item.id, triage, model_name="litelm/triage")
        updated = get_item(db, item.id)
        assert updated.triage_model_used == "litelm/triage"
        assert updated.status == "triaged"

    def test_apply_triage_without_model_name_stores_empty(self, db):
        from types import SimpleNamespace
        item = add_item(db, "https://b.com")
        triage = SimpleNamespace(
            doc_type_hint="news",
            recommended_llm="litelm",
            routing_reason="Short news article",
            complexity="simple",
        )
        apply_triage_result(db, item.id, triage)  # no model_name
        updated = get_item(db, item.id)
        assert updated.triage_model_used == ""

    def test_new_item_has_empty_triage_model(self, db):
        item = add_item(db, "https://c.com")
        assert item.triage_model_used == ""

    def test_triage_also_stores_triaged_at(self, db):
        from types import SimpleNamespace
        item = add_item(db, "https://d.com")
        triage = SimpleNamespace(
            doc_type_hint="academic",
            recommended_llm="litelm-reasoning",
            routing_reason="Dense academic paper",
            complexity="complex",
        )
        apply_triage_result(db, item.id, triage, model_name="review-qwen")
        updated = get_item(db, item.id)
        assert updated.triaged_at != ""
        assert "T" in updated.triaged_at  # ISO timestamp


# ---------------------------------------------------------------------------
# Status semantics (task item 7)
# ---------------------------------------------------------------------------

class TestStatusSemantics:
    """Verify that status values mean exactly what the lifecycle says."""

    def test_new_item_default_status_is_new(self, db):
        item = add_item(db, "https://a.com")
        assert item.status == "new"

    def test_ready_to_ingest_is_not_ingested(self, db):
        """ready_to_ingest ≠ ingested — the item has NOT been processed yet."""
        item = add_item(db, "https://a.com")
        update_status(db, item.id, "ready_to_ingest")
        fetched = get_item(db, item.id)
        assert fetched.status == "ready_to_ingest"
        assert fetched.status != "ingested"
        assert fetched.corpus_doc_id == ""  # no corpus link yet

    def test_ingested_requires_explicit_mark(self, db):
        """ingested status must be set explicitly, never auto-assigned."""
        item = add_item(db, "https://a.com")
        # Simulate full lifecycle
        update_status(db, item.id, "triaged")
        update_status(db, item.id, "ready_to_ingest")
        # Still not ingested until we say so
        assert get_item(db, item.id).status == "ready_to_ingest"
        # Now confirm ingestion
        mark_ingested(db, item.id, "corpus123")
        assert get_item(db, item.id).status == "ingested"
        assert get_item(db, item.id).corpus_doc_id == "corpus123"

    def test_corpus_match_stays_new_not_auto_ingested(self, db, corpus_dir: Path):
        """Corpus-matched URLs enter as status=new — NOT auto-set to ingested."""
        doc_dir = corpus_dir / "xyz99999"
        doc_dir.mkdir()
        (doc_dir / "intake.json").write_text(
            json.dumps({"source": "https://matched.com/doc", "source_url": ""}),
            encoding="utf-8",
        )
        result = add_item(
            db, "https://matched.com/doc",
            corpus_doc_id="xyz99999",
            status="new",
        )
        assert result is not None
        assert result.status == "new"
        assert result.corpus_doc_id == "xyz99999"
        # Verify it is NOT in the ingested bucket
        ingested = list_items(db, status="ingested")
        assert len(ingested) == 0

    def test_skipped_does_not_show_in_new(self, db):
        item = add_item(db, "https://a.com")
        update_status(db, item.id, "skipped")
        new_items = list_items(db, status="new")
        assert all(i.id != item.id for i in new_items)

    def test_all_valid_statuses_round_trip(self, db):
        for i, status in enumerate(sorted(VALID_STATUSES)):
            item = add_item(db, f"https://status{i}.com")
            update_status(db, item.id, status)
            assert get_item(db, item.id).status == status


# ---------------------------------------------------------------------------
# DB schema migration (task item 3 — triage_model_used column added later)
# ---------------------------------------------------------------------------

class TestDbMigration:
    def test_open_db_adds_triage_model_used_to_old_schema(self, tmp_path: Path):
        """Simulate a DB created without triage_model_used, then migrated."""
        db_path = tmp_path / "old_queue.db"
        # Create DB with old schema (no triage_model_used column)
        conn = sqlite3.connect(str(db_path))
        conn.execute("""
            CREATE TABLE source_queue (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                url_hash TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL DEFAULT '',
                source_type TEXT NOT NULL DEFAULT 'url',
                doc_type_hint TEXT NOT NULL DEFAULT 'unknown',
                priority TEXT NOT NULL DEFAULT 'medium',
                recommended_llm TEXT NOT NULL DEFAULT 'litelm',
                routing_reason TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                tags TEXT NOT NULL DEFAULT '',
                batch_group TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'new',
                added_at TEXT NOT NULL,
                triaged_at TEXT NOT NULL DEFAULT '',
                corpus_doc_id TEXT NOT NULL DEFAULT ''
            )
        """)
        conn.commit()
        conn.close()

        # open_db should run migration and add the missing column
        db = open_db(db_path)
        cols = {row[1] for row in db.execute("PRAGMA table_info(source_queue)")}
        assert "triage_model_used" in cols

    def test_open_db_idempotent_on_current_schema(self, corpus_dir: Path):
        """Running open_db twice on a current-schema DB should not raise."""
        path = queue_db_path(corpus_dir)
        db1 = open_db(path)
        db2 = open_db(path)
        db1.close()
        db2.close()


# ---------------------------------------------------------------------------
# Corpus association display (task item 5)
# ---------------------------------------------------------------------------

class TestCorpusAssociation:
    def _add_corpus_doc(self, corpus_dir: Path, doc_id: str, source_url: str) -> None:
        d = corpus_dir / doc_id
        d.mkdir(exist_ok=True)
        (d / "intake.json").write_text(
            json.dumps({"source": source_url, "source_url": source_url}),
            encoding="utf-8",
        )

    def test_corpus_doc_id_visible_on_item(self, db, corpus_dir: Path):
        self._add_corpus_doc(corpus_dir, "doc11111", "https://corpus.com/page")
        text = "https://corpus.com/page"
        add_items_from_text(db, text, corpus_dir)
        items = list_items(db)
        assert len(items) == 1
        assert items[0].corpus_doc_id == "doc11111"

    def test_non_corpus_url_has_empty_corpus_doc_id(self, db, corpus_dir: Path):
        add_item(db, "https://new.com/article")
        items = list_items(db)
        assert items[0].corpus_doc_id == ""

    def test_manually_set_corpus_doc_id_via_mark_ingested(self, db):
        item = add_item(db, "https://a.com")
        mark_ingested(db, item.id, "manualid1")
        fetched = get_item(db, item.id)
        assert fetched.corpus_doc_id == "manualid1"
        assert fetched.status == "ingested"
