# SurvivingSOGICE — Next Session Handoff
**Generated:** 2026-05-30
**Branch:** `claude/review-architecture-70CUm`
**Repo:** `/Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest`
**Tests passing:** 409
**Last commit:** `a2e701b0d`

---

## What this project is

PhD research archive studying SOGICE (Sexual Orientation and Gender Identity Change
Efforts) in Europe. A local Python + Streamlit runner ingests documents, classifies
them with LLMs, builds a living lexicon, and publishes to a public archive.

**Stack:** Local Python CLI + Streamlit UI → Sanity (source of truth) → Supabase
(vectors) → Vercel (publish, deferred).

**The researcher works alone.** There is no team. Every design decision must serve a
single person doing PhD-quality archival research part-time.

---

## System state — what exists and works

### Working pipeline (do not break)
```
Source Queue → Triage → Ingest → Preprocess → Embed → Analyze → Enrich → Review → Upload
```

| Stage | Command | Status |
|---|---|---|
| Source queue (pre-ingest staging) | `runner queue-add/list/triage/mark` | ✅ Built, tested |
| Ingestion | `runner ingest <url> --llm litelm` | ✅ Working |
| Re-analysis | `runner reanalyze <doc_id>` | ✅ Working |
| Enrichment | `runner enrich <doc_id>` | ✅ Working, now uses Gemma4 |
| Push to Sanity | `runner push-enrichment <doc_id>` | ✅ Working |
| Verify | `runner verify` | ✅ Working |
| Streamlit UI | `cd runner && streamlit run app.py` | ✅ Working |
| Discard stale docs | `runner discard-doc <doc_id>` | ✅ Working |
| Mac Studio diagnostics | `runner litelm-test` / `runner doctor` | ✅ Working |

### Streamlit pages (sidebar order)
1. Dashboard
2. Corpus Intelligence
3. **Source Queue** ← pre-ingest staging, built this session
4. Ingest Workbench
5. Document List
6. Pending Upload
7. Media Review
8. Lexicon
9. Tag Registry
10. Testimony Review
11. Activity Log
12. Guide
13. Model Routing
14. Triage Tool
15. Mac Studio Node
16. Seed Data

### Key files
```
runner/
├── main.py                     # All CLI commands (~1400 lines)
├── config.py                   # Config dataclass + load_config()
├── app.py                      # Streamlit UI (~9400 lines)
├── pipeline/
│   ├── intake.py               # Stage 1: doc_id, Wayback, dedup
│   ├── preprocess.py           # Stage 2: Docling/Trafilatura/Whisper + truncation
│   │                           #   _maybe_truncate() at line 654
│   │                           #   _preprocess_pdf() at line 159 — Docling primary
│   ├── embed.py                # Stage 3a: embedding (qwen3-embedding:8b)
│   ├── analyze.py              # Stage 3b: LLM classification (ingestion-v3.3 prompt)
│   ├── enrich.py               # Stage 3c: lexicon/entity proposals (966 lines)
│   │                           #   _call_enrichment_model() at line 364
│   │                           #   _run_chunked_enrichment() at line 391
│   │                           #   _chunk_text() at line 437 — 10k chars, 600 overlap
│   ├── triage.py               # Stage 0.5: fast pre-screen (gemma4:e4b)
│   ├── source_queue.py         # Pre-ingest SQLite queue (274 lines)
│   ├── upload.py               # Stage 5: Sanity + Supabase
│   ├── book_splitter.py        # ← DOES NOT EXIST YET — TASK 2 builds this
│   └── diagnostics.py          # Mac Studio health checks + ErrorKind taxonomy
├── clients/
│   ├── sanity.py               # Sanity REST client
│   └── supabase.py             # Supabase client (SQL constants, migrations)
└── models/
    ├── document.py             # Pydantic models for analysis output
    ├── enrichment.py           # EnrichmentResult, 7 proposal types
    └── triage.py               # TriageResult schema

tests/                          # 409 tests — run before every edit
02_working_tools/
└── Claude_Ingestion_Prompt.md  # ingestion-v3.3 — the analysis system prompt
```

