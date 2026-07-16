# Reuse-First Batch Outcome and Review Pack Plan

Status: approved implementation direction, 2026-07-11

## Purpose

Improve the researcher workflow without replacing the working Source Queue,
triage history, batches, Analysis + Enrichment split, embedding, specialist
review tools, document sets, Review Inbox, or publication safeguards.

The system already performs the core research processing. The missing layer is
coordination: consolidate what happened, route only the necessary specialist
work, and create bounded evidence-rich packets for review.

## Existing systems that remain authoritative

- Source Queue and its existing triage decisions, including the approximately
  4,000 already-triaged sources.
- Batch manifests, ledgers, preflight checks, limit of 15, failure reporting,
  and resumable local/offload package lifecycle.
- Separate Analysis and Enrichment passes, followed by embeddings.
- Existing enrichment families: lexicon, entities, tactics, practices,
  statistical claims, ingestion candidates, and corpus connections.
- Citation units, evidence locators, archive summaries, knowledge graph,
  knowledge quality, and research digest.
- Existing media, testimony, longform, legal, second-opinion, and research
  annotation capabilities.
- Existing document sets and Review Inbox.
- Fail-closed publication gates and explicit researcher decisions.

## Implementation sequence

### 1. Correct the Batch Outcome Compiler

- Accept normal batch ledgers and offload worker/result records.
- Read existing Source Queue triage flags without changing the queue.
- Separate processing success from research findings and publication readiness.
- Count every real enrichment family.
- Use the existing bounded review-plan policy, with corpus-wide recurrence but
  focused on concepts present in the selected batch.
- Emit dry-run specialist routes to existing tools.
- Preserve immutable, policy-versioned re-audit snapshots.

### 2. Generate Codex Review Packs

- Use a compiled batch outcome or an existing document set.
- Compose existing archive summaries, Analysis, Enrichment, citation locators,
  specialist sidecars, source links, local paths, provenance, and questions.
- Produce bounded Markdown and JSON.
- Make no model calls, uploads, publication writes, or canonical decisions.

### 3. Validate specialist routing in dry-run mode

- Show what would run, why, prerequisites, prior completion, and human-attention
  level.
- Do not execute specialist processes until the route plan is validated.

### 4. Add guarded specialist execution

- Invoke existing tools rather than reimplementing them.
- Add idempotency, retry/resume, stage status, model unloading, additive manifest
  versioning, and partial-failure handling.

### 5. Integrate batch views into the existing Review Inbox

- Filter by batch, specialist attention, evidence conflict, recurring proposal,
  automatically retained provisional finding, and publication readiness.
- Keep routine findings AI-managed and provisional; reserve researcher time for
  sensitive, conflicting, recurring, or consequential decisions.

## Non-goals and safety boundary

- No re-triage of existing sources.
- No replacement Source Queue, batch system, validation queue, document-set
  system, lexicon store, citation layer, or ingestion pipeline.
- No automatic promotion into canonical records.
- No automatic Sanity/Supabase writes from compilation or Review Packs.
- No broad refactor of `runner/app.py` during these first changes.

## Regression requirements

- Every input item receives exactly one processing outcome.
- Existing triage and researcher decisions are never silently altered.
- Normal and offloaded workflows are both understood.
- Specialist failure cannot erase successful base processing.
- Compiler and Review Pack generation are deterministic and local-only.
- Existing tests remain green, with additional fixtures for standard, media,
  testimony, legal, longform, partial failure, imported, and missing-stage cases.

## Implemented iteration: provisional memory and tag projection

The Batch Outcome Compiler now also creates a deterministic provisional-memory
snapshot and a dry-run tag projection for the batch documents.

Every draft proposal record preserves:

- original proposal and stable proposal ID;
- document ID, source URL, and a transparent hostname-based source-family
  proxy;
- exact evidence field, evidence text, and locator status;
- proposal-level model confidence and rationale when reported;
- Analysis confidence separately from proposal confidence;
- researcher confidence when present;
- Analysis and Enrichment model, prompt, ontology, and git provenance;
- proposal lifecycle and explicit provisional trust state.

Clusters store document recurrence, source-family recurrence, located-evidence
count, conflict signals, and descriptive confidence statistics separately. No
single combined truth/confidence score is created. Hostname diversity is not
treated as proof of source independence.

Derived `tag_projection.json` sidecars are optional and explicit. They preserve
the original Analysis labels, map only exact normalized matches to the existing
tag registry, and retain corpus-memory clusters as provisional context. Writing
these sidecars never rewrites `analysis.json` or `enrichment.json`.

Source-attested provisional clusters can now be retrieved into Enrichment using
a bounded deterministic label-overlap context. The prompt labels the material
as provisional, records the memory fingerprint and selected cluster IDs in the
Enrichment audit, and explicitly prohibits treating recurrence or model
confidence as verification. Provisional memory remains excluded from baseline
Analysis.

Review Packs now support `private_local` and `external_safe` modes. The latter
removes local paths and specialist outputs and withholds testimony/legal
document contents. This is a safety filter, not a guarantee that a pack is safe
for public release.

## Implemented Phase 9A binding and completion surface

The reuse-first endpoint is now connected to the frozen maximum-15 workflow:

- the existing Batch Outcome compiler receives the actual validated workflow
  and specialist dispatch rather than trusting labels or a bare binding;
- every deferred, technical-hold, linked, and specialist-routed row remains
  visible in the audit;
- outcome, route plan, Review Pack, and Markdown siblings are immutable and
  validated before reuse;
- Review Packs bind the exact Batch Outcome content and cannot silently replace
  embedded evidence or copied provisional-memory projections;
- changed base or specialist evidence makes the old completion artifact stale;
- Streamlit exposes one local completion panel beneath the read-only Processing
  Queue, while the old live-batch-adjacent compiler control is removed;
- historical unbound files remain available as provenance but do not mark the
  selected workflow complete.

Verification on 14 July 2026: **2,158 tests passed**, three independent
adversarial audits returned **GO**, and the real Source Queue UI was inspected
with terminal history, Processing Queue, and completion panel all visible.
