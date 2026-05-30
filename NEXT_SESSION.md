# SurvivingSOGICE — Next Session Handoff
**Generated:** 2026-05-21  
**Branch:** `claude/review-architecture-70CUm`  
**Repo:** `/Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest`  
**Tests passing:** 409  
**Last commit:** `078bd8f18`

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
| Enrichment | `runner enrich <doc_id>` | ✅ Working |
| Push to Sanity | `runner push-enrichment <doc_id>` | ✅ Working |
| Verify | `runner verify` | ✅ Working |
| Streamlit UI | `cd runner && streamlit run app.py` | ✅ Working |
| Discard stale docs | `runner discard-doc <doc_id>` | ✅ Working |

### Streamlit pages (in order as they appear in sidebar)
1. Dashboard
2. Corpus Intelligence
3. **Source Queue** ← new, pre-ingest staging
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
├── main.py                     # All CLI commands
├── config.py                   # Config dataclass + load_config()
├── app.py                      # Streamlit (~9300 lines)
├── pipeline/
│   ├── intake.py               # Stage 1: doc_id, Wayback, dedup
│   ├── preprocess.py           # Stage 2: Docling/Trafilatura/Whisper + truncation
│   ├── embed.py                # Stage 3a: embedding
│   ├── analyze.py              # Stage 3b: LLM classification
│   ├── enrich.py               # Stage 3c: lexicon/entity proposals (966 lines)
│   ├── triage.py               # Stage 0.5: fast pre-screen
│   ├── source_queue.py         # Pre-ingest SQLite queue
│   ├── upload.py               # Stage 5: Sanity + Supabase
│   └── diagnostics.py          # Mac Studio health checks
├── clients/
│   ├── sanity.py               # Sanity REST client
│   └── supabase.py             # Supabase client
└── models/
    ├── document.py             # Pydantic models for analysis output
    ├── enrichment.py           # EnrichmentResult, proposals
    └── triage.py               # TriageResult
