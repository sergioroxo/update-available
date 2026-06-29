# SurvivingSOGICE Solo Research Agent System Explainer

**Purpose:** practical architecture and development plan for adding a small set of researcher-support agents to the existing SurvivingSOGICE local runner.

**Audience:** Sergio, Codex, and future implementation sessions.

**Status:** design proposal, not implemented.

**Core principle:** AI proposes; the researcher validates; the archive preserves provenance.

---

## 1. Why Fewer Agents Is Better

The original list of eight possible agents is methodologically useful, but it is too many as a first implementation target. The current system already has role-specialized stages:

```text
Source Queue -> Triage -> Ingest -> Preprocess -> Embed -> Analyze -> Enrich -> Review -> Upload
```

The right next step is not to add eight separate autonomous agents. It is to add a smaller number of bounded assistant passes that reuse the existing stages, files, audit sidecars, and Streamlit review UI.

Recommended reduced set:

1. **Source & Work Digest**
2. **Metadata Prefill**
3. **Review & Correction**
4. **Refinement**
5. **Second Opinion**
6. **Publication Safety**, initially as a deterministic checklist rather than a full model agent

These can be built in stages. They should not all run on every document.

---

## 2. Current System Capabilities To Reuse

Do not start from scratch. The repo already contains most of the infrastructure needed.

| Existing area | Files | What it already provides |
|---|---|---|
| Source queue | `runner/pipeline/source_queue.py` | URL storage, deduplication, priority, status, batch group, triage fields |
| Triage | `runner/pipeline/triage.py`, `runner/models/triage.py` | Fast routing model, doc type hint, model recommendation, legal/testimony/media/book flags, overnight safety |
| Batch planning | `runner/pipeline/batch.py`, `runner/main.py` | Batch manifests, ledgers, reports, preflight checks, fail-closed overnight processing |
| Metadata quality | `runner/pipeline/metadata_quality.py` | Publication metadata extraction, date backfill, missing archival field warnings |
| Analysis | `runner/pipeline/analyze.py`, `runner/models/document.py` | Classification, summary, confidence, candidate terms, suggested actors/networks |
| Enrichment | `runner/pipeline/enrich.py`, `runner/models/enrichment.py` | Lexicon/entity/tactic/practice/claim proposals, proposal identity, merge-preserved researcher decisions |
| Second opinion | `runner/pipeline/second_opinion.py` | Alternate model analysis, field diff, explicit human decision before promotion |
| Review overrides | `runner/app_review_overrides.py` | Local-only testimony, legal, and low-confidence review sidecars |
| Readiness | `runner/app_readiness.py`, `runner/app_provenance.py` | Per-document next actions, provenance warnings, corpus-wide readiness summary |
| Audit | `runner/pipeline/audit.py` | `analysis_audit.json`, `enrichment_audit.json`, `triage_audit.json`, prompt hashes, model metadata |
| UI | `runner/app.py` | Streamlit workbench, document list, source queue, review panels, testimony review |

The design below should reuse these instead of inventing a parallel agent framework.

---

## 3. Compute Reality: Mac Studio M2 Ultra 64GB

The Mac Studio is powerful enough for this, but not if every document triggers every pass.

The realistic operating model:

- Use **small/fast model passes** for triage, digest summaries, and light metadata reasoning.
- Use **deterministic Python checks** whenever possible.
- Use **one heavy model at a time**.
- Keep batch size around **10-15 documents**, which the repo already assumes.
- Run **second opinion only on selected documents**.
- Keep all agent outputs as proposal files or sidecars until the researcher approves them.

Approximate compute tiers:

| Pass | Typical model need | Cost/load | Should run on every document? |
|---|---|---:|---|
| Source & Work Digest | Mostly deterministic; optional small model summary | Low | Daily / per batch, not per document |
| Metadata Prefill | Deterministic first; small model only for ambiguity | Low-medium | Yes, but model only when needed |
| Review & Correction | Diff-based deterministic checks; optional small model | Low-medium | After human edits |
| Refinement | Existing enrichment model when needed | Medium-high | No, only after analysis or selected docs |
| Second Opinion | Review/reasoning model | High | No, gated |
| Publication Safety | Deterministic checklist first; optional model later | Low-medium | Only before public/published state |

The failure mode to avoid is a chain like:

```text
triage -> metadata -> analysis -> enrichment -> correction -> refinement -> second opinion -> safety
```

for every source. That would be slow, expensive, and cognitively noisy.

The better pattern is:

```text
queue triage/digest for all sources
metadata prefill for ingested documents
analysis/enrichment for selected documents
correction/refinement only when review changes or proposals need consolidation
second opinion only when risk or value is high
publication safety only at public gate
```

