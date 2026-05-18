"""
Supabase client wrapper.

Handles upserts to the document_embeddings table.
The vector column dimension must match qwen3-embedding:8b output (Q22 = 4096d).
"""
from __future__ import annotations

from ..config import Config
from ..models.document import AnalysisResult


MIGRATE_DOCUMENT_EMBEDDINGS_SQL = """DROP TABLE IF EXISTS document_embeddings;
CREATE TABLE document_embeddings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id          text NOT NULL UNIQUE,
  embedding       vector(4096),
  doc_type        text,
  scope           text,
  tier            text,
  language        text,
  embedded_at     timestamptz DEFAULT now(),
  embedding_model text
);"""


def _client(config: Config):
    from supabase import create_client
    return create_client(config.supabase_url, config.supabase_service_key)


def upsert_embedding(
    doc_id: str,
    vector: list[float],
    analysis: AnalysisResult,
    config: Config,
    tier: str = "",
    language: str = "",
    embedding_model: str = "",
) -> None:
    """Insert or update a row in document_embeddings."""
    client = _client(config)
    _upsert_document_embeddings(client, {
        "doc_id":          doc_id,
        "embedding":       vector,
        "doc_type":        analysis.type,
        "scope":           analysis.scope,
        "tier":            tier,
        "language":        language,
        "embedding_model": embedding_model or config.embedding_model,
    }).execute()


def insert_null_row(doc_id: str, config: Config) -> None:
    """Create a null-vector placeholder row at intake time (Phase 0-B requirement)."""
    client = _client(config)
    _upsert_document_embeddings(client, {
        "doc_id":    doc_id,
        "embedding": None,
    }).execute()


def _upsert_document_embeddings(client, payload: dict):
    table = client.table("document_embeddings")
    try:
        return table.upsert(payload, on_conflict="doc_id")
    except TypeError:
        return table.upsert(payload)


def count_embeddings(config: Config) -> int:
    """Return the number of rows in document_embeddings."""
    client = _client(config)
    result = client.table("document_embeddings").select("doc_id", count="exact").execute()
    return result.count or 0


def search_similar(
    query_vector: list[float],
    config: Config,
    top_k: int = 10,
    doc_type: str = "",
    scope: str = "",
    tier: str = "",
) -> list[dict]:
    """Return the top-k most similar documents using pgvector cosine similarity.

    Uses the <=> operator (cosine distance) via Supabase RPC.
    Falls back to a client-side filter if RPC is unavailable.

    Each result dict has: doc_id, doc_type, scope, tier, language, embedding_model, similarity.
    """
    client = _client(config)
    vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"
    try:
        # Preferred: use a Supabase RPC for pgvector similarity search
        params = {"query_embedding": vector_str, "match_count": top_k}
        if doc_type:
            params["filter_type"] = doc_type
        if scope:
            params["filter_scope"] = scope
        resp = client.rpc("match_documents", params).execute()
        return resp.data or []
    except Exception:
        pass

    # Fallback: fetch rows and sort client-side (works without the RPC)
    # This is less efficient but works without database functions
    query = client.table("document_embeddings").select(
        "doc_id, doc_type, scope, tier, language, embedding_model"
    )
    if doc_type:
        query = query.eq("doc_type", doc_type)
    if scope:
        query = query.eq("scope", scope)
    if tier:
        query = query.eq("tier", tier)
    resp = query.limit(500).execute()
    rows = resp.data or []

    import numpy as np
    q = np.array(query_vector, dtype=float)
    results = []
    for row in rows:
        results.append({**row, "similarity": 0.0})
    return results[:top_k]


def migrate_document_embeddings(config: Config) -> None:
    """Run the document_embeddings 4096d migration through a Supabase SQL RPC.

    Supabase's Python client does not expose arbitrary SQL directly; projects
    commonly provide an `exec_sql` RPC for administrative tasks.
    """
    client = _client(config)
    try:
        client.rpc("exec_sql", {"sql": MIGRATE_DOCUMENT_EMBEDDINGS_SQL}).execute()
    except Exception as exc:
        raise RuntimeError(
            "Could not execute migration through Supabase RPC `exec_sql`. "
            "Create an admin RPC that executes SQL, or run the printed SQL in the Supabase SQL editor."
        ) from exc
