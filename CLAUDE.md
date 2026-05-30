# SurvivingSOGICE — Session Context

PhD research archive studying SOGICE (Sexual Orientation and Gender Identity Change Efforts) in Europe. Ingests documents, classifies them with Claude, builds a living lexicon, and ultimately publishes a public archive. Stack: local Python runner → Sanity (source of truth) → Supabase (vectors) → Vercel (review/publish UI, deferred).

---

## Architecture (settled)

**Option 2: Local Python CLI + Streamlit UI.** All compute is local. The runner is in `runner/`. Sanity and Vercel roles are unchanged.

Key docs:
- `01_project_docs/ARCHITECTURE_LOCAL_RUNNER_v1.0.md` — architecture decision, role boundaries, model stack, checkpoints
- `01_project_docs/IMPLEMENTATION_PLAN_v1.0.md` — full phase plan (written for Vercel but phases 0-A/0-B/0-G and all prompt/schema tasks are still accurate)
- `02_working_tools/Claude_Ingestion_Prompt.md` — ingestion-v3.3 system prompt + exact JSON output schema
- `02_working_tools/ENRICHMENT_PROMPT_v1.0.md` — enrichment-v1.1 system prompt
- `00_infrastructure/SANITY_SCHEMA_v1.0.md` — all 12 Sanity content types
- `00_infrastructure/Entity_Registry_v1.1.md` — seed data for persons, orgs, laws, events

---

## Stage contracts

These define what each stage does. Do not collapse them.

Use the phrase **role-specialized staged intelligence** when describing the
architecture in documentation or methodology materials. Each AI stage has a
bounded role, typed output, audit trail, and human review gate. The system is
designed to be inspectable and protective for a solo researcher, not autonomous.

| Stage | Role | Lexicon context |
|---|---|---|
| **Triage (0.5)** | Routing intelligence: doc type, complexity, model, splitting needed, media/testimony/legal flags, overnight-batch safety | None (snippet only) |
| **Analysis (3b)** | Classification and summary: type, tactic, evidence, confidence, summary | Compact orientation lexicon -- validated + researcher-trusted draft terms, cap 200. Excludes unreviewed candidates. |
| **Enrichment (3c)** | Lexicon/registry intelligence: propose terms/entities/tactics/practices, connect to existing entries before proposing new | Full lexicon -- draft + validated + entity registry |
| **Human review** | Methodological layer: validate, reject, edit, preserve provenance | N/A -- researcher decides |

The pipeline proposes. The researcher decides. The archive records.

---

## Local Model Stack (MacBook Pro M4, 24 GB RAM)

### Embedding
| Task | Model | Notes |
|---|---|---|
| Embeddings (local) | `qwen3-embedding:8b` via Ollama | Pinned 8b — 4096d confirmed |
| Embeddings (remote) | `research-embedding` via LiteLLM | Same model on Mac Studio — used when `--llm litelm*` |

### Analysis — Mac Studio M2 Ultra 64 GB (**default for all ingestion**)

**`--llm litelm` is the default.** Claude API is used only on explicit request (`--llm claude`) or triage recommendation.

### Analysis — MacBook (fallback / offline only)

| Tier | Model | `--llm` flag | Use when |
|---|---|---|---|
| Fallback | `qwen3.5:9b` | `local` | Mac Studio offline / Tailscale unreachable |
| Heavy fallback | `gemma-4-26B-A4B-it` | `local-heavy` | Long docs offline (check RAM first — Q23) |
| Reasoning fallback | `Ministral-3-14B-Reasoning-2512` | `local-reasoning` | Ambiguous docs offline |
| Override only | Claude API (`claude-sonnet-4-6`) | `claude` | Tier 1 final classification on researcher request |

### Mac Studio via LiteLLM (preferred for all ingestion)

LiteLLM proxy at `LITELM_BASE_URL` (Tailscale). All `--llm litelm*` flags route here for both analysis AND embedding.

| Role | LiteLLM model name | Actual Ollama model | `--llm` flag |
|---|---|---|---|
| Default analysis | `core-qwen` | `qwen3.6:35b-a3b` (35B MoE, 3B active) | `litelm` |
| Heavy / long docs | `core-gemma` | `gemma4:31b-it` | `litelm-heavy` |
| Second opinion | `review-qwen` | `qwen3.6:27b` | `litelm-reasoning` |
| Second opinion (alt) | `review-gemma` | `gemma4:26b-a4b-it` | — |
| Fast triage | `triage` | `gemma4:e4b-it` | — |
| Enrichment (Stage 3c) | `lexicon-llm` | `qwen3.6:35b-a3b` | auto |
| Structured extraction | `coder` | `qwen3-coder:30b-a3b-instruct` | — |
| Embeddings | `research-embedding` | `qwen3-embedding:8b` | auto with `litelm*` |