---

## Model stack — Mac Studio M2 Ultra 64GB via LiteLLM/Tailscale

| Role | LiteLLM alias | Actual Ollama model | `--llm` flag | Speed |
|---|---|---|---|---|
| Default analysis | `core-qwen` | `qwen3.6:35b-a3b` (MoE, ~3B active) | `litelm` | **Fastest** |
| Heavy / long docs | `core-gemma` | `gemma4:31b` | `litelm-heavy` | Medium |
| Second opinion / reasoning | `review-qwen` | `qwen3.6:27b` (dense) | `litelm-reasoning` | Slowest |
| **Enrichment** | **`core-gemma`** | **`gemma4:31b`** | (auto, set in .env) | Medium |
| Triage (fast pre-screen) | `triage` | `gemma4:e4b` | (auto with --triage) | Very fast |
| Embedding | `research-embedding` | `qwen3-embedding:8b` | (auto with litelm) | Fast |

**IMPORTANT — MoE architecture:**
`core-qwen` (`qwen3.6:35b-a3b`) has 35 billion total parameters but only ~3 billion
active per token because of Mixture-of-Experts routing. It is **faster than
`review-qwen` (27B dense)**, not slower. Use `--llm litelm` (core-qwen) as the
default for 85% of documents. Only use `litelm-reasoning` for documents that triage
flags as `complexity=complex` or `doc_type_hint=legal`.

### MacBook fallback (Mac Studio offline)
| Flag | Model |
|---|---|
| `--llm local` | `qwen3.5:9b` |
| `--llm local-heavy` | `gemma-4-26B-A4B-it` (MacBook, verify RAM first) |

---

## Current .env state — already applied, do not re-apply

```bash
# Enrichment — switched to Gemma4 for cross-architecture diversity
# Analysis uses Qwen (core-qwen); enrichment uses Gemma4 (core-gemma)
# so Qwen-specific biases don't propagate to the lexicon
LITELM_ENRICHMENT_MODEL=core-gemma
LITELM_ENRICHMENT_MODEL_ALT=core-gemma

# Truncation limits — updated from defaults
# TRUNCATION_LIMIT_LOCAL was 1,000,000 → now 250,000 chars (~62k tokens)
# Fits comfortably in qwen3.6:35b-a3b's 262,144-token context window
TRUNCATION_LIMIT=24000          # Claude API only — keep low for cost reasons
TRUNCATION_LIMIT_LOCAL=250000   # LiteLLM/local — books use split-book instead
TRUNCATION_HEAD_CHARS=20000     # was 16,000
TRUNCATION_TAIL_CHARS=8000      # was 6,000
```

**Verification:** After your next `runner enrich <doc_id>`, confirm with:
```bash
python3 -c "import json; d=json.load(open('~/Documents/surviving-sogice-corpus/<doc_id>/enrichment.json')); print(d.get('enrichment_model'))"
# Should print: core-gemma
```

---

## Truncation behaviour — critical for books

`_maybe_truncate()` in `runner/pipeline/preprocess.py` line 654:
- If `len(text) <= limit` → no truncation, full text sent
- If `len(text) > limit` → keeps first `TRUNCATION_HEAD_CHARS` + last `TRUNCATION_TAIL_CHARS`
  with `[TRUNCATED MIDDLE — N chars omitted]` marker between them

**For a 300-page book (~250,000 chars) with current settings:**
- `--llm litelm` (limit = 250,000 chars): book is exactly at the limit. Borderline.
  Use `--max-chars 0` to disable truncation for books.
- `--llm claude` (limit = 24,000 chars): keeps first 20k + last 8k = **222k chars
  silently discarded**. ❌ Never use Claude for books.

**For LiteLLM models, truncation is manageable — the deeper problem is that the
analysis prompt (`ingestion-v3.3`) is designed for a single article, not 300 pages.**
That is why TASK 2 (chapter splitting) is the correct approach.

