# ChatGPT Deep Research Prompt — SurvivingSOGICE Workflow Review

## How to use this prompt

Use ChatGPT **Deep Research**. If possible, attach the repository or make it
available as a GitHub repository. At minimum attach the files under “Required
project evidence” below, then paste the prompt beginning at **Research prompt**.

This prompt asks for an independent architecture and research-method review. It
does not ask ChatGPT to rewrite the application or copy another project.

## Required project evidence

Attach these current documents:

1. `README.md`
2. `CLAUDE.md`
3. `docs/INGESTION_OPERATIONS_RUNBOOK.md`
4. `docs/RESEARCHER_WORKFLOW_V2.md`
5. `docs/SYSTEM_REVIEW_2026-07-10.md`
6. `docs/SOLO_RESEARCH_AGENT_SYSTEM_EXPLAINER.md`
7. `docs/PUBLIC_GRAPH_WEBXR_STRATEGY.md`
8. `01_project_docs/ARCHITECTURE_LOCAL_RUNNER_v1.0.md`
9. `02_working_tools/Claude_Ingestion_Prompt.md`
10. `02_working_tools/ENRICHMENT_PROMPT_v1.0.md`

If code can also be attached or inspected, prioritize:

- `runner/pipeline/source_queue.py`
- `runner/pipeline/batch.py`
- `runner/pipeline/source_worker.py`
- `runner/pipeline/analyze.py`
- `runner/pipeline/enrich.py`
- `runner/pipeline/enrichment_lexicon.py`
- `runner/pipeline/search.py`
- `runner/pipeline/second_opinion.py`
- `runner/pipeline/research_digest.py`
- `runner/pipeline/publication_gate.py`
- `runner/pipeline/review_plan.py`
- `runner/app_readiness.py`
- `runner/app.py` only when a UI/workflow claim needs verification

---

# Research prompt

Act as an independent senior AI systems architect, digital-humanities research
infrastructure specialist, archival media scholar, and human–AI workflow
designer. Conduct a critical Deep Research review of **SurvivingSOGICE**, a PhD
research archive studying Sexual Orientation and Gender Identity Change Efforts
(SOGICE) in Europe.

The researcher is a non-programmer, works mostly alone, and must eventually
handle a corpus that could reach roughly 4,000 documents. The system must
support archival research, a living multilingual lexicon, evidence graphs,
digital storytelling, data visualization, and later public-facing research
experiments.

Do not merely agree with either workflow. Test their assumptions against the
provided code/documentation, external research, compute constraints, archival
ethics, and realistic solo-researcher time.

## Essential clarification about external references

Detrans.ai may be examined only as a **reference example of corpus-grounded
retrieval/RAG and source-surfacing**. SurvivingSOGICE is not intended to copy
its interface, prompts, ideology, data sources, audience, or product goals.
Evaluate transferable architectural patterns separately from domain framing.

Relevant reference pages:

- https://detrans.ai/en/prompts
- https://github.com/pjamessteven/social-project

Also research other relevant primary or authoritative sources on:

- retrieval-augmented generation with source-level citations;
- digital-humanities and archival AI systems;
- provenance-aware knowledge graphs;
- human-in-the-loop systems designed for very large corpora;
- iterative/multi-model verification without universal manual review;
- corpus memory, feedback loops, and prevention of self-reinforcing errors;
- public disclosure of AI-generated archival description.

Prefer peer-reviewed research, official technical documentation, model cards,
and documented real systems. Separate evidence from recommendation.

## Non-negotiable facts and constraints

Treat these as project requirements unless you identify a direct contradiction
in the current implementation:

1. The system runs locally through Python/Streamlit, with a MacBook plus a Mac
   Studio M2 Ultra 64 GB connected over Tailscale/LiteLLM.
2. Sanity is the remote content store/source for future public content.
3. Supabase stores embeddings and supports semantic retrieval.
4. The maximum execution batch is **15 documents**. Do not recommend increasing
   it unless strong evidence shows it is safe and useful.
5. The existing double model workflow must remain:
   - **Analysis (Stage 3b):** document classification, evidence, summary,
     confidence/uncertainty signals, and controlled-vocabulary tags.
   - **Enrichment (Stage 3c):** lexicon, entities, tactics, practices, claims,
     registry matching, and candidate corpus relationships.
   These are complementary roles and should not be collapsed into one prompt.