**Mac Studio setup:** `01_project_docs/MAC_STUDIO_SERVER_SETUP.md`
**LiteLLM config fix required:** add `max_tokens: 8192` to each chat model's `litellm_params` — without it Ollama uses its default ~2048 token output limit, truncating JSON responses.

### Other tools
| Task | Tool | Runs on |
|---|---|---|
| Web scraping | Trafilatura | MacBook (HTTP fetch, no GPU needed) |
| PDF parsing | Docling | MacBook |
| Transcription | `faster-whisper` | MacBook (move to Mac Studio for long recordings) |
| OCR | Tesseract | MacBook |
| Phase 2 semantic map | UMAP + HDBSCAN + BERTopic | TBD |

---

## Open Questions

| # | Question | Blocks |
|---|---|---|
| ~~**Q22**~~ | ~~Verify `qwen3-embedding:8b` output dimension~~ — **RESOLVED: 4096d** | ~~Phase 0-B~~ unblocked |
| Q14 | JUST CHANGE™ ↔ i-Doc integration method | Phase 4 October build |
| Q18 | Testimony removal formal protocol | Phase 3 publication |
| Q23 | RAM usage of `gemma-4-26B-A4B-it` on M4 24 GB — test before setting as default for heavy docs | Phase 0.5 |
| ~~**Q-Lexicon**~~ | ~~Compact orientation lexicon selection mechanism~~ — **RESOLVED (TASK B):** `includeInAnalysisLexicon` boolean on `lexiconEntry` (default false). Analysis fetches `validated` + `draft && includeInAnalysisLexicon==true`. Researcher must toggle flag in Sanity Studio for trusted draft terms. | ~~TASK B~~ complete |
| ~~**Q-EnrichDefault**~~ | ~~Enrichment default pending~~ — **RESOLVED (TASK D):** Enrichment runs by default after confirmed upload (`--enrich/--no-enrich`, default True). Use `--no-enrich` for quick tests. | ~~TASK D~~ complete |
| **Q-BookSanity** | Should book sections create a new Sanity type (`sogiceBook`) or use `sogiceDocument` with `parentBook` reference field? New type is cleaner but changes the Sanity schema. Needs researcher sign-off. | `split-book` queue integration (after TASK G) |

**Q22 resolved (April 2026):** `qwen3-embedding:8b` output dimension = **4096d**
Use `vector(4096)` in Supabase. Drop and recreate the table if it was created with `vector(2560)`.

---

## Build Checklist

### Phase 0-A — Sanity Schema
- [x] Create Sanity project (EU/Norwegian region) — project ID `eqg5bxk6`, dataset `production`
- [x] Implement all 12 content types from `SANITY_SCHEMA_v1.0.md`
- [x] Add `accessibleDefinition` field to `lexiconEntry` type
- [x] Fix reserved type name: `document` → `sogiceDocument` across all schema files
- [ ] Configure researcher + intern roles
- [ ] Seed persons and organizations from `Entity_Registry_v1.1.md` (~15 persons, ~50 orgs)
- [ ] Seed laws and events (~12 laws, ~10 events)
- [ ] Seed `legalDefinition` records from `SOGICE_Ontology_v3.0.md` Part V (9 records)
- [ ] Seed `exclusionClause` records (6 records, linked to legalDefinitions)
- [ ] Test round-trip: create a document record, verify all fields persist
- [ ] Export seed JSON snapshot to `03_data/sanity_seed_YYYY-MM-DD.json`

### Phase 0-B — Supabase Schema
- [x] **Q22 resolved** — `qwen3-embedding:8b` = **4096d** → use `vector(4096)`
- [x] Create Supabase project (EU region)
- [x] Enable pgvector extension
- [ ] **Recreate `document_embeddings` table with `vector(4096)`** — drop old `vector(2560)` table first; use `CODEX_HANDOFF.md` §1 SQL (includes grants + RLS)
- [x] ~~Create ivfflat index~~ — **deferred to Phase 2** (sequential scan fine at pilot scale)
- [x] Add `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` to `runner/.env`
- [ ] **Run `python3 -m runner embed-test`** — verify Ollama is running + embedding dimension
- [ ] **Test full pipeline end-to-end** — ingest one URL → verify Sanity record + Supabase row created

