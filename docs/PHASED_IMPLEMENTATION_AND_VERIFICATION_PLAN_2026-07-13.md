# Phased Implementation and Independent Verification Plan

Updated: 14 July 2026  
Scope: improve the existing researcher system incrementally; do not replace the
working ingestion, triage, batching, Analysis, Enrichment, specialist, or
publication systems.

## Operating principle

Each phase changes one bounded layer, preserves the existing authorities, and
must pass an independent verification gate before the next phase begins. A
phase is not complete merely because code exists. Completion requires tests,
failure-path checks, safety checks, and—where the phase touches real research
data—a small observational rehearsal.

The normal verification loop is:

1. The primary implementation agent records the intended authority, inputs,
   outputs, and non-goals.
2. The implementation is made in a separate pipeline module, with Streamlit
   acting as a thin interface rather than a second source of business logic.
3. An independent verification agent reviews the diff and runs focused tests.
4. The primary agent fixes every blocking finding.
5. The verifier re-checks the corrected code. High-risk execution or
   publication phases receive a second safety review.
6. The phase is promoted only when its completion evidence is added to this
   plan or the implementation tracker.

No verifier may silently fix the implementation it is reviewing. This keeps
the review independent and makes disagreements visible.

## Current foundations: preserve, verify, do not rebuild

| Phase | State on 13 July | Existing implementation | Remaining gate |
|---|---|---|---|
| 1. Submit, triage, route once | Implemented | Source Queue primary action records valid sources, skips exact duplicates, and queues triage; existing triage assigns routes | Visual Streamlit regression test remains useful, but the workflow logic should not be rebuilt |
| 2. Durable triage jobs | Implemented and independently reviewed | `runner/pipeline/triage_jobs.py`; durable jobs, leases, recovery, shared model lock, retry-safe reconciliation | Observe normal recovery during routine use; do not manufacture a destructive failure on the live archive |
| 3. Explicit workflow selection | Implemented and independently reviewed | Maximum-15 selection, saved templates, explicit model/disclosure/audit policy, and immutable fingerprinted/content-addressed planning manifests | Retain the existing batch system as the execution authority until Phase 6 is proven |
| 4. Artifact completion and freshness | Implemented and independently reviewed | `runner/pipeline/artifact_validation.py`, shared by Batch Outcome and specialist dispatch | Replace conservative timestamp heuristics with run/input fingerprints later in Phase 10 |
| 5. Mixed-route dry-run rehearsal and artifact hardening | 5A and 5B completed and independently verified | `runner/pipeline/mixed_rehearsal.py` verifies ordinary, media, testimony, legal, and longform coverage without execution; all workflow/dispatch/rehearsal writers are path-safe, immutable, semantically validated, and bound to their source artifacts | Real seven-source mixed observation passed with unchanged queue/corpus state; execution remains separately unauthorized |
| 6A. Planner-only attempt ledger | Completed and independently verified | Per-batch attestation, dependency-aware inert proposals, actual-input fingerprints, immutable plans, append-only SQLite intents/events, reconciliation, CLI, and thin Streamlit projection | Plans never authorize execution; only the separately confirmed and verified 6B.1 canary may consume one eligible attempt |
| 6B.1. Deterministic testimony canary | Core completed and independently verified | One-use `testimony-candidates-build` adapter, corpus-scoped lock, preservation/receipts, append-only execution FSM, crash recovery, evidence verification, dry-run-default CLI, and read-only Streamlit state projection | Keep Streamlit non-executing; no other adapter, model call, import, upload, or publication is authorized |
| 10A. Dependency impact preview | Completed and independently verified | `runner/pipeline/dependency_impact.py` and a collapsed read-only Processing Queue panel fingerprint current bounded evidence and preview declared changes without execution | Phase 10B must add complete producer-side Analysis/Enrichment input receipts before automatic drift detection or selective rerun planning |

Full regression evidence on 13 July after Phase 6A: 2,068 tests passed.

Full regression evidence after the Phase 6B.1 canary and audit projection:
**2,094 tests passed**.

