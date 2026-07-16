# Research Cockpit Implementation Tracker

Updated: 15 July 2026  
Owner: researcher, with AI-assisted implementation  
Scope: improve the existing system incrementally; do not rewrite ingestion.

## Non-negotiable constraints

- Source PDFs are read-only research holdings.
- Never delete, move, rename, or copy source PDFs as part of indexing.
- The PDF index stores paths and derived metadata in a small rebuildable database.
- Do not hydrate/download OneDrive `dataless` placeholders during inventory.
- Content inspection must be explicit and must skip cloud placeholders.
- Suggestions remain provisional until a relevant policy or researcher decision promotes them.
- Publication and remote writes remain separate, guarded operations.

## Baseline observed on 11 July 2026

- Approved PDF roots: 28, including `Documents/PhD` and 27 named OneDrive folders.
- PDFs found in approved roots: 1,159.
- Locally available PDFs: 190.
- OneDrive cloud placeholders: 969.
- PDF contents read by the first dry run: 0.
- Source files copied, moved, renamed, or deleted: 0.
- Source Queue rows: 5,006.
- Source Queue rows with attached local files at baseline: 0.
- Source Queue rows linked to corpus documents at baseline: 53.

## Priority tracker

| ID | Roadmap phase/current grouping | Status | Deliverable | Completion evidence |
|---|---:|---|---|---|
| UI-ENTRY-01 | 1 | Implemented and visually verified | Submit once, triage immediately, route automatically | URLs/files are safely recorded, triage always follows, and the researcher does not return for a second step |
| TRIAGE-JOBS-01 | 2 | Implemented and independently reviewed | Durable triage job queue | New submissions wait automatically when a model job is active and resume without researcher action |
| LINK-01 | 14 | Deferred until core cockpit is stable | Link Queue decisions and ingestion manifest | Confirm/reject/defer source connections; manifest accepted by existing offload pipeline |
| WORKFLOW-01 | 3/5B | Implemented and independently verified; real ordinary rehearsal validated | Maximum-15 workflow batch contract | Additive read-only planner selects before routing, reuses triage, and writes path-safe immutable content-addressed plans; real 15-source ordinary rehearsal passed |
| PROCESS-01 | 8 | Implemented, live-browser verified, and independently audited | Read-only Processing Queue | Maximum-15 worklist and stage matrix project exact workflow/dispatch, local artifacts, route-scoped attempts, and remote-unverified receipts without a duplicate status database |
| OUTCOME-01 | 6/9A | Implemented, workflow-bound, and independently verified | Batch Outcome integration | Immutable policy-versioned audit binds the exact workflow/dispatch, accounts for every frozen row, fingerprints route/Markdown siblings, and becomes stale when source evidence changes |
| MEMORY-01 | 7 | Foundation implemented | Evidence-linked provisional memory | Confidence, provenance, locator, recurrence, conflict and trust state retained separately |
| TAG-01 | 8 | Foundation implemented | Derived tag projections | Exact registry mappings and provisional context; originals never rewritten |
| PACK-01 | 9A | Implemented, workflow-bound, and independently verified | Bounded Codex Review Packs | Private/external-safe Markdown+JSON bind the exact Batch Outcome; recursive local-path and sensitive-content validation is fail-closed |
| COMMIT-01 | 12 | Implemented and independently verified | Atomic compilation visibility | One completed manifest atomically exposes immutable memory, tag, outcome, route, and Review Pack artifacts; partial/abandoned attempts remain diagnostic and hidden |
| DISPATCH-01 | 5 | Implemented; real mixed rehearsal independently verified | Dry-run specialist dispatcher | Seven real existing records covered ordinary/media/testimony/legal/longform with unchanged queue/corpus state and no execution |
| VALIDATE-01 | 7/9B | Implemented and independently re-audited | Exact batch-bound grouped dossiers and append-only local decision ledger | Accept/edit/reject/defer/variant/evidence/merge events bind one immutable evidence snapshot, retain original proposals, and never authorize canonical/remote writes |
| DEPENDENCY-01 | 10A | Implemented and independently verified | Bounded read-only dependency snapshot and change-impact preview | Exact selected-workflow binding, current content fingerprints, route-specific impacts, explicit provenance limits, and no automatic rerun |
| EXEC-01 | 6A/6B | 6A verified; 6B.1 deterministic testimony canary core independently verified | Guarded local retry/resume controls | One-use testimony candidate sidecar execution now has corpus lock, preservation, receipts, recovery and evidence verification; Streamlit remains read-only and every model/base/import/upload/publication adapter remains unauthorized |
| ROUTE-01 | 13 | Not started | Guarded remote reconciliation/publication | Confirmation mode, idempotent remote writes, reconciliation log, no silent publishing |
| PDF-01 | 14 | Paused after safe inventory | Local PDF Asset Index v1 | Live metadata-only index exists; defer hashing, inspection, and duplicate report |
| MATCH-01 | 14 | Paused with PDF-01 | Deterministic PDF-to-source candidate matcher | DOI/title/author/year/filename/hash scoring with provenance and no silent attachment |
| OCR-01 | 15+ | Deferred | Selective OCR and optional semantic matching | Only relevant locally available sparse PDFs; embeddings used as candidate signal only |

