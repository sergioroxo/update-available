# SurvivingSOGICE -- Codex Clean-Start Guide

Use this file to start a new Codex conversation without losing the thread of the
project. It is a companion to `NEXT_SESSION.md`, which is the Claude Code task
handoff. This document is for steering the collaboration: what to trust, what to
verify, how to guide Claude, and how Codex should keep the system coherent.

Generated: 2026-06-01 (updated post-proposal-identity workflow glue)
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
| `runner/app_provenance.py` | Pure provenance/audit helpers (no st.* — safe to import in tests) |
| `runner/app_entity_resolver.py` | Entity ID resolver helpers (pure — no st.*, no network imports) |
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
G1-G5, DS-1/2/3/4, TASK F, TASK P, the first attended pilot, and the Research
Review Cockpit v1 provenance/audit panel are complete.

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
current baseline is 966).

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

**✓ F Slice 1-4 -- Batch Runner foundation**
`runner batch-plan` surfaces included/excluded queue items before execution.
`runner batch-run` is guarded: rehearsal by default, `--execute` required, uses
`source_queue.is_overnight_safe(item)` via `plan_batch()`, stops on first ingest
failure, writes a ledger, and marks queue rows ingested only after success.
`--execute` also runs preflight checks for Sanity/Supabase credentials, LiteLLM
reachability when needed, and ledger writability before the first ingest. Every
batch-run path writes a Markdown report beside the ledger with counts, stop
reason, failures, and next action.

**✓ First attended pilot -- complete after recovery**
The first one-item pilot exposed a Sanity GROQ parameter encoding bug before
document mutation. After fixing `_query()` in `runner/clients/sanity.py`, doc
`8fe67e19` (`https://transdatalibrary.org/person/avi-ring`) was recovered through
upload, Supabase embedding confirmation, enrichment, and queue linking
(`f52eb82a` -> `ingested`). The original batch ledger remains a failed ledger;
the document status and queue row now reflect the recovered success.

**✓ Research Review Cockpit v1 -- Provenance/Audit panel** (commit `e65c06e75`)
`runner/app_provenance.py` (pure module, 32 tests at v1) provides five helpers:
`_load_analysis_audit`, `_load_enrichment_audit`, `_load_preservation_status_dict`,
`_check_artifact_completeness`, `_collect_provenance_warnings`. The Streamlit app
gains: a doc_id/URL search box in Document List; a `🔍 Provenance / Audit`
expander (⚠️ badged when warnings present) in every doc card; a 9th "Provenance"
tab in the Activity Log inspector. Inline warnings fire for missing languages,
missing date, queue/intake source_type mismatch, and `enrich_existing` proposals
lacking `existing_entity_id`. All four warnings fire for pilot doc `8fe67e19`.

**✓ Research Review Cockpit -- Provenance clarity slice** (commit `54f0ec204`)
Decision-oriented redesign. 55 tests (989 total). `ProvenanceWarning` dataclass
replaces plain strings; three severity levels (`action_needed`, `pre_push_blocker`,
`provenance_note`). New helpers: `_detect_commit_mismatch`, `_generate_researcher_checklist`.
Panel now shows a researcher checklist at top, grouped sections by severity, one-sentence
audit captions, and full hash expanders in both audit sub-tabs. Card expander label
distinguishes 🔴 push blockers / ⚠️ actions needed / ℹ️ notes.

**✓ Research Review Cockpit -- Entity ID resolver + date guidance slice** (commit `74cab7b8c`)
35 new tests (1024 total). New `runner/app_entity_resolver.py`: `normalize_entity_name`
(accent-insensitive), `match_entity_name` (exact/candidate, name+fullName, sorted),
`fill_entity_id_in_enrichment` (local file only, zero Sanity API). New
`fetch_entities_for_resolver` in `sanity_reads.py` (read-only, uncached). New
`_render_entity_resolver` widget in `app.py`: per-proposal "Find in Sanity" button,
exact matches with one-click Use, candidates in expander (never auto-applied), manual
paste option. Date warning now clarifies that `ingested_at` / Wayback capture date ≠
publication date; adds app navigation path and do-not-invent-date caution.

**Completed design task:** stable proposal identity / proposal lifecycle model is now
implemented locally (P1/P2/P3). Future work may add a per-proposal push audit trail
or cross-document canonical identity, but do not expand that before the pilot exposes
a concrete need.

Recommended order for a new session:
1. Verify repo/test state (1081 passed expected).
2. Open app → Document List or Activity Log → search `8fe67e19`. Complement enrichment
   is available in the card, Activity Log → Enrichment, and Provenance → Enrichment Audit.
3. Use entity ID resolver for any remaining `enrich_existing` proposals and repair
   network connection warnings with the local dropdown before approving.
4. Run `push-enrichment 8fe67e19`.
5. Use `runner batch-plan` to inspect the queue before the next live execution.
6. Run a 2-3 item attended pilot before any overnight use.
7. Keep DS-5/DS-6/DS-7 deferred unless they become necessary during TASK F planning.

---

## Known State As Of This Handoff

