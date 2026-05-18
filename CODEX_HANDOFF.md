# SurvivingSOGICE — Codex Handoff Document

**Branch:** `claude/review-architecture-70CUm`  
**Last verified:** 2026-05-18  
**Status legend:** ✅ verified locally · ⚙️ must be configured once · 🔌 requires external service · ❓ not verifiable without live service

---

## What this project is

A local Python CLI + Streamlit UI for ingesting, classifying, and archiving documents about SOGICE (Sexual Orientation and Gender Identity Change Efforts). Documents are:
1. Fetched/loaded locally (URLs, PDFs, video transcripts, EPUB)
2. Classified by LLM (LiteLLM → Mac Studio M2 Ultra, or Claude API)
3. Stored in Sanity CMS (structured metadata) + Supabase pgvector (semantic search)
4. Reviewed through a Streamlit UI before publication

**Stack:** Python 3.11+ · Streamlit · Sanity CMS (`eqg5bxk6`, EU) · Supabase pgvector (EU) · Ollama (local MacBook) · LiteLLM proxy (Mac Studio M2 Ultra via Tailscale)

---

## Verified working (run and confirmed this session)

| Check | Command | Result |
|---|---|---|
| ✅ Test suite | `.venv/bin/python -m pytest` | 233 passed |
| ✅ Local Ollama embedding | `python -c "from runner.pipeline.embed import _call; ..."` | 4096d confirmed |
| ✅ Corpus stats CLI | `runner stats` | 7 docs, 7 uploaded, all high confidence |
| ✅ CSV export | `runner export-csv --out /tmp/sogice-test-export.csv` | 7 rows, correct columns |
| ✅ Semantic search (local) | `runner search "conversion therapy" --llm local` | Returns 3 results, fallback mode (no sim scores) |
| ✅ Dashboard stats | Code review | Single, non-duplicate stats block (fixed this session) |
| ✅ Ingest workbench | Code review | Step 1 / Step 2 split with intermediate JSON display |
| ✅ Push-embedding button | Code review | Fixed this session — was using wrong key (`supabase_state`), now uses `supabase_ok` |
| ✅ Lexicon status panel | Code review | Wired to `fetch_lexicon_terms(config)` with graceful fallback |

---

## Requires one-time configuration (not yet verified against live services)

### 1. Supabase: confirm table dimension ⚙️

The `document_embeddings` table must use `vector(4096)`. Verify in the Supabase SQL editor:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'document_embeddings';
```

If the `embedding` column shows `vector(2560)` or any dimension other than 4096, recreate it:

```sql
DROP TABLE IF EXISTS document_embeddings;
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
);
```

**Note:** The `runner migrate-supabase --confirm` CLI command attempts this via an `exec_sql` RPC that likely doesn't exist in a standard Supabase project. Run the SQL manually in the dashboard instead.

### 2. Supabase: semantic search RPC ⚙️ (needed for similarity scores)

`runner search` works without this — it uses a client-side fallback and returns results ranked by local metadata. The `sim` column shows `—` in fallback mode. For real cosine similarity scores, create this function in the Supabase SQL editor:

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(4096),
  match_count int DEFAULT 10,
  filter_type text DEFAULT '',
  filter_scope text DEFAULT ''
)
RETURNS TABLE (
  doc_id text, doc_type text, scope text, tier text,
  language text, embedding_model text, similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT doc_id, doc_type, scope, tier, language, embedding_model,
         1 - (embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE (filter_type = '' OR doc_type = filter_type)
    AND (filter_scope = '' OR scope = filter_scope)
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### 3. LiteLLM: verify max_tokens on Mac Studio ⚙️

Open the LiteLLM config YAML on the Mac Studio. Each chat model entry under `litellm_params` should have `max_tokens: 8192`. Without it, Ollama uses its default output limit, which may truncate large JSON responses and cause Pydantic validation failures on long documents.

```yaml
model_list:
  - model_name: core-qwen
    litellm_params:
      model: ollama/qwen3.6:35b-a3b
      api_base: http://localhost:11434
      max_tokens: 8192   # must be present
