# SurvivingSOGICE -- Codex Clean-Start Guide

Use this file to start a new Codex conversation without losing the thread of the
project. It is a companion to `NEXT_SESSION.md`, which is the Claude Code task
handoff. This document is for steering the collaboration: what to trust, what to
verify, how to guide Claude, and how Codex should keep the system coherent.

Generated: 2026-05-31
Repo: `/Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest`
Main working branch: `claude/review-architecture-70CUm`

---

## First Message To Paste Into A New Codex Conversation

```text
We are continuing work on the SurvivingSOGICE ingesting tool.

Please read these two files first:
- /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest/NEXT_SESSION.md
- /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest/CODEX_NEXT_CONVERSATION.md

Then run:
cd /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest
git status --short --branch
git pull origin claude/review-architecture-70CUm
.venv/bin/python -m pytest --tb=short -q

Do not read or copy from:
/Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest/.claude/worktrees/objective-hypatia-69d7fe

Your job is to help implement the tasks in NEXT_SESSION.md, one slice at a time.
Do not assume handoff summaries are correct until you inspect the actual code and test results.
```

---

## What The System Is

SurvivingSOGICE is a solo PhD research archive tool for collecting, classifying,
reviewing, and publishing SOGICE-related documents and media. It is not a generic
scraper and not an autonomous publishing system. The core methodological principle is:

**AI proposes; the researcher validates; the archive preserves provenance.**

The current workflow is:

```text
Source Queue
-> Triage
-> Ingest
-> Preprocess / extract text
-> Embed
-> Analyze
-> Researcher review
-> Enrich
-> Local proposal review
-> Sanity registry validation
-> Supabase semantic search
```

The system already has many moving pieces. The priority for future work is not to add
features for their own sake, but to make the research workflow calmer, safer, and more
auditable for one researcher.

---

## Stage Contracts

These are settled. Do not re-open or collapse them.

SurvivingSOGICE should be described as **role-specialized staged intelligence**:
bounded AI roles run in sequence, with typed outputs, audit files, and human
review gates. This phrase is useful for article/methodology writing because it
captures the design better than "multi-agent automation": the system distributes
labor across specialized stages while keeping interpretation and publication
under researcher control.

**Triage (Stage 0.5) -- routing intelligence**
Determines: doc type hint, complexity, recommended model, whether splitting is needed,
whether media/testimony/legal review is required, whether overnight batch is safe.
Triage does NOT classify. Fast model, short snippet (~3,000 chars).

**Analysis (Stage 3b) -- classification and summary**
Classifies against controlled vocabulary, writes summary, models confidence.
Uses compact orientation lexicon: validated terms plus researcher-trusted draft terms
(those with meaningful SOGICE vocabulary awaiting evidence citation, not noisy
one-off model suggestions). Capped and curated for classification stability.
Flags candidate terms/actors for human review (shallow discovery).
Analysis does NOT mine the document for the lexicon.

**Enrichment (Stage 3c) -- lexicon and registry intelligence**
Mines the full document for lexicon/registry proposals.
Uses draft + validated lexicon + entity registry context.
Connects to existing terms before proposing new ones.
Must distinguish: add_new, add_variant, add_evidence, add_definition,
merge_into, entity/tactic/practice link.
Enrichment does NOT reclassify the document.

**Human review -- the methodological layer**
Nothing becomes archive truth without researcher action.
The pipeline proposes; the researcher decides; the archive records.

---

## Current Truth Sources

Treat these as the highest-value context files:

| File | Purpose |
|---|---|
| `NEXT_SESSION.md` | Claude's task list, settled decisions, code locations |
| `CODEX_NEXT_CONVERSATION.md` | This steering guide |
| `CLAUDE.md` | Operating instructions and project norms for Claude |
| `CODEX_HANDOFF.md` | Older architecture/setup notes (still valid for infra) |
| `runner/main.py` | CLI command surface |
| `runner/app.py` | Streamlit UI |
| `runner/pipeline/triage.py` | Stage 0.5 -- routing |
| `runner/pipeline/analyze.py` | Stage 3b -- classification |
| `runner/pipeline/enrich.py` | Stage 3c -- lexicon/registry |
| `runner/pipeline/source_queue.py` | Pre-ingest queue |
| `runner/pipeline/audit.py` | Audit sidecar writers |
| `runner/pipeline/book_splitter.py` | Book chapter splitter |
| `runner/models/document.py` | Analysis schema |
| `runner/models/enrichment.py` | Enrichment schema |
| `runner/models/triage.py` | Triage schema |
| `runner/pipeline/sanity_reads.py` | Shared Sanity read helpers |

