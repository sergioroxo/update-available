from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from runner.main import app
from runner.pipeline.archive_summary import (
    DOCUMENT_PROFILES_JSONL,
    KNOWLEDGE_EXPORT_DIR,
    SCHEMA_VERSION,
    build_archive_summary,
    build_corpus_archive_summaries,
    derive_trust_state,
    export_document_profiles,
    read_json_safe,
    write_archive_summary,
)


class _Config:
    def __init__(self, corpus_dir: Path, exports_dir: Path) -> None:
        self.corpus_dir = corpus_dir
        self.exports_dir = exports_dir


def _cfg(tmp_path: Path) -> _Config:
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    corpus.mkdir()
    exports.mkdir()
    return _Config(corpus, exports)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _make_doc(corpus_dir: Path, doc_id: str = "doc-001", *, analysis: bool = True) -> Path:
    doc = corpus_dir / doc_id
    doc.mkdir(parents=True)
    _write_json(doc / "intake.json", {
        "source": "https://example.org/article",
        "source_url": "https://example.org/article",
        "source_type": "url",
        "archive_url": "https://web.archive.org/example",
        "wayback_status": "existing",
        "ingested_at": "2026-01-01T00:00:00+00:00",
        "batch_id": "batch-1",
        "tier": 2,
    })
    _write_json(doc / "preprocess.json", {
        "title": "Example Article",
        "author": "Researcher",
        "date_published": "2024-06-10",
        "date_modified": "2024-06-11",
        "language_detected": "en",
        "char_count": 1234,
        "tool_used": "trafilatura",
        "quality": "high",
        "acquisition": {"fetch_tool": "trafilatura", "challenge": False},
    })
    if analysis:
        _write_json(doc / "analysis.json", {
            "type": "Anti-SOGICE",
            "format": "Blog-Post",
            "scope": "Core",
            "summary": "A critical summary.",
            "country": ["United States"],
            "languages": ["en"],
            "tactic": ["Tactic: Conspiracy Framing"],
            "practice": ["Practice: Conversion Therapy"],
            "term": [],
            "actor": ["Example Org"],
            "network": ["Example Network"],
            "harm": ["Harm: Psychological"],
            "flags": [],
            "confidence": {"overall_score": 0.92, "status": "high"},
            "needs_review": False,
            "testimony_flag": False,
            "prompt_version": "p1",
            "ontology_version": "o1",
        })
    return doc


