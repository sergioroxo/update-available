# SurvivingSOGICE -- Next Session Handoff
**Generated:** 2026-05-31
**Branch:** `claude/review-architecture-70CUm`
**Repo:** `/Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest`
**Tests passing:** 933
**Latest completed milestone:** TASK P preservation status

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

This system is best understood as **role-specialized staged intelligence**:
separate AI roles perform bounded tasks in sequence, each with typed outputs,
audit sidecars, and human review gates. It is not an autonomous truth-making
machine and not a pile of interchangeable agents. The design goal is trust
through transparency: the researcher can inspect what each stage saw, decided,
and failed to connect.

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
| Ingestion | `runner ingest <url> --llm litelm` | Working — enrichment runs by default |
| Re-analysis | `runner reanalyze <doc_id>` | Working |
| Enrichment (standalone) | `runner enrich <doc_id>` | Working, uses Gemma4 |
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

tests/                          # 933 tests -- run before every edit
02_working_tools/
├── Claude_Ingestion_Prompt.md  # ingestion-v3.3 -- analysis system prompt
└── ENRICHMENT_PROMPT_v1.0.md   # enrichment-v1.1 -- enrichment system prompt
```

### Audit infrastructure (complete)
- `runner/pipeline/audit.py` -- `AnalysisRunMeta`, `EnrichmentRunMeta`, write functions
- `analysis_audit.json` written beside `analysis.json` on every ingest/reanalyze
  - Fields: llm_flag, model, input_char_count, input_truncated,
    lexicon_terms_available, lexicon_terms_injected, lexicon_injection_cap,
    raw_response_chars, validation_path, validation_attempts, confidence, doc_type, errors
- `enrichment_audit.json` written beside `enrichment.json` on every enrichment run (TASK C complete)
  - Fields: llm_flag, model, input_char_count, chunked, chunk_count, chunks,
    whole_doc_fallback_reason, validation_path, validation_attempts, normalization_repairs, errors

---

## Model stack -- Mac Studio M2 Ultra 64GB via LiteLLM/Tailscale

| Role | LiteLLM alias | Actual model | `--llm` flag |
|---|---|---|---|
| Default analysis | `core-qwen` | `qwen3.6:35b-a3b` (MoE, ~3B active) | `litelm` |
| Heavy / long docs | `core-gemma` | `gemma4:31b` | `litelm-heavy` |
| Second opinion | `review-qwen` | `qwen3.6:27b` (dense) | `litelm-reasoning` |
| Enrichment | `lexicon-llm` | `qwen3.6:35b-a3b` | (auto, set in env/config) |
| Triage | `triage` | `gemma4:e4b` | (auto with --triage) |
| Embedding | `research-embedding` | `qwen3-embedding:8b` | (auto with litelm*) |

**MoE note:** `core-qwen` is faster AND larger than `review-qwen` (27B dense).
Use `litelm` as the default for 85% of documents. Use `litelm-reasoning` only
when triage flags `complexity=complex` or `doc_type_hint=legal`.

**MacBook fallback:** `--llm local` (qwen3.5:9b), `--llm local-heavy` (gemma-4-26B, check RAM).

---

## Settled decisions -- do not re-open

1. **Enrichment model = `lexicon-llm`.** Current code/config defaults Stage 3c to `LITELM_ENRICHMENT_MODEL=lexicon-llm` (Qwen). `core-gemma` remains the alt/second-opinion enrichment route via `LITELM_ENRICHMENT_MODEL_ALT`.
2. **Books require chapter splitting, not full-document ingestion.** `book_splitter.py` module is built. The `split-book --preview` CLI command is built (TASK E complete). Full queue integration and Sanity `sogiceBook` schema remain deferred (see Q-BookSanity).
3. **Batch size = 10-15 documents per review cycle.**
4. **Default model = `--llm litelm` (core-qwen, 35B MoE).** Use `litelm-reasoning` only for triage-flagged complex/legal docs.
5. **Compact orientation lexicon for analysis -- implemented (TASK B).** Selection
   mechanism: `includeInAnalysisLexicon` boolean on `lexiconEntry` in Sanity (default
   false). Analysis fetches `validated` + `draft && includeInAnalysisLexicon==true`,
   ordered deterministically (status desc, term asc), capped at 200. Enrichment continues
   using full draft+validated. **Researcher action required:** toggle trusted draft terms
   in Sanity Studio with "Include Draft in Analysis Orientation Lexicon".
6. **Enrichment runs by default after normal ingest -- implemented (TASK D).** Use
   `--no-enrich` to skip for quick tests or when Mac Studio is offline. Enrichment is
   non-fatal: a failure does not affect the already-completed ingest. Safety gates
   unchanged: enrichment only fires on confirmed upload (testimony-pending and
   upload-declined paths remain blocked).

---

## TASKS (in priority order)

---

### ~~TASK A~~ -- Triage workflow routing flags ✓ COMPLETE

Added to `TriageResult`: `needs_book_splitting`, `needs_testimony_review`,
`needs_media_review`, `needs_legal_review`, `overnight_batch_safe` (introduced
in TASK A, later flipped fail-closed by G1), `suggested_process_route` (default
"standard"). DB columns added to `source_queue.py` via `_MIGRATIONS`.
`apply_triage_result()` persists all flags. `priority_from_triage()` accounts for
`needs_legal_review`. **Commit:** `3ee358796`

---

### ~~TASK B~~ -- Compact orientation lexicon ✓ COMPLETE

`includeInAnalysisLexicon` boolean added to `lexiconEntry` Sanity schema (default false).
`fetch_analysis_orientation_terms()` added to `sanity_reads.py`: queries
`status == "validated" || (status == "draft" && includeInAnalysisLexicon == true)`,
ordered `status desc, term asc` for deterministic cap behaviour.
`analyze._fetch_active_lexicon_terms()` now calls the orientation function.
Enrichment unchanged — still uses `fetch_active_lexicon_terms()` (full draft+validated).
New draft entries from `push-enrichment` start with `includeInAnalysisLexicon=False`.
**Researcher action required:** toggle trusted draft terms in Sanity Studio.
**Commit:** `4cb1c0e93`

---

### ~~TASK C~~ -- Enrichment audit sidecar wiring ✓ COMPLETE

`_audit` dict threaded through `enrich.run()`, `_call_enrichment_model()`,
`_validate_response()`, `_run_chunked_enrichment()`, and `enrich.save()`.
`enrichment_audit.json` written on every save. Chunked fallback truthfulness fixed
(whole-doc failure state never leaks into audit when chunked succeeds).
`whole_doc_fallback_reason` persists in `EnrichmentRunMeta`. Streamlit wired.
**Commit:** `18ba8da14`

---

### ~~TASK D~~ -- Enrichment default-on ✓ COMPLETE

`run_enrich` flipped from `False/--enrich` to `True/--enrich/--no-enrich` in the
ingest command. Enrichment now runs by default after confirmed upload. Pass
`--no-enrich` to skip for quick tests or when Mac Studio is offline. Streamlit
`_blank_ingest_state()` also starts with `run_enrich=True`. Safety gates unchanged.
**Commit:** `65c775319`

---

### ~~TASK E~~ -- `runner split-book --preview` CLI ✓ COMPLETE

`_extract_markdown_for_split()` module-level helper in `main.py` routes by
extension/URL (Docling for PDF/EPUB/DOCX, Trafilatura for URLs, direct read for
.md/.txt). `split-book` command options: `--min-chars` (3000), `--max-level`
(2), `--preview-chars` (200), `--out`. Prints a Rich panel (source, tool,
total chars, estimated vs actual section count) plus a table of sections
(index, level, title, chars, preview). `--out` writes JSON with section offsets.
No corpus writes, no analysis, no upload, no Sanity/Supabase calls.
Full queue integration and Sanity `sogiceBook` schema remain deferred.
**32 new tests (suite was 670 at TASK E; current baseline is 740). Commit:** `74a35f847`

---

### ~~TASK G~~ -- External architecture review / critic pass ✓ CAPTURED

Claude 4.8 completed the first deep architecture review after TASK E. The review
confirmed that the staged architecture is coherent, but found batch-safety and
provenance gaps that must be addressed before unattended overnight operation.

The review explicitly included the two added researcher questions:
- **Q11:** Are there apps, systems, or repositories that would improve this
  multimodal analysis?
- **Q12:** What new/fresh uses of the collected data become possible (network
  analysis, maps, lexicon genealogy, semantic maps, claim ledgers, etc.)?

**Key conclusion:** Do not build TASK F yet. First close the fail-open paths and
provenance gaps below. A Batch Runner with silent gaps is worse than no Batch Runner.

**External systems to evaluate later (not immediate implementation):**
- WhisperX / whisper.cpp for timestamped multilingual transcription and diarization
- marker / surya as OCR/layout fallbacks for structureless PDFs
- GROBID for academic PDF references and citation extraction
- Label Studio or Argilla for human adjudication/calibration workflows
- fastText or lingua for deterministic language ID checks
- DVC or git-annex for versioned corpus/audit reproducibility
- Neo4j / Gephi / networkx for entity and funding network analysis

**Future data-use directions to preserve in the roadmap:**
- Actor/funding network graph from entity `NetworkConnection` edges
- Lexicon genealogy / euphemism-evolution graph from `TermRelationship`
- Geographic spread map and timeline from `geographic_scope` + dates
- Tactic co-occurrence / framing matrix
- Semantic corpus map once embeddings and pgvector are verified
- Claim/fact-check ledger from `statistical_claims`
- Multilingual SOGICE glossary from variants/translations

**Roadmap/tracker artifacts:**
- `01_project_docs/FUTURE_APPLICATIONS_ROADMAP_v1.0.md` — narrative strategy/design reference.
- `01_project_docs/FUTURE_APPLICATIONS_TRACKER.md` — working checklist for follow-up steps, outputs, external tools, data structures, and do-not-build-yet decisions.

---

### ~~TASK G1~~ -- Batch safety: triage must fail closed ✓ COMPLETE

`triage.run()` / `_parse()` now return a fail-closed `TriageResult.failed(...)`
on model/network/parse failure (`triage_succeeded=False`,
`overnight_batch_safe=False`). Added `triage_succeeded` field. Source queue gained
`is_overnight_safe(item)` — True only for triaged/ready items with a recorded
triage model, the safe flag set, and no special-review flag; legacy/untriaged
rows fail closed. `queue-triage` now persists a failed triage instead of leaving
a stale default-safe row. **Commit:** `9a58cc807`

---

### ~~TASK G2~~ -- Batch safety: cross-check triage and analysis gates ✓ COMPLETE

The full cross-stage policy is live in the ingest path:
- **G2-a** (`7b39ea090`): triage result persisted to `triage_result.json` after
  intake acceptance; `upload.load_triage_result()` loads it (tolerates absence).
- **G2-b-1** (`5bf15c436`): `requires_consent_gate(analysis, triage_result=None)`
  fires on testimony_flag OR consent-gated type OR triage `needs_testimony_review`;
  separate `requires_legal_review(...)` helper (legal ≠ consent; `legal_status`
  is not a trigger); hard testimony backstop in both `upload.run` and
  `upload_saved`.
- **G2-b-2a** (`726623bf6`): `checkpoint_testimony_consent(..., triage_result=None,
  yes=False)` — headless never prompts (gated → held `pending`); consent-gated
  types now prompt in attended mode (intentional tightening).
- **G2-b-2b** (`1e50d7558`): `main.ingest` resolves triage from disk under `--yes`,
  passes `triage_result`/`yes` to the checkpoint, holds testimony/legal-sensitive
  docs locally (no upload, no enrichment) with distinct testimony-pending vs
  legal-review-hold panels; attended legal warns then defers to the researcher.

---

### ~~TASK G3~~ -- Provenance guard: do not clobber reviewed Sanity documents ✓ COMPLETE

`write_document()` now checks existing `sogiceDocument` records before
`createOrReplace`. It blocks replacement when Sanity shows reviewed/corrected
state via `workflowStatus` (`verified` / `published`), explicit
`aiMetadata.humanReview`, `aiMetadata.resolution=human_override`, or manual
validation override markers. `upload-doc` and `reanalyze --upload` accept
`--force-reviewed` / `--force` for explicit researcher override. Initial ingest
and upload paths fail closed by default. **Commit:** `3bdfe91ae`

---

### ~~TASK G4~~ -- Provenance hardening for methodology chapter ✓ COMPLETE

Audit sidecars now carry reproducibility metadata for methodology defense:
- `prompt_sha256` for the resolved prompt text actually sent to the model.
- `prompt_template_sha256` for the bare prompt template before runtime injections.
- Audit `schema_version` is `2` for G4 and `3` after G5 enrichment-audit fields.
- Current git commit hash where available.
- Model sampling/runtime parameters and wall-clock duration.
- `score_derived_from_status` for confidence scores filled from status defaults.
- `triage_audit.json` beside `triage_result.json`, including failure/default path metadata.

Raw-response retention remains deliberately off and was not implemented; add an
opt-in `--keep-raw` only after researcher sign-off.

---

### ~~TASK G5~~ -- Ground or suppress ungrounded corpus connections ✓ COMPLETE

**Finding:** Enrichment currently asks for `corpus_connections` while vector
similarity is deferred. Without actual related-doc context, these connections
are hallucination-prone.

Current implementation chooses the conservative suppression route:
- `CorpusConnection` now has review/grounding fields for future retrieval-grounded use.
- Enrichment defaults to `retrieval_grounded=False`.
- `_normalize_enrichment_payload()` strips incoming `corpus_connections` unless retrieval grounding is explicitly enabled.
- Runtime enrichment prompt instructs the model to return `corpus_connections: []` when no related corpus documents are injected.
- `enrichment_audit.json` records `corpus_connections_suppressed` and `corpus_connections_suppression_reason`.
- Audit `schema_version` is now `3`.

Retrieval remains deferred: finish embedding verification / `vector(4096)`
migration before enabling semantic maps, related-document search, or corpus
connection claims.

---

### NEXT -- Data-structure lock-in

Before TASK F scales ingestion, lock in the data structures that future exports
will depend on:
- DS-1 complete: `AnalysisResult.languages` is now a first-class field,
  serialized into `analysis.json`, and counted by corpus stats. Sanity
  `classification.languages` is deliberately deferred until a schema migration.
- DS-3 complete: analysis language values normalize to ISO 639-1 codes and
  common country aliases normalize to canonical full names at validation time.
- DS-4 complete: `StatisticalClaim.verification_status` now tracks
  `unverified`, `verified`, `disputed`, `debunked`, or `unverifiable` in
  `enrichment.json`. Sanity write/schema migration is deferred.
- DS-2 complete: `NetworkConnection.attested_in_doc` is first-class locally and
  `export_network_edges()` returns graph-ready edge rows from enrichment files.
  Sanity `networkConnections[]` schema/write support remains deferred pending
  researcher sign-off.
- Stable document/entity/term IDs and review-time enforcement of existing IDs.
- Temporal axis conventions (`document_date`, future `first_attested`).

---

### TASK F -- Batch Runner (Slices 1-4 complete; live execution still deferred)

**Status:** G1 + G2 are complete, G3 protects reviewed Sanity records, G4 hardens
provenance, G5 suppresses ungrounded corpus connections, and DS-1/2/3/4 lock in
the immediate export-critical structures.

**Slice 1 complete:** `runner batch-plan` now builds a dry-run manifest from the
source queue. It applies `source_queue.exclusion_reason()` / `is_overnight_safe()`,
enforces the 15-item hard cap, surfaces included/excluded rows with stable
reasons, and can optionally write manifest JSON with `--out`. It does not ingest,
analyze, enrich, upload, or mutate queue statuses.

**Slice 2 complete:** `runner batch-run` now adds a guarded execution path. By
default it is rehearsal-only and writes a ledger with `not_executed` rows. Passing
`--execute` processes only manifest-included items through the existing
`ingest(..., yes=True, run_triage=False)` path, stops on the first failure, writes
a JSON ledger to `exports/batch_ledgers/` (or `--out-dir`), and marks queue rows
`ingested` only after successful ingest. No live batch execution has been run in
this session.

**Slice 3 complete:** `runner batch-run --execute` now runs preflight checks before
the first ingest. It blocks on missing/placeholder Sanity credentials
(`SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_WRITE_TOKEN`), missing/placeholder
Supabase credentials, missing/unreachable LiteLLM when any included item routes
through `litelm*`, and an unwritable ledger directory. Rehearsal mode skips live
checks. `--skip-preflight` exists for isolated tests only and is danger-labelled.

**Slice 4 complete:** every `runner batch-run` exit path now writes a Markdown run
report beside the ledger (`{batch_id}_report.md`). Reports cover rehearsal,
no-eligible-items, preflight failure, execution failure, and success. They include
batch id, mode, generated time, result, raw stop reason, manifest counts, item
status counts, queue notes, failed item URL/error when present, ledger path, and
a deterministic next action.

**Queue triage improvement:** triage now passes URL-derived source hints into
the model, so DOI/journal pages blocked by Cloudflare route as academic but
not overnight-safe, social media shells route as social/media, and YouTube
boilerplate routes as media/transcript work rather than generic footer text.

**Next sequence:** inspect `runner batch-plan`, let preflight run, and use a tiny
attended pilot batch before any overnight use.

**Design reference:** Full spec preserved in git history (commit `7748aaf3f` -- `NEXT_SESSION.md`
before this rewrite). Recover with `git show 7748aaf3f:NEXT_SESSION.md` if needed.

**Preconditions (now met by G1/G2):**
- TASK G1 complete ✓: triage failures and untriaged items are not overnight-safe
- TASK G2 complete ✓: triage/analysis testimony/legal flags are cross-checked
- Batch runner must filter via `source_queue.is_overnight_safe(item)` (never query
  `overnight_batch_safe` directly) and surface excluded items before starting
- Headless batch mode must never block on interactive testimony consent prompts
  (the consent checkpoint is already headless-safe as of G2-b-2a)

---

### ~~TASK P~~ -- Preservation fallback/status hardening ✓ COMPLETE

`runner/pipeline/preservation.py` now assesses existing preservation signals
without adding dependencies or running live captures. After preprocessing, the
pipeline writes `preservation_status.json` beside document artifacts. It records
whether HTML was captured, whether additional capture is needed, the public
Wayback status, local HTML path/hash, notes, and a suggested route such as
`browsertrix`, `manual_pdf`, `screenshot`, or `media_metadata`.

The assessment is non-fatal and uses only existing signals: source type/domain,
Wayback status, preprocessing quality, local HTML SHA-256/path, and blocker text
in captured HTML. Social pages are routed to screenshot capture even if intake
classified them as possible media; YouTube/video/audio URLs route to media
metadata/transcript review; DOI/journal pages with poor extraction route to
manual PDF capture. Browsertrix/ArchiveBox/Arquivo.pt/Perma.cc/MemGator remain
evaluation candidates, not integrated dependencies.

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
# Must see: 933 passed (or higher after new tests)
```

