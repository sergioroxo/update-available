# Longform Document Review Pipeline for a Provenance-First Research Archive

## Design principles and architectural stance

Your governing rule should be formalised in the data model, not left as a policy note: **AI proposes, researcher validates, archive preserves provenance**. In practice, that means the system should distinguish immutable source artefacts, derived text representations, low-level extraction events, model-generated candidates, human review decisions, and public assertions. This maps well onto W3C PROV’s distinction between entities, activities, and agents, and it also aligns naturally with web-style annotation models in which a claim is linked to a specific target segment rather than treated as free-floating text. citeturn5search0turn5search1turn4search0

For long-form documents, do not treat “the document” as the primary analytical unit. Treat it as a **container** with a hierarchy of reviewable units: front matter, chapter, section, subsection, appendix, note block, bibliography, table, figure, and quoted excerpt. TEI explicitly models texts as `front`, `body`, and `back`, with `div` for subdivisions; JATS similarly models articles as `front`, `body`, and `back`, with explicit structures for references, footnotes, tables, and cross-references. Those standards are useful not because you must emit TEI or JATS for everything, but because they give you a mature conceptual grammar for long-form segmentation. citeturn1search2turn1search6turn9search3turn1search3turn12search0turn12search9

A practical archive stack for your use case should therefore be layered. I recommend: a cross-disciplinary descriptive layer based on Dublin Core; a citation/export layer based on CSL-JSON plus BibTeX; DOI-aware enrichment via Crossref and DataCite; public-page structured data via schema.org; structure-aware full-text modelling via TEI for general long-form works and JATS for journal articles; legal XML when available via Akoma Ntoso; page/image delivery via IIIF; annotation and locators via the Web Annotation Data Model; provenance via PROV; and web-capture preservation via WARC/WACZ where the document origin is a website rather than only a file. Dublin Core remains intentionally minimal with fifteen core properties; CSL-JSON is an established JSON bibliographic input model; Crossref content negotiation can deliver CSL JSON, RIS, and BibTeX; DataCite explicitly models `relatedIdentifier` and `relationType` values such as `Cites` and `IsCitedBy`; schema.org provides types such as `Book`, `Report`, `Thesis`, and `ScholarlyArticle`; IIIF Presentation is for rich online viewing of compound digital objects, while IIIF Search supports searching annotation content within a manifest or collection. citeturn0search0turn0search8turn0search1turn16view2turn16view3turn6search0turn6search3turn17search0turn7search2turn7search1turn7search21turn2search0turn4search16

The most important consequence of this layered design is that **no single export format becomes your source of truth**. IIIF is excellent for paged public delivery, but its descriptive layer is intended for humans rather than machine-semantic reasoning; Crossref and DataCite are authoritative for some identifiers and relationships, but not for your internal textual evidence; TEI and JATS are excellent text-structure models, but not sufficient by themselves for your researcher workflow. Your internal canonical model should therefore be a provenance-rich archive schema that can *map to* these standards rather than be constrained by any one of them. citeturn2search0turn16view2turn6search19turn9search7turn1search3

## Metadata model for long-form artefacts

### Bibliographic metadata

Bibliographic metadata should answer a simple question: **what is this work, independent of your research agenda**? If you later repurpose the corpus for another topic, the bibliographic record should remain valid. Dublin Core gives you the baseline descriptive elements; CSL-JSON gives you a practical JSON field vocabulary used across citation workflows; Crossref and DataCite provide DOI-linked enrichment; schema.org gives you public-web publishing types and properties; and Crossref’s REST API can expose not only bibliographic fields but also licences, abstracts, ORCID iDs, and ROR IDs where deposited. citeturn0search0turn0search8turn0search1turn16view2turn6search2turn5search2turn5search3turn17search2

For your corpus, the **common bibliographic core** should include:

