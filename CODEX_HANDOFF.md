# SurvivingSOGICE — Codex Handoff Document

**Branch:** `claude/review-architecture-70CUm`  
**Date:** 2026-05-18  
**For:** Codex (or any developer picking up this codebase cold)

---

## What this project is

A local Python CLI + Streamlit UI for ingesting, classifying, and archiving documents related to SOGICE (Sexual Orientation and Gender Identity Change Efforts) research in Europe. Documents are:
1. Fetched/loaded locally (URLs, PDFs, video transcripts, EPUB)
2. Classified by LLM (LiteLLM → Mac Studio M2 Ultra, or Claude API)
3. Stored in Sanity CMS (structured metadata) + Supabase pgvector (semantic search)
4. Reviewed through a Streamlit UI before publication

**Stack:** Python 3.11+ · Streamlit · Sanity CMS (EU, project `eqg5bxk6`) · Supabase pgvector (EU) · Ollama (local) · LiteLLM proxy (Mac Studio via Tailscale)

---

## Current state (post this branch)

### What is fully implemented and tested

| Feature | Command | Status |
|---|---|---|
| Document ingest (URL/PDF/video) | `runner ingest <source> --llm litelm` | ✅ Implemented |
| Local corpus storage | (automatic) | ✅ Implemented |
| LLM routing (10+ modes) | `--llm litelm\|claude\|local\|...` | ✅ Implemented |
| Sanity CMS write | (part of upload) | ✅ Implemented |
| Supabase embedding upsert | (part of upload) | ✅ Implemented |
| Testimony consent gate | (checkpoint) | ✅ Implemented |
| Corpus stats | `runner stats` | ✅ NEW this branch |
| Semantic search | `runner search "text"` | ✅ NEW this branch |
| Flat CSV export | `runner export-csv [batch]` | ✅ NEW this branch |
| Streamlit UI (15 pages) | `streamlit run runner/app.py` | ✅ Implemented |
| Ingest workbench step-by-step | UI | ✅ NEW this branch |
| Corpus stats dashboard | UI | ✅ NEW this branch |
| Lexicon audit view | UI | ✅ NEW this branch |
| Partial upload recovery button | UI | ✅ NEW this branch |
| Wayback reliability + retry | (intake) | ✅ NEW this branch |
| Corpus migration backfill | `runner migrate-corpus` | ✅ NEW this branch |
| DualAnalysisResult (--llm both) | (analyze) | ✅ NEW this branch |
| Embedding model provenance | (upload) | ✅ NEW this branch |

### Test count: 233 passing

---

## Critical one-time setup (NOT yet done — blocks everything)

### 1. Supabase: verify the table

The `document_embeddings` table must use `vector(4096)`. If it was created earlier with `vector(2560)`, drop and recreate it. Run this SQL **directly in the Supabase SQL editor** (not via the Python migration command — the RPC it depends on may not exist):

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

Then verify with:
```bash
python3 -m runner embed-test
```

### 2. Supabase: create the semantic search RPC