> **Supabase Data API grant change (May / October 2026):** New projects created after 30 May 2026 require explicit `GRANT` to `service_role` — Supabase no longer auto-grants `anon`/`authenticated`. Existing projects are affected from 30 October 2026. The setup SQL in `runner/clients/supabase.py` (`MIGRATE_DOCUMENT_EMBEDDINGS_SQL`, `SETUP_PERMISSIONS_SQL`, `MATCH_DOCUMENTS_SQL`) and `CODEX_HANDOFF.md` §1–2 already include the required grants and RLS policy. We intentionally do **not** grant `anon` or `authenticated` — this is a private archive.

### MVP CLI Runner (`runner/`)
- [x] Project skeleton (`main.py`, `config.py`, `models/`, `pipeline/`, `clients/`)
- [x] Pydantic models for ingestion-v3.3 output schema (`models/document.py`)
- [x] `requirements.txt` + `.env.example`
- [x] **`pipeline/intake.py`** — URL/file detection, doc_id, Wayback Machine, deduplication check
- [x] **`pipeline/preprocess.py`** — Docling (PDF), Trafilatura (URL+full HTML intel), yt-dlp + faster-whisper (video)
- [x] **`pipeline/embed.py`** — Ollama qwen3-embedding:4b, legacy endpoint fallback
- [x] **`pipeline/analyze.py`** — Claude + Ollama + OpenRouter routing, lexicon injection, Pydantic validation
- [x] **`pipeline/review.py`** — Rich terminal checkpoints 1–4, edit-JSON with retry loop
- [x] **`pipeline/upload.py`** — Sanity REST write + Supabase insert + local save + audit log
- [x] **`clients/sanity.py`** — httpx Sanity Content API, referencedUrls builder
- [x] **`clients/supabase.py`** — supabase-py upsert
- [x] Configurable truncation (`--max-chars`, per-LLM defaults in `.env`)
- [x] OpenRouter LLM option (`--llm openrouter`)
- [x] Confidence score auto-derivation when LLM omits overall_score
- [x] Source deduplication warning before intake
- [x] **Three-tier local model routing** (`--llm local-heavy`, `--llm local-reasoning`, `--llm litelm*`)
- [x] Testimony consent gate (Checkpoint 3.5 + upload block)
- [x] Prompt caching for Claude API (static system prompt cached via `cache_control: ephemeral`)
- [x] `runner push-enrichment <doc_id>` — CLI push of approved enrichment proposals to Sanity
- [x] `runner queue [doc_id]` — show ingestion candidates from enrichment.json
- [x] `runner doctor` — pre-flight check before first ingest
- [x] `runner split-book <path_or_url> --preview` — preview PDF/book sections without ingesting (TASK E complete, commit `74a35f847`)
- [ ] **End-to-end test**: one URL ingested + uploaded to Sanity + Supabase ← **next milestone**

### Phase 0.5 — Pilot Batch
- [ ] Pull and verify local models: `ollama pull qwen3.5:9b` + `gemma-4-26B-A4B-it` (check RAM)
- [ ] Run 10–20 documents covering all 6 languages + all tiers
- [ ] Calibrate confidence thresholds (baseline: high ≥0.85, medium 0.70–0.84, low <0.70)
- [ ] Calibrate validation triggers
- [ ] Test lexicon Track B (approve ≥5 candidate terms)
- [ ] Test model-agnostic export + reimport
- [ ] Measure RAM/time for `gemma-4-26B-A4B-it` to settle Q23

### Phase 1 — Full Ingestion Pipeline
- [ ] Validation batch system
- [ ] Review queue (Streamlit or Vercel `/review/queue`)
- [ ] Lexicon Track B UI
- [ ] JSON export to GitHub per batch

### Streamlit Web UI (Phase 0.5 parallel)
- [x] `runner/app.py` — Dashboard, Ingest Workbench, Document List, Pending Upload, Lexicon, Tag Registry, Testimony Review, Activity Log, Model Routing, Triage Tool
- [x] Candidate term + entity approval forms (approve/reject from enrichment.json, push to Sanity)
- [x] JSON diff viewer (`--llm both` comparison via `_show_diff` in review.py + Streamlit)
- [ ] RAM / processing time monitor (resolves Q23)

### Deferred
- [ ] Vercel app (Phase 1–2)
- [ ] Phase 2: UMAP / HDBSCAN / BERTopic / pgvector activation
- [ ] Phase 3: Public archive + SOGICE Wikipedia
- [ ] Phase 4: JUST CHANGE™ + i-Doc

---

## Runner Quick Reference