- Tests passing: 1081
- Latest completed milestone: Proposal identity P1/P2/P3 + workflow glue
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
- Batch Runner Slice 2: guarded `runner batch-run` built ✓; one-item pilot completed after recovery
  - Default is rehearsal-only; `--execute` is required for ingestion.
  - Uses existing ingest path with `yes=True` and `run_triage=False`.
  - Stops on first failure and marks queue rows ingested only after success.
  - Writes ledgers to `exports/batch_ledgers/` unless `--out-dir` is provided.
- Batch Runner Slice 3: preflight checks built ✓
  - Blocks live execution on missing/placeholder Sanity/Supabase credentials.
  - Probes LiteLLM only when an included item routes through `litelm*`.
  - Checks ledger directory writability before starting.
  - Rehearsal mode skips preflight; `--skip-preflight` is danger-labelled for tests.
- Batch Runner Slice 4: Markdown batch report built ✓
  - Writes `{batch_id}_report.md` beside every ledger.
  - Covers rehearsal, no eligible items, preflight failure, execution failure, and success.
  - Includes raw stop reason, manifest/item counts, queue notes, failure detail, and next action.
- TASK P preservation status built ✓
  - `preservation_status.json` is written after preprocessing when a local doc dir exists.
  - Records public Wayback status, local HTML path/hash, capture-needed state, notes, and suggested route.
  - Routes blocker/dynamic pages to `browsertrix`, DOI/journal poor extraction to `manual_pdf`, social pages to `screenshot`, and video/audio URLs to `media_metadata`.
  - Does not integrate or run Browsertrix, ArchiveBox, Arquivo.pt, Perma.cc, Scoop, or MemGator.
- Pilot result: first one-item pilot stopped before Sanity mutation because
  `_query()` sent raw GROQ params (`$doc_id=doc-...`). Fixed by JSON-encoding
  query params in `runner/clients/sanity.py`; recovered doc `8fe67e19` is
  uploaded to Sanity, present in Supabase, enriched locally, and queue-linked to
  source item `f52eb82a`.
- Research Review Cockpit v1 — Provenance/Audit panel built ✓ (`e65c06e75`)
  - `runner/app_provenance.py`: 5 pure helpers, no Streamlit dependency, 32 tests at v1.
  - Document List: doc_id/URL search box; provenance expander per doc card.
  - Activity Log: 9th "Provenance" tab with Analysis Audit, Enrichment Audit,
    Preservation, and Artifacts sub-tabs.
  - Inline warnings: missing languages, missing date, queue/intake source_type
    mismatch, `enrich_existing` missing `existing_entity_id`.
  - Pilot doc `8fe67e19` shows all 4 expected warnings.
- Research Review Cockpit provenance clarity slice built ✓ (`54f0ec204`)
  - `ProvenanceWarning` dataclass: severity/title/explanation/suggested_action/source_fields.
  - `_detect_commit_mismatch`: provenance_note when analysis and enrichment git commits differ.
  - `_generate_researcher_checklist`: list[str] of titles for action_needed + pre_push_blocker.
  - Panel: researcher checklist at top, grouped sections by severity, audit captions, full hash expanders.
  - Card expander: 🔴 push blockers / ⚠️ actions needed / ℹ️ notes (auto-expands only for blockers/actions).
  - 55 provenance tests; 989 total.
- Research Review Cockpit entity ID resolver + date guidance slice built ✓ (`74cab7b8c`)
  - New `runner/app_entity_resolver.py`: normalize_entity_name, match_entity_name (exact/candidate, accent-insensitive), fill_entity_id_in_enrichment (local file only).
  - New `fetch_entities_for_resolver` in `sanity_reads.py`: read-only, uncached, returns _id+_type+name+fullName.
  - `_render_entity_resolver` Streamlit widget: "Find in Sanity" button, exact-match Use buttons, candidate expander, manual paste. Never auto-applies candidates. Calls st.rerun() after fill so warning disappears.
  - Date warning: ingested_at / Wayback capture date explicitly distinguished from publication date. App navigation path added. "Do not invent a date" caution added.
  - All five warning types now include app navigation paths and required/safe-to-ignore labels.
  - 35 new tests; 1024 total.
- Proposal identity P1/P2/P3 built ✓
  - P1: `proposal_id` (deterministic SHA-256, `prop-` prefix, 16-char hex), `proposal_created_at`, `proposal_updated_at` on all reviewable proposal models. `NetworkConnection.repair_note`, `invalid_connection_type`, and `connection_repair_status` capture invalid connection_type repairs.
  - P2: `proposal_status` ("pending"/"approved"/"rejected"/"pushed") synced from booleans in normalization and all approve/reject/push callbacks. `_proposal_review_status()` reads `proposal_status` first, falls back to booleans.
  - P3: `save()` merge — match by proposal_id and legacy/canonical aliases, carry researcher fields, append dropped proposals, concatenate researcher_notes. Old proposals never silently discarded.
  - Workflow glue: Complement enrichment is available from Document List, Activity Log → Enrichment, and Provenance → Enrichment Audit. `merge_summary` persists in `enrichment_audit.json` and renders as preserved/new/kept counts.
  - Network connection repair dropdown in the entity editor lets the researcher choose an allowed type locally before approval/push.
  - P4: Design note in `_proposal_semantic_key()` for future cross-doc canonical identity.
  - New helpers: `_generate_proposal_id`, `_derive_proposal_status`, `_build_old_proposal_index`, `_apply_researcher_fields`, `_merge_researcher_state`.
  - 1081 total tests passing.

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
