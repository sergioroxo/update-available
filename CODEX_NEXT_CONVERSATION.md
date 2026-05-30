# SurvivingSOGICE -- Codex Clean-Start Guide

Use this file to start a new Codex conversation without losing the thread of the
project. It is a companion to `NEXT_SESSION.md`, which is the Claude Code task
handoff. This document is for steering the collaboration: what to trust, what to
verify, how to guide Claude, and how Codex should keep the system coherent.

Generated: 2026-05-30
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

10. Do not flip the enrichment code default until TASK D implements safe
    timing/RAM/batch behavior and preserves an explicit opt-out (`--no-enrich`
    for quick tests). The architecture decision itself is confirmed: enrichment
    should normally run after analysis.

---

## Current Task Direction

`NEXT_SESSION.md` defines tasks A through F in priority order:

**A -- Triage workflow flags** (NEXT)
Adds `needs_book_splitting`, `needs_testimony_review`, `needs_media_review`,
`needs_legal_review`, `overnight_batch_safe`, `suggested_process_route` to
`TriageResult` and source queue. Required before building the Batch Runner.

**B -- Compact orientation lexicon design**
Draft terms are NOT low quality -- many are meaningful SOGICE vocabulary awaiting
evidence citation. Goal: separate the trusted orientation set from unreviewed
candidates. Inspect Sanity status fields, count terms, agree with researcher on
selection criteria (new status, flag, or curation), then implement the split.
Enrichment continues using full draft+validated. Researcher decides the criteria.

**C -- Enrichment audit wiring**
Thread `_audit` through `enrich.py`. Mirrors the analysis audit wiring already done.
`EnrichmentRunMeta` is built; just needs threading.

**D -- Enrichment default**
Flip `run_enrich` to default True. Researcher must confirm timing implications first.

**E -- `split-book --preview` CLI**
Build the `runner split-book` command using the existing `book_splitter.py` module.
`--preview` mode first; full queue integration deferred.

**F -- Batch Runner** (AFTER Task A)
Do not build until triage workflow flags exist. The batch runner must read
`overnight_batch_safe` before processing items unattended.

Recommended order for a new session:
1. Verify repo/test state (519 passed expected).
2. Start with TASK A -- it is the smallest and unblocks the most.
3. One slice per session, with tests, before moving to the next.

---

## Known State As Of This Handoff

- Tests passing: 519 (up from 409 at start of this session arc)
- Last commit: `627386de3` -- Wire analysis audit sidecar generation
- Branch: `claude/review-architecture-70CUm` (1 commit ahead of origin after push)
- Analysis audit: `analysis_audit.json` written on every ingest/reanalyze
- Enrichment audit: infrastructure built, not yet wired
- Book splitter: `book_splitter.py` module built (44 tests); CLI not yet built
- Triage workflow flags: NOT YET BUILT (TASK A)
- Compact orientation lexicon design: NOT YET BUILT (TASK B) -- requires Sanity status inspection and researcher decision on selection criteria
- Enrichment default (always-on): architecture confirmed; code pending (TASK D) -- timing/RAM/batch behavior requires careful handling

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
The exact selection mechanism is TASK B (inspect Sanity fields, agree criteria with
researcher, implement). Currently uses all draft+validated, which is the known gap.
Enrichment context: **full draft + validated** (correct now and after TASK B).

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

### TASK A: Triage Workflow Flags

```text
Implement TASK A from NEXT_SESSION.md: add workflow routing flags to TriageResult.

Scope:
- Add fields to TriageResult: needs_book_splitting, needs_testimony_review,
  needs_media_review, needs_legal_review, overnight_batch_safe (bool, default True),
  suggested_process_route (str, default "standard")
- Update triage system prompt to return these fields
- Add DB columns to source_queue.py via _MIGRATIONS
- Update QueueItem dataclass with new fields
- Update apply_triage_result() to persist them

Add tests for flag persistence and routing logic.
Run full test suite. Commit. Push.
```

### TASK E: split-book --preview

```text
Implement TASK E from NEXT_SESSION.md: the split-book CLI command.

Scope:
- New runner split-book command in main.py
- --preview flag: run Docling on the PDF, call split_by_headings(), print
  section count, titles, char counts. No corpus or queue changes.
- Without --preview: ask researcher to confirm, then add sections to source queue
  with parent_book_id metadata.

Use the existing book_splitter.py module. Do not change book_splitter.py.
Add tests for --preview output format.
Run full test suite. Commit. Push.
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

The next session should start with TASK A (triage workflow flags). It is the smallest
slice that unblocks the most: Batch Runner, overnight safety, and correct document
routing all depend on triage returning trustworthy workflow signals.
