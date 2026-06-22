from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from runner.main import app
from runner.pipeline.knowledge_quality import (
    KNOWLEDGE_QUALITY_JSON,
    build_knowledge_quality_report,
    write_knowledge_quality_report,
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


def _make_doc(corpus_dir: Path, doc_id: str, *, reviewed: bool = True, enrichment: bool = True) -> Path:
    doc = corpus_dir / doc_id
    doc.mkdir(parents=True)
    _write_json(doc / "intake.json", {
        "source": "https://example.org/article",
        "source_url": "https://example.org/article",
        "source_type": "url",
    })
    _write_json(doc / "preprocess.json", {
        "title": "Example Article",
        "quality": "high",
        "char_count": 1450,
    })
    (doc / "extracted.txt").write_text(
        "Alliance Defending Freedom uses life choices framing in conversion therapy debates.",
        encoding="utf-8",
    )
    _write_json(doc / "analysis.json", {
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "scope": "Core",
        "summary": "A critical summary.",
        "country": ["United States"],
        "languages": ["en"],
        "tactic": ["Tactic: Conspiracy Framing"],
        "practice": [],
        "term": ["Life Choices"],
        "actor": ["Alliance Defending Freedom"],
        "network": [],
        "harm": ["Harm: Psychological"],
        "function": ["Function: Disinformation-Narrative"],
        "flags": [],
        "confidence": {"overall_score": 0.91, "status": "high"},
        "needs_review": False,
        "testimony_flag": False,
    })
    if reviewed:
        _write_json(doc / "review_status.json", {"reviewed": True})
    if enrichment:
        _write_json(doc / "enrichment.json", {
            "doc_id": doc_id,
            "lexicon_proposals": [{
                "proposal_id": "lex-1",
                "term": "Life Choices",
                "exact_quote": "uses life choices framing",
                "approved": True,
                "model_confidence": 0.8,
            }],
            "entity_proposals": [{
                "proposal_id": "ent-1",
                "name": "Alliance Defending Freedom",
                "entity_type": "organization",
                "evidence_quote": "Alliance Defending Freedom uses...",
                "approved": False,
                "model_confidence": 0.7,
            }],
            "tactic_proposals": [],
            "practice_descriptions": [],
            "statistical_claims": [],
            "corpus_connections": [],
        })
    return doc


def test_quality_report_separates_extraction_tags_registry_enrichment_and_graph(monkeypatch, tmp_path):
    from runner.pipeline import tag_registry

    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-1", reviewed=True)
    _make_doc(config.corpus_dir, "doc-2", reviewed=False, enrichment=False)
    (config.corpus_dir / "doc-empty").mkdir()

    monkeypatch.setattr(tag_registry, "load_tag_registry", lambda: [
        {"category": "Term", "tag": "Life Choices"},
        {"category": "Actor", "tag": "Alliance Defending Freedom"},
    ])
    monkeypatch.setattr(tag_registry, "detect_tag_matches", lambda text: [
        {"category": "Term", "tag": "Life Choices"},
        {"category": "Actor", "tag": "Alliance Defending Freedom"},
    ] if "life choices" in text.lower() else [])

    report = build_knowledge_quality_report(
        config.corpus_dir,
        config.exports_dir,
        config=config,
        prefer_exports=False,
    )

    assert report["profiles"]["count"] == 3
    assert report["profiles"]["trust_state"]["researcher_reviewed"] == 1
    assert report["profiles"]["trust_state"]["model_proposed"] == 1
    assert report["profiles"]["trust_state"]["incomplete"] == 1
    assert report["extraction"]["preprocess_quality"]["high"] == 2
    assert report["extraction"]["zero_text_docs"][0]["doc_id"] == "doc-empty"
    assert report["tag_coverage"]["fields"]["tactic"]["docs_with_values"] == 2
    assert report["tag_registry"]["used_for_enrichment"] is True
    assert report["tag_registry"]["mode"] == "connection_hints_not_proof"
    assert report["tag_registry"]["docs_with_matches"] == 2
    assert report["tag_registry"]["category_matches"] == {"Actor": 2, "Term": 2}
    assert report["enrichment"]["family_counts"]["lexicon_proposals"] == 1
    assert report["enrichment"]["lifecycle"]["approved"] == 1
    assert report["enrichment"]["lifecycle"]["pending"] == 1
    assert report["enrichment"]["deferred_note"].startswith("corpus_connections are excluded")
    assert report["graph"]["evidence_strength"]["classification_tag"] >= 1
    assert report["graph"]["evidence_strength"]["quote_backed"] >= 1
    assert any("enrichment proposal" in item for item in report["recommendations"])


def test_write_quality_report_writes_default_knowledge_path(tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-1", reviewed=True)

    result = write_knowledge_quality_report(
        config.corpus_dir,
        config.exports_dir,
        config=config,
        prefer_exports=False,
    )

    path = config.exports_dir / "knowledge" / KNOWLEDGE_QUALITY_JSON
    assert result["path"] == str(path)
    assert path.exists()
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["schema_version"] == "knowledge-quality-v1.0"


def test_quality_report_recommends_when_tag_registry_unavailable(monkeypatch, tmp_path):
    from runner.pipeline import tag_registry

    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-1", reviewed=True)
    monkeypatch.setattr(tag_registry, "load_tag_registry", lambda: (_ for _ in ()).throw(OSError("registry missing")))

    report = build_knowledge_quality_report(
        config.corpus_dir,
        config.exports_dir,
        config=config,
        prefer_exports=False,
    )

    assert report["tag_registry"]["available"] is False
    assert any("Tag registry is unavailable" in item for item in report["recommendations"])


def test_cli_knowledge_quality_report_writes_file(monkeypatch, tmp_path):
    import runner.main as main_mod

    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-1", reviewed=True)
    monkeypatch.setattr(main_mod, "load_config", lambda llm=None, require_services=False: config)

    result = CliRunner().invoke(app, ["knowledge-quality-report", "--live"])

    assert result.exit_code == 0, result.output
    assert "Knowledge quality report written" in result.output
    assert (config.exports_dir / "knowledge" / KNOWLEDGE_QUALITY_JSON).exists()
