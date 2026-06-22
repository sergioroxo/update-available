from __future__ import annotations

import json
from types import SimpleNamespace

from typer.testing import CliRunner

from runner import main
from runner.pipeline import research_digest, source_queue


def _config(tmp_path):
    corpus = tmp_path / "corpus"
    exports = tmp_path / "exports"
    corpus.mkdir()
    exports.mkdir()
    return SimpleNamespace(corpus_dir=corpus, exports_dir=exports)


def _fake_health():
    return {
        "status": "needs_attention",
        "blockers": [],
        "actions": ["53 enrichment proposal(s) await review."],
        "notes": ["2 active corpus folder(s) have no analysis.json yet."],
        "corpus": {
            "documents": 2,
            "analyzed": 1,
            "uploaded": 1,
            "active_no_analysis_docs": 1,
            "pending_enrichment_proposals": 53,
        },
        "transfer": {
            "direct_incoming_folder_count": 1,
            "incoming_archive_count": 0,
            "returned_archive_count": 0,
        },
        "knowledge": {
            "document_profiles_count": 2,
            "node_count": 3,
            "edge_count": 4,
            "evidence_strength": {"quote_backed": 3, "classification_tag": 1},
        },
    }


def _fake_quality():
    return {
        "recommendations": ["1 document(s) have zero extracted text."],
        "extraction": {
            "preprocess_quality": {"high": 1, "missing": 1},
            "zero_text_docs": [{"doc_id": "doc-empty"}],
        },
        "tag_registry": {"available": False},
        "graph": {"quote_backed_ratio": 0.75},
    }


def test_build_research_digest_summarizes_queue_health_and_quality(tmp_path, monkeypatch):
    config = _config(tmp_path)
    db = source_queue.open_db(source_queue.queue_db_path(config.corpus_dir))
    source_queue.add_item(db, "https://example.org/a", title="Safe", status="triaged")
    source_queue.apply_triage_result(
        db,
        source_queue.list_items(db)[0].id,
        SimpleNamespace(
            doc_type_hint="article",
            recommended_llm="litelm",
            routing_reason="simple",
            needs_book_splitting=False,
            needs_testimony_review=False,
            needs_media_review=False,
            needs_legal_review=False,
            overnight_batch_safe=True,
            suggested_process_route="",
        ),
        model_name="triage",
    )
    source_queue.add_item(db, "https://example.org/b", title="Legal", status="triaged")
    source_queue.apply_triage_result(
        db,
        source_queue.list_items(db)[0].id,
        SimpleNamespace(
            doc_type_hint="legal",
            recommended_llm="litelm-heavy",
            routing_reason="legal",
            needs_book_splitting=False,
            needs_testimony_review=False,
            needs_media_review=False,
            needs_legal_review=True,
            overnight_batch_safe=False,
            suggested_process_route="legal-review",
        ),
        model_name="triage",
    )

    monkeypatch.setattr(research_digest.system_health, "build_system_health", lambda *a, **k: _fake_health())
    monkeypatch.setattr(research_digest, "_load_quality", lambda *a, **k: _fake_quality())

    digest = research_digest.build_research_digest(config)

    assert digest["schema_version"] == "research-digest-v1.0"
    assert digest["system_health"]["status"] == "needs_attention"
    assert digest["queue"]["counts_by_status"] == {"triaged": 2}
    assert digest["queue"]["overnight_safe_count"] == 1
    assert digest["queue"]["review_flagged_count"] == 1
    assert any("zero extracted text" in item for item in digest["next_actions"])
    assert "# SurvivingSOGICE Research Digest" in digest["markdown"]


def test_write_research_digest_writes_json_and_markdown(tmp_path, monkeypatch):
    config = _config(tmp_path)
    monkeypatch.setattr(research_digest.system_health, "build_system_health", lambda *a, **k: _fake_health())
    monkeypatch.setattr(research_digest, "_load_quality", lambda *a, **k: _fake_quality())

    result = research_digest.write_research_digest(config, stamp="20260101T000000Z")

    json_path = config.exports_dir / "digests" / "20260101T000000Z_research_digest.json"
    md_path = config.exports_dir / "digests" / "20260101T000000Z_research_digest.md"
    assert result["json_path"] == str(json_path)
    assert result["markdown_path"] == str(md_path)
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    assert payload["schema_version"] == "research-digest-v1.0"
    assert "markdown" not in payload
    assert "## Next Actions" in md_path.read_text(encoding="utf-8")


def test_research_digest_dedupes_similar_next_actions():
    actions = research_digest._top_next_actions(
        {"blockers": [], "actions": ["53 enrichment proposal(s) await review."]},
        {"recommendations": ["53 enrichment proposal(s) await researcher review."]},
        {},
    )

    assert actions == ["53 enrichment proposal(s) await review."]


def test_research_digest_cli_writes_digest(monkeypatch, tmp_path):
    config = _config(tmp_path)
    monkeypatch.setattr(main, "load_config", lambda *a, **k: config)
    monkeypatch.setattr(research_digest.system_health, "build_system_health", lambda *a, **k: _fake_health())
    monkeypatch.setattr(research_digest, "_load_quality", lambda *a, **k: _fake_quality())

    result = CliRunner().invoke(main.app, ["research-digest", "--stamp", "20260101T000000Z"])

    assert result.exit_code == 0, result.output
    assert "Research digest written" in result.output
    assert (config.exports_dir / "digests" / "20260101T000000Z_research_digest.md").exists()
