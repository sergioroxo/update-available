# SurvivingSOGICE — Implementation Plan v1.0

**Based on:** PRD v3.1  
**Last updated:** April 2026  
**Milestones:** June 2026 (CDN Pride Bergen WIP) · October 2026 (full exhibition)

---

## Overview

The build is organized into five phases matching PRD §24. Phase 0 is the current priority: all infrastructure must be in place before any real ingestion begins. Phase 0.5 is the calibration pilot — it is not optional, since validation thresholds are unknown until we run real documents through the system.

**Stack:**
- **Vercel** (Next.js App Router) — application layer, researcher/intern interface
- **Sanity.io** — single source of truth for all content records and binary files
- **Supabase** (PostgreSQL + pgvector) — companion semantic layer; holds document embedding vectors for Phase 2 analysis
- **Anthropic API** (Claude) — primary ingestion LLM
- **Internet Archive API** (Wayback Machine) — automatic URL archiving on submission
- **GitHub** — markdown docs, JSON exports, application code
- **Claude Design** (Anthropic Labs, April 2026) — UI prototyping and visual design; used before development begins on Phase 0-C, Phase 3, and Phase 4 to prototype interfaces and generate exhibition materials; powered by Claude Opus 4.7

---

## Phase 0 — Foundation

Everything here is a prerequisite for Phase 0.5. Deliverables: Sanity schema live, Supabase companion table created, Vercel app functional end-to-end for a single document, preprocessing scripts ready, ChatGPT validation prompt finalized.

---

### 0-A · Sanity Schema

The schema design is complete in `SANITY_SCHEMA_v1.0.md`. This step is implementation only.

**Tasks:**

1. Create Sanity project (EU/Norwegian region — non-functional requirement)
2. Implement all 12 content types from `SANITY_SCHEMA_v1.0.md`:
   - `document` (core record)
   - `testimony`
   - `lexiconEntry` (with `evidenceDossier` array)
   - `person`, `organization`, `lawPolicy`, `event`, `legalDefinition`, `exclusionClause`
   - `ingestionBatch`, `validationBatch`, `promptVersion`
3. Configure Sanity roles: researcher (full write + publish), intern (write tags + lexicon drafts, no publish)
4. Seed persons and organizations from `Entity_Registry_v1.1.md` — all ~15 persons, ~50 organizations. **This must complete before 0-E and 0-F begin** — Claude's output links actors by name, and the human review interface needs the entity graph to be available for linking candidates to existing records.
5. Seed laws and events from `Entity_Registry_v1.1.md` — all ~12 laws, ~10 events. Create corresponding `lawPolicy` and `event` records.
6. Seed `legalDefinition` records from `SOGICE_Ontology_v3.0.md` Part V — all 9 seeded definitions (LD-MT-2016 through LD-COE-2026) with `termUsed`, `targetDimensions`, `goalVerbs`, `harmThreshold`, `consentOverride` fields populated.
7. Seed `exclusionClause` records from `SOGICE_Ontology_v3.0.md` Part V — all 6 seeded clauses (EC-MT-1 through EC-UK-MOU) linked to their parent `legalDefinition` records.
8. Test round-trip: create a document record manually, verify all fields persist correctly
9. Export JSON snapshot to GitHub (`03_data/sanity_seed_YYYY-MM-DD.json`)

**Schema addition required:** Add `accessibleDefinition` (string, max 2 sentences, plain English) to the `lexiconEntry` content type in `SANITY_SCHEMA_v1.0.md` before implementing. This field powers the public-facing SOGICE Wikipedia — academic `draftDefinition` stays as the secondary "detailed definition" toggle. Researchers and interns write `accessibleDefinition` during lexicon review; it is required before a term can reach `validated` status.

**Definition of done:** A manually created document record with all classification, confidence, tier, and `ai_metadata` fields validates without errors in Sanity Studio. All entity, legalDefinition, and exclusionClause seed records exist in Sanity. `lexiconEntry` content type includes `accessibleDefinition` field.

---

### 0-B · Supabase Schema

Supabase holds the embedding vectors for Phase 2 semantic analysis. The `content_embedding` column **must be defined here, in Phase 0**, even though it stays null until Phase 2. Creating it later requires a migration on a populated table — define it now.

**Q22 RESOLVED (April 2026) — UPDATED (May 2026).** Model: `qwen3-embedding:8b` via Ollama. Dimension: **4096d** (not 2560d as originally recorded). Verified with `python -m runner embed-test`. Use `vector(4096)` throughout.

> ⚠️ **The SQL below is superseded.** The schema shown here was written before Q22 was fully resolved and predates the May 2026 Supabase Data API grant change. Use the current SQL from `runner/clients/supabase.py` (`MIGRATE_DOCUMENT_EMBEDDINGS_SQL`) and follow the setup instructions in `CODEX_HANDOFF.md` §1 instead — it includes the correct `vector(4096)` dimension, explicit `GRANT` to `service_role`, and Row Level Security policy required for new projects created after 30 May 2026 (and all projects from 30 October 2026 onwards).

