# Researcher Workflow v2: Archive RAG and Exception-Based Review

Date: 11 July 2026  
Status: evolving operating model; current/next boundaries are explicit below.

## The short answer

SurvivingSOGICE should become a **retrieval-augmented archival analysis
system**, not primarily a chatbot and not a manual cataloguing interface.

Its central loop should be:

```text
Researcher adds sources and defines a batch/research question
                            ↓
Triage assigns processing routes and model effort
                            ↓
AI extracts, analyzes, enriches, embeds, and audits in bounded waves
                            ↓
Batch compiler separates ordinary AI-described records from exceptions
                            ↓
Ordinary records upload under a disclosed-AI policy
                            ↓
Researcher handles only sensitive/consequential exceptions and promotions
                            ↓
Batch memory consolidates recurring terms/evidence and updates retrieval
                            ↓
Anchors and affected important documents are selectively reprocessed
```

The researcher should not review every document, every tag, or every proposed
lexicon row.

## Is this RAG?

It is **RAG-ready but not yet a complete closed-loop RAG system**.

Already implemented:

- full extracted text and stable citation units;
- local and Supabase embeddings;
- semantic search;
- a compact trusted lexicon injected into analysis;
- fuller lexicon/entity memory injected into enrichment;
- evidence graph and document profiles;
- provenance for model, prompt, lexicon, and processing state.

Still missing:

- retrieving the most relevant earlier documents before analysis/enrichment;
- injecting their IDs, quotes, trust state, and citations into the model call;
- retrieving prior human corrections and anchor outcomes as examples;
- an automatic batch-memory consolidation step;
- selective reprocessing when relevant memory changes.

Until those are wired, corpus growth improves search and research outputs but
does not automatically improve every later model run.

## Comparison with Detrans.ai

Detrans.ai describes a conversational RAG agent: a user asks a question, the
system queries indexed Reddit/YouTube experiences or studies, and a model
integrates retrieved passages into an answer with links.

SurvivingSOGICE needs two related but different retrieval systems:

1. **Internal retrieval-assisted ingestion (build first).** When processing a
   document, retrieve related terms, actors, practices, documents, and reviewed
   corrections. This improves classification, deduplication, and evidence
   connections.
2. **Public research/story retrieval (build later).** Let users explore only a
   public-safe slice through evidence-backed search, graph neighborhoods,
   timelines, or carefully bounded questions.

The internal system is the priority because it improves every later archive,
visualization, and storytelling output.

## The researcher's five recurring actions

### 1. Add and contextualize sources

Researcher does:

- add URLs/files to Source Queue;
- optionally provide a title, landing-page link, source file, provenance note,
  or research priority;
- group sources into a research batch of up to 15 documents.

AI/system does:

- deduplication, acquisition tests, source-type detection, preservation checks,
  and initial triage.

### 2. Approve a batch policy, not individual runs

The researcher chooses a batch-level policy such as:

- ordinary archive ingestion;
- legal/policy research;
- media/testimony research;
- long-form/book research;
- thesis-critical deep analysis.

The system then executes up to 15 documents, respecting current memory/model
limits and preserving per-document recovery after a partial failure.

### 3. Read one compiled outcome, not 30 pipelines

The batch compiler should report:

- completed and uploaded AI-described documents;
- capture/extraction failures needing a replacement file or link;
- documents routed to an independent second opinion;
- legal/testimony/sensitive exceptions;
- recurring candidate terms/entities/practices;
- genuinely novel or conflicting evidence;
- impacted anchors/key documents recommended for reprocessing.

The researcher intervenes only in the exception list.

### 4. Promote memory at batch level

The system should automatically:

- group candidate labels and spelling/language variants;
- compare them with the existing lexicon and entity registry;
- collect independent evidence quotes across documents;
- distinguish recurrence from one model repeating its own earlier suggestion;
- use a second model to challenge proposed merges/definitions;
- preserve every proposal as provisional unless promoted.

The researcher sees only:

- high-impact new concepts;
- ambiguous merges/genealogies;
- canonical identity questions;
- recurring terms with conflicting meanings;
- claims/edges intended for public research use.

### 5. Curate research and storytelling outputs

Researcher time should concentrate on:

- choosing meaningful document sets;
- interpreting patterns and absences;
- selecting defensible relationships;
- writing/curating narrative sequences;
- deciding how uncertainty and harm are represented;
- correcting public errors and responding to removal requests.

## Processing routes selected by triage

Every source receives the base route:

1. acquire/preserve;
2. extract/OCR/transcribe;
3. create citation units;
4. analyze/classify;
5. enrich against lexicon/registry memory;
6. embed;
7. deterministic quality/provenance audit.

Triage adds specialized routes:

| Signal | Additional automated route | Human involvement |
|---|---|---|
| Ordinary web/PDF | Base route only | None unless audit fails or selected for sampling |
| Long book/report | Long-form structure, section analyses, synthesis | Only failed sections or key interpretations |
| Media | Metadata repair, transcript comparison, media annotation profile | Missing transcript/source rights or selected evidence |
| Testimony candidate | Private candidate extraction and sensitivity audit | Consent, public excerpt, withdrawal/removal only |
| Legal/policy | Independent model comparison and citation audit | Legal interpretation intended for public use |
| Low evidence/model disagreement | Independent second opinion | Only unresolved consequential disagreement |
| Key/anchor document | Full comparative audit | Researcher reviews differences after system changes |

Research annotations such as documentary, podcast, shame, or network analysis
should be triggered by a research question/document set—not run on every source
during ingestion.

## Iterative model passes: yes, but selectively

More model passes are useful when they have different evidence or roles. Running
the same model twice with the same prompt mostly creates cost and false
reassurance.

Recommended roles:

1. **Primary analyst:** typed document description and classification.
2. **Evidence critic:** checks whether summary/tags are supported by located
   passages; does not rewrite everything.
3. **Independent second opinion:** different model family/role, invoked for
   disagreement, weak evidence, sensitive routes, anchors, or sampling.
4. **Batch consolidator:** compares proposals across the whole batch and
   existing memory.
5. **Lexicon auditor:** evaluates recurring evidence, variants, conflicts, and
   genealogy after consolidation.

Deterministic schema, citation, provenance, language, duplication, and
extraction checks should run before spending a second model call.

## How extra audits enter the learning loop

Every audit should write a typed, versioned sidecar with:

- document/evidence IDs;
- model/prompt/audit versions;
- finding and severity;
- affected terms/entities/tags;
- evidence locator;
- whether the result is agreement, disagreement, correction, or unresolved.

The next batch-memory/lexicon audit reads these sidecars together with new
document evidence. It may alter provisional memory automatically, but it must
not silently rewrite the canonical lexicon or researcher-promoted claims.

This prevents two opposite failures:

- audits disappearing into logs and never improving later work;
- one mistaken model output feeding itself back as if it were independent
  evidence.

## Public output lanes

### AI-disclosed document layer

May include:

- source metadata and links;
- AI-generated summary;
- document-level controlled-vocabulary tags;
- evidence/citation links;
- model, prompt, lexicon, retrieval, and audit disclosure;
- uncertainty and correction pathway.

Must exclude without promotion:

- canonical entity identity;
- funding/coordination/network assertions;
- claim-verification verdicts;
- legal interpretation;
- testimony/public excerpts.

### Researcher-promoted evidence layer

Used for canonical lexicon entries, entity pages, public evidence edges,
verified claim ledgers, testimony, legal interpretation, thesis arguments, and
curated storytelling.

## What is implemented today versus next

| Capability | Current state |
|---|---|
| Queue + triage | Implemented |
| Base batch/source-offload processing | Implemented; current safe batch limit is 15 |
| Triage route flags | Implemented, but special routes are held rather than orchestrated automatically |
| Analyze + enrich + embed | Implemented |
| Citation/provenance/quality audits | Substantially implemented |
| AI-long-tail vs human-exception review plan | Implemented as deterministic report |
| Two-lane publication audit | Implemented as deterministic report; no public publisher yet |
| Versioned batch outcome compiler | Implemented; workflow/dispatch-bound immutable audits, stale-evidence detection, and dry-run routes, no automatic execution |
| Bounded Review Packs | Implemented; exact Batch Outcome binding, private/external-safe modes, no canonical promotion or publication |
| Batch-scoped grouped Review Inbox | Implemented; exact workflow/outcome/memory dossiers, archive context kept separate, existing proposal editors reused |
| Append-only grouped research decisions | Implemented locally; exact evidence-snapshot binding, prior decisions never silently inherited, no canonical/remote authority |
| Retrieval injected into analysis/enrichment | Not implemented; highest-value next data feature |
| Specialized route orchestrator | Not implemented; highest-value next workflow feature |
| Batch memory/lexicon consolidation | Not implemented as one automated stage |
| Selective impacted-document reprocessing | Not implemented |
| Public-safe RAG/search/story layer | Not implemented; follows internal retrieval and public adapter |

## Recommended implementation order

1. **Use and refine the Batch Outcome Compiler.** Compile existing ledgers,
   observe exception rates, and adjust the versioned policy from real batches.
2. **Guarded outcome executor.** Upload ordinary AI-described records, send
   weak/sensitive/conflicting records to the appropriate model or human
   exception lane, and never present the long tail as a manual backlog. Begin
   in confirmation mode and add automatic execution only after observed audits.
3. **Internal retrieval injection.** Retrieve related reviewed terms/documents/
   corrections with IDs and evidence quotes before analysis and enrichment.
4. **Batch memory and lexicon audit.** Consolidate recurring evidence after
   each batch; update provisional memory and escalate only promotion decisions.
5. **Selective reprocessing.** Re-run anchors and documents affected by changed
   terms/ontology/prompts rather than the whole corpus.
6. **Researcher exception dashboard.** One screen for capture fixes,
   disagreements, sensitive decisions, memory promotions, and corrections.
7. **Public-safe adapter and exploratory RAG.** Build search/graph/story tools
   over the two explicit public trust lanes.

## Adjustable audit cycle now implemented

The outcome policy is a normal versioned JSON file:

```text
runner/data/batch_outcome_policy.json
```

Compile an existing batch ledger with:

```bash
python -m runner batch-outcome exports/batch_ledgers/<batch-id>_ledger.json
```

For a frozen maximum-15 workflow, the normal researcher path is now the Source
Queue’s **Processing Queue — read only**, followed by its sibling **Finish
selected workflow — local research files** panel. The panel uses the same
selected workflow; there is no second batch selector. It enables compilation
only when local evidence is stable or an exception is explicitly accountable
(for example a triage hold or human-required specialist decision). It then
unlocks a Review Pack for the exact compiled outcome.

The next researcher step is **Review Inbox → Batch and grouped-dossier
review**. Selecting the same frozen workflow limits the existing document
readiness groups to its exact linked documents and, once a bound Batch Outcome
exists, shows grouped provisional findings. The dossier evidence view includes
the original quotes, locators, confidence/rationale, source family, and
model/prompt provenance. Archive-wide recurrence remains useful context but is
not counted as extra batch membership.

Grouped actions are local research decisions only. They are append-only and
bind the exact dossier snapshot. They do not change the original proposal,
canonical lexicon/tag registries, Sanity/Supabase, or publication readiness.
If evidence changes and the batch is recompiled, the old decision remains
visible as prior history and the new snapshot starts undecided.

Compilation refreshes derived provisional-memory and dry-run tag-projection
exports, but does not write document sidecars, call a model, ingest, upload,
publish, or approve terms/tags. If any compiled base or dynamic specialist
evidence changes later, the Processing Queue marks the outcome/pack stale and
asks for a recheck.

The command creates an immutable snapshot under:

```text
exports/batch_outcomes/<batch-id>/audits/<audit-id>/
├── batch_outcome.json
├── batch_outcome.md
└── route_plan.json
```

It also updates `latest_*` convenience files. The route plan is always a dry
run: it makes no model calls, corpus changes, uploads, or remote writes.

When research conditions change:

1. copy or edit the policy and increment `policy_version`;
2. add new sensitive types, specialist flags, required artifacts, or proposal
   fields;
3. compile the same ledger with `--policy <new-policy.json>`;
4. read `changes_from_previous` to see which documents changed route and why;
5. retain both audit snapshots as part of the methodological record.

Changing a relevant document artifact also produces a new audit. Running the
same policy over identical evidence reuses the existing snapshot. This makes
readjustment possible without pretending that the current classification was
always the system's decision.

The next implementation target is therefore a **guarded outcome executor**,
in confirmation mode first, followed by retrieval-aware Enrichment—not a
second parallel audit system and not a public chatbot.
