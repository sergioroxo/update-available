# Ingestion Operations Runbook

This project is no longer only an ingestion script. It is a local research
operations system that moves evidence through distinct states:

1. Source discovery
2. Source queue triage
3. Source package export
4. Mac Studio processing
5. Corpus import
6. Researcher review
7. Sanity/Supabase upload
8. Knowledge export
9. Future public graph/wiki/chatbot projection

The biggest operational risk is confusing one state for another. A package in a
folder can look like a document; an imported document can look publishable; a
tag hint can look like evidence; a graph edge can look like fact. The system is
designed to prevent that, but the researcher still needs to read the current
state before taking the next action.

## State Boundaries

| Artifact | It is | It is not | Next action |
| --- | --- | --- | --- |
| Source Queue row | A candidate source awaiting triage/review | An ingested document | Triage, approve, hold, or attach a snapshot/file |
| Source offload inbox package | A bundle for Mac Studio processing | A completed result | Archive/transfer/run on Mac Studio |
| Source offload outbox package | A returned processing result | A corpus import | Dry-run import, then import explicitly |
| Imported corpus folder | Local analyzed evidence | Published Sanity/Supabase record | Review readiness and upload explicitly |
| Longform sidecars | Deep reading support and candidate extraction | Replacement for `analysis.json` | Review candidates and decide whether to rerun/update |
| Tag Registry row | A vocabulary/connection hint | Verified evidence or Sanity registry entry | Use only as context until evidence is reviewed |
| Evidence graph export | Local reviewed/provenanced graph data | Public graph truth layer | Publish only approved/uploaded/public-safe subsets later |

## Daily Start

1. Open **Dashboard**.
2. Check **Operations Control Plane** for active jobs, paths, git state, and
   recent logs.
3. Click **Refresh worklist** after any import, upload, proposal push, or
   longform review.
4. Read **Research Worklist** before starting more ingestion. It is the current
   best summary of what the corpus needs.

## Before a Mac Studio Batch

1. In **Source Queue**, triage candidates and inspect held/failed categories.
2. Use Crawl4AI only as an explicit retry option for stuck extraction; do not
   treat Cloudflare challenges as bypassable.
3. For DOI, publisher, Google Books, repository, PDF/DOC/EPUB, or journal
   landing-page rows, check whether the row says it needs an attached source
   file. Attach the local PDF/DOC/EPUB in the row's **Source bundle / attached
   PDF or file** panel before batching. The package will process the file and
   also ingest the landing/source URL separately as contextual evidence.
4. Prefer a mixed batch across priorities/hosts when the goal is network
   diversity. Prefer same-site clusters when the goal is lexicon/network depth.
5. In **Source Offload**, build the package and archive it into the transfer
   folder.
6. On Mac Studio, use **Mac Studio Worker** to unpack, run, and archive returned
   output.

## After a Returned Package

1. In **Source Offload → Import returned results**, unpack the returned archive.
2. Run dry-run import first.
3. Import only after the dry run explains exactly which docs will be imported
   and which docs are omitted.
4. Omitted/failed docs are not relinked as ingested. They remain retry/manual
   capture work.
5. Refresh the Dashboard worklist.

## Planner-Only Workflow Attempts (Phase 6A)

In **Source Queue → Workflow batch**, first create the maximum-15 workflow and
dry-run specialist dispatch. The **Append-only attempt planner** then records
what is satisfied, proposed, held, or human-owned. It does not process a
document.

- Select at least one stage. Ordinary and non-longform routes are selected by
  default when present.
- Longform is excluded by default because binding a proposal may hash a large
  local source. Select it deliberately and confirm the second checkbox.
- If a route has two steps, only the first eligible step receives an inert
  proposal. The second remains `pending_dependency` until the first produces
  evidence and you create a fresh workflow dispatch, attestation, and plan.
- A displayed command name is evidence of the proposed existing adapter, not a
  button or permission to run it.
- Re-running an unchanged plan reuses immutable rows/events; changed evidence
  produces a different fingerprinted plan.

Equivalent local CLI inspection:

```bash
.venv/bin/python -m runner workflow-attest WORKFLOW.json DISPATCH.json
.venv/bin/python -m runner workflow-attempt-plan WORKFLOW.json DISPATCH.json ATTESTATION.json
.venv/bin/python -m runner workflow-attempt-list
.venv/bin/python -m runner workflow-attempt-reconcile PLAN.json WORKFLOW.json DISPATCH.json ATTESTATION.json
```

