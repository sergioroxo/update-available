"""DS-2: first-class directional network edges.

Covers:
  - NetworkConnection.attested_in_doc field existence and default
  - Normalizer stamps attested_in_doc from doc_id kwarg
  - Normalizer preserves existing attested_in_doc (e.g. from merged runs)
  - Normalizer falls back connection_type to "partner" for unknown values
  - Full EnrichmentResult round-trip preserves attested_in_doc
  - export_network_edges() produces correct flat edge list
  - export_network_edges(approved_only=True) filters unapproved proposals
  - export_network_edges() skips rejected proposals
  - export_network_edges() returns empty list for empty corpus
  - export_network_edges() skips proposals with no network connections
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner.models.enrichment import NetworkConnection, EntityProposal, EnrichmentResult
from runner.pipeline.enrich import _normalize_enrichment_payload
from runner.pipeline.upload import export_network_edges


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_config(tmp_path: Path):
    class _Cfg:
        def __init__(self, corpus_dir: Path, exports_dir: Path) -> None:
            self.corpus_dir = corpus_dir
            self.exports_dir = exports_dir

    exports = tmp_path / "exports"
    exports.mkdir()
    return _Cfg(corpus_dir=tmp_path / "corpus", exports_dir=exports)


def _write_enrichment(corpus_dir: Path, doc_id: str, entity_proposals: list[dict]) -> None:
    """Write a minimal enrichment.json for a doc."""
    doc_dir = corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    enrichment = {
        "doc_id": doc_id,
        "lexicon_proposals": [],
        "entity_proposals": entity_proposals,
        "tactic_proposals": [],
        "ingestion_queue": [],
        "corpus_connections": [],
        "practice_descriptions": [],
        "statistical_claims": [],
    }
    (doc_dir / "enrichment.json").write_text(json.dumps(enrichment), encoding="utf-8")


def _minimal_entity_proposal(**kwargs) -> dict:
    base = {
        "action": "add_new",
        "entity_type": "organization",
        "name": "Alliance Defending Freedom",
        "approved": True,
        "rejected": False,
        "pushed_to_sanity": False,
        "network_connections": [],
    }
    base.update(kwargs)
    return base


def _connection(**kwargs) -> dict:
    base = {
        "entity_name": "Focus on the Family",
        "connection_type": "partner",
        "evidence_quote": "ADF and FOTF co-organised the summit.",
    }
    base.update(kwargs)
    return base


def _payload_with_connection(**conn_kwargs) -> dict:
    return {
        "lexicon_proposals": [],
        "entity_proposals": [
            {
                "action": "add_new",
                "entity_type": "organization",
                "name": "Alliance Defending Freedom",
                "network_connections": [_connection(**conn_kwargs)],
            }
        ],
        "tactic_proposals": [],
        "ingestion_queue": [],
        "corpus_connections": [],
        "practice_descriptions": [],
        "statistical_claims": [],
    }


# ---------------------------------------------------------------------------
# Model field tests
# ---------------------------------------------------------------------------

def test_network_connection_attested_in_doc_default():
    conn = NetworkConnection(entity_name="FOTF", connection_type="partner")
    assert conn.attested_in_doc == ""


def test_network_connection_attested_in_doc_set():
    conn = NetworkConnection(
        entity_name="FOTF", connection_type="partner", attested_in_doc="abc12345"
    )
    assert conn.attested_in_doc == "abc12345"


def test_network_connection_round_trip_preserves_attested_in_doc():
    import json as _json
    conn = NetworkConnection(
        entity_name="FOTF", connection_type="funds", attested_in_doc="doc-xyz"
    )
    dumped = _json.loads(conn.model_dump_json())
    assert dumped["attested_in_doc"] == "doc-xyz"


# ---------------------------------------------------------------------------
# Normalizer tests
# ---------------------------------------------------------------------------

def test_normalizer_stamps_attested_in_doc_from_doc_id():
    payload = _payload_with_connection()
    normalized, _ = _normalize_enrichment_payload(payload, doc_id="testdoc1")
    conn = normalized["entity_proposals"][0]["network_connections"][0]
    assert conn["attested_in_doc"] == "testdoc1"


def test_normalizer_preserves_existing_attested_in_doc():
    """If a connection already has attested_in_doc (e.g. merged run), don't overwrite."""
    payload = _payload_with_connection(attested_in_doc="original-doc")
    normalized, _ = _normalize_enrichment_payload(payload, doc_id="new-doc")
    conn = normalized["entity_proposals"][0]["network_connections"][0]
    assert conn["attested_in_doc"] == "original-doc"


def test_normalizer_no_doc_id_leaves_attested_empty():
    payload = _payload_with_connection()
    normalized, _ = _normalize_enrichment_payload(payload)  # no doc_id kwarg
    conn = normalized["entity_proposals"][0]["network_connections"][0]
    assert conn["attested_in_doc"] == ""


def test_normalizer_unknown_connection_type_falls_back_to_partner():
    payload = _payload_with_connection(connection_type="heavily_funds")
    normalized, repair_count = _normalize_enrichment_payload(payload, doc_id="d1")
    conn = normalized["entity_proposals"][0]["network_connections"][0]
    assert conn["connection_type"] == "partner"
    assert repair_count >= 1