tests/                          # 409 tests — run before every edit
```

---

## Model stack (Mac Studio M2 Ultra 64GB via LiteLLM/Tailscale)

| Role | LiteLLM alias | Actual model | `--llm` flag | Speed |
|---|---|---|---|---|
| Default analysis | `core-qwen` | qwen3.6:35b-a3b (MoE, ~3B active) | `litelm` | **Fastest** |
| Heavy/long docs | `core-gemma` | gemma4:31b-it | `litelm-heavy` | Medium |
| Second opinion | `review-qwen` | qwen3.6:27b (dense) | `litelm-reasoning` | Slowest |
| Enrichment (current) | `lexicon-llm` | qwen3.6:35b-a3b | (auto) | Fast |
| **Enrichment (target)** | **`core-gemma`** | **gemma4:31b-it** | **(set in .env)** | Medium |
| Triage | `triage` | gemma4:e4b-it | (auto) | Very fast |
| Embedding | `research-embedding` | qwen3-embedding:8b | (auto with litelm) | Fast |

**IMPORTANT — MoE architecture:**
`core-qwen` (35B MoE) has 35B total parameters but only ~3B active per token. It is
**faster than `review-qwen` (27B dense)**, not slower. Use `--llm litelm` (core-qwen)
as default. Use `litelm-reasoning` only for docs flagged `complexity=complex` by triage.

### MacBook fallback (Mac Studio offline)
| Flag | Model |
|---|---|
| `--llm local` | qwen3.5:9b |
| `--llm local-heavy` | gemma-4-26B-A4B-it |

---

## Truncation behaviour — critical for books

```python
# config.py defaults
truncation_limit        = 24_000    # chars — Claude API only
truncation_limit_local  = 1_000_000 # chars — LiteLLM/local (effectively unlimited)
truncation_head_chars   = 16_000
truncation_tail_chars   =  6_000
```

**For a 300-page book (~250,000 chars):**
- `--llm litelm` (default): full text sent (1M char limit not hit) ✅
- `--llm claude`: only first 16k + last 6k = **178k chars silently discarded** ❌ Never use Claude for books.

**For LiteLLM models, truncation is NOT the problem.** The problem is that the
analysis prompt (`ingestion-v3.3`) is designed for one article, not 300 pages.
That is why chapter splitting is required (see TASK 3 below).

---

## Decisions made in previous sessions

### 1. Enrichment model → core-gemma (IMMEDIATE)
**Decision:** Switch `LITELM_ENRICHMENT_MODEL` from `lexicon-llm` (Qwen) to `core-gemma`
(Gemma4:31b).

**Rationale:** Cross-architecture diversity — analysis uses Qwen, enrichment uses Gemma4.
Different tokenizer + training mix = different biases. Systematic Qwen errors in
classification are less likely to propagate to the lexicon if enrichment runs on
Gemma4. The researcher has no time to do 50-doc A/B comparison — Gemma4 is the
defensible immediate choice.

**How to apply:**
```bash
# In runner/.env — change this line:
LITELM_ENRICHMENT_MODEL=core-gemma
```
That is the only change needed. No code change.

### 2. Books must use Level 2 (chapter splitting), not Level 1 (full-doc with --max-chars 0)
Level 1 (`--max-chars 0 --llm litelm-heavy`) sends 250k chars to Gemma4 as a single
document. This produces one shallow classification JSON. The enrichment then runs 25
chunks × 30s = 12 minutes. The result is low-quality because the analysis prompt
expects one article, not a book.

**Level 2 is the correct approach:** Split book into chapters, ingest each chapter as
a separate `sogiceDocument` with a shared `parent_book_id`, then aggregate
chapter-level classifications and enrichments into a book-level confidence review.

### 3. Batch size: 10–15 documents per review cycle
Larger batches lead to fatigue-driven approval of enrichment proposals. 12–15 is the
ceiling for focused review (20–45 min per batch).

### 4. Time frame for 2,000 ingestions: ~5 months
- Machine time: 2000 × 58s avg = ~32 hours
- Researcher review time: ~63 hours total
- At 3 active hours/week on ingestion: ~5 months calendar

### 5. Default model for analysis: `--llm litelm` (core-qwen, 35B MoE)
Not `litelm-reasoning`. The 35B MoE is faster than 27B dense and good enough for
85% of the corpus. Save `litelm-reasoning` for docs triage flags as `complexity=complex`.

---

## TASKS FOR THIS SESSION (in priority order)

---

### TASK 1 — Apply .env changes (5 minutes, no code)

**File:** `runner/.env`

Make these changes:
```bash
# Switch enrichment to Gemma4
LITELM_ENRICHMENT_MODEL=core-gemma

