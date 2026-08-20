"""Immutable source-only FTS5 plus exact-vector retrieval index."""
from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Protocol, Sequence

import numpy as np
from pydantic import TypeAdapter

from runner.models.retrieval import (
    EMBEDDING_DIMENSION,
    RetrievalIndexManifestV1,
    SourceUnitRowV1,
    UnitEmbeddingRecordV1,
    UnitSizeDistributionV1,
    canonical_contract_bytes,
    canonical_contract_sha256,
)
from runner.pipeline.atomic_io import atomic_write_bytes


DATABASE_FILENAME = "retrieval.sqlite"
VECTORS_FILENAME = "vectors.npy"
RECORDS_FILENAME = "embedding_records.json"
MANIFEST_FILENAME = "index_manifest.json"
READY_FILENAME = "index.ready.json"


class RetrievalIndexError(ValueError):
    """Content-free index build or verification failure."""


class EmbeddingBatchProvider(Protocol):
    def embed(self, texts: Sequence[str]) -> Sequence[Sequence[float]]: ...


def _sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _distribution(rows: Sequence[SourceUnitRowV1]) -> UnitSizeDistributionV1:
    sizes = sorted(len(row.text) for row in rows)
    percentile = lambda fraction: sizes[max(0, math.ceil(len(sizes) * fraction) - 1)]
    return UnitSizeDistributionV1(
        minimum=sizes[0], maximum=sizes[-1], p50=percentile(0.5),
        p95=percentile(0.95), total=sum(sizes),
    )


def _normalise_vectors(values: Sequence[Sequence[float]], expected: int) -> np.ndarray:
    array = np.asarray(values, dtype=np.float32)
    if array.shape != (expected, EMBEDDING_DIMENSION):
        raise RetrievalIndexError("embedding_dimension_or_row_count_mismatch")
    if not np.isfinite(array).all():
        raise RetrievalIndexError("embedding_contains_non_finite_value")
    norms = np.linalg.norm(array, axis=1)
    if np.any(norms <= 0):
        raise RetrievalIndexError("embedding_zero_norm")
    return np.asarray(array / norms[:, None], dtype=np.float32)


def _write_database(path: Path, rows: Sequence[SourceUnitRowV1]) -> None:
    connection = sqlite3.connect(path)
    try:
        connection.execute("PRAGMA journal_mode=DELETE")
        connection.execute("PRAGMA synchronous=FULL")
        connection.executescript("""
            CREATE TABLE units (
                vector_index INTEGER PRIMARY KEY,
                document_id TEXT NOT NULL,
                unit_id TEXT NOT NULL,
                source_family_id TEXT NOT NULL,
                stance TEXT NOT NULL,
                language TEXT NOT NULL,
                canonical_text_sha256 TEXT NOT NULL,
                unit_text_sha256 TEXT NOT NULL,
                char_start INTEGER NOT NULL,
                char_end INTEGER NOT NULL,
                text TEXT NOT NULL,
                source_artifact TEXT NOT NULL,
                source_version TEXT NOT NULL,
                provenance_kind TEXT NOT NULL CHECK(provenance_kind='source_v2_unit'),
                UNIQUE(document_id, unit_id)
            );
            CREATE VIRTUAL TABLE unit_fts USING fts5(
                row_key UNINDEXED, text, tokenize='unicode61 remove_diacritics 2'
            );
        """)
        for index, row in enumerate(rows):
            connection.execute(
                "INSERT INTO units VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    index, row.document_id, row.unit_id, row.source_family_id,
                    row.stance, row.language, row.canonical_text_sha256,
                    row.unit_text_sha256, row.char_start, row.char_end, row.text,
                    row.source_artifact, row.source_version, row.provenance_kind,
                ),
            )
            connection.execute(
                "INSERT INTO unit_fts(row_key,text) VALUES(?,?)",
                (str(index), row.text),
            )
        connection.commit()
        if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RetrievalIndexError("sqlite_integrity_check_failed")
        connection.execute("VACUUM")
    finally:
        connection.close()