---

## Decisions settled — do not re-open

### 1. Enrichment model = core-gemma ✅ DONE
Cross-architecture diversity: analysis on Qwen (35B MoE), enrichment on Gemma4 (31B).
Different tokenizer + training mix reduces systematic bias propagation to the lexicon.
Applied in `.env`. No code changes needed or made.

### 2. Books → Level 2 (chapter splitting), NOT Level 1 (full-doc)
Level 1 (`--max-chars 0 --llm litelm-heavy`) sends ~250k chars as a single document.
The analysis prompt returns one shallow JSON. Enrichment falls back to 25 chunked
calls × ~30s = 12+ minutes. Result is low quality and will require re-ingestion.

Level 2 is required: split book into chapters, ingest each as a `sogiceDocument`
with `parent_book_id`, aggregate chapter-level results for researcher review.
Build it once correctly. TASK 2 below.

### 3. Batch size = 10–15 documents per review cycle
Larger batches cause fatigue-driven enrichment proposal approvals. 12–15 is the
ceiling for focused review (20–45 min per batch including triage and enrichment).

### 4. Time frame for 2,000 ingestions = ~5 months calendar
- Machine time: 2000 × ~58s avg = ~32 hours
- Researcher active review time: ~63 hours
- At ~3 active hours/week: ~5 months calendar. Acceptable for a solo PhD project.

### 5. Default model = `--llm litelm` (core-qwen, 35B MoE)
NOT `litelm-reasoning`. The MoE architecture makes core-qwen faster AND larger than
the 27B dense model. Use `litelm-reasoning` only when triage flags `complexity=complex`.

---

## TASKS (in priority order)

---

### TASK 1 — Overnight batch runner in Streamlit ✳️ NEXT

**Goal:** Researcher marks 12–15 items `ready_to_ingest` in Source Queue, presses
"Start overnight batch", goes to sleep. System processes each item serially with
`--yes` (no interactive checkpoints), runs enrichment, uploads to Sanity + Supabase,
logs progress to disk. Morning: review results in Document List.

**Add new Streamlit page: "Batch Runner"** (insert in pages list between Source Queue
and Ingest Workbench).

#### Panel layout

```
┌─ Batch Runner ─────────────────────────────────────────────────┐
│                                                                  │
│  Source: ● ready_to_ingest items from Source Queue (N items)   │
│          ○ Custom URL list (paste below)                        │
│                                                                  │
│  Batch name:     [batch-07              ]                       │
│  Analysis model: ● litelm  ○ litelm-heavy  ○ litelm-reasoning │
│  Run enrichment: ☑ Yes                                         │
│  Max items:      [12]                                           │
│                                                                  │
│  [ Start batch ]                                                │
│                                                                  │
│  ── Progress ──────────────────────────────────────────────    │
│  3 / 12 complete  ████████░░░░░░░░░░░░  25%                   │
│  Current: https://example.com/doc                              │
│  Last log: [Stage 3b] Analyze complete — confidence 0.87       │
│  Errors: 0                                                      │
│                                                                  │
│  [ Stop ]    [ View results in Document List ]                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Implementation spec

**Batch job file** written to disk before processing starts:
```json
// {corpus_dir.parent}/batch_jobs/{batch_id}.json
{
  "batch_id": "batch-07",
  "llm": "litelm",
  "enrich": true,
  "created_at": "2026-05-30T22:00:00Z",
  "items": [
    {"queue_id": "abc12345", "url": "https://...", "status": "queued", "doc_id": null, "error": null},
    ...
  ]
}
```

**Statuses per item:** `queued → running → done | failed`

**Processing loop (run in Streamlit with auto-rerun):**
```python
# In Streamlit — check for active batch on every render
batch_file = corpus_dir.parent / "batch_jobs" / f"{batch_id}.json"
if batch_file.exists():
    data = json.loads(batch_file.read_text())
    next_item = next((i for i in data["items"] if i["status"] == "queued"), None)
    if next_item:
        next_item["status"] = "running"
        batch_file.write_text(json.dumps(data, indent=2))
        # Launch subprocess
        proc = subprocess.Popen([
            sys.executable, "-m", "runner", "ingest", next_item["url"],
            "--llm", data["llm"],
            "--enrich" if data["enrich"] else "--no-enrich",
            "--batch", data["batch_id"],
            "--yes",
        ], stdout=log_file, stderr=subprocess.STDOUT)
        st.session_state["batch_proc"] = proc
    time.sleep(3)
    st.rerun()