# Raise local truncation limit slightly for better long-doc coverage
# (keeps full text for docs up to 250k chars, still well within context window)
TRUNCATION_LIMIT_LOCAL=250000
TRUNCATION_HEAD_CHARS=20000
TRUNCATION_TAIL_CHARS=8000
```

Note: `TRUNCATION_LIMIT_LOCAL=250000` is intentionally lower than the 1M default.
This gives LiteLLM models a 250k-char ceiling (~62k tokens), which fits comfortably
in qwen3.6:35b-a3b's 262,144-token context window while keeping inference fast. For
books that exceed this, chapter splitting (TASK 3) handles the rest.

**Also update `.env.example`** to reflect these new recommended defaults.

---

### TASK 2 — Overnight batch system in Streamlit (1–2 days)

**Goal:** Researcher sets up a batch of 12–15 items in Source Queue, presses "Run
overnight batch", goes to sleep. System processes all `ready_to_ingest` items
serially, runs enrichment, uploads to Sanity/Supabase, logs progress. Morning review
shows results in Streamlit Document List.

**Design:**

Add a new Streamlit page **"Batch Runner"** (or panel within Source Queue) that:

1. Shows all `ready_to_ingest` items from the source queue
2. Has a "Configure batch" panel:
   - Model selector (default: litelm, options: litelm / litelm-heavy / litelm-reasoning)
   - Run enrichment: yes/no toggle (default: yes)
   - Max items: number input (default: 12)
   - Batch name: text input
3. Has a "Start batch" button that writes a **batch job file** to disk:
   ```
   {corpus_dir.parent}/batch_jobs/{batch_id}.json
   ```
   containing the list of URLs + config
4. A background worker (Streamlit `@st.fragment` with `run_every=5`) that:
   - Reads the batch job file
   - Picks next unprocessed item
   - Calls `runner ingest <url> --llm <model> --enrich --yes --batch <batch_id>`
     via `subprocess.Popen`
   - Writes progress back to the batch job file
   - Marks queue item as ingested on success
5. A live progress display (auto-refreshing) showing:
   - Items processed / total
   - Current item URL
   - Last 5 log lines
   - Errors (if any)
6. After completion: shows "Batch complete — review in Document List" with direct
   navigation link

**Implementation notes:**
- Use `subprocess.Popen` with `--yes` flag to suppress interactive checkpoints
- Write stdout/stderr to `{corpus_dir}/{doc_id}/batch.log`
- The batch job JSON tracks: `{url, status: queued|running|done|failed, doc_id, error}`
- Streamlit refresh with `time.sleep(2); st.rerun()` inside a spinner — or use
  `st.fragment(run_every=3)` if Streamlit version supports it
- Do NOT use Python threads for subprocess management — Streamlit + threads = pain
- If Mac Studio is offline, batch fails gracefully and stops (don't fall back to local
  automatically — researcher must decide)

**CLI equivalent (also add this for terminal use):**
```bash
python -m runner ingest-batch --batch batch-07 --llm litelm --enrich --max 12
# Reads ready_to_ingest items from source queue for batch-07
# Processes them one by one with --yes
# Updates queue status for each
```

---

### TASK 3 — Book ingestion system with chapter splitting (2–3 days)

This is the most important new capability. Do not skip or simplify.

**The problem:**
A 300-page SOGICE book (~250k chars) cannot be meaningfully classified as a single
`sogiceDocument`. The analysis prompt (`ingestion-v3.3`) expects one article-length
document and returns one JSON object. Sending 250k chars produces vague, low-confidence
output. Enrichment falls back to 25 chunked calls that produce 25 separate proposal
sets that then need merging.

**The correct solution:**

#### Step 1: Extract chapter structure from PDF

Docling already extracts Markdown from PDFs with heading structure. A 300-page book
converted by Docling produces `extracted.md` with headings like:
```markdown
# Chapter 1: Historical Background
## 1.1 Origins of the movement
...
# Chapter 2: Theological Frameworks
```

Build `runner/pipeline/book_splitter.py` with:
```python
def split_by_headings(markdown: str, min_chars: int = 3000) -> list[BookSection]:
    """Split Docling-extracted markdown into sections at H1/H2 boundaries.
    
    Returns list of BookSection(title, level, text, start_char, end_char).
    Sections shorter than min_chars are merged with the next section.
    """
