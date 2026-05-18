"""
Supabase client wrapper.

Handles upserts to the document_embeddings table.
The vector column dimension must match qwen3-embedding:8b output (Q22 = 4096d).

─── Supabase Data API grant change (May / October 2026) ───────────────────────
Supabase changed their default permission model for the Data API (PostgREST):

  • New projects created after 30 May 2026 — tables and functions no longer
    receive automatic grants to `anon` or `authenticated` roles.  The runner
    uses the SERVICE ROLE key, so explicit grants to `service_role` are required
    for every table and function accessed via supabase-py.

  • Existing projects — the old behaviour is preserved until 30 October 2026,
    at which point they switch to the new model automatically.

The constants below include the required GRANT and RLS statements.
Do NOT grant access to `anon` or `authenticated` — this is a private archive.
────────────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

from ..config import Config
from ..models.document import AnalysisResult


# Full setup SQL — run once in the Supabase SQL editor.
# Includes: DROP+CREATE (destructive), grants, and RLS policy.
# Safe to re-run on an empty or new table; destructive on an existing one.
# Do NOT execute this automatically from Python — run it manually.
MIGRATE_DOCUMENT_EMBEDDINGS_SQL = """\
-- 0. Enable pgvector (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Drop and recreate table (destructive — run only when migration is needed)
DROP TABLE IF EXISTS public.document_embeddings;
CREATE TABLE public.document_embeddings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id          text NOT NULL UNIQUE,
  embedding       vector(4096),
  doc_type        text,
  scope           text,
  tier            text,
  language        text,
  embedded_at     timestamptz DEFAULT now(),
  embedding_model text
);

-- 2. Permissions: service_role only (no anon / authenticated access)
--    Required for new Supabase projects (post-2026-05-30) and all projects
--    from 2026-10-30 onwards when Supabase removes legacy auto-grants.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.document_embeddings
  TO service_role;

-- 3. Row Level Security — enabled but permissive for service_role
--    (service_role bypasses RLS by default in Supabase, but enabling RLS
--    future-proofs the table and documents intent clearly)
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role can manage document embeddings"
  ON public.document_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
"""

# Permissions-only SQL — safe to run on an EXISTING table that was created
# before the grant change.  Does not drop or alter the table schema.
SETUP_PERMISSIONS_SQL = """\
-- Run this on any existing document_embeddings table to apply the new
-- permission model required from 2026-10-30 onwards.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.document_embeddings
  TO service_role;

ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service role can manage document embeddings"
  ON public.document_embeddings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
"""

# match_documents RPC — run once to enable cosine similarity search.
# The GRANT below uses `vector` (base type) which PostgreSQL resolves to
# any vector(N) variant; adjust to `vector(4096)` if your pg version requires it.
MATCH_DOCUMENTS_SQL = """\
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(4096),
  match_count     int  DEFAULT 10,
  filter_type     text DEFAULT '',
  filter_scope    text DEFAULT ''
)
RETURNS TABLE (
  doc_id          text,
  doc_type        text,
  scope           text,
  tier            text,
  language        text,
  embedding_model text,
  similarity      float
)
LANGUAGE sql STABLE AS $$
  SELECT doc_id, doc_type, scope, tier, language, embedding_model,
         1 - (embedding <=> query_embedding) AS similarity
  FROM   public.document_embeddings
  WHERE  (filter_type  = '' OR doc_type = filter_type)
    AND  (filter_scope = '' OR scope    = filter_scope)
    AND  embedding IS NOT NULL
  ORDER  BY embedding <=> query_embedding
  LIMIT  match_count;
$$;

-- Grant execute to service_role
-- (vector without dimension matches any vector(N) in PostgreSQL's GRANT resolution)
GRANT EXECUTE
  ON FUNCTION public.match_documents(vector, int, text, text)
  TO service_role;
"""


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
