# SurvivingSOGICE Research System

SurvivingSOGICE is a local-first, human–AI archival research system for studying
sexual orientation and gender identity change efforts in Europe. It turns
messy web, PDF, audio, and video sources into a reviewable evidence archive,
living lexicon, evidence graph, and inputs for digital storytelling and data
visualization experiments.

The operating principle is:

> AI describes the corpus at scale. The researcher governs the rules, handles
> consequential exceptions, and promotes evidence into canonical research
> claims. The archive records provenance and uncertainty.

This is **role-specialized staged intelligence**, not an autonomous archive.
Each AI pass has a bounded job, typed output, provenance, and a risk-appropriate
gate. Human review is selective, not a requirement for every document.

## Current system, July 2026

The implemented system includes:

- a Typer CLI and Streamlit researcher interface;
- intake, acquisition, preservation, preprocessing, embedding, analysis, and
  enrichment stages;
- source queue and Mac Studio offload workflows;
- human review for analysis, legal material, testimony, entities, terms,
  tactics, practices, and claims;
- Sanity as the remote content store and Supabase for embeddings;
- citation-unit sidecars, document profiles, evidence graph exports, quality
  reports, and research digests;
- long-form, media, testimony-candidate, and research-annotation workflows;
- 1,887 local tests at the time of this workflow revision.

The system is useful for internal research now. It is **not yet a public
archive**. Public-safe export, redaction, removal, and publication workflows
must be completed before exposing internal graph or corpus artifacts.

See [the July 2026 system review](docs/SYSTEM_REVIEW_2026-07-10.md) for the
prioritized architecture assessment and implementation sequence.

See [Researcher Workflow v2](docs/RESEARCHER_WORKFLOW_V2.md) for the concrete
queue → triage → routed processing → exception review → memory consolidation →
selective reprocessing model.

## Start here

Use the repository virtual environment where available:

```bash
./.venv/bin/python -m pytest -q
./.venv/bin/python -m runner doctor
./.venv/bin/python -m runner system-health
```

Start the researcher interface:

```bash
./.venv/bin/streamlit run runner/app.py
```

The normal daily path is:

1. Open **Dashboard → Research Worklist**.
2. Add and triage material in **Source Queue**.
3. Use **Source Offload** for heavy Mac Studio work, or **Ingest Workbench**
   for a single attended ingest.
4. Import returned work, then refresh the worklist.
5. Resolve document-level holds in **Review Inbox / Document List**.
6. Let provisional long-tail proposals remain AI-managed; review only promoted,
   recurring, sensitive, or key-document exceptions.
7. Upload AI-described records after automated checks. Use the disclosed-AI or
   researcher-verified public lane according to risk; upload is not publication.
8. Refresh derived summaries, graph, quality report, and digest.

The detailed operational sequence is in
[docs/INGESTION_OPERATIONS_RUNBOOK.md](docs/INGESTION_OPERATIONS_RUNBOOK.md).

## Research safeguards and workload tools

These commands are deterministic and local. They do not call a model, approve
content, upload records, or publish anything.

### Bound enrichment review work

```bash
./.venv/bin/python -m runner research review-plan --limit 20
```

This groups label variants and repeated proposals, separates the AI-managed
long tail from concepts worth human promotion, ranks consequential work,
and writes `review_plan.json` and `review_plan.md` under
`EXPORTS_DIR/review/`. AI may help cluster labels, summarize supplied evidence,
and retrieve candidate passages. The researcher is not expected to resolve all
proposals. Human attention is reserved for canonical merging/entity identity,
claim verdicts, network assertions, sensitive material, and selected research
outputs.

### Maintain a selected anchor-set audit

This is a separate methodological process, not corpus-wide human labeling and
not a prerequisite for bulk ingestion. Select difficult, consequential, and
representative documents that the system should re-read whenever the prompt,
lexicon, retrieval layer, or models materially change:

```bash
./.venv/bin/python -m runner research anchor-create \
  --doc-id IMPORTANT_DOC_1 --doc-id HARD_CASE_2 \
  --rationale "Key thesis sources and known boundary cases"

./.venv/bin/python -m runner research anchor-add DOC_ID \
  --outcome minor_correction \
  --corrected-field tactic \
  --review-minutes 6

./.venv/bin/python -m runner research anchor-report
```