The Phase 6A commands above intentionally have no `--execute` option. Their
plans remain non-authorizing even when a later execution event exists.

## Deterministic Testimony Candidate Canary (Phase 6B.1)

Phase 6B.1 adds one narrowly allowlisted local adapter:
`testimony-candidates-build`. It consolidates existing analysis/enrichment
evidence into the private `testimony_candidates.json` sidecar. It does not call
a model, run a stored command, import, upload, publish, or write remotely.

Always preflight first; this is the default:

```bash
.venv/bin/python -m runner workflow-testimony-canary PLAN.json WORKFLOW.json DISPATCH.json ATTESTATION.json \
  --attempt-id ATTEMPT_ID --ledger LEDGER.sqlite3
```

To authorize exactly one use, repeat the exact ID:

```bash
.venv/bin/python -m runner workflow-testimony-canary PLAN.json WORKFLOW.json DISPATCH.json ATTESTATION.json \
  --attempt-id ATTEMPT_ID --ledger LEDGER.sqlite3 --execute --confirm-attempt ATTEMPT_ID
```

After success, create a fresh dispatch, attestation, and attempt plan. The old
plan is historical evidence and is expected to be stale against the new
sidecar. Verify archived before/after evidence at any time with:

```bash
.venv/bin/python -m runner workflow-testimony-evidence-verify PLAN.json \
  --attempt-id ATTEMPT_ID --ledger LEDGER.sqlite3
```

If a laptop/process interruption leaves an unfinished lease, do not rerun the
adapter. Use `workflow-testimony-recover` with the exact confirmed attempt ID.
Recovery either proves and seals the already-complete output, or records a
`recovery_hold`, restores the prior sidecar state, and writes an explicit corpus
hold that blocks downstream testimony review. Clearing that hold is a later
manual, audited action.

Phase 6B.1 does **not** authorize the source worker, other specialist stages,
model calls, corpus import, upload, publication, or remote writes.

### Streamlit testimony workflow (researcher-facing)

1. In **Testimony Review**, upload a PDF/DOCX/ODT/EPUB/text file or attach its
   original URL. The app creates one private content-addressed staged copy and a
   new Source Queue row; it does not analyse or publish the file.
2. In **Source Queue**, run Triage. The testimony flag blocks unattended batch
   processing until the specialist review is resolved.
3. In **Testimony Review**, preview a candidate refresh for one document. Apply
   only after inspecting added/removed/changed AI leads. The prior full register
   is archived in `testimony_candidate_history.jsonl`; researcher decisions stay
   in `testimony_candidate_reviews.json`.
4. A lead must be located in canonical `extracted.txt`/`extracted.md` before deep
   analysis. Unlocated text produces an evidence hold and is never sent to a
   second model.
5. Review AI-extracted testimony segments and the separate consent/publication
   decision. Terms, actors, tactics, and practices can be converted only into
   pending, unapproved local proposals for their Lexicon queues.

A testimony-related document may be uploaded to Sanity before this review is
finished, but only as an **unverified archive record** with `needsReview=true`,
`publicDisplay=false`, and an explicit pending testimony-review state. This is
not consent for public use. Verification, excerpts, public display, and
publication remain blocked by the separate publication gate. Refused or
withdrawn consent blocks remote archive upload as well.

Grammarly/browser writing assistants may work in the standard multi-line
researcher-note fields, but they are external services. Do not enter raw
testimony, exact quotations, names, or sensitive case notes unless the research
agreement explicitly permits that service.

### Model-input receipts and re-audit provenance

New Analysis and Enrichment runs record hashes and sizes for the exact resolved
inputs, dependency snapshots, model route/parameters, and—when exposed by the
provider—the provider model identity. They do not store prompts, document text,
testimony, or model responses. In the Processing Queue, open the collapsed
change-impact panel and enable the receipt inspector to see whether a stage has
validated complete coverage. Older runs, tampered sidecars, and incomplete chunk
runs correctly display as historical/partial; this does not stop ingestion.

### GOV.UK glossary authority memory

The versioned local authority manifest preserves all 35 source terms, mappings,
publisher/date/licence provenance, and researcher-authored concise summaries of
the GOV.UK definitions. These summaries are not verbatim transcriptions. Adding
later document evidence does not replace this authority layer.

