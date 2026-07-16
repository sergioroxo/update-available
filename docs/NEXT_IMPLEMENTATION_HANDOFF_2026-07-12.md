# Next Implementation Handoff — 12 July 2026

## Current objective

Continue improving the existing Streamlit researcher system incrementally. Do
not rebuild triage, batching, Analysis, Enrichment, specialist processors,
document sets, the Review Inbox, or publication clients.

The target operating model is:

1. select and triage no more than 15 sources;
2. run Analysis, citation units, Enrichment, and embeddings broadly;
3. retain model discoveries as evidence-linked provisional memory;
4. consolidate across batch and corpus;
5. ask the researcher only about technical exceptions, sensitive material,
   consequential promotion/merge decisions, and research/story curation;
6. preserve original model outputs and regenerate derived projections when
   policies or memory change.

## Verified baseline

- Full automated suite: **1,925 passed** on 12 July 2026.
- Real completed batch `batch-20260603-193545`: 3/3 accounted for.
- All three documents have complete required local stages.
- All three ordinary proposal sets are `ai_managed_provisional`; no unnecessary
  per-document human approval was created.
- Real provisional memory: 669 records, 545 clusters, 524 proposal-confidence
  values reported, 374 located evidence records, and 60 Analysis discovery hints.
- Latest real external-safe Review Pack contains no `/Users/` or `/private/`
  filesystem paths.
- No model, upload, publication action, or original corpus-artifact rewrite was
  performed by compilation or Review Pack generation.

### Final-schema refresh completed

The final Batch Outcome and Review Pack schemas have now been refreshed against
the real completed batch. Batch `batch-20260603-193545` remains 3/3 accounted
for and ordinary-ready. External-safe pack
`batch-20260603-193545--f25383a2dde5` was regenerated and contains no
`/Users/` or `/private/` paths. No model, upload, publication, or source-artifact
mutation occurred.

## Implemented contracts

### Batch Outcome v2.1

`runner/pipeline/batch_outcome.py`

- Accepts normal ledgers, worker reports, and result manifests.
- Reads Source Queue triage state read-only.
- Separates operational outcome, stage state, specialist routes, provisional
  knowledge, review lane, and publication readiness.
- Preserves specialist-held manifest rows outside the execution count.
- Includes corpus-memory and tag-projection fingerprints in re-audits.
- Retains selected and deferred human exceptions as distinct states.

### Provisional memory v1

`runner/pipeline/provisional_memory.py`

- Preserves raw proposals, Analysis candidate-term hints, evidence, locators,
  model confidence, researcher confidence, source provenance, and model/prompt
  provenance.
- Counts documents and hostname-based source-family proxies separately.
- Does not create a combined truth score.
- Excludes rejected and already-pushed proposals from active recurrence and
  Enrichment retrieval while retaining their history.
- Injects only source-attested/recurring/conflicted provisional clusters into a
  bounded Enrichment context with explicit warning and audit fields.

### Tag projection v1

- Exact normalized registry matches may change the derived display label.
- Unmatched Analysis tags remain original.
- Provisional clusters remain contextual drafts.
- `analysis.json` and `enrichment.json` are never rewritten.
- Document-sidecar writes require explicit Streamlit confirmation.

### Review Pack v1

- `private_local`: full local evidence; do not share without review.
- `external_safe`: recursively removes local paths and withholds testimony/legal
  content and specialist outputs.
- Neither mode is automatically public-safe.

## Workflow batch contract: foundation implemented

The existing `plan_batch()` selects only unattended-safe sources. Specialist
flags therefore exclude sources before execution. The compiler now records
those held rows, but this is not yet a true maximum-15 workflow selection.

The new additive module is implemented without changing the old batch contract:

```text
runner/pipeline/workflow_batch.py
```

Current schema: `workflow-batch-v1.0`.

Required batch-level fields:

- workflow batch ID and creation timestamp;
- maximum 15 selected Source Queue IDs;
- research purpose/questions;
- policy version;
- model policy;
- remote-write policy: `none | private_upload` initially;
- disclosure mode;
- audit sample rule;
- source-selection provenance.

Required per-source fields:

- queue ID, URL/hash, file attachment, triage timestamp/model;
- base route: `ordinary | attended_base | deferred | technical_hold`;
- zero or more specialist routes;
- reason and prerequisites;
- existing corpus document link;
- explicit state, attempt ID, and next safe action.

Selection must occur before routing so ordinary and specialist sources together
never exceed 15. Do not append every excluded queue row to an execution batch.

### Workflow-batch verification

1. Fifteen selected sources containing ordinary, media, testimony, legal, and
   longform cases remain exactly fifteen after routing.
2. Existing triage is reused and never rerun implicitly.
3. Untriaged and missing-attachment sources fail closed with explicit reasons.
4. Rehearsal writes no corpus, queue, model, or remote state.
5. A specialist source is not silently discarded merely because it is unsafe
   for unattended execution.
6. Existing `plan_batch()` and `batch-run` behavior remains green until the new
   contract has real-batch validation.

All six behaviors are automated. A real existing group was rehearsed on 12 July
2026: exactly 15 sources were selected, all 15 followed the ordinary route, and
no model, queue mutation, corpus mutation, command execution, or remote write
occurred. The Streamlit control lives inside the existing Source Queue batch
panel and displays one base/specialist/prerequisite/next-action table.

## Dry-run specialist dispatcher: foundation implemented

Add a separate service over existing implementations; do not embed execution
logic in Streamlit.

Suggested module:

```text
runner/pipeline/specialist_dispatch.py
```

Route mappings:

- media → existing media extraction/report and optional annotation profiles;
- testimony → candidate build, deep review, then human consent state;
- legal → extraction/audit preparation only; public interpretation remains human;
- longform → build, section review, synthesis with partial recovery;
- uncertainty/selected sample → existing second opinion.

The first milestone is dry-run only. Its target contract includes prerequisites,
lock policy, existing and stale artifacts, estimated model work, completion
validators, and the exact existing function/command that would run.

Do not equate sidecar existence with completion. Reuse the improved validators
already started in `batch_outcome.py` or extract them into the dispatcher.

Current boundary: route mapping, prerequisites, human authority, planned
commands, dry-run guarantees, evidence fingerprints, and immutable plan history
are implemented. The real ordinary 15-source rehearsal correctly produced zero
specialist routes. Before any execution is added, extract shared completion and
freshness validators from Batch Outcome, add explicit stale-artifact reporting,
and observe a real mixed batch containing media, testimony, legal, and longform
sources. Automated fixtures cover those mixed routes, but fixtures are not a
substitute for that observational rehearsal.

## Third priority: guarded execution and resume

Phase 6A planning is complete and independently verified. Phase 6B.1 now adds
one independently verified deterministic execution canary for private testimony
candidate sidecars. It reuses the
per-batch attestation, immutable planner-only plans, dependency-aware rows,
actual-input fingerprints, append-only intents/events, reconciliation, CLI,
and an opt-in Streamlit projection. Plans remain non-authorizing; execution is a
separate exact one-use event. Streamlit remains read-only.

The next execution expansion (Phase 6B.2) may begin only as a separately
reviewed local adapter:

- consume the existing Phase 6A attempt IDs and append-only records;
- reuse existing locks and model unload behavior;
- skip valid completed stages;
- retry failed stages without overwriting failed evidence;
- preserve partial longform/testimony results;
- never automatically complete legal/consent decisions;
- make remote upload a separate later transition.

## Known flaws and risks to address

### Authority and feedback

- Exact quote location proves text presence, not semantic support.
- Model confidence is self-assessment, not accuracy.
- Analysis candidate terms and Enrichment proposals from the same document can
  both exist; they count as one source family but can still weight descriptive
  proposal counts. Future cluster summaries should add per-stage and per-document
  counts before any confidence aggregation.
