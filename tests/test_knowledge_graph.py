from __future__ import annotations

import csv
import json
from pathlib import Path

from typer.testing import CliRunner

from runner.main import app
from runner.pipeline.knowledge_graph import (
    EDGES_CSV,
    GRAPH_JSON,
    NODES_CSV,
    build_knowledge_graph,
    display_label,
    export_knowledge_graph,
    slugify,
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


def _make_doc(
    corpus_dir: Path,
    doc_id: str = "doc-001",
    *,
    reviewed: bool = False,
    uploaded: bool = False,
) -> Path:
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
        "char_count": 1000,
    })
    _write_json(doc / "analysis.json", {
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "scope": "Core",
        "summary": "A critical summary.",
        "country": ["United States"],
        "languages": ["en"],
        "tactic": ["Tactic: Conspiracy Framing"],
        "practice": ["Practice: Conversion Therapy"],
        "term": ["Life Choices"],
        "actor": ["Example Org"],
        "network": ["Example Network"],
        "harm": ["Harm: Psychological"],
        "function": ["Function: Disinformation-Narrative"],
        "flags": [],
        "confidence": {"overall_score": 0.92, "status": "high"},
        "needs_review": False,
        "testimony_flag": False,
    })
    if reviewed:
        _write_json(doc / "review_status.json", {"reviewed": True, "reviewed_at": "2026-01-02"})
    if uploaded:
        _write_json(doc / "sanity_record.json", {"sanity_id": f"doc-{doc_id}", "uploaded_at": "2026-01-03"})
    return doc


def _write_enrichment(doc: Path, *, approved: bool = True, rejected: bool = False, corpus_grounded: bool = False) -> None:
    _write_json(doc / "enrichment.json", {
        "doc_id": doc.name,
        "lexicon_proposals": [{
            "proposal_id": "lex-1",
            "term": "Life Choices",
            "exact_quote": "The document uses life choices framing.",
            "relationships": [{
                "existing_term": "Lifestyle Choice",
                "relationship": "synonym_of",
                "evidence": "Used interchangeably.",
            }],
            "approved": approved,
            "rejected": rejected,
            "pushed_to_sanity": False,
            "model_confidence": 0.8,
        }],
        "entity_proposals": [{
            "proposal_id": "ent-1",
            "action": "add_new",
            "entity_type": "organization",
            "name": "Alliance Defending Freedom",
            "evidence_quote": "ADF is named in the article.",
            "approved": approved,
            "rejected": rejected,
            "pushed_to_sanity": False,
            "model_confidence": 0.9,
            "network_connections": [{
                "entity_name": "Focus on the Family",
                "connection_type": "partner",
                "evidence_quote": "They co-signed the statement.",
                "attested_in_doc": doc.name,
            }],
            "key_individuals": [{"name": "Jane Doe", "role": "Director", "quote": "Jane is named."}],
        }],
        "tactic_proposals": [{
            "proposal_id": "tac-1",
            "tactic": "Identity Policing",
            "evidence_quote": "The article polices identity.",
            "approved": approved,
            "rejected": rejected,
            "model_confidence": 0.7,
        }],
        "practice_descriptions": [{
            "proposal_id": "prac-1",
            "practice_id": "Practice: Pastoral Guidance",
            "exact_description": "Pastoral guidance is described.",
            "harm_quote": "The harm is minimized.",
            "approved": approved,
            "rejected": rejected,
            "model_confidence": 0.75,
        }],
        "statistical_claims": [],
        "ingestion_queue": [],
        "corpus_connections": [{
            "doc_id": "other-doc",
            "connection_type": "same_tactic",
            "shared_element": "Identity Policing",
            "evidence": "Both use the same tactic.",
            "is_retrieval_grounded": corpus_grounded,
            "approved": approved,
            "rejected": rejected,
        }],
    })


def _edge_types(graph: dict) -> set[str]:
    return {edge["type"] for edge in graph["edges"]}


def test_slugify_normalizes_prefixed_labels():
    assert slugify("Tactic: Conspiracy Framing") == "conspiracy-framing"
    assert slugify("Life Choices!") == "life-choices"


def test_display_label_strips_prefixes_and_normalizes_country_aliases():
    assert display_label("function", "Function: Political-Slogan") == "Political-Slogan"
    assert display_label("harm", "Harm: Psychological") == "Psychological"
    assert display_label("practice", "Practice: Conversion Therapy") == "Conversion Therapy"
    assert display_label("country", "USA") == "United States"
    assert display_label("country", "CA") == "Canada"


