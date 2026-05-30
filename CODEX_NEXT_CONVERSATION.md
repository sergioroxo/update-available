# SurvivingSOGICE — Codex Clean-Start Guide

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

Your job is to help me steer the system, review Claude's work, and keep the project coherent.
Do not assume Claude's summaries are correct until you inspect the actual code and test results.
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
→ Triage
→ Ingest
→ Preprocess / extract text
→ Embed
→ Analyze
→ Researcher review
→ Enrich
→ Local proposal review
→ Sanity registry validation
→ Supabase semantic search
```

The system already has many moving pieces. The priority for future work is not to add
features for their own sake, but to make the research workflow calmer, safer, and more
auditable for one researcher.

---

## Current Truth Sources

Treat these as the highest-value context files:

| File | Purpose |
|---|---|
| `NEXT_SESSION.md` | Claude's next-task handoff and implementation plan |
| `CODEX_NEXT_CONVERSATION.md` | This Codex steering guide |
| `CLAUDE.md` | Operating instructions and project norms for Claude |
| `CODEX_HANDOFF.md` | Older but useful architecture/setup notes |
| `runner/main.py` | CLI command surface |
| `runner/app.py` | Streamlit UI, large monolith |
| `runner/pipeline/source_queue.py` | Pre-ingest source queue |
| `runner/pipeline/analyze.py` | LLM analysis stage |
| `runner/pipeline/enrich.py` | Enrichment/proposal stage |
| `runner/pipeline/preprocess.py` | Extraction and truncation |
| `runner/pipeline/upload.py` | Local save, Sanity/Supabase upload |
| `runner/models/document.py` | Analysis schema |
| `runner/models/enrichment.py` | Enrichment schema |

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

4. If Claude says something is fixed, Codex should inspect the files and tests before
   accepting it.

5. Do not touch live Supabase/Sanity data unless the user explicitly asks for that
   operational action.

6. Do not re-ingest or overwrite active corpus documents casually. Use `reanalyze`,
   `discard-doc`, or explicit review flows.

7. Do not make model-routing changes without checking the actual LiteLLM aliases and
   current `.env` assumptions.

8. Preserve the solo-researcher workflow. Avoid features that require team processes,
   complex permissions, or dashboards designed for an organization.

---

## How Codex Should Work With Claude

Claude is useful for broad implementation passes and code editing. Codex should act as
the system steward:

- turn vague user needs into precise implementation prompts;
- audit Claude's completed work against the codebase;
- check whether a proposed feature improves the research workflow or just adds noise;
- keep the architecture from drifting into duplicate validation systems;
- decide which tasks should be deferred;
- write clean handoff prompts when Claude needs to continue.

When Claude returns a summary, Codex should usually do this:

1. Read the changed files.
2. Run or inspect the relevant tests.
3. Compare the result to the user's actual need.
4. Identify UI/terminology confusion before adding another feature.
5. Suggest the next smallest useful step.

---

## Current Claude Task Direction

`NEXT_SESSION.md` currently proposes these main tasks:

1. **Overnight Batch Runner**
   - A Streamlit + CLI flow to process `ready_to_ingest` Source Queue items serially.
   - Should use subprocesses, persistent JSON job files, and clear stop/fail behaviour.
   - This is useful, but must stay conservative: no autonomous bulk ingest without
     clear researcher approval.

2. **Book Ingestion With Chapter Splitting**
   - Important for books and long PDFs.
   - Should not be reduced to "send the whole book to the model."
   - Needs careful schema and review design before Sanity changes.

3. **Large Document Settings In Ingest Workbench**
   - Useful UI layer for truncation/model choices.
   - Should expose effective limits clearly and avoid `.env` fiddling.

4. **Source Queue → Batch Runner Integration**
   - Useful after the Batch Runner exists.
   - Should make it easy to send a curated batch, not auto-ingest everything.

Recommended order for a new session:

1. Verify current repo/test state.
2. Decide whether Batch Runner or Book Splitter is the immediate priority.
3. If uncertain, start with a short design review rather than code.
4. If coding, implement one feature slice only, with tests.

---

## Known State As Of This Handoff

Claude's `NEXT_SESSION.md` says:

- tests passing: 409;
- last commit: `a2e701b0d`;
- enrichment model switched to `core-gemma`;
- source queue exists and is tested;
- books require chapter splitting, not full-document ingestion;
- default model should be `--llm litelm` (`core-qwen`);
- `litelm-reasoning` should be reserved for complex/legal cases.

Codex should verify these claims on the current branch before acting, because they may
change between sessions.

---

## Concepts That Often Cause Confusion

### Source Queue Status

`ready_to_ingest` does **not** mean ingested. It means the researcher has approved the
source as ready to run through ingestion.

Expected lifecycle:

```text
new → triaged → ready_to_ingest → ingested
                 ↘ skipped