In **Lexicon → GOV.UK Source Glossary**, the optional confirmed live sync creates
missing Sanity drafts and appends missing source attestations. It never replaces
existing definitions/evidence, validates a canonical term, or enables Analysis
trust. Re-enrichment is unnecessary merely to preserve the GOV.UK definitions;
use selective re-enrichment only when an older document should be checked for new
term evidence or variants.

### Phase 11 source identity preview

Open **Source Identity** to build a read-only reconciliation of existing corpus
metadata. It reuses URLs, DOI, title, authors/producers, publication/date,
filename, and already-recorded content hashes. It does not open the external PDF
library, rerun Triage, call a model, or merge documents. Exact-byte, DOI,
canonical-URL, and title/author/year matches are pending relationship suggestions
only. Counts are explicitly descriptive measures, not independent attestations.

Phase 11B decisions remain local and append-only. Enter a stable researcher
identifier, review the displayed evidence, and use the separate controls to:

- select an observed field value, enter a bounded manual correction with
  provenance, defer it, or leave it unresolved;
- assign a confirmed document-family ID (the only action that can affect
  reviewed-family counts); or
- accept, reject, or defer a suggested relationship without merging files.

Saving a decision never overwrites an earlier record. A correction explicitly
supersedes the active decision while preserving the full history. Decisions
survive unrelated corpus growth, but are reported as stale if their bound source
evidence changes. Use **Save reviewed identity projection** only after inspecting
the active decisions; this writes a validated local artifact for Review Packs and
provisional memory, not to Sanity or Supabase.

### Phase 12 atomic compilation visibility

Batch compilation now has one local visibility boundary. Provisional memory,
derived tag projections, Batch Outcome files, routes, and any subsequent Review
Pack are staged as immutable artifacts under a durable compilation attempt. The
app exposes them only after all fingerprints validate and the single
`latest_completed_compilation.json` pointer is atomically committed.

If compilation stops halfway, keep using the last completed result. Streamlit
labels an older completed result while a newer attempt is staging or abandoned;
when no completed result exists, it hides partial files rather than presenting
them as a historical success. Abandoned attempts are intentionally retained for
diagnosis and are not publication records.

Local recovery commands:

```bash
./.venv/bin/python -m runner.main compilation-repair '<exact batch id>'
./.venv/bin/python -m runner.main compilation-reindex
```

`compilation-repair` validates immutable completed attempts and atomically
restores the latest pointer under the same process lock used by compilation.
`compilation-reindex` rebuilds the local discovery index. Both are additive:
they do not delete or rewrite source documents, corpus records, immutable
artifacts, Sanity/Supabase data, or public material.

## Longform Documents

Large books/reports/articles need more than the normal one-pass summary.

- Preprocessing extracts text and builds `citation_units.json`.
- Longform sectioning/review creates sidecars for deeper reading.
- Longform candidates can be saved as local enrichment hints, but they are not
  Sanity records.
- A longform review does not automatically rewrite the canonical analysis.

Use longform sidecars to decide whether the document needs reanalysis,
complement enrichment, manual metadata repair, or a future chapter-level model.

## Knowledge Exports

Knowledge exports are regenerable local projections.

- `archive_summary.json`: per-document profile.
- `document_profiles.jsonl`: corpus-wide profiles.
- `archive_nodes.csv` / `archive_edges.csv`: tabular graph exports.
- `archive_graph.json`: browser/WebXR-ready graph contract seed.
- `knowledge_quality.json`: quality audit and recommendations.
- `citation_units.json`: evidence locator sidecar.

These exports are safe because they preserve trust state and provenance. They
are not automatically public. Future public graph/wiki/chatbot layers should
consume reviewed/uploaded/public-safe subsets, not raw local work-in-progress.

## When Something Looks Broken

Check these in order:

1. **Operations Control Plane**: Is a background job still running?
2. **Recent logs**: What did the terminal actually say?
3. **System Health**: Are there stale packages, missing summaries, failed
   offload results, or returned archives?
4. **Source Offload dry-run**: Does import say which docs are omitted?
5. **Document Status**: Is the blocker preprocessing, analysis, enrichment,
   embedding, review, upload, or Supabase?
6. **Guide / this runbook**: Which state boundary are you crossing?

## The Rule

AI proposes; researcher validates; archive preserves provenance. The ingestion
system should make that sequence visible at every step.
