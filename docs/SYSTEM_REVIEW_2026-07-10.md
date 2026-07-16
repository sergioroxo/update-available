# SurvivingSOGICE Human–AI System Review

Date: 10 July 2026  
Scope: repository architecture, live local corpus health, AI/human agreements,
research workflows, preservation, review burden, and future storytelling and
visualization layers.

## Executive assessment

The project is already a functioning internal archival research platform, not
an early prototype. It has unusually strong provenance, typed AI outputs,
fail-closed triage, consent/legal holds, source preservation, a Mac Studio
offload lifecycle, citation locators, knowledge exports, and extensive tests.

Its main risk is now **overbuilding faster than one researcher can validate and
maintain**. The live corpus has 65 folders, 58 analyzed documents, 56 uploads,
265 actionable enrichment rows (256 pending plus nine approved but unpushed),
and stale derived outputs. The code has 1,880 passing tests, but the main
Streamlit file is 20,575 lines and the CLI module is 4,941 lines. The public
experience remains conceptual, while the internal machinery has continued to
expand.

The right direction is to freeze feature sprawl—not AI throughput—and make the
system more intelligently AI-dependent. Most documents should receive
auditable AI descriptions and tags without individual human adjudication.
Human time belongs to a deliberately selected anchor set, sensitive material,
consequential claims/relationships, sampled audits, corrections, and the
documents that matter most to the thesis or public story. Streamlit remains
appropriate for the private researcher cockpit. A small static/Sigma.js or
similar viewer is more appropriate for the first public graph experiment than
a full WebXR environment.

### Reconsideration after researcher feedback

The first version of this review over-applied a conventional supervised-
evaluation model. It treated confidence calibration and per-document human
review as if they were necessary preconditions for trustworthy scale. That is
not realistic for a solo researcher or faithful to this project's intended
method. The corrected model has three layers of trust:

1. **AI-described long tail:** summaries and document-level tags may be public
   with source links, evidence locators, model/prompt/lexicon/retrieval
   disclosure, audit state, uncertainty, and a correction pathway.
2. **System anchor set:** a small researcher-selected set of important and hard
   documents is re-read after material system changes using the current
   lexicon, retrieval context, independent model comparison, and evidence
   audit. Humans resolve meaningful disagreements, not every agreement.
3. **Researcher-promoted evidence:** testimony, legal interpretation, canonical
   entity identity, network/funding assertions, claim-verification verdicts,
   and curated thesis/public-story arguments remain human-owned.

Open models will generally recognize broad concepts around conversion therapy
and SOGICE, so the lexicon should not be framed as compensating for total model
ignorance. Its stronger purpose is methodological: it fixes the project's
controlled vocabulary, multilingual variants, contested meanings, historical
genealogy, and corpus-specific usage. Model memory supplies background;
lexicon and retrieval supply the archive's explicit frame and evidence.

The corpus does not yet make the system improve automatically merely by
growing. That improvement loop becomes real only when approved lexicon memory,
retrieved related documents, prior corrections, anchor outcomes, and versioned
reprocessing are fed into later runs. Without that wiring, a larger corpus can
also mean a larger backlog and repeated errors.

## Top 10 changes

### 1. Establish one current operating model and stop roadmap drift

**Problem.** `CLAUDE.md`, the PRD, implementation plan, multiple handoffs, the
future roadmap, the in-app guide, and the actual code describe different
moments. Some documents still call the end-to-end test the next milestone or
say batch mode should not yet exist, while the live system has batch/offload,
58 analyzed documents, and large review queues. There was no root README.

**Too labor-intensive.** A non-coder cannot repeatedly reconcile thousands of
lines of planning history with a 90,000-line Python/test codebase before every
session.

**Safe AI delegation.** AI may inventory files, compare claims with tests and
code, generate a drift report, and suggest documentation updates. It must not
declare a methodological milestone complete without researcher evidence.

**Simplify.** Keep one short operator README, one operations runbook, and a
machine-generated health/digest. Treat PRDs and handoffs as design history.

