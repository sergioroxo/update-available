"""Slice Q — deterministic quality fixes.

Covers all five fixes with no network / model / Sanity / Supabase:
  1. Source-offload import rewrites Mac Studio absolute paths → MacBook corpus.
  2. Date extraction handles og:published_time / og:updated_time.
  3. Testimony flag/boolean reconciliation (fail-safe, never silently dropped).
  4. Language/country derivation from og:locale / <html lang> + analysis post-fill.
  5. Source-offload import surfaces a failed wayback as a retryable queue entry.
"""
from __future__ import annotations

import json
import types
from pathlib import Path

from runner.models.document import (
    AnalysisResult,
    PageIntelligence,
    PreprocessResult,
    language_country_from_locale,
)
from runner.models.enrichment import EnrichmentResult
from runner.pipeline import analyze, offload_source
from runner.pipeline import source_worker as sw
from runner.pipeline.offload_source import (
    SourceItemSpec,
    build_source_package,
    import_ingest_result,
)
from runner.pipeline.preprocess import (
    _extract_page_intelligence,
    repair_preprocess_metadata,
)


# ===========================================================================
# Fix 2 — date extraction (og:published_time / og:updated_time)
# ===========================================================================

def _html(meta: str, lang: str = "en") -> str:
    return f'<html lang="{lang}"><head>{meta}</head><body><p>x</p></body></html>'


def test_og_published_time_feeds_date_published():
    intel = _extract_page_intelligence(
        _html('<meta property="og:published_time" content="2024-06-10T08:00:00Z">'),
        base_url="https://example.org/a",
    )
    assert intel.date_published == "2024-06-10T08:00:00Z"


def test_og_updated_time_feeds_date_modified_not_published():
    intel = _extract_page_intelligence(
        _html('<meta property="og:updated_time" content="2024-06-10T09:00:00Z">'),
        base_url="https://example.org/a",
    )
    assert intel.date_modified == "2024-06-10T09:00:00Z"
    assert intel.date_published == ""  # updated_time is not a published signal


def test_article_published_time_still_wins_over_og():
    intel = _extract_page_intelligence(
        _html(
            '<meta property="article:published_time" content="2020-01-01">'
            '<meta property="og:published_time" content="2024-06-10">'
        ),
        base_url="https://example.org/a",
    )
    assert intel.date_published == "2020-01-01"


def test_repair_metadata_does_not_promote_modified_to_published():
    """A modified-only page must NOT silently become a publication date."""
    repaired = repair_preprocess_metadata({
        "page_intel": {"date_published": "", "date_modified": "2024-06-10T09:00:00Z"},
    })
    assert repaired["date_published"] == ""
    # The modified date is preserved (surfaced separately downstream).
    assert repaired["page_intel"]["date_modified"] == "2024-06-10T09:00:00Z"


# ---------------------------------------------------------------------------
# Downstream document_date: modified date surfaced as a review candidate
# ---------------------------------------------------------------------------

def test_document_date_modified_fallback_is_low_confidence_with_provenance():
    from runner.pipeline.upload import _repair_analysis_date_from_source

    pp = PreprocessResult(
        doc_id="d", tool_used="trafilatura", quality="high", text="x",
        date_published="",  # no publication date
        page_intel=PageIntelligence(date_published="", date_modified="2024-06-10"),
    )
    analysis = _analysis()  # document_date.year == 0
    changed = _repair_analysis_date_from_source(analysis, pp)
    assert changed is True
    assert analysis.document_date.year == 2024
    assert analysis.document_date.confidence == "approximate"  # low confidence, not exact
    assert any("modified_date_fallback" in w for w in analysis.normalisation_warnings)


def test_document_date_prefers_published_over_modified():
    from runner.pipeline.upload import _repair_analysis_date_from_source

    pp = PreprocessResult(
        doc_id="d", tool_used="trafilatura", quality="high", text="x",
        date_published="2020-01-15",
        page_intel=PageIntelligence(date_published="2020-01-15", date_modified="2024-06-10"),
    )
    analysis = _analysis()
    changed = _repair_analysis_date_from_source(analysis, pp)
    assert changed is True
    assert analysis.document_date.year == 2020
    assert analysis.document_date.confidence == "exact"
    assert not any("modified_date_fallback" in w for w in analysis.normalisation_warnings)


