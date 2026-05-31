# SurvivingSOGICE Future Applications Tracker

**Status:** working tracker for follow-up steps after the future applications roadmap.
**Roadmap source:** `01_project_docs/FUTURE_APPLICATIONS_ROADMAP_v1.0.md`
**Last updated:** 2026-05-31

Core rule: **AI proposes, the researcher validates, the archive preserves provenance.**

This file tracks the concrete work needed to turn the corpus into research outputs,
public-interest artifacts, and better ingestion quality without weakening human review.

---

## 1. Immediate Safety / Provenance Spine

These come before large batch processing or public outputs.

| ID | Work | Why | Dependency | Artifact | Status |
|---|---|---|---|---|---|
| G1 | Triage fails closed | Prevent untriaged/failed items from reading as overnight-safe | none | code + tests | Done (`9a58cc807`) |
| G2 | Cross-stage testimony/legal holds | Prevent headless upload/enrichment of sensitive docs | G1 | code + tests | Done through G2-b-2b (`1e50d7558`) |
| G3 | Reviewed Sanity doc clobber guard | Prevent overwriting researcher-edited records | G1/G2 | code + tests | Done (`3bdfe91ae`) |
| G4 | Provenance hardening | Make outputs reproducible and methodologically defensible | G1-G3 | audit metadata + tests | Done (`5482bcc17`) |
| G5 | Ground/suppress corpus connections | Prevent ungrounded related-document claims | G4 preferred | enrichment/retrieval change + tests | Done (suppression route; retrieval deferred) |

G4 checklist:
- [x] Analysis resolved/template prompt SHA-256 fields in `analysis_audit.json`
- [x] Enrichment resolved/template prompt SHA-256 fields in `enrichment_audit.json`
- [x] Audit sidecar `schema_version` bumped to `2` for G4 (`3` after G5 enrichment-audit fields)
- [x] Current git commit hash in audit sidecars
- [x] Model/runtime/sampling params in audit sidecars
- [x] Wall-clock duration for analysis/enrichment
- [x] `score_derived_from_status` or equivalent confidence provenance
- [x] Triage audit sidecar or queue metadata for failure/default paths
- [x] Explicit decision on opt-in raw response retention: default off; not implemented without researcher sign-off

G5 checklist:
- [x] Suppress `corpus_connections` until retrieval is wired, or mark them explicitly ungrounded
- [ ] Verify Supabase `vector(4096)` storage/query path (retrieval enablement; deferred)
- [ ] Add retrieval context before allowing evidence-like corpus links (retrieval enablement; deferred)
- [x] Keep ungrounded connections out of public/export evidence workflows

---

## 2. Data Structure Lock-In

These make future maps, graphs, glossaries, and ledgers possible without re-ingesting.

| Data Structure | Needed For | Action | Status |
|---|---|---|---|
| Stable document/entity/term IDs | All exports and graph joins | Never recycle IDs; enforce `existing_entry_id` / `existing_entity_id` in review where applicable | Ongoing |
| First-class directional edges | Actor graph, lexicon genealogy, corpus graph | DS-2 added local `attested_in_doc` and `export_network_edges()`; Sanity schema/write deferred | Done locally; Sanity later |
| Provenance key on derived claims | Methodology defense, audit, public trust | Covered by G4 | Done for audit sidecars; enforce per-export later |
| ISO 3166 geography | Maps/timelines | DS-3 normalizes common country aliases; review/export ISO mapping remains later | Partial |
| ISO 639 language tags | Glossary, cross-language analysis | DS-1 added `AnalysisResult.languages`; DS-3 normalizes to ISO 639-1; deterministic language-ID check and Sanity schema migration later | Partial |
| Temporal axis | Lexicon genealogy, timelines | Preserve `document_date`; reserve `first_attested` for terms/events | Pending |
| Claim verification lifecycle | Claim/fact-check ledger | DS-4 added `verification_status`: unverified, verified, disputed, debunked, unverifiable | Done locally; Sanity/export later |
| Embedding provenance | Semantic map, retrieval | Keep model/dimension; finish `vector(4096)` verification | Pending |

---

## 3. Batch And Review Workflow

| Step | Description | Dependency | Status |
|---|---|---|---|
| TASK F dry-run manifest | Show included/excluded queue items, reasons, route, estimated risk | G5 recommended | Done (`runner batch-plan`) |
| TASK F batch ledger | Record source IDs, doc IDs, triage, audit paths, upload/enrichment status, errors | TASK F | Pending |
| 10-15 doc limit | Keep review load human-sized | TASK F | Done for dry-run plan; enforce again in execution |
| Stop-on-uncertainty rules | Stop when Mac Studio/LiteLLM/Sanity/Supabase state is uncertain | TASK F | Pending |
| Morning report | Human-facing summary of what happened overnight | TASK F | Pending |
| Stakes-ranked review inbox | Legal/testimony/Tier-1/low-confidence first | TASK F + Streamlit | Pending |
| Calibration dashboard | Confidence vs researcher corrections | Pilot batch | Pending |

