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
3. Prefer a mixed batch across priorities/hosts when the goal is network
   diversity. Prefer same-site clusters when the goal is lexicon/network depth.
4. In **Source Offload**, build the package and archive it into the transfer
   folder.
5. On Mac Studio, use **Mac Studio Worker** to unpack, run, and archive returned
   output.

## After a Returned Package

1. In **Source Offload → Import returned results**, unpack the returned archive.
2. Run dry-run import first.
3. Import only after the dry run explains exactly which docs will be imported
   and which docs are omitted.
4. Omitted/failed docs are not relinked as ingested. They remain retry/manual
   capture work.
5. Refresh the Dashboard worklist.

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