---

## Important code locations

| What | File | Location |
|---|---|---|
| Triage system prompt | `runner/pipeline/triage.py` | `_SYSTEM_PROMPT` at top |
| Triage schema | `runner/models/triage.py` | `TriageResult` |
| Triage -> queue wiring | `runner/pipeline/source_queue.py` | `apply_triage_result()` |
| Analysis prompt loading | `runner/pipeline/analyze.py` | `_build_system_prompt_with_lexicon()` |
| Lexicon fetch (analysis) | `runner/pipeline/sanity_reads.py` | `fetch_analysis_orientation_terms()` |
| Lexicon fetch (enrichment) | `runner/pipeline/sanity_reads.py` | `fetch_active_lexicon_terms()` (full draft+validated) |
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

**~~Q-Lexicon~~** -- Resolved by TASK B. Selection mechanism: `includeInAnalysisLexicon`
boolean on `lexiconEntry`. Researcher must toggle this in Sanity Studio for trusted
draft terms before the orientation lexicon is populated.

**~~Q-EnrichDefault~~** -- Resolved by TASK D. Enrichment runs by default after confirmed
upload. Opt-out with `--no-enrich`. Safety gates (testimony-pending, upload-declined)
unchanged.

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

*Updated 2026-05-31. TASKS A–E complete. TASK G review captured. G1 + G2 + G3 + G4 complete and pushed. G5 complete and pushed (`7638ff07c`). Data-structure lock-in DS-1, DS-2, DS-3, and DS-4 complete. TASK F Slice 1 dry-run batch plan, Slice 2 guarded `batch-run`, Slice 3 preflight checks, and Slice 4 batch reports are complete. TASK P preservation status sidecar is complete. Queue triage is source-aware for blocked DOI/journal, social, and video URLs, and queue notes inform retries. 933 tests passing. Recommended next order: tiny attended pilot batch before any overnight use.*