def test_document_date_unknown_when_no_dates():
    from runner.pipeline.upload import _repair_analysis_date_from_source

    pp = PreprocessResult(
        doc_id="d", tool_used="trafilatura", quality="high", text="x",
        page_intel=PageIntelligence(),
    )
    analysis = _analysis()
    changed = _repair_analysis_date_from_source(analysis, pp)
    assert changed is False
    assert analysis.document_date.year == 0
    assert analysis.document_date.confidence == "unknown"


# ===========================================================================
# Fix 3 — testimony flag reconciliation (fail-safe)
# ===========================================================================

def _analysis(**overrides) -> AnalysisResult:
    payload = {
        "type": "Anti-SOGICE", "format": "Blog-Post",
        "evidence": ["e"], "scope": "Core",
        "narrative_register": "Legal-Policy", "summary": "s",
        "confidence": {"overall_score": 0.85, "status": "high"},
    }
    payload.update(overrides)
    return AnalysisResult.model_validate(payload)


def test_testimony_flag_forced_true_when_flag_present():
    result = _analysis(flags=["Flag: Testimony-Extraction-Required"], testimony_flag=False)
    assert result.testimony_flag is True
    assert any("testimony_flag forced True" in w for w in result.normalisation_warnings)


def test_testimony_flag_preserved_not_dropped():
    result = _analysis(flags=["Flag: Testimony-Extraction-Required"], testimony_flag=False)
    assert "Flag: Testimony-Extraction-Required" in result.flags  # never silently dropped


def test_testimony_flag_match_is_case_insensitive():
    result = _analysis(flags=["flag: testimony-extraction-required"], testimony_flag=False)
    assert result.testimony_flag is True


def test_testimony_no_warning_when_already_consistent():
    result = _analysis(flags=["Flag: Testimony-Extraction-Required"], testimony_flag=True)
    assert result.testimony_flag is True
    assert not any("testimony_flag forced True" in w for w in result.normalisation_warnings)


def test_testimony_unchanged_without_flag():
    result = _analysis(flags=["Flag: Media-Coverage"], testimony_flag=False)
    assert result.testimony_flag is False


# ===========================================================================
# Fix 4 — language/country from locale + analysis post-fill
# ===========================================================================

def test_locale_parser_language_and_country():
    assert language_country_from_locale("en_US") == ("en", "United States")
    assert language_country_from_locale("pt-BR") == ("pt", "Brazil")
    assert language_country_from_locale("en") == ("en", "")
    assert language_country_from_locale("") == ("", "")
    # Unknown region subtag yields no country guess.
    assert language_country_from_locale("en_ZZ") == ("en", "")


def _preprocess_with_locale(locale: str = "en_US") -> PreprocessResult:
    return PreprocessResult(
        doc_id="d", tool_used="trafilatura", quality="high", text="x",
        page_intel=PageIntelligence(og_locale=locale),
    )


def test_postfill_fills_empty_language_and_country():
    result = analyze._postfill_locale_fields(_analysis(), _preprocess_with_locale("en_US"))
    assert result.languages == ["en"]
    assert result.country == ["United States"]
    assert any("locale-fill" in w for w in result.normalisation_warnings)


def test_postfill_does_not_override_model_values():
    result = analyze._postfill_locale_fields(
        _analysis(languages=["fr"], country=["France"]),
        _preprocess_with_locale("en_US"),
    )
    assert result.languages == ["fr"]
    assert result.country == ["France"]
    assert not any("locale-fill" in w for w in result.normalisation_warnings)


def test_postfill_uses_html_lang_when_no_og_locale():
    pp = PreprocessResult(
        doc_id="d", tool_used="trafilatura", quality="high", text="x",
        page_intel=PageIntelligence(og_locale="", html_lang="pt-BR"),
    )
    result = analyze._postfill_locale_fields(_analysis(), pp)
    assert result.languages == ["pt"]
    assert result.country == ["Brazil"]


def test_postfill_noop_without_page_intel():
    pp = PreprocessResult(doc_id="d", tool_used="trafilatura", quality="high", text="x")
    result = analyze._postfill_locale_fields(_analysis(), pp)
    assert result.languages == []
    assert result.country == []