**Also define cross-lingual query alignment before Phase 2 begins:** Document how semantic similarity will be interpreted across languages (e.g., does Norwegian "konverteringsterapi" cluster with Portuguese "terapia de conversão" in the vector space?). Add a brief semantic alignment note to `TAGGING_GUIDE.md` when Q22 is resolved.

**Tasks:**

1. ~~**Resolve Q22**~~ — **RESOLVED: `qwen3-embedding:8b`, 4096d** (see `CLAUDE.md` open questions)
2. Create Supabase project (EU region to match Sanity)
3. Enable `pgvector` extension: `CREATE EXTENSION IF NOT EXISTS vector;`
4. Create the document embeddings companion table — **use `CODEX_HANDOFF.md` §1 SQL, not the block below** (current schema, with grants and RLS):

```sql
-- SUPERSEDED — kept for historical reference only.
-- Dimension was wrong (2560d, should be 4096d).
-- Missing: GRANT to service_role, Row Level Security policy.
-- Missing: doc_id, doc_type, scope columns (current schema uses these instead of sanity_document_id).
-- See runner/clients/supabase.py MIGRATE_DOCUMENT_EMBEDDINGS_SQL for the authoritative version.
CREATE TABLE document_embeddings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanity_document_id text NOT NULL UNIQUE,
  content_embedding  vector(2560),        -- WRONG: should be vector(4096)
  language           text,
  tier               text,
  validation_status  text,
  embedded_at        timestamptz,
  embedding_model    text
);

-- INDEX DEFERRED TO PHASE 2:
-- Both ivfflat and hnsw have a 2000-dimension limit in current Supabase pgvector.
-- 4096d exceeds this. No index needed at pilot scale (sequential scan is fast enough
-- for <1000 rows). Add index in Phase 2 once Supabase upgrades pgvector.
```

