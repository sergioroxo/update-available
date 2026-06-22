# Knowledge Exports

The knowledge-export layer is a local, regenerable coordination layer over the
corpus. It does not call models, Sanity, Supabase, LiteLLM, or the network.

Its purpose is simple:

- make each document easier to audit;
- give future graph / notebook / agent workflows a stable input;
- keep evidence and discovery clearly separated.

## What Gets Written

Per document:

- `corpus/<doc_id>/archive_summary.json`

Corpus-wide:

- `exports/knowledge/document_profiles.jsonl`
- `exports/knowledge/archive_nodes.csv`
- `exports/knowledge/archive_edges.csv`
- `exports/knowledge/archive_graph.json`
- `exports/knowledge/knowledge_quality.json`
- `exports/digests/<timestamp>_research_digest.md`
- `exports/digests/<timestamp>_research_digest.json`

`archive_summary.json` is an index card beside the document. It summarizes
source metadata, extracted content metadata, analysis classification, review
state, enrichment counts, upload state, offload lineage, and readiness.

`document_profiles.jsonl` is the same idea at corpus scale: one JSON object per
line, one line per document. This is the easiest file to load into a notebook,
script, spreadsheet converter, or later local assistant pass.

The graph files are an **Evidence Graph**. They represent document-grounded
nodes and edges with provenance. They are not a discovery/similarity graph and
not a public claim of truth.

`knowledge_quality.json` is the trust/readiness audit over those exports. It
summarizes extraction quality, tag coverage, tag-registry matches, enrichment
review load, and how much of the graph is quote-backed.

The research digest is the human worklist. It combines `system-health`,
`knowledge_quality.json`, source-queue counts, source-offload lifecycle state,
and Mac Studio transfer state into a short Markdown report.

## How To Refresh

From Streamlit:

1. Open **Corpus Intelligence**.
2. Open **Knowledge exports**.
3. Click **Refresh profiles**.
4. Click **Refresh evidence graph**.
5. Click **Refresh quality report**.

From Terminal:

```bash
cd /Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest
PY=/Users/sergiogalvaoroxo/Documents/surviving-sogice-ingest/.venv/bin/python

"$PY" -m runner archive-summary-export --refresh-sidecars
"$PY" -m runner knowledge-graph-export
"$PY" -m runner knowledge-quality-report
"$PY" -m runner research-digest --refresh-all
```

For normal use after importing or ingesting new documents, the last command is
enough: `research-digest --refresh-all` refreshes profiles, the evidence graph,
the quality report, and the digest in the correct order.

For an exploratory graph that includes model-proposed / unreviewed edges:

```bash
"$PY" -m runner knowledge-graph-export --include-proposed
```

Treat that output as discovery material, not reviewed evidence.

## How To Inspect

Use Streamlit first:

1. Open **Dashboard** and read **Research Worklist**. This is the quickest
   "what should I do next?" view.
2. Click **Refresh worklist** after importing or changing documents. This
   refreshes archive summaries, the evidence graph, the quality audit, and the
   digest.
3. Open **Corpus Intelligence** for the deeper audit.
4. Open **Knowledge exports**.
5. Read the **Document profile preview** table.
6. Check the graph node/edge counts and **Evidence strength** counts.
7. Read **Quality audit preview**. This is the quickest answer to "can I trust
   the extracted data enough to keep working?"
8. Open **Documents needing attention** inside the quality preview. It lists the
   concrete document IDs behind the warning counts: zero/low extracted text,
   acquisition challenges, missing core analysis tags, and enrichment proposals
   still awaiting review.
9. Open **Research digest** in Corpus Intelligence when you want to read or
   download the full Markdown/JSON digest.

The **Research digest** panel is the main human-readable view. It renders the
latest Markdown digest in the app and provides download buttons for the Markdown
and JSON files.

The **Knowledge exports** panel is the audit/data view. It shows a table preview
of `document_profiles.jsonl`, graph counts, quality recommendations, and
download buttons for every generated knowledge file.

The files are written to your configured exports folder, not necessarily the
repository folder. On Sergio's MacBook that is currently:

```text
/Users/sergiogalvaoroxo/Documents/surviving-sogice-done/exports/knowledge
```

Open it from Terminal:

```bash
open /Users/sergiogalvaoroxo/Documents/surviving-sogice-done/exports/knowledge
```

`document_profiles.jsonl` means JSON Lines: each line is one full
`archive_summary` object. Finder will not preview it nicely, but scripts and
notebooks can read it easily. Quick terminal views:

```bash
# First document profile, pretty printed
head -1 /Users/sergiogalvaoroxo/Documents/surviving-sogice-done/exports/knowledge/document_profiles.jsonl \
  | "$PY" -m json.tool

# Quality audit, pretty printed
"$PY" -m json.tool /Users/sergiogalvaoroxo/Documents/surviving-sogice-done/exports/knowledge/knowledge_quality.json

# Latest human-readable digest
ls -t /Users/sergiogalvaoroxo/Documents/surviving-sogice-done/exports/digests/*_research_digest.md | head -1
```

In practice:

- read the **digest Markdown** when deciding what to do next;
- read **Knowledge exports → Document profile preview** when checking whether a
  document's summary looks sensible;
