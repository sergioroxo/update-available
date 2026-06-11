"""Slice B — shared document_date backfill.

The backfill now runs at the analysis stage (so regular ingest, reanalyze,
both-LLM paths, and the source worker all emit analysis.json with a populated
document_date) and the upload-time repair delegates to the same helper as an
idempotent safety net. No network / model / Sanity / Supabase.
"""
from __future__ import annotations

from runner.models.document import AnalysisResult, PageIntelligence, PreprocessResult
from runner.pipeline import analyze
from runner.pipeline.metadata_quality import backfill_document_date
from runner.pipeline.upload import _repair_analysis_date_from_source


def _analysis(**overrides) -> AnalysisResult:
    payload = {
        "type": "Anti-SOGICE", "format": "Blog-Post", "evidence": ["e"],
        "scope": "Core", "narrative_register": "Legal-Policy", "summary": "s",
        "confidence": {"overall_score": 0.85, "status": "high"},
    }
    payload.update(overrides)
    return AnalysisResult.model_validate(payload)


def _preprocess(date_published="", date_modified="") -> PreprocessResult:
    return PreprocessResult(
        doc_id="d", tool_used="trafilatura", quality="high", text="x",
        date_published=date_published,
        page_intel=PageIntelligence(
            date_published=date_published, date_modified=date_modified
        ),
    )


# ---------------------------------------------------------------------------
# backfill_document_date — core semantics
# ---------------------------------------------------------------------------

def test_published_date_fills_document_date_exact():
    a = _analysis()
    changed = backfill_document_date(a, _preprocess(date_published="2012-02-17"))
    assert changed is True
    assert (a.document_date.year, a.document_date.month, a.document_date.day) == (2012, 2, 17)
    assert a.document_date.confidence == "exact"
    assert any("backfilled from source publication metadata" in w
               for w in a.normalisation_warnings)


def test_year_only_published_date_is_approximate():
    a = _analysis()
    backfill_document_date(a, _preprocess(date_published="2012"))
    assert a.document_date.year == 2012
    assert a.document_date.confidence == "approximate"


def test_modified_only_fallback_is_approximate_with_warning():
    a = _analysis()
    changed = backfill_document_date(a, _preprocess(date_published="", date_modified="2024-06-10"))
    assert changed is True
    assert a.document_date.year == 2024
    assert a.document_date.confidence == "approximate"
    assert any("modified_date_fallback" in w for w in a.normalisation_warnings)


def test_published_preferred_over_modified():
    a = _analysis()
    backfill_document_date(a, _preprocess(date_published="2020-01-15", date_modified="2024-06-10"))
    assert a.document_date.year == 2020
    assert a.document_date.confidence == "exact"
    assert not any("modified_date_fallback" in w for w in a.normalisation_warnings)


def test_unknown_when_no_dates():
    a = _analysis()
    changed = backfill_document_date(a, _preprocess())
    assert changed is False
    assert a.document_date.year == 0
    assert a.document_date.confidence == "unknown"


def test_does_not_override_llm_provided_date():
    a = _analysis(document_date={"year": 1999, "month": 5, "day": 6, "confidence": "exact"})
    changed = backfill_document_date(a, _preprocess(date_published="2012-02-17"))
    assert changed is False
    assert (a.document_date.year, a.document_date.month) == (1999, 5)


def test_idempotent_second_call_is_noop():
    a = _analysis()
    pp = _preprocess(date_published="2012-02-17")
    assert backfill_document_date(a, pp) is True
    # Second call finds year already set → no-op, no duplicate warning.
    assert backfill_document_date(a, pp) is False
    assert sum("backfilled from source publication metadata" in w
               for w in a.normalisation_warnings) == 1


def test_backfill_handles_preprocess_without_page_intel():
    a = _analysis()
    pp = PreprocessResult(doc_id="d", tool_used="trafilatura", quality="high",
                          text="x", date_published="2012-02-17", page_intel=None)
    assert backfill_document_date(a, pp) is True
    assert a.document_date.year == 2012


# ---------------------------------------------------------------------------
# Analyze stage applies the backfill (shared across ingest / worker)
# ---------------------------------------------------------------------------

def test_postprocess_analysis_backfills_document_date():
    result = analyze._postprocess_analysis(_analysis(), _preprocess(date_published="2012-02-17"))
    assert result.document_date.year == 2012
    assert result.document_date.confidence == "exact"


def test_postprocess_analysis_also_keeps_locale_fill():
    pp = PreprocessResult(
        doc_id="d", tool_used="trafilatura", quality="high", text="x",
        date_published="2012-02-17",
        page_intel=PageIntelligence(og_locale="en_US",
                                    date_published="2012-02-17", date_modified=""),
    )
    result = analyze._postprocess_analysis(_analysis(), pp)
    assert result.languages == ["en"]
    assert result.country == ["United States"]
    assert result.document_date.year == 2012


# ---------------------------------------------------------------------------
# Upload-time repair delegates + no-ops after analyze backfill
# ---------------------------------------------------------------------------

def test_upload_repair_delegates_to_shared_helper():
    a = _analysis()
    changed = _repair_analysis_date_from_source(a, _preprocess(date_published="2012-02-17"))
    assert changed is True
    assert a.document_date.year == 2012


def test_upload_repair_noops_after_analyze_backfill():
    pp = _preprocess(date_published="2012-02-17")
    a = analyze._postprocess_analysis(_analysis(), pp)  # analyze already backfilled
    assert a.document_date.year == 2012
    # Upload-time safety net is now a no-op (no duplicate warning).
    assert _repair_analysis_date_from_source(a, pp) is False
    assert sum("backfilled from source publication metadata" in w
               for w in a.normalisation_warnings) == 1