5. Add Supabase connection string to Vercel environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`)
6. Wire Sanity document creation (0-D) to also insert a row in `document_embeddings` with `sanity_document_id` set and `content_embedding` null
7. Test: submit a document → verify a corresponding row appears in `document_embeddings` with null vector

**Note on schema design:** The companion table carries `language`, `tier`, and `validation_status` so Phase 2 vector similarity queries can filter without joining back to Sanity. If a leaner `(document_id, vector)` table is preferred, Phase 2 queries will need a Sanity fetch after each vector search — adjust accordingly.

**Definition of done:** Q22 decision documented; `document_embeddings` table exists with correct-dimension vector column; every new document ingested via 0-D creates a corresponding null-vector row.

---

### 0-C · Vercel App — Skeleton

Set up the Next.js project, Sanity client, and routing before building individual features.

**Pre-build prototyping (recommended before coding):** Use [Claude Design](https://claude.ai) to generate UI mockups for the core researcher screens before any development begins — specifically `/review/[id]` (the disagreements panel and candidate term workflow), `/review/queue` (filter/sort layout), and `/lexicon/[id]` (term editor + evidence dossier view). Claude Design can ingest this repo's existing markdown docs to establish a consistent visual language. Resolve layout questions at prototype stage to avoid rework during development. Export prototypes as URL or PDF and attach to the relevant GitHub issue.

**Tasks:**

1. Initialize Next.js app on Vercel (App Router)
2. Install and configure `@sanity/client` with read/write tokens
3. Install Supabase JS client (`@supabase/supabase-js`)
4. Configure environment variables:
   - `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_WRITE_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY` (for validation batches)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
5. Set up authentication — two roles: **Researcher (Editor)** and **Intern (Reviewer)**. Intern access via Vercel login only — no API key exposure, no Sanity write token in client bundle.
   - **Enforce the publish gate at the Sanity schema layer**, not only in Vercel middleware. Sanity custom validation should reject any write that sets `workflowStatus: published` or `workflowStatus: verified` from an intern token — return a validation error so middleware bypass cannot accidentally publish. Vercel middleware enforces the same rule as a UI-layer guard; Sanity is the authoritative enforcement layer.
   - **All LLM API calls (Anthropic, OpenAI) go through Vercel `/api/*` routes only.** Keys live exclusively in Vercel environment variables. No researcher or intern should hold or need API keys locally.
6. Create route structure:
   - `/submit` — document submission
   - `/review/[id]` — human review interface
   - `/review/queue` — batch queue
   - `/lexicon` — lexicon browser
   - `/lexicon/[id]` — term editor
   - `/lexicon/validate` — Track B lexicon validation
   - `/publish` — tier/publication manager
   - `/export` — prompt export, batch config, validation import
7. Create shared Sanity GROQ query library (reusable across routes)

**Definition of done:** App deploys to Vercel, authenticated users can reach all routes, Sanity and Supabase connections both verified.

---

### 0-D · Document Submission Interface (`/submit`)

The entry point for every document in the pipeline.

**Tasks:**

1. URL input field + file upload (PDF, HTML, plain text)
2. **Automatic Wayback Machine check on URL submission:**
   - Query `https://archive.org/wayback/available?url=<url>`
   - If exists: store URL in `meta.archiveUrl`
   - If not: POST to `https://web.archive.org/save/<url>`, poll for completion, store result
   - Store HTML snapshot as Sanity file asset
   - **Failure handling:** If Wayback Machine API is unreachable or returns error: log the failure to the document record, store `sourceUrl` only, set a `retryArchive: true` flag for later retry. Never block document submission on archive failure.
   - **Tier 3 fallback — Playwright render:** If Wayback Machine save fails after 3 attempts, use Playwright/Puppeteer to render the live URL (handles JavaScript-heavy sites and dynamic content that raw HTML download misses); capture a full-page PDF/screenshot; upload to Sanity file asset; set `snapshotSource: "playwright_render"` and `archival_failure: true` flags. This is the final fallback — if Playwright also fails (site gone entirely), the document is stored with `sourceUrl` only and `retryArchive: true`.
   - **Anthropic API retry logic (applies to 0-E):** 3 retries with exponential backoff (2s / 4s / 8s) on rate limit (429) or transient server errors (5xx). After 3 failures, mark document `preprocessing_quality: blocked`, log error with response code, notify researcher.
3. Document type selector → auto-assigns default tier per PRD §3.2 table
4. Manual tier override with reason field (logged to `tierChangeLog`)
5. Ingestion batch selector (create new or add to existing `ingestionBatch` record)
6. Submit → triggers Claude ingestion (0-E)
7. Display: submission confirmation, batch assignment, archive URL

**Definition of done:** Submitting a URL archives it, assigns a tier, and creates a Sanity document record at `workflowStatus: unverified` plus a null-vector row in Supabase `document_embeddings`.

---

### 0-E · Claude Ingestion API

Server-side route that calls the Anthropic API and writes the compact payload to Sanity.

**Tasks:**

1. Create `/api/ingest` POST route
2. Implement prompt builder (two-part architecture from `Claude_Ingestion_Prompt.md`):
   - **Part I (static — prompt-cached):** Full system prompt: CLASSIFY + DISCOVER jobs, absolute rules, complete controlled vocabulary (type/format/evidence/scope/tactic/practice/function/harm/migration/flags/landmark/narrative register), landmark events list. This portion is cached by Anthropic and not re-tokenized on repeat calls.
   - **Part II (dynamic — appended per call):** Runtime lexicon injection: query `*[_type == "lexiconEntry" && status in ["draft","validated"]]{ term, proposedCluster, function }` from Sanity and append results to the term vocabulary before every API call.
   - User message: preprocessed document text + document context (tier, batch, language hint if known)
   - **Blocker:** 0-G preprocessing scripts are a hard blocker for file upload submissions. URL submissions that return extractable HTML can proceed without preprocessing. Do not open file upload submission to interns until 0-G is complete.
3. Call `claude-sonnet-4-6` (update to current Anthropic release as models advance; check Anthropic release notes at each major pipeline version); use `max_tokens` to cap output
4. Parse response against the compact classification payload schema (PRD §11.3):
   ```
   type · format · evidence · country · tactic · actor · network · practice
   term · harm · migration · function · scope · landmark · narrative_register
   document_date · summary · priority · testimony_flag · needs_review
   confidence · field_confidence · candidate_terms · suggested_actors
   suggested_networks · extractable_assets
   ```
5. Wrap payload in full Sanity document record (add `_id`, `_type`, timestamps, `ai_metadata`, `workflowStatus: unverified`)
6. Write to Sanity; sync `language`, `tier`, `validation_status` to the Supabase `document_embeddings` row
7. Truncation logic: documents over 24k chars → 16k head + 6k tail (PRD §11.2)
8. Record `input_length_chars` and `truncated` boolean in `ai_metadata`
9. Store `prompt_version` from active `promptVersion` Sanity record
10. Error handling: API failure → mark `preprocessing_quality: blocked`, log error, do not write partial record

**Definition of done:** Submitting a test document produces a fully populated Sanity record with all classification fields, confidence scores, and `ai_metadata` filled; Supabase row has correct metadata.

---

### 0-F · Human Review Interface (`/review/[id]`)

The core researcher/intern workflow screen. PRD §10.

**Tasks:**

1. Display document: title, summary, source URL, Wayback link, tier badge, `workflowStatus`
2. Editable classification panel:
   - All tag arrays (type, format, evidence, country, tactic, term, practice, harm, etc.)
   - Scope selector (Core / Contextual / Reference)
   - Landmark tags
   - Flags
3. Document date editor (year/month/day + `date_confidence`)
4. Confidence display: overall score + status badge + field-level breakdown; highlight low-confidence fields in amber/red to direct reviewer attention
5. Candidate terms panel:
   - Show each term with draft definition and context quote
   - Approve → creates `lexiconEntry` at `status: draft`, adds term to system prompt vocabulary, marks `approved: true` on the candidate record
   - Dismiss → sets `new_status: discarded`
6. Suggested actors/networks panel: approve → creates entity record; dismiss → skip
7. Extractable assets panel: review list, approve/reject individual assets
8. Tier control: display current tier, override button with reason field (writes to `tierChangeLog`)
9. Testimony flag alert: if `testimony_flag: true`, surface consent review prompt before any save
10. `ai_metadata` display panel (models used, preprocessing quality, ontology version, prompt version)
11. Save → writes all changes to Sanity, sets `human_review.changes_made`, `human_review.reviewed_by`, `human_review.reviewed_at`
12. Advance to `verified` button — disabled until required fields (type, format, evidence, scope, tier) are confirmed

**Definition of done:** Researcher can review Claude's output, approve/reject all candidate items, and advance a document to `verified`.

---

### 0-G · Preprocessing Scripts

Local tools run before documents enter the Vercel app. These are CLI scripts, not Vercel routes.

**Tasks:**

1. **PDF/HTML → clean text:** Evaluate Unstructured.io vs. Docling; implement chosen tool as CLI script
   - Output: clean text file + `preprocessing_quality` rating
   - Chunking for 80+ page documents (chunk boundary logic must not split mid-sentence)
2. **Image OCR pipeline:** Many SOGICE documents embed screenshots, logos, and diagrams that contain critical lexicon terms in visual form with no machine-readable text.
   - Evaluate `Tesseract` (handles all six corpus languages natively, open source) vs. `PaddleOCR` (stronger on non-Latin scripts)
   - Implement as CLI script: scan extracted images from PDF/HTML → run OCR → output text
   - Store OCR output in document record as `content.extractedFromImages` array (one entry per image, with `imageRef`, `ocrText`, `ocrConfidence`, `language`)
   - Feed `ocrText` into the Claude ingestion prompt alongside main document text (prepended with `[IMAGE TEXT:]` label)
   - Language hint is required for best results — pass document's known language to OCR engine
3. **Video subtitle extraction:** `yt-dlp` wrapper script
   - Fallback to Whisper if no subtitles available
   - Strip SRT/VTT timestamps, output clean transcript
3. **Quality rating logic:** implement the four-state system (`high / medium / low / blocked`) based on char count, OCR error heuristics, and structure detection
4. Document usage in `TAGGING_GUIDE.md` (add preprocessing section)

**Definition of done:** A PDF and a YouTube video can each be converted to clean text with a quality rating before submission to the Vercel app.

---

### 0-H · Model-Agnostic Prompt Export (`/export`)

PRD §9. Allows any LLM to be used when the Anthropic API is unavailable or as a methodological cross-check.

**Tasks:**

1. Export builder: select document(s) → generate JSON export package and Markdown export package (PRD §9.1 formats)
2. JSON export: `export_type`, `ontology_version`, `prompt_version`, `system_prompt`, `user_message`, `expected_output_schema`, `instructions`
3. Markdown export: formatted for direct pasting into any chat UI (ChatGPT, Gemini, Claude web, etc.)
4. Import back: `/api/import-external` route
   - Accepts pasted or uploaded LLM JSON response
   - Validates against expected output schema
   - On success: writes to Sanity as primary classification, records external model name in `ai_metadata.primary_model` and `ai_metadata.primary_provider`
   - On failure: displays field-by-field schema errors for manual correction

**Definition of done:** A document can be exported as Markdown, processed manually in ChatGPT, and the output pasted back and imported successfully with correct `ai_metadata`.

---

### 0-J · Claude Ingestion System Prompt (Q17-adjacent)

The Claude ingestion prompt is the system prompt sent to Claude on every document. It defines CLASSIFY + DISCOVER jobs, the full controlled vocabulary, absolute rules, and the output JSON schema. This prompt is version-controlled in Sanity as a `promptVersion` record.

**File:** `02_working_tools/Claude_Ingestion_Prompt.md` — **already written.**

**Tasks:**

1. Review `Claude_Ingestion_Prompt.md` against a small set of test documents before the pilot — verify the vocabulary is complete and the output schema matches the Sanity `document` schema
2. Create the first `promptVersion` record in Sanity with `versionId: "ingestion-v3.1"`, `type: "ingestion"`, `active: true`
3. Implement the runtime lexicon injection in the Vercel app (0-E task 2): query `*[_type == "lexiconEntry" && status in ["draft","validated"]]{ term, proposedCluster, function }` and append results to the term vocabulary section of the system prompt before every API call
4. Verify prompt caching is active on the static portion of the system prompt (Anthropic API feature — saves cost when the vocabulary-only portion is unchanged between calls)
5. After pilot batch, revise prompt based on observed output quality and create `ingestion-v3.2` if changes are needed

**Definition of done:** `promptVersion` record `ingestion-v3.1` exists in Sanity with `active: true`; runtime lexicon injection is tested and confirmed working on at least one live document.

---

### 0-I · Validation Prompt (Q17)

**This is a Phase 0 deliverable per PRD §26.** The entire validation batch system in Phase 1 depends on a finalized, versioned validation prompt. Do not begin Phase 1 validation batches until this is locked.

**File:** `02_working_tools/ChatGPT Validation Prompt.md` — **already rewritten for v3.1.**

**Tasks:**

1. Review the rewritten prompt against the PRD §6.6 requirements — verify all output fields map correctly to the Sanity `document` schema and the Vercel app's disagreement panel
2. Test manually: take 2–3 documents processed in Phase 0, run Claude's output + document text through the validation prompt in ChatGPT (or another LLM), verify the JSON response structure is parseable
3. Verify the risk-level logic (`low` → `ready`, `medium` → `needs_review`, `high` → `high_risk`) matches how the Vercel app will set document status
4. Create a `promptVersion` record in Sanity with `versionId: "validation-v3.1"`, `type: "validation"`, `active: true`
5. Implement runtime injection in the Vercel app: before sending to validation LLM, inject the full vocabulary + current lexicon terms + Claude's output into the user message template

**Definition of done:** `promptVersion` record `validation-v3.1` exists in Sanity with `active: true`; prompt has produced a parseable validation response on at least 2 test documents.

---

### 0-K · Testimony Consent Workflow

Testimony is a sensitive content type. Before any testimony document enters the pipeline, the consent workflow must be operational. This is a Phase 0 deliverable — do not ingest any testimony documents until this task is complete.

**Tasks:**

1. When a document is flagged `testimony_flag: true` (by Claude or manually), automatically create a linked `testimony` record with `consentStatus: pending` and `publicDisplay: false`
2. Enforce `publicDisplay: false` as the default for all testimony records. Add **partial redaction** support alongside the binary flag: testimony records should carry a `publicExcerpt` field (researcher-written, max 200 words) that can be shown publicly even when the full testimony is withheld. This avoids the all-or-nothing problem — a researcher can show that testimony exists and what it broadly concerns without exposing identifying information. The publication manager must block any testimony from public display unless either `publicDisplay: true` (shows full text) or `publicExcerpt` is populated and `consentStatus: confirmed`.
3. Implement testimony review step in `/review/[id]`: if `testimony_flag: true`, surface a consent status panel before any save action can proceed — researcher must set `consentStatus` explicitly (`confirmed / pending / refused`)
4. For `consentStatus: refused` testimonies: mark document `workflowStatus: suppressed`, exclude from all exports and public displays. Suppressed documents remain in Sanity for research audit purposes but never appear in the public archive
5. Implement testimony contact page (Phase 3 task 6 is the public-facing page; this task covers the internal pipeline side): researcher notification on contact form submission; form data written to a `testimonyRemovalRequest` Sanity record; researcher can action from `/review/[id]`
6. Document the full consent protocol in `TAGGING_GUIDE.md` — what consent means, how it is recorded, how removal requests are handled

**Definition of done:** A testimony document can be ingested, linked to a `testimony` record with `consentStatus: pending`, and the system blocks publication until consent is confirmed. Removal request flow produces a researcher notification.

---

## Phase 0.5 — Pilot Batch (Calibration)

**10–20 representative documents.** This phase is not about ingesting data — it is about tuning the system before committing to the full pipeline. None of the Phase 1 thresholds are fixed until this phase completes.

**Selection criteria for pilot documents:**
- At least 2 document types from each tier (Tier 1: social media; Tier 2: org website, NGO report; Tier 3: government report, legislative submission)
- At least one document in each corpus language: Norwegian, Portuguese, Italian, French, German, English — all six must be represented before the pilot is considered valid
- At least 1 testimony document
- At least 1 landmark document

**Tasks:**

1. Run all 10–20 documents through the full pipeline (submit → preprocess → Claude → human review)
2. **Confidence threshold calibration:**
   - Record Claude's `overall_score` for each document
   - Compare to actual classification quality (researcher judgment)
   - **Starting baseline (pilot starting point — revise from evidence):** High ≥ 0.85 / Medium 0.70–0.84 / Low < 0.70
   - Set final thresholds for High / Medium / Low bands from pilot data
   - Write calibrated values to system config and `TAGGING_GUIDE.md`
3. **Validation trigger calibration and phasing:**
   - **Phase 0 (active now):** `mandatory_threshold` only — auto-trigger when `overall_score` < Low threshold
   - **Phase 0.5 (this phase):** Add `low_confidence` (field-level), `legal_flag`, `testimony_flag`, `tier_requirement` (Tier 3 mandatory)
   - **Phase 1 (full deployment):** Add `manual_researcher` and `random_audit`; set `random_audit_percentage`
   - Test mandatory validation trigger on 2–3 low-confidence documents using the finalized validation prompt (0-I)
   - Set `recommended_percentage` for medium-confidence batch composition
   - Set `random_audit_percentage` for high-confidence documents
4. **Lexicon validation test (Track B — begins here):**
   - Track B (lexicon evidence review) begins in Phase 0.5 as a test run. Full Track B deployment is in Phase 1.
   - Approve at least 5 candidate terms as `draft` during pilot
   - Run a lexicon validation pass on those terms via `/lexicon/validate`
   - Verify recommendation output format and researcher resolution workflow
   - **Track A (document classification validation) begins in Phase 1** — requires 0-I prompt locked, validation batch system built (Phase 1 task 1), and sufficient corpus for meaningful batch composition. Do not run Track A during Phase 0.5.
5. **Model-agnostic export test:**
   - Export at least 1 document prompt and run through a non-Claude model
   - Import result back, verify schema validation works
6. **Preprocessing quality calibration:**
   - Test all three preprocessing paths (PDF, HTML, video)
   - Record quality ratings, adjust heuristics if needed
7. Document all outcomes: calibrated thresholds, prompt adjustments, observed edge cases

**Definition of done:** Confidence thresholds are set and written to config, batch composition defaults are set, lexicon validation workflow tested at least once, validation prompt tested with real output, all pilot documents at `verified` status.

---

## Phase 1 — Ingestion

Full production pipeline active. Corpus grows from pilot seed.

**Tasks:**

1. **Validation batch system** (tab within `/export`):
   - Batch builder: compose batches from mandatory + recommended + random audit documents (PRD §6.5)
   - Batch configuration file per PRD §6.5 JSON format
   - Export validation prompt package for the batch (uses locked prompt from 0-I)
   - Import validation results (Track A: document classification)
   - Disagreement flagging: field-by-field diff between Claude and validation LLM output
   - Post-validation human review panel on `/review/[id]` (disagreements tab)
2. **Validation status tracking** on document records (`not_validated / queued / validated`); sync status to Supabase `document_embeddings.validation_status`
3. **Review queue** (`/review/queue`):
   - Filter by `workflowStatus`, `tier`, `confidence.status`, `validation.status`
   - Sort by priority score
   - Batch-approve high-confidence, no-disagreement documents
4. **Lexicon Track B** (`/lexicon/validate`):
   - Select scope (all drafts / by cluster / by frequency threshold / specific term ID)
   - Generate validation prompt with full evidence dossiers
   - Import validation LLM recommendations
   - Researcher resolution: confirm / revise definition / merge / reject
5. **JSON export to GitHub** — per-batch export and daily automated export of all Sanity records (excluding binary file assets)
6. **Zotero export** — generate Zotero-compatible JSON for all `verified` documents. Note: `zotero` field exists in the Sanity `document` schema (retained from earlier PRD versions) but Zotero API integration is deferred as optional. This task covers JSON export only; live Zotero sync is not a Phase 1 requirement.
7. **Intern access verification** — end-to-end access test before any intern is given credentials:
   - Intern can log in to Vercel app (NextAuth / Clerk)
   - Intern can write classification tags and draft lexicon terms
   - Intern cannot publish documents or change `workflowStatus` to `verified` or `published`
   - Intern cannot see or access API keys (no `.env` exposure, no Sanity write token in client bundle)
   - Intern cannot access testimony records with `consentStatus: pending` or `refused`
   - Document pass/fail checklist in `TAGGING_GUIDE.md`

**Definition of done:** At least one full validation batch cycle completed (batch built → exported → run → results imported → disagreements resolved → documents advanced to `verified`); at least 10 lexicon terms at `validated` status.

---

## Phase 2 — Analysis

Corpus-level analysis tools. Runs in parallel with continued ingestion.

**Runtime note:** Tasks 1–4 run in a local Python environment (Jupyter or script), not as Vercel routes. They consume the Sanity JSON exports from Phase 1. Tasks 6–9 run against Supabase.

**Tasks:**

1. **BERTopic topic modeling** — Python (`bertopic` library); run against `content.summary` + `extracted_text` fields from Sanity JSON exports; surface topic clusters for researcher review; export cluster assignments as JSON
2. **Network graph** — entity co-occurrence graph (organizations + persons + laws linked per document); build as Python NetworkX graph, export as `nodes.json` / `edges.json` for D3/Three.js visualization in Phase 3
3. **Semantic map** — term cluster visualization from lexicon evidence dossiers; shows which terms co-occur across documents
4. **Lexicon reanalysis for drift** (PRD §13.5) — run Track B validation on already-`validated` terms to detect definition drift as corpus grows; compare stance distribution at current corpus size vs. original validation batch
5. **Cross-language term analysis** — identify multilingual term variants in evidence dossiers; export frequency table per language
6. **pgvector activation:**
   - Q22 should have been decided before Phase 0-B — verify the column dimension in `document_embeddings` matches the chosen model before running any embeddings. If Q22 was not resolved and the column was created with the wrong dimension, run `ALTER TABLE document_embeddings ALTER COLUMN content_embedding TYPE vector(768)` (or 1536) — this requires re-creating the index and is safe on a table with all-null vectors, but must happen before any embeddings are written.
   - Verify `content_embedding` column exists (was created in Phase 0-B) and dimension matches chosen model
7. **Batch embedding pipeline:**
   - Implement as local Python script iterating over all Tier 2/3 `validated` documents
   - Source text: `content.summary` concatenated with `extracted_text` (truncated to model's token limit)
   - Write vectors to Supabase `document_embeddings.content_embedding`; record `embedded_at` and `embedding_model`
   - If Option A (OpenAI): batch calls, respect rate limits
   - If Option B (local): run inference locally, no network dependency
8. **Semantic clustering for lexicon drift detection:**
   - Use pgvector cosine similarity queries to cluster documents by embedding proximity
   - Surface document clusters that span multiple lexicon terms — flag as merge/drift candidates for Track B
   - Export cluster report as annotated JSON for researcher review
9. **Cross-language pattern matching:**
   - Query embedding similarity across Norwegian, Portuguese, Italian, French, and German documents (filter by `document_embeddings.language`)
   - Identify semantically close documents across languages — surface as potential transnational network evidence
   - Export as annotated JSON

**Prerequisite for tasks 6–9:** `content_embedding` column must exist in Supabase (Phase 0-B). Confirm vector dimensions match the chosen model (1536 for OpenAI, 768 for multilingual-mpnet) before running any embeddings — dimension mismatch requires a column migration.

**Definition of done:** BERTopic clusters exported, network graph JSON ready for Phase 3 visualization, at least one cross-language similarity report produced, all Tier 2/3 validated documents embedded in Supabase.

---

## Phase 3 — Public Infrastructure

Public archive and SOGICE Wikipedia. Only `published` (Tier 3) records visible.

**Pre-build design (recommended):** Before development begins on Phase 3, use [Claude Design](https://claude.ai) to prototype the public archive browse views and a sample SOGICE Wikipedia term page. Claude Design can read the repo codebase to establish the design system (colors, typography) and export interactive URL prototypes for researcher sign-off before committing to frontend implementation.

**Tasks:**

1. **Public archive frontend** (Next.js, reads from Sanity via GROQ, `workflowStatus: published` filter only):
   - Browse by: actor, network, country, tactic, term, cluster, document type, year
   - Individual document pages: summary, tags, entity links, outbound URLs, Wayback link, tier badge
   - AI process metadata panel on every record: models used, agreement status, human review status, confidence, tier, ontology version (PRD §4.3)
2. **SOGICE Wikipedia** (lexicon frontend, `validated` terms only):
   - Term pages: `accessibleDefinition` shown first (plain English, 1–2 sentences); "Read detailed academic definition" toggle reveals `draftDefinition`; cluster, function, related terms (clickable internal links), multilingual variants with attestation tiers; full evidence dossier (Tier 3 document excerpts only per PRD §13.6) **with stance color-coding** — the `stanceProfile` field from each evidence dossier entry drives a visual indicator (e.g., red = promotional/pro-SOGICE, green = critical/advocacy, grey = neutral/reporting) so users immediately know whether a source is promoting or condemning the practice; actors who use the term, legal instruments, timeline of use
   - **Content warnings:** All pages that contain testimony excerpts, harm descriptions, or promotional SOGICE material must display a content warning before the content loads. Warning is dismissible per session. Required before any public launch.
   - Search across all term pages
3. **Entity pages:** profile page per organization, person, and law — listing all connected documents and terms
4. **Network visualization:** interactive graph built from Phase 2 network graph JSON (D3 or Three.js)
5. **Publication manager** (`/publish`): researcher sets `workflowStatus: published` on Tier 3 documents; system blocks publication if any draft lexicon terms used in the document have not yet reached `validated` status (PRD §13.7)
6. **Testimony contact page:** form for testimony subjects to request removal; triggers researcher notification (PRD §15)
7. **CDN for image serving:** When the public archive goes live, serve document images and Playwright-rendered snapshots through a CDN (Cloudinary or Imgix) rather than direct Sanity CDN requests. Configure at Phase 3 build start to avoid bandwidth cost spikes once the archive is public.

---

## Phase 4 — Experience Layer

Creative modules drawing from the archive and lexicon.

**Claude Design for Phase 4 (strongly recommended):** Claude Design is well-suited for this phase's visual and interactive work:
- **JUST CHANGE™ game UI:** Generate interface concepts for individual games before implementing in HTML. Especially useful for establishing the crayon-prophet aesthetic as a reusable visual language across the 19 games — export the design system once, reference it in every game.
- **i-Doc shell:** Use Claude Design to prototype the retro OS navigation metaphor and documentary room layouts before Three.js/WebXR development. Resolving spatial layout at prototype stage avoids expensive rework in 3D.
- **Exhibition materials (June + October 2026):** Generate pitch decks, one-pagers, and visual documentation for CDN Pride Bergen and the full October exhibition. Export as PDF or PPTX. Claude Design can produce these faster than manual slide design.

**Tasks (priority order):**

1. **JUST CHANGE™** — active development; single HTML file; `g.conv` (0→1) drives all state; crayon-prophet aesthetic; you always lose
   - **June 2026 scope (CDN Pride Bergen WIP):** 5 games playable end-to-end (ZAP!, Cost of Amen, Overworld v6, rhythm game, Turn For Me); archive feeds at least one game's content from Sanity
   - **October 2026 scope (full exhibition):** all 19 games complete; full `g.conv` arc; all archive/lexicon connections wired
   - **Define the Sanity ↔ game data contract in Phase 1** (do not defer to Phase 4): write the GROQ queries that will feed each archive-connected game before development begins. Example: Overworld v6 fetches `*[_type == "testimony" && consentStatus == "confirmed" && publicDisplay == true]{ publicExcerpt }` to serve as narrative text. Define which games pull testimony, which pull lexicon terms, which pull tactic tags — document in a `GAME_DATA_CONTRACTS.md` file.
   - **Failure-state Wikipedia link:** every game's failure/end state (the player always loses) must surface a direct link to the relevant SOGICE Wikipedia term pages — the link is the pedagogical payload. This must be wired before any game is considered complete.
2. **i-Doc shell** — retro OS navigation metaphor; sequential documentary rooms + spatial archive; Three.js + WebXR; shadow play / light box aesthetic (PRD §19)
   - Integration method with JUST CHANGE™ is open (Q14) — resolve before October build begins
3. **Remaining experience modules** — SOGICE WebSearch Simulation, Retro SOGICE Library, Video Library, Historical Visualizer, Trans Jesus Ministries Live, Courses & Ministries Tracker, PC Simulator, SOGICEfy, HOPE TV — all read from Sanity archive via GROQ

---

## Dependency Map

```
0-A Sanity schema + entity seeding (steps 4–7) ─────────────────┐
  │  [BLOCKER: entity seeding must complete before 0-E and 0-F]  │
0-B Supabase schema (vector column null until Phase 2) ──────────┤
0-C Vercel skeleton ─────────────────────────────────────────────┤
  │                                                               │
  ├── 0-D Document submission                                     │
  │     └── 0-E Claude ingestion (URL submissions only until 0-G complete)
  │           [BLOCKER: 0-A entity seeding complete]             │
  │           [BLOCKER: 0-J prompt locked]                       │
  │           └── 0-F Human review interface                     │
  │                 [BLOCKER: 0-A entity seeding complete]       │
  │                 └──── 0-K Testimony consent workflow          │
  │                           └── Phase 0.5 Pilot ───────────────┤
  │                                 [requires 0-I locked]        │
  │                                 [requires 0-J locked]        │
  │                                 └── Phase 1 Ingestion        │
  │                                       ├─ Phase 2 Analysis ───┘
  │                                       │    (pgvector tasks 6–9
  │                                       │     gate on Q22 decision)
  │                                       └─ Phase 3 Public archive
  │                                             └── Phase 4 Experience
  ├── 0-H Model-agnostic export (independent, can run parallel)
  └── Phase 1 Validation batch system (Track A — requires 0-I locked)

0-G Preprocessing scripts ── independent; BLOCKER for file upload submissions (0-E)
0-I Validation prompt ── must be locked before Phase 0.5 and Phase 1 Track A
0-J Ingestion prompt ── must be locked before Phase 0.5 pilot begins

Q22 decision (embedding model) ── BLOCKER for 0-B (must decide before creating the vector column)
  AND gates Phase 2 tasks 6–9 (must match column dimension before any embeddings run)
  Deadline: before Phase 0-B starts — no later than start of build
  Default if undecided: Option B (paraphrase-multilingual-mpnet-base-v2, 768d, local)
  → if decided after 0-B already ran with wrong dimension: ALTER COLUMN migration required
```

---

## Open Questions — Implementation Blocking

| # | Question | Blocks | Status |
|---|---|---|---|
| 17 | ChatGPT validation prompt — final version | Phase 1 Track A validation | Draft complete (`validation-v3.1`) — test and version in Sanity (task 0-I) |
| 19 | Confidence thresholds for validation bands | Phase 1 batch composition | Calibrated in Phase 0.5 |
| 20 | Random audit percentage | Phase 1 batch defaults | Calibrated in Phase 0.5 |
| 21 | Batch composition defaults | Phase 1 | Calibrated in Phase 0.5 |
| ~~22~~ | ~~Embedding model dimension~~ | ~~0-B~~ | **RESOLVED April 2026: `qwen3-embedding:4b` via Ollama, 2560d. Use `vector(2560)`.** |
| 14 | JUST CHANGE™ i-Doc integration method | Phase 4 October build | Open |
| 18 | Testimony removal protocol | Phase 3 publication | Contact page exists; formal protocol TBD |

---

## June 2026 Checkpoint (CDN Pride Bergen)

**Required:**
- Phase 0 fully complete (all tasks 0-A through 0-K)
- Phase 0.5 complete (thresholds calibrated)
- Phase 1 active (pipeline running, corpus growing)
- JUST CHANGE™: 5 games playable, at least one archive-connected

**Not required:**
- Public archive live (Phase 3)
- SOGICE Wikipedia (Phase 3)
- WebXR / i-Doc (Phase 4)
- Phase 2 analysis outputs

---

## October 2026 Checkpoint (Full Exhibition)

**Required:**
- Phase 1 ingestion at significant corpus size; lexicon substantially populated with `validated` terms
- Phase 2 analysis outputs complete (BERTopic clusters, network graph, embedding layer)
- Phase 3 fully live: public archive + SOGICE Wikipedia + entity pages + network visualization
- Phase 4: JUST CHANGE™ complete (19 games); i-Doc shell; at least 3–4 additional experience modules live

---

*Companion documents: PRD_v3.1.md · SANITY_SCHEMA_v1.0.md · SOGICE_Ontology_v3.0.md · SOGICE_Lexicon_v2.0.md · TAGGING_GUIDE.md*
