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

    // ── Media Research Metadata ──────────────────────────────────────────
    {
      name: 'mediaMetadata',
      title: 'Media Research Metadata',
      type: 'object',
      fields: [
        {
          name: 'contentFormat',
          type: 'string',
          options: {
            list: [
              'documentary', 'short_documentary', 'video_testimony', 'podcast',
              'video_podcast', 'interview', 'sermon', 'conference_talk',
              'panel_discussion', 'news_report', 'campaign_video', 'social_video',
              'webpage', 'pdf', 'book_or_manual', 'mixed_media', 'other',
            ],
          },
        },
        {
          name: 'mediaMode',
          type: 'string',
          options: { list: ['video', 'audio', 'text', 'image', 'mixed'] },
        },
        {
          name: 'activeResearchProfiles',
          type: 'array',
          of: [{
            type: 'string',
            options: {
              list: [
                'archive_core', 'visual_network', 'search_discovery', 'shame_article',
                'documentary_analysis', 'podcast_analysis', 'testimony_analysis',
                'anti_gender_network', 'public_website_table',
              ],
            },
          }],
        },
        {
          name: 'profileStatus',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              {
                name: 'profile',
                type: 'string',
                options: {
                  list: [
                    'archive_core', 'visual_network', 'search_discovery', 'shame_article',
                    'documentary_analysis', 'podcast_analysis', 'testimony_analysis',
                    'anti_gender_network', 'public_website_table',
                  ],
                },
              },
              { name: 'active', type: 'boolean', initialValue: true },
              {
                name: 'status',
                type: 'string',
                options: { list: ['candidate', 'active', 'excluded', 'reviewed', 'published'] },
              },
              { name: 'reason', type: 'string' },
              { name: 'reviewerNote', type: 'text', rows: 2 },
            ],
          }],
        },
        {
          name: 'general',
          type: 'object',
          fields: [
            { name: 'durationMinutes', type: 'number' },
            { name: 'yearOfRelease', type: 'number' },
            { name: 'countryOfProduction', type: 'string' },
            { name: 'languages', type: 'array', of: [{ type: 'string' }] },
            { name: 'subtitleLanguages', type: 'array', of: [{ type: 'string' }] },
            { name: 'dubbedLanguages', type: 'array', of: [{ type: 'string' }] },
            { name: 'synopsis', type: 'text', rows: 3 },
            { name: 'productionCompany', type: 'string' },
            { name: 'creator', type: 'string' },
            { name: 'channelUrl', type: 'url' },
            { name: 'channelHandle', type: 'string' },
            { name: 'likeCount', type: 'number' },
            { name: 'commentCount', type: 'number' },
            { name: 'availability', type: 'string' },
            { name: 'seriesTitle', type: 'string' },
            { name: 'episodeTitle', type: 'string' },
            { name: 'publicationDate', type: 'date' },
          ],
        },
        {
          name: 'documentary',
          type: 'object',
          fields: [
            { name: 'director', type: 'string' },
            { name: 'productionCompany', type: 'string' },
            { name: 'durationMinutes', type: 'number' },
            { name: 'yearOfRelease', type: 'number' },
            { name: 'countryOfProduction', type: 'string' },
            { name: 'synopsis', type: 'text', rows: 3 },
            { name: 'languages', type: 'array', of: [{ type: 'string' }] },
            { name: 'subtitleLanguages', type: 'array', of: [{ type: 'string' }] },
            { name: 'dubbedLanguages', type: 'array', of: [{ type: 'string' }] },
            {
              name: 'documentaryCategory',
              type: 'string',
              options: {
                list: [
                  'ex_gay', 'detrans', 'anti_gender_ideology',
                  'anti_homosexuality_trans', 'parental_family',
                  'spousal_partner', 'mixed', 'other',
                ],
              },
            },
            {
              name: 'productionBackground',
              type: 'string',
              options: {
                list: [
                  'faith_based', 'far_right_media', 'independent', 'media',
                  'hate_group', 'mixed', 'unknown',
                ],
              },
            },
            { name: 'associatedMinistry', type: 'string' },
          ],
        },
        {
          name: 'podcast',
          type: 'object',
          fields: [
            { name: 'podcastTitle', type: 'string' },
            { name: 'episodeTitle', type: 'string' },
            { name: 'episodeNumber', type: 'string' },
            { name: 'hostNames', type: 'array', of: [{ type: 'string' }] },
            { name: 'guestNames', type: 'array', of: [{ type: 'string' }] },
            { name: 'publisher', type: 'string' },
            { name: 'seriesUrl', type: 'url' },
            { name: 'audioOnly', type: 'boolean' },
            { name: 'transcriptAvailable', type: 'boolean' },
          ],
        },
        {
          name: 'platformDistribution',
          type: 'array',
          of: [{
            type: 'object',
            fields: [
              {
                name: 'platform',
                type: 'string',
                options: {
                  list: [
                    'youtube', 'vimeo', 'rumble', 'odysee', 'dailymotion',
                    'internet_archive', 'facebook', 'bitchute', 'self_hosted',
                    'podcast_platform', 'other',
                  ],
                },
              },
              { name: 'url', type: 'url' },
              { name: 'viewCount', type: 'number' },
              { name: 'capturedAt', type: 'datetime' },
              {
                name: 'status',
                type: 'string',
                options: { list: ['active', 'removed', 'unlisted', 'reuploaded', 'unknown'] },
              },
            ],
          }],
        },
        {
          name: 'reachMetrics',
          type: 'object',
          fields: [
            { name: 'internetArchiveUrl', type: 'url' },
            { name: 'accessOnDemand', type: 'boolean' },
            { name: 'totalEstimatedViews', type: 'number' },
            { name: 'viewCountNote', type: 'text', rows: 2 },
          ],
        },
        {
          name: 'platformAlgorithmicSignals',
          title: 'Platform / Discovery Signals',
          type: 'object',
          description: 'Exposed platform metadata and presentation signals; not proof of recommendation behavior.',
          fields: [
            { name: 'tags', type: 'array', of: [{ type: 'string' }] },
            { name: 'categories', type: 'array', of: [{ type: 'string' }] },
            { name: 'hashtags', type: 'array', of: [{ type: 'string' }] },
            {
              name: 'chapters',
              type: 'array',
              of: [{
                type: 'object',
                fields: [
                  { name: 'title', type: 'string' },
                  { name: 'startTime', type: 'number' },
                  { name: 'endTime', type: 'number' },
                ],
              }],
            },
            {
              name: 'thumbnails',
              type: 'array',
              of: [{
                type: 'object',
                fields: [
                  { name: 'url', type: 'url' },
                  { name: 'width', type: 'number' },
                  { name: 'height', type: 'number' },
                ],
              }],
            },
            { name: 'note', type: 'text', rows: 2 },
          ],
        },
        {
          name: 'transcriptEvidence',
          type: 'object',
          fields: [
            { name: 'providedTranscriptPath', type: 'string' },
            { name: 'providedTranscriptFormat', type: 'string' },
            { name: 'selectedTranscriptLabel', type: 'string' },
            { name: 'transcriptVersionCount', type: 'number' },
            { name: 'transcriptChunkCount', type: 'number' },
          ],
        },
        {
          name: 'classificationProvenance',
          type: 'object',
          fields: [
            {
              name: 'classificationSource',
              type: 'string',
              options: {
                list: ['researcher', 'imported_excel', 'model_suggested', 'external_reference'],
              },
            },
            { name: 'classificationReviewed', type: 'boolean', initialValue: false },
            { name: 'classificationNotes', type: 'text', rows: 3 },
          ],
        },
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

    // ── Suggested Actors ────────────────────────────────────────
    {
      name: 'suggestedActors',
      title: 'Suggested Actors (AI-proposed)',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'type', type: 'string', options: { list: ['person', 'organization'] } },
          { name: 'country', type: 'string' },
          { name: 'role', type: 'string' },
          { name: 'evidenceQuote', type: 'string' },
          { name: 'approved', type: 'boolean', initialValue: false },
        ],
      }],
    },

    // ── Suggested Networks ──────────────────────────────────────
    {
      name: 'suggestedNetworks',
      title: 'Suggested Networks (AI-proposed)',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'evidenceQuote', type: 'string' },
          { name: 'approved', type: 'boolean', initialValue: false },
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
        { name: 'analysedAt', type: 'datetime' },
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
        {
          name: 'normalisationWarnings',
          title: 'Normalisation Warnings',
          type: 'array',
          of: [{ type: 'string' }],
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