Allowed outcomes are `accepted`, `minor_correction`, `major_correction`, and
`unusable`. Record a human verdict only when model comparison/audit leaves a
meaningful disagreement. The report detects drift and failure patterns; it
does not derive thresholds from a model's self-confidence or block ingestion.

### Audit publication readiness

```bash
./.venv/bin/python -m runner research mark-analysis-reviewed DOC_ID \
  --notes "Checked classification, evidence, uncertainty, and public suitability."

./.venv/bin/python -m runner research publication-audit
```

The audit has two lanes:

- **AI-disclosed summary/tags:** scalable public document descriptions with
  source/evidence links, model/prompt/audit disclosure, uncertainty, and a
  correction pathway. It excludes unreviewed canonical entities, network or
  funding assertions, claim verdicts, legal interpretation, and testimony.
- **Researcher-verified:** consequential and sensitive material, including
  testimony, legal interpretation, promoted graph edges/claims, and curated
  research arguments.

The researcher approves the versioned release policy and exceptions; they do
not need to click “publish” on thousands of ordinary document descriptions.

### Create and verify a corpus integrity manifest

Before copying a backup:

```bash
./.venv/bin/python -m runner research manifest-create
```

After restoring or copying it:

```bash
./.venv/bin/python -m runner research manifest-verify PATH_TO_MANIFEST \
  --corpus-root PATH_TO_RESTORED_CORPUS
```

The manifest detects missing, changed, and unexpected files. It verifies a
backup; it is not itself a backup. Keep manifests separately from the corpus.

## Human and AI responsibilities

| Work | AI or deterministic automation may | Researcher must |
|---|---|---|
| Acquisition | fetch, extract, OCR, transcribe, flag capture failures | decide relevance and lawful/ethical retention |
| Analysis | produce disclosed summaries/tags at scale; run second opinions and audits | inspect key/sensitive documents, sampled failures, and consequential disagreements |
| Enrichment | maintain provisional terms/entities/tactics/practices/claims; deduplicate and rank | promote canonical concepts; resolve identity; verify published claims and network edges |
| Testimony | locate candidate passages and prepare private review material | decide consent, redaction, public excerpt, withdrawal, and removal |
| Legal material | extract and summarize with visible uncertainty | complete legal-accuracy review before public use |
| Storytelling | suggest themes, sequences, contrasts, and source clusters | choose framing, voice, juxtaposition, and ethical context |
| Visualization | prepare derived tables and candidate encodings | decide what relationships are defensible and what may be shown |
| Publication | prepare records that satisfy a researcher-approved release policy | define/revoke release policy; handle sensitive exceptions, corrections, and retractions |

## Data and state map

- **Local corpus:** canonical processing artifacts, raw captures, extracted
  text, model outputs, audit sidecars, and human review sidecars.
- **Sanity:** reviewed content records and registries; remote content source for
  a future public archive.
- **Supabase:** embedding vectors and similarity retrieval support.
- **Exports:** regenerable profiles, graph/CSV/JSON outputs, work plans,
  anchor audit, reports, and backup manifests.
- **Internet Archive / local captures:** source preservation, with explicit
  capture quality and provenance.

Do not equate these states:

- extracted is not analyzed;
- analyzed is not reviewed;
- uploaded is not verified;
- verified is not published;
- an AI-proposed edge is not an archival fact;
- an internal graph is not a public-safe graph.

## Documentation precedence

The repository contains valuable historical planning documents, but several
describe the deferred Vercel design or milestones that have since been built.
For operational decisions use this order:

1. executable code, tests, and live `system-health` output;
2. this README and the current operations runbook;
3. `CLAUDE.md` for stage contracts and model routing;
4. the July 2026 system review;
5. PRD, implementation plan, and older handoff documents as design history.

When documentation and code disagree, stop before a destructive or public
action, verify the current artifact state, and update the documentation.

## Engineering checks

```bash
./.venv/bin/python -m pytest -q
npm --prefix studio run build
git diff --check
```

The Python suite is intentionally local and model/network independent. External
service checks belong in `runner doctor`, `litelm-test`, `embed-test`, and
explicit Sanity/Supabase verification commands.