- stable local identifier and content hash;
- title, subtitle, alternative title, translated title;
- work type and subtype;
- creator roles: author, editor, translator, compiler, corporate author, issuing body;
- publication date, original date if reprint, version or edition;
- publisher, imprint, place of publication;
- language and script;
- identifiers: DOI, ISBN-13, ISBN-10 if present, ISSN, report number, document number, repository identifier, handle, OCLC or library ID if available;
- container metadata where applicable: journal title, book title, series title, volume, issue, chapter title;
- extent: pages, pageStart/pageEnd, article number, number of pages;
- rights and licence;
- canonical URL, access URL, archived URL, capture date;
- related works and persistent identifiers for persons and organisations where confidence is high enough to use ORCID and ROR safely. citeturn17search0turn7search21turn1search1turn17search1turn6search2turn5search2turn5search3

Type-specific extensions matter because long-form works do not all describe themselves the same way. A **book** record should add ISBN set, edition statement, series, volume, number of pages, translator, illustrator, and original publication date. A **report, policy document, or manual** should add issuing organisation, report number, revision number, version date, status, jurisdiction, sponsoring body, and intended audience. A **scholarly article** should add journal, volume, issue, page span or article number, abstract, DOI, funder metadata, and update history if known. A **thesis** should add degree, awarding institution, department, degree date, supervisors, thesis type, and repository handle. A **legal or quasi-legal policy artefact** should add jurisdiction, promulgating body, court or agency if applicable, case/bill/docket number, neutral citation where present, and enactment or decision date. These distinctions are consistent with the type vocabularies exposed by schema.org and CSL/BibTeX ecosystems, even though your internal model should be more detailed than either one alone. citeturn17search0turn7search2turn7search1turn7search21turn7search6turn15search0

A practical canonical bibliographic sidecar can look like this:

```json
{
  "doc_id": "lfd_01JZ8W8M7Q4M7G7W2W4W2N4Y2Q",
  "record_version": "1.0.0",
  "work_type": "report",
  "work_subtype": "ngo_report",
  "title": "Example Title",
  "subtitle": "Optional Subtitle",
  "alternative_titles": [],
  "creators": [
    {
      "name": "Example Author",
      "role": "author",
      "orcid": null,
      "affiliations": [
        {
          "name": "Example Organisation",
          "ror": null
        }
      ]
    }
  ],
  "issuing_bodies": [
    {
      "name": "Example NGO",
      "ror": null
    }
  ],
  "publisher": "Example NGO",
  "place_of_publication": "London",
  "publication_date": "2021-05-12",
  "edition": null,
  "version_label": "v2",
  "language": "en",
  "script": "Latn",
  "identifiers": {
    "doi": null,
    "isbn_13": null,
    "isbn_10": null,
    "issn": null,
    "report_number": "R-2021-04",
    "local_id": "lfd_01JZ8W8M7Q4M7G7W2W4W2N4Y2Q"
  },
  "container": null,
  "extent": {
    "page_count": 184,
    "page_start": null,
    "page_end": null
  },
  "rights": {
    "copyright_statement": null,
    "license": null
  },
  "locations": {
    "source_url": "https://example.org/report.pdf",
    "archive_url": null
  },
  "source_of_metadata": {
    "embedded_pdf": true,
    "crossref": false,
    "datacite": false,
    "manual_entry": true
  }
}
```

### Analytical metadata

Analytical metadata is different in kind. It should answer: **why is this work relevant to your project, and what does your workflow think is happening in it**? It is contingent, topic-dependent, and revisable. That means it belongs in a clearly separate namespace and review queue. Do **not** merge it into bibliographic fields such as keywords, abstract, or subject unless you can show it is supplied by the source itself. That distinction matters because Crossref, DataCite, and schema.org records are descriptive metadata about the work, whereas your SOGICE-specific extractions are interpretive products of your own pipeline. citeturn6search2turn6search19turn17search2

I recommend five internal families of analytical metadata:

- `struct.*` for document structure and page/block organisation;
- `analysis.*` for summaries, themes, methods, rhetoric, claims, tactics, practices, theological framing, legal framing, scientific framing, and discourse patterns;
- `mentions.*` for low-level, minimally interpretive detections such as person names, organisations, case citations, Bible references, quoted works, or DOI-like strings;
- `proposals.*` for model-suggested registry additions and assertion candidates;
- `review.*` for human decisions, notes, dispositions, and publication status.

This separation lets you preserve a stable bibliographic record while allowing repeated analytical re-runs as your ontology changes, your prompts improve, or your research questions evolve.

A useful operational rule is:

- **bibliographic metadata** may be corrected by cataloguing logic or authoritative registries;
- **structural metadata** may be corrected by extraction/segmentation logic;
- **analytical metadata** may only become public fact after human review.

## Structural modelling and archive sidecars

### Structural model of the document

Long-form documents should be modelled as a hierarchy rather than a blob. TEI’s `front` / `body` / `back` and `div` pattern is especially helpful for books, reports, manuals, and theses; JATS brings a robust model for article-specific structures such as `ref-list`, `fn-group`, tables, figures, and typed cross-references. Importantly, JATS notes that a reference list may be labelled “References”, “Bibliography”, “Resources”, or “Additional Reading”, so your parser should preserve the source label rather than collapsing everything into a single undifferentiated `references` bucket. citeturn1search2turn1search6turn9search3turn12search0turn12search3turn12search9

A robust structural taxonomy for your domain is:

- **front matter**: cover, title page, imprint, copyright, foreword, preface, acknowledgements, executive summary, table of contents, lists of tables and figures, abbreviations;
- **body**: parts, chapters, sections, subsections, boxed text, sidebars, case studies, quotations, tables, figures, captions, footnote callouts, endnote callouts;
- **back matter**: appendices, annexes, glossaries, bibliographies, reference lists, notes, indices, author bios, supplementary materials.

Every structural unit should receive a stable identifier, a parent identifier, an order index, a heading label, a normalised heading, and page bounds. Where page coordinates exist, also store block coordinates and reading order. GROBID can recover full-text segmentation, section titles, footnote and reference callouts, figures, tables, and PDF coordinates for scientific PDFs; PyMuPDF can extract text as blocks or HTML and expose low-level document structure, but its own documentation cautions that plain text extraction may not preserve natural reading order without further processing. citeturn2search2turn2search6turn8search0turn8search8

I recommend a `sections.json` sidecar with a document tree, plus a `content.jsonl` block stream for the actual text segments. The document tree anchors the analysis; the block stream supports precise evidence and re-indexing.

```json
{
  "doc_id": "lfd_01JZ8W8M7Q4M7G7W2W4W2N4Y2Q",
  "page_map_status": "complete",
  "sections": [
    {
      "section_id": "sec_front_exec_summary",
      "parent_id": null,
      "kind": "front_matter",
      "subkind": "executive_summary",
      "label": "Executive Summary",
      "heading_text": "Executive Summary",
      "ordinal_path": [1],
      "page_start": 5,
      "page_end": 8,
      "char_start": 0,
      "char_end": 12488,
      "children": ["sec_ch1"]
    },
    {
      "section_id": "sec_ch1",
      "parent_id": null,
      "kind": "chapter",
      "subkind": null,
      "label": "Chapter 1",
      "heading_text": "Historical Overview",
      "ordinal_path": [2],
      "page_start": 9,
      "page_end": 34,
      "char_start": 12489,
      "char_end": 76432,
      "children": ["sec_ch1_s1", "sec_ch1_s2"]
    }
  ]
}
```

A companion `content.jsonl` record for each paragraph, table, figure caption, note, or quote block should include page and section anchors:

```json
{
  "doc_id": "lfd_01JZ8W8M7Q4M7G7W2W4W2N4Y2Q",
  "block_id": "blk_000184",
  "section_id": "sec_ch1_s2",
  "block_type": "paragraph",
  "page_index": 17,
  "page_label": "17",
  "bbox": [72, 181, 521, 623],
  "reading_order": 14,
  "text": "Example extracted paragraph text...",
  "text_source": "native_pdf_text",
  "ocr_confidence": null
}
```

