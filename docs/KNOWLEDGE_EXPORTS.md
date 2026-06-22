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
```

For an exploratory graph that includes model-proposed / unreviewed edges:

```bash
"$PY" -m runner knowledge-graph-export --include-proposed
```

Treat that output as discovery material, not reviewed evidence.

## How To Inspect

Use Streamlit first:

1. Open **Corpus Intelligence**.
2. Open **Knowledge exports**.
3. Read the **Document profile preview** table.
4. Check the graph node/edge counts and **Evidence strength** counts.
5. Read **Quality audit preview**. This is the quickest answer to "can I trust
   the extracted data enough to keep working?"

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
```

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