def test_html_lang_captured_by_page_intelligence():
    intel = _extract_page_intelligence(_html("", lang="pt-BR"), base_url="https://e.org")
    assert intel.html_lang == "pt-BR"


# ===========================================================================
# Fix 1 + 5 — import path rewrite + wayback retry surfacing
# ===========================================================================

def _wcfg(live: Path) -> types.SimpleNamespace:
    return types.SimpleNamespace(
        corpus_dir=live,
        litelm_analysis_model="core-qwen", litelm_analysis_model_heavy="h",
        litelm_analysis_model_reasoning="r", litelm_enrichment_model="lexicon-llm",
        litelm_embedding_model="research-embedding", embedding_model="emb",
        local_analysis_model="local", wayback_enabled=False, truncation_limit=24000,
    )


def _stubs(*, wayback_status: str = "success"):
    analysis = AnalysisResult.model_validate({
        "type": "Anti-SOGICE", "format": "Blog-Post", "evidence": ["e"],
        "scope": "Core", "narrative_register": "Legal-Policy", "summary": "s",
    })

    def fake_intake(*, source, tier, batch, config, force_doc_id, source_url):
        d = Path(config.corpus_dir) / force_doc_id
        d.mkdir(parents=True, exist_ok=True)
        (d / "intake.json").write_text(
            json.dumps({"doc_id": force_doc_id, "source": source, "local_copy_path": ""}),
            encoding="utf-8",
        )
        # Mac-Studio-style failed wayback that should become retryable on import.
        (d / "wayback.json").write_text(
            json.dumps({"source": source, "status": wayback_status,
                        "archive_url": None, "checked_at": "t", "error": "timeout"}),
            encoding="utf-8",
        )
        return types.SimpleNamespace(
            doc_id=force_doc_id, source=source, source_type="url",
            local_dir=d, local_copy_path="",
        )

    def fake_preprocess(intake, *, config):
        d = Path(intake.local_dir)
        (d / "extracted.txt").write_text("text " + intake.doc_id, encoding="utf-8")
        html_abs = str(d / "source.html")  # absolute "Mac Studio" path
        (d / "source.html").write_text("<html></html>", encoding="utf-8")
        (d / "html_snapshot.json").write_text(
            json.dumps({"path": html_abs, "sha256": "deadbeef"}), encoding="utf-8"
        )
        (d / "preprocess.json").write_text(
            json.dumps({"doc_id": intake.doc_id, "quality": "high",
                        "source_html_path": html_abs}),
            encoding="utf-8",
        )
        return types.SimpleNamespace(doc_id=intake.doc_id, text="text " + intake.doc_id)

    return dict(
        intake_fn=fake_intake, preprocess_fn=fake_preprocess,
        analyze_fn=lambda preprocess, **kw: analysis,
        enrich_fn=lambda doc_id, preprocess, analysis_, **kw: EnrichmentResult(doc_id=doc_id),
        embed_fn=lambda text, config: [0.1, 0.2, 0.3],
        unload_analysis_fn=lambda c, l: True,
        unload_enrichment_fn=lambda c, a: True,
        unload_embedding_fn=lambda c: True,
    )


def _make_outbox(tmp_path, *, wayback_status="success", package_id="src-q"):
    root = tmp_path / "source_offload"
    specs = [SourceItemSpec(source_kind="url", declared_source_type="url",
                            doc_id="urldoc", url="https://example.org/a",
                            queue_item_id="qi_url", url_hash="h_url")]
    build_source_package(specs=specs, source_offload_root=root, package_id=package_id)
    live = tmp_path / "worker_live"
    live.mkdir(exist_ok=True)
    summary = sw.run_source_worker(
        root / "inbox" / package_id, _wcfg(live), **_stubs(wayback_status=wayback_status)
    )
    assert summary["final_state"] == "outbox", summary["errors"]
    return root, root / "outbox" / package_id