- use `document_profiles.jsonl` for future agents, notebooks, or graph tooling;
- use `knowledge_quality.json` when auditing extraction/tag/enrichment quality.

Use Terminal for a quick health check:

```bash
"$PY" -m runner system-health
```

Use JSON output when another tool or notebook should consume the health report:

```bash
"$PY" -m runner system-health --json
```

On the Mac Studio, point the health check at the worker roots:

```bash
REPO=/Users/cdn-ai/surviving-sogice-ingest
PY="$REPO/.venv/bin/python"

"$PY" -m runner system-health \
  --mac-studio \
  --source-offload-root /Users/cdn-ai/sogice-offload \
  --transfer-root /Users/cdn-ai/sogice-transfer
```

## Trust Rules

- The files are derived. They can be deleted and regenerated.
- They do not replace `analysis.json`, `enrichment.json`, or researcher review
  sidecars.
- `trust_state=uploaded` means a local `sanity_record.json` exists.
- `trust_state=researcher_reviewed` means local review evidence exists.
- `trust_state=model_proposed` means model output exists but has not been
  locally marked reviewed.
- `trust_state=incomplete` means the document folder is present but analysis is
  missing.

`system-health` further classifies incomplete folders as `discarded`,
`intake_only`, `preprocessed_no_analysis`, or `stub_no_pipeline_artifacts` so
you can decide whether to retry analysis or simply archive/remove a stale
partial folder. Discarded incomplete folders are reported separately from
active incomplete folders because they usually do not need pipeline retry.

Every evidence edge carries provenance fields such as `doc_id`, `source_url`,
`source_artifact`, `review_status`, `evidence_strength`, and `edge_basis`.

## Tags And Enrichment

There are three related but different tag layers:

1. **Analysis tags** live in `analysis.json` and are document-level
   classifications: tactics, harms, functions, countries, languages, terms,
   actors, and networks. In the evidence graph these become
   `classification_tag` edges.
2. **Tag registry matches** come from the legacy/local tag vocabulary. During
   enrichment, matched tags are injected into the prompt as connection hints:
   "use as connection hints, not proof." They help the enrichment model notice
   known concepts, but they are not automatically treated as verified evidence.
3. **Enrichment proposals** live in `enrichment.json`. These are the reviewable
   lexicon/entity/tactic/practice/claim proposals. When they include quotes and
   are approved or pushed, they become stronger evidence graph edges.

The quality report keeps these separate. This matters: a classification tag can
say "this document involves a tactic", while an enrichment proposal should say
"this exact quote supports this tactic/term/entity proposal."

`corpus_connections` are also kept separate for now. They are counted as
deferred graph material until retrieval grounding is enabled, so they do not
inflate the pending enrichment review count.

If `knowledge_quality.json` says the tag registry is unavailable, the most
likely cause is that the legacy vocabulary folder is not mounted or is sitting
behind a cloud-file-provider timeout. Set this in `runner/.env` to a stable
local folder that contains `sogice_vocabulary_2026-04-03.csv`:

```bash
SOGICE_LEGACY_VOCAB_DIR=/path/to/Old_Artifact_Bakcup
```

The pipeline still works without that file. Enrichment simply loses the broad
tag-registry hints, and the quality report will mark the registry layer as
unavailable rather than failing the whole export.

Streamlit also shows this directly: open **Tag Registry** and expand
**Registry source and enrichment-hint status**. It shows the exact CSV path,
whether the CSV is present, how many searchable rows loaded, and the env var to
fix when the cloud/legacy path is missing.

## What To Look For Before Continuing Ingestion

Run:

```bash
"$PY" -m runner system-health
```

The system is in a good working state when:

- there are no blockers;
- source-offload packages have no folder/manifest drift;
- returned packages are not stuck in the wrong lifecycle folder;
- knowledge exports are present and fresh;
- `document_profiles.jsonl` count matches the corpus document count;
- the graph has non-empty `evidence_strength` counts;
- the quality report has no surprising zero-text / low-text documents;
- tag coverage and tag-registry matches look plausible for the corpus slice;
- pending enrichment / upload counts are understood and intentional.

The health check is intentionally conservative. It does not fix anything by
itself; it tells you where to look next.

## Current Interpretation Pattern

When the quality report says something like:

- `incomplete` documents: these are corpus folders without `analysis.json`.
  Use `system-health` to decide whether they are active partials to retry or
  discarded stubs that can be ignored/archived.
- `zero extracted text`: these need source/preprocess attention before their
  summaries or graph nodes are meaningful.
- `missing core analysis tags`: the document exists, but fields such as tactic,
  practice, harm, actor, network, or term are sparse. This is a signal to review
  analysis quality or enrichments, not an automatic failure.
- `tag registry unavailable`: enrichment still works, but it loses the legacy
  vocabulary hints used to notice known concepts.
- `pending enrichment proposals`: these are the proposals awaiting researcher
  review in Lexicon / Tag Registry-style review screens. They are not pushed to
  Sanity unless explicitly approved and pushed.

This is the coordination layer proposed in
`docs/SOLO_RESEARCH_AGENT_SYSTEM_EXPLAINER.md`: deterministic first, researcher
validation always, model/agent behavior only where it reduces work without
erasing provenance.