```

**Current status:** YAML was previously updated. Verify by ingesting one real document with `--llm litelm` and confirming the analysis JSON is complete (not truncated mid-field).

### 4. End-to-end smoke test 🔌

Run when Mac Studio is on Tailscale:
```bash
python3 -m runner embed-test            # should print "4096d"
python3 -m runner ingest https://example.org/any-article --llm litelm
python3 -m runner verify
python3 -m runner stats
python3 -m runner search "SOGICE testimony Norway"
```

---

## Known external-service state (current session)

| Service | Status | Notes |
|---|---|---|
| Local Ollama (MacBook) | ✅ Online | `qwen3-embedding:8b`, 4096d confirmed |
| LiteLLM / Mac Studio | 🔌 Returned 500 this session | Mac Studio may be sleeping or embedding model not loaded — not a code bug |
| Sanity CMS | ⚙️ Configured, not live-tested | Credentials in `.env` |
| Supabase | ⚙️ Configured, not live-tested | Table dimension unverified |

---

## Architecture

```
MacBook (you)
├── runner/          Python CLI + Streamlit
│   ├── main.py      Typer CLI entry point (~40 commands)
│   ├── app.py       Streamlit UI (15 pages, ~8600 lines)
│   ├── config.py    .env → Config dataclass
│   ├── pipeline/    intake → preprocess → embed → analyze → review → upload
│   │                search · triage · enrich · second_opinion · ...
│   ├── clients/     sanity.py · supabase.py
│   └── models/      Pydantic schemas
├── tests/           233 pytest tests (all pass, no external services needed)
└── 00_infrastructure/ 01_project_docs/ 02_working_tools/ 03_data/

Mac Studio (M2 Ultra, 64 GB) [Tailscale]
└── LiteLLM proxy → Ollama: qwen3.6:35b, gemma4:31b, qwen3-embedding:8b

External
├── Sanity CMS   project eqg5bxk6, dataset production (EU)
└── Supabase     pgvector, document_embeddings (EU)
```

---

## Key file map

| File | Role |
|---|---|
| `runner/main.py` | All CLI commands: ingest, status, stats, search, export-csv, export, upload-doc, verify, doctor, migrate-corpus, ... |
| `runner/app.py` | Streamlit UI — Dashboard, Ingest Workbench, Document List, Pending Upload, Lexicon, Tag Registry, Testimony Review, Activity Log, ... |
| `runner/config.py` | Config dataclass + `load_config()` |
| `runner/pipeline/intake.py` | Source detection, doc_id, Wayback (3× retry), dedup |
| `runner/pipeline/analyze.py` | LLM routing. `DualAnalysisResult` for `--llm both` |
| `runner/pipeline/search.py` | `search_corpus()` — embed query → Supabase similarity → enrich from local files |
| `runner/pipeline/upload.py` | save_locally, upload_doc, upload_saved, list_pending, export_batch, export_corpus_csv, corpus_stats, migrate_corpus_files |
| `runner/clients/sanity.py` | Sanity REST mutations. Documents include `docId` field for reliable cross-checking |
| `runner/clients/supabase.py` | Upsert + `search_similar()` (RPC first, fallback to client-side scan) |

---

## CLI quick reference

```bash
# Setup
cd runner && pip3 install -r requirements.txt
python3 -m runner doctor          # pre-flight check
python3 -m runner embed-test      # verify 4096d embedding

# Ingestion
python3 -m runner ingest <url|file> --llm litelm
python3 -m runner ingest <url> --llm litelm --enrich

# Status
python3 -m runner status                   # pending docs list
python3 -m runner status <doc_id>          # detailed trace
python3 -m runner stats                    # corpus summary

# Search
python3 -m runner search "SOGICE testimony Norway"
python3 -m runner search "conversion therapy" --top-k 5 --type Anti-SOGICE
# Add --llm local if Mac Studio is offline

# Upload
python3 -m runner upload-doc <doc_id>
python3 -m runner verify

# Export
python3 -m runner export-csv               # all docs, flat CSV
python3 -m runner export-csv batch-07      # one batch
python3 -m runner export batch-07          # JSONL (richer, for scripting)

# Maintenance
python3 -m runner migrate-corpus           # dry-run: show missing provenance
python3 -m runner migrate-corpus --confirm # write backfills
python3 -m runner reanalyze <doc_id> --llm litelm