## Remaining implementation sequence

### Phase 5A — Complete the real mixed-route observation — completed

Use one ordinary, media, testimony, legal, and longform queue item in a maximum-
15 workflow. Where possible, also observe failed extraction, partial offload,
already-processed, and missing-attachment cases. This is a read-only observation
of live queue/corpus state plus derived workflow, dispatch, and rehearsal files.
It makes no model call, runs no processing command, changes no queue/corpus row,
and performs no remote write.

Verification gate:

- independent agent recomputes identities, routes, counts, workflow/dispatch
  fingerprints, and technical/human holds;
- compare live queue/corpus state before and after to demonstrate that only
  derived rehearsal exports changed;
- keep `execution_authorized=false`; this observation validates planning, not
  permission to process the selected sources.

Completion evidence:

- real workflow `workflow-20260713-113257` selected seven existing records and
  covered ordinary, media, testimony, legal, and longform routes;
- real technical, stale, ready, and human-required states were preserved;
- workflow, dispatch, and rehearsal fingerprints and summaries recomputed
  exactly;
- Source Queue database hash/stat, selected rows/history, and selected corpus
  manifests were unchanged before/after;
- exactly six derived immutable/latest JSON files were created;
- independent verifier result: **GO**;
- detailed record:
  `docs/PHASE5A_REAL_MIXED_OBSERVATION_AUDIT_2026-07-13.md`.

### Phase 5B — Harden workflow and dispatch snapshots — completed

The shared integrity layer now applies the same safe, immutable guarantees to
workflow, dispatch, and mixed-rehearsal artifacts before they can be consumed by
a future attempt planner.

Changes:

- validate workflow batch IDs before using them in paths;
- recompute stable projections and fingerprints at write and read boundaries;
- reject path traversal, missing/invalid fingerprints, duplicate item IDs,
  inconsistent summaries, plan collisions, and attempts to overwrite immutable
  content-addressed history;
- keep `latest_*.json` as a replaceable pointer/projection only after the
  immutable snapshot is safely present;
- recompute mixed reports from their bound workflow and dispatch inputs and
  refuse any report that claims execution readiness/authority or route coverage
  without matching evidence.

Verification gate:

- independent adversarial tests tamper with each stable field, fingerprint,
  batch ID, duplicate identity, summary count, and existing snapshot;
- independent verifier result: **GO**, with no remaining P0/P1 findings;
- full repository suite: **2,033 passed**.

### Phase 6A — Planner-only attempt ledger — completed

The planning layer is deliberately separate from execution. The five-route
mixed rehearsal remains commissioning evidence; each operational batch instead
receives its own fingerprinted, non-authorizing attestation over the routes it
actually contains. Ordinary-only batches therefore remain valid.

Implemented:

- `runner/pipeline/workflow_attestation.py` binds current workflow, dispatch,
  corpus state, route observations, and explicit non-authority;
- `runner/pipeline/workflow_attempts.py` creates deterministic attempt IDs,
  per-item/route ordering, prerequisite dependencies, inert allowlisted command
  proposals, stage-specific local input hashes, immutable plan snapshots, and
  append-only SQLite intent/event records;
- downstream testimony/longform stages remain `pending_dependency` with no
  command or input hash until a fresh dispatch, attestation, and plan observes
  the prerequisite output;
- prerequisite completion uses builder-local structural, identity, and
  freshness checks, so malformed/stale inputs are rebuilt while invalid
  downstream evidence does not cause an infinite prerequisite rerun;
- retry/resume modes cannot invent execution history; before Phase 6B they
  correctly return no eligible rows;
- CLI commands attest, plan/persist, list, and reconcile, with no `--execute`
  option;
- Streamlit requires an explicit stage selection, excludes longform by default,
  requires a second longform confirmation, hides stale results, and makes no
  planner writes during ordinary rendering;
- one action uses a request-local file-identity hash cache to avoid repeatedly
  reading unchanged large inputs across validation boundaries. The cache is
  never persisted and mid-hash changes fail closed.

Verification evidence:

- core, CLI, and Streamlit received separate independent **GO** decisions with
  no remaining P0/P1 findings;
- full repository suite: **2,068 passed**;
- Python compilation and `git diff --check` passed;
- static audits found no subprocess, system, legacy `batch-run`, import,
  upload, publication, or remote-write capability in the planner;
- `execution_authorized=false` remains mandatory in every attestation, plan,
  row, event, CLI result, and UI disclosure.

### Phase 6B.1 — Deterministic testimony candidate canary — completed core

The first execution slice is intentionally smaller than the original Phase 6B
proposal. It executes only `testimony-candidates-build` by calling its existing
deterministic Python function directly; stored command arrays are never run.
The output remains private and researcher-reviewed by default.

Implemented safeguards include exact one-use confirmation, current-plan/input
preflight, corpus-scoped `flock`, append-only authorization/lease/preservation/
terminal events, atomic sidecar replacement, immutable before/after copies,
receipt and adapter fingerprints, exact byte-and-mtime restoration, and
recovery that never reruns the adapter. Ambiguous recovery writes an explicit
hold that specialist dispatch and attempt planning treat as blocked.

The CLI defaults to read-only preflight. Streamlit displays planner state and
validated execution state separately but provides no execution button.

### Phase 6B.2 — Guarded local model/base execution — not authorized

Extend the proven append-only execution-attempt service to the existing local base and
specialist workers. Do not reimplement ingestion, media, testimony, legal,
longform, or second-opinion processing. In particular, do **not** invoke legacy
`batch-run --execute`: that path calls `ingest(..., yes=True)`, which can confirm
upload, and Enrichment is currently coupled to that confirmed-upload path.

Changes:

- consume the completed Phase 6A ledger and per-batch attestation rather than
  creating another workflow-state authority;
- default every Streamlit control to dry-run;
- support run-selected, run-missing, retry-failed, and resume-interrupted;
- skip artifacts that the shared validator marks valid and fresh;
- retain failed and partial evidence instead of overwriting it;
- adapt the existing package-local source-offload worker for local base
  processing; archive each failed/partial attempt outside the package `docs/`
  directory before retry cleanup regenerates that directory;
- keep import into the live corpus as a later, separately confirmed transition;
- add specialist execution only after the planner and base adapter pass their
  gates, one selected item/stage at a time, reusing existing model leases and
  dispatcher command mappings;
- keep legal interpretation, testimony consent, upload, and publication outside
  automatic execution;
- keep second-opinion promotion human-owned even when comparison generation is
  selected;
- never invoke a remote-write command from this phase.

Verification gate:

- first agent audits planner state transitions, crash recovery, leases,
  fingerprint binding, and command allowlisting without spawning subprocesses;
- after that passes, another agent audits the local worker adapter, including its
  existing retry cleanup of package-generated `docs/`, to prove old attempt
  evidence is archived and source inputs remain untouched;
- second agent audits privacy, human authority, and absence of remote writes;
- focused tests simulate success, partial failure, retry, stale output, duplicate
  click, interrupted worker, and invalid/tampered plans;
- the first real model run is a single explicitly authorized local item after
  Phases 5A and 5B pass; it does not import or upload automatically.

### Phase 7 — Grouped provisional-term and tag dossiers

Create corpus/batch dossiers instead of asking the researcher to review every
proposal on every document.

Each draft group must retain:

- original label, normalized label, family, variants, and relationship
  candidates;
- every evidence quote and locator, document ID, source, and model stage;
- proposal confidence, rationale, prompt/model provenance, recurrence, source
  family count, conflicts, and missing-evidence warnings;
- immutable decision history for accept, edit, reject, defer, add variant, add
  evidence, and merge into.

The dossiers are usable as provisional Enrichment context. Decisions do not
silently rewrite Analysis, Enrichment, the lexicon, canonical tags, Sanity, or
Supabase.

Verification gate:

- independent agent checks traceability from every summary back to all original
  proposals and evidence;
- tests cover conflicting drafts, duplicate stages from the same document,
  missing locators, rejected history, merge cycles, edited labels, and rebuilds;