**Fixed now.** Added the root `README.md`, documentation precedence, a current
system map, human/AI responsibility table, and this evidence-based review.

### 2. Replace confidence calibration with a selected anchor-set audit

**Problem.** The original PRD assumes model confidence can be calibrated into
useful review thresholds. A model's self-reported confidence is not a stable
measure of archival correctness, and requiring a human label for a growing
corpus defeats the purpose of the system. The useful question is not “what
score lets us trust every document?” but “does the current system still handle
our important and difficult cases, and where does it fail?”

**Too labor-intensive.** A solo researcher cannot establish ground truth for
thousands of documents or repeatedly review agreements. Human time should not
be spent confirming routine output that two models, retrieval evidence, and
deterministic checks already agree on.

**Safe AI delegation.** For a deliberately selected anchor set, the system may
re-read full sources with the current lexicon/ontology, retrieve related
reviewed terms and documents, run an independent second model, compare evidence
locators and classifications, and surface only disagreements or unsupported
claims. The researcher resolves consequential disagreements and documents why
each anchor matters.

**Simplify.** Maintain roughly 10–20 durable anchor documents covering key
thesis sources, known hard cases, languages, formats, legal/testimony risks, and
different rhetorical positions. Re-run this set when models, prompts, lexicon,
retrieval, or extraction materially change. Use outcome patterns to audit
system versions—not to derive a universal threshold or block ingestion.

**Fixed now.** Added `anchor-create`, `anchor-add`, and `anchor-report` (with the
old calibration command names retained as aliases). The report explicitly
refuses to derive a threshold from model confidence and does not gate the long
tail.

### 3. Convert enrichment from a review backlog into an AI-managed long tail

**Problem.** 265 actionable proposal rows across 58 analyzed documents are not
sustainable for one person. A generated proposal is cheap; resolving term
genealogy, entity identity, practice clustering, claims, and evidence is not.

**Too labor-intensive.** Reviewing every row independently repeats work when a
term/entity occurs across documents and encourages superficial approval under
fatigue. At 4,000 documents even grouped review would remain impossible.

**Safe AI delegation.** AI may maintain provisional document-level terms and
entities, normalize spelling, group likely duplicates, summarize supplied
quotes, retrieve source passages, suppress low-novelty repeats, and rank
concepts for promotion. Provisional output can remain useful without every row
becoming a canonical registry entry.

**Simplify.** The human queue should contain only already-approved work,
sensitive/key-document material, and recurring evidence-backed concepts that
may deserve promotion. Everything else remains visibly AI-generated and
provisional. Human decisions are required when a concept is promoted into the
canonical lexicon/entity registry, a claim ledger verdict, or a public network
assertion—not merely because an AI produced a candidate.

**Fixed now.** Revised `runner research review-plan` into an exception queue. It
reports both human-candidate and AI-managed groups, and only the former count
against a bounded work session. On the current corpus, 265 actionable rows form
223 concept groups: 36 human candidates and 187 AI-managed long-tail groups.

### 4. Use two public lanes instead of requiring per-document human review

**Problem.** The intended agreements are strong, but the public archive is not
built and “uploaded,” “verified,” and “published” can be confused across local
sidecars and Sanity. The testimony-removal protocol is still open. The internal
evidence graph is explicitly not public-safe.

**Too labor-intensive.** Manually checking and approving every summary/tag for
thousands of public-source documents is impossible and would turn the
researcher into a content moderator for their own automation.

**Safe AI delegation.** AI may produce public-facing document summaries and
controlled-vocabulary tags when each page identifies them as AI-generated,
links back to the source/evidence, exposes model/prompt/lexicon/retrieval/audit
metadata, preserves uncertainty, and offers correction. This lane must exclude
unreviewed testimony, legal interpretation, canonical identity, network or
funding claims, and claim-verification verdicts.

**Simplify.** Use two explicit contracts: `ai_disclosed_summary_tags` for the
low-risk long tail, and `researcher_verified` for sensitive or consequential
material. The researcher approves a versioned batch release policy and handles
exceptions/corrections; they do not approve every ordinary page individually.