```

**Key constraints:**
- Use `subprocess.Popen` with `--yes` — never Python threads in Streamlit
- Write stdout + stderr to `{corpus_dir}/{doc_id}/batch_ingest.log`
- Detect subprocess completion by polling `proc.poll()`
- On success: update item status → `done`, mark source queue item → `ingested`
- On failure: update item status → `failed`, log error, continue to next item
- If Mac Studio offline (LiteLLM unreachable): stop batch, show error, do NOT
  auto-fallback to local MacBook models without researcher confirmation
- Persist batch state to JSON on every state change so Streamlit rerenders pick it up

**CLI equivalent** (also implement):
```bash
python -m runner ingest-batch --batch batch-07 --llm litelm --enrich --max 12
# Reads ready_to_ingest items from source queue for that batch
# Processes serially with --yes, updates queue status for each
```

---

### TASK 2 — Book ingestion with chapter splitting 📚 MOST IMPORTANT

**This is a required capability before ingesting SOGICE books. Build it correctly
once. Do not simplify to Level 1 (full-doc). The researcher does not have time to
re-ingest 20 times.**

#### The problem (confirmed by code analysis)

A 300-page book (~250k chars) sent to the analysis prompt (`ingestion-v3.3`) produces
one shallow JSON with vague type, low confidence, and a summary of the introduction.
Enrichment (`_run_chunked_enrichment`) falls back to 25 chunks × ~30s = **12+ minutes**
with proposals split across 25 separate outputs that then get merged by `_merge_enrichment_results()`.
This produces a low-quality result that requires re-ingestion.

#### Step 1 — Build `runner/pipeline/book_splitter.py`

New module. No external dependencies beyond what's already installed.

```python
"""
Book chapter splitting for large PDFs.

Uses the Markdown headings from Docling's extracted.md to split a book
into sections suitable for individual ingestion.
"""
from dataclasses import dataclass

@dataclass
class BookSection:
    title: str          # heading text, e.g. "Chapter 3: Policy Responses"
    level: int          # heading level (1 = H1, 2 = H2)
    text: str           # full section text including heading
    section_index: int  # 1-based position in book
    start_char: int     # character offset in original markdown
    end_char: int

def split_by_headings(
    markdown: str,
    min_chars: int = 3000,
    max_level: int = 2,          # split at H1 and H2
) -> list[BookSection]:
    """Split Docling-extracted markdown at heading boundaries.

    Sections shorter than min_chars are merged into the following section.
    Returns sections in document order.
    """

def merge_short_sections(sections: list[BookSection], min_chars: int) -> list[BookSection]:
    """Merge consecutive sections that are individually too short."""

def estimate_section_count(markdown: str) -> int:
    """Quick count of expected sections without full parsing."""