- a small real dossier is reviewed for workload reduction and legibility before
  wider UI exposure.

### Phase 8 — Read-only Processing Queue in the existing Streamlit cockpit — completed core

Expose the existing workflow manifest, attempt ledger, and shared validators as
one stage matrix: acquisition, preservation, extraction, citation units,
embedding, Analysis, Enrichment, specialist routes, second opinion, compilation,
Review Pack, and remote reconciliation.

Changes:

- show `complete`, `missing`, `invalid`, `stale`, `running`, `failed`, `held`,
  and `human required` without creating a competing status database;
- show why a stage has its status and the next safe action;
- add filters for failed, stale, specialist-held, completed, and researcher
  attention;
- expose Phase 6 controls only for eligible selected stages;
- keep this inside the existing Source Queue/batch area unless usability testing
  shows that a separate page is necessary.

Verification gate:

- one agent audits that every UI status is a projection of an authoritative
  artifact or ledger;
- a browser/UI agent tests the main flows, narrow viewport, long errors, empty
  state, duplicate clicks, and reruns;
- screenshots and a short researcher walkthrough become completion evidence.

Completion evidence on 13 July 2026:

- `runner/pipeline/processing_projection.py` composes the frozen maximum-15
  workflow and dispatch, strict local artifact validators, batch-scoped attempt
  history, provisional-draft lifecycle, and local receipt evidence without
  writing or checking a remote system;
- `runner/processing_queue_ui.py` supplies a worklist, full stage matrix, and
  evidence detail through one thin Source Queue integration point;
- artifact truth, operation history, and consistency state remain separate;
  mismatched or corrupt ledger history creates an integrity alert but cannot
  overwrite a valid current artifact;
- canonical extracted-text changes cascade staleness into Analysis, Enrichment,
  and embeddings; malformed audits, unsafe second-opinion references, forged
  receipts, and label-only tail artifacts fail closed;
- the triage terminal tail and triage/re-triage history remain visible before
  the Processing Queue;
- the full repository suite passed with **2,132 tests**, Python compilation
  passed, and a live browser run loaded the real mixed seven-item workflow.

Deliberate Phase 9 boundary: the existing Batch Outcome and Review Pack
producers do not yet write an exact `workflow_binding` containing workflow and
dispatch fingerprints. Phase 8 therefore does not infer linkage from timestamp
labels or folders and does not call those artifacts complete. Phase 9 must add
the immutable producer-side binding and a recomputable output-content contract.

### Phase 9 — Batch Outcome, Review Pack, and Review Inbox integration

Make the existing compiler and Review Packs the natural endpoint of a batch.

Changes:

- compile when local processing reaches a stable boundary, while explicitly
  accounting for held/failed items;
- generate bounded private-local or external-safe Review Packs from selected
  questions and documents;
- filter the existing Review Inbox by batch, specialist attention, conflict,
  recurrence, consequential promotion, and publication readiness;
- link grouped Phase 7 dossiers rather than duplicate proposal-row decisions;
- show public-facing disclosure/audit material separately from private evidence.

Verification gate:

- independent agent recomputes fingerprints and checks pack bounds;
- privacy verifier scans nested content for local paths and withheld testimony or
  legal material;
- one ordinary and one mixed batch are compiled twice to prove deterministic
  regeneration without source-artifact mutation.

Phase 9A implemented and verified on 14 July 2026:

- the existing compiler is reused through a bounded workflow adapter; no
  ingestion, triage, or batch runner was recreated;
- `batch-outcome-v2.2` carries the exact workflow/dispatch binding, a
  recomputable content fingerprint, complete frozen-row accounting, and an
  equally bound route plan;
- `codex-review-pack-v1.2` binds the exact outcome payload, enforces 1–15 unique
  documents, validates external-safe withholding, and refuses re-fingerprinted
  copied-evidence forgeries;
- the Processing Queue marks these stages complete only while the fixed and
  specialist-validator source evidence remains current;
- one sibling Streamlit panel compiles the selected workflow and then creates
  its Review Pack; it has no model, subprocess, upload, publication, or
  canonical-promotion adapter;