### Recommended sidecar set

For a serious research archive, I would produce seven sidecars as the default minimum:

- `source.json` for acquisition, hashes, MIME, file lineage, capture context, and storage paths;
- `bibliographic.json` for descriptive metadata;
- `structure.json` for front/body/back and section tree;
- `content.jsonl` for block-level extracted text with page anchors;
- `references.json` for parsed citations, quoted works, scripture refs, legal refs, DOIs, URLs, and authority mentions;
- `analysis.json` for section-level summaries and low-level extracted mentions;
- `proposals.jsonl` and `review.json` for candidate findings and researcher decisions.

If you also ingest websites or landing pages, add `capture.warc` or `capture.wacz`, because WARC is the standard container for captured web resources and metadata, and WACZ packages WARC plus indexes/metadata into a distributable ZIP format. Browsertrix is especially relevant when you need high-fidelity capture of dynamic sites that host PDFs, reports, or supplementary media. citeturn9search0turn9search4turn2search1turn2search5turn9search1turn9search9

### Validation rules for structure

The structural layer should be strict. I recommend the following hard rules:

- every `section_id`, `block_id`, `figure_id`, `table_id`, `note_id`, and `reference_id` must be unique within a document;
- page ranges must be monotonic and non-overlapping at the same sibling level, unless the source explicitly contains overlapping apparatus;
- each block must belong to exactly one section;
- bibliography/reference sections are parsed structurally, but excluded from content claims unless the analysis task is specifically about the bibliography;
- appendices are searchable and analysable, but flagged `supplementary=true`;
- footnotes and endnotes must preserve a bidirectional link between callout and note body where possible, mirroring JATS `xref` patterns. citeturn12search9turn12search8turn9search14

## Section-level analysis and reference extraction

### Why section-by-section review is the right unit

A single-document summary is too lossy for books, theses, policy manuals, and long NGO or government reports. The output you want is not “what is this document about?” but “what does each part of this document do, say, cite, and imply, and with what evidential basis?” The pipeline should therefore run in stages:

First, do a **structural pass** that classifies sections without trying to infer substantive claims. Then do a **section analysis pass** in which each section is reviewed with bounded context: its own text, its parent headings, previous and next sibling headings, and a short document synopsis. Finally, do a **document synthesis pass** that combines reviewed section outputs. This makes later corrections local: if one appendix is misread, you do not have to re-litigate the whole book.

For long sections, use sliding windows with overlap, but bind every window to the same `section_id`. The model’s task per section should be type-aware. An executive summary prompt should look for framing claims and public-facing positioning; a methodology section should look for scientific authorities and evidence claims; a chapter on theology should privilege scripture, doctrinal authorities, and confessional sources; a policy appendix should privilege definitions, rules, and implementation instructions.

The per-section analytical record should usually include: a neutral synopsis, salient claims stated as candidates rather than facts, named authorities, cited or quoted sources, detected domains of argumentation, candidate links to registry terms, and a risk flag if the extraction is noisy, OCR-derived, or structurally uncertain.

### Native extraction before OCR

For born-digital PDFs, prefer native text extraction first. pypdf explicitly warns against simply replacing native extraction with OCR, because digitally born PDFs can contain fonts, encodings, and spacing information that text extractors can use directly. PyMuPDF is useful for low-level extraction, page objects, HTML output, and coordinate-aware processing; Camelot is useful for tables, but only for **text-based PDFs**, not scanned documents. citeturn8search1turn8search0turn8search8turn8search3

A sensible local stack is:

- PyMuPDF or pypdf for initial text and metadata extraction;
- pdfplumber or Camelot for difficult tables in text PDFs;
- GROBID for scholarly PDFs where reference segmentation, header parsing, and article-like structure matter;
- OCRmyPDF plus Tesseract for image-only or badly degraded scans. citeturn8search0turn8search1turn8search2turn8search3turn2search2turn2search7turn14search10