6. Triage remains a separate routing stage and should determine model effort
   and specialist routes.
7. Human review cannot be required for every document, tag, or enrichment
   proposal. That would make a 4,000-document archive impossible.
8. Human authority remains necessary for testimony consent/removal, legal
   interpretation used publicly, canonical entity identity, funding/network
   assertions, claim-verification verdicts, corrections/retractions, and
   researcher-curated thesis/story arguments.
9. Ordinary document summaries and document-level tags may be AI-generated and
   public when clearly disclosed, evidence-linked, auditable, versioned, and
   correctable.
10. Do not derive “truth thresholds” from an LLM's self-reported confidence.
    Selected anchor documents and targeted audits may evaluate system versions.
11. Open models already have broad background knowledge. The lexicon's main
    value is controlled vocabulary, multilingual/historical context, corpus-
    specific meanings, evidence organization, and inspectable research memory.
12. New paid services, cloud infrastructure, graph databases, or orchestration
    frameworks should be recommended only when they remove a demonstrated
    bottleneck that cannot be handled by the existing stack.
13. Preserve provenance, stable document/evidence IDs, reversible changes, and
    local artifacts. Never recommend silent rewriting of canonical research
    records.

## Workflow A — current implemented workflow (“the real one”)

Verify this summary against the supplied code and documents. Correct it where
necessary.

1. Researcher adds URLs/files to Source Queue and may attach local source files,
   landing-page links, titles, priorities, and notes.
2. Triage detects source/document characteristics, recommends an LLM route,
   records special flags (long-form/book, testimony, media, legal), and decides
   whether a source is safe for unattended processing.
3. Special-flagged items are currently excluded from the ordinary guarded
   unattended batch rather than automatically scheduled through specialist
   post-processing.
4. Safe items are exported as source-offload packages, transferred to the Mac
   Studio, and processed in batches of at most 15.
5. The source worker runs intake/acquisition, preprocessing, Analysis,
   Enrichment, and embedding, while recording audit artifacts and model unload
   state.
6. Results are returned and explicitly dry-run/imported into the local corpus.
7. The researcher refreshes the worklist, examines readiness/quality state,
   handles document/proposal issues, uploads documents to Sanity/Supabase, and
   pushes approved enrichment records.
8. Long-form review, media annotations, testimony deep review, second opinions,
   research annotation profiles, knowledge exports, and lexicon review exist,
   but several remain separate workflows/commands rather than one route-aware
   batch process.
9. Embeddings, semantic search, citation units, document profiles, and an
   evidence graph exist.
10. The compact trusted lexicon is injected into Analysis and fuller lexicon/
    registry memory into Enrichment.
11. Retrieved related corpus documents and prior corrections are not yet
    consistently injected into Analysis/Enrichment. Ungrounded corpus-
    connection proposals are suppressed.
12. Operational state is spread across local corpus sidecars, the SQLite source
    queue, offload lifecycle packages, Sanity, Supabase, and derived exports.

## Workflow B — proposed Workflow v2

Evaluate, revise, reject, or combine parts of this proposal rather than treating
it as predetermined.

1. Researcher adds/contextualizes sources and selects a batch-level research
   policy or question.
2. Triage assigns the base pipeline plus specialist routes and model effort.
3. The Batch Orchestrator runs up to 15 documents through the base pipeline and
   schedules long-form, media, testimony, legal, independent second-opinion, or
   anchor processing when triggered.
4. Analysis and Enrichment remain distinct sequential passes.
5. Deterministic schema, extraction, citation, provenance, language, duplicate,
   and integrity checks run before extra model calls.
6. An evidence critic or independent model runs selectively for weak evidence,
   consequential disagreement, sensitive routes, selected anchors, or a small
   audit sample—not universally.
7. A batch compiler produces one outcome: completed ordinary records,
   extraction failures, model/audit exceptions, sensitive holds, recurring
   lexicon/entity candidates, important new evidence, and reprocessing
   recommendations.
8. An automatic outcome router uploads ordinary AI-described records that meet
   the approved disclosure/audit policy and sends only exceptions to the
   researcher.