```

#### Step 2: New CLI command `runner split-book`

```bash
python -m runner split-book book.pdf --batch "sogice-books" --llm litelm
```

What it does:
1. Runs Docling preprocessing on the PDF → `extracted.md`
2. Runs `split_by_headings()` → list of sections (typically 5–30 per book)
3. Creates a **parent book record** in Sanity (`sogiceBook` document type — see below)
4. For each section:
   - Creates a local corpus folder: `{doc_id}_{section_index}/`
   - Saves section text as `extracted.txt`
   - Queues section for analysis: adds to source queue as `ready_to_ingest` with
     metadata `{parent_book_id, section_title, section_index, total_sections}`
5. Prints summary: "Split into N sections. Run: runner ingest-batch --set {book_id}"

#### Step 3: Section-level ingestion

Each section is ingested as a normal `sogiceDocument` with extra metadata:
```json
{
  "parent_book_id": "sogicebook-author-2024",
  "section_title": "Chapter 3: Policy Responses",
  "section_index": 3,
  "total_sections": 18,
  "source_type": "book_section"
}
```

This goes into the `analysis.json` and gets uploaded to Sanity as a normal document
with the parent book reference.

#### Step 4: Book-level aggregation review in Streamlit

After all sections are ingested, show a new Streamlit panel:
**"Book Review"** (accessible from Document List or new sidebar page):

- Shows all chapters of the book with their individual analysis results
- Aggregates: 
  - Most common `type` across chapters → book type
  - Weighted average confidence across chapters → book confidence
  - Union of all `candidate_terms` across chapters → book lexicon candidates
  - All entity proposals across chapters → deduplicated
- Researcher can:
  - Confirm or override the book-level classification
  - Approve/reject lexicon terms that appear in multiple chapters (high reliability)
  - Set book metadata (author, publisher, year, ISBN)
  - Push book-level Sanity record and all chapter records

#### Step 5: Sanity schema addition

Add `sogiceBook` document type to `studio/schemas/`:
```typescript
{
  name: 'sogiceBook',
  title: 'SOGICE Book',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'author', type: 'string' },
    { name: 'year', type: 'number' },
    { name: 'isbn', type: 'string' },
    { name: 'bookType', type: 'string' },  // Anti-SOGICE, Pro-SOGICE, etc.
    { name: 'aggregatedConfidence', type: 'number' },
    { name: 'sectionCount', type: 'number' },
    { name: 'sections', type: 'array', of: [{ type: 'reference', to: [{ type: 'sogiceDocument' }] }] },
  ]
}
```

#### Tests to add
- `tests/test_book_splitter.py`: heading detection, min-chars merging, empty sections
- `tests/test_book_aggregation.py`: confidence averaging, term deduplication

---

### TASK 4 — Streamlit: Large document settings panel

**Goal:** Researcher can control truncation and model from Streamlit without touching
the CLI or .env.

In the **Ingest Workbench** page, add a collapsible "Advanced document settings" panel:

```
┌─ Advanced document settings ──────────────────────────────────┐
│                                                                │
│  Document type:   [Article ▼]  [Long PDF ▼]  [Book section ▼]│
│                                                                │
│  Analysis model:  ● litelm (recommended)                      │
│                   ○ litelm-heavy (Gemma4, long docs)          │
│                   ○ litelm-reasoning (Qwen27B, ambiguous)     │
│                                                                │
│  Truncation:      ● Auto (from .env)                          │
│                   ○ No truncation (send full text)            │
│                   ○ Custom limit: [______] chars              │
│                                                                │
│  Run enrichment:  ☑ Yes  (model: Gemma4:31b)                  │
│  Second opinion:  ☐ No                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

"No truncation" sets `--max-chars 0` equivalent in the Streamlit ingest call.
Store the last-used settings in `st.session_state` so they persist within the session.

---

### TASK 5 — Source Queue: batch automation integration

**Goal:** Connect Source Queue's `ready_to_ingest` items directly to the batch runner.

In Source Queue page, after items are marked `ready_to_ingest`:
- Show a "Send to batch runner" button
- It collects all `ready_to_ingest` items and writes them to a batch job file
- Then navigates to Batch Runner page

Also add to Source Queue table: display the recommended `--llm` flag from triage
prominently on each item, so the researcher can confirm the model before batching.

---

## What NOT to touch

- Model routing logic in `analyze.py` — do not change LLM routing code
- Sanity schema for `sogiceDocument` — no structural changes until book schema is designed
- Supabase live data — only `verify` and `migrate-supabase` commands touch it
- Active corpus documents — do not re-ingest already-uploaded docs without `runner reanalyze`
- `.claude/worktrees/objective-hypatia-69d7fe` — stale, never use this path

---

## Pre-flight before every session

```bash
cd /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest
git status --short --branch
git pull origin claude/review-architecture-70CUm
.venv/bin/python -m pytest --tb=short -q
# All 409 tests must pass before any edits
```

---

## The .env keys that matter most

```bash
# In runner/.env

# Model routing
LITELM_BASE_URL=http://<mac-studio-tailscale-ip>:4000
LITELM_API_KEY=<key>

# ★ CHANGE THIS (was lexicon-llm):
LITELM_ENRICHMENT_MODEL=core-gemma
LITELM_ENRICHMENT_MODEL_ALT=core-gemma

# ★ CHANGE THESE (was 1000000 / 16000 / 6000):
TRUNCATION_LIMIT_LOCAL=250000
TRUNCATION_HEAD_CHARS=20000
TRUNCATION_TAIL_CHARS=8000
TRUNCATION_LIMIT=24000

# Corpus paths
CORPUS_DIR=~/Documents/surviving-sogice-corpus
EXPORTS_DIR=~/Documents/surviving-sogice-exports

# Source queue DB is auto-derived: {corpus_dir.parent}/source_queue.db
```

---

## Important code locations (for new tasks)

### Truncation logic
`runner/pipeline/preprocess.py` lines 59–71 and `_maybe_truncate()` at line 654.

### Enrichment model routing
`runner/pipeline/enrich.py` `_call_enrichment_model()` at line 364. Uses
`config.litelm_enrichment_model` (from `.env`). One change to `.env` is all that's
needed.

### Source queue
`runner/pipeline/source_queue.py` — full SQLite-backed queue module.
`QueueItem` dataclass, `open_db()`, `add_items_from_text()`, `list_items()`,
`apply_triage_result()` with `triage_model_used`.

### Streamlit page routing
`runner/app.py` lines 78–148. Add new pages to `pages = [...]` list and add
`elif page == "..."` branch.

### Batch-related CLI
`runner/main.py` — `annotate-batch` command (line 551) shows the existing batch
pattern for processing multiple docs. Model for the new `ingest-batch` command.

### Docling PDF extraction
`runner/pipeline/preprocess.py` `_preprocess_pdf()` at line 159. Uses
`DocumentConverter().convert()` and `.export_to_markdown()` and `.export_to_text()`.
The markdown output contains heading structure — this is the input for `split_by_headings()`.

---

## Commit history for this branch (recent)

```
078bd8f18  Add human AI collaboration schematic materials
5689a8e28  Let source queue triage decide import priority
8168f1da2  Clarify source queue triage workflow (enrichment model, corpus semantics, URL types)
b930e770d  Add pre-ingestion source queue (SQLite-backed)
67bcb59e1  Remove unreachable lexicon evidence helper
3e38eaf9d  Remove dead _render_sanity_lexicon_tab duplicate
bad25fc55  Fix two registry validation UI bugs found during audit
bf14dbb34  Hide empty registry validation filters
```

---

## Questions settled — do not re-open

1. **Should Level 1 (full-doc --max-chars 0) be used for books?** No. Skip directly
   to Level 2 (chapter splitting). Level 1 produces shallow output that requires
   re-ingestion anyway. Build it right once.

2. **Should enrichment use Qwen or Gemma4?** Gemma4 (core-gemma). Decided.
   Cross-architecture diversity > marginal speed gain from Qwen. Set in .env.

3. **Should the first 2000 docs use litelm-reasoning (27B) for safety?** No.
   `core-qwen` (35B MoE, ~3B active) is faster AND uses more learned capacity.
   `litelm-reasoning` is for ambiguous/complex docs only. Triage surfaces those.

4. **Is the system ready for production web/article ingestion?** Yes. Start now.
   Books wait for TASK 3.

5. **Time estimate for 2000 docs?** ~5 months calendar at solo researcher pace.
   ~32h machine time, ~63h active review time. Not a problem — it is an expected
   duration for a PhD archive at this quality level.

---

## Open questions (not yet decided)

- Should the book aggregation create a new Sanity document type (`sogiceBook`), or
  should it use the existing `sogiceDocument` type with a special `sourceType=book`
  and a `parentBook` reference field?
  → Lean toward new type, but needs schema review before implementation.

- Should overnight batch processing use Streamlit's `st.fragment(run_every=N)` or
  a separate background process? → Use subprocess + polling for reliability.
  Streamlit's fragment API may not be stable enough for long-running jobs.

- What happens if Mac Studio (LiteLLM) goes offline mid-batch? → Stop batch, log
  failure, notify researcher in UI. Do NOT auto-fallback to local MacBook models
  without researcher confirmation.

---

*This document was generated at the end of a long analysis session. The analysis
covered: pipeline stage timing, model architecture, truncation behaviour, enrichment
routing, batch processing strategy, and book ingestion design. All decisions above
are evidence-based from reading the source code directly.*
