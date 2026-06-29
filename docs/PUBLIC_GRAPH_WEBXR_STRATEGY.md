# Public Graph, Lexicon/Wikia, Search Simulator, and WebXR Strategy

Status: planning document  
Scope: public-facing visualization and retrieval layers over the existing local evidence archive  
Last updated: 2026-06-28

## Executive Summary

The project already has the right internal substrate for a public knowledge system: per-document `archive_summary.json`, central `document_profiles.jsonl`, an evidence-first `archive_graph.json`, quality reports, and research digests. The next step is not to put the current internal graph directly on the public web. The next step is to add a public graph adapter that produces a smaller, safer, versioned graph contract designed for web visualization, citation, and later WebXR.

The visual inspiration from `codebase-memory-mcp` is useful: a globe-like 3D graph can make a complex archive feel navigable and alive. But that project models code structure; SurvivingSOGICE models contested historical, political, legal, clinical, and organizational evidence. The public graph must make trust state, evidence basis, and review status visible. It should never let a spatial layout imply causality, funding, or coordination unless an edge is actually reviewed and evidence-backed.

Recommended direction:

1. Keep the existing archive graph as the internal Evidence Graph.
2. Add a public-safe graph export with explicit visibility and redaction policy.
3. Build a 2D evidence graph and Lexicon/Wikia first.
4. Add curated 3D/WebXR scenes after the public graph contract is stable.
5. Build the Google Simulator/chatbot last, as citation-first retrieval over reviewed exports.

## Existing Foundation

The current codebase already implements the first local knowledge layer:

- `runner/pipeline/archive_summary.py`
  - `build_archive_summary()`
  - `export_document_profiles()`
  - Produces per-document summaries and central JSONL profiles.
- `runner/pipeline/knowledge_graph.py`
  - `build_knowledge_graph()`
  - `export_knowledge_graph()`
  - Produces `archive_nodes.csv`, `archive_edges.csv`, and `archive_graph.json`.
- `runner/pipeline/research_digest.py`
  - `refresh_knowledge_and_digest()`
  - Refreshes profiles, graph, quality audit, and digest together.
- `runner/app.py`
  - Exposes Corpus Intelligence, Knowledge Exports, and Research Worklist controls in Streamlit.
- `docs/KNOWLEDGE_EXPORTS.md`
  - Documents current local knowledge exports.

The current graph should be treated as an internal research Evidence Graph. It is already intentionally conservative: reviewed/uploaded document tags and approved/pushed enrichment proposals are included by default, while proposed material is opt-in. Corpus-to-corpus discovery edges remain gated on retrieval grounding.

## What The 3D Inspiration Contributes

The `codebase-memory-mcp` visual model suggests several useful ideas:

- dense graph navigation can become a research instrument;
- node and edge filters must be first-class;
- clusters should be visible as spatial neighborhoods;
- visual exploration benefits from a fast local graph model;
- 3D should support guided discovery, not replace evidence inspection.

What should not be copied directly:

- code-specific node taxonomy such as Function/Class/File/Route;
- raw internal graph display as public truth;
- giant hairball default views;
- graph position as unstated evidence.

For this archive, the public interface must answer three questions every time a user clicks an edge:

1. What relationship is being shown?
2. Which document or reviewed proposal supports it?
3. What is the review/publication status of that evidence?

## Recommended Technology Architecture

### Primary Public Viewer: Graphology + Sigma.js

Use Graphology as the canonical in-browser graph model and Sigma.js as the first public graph renderer.

Why:

- Sigma is designed for WebGL graph rendering in browsers.
- Graphology gives a stable graph data model and algorithm ecosystem.
- 2D graph views are easier to make accessible, searchable, and citation-first.
- The public Evidence Graph should be useful before it is spectacular.

Use this for:

- public evidence network;
- Lexicon/Wikia relationship views;
- actor and organization network;
- tactic/practice graph;
- country/time/source filters.

### 3D Prototype: 3d-force-graph

Use `3d-force-graph` only after a public-safe graph contract exists.

Why:

- it consumes a simple `{ nodes, links }` shape;
- it is good for rapid 3D graph exploration;
- it has adjacent VR/AR projects in the same ecosystem;
- it can validate whether the spatial metaphor helps before a custom renderer is built.

Do not make it the canonical interface. Use it for private prototypes and later public “graph story” experiments.

### Exhibition / VR Layer: Three.js or React Three Fiber

Use Three.js or React Three Fiber when the graph becomes an authored spatial experience.

Use this for:

- curated 3D scenes;
- public WebXR prototypes;
- guided VR experiences with 50-300 nodes;
- carefully staged relationship narratives;
- immersive “archive constellations” where evidence panels remain available.

Do not run the full evidence graph as a raw force simulation in VR. VR should receive curated subgraphs with stable layout snapshots.