9. A batch-memory/lexicon consolidator groups variants, compares candidates with
   existing memory, collects evidence across independent documents, challenges
   proposed merges/definitions with another model, and keeps most output
   provisional.
10. The researcher sees only promotion/merge questions, sensitive decisions,
    unresolved consequential disagreement, capture problems automation cannot
    solve, and records selected for thesis/storytelling.
11. Extra audits write typed/versioned findings that are consumed by later
    batch-memory and lexicon audits.
12. Retrieval injects related reviewed terms, documents, evidence quotes, and
    prior corrections into later Analysis and Enrichment.
13. Material changes to prompts, models, retrieval, lexicon, or extraction
    trigger reprocessing of selected anchors and affected important documents,
    not the entire corpus.
14. Public outputs distinguish an `ai_disclosed` document-description layer
    from `researcher_verified` canonical claims, relationships, testimony, legal
    interpretation, and curated narratives.

## Core research questions

### A. Establish the actual system

1. Reconstruct the current end-to-end workflow from code and current
   operational documentation.
2. Identify documentation that is stale, aspirational, or contradicted by code.
3. Mark every Workflow A and Workflow B capability as:
   - implemented and usable;
   - implemented but fragmented;
   - partially implemented;
   - missing;
   - unnecessary/over-engineered;
   - unsafe or methodologically questionable.

### B. Evaluate the double Analysis + Enrichment architecture

1. Does preserving these as separate passes remain the right design?
2. Which context belongs in Analysis versus Enrichment?
3. When should retrieved corpus documents be introduced so they improve
   consistency without biasing the primary classification?
4. Should Analysis run first with lexicon orientation only, followed by
   retrieval-aware Enrichment, or should bounded retrieval also inform Analysis?
5. How should contradictions between Analysis, Enrichment, retrieved evidence,
   and later audits be represented?

### C. Decide what “RAG” should mean here

Distinguish and evaluate:

1. retrieval-assisted ingestion/classification;
2. retrieval-assisted enrichment and entity/lexicon deduplication;
3. researcher-facing semantic search/question answering;
4. public-safe evidence search or conversational exploration;
5. retrieval used for digital storytelling and visualization.

State which should be built first and why. Do not assume a chatbot is the
desired primary interface.

### D. Design the feasible solo-researcher workflow

Model the labor for:

- one normal batch of 15 documents;
- 100 documents;
- a mature corpus of 4,000 documents.

Estimate which actions create repeated human labor. Propose the smallest number
of recurring researcher actions that preserve methodological value. Target a
workflow where the researcher:

- chooses/contextualizes sources and batch questions;
- reads one compiled batch outcome;
- handles a bounded exception/promotion queue;
- curates research/story outputs;
- handles corrections, sensitive decisions, and removals.

Do not count “AI generated another proposal” as an automatic human task.

### E. Evaluate iterative model verification

For each possible pass—primary analyst, evidence critic, second opinion, batch
consolidator, lexicon auditor, anchor audit—decide:

- what unique evidence/role it has;
- its trigger;
- whether it is deterministic or model-based;
- whether it should run per document, per exception, per batch, or per system
  version;
- what artifact it writes;
- how its result affects upload, provisional memory, canonical records, and
  reprocessing;
- when a human must intervene.

Explicitly assess the risk of false reassurance when the same or closely
related model evaluates its own output.

### F. Design the lexicon/corpus feedback loop

Explain how the system can improve as the corpus grows without allowing
self-reinforcing errors. Address:

- validated/trusted lexicon memory;
- provisional recurring terms and variants;
- evidence from independent documents versus repeated model output;
- source and quote-level provenance;
- multilingual equivalence and false equivalence;
- terminology genealogy and contested meanings;
- entity identity resolution;
- audit findings and prior corrections;
- versioning and selective reprocessing;
- when provisional memory may influence Analysis versus Enrichment;
- what requires human promotion and what may remain AI-managed.

### G. Evaluate upload and publication automation

Define defensible criteria for:

- automatic local-corpus import;
- automatic Sanity document upload;
- automatic Supabase embedding upload;
- AI-disclosed public summaries/tags;
- researcher-verified publication;
- public graph edges, claims, testimony, and legal interpretation.

Evaluate whether the researcher should approve each document, approve a
versioned batch/release policy, or use another mechanism.