- legacy unbound outputs remain readable/downloadable but cannot count as
  workflow completion;
- **2,158 repository tests passed**, live Streamlit inspection passed, and
  three independent adversarial re-audits returned **GO**.

Phase 9B implemented and verified on 14 July 2026:

- the existing Review Inbox remains corpus-wide by default and adds an exact
  validated maximum-15 workflow scope rather than a replacement queue;
- `proposal-dossier-index-v1.0` binds the exact workflow, dispatch, Batch
  Outcome, and provisional-memory snapshot, preserves complete evidence and
  provenance, and visibly separates proposal records in the selected batch
  from archive-wide context;
- filters cover human exceptions, specialist/second-opinion attention,
  conflicts, recurrence, consequential promotion, publication lanes, current
  local decisions, and decisions on prior evidence snapshots;
- stable proposal IDs navigate into the existing Local Proposals editors;
  positional indexes are never used as dossier identity;
- `review-decisions-v1.0` records accept, edit, reject, defer, add-variant,
  add-evidence, and merge events as an append-only local ledger bound to one
  exact dossier snapshot;
- changed evidence creates a new undecided snapshot while preserving prior
  history; no decision rewrites Analysis/Enrichment, promotes canonical data,
  uploads, publishes, or authorizes public release;
- evidence is paginated and includes quote, full locator, source, confidence,
  rationale, and model/prompt provenance; immutable event history is visible;
- **2,201 repository tests passed**. Initial adversarial audits found real
  completeness, symlink, identity, permissions, and SQLite-trigger failures;
  all were fixed and the contract re-audit returned **GO**. Streamlit AppTest
  passed for the corpus-wide default and the real scoped no-outcome workflow.

### Phase 10A — Bounded dependency and change-impact preview — completed

Replace implicit timestamp assumptions with an explicit dependency index.

Changes:

- fingerprint inputs, policies, prompts, models, extraction versions, and
  outputs per stage;
- compute which downstream artifacts become stale after re-extraction, model or
  prompt changes, lexicon changes, researcher decisions, or policy changes;
- show the impact before re-running anything;
- let the researcher re-audit the most consequential documents without forcing
  a corpus-wide rerun;
- keep old artifacts and decisions addressable for research reproducibility.

Verification gate:

- agent tests every dependency edge and checks that changes invalidate all and
  only the expected descendants;
- fixtures cover extraction, citation, Analysis, Enrichment, embedding,
  specialist, memory, tag projection, outcome, Review Pack, and public
  projection chains;
- no automatic rerun is triggered by invalidation alone.

Completion evidence on 14 July 2026:

- the existing exact maximum-15 workflow and Processing Queue remain the scope
  and authority; no corpus-wide dependency database was introduced;
- current local evidence is content-fingerprinted with safe bounded reads,
  before/after identity checks, exact workflow/dispatch/projection binding, and
  route-specific specialist evidence;
- declared extraction/output changes are separated from prompt/model/lexicon
  re-audit candidates, conditional downstream impact, and unknown legacy
  provenance;
- publication-policy changes affect publication readiness only, and a Phase 9B
  dossier decision refreshes its decision projection without staling Analysis,
  Enrichment, or the Batch Outcome;
- archive-wide provisional-memory fan-out is reported as unknown outside the
  selected batch instead of scanning or making claims about all documents;
- old artifacts and decisions are preserved, no rerun/triage/model/upload/
  publication action is exposed, and ongoing ingestion is not locked;
- initial independent contract review found projection-truncation, publication
  overreach, specialist-fingerprint, and false dependency-edge defects. These
  were fixed and covered by regressions; Streamlit verification returned GO;
- **2,219 repository tests passed**.

Phase 10B remains a separate producer-side change. It should record one exact
resolved-input receipt for each new Analysis/Enrichment run covering extracted
text, complete system and user input, resolved model/parameters, lexicon,
provisional-memory, tag-registry, and policy identities. Historical runs must
remain addressable and must not be retroactively presented as exact when those
receipts do not exist. Review dossier and decision-ledger fingerprints also
remain outside the Phase 10A Processing Queue snapshot; they continue to be
authoritatively preserved by Phase 9B.