### A-Frame

A-Frame is useful for fast declarative WebXR prototypes. It is a good candidate for an early exhibition demo, but not for the whole archive architecture.

## Data Contracts To Add

The existing `archive_graph.json` should not be exposed directly as the public data contract. Add a new adapter export.

### PublicGraphManifest

```json
{
  "schema_version": "public-graph-v1",
  "generated_at": "ISO-8601",
  "source_schema_version": "archive-graph-v1.0",
  "visibility": "published_only",
  "counts": {
    "nodes": 0,
    "edges": 0
  },
  "redaction_policy_version": "public-redaction-v1",
  "includes_proposed": false,
  "evidence_quote_policy": "redacted|short_excerpt|full_internal_only"
}
```

### PublicNode

```json
{
  "id": "term:conversion-therapy",
  "type": "document|term|tactic|practice|person|organization|law|country|claim|harm|function",
  "label": "Conversion therapy",
  "slug": "conversion-therapy",
  "summary": "Public-safe short description",
  "trust_state": "uploaded|researcher_reviewed|model_proposed|incomplete",
  "workflow_status": "verified|published|unknown",
  "provisional": false,
  "counts": {
    "documents": 0,
    "edges": 0
  },
  "facets": {
    "countries": [],
    "languages": [],
    "clusters": [],
    "source_domains": []
  }
}
```

### PublicEdge

```json
{
  "id": "edge:doc-a:attests_term:term-conversion-therapy",
  "source": "doc:a",
  "target": "term:conversion-therapy",
  "type": "attests_term|attests_tactic|describes_practice|mentions_actor|affiliated_with|euphemism_for|successor_to",
  "directional": true,
  "doc_id": "a3ed56a17876",
  "source_url": "https://example.org/source",
  "evidence_strength": "quote_backed|classification_tag|proposal_no_quote",
  "edge_basis": "analysis_classification|enrichment_proposal|retrieval_grounded_connection",
  "review_status": "approved|pushed|researcher_reviewed|uploaded|published",
  "confidence": 0.92,
  "visibility": "public|internal|withheld"
}
```

### LayoutSnapshot

```json
{
  "schema_version": "layout-snapshot-v1",
  "graph_id": "public-graph-2026-06-28",
  "algorithm": "forceatlas2|spherical-cluster|manual-curated",
  "generated_at": "ISO-8601",
  "dimensions": "2d|3d",
  "nodes": {
    "node_id": {
      "x": 0,
      "y": 0,
      "z": 0,
      "pinned": false,
      "cluster_id": "cluster:tactic-religious-freedom"
    }
  }
}
```

### SearchDocument

```json
{
  "id": "doc:a3ed56a17876",
  "title": "Document title",
  "summary": "Public-safe summary",
  "source_url": "https://example.org/source",
  "trust_state": "uploaded",
  "workflow_status": "published",
  "node_ids": ["term:conversion-therapy", "tactic:religious-freedom-shield"],
  "citation_units": []
}
```

## Public Safety And Redaction Rules

The public export should apply stricter rules than the internal Evidence Graph.

Default public export:

- include only reviewed/uploaded/published material;
- exclude `include_proposed=True` edges;
- exclude rejected proposals;
- exclude local filesystem paths;
- exclude internal artifact paths;
- exclude or redact evidence quotes by default;
- suppress testimony-sensitive documents unless consent/publication state is explicit;
- suppress legal-sensitive material unless legal review is complete;
- preserve `doc_id` only if public routing uses it safely;
- expose source URLs only when they are already public and safe.

Modes:

| Mode | Audience | Includes |
|---|---|---|
| `public_published` | public website | published or explicitly public-safe records only |
| `public_reviewed` | public preview / staged release | reviewed/uploaded records with redactions |
| `internal_lab` | researcher only | proposed edges, full provenance, diagnostic fields |

## Product Surfaces

### Evidence Graph

Purpose: show reviewed relationships with citations.

Default view:

- search bar;
- filters by node type, source domain, country, tactic, date, trust state;
- graph canvas;
- evidence drawer;
- table/list fallback.

Every edge click should show:

- relationship type;
- evidence basis;
- source document;
- quote or redacted evidence preview;
- review state;
- link to document profile / Wikia page.

### Lexicon / Wikia

Purpose: make the graph legible as public knowledge pages.

Pages:

- term;
- tactic;
- practice;
- organization;
- person;
- country/context;
- document;
- source domain.

Each page should show:

- public definition;
- aliases and euphemisms;
- evidence dossiers;
- related terms/tactics/practices;
- document list;
- graph neighborhood;
- review and publication status.

The Lexicon/Wikia should be the human-readable form of the graph, not a separate knowledge system.

### Google Simulator