---

## 4. The Proposed Agents

### 4.1 Source & Work Digest

Combines the old Source Triage Agent and Morning Digest Agent.

**Goal:** reduce the 2000+ link backlog into a daily decision queue.

**Inputs:**

- `source_queue.db`
- batch manifests and ledgers from `runner/pipeline/batch.py`
- local corpus folders
- readiness summaries from `runner/app_readiness.py`
- failed worker/offload reports

**Outputs:**

- `exports/digests/YYYY-MM-DD_morning_digest.md`
- optional `exports/digests/YYYY-MM-DD_morning_digest.json`

**Should report:**

- how many links are new, triaged, ready, skipped, ingested
- high-priority links needing researcher attention
- links safe for overnight batch
- links blocked by legal/testimony/media/book flags
- failures from batch/offload/source workers
- low-confidence documents
- documents with pending enrichment proposals
- documents ready to push
- top 5-15 decisions for today

**Implementation approach:**

Start deterministic. Do not use a model at first. Read queue rows, batch ledgers, and readiness summaries. Later add a small model only to turn structured bullets into a readable paragraph.

**Human gate:**

The digest never changes state. It only points the researcher to actions.

**Impact on workload:**

Very high. With 2000+ links, the biggest burden is knowing where to look next. This agent helps you stop scanning everything manually.

---

### 4.2 Metadata Prefill

**Goal:** reduce repetitive archival data entry.

**Inputs:**

- `intake.json`
- `preprocess.json`
- `extracted.txt`
- `analysis.json`
- existing source URL / archive URL / page metadata
- optional Sanity document if uploaded

**Outputs:**

- `metadata_prefill.json`, proposal-only
- optional Streamlit panel for accepting fields

**Proposed fields:**

- title
- author or organization
- publisher/site
- date published
- date modified
- document date
- country/jurisdiction
- language
- source type
- document type hint
- canonical URL
- archive URL
- confidence per field
- evidence for each proposed field
- warnings for missing or weak metadata

**Implementation approach:**

Stage 1 should be deterministic:

- use HTML metadata from `preprocess.json`
- use `publication_metadata()` and `archival_issues()`
- use existing `analysis.document_date`, `analysis.country`, `analysis.languages`
- use URL host and page intelligence

Stage 2 can add a small model pass only when fields are missing or contradictory.

**Human gate:**

Prefill never writes canonical metadata directly. It proposes. The researcher accepts, edits, or rejects.

**Impact on workload:**

High. Metadata cleanup is repetitive and easy to postpone. A prefill pass can probably remove 40-60% of the typing/checking burden for ordinary webpages, reports, and articles. It will help less for bad PDFs, social media, or blocked pages.

---

### 4.3 Review & Correction

Combines Correction Review with consistency checking.

**Goal:** detect consequences of human edits without second-guessing the researcher.

**Inputs:**

- previous `analysis.json`
- updated `analysis.json`
- `review_status.json`
- `legal_review.json`
- `testimony_review.json`
- `enrichment.json`
- Sanity registry snapshots where available

**Outputs:**

- `correction_review.json`
- readiness items surfaced in Streamlit

**Should flag questions like:**

- You changed country; should related entities or document set filters change?
- You changed type to legal/policy; should legal review be marked?
- You cleared testimony; should consent/public display be reviewed?
- You renamed or rejected a lexicon term; should related evidence dossiers merge or be marked rejected?
- You accepted an entity as existing; does `existing_entity_id` need to be filled?
- You changed confidence/needs_review; should a second opinion be suggested?

**Implementation approach:**

Start with deterministic diffs:

- archive previous analysis when saving edits
- compare changed fields
- map changed fields to possible follow-up checks
- write a short list of review prompts

Only later use a model to summarize complex inconsistencies.

**Human gate:**

This agent should ask questions. It should not modify related documents automatically.

**Impact on workload:**

Medium-high once the corpus grows. It prevents hidden inconsistency from accumulating, which matters a lot for a solo researcher.

---

### 4.4 Refinement

**Goal:** improve and consolidate proposal quality after initial analysis/enrichment.

This is not a new full pipeline stage. It is a focused improvement pass over already generated proposals.

**Inputs:**

- `enrichment.json`
- existing lexicon/entity/tactic registries
- rejected/approved proposal history
- corpus connection proposals
- selected document text when needed

**Outputs:**

- `refinement_report.json`
- updates to local proposal fields only, preserving researcher decisions

**Useful refinement tasks:**