Do not treat old chat summaries as authoritative. Read files and run tests.

---

## Non-Negotiable Guardrails

1. Work only in the main repo:
   `/Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest`

2. Never use stale worktree context:
   `.claude/worktrees/objective-hypatia-69d7fe`

3. Before any implementation, verify:
   ```bash
   git status --short --branch
   git pull origin claude/review-architecture-70CUm
   .venv/bin/python -m pytest --tb=short -q
   ```

4. If Claude says something is fixed, inspect the files and tests before accepting it.

5. Do not touch live Supabase/Sanity data unless the user explicitly asks.

6. Do not re-ingest or overwrite active corpus documents. Use `reanalyze`,
   `discard-doc`, or explicit review flows.

7. Do not make model-routing changes without checking the actual LiteLLM aliases and
   current `.env` assumptions.

8. Preserve the solo-researcher workflow. Avoid features that require team processes,
   complex permissions, or dashboards designed for an organization.

9. Do not change the `ingestion-v3.3` prompt or `enrichment-v1.1` prompt without
   researcher sign-off. These are calibrated tools, not configuration.

10. Enrichment now runs by default after confirmed upload (TASK D complete). The
    opt-out is `--no-enrich`. Do not remove the opt-out or make enrichment blocking
    to the ingest result — it must remain non-fatal.

---

## Current Task Direction

`NEXT_SESSION.md` defines tasks A–G plus review-derived safety tasks G1–G5.
A–E are complete. The first external architecture review (TASK G) is captured.
G1, G2, and G3 are complete.

**✓ A -- Triage workflow routing flags** (commit `3ee358796`)
`needs_book_splitting`, `needs_testimony_review`, `needs_media_review`,
`needs_legal_review`, `overnight_batch_safe`, `suggested_process_route` added to
`TriageResult` and source queue. G1 later flipped the runtime safety default
fail-closed and added `source_queue.is_overnight_safe(item)`.

**✓ B -- Compact orientation lexicon** (commit `4cb1c0e93`)
`includeInAnalysisLexicon` boolean on `lexiconEntry` (default false). Analysis uses
`fetch_analysis_orientation_terms()` — validated + flagged-draft only. Enrichment
unchanged. Researcher must toggle flag in Sanity Studio for trusted draft terms.

**✓ C -- Enrichment audit sidecar** (commit `18ba8da14`)
`_audit` threaded through all enrichment functions. `enrichment_audit.json` written
on every save. Chunked fallback truthfulness fixed. Streamlit wired.

**✓ D -- Enrichment default-on** (commit `65c775319`)
`--enrich/--no-enrich`, default True. Normal ingest now runs enrichment after
confirmed upload. `--no-enrich` skips for quick tests.

**✓ E -- `split-book --preview` CLI** (commit `74a35f847`)
`split-book` command in `main.py`. `_extract_markdown_for_split()` helper routes
by extension/URL (Docling / Trafilatura / direct read). Options: `--min-chars`,
`--max-level`, `--preview-chars`, `--out`. Prints Rich panel + section table. No
corpus writes, no analysis, no upload. 32 new tests (suite was 670 at TASK E;
current baseline is 740).

**✓ G -- Deep architecture review / critic pass** (captured 2026-05-31)
Claude 4.8 reviewed the full staged-intelligence system after TASK E. The review
confirmed the architecture but found fail-open batch-safety and provenance gaps.
It also answered the added review questions:
- Q11: external apps/systems/repos worth evaluating for multimodal analysis
- Q12: future data-use ideas such as network graphs, maps, lexicon genealogy,
  semantic maps, and claim ledgers

**✓ G1 -- Batch safety: triage must fail closed** (commit `9a58cc807`)
`triage.run()` / `_parse()` now return `TriageResult.failed(...)` on
model/network/parse failure (`triage_succeeded=False`,
`overnight_batch_safe=False`). Source queue gained `is_overnight_safe(item)`;
legacy/untriaged/failed rows fail closed.

**✓ G2 -- Batch safety: cross-check triage and analysis gates** (commits
`7b39ea090` -> `1e50d7558`)
Triage is persisted per document; upload backstops can load it; consent gates
cross-check analysis + triage testimony signals; legal review remains separate;
headless `--yes` never prompts and holds testimony/legal-sensitive docs locally
with no upload/enrichment.