Purpose: teach how search results, language, and networked framing shape perception.

This should use the same public graph and citation units, but it should not be an unrestricted search or harmful-content generator.

Possible modes:

- “show how a concept travels across sources”;
- “compare public framing vs evidence-backed archive framing”;
- “why did this result appear?”;
- “trace this tactic across documents”.

The simulator should show citations and graph explanations, not just ranked links.

### Chatbot / Research Assistant

Purpose: answer archive questions with citations.

Rules:

- retrieval-grounded only;
- cite documents and trust states;
- refuse uncited claims;
- distinguish reviewed evidence from hypotheses;
- provide “open source” and “open graph neighborhood” actions.

This should come after retrieval grounding and public-safe exports are stable.

### WebXR / VR Graph

Purpose: public exhibition and embodied exploration.

Use cases:

- guided stories through the graph;
- curated subgraphs;
- classroom / museum / public presentation;
- “constellation” views of lexicon, institutions, tactics, geography.

Constraints:

- 50-300 nodes for VR comprehension;
- seated mode;
- reduced-motion mode;
- labels on demand;
- evidence drawer or companion panel;
- no graph-only truth claims.

## Performance Targets

| Surface | Target |
|---|---|
| Public default graph | under 500 visible nodes |
| Desktop graph expanded view | 2k-5k nodes if filtered and pre-laid-out |
| 3D browser graph | 500-2k nodes |
| VR graph | 50-300 nodes |
| Initial payload | ideally under 1 MB |
| Labels | on hover/click/search, not all visible |

Precompute layouts. Do not make the browser simulate the full graph on page load.

## Accessibility Requirements

The graph cannot be the only interface.

Required alternatives:

- searchable table of nodes;
- searchable table of relationships;
- keyboard navigation;
- evidence drawer with plain text;
- reduced-motion mode;
- color-blind-safe palette plus shape/line-style encoding;
- mobile fallback;
- downloadable citations.

## Implementation Roadmap

### Phase 0: Public Graph Contract

Add:

- `runner/pipeline/public_graph.py`
- `public-graph-export` CLI
- `exports/public_graph/public_graph.json`
- `exports/public_graph/public_graph_manifest.json`
- tests for redaction and trust gating.

No frontend yet.

### Phase 1: Private 2D Preview

Add a simple local browser viewer or static HTML preview using the public graph contract.

Goal:

- inspect shape, filters, and labels;
- validate public-safe export;
- compare graph to Corpus Intelligence counts.

### Phase 2: Lexicon/Wikia Export

Add static page data exports for:

- terms;
- tactics;
- practices;
- organizations;
- documents.

Goal:

- make public pages possible before immersive graph work.

### Phase 3: Public Evidence Graph

Build a web app using Graphology + Sigma.js.

Goal:

- public graph with search, filters, evidence drawer, and table fallback.

### Phase 4: 3D Graph Prototype

Use `3d-force-graph` or React Three Fiber against curated subgraphs.

Goal:

- test whether 3D actually improves comprehension.

### Phase 5: WebXR Experience

Use Three.js/R3F or A-Frame for a curated VR scene.

Goal:

- public-facing spatial archive experience with evidence-preserving interaction.

### Phase 6: Retrieval-Grounded Chatbot / Google Simulator

Use public-safe search documents, graph neighborhoods, and citation units.

Goal:

- answer questions and simulate search dynamics without uncited claims.

## What Not To Do Yet

- Do not publish the internal `archive_graph.json` directly.
- Do not build VR first.
- Do not use a graph database until static exports prove insufficient.
- Do not expose proposed model edges as facts.
- Do not auto-merge entities or lexicon terms.
- Do not let layout imply causality.
- Do not build a chatbot before citation and public-safe retrieval units exist.

## Near-Term Coding Slices

Recommended next coding work:

1. `public_graph.py` adapter and tests.
2. Public graph manifest and redaction policy.
3. Stable public IDs and collision tests.
4. Optional layout snapshot export.
5. Minimal static HTML/Sigma preview.

These slices preserve the current local evidence architecture while making the future public graph, Lexicon/Wikia, Google Simulator, and WebXR layers possible.

## External References

- Codebase Memory MCP: https://deusdata.github.io/codebase-memory-mcp/
- Codebase Memory MCP 3D layout source: https://github.com/DeusData/codebase-memory-mcp/blob/main/src/ui/layout3d.c
- Sigma.js: https://www.sigmajs.org/docs/
- Graphology: https://graphology.github.io/
- 3d-force-graph: https://github.com/vasturiano/3d-force-graph
- Three.js: https://threejs.org/docs/
- React Three Fiber: https://r3f.docs.pmnd.rs/getting-started/introduction
- A-Frame: https://aframe.io/docs/
- MDN WebXR fundamentals: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Fundamentals