### Phase 10B — Exact resolved model-input receipts — completed

New Analysis and Enrichment runs now write a content-free `resolved-model-input-v1`
receipt into their existing archived audit chain. Each receipt binds hashes and
sizes for the extracted text and complete system/user inputs; the resolved model
and parameters; and exact lexicon, provisional-memory, tag-registry, and policy
identities. Enrichment chunk fallback records a separate receipt for every model
request and a validated `resolved-model-input-aggregate-v1` receipt for the exact
ordered set of successful chunks. A partial chunk run remains partial. Raw prompts,
document text, testimony, and model responses are not stored in receipts or failure
messages.

The Phase 10A dependency snapshot calls a stage `exact` only when a valid new
producer receipt is present. Historical audit files without one remain `partial`
or `unknown`; they are not retroactively upgraded. The Processing Queue exposes a
collapsed read-only receipt inspector with truncated fingerprints and model IDs,
without any execution, rerun, upload, or publication controls.

Completion evidence on 14 July 2026:

- `EnrichmentRunMeta` now preserves provisional-memory, GOV.UK definition-memory,
  tag-registry, lexicon, policy, and input-receipt fields instead of silently
  dropping them;
- the GOV.UK reference block is cryptographically bound through the complete
  Enrichment system-input hash and retains its own manifest receipt;
- the normal Streamlit Workbench, second-opinion Analysis, and alternate CLI
  Enrichment routes persist canonical or paired receipt sidecars;
- strict validation recomputes request and parameter fingerprints, requires exact
  stage/dependency equality, rejects extra or forged fields, and never trusts a
  stored `exact` flag by itself;
- routing aliases are distinguished from provider-resolved identities, so exact
  input coverage is not presented as proof of immutable model weights;
- failed model responses use bounded error codes, character counts, and hashes;
  private response excerpts cannot flow into audit errors, dependency snapshots,
  or chunked researcher notes;
- focused producer, persistence, dependency, and Streamlit tests pass;
- three independent audits cover model-input safety, exact-versus-historical
  semantics, and Streamlit read-only behavior;
- **2,251 repository tests passed** after the final security, aggregate-receipt,
  alternate-run, and UI trust regressions were added.

### Phase 11 — Stronger source identity and provenance — 11A and 11B completed

Improve the current hostname-based source-family proxy without pretending that
multiple URLs are independent evidence.

Changes:

- record canonical URL, DOI, title, author/producing actor, publication, date,
  filename, content hash when safely available, mirror relation, and document
  family;
- represent confidence and provenance for each match;
- distinguish proposal count, document count, source-family count, producing
  actor count, and publication count;
- add relationship suggestions such as `mirror_of`, `version_of`,
  `translation_of`, and `derived_from`, never automatic merges.

Verification gate:

- agent checks false independence, mirrored PDFs, translated editions, missing
  metadata, conflicting DOI/title data, and manually corrected identity;
- UI never labels these measures “independent attestations” without a justified
  rule.

Phase 11A completion evidence on 15 July 2026:

- added a derived `source-identity-index-v1.1` projection that reconciles
  canonical URL, DOI, title, authors/producers, publication/date, filename,
  language, and safely available existing hashes without reading the external PDF
  library or rerunning Triage;
- candidate values retain source file, JSON pointer, source kind, confidence, and
  visible conflicts; confidence describes matching reliability, not truth;
- deterministic exact-byte, DOI, canonical-URL, and title/author/year matches
  produce pending `mirror_of`/`version_of` suggestions and never merge documents
  or affect family counts;
- separate document, byte-group, hostname-proxy, actor, publication, resolved
  family, and unresolved-relation counts explicitly set `independence_claim=false`;
- added a read-only-first Streamlit **Source Identity** page and `runner
  source-identity` CLI; local snapshot writing is explicit, content-addressed,
  atomic, and confined to `exports/review/source_identity`;