```

### Analysis Tags vs Enrichment Proposals

Analysis tags are document-level classifications in `analysis.json`.

Enrichment proposals are candidate lexicon/entity/tactic/practice additions in
`enrichment.json`. They can be approved locally, pushed to Sanity, and then validated
as registry records.

Do not collapse these into one concept.

### Registry Validation vs Evidence Confirmation

Sanity registry validation confirms that a canonical term/entity/tactic/practice is
valid as an archive concept.

Lexicon evidence confirmation checks whether a specific quote in a specific document
supports that term.

These are separate on purpose, but the UI language must make the distinction obvious.

### Drafts In Sanity

Draft/pending registry entries can still be useful to the model as candidates, but
they are not fully researcher-validated. The UI should show whether a record has
document evidence.

---

## Good Prompts To Give Claude

### Prompt: Audit Before Implementing

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

### Prompt: Batch Runner Implementation

```text
Implement the first safe slice of the Batch Runner.

Scope:
- CLI command that reads ready_to_ingest Source Queue items for a batch.
- Creates a persistent batch job JSON file.
- Processes items serially with subprocess calls to runner ingest.
- Updates queue item status only after successful completion.
- Stops cleanly on LiteLLM/Mac Studio unreachable errors.
- No Streamlit UI yet unless the CLI slice is complete and tested.

Add tests for job file creation, item status transitions, failure handling, and queue updates.
Run full tests, commit, and push.
```

### Prompt: Book Splitter Design First

```text
Do not implement the full book ingestion pipeline yet.

First, inspect preprocess.py and existing corpus file formats.
Design the smallest book-splitting module that can split Docling markdown by headings.
Implement only runner/pipeline/book_splitter.py and tests/test_book_splitter.py.

No Sanity schema changes, no Streamlit UI, no batch ingestion in this slice.
Run full tests, commit, and push.
```

---

## What To Ask Codex To Do

Use Codex for:

- reviewing Claude's code after implementation;
- deciding whether a feature should be built now or deferred;
- simplifying confusing UI concepts;
- writing prompts for Claude;
- checking if documentation and tests match reality;
- producing presentation/methodology explanations.

Useful request:

```text
Claude says it implemented X. Please inspect the actual code, compare it to the intended workflow, run the relevant tests, and tell me whether it is correct or what prompt I should send back.
```

---

## Presentation / Methodology Materials

For explaining the system externally, use:

- `docs/HUMAN_AI_COLLABORATION_SCHEMATIC_PROMPT.md`
- `docs/screenshots/human_ai_workflow/`

Core phrase:

**AI proposes; researcher validates; archive preserves provenance.**

This is the best framing for presentations: the tool is not replacing archival
judgement. It is making candidate structure visible while preserving review,
uncertainty, and provenance.

---

## Final Reminder

The system is already complex enough to be powerful and fragile at the same time.
The next conversation should favour:

- fewer concepts,
- clearer labels,
- smaller implementation slices,
- strong tests,
- explicit provenance,
- and researcher control at every consequential step.