### OCR and scanned PDFs

For scanned PDFs, OCRmyPDF is a strong default because it can add an OCR text layer back into the PDF and generate searchable output; it can also generate sidecar text containing the OCR text it found. Its documentation notes an important constraint: the sidecar contains the OCR text only, and pages that already had text may not appear there. Tesseract can emit hOCR and TSV outputs, which are useful for word-level boxes and confidence-bearing processing. citeturn2search7turn14search10turn14search0turn14search8turn3search4

That leads to a practical rule for mixed PDFs: maintain separate provenance for `native_text`, `ocr_text`, and `merged_text`. Never pretend a merged page map is complete if half the page came from native extraction and half from OCR. Instead, store:

- `text_layer_origin`: `native`, `ocr`, or `hybrid`;
- `page_map_status`: `complete`, `partial`, or `missing`;
- `ocr_applied`: true or false;
- `ocr_engine`, `ocr_languages`, and page-level OCR confidence statistics;
- `extraction_warnings`: skew, rotation, low contrast, duplicate headers, missing reading order, or page failure.

If the extractor cannot align text cleanly to page locations, the downstream system should still permit section-level analysis but must suppress page-specific public claims. That is one of the most important risk controls in a provenance-first archive.

### Extraction of citations, authorities, quotations, scripture, legal references, and scientific references

For **bibliographic references and scholarly citations**, use a two-step pipeline: segment the reference list, then resolve each reference against registries. GROBID can parse lists of raw bibliographic references and return normalised TEI XML or BibTeX; Crossref provides Simple Text Query and REST-based metadata retrieval; Crossref’s reference and cited-by infrastructure and DataCite’s `relationType` model are both useful for citation-network enrichment, but their matches should be treated as external registry links, not proof of semantic relevance to your SOGICE ontology. citeturn10search2turn10search0turn10search1turn6search1turn6search9turn6search0turn6search20

For **in-text citation anchors**, retain both the string as written and the resolved target if found. JATS’s `xref` model is helpful conceptually here: the visible marker in the text and the target reference entry are different objects and should remain different in your archive too. A good schema therefore distinguishes:
`citation_callout`, `reference_entry`, and `resolved_work`. citeturn12search9turn12search0turn12search7

For **named authorities**, keep the extraction conservative. Separate `person_mention`, `organisation_mention`, `institutional_authority`, and `named_source_work`. If a person can be matched to ORCID or an organisation to ROR, store the external ID only when the match is high confidence; otherwise create a local canonical entity and record the unresolved variant string. Crossref metadata can expose ORCID and ROR where deposited, and ROR provides an open organisation registry for scholarly organisations. citeturn6search2turn5search2turn5search3

For **scripture and theology references**, use a dedicated parser and a canonical intermediate representation. OSIS exists precisely to encode Bibles and biblical research texts and provides a canonical reference system that is programmatically easy to normalise. In your archive, store both the surface form and the canonical form, for example `John 3:16` as written and `John.3.16`-style canonical identifiers in the theology subsystem. Also distinguish simple invocation from substantive exegesis: a fleeting verse citation is not the same as a doctrinal argument built on that passage. citeturn11search4turn11search1

For **legal references**, support jurisdiction-specific parsers where possible and a legal XML target when available. Akoma Ntoso is the relevant standard for structured parliamentary, legislative, and judicial documents. In the archive schema, model legal references as typed objects with fields such as jurisdiction, instrument kind, promulgating body, neutral citation or docket, section locator, and relation type. Do not collapse all legal references into plain text strings. citeturn3search1turn3search6turn3search10

For **quoted sources**, treat quotations as first-class evidence objects. Store the exact quote text only when rights and policy allow, plus a short public snippet, a normalised quote hash, and a locator bundle. The Web Annotation model’s TextQuoteSelector and TextPositionSelector are extremely useful here: the quote selector preserves the exact text plus prefix/suffix context, while the position selector stores Unicode code-point start and end offsets. W3C also notes that copying large amounts of source text into annotations can raise rights issues, which is directly relevant for a public-facing archive. citeturn13view0turn13view1