Batch rule: the runner must use `source_queue.is_overnight_safe(item)` and must
surface excluded items before it starts. Do not query raw `overnight_batch_safe`
as the authority.

---

## 4. First Research Outputs To Build

Start with export-only outputs. Public interfaces come later.

| Output | Readiness | Required Inputs | First Artifact | Status |
|---|---|---|---|---|
| Actor/funding network graph | High | Entity proposals + network connections + evidence | CSV/GraphML export, then Gephi/networkx view | Pending |
| Multilingual glossary | High | Lexicon entries + variants + definitions + evidence | CSV/JSON glossary export | Pending |
| Lexicon genealogy | High | `TermRelationship`, variants, dates | Edge list + timeline export | Pending |
| Tactic/register/framing matrix | High | `tactic`, `narrative_register`, `framing_balance`, `practice` | CSV matrix | Pending |
| Practice/harm catalogue | High | `PracticeDescription.harm_stance` | Reviewable table/export | Pending |
| Claim/fact-check ledger | Medium | `StatisticalClaim` + verification lifecycle | Claims CSV with status | Pending |
| Geographic timeline map | Medium | ISO geography + dates | Datawrapper/Leaflet-ready export | Pending |
| Semantic corpus map | Low for now | Verified embeddings + retrieval | UMAP/HDBSCAN/BERTopic experiment | Blocked by retrieval verification |
| Corpus connection graph | Blocked | Retrieval-grounded `CorpusConnection` | Evidence-safe graph export | Blocked by retrieval verification |

---

## 5. External Tools To Evaluate

Evaluate only when a concrete workflow is blocked without the tool.

| Tool | Use | Timing | Status |
|---|---|---|---|
| marker / surya | OCR/layout fallback, scanned PDFs, page provenance | Now-useful | Candidate |
| WhisperX / whisper.cpp | Timestamped transcription, diarization, media/testimony attribution | Now-useful | Candidate |
| fastText / lingua | Deterministic language-ID check | Now-useful | Candidate |
| GROBID | Academic PDF references/citation extraction | Now-useful | Candidate |
| DVC / git-annex | Version corpus + audit sidecars as data | Near-term | Candidate |
| networkx | Local graph analysis and exports | Near-term | Candidate |
| Gephi / Cytoscape | Visual graph exploration | Near-future | Candidate |
| Datawrapper / Leaflet | Publishable maps/timelines | Near-future | Candidate |
| Label Studio / Argilla | Calibration/adjudication UI if review volume grows | Defer | Candidate |
| Neo4j | Graph database if flat exports become insufficient | Defer | Candidate |
| BERTopic / UMAP / HDBSCAN | Semantic map once embeddings are verified | Defer until retrieval is wired | Candidate |

---

## 6. Permanent Human Gates

Never automate these decisions:

- [ ] Publication decisions
- [ ] Testimony consent, withdrawal, refusal, and removal pathway
- [ ] Lexicon validation and term merging
- [ ] Entity identity resolution
- [ ] Tier-1 / legal / testimony classification acceptance
- [ ] Claim verification verdicts
- [ ] Network edge assertions used as evidence

---

## 7. Do Not Build Yet

These stay deferred until the spine is stronger:

- [ ] Public Vercel archive UI
- [ ] Sanity book schema beyond `split-book --preview`
- [ ] Corpus-connection evidence without retrieval
- [ ] Automatic lexicon merging
- [ ] Automatic publication
- [ ] Raw-response retention by default
- [ ] Team dashboards or assignment workflows
- [ ] Large batch mode before calibration
- [ ] Neo4j or heavy graph infrastructure

---

## 8. Recommended Sequence

1. **Data structure lock-in:** IDs, edges, ISO geo/language, temporal axis, claim lifecycle. DS-1, DS-2, DS-3, and DS-4 are complete; DS-5/6/7 remain deferred unless TASK F planning exposes a blocker.
2. **TASK F:** conservative batch runner with dry-run manifest and batch ledger.
3. **Pilot calibration:** 10-20 documents across languages/types/stakes.
4. **Export-only outputs:** network graph, glossary, claims ledger, framing matrix.
5. **Book schema:** only when a real book needs ingestion and Q-BookSanity is decided.
6. **Retrieval enablement:** verify `vector(4096)`, wire related-doc context, then re-enable grounded `CorpusConnection`.
7. **Semantic map:** after retrieval and embedding verification.
8. **Public archive:** validated subset only, with provenance and removal protocol.