**✓ G3 -- Provenance guard: do not clobber reviewed Sanity documents** (commit
`3bdfe91ae`)
`write_document()` blocks replacement of reviewed/corrected `sogiceDocument`
records unless `--force-reviewed` / `--force` is passed through `upload-doc` or
`reanalyze --upload`. Reviewed markers: workflowStatus verified/published,
explicit `aiMetadata.humanReview`, human override resolution, and
manual-researcher validation markers.

**✓ G4 -- Provenance hardening** (`5482bcc17`)
Audit sidecars use schema v2 and include resolved/template prompt hashes,
git commit, runtime/sampling params, duration, derived-score flagging, and
triage audit metadata. Raw-response retention remains default-off and
unimplemented pending researcher sign-off.

**✓ G5 -- Ground or suppress corpus connections** (suppression route)
Ungrounded enrichment `corpus_connections` are stripped by default before
`enrichment.json`; enrichment audit records suppression. Retrieval-grounded
connections remain deferred until vector retrieval is wired.

**✓ F Slice 1-2 -- Batch Runner foundation**
`runner batch-plan` surfaces included/excluded queue items before execution.
`runner batch-run` is guarded: rehearsal by default, `--execute` required, uses
`source_queue.is_overnight_safe(item)` via `plan_batch()`, stops on first ingest
failure, writes a ledger, and marks queue rows ingested only after success. No
live batch run has been performed yet.

Recommended order for a new session:
1. Verify repo/test state (831 passed expected).
2. Use `runner batch-plan` to inspect the queue before any live execution.
3. Add/verify pre-flight checks and morning report before the first attended `batch-run --execute`.
4. Keep DS-5/DS-6/DS-7 deferred unless they become necessary during TASK F planning.

---

## Known State As Of This Handoff

- Tests passing: 831
- Latest completed milestone: TASK F guarded batch-run
- Branch: `claude/review-architecture-70CUm` (up to date with origin)
- Analysis audit: `analysis_audit.json` written on every ingest/reanalyze ✓
- Enrichment audit: `enrichment_audit.json` written on every enrichment save ✓ (TASK C)
- Compact orientation lexicon: `includeInAnalysisLexicon` boolean on `lexiconEntry` ✓ (TASK B)
  - Researcher action needed: toggle flag in Sanity Studio for trusted draft terms
- Enrichment default-on: `--enrich/--no-enrich`, default True ✓ (TASK D)
- Book splitter: `book_splitter.py` module built (44 tests) ✓; `split-book --preview` CLI built ✓ (TASK E)
- Triage workflow flags: built and wired ✓ (TASK A)
- Source-aware queue triage: DOI/journal blockers, social shells, video
  boilerplate, and queue notes now inform model routing ✓
- Deep architecture review: captured as TASK G; findings converted to G1-G5
- External systems/data-use questions: captured in NEXT_SESSION.md under TASK G
- Future applications roadmap/tracker:
  `01_project_docs/FUTURE_APPLICATIONS_ROADMAP_v1.0.md` and
  `01_project_docs/FUTURE_APPLICATIONS_TRACKER.md`
- Reviewed-doc overwrite guard: built ✓ (TASK G3)
- Provenance hardening: built ✓ (TASK G4)
- Corpus-connection suppression: built ✓ (TASK G5)
- Data-structure lock-in DS-1: `AnalysisResult.languages` built ✓; Sanity
  classification language write deferred until schema migration
- Data-structure lock-in DS-3: language/country normalization built ✓
- Data-structure lock-in DS-4: `StatisticalClaim.verification_status` built ✓;
  Sanity schema/write deferred
- Data-structure lock-in DS-2: `NetworkConnection.attested_in_doc` and
  `export_network_edges()` built ✓; Sanity network schema/write deferred
- Batch Runner Slice 1: `runner batch-plan` built ✓
- Batch Runner Slice 2: guarded `runner batch-run` built ✓; live execution still deferred
  - Default is rehearsal-only; `--execute` is required for ingestion.
  - Uses existing ingest path with `yes=True` and `run_triage=False`.
  - Stops on first failure and marks queue rows ingested only after success.
  - Writes ledgers to `exports/batch_ledgers/` unless `--out-dir` is provided.

---

## Concepts That Often Cause Confusion

### Source Queue Status

`ready_to_ingest` does NOT mean ingested. It means the researcher has approved the
source for ingestion. Lifecycle:
```
new -> triaged -> ready_to_ingest -> ingested
                  |
                  -> skipped
```

### Analysis Tags vs Enrichment Proposals

Analysis tags = document-level classifications in `analysis.json`.
Enrichment proposals = candidate lexicon/entity/tactic/practice entries in
`enrichment.json`. They require researcher approval before pushing to Sanity.