Phase 6B.1 verification on 13 July 2026: **2,094 repository tests passed**.

Streamlit visibility and terminal-history follow-up on 13 July 2026:
**2,106 repository tests passed**, Python compilation and diff checks passed,
and a live Source Queue browser check confirmed the active triage tail, triage
and re-triage history, durable request history, and the complete workflow-status
overview above source entry. Two independent audits returned **GO** after unsafe
or inapplicable canary commands were hidden and edge-state labels were corrected.

Phase 8 Processing Queue verification on 13 July 2026: **2,132 repository
tests passed**. A live Source Queue browser check loaded the real seven-item
mixed workflow, retained the active triage terminal tail and history, and
rendered the read-only worklist, stage matrix, and evidence tabs. Artifact,
operation, and consistency status are separate. Attempt rows require the exact
workflow, dispatch, queue-item, document, and route binding. Existing Batch
Outcomes and Review Packs correctly remain unbound because their producers do
not yet emit workflow fingerprints; Phase 9 must add that contract rather than
guess from filenames or labels.

Phase 9A completion integration on 14 July 2026: **2,158 repository tests
passed**. The existing compiler now emits `batch-outcome-v2.2` only after
validating the actual frozen workflow and dispatch together. Review Packs use
`codex-review-pack-v1.2` and bind the exact outcome payload. Outcome, route
plan, Review Pack JSON, and their Markdown siblings are immutable and checked
before reuse. Current document and dynamic specialist evidence changes mark
older tail artifacts stale. Three independent adversarial re-audits returned
**GO**, and a live Streamlit check confirmed the same selected seven-item
workflow, visible terminal history, separate read-only Processing Queue, and
the sibling local completion panel. Historical unbound outputs remain
downloadable but cannot satisfy workflow completion.

Phase 9B completion on 14 July 2026: **2,201 repository tests passed**.
The existing Review Inbox now defaults to its unchanged corpus-wide document
queue but can be scoped to an exact validated maximum-15 workflow. A bound
Batch Outcome produces immutable `proposal-dossier-index-v1.0` history with
full evidence/provenance, explicit batch-versus-archive context, and exact
workflow/outcome/memory fingerprints. Local grouped decisions use the separate
append-only `review-decisions-v1.0` SQLite ledger; they never rewrite
`enrichment.json`, promote canonical records, upload, publish, or inherit a
decision across changed evidence snapshots. The ledger is 0600, symlink-safe,
hash-chained, optimistic-concurrency guarded, and protected from update,
delete, and replace operations. Initial independent audits returned NO-GO and
their evidence-removal, symlink, identity, permissions, and trigger bypasses
were fixed; contract re-audit returned **GO**. Streamlit AppTest confirmed both
the corpus-wide default and the real no-outcome six-document scoped workflow.

Phase 10A completion on 14 July 2026: **2,219 repository tests passed**.
The Processing Queue now contains a collapsed, no-scenario-by-default change
impact preview for its exact maximum-15 workflow. It fingerprints bounded local
evidence only when requested and distinguishes direct byte changes, artifacts
that would become stale, methodological re-audit candidates, conditional
downstream effects, and missing legacy provenance. Specialist effects are
route-specific; publication policy is confined to publication readiness; and
Phase 9B decision events do not invalidate Analysis, Enrichment, or Batch
Outcomes. The preview has no execution, triage, model, upload, or publication
control and does not lock ingestion. The Triage Terminal tail and existing
workflow-output controls remain visible. Phase 10B is reserved for complete
producer-side model/input receipts and later selective re-audit planning.

Phase 10B completion on 14 July 2026: **2,251 repository tests passed**.
Every new canonical Analysis/Enrichment run now records a content-free, strictly
validated resolved-input receipt; Workbench, second-opinion, alternate-model, and
chunk-fallback routes are covered. Chunked runs bind the ordered contributing
requests through an aggregate receipt and remain partial if any chunk fails.
Historical or tampered receipts remain partial, and the Streamlit inspector shows
only validator-derived coverage. Routing aliases are distinguished from provider
model identities. Model-response excerpts are excluded from durable errors,
researcher notes, and dependency snapshots. Two implementation agents and an
independent adversarial audit returned **GO** after the final fixes. This layer
enables later selective re-audit planning but does not itself rerun, upload,
publish, or block ongoing ingestion.