```

Docling markdown headings look like:
```markdown
# Chapter 1: Historical Background
content...
## 1.1 Origins of the movement
content...
# Chapter 2: Theological Frameworks
```

Test file: `tests/test_book_splitter.py` with fixtures for real-world heading patterns
including: numbered chapters, unnumbered sections, preface/index, short sections that
need merging.

#### Step 2 — New CLI command `runner split-book`

```bash
python -m runner split-book book.pdf --batch "sogice-books" --llm litelm
python -m runner split-book book.pdf --preview   # show sections without ingesting
```

**What it does:**
1. Runs Docling preprocessing on PDF → saves `extracted.md` in a temp/parent folder
2. Calls `split_by_headings()` → list of `BookSection` objects
3. Prints preview: section count, titles, char counts
4. Asks researcher to confirm before creating corpus entries (unless `--yes`)
5. Creates a **parent book entry** in source queue (status = `new`, tagged `book_parent`)
6. For each section:
   - Generates a `doc_id` with suffix: `{book_short_id}_s{index:02d}`
   - Creates local corpus folder
   - Writes section text as `extracted.txt` and `extracted.md`
   - Adds to source queue as `ready_to_ingest` with metadata:
     `parent_book_id, section_title, section_index, total_sections, source_type=book_section`
7. Output: "Split into N sections. Review in Source Queue → Batch Runner."

#### Step 3 — Section ingestion (uses existing pipeline, no changes needed)

Each section ingests as a normal `sogiceDocument`. The analysis prompt receives
one chapter worth of text (~3,000–15,000 chars) — appropriate length for the prompt.

Extra metadata in `analysis.json`:
```json
{
  "parent_book_id": "doc12345",
  "section_title": "Chapter 3: Policy Responses",
  "section_index": 3,
  "total_sections": 18,
  "source_type": "book_section"
}
```

#### Step 4 — Book aggregation review in Streamlit

Add **"Book Review"** panel to Document List page (not a new page — an expander
that appears when multiple docs share the same `parent_book_id`):

- Lists all sections with their individual `type`, `confidence`, `summary`
- Aggregated view:
  - **Book type**: most common `type` across sections (weighted by confidence)
  - **Book confidence**: average confidence across all sections
  - **Lexicon candidates**: union of all `candidate_terms`, sorted by frequency
    (terms appearing in 3+ sections = high reliability)
  - **Entities**: deduplicated union of all entity proposals
- Researcher actions:
  - Confirm or override book-level classification
  - Approve/reject lexicon terms (multi-select by frequency tier)
  - Set book metadata: author, publisher, year, ISBN
  - Create Sanity `sogiceBook` record linking all chapter documents

#### Step 5 — Sanity schema (`studio/schemas/sogiceBook.ts`)

```typescript
export default {
  name: 'sogiceBook',
  title: 'SOGICE Book',
  type: 'document',
  fields: [
    { name: 'title',               type: 'string',  title: 'Title' },
    { name: 'author',              type: 'string',  title: 'Author(s)' },
    { name: 'publisher',           type: 'string',  title: 'Publisher' },
    { name: 'year',                type: 'number',  title: 'Year' },
    { name: 'isbn',                type: 'string',  title: 'ISBN' },
    { name: 'bookType',            type: 'string',  title: 'SOGICE Classification',
      options: { list: ['Anti-SOGICE', 'Pro-SOGICE', 'Peripheral', 'Academic'] } },
    { name: 'aggregatedConfidence', type: 'number', title: 'Aggregated Confidence' },
    { name: 'sectionCount',        type: 'number',  title: 'Section Count' },
    { name: 'sections', type: 'array', title: 'Sections',
      of: [{ type: 'reference', to: [{ type: 'sogiceDocument' }] }] },
    { name: 'workflowStatus', type: 'string', title: 'Workflow Status',
      options: { list: ['draft', 'reviewed', 'published'] } },
  ]
}
```

**Register in `studio/schemas/index.ts`** alongside existing types.

#### Tests to add
- `tests/test_book_splitter.py`: heading parsing, min-chars merging, edge cases
  (no headings, very short sections, non-English headings, Roman numeral chapters)
- `tests/test_book_aggregation.py`: confidence averaging, term frequency ranking,
  entity deduplication across sections

---

### TASK 3 — Streamlit: Large document settings in Ingest Workbench

**Goal:** Researcher controls truncation and model from Streamlit — no `.env` editing
required for per-document overrides.

Add collapsible "⚙️ Document settings" expander in the Ingest Workbench page,
above the ingest button:

```
┌─ ⚙️ Document settings ────────────────────────────────────────┐
│                                                                 │
│  Analysis model:  ● litelm — Qwen 35B MoE (recommended)       │
│                   ○ litelm-heavy — Gemma4 31B (long docs)      │
│                   ○ litelm-reasoning — Qwen 27B (ambiguous)    │
│                                                                 │
│  Truncation:      ● Auto (250,000 chars from .env)             │
│                   ○ No truncation — send full text             │
│                   ○ Custom limit: [________] chars             │
│                                                                 │
│  Enrichment:      ☑ Run enrichment (Gemma4:31b)               │
│  Second opinion:  ☐ Run second opinion comparison             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Store selections in `st.session_state` (persist within session)
- "No truncation" passes `max_chars=0` to the preprocess step
- Show the effective truncation limit as a caption under the radio
- When model = `litelm-heavy`, auto-suggest "No truncation" for long docs