Do not collapse these into one concept.

### Lexicon Status Levels (two-layer distinction)

`candidate` -> submitted by model, not yet reviewed
`draft` -> researcher has seen it, not yet fully validated
`validated` -> researcher has confirmed it as canonical registry vocabulary

Analysis orientation lexicon: **validated + researcher-trusted draft terms**. Draft
terms are not low quality -- they await evidence citation, not validity judgement.
The selection mechanism is implemented: `includeInAnalysisLexicon` on `lexiconEntry`
admits trusted drafts; validated terms are included by status. Enrichment context:
**full draft + validated**.

### Registry Validation vs Evidence Confirmation

Registry validation: a term/entity/tactic is confirmed as a valid archive concept.
Evidence confirmation: a quote in a specific document supports that term.

These are separate. The UI must make this distinction obvious.

### Triage Flag vs Analysis Flag

A triage flag (`needs_testimony_review`) is set before ingestion, from a short snippet.
An analysis flag (`Flag: Testimony-Extraction-Required`) is set during classification,
from the full document. Both can be true. Neither is authoritative without human review.

---

## Good Prompts To Give Claude

### Audit Before Implementing

```text
Before coding, inspect the relevant files and tests in the main repo only.
Do not use .claude/worktrees/objective-hypatia-69d7fe.

Report:
1. Which files you inspected.
2. What behaviour exists already.
3. What is actually missing.
4. The smallest safe implementation plan.

Then implement only that plan, add focused tests, run the full suite, commit, and push.
```

### Completed TASK A Reference: Triage Workflow Flags

```text
TASK A is complete. Use this only as historical context when reviewing triage fields.

Current state: routing fields exist; G1 made triage fail closed; callers should
use source_queue.is_overnight_safe(item), not the raw overnight_batch_safe column.
```

### Completed TASK G3 Reference: Reviewed-Document Clobber Guard

```text
TASK G3 is complete. Use this only as historical context when reviewing Sanity
document overwrite behavior.

Current state: write_document guards createOrReplace writes; upload-doc and
reanalyze --upload expose --force-reviewed / --force. Do not bypass this guard
for batch work.
```

### Completed TASK G4 Reference: Provenance Hardening

```text
TASK G4 is complete. Use this only as historical context when reviewing audit
provenance behavior.

Current state: analysis/enrichment/triage audit sidecars use schema v2 and
include resolved/template prompt hashes, git commit, model/runtime params,
duration, and confidence-score provenance.
Raw-response retention remains default-off and unimplemented without researcher
sign-off.
```

---

## Future capability note: Optional Review/Critic Agent

For complex, legal, testimony, or low-confidence documents, a lightweight
consistency pass could check:
- Do tactic tags align with the summary?
- Does the type match the evidence register?
- Are normalisation warnings significant enough to flag?

It reads `analysis_audit.json` (validation_path, normalisation_warnings, confidence)
rather than the raw document. It surfaces discrepancies before researcher review,
not instead of it.

Build only after TASKS C and D are complete so the critic has structured audit
metadata to read. This is NOT a second-opinion model calling the full analysis
prompt -- it is a structured consistency check on the parsed output.

---

## What To Ask Codex To Do

Use Codex to:
- Review Claude's code after implementation
- Decide whether a feature should be built now or deferred
- Simplify confusing UI concepts
- Write prompts for Claude
- Check if documentation and tests match reality
- Produce presentation/methodology explanations

Useful request after any Claude implementation:
```text
Claude says it implemented X. Please inspect the actual code, compare it to the
intended workflow in NEXT_SESSION.md, run the relevant tests, and tell me whether
it is correct or what to send back.
```

---

## Presentation / Methodology Materials

For explaining the system externally:
- `docs/HUMAN_AI_COLLABORATION_SCHEMATIC_PROMPT.md`
- `docs/screenshots/human_ai_workflow/`

Core phrase:

**AI proposes; researcher validates; archive preserves provenance.**

The tool makes candidate structure visible while preserving review,
uncertainty, and provenance. It does not replace archival judgement.

---

## Final Reminder

The system is already complex enough to be powerful and fragile at the same time.
Favour:
- smaller implementation slices
- clearer stage boundaries
- strong tests
- explicit provenance
- researcher control at every consequential step

The next session should start with data-structure lock-in. G1/G2 made overnight
processing safer, G3 protects reviewed Sanity records, G4 hardens audit
provenance, and G5 suppresses ungrounded corpus connections before batch work.