def test_build_archive_summary_maps_core_fields(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    _write_json(doc / "analysis_audit.json", {"model": "core-qwen", "git_commit": "abc"})
    _write_json(doc / "metadata.json", {"llm_used": "litelm"})
    _write_json(doc / "embedding.json", {"model": "research-embedding", "embedding": [0.1, 0.2, 0.3]})
    _write_json(doc / "offload_import.json", {
        "package_id": "trial-1",
        "package_kind": "ingest_result",
        "queue_item_id": "q1",
        "url_hash": "h1",
        "path_rewrites": [{"file": "intake.json"}],
    })

    summary = build_archive_summary(doc, config=config)

    assert summary["schema_version"] == SCHEMA_VERSION
    assert summary["doc_id"] == "doc-001"
    assert summary["source"]["hostname"] == "example.org"
    assert summary["content"]["title"] == "Example Article"
    assert summary["classification"]["type"] == "Anti-SOGICE"
    assert summary["classification"]["analysis_model"] == "core-qwen"
    assert summary["publication"]["embedding_model"] == "research-embedding"
    assert summary["publication"]["embedding_dimension"] == 3
    assert "embedding" not in summary["publication"]
    assert summary["offload"]["queue_item_id"] == "q1"
    assert summary["trust_state"] == "model_proposed"


def test_build_archive_summary_does_not_treat_local_source_as_url(tmp_path):
    config = _cfg(tmp_path)
    doc = config.corpus_dir / "doc-local"
    doc.mkdir(parents=True)
    _write_json(doc / "intake.json", {
        "source": "local-snapshot.html",
        "source_type": "html",
        "original_filename": "local-snapshot.html",
    })

    summary = build_archive_summary(doc, config=config)

    assert summary["source"]["source"] == "local-snapshot.html"
    assert summary["source"]["source_url"] == ""
    assert summary["source"]["hostname"] == ""


def test_incomplete_doc_gets_summary_without_classification_edges(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir, analysis=False)

    summary = build_archive_summary(doc, config=config)

    assert summary["trust_state"] == "incomplete"
    assert summary["readiness"]["status"] == "no_analysis_yet"
    assert summary["classification"]["type"] == ""


def test_uploaded_trust_state_from_sanity_record(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    _write_json(doc / "sanity_record.json", {"sanity_id": "doc-abc", "uploaded_at": "2026-01-02"})

    summary = build_archive_summary(doc, config=config)

    assert summary["trust_state"] == "uploaded"
    assert summary["publication"]["uploaded"] is True
    assert summary["publication"]["sanity_id"] == "doc-abc"


def test_researcher_reviewed_trust_state_from_review_sidecar(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    _write_json(doc / "review_status.json", {"reviewed": True, "reviewed_at": "2026-01-02"})

    summary = build_archive_summary(doc, config=config)

    assert summary["trust_state"] == "researcher_reviewed"
    assert summary["review"]["analysis_reviewed"]["reviewed"] is True


def test_researcher_reviewed_trust_state_from_manual_override(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    analysis = read_json_safe(doc / "analysis.json", {})
    analysis["_manual_overrides"] = {"testimony_flag": "researcher_confirmed_false"}
    _write_json(doc / "analysis.json", analysis)

    summary = build_archive_summary(doc, config=config)

    assert summary["trust_state"] == "researcher_reviewed"
    assert summary["review"]["manual_overrides"]["testimony_flag"] == "researcher_confirmed_false"


def test_derive_trust_state_precedence():
    assert derive_trust_state(
        analysis={},
        sanity_record={},
        review_status={},
        legal_review={},
        testimony_review={},
    ) == "incomplete"
    assert derive_trust_state(
        analysis={"summary": "x"},
        sanity_record={},
        review_status={},
        legal_review={},
        testimony_review={},
    ) == "model_proposed"
    assert derive_trust_state(
        analysis={"summary": "x"},
        sanity_record={},
        review_status={},
        legal_review={"reviewed": True},
        testimony_review={},
    ) == "researcher_reviewed"
    assert derive_trust_state(
        analysis={},
        sanity_record={"sanity_id": "doc-x"},
        review_status={},
        legal_review={},
        testimony_review={},
    ) == "uploaded"


def test_enrichment_lifecycle_and_counts_are_included(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)
    _write_json(doc / "enrichment.json", {
        "doc_id": "doc-001",
        "enrichment_model": "core-gemma",
        "lexicon_proposals": [{"term": "Life Choices", "approved": True}],
        "entity_proposals": [{"name": "ADF", "approved": False}],
        "tactic_proposals": [],
        "practice_descriptions": [],
        "statistical_claims": [],
        "ingestion_queue": [],
        "corpus_connections": [],
    })

    summary = build_archive_summary(doc, config=config)

    assert summary["enrichment"]["exists"] is True
    assert summary["enrichment"]["counts"]["lexicon_proposals"] == 1
    assert summary["enrichment"]["counts"]["entity_proposals"] == 1
    assert summary["enrichment"]["lifecycle"]["pending"] == 1
    assert summary["enrichment"]["lifecycle"]["approved_unpushed"] == 1


def test_write_archive_summary_is_regenerable(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir)

    out = write_archive_summary(doc, config=config)
    first = read_json_safe(out, {})
    out2 = write_archive_summary(doc, config=config)
    second = read_json_safe(out2, {})

    assert out == out2
    assert first["doc_id"] == second["doc_id"] == "doc-001"
    assert second["schema_version"] == SCHEMA_VERSION


def test_build_corpus_archive_summaries_writes_all(tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-a")
    _make_doc(config.corpus_dir, "doc-b", analysis=False)

    summaries = build_corpus_archive_summaries(config.corpus_dir, config=config, write=True)

    assert [s["doc_id"] for s in summaries] == ["doc-a", "doc-b"]
    assert (config.corpus_dir / "doc-a" / "archive_summary.json").exists()
    assert (config.corpus_dir / "doc-b" / "archive_summary.json").exists()


def test_export_document_profiles_jsonl(tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-a")
    _make_doc(config.corpus_dir, "doc-b", analysis=False)

    result = export_document_profiles(config.corpus_dir, config.exports_dir, config=config)

    out = Path(result["path"])
    assert out == config.exports_dir / KNOWLEDGE_EXPORT_DIR / DOCUMENT_PROFILES_JSONL
    assert result["count"] == 2
    lines = out.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    assert [json.loads(line)["doc_id"] for line in lines] == ["doc-a", "doc-b"]
    assert not (config.corpus_dir / "doc-a" / "archive_summary.json").exists()


def test_export_document_profiles_can_refresh_sidecars(tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-a")

    result = export_document_profiles(
        config.corpus_dir,
        config.exports_dir,
        config=config,
        write_doc_summaries=True,
    )

    assert result["write_doc_summaries"] is True
    assert (config.corpus_dir / "doc-a" / "archive_summary.json").exists()


def test_archive_summary_cli_build_one_doc(monkeypatch, tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-a")
    monkeypatch.setattr("runner.main.load_config", lambda *a, **kw: config)

    result = CliRunner().invoke(app, ["archive-summary-build", "doc-a"])

    assert result.exit_code == 0, result.output
    assert "Archive summary written" in result.output
    assert (config.corpus_dir / "doc-a" / "archive_summary.json").exists()


def test_archive_summary_cli_export(monkeypatch, tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-a")
    monkeypatch.setattr("runner.main.load_config", lambda *a, **kw: config)

    result = CliRunner().invoke(app, ["archive-summary-export", "--refresh-sidecars"])

    assert result.exit_code == 0, result.output
    assert "Document profiles exported" in result.output
    assert (config.exports_dir / "knowledge" / "document_profiles.jsonl").exists()
    assert (config.corpus_dir / "doc-a" / "archive_summary.json").exists()