**Fixed now.** Revised `runner research publication-audit` to report both lanes
separately and list which fields may be exposed in the AI-disclosed lane. The
checker still never publishes. On the current corpus, 42 documents meet the
AI-disclosed prerequisites and 23 are blocked from both lanes pending missing
or higher-risk work; three of those 23 are specifically routed to independent
second opinions. None yet meets the researcher-verified lane, which is no
longer a blocker for ordinary disclosed-AI document pages.

### 5. Add verifiable corpus integrity and a restore routine

**Problem.** Git ignores the corpus and exports. Offload packages have good
hashes/backups, but the whole live corpus lacks a simple content manifest and a
documented restore verification step. A solo researcher is a single point of
failure.

**Too labor-intensive.** Manually comparing thousands of files or noticing
silent corruption after a disk/cloud copy is unrealistic.

**Safe AI delegation.** Deterministic code may hash files, compare snapshots,
report missing/changed/unexpected files, and schedule reminders. AI should not
delete “unexpected” research files or choose retention policy.

**Simplify.** Create a manifest before backup, copy with an established backup
tool, verify the restored copy, keep manifests off the same disk, and perform a
quarterly restore drill.

**Fixed now.** Added `manifest-create` and `manifest-verify`. This closes the
integrity-check gap; a separate 3-2-1 backup destination still needs researcher
selection.

### 6. Break the Streamlit and CLI monoliths along stable boundaries

**Problem.** `runner/app.py` is 20,575 lines and `runner/main.py` is 4,941.
Small changes require importing and testing very large modules. UI helpers and
domain logic still coexist despite some successful extractions into
`app_readiness.py`, `app_provenance.py`, and other modules.

**Too labor-intensive.** One person cannot reliably understand the whole UI,
avoid key collisions, preserve session state, and test every workflow after
each edit.

**Safe AI delegation.** AI can perform mechanical extraction with characterization
tests, dependency maps, and behavior-preserving imports. Human review is needed
for navigation, terminology, and workflow changes.

**Simplify.** Use Streamlit multipage modules grouped into: daily work,
acquisition, document review, registry review, research outputs, and operations.
Split Typer into matching sub-apps. Do not rewrite the functioning pipeline.

### 7. Formalize state contracts and migrations across local/Sanity/Supabase

**Problem.** The system deliberately has three data locations, but lifecycle
state is distributed across many JSON sidecars, Sanity fields, Supabase rows,
SQLite queue records, and offload manifests. Some schemas are versioned, while
there is no single migration registry for the corpus as a whole.

**Too labor-intensive.** Checking cross-system drift document by document is
not viable, especially as fields evolve.

**Safe AI delegation.** Automation may validate schemas, diff local/remote
records, plan migrations, and generate dry-run reports. It must not overwrite a
reviewed record, infer missing consent, or resolve conflicting human edits.

**Simplify.** Define a small state machine and a corpus schema-version registry.
Every migration should be dry-run, reversible, backed up, and tested on fixture
copies before the live corpus.

### 8. Shift effort from more extraction to four thin research outputs

**Problem.** The archive already exports 492 graph nodes and 802 edges, 431 of
them quote-backed, but the tangible storytelling/visualization experiments are
still mostly roadmaps. The risk is building WebXR spectacle before a defensible
public data contract or answering a research question.

**Too labor-intensive.** Building separate bespoke pipelines for a network,
timeline, glossary, claim ledger, semantic map, and WebXR scene would overwhelm
one researcher.

**Safe AI delegation.** AI may transform auditable AI-described data into
derived tables, suggest visual encodings, draft alt text, summarize evidence
neighborhoods, and generate prototype code. Every view must distinguish the
AI-described long tail from researcher-promoted claims. The researcher decides
selection, framing, juxtaposition, interpretive claims, and what is ethically
public.

**Simplify.** Reuse one public-safe export and build four read-only views first:
an evidence network, lexicon genealogy/timeline, claims ledger, and framing
matrix. Use Streamlit for private exploration and a small static web viewer for
public prototypes. WebXR can later curate selected scenes from the same data.