def _build_records(
    rows: Sequence[SourceUnitRowV1], *, produced_at: datetime,
) -> tuple[UnitEmbeddingRecordV1, ...]:
    records = []
    for index, row in enumerate(rows):
        draft = UnitEmbeddingRecordV1.model_construct(
            schema_version="unit-embedding-record-v1.0", run_id=row.run_id,
            document_id=row.document_id, unit_id=row.unit_id,
            unit_text_sha256=row.unit_text_sha256,
            embedding_model_requested="research-embedding",
            embedding_model_resolved="qwen3-embedding:8b", dimension=4096,
            numeric_storage="float32", normalized=True, vector_index=index,
            produced_at=produced_at, record_sha256="0" * 64,
        )
        records.append(UnitEmbeddingRecordV1.model_validate({
            **draft.model_dump(mode="python"),
            "record_sha256": canonical_contract_sha256(draft, omit={"record_sha256"}),
        }))
    return tuple(records)


def build_retrieval_index(
    directory: Path, *, rows: Sequence[SourceUnitRowV1],
    embedder: EmbeddingBatchProvider, index_id: str, run_id: str,
    sealed_at: datetime, source_policy_snapshot_sha256: str,
    testimony_policy_version: str = "testimony-retrieval-policy-v1.0",
    build_host_id: str = "synthetic",
) -> tuple[RetrievalIndexManifestV1, bool]:
    """Build and atomically publish an immutable index.

    Returns ``(manifest, reused)``. Existing complete identical identities are
    verified and reused; incomplete or contradictory occupied paths fail.
    """
    directory = Path(directory)
    if directory.exists():
        manifest = verify_retrieval_index(directory)
        if manifest.index_id != index_id or manifest.run_id != run_id:
            raise RetrievalIndexError("occupied_index_identity_mismatch")
        return manifest, True
    if not rows:
        raise RetrievalIndexError("source_index_cannot_be_empty")
    validated = tuple(SourceUnitRowV1.model_validate(row) for row in rows)
    ordered = tuple(sorted(validated, key=lambda row: (row.document_id, row.unit_id)))
    if any(row.run_id != run_id for row in ordered):
        raise RetrievalIndexError("source_unit_run_mismatch")
    identities = [(row.document_id, row.unit_id) for row in ordered]
    if len(set(identities)) != len(identities):
        raise RetrievalIndexError("duplicate_source_unit_identity")

    parent = directory.parent
    parent.mkdir(parents=True, exist_ok=True)
    temporary = parent / f".{directory.name}.partial-{uuid.uuid4().hex}"
    temporary.mkdir()
    try:
        vectors = _normalise_vectors(embedder.embed([row.text for row in ordered]), len(ordered))
        vector_path = temporary / VECTORS_FILENAME
        with vector_path.open("wb") as handle:
            np.save(handle, vectors, allow_pickle=False)
            handle.flush()
            os.fsync(handle.fileno())
        database_path = temporary / DATABASE_FILENAME
        _write_database(database_path, ordered)
        records = _build_records(ordered, produced_at=sealed_at)
        records_bytes = json.dumps(
            [row.model_dump(mode="json") for row in records],
            sort_keys=True, ensure_ascii=False, separators=(",", ":"),
        ).encode()
        atomic_write_bytes(temporary / RECORDS_FILENAME, records_bytes)
        values = dict(
            schema_version="retrieval-index-manifest-v1.1", index_id=index_id,
            run_id=run_id, build_host_id=build_host_id,
            unit_schema_version="citation-units-v2.0",
            embedding_model_requested="research-embedding",
            embedding_model_resolved="qwen3-embedding:8b",
            embedding_dimension=4096, numeric_storage="float32",
            unit_count=len(ordered),
            document_count=len({row.document_id for row in ordered}),
            source_policy_snapshot_sha256=source_policy_snapshot_sha256,
            testimony_policy_version=testimony_policy_version,
            database_sha256=_sha(database_path), vectors_sha256=_sha(vector_path),
            embedding_records_sha256=hashlib.sha256(records_bytes).hexdigest(),
            analysis_rows_rejected=0, unit_size_distribution=_distribution(ordered),
            sqlite_integrity_check="ok",
            exact_backend_version="sqlite-fts5-numpy-cosine-v1.0",
            sealed_at=sealed_at, restore_test_status="passed",
            manifest_sha256="0" * 64,
        )
        draft = RetrievalIndexManifestV1.model_construct(**values)
        values["manifest_sha256"] = canonical_contract_sha256(
            draft, omit={"manifest_sha256"},
        )
        manifest = RetrievalIndexManifestV1.model_validate(values)
        atomic_write_bytes(temporary / MANIFEST_FILENAME, canonical_contract_bytes(manifest))
        ready = json.dumps(
            {"schema_version": "retrieval-index-ready-v1.0", "index_id": index_id,
             "manifest_sha256": manifest.manifest_sha256},
            sort_keys=True, separators=(",", ":"),
        ).encode()
        atomic_write_bytes(temporary / READY_FILENAME, ready)
        verify_retrieval_index(temporary)
        os.replace(temporary, directory)
        return manifest, False
    except Exception:
        shutil.rmtree(temporary, ignore_errors=True)
        raise