Testimony archive/publication separation and Phase 11A completion on 15 July
2026: **2,289 repository tests passed**. Testimony review that is missing,
unclear, or pending no longer blocks an unverified private Sanity archive record;
the payload carries `needsReview=true`, pending/unclear review state, and
`publicDisplay=false`. Refused/withdrawn consent still blocks remote upload, and
the publication gate remains unchanged and strict. The GOV.UK authority layer now
has non-destructive Sanity source-attestation sync, full-document enrichment
matching, and collision-safe draft creation. Phase 11A adds read-only source
identity reconciliation and pending relationship suggestions without triage,
models, external PDF scanning, automatic merges, or independence claims.

Phase 11B completed on 15 July 2026 with **2,309 repository tests passing**.
Append-only field, family, and relationship decisions now replay through a
strictly validated reviewed projection. Only explicit, current family assignments
can affect reviewed-family counts; incomplete scopes keep corpus counts null,
hostname grouping remains a disclosed proxy, and no independence claim is made.

## UI-ENTRY-01 checklist

- [x] Capture the current Dashboard-to-Source-Queue flow.
- [x] Confirm that basic multi-URL entry already exists.
- [x] Confirm that active triage logs can push source entry below the fold.
- [x] Confirm that local PDF attachment is separated from initial URL collection.
- [x] Keep **Add + queue triage** as the primary action and preserve its strong visual emphasis.
- [x] Treat the whole action as one researcher submission: record safely, triage, then assign the processing route.
- [x] If a model job is active, queue triage automatically instead of asking the researcher to return later.
- [x] Run deterministic URL validation and duplicate checks before spending a triage model call.
- [x] Keep `Add only` as an explicit secondary collection/exception path, not the recommended default.
- [ ] Keep batch group, tags, notes, and rendered fallback available without adding a second workflow step.
- [x] Show one combined result: duplicates skipped, triage running/queued, route assigned, and exceptions requiring help.
- [ ] Keep file import and indexed-PDF linking as secondary paths; do not copy source files.
- [x] Verify the revised flow visually and with headless UI tests.

## PDF-01 checklist

- [x] Record the researcher-approved roots in a versioned configuration.
- [x] Scan filenames and filesystem metadata without opening PDF contents.
- [x] Detect the macOS `dataless` flag used by OneDrive Files On-Demand.
- [x] Default CLI operation to dry run.
- [x] Require `--write` before creating/updating the SQLite index.
- [x] Require `--inspect-local` before hashing or PDF metadata extraction.
- [x] Skip dataless placeholders even when `--inspect-local` is requested.
- [x] Track files that disappear from a root as `present=0`; never delete their history.
- [x] Add automated safety and persistence tests.
- [x] Create the first live metadata-only index database.
- [ ] Add an index summary/export command.
- [ ] Add exact duplicate grouping for locally available hashed files.
- [ ] Add a read-only Streamlit index panel outside `runner/app.py` business logic.
- [ ] Observe scan performance and database size before enabling further inspection.

## Commands

Safe dry run; reads directory entries and file metadata only:

```bash
python -m runner pdf-index
```

Create or update the small metadata-only index database:

```bash
python -m runner pdf-index --write
```

Explicitly hash and inspect only locally available PDFs while continuing to
skip OneDrive placeholders:

```bash
python -m runner pdf-index --write --inspect-local
```

Default database location:

```text
<EXPORTS_DIR>/pdf_index/pdf_assets.sqlite3
```

## Definition of “done” for each priority

A priority is complete only when:

1. its state model and authority are documented;
2. core logic is outside `runner/app.py`;
3. dry-run/read-only behavior exists where applicable;
4. automated tests cover failure and retry behavior;
5. no existing safety lock, sidecar, audit, or provenance record is bypassed;
6. the researcher-facing workflow says what requires human attention;
7. a real small batch has been observed before automatic execution expands.

## Change log

### 15 July 2026 — Phase 12

- Added a durable compilation-attempt marker before derived child writes and a
  single atomic completed-manifest visibility boundary.
- Made tag projection exports content-addressed and immutable for manifest use.
- Bound memory, tag projection, Batch Outcome, route plan, Markdown, and optional
  Review Pack artifacts by confined path, byte size, SHA-256, and schema/fingerprint.
- Updated Streamlit and enrichment readers to show only completed manifest-bound
  artifacts; legacy output is labelled and cannot mask an invalid/incomplete
  Phase 12 compilation.
- Added process-safe concurrency, append-only abandoned-attempt diagnosis, and
  local no-delete `compilation-repair` / `compilation-reindex` commands.
- Independent adversarial audit: **GO**. Final focused suite: **302 passed**.
  Full repository suite: **2,332 passed**.

### 14 July 2026