def test_graph_includes_document_nodes_for_backlog_but_no_unreviewed_doc_tag_edges(tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-model", reviewed=False)

    graph = build_knowledge_graph(config.corpus_dir, config=config)

    assert {n["id"] for n in graph["nodes"]} == {"document:doc-model"}
    assert graph["edges"] == []


def test_graph_reviewed_doc_exports_document_tag_edges(tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-reviewed", reviewed=True)

    graph = build_knowledge_graph(config.corpus_dir, config=config)

    assert "attests_tactic" in _edge_types(graph)
    assert "mentions_country" in _edge_types(graph)
    assert any(n["id"] == "tactic:conspiracy-framing" for n in graph["nodes"])
    assert any(n["id"] == "function:disinformation-narrative" and n["label"] == "Disinformation-Narrative" for n in graph["nodes"])
    assert any(n["id"] == "harm:psychological" and n["label"] == "Psychological" for n in graph["nodes"])
    edge = next(e for e in graph["edges"] if e["type"] == "attests_tactic")
    assert edge["doc_id"] == "doc-reviewed"
    assert edge["source_artifact"] == "analysis.json"
    assert edge["review_status"] == "researcher_reviewed"
    assert edge["evidence_strength"] == "classification_tag"
    assert edge["edge_basis"] == "analysis_classification"


def test_include_proposed_adds_model_proposed_doc_tag_edges(tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-model", reviewed=False)

    graph = build_knowledge_graph(config.corpus_dir, config=config, include_proposed=True)

    assert "attests_tactic" in _edge_types(graph)
    edge = next(e for e in graph["edges"] if e["type"] == "attests_tactic")
    assert edge["provisional"] == "true"
    assert edge["review_status"] == "model_proposed"


def test_graph_exports_approved_enrichment_edges_by_default(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir, "doc-reviewed", reviewed=True)
    _write_enrichment(doc, approved=True)

    graph = build_knowledge_graph(config.corpus_dir, config=config)
    types = _edge_types(graph)

    assert "attests_entity" in types
    assert "partner" in types
    assert "has_key_individual" in types
    assert "attests_term" in types
    assert "synonym_of" in types
    assert "describes_practice" in types
    partner = next(e for e in graph["edges"] if e["type"] == "partner")
    assert partner["evidence_quote"] == "They co-signed the statement."
    assert partner["proposal_id"] == "ent-1"
    assert partner["confidence"] == "0.9"
    assert partner["evidence_strength"] == "quote_backed"
    assert partner["edge_basis"] == "enrichment_proposal"


def test_graph_excludes_pending_enrichment_edges_by_default_but_includes_when_requested(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir, "doc-reviewed", reviewed=True)
    _write_enrichment(doc, approved=False)

    default_graph = build_knowledge_graph(config.corpus_dir, config=config)
    proposed_graph = build_knowledge_graph(config.corpus_dir, config=config, include_proposed=True)

    assert "partner" not in _edge_types(default_graph)
    assert "partner" in _edge_types(proposed_graph)
    edge = next(e for e in proposed_graph["edges"] if e["type"] == "partner")
    assert edge["provisional"] == "true"
    assert edge["review_status"] == "pending"


def test_graph_skips_rejected_even_when_include_proposed(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir, "doc-reviewed", reviewed=True)
    _write_enrichment(doc, approved=True, rejected=True)

    graph = build_knowledge_graph(config.corpus_dir, config=config, include_proposed=True)

    assert "partner" not in _edge_types(graph)
    assert "attests_entity" not in _edge_types(graph)


def test_corpus_connections_require_retrieval_grounding(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir, "doc-reviewed", reviewed=True)
    _write_enrichment(doc, approved=True, corpus_grounded=False)

    graph = build_knowledge_graph(config.corpus_dir, config=config)
    assert "same_tactic" not in _edge_types(graph)

    _write_enrichment(doc, approved=True, corpus_grounded=True)
    graph = build_knowledge_graph(config.corpus_dir, config=config)
    assert "same_tactic" in _edge_types(graph)


def test_export_knowledge_graph_writes_csv_and_json(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir, "doc-reviewed", reviewed=True)
    _write_enrichment(doc, approved=True)

    result = export_knowledge_graph(config.corpus_dir, config.exports_dir, config=config)

    out = config.exports_dir / "knowledge"
    assert Path(result["nodes_path"]) == out / NODES_CSV
    assert Path(result["edges_path"]) == out / EDGES_CSV
    assert Path(result["graph_path"]) == out / GRAPH_JSON
    assert result["node_count"] > 0
    assert result["edge_count"] > 0
    with (out / EDGES_CSV).open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert rows
    assert {
        "source",
        "target",
        "type",
        "doc_id",
        "source_artifact",
        "evidence_strength",
        "edge_basis",
    } <= set(rows[0])
    graph = json.loads((out / GRAPH_JSON).read_text(encoding="utf-8"))
    assert graph["schema_version"] == "archive-graph-v1.0"


def test_graph_does_not_emit_local_source_as_source_url(tmp_path):
    config = _cfg(tmp_path)
    doc = _make_doc(config.corpus_dir, "doc-local", reviewed=True)
    _write_json(doc / "intake.json", {
        "source": "snapshot.html",
        "source_type": "html",
    })

    graph = build_knowledge_graph(config.corpus_dir, config=config)

    doc_node = next(node for node in graph["nodes"] if node["id"] == "document:doc-local")
    assert doc_node["source_url"] == ""
    assert all(edge["source_url"] == "" for edge in graph["edges"])


def test_knowledge_graph_cli_export(monkeypatch, tmp_path):
    config = _cfg(tmp_path)
    _make_doc(config.corpus_dir, "doc-reviewed", reviewed=True)
    monkeypatch.setattr("runner.main.load_config", lambda *a, **kw: config)

    result = CliRunner().invoke(app, ["knowledge-graph-export"])

    assert result.exit_code == 0, result.output
    assert "Knowledge graph exported" in result.output
    assert (config.exports_dir / "knowledge" / NODES_CSV).exists()
    assert (config.exports_dir / "knowledge" / EDGES_CSV).exists()