# Streamlit
streamlit run runner/app.py
```

---

## What Codex should work on next

### Priority 1 — End-to-end smoke test

Verify one complete round-trip: `runner ingest <url> --llm litelm` → check `runner verify` shows the document in both Sanity and Supabase. This has never been confirmed. Prerequisite: Mac Studio on Tailscale + Supabase table dimension confirmed.

Expected time: 2–4 hours including any fixes.

---

### Priority 2 — Streamlit ingest: background thread

**File:** `runner/app.py` → `_workbench_analyze()` (line ~2165)

Analysis runs in-process inside `st.spinner()`. For a slow Tailscale link or large PDF, the browser will appear frozen for minutes with no progress feedback. The fix is to move the `analyze.run()` call into a `threading.Thread`, storing progress in `st.session_state`, and showing elapsed time.

Pattern:
```python
import threading, time

def _workbench_analyze(config, llm: str) -> None:
    state_key = f"_analyze_thread_{id(config)}"
    result_key = f"_analyze_result_{id(config)}"
    
    if state_key not in st.session_state:
        # Start thread
        def _run():
            try:
                st.session_state[result_key] = {"result": analyze.run(...)}
            except Exception as e:
                st.session_state[result_key] = {"error": str(e)}
        st.session_state[state_key] = {"thread": threading.Thread(target=_run, daemon=True), "start": time.time()}
        st.session_state[state_key]["thread"].start()
    
    thread_state = st.session_state[state_key]
    if thread_state["thread"].is_alive():
        elapsed = int(time.time() - thread_state["start"])
        st.info(f"Waiting for `{llm}` response… {elapsed}s")
        time.sleep(1)
        st.rerun()
    
    # Thread done — read result
    result_data = st.session_state.pop(result_key, {})
    st.session_state.pop(state_key, None)
    ...
```

---

### Priority 3 — Confidence threshold calibration

After the first 20+ documents are ingested: add `CONFIDENCE_HIGH_THRESHOLD` and `CONFIDENCE_MEDIUM_THRESHOLD` to config (defaults 0.85 / 0.70). Add a `runner calibrate` command that shows a histogram of scores across the corpus and the current cutoffs. Let the researcher adjust the values in `.env`.

---

### Priority 4 — Lexicon audit loop

When an LLM proposes a new term during enrichment, there is no way to see: "Has this term been proposed before? Was it rejected?" The approval history is scattered in per-document `enrichment.json` files.

Build `runner/pipeline/lexicon_audit.py` with `audit_proposals(config)` that scans all `enrichment.json` files and returns: each proposed term, how many documents proposed it, current status (unresolved/approved/rejected/pushed), which doc_ids proposed it. Add `runner lexicon-audit` CLI command and a Streamlit view in the Lexicon page.

---

### Priority 5 — CSV wide export (one-hot tactics/countries)

`runner export-csv` currently stores `tactic` and `country` as `|`-joined strings. For statistical analysis in R/SPSS, researchers need one-hot columns. Add `runner export-csv --wide` that adds binary columns `tactic_Pastoral-Coercion`, `tactic_False-Scientific-Authority`, etc., built dynamically from the corpus.

---

## What was actually fixed (not just flagged) this branch

| Item | Was | Is now |
|---|---|---|
| Dashboard double stats | Two overlapping stat rows | Single consolidated row |
| Push-embedding button | Used `supabase_state` key (never set) — button never appeared | Uses `supabase_ok` bool — correctly shown when Sanity uploaded but Supabase missing |
| Hardcoded personal OneDrive path | `/Users/sergiogalvaoroxo/Library/...` hardcoded | `os.getenv("SOGICE_LEGACY_VOCAB_DIR", Path.home() / ...)` |
| Semantic search | Not implemented | `runner search "text"` — local fallback works, RPC scores need Supabase setup |
| CSV export | Not implemented | `runner export-csv` — verified, 7 docs → 7 rows |
| Corpus stats CLI | Not implemented | `runner stats` — verified |
| Ingest workbench visibility | Single spinner for analysis + embedding | Step 1 / Step 2 with raw JSON visible after Step 1 |
| Lexicon status | No approval counts | Approved / Draft / Rejected metrics panel |
| `DualAnalysisResult` | `object.__setattr__` hack | Clean dataclass, fully typed |
| Wayback reliability | No retry on failure | 3× exponential backoff (2s/4s/8s) on transient errors |
| Embedding model provenance | Always wrote local model name | Writes correct model name based on llm mode used |