```bash
# Install
cd runner && pip3 install -r requirements.txt
cp .env.example .env  # fill in API keys

# Pre-flight check — run this before first ingest
python3 -m runner doctor

# Verify Ollama embedding (do before first ingest)
python3 -m runner embed-test

# Ingest
python3 -m runner ingest https://example.org/document            # Claude (default quality)
python3 -m runner ingest https://example.org/document --llm local           # qwen3.5:9b
python3 -m runner ingest document.pdf --llm local-heavy          # gemma-4-26B heavy
python3 -m runner ingest ambiguous.pdf --llm local-reasoning     # Ministral reasoning
python3 -m runner ingest recording.mp4 --llm local-heavy         # long transcript
python3 -m runner ingest document.pdf --llm both                 # Claude + local, shows diff
python3 -m runner ingest https://example.org --llm openrouter    # free OpenRouter model

python3 -m runner status                    # show locally saved, not yet uploaded
python3 -m runner status <doc_id>           # detailed pipeline trace for one document
python3 -m runner upload-doc <doc_id>       # push a saved document to Sanity + Supabase
python3 -m runner export batch-07           # export batch JSON to exports/batch-07/
python3 -m runner reanalyze <doc_id>        # re-run Stage 3b analysis (archives previous analysis.json)
python3 -m runner reanalyze <doc_id> --llm claude --upload  # re-analyse + push to Sanity
python3 -m runner enrich <doc_id>           # Stage 3c enrichment on existing doc (lexicon + entities)
python3 -m runner push-enrichment <doc_id>  # push approved enrichment proposals to Sanity
python3 -m runner queue                     # show all ingestion candidates from enrichment results
python3 -m runner verify                    # check Sanity + Supabase records directly
python3 -m runner migrate-supabase --confirm  # recreate document_embeddings with vector(4096)

# Book splitting (preview only — no corpus changes)
python3 -m runner split-book book.pdf --preview           # extract + show sections
python3 -m runner split-book book.pdf --out sections.json # write section JSON

# Flags
python3 -m runner ingest <url> --triage     # Stage 0.5 pre-screen: recommends which --llm to use
python3 -m runner ingest <url> --no-enrich  # skip Stage 3c (enrichment runs by default)
python3 -m runner ingest <url> --llm both   # Claude + local, shows diff at Checkpoint 3

# Streamlit UI
cd runner && streamlit run app.py           # open at http://localhost:8501
```

---

## Known Issues / Gotchas

- **Sanity type name**: custom document schema is `sogiceDocument` (not `document` — Sanity built-in conflict)
- **Python on macOS**: use `python3` / `pip3`, not `python` (ships as Python 2.7)
- **Free OpenRouter models**: weaker on Pro/Anti-SOGICE classification — use `--llm claude` for Tier 1 docs or manually correct at Checkpoint 3 (`e` → edit JSON → change `type` field)
- **Ollama model names**: verify with `ollama list` before setting in `.env`; heavy models may require `--max-chars 0` for full context

---

## File Map

```
runner/
├── main.py               # Typer CLI entry point — all commands
├── config.py             # .env loading, Config dataclass
├── models/
│   ├── document.py       # Pydantic models for ingestion-v3.3 output schema
│   ├── enrichment.py     # EnrichmentResult, 7 proposal types
│   └── triage.py         # TriageResult schema
├── pipeline/
│   ├── intake.py         # Stage 1: source detection, doc_id, Wayback, dedup
│   ├── preprocess.py     # Stage 2: Docling / Trafilatura / yt-dlp / Whisper + HTML intel
│   ├── embed.py          # Stage 3a: qwen3-embedding:8b via Ollama
│   ├── analyze.py        # Stage 3b: Claude / Ollama / LiteLLM routing, audit-wired
│   ├── enrich.py         # Stage 3c: lexicon/entity/tactic proposals
│   ├── triage.py         # Stage 0.5: fast pre-screen (gemma4:e4b)
│   ├── book_splitter.py  # Markdown heading splitter for long PDFs (built)
│   ├── audit.py          # Audit sidecar writers (analysis_audit.json / enrichment_audit.json)
│   ├── source_queue.py   # Pre-ingest SQLite queue
│   ├── review.py         # Checkpoints 1-4: Rich terminal UI
│   └── upload.py         # Stage 5: Sanity write + Supabase insert + local save
└── clients/
    ├── sanity.py         # httpx Sanity Content API client
    └── supabase.py       # supabase-py wrapper

00_infrastructure/        # Entity registry, lexicon, ontology, Sanity schema
01_project_docs/          # PRD, implementation plan, architecture decision
02_working_tools/         # Ingestion + validation prompts, tagging guide
03_data/                  # Seed data exports, term additions
exports/                  # Per-batch JSON exports (gitignored if large)
```

---

*Active branch: `claude/review-architecture-70CUm`*