def test_enrichment_result_round_trip_preserves_attested_in_doc():
    result = EnrichmentResult.model_validate({
        "doc_id": "doc-test",
        "entity_proposals": [
            {
                "action": "add_new",
                "entity_type": "organization",
                "name": "ADF",
                "network_connections": [
                    {
                        "entity_name": "FOTF",
                        "connection_type": "partner",
                        "attested_in_doc": "doc-test",
                    }
                ],
            }
        ],
    })
    assert result.entity_proposals[0].network_connections[0].attested_in_doc == "doc-test"
    reloaded = EnrichmentResult.model_validate(
        json.loads(result.model_dump_json())
    )
    assert reloaded.entity_proposals[0].network_connections[0].attested_in_doc == "doc-test"


# ---------------------------------------------------------------------------
# export_network_edges tests
# ---------------------------------------------------------------------------

def test_export_network_edges_empty_corpus(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    assert export_network_edges(config) == []


def test_export_network_edges_no_enrichment_files(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    # doc dir with no enrichment.json
    (config.corpus_dir / "doc-aaa").mkdir()
    assert export_network_edges(config) == []


def test_export_network_edges_produces_correct_row(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    _write_enrichment(config.corpus_dir, "doc-001", [
        _minimal_entity_proposal(
            name="ADF Europe",
            entity_type="organization",
            model_confidence=0.85,
            network_connections=[{
                "entity_name": "FOTF",
                "connection_type": "partner",
                "evidence_quote": "They co-signed the statement.",
                "attested_in_doc": "doc-001",
            }],
        )
    ])

    edges = export_network_edges(config)

    assert len(edges) == 1
    e = edges[0]
    assert e["source_entity"] == "ADF Europe"
    assert e["source_entity_type"] == "organization"
    assert e["target_entity"] == "FOTF"
    assert e["connection_type"] == "partner"
    assert e["evidence_quote"] == "They co-signed the statement."
    assert e["attested_in_doc"] == "doc-001"
    assert e["model_confidence"] == 0.85
    assert e["entity_approved"] is True
    assert e["entity_pushed_to_sanity"] is False


def test_export_network_edges_falls_back_to_enrichment_doc_id(tmp_path):
    """Older enrichment.json files lack per-edge attested_in_doc; export still keeps provenance."""
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    _write_enrichment(config.corpus_dir, "doc-legacy", [
        _minimal_entity_proposal(
            name="Legacy Org",
            network_connections=[_connection(entity_name="Legacy Target")],
        )
    ])

    edges = export_network_edges(config)

    assert len(edges) == 1
    assert edges[0]["attested_in_doc"] == "doc-legacy"


def test_export_network_edges_approved_only_filters(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    _write_enrichment(config.corpus_dir, "doc-002", [
        _minimal_entity_proposal(
            name="Approved Org", approved=True,
            network_connections=[_connection(entity_name="Target A")],
        ),
        _minimal_entity_proposal(
            name="Unapproved Org", approved=False,
            network_connections=[_connection(entity_name="Target B")],
        ),
    ])

    edges = export_network_edges(config, approved_only=True)
    targets = {e["target_entity"] for e in edges}
    assert "Target A" in targets
    assert "Target B" not in targets


def test_export_network_edges_approved_only_false_includes_all(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    _write_enrichment(config.corpus_dir, "doc-003", [
        _minimal_entity_proposal(
            name="Approved Org", approved=True,
            network_connections=[_connection(entity_name="Target A")],
        ),
        _minimal_entity_proposal(
            name="Unapproved Org", approved=False,
            network_connections=[_connection(entity_name="Target B")],
        ),
    ])

    edges = export_network_edges(config, approved_only=False)
    targets = {e["target_entity"] for e in edges}
    assert "Target A" in targets
    assert "Target B" in targets


def test_export_network_edges_skips_rejected(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    _write_enrichment(config.corpus_dir, "doc-004", [
        _minimal_entity_proposal(
            name="Rejected Org", approved=True, rejected=True,
            network_connections=[_connection(entity_name="Should Be Excluded")],
        ),
    ])

    edges = export_network_edges(config, approved_only=False)
    assert edges == []


def test_export_network_edges_skips_empty_connections(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    _write_enrichment(config.corpus_dir, "doc-005", [
        _minimal_entity_proposal(name="Org With No Connections", network_connections=[]),
    ])

    edges = export_network_edges(config)
    assert edges == []


def test_export_network_edges_multiple_docs(tmp_path):
    config = _make_config(tmp_path)
    config.corpus_dir.mkdir()
    _write_enrichment(config.corpus_dir, "doc-a", [
        _minimal_entity_proposal(
            name="Org A",
            network_connections=[_connection(entity_name="Partner X", attested_in_doc="doc-a")],
        ),
    ])
    _write_enrichment(config.corpus_dir, "doc-b", [
        _minimal_entity_proposal(
            name="Org B",
            network_connections=[_connection(entity_name="Partner Y", attested_in_doc="doc-b")],
        ),
    ])

    edges = export_network_edges(config)
    assert len(edges) == 2
    sources = {e["source_entity"] for e in edges}
    assert sources == {"Org A", "Org B"}
