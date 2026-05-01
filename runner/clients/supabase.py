"""
Supabase client wrapper.

Handles upserts to the document_embeddings table.
The vector column dimension must match qwen3-embedding:4b output (Q22 = 2560d).
"""
from __future__ import annotations

from ..config import Config
from ..models.document import AnalysisResult


def _client(config: Config):
    from supabase import create_client
    return create_client(config.supabase_url, config.supabase_service_key)


def upsert_embedding(
    doc_id: str,
    vector: list[float],
    analysis: AnalysisResult,
    config: Config,
) -> None:
    """Insert or update a row in document_embeddings.
    Only doc_id + embedding are written — the table exists purely for vector
    similarity search. All classification metadata lives in Sanity."""
    client = _client(config)
    client.table("document_embeddings").upsert({
        "doc_id":    doc_id,
        "embedding": vector,
    }).execute()


def insert_null_row(doc_id: str, config: Config) -> None:
    """Create a null-vector placeholder row at intake time (Phase 0-B requirement)."""
    client = _client(config)
    client.table("document_embeddings").upsert({
        "doc_id":    doc_id,
        "embedding": None,
    }).execute()
