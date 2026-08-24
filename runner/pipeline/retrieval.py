"""Deterministic hybrid retrieval over one verified frozen source index."""
from __future__ import annotations

import re
import sqlite3
from pathlib import Path
from typing import Sequence

import numpy as np

from runner.models.retrieval import (
    EMBEDDING_DIMENSION,
    RetrievalExclusionV1,
    RetrievalHitV1,
    RetrievalQueryV1,
)
from runner.pipeline.retrieval_index import (
    DATABASE_FILENAME,
    VECTORS_FILENAME,
    EmbeddingBatchProvider,
    RetrievalIndexError,
    verify_retrieval_index,
)


RRF_K = 60


def _fts_expression(components: Sequence[str]) -> str:
    tokens = []
    for component in components:
        tokens.extend(re.findall(r"[^\W_]+", component, flags=re.UNICODE))
    unique = list(dict.fromkeys(token.casefold() for token in tokens if len(token) > 1))
    return " OR ".join(f'"{token.replace(chr(34), chr(34) * 2)}"' for token in unique[:100])


def _query_vector(embedder: EmbeddingBatchProvider, query: RetrievalQueryV1) -> np.ndarray:
    values = np.asarray(embedder.embed(["\n".join(query.components)]), dtype=np.float32)
    if values.shape != (1, EMBEDDING_DIMENSION) or not np.isfinite(values).all():
        raise RetrievalIndexError("retrieval_query_embedding_contract_mismatch")
    norm = float(np.linalg.norm(values[0]))
    if norm <= 0:
        raise RetrievalIndexError("retrieval_query_embedding_zero_norm")
    return values[0] / norm


def hybrid_retrieve(
    directory: Path, *, query: RetrievalQueryV1,
    embedder: EmbeddingBatchProvider, limit: int = 20,
    per_family_cap: int = 3, contradiction_slots: int = 2,
    exclude_requesting_document: bool = True,
    allow_single_document_fallback: bool = False,
) -> tuple[tuple[RetrievalHitV1, ...], tuple[RetrievalExclusionV1, ...]]:
    if limit < 1 or limit > 100:
        raise ValueError("retrieval result limit is invalid")
    if per_family_cap < 1 or per_family_cap > limit:
        raise ValueError("retrieval family cap is invalid")
    if contradiction_slots < 0 or contradiction_slots > limit:
        raise ValueError("retrieval contradiction budget is invalid")
    manifest = verify_retrieval_index(directory)
    vectors = np.load(Path(directory) / VECTORS_FILENAME, allow_pickle=False)
    vector_scores = vectors @ _query_vector(embedder, query)
    vector_order = np.argsort(-vector_scores, kind="stable")[: max(limit * 5, 50)]

    connection = sqlite3.connect(Path(directory) / DATABASE_FILENAME)
    connection.row_factory = sqlite3.Row
    try:
        rows = {
            int(row["vector_index"]): dict(row)
            for row in connection.execute("SELECT * FROM units ORDER BY vector_index")
        }
        lexical: list[tuple[int, float]] = []
        expression = _fts_expression(query.components)
        if expression:
            for row in connection.execute(
                "SELECT row_key,bm25(unit_fts) AS score FROM unit_fts "
                "WHERE unit_fts MATCH ? ORDER BY score,row_key LIMIT ?",
                (expression, max(limit * 5, 50)),
            ):
                lexical.append((int(row["row_key"]), float(row["score"])))
    finally:
        connection.close()

    candidates: dict[int, dict] = {}
    for rank, vector_index in enumerate(vector_order.tolist(), start=1):
        candidates.setdefault(vector_index, {})["vector_rank"] = rank
        candidates[vector_index]["vector_score"] = float(vector_scores[vector_index])
    for rank, (vector_index, score) in enumerate(lexical, start=1):
        candidates.setdefault(vector_index, {})["lexical_rank"] = rank
        candidates[vector_index]["lexical_score"] = score
    for value in candidates.values():
        value["fused_score"] = sum(
            1.0 / (RRF_K + value[key])
            for key in ("vector_rank", "lexical_rank") if key in value
        )
    ordered = sorted(
        candidates.items(),
        key=lambda item: (-item[1]["fused_score"], rows[item[0]]["document_id"], rows[item[0]]["unit_id"]),
    )

    excluded: list[RetrievalExclusionV1] = []
    eligible: list[tuple[int, dict]] = []
    for vector_index, scores in ordered:
        row = rows[vector_index]
        if exclude_requesting_document and row["document_id"] == query.requesting_document_id:
            excluded.append(RetrievalExclusionV1(
                document_id=row["document_id"], reason="requesting_document",
            ))
            continue
        eligible.append((vector_index, scores))

    fallback_used = False
    if (
        not eligible
        and exclude_requesting_document
        and allow_single_document_fallback
    ):
        indexed_documents = {row["document_id"] for row in rows.values()}
        if (
            manifest.document_count == 1
            and indexed_documents == {query.requesting_document_id}
        ):
            eligible = [
                (vector_index, scores)
                for vector_index, scores in ordered
                if rows[vector_index]["provenance_kind"] == "source_v2_unit"
                and rows[vector_index]["document_id"] == query.requesting_document_id
            ]
            fallback_used = bool(eligible)

    selected: list[tuple[int, dict]] = []
    family_counts: dict[str, int] = {}
    effective_contradiction_slots = 0 if fallback_used else contradiction_slots
    opposed = [item for item in eligible if rows[item[0]]["stance"] == "opposed"]
    for item in opposed[:effective_contradiction_slots]:
        family = rows[item[0]]["source_family_id"]
        if family_counts.get(family, 0) < per_family_cap:
            selected.append(item)
            family_counts[family] = family_counts.get(family, 0) + 1
    for item in eligible:
        if item in selected or len(selected) >= limit:
            continue
        family = rows[item[0]]["source_family_id"]
        if family_counts.get(family, 0) >= per_family_cap:
            excluded.append(RetrievalExclusionV1(
                document_id=rows[item[0]]["document_id"], reason="family_cap",
            ))
            continue
        selected.append(item)
        family_counts[family] = family_counts.get(family, 0) + 1
    selected.sort(key=lambda item: (
        -item[1]["fused_score"], rows[item[0]]["document_id"], rows[item[0]]["unit_id"],
    ))
    hits = []
    for final_rank, (vector_index, scores) in enumerate(selected, start=1):
        row = rows[vector_index]
        hits.append(RetrievalHitV1(
            index_id=manifest.index_id, document_id=row["document_id"],
            unit_id=row["unit_id"], source_family_id=row["source_family_id"],
            stance=("unknown" if fallback_used else row["stance"]),
            language=row["language"],
            char_start=row["char_start"], char_end=row["char_end"], text=row["text"],
            unit_text_sha256=row["unit_text_sha256"],
            vector_rank=scores.get("vector_rank"), lexical_rank=scores.get("lexical_rank"),
            vector_score=scores.get("vector_score"), lexical_score=scores.get("lexical_score"),
            fused_score=scores["fused_score"], final_rank=final_rank,
        ))
    if not hits:
        raise RetrievalIndexError("retrieval_returned_no_eligible_source_units")
    deduped_exclusions = tuple({
        (row.document_id, row.reason): row for row in excluded
    }[key] for key in sorted({(row.document_id, row.reason) for row in excluded}))
    return tuple(hits), deduped_exclusions