- Completed Phase 9A exact-bound Batch Outcome and Review Pack integration.
- Added the sibling local completion panel beneath the read-only Processing Queue.
- Added stale-source detection for base and dynamic specialist evidence.
- Preserved historical unbound outputs as read-only/downloadable provenance.
- Three independent adversarial audits returned **GO**; live Streamlit inspection
  passed; full repository suite: **2,158 passed**.

### 13 July 2026

- Added the phased implementation and independent-verification plan in
  `docs/PHASED_IMPLEMENTATION_AND_VERIFICATION_PLAN_2026-07-13.md`.
- Recorded durable triage jobs, workflow policy templates/explicit selection,
  shared completion/freshness validators, and the mixed-route rehearsal checker
  as implemented foundations rather than future rebuilds.
- Kept real mixed-route observation as a hard gate before live execution.
- Completed the second integrity gate: workflow, dispatch, and mixed-rehearsal
  snapshots are path-safe, tamper-evident, immutable, semantically validated,
  and bound across their source artifacts.
- Refused self-consistent but impermissible rehearsal claims, including execution
  authorization, false route coverage, and invented route identities.
- Prohibited the new executor from calling legacy `batch-run --execute`, because
  that path couples local processing to upload confirmation. The planned local
  adapter will reuse the package-local source worker and preserve failed-attempt
  evidence before its existing retry cleanup.
- Independent Phase 5B verifier: **GO**, no remaining P0/P1 findings.
- Full repository regression suite: **2,033 passed**.
- Completed the real Phase 5A seven-source mixed-route observation: ordinary,
  media, testimony, legal, and longform coverage passed; database, selected
  queue/history rows, and selected corpus manifests were unchanged.
- Independent Phase 5A verifier: **GO**. The rehearsal remains dry-run,
  remote-write disabled, `execution_readiness=not_assessed`, and
  `execution_authorized=false`.
- Recorded one non-blocking legacy provenance gap: `d3280826` has populated
  triage state but no history-table record. Do not rerun triage to repair it.

### 12 July 2026

- Added the additive `workflow-batch-v1.0` contract without changing existing
  triage or `plan_batch()`: selection occurs before routing and is capped at 15.
- Added a read-only CLI connection, external-safe local-path redaction,
  deterministic fingerprints, content-addressed plan paths, and a Source Queue
  Streamlit route table inside the existing batch panel. Immutable collision and
  path-safety hardening was completed in Phase 5B on 13 July.
- Added `specialist-dispatch-plan-v1.0` as a dry-run mapping over the existing
  media, testimony, legal, longform, and second-opinion commands. It does not
  acquire locks, call models, execute commands, upload, or publish.
- Validated a real existing batch group with exactly 15 ordinary sources. The
  corresponding specialist plan contained zero routes, as expected; a real
  mixed specialist rehearsal is still required before execution work.
- Refreshed the final-schema outcome for `batch-20260603-193545`: 3/3 accounted
  for and ordinary-ready. Regenerated external-safe Review Pack
  `batch-20260603-193545--f25383a2dde5` and verified no `/Users/` or `/private/`
  path leakage.
- Full automated suite after these changes: **1,925 passed**.
- Corrected Batch Outcome policy v2.1 and validated it on a real completed
  three-document batch.
- Added explicit processing-stage projection, specialist-held accounting,
  deferred-human review state, and expanded re-audit comparisons.
- Added evidence-linked provisional memory with separate model confidence,
  source-family recurrence, located evidence, conflicts, and provenance.
- Added derived tag projections that never rewrite Analysis or Enrichment.
- Added bounded provisional-memory retrieval to Enrichment with audit fields and
  explicit anti-confirmation-bias instructions.
- Added private-local and external-safe Review Packs; verified recursive local
  path removal in the latest real pack.
- Reprioritized the next work around a maximum-15 workflow-batch contract and a
  dry-run specialist dispatcher.

### 11 July 2026

- Added `pdf_asset_index.py`, an inventory/index layer that never manipulates source PDFs.
- Added the 28 approved roots to `pdf_index_roots.json`.
- Added the `runner pdf-index` dry-run/write command.
- Verified 1,159 PDFs: 190 local and 969 cloud placeholders.
- Confirmed the metadata-only dry run opened no PDF contents and wrote no database.
- Created the first live metadata-only database with 1,159 present path records;
  no PDF contents were opened and no cloud placeholder was hydrated.
- Retained the Batch Outcome Compiler as the existing OUTCOME-01 foundation.
- Paused PDF hashing, metadata inspection, OCR, and semantic matching after the
  safe metadata-only index was established.
- Audited the current Streamlit URL-entry flow and made UI-ENTRY-01 the first
  active priority.
- Corrected UI-ENTRY-01 after researcher feedback: immediate triage is the
  normal path because it determines downstream processing; `Add only` is secondary.