def test_import_rewrites_mac_studio_paths_to_corpus(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["imported"] is True

    doc = corpus / "urldoc"
    pp = json.loads((doc / "preprocess.json").read_text(encoding="utf-8"))
    snap = json.loads((doc / "html_snapshot.json").read_text(encoding="utf-8"))
    expected = str(doc / "source.html")
    assert pp["source_html_path"] == expected
    assert snap["path"] == expected
    assert "sogice-offload" not in pp["source_html_path"]
    # Provenance records the rewrites.
    prov = json.loads((doc / "offload_import.json").read_text(encoding="utf-8"))
    fields = {(r["file"], r["field"]) for r in prov["path_rewrites"]}
    assert ("preprocess.json", "source_html_path") in fields
    assert ("html_snapshot.json", "path") in fields
    assert summary["path_rewrites"] >= 2


def test_import_leaves_non_local_paths_untouched(tmp_path):
    root, outbox = _make_outbox(tmp_path)
    corpus = tmp_path / "corpus"
    # An intake.local_copy_path that points at a file NOT imported must be left as-is.
    import_ingest_result(outbox, corpus_dir=corpus, dry_run=True)
    # (dry run writes nothing — sanity that nothing was created)
    assert not (corpus / "urldoc").exists()


def test_import_surfaces_failed_wayback_as_retry(tmp_path):
    root, outbox = _make_outbox(tmp_path, wayback_status="failed", package_id="src-wb")
    corpus = tmp_path / "corpus"
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["imported"] is True
    assert summary["wayback_retries"] == ["https://example.org/a"]

    queue = json.loads((corpus / "wayback_retry_queue.json").read_text(encoding="utf-8"))
    assert [e["source"] for e in queue] == ["https://example.org/a"]
    prov = json.loads((corpus / "urldoc" / "offload_import.json").read_text(encoding="utf-8"))
    assert prov["wayback_retry"]["status"] == "failed"


def test_import_wayback_retry_is_deduped(tmp_path):
    root, outbox = _make_outbox(tmp_path, wayback_status="failed", package_id="src-dd")
    corpus = tmp_path / "corpus"
    corpus.mkdir()
    (corpus / "wayback_retry_queue.json").write_text(
        json.dumps([{"source": "https://example.org/a", "status": "failed"}]),
        encoding="utf-8",
    )
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["wayback_retries"] == []  # already present → not re-added
    queue = json.loads((corpus / "wayback_retry_queue.json").read_text(encoding="utf-8"))
    assert len(queue) == 1


def test_import_success_wayback_adds_no_retry(tmp_path):
    root, outbox = _make_outbox(tmp_path, wayback_status="success", package_id="src-ok")
    corpus = tmp_path / "corpus"
    summary = import_ingest_result(outbox, corpus_dir=corpus)
    assert summary["wayback_retries"] == []
    assert not (corpus / "wayback_retry_queue.json").exists()


# ===========================================================================
# Pure-helper coverage for the rewrite / wayback primitives
# ===========================================================================

def test_rewrite_helper_only_rewrites_existing_basenames(tmp_path):
    d = tmp_path / "doc"
    d.mkdir()
    (d / "source.html").write_text("x", encoding="utf-8")
    (d / "preprocess.json").write_text(
        json.dumps({"source_html_path": "/Users/cdn-ai/sogice-offload/p/docs/doc/source.html"}),
        encoding="utf-8",
    )
    (d / "intake.json").write_text(
        json.dumps({"local_copy_path": "/Users/cdn-ai/elsewhere/missing.pdf"}),
        encoding="utf-8",
    )
    rewrites = offload_source._rewrite_imported_local_paths(d)
    pp = json.loads((d / "preprocess.json").read_text(encoding="utf-8"))
    intake = json.loads((d / "intake.json").read_text(encoding="utf-8"))
    assert pp["source_html_path"] == str(d / "source.html")
    # missing.pdf was never imported → left untouched.
    assert intake["local_copy_path"] == "/Users/cdn-ai/elsewhere/missing.pdf"
    assert {r["field"] for r in rewrites} == {"source_html_path"}


def test_wayback_retry_entry_only_for_failed_statuses(tmp_path):
    d = tmp_path / "doc"
    d.mkdir()
    (d / "wayback.json").write_text(
        json.dumps({"source": "https://e.org", "status": "saved"}), encoding="utf-8"
    )
    assert offload_source._wayback_retry_entry(d) is None
    (d / "wayback.json").write_text(
        json.dumps({"source": "https://e.org", "status": "timeout"}), encoding="utf-8"
    )
    entry = offload_source._wayback_retry_entry(d)
    assert entry is not None and entry["source"] == "https://e.org"