### 9. Repair multilingual and archival normalization before visualization

**Problem.** Live stats include invalid language values such as `E` and `N`, a
mojibake title, uneven language coverage, free-text geographic values, and
incomplete dates. Maps, timelines, genealogy, and cross-language comparisons
will silently mislead if these fields are not normalized.

**Too labor-intensive.** Manually revisiting every field across every artifact
and remote record is repetitive and error-prone.

**Safe AI delegation.** Deterministic libraries may validate ISO 639/3166,
detect encoding problems, propose date parses, and create a correction queue.
AI may suggest a normalization only when the original value is preserved.

**Simplify.** Run one corpus-wide normalization audit, batch obvious
deterministic repairs with previews, and send ambiguous rows to a short human
queue. Preserve raw/original values and repair provenance.

### 10. Add a reproducible maintenance envelope

**Problem.** The tests are excellent and fast, but dependencies are broad and
loosely bounded, there is no root project configuration/lock for Python, and no
visible CI workflow. Local Python is 3.12 in the virtual environment while the
system Python is 3.14. A future reinstall could resolve materially different
OCR, LLM, Streamlit, or document-parser versions.

**Too labor-intensive.** Reconstructing a broken environment during a PhD
deadline is expensive; manually remembering every verification step is fragile.

**Safe AI delegation.** Automation may run tests/builds, create environment
reports, check dependency drift, and draft release notes. Dependency upgrades
that can alter extraction or model behavior require fixture comparison and
researcher sign-off.

**Simplify.** Pin the supported Python version, produce a lock/constraints
file, add lightweight CI for pure tests and the Sanity build, and record tool
versions in batch provenance. Keep heavyweight OCR/media integration tests
separate from the fast unit suite.

## What was missed or under-specified

- A selected, repeatable system anchor set with explicit selection reasons and
  a model/retrieval/evidence comparison protocol.
- A clear distinction between useful provisional AI output and concepts that
  are candidates for human promotion.
- A formal testimony withdrawal/removal request protocol, including response
  time, copies/caches, derived quotes, graph edges, and audit retention.
- A public redaction policy and public-safe graph adapter.
- Threat modeling for sensitive testimony, API keys, local raw responses,
  remote services, and physical device loss.
- A corpus-wide data management plan: retention, lawful basis, access, backup,
  restore, deletion, and thesis deposit.
- A stable experiment protocol: research question, versioned dataset snapshot,
  transformation version, visual encoding, audience, and observation notes.
- Accessibility and trauma-aware interaction criteria for researchers and
  public audiences encountering harmful material.
- A correction/retraction pathway for public non-testimony claims and entity
  relationships, not only testimony.
- A maintenance budget: what is kept, frozen, or intentionally abandoned after
  the PhD.

## Ideas worth recovering

Several strong ideas remain valuable because they are reads over data already
being captured, not new autonomous agents:

1. actor/funding/co-signatory network with quote-level evidence;
2. lexicon genealogy showing rebranding and first attestation over time;
3. country map plus legal/policy timeline;
4. tactic × register × actor framing matrix;
5. statistical-claim verification ledger;
6. practice/harm-stance catalogue;
7. multilingual glossary with attested variants;
8. semantic map of provenance-bearing documents, explicitly exploratory rather than
   causal;
9. provenance one-pager per document for the thesis/methodology;
10. curated “graph stories” or WebXR scenes built from researcher-promoted
    evidence, with AI-described context around them.

The ideas to leave dropped are autonomous model-triggered publication,
automatic canonical lexicon/entity merging, ungrounded corpus-connection
claims, a heavyweight graph database at pilot scale, multiple unconstrained
agents, and a public chatbot before safe citation retrieval exists. A
researcher-approved deterministic batch release is not “autonomous
publication”; it is the scalable release mechanism for the disclosed-AI lane.

## How to prevent the system from breaking

- Freeze a known-good environment before corpus-scale work.
- Keep pure, fast tests under ten seconds and run them before every merge.
- Add fixture-based extraction comparisons before dependency/model upgrades.
- Use atomic writes, immutable IDs, schema versions, prompt hashes, and audit
  sidecars throughout.