## Provenance design, graph integration, and review controls

### Provenance fields that should exist on every evidence-bearing object

Your provenance bundle should be redundant on purpose, because any single locator can break. The Web Annotation model supports this design: a target can carry fragment selectors, quote selectors, and position selectors, and those can be refined by each other. For PDFs and paged images, fragment selectors can express page selectors; for text, position selectors can use start and end character offsets; for brittle text, quote selectors with prefix and suffix help re-anchor after small edits. citeturn13view2turn13view1turn13view0

For each claim candidate, entity mention, extracted reference, or quoted passage, I recommend this minimum provenance object:

```json
{
  "evidence_id": "ev_01JZ8X0R6V8K2H4B1Q1V6V7G0T",
  "doc_id": "lfd_01JZ8W8M7Q4M7G7W2W4W2N4Y2Q",
  "section_id": "sec_ch1_s2",
  "page_index": 17,
  "page_label": "17",
  "char_start": 44122,
  "char_end": 44481,
  "text_quote": "Short stored quote or excerpt",
  "text_quote_hash": "sha256:8c9d...",
  "locator": {
    "fragment_selector": "page=17",
    "text_position_selector": {
      "start": 44122,
      "end": 44481
    },
    "text_quote_selector": {
      "exact": "Short stored quote or excerpt",
      "prefix": "words immediately before ",
      "suffix": " words immediately after"
    }
  },
  "citation_locator": "p. 17 n. 4",
  "source_artifact_id": "art_01JZ8W3J...",
  "representation_id": "repr_01JZ8W5D...",
  "extraction_method": "native_pdf_text",
  "ocr_confidence": null,
  "page_map_status": "complete"
}
```

In addition to the user-requested fields, I strongly recommend `representation_id` and `source_artifact_id`, because evidence should point not only to the work but to the *specific derivative text representation* from which it was extracted. Without that, you cannot later reconstruct whether a claim came from native text, OCR text, a repaired section map, or a manual correction. This is precisely the kind of provenance trace PROV was designed to record. citeturn5search0turn5search1

### Feeding the knowledge graph without overstating relationships

The safest graph pattern is **evidence-first reification**. Do not directly assert `document -> supports -> claim` as though it were a settled fact. Instead create:

- a `Document` node;
- a `Section` node;
- an `Evidence` node anchored to the text;
- an `AssertionCandidate` node proposed by the model;
- a `ReviewDecision` node by a researcher;
- only then, if accepted, a public `Assertion` node or edge.

This protects you against overstatement and also makes visualisation cleaner, because you can choose which layers to show. Public graphs can show only reviewed assertions. Internal graphs can show candidates, rejections, ambiguity clusters, and unresolved entity merges.

A practical distinction between graph edge types also helps. I recommend:

- `cites`, `quotes`, `mentions`, `references_scripture`, `references_legal_authority`, and `references_scientific_work` as **source-grounded** relations;
- `frames_as`, `argues_that`, `characterises`, `proposes_practice`, and `invokes_authority` as **interpretive** relations that must remain review-gated;
- `same_as` and `possibly_same_as` as separate identity relations;
- `derived_from` and `generated_by` for provenance.

This is compatible with PROV-style derivation, with schema.org’s distinction between `citation` and `mentions`, and with DataCite/Crossref citation relations, while still giving you a domain-specific interpretive layer. citeturn5search0turn17search1turn17search3turn6search0turn3search3

### Separate model proposals from researcher-reviewed findings

You asked for a hard separation, and I would implement it as a **status machine**, not just a flag. At minimum:

- `model_candidate`
- `triaged`
- `needs_review`
- `accepted`
- `accepted_with_edits`
- `rejected`
- `duplicate`
- `deferred`

Only `accepted` and `accepted_with_edits` should be eligible for public output or reviewed graph export.

