# SurvivingSOGICE — Future Applications Roadmap (v1.0)

**Status:** design proposal — not yet ratified.
**Generated:** 2026-05-31. Branch `claude/review-architecture-70CUm`.
**Assumes complete:** G1 (triage fail-closed), G2 (cross-stage testimony/legal holds), G3 (reviewed-doc clobber guard), G4 (provenance hardening), G5 (corpus-connection suppression).
**Sequenced after:** data-structure lock-in → TASK F (batch runner).

**Core method (non-negotiable):** *AI proposes, the researcher validates, the archive preserves provenance.*
Everything below is a way to make that method **produce more** — not a way to remove the researcher from the loop.

This roadmap is written for a **solo, part-time PhD researcher** with a MacBook + a Mac Studio over Tailscale, working in the public interest. The filter for every idea is: *free or near-free, doable alone, mostly automatable, and safe to publish.*

---

## 0. One-paragraph orientation

The system already extracts **typed, provenanced structure** that most archives never capture: classifications, lexicon terms with clusters/functions/variants, entity records with `NetworkConnection` edges, `TermRelationship` edges, `PracticeDescription` with harm stance, `StatisticalClaim`s, `geographic_scope`, `document_date`, and `legal_status`. The strategic point is that **almost every "future output" below is a *read* over data you are already modelling** — not a new extraction pipeline. The work is mostly (a) keeping IDs and edges clean now, (b) wiring retrieval (G5), and (c) building thin, read-only views. That is exactly the kind of work a solo researcher can sustain.

---

## 1. Research outputs this corpus can support

Each output maps to fields that already exist in `models/document.py` / `models/enrichment.py`. "Readiness" = how much new plumbing it needs.

