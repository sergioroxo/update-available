from __future__ import annotations

import hashlib
from datetime import datetime, timezone

import pytest

from runner.models.retrieval import SourceUnitRowV1
from runner.pipeline.factory_semantic import DeterministicEmbeddingProvider
from runner.pipeline.retrieval import hybrid_retrieve
from runner.pipeline.retrieval_context import build_retrieval_query
from runner.pipeline.retrieval_index import RetrievalIndexError, build_retrieval_index


H = hashlib.sha256(b"policy").hexdigest()


def _row(doc, unit, family, stance, text):
    return SourceUnitRowV1(
        run_id="run-019", document_id=doc, unit_id=unit,
        source_family_id=family, stance=stance, language="en",
        canonical_text_sha256=hashlib.sha256((doc + text).encode()).hexdigest(),
        unit_text_sha256=hashlib.sha256(text.encode()).hexdigest(),
        char_start=0, char_end=len(text), text=text,
        source_artifact="extracted.txt", source_version="canonical-text-v2.0",
        provenance_kind="source_v2_unit",
    )


def _index(path):
    rows = (
        _row("doc-a", "unit-a", "family-a", "supporting", "Policy evidence government regulation."),
        _row("doc-b", "unit-b1", "family-b", "supporting", "Government policy evidence supports regulation."),
        _row("doc-b", "unit-b2", "family-b", "supporting", "A second policy passage from the same source."),
        _row("doc-b", "unit-b3", "family-b", "supporting", "A third policy passage from the same source."),
        _row("doc-c", "unit-c", "family-c", "opposed", "Contrary policy evidence disputes regulation."),
        _row("doc-d", "unit-d", "family-d", "neutral", "Survey methods and participant limitations."),
    )
    return build_retrieval_index(
        path, rows=rows, embedder=DeterministicEmbeddingProvider(),
        index_id="index-019", run_id="run-019",
        sealed_at=datetime(2026, 8, 20, tzinfo=timezone.utc),
        source_policy_snapshot_sha256=H,
    )[0]


def _query():
    return build_retrieval_query(
        query_id="query-a", requesting_document_id="doc-a",
        analysis_payload={"type": "Research", "summary": "Government policy regulation evidence."},
        source_metadata={"title": "Policy report", "language": "en"},
    )


def test_hybrid_retrieval_excludes_requester_caps_family_and_reserves_counterevidence(tmp_path):
    _index(tmp_path / "index")
    hits, exclusions = hybrid_retrieve(
        tmp_path / "index", query=_query(), embedder=DeterministicEmbeddingProvider(),
        limit=4, per_family_cap=1, contradiction_slots=1,
    )
    assert all(row.document_id != "doc-a" for row in hits)
    assert sum(row.source_family_id == "family-b" for row in hits) == 1
    assert any(row.stance == "opposed" for row in hits)
    assert any(row.reason == "requesting_document" for row in exclusions)
    assert any(row.reason == "family_cap" for row in exclusions)
    assert tuple(row.final_rank for row in hits) == tuple(range(1, len(hits) + 1))


def test_hybrid_retrieval_is_deterministic(tmp_path):
    _index(tmp_path / "index")
    first = hybrid_retrieve(
        tmp_path / "index", query=_query(), embedder=DeterministicEmbeddingProvider(),
        limit=5, per_family_cap=2, contradiction_slots=1,
    )
    second = hybrid_retrieve(
        tmp_path / "index", query=_query(), embedder=DeterministicEmbeddingProvider(),
        limit=5, per_family_cap=2, contradiction_slots=1,
    )
    assert first == second


class _BadQueryEmbedder:
    def embed(self, texts):
        return [[1.0] * 1024]


def test_query_embedding_dimension_cannot_cross_vector_spaces(tmp_path):
    _index(tmp_path / "index")
    with pytest.raises(RetrievalIndexError, match="query_embedding"):
        hybrid_retrieve(
            tmp_path / "index", query=_query(), embedder=_BadQueryEmbedder(),
        )


def test_retrieval_budget_contracts_fail_closed(tmp_path):
    _index(tmp_path / "index")
    with pytest.raises(ValueError, match="limit"):
        hybrid_retrieve(
            tmp_path / "index", query=_query(), embedder=DeterministicEmbeddingProvider(),
            limit=0,
        )
    with pytest.raises(ValueError, match="family"):
        hybrid_retrieve(
            tmp_path / "index", query=_query(), embedder=DeterministicEmbeddingProvider(),
            limit=2, per_family_cap=3,
        )
