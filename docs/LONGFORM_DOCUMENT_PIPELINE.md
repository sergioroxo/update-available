# Longform Document Pipeline

Status: planning and implementation specification  
Scope: books, long PDFs, reports, theses, manuals, policy documents, and other
multi-section sources  
Last updated: 2026-07-01

## Executive Summary

The current SurvivingSOGICE ingest system works well for ordinary webpages,
short PDFs, articles, and source-offload packages. Longform sources need a
different treatment. A 100-300 page book or report is not one normal document
blob. It is a structured dossier with bibliographic identity, pages, sections,
citations, tables, repeated vocabulary, institutional references, and claims
that may require different levels of researcher review.

The next longform slice should therefore add a backend-first pipeline that
preserves the source as a citable archive object before asking any model to
interpret it:

```text
source file -> page map -> text blocks -> structure -> bibliography/references
            -> section analyses -> ranked proposals -> researcher decisions
            -> public-safe archive / graph / chatbot outputs
```

The key principle remains:

> AI proposes; the researcher validates; the archive preserves provenance.

This document synthesizes the five local DeepResearch notes in
`docs/DeepResearch/` and the earlier book/report report into a single
engineering target. It is also written so a later public website can explain
how AI-human collaboration is controlled, audited, and prevented from turning
machine output into unsupported fact.

## Why Longform Needs Its Own Pipeline

The current pipeline can extract and analyze a book-like PDF, but the result is
too thin for archival use:

- bibliographic details such as ISBN, edition, publisher, editor, place, and
  source/landing/PDF URLs may be missing;
- extracted text can be partial without a clear page-by-page quality report;
- footnotes, references, tables, appendices, and running headers may be mixed
  into normal text;
- analysis happens too much at whole-document level;
- proposals are not ranked by section importance, recurrence, citation support,
  or evidence strength;
- public-facing outputs would not know which findings come from reviewed
  section evidence and which are machine candidates.

For longform sources, the archive should first behave like a librarian,
digital-humanities encoder, and citation index. Only after that should it behave
like an AI analysis system.

## Relationship To Existing System

This specification extends, rather than replaces, the current architecture.

Already implemented:

- `citation_units.json` for paragraph-like locators over `extracted.txt`;
- `archive_summary.json` and `document_profiles.jsonl`;
- `archive_nodes.csv`, `archive_edges.csv`, and `archive_graph.json`;
- `knowledge_quality.json`;
- source-offload packaging and Mac Studio worker flow;
- proposal review queues for lexicon, entities, tactics, practices, and claims;
- local review sidecars such as `review_status.json`, `legal_review.json`, and
  `testimony_review.json`.

Longform should add a richer, page-aware layer beside those artifacts. Normal
documents continue through the existing path. Longform documents gain additional
sidecars and section-level review affordances.

## Source Notes

The synthesis is based on these local source notes:

- `docs/DeepResearch/deep-research-report_Book.md`
- `docs/DeepResearch/1. PDF Extraction : OCR Toolchain.rtf`
- `docs/DeepResearch/2. Bibliographic Metadata : Zotero-like Extraction.rtf`
- `docs/DeepResearch/3. Longform Review Workflow.rtf`
- `docs/DeepResearch/4. Public Book:Report Page Design.rtf`
- `docs/DeepResearch/5. SOGICE-Specific Longform Extraction Schema.rtf`

The RTF files should be treated as source notes, not final project
documentation. This Markdown file is the canonical design reference.

## External Standards And Tooling To Align With

The internal archive model should map to public standards without being trapped
inside any single one:

- **[PyMuPDF](https://pymupdf.readthedocs.io/)** for base PDF page extraction, blocks, words, coordinates, and
  page-level text. Its documentation explicitly warns that raw PDF text may not
  appear in natural reading order, and recommends block/word extraction with
  position information for reconstructing order.
- **[pdfplumber](https://github.com/jsvine/pdfplumber)** as an audit/debug layer for coordinates and tables.
- **[pypdf](https://pypdf.readthedocs.io/)** for metadata, splitting, merging, and simple PDF manipulation.
- **[OCRmyPDF](https://ocrmypdf.readthedocs.io/) + [Tesseract](https://tesseract-ocr.github.io/tessdoc/)** for conservative local OCR of scanned PDFs, with OCR
  artifacts treated as derived, uncertain representations.
- **[Docling](https://ds4sd.github.io/docling/) / Marker / Surya** as structure proposal layers, not archival
  authority.
- **[GROBID](https://grobid.readthedocs.io/)** for scholarly article metadata, TEI, bibliography, citation, and
  reference parsing when the source is academic or citation-heavy.
- **[CSL-JSON](https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html) / BibTeX / RIS** for citation export.
- **[Dublin Core](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)** for simple archival interoperability.
- **[schema.org JSON-LD](https://schema.org/CreativeWork)** for public document pages.
- **[W3C Web Annotation](https://www.w3.org/TR/annotation-model/)** selectors for quote/page/offset locators.
- **[W3C PROV](https://www.w3.org/TR/prov-o/)** concepts for derived artifacts, extraction runs, and review
  provenance.
- **[IIIF Presentation API](https://iiif.io/api/presentation/3.0/)** later, if page images/crops become public or exhibition-facing.

The project should own an internal model and export/crosswalk to these
standards.

## Core Data Objects

### Source Artifact

The exact file or web resource analyzed.

Required fields:

- `artifact_id`
- `path`
- `mime_type`
- `sha256`
- `size_bytes`
- `retrieved_from`
- `source_url`
- `landing_page_url`
- `pdf_url`
- `archived_url`
- `created_at`
- `acquisition_method`
- `acquisition_quality`

### Page

One physical or logical page in the analyzed representation.

Required fields:

- `page_id`
- `page_index`
- `pdf_page_number`
- `page_label`
- `width`
- `height`
- `rotation`
- `text_density`
- `image_coverage`
- `has_native_text`
- `ocr_used`
- `ocr_confidence`
- `extraction_status`

### Text Block

A page-bounded extracted content block.

Required fields:

- `block_id`
- `page_id`
- `order`
- `block_type`
- `text`
- `text_hash`
- `char_start`
- `char_end`
- `bbox`
- `extractor`
- `extractor_version`
- `source_artifact`
- `review_state`

Block types should include at least:

- `paragraph`
- `heading`
- `header`
- `footer`
- `footnote`
- `endnote`
- `caption`
- `table_cell`
- `bibliography_entry`
- `figure`
- `unknown`

### Section

A structural unit such as chapter, section, appendix, front matter, back matter,
or bibliography.

Required fields:

- `section_id`
- `parent_id`
- `order`
- `heading`
- `normalized_heading`
- `section_type`
- `page_start`
- `page_end`
- `block_ids`
- `review_state`
- `extraction_quality`

Section types should include:

- `front_matter`
- `table_of_contents`
- `chapter`
- `section`
- `subsection`
- `appendix`
- `bibliography`
- `index`
- `back_matter`
- `unknown`

### Evidence Span

A citable span that can support a proposal, graph edge, public note, or chatbot
answer.

Required fields:

- `evidence_id`
- `doc_id`
- `section_id`
- `page_id`
- `page_label`
- `block_id`
- `quote`
- `quote_hash`
- `prefix`
- `suffix`
- `char_start`
- `char_end`
- `bbox`
- `source_artifact`
- `representation_id`
- `extraction_method`
- `ocr_confidence`
- `review_state`
- `public_status`

This is the longform equivalent of a stronger `citation_units.json` locator.

### Proposal

A machine-proposed object extracted from a section or evidence span.

Required fields:

- `proposal_id`
- `doc_id`
- `section_id`
- `proposal_type`
- `label`
- `summary`
- `evidence_ids`
- `rank_score`
- `confidence`
- `source_model`
- `source_prompt_version`
- `registry_match`
- `review_state`
- `public_status`
- `risk_flags`

Proposal types should include:

- `lexicon_term`
- `entity`
- `tactic`
- `practice`
- `claim`
- `theological_claim`
- `clinical_claim`
- `legal_policy_claim`
- `scientific_citation`
- `testimony_material`
- `harm_claim`
- `historical_context`
- `public_annotation`

### Review Decision

The researcher decision over a proposal, section, citation, or public finding.

Required fields:

- `decision_id`
- `target_type`
- `target_id`
- `decision`
- `final_label`
- `final_summary`
- `visibility`
- `reviewer`
- `reviewed_at`
- `notes`

Decisions should include:

- `accepted`
- `edited`
- `merged`
- `rejected`
- `ignored`
- `important`
- `needs_reanalysis`
- `withheld`
- `public_ready`

## Proposed Sidecars

For each longform corpus document:

```text
corpus/<doc_id>/
  source.pdf
  bibliographic.json
  longform_source.json
  page_map.jsonl
  text_blocks.jsonl
  longform_structure.json
  evidence_spans.jsonl
  references.json
  tables.jsonl
  figures.jsonl
  longform_proposals.jsonl
  longform_review.jsonl
  longform_quality.json
```

Not every source needs every file. A simple born-digital report may not produce
OCR artifacts. A scanned book may produce OCR-specific files. A short web page
should not be forced into the longform stack.

### `bibliographic.json`

Purpose: Zotero-like work identity plus archive provenance.

It should include:

- title, subtitle, alternate titles;
- item type: book, report, article, legal document, thesis, manual, web page;
- authors, editors, translators, organizations, publishers;
- publication place, edition, version, date, copyright date;
- ISBN, DOI, OCLC, ISSN, report number, local accession id;
- language and script;
- source URL, landing page URL, PDF URL, canonical URL, archive URL;
- file artifact hashes;
- rights/license/display policy;
- field-level source, confidence, and review state.

Do not collapse `source_url`, `landing_page_url`, and `pdf_url` into one field.
For books and PDFs these often mean different things.

### `longform_source.json`

Purpose: exact source artifact and extraction run manifest.

It should include:

- source artifact list;
- extractor list and versions;
- extraction run ids;
- acquisition provenance;
- checksums;
- page count;
- detected representation type: born-digital, scanned, mixed, OCR-layer,
  partial, blocked, or unknown.

### `page_map.jsonl`

Purpose: one line per page, with page labels, coordinates, text density, OCR
status, and extraction warnings.

This is the file that lets a later public archive cite "p. 42" while still
knowing that the PDF page index is 48.

### `text_blocks.jsonl`

Purpose: one line per extracted text/layout block.

This is the archive-grade raw material for sectioning, quote location, OCR
quality checks, and evidence spans.

### `longform_structure.json`

Purpose: document hierarchy.

It should hold front matter, chapters, sections, appendices, bibliography, and
index blocks with review states. It is a proposal until a researcher accepts or
edits it.

### `evidence_spans.jsonl`

Purpose: stable citable evidence units.

Every proposal and public graph edge should eventually be able to point at one
or more evidence spans. If a quote cannot be located, the system must say so
explicitly instead of pretending certainty.

### `references.json`

Purpose: works cited by the document.

It should distinguish:

- raw reference string;
- parsed candidate;
- citation callout location;
- external match candidates;
- researcher-confirmed match;
- unresolved reference.

Do not treat a machine-matched citation as confirmed.

### `longform_proposals.jsonl`

Purpose: section-level machine proposals.

The existing `enrichment.json` can continue to be the registry proposal layer.
Longform proposals should be more granular and section-aware; accepted proposals
can later flow into enrichment-style review.

### `longform_review.jsonl`

Purpose: append-only researcher decisions for sections, citations, evidence
spans, and proposals.

### `longform_quality.json`

Purpose: extraction and review quality report.

It should include:

- pages missing text;
- pages OCRed;
- OCR confidence;
- suspiciously short extraction;
- repeated headers/footers;
- missing bibliography;
- unmatched citations;
- unreviewed high-risk claims;
- proposal counts by review state;
- public readiness blockers.

## Processing Pipeline

### Phase 1: Intake And Identity

Inputs:

- local file path;
- optional landing page URL;
- optional PDF URL;
- optional source queue item;
- optional notes.

Outputs:

- source copy in the corpus/offload package;
- SHA-256;
- `longform_source.json`;
- initial `bibliographic.json` shell.

Rules:

- preserve the exact file analyzed;
- store landing page and direct file URL separately;
- never rewrite the work identity to the Mac Studio temporary path;
- mark machine-derived bibliographic fields as unreviewed.

### Phase 2: Base Page Extraction

Use a deterministic PDF layer first. For born-digital PDFs, extract:

- page labels;
- page dimensions;
- blocks;
- words;
- coordinates;
- links;
- images where useful;
- embedded metadata.

This phase writes `page_map.jsonl` and `text_blocks.jsonl`.

### Phase 3: OCR Lane

If the PDF is scanned or mixed:

- run OCR only where needed;
- preserve OCR artifacts separately;
- record engine, language, confidence, and failures;
- do not silently treat OCR text as equal to native text.

If OCR is partial or poor, public page-specific claims must be blocked or marked
as uncertain.

### Phase 4: Structure Proposal

Use deterministic headings, page labels, table of contents, layout blocks, and
optional structure tools to propose:

- front matter;
- chapters;
- sections;
- appendices;
- bibliography;
- index;
- tables and figures.

The structure is a proposal until reviewed.

### Phase 5: Bibliographic And Reference Extraction

Extract or propose:

- title;
- subtitle;
- authors;
- editors;
- publisher;
- place;
- date;
- edition;
- ISBN/DOI/OCLC/report numbers;
- cited references;
- citation callouts;
- external match candidates.

For scholarly PDFs, GROBID-style TEI/reference extraction is useful. For books,
reports, religious documents, and policy texts, custom extraction and human
review remain necessary.

### Phase 6: Section-Level Analysis

Analyze sections, not the whole book as one blob.

Document-level analysis should answer:

- what kind of source is this?
- what is its declared purpose?
- who created/published it?
- what is the overall framing?
- what is the extraction quality?

Section-level analysis should answer:

- what local argument is made here?
- which terms and euphemisms appear?
- which entities, persons, institutions, or authorities appear?
- which practices, tactics, claims, citations, and harms are described?
- which evidence spans support those proposals?

### Phase 7: Proposal Ranking

Rank proposals by:

- evidence strength;
- recurrence across pages/sections;
- section importance;
- novelty against registries;
- SOGICE relevance;
- harm/ethical sensitivity;
- citation support;
- extraction confidence;
- duplicate/generic-language penalties.

The app should default to the most important 10-20 proposals per section, not
dump hundreds of candidates into one queue.

### Phase 8: Researcher Review

Review happens at several levels:

- document metadata;
- section structure;
- section analysis;
- evidence spans;
- citations/references;
- lexicon/entity/tactic/practice/claim proposals;
- public annotations.

Longform review states should be strict:

- `unprocessed`
- `extracted`
- `segmented`
- `analysis_pending`
- `machine_proposed`
- `needs_review`
- `accepted`
- `edited`
- `merged`
- `rejected`
- `ignored`
- `important`
- `needs_reanalysis`
- `withheld`
- `public_ready`

Important distinction:

- `rejected` means false or unsupported;
- `ignored` means not worth archival attention;
- `withheld` means valid but not public-facing.

### Phase 9: Public And Graph Export

Only reviewed public-ready material should flow into:

- Lexicon/Wikia pages;
- public book/report pages;
- public evidence graph;
- public chatbot/RAG index;
- future WebXR graph scenes.

Machine proposals can remain visible in private researcher mode.

## Domain Extraction Schema

Longform SOGICE extraction should not be a generic summary. It should extract
domain-specific objects with evidence and review state.

### Practices

Actions, interventions, routines, referrals, or institutional procedures.

Examples:

- accountability reporting;
- pastoral counselling;
- clinical referral;
- gender role training;
- testimony work;
- isolation or boundary-setting;
- family intervention;
- legal/policy advocacy.

### Terms And Euphemisms

Movement vocabulary, not just keywords.

Examples:

- same-sex attraction;
- unwanted attractions;
- healing;
- restoration;
- gender confusion;
- wholeness;
- therapeutic choice;
- exploratory therapy.

### Theological Claims

Religious reasoning and authority claims.

Examples:

- sin/restoration framing;
- creation order;
- gender complementarity;
- deliverance/spiritual warfare;
- pastoral authority;
- scripture references.

### Clinical / Therapeutic Claims

High-risk claims about etiology, diagnosis, change, treatment, or harm.

These require strong evidence and review before public use.

### Scientific Citations

How the document uses academic or scientific authority.

The archive should distinguish:

- the document cites a work;
- the system matched that citation to an external record;
- a researcher confirmed the match;
- the cited work is used to support a particular claim.

### Legal / Policy Claims

Claims about laws, bans, rights, parental authority, religious freedom, free
speech, or therapeutic choice.

These should carry jurisdiction and legal-review flags.

### Institutions, People, And Networks

Entity roles must be specific.

Examples:

- author;
- publisher;
- cited authority;
- programme provider;
- funder;
- endorser;
- legal actor;
- clinical actor;
- religious actor.

Do not force person-role relations such as `founder` into weak network edge
types. They should become structured role fields such as `key_individuals` or
`affiliated_orgs`, with evidence.

### Testimony / Survivor Material

Sensitive material must be treated separately.

The system should identify testimony function without over-extracting personal
identity:

- promotional success story;
- survivor harm account;
- parent testimony;
- ex-leader account;
- before/after narrative.

Public display must be conservative.

### Harm Claims

Separate:

- harm claimed by the source;
- harm reported by survivor/testimony material;
- harm interpreted by the archive.

These are not interchangeable.

### Historical Context

Context should be extracted as contextual metadata, not asserted as proven by a
single document.

Examples:

- movement phase;
- country/region;
- legal period;
- media context;
- institutional context.

## Public Longform Page Contract

A future public longform page should be an evidence dossier, not a simple
summary card.

Recommended public sections:

1. Header / identity block.
2. Trust and review state.
3. Public-safe summary.
4. Document structure.
5. Reviewed findings.
6. Evidence quotes.
7. Citations and references.
8. Entities, terms, tactics, and practices.
9. Graph connections.
10. Citation exports / JSON-LD.
11. Archive notes and limitations.

The reader should always know whether they are seeing:

- the document's own words;
- a reviewed archive interpretation;
- a machine-assisted unresolved lead;
- an extraction warning;
- a researcher note.

## Streamlit Review Design

Do not redesign Streamlit before the backend sidecars exist. The app should
become a review surface over durable artifacts.

Recommended pages or panels:

### Longform Queue

Shows:

- title;
- type;
- page count;
- extraction status;
- section review progress;
- proposal counts;
- public readiness;
- priority.

### Longform Overview

Shows:

- bibliographic metadata;
- file/source provenance;
- extraction quality;
- page map summary;
- table of contents;
- warnings.

### Section Review

Shows:

- section text;
- page range;
- extraction warnings;
- machine summary;
- evidence spans;
- citations;
- proposals grouped by type;
- review buttons: accept, edit, merge, reject, ignore, important,
  needs reanalysis.

### Proposal Inbox

Cross-document queue for high-value longform proposals.

Use three lanes:

- `Must Review`: high-risk claims, practices, legal/clinical claims;
- `Quick Triage`: lexicon/entity duplicates and low-risk terms;
- `Later / Batch`: weak or generic proposals.

Bulk actions should be allowed only for low-risk items. Never bulk-accept
high-risk claims.

### Public Output Preview

Shows what would become visible in the public archive, evidence graph, and
future chatbot index.

## Safety Rules

- No evidence span, no public claim.
- Machine-matched bibliographic records are candidates until reviewed.
- Machine-proposed graph edges are not public facts.
- OCR text is derived and must carry confidence/provenance.
- Low-confidence or page-map-missing material cannot support page-specific
  public claims.
- Legal, clinical, testimony, and harm claims require stronger review gates.
- Person identity in testimony material should be withheld unless explicitly
  reviewed for public display.
- Visual graph layout must not imply causality, funding, or coordination unless
  the underlying edge is reviewed and evidence-backed.

## Implementation Roadmap

### L0: Documentation And Contract

Status: this document.

Define the longform philosophy, sidecars, review states, safety boundaries, and
public contract.

### L1: Source And Bibliographic Shell

Add backend code and CLI to create:

- `longform_source.json`;
- `bibliographic.json`;
- `longform_quality.json` shell.

Command shape:

```bash
python -m runner longform-build <doc_id> --stage source
```

No models, no network, no Streamlit redesign.

### L2: Page Map And Text Blocks

Add deterministic PDF extraction:

- page labels;
- page dimensions;
- native text density;
- text blocks;
- word/block coordinates;
- page-level warnings.

Command shape:

```bash
python -m runner longform-build <doc_id> --stage pages
```

### L3: Structure Proposal

Create `longform_structure.json` using headings, table of contents, page labels,
and layout cues. Add a basic Streamlit preview only after the sidecar exists.

### L4: References And Citation Extraction

Create `references.json`, citation callouts, and unresolved reference lists.

External matching remains candidate-only.

### L5: Section-Level Analysis

Run AI analysis section-by-section, writing `longform_proposals.jsonl`.

This should be a separate pass from the current whole-document analysis.

### L6: Review UI

Add Streamlit Longform Review panels:

- metadata review;
- section navigator;
- proposal triage;
- public output preview.

### L7: Public-Safe Export

Extend archive summaries and public graph export with reviewed longform
findings, references, and page/section locators.

### L8: Wikia / Search / WebXR Feed

Expose reviewed longform content to:

- Lexicon/Wikia pages;
- public-safe evidence graph;
- citation-first chatbot index;
- future WebXR graph scenes.

## Success Criteria

The first implementation slices are successful when:

- a long PDF/book can be inspected without re-ingesting;
- the system knows page count, page labels, text density, and extraction quality;
- bibliographic metadata is represented separately from analysis;
- section structure exists before section analysis;
- proposals point to evidence spans;
- public outputs can distinguish reviewed findings from machine proposals;
- existing ingest/source-offload tests remain green;
- no Sanity/Supabase upload behavior changes;
- no public graph/chatbot/frontend is introduced prematurely.

## Open Questions

- Which extractor becomes the default page-map authority: PyMuPDF alone, or
  PyMuPDF plus pdfplumber audit?
- Should OCRmyPDF/Tesseract be required local dependencies or optional tools?
- Should GROBID be local Docker/service-based or deferred until scholarly
  references become a bottleneck?
- How should longform section proposals merge into the existing `enrichment.json`
  review system?
- What is the smallest useful Streamlit Longform Review UI that does not become
  another overwhelming proposal queue?
- How should copyrighted books expose public evidence: metadata-only, short
  excerpts, page references, or restricted internal quotes?

## Working Rule

For the next engineering slice, build the archive substrate first:

```text
bibliographic.json + longform_source.json + page_map.jsonl + text_blocks.jsonl
```

Only after those files are reliable should the app ask a model to interpret the
book.

## Implemented Deep-Review Slice

The current implementation now includes the first conservative model-review
pass:

```bash
python -m runner longform-build <doc_id>
python -m runner longform-review <doc_id> --dry-run
python -m runner longform-review <doc_id> --llm litelm-heavy
```

It writes:

- `longform_sections.json` — deterministic section map built from
  `text_blocks.jsonl`;
- `longform_section_analyses.jsonl` — one model-reviewed row per section;
- `longform_synthesis.json` — book/report-level synthesis based only on the
  completed section analyses.

This pass is intentionally separate from the normal ingest analysis. It does
not overwrite `analysis.json`, does not write Sanity/Supabase, does not mutate
enrichment proposals, and does not make public claims. The Streamlit Document
List longform panel can start the review as a background job and shows the same
terminal command for copy/paste use.