A proposal object can be structured like this:

```json
{
  "proposal_id": "prop_01JZ8Y5D8B7D5M4M3A2R1P0K9S",
  "proposal_type": "claim",
  "doc_id": "lfd_01JZ8W8M7Q4M7G7W2W4W2N4Y2Q",
  "section_id": "sec_ch1_s2",
  "status": "model_candidate",
  "model_output": {
    "statement": "The section presents X as a therapeutic goal.",
    "interpretation_kind": "practice_claim",
    "confidence": 0.71
  },
  "evidence_ids": [
    "ev_01JZ8X0R6V8K2H4B1Q1V6V7G0T"
  ],
  "registry_targets": [
    {
      "registry": "practice",
      "candidate_label": "Example label"
    }
  ],
  "review": {
    "reviewer_id": null,
    "decision": null,
    "decision_date": null,
    "notes": null
  }
}
```

### Preventing reviewer overload

The main danger in a long-form pipeline is not missing data; it is producing too many low-value candidates. The antidote is a **proposal economy** based on aggregation, novelty, and evidential density.

I recommend that the model be allowed to emit many low-level mentions, but only a small number of higher-level proposals after a ranking pass. Proposal ranking should combine:

- novelty against existing registries;
- number of independent evidence spans;
- section salience;
- confidence that the span is substantive rather than boilerplate;
- cross-document recurrence;
- extraction quality penalties for OCR/noisy pages;
- duplicate suppression across nearby sections.

In practice, that means repeated bibliography-only citations, running headers, OCR garbage, table-of-contents echoes, and formulaic disclaimers should never surface as top-level proposals. Likewise, a Bible verse or court case mentioned once in a footnote should not become a registry proposal unless the surrounding text shows argumentative reliance.

The review UI should therefore expose three affordances that matter more than flashy dashboards:

- **merge and dismiss in bulk** for duplicates and low-value candidates;
- **promote from evidence to finding** only after the reviewer sees the exact excerpt, page, section, and neighbouring text;
- **compare candidate normalisations** for entities and authorities so the reviewer can resolve “same source or different source?” quickly.

A further safeguard is to default to **document-level rollups** for high-frequency low-salience phenomena. For example, instead of 73 separate “this document mentions X” proposals, show one card saying “X is mentioned in 11 sections; strongest 3 excerpts shown”.

## Public archive entry, interoperability, and phased implementation

### Designing the public-facing archive entry

A good public page for each long-form document should feel more like a scholarly dossier than a summary card. It should contain:

- a bibliographic header;
- a preservation header showing acquisition source, capture date, checksum, and available file formats;
- a document overview with neutral synopsis and table of contents;
- a page/section navigator;
- reviewed findings only, clearly labelled as reviewed;
- citations, references, named authorities, scripture/legal/scientific references as browseable facets;
- downloadable metadata in CSL-JSON and BibTeX;
- links to archived captures and, where appropriate, a IIIF manifest for paged viewing and search.

Schema.org supports the core public structured-data layer you need here through `Book`, `Report`, `Thesis`, `ScholarlyArticle`, `citation`, and `mentions`. IIIF Presentation and Search support a strong public paging and search experience for long image-backed objects. Crossref content negotiation means DOI-backed works can be re-exported conveniently as CSL JSON or BibTeX for Zotero-like workflows. citeturn17search0turn7search2turn7search1turn7search21turn17search1turn17search3turn2search0turn4search16turn16view2turn16view3

One architectural point is worth being explicit about: the public page should not display unreviewed model claims as facts. If you decide to expose machine-generated material at all, it should be visually and structurally separate, hidden by default, and labelled along the lines of “machine-generated candidate observations, not yet researcher reviewed”. In the public JSON-LD, only publish reviewed findings.

### Connection to Zotero-like metadata, citation networks, and future visualisations