| Output | Driven by (existing fields) | Readiness | Why it matters |
|---|---|---|---|
| **Actor / funding network graph** | `EntityProposal.network_connections` (`partner/funds/funded_by/co-signatory/parent_org…`), `key_individuals` | **High** (export-only) | Shows transnational SOGICE coordination — the single most publishable, hardest-to-dispute artifact. |
| **Lexicon genealogy / euphemism evolution** | `TermRelationship` (`successor_to/euphemism_for/derived_from`), `TermVariant`, `document_date` | **High** | Demonstrates *rebranding over time* ("reparative" → "unwanted SSA" → "pastoral support"). Strong methodological contribution. |
| **Geographic spread map + timeline** | `geographic_scope` (ISO), `document_date`, `landmark`/events, `legal_status` | **Medium** (needs ISO normalisation) | Where tactics/terms appear and migrate across Europe; ties to legal status changes. |
| **Tactic × register × framing matrix** | `tactic`, `narrative_register`, `framing_balance`, `practice` | **High** | Quantitative backbone for qualitative claims about *how* SOGICE is argued. |
| **Claim / fact-check ledger** | `StatisticalClaim` (`claim`, `source_cited`, `verifiable`, `context`) | **Medium** (needs a verification lifecycle field) | A standalone "disinformation claims register" — high public-interest value. |
| **Multilingual SOGICE glossary** | `TermVariant` (language-tagged), `relatedTerms`, `accessibleDefinition` | **High** | Reusable by other researchers/NGOs across the 6 languages. |
| **Semantic corpus map** (clusters the vocabulary didn't anticipate) | 4096-d embeddings + UMAP/HDBSCAN/BERTopic | **Low** (needs G5 + `vector(4096)` migration + retrieval) | Discovery loop: surfaces themes → feeds new candidate terms back into enrichment. |
| **Practice/harm-stance catalogue** | `PracticeDescription.harm_stance` (`denied/minimized/reframed/acknowledged`) | **High** | Evidence of how harm is rhetorically managed — directly relevant to policy/legal audiences. |
| **Corpus connection graph** (cites/contradicts/same-org) | `CorpusConnection` | **Blocked on G5** | Only trustworthy once grounded in vector retrieval; until then it is hypothesis, not evidence. |

**Takeaway:** 6 of 9 are essentially export-and-visualise tasks. Prioritise those; they are the cheapest credibility wins.

---

## 2. External tools to evaluate (and why) — solo/free lens

Grouped by job. Default stance: **evaluate, don't adopt blindly**; prefer local + open-source + EU-friendly.

### Now-useful (improve current quality)
- **marker / surya** — OCR + layout + reading order for **scanned/structureless PDFs**. Restores the heading signal `book_splitter.py` needs and recovers *page numbers* (currently sections carry only `start_char`). Citing books needs page provenance. *Free, local.*
- **WhisperX** (or whisper.cpp) — word-level timestamps + **speaker diarization** for video/audio. Diarization is the missing piece for attributing testimony to speakers and for precise consent handling. *Free, local; move to Mac Studio for long media.*
- **fastText / lingua** — deterministic per-section **language ID** to validate the model's `languages` field across the 6 languages. *Free, tiny.*
- **GROBID** — structured **reference/citation extraction** for academic PDFs → feeds *grounded* `cites`/`cited_by` edges (a real input for G5, not model guesswork). *Free, local (Docker/Java).*

### Near-future (when outputs start)
- **networkx** (analysis) + **Gephi** or **Cytoscape** (visual) for the actor/funding graph. Start with `networkx` exports — no server, scriptable, free.
- **Kepler.gl / Leaflet** for the maps; **Datawrapper** (free tier) for publishable static charts/timelines.
- **DVC** or **git-annex** — version the corpus + audit sidecars as *data*, so "which prompt + model + input produced this record" is reproducible (complements G4). *Free.*

### Evaluate, but likely defer
- **Label Studio / Argilla** — proper human adjudication/calibration UI. Genuinely better than the Streamlit forms for the validation phase, **but** it adds a service to run; only worth it if review volume grows. Revisit after Phase 0.5 calibration.
- **Neo4j** — only if the network graph outgrows `networkx`/flat exports. A graph *database* is premature for a solo pilot; a queryable export is enough.

**Rule of thumb:** adopt a tool only when a concrete output is blocked without it. Everything in "Now-useful" is justified by an existing gap; everything below it waits for a real need.

---

## 3. Data structures to lock in NOW (cheap now, expensive later)

These are mostly **additive, reserve-the-field** changes. Doing them before TASK F / scale is what makes maps/networks/ledgers possible later without re-ingesting the corpus.

1. **Stable, persistent IDs everywhere.** `doc_id` and Sanity `_id`s are the join keys for every future graph. Never recycle or mutate them. Ensure every proposal that links to an existing entity carries `existing_entry_id` / `existing_entity_id` (the schema already supports this — enforce it in review).
2. **Edges as first-class, directional, typed.** `NetworkConnection`, `TermRelationship`, `CorpusConnection` are your graph edges. Reserve a thin **edge-export view** now (doc-derived: `(source_id, type, target_id, evidence_quote, doc_id, confidence)`). Even if you don't visualise yet, capturing direction + evidence + provenance per edge is what makes the graph defensible.
3. **Provenance key on every derived claim** (this is G4, formalised for the long term): `doc_id`, `quote`, `model`, `prompt_hash`, `git_commit`, `confidence`, `extracted_by`, `score_derived_from_status`. Without this, no output survives a methodology defence.
4. **Geographic normalisation to ISO 3166-1** in `geographic_scope` (schema currently allows "ISO or region names"). Maps need codes, not free text. Normalise at review time.
5. **Consistent ISO 639-1 language tags** on every `TermVariant` and document. The multilingual glossary and cross-language genealogy depend on it.
6. **Temporal axis on terms and events.** Keep `document_date` (with its `confidence`) and ensure events/landmarks carry dates. Lexicon genealogy and timelines need a first-attestation date per term — reserve a `first_attested` field on lexicon entries now.
7. **Claim verification lifecycle.** `StatisticalClaim` has `verifiable`/`source_cited`; add a reserved `verification_status` enum (`proposed → checked → supported → contradicted → unverifiable`) so the ledger has a human-owned state machine later.
8. **Embedding provenance + the `vector(4096)` migration.** `embedding_model`/`dimension` are already recorded; finish the migration and wire retrieval (G5 precondition) so the semantic map and grounded corpus connections become possible.

> None of these require new extraction. They are review-time enforcement + a couple of reserved fields. Land them around G5 and TASK F inherits a clean substrate.

---

## 4. What must remain human-reviewed (permanent gates)

These are method, not friction. They never get automated:

- **Publication decisions** — what becomes public, and when. Highest stakes.
- **Testimony consent** — confirm/withdraw/refuse. Already a hard gate (G2); keep it human-only, including any future removal requests (Q18).
- **Lexicon validation and merging** — promoting `candidate → draft → validated`, and especially `merge_into`. Merging terms is a genealogical/interpretive act; the model may *propose*, the researcher *decides*.
- **Entity identity resolution** — "is this the same organisation/person?" Conflating actors is defamatory if wrong.
- **Classification of Tier-1 / legal / testimony documents** — the consequential ones.
- **Claim verification verdicts** — `supported/contradicted/unverifiable` is a human judgement with a citation, not a model output.
- **Network edge assertions used as evidence** — "X funds Y" is a serious claim; the edge may be proposed, but its evidentiary use is researcher-owned.

---

## 5. What NOT to build yet

- **Anything that publishes or merges without a human** (see §4).
- **Corpus-connection *claims* before retrieval** — that's G5; until then they are ungrounded.
- **A second "critic" model** that overrides analysis — a *consistency check that surfaces contradictions to the researcher* is fine later, but not an autonomous arbiter.
- **Multi-user / team infrastructure** — the project is explicitly solo.
- **A heavyweight graph database / search cluster** — flat exports + `networkx` + pgvector are enough at pilot scale.
- **Large batch mode before confidence calibration** — calibrate on 10–20 docs first.

---

## 6. Evaluation of the eight candidate builds (with timeline placement)

Timeline anchors: **Phase 0.5** = pilot/calibration (now); **Phase 1** = full ingestion + validation batches; **Phase 2** = semantic map / analytics; **Phase 3** = public archive.

| Candidate | Verdict | When | Rationale |
|---|---|---|---|
| **Public Vercel archive UI** | **Worth it — later** | Phase 3, *after* calibration + G4 provenance + a written publication/testimony-removal protocol (Q18) | A public archive is a core goal, but publishing before provenance + a removal protocol risks exposing unvalidated or sensitive material. Build read-only over a *validated subset*. |
| **Book upload / Sanity schema beyond `split-book --preview`** | **Worth it — medium** | Early Phase 1, *when the first real book enters the corpus* | Needs the `Q-BookSanity` decision (`sogiceBook` vs `parentBook`) **and** page-level provenance (pair with marker/surya). Don't expand schema until a book is actually being ingested. |
| **Corpus-connection claims without retrieval** | **Do not build** | — | This is exactly G5. Suppress or clearly label as ungrounded until vector retrieval feeds enrichment. |
| **Automatic lexicon merging** | **Do not build** | — | Merging is interpretive/genealogical. Keep `merge_into` as a *proposal* the researcher accepts. |
| **Automatic publication** | **Never** | — | Violates the core method and the consent gate. Publication is always human. |
| **Raw-response retention by default** | **No by default; opt-in only** | G4, as `--keep-raw` | Raw responses can contain PII/testimony fragments; default retention is a privacy/storage liability. Offer opt-in with a redaction note. |
| **Team dashboards / assignment workflows** | **Do not build** | — | Solo researcher. Multi-user adds permissions/process with zero payoff. |
| **Large batch mode before calibration** | **Do not build yet** | After Phase 0.5 calibration + G3–G5 | A batch runner amplifies any silent gap across many docs. Calibrate thresholds first, then TASK F gated by `is_overnight_safe()`. |

---

## 7. External tech worth doing NOW (improves the system immediately)

Short list, each justified by a *current* gap:

1. **Finish `vector(4096)` migration + `embed-test`**, then wire retrieval into enrichment. Unblocks G5, the semantic map, and grounded corpus connections. *(In-house; precondition for everything in Phase 2.)*
2. **marker/surya as a PDF fallback** behind Docling — recovers headings + page numbers for scanned books/reports. Improves both `split-book` and citation provenance.
3. **GROBID for academic PDFs** — grounded citation edges instead of model-guessed `cites`.
4. **fastText/lingua language ID** — a cheap correctness check on `languages` before it propagates into the glossary.
5. **DVC (or git-annex) on the corpus + audit sidecars** — reproducibility you'll want for the methodology chapter; complements G4.

Everything here is free, local/EU-friendly, and runs on the existing two-machine setup.

---

## 8. What can genuinely help the researcher (free, solo, automatable)

Concrete, low-effort, high-leverage:

- **One-command nightly *report*, not a nightly *publish*.** After TASK F, generate a morning digest: what was ingested, what was *held* (testimony/legal/low-confidence), what proposals await review, what failed. Read-only, safe, and it turns the archive into a calm queue.
- **A "review inbox" view** (Streamlit) that surfaces only items needing a human decision, ranked by stakes (Tier-1/legal/testimony/low-confidence first). Less hunting, fewer errors under time pressure.
- **Self-serve exports** (`runner export …`) to CSV/JSON/GraphML for the network/glossary/ledger — so the researcher can drop data into Datawrapper/Gephi without bespoke code.
- **Provenance one-pager per document** — auto-rendered "what the pipeline saw, decided, and flagged" (from the audit sidecars). Doubles as figure material for the thesis.
- **Calibration dashboard** — confidence vs. researcher-corrected outcomes, to tune thresholds with evidence (resolves the calibration items in Phase 0.5).
- **Backups + reproducibility** via DVC and existing Sanity/Supabase exports — peace of mind for a solo operator.

All of these are read-only or proposal-only: they speed the researcher up **without** touching the validation gates.

---

## 9. What's helpful for the cause and applicable online

Outputs that serve the wider public-interest goal — each publishable from a *validated subset*, with provenance:

- **Public, citable SOGICE network map** — who coordinates with whom across Europe, with evidence links. The highest-impact, hardest-to-dispute artifact.
- **Living multilingual glossary** — a reference for journalists, NGOs, and researchers in all 6 languages, with accessible definitions and attested variants.
- **Disinformation claims ledger** — recurring statistical/empirical claims with their (often missing) sources and a verification status. Directly useful to fact-checkers and policymakers.
- **Lexicon genealogy explainer** — a public-facing narrative of how harmful practices get rebranded over time; strong for advocacy and media.
- **Tactic/framing briefs** — short, evidence-backed summaries of *how* SOGICE is argued (pastoral, clinical, legal, conspiratorial registers), useful for counter-messaging and policy submissions.
- **Open data drops** (validated subset, JSON/CSV on GitHub) — lets others build on the work; embodies the public-interest mission.

Every public artifact ships with: provenance, an uncertainty/validation status, and a removal pathway for testimony. *The tool makes candidate structure visible while preserving review, uncertainty, and provenance — it does not replace archival judgement.*

---

## Recommended sequence (one screen)

1. **Data-structure lock-in (§3)** — IDs, edges, ISO geo/lang, temporal axis, claim lifecycle. Cheap now.
2. **TASK F** — batch runner, gated by `is_overnight_safe()`, after Phase 0.5 calibration.
3. **First outputs (export-only):** network graph, glossary, claims ledger, framing matrix — the high-readiness wins from §1.
4. **Then** retrieval enablement (`vector(4096)` + related-doc context), book schema (when a book arrives), semantic map (Phase 2), and public Vercel archive over a validated subset (Phase 3).

**Bottom line:** the corpus is already structured for ambitious outputs; the near-term work is *protecting provenance and keeping IDs/edges clean*, not adding intelligence. Build read-only views and exports first, keep every consequential decision human, and let the public artifacts follow the validated subset — never the raw pipeline.
