export default {
  name: 'sogiceDocument',
  title: 'Document',
  type: 'document',
  fields: [

    // ── Workflow ────────────────────────────────────────────────
    {
      name: 'workflowStatus',
      title: 'Workflow Status',
      type: 'string',
      options: { list: ['unverified', 'in_progress', 'verified', 'published'] },
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
        ],
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
        {
          name: 'testimonyConsent',
          title: 'Testimony Consent',
          type: 'string',
          options: { list: ['confirmed', 'pending', 'refused'] },
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
        { name: 'htmlSnapshotUrl', type: 'url' },
        { name: 'htmlSnapshotHash', type: 'string' },
        { name: 'chainNotes', type: 'text', rows: 2 },
      ],
    },

    // ── Classification ──────────────────────────────────────────
    {
      name: 'classification',
      title: 'Classification',
      type: 'object',
      fields: [
        {
          name: 'type',
          title: 'Type',
          type: 'string',
          options: {
            list: [
              'Pro-SOGICE', 'Anti-SOGICE', 'Neutral-Academic', 'Legal-Instrument',
              'Testimony', 'Media-Coverage', 'Internal-Org-Document', 'Mixed',
              'Training-Certification-Material', 'Liturgical-Devotional-Material',
              'Clinical-Therapeutic-Protocol', 'Survivor-Network-Material',
              'Regulatory-Policy-Document',
            ],
          },
        },
        {
          name: 'primaryType',
          title: 'Primary Type (compound)',
          type: 'string',
          options: {
            list: [
              'Pro-SOGICE', 'Anti-SOGICE', 'Neutral-Academic', 'Legal-Instrument',
              'Testimony', 'Media-Coverage', 'Internal-Org-Document', 'Mixed',
              'Training-Certification-Material', 'Liturgical-Devotional-Material',
              'Clinical-Therapeutic-Protocol', 'Survivor-Network-Material',
              'Regulatory-Policy-Document',
            ],
          },
        },
        {
          name: 'secondaryType',
          title: 'Secondary Type (compound)',
          type: 'string',
          options: {
            list: [
              'Pro-SOGICE', 'Anti-SOGICE', 'Neutral-Academic', 'Legal-Instrument',
              'Testimony', 'Media-Coverage', 'Internal-Org-Document', 'Mixed',
              'Training-Certification-Material', 'Liturgical-Devotional-Material',
              'Clinical-Therapeutic-Protocol', 'Survivor-Network-Material',
              'Regulatory-Policy-Document',
            ],
          },
        },
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
        {
          name: 'narrativeRegister',
          title: 'Narrative Register',
          type: 'string',
          options: {
            list: [
              'Pastoral-Healing', 'Scientific-Clinical', 'Legal-Policy',
              'Testimonial-Personal', 'Conspiratorial', 'Activist-Advocacy',
              'Journalistic', 'Academic-Analytical', 'Mixed',
            ],
          },
        },
        {
          name: 'rhetoricalIntensity',
          title: 'Rhetorical Intensity',
          type: 'string',
          options: { list: ['hook', 'pathologizing', 'active-conduct'] },
        },
        {
          name: 'framingBalance',
          title: 'Framing Balance',
          type: 'string',
          options: { list: ['pro-dominant', 'anti-dominant', 'genuinely-mixed', 'unclear'] },
        },
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
            { name: 'textQuality', type: 'string', options: { list: ['clean', 'noisy'] } },
            { name: 'languageClarity', type: 'string', options: { list: ['clear', 'mixed', 'unclear'] } },
            { name: 'contentStructure', type: 'string', options: { list: ['well-structured', 'ambiguous'] } },
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
            ],
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
        { name: 'summaryValidation', title: 'Validation Summary', type: 'text', rows: 5 },
        { name: 'narrativeRegister', type: 'string' },
        { name: 'languageDetected', title: 'Language (ISO 639-1)', type: 'string' },
        { name: 'wordCount', type: 'number' },
        { name: 'extractedText', title: 'Extracted Text (not in public export)', type: 'text', rows: 20 },
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
        ],
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
                'prayer_script', 'testimony_excerpt', 'conversion_script',
                'course_structure', 'statistical_claim', 'network_connection',
                'terminology_coinage', 'visual_asset', 'legislative_quote', 'counter_sermon',
              ],
            },
          },
          { name: 'content', type: 'text', rows: 4 },
          { name: 'targetModule', type: 'string' },
          {
            name: 'extractedBy',
            type: 'string',
            options: { list: ['llm_primary', 'llm_validation', 'human'] },
          },
        ],
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
          { name: 'newStatus', type: 'string', options: { list: ['draft', 'discarded'] } },
          {
            name: 'lexiconEntryRef',
            title: 'Lexicon Entry (if approved)',
            type: 'reference',
            to: [{ type: 'lexiconEntry' }],
          },
        ],
      }],
    },

    // ── Legal Status ────────────────────────────────────────────
    {
      name: 'legalStatus',
      title: 'Legal Status',
      type: 'object',
      fields: [
        { name: 'jurisdiction', title: 'Jurisdiction (ISO 3166-1 or regional)', type: 'string' },
        {
          name: 'status',
          title: 'Status',
          type: 'string',
          options: { list: ['banned', 'regulated', 'contested', 'permitted', 'unknown'] },
          initialValue: 'unknown',
        },
        { name: 'instrument', title: 'Law or Policy Instrument', type: 'string' },
      ],
    },

    // ── Term Use Context ─────────────────────────────────────────
    {
      name: 'termUseContext',
      title: 'Term Use Context (non-promotional appearances)',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'term', title: 'Lexicon Term', type: 'string' },
          {
            name: 'use',
            title: 'Use Type',
            type: 'string',
            options: { list: ['promotional', 'definitional', 'critical', 'reported'] },
          },
          { name: 'quote', title: 'Context Quote (≤20 words)', type: 'string' },
        ],
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
              'mandatory_threshold', 'low_confidence', 'legal_flag',
              'testimony_flag', 'tier_requirement', 'manual_researcher', 'random_audit',
            ],
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
        { name: 'validationModel', type: 'string' },
        { name: 'validationProvider', type: 'string' },
        { name: 'promptVersion', title: 'Prompt Version (e.g. ingestion-v3.3)', type: 'string' },
        {
          name: 'promptVersionRef',
          title: 'Prompt Version (linked record)',
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
            { name: 'reviewedBy', type: 'string', options: { list: ['researcher'] } },
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

    { name: 'testimonyFlag', title: 'Testimony Flag', type: 'boolean', initialValue: false },
    { name: 'needsReview', title: 'Needs Review', type: 'boolean', initialValue: false },
    {
      name: 'testimonyReview',
      title: 'Testimony Review',
      type: 'object',
      fields: [
        {
          name: 'consentStatus',
          title: 'Consent Status',
          type: 'string',
          options: { list: ['obtained', 'pending', 'not_required', 'refused', 'unclear', 'withdrawn'] },
        },
        {
          name: 'consentSource',
          title: 'Consent Source',
          type: 'string',
          options: { list: ['direct', 'assumed', 'proxy', 'unknown'] },
        },
        {
          name: 'reviewedBy',
          title: 'Reviewed By',
          type: 'string',
          options: { list: ['researcher'] },
        },
        { name: 'reviewedAt', title: 'Reviewed At', type: 'datetime' },
        { name: 'publicDisplay', title: 'Public Display', type: 'boolean' },
        { name: 'publicExcerpt', title: 'Public Excerpt', type: 'text', rows: 5 },
        { name: 'notes', title: 'Notes', type: 'text', rows: 3 },
      ],
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