- a real read-only corpus preview reconciled 77 documents in under three seconds,
  reusing 70 recorded byte groups and proposing one deterministic relationship;
- the Phase 11A adversarial audit now separates source-artifact and landing-page
  hashes, suppresses matches from conflicted metadata, recomputes all derived
  relationships/counts during validation, and rejects symlinked output paths;
- **2,289 repository tests passed** after the testimony-upload separation,
  GOV.UK authority preservation, and Phase 11A audit hardening were added.

### Phase 11B — Append-only identity decisions and reviewed-family integration — completed

- Phase 11B adds append-only, content-addressed researcher decisions for field
  resolution, manual correction, document-family assignment, and relationship
  review. Every decision binds the reviewed document-input fingerprints and can
  be superseded only through an explicit, non-branching history chain;
- decisions remain usable after unrelated corpus growth, but fail closed as stale
  when a bound document, candidate, or relationship changes;
- accepting a relationship never merges files or changes family counts. Only an
  explicit family assignment can affect reviewed-family measures, and a partial
  document scope can never emit a definitive corpus source-family count;
- the reviewed projection is replay-validated against its source snapshot and
  decision ledger, then may be saved explicitly as an immutable artifact for
  provisional memory and Review Packs. No remote upload or publication occurs;
- Batch Outcome loads the saved snapshot and decision ledger, excludes stale
  decisions, strictly replays the reviewed projection, and passes only that
  validated state into provisional memory and Review Packs. Missing or corrupt
  state withholds reviewed counts and records a bounded reason without stopping
  ordinary ingestion;
- hostname grouping remains a separately labelled proxy for existing recurrence
  behavior. Reviewed counts do not replace it, and neither measure is described
  as independent attestation;
- full-corpus snapshots larger than 8 MiB replay under a bounded 256 MiB
  snapshot limit, while ordinary input sidecars retain the tighter 8 MiB limit;
- independent adversarial verification returned **GO** with **99 focused tests**,
  covering concurrency, corpus growth, stale evidence, partial scope, forged
  projections, large snapshots, and end-to-end Batch Outcome integration;
- **2,309 repository tests passed** after Phase 11B integration.

### Phase 12 — Atomic compilation manifests

**Completed 15 July 2026.** Prevent valid but unreferenced derived files when a
compilation fails halfway.

Changes:

- stage provisional memory, tag projections, Batch Outcome, and Review Pack
  indexes under a compilation attempt;
- validate all staged fingerprints, then atomically publish one local manifest
  that points to the completed immutable artifacts;
- preserve abandoned attempts for diagnosis with no automatic deletion;
- add repair/reindex commands that never delete source or canonical artifacts.

Verification gate:

- agent injects failure after each write boundary and confirms that readers see
  either the previous completed compilation or the new completed one, never a
  misleading half-state;
- concurrent compilation and recovery tests pass.

Implemented result:

- every compilation writes a durable attempt marker before provisional memory,
  tag projection, Batch Outcome, or Review Pack output becomes eligible for
  discovery;
- tag projections now have immutable content-addressed snapshots; a completed
  manifest binds every artifact by absolute confined path, byte length, SHA-256,
  declared schema, and declared evidence/content fingerprint where available;
- only `latest_completed_compilation.json` is the visibility commit. Streamlit
  and enrichment readers retain the previous completed manifest during a newer
  staging/abandoned attempt and suppress legacy fallback once a batch has entered
  Phase 12;
- process-safe file locking and predecessor comparison prevent concurrent lost
  updates. Repair takes the same lock and cannot regress a concurrent commit;
- abandoned attempts remain available for diagnosis. `compilation-repair` and
  `compilation-reindex` are additive local recovery commands and delete no source,
  corpus, immutable artifact, or remote record;
- unsafe paths, symlink escapes, slug collisions, misplaced batch manifests,
  tampered bytes, partial writes, and injected failures fail closed;
- independent verification returned **GO**; the final Phase 12 focused suite
  passed **302 tests** and the full repository regression suite passed
  **2,332 tests**.

### Phase 13 — Separate remote reconciliation and guarded publication

