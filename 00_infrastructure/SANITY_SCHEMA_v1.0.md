# SurvivingSOGICE — Sanity.io Schema v1.0

**Project:** SurvivingSOGICE  
**Document status:** Phase 0 deliverable  
**Last updated:** April 2026  
**Companion documents:** PRD_v3.1.md · SOGICE_Ontology_v3.0.md · SOGICE_Lexicon_v2.0.md

---

## Overview

This document defines all Sanity content types for the SurvivingSOGICE platform. These schemas are the authoritative data model; all code (Vercel app, public archive, lexicon frontend) reads from and writes to this structure.

Sanity is the **single source of truth**. Binary files (PDFs, HTML snapshots, video) are stored as Sanity file assets. JSON exports to GitHub are derived from this schema.

**Naming convention:** All Sanity field names use camelCase (Sanity standard). The JSON export and API layer translates to snake_case where needed. Do not mix conventions within this file.

---

## Content Types

1. [document](#1-document)
2. [testimony](#2-testimony)
3. [lexiconEntry](#3-lexiconentry)
4. [person](#4-person)
5. [organization](#5-organization)
6. [lawPolicy](#6-lawpolicy)
7. [event](#7-event)
8. [legalDefinition](#8-legaldefinition)
9. [exclusionClause](#9-exclusionclause)
10. [ingestionBatch](#10-ingestionbatch)
11. [validationBatch](#11-validationbatch)
12. [promptVersion](#12-promptversion)

---

## 1. document

Core record type. One Sanity document per source document in the corpus.

```javascript
// schemas/document.js
export default {
  name: 'document',
  title: 'Document',
  type: 'document',
  fields: [

    // ── Workflow ────────────────────────────────────────────────
    {
      name: 'workflowStatus',
      title: 'Workflow Status',
      type: 'string',
      options: { list: ['unverified', 'in_progress', 'verified', 'published', 'discarded'] },
      initialValue: 'unverified',
    },
    {
      name: 'tier',
      title: 'Trust Tier',
      type: 'string',
      options: { list: ['1', '2', '3'] },
    },
    {
      name: 'tierAssignedBy',
      title: 'Tier Assigned By',
      type: 'string',
      options: { list: ['auto', 'researcher'] },
      initialValue: 'auto',
    },
    {
      name: 'tierChangeLog',
      title: 'Tier Change Log',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'from', type: 'string' },
          { name: 'to', type: 'string' },
          { name: 'changedAt', type: 'datetime' },
          { name: 'reason', type: 'string' },
        ]
      }],
    },

    // ── Meta / Provenance ───────────────────────────────────────
    {
      name: 'meta',
      title: 'Meta',
      type: 'object',
      fields: [
        { name: 'sourceUrl', title: 'Source URL', type: 'url' },
        { name: 'archiveUrl', title: 'Wayback Archive URL', type: 'url' },
        { name: 'fileRef', title: 'File Asset', type: 'file' },
        { name: 'ingestedAt', title: 'Ingested At', type: 'datetime' },
        {
          name: 'ingestionBatch',
          title: 'Ingestion Batch',
          type: 'reference',
          to: [{ type: 'ingestionBatch' }],
        },
        {
          name: 'preprocessingTool',
          title: 'Preprocessing Tool',
          type: 'string',
          options: { list: ['unstructured', 'docling', 'yt-dlp', 'whisper', 'manual', 'none'] },
        },
        {
          name: 'preprocessingQuality',
          title: 'Preprocessing Quality',
          type: 'string',
          options: { list: ['high', 'medium', 'low', 'blocked'] },
        },
      ],
    },
    {
      name: 'provenance',
      title: 'Provenance',
      type: 'object',
      fields: [
        { name: 'originalUrl', type: 'url' },
        { name: 'accessedVia', type: 'string' },
        { name: 'waybackUrl', type: 'url' },
        { name: 'htmlSnapshotRef', type: 'file' },
        { name: 'chainNotes', type: 'text', rows: 2 },
      ],
    },

    // ── Classification ──────────────────────────────────────────
    {
      name: 'classification',
      title: 'Classification',
      type: 'object',
      fields: [
        { name: 'type', type: 'string' },
        { name: 'format', type: 'string' },
        { name: 'evidence', type: 'array', of: [{ type: 'string' }] },
        { name: 'scope', type: 'string', options: { list: ['Core', 'Contextual', 'Reference'] } },
        { name: 'country', type: 'array', of: [{ type: 'string' }] },
        { name: 'tactic', type: 'array', of: [{ type: 'string' }] },
        { name: 'actor', type: 'array', of: [{ type: 'string' }] },
        { name: 'network', type: 'array', of: [{ type: 'string' }] },
        { name: 'practice', type: 'array', of: [{ type: 'string' }] },
        { name: 'term', type: 'array', of: [{ type: 'string' }] },
        { name: 'harm', type: 'array', of: [{ type: 'string' }] },
        { name: 'migration', type: 'array', of: [{ type: 'string' }] },
        { name: 'function', type: 'array', of: [{ type: 'string' }] },
        { name: 'landmark', type: 'array', of: [{ type: 'string' }] },
        { name: 'flags', type: 'array', of: [{ type: 'string' }] },
        { name: 'narrativeRegister', type: 'string' },
      ],
    },

    // ── Confidence ──────────────────────────────────────────────
    {
      name: 'confidence',
      title: 'Confidence',
      type: 'object',
      fields: [
        { name: 'overallScore', title: 'Overall Score (0.0–1.0)', type: 'number' },
        {
          name: 'status',
          title: 'Status',
          type: 'string',
          options: { list: ['high', 'medium', 'low'] },
        },
        { name: 'reasons', title: 'Reasons', type: 'array', of: [{ type: 'string' }] },
        {
          name: 'signals',
          title: 'Signals',
          type: 'object',
          fields: [
            {
              name: 'textQuality',
              type: 'string',
              options: { list: ['clean', 'noisy'] },
            },
            {
              name: 'languageClarity',
              type: 'string',
              options: { list: ['clear', 'mixed', 'unclear'] },
            },
            {
              name: 'contentStructure',
              type: 'string',
              options: { list: ['well-structured', 'ambiguous'] },
            },
          ],
        },
      ],
    },

    // ── Field-Level Confidence ──────────────────────────────────
    {
      name: 'fieldConfidence',
      title: 'Field-Level Confidence',
      type: 'object',
      fields: [
        { name: 'type', type: 'number' },
        { name: 'format', type: 'number' },
        { name: 'tactic', type: 'number' },
        { name: 'term', type: 'number' },
        { name: 'actor', type: 'number' },
        { name: 'scope', type: 'number' },
        {
          name: 'lowConfidenceReasons',
          title: 'Low Confidence Reasons',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              { name: 'field', type: 'string' },
              { name: 'issue', type: 'string' },
              { name: 'severity', type: 'string', options: { list: ['low', 'medium', 'high'] } },
            ]
          }],
        },
      ],
    },

    // ── Document Date ───────────────────────────────────────────
    {
      name: 'documentDate',
      title: 'Document Date',
      type: 'object',
      fields: [
        { name: 'year', type: 'number' },
        { name: 'month', type: 'number' },
        { name: 'day', type: 'number' },
        {
          name: 'dateConfidence',
          title: 'Date Confidence',
          type: 'string',
          options: { list: ['exact', 'approximate', 'unknown'] },
        },
      ],
    },

    // ── Entity Links ────────────────────────────────────────────
    {
      name: 'entities',
      title: 'Entity Links',
      type: 'object',
      fields: [
        {
          name: 'actorsLinked',
          title: 'Actors (Persons)',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'person' }] }],
        },
        {
          name: 'organizationsLinked',
          title: 'Organizations',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'organization' }] }],
        },
        {
          name: 'networksLinked',
          title: 'Networks',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'organization' }] }],
        },
        {
          name: 'lawsLinked',
          title: 'Laws / Policies',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'lawPolicy' }] }],
        },
        {
          name: 'eventsLinked',
          title: 'Events',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'event' }] }],
        },
        {
          name: 'legalDefinitionsLinked',
          title: 'Legal Definitions',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'legalDefinition' }] }],
        },
        {
          name: 'exclusionClausesLinked',
          title: 'Exclusion Clauses',
          type: 'array',
          of: [{ type: 'reference', to: [{ type: 'exclusionClause' }] }],
        },
      ],
    },

    // ── Content ─────────────────────────────────────────────────
    {
      name: 'content',
      title: 'Content',
      type: 'object',
      fields: [
        { name: 'title', type: 'string' },
        { name: 'summary', title: 'Research Summary (80–150 words)', type: 'text', rows: 5 },
        { name: 'summaryValidation', title: 'Validation Summary (null if not validated)', type: 'text', rows: 5 },
        { name: 'narrativeRegister', type: 'string' },
        { name: 'languageDetected', title: 'Language (ISO 639-1)', type: 'string' },
        { name: 'wordCount', type: 'number' },
        {
          name: 'extractedText',
          title: 'Extracted Text (not in public export)',
          type: 'text',
          rows: 20,
        },
      ],
    },

    // ── Referenced URLs ─────────────────────────────────────────
    {
      name: 'referencedUrls',
      title: 'Referenced URLs',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'url', type: 'url' },
          { name: 'anchorText', type: 'string' },
          {
            name: 'linkType',
            type: 'string',
            options: { list: ['outbound', 'citation', 'source', 'related', 'unknown'] },
          },
          { name: 'domain', type: 'string' },
          { name: 'resolved', type: 'boolean', initialValue: false },
          { name: 'archiveUrl', type: 'url' },
        ]
      }],
    },

    // ── Social Media ────────────────────────────────────────────
    {
      name: 'socialMedia',
      title: 'Social Media',
      type: 'object',
      fields: [
        { name: 'accountName', type: 'string' },
        { name: 'followerCountAtCapture', type: 'number' },
        { name: 'hashtags', type: 'array', of: [{ type: 'string' }] },
        { name: 'partOfSeries', type: 'boolean', initialValue: false },
        { name: 'seriesId', type: 'string' },
      ],
    },

    // ── Priority Score ──────────────────────────────────────────
    {
      name: 'priorityScore',
      title: 'Priority Score (1–5 per axis)',
      type: 'object',
      fields: [
        { name: 'artistic', type: 'number' },
        { name: 'network', type: 'number' },
        { name: 'lexicon', type: 'number' },
        { name: 'testimony', type: 'number' },
        { name: 'historical', type: 'number' },
      ],
    },

    // ── Extractable Assets ──────────────────────────────────────
    {
      name: 'extractableAssets',
      title: 'Extractable Assets',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'assetType',
            type: 'string',
            options: {
              list: [
                'prayer_script',
                'testimony_excerpt',
                'conversion_script',
                'course_structure',
                'statistical_claim',
                'network_connection',
                'terminology_coinage',
                'visual_asset',
                'legislative_quote',
                'counter_sermon',
              ]
            },
          },
          { name: 'content', type: 'text', rows: 4 },
          { name: 'targetModule', type: 'string' },
          {
            name: 'extractedBy',
            type: 'string',
            options: { list: ['llm_primary', 'llm_validation', 'human'] },
          },
        ]
      }],
    },

    // ── Candidate Terms ─────────────────────────────────────────
    {
      name: 'candidateTerms',
      title: 'Candidate Terms',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'term', type: 'string' },
          { name: 'language', title: 'Language (ISO 639-1)', type: 'string' },
          { name: 'proposedCategory', type: 'string' },
          { name: 'promotionalUse', type: 'boolean' },
          { name: 'draftDefinition', type: 'text', rows: 3 },
          { name: 'contextQuote', type: 'string' },
          { name: 'approved', type: 'boolean', initialValue: false },
          {
            name: 'newStatus',
            type: 'string',
            options: { list: ['draft', 'discarded'] },
          },
          {
            name: 'lexiconEntryRef',
            title: 'Lexicon Entry (if approved)',
            type: 'reference',
            to: [{ type: 'lexiconEntry' }],
          },
        ]
      }],
    },

    // ── Validation ──────────────────────────────────────────────
    {
      name: 'validation',
      title: 'Validation',
      type: 'object',
      fields: [
        {
          name: 'status',
          type: 'string',
          options: { list: ['not_validated', 'queued', 'validated'] },
          initialValue: 'not_validated',
        },
        {
          name: 'validationTrigger',
          type: 'string',
          options: {
            list: [
              'mandatory_threshold',
              'low_confidence',
              'legal_flag',
              'testimony_flag',
              'tier_requirement',
              'manual_researcher',
              'random_audit',
            ]
          },
        },
        { name: 'preValidationConfidence', type: 'number' },
        { name: 'postValidationConfidence', type: 'number' },
        { name: 'validatedBy', title: 'Validated By (model identifier)', type: 'string' },
        { name: 'validatedAt', type: 'datetime' },
        {
          name: 'resolution',
          type: 'string',
          options: { list: ['accepted_primary', 'accepted_validation', 'human_override'] },
        },
        {
          name: 'validationBatchRef',
          title: 'Validation Batch',
          type: 'reference',
          to: [{ type: 'validationBatch' }],
        },
      ],
    },

    // ── AI Metadata ─────────────────────────────────────────────
    {
      name: 'aiMetadata',
      title: 'AI Metadata',
      type: 'object',
      fields: [
        { name: 'primaryModel', type: 'string' },
        {
          name: 'primaryProvider',
          type: 'string',
          options: { list: ['anthropic', 'openai', 'google', 'local', 'other'] },
        },
        { name: 'validationModel', title: 'Validation Model (null if not validated)', type: 'string' },
        { name: 'validationProvider', type: 'string' },
        {
          name: 'promptVersionRef',
          title: 'Prompt Version',
          type: 'reference',
          to: [{ type: 'promptVersion' }],
        },
        { name: 'ontologyVersion', type: 'string', initialValue: 'v3.0' },
        { name: 'processingDate', type: 'datetime' },
        { name: 'inputLengthChars', type: 'number' },
        { name: 'truncated', type: 'boolean', initialValue: false },
        {
          name: 'agreementStatus',
          type: 'string',
          options: { list: ['agreed', 'disagreed', 'not_validated'] },
          initialValue: 'not_validated',
        },
        { name: 'disagreements', type: 'array', of: [{ type: 'string' }] },
        {
          name: 'resolution',
          type: 'string',
          options: { list: ['accepted_primary', 'accepted_validation', 'human_override', 'not_applicable'] },
          initialValue: 'not_applicable',
        },
        {
          name: 'humanReview',
          title: 'Human Review',
          type: 'object',
          fields: [
            {
              name: 'reviewedBy',
              type: 'string',
              options: { list: ['researcher', 'intern'] },
            },
            { name: 'reviewedAt', type: 'datetime' },
            { name: 'changesMade', type: 'boolean' },
          ],
        },
        {
          name: 'algorithmicPreprocessing',
          title: 'Algorithmic Preprocessing',
          type: 'object',
          fields: [
            {
              name: 'tool',
              type: 'string',
              options: { list: ['unstructured', 'docling', 'yt-dlp', 'whisper', 'manual', 'none'] },
            },
            {
              name: 'preprocessingQuality',
              type: 'string',
              options: { list: ['high', 'medium', 'low', 'blocked'] },
            },
          ],
        },
      ],
    },

    // ── Zotero ──────────────────────────────────────────────────
    {
      name: 'zotero',
      title: 'Zotero',
      type: 'object',
      fields: [
        { name: 'collection', type: 'string' },
        { name: 'exportedAt', type: 'datetime' },
      ],
    },

    // ── Testimony Flag ──────────────────────────────────────────
    {
      name: 'testimonyFlag',
      title: 'Testimony Flag',
      type: 'boolean',
      initialValue: false,
    },

    // ── Needs Review ────────────────────────────────────────────
    {
      name: 'needsReview',
      title: 'Needs Review',
      type: 'boolean',
      initialValue: false,
    },

  ],

  preview: {
    select: {
      title: 'content.title',
      subtitle: 'workflowStatus',
      media: 'meta.fileRef',
    },
  },
}
```

---

## 2. testimony

First-class object for survivor, ex-gay, and detrans testimonies. Consent-controlled; `publicDisplay` defaults to false.

```javascript
// schemas/testimony.js
export default {
  name: 'testimony',
  title: 'Testimony',
  type: 'document',
  fields: [

    // ── Source ──────────────────────────────────────────────────
    {
      name: 'sourceDocument',
      title: 'Source Document',
      type: 'reference',
      to: [{ type: 'document' }],
    },
    {
      name: 'sourceLocation',
      title: 'Source Location (page, timestamp, URL section)',
      type: 'string',
    },

    // ── Testimony Type & Consent ────────────────────────────────
    {
      name: 'testimonyType',
      title: 'Testimony Type',
      type: 'string',
      options: { list: ['survivor', 'ex-gay', 'detrans', 'pastoral_account', 'other'] },
    },
    {
      name: 'consentStatus',
      title: 'Consent Status',
      type: 'string',
      options: { list: ['confirmed', 'unclear', 'withdrawn'] },
      initialValue: 'unclear',
    },
    {
      name: 'publicDisplay',
      title: 'Public Display',
      type: 'boolean',
      initialValue: false,
      description: 'Only set true after consent review. Unclear consent = never public.',
    },

    // ── Context ─────────────────────────────────────────────────
    {
      name: 'countryOfExperience',
      title: 'Country of Experience (ISO 3166-1)',
      type: 'string',
    },
    {
      name: 'denomination',
      title: 'Religious Denomination (if applicable)',
      type: 'string',
    },
    {
      name: 'practicesDescribed',
      title: 'Practices Described',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Use Practice vocabulary from SOGICE_Ontology_v3.0 Part VI',
    },
    {
      name: 'period',
      title: 'Period of Experience (approximate)',
      type: 'string',
    },
    {
      name: 'historicalPeriod',
      title: 'Historical Period',
      type: 'string',
      options: { list: ['pre-1990', '1990s', '2000s', '2010s', '2020s', 'ongoing'] },
    },

    // ── Content ─────────────────────────────────────────────────
    {
      name: 'extractedText',
      title: 'Extracted Testimony Text',
      type: 'text',
      rows: 15,
    },
    {
      name: 'narrativeModuleFlag',
      title: 'Flag for Narrative Module',
      type: 'boolean',
      initialValue: false,
      description: 'True if this testimony should feed the experience layer.',
    },

    // ── Tier ────────────────────────────────────────────────────
    {
      name: 'tier',
      title: 'Trust Tier',
      type: 'string',
      options: { list: ['2', '3'] },
      initialValue: '2',
      description: 'Testimony defaults to Tier 2. Tier 3 requires explicit consent review.',
    },

    // ── AI Metadata ─────────────────────────────────────────────
    {
      name: 'aiMetadata',
      title: 'AI Metadata',
      type: 'object',
      fields: [
        { name: 'primaryModel', type: 'string' },
        { name: 'primaryProvider', type: 'string' },
        {
          name: 'extractedBy',
          type: 'string',
          options: { list: ['llm_primary', 'llm_validation', 'human'] },
        },
        { name: 'processingDate', type: 'datetime' },
      ],
    },

  ],

  preview: {
    select: {
      title: 'testimonyType',
      subtitle: 'consentStatus',
    },
  },
}
```

---

## 3. lexiconEntry

Living Lexicon entries — the SOGICE Wikipedia nodes. Tracks full evidence dossier, validation history, and term relationships.

```javascript
// schemas/lexiconEntry.js
export default {
  name: 'lexiconEntry',
  title: 'Lexicon Entry',
  type: 'document',
  fields: [

    // ── Core Identity ───────────────────────────────────────────
    {
      name: 'term',
      title: 'Term',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['candidate', 'draft', 'validated', 'rejected'] },
      initialValue: 'candidate',
    },
    {
      name: 'proposedCluster',
      title: 'Proposed Cluster',
      type: 'string',
      options: {
        list: [
          'SSA-Rhetoric',
          'Pastoral-Coercion',
          'Pseudo-Science',
          'Policy-Resistance',
          'Anti-Trans/ROGD',
          'Anti-Gender',
          'Pro-Trans-SOGICE',
          'Non-SOGICE',
        ]
      },
    },
    {
      name: 'function',
      title: 'Function',
      type: 'string',
      options: {
        list: [
          'Slur',
          'Euphemism',
          'Conspiracy',
          'Pseudo-Diagnostic',
          'Identity-Policing',
          'Moral-Purity Frame',
          'Political Slogan',
          'Recruitment Frame',
          'Pastoral Rhetoric',
          'Disinformation Narrative',
          'Promotional Recruitment',
          'Testimonial Marketing',
        ]
      },
    },
    {
      name: 'draftDefinition',
      title: 'Draft Definition',
      type: 'text',
      rows: 5,
    },

    // ── Approval ────────────────────────────────────────────────
    {
      name: 'approvedBy',
      title: 'Approved By',
      type: 'string',
      options: { list: ['researcher', 'intern'] },
    },
    { name: 'approvedAt', type: 'datetime' },
    {
      name: 'approvedFromDocument',
      title: 'Approved From Document',
      type: 'reference',
      to: [{ type: 'document' }],
    },

    // ── Evidence Dossier ────────────────────────────────────────
    {
      name: 'evidenceDossier',
      title: 'Evidence Dossier',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'documentRef',
            title: 'Document',
            type: 'reference',
            to: [{ type: 'document' }],
          },
          { name: 'excerpt', title: 'Excerpt (under 15 words)', type: 'string' },
          { name: 'language', title: 'Language (ISO 639-1)', type: 'string' },
          {
            name: 'stanceProfile',
            title: 'Stance Profile',
            type: 'string',
            options: { list: ['promotional', 'critical_advocacy', 'legal_administrative', 'research_clinical'] },
          },
          { name: 'confidence', type: 'number' },
          {
            name: 'extractedBy',
            type: 'string',
            options: { list: ['llm_primary', 'llm_validation', 'human'] },
          },
          { name: 'contextDate', type: 'date' },
        ]
      }],
    },

    // ── Usage Statistics ────────────────────────────────────────
    { name: 'frequency', title: 'Frequency (document count)', type: 'number', initialValue: 0 },
    {
      name: 'languagesSeen',
      title: 'Languages Seen (ISO 639-1)',
      type: 'array',
      of: [{ type: 'string' }],
    },
    {
      name: 'actorsUsing',
      title: 'Actors Using This Term',
      type: 'array',
      of: [
        { type: 'reference', to: [{ type: 'person' }] },
        { type: 'reference', to: [{ type: 'organization' }] },
      ],
    },
    { name: 'firstSeen', type: 'datetime' },
    { name: 'lastSeen', type: 'datetime' },
    { name: 'lastReanalyzed', type: 'datetime' },

    // ── Validation History ──────────────────────────────────────
    {
      name: 'validationHistory',
      title: 'Validation History',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'runDate', type: 'datetime' },
          { name: 'model', type: 'string' },
          {
            name: 'recommendation',
            type: 'string',
            options: { list: ['confirm', 'revise', 'merge', 'reject'] },
          },
          { name: 'reasoning', type: 'text', rows: 3 },
          { name: 'resolvedByResearcher', type: 'boolean' },
        ]
      }],
    },

    // ── Relationships ───────────────────────────────────────────
    {
      name: 'mergeTarget',
      title: 'Merge Target (if merged)',
      type: 'reference',
      to: [{ type: 'lexiconEntry' }],
    },
    {
      name: 'relatedTerms',
      title: 'Related Terms',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'termRef',
            title: 'Term',
            type: 'reference',
            to: [{ type: 'lexiconEntry' }],
          },
          {
            name: 'relationship',
            type: 'string',
            options: { list: ['synonym_of', 'successor_to', 'euphemism_for', 'derived_from', 'translates_to'] },
          },
        ]
      }],
    },

    // ── Multilingual Variants ───────────────────────────────────
    {
      name: 'multilingualVariants',
      title: 'Multilingual Variants',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'variantTerm', type: 'string' },
          { name: 'language', title: 'Language (ISO 639-1)', type: 'string' },
          {
            name: 'attestationTier',
            type: 'string',
            options: {
              list: [
                'tier-1-legal',
                'tier-2-ngo-academic',
                'tier-3-inferred',
              ]
            },
          },
          { name: 'sourceNote', type: 'string' },
        ]
      }],
    },

  ],

  preview: {
    select: {
      title: 'term',
      subtitle: 'status',
    },
  },
}
```

---

## 4. person

Individual actors. One record per person; documents reference these.

```javascript
// schemas/person.js
export default {
  name: 'person',
  title: 'Person',
  type: 'document',
  fields: [
    { name: 'name', type: 'string', validation: Rule => Rule.required() },
    {
      name: 'formerNames',
      title: 'Former Names',
      type: 'array',
      of: [{ type: 'string' }],
    },
    {
      name: 'role',
      type: 'string',
      options: {
        list: ['founder', 'leader', 'influencer', 'therapist', 'pastor', 'survivor', 'researcher', 'politician', 'other']
      },
    },
    {
      name: 'affiliatedOrganizations',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'organization' }] }],
    },
    { name: 'countryOfOperation', title: 'Country of Operation (ISO 3166-1)', type: 'string' },
    { name: 'languages', type: 'array', of: [{ type: 'string' }] },
    { name: 'publicProfile', type: 'boolean', initialValue: true },
    {
      name: 'contestedFigure',
      title: 'Contested Figure',
      type: 'boolean',
      initialValue: false,
      description: 'True for researchers cited by both pro- and anti-SOGICE actors.',
    },
    { name: 'contestedFigureNote', type: 'text', rows: 3 },
    { name: 'description', type: 'text', rows: 4 },
    {
      name: 'sourceDocuments',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'document' }] }],
    },
    {
      name: 'registryStatus',
      type: 'string',
      options: { list: ['seeded', 'confirmed', 'under_investigation'] },
      initialValue: 'seeded',
    },
  ],

  preview: {
    select: { title: 'name', subtitle: 'role' },
  },
}
```

---

## 5. organization

Organizational actors — ministries, advocacy bodies, pseudo-professional organizations, and anti-SOGICE organizations.

```javascript
// schemas/organization.js
export default {
  name: 'organization',
  title: 'Organization',
  type: 'document',
  fields: [
    { name: 'name', type: 'string', validation: Rule => Rule.required() },
    {
      name: 'formerNames',
      title: 'Former Names',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'fromYear', type: 'number' },
          { name: 'toYear', type: 'number' },
        ]
      }],
    },
    {
      name: 'type',
      type: 'string',
      options: {
        list: [
          'ministry',
          'therapy_practice',
          'advocacy',
          'academic',
          'media',
          'government',
          'network_node',
          'pseudo-professional-body',
          'political_party',
          'church',
          'legal',
          'monitoring',
          'other',
        ]
      },
    },
    { name: 'country', title: 'Country (ISO 3166-1)', type: 'string' },
    { name: 'foundedYear', type: 'number' },
    { name: 'dissolvedYear', type: 'number' },
    {
      name: 'parentOrganization',
      type: 'reference',
      to: [{ type: 'organization' }],
    },
    { name: 'fundingSources', type: 'array', of: [{ type: 'string' }] },
    {
      name: 'affiliatedOrganizations',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'organization' }] }],
    },
    { name: 'description', type: 'text', rows: 5 },
    {
      name: 'visibility',
      type: 'string',
      options: { list: ['public', 'research_contextualized', 'internal_only'] },
      initialValue: 'public',
    },
    {
      name: 'sourceDocuments',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'document' }] }],
    },
    {
      name: 'registryStatus',
      type: 'string',
      options: { list: ['seeded', 'confirmed', 'under_investigation'] },
      initialValue: 'seeded',
    },
  ],

  preview: {
    select: { title: 'name', subtitle: 'type' },
  },
}
```

---

## 6. lawPolicy

Laws, bans, legislative submissions, and policy instruments.

```javascript
// schemas/lawPolicy.js
export default {
  name: 'lawPolicy',
  title: 'Law / Policy',
  type: 'document',
  fields: [
    { name: 'name', type: 'string', validation: Rule => Rule.required() },
    { name: 'country', title: 'Country (ISO 3166-1)', type: 'string' },
    { name: 'year', type: 'number' },
    {
      name: 'status',
      type: 'string',
      options: { list: ['enacted', 'defeated', 'pending', 'challenged', 'amended'] },
    },
    {
      name: 'appliesTo',
      title: 'Applies To',
      type: 'string',
      options: { list: ['ban', 'protection', 'restriction', 'definition', 'consultation'] },
    },
    { name: 'description', type: 'text', rows: 5 },
    {
      name: 'historicalSignificance',
      type: 'string',
      options: { list: ['high', 'medium', 'low'] },
    },
    {
      name: 'sourceDocuments',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'document' }] }],
    },
    {
      name: 'legalDefinitions',
      title: 'Associated Legal Definitions',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'legalDefinition' }] }],
    },
    {
      name: 'registryStatus',
      type: 'string',
      options: { list: ['seeded', 'confirmed'] },
      initialValue: 'seeded',
    },
  ],

  preview: {
    select: { title: 'name', subtitle: 'country' },
  },
}
```

---

## 7. event

Named events: court cases, organizational milestones, legislative moments, publications.

```javascript
// schemas/event.js
export default {
  name: 'event',
  title: 'Event',
  type: 'document',
  fields: [
    { name: 'name', type: 'string', validation: Rule => Rule.required() },
    {
      name: 'type',
      type: 'string',
      options: {
        list: [
          'conference',
          'court_case',
          'media_event',
          'publication',
          'legislation',
          'network_formation',
          'investigation',
          'organizational_founding',
          'academic_publication',
          'political_campaign',
          'other',
        ]
      },
    },
    { name: 'date', type: 'date' },
    {
      name: 'actorsInvolved',
      title: 'Actors Involved',
      type: 'array',
      of: [
        { type: 'reference', to: [{ type: 'person' }] },
        { type: 'reference', to: [{ type: 'organization' }] },
      ],
    },
    { name: 'description', type: 'text', rows: 5 },
    {
      name: 'historicalSignificance',
      type: 'string',
      options: { list: ['high', 'medium', 'low'] },
    },
    {
      name: 'sourceDocuments',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'document' }] }],
    },
    {
      name: 'registryStatus',
      type: 'string',
      options: { list: ['seeded', 'confirmed'] },
      initialValue: 'seeded',
    },
  ],

  preview: {
    select: { title: 'name', subtitle: 'type' },
  },
}
```

---

## 8. legalDefinition

Jurisdiction-specific definitional statements operationalising conversion practices. Different jurisdictions define the same practices differently — these differences are objects of analysis.

```javascript
// schemas/legalDefinition.js
export default {
  name: 'legalDefinition',
  title: 'Legal Definition',
  type: 'document',
  fields: [
    {
      name: 'jurisdiction',
      title: 'Jurisdiction (ISO 3166-1 + subnational if needed)',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'instrumentType',
      type: 'string',
      options: { list: ['law', 'regulation', 'guidance', 'resolution', 'policy', 'memorandum'] },
    },
    { name: 'instrumentName', type: 'string' },
    { name: 'yearEnacted', type: 'number' },
    { name: 'yearInForce', type: 'number' },
    {
      name: 'termUsed',
      title: 'Term Used (exact text from the law)',
      type: 'string',
    },
    {
      name: 'targetDimensions',
      title: 'Target Dimensions',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: ['sexual_orientation', 'gender_identity', 'gender_expression', 'sex_characteristics'],
      },
    },
    {
      name: 'goalVerbs',
      title: 'Goal Verbs',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: ['change', 'suppress', 'repress', 'discourage', 'deter', 'modify', 'eliminate', 'align_to_assigned_sex'],
      },
    },
    {
      name: 'scopeForm',
      title: 'Scope Form',
      type: 'string',
      options: {
        list: [
          'any treatment',
          'practices and efforts',
          'repeated practices/behaviours/statements',
          'other',
        ]
      },
    },
    { name: 'harmThreshold', type: 'boolean', initialValue: false },
    { name: 'harmThresholdDescription', type: 'string' },
    { name: 'consentOverride', type: 'boolean', initialValue: false },
    { name: 'ageSpecificProvisions', type: 'text', rows: 3 },
    { name: 'modalityExamplesListed', type: 'boolean', initialValue: false },
    {
      name: 'exclusions',
      title: 'Exclusion Clauses',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'exclusionClause' }] }],
    },
    {
      name: 'status',
      type: 'string',
      options: { list: ['enacted', 'defeated', 'pending', 'challenged', 'amended'] },
    },
    { name: 'sourceUrl', type: 'url' },
    {
      name: 'parentLawPolicy',
      title: 'Parent Law/Policy',
      type: 'reference',
      to: [{ type: 'lawPolicy' }],
    },
  ],

  preview: {
    select: { title: 'instrumentName', subtitle: 'jurisdiction' },
  },
}
```

---

## 9. exclusionClause

Clauses in conversion therapy bans that exclude identity exploration, affirmation, or medically indicated care. First-class because: (a) exclusion clauses are how organizations argue their practices are not prohibited; (b) multiple laws share the same boundary logic; (c) the boundary is contested.

```javascript
// schemas/exclusionClause.js
export default {
  name: 'exclusionClause',
  title: 'Exclusion Clause',
  type: 'document',
  fields: [
    {
      name: 'parentLegalDefinition',
      title: 'Parent Legal Definition',
      type: 'reference',
      to: [{ type: 'legalDefinition' }],
      validation: Rule => Rule.required(),
    },
    {
      name: 'excludes',
      title: 'What Is Excluded',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: ['exploration', 'affirmation', 'transition_care', 'mental_disorder_treatment', 'reflective_practice'],
      },
    },
    {
      name: 'textExcerpt',
      title: 'Text Excerpt (verbatim from law)',
      type: 'text',
      rows: 4,
    },
    {
      name: 'interpretationRisks',
      title: 'Interpretation Risks',
      type: 'text',
      rows: 3,
      description: 'How this exclusion has been or could be exploited by pro-SOGICE actors.',
    },
    { name: 'usedInPolicyArguments', type: 'boolean', initialValue: false },
    {
      name: 'policyArgumentDescription',
      title: 'Policy Argument Description',
      type: 'text',
      rows: 3,
    },
  ],

  preview: {
    select: {
      title: 'textExcerpt',
      subtitle: 'parentLegalDefinition.instrumentName',
    },
  },
}
```

---

## 10. ingestionBatch

Groups documents processed in the same ingestion session.

```javascript
// schemas/ingestionBatch.js
export default {
  name: 'ingestionBatch',
  title: 'Ingestion Batch',
  type: 'document',
  fields: [
    {
      name: 'batchId',
      title: 'Batch ID (e.g. batch-01)',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    { name: 'createdAt', type: 'datetime' },
    { name: 'closedAt', type: 'datetime' },
    {
      name: 'status',
      type: 'string',
      options: { list: ['open', 'closed'] },
      initialValue: 'open',
    },
    { name: 'documentCount', type: 'number', initialValue: 0 },
    {
      name: 'createdBy',
      type: 'string',
      options: { list: ['researcher', 'intern'] },
    },
    { name: 'notes', type: 'text', rows: 3 },
    {
      name: 'jsonExportedToGithub',
      title: 'JSON Exported to GitHub',
      type: 'boolean',
      initialValue: false,
    },
    { name: 'exportedAt', type: 'datetime' },
  ],

  preview: {
    select: { title: 'batchId', subtitle: 'status' },
  },
}
```

---

## 11. validationBatch

Configures a Track A (document classification) validation run. One record per batch run.

```javascript
// schemas/validationBatch.js
export default {
  name: 'validationBatch',
  title: 'Validation Batch',
  type: 'document',
  fields: [
    {
      name: 'batchId',
      title: 'Batch ID (e.g. val-batch-01)',
      type: 'string',
      validation: Rule => Rule.required(),
    },

    // ── Composition ─────────────────────────────────────────────
    {
      name: 'composition',
      title: 'Batch Composition',
      type: 'object',
      fields: [
        {
          name: 'mandatory',
          title: 'Mandatory Documents',
          type: 'string',
          options: { list: ['all'] },
          initialValue: 'all',
        },
        {
          name: 'recommendedPercentage',
          title: 'Recommended % (medium-confidence)',
          type: 'number',
        },
        {
          name: 'randomAuditPercentage',
          title: 'Random Audit % (high-confidence)',
          type: 'number',
        },
      ],
    },

    // ── Documents ───────────────────────────────────────────────
    {
      name: 'documentsIncluded',
      title: 'Documents Included',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'document' }] }],
    },
    {
      name: 'manualTriggerDocuments',
      title: 'Manually Triggered Documents',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'document' }] }],
    },

    // ── Status ──────────────────────────────────────────────────
    {
      name: 'status',
      type: 'string',
      options: { list: ['configured', 'exported', 'imported', 'resolved'] },
      initialValue: 'configured',
    },
    { name: 'createdAt', type: 'datetime' },
    { name: 'exportedAt', type: 'datetime' },
    { name: 'importedAt', type: 'datetime' },
    { name: 'resolvedAt', type: 'datetime' },

    // ── Validation LLM ──────────────────────────────────────────
    {
      name: 'validationModel',
      title: 'Validation Model Used',
      type: 'string',
    },
    {
      name: 'validationProvider',
      type: 'string',
      options: { list: ['openai', 'anthropic', 'google', 'local', 'manual_paste', 'other'] },
    },
    {
      name: 'promptVersionRef',
      title: 'Validation Prompt Version',
      type: 'reference',
      to: [{ type: 'promptVersion' }],
    },

    { name: 'notes', type: 'text', rows: 3 },
  ],

  preview: {
    select: { title: 'batchId', subtitle: 'status' },
  },
}
```

---

## 12. promptVersion

Versioned prompts for both ingestion (Claude) and validation (any LLM). Every document record references the prompt version used to generate it. Enables reproducibility and prompt auditing.

```javascript
// schemas/promptVersion.js
export default {
  name: 'promptVersion',
  title: 'Prompt Version',
  type: 'document',
  fields: [
    {
      name: 'versionId',
      title: 'Version ID (e.g. ingestion-v3.1)',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'type',
      title: 'Prompt Type',
      type: 'string',
      options: { list: ['ingestion', 'validation', 'lexicon_validation'] },
    },
    {
      name: 'targetModel',
      title: 'Target Model (or "model-agnostic")',
      type: 'string',
    },
    { name: 'createdAt', type: 'datetime' },
    {
      name: 'active',
      title: 'Active (used for new documents)',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'ontologyVersion',
      title: 'Ontology Version (at time of prompt creation)',
      type: 'string',
    },
    {
      name: 'systemPrompt',
      title: 'System Prompt (full text)',
      type: 'text',
      rows: 30,
    },
    {
      name: 'changesSummary',
      title: 'Changes from Previous Version',
      type: 'text',
      rows: 4,
    },
    { name: 'notes', type: 'text', rows: 3 },
  ],

  preview: {
    select: { title: 'versionId', subtitle: 'type' },
  },
}
```

---

## Schema Index File

```javascript
// schemas/index.js
import document from './document'
import testimony from './testimony'
import lexiconEntry from './lexiconEntry'
import person from './person'
import organization from './organization'
import lawPolicy from './lawPolicy'
import event from './event'
import legalDefinition from './legalDefinition'
import exclusionClause from './exclusionClause'
import ingestionBatch from './ingestionBatch'
import validationBatch from './validationBatch'
import promptVersion from './promptVersion'

export const schemaTypes = [
  document,
  testimony,
  lexiconEntry,
  person,
  organization,
  lawPolicy,
  event,
  legalDefinition,
  exclusionClause,
  ingestionBatch,
  validationBatch,
  promptVersion,
]
```

---

## Notes for Implementation

- **Naming:** All field names are camelCase (Sanity convention). The API/export layer translates to snake_case. Do not change this without updating both sides.
- **References vs. strings in classification arrays:** `classification.actor` and `classification.network` store string names (from LLM output). `entities.actorsLinked` and `entities.organizationsLinked` store Sanity references. The human review step resolves strings to references.
- **Supabase sync:** When a document is created or its `tier`, `validation.status`, or `content.languageDetected` changes, the Vercel app must sync these fields to the Supabase `document_embeddings` companion table. The `content_embedding` column stays null until Phase 2 batch embedding.
- **`extractedText` field:** Stored in Sanity but excluded from public GROQ queries and JSON exports. Server-side only.
- **`embeddingVector` field:** Not stored in Sanity. Lives exclusively in Supabase `document_embeddings`.

---

*Sanity Schema v1.0 · April 2026 · SurvivingSOGICE · University of Bergen*  
*Companion documents: PRD_v3.1.md · SOGICE_Ontology_v3.0.md · SOGICE_Lexicon_v2.0.md*