- Retrieval uses deterministic label overlap against the model-produced Analysis
  summary/tags. It is bounded and disclosed, but can still reinforce framing.
  Add source-only anchor comparisons before expanding retrieval.

### Source independence

- Hostname is only a proxy. Add canonical URL, DOI, content hash, producing
  actor/publication, mirror relation, date, and document-family identifiers.
- Never call source-family count “independent attestations” until this improves.

### Clustering

- Current clustering merges only conservative normalized exact labels.
- It does not solve translation, historical semantic change, synonyms, or false
  friends. Add candidate relationships (`close_match`, `translation`,
  `successor`, `possible_merge`) rather than automatic merges.
- Conflict detection works only inside an existing exact-normalized cluster.

### Storage and privacy

- Provisional-memory snapshots contain private evidence and must remain internal.
  Atomic writes currently create owner-only temporary files on macOS, but add an
  explicit sensitivity manifest and retention policy before wider sharing.
- `external_safe` is a conservative filter, not anonymization certification.
- An earlier local external-safe pack created during debugging remains in
  immutable local history; the latest projection has recursive path redaction.
  Do not share historical packs without checking their pack ID and mode.

### Atomicity and invalidation

- Compilation writes memory/projection exports before the final outcome snapshot.
  A later failure can leave valid but unreferenced derived snapshots. This is
  recoverable but should eventually use a compilation transaction/manifest.
- Re-extraction should invalidate citation locators, Analysis, Enrichment,
  embeddings, memory clusters, tag projections, Review Packs, and public
  projections. A dependency/impact index is still missing.
- Supabase absence is reported as `not_recorded`, because no local receipt does
  not prove the remote row is absent. Add reconciliation rather than guessing.

### Performance

- Current 66-document corpus memory scan took approximately 0.28 seconds.
- At mature scale, replace repeated full scans with an incremental SQLite index
  only after measured latency warrants it. Do not add a new service now.

## Streamlit next changes

Continue using the existing Source Queue and batch panel. Add:

1. saved batch question/policy templates (free-text purpose/questions already exist);
2. explicit selection controls in addition to current batch-group selection;
3. enrich the existing route table with freshness/completion-validator details;
4. keep the implemented rehearsal/dry-run planner and add execution only after mixed validation;
5. completed/rehearsal/offload input filters;
6. safe open/download actions;
7. grouped provisional-memory dossiers rather than proposal-row review.

Do not add another top-level queue page unless the existing panel becomes
demonstrably unusable.

## Files to preserve and reuse

- `runner/pipeline/source_queue.py`
- `runner/pipeline/batch.py`
- `runner/pipeline/source_worker.py`
- `runner/pipeline/offload_source.py`
- `runner/pipeline/review_plan.py`
- `runner/pipeline/testimony_candidates.py`
- `runner/pipeline/testimony_deep_review.py`
- `runner/pipeline/longform.py`
- `runner/pipeline/longform_review.py`
- `runner/pipeline/media_review.py`
- `runner/pipeline/second_opinion.py`
- `runner/pipeline/research_annotate.py`

## Verification commands

```bash
.venv/bin/python -m pytest -q
.venv/bin/python -m py_compile runner/pipeline/*.py runner/app.py runner/main.py
git diff --check
```

Before guarded specialist execution, validate dry-run plans on at least:

- one ordinary source;
- one media source;
- one testimony source;
- one legal source;
- one longform PDF;
- one failed extraction;
- one offload partial result;
- one already-processed document;
- one missing local attachment.

## Worktree warning

The repository is intentionally dirty and contains substantial researcher and
prior implementation work. Do not reset, clean, overwrite, or broadly reformat
the worktree. Use targeted `apply_patch` edits and preserve unrelated changes.