---

### TASK 4 — Source Queue → Batch Runner integration

**Goal:** One-click path from Source Queue to Batch Runner.

In Source Queue page, when items are in `ready_to_ingest`:
- Show a banner: "N items ready — [Send to Batch Runner →]"
- Clicking it writes the batch job file and navigates to Batch Runner page
- In the queue table, show the triage-recommended `--llm` flag prominently
  for each item so researcher can confirm model before batching

---

## What NOT to touch

- `runner/pipeline/analyze.py` — do not change LLM routing or prompt loading
- `runner/models/document.py` — do not change the ingestion-v3.3 output schema
- `studio/schemas/document.ts` (sogiceDocument) — no structural changes until
  book schema is fully designed and agreed
- Supabase live data — only `runner verify` and `runner migrate-supabase` touch it
- Active corpus documents — never re-ingest without `runner reanalyze`
- `.claude/worktrees/objective-hypatia-69d7fe` — stale worktree, never use this path

---

## Pre-flight before every session

```bash
cd /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest
git status --short --branch
git pull origin claude/review-architecture-70CUm
.venv/bin/python -m pytest --tb=short -q
# Must see: 409 passed (or higher after new tests)
```

---

## Important code locations

| What | File | Line |
|---|---|---|
| Truncation logic | `runner/pipeline/preprocess.py` | 59–71 + `_maybe_truncate()` at 654 |
| PDF extraction (Docling) | `runner/pipeline/preprocess.py` | `_preprocess_pdf()` at 159 |
| Enrichment model routing | `runner/pipeline/enrich.py` | `_call_enrichment_model()` at 364 |
| Enrichment chunking | `runner/pipeline/enrich.py` | `_run_chunked_enrichment()` at 391, `_chunk_text()` at 437 |
| Source queue CRUD | `runner/pipeline/source_queue.py` | Full module |
| Streamlit page routing | `runner/app.py` | 78–148 |
| Batch pattern reference | `runner/main.py` | `annotate-batch` at line 551 |
| Sanity schema location | `studio/schemas/` | `document.ts`, `index.ts` |

---

## Open questions (decide before implementing)

**Q1:** Should the book aggregation create a new Sanity document type (`sogiceBook`),
or reuse `sogiceDocument` with `sourceType=book_section` and a `parentBook` reference
field? → Lean toward new type (`sogiceBook`) but needs researcher sign-off because
it changes the Sanity schema.

**Q2:** Should overnight batch processing auto-stop if Mac Studio (LiteLLM) goes
offline mid-batch, or should it queue items as `failed` and resume when the
connection is restored? → Lean toward stop + notify. Auto-resume on reconnect risks
sending duplicate documents to Sanity if the previous attempt partially succeeded.

**Q3:** For book sections in Sanity, should the `sourceUrl` field contain the
original PDF path/URL or the parent book's URL? → The parent book's URL (or ISBN),
since the section has no standalone URL.

---

*This document was written after a full multi-agent code analysis covering pipeline
timing, model architecture (MoE vs dense), truncation behaviour, enrichment routing,
batch processing strategy, and book ingestion design. All decisions are based on
reading the source code directly. Tests confirmed at 409 passing after all changes.*