### H. Recommend the next implementation

Determine whether **Batch Orchestrator v2 + automatic outcome routing** is
actually the best next milestone. Compare it with alternatives such as:

- retrieval injection first;
- lexicon consolidation first;
- simplifying the Streamlit interface first;
- strengthening current offload/batch reliability first;
- building a public-safe adapter first;
- doing no major architecture change yet.

Be explicit about dependencies and what can be reused from the current code.

## Required output

Produce a report with the following structure.

### 1. Executive verdict

Maximum two pages. State:

- what SurvivingSOGICE should become;
- what it should not become;
- whether Workflow v2 is directionally correct;
- the most important correction to each workflow;
- the single best next implementation milestone.

### 2. Evidence and method

- List project files inspected.
- List external sources consulted with direct links.
- Separate repository facts, external evidence, and your inference.
- Note important uncertainties or missing evidence.

### 3. Current versus proposed capability matrix

Use a detailed table with:

- capability;
- Workflow A behavior;
- Workflow B proposal;
- verified implementation status;
- keep/change/remove recommendation;
- researcher labor effect;
- technical risk;
- methodological/ethical risk.

### 4. Recommended final workflow

Provide:

- a concise numbered workflow;
- a Mermaid diagram;
- state transitions from source candidate to AI-described, audited,
  researcher-promoted, uploaded, and public states;
- explicit failure/retry paths;
- Analysis and Enrichment shown as separate stages.

### 5. Researcher responsibility budget

For 15, 100, and 4,000 documents, estimate:

- recurring researcher actions;
- likely exception categories;
- tasks that AI/deterministic automation should absorb;
- tasks that must remain human;
- workload bottlenecks and ways to cap them.

Use ranges and state assumptions rather than presenting invented precision.

### 6. Model-pass and audit routing matrix

For every deterministic/model pass, specify trigger, frequency, inputs,
outputs, next state, human gate, and whether a different model family is needed.

### 7. RAG and memory architecture

Specify:

- retrieval units and metadata;
- vector and structured filters;
- trust-state filtering;
- what is injected into Analysis versus Enrichment;
- citation/evidence contracts;
- correction and audit memory;
- defenses against feedback contamination;
- selective reprocessing logic;
- internal versus public retrieval boundaries.

Prefer the current Supabase/Sanity/local-artifact stack unless replacement has
a clearly demonstrated benefit.

### 8. Lexicon consolidation design

Provide the batch-level process from raw proposals to provisional memory,
recurrence/conflict evidence, model challenge, human promotion, versioning, and
reprocessing impact.

### 9. Recommended interface

Describe the minimum Streamlit information architecture. Prioritize one calm
researcher cockpit over more disconnected pages. Include:

- batch preparation;
- active processing/recovery;
- compiled outcome;
- exception/promotion inbox;
- memory/lexicon changes;
- research outputs;
- system health.

### 10. Implementation roadmap

Provide:

- top five implementation changes in dependency order;
- next 15 follow-up changes;
- size estimate (small/medium/large);
- files/modules likely affected;
- acceptance criteria and tests;
- migration/rollback needs;
- which current features should be frozen rather than expanded.

### 11. Risk register

Cover technical reliability, model failure, extraction quality, multilingual
issues, feedback contamination, privacy/testimony, defamation/entity edges,
legal interpretation, public disclosure, maintenance, and solo-researcher
burnout.

### 12. Researcher decisions still required

Maximum seven decisions. Ask only questions that materially change the
architecture or research method. For each, explain the consequence of each
choice and give a recommendation.

## Quality requirements

- Be critical but feasible for one researcher.
- Do not recommend universal manual review.
- Do not collapse Analysis and Enrichment.
- Do not treat LLM confidence as calibrated truth.
- Do not assume more model calls automatically mean more reliability.
- Do not describe provisional AI suggestions as archival facts.
- Do not assume public chatbot/RAG is the immediate goal.
- Do not recommend copying Detrans.ai.
- Preserve the batch maximum of 15.
- Prefer bounded automation, typed artifacts, retrieval evidence, disclosure,
  selective human promotion, and reversible state transitions.
- Cite project evidence by file and section and external evidence with direct
  links.
- End with a clear recommendation that a non-programmer researcher can act on.