- Make every migration dry-run and reversible; never overwrite reviewed Sanity
  records without an explicit force path and backup.
- Separate raw, AI-described, audited, researcher-promoted, uploaded, and public
  states in language and code.
- Keep public exports regenerable and strictly downstream of the publication
  gate.
- Generate bounded daily worklists instead of requiring memory of the whole
  system.
- Create verified backups and practice restoration.
- Reduce the UI/CLI monolith gradually behind tests; avoid a rewrite.
- Keep an “intentionally deferred” list so old plans do not return as false
  emergencies.
- Design an archival exit plan: documented export formats, repository setup,
  credentials handover, and a read-only mode that can survive the PhD.

## Top five fixes delivered in this review

1. **Authoritative operating map:** root README, documentation precedence,
   responsibility matrix, and current review.
2. **Selected anchor-set audit:** repeatable system comparison without
   corpus-wide labeling or confidence-derived thresholds.
3. **AI-managed long tail plus human exception queue:** provisional proposals
   no longer imply a human review obligation.
4. **Two-lane publication audit:** disclosed AI summaries/tags at scale, with a
   separate researcher-verified route for consequential material.
5. **Corpus integrity manifests:** create/verify hashes for live or restored
   corpus copies.

## Next 15 follow-up changes

1. Select 10–20 durable anchor documents: key thesis sources, known failures,
   languages/formats, legal/testimony cases, and contrasting rhetorical
   positions. Record why each was selected.
2. Implement the anchor re-read runner: current lexicon/ontology, retrieved
   reviewed context, independent second model, evidence-locator comparison,
   and disagreement-only human escalation.
3. Put the exception review plan on the Streamlit Dashboard. Show human-
   candidate groups separately from the AI-managed long tail; never present the
   latter as a human backlog.
4. Write and approve the testimony withdrawal/removal protocol, including
   public copies, quotes, graph edges, backups, and response responsibilities.
5. Implement `public_graph.py` with explicit `ai_disclosed` and
   `researcher_verified` visibility states, redaction tests, and stable-ID
   collision tests.
6. Build the first 2D evidence-network prototype with table/search fallback and
   an evidence drawer; defer 3D/WebXR.
7. Export four research tables with row-level trust state: network edges, term
   attestations, claims ledger, and framing matrix.
8. Add an experiment manifest for every visualization/story: question, corpus
   snapshot manifest, filters, transformation version, ethics notes, and
   evaluation observations.
9. Run a multilingual/encoding/geography/date audit and create a reversible
   correction queue for invalid language codes, mojibake, ISO country values,
   and uncertain dates.
10. Complete the corpus feedback loop: wire vector retrieval and approved
    lexicon memory into analysis/enrichment, preserve prior corrections as
    exemplars, and schedule versioned reprocessing of anchors and important
    documents. Keep ungrounded connection suggestions suppressed.
11. Split `runner/app.py` into tested page modules, beginning with research
    outputs and operations; preserve UI behavior and session keys.
12. Split `runner/main.py` into Typer sub-apps for ingest, review, knowledge,
    offload, maintenance, and research operations.
13. Pin Python 3.12 and dependencies, add a constraints/lock workflow, and run
    pure tests plus the Sanity build in CI.
14. Adopt a 3-2-1 backup tool/destination, retain manifests separately, and
    complete a documented restore drill before the next large ingest batch.
15. Conduct a small researcher/audience evaluation of the first four outputs
    for usefulness, accessibility, interpretive clarity, and trauma-aware
    interaction before investing in the full public archive or WebXR.

## Verification performed

- Baseline suite before changes: 1,870 tests passed in 9.01 seconds.
- Focused research-operations suite: 14 tests passed.
- Complete post-workflow-revision suite: 1,887 tests passed in 12.64 seconds.
- Live dry runs: review plan, empty anchor audit report, and publication audit
  completed without model calls or external writes.
- Python compilation, CLI integration, `git diff --check`, and the Sanity Studio
  production build completed successfully.
