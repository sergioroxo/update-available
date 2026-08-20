from __future__ import annotations

import hashlib
from datetime import datetime, timezone

import numpy as np
import pytest
from pydantic import ValidationError

from runner.models.retrieval import SourceUnitRowV1
from runner.pipeline.factory_semantic import DeterministicEmbeddingProvider
from runner.pipeline.retrieval_index import (
    RetrievalIndexError,
    build_retrieval_index,
    validate_bge_m3_shadow_vectors,
    verify_retrieval_index,
)


NOW = datetime(2026, 8, 20, 12, 0, tzinfo=timezone.utc)
H = hashlib.sha256(b"policy").hexdigest()


def _rows():
    values = []
    texts = (
        ("doc-a", "family-a", "supporting", "Policy evidence and a legal proposal."),
        ("doc-b", "family-b", "neutral", "Survey methods and participant limitations."),
        ("doc-c", "family-c", "opposed", "Contrary evidence disputes the policy claim."),
    )
    for index, (doc, family, stance, text) in enumerate(texts):
        values.append(SourceUnitRowV1(
            run_id="run-019", document_id=doc, unit_id=f"unit-{index}",
            source_family_id=family, stance=stance, language="en",
            canonical_text_sha256=hashlib.sha256((doc + text).encode()).hexdigest(),
            unit_text_sha256=hashlib.sha256(text.encode()).hexdigest(),
            char_start=0, char_end=len(text), text=text,
            source_artifact="extracted.txt", source_version="canonical-text-v2.0",
            provenance_kind="source_v2_unit",
        ))
    return tuple(values)


def _build(path, embedder=None):
    return build_retrieval_index(
        path, rows=_rows(), embedder=embedder or DeterministicEmbeddingProvider(),
        index_id="index-019", run_id="run-019", sealed_at=NOW,
        source_policy_snapshot_sha256=H,
    )


def test_index_build_verify_and_idempotent_reuse(tmp_path):
    manifest, reused = _build(tmp_path / "index")
    assert not reused
    assert manifest.embedding_dimension == 4096
    assert manifest.unit_count == 3
    assert verify_retrieval_index(tmp_path / "index") == manifest
    second, reused = _build(tmp_path / "index")
    assert reused and second == manifest


def test_same_inputs_produce_same_manifest_identity(tmp_path):
    first, _ = _build(tmp_path / "one")
    second, _ = _build(tmp_path / "two")
    assert first.manifest_sha256 == second.manifest_sha256
    assert first.database_sha256 == second.database_sha256
    assert first.vectors_sha256 == second.vectors_sha256


def test_generated_analysis_row_is_structurally_rejected():
    payload = _rows()[0].model_dump(mode="python")
    payload["provenance_kind"] = "analysis_generated"
    with pytest.raises(ValidationError):
        SourceUnitRowV1.model_validate(payload)


class _WrongDimension:
    def embed(self, texts):
        return [[0.1] * 1024 for _ in texts]


def test_qwen_index_rejects_bge_dimension_and_shadow_lane_is_separate(tmp_path):
    with pytest.raises(RetrievalIndexError, match="dimension"):
        _build(tmp_path / "bad", _WrongDimension())
    shadow = validate_bge_m3_shadow_vectors([[0.1] * 1024])
    assert shadow.shape == (1, 1024)
    with pytest.raises(RetrievalIndexError, match="dimension"):
        validate_bge_m3_shadow_vectors([[0.1] * 4096])


def test_vector_tamper_and_incomplete_publication_are_rejected(tmp_path):
    _build(tmp_path / "index")
    path = tmp_path / "index" / "vectors.npy"
    data = bytearray(path.read_bytes())
    data[-1] ^= 1
    path.write_bytes(data)
    with pytest.raises(RetrievalIndexError, match="vector_hash"):
        verify_retrieval_index(tmp_path / "index")

    incomplete = tmp_path / "incomplete"
    incomplete.mkdir()
    (incomplete / "index_manifest.json").write_text("{}")
    with pytest.raises(RetrievalIndexError, match="incomplete"):
        verify_retrieval_index(incomplete)


def test_unknown_fields_and_bad_text_hash_fail_contract():
    payload = _rows()[0].model_dump(mode="python")
    payload["unknown"] = True
    with pytest.raises(ValidationError):
        SourceUnitRowV1.model_validate(payload)
    payload.pop("unknown")
    payload["unit_text_sha256"] = "0" * 64
    with pytest.raises(ValidationError, match="text hash"):
        SourceUnitRowV1.model_validate(payload)
