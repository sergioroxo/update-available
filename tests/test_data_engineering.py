"""Tests for corpus_stats and export_corpus_csv in runner.pipeline.upload.

Note: search_corpus (runner.pipeline.search) is NOT tested here because it
requires a live Supabase connection and a running embedding endpoint
(Ollama local or LiteLLM proxy). It should be verified via manual integration
testing against a real environment.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

from runner.pipeline.upload import corpus_stats, export_corpus_csv


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_doc(
    corpus_dir: Path,
    doc_id: str,
    doc_type: str = "Anti-SOGICE",
    scope: str = "Core",
    tier: int = 2,
    batch_id: str = "batch-01",
    confidence_score: float = 0.90,
    confidence_status: str = "high",
    languages: list[str] | None = None,
    uploaded: bool = False,
    testimony_flag: bool = False,
    needs_review: bool = False,
) -> Path:
    """Create a minimal doc directory with intake.json and analysis.json."""
    doc_dir = corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)

    intake = {
        "doc_id": doc_id,
        "source": f"https://example.org/{doc_id}",
        "source_type": "web",
        "tier": tier,
        "batch_id": batch_id,
        "ingested_at": "2024-01-01T00:00:00+00:00",
    }
    (doc_dir / "intake.json").write_text(json.dumps(intake))

    analysis = {
        "type": doc_type,
        "primary_type": doc_type,
        "format": "Article",
        "scope": scope,
        "languages": languages or ["en"],
        "summary": f"Summary for {doc_id}.",
        "evidence": [],
        "confidence": {
            "overall_score": confidence_score,
            "status": confidence_status,
        },
        "testimony_flag": testimony_flag,
        "needs_review": needs_review,
    }
    (doc_dir / "analysis.json").write_text(json.dumps(analysis))

    if uploaded:
        sanity_record = {"sanity_id": f"sanity-{doc_id}", "uploaded_at": "2024-01-02T00:00:00+00:00"}
        (doc_dir / "sanity_record.json").write_text(json.dumps(sanity_record))

    return doc_dir


def _make_config(tmp_path: Path):
    """Return a minimal config-like object with corpus_dir and exports_dir."""

    class _Cfg:
        corpus_dir: Path
        exports_dir: Path

        def __init__(self, corpus_dir: Path, exports_dir: Path) -> None:
            self.corpus_dir = corpus_dir
            self.exports_dir = exports_dir

    exports = tmp_path / "exports"
    exports.mkdir()
    return _Cfg(corpus_dir=tmp_path / "corpus", exports_dir=exports)


# ---------------------------------------------------------------------------
# corpus_stats tests
# ---------------------------------------------------------------------------

def test_corpus_stats_empty_corpus(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()

    s = corpus_stats(config)

    assert s["total"] == 0
    assert s["uploaded"] == 0
    assert s["pending_upload"] == 0
    assert s["partial"] == 0
    assert s["testimony_flagged"] == 0
    assert len(s["by_type"]) == 0
    assert len(s["by_scope"]) == 0
    assert len(s["low_confidence_docs"]) == 0
    assert len(s["needs_review_docs"]) == 0


def test_corpus_stats_counts_by_type(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()

    _make_doc(config.corpus_dir, "doc-1", doc_type="Pro-SOGICE")
    _make_doc(config.corpus_dir, "doc-2", doc_type="Pro-SOGICE")
    _make_doc(config.corpus_dir, "doc-3", doc_type="Anti-SOGICE")

    s = corpus_stats(config)

    assert s["total"] == 3
    assert s["by_type"]["Pro-SOGICE"] == 2
    assert s["by_type"]["Anti-SOGICE"] == 1


def test_corpus_stats_pending_vs_uploaded(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()

    _make_doc(config.corpus_dir, "doc-uploaded", uploaded=True)
    _make_doc(config.corpus_dir, "doc-pending", uploaded=False)

    s = corpus_stats(config)

    assert s["uploaded"] == 1
    assert s["pending_upload"] == 1
    assert s["total"] == 2


def test_corpus_stats_counts_by_language(tmp_path):
    """corpus_stats.by_language uses the languages field from analysis.json.

    This was always broken before DS-1 (AnalysisResult dropped the field).
    Now languages is a proper model field and flows through model_dump_json
    into analysis.json, so corpus_stats can aggregate correctly.
    """
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()

    _make_doc(config.corpus_dir, "doc-en1", languages=["en"])
    _make_doc(config.corpus_dir, "doc-en2", languages=["en"])
    _make_doc(config.corpus_dir, "doc-de",  languages=["de"])
    _make_doc(config.corpus_dir, "doc-multi", languages=["en", "fr"])

    s = corpus_stats(config)

    assert s["by_language"]["en"] == 3   # doc-en1, doc-en2, doc-multi
    assert s["by_language"]["de"] == 1
    assert s["by_language"]["fr"] == 1


def test_corpus_stats_low_confidence_flagged(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()

    _make_doc(config.corpus_dir, "doc-low", confidence_score=0.55, confidence_status="low")
    _make_doc(config.corpus_dir, "doc-high", confidence_score=0.92, confidence_status="high")

    s = corpus_stats(config)

    assert "doc-low" in s["low_confidence_docs"]
    assert "doc-high" not in s["low_confidence_docs"]


# ---------------------------------------------------------------------------
# export_corpus_csv tests
# ---------------------------------------------------------------------------

def test_export_corpus_csv_creates_file(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()

    _make_doc(config.corpus_dir, "doc-a", doc_type="Anti-SOGICE", languages=["en", "fr"])
    _make_doc(config.corpus_dir, "doc-b", doc_type="Pro-SOGICE", languages=["de"])

    out_path = tmp_path / "export.csv"
    result_path = export_corpus_csv(config, out_path=out_path)

    assert result_path == out_path
    assert out_path.exists()

    with out_path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    assert len(rows) == 2
    doc_ids = {r["doc_id"] for r in rows}
    assert "doc-a" in doc_ids
    assert "doc-b" in doc_ids

    row_a = next(r for r in rows if r["doc_id"] == "doc-a")
    assert row_a["type"] == "Anti-SOGICE"
    assert "en" in row_a["languages"]
    assert row_a["uploaded"] == "no"


def test_export_corpus_csv_filters_by_batch(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()

    _make_doc(config.corpus_dir, "doc-x", batch_id="batch-01")
    _make_doc(config.corpus_dir, "doc-y", batch_id="batch-02")

    out_path = tmp_path / "batch01.csv"
    export_corpus_csv(config, batch_id="batch-01", out_path=out_path)

    with out_path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    assert len(rows) == 1
    assert rows[0]["doc_id"] == "doc-x"
    assert rows[0]["batch_id"] == "batch-01"