Only after local workflows are dependable, add an executor for researcher-
authorized remote transitions.

Changes:

- compare local intended state with Sanity/Supabase receipts instead of treating
  missing local receipts as proof of remote absence;
- distinguish preview, private upload, public draft, and publish authorities;
- require explicit selected-record confirmation and show the exact diff;
- use idempotency keys and append-only reconciliation receipts;
- keep public summaries/tags tied to disclosure and audit records.

Verification gate:

- two agents review this phase: one for idempotency/recovery and one for privacy,
  disclosure, and authorization;
- use mocks or a dedicated test target first; no production remote write occurs
  as part of automated tests or verification;
- researcher performs the first real private upload explicitly.

### Phase 14 — Link Queue decisions and metadata-only PDF matching

Resume the paused PDF work after the central research workflow is usable.

Changes:

- add confirm, reject, and defer decisions for URL/local-PDF candidates;
- score DOI, title, author, year, filename, and safe local hashes with transparent
  per-signal provenance;
- use embeddings only as a candidate signal, never an automatic attachment;
- continue storing paths/metadata only—never copy, move, rename, delete, or
  hydrate source PDFs;
- export an ingestion manifest accepted by the existing offload process.

Verification gate:

- agent audits filesystem safety and OneDrive placeholder handling;
- fixtures cover moved/missing paths, duplicate files, ambiguous matches, cloud
  placeholders, and corrected researcher decisions;
- measure benefit on a small sample before hashing or inspecting more PDFs.

### Phase 15 — Operational hardening, documentation, and maintenance

Make the system maintainable by one researcher rather than dependent on the
original implementation session.

Changes:

- add a health/status panel for locks, workers, database migrations, disk use,
  stale attempts, and last successful backups/exports;
- document start, stop, resume, recovery, re-audit, pack generation, and safe
  publication workflows in researcher language;
- add schema migration tests, fixture snapshots, log retention, backup/restore
  rehearsal, and a compatibility matrix for local models;
- split additional business logic out of `runner/app.py` only when touching that
  area for a concrete phase;
- record known limitations and decisions beside versioned schemas.

Verification gate:

- independent agent follows the runbook from a clean local test configuration;
- full automated suite, Python compilation, diff checks, and Streamlit smoke
  tests pass;
- a recovery rehearsal proves that an interrupted job can be understood and
  resumed without editing database rows manually.

## Phase ordering rules

- Phase 5A is the observational commissioning gate, Phase 5B is the integrity
  gate, and Phase 6A is the completed planner-only gate. Those GO decisions do
  not authorize execution by themselves. Only the separately confirmed 6B.1
  testimony canary is allowed; every other subprocess, model, import, upload,
  publication, or executable transition still requires its own design, tests,
  and independent review.
- Phase 7 can proceed in parallel with local-only Phase 6 development. It reads
  existing proposal artifacts without mutating them, snapshots proposal
  identity/content into immutable dossiers, and keeps decisions append-only.
- Phase 8 must consume Phases 4 and 6; it must not invent another workflow-state
  authority.
- Phase 9 should precede deeper memory/provenance refinement so the researcher
  receives immediate value from the existing compiler and Review Packs.
- Phase 10 must precede broad re-auditing or automatic reruns.
- Phase 13 remains separate from all local processing and cannot be pulled
  forward for convenience.
- Phase 14 remains deliberately later: PDF matching is useful, but it should not
  delay the core batch-to-evidence-to-review workflow.

## Researcher workload target

The researcher should normally:

1. add sources and supply a research purpose/question;
2. inspect the proposed maximum-15 selection and routes;
3. start or resume eligible processing once;
4. intervene only in technical exceptions, sensitive testimony/legal matters,
   unresolved conflicts, and consequential vocabulary/publication decisions;
5. use Batch Outcomes and Review Packs for analysis, audit, storytelling, and
   public disclosure.

The researcher should not be asked to re-triage the existing archive, approve
routine proposals document by document, manually infer which stages are stale,
restart waiting jobs, or reconcile remote records by memory.