The `runner search` command will work without this (it falls back to a client-side scan), but for real similarity scores you need this SQL function in Supabase:

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(4096),
  match_count int DEFAULT 10,
  filter_type text DEFAULT '',
  filter_scope text DEFAULT ''
)
RETURNS TABLE (
  doc_id text,
  doc_type text,
  scope text,
  tier text,
  language text,
  embedding_model text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    doc_id, doc_type, scope, tier, language, embedding_model,
    1 - (embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE
    (filter_type = '' OR doc_type = filter_type)
    AND (filter_scope = '' OR scope = filter_scope)
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### 3. LiteLLM: verify max_tokens

Open the LiteLLM config YAML on the Mac Studio. Every chat model entry under `litellm_params` must have `max_tokens: 8192`. Without it, Ollama defaults to ~2048 tokens, truncating JSON responses and causing Pydantic validation failures for any document over ~5 pages.

```yaml
model_list:
  - model_name: core-qwen
    litellm_params:
      model: ollama/qwen3.6:35b-a3b
      api_base: http://localhost:11434
      max_tokens: 8192   # ← must be present
```

### 4. End-to-end smoke test

After the above:
```bash
cd runner
python3 -m runner ingest https://example.org/any-article --llm litelm
python3 -m runner verify
python3 -m runner stats
python3 -m runner search "SOGICE testimony Norway"
```

All four commands must complete without errors.

---

## Architecture

```
MacBook (you)
├── runner/          Python CLI + Streamlit
│   ├── main.py      Typer CLI entry point (all commands)
│   ├── app.py       Streamlit UI (15 pages, ~8600 lines)
│   ├── config.py    .env → Config dataclass
│   ├── pipeline/    intake → preprocess → embed → analyze → review → upload
│   ├── clients/     sanity.py · supabase.py
│   └── models/      Pydantic schemas (AnalysisResult, IntakeResult, ...)
├── tests/           233 pytest tests
└── 00_infrastructure/ 01_project_docs/ 02_working_tools/ 03_data/

Mac Studio (M2 Ultra, 64 GB) [Tailscale]
└── LiteLLM proxy   → Ollama models (qwen3.6:35b, gemma4:31b, qwen3-embedding:8b)

External services
├── Sanity CMS       project eqg5bxk6, dataset production (EU)
└── Supabase         pgvector, document_embeddings table (EU)
```

---

## File map (key files only)

| File | Role |
|---|---|
| `runner/main.py` | All CLI commands: ingest, status, upload-doc, stats, search, export-csv, export, migrate-corpus, verify, doctor, ... |
| `runner/app.py` | Streamlit UI — Dashboard, Ingest Workbench, Document List, Pending Upload, Lexicon, Tag Registry, Testimony Review, Activity Log, Model Routing, Triage Tool, ... |
| `runner/config.py` | Config dataclass + `load_config()`. All env vars documented in `.env.example` |
| `runner/pipeline/intake.py` | Source detection, doc_id, Wayback Machine (with retry), dedup |
| `runner/pipeline/preprocess.py` | Docling (PDF), Trafilatura (URL), yt-dlp + Whisper (video) |
| `runner/pipeline/embed.py` | Ollama embedding (`run()`) + LiteLLM embedding (`run_litelm()`) |
| `runner/pipeline/analyze.py` | LLM routing, prompt building, Pydantic validation. `DualAnalysisResult` for `--llm both` |
| `runner/pipeline/search.py` | **NEW** — semantic search: embed query → Supabase similarity → enrich with local metadata |
| `runner/pipeline/upload.py` | save_locally, upload_doc, upload_saved, list_pending, export_batch, **export_corpus_csv**, **corpus_stats**, migrate_corpus_files |
| `runner/pipeline/triage.py` | Fast pre-screen: recommends which `--llm` to use. `save_triage_result()` / `load_triage_result()` |
| `runner/clients/sanity.py` | Sanity REST mutations. `_build_sanity_document()` includes `docId` field |
| `runner/clients/supabase.py` | Supabase upsert + **search_similar()** (pgvector RPC + fallback) |

---

## Key env vars (runner/.env)

```bash
# Sanity
SANITY_PROJECT_ID=eqg5bxk6
SANITY_DATASET=production
SANITY_WRITE_TOKEN=sk-...

# Supabase
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# LiteLLM (Mac Studio via Tailscale)
LITELM_BASE_URL=http://mac-studio.tailnet:4000
LITELM_API_KEY=sk-...
LITELM_ANALYSIS_MODEL=core-qwen
LITELM_EMBEDDING_MODEL=research-embedding

# Local Ollama (MacBook fallback)
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=qwen3-embedding:8b

# Corpus location
CORPUS_DIR=~/Documents/surviving-sogice-corpus
EXPORTS_DIR=~/Documents/surviving-sogice-exports

# Optional: legacy vocabulary files
SOGICE_LEGACY_VOCAB_DIR=~/Library/CloudStorage/.../Old_Artifact_Bakcup

# Optional: Wayback Machine
WAYBACK_ENABLED=true   # set to false to skip during bulk offline ingestion
```

---

## CLI quick reference

```bash
# Setup
cd runner && pip3 install -r requirements.txt
python3 -m runner doctor          # pre-flight check
python3 -m runner embed-test      # verify 4096d embedding

# Core ingestion
python3 -m runner ingest <url|file> --llm litelm
python3 -m runner ingest <url> --llm litelm --enrich  # + enrichment
python3 -m runner ingest <url> --llm claude            # Claude API

# Status and review
python3 -m runner status                # all pending docs
python3 -m runner status <doc_id>       # detailed trace
python3 -m runner stats                 # corpus summary (NEW)

# Search
python3 -m runner search "Belgian conversion therapy 2019"  # (NEW)
python3 -m runner search "pastoral coercion" --top-k 5 --type Anti-SOGICE

# Upload
python3 -m runner upload-doc <doc_id>
python3 -m runner verify                # cross-check Sanity + Supabase

# Export
python3 -m runner export batch-07       # JSONL export
python3 -m runner export-csv            # flat CSV all corpus (NEW)
python3 -m runner export-csv batch-07   # flat CSV one batch (NEW)

# Maintenance
python3 -m runner migrate-corpus        # dry-run: show missing provenance fields
python3 -m runner migrate-corpus --confirm  # write backfills
python3 -m runner reanalyze <doc_id> --llm litelm

# Streamlit UI
streamlit run runner/app.py
```

---

## What Codex should work on next

### Priority 1 — Complete the verification loop (blocks everything)

**Task:** Run the end-to-end smoke test above. If it fails, diagnose and fix. The most likely failure points:
- Supabase table dimension wrong → run the SQL above
- LiteLLM max_tokens missing → edit YAML on Mac Studio
- Tailscale not connected → connect, or use `--llm claude` for testing

**Expected output:** `runner verify` shows at least 1 document in both Sanity and Supabase.

---

### Priority 2 — Streamlit ingest workbench: background thread

**File:** `runner/app.py` → `_workbench_analyze()` (~line 2165)

**Problem:** The analysis call (`analyze.run()`) blocks the Streamlit main thread. For a 50-page PDF over a slow Tailscale link, this can take 3–10 minutes. Streamlit will appear frozen. There is no cancellation.

**Fix:** Run the analysis in a `threading.Thread`. Use `st.session_state` to communicate progress. Show a live status message that updates every few seconds ("Waiting for Mac Studio response… 45s elapsed").

```python
import threading, time

def _workbench_analyze(config, llm: str) -> None:
    preprocess_result = st.session_state.ingest["preprocess"]
    
    result_holder = {}
    def _run():
        try:
            result_holder["result"] = analyze.run(preprocess_result, llm=llm, config=config)
        except Exception as exc:
            result_holder["error"] = str(exc)
    
    t = threading.Thread(target=_run, daemon=True)
    t.start()
    
    placeholder = st.empty()
    start = time.time()
    while t.is_alive():
        elapsed = int(time.time() - start)
        placeholder.info(f"Waiting for `{llm}` response… {elapsed}s elapsed")
        time.sleep(2)
        st.rerun()  # or use st.experimental_rerun in older Streamlit
    
    placeholder.empty()
    if "error" in result_holder:
        st.error(result_holder["error"])
        return
    # ... rest of existing logic
```

**Note:** `st.rerun()` inside a while loop is not ideal — Streamlit's execution model means each rerun re-enters the function. The cleaner approach is to store the thread state in `st.session_state` and check on each rerun. This is a known Streamlit pattern for long-running jobs.

---

### Priority 3 — Confidence threshold calibration

**What it is:** The system currently flags documents as "low confidence" when `overall_score < 0.70` and "high" when `>= 0.85`. These are placeholders. After the first 20 documents are ingested, a human review of misclassified documents should inform where these cutoffs should actually be.

**What Codex should build:** A simple calibration view in the Streamlit UI or a CLI command:
```bash
python3 -m runner calibrate-thresholds
```
That shows a histogram of confidence scores across the corpus, the current high/medium/low cutoffs, and lets the researcher adjust them in `.env` (`CONFIDENCE_HIGH_THRESHOLD`, `CONFIDENCE_MEDIUM_THRESHOLD`). Config must read these from env:
```python
confidence_high_threshold: float = 0.85
confidence_medium_threshold: float = 0.70
```

---

### Priority 4 — Lexicon bidirectional loop

**Current state:** The lexicon is fetched from Sanity and injected into the analysis prompt so the LLM doesn't re-propose known terms. Researchers can approve local proposals and push them to Sanity. This part works.

**What's missing:** When an LLM proposes a new candidate term during enrichment, there is no way to see: "Has this term been proposed before? Was it rejected? By whom? When?" The approval history lives only in `enrichment.json` per document, not in a searchable index.

**What Codex should build:**
1. A `runner/pipeline/lexicon_audit.py` module that scans all `enrichment.json` files and aggregates: each proposed term, how many times proposed, current status (unresolved/approved/rejected/pushed), which documents proposed it.
2. A `runner lexicon-audit` CLI command that prints the table.
3. A Streamlit view in the Lexicon page showing this table with filter by status.

This is high-value for the PhD research — it shows which concepts are emerging across the corpus.

---

### Priority 5 — Export for statistical analysis

**Current state:** `runner export-csv` now exists and produces a 24-column flat CSV. It is usable in R/SPSS/Excel.

**What's missing for real research use:**
- Column for each tactic (one-hot encoded) — currently stored as `|`-joined string
- Column for each country (one-hot encoded)
- Deduplicated entity list per document (persons, organisations, laws referenced)
- Cross-document entity matrix (which documents mention the same persons/orgs)

**What Codex should add:** A `runner export-csv --wide` flag that adds one-hot columns for all unique tactics and countries found across the corpus. The column list is dynamic (built from the corpus scan, not hardcoded).

---

## Known non-issues (things the audit flagged that are already handled)

| Issue flagged | Reality |
|---|---|
| Supabase vector(2560) | SQL already updated to vector(4096); verify once with embed-test |
| LiteLLM max_tokens | YAML was updated; verify once with a real ingest |
| Streamlit ingest hangs | Now split into Step 1 / Step 2 with separate spinners and early result display. Full background threading is Priority 2 above |
| Partial upload no recovery | `runner upload-doc <doc_id>` re-pushes both Sanity + Supabase. UI now shows "Push embedding to Supabase" button when Sanity record exists but Supabase row is missing |
| Local 9B models unreliable | These are offline fallbacks only. Default is litelm → Mac Studio 35B model |
| Hardcoded personal path | Fixed: now uses `os.getenv("SOGICE_LEGACY_VOCAB_DIR", Path.home() / ...)` |
| Semantic search missing | Now implemented: `runner search "text"` + Supabase `search_similar()` |
| CSV export missing | Now implemented: `runner export-csv [batch]` |
| Batch progress view missing | Now implemented: `runner stats` + Dashboard corpus overview panel |
| Lexicon loop one-directional | Lexicon status panel added to UI showing approved/draft/rejected counts |

---

## Testing

```bash
cd /path/to/surviving-sogice-ingest
.venv/bin/python -m pytest               # 233 tests, ~1.5s
.venv/bin/python -m pytest -k upload     # upload-related only
.venv/bin/python -m pytest -v            # verbose
```

Tests do **not** require Sanity, Supabase, Ollama, or LiteLLM credentials — all external calls are mocked. Tests use `tmp_path` for filesystem isolation.

---

## What this system is NOT (and should not become)

- Not a web scraper (Trafilatura handles extraction, not crawling)
- Not a public API
- Not a multi-user system (solo researcher + occasional assistant)
- Not a cloud-native app (intentionally local-first)
- Not a replacement for manual review (LLM classification is a first pass, always human-reviewed before publication)