def verify_retrieval_index(directory: Path) -> RetrievalIndexManifestV1:
    directory = Path(directory)
    required = {
        DATABASE_FILENAME, VECTORS_FILENAME, RECORDS_FILENAME,
        MANIFEST_FILENAME, READY_FILENAME,
    }
    if not directory.is_dir() or {row.name for row in directory.iterdir()} != required:
        raise RetrievalIndexError("retrieval_index_incomplete_or_contains_extra_files")
    manifest = RetrievalIndexManifestV1.model_validate_json(
        (directory / MANIFEST_FILENAME).read_bytes()
    )
    ready = json.loads((directory / READY_FILENAME).read_text(encoding="utf-8"))
    if ready != {
        "index_id": manifest.index_id,
        "manifest_sha256": manifest.manifest_sha256,
        "schema_version": "retrieval-index-ready-v1.0",
    }:
        raise RetrievalIndexError("retrieval_index_ready_marker_mismatch")
    if _sha(directory / DATABASE_FILENAME) != manifest.database_sha256:
        raise RetrievalIndexError("retrieval_index_database_hash_mismatch")
    if _sha(directory / VECTORS_FILENAME) != manifest.vectors_sha256:
        raise RetrievalIndexError("retrieval_index_vector_hash_mismatch")
    records_bytes = (directory / RECORDS_FILENAME).read_bytes()
    if hashlib.sha256(records_bytes).hexdigest() != manifest.embedding_records_sha256:
        raise RetrievalIndexError("retrieval_index_record_hash_mismatch")
    records = TypeAdapter(tuple[UnitEmbeddingRecordV1, ...]).validate_json(records_bytes)
    if len(records) != manifest.unit_count:
        raise RetrievalIndexError("retrieval_index_record_count_mismatch")
    vectors = np.load(directory / VECTORS_FILENAME, allow_pickle=False)
    if vectors.shape != (manifest.unit_count, EMBEDDING_DIMENSION) or vectors.dtype != np.float32:
        raise RetrievalIndexError("retrieval_index_vector_contract_mismatch")
    connection = sqlite3.connect(directory / DATABASE_FILENAME)
    try:
        if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RetrievalIndexError("retrieval_index_sqlite_integrity_failed")
        count = int(connection.execute("SELECT COUNT(*) FROM units").fetchone()[0])
        forbidden = int(connection.execute(
            "SELECT COUNT(*) FROM units WHERE provenance_kind!='source_v2_unit'"
        ).fetchone()[0])
        if count != manifest.unit_count or forbidden:
            raise RetrievalIndexError("retrieval_index_source_row_contract_mismatch")
    finally:
        connection.close()
    return manifest


def validate_bge_m3_shadow_vectors(vectors: Sequence[Sequence[float]]) -> np.ndarray:
    """Validate a separate shadow lane without allowing it into the Qwen index."""
    array = np.asarray(vectors, dtype=np.float32)
    if array.ndim != 2 or array.shape[1] != 1024:
        raise RetrievalIndexError("bge_m3_shadow_dimension_mismatch")
    if not np.isfinite(array).all():
        raise RetrievalIndexError("bge_m3_shadow_non_finite_value")
    return array