- merge duplicate lexicon proposals
- identify variants vs new terms
- connect proposed terms to existing seed/legacy/Sanity terms
- identify entity proposals that are actually media/source artifacts
- group practice evidence into local clusters
- suggest related documents to review together

**Implementation approach:**

Reuse `runner/pipeline/enrich.py` proposal identity and merge-preservation logic. The first version can be deterministic:

- normalize proposal names
- cluster by semantic key
- detect duplicate entities
- detect `add_new` that should be `add_variant` or `add_evidence`

Model-assisted refinement can come later for ambiguous cases.

**Human gate:**

Refinement can reorder, group, and suggest. It must not approve proposals or push to Sanity.

**Impact on workload:**

Medium. It becomes more valuable after dozens or hundreds of documents, when repeated terms and entities begin to pile up.

---

### 4.5 Second Opinion

**Goal:** use a different model when uncertainty or publication risk justifies the compute.

This already mostly exists in `runner/pipeline/second_opinion.py`.

**Inputs:**

- `analysis.json`
- `extracted.txt`
- `preprocess.json`
- triage flags
- tier
- confidence fields

**Outputs:**

- `analysis_alt_<model>_<timestamp>.json`
- `analysis_comparison_<timestamp>.json`

**Trigger policy:**

Run second opinion only when at least one is true:

- Tier 3 / public candidate
- legal-sensitive document
- testimony or consent-sensitive document
- confidence below threshold
- `needs_review=true`
- researcher manually requests it
- metadata/classification contradiction detected
- important network or lexicon claim depends on it

**Implementation approach:**

Do not rewrite the existing second-opinion core first. Add orchestration:

- a function that decides whether second opinion is recommended
- a Streamlit button and queue view
- digest section listing second-opinion recommendations
- optional batch command for selected docs only

**Human gate:**

Already correct: disagreement becomes a review signal, not an automated verdict.

**Impact on workload:**

Selective but important. It does not reduce routine workload much, but it reduces anxiety and risk on high-stakes documents.

---

### 4.6 Publication Safety

**Goal:** prevent unsafe public states.

Do this first as a checklist, not as a generative agent.

**Inputs:**

- readiness summary
- `analysis.json`
- `analysis_audit.json`
- `enrichment.json`
- `enrichment_audit.json`
- `testimony_review.json`
- `legal_review.json`
- Sanity workflow/tier/validation status
- lexicon evidence confirmation status

**Outputs:**

- `publication_safety_report.json`
- block/warn/ready status

**Checks:**

- missing audit sidecars
- missing source URL/archive URL
- missing date/language/country
- unreviewed low-confidence analysis
- legal-sensitive doc without legal review
- testimony without confirmed consent
- public display enabled without consent
- Tier 3 without second opinion or validation
- unvalidated lexicon terms used on public page
- risky public labels without human confirmation
- private/personally sensitive information in public excerpt

**Implementation approach:**

Build on `app_readiness.py` and `app_provenance.py`. Add publication-specific severity:

- `block_publication`
- `needs_researcher_review`
- `warning`
- `ready`

Add a model pass later only for checking risky prose in public-facing summaries/excerpts.

**Human gate:**

Only the researcher can clear safety holds or publish.

**Impact on workload:**

Medium now, high later. It matters most when documents start moving from internal archive to public website.

---

## 5. Software Stack

Use what the repo already has:

| Need | Recommended software |
|---|---|
| Local orchestration | Python, Typer CLI |
| Local UI | Streamlit |
| Structured validation | Pydantic v2 |
| Local storage | Existing corpus folders + JSON sidecars |
| Queue | Existing SQLite source queue |
| Model serving | Mac Studio LiteLLM -> Ollama |
| Local model routing | Existing `--llm litelm`, `litelm-heavy`, `litelm-reasoning`, local fallbacks |
| CMS/source of truth | Sanity |
| Embeddings/search | Supabase pgvector |
| Audit | Existing audit sidecars |
| Batch/offload | Existing batch ledgers and offload/source-worker systems |

Avoid adding:

- a separate agent framework
- a message broker
- a background task system
- a new database
- a second dashboard

Those would add maintenance burden before the research workflow needs them.

---

## 6. Development Plan

### Phase 1: Source & Work Digest

Build first.

Tasks:

1. Add pure digest collector module, e.g. `runner/pipeline/digest.py`.
2. Read source queue counts, excluded reasons, batch ledgers, corpus stats, and readiness summaries.
3. Generate Markdown + JSON digest.
4. Add CLI command:

```bash
python -m runner digest --out exports/digests
```

5. Add Streamlit dashboard panel: "Today / Next Actions".

No model required in v1.

### Phase 2: Metadata Prefill

Tasks:

1. Add `runner/pipeline/metadata_prefill.py`.
2. Create Pydantic model for proposed fields.
3. Produce `metadata_prefill.json` from deterministic fields first.
4. Add CLI:

```bash
python -m runner metadata-prefill <doc_id>
```

5. Add Streamlit review panel: accept/edit field proposals.
6. Later add optional model fallback:

```bash
python -m runner metadata-prefill <doc_id> --llm litelm
```

### Phase 3: Review & Correction

Tasks:

1. Archive pre-edit analysis before review saves.
2. Add field diff model.
3. Map changed fields to consistency prompts.
4. Write `correction_review.json`.
5. Surface in existing readiness panel.

### Phase 4: Second Opinion Orchestration

Tasks:

1. Keep `runner/pipeline/second_opinion.py`.
2. Add recommendation function:

```text
recommend_second_opinion(doc_id) -> yes/no + reasons
```

3. Add digest section for recommended second opinions.
4. Add Streamlit batch action for selected docs.

### Phase 5: Refinement

Tasks:

1. Add proposal consolidation report over `enrichment.json`.
2. Group duplicates and possible variants.
3. Preserve all researcher decisions.
4. Surface "proposal cleanup" inbox.

### Phase 6: Publication Safety

Tasks:

1. Add deterministic `publication_safety.py`.
2. Build report from readiness, testimony, legal, audit, and lexicon status.
3. Add publish-blocking checklist in Streamlit.
4. Add optional model review of public-facing text later.

---

## 7. How This Helps With 2000+ Links

The 2000+ links problem is not mainly an LLM problem. It is a queue, prioritization, and attention problem.

The realistic workflow should be:

1. Bulk import links into Source Queue.
2. Deduplicate automatically.
3. Run fast triage in batches.
4. Mark only safe standard items for overnight/batch processing.
5. Exclude legal/testimony/media/book items for attended handling.
6. Use Source & Work Digest every morning to decide the next 10-20 actions.
7. Ingest in small batches.
8. Let Metadata Prefill reduce archival cleanup.
9. Use Review & Correction and Refinement to prevent review debt.

Realistic reduction in manual work:

| Work type | Current burden | Expected reduction |
|---|---|---:|
| Deciding which links matter first | Very high | 50-70% |
| Deduplicating / organizing links | High | 60-80% |
| Routine metadata entry | High | 40-60% |
| Finding failed/stuck batch items | Medium-high | 50-70% |
| Consistency checking after edits | Medium | 30-50% |
| High-stakes validation | Not reduced much | Better safety, not speed |
| Reading/understanding key documents | Still human work | AI helps prepare, not replace |

This will not make 2000 links disappear. It should make them manageable by converting them from an undifferentiated pile into queues:

- safe to batch
- needs legal attention
- needs testimony/consent attention
- needs media/transcript handling
- high-value / high-priority
- low-priority / defer
- already ingested / duplicate
- failed / needs repair

That queue transformation is the real productivity gain.

---

## 8. Rules For Codex Implementation

When implementing this system, Codex should follow these rules:

1. Read `NEXT_SESSION.md`, `CODEX_NEXT_CONVERSATION.md`, and this document first.
2. Inspect existing modules before creating new ones.
3. Prefer pure Python helper modules with unit tests.
4. Add CLI commands only after pure functions exist.
5. Add Streamlit UI only after CLI/tests work.
6. Never write directly to Sanity/Supabase from a new agent in v1.
7. Store outputs as local sidecars first.
8. Preserve researcher decisions across reruns.
9. Make model usage optional wherever possible.
10. Keep failure modes fail-closed.
11. Avoid new dependencies unless a standard library or existing dependency cannot do the job.
12. Add tests for every new safety gate and every sidecar schema.

Suggested build order for Codex:

```text
1. runner/pipeline/digest.py + tests
2. runner main.py digest command
3. Streamlit dashboard digest panel
4. runner/pipeline/metadata_prefill.py + tests
5. metadata-prefill CLI
6. metadata prefill UI
7. correction_review.py + tests
8. second_opinion recommendation wrapper
9. refinement report
10. publication safety report
```

---

## 9. Success Criteria

The system is working if:

- Sergio can open the app and know what to do next within 2 minutes.
- 2000+ links are divided into actionable queues.
- Batch processing does not touch legal/testimony/media/book items unattended.
- Metadata proposals reduce typing without hiding uncertainty.
- Human edits trigger consistency questions, not silent rewrites.
- Second opinions happen only when they matter.
- Public candidates cannot pass without audit, consent, and validation checks.
- Every consequential AI suggestion has provenance.

The goal is not autonomy. The goal is a calmer research desk.