The simplest way to stay compatible with Zotero-like ecosystems is to make **CSL-JSON your principal export shape** and **BibTeX your fallback exchange format**. Crossref content negotiation already exposes both CSL JSON and BibTeX from DOI-backed records, and BibTeX remains a widely supported bibliographic interchange format. That gives you immediate interoperability with citation managers, while your richer internal model preserves the long-form structure and provenance that citation managers do not handle. citeturn16view2turn16view3turn15search0

For citation networks, ingest three layers separately:

- bibliography entries as written in the document;
- resolved external identifiers from Crossref/DataCite;
- reviewed semantic relevance to your research ontology.

Crossref’s references and cited-by services and DataCite’s relation types are valuable here, but they should build a **citation layer**, not an interpretive layer. A document citing a paper about sexual orientation outcomes does not automatically endorse that paper; a report quoting a theologian does not automatically inherit the theologian’s stance. Preserve the network, then let researchers interpret it. citeturn6search1turn6search9turn6search0turn6search20

For future graph and WebXR visualisations, design your graph API around reviewed assertion nodes, evidence nodes, and stable entity IDs. That will let you render multiple views from the same substrate: citation network, authority network, scripture usage network, legal authority network, and practice/claim/tactic network. IIIF canvases or page images can later be used as contextual pop-outs inside graph views without forcing the graph itself to become the document store. citeturn2search0turn4search16turn5search0

### Phased local Python implementation roadmap

I would implement this locally in four phases.

**Foundation phase.** Build immutable artefact storage, content hashing, `source.json`, `bibliographic.json`, and native PDF extraction. Add PyMuPDF or pypdf extraction first; add OCRmyPDF/Tesseract fallback only for image-heavy or failed pages; store page maps, block streams, and extraction warnings. At this stage, do not run any interpretive LLM analysis yet. citeturn8search0turn8search1turn14search10turn3search4

**Structure phase.** Add section segmentation, front/body/back classification, note/table/figure detection, and `structure.json` plus `content.jsonl`. Introduce type-specific pipelines: GROBID for academic PDFs, generic long-form segmentation for books/reports/manuals, and a legal parser track where structured legal XML or citations are present. citeturn2search2turn10search5turn1search3turn3search1

**Evidence and review phase.** Add `references.json`, section-level analysis, evidence objects, proposal ranking, and reviewer workflows. Introduce the status machine, duplicate clustering, registry proposal suppression, and batch review affordances. Add explicit provenance selectors, quote hashes, OCR quality flags, and reviewer notes. Use Web Annotation-style selectors and PROV-style derivation fields from the start, because retrofitting provenance later is expensive. citeturn13view0turn13view1turn13view2turn5search0

**Publication and graph phase.** Add public archive pages, schema.org JSON-LD, IIIF manifests and search, downloadable CSL/BibTeX exports, reviewed graph exports, and optional WACZ packaging for source websites and landing pages. At this point you can also expose citation networks and evidence-linked graph views, but only from reviewed assertions. citeturn17search2turn17search0turn7search2turn7search1turn7search21turn2search0turn4search16turn2search1

### Recommended hard controls before publication

Before any public release, I would require the following validation gates:

- no public finding without at least one evidence object and one human review decision;
- no page-specific public locator if `page_map_status` is `partial` or `missing`;
- mandatory `ocr_confidence` fields whenever OCR was the extraction method;
- mandatory distinction between `source_stated`, `source_quoted`, `model_inferred`, and `researcher_interpreted`;
- quote-length caps in public outputs where rights are unclear, with private storage of full excerpts and public storage of hashes/snippets when necessary;
- immutable versioning of every derived representation so later corrections do not silently overwrite the provenance trail.

If you implement those rules as schema validation rather than reviewer habit, the archive will be much more robust under growth, reprocessing, and public scrutiny.

The short version of the whole design is this: **catalogue the work like a librarian, segment it like a text encoder, annotate it like a digital humanist, resolve references like a citation indexer, and publish it like an evidence archive rather than an AI notebook.** That combination is what will let the system scale without turning unreviewed model output into pseudo-fact.