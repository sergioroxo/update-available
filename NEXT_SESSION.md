# SurvivingSOGICE -- Next Session Handoff
**Generated:** 2026-05-30
**Branch:** `claude/review-architecture-70CUm`
**Repo:** `/Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest`
**Tests passing:** 519
**Last commit:** `627386de3` (Wire analysis audit sidecar generation)

**Companion steering guide:** `CODEX_NEXT_CONVERSATION.md`
Use `NEXT_SESSION.md` for Claude's implementation tasks. Use
`CODEX_NEXT_CONVERSATION.md` when starting a clean Codex conversation to verify
state, steer Claude, and keep the system coherent.

---

## What this project is

PhD research archive studying SOGICE (Sexual Orientation and Gender Identity Change
Efforts) in Europe. A local Python + Streamlit runner ingests documents, classifies
them with LLMs, builds a living lexicon, and publishes to a public archive.

**Stack:** Local Python CLI + Streamlit UI -> Sanity (source of truth) -> Supabase
(vectors) -> Vercel (publish, deferred).

**The researcher works alone.** There is no team. Every design decision must serve a
single person doing PhD-quality archival research part-time.

---

## Stage contracts -- settled architecture decisions

These define what each stage does and does NOT do. Do not collapse them.

### Stage 0.5 -- Triage (routing intelligence)
Runs a fast model on the first ~3,000 chars. Determines:
- Likely document type and language(s)
- Complexity (simple / moderate / complex)
- Recommended analysis model (`--llm` flag)
- Whether splitting is needed (book/report/long transcript)
- Whether media, testimony, or legal review will be needed
- Whether the document is safe for overnight batch processing without human oversight

Triage does NOT classify. It routes.

### Stage 3b -- Analysis (classification and summary)
Classifies the document against the controlled vocabulary. Produces:
- Type, format, evidence tags, scope, tactic, practice, harm, flags
- Narrative register, rhetorical intensity, framing balance
- Summary (80-150 words)
- Confidence model and field-level scores
- Candidate terms / actors flagged for human review (shallow; enrichment goes deeper)

Analysis uses a **compact orientation lexicon**: validated terms plus
researcher-approved or seeded draft terms that are already meaningful SOGICE
vocabulary. Excluded from the orientation lexicon: unreviewed local candidates
and noisy one-off model suggestions. Capped and curated for classification
stability, not merely status-filtered.

Analysis does NOT mine the document for the lexicon. Enrichment does that.

### Stage 3c -- Enrichment (lexicon and registry intelligence)
Runs after analysis on the full document text. Mines for:
- Lexicon proposals -- distinguished by action type (see below)
- Entity proposals (organizations, persons)
- Tactic proposals
- Practice descriptions with harm stance
- Statistical claims for fact-checking
- Ingestion queue candidates (linked documents to ingest next)
- Cross-corpus connections

Enrichment uses the **full lexicon context**: draft + validated terms + entity registry.
It should connect to existing terms before proposing new ones.

**Action types that must be explicitly distinguished in every proposal:**
- `add_new` -- a term not yet in the registry
- `add_variant` -- a spelling, transliteration, or stylistic variant of an existing term
- (translation) -- a cross-language equivalent (use `add_variant` with language tag)
- `add_evidence` -- a quote supporting an existing term's definition
- `add_definition` -- a new or refined definition for an existing term
- `merge_into` -- two entries that should become one
- entity/tactic/practice link -- `add_new` or `enrich_existing` on those proposal types

Enrichment does NOT reclassify the document. It mines it.

### Human review -- the methodological layer
The researcher validates, rejects, edits, interprets, and preserves provenance.
Nothing becomes archive truth without explicit researcher action:
- Enrichment proposals require `approved=True` before `push-enrichment` runs
- Testimony requires consent confirmation before upload
- Every Sanity write is gated by a human checkpoint

The pipeline proposes. The researcher decides. The archive records.

---

## System state -- what exists and works

### Working pipeline
```
Source Queue -> Triage -> Ingest -> Preprocess -> Embed -> Analyze -> Enrich -> Review -> Upload
```

| Stage | Command | Status |
|---|---|---|
| Source queue | `runner queue-add/list/triage/mark` | Built, tested |
| Ingestion | `runner ingest <url> --llm litelm` | Working |
| Re-analysis | `runner reanalyze <doc_id>` | Working |
| Enrichment | `runner enrich <doc_id>` | Working, uses Gemma4 |
| Push to Sanity | `runner push-enrichment <doc_id>` | Working |
| Verify | `runner verify` | Working |
| Streamlit UI | `cd runner && streamlit run app.py` | Working |
| Discard stale docs | `runner discard-doc <doc_id>` | Working |
| Mac Studio diagnostics | `runner litelm-test` / `runner doctor` | Working |

### Key files
```
runner/
├── main.py                     # All CLI commands
├── config.py                   # Config dataclass + load_config()
├── app.py                      # Streamlit UI
├── pipeline/
│   ├── intake.py               # Stage 1: doc_id, Wayback, dedup
│   ├── preprocess.py           # Stage 2: Docling/Trafilatura/Whisper + truncation
│   │                           #   _maybe_truncate() -- line 654
│   │                           #   _preprocess_pdf() -- line 159 (Docling primary)
│   ├── embed.py                # Stage 3a: embedding (qwen3-embedding:8b)
│   ├── analyze.py              # Stage 3b: LLM classification (ingestion-v3.3)
│   │                           #   _build_system_prompt_with_lexicon() -- compact lexicon
│   │                           #   _validate_response() -- audit-instrumented
│   ├── enrich.py               # Stage 3c: lexicon/entity proposals
│   │                           #   _run_chunked_enrichment() -- fallback for long docs
│   ├── triage.py               # Stage 0.5: fast pre-screen (gemma4:e4b)
│   ├── source_queue.py         # Pre-ingest SQLite queue
│   ├── book_splitter.py        # Markdown heading splitter -- BUILT (44 tests)
│   ├── audit.py                # Audit sidecar writers -- BUILT (38 tests)
│   ├── upload.py               # Stage 5: Sanity + Supabase (audit-wired)
│   └── diagnostics.py          # Mac Studio health checks
├── clients/
│   ├── sanity.py
│   └── supabase.py
└── models/
    ├── document.py             # Pydantic models -- ingestion-v3.3 schema
    ├── enrichment.py           # EnrichmentResult, 7 proposal types
    └── triage.py               # TriageResult schema

tests/                          # 519 tests -- run before every edit
02_working_tools/
├── Claude_Ingestion_Prompt.md  # ingestion-v3.3 -- analysis system prompt
└── ENRICHMENT_PROMPT_v1.0.md   # enrichment-v1.1 -- enrichment system prompt
```

### Audit infrastructure (built this session)
- `runner/pipeline/audit.py` -- `AnalysisRunMeta`, `EnrichmentRunMeta`, write functions
- `analysis_audit.json` written beside `analysis.json` on every ingest/reanalyze
- Fields captured: llm_flag, model, input_char_count, input_truncated,
  lexicon_terms_available, lexicon_terms_injected, lexicon_injection_cap,
  raw_response_chars, validation_path, validation_attempts, confidence, doc_type, errors
- `EnrichmentRunMeta` defined but not yet wired into `enrich.py` (TASK C)

---

## Model stack -- Mac Studio M2 Ultra 64GB via LiteLLM/Tailscale

| Role | LiteLLM alias | Actual model | `--llm` flag |
|---|---|---|---|
| Default analysis | `core-qwen` | `qwen3.6:35b-a3b` (MoE, ~3B active) | `litelm` |
| Heavy / long docs | `core-gemma` | `gemma4:31b` | `litelm-heavy` |
| Second opinion | `review-qwen` | `qwen3.6:27b` (dense) | `litelm-reasoning` |
| Enrichment | `core-gemma` | `gemma4:31b` | (auto, set in .env) |
| Triage | `triage` | `gemma4:e4b` | (auto with --triage) |
| Embedding | `research-embedding` | `qwen3-embedding:8b` | (auto with litelm*) |

**MoE note:** `core-qwen` is faster AND larger than `review-qwen` (27B dense).
Use `litelm` as the default for 85% of documents. Use `litelm-reasoning` only
when triage flags `complexity=complex` or `doc_type_hint=legal`.

**MacBook fallback:** `--llm local` (qwen3.5:9b), `--llm local-heavy` (gemma-4-26B, check RAM).

---

## Settled decisions -- do not re-open

1. **Enrichment model = core-gemma.** Cross-architecture diversity: analysis on Qwen, enrichment on Gemma4.
2. **Books require chapter splitting, not full-document ingestion.** `book_splitter.py` module is built. The `split-book` CLI command and Sanity schema are still needed.
3. **Batch size = 10-15 documents per review cycle.**
4. **Default model = `--llm litelm` (core-qwen, 35B MoE).** Use `litelm-reasoning` only for triage-flagged complex/legal docs.
5. **Compact orientation lexicon for analysis.** Validated + researcher-trusted
   draft terms, capped at 200. Excludes unreviewed local candidates. Draft terms are
   not inherently low quality -- many are meaningful SOGICE vocabulary awaiting evidence
   citation. The selection mechanism is designed in TASK B.
6. **Enrichment always runs after normal ingest -- architecture confirmed.** Code is still
   pending (TASK D) because timing, RAM, and overnight batch behavior require careful
   handling. The default flag flip is one line; the safe implementation is not.

---

## TASKS (in priority order)

---

### TASK A -- Triage workflow flags

**Why first:** Without these flags, overnight batch processing cannot safely distinguish testimonies, legal documents, and books that need different handling. The Batch Runner (TASK F) depends on this.

**What to add to `TriageResult`:**
```python
needs_book_splitting: bool = False    # long PDF/EPUB requiring split-book
needs_testimony_review: bool = False  # consent gate required
needs_media_review: bool = False      # transcript/media processing needed
needs_legal_review: bool = False      # court/legislative -- researcher must confirm
overnight_batch_safe: bool = True     # False for testimony/legal without explicit ok
suggested_process_route: str = ""     # "split-book" | "media-ingest" | "standard"
```

**Other changes:**
- Update triage system prompt to return these fields
- Add DB columns in `source_queue.py` via `_MIGRATIONS`
- Update `QueueItem` dataclass with the new fields
- Update `apply_triage_result()` to persist them
- Update `priority_from_triage()` to account for `needs_legal_review`

**Tests:** flag persistence through `apply_triage_result`, `overnight_batch_safe` False for testimony/legal, `needs_book_splitting` True for long docs.

---

### TASK B -- Compact orientation lexicon design

**Corrected framing:** Draft terms are NOT inherently low quality. Many are meaningful,
already-used SOGICE vocabulary that remain draft only because they still need a direct
document evidence citation. The goal is NOT "validated only." It is: separate the
compact, stable orientation set from unreviewed local candidates and noisy one-off
model suggestions.

**Steps:**
1. Inspect Sanity `lexiconEntry` status fields. Run:
   ```
   *[_type == "lexiconEntry"] | {status: status} | group(status)
   ```
2. Count terms at each status. Understand the landscape before deciding anything.
3. Determine with researcher which mechanism marks a term as "orientation-eligible":
   - A new status value: `trusted_draft` or `orientation`
   - A boolean flag on the record: `includeInAnalysisLexicon`
   - Or confirm that `validated` is sufficient once the registry matures
4. Implement `fetch_analysis_orientation_terms(config)` in `sanity_reads.py`
   using the agreed selection criteria
5. Change `analyze._fetch_active_lexicon_terms()` to call the new function
6. Enrichment continues using `fetch_active_lexicon_terms` (full draft+validated)

**Precondition:** researcher decides which draft terms are orientation-eligible.
This is a methodology decision about the registry, not a code configuration choice.

**Tests:** verify new query uses agreed selection; verify audit fields reflect the
new count; verify enrichment is unaffected.

---

### TASK C -- Enrichment audit wiring

**What exists:** `EnrichmentRunMeta` dataclass and `write_enrichment_audit()` are built but not yet wired into `enrich.py`. The `_audit` threading pattern from `analyze.py` should be mirrored.

**What to add:**
- Thread `*, _audit: dict | None = None` through `enrich.run()`, `_call_enrichment_model()`, and `_validate_response()`
- Populate: `llm_flag`, `model`, `input_char_count`, `chunked`, `chunk_count`, `chunks` (per-chunk success/failure), `validation_path`, `validation_attempts`, `normalization_repairs`
- Call `write_enrichment_audit()` from `enrich.save()`
- Thread `_audit` from `main.py` enrich calls

**Tests:** parallel to `test_analysis_audit_wiring.py`.

---

### TASK D -- Enrichment default for normal ingest

**Current state:** `--enrich` is opt-in. Architecture says enrichment should always follow analysis.

**Pending decision:** Flip default to `run_enrich=True` in the ingest command. This adds ~30-90s per document and one more Mac Studio call. For overnight batch this is acceptable; for quick test ingestions the researcher can pass `--no-enrich`.

**Code change (one line once decided):**
```python
# main.py ingest command
run_enrich: bool = typer.Option(True, "--enrich/--no-enrich", help="Run Stage 3c enrichment after analysis")
```

**Researcher must confirm this before implementation** -- it changes ingest timing for all paths.

---

### TASK E -- `runner split-book --preview` CLI

**What exists:** `runner/pipeline/book_splitter.py` is built with 44 tests.
`split_by_headings()`, `merge_short_sections()`, `estimate_section_count()` are all tested.

**What to build:**
```bash
python -m runner split-book book.pdf --preview   # show sections without ingesting
python -m runner split-book book.pdf --batch "sogice-books" --llm litelm
```

**Steps:**
1. Run Docling preprocessing on PDF -> `extracted.md`
2. Call `split_by_headings()` -> list of `BookSection` objects
3. `--preview`: print section count, titles, char counts -- no corpus changes
4. Without `--preview`: ask researcher to confirm, then add sections to source queue as `ready_to_ingest` with `parent_book_id` metadata

**`--preview` only for this slice.** Full queue integration and Sanity `sogiceBook` schema are DEFERRED.

---

### TASK F -- Batch Runner (unblocked after TASK A)

**Why deferred:** Without triage workflow flags (TASK A), the batch runner cannot safely distinguish which items need human oversight vs which can run unattended. Do not build a batch runner that silently ingests testimonies or legal documents without a consent/review gate.

**Design reference:** Full spec preserved in git history (commit `7748aaf3f` -- `NEXT_SESSION.md`
before this rewrite). Recover with `git show 7748aaf3f:NEXT_SESSION.md` if needed.

**Preconditions before building:**
- TASK A complete (triage flags exist and are persisted in source queue)
- `overnight_batch_safe` field on `QueueItem` is queryable
- Batch runner filters out any item with `overnight_batch_safe=False` and surfaces them to the researcher before starting

---

## Future capability notes

### Optional Review/Critic Agent
For complex, legal, testimony, or high-uncertainty documents (triage flags
`complexity=complex`, `doc_type_hint=legal`, `needs_testimony_review=True`, or
analysis `confidence.status=low`), a lightweight second-opinion pass could:
- Run a different model on the analysis output (not the raw document)
- Check internal consistency: do tactic tags align with the summary? Does type
  match the evidence register?
- Read `analysis_audit.json` (validation_path, normalisation_warnings, confidence)
  to decide whether a consistency check is warranted
- Surface discrepancies to the researcher, not replace their review

This is NOT a replacement for human review. It is a pre-review consistency check
that surfaces model-detectable contradictions before the researcher sees the output.
Implement only after the audit sidecar is fully wired (TASKS C + D complete) so the
critic has structured metadata to read.

---

## Deferred (do not pick up without researcher sign-off)

- Streamlit large document settings (Ingest Workbench expander) -- useful but not blocking
- Book aggregation review panel in Streamlit -- needs Sanity `sogiceBook` schema first
- Sanity `sogiceBook` type -- needs researcher approval before schema change
- Supabase IVFFLAT index -- deferred to Phase 2 (sequential scan fine at pilot scale)
- Vercel publish UI -- Phase 1-2

---

## What NOT to touch

- `runner/models/document.py` -- do not change the ingestion-v3.3 output schema
- `02_working_tools/Claude_Ingestion_Prompt.md` -- any change to analysis JOB 2 scope needs researcher sign-off
- `studio/schemas/document.ts` (sogiceDocument) -- no structural changes until book schema is agreed
- Supabase live data -- only `runner verify` and `runner migrate-supabase` touch it
- Active corpus documents -- never re-ingest without `runner reanalyze`
- `.claude/worktrees/objective-hypatia-69d7fe` -- stale worktree, never use this path

---

## Pre-flight before every session

```bash
cd /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest
git status --short --branch
git pull origin claude/review-architecture-70CUm
.venv/bin/python -m pytest --tb=short -q
# Must see: 519 passed (or higher after new tests)
```

---

## Important code locations

| What | File | Location |
|---|---|---|
| Triage system prompt | `runner/pipeline/triage.py` | `_SYSTEM_PROMPT` at top |
| Triage schema | `runner/models/triage.py` | `TriageResult` |
| Triage -> queue wiring | `runner/pipeline/source_queue.py` | `apply_triage_result()` |
| Analysis prompt loading | `runner/pipeline/analyze.py` | `_build_system_prompt_with_lexicon()` |
| Lexicon fetch (analysis) | `runner/pipeline/sanity_reads.py` | `fetch_active_lexicon_terms()` |
| Truncation logic | `runner/pipeline/preprocess.py` | `_maybe_truncate()` at line 654 |
| PDF extraction (Docling) | `runner/pipeline/preprocess.py` | `_preprocess_pdf()` at line 159 |
| Enrichment model routing | `runner/pipeline/enrich.py` | `_call_enrichment_model()` |
| Enrichment chunking | `runner/pipeline/enrich.py` | `_run_chunked_enrichment()`, `_chunk_text()` |
| Audit sidecar writers | `runner/pipeline/audit.py` | `write_analysis_audit()`, `write_enrichment_audit()` |
| Book splitter | `runner/pipeline/book_splitter.py` | `split_by_headings()` |
| Source queue CRUD | `runner/pipeline/source_queue.py` | Full module |
| Sanity schema location | `studio/schemas/` | `document.ts`, `index.ts` |

---

## Open questions

**Q-Lexicon:** Inspect all Sanity `lexiconEntry` status values and counts before TASK B.
Run: `*[_type == "lexiconEntry"] | {status: status} | group(status)`.
Draft terms are NOT low quality -- they await evidence citations, not validity judgement.
The question is: which subset of draft terms are already trusted as orientation vocabulary?

**Q-EnrichDefault:** Architecture confirmed: enrichment should always run after normal
ingest. Code pending (TASK D). Timing/RAM/batch handling must be designed carefully.
The flag flip is trivial; making it safe for overnight batch is not.

**Q-BookSanity:** Should book sections create a new Sanity type (`sogiceBook`) or use
`sogiceDocument` with `parentBook` reference field? New type is cleaner but changes
the Sanity schema. Needs researcher sign-off.

**Q-BatchStop:** Should overnight batch auto-stop if Mac Studio goes offline mid-batch,
or queue items as `failed` and allow resume? Lean toward stop + notify. Auto-resume
risks duplicate Sanity writes if a previous attempt partially succeeded.

**Q23:** RAM usage of `gemma-4-26B-A4B-it` on M4 MacBook 24GB -- test before using as default for heavy docs.

**Q14:** JUST CHANGE(tm) <-> i-Doc integration method -- Phase 4.
**Q18:** Testimony removal formal protocol -- Phase 3 publication.

---

*Updated 2026-05-30 after architecture audit. Previous task specs (batch runner
full implementation, book splitter full pipeline) preserved in git history.*
