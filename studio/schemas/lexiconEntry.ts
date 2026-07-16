export default {
  name: 'lexiconEntry',
  title: 'Lexicon Entry',
  type: 'document',
  fields: [

    // ── Core Identity ───────────────────────────────────────────
    { name: 'term', title: 'Term', type: 'string', validation: (Rule: any) => Rule.required() },
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
          'SSA-Rhetoric', 'Pastoral-Coercion', 'Pseudo-Science',
          'Policy-Resistance', 'Anti-Trans/ROGD', 'Anti-Gender',
          'Pro-Trans-SOGICE', 'Non-SOGICE',
        ],
      },
    },
    {
      name: 'function',
      title: 'Function',
      type: 'string',
      options: {
        list: [
          'Slur', 'Euphemism', 'Conspiracy', 'Pseudo-Diagnostic',
          'Identity-Policing', 'Moral-Purity Frame', 'Political Slogan',
          'Recruitment Frame', 'Pastoral Rhetoric', 'Disinformation Narrative',
          'Promotional Recruitment', 'Testimonial Marketing',
        ],
      },
    },
    { name: 'draftDefinition', title: 'Draft Definition (academic)', type: 'text', rows: 5 },
    {
      name: 'accessibleDefinition',
      title: 'Accessible Definition (plain English, max 2 sentences)',
      type: 'string',
      description: 'Required before a term can reach validated status. Powers the public SOGICE Wikipedia.',
    },
    {
      name: 'sourceAttestations',
      title: 'Authority Source Attestations',
      description:
        'Definitions and mappings attested by named sources. Source attestation does not itself validate the archive term.',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'sourceId', title: 'Stable Source ID', type: 'string' },
          { name: 'sourceTerm', title: 'Term in Source', type: 'string' },
          { name: 'sourceDefinitionSummary', title: 'Source Definition Summary', type: 'text', rows: 3 },
          { name: 'definitionRepresentation', title: 'Definition Representation', type: 'string' },
          { name: 'sourceUrl', title: 'Source URL', type: 'url' },
          { name: 'publicationDate', title: 'Publication Date', type: 'date' },
          { name: 'publisher', title: 'Publisher', type: 'string' },
          { name: 'licence', title: 'Licence', type: 'string' },
          {
            name: 'attestationFingerprint',
            title: 'Attestation Fingerprint',
            type: 'string',
            readOnly: true,
            description: 'Detects a revised source summary or provenance record without changing researcher review state.',
          },
          {
            name: 'reviewState',
            title: 'Review State',
            type: 'string',
            options: { list: ['source_attested_unreviewed', 'researcher_confirmed_source'] },
          },
        ],
      }],
    },

    // ── Approval ────────────────────────────────────────────────
    {
      name: 'approvedBy',
      title: 'Approved By',
      type: 'string',
      options: { list: ['researcher'] },
    },
    { name: 'approvedAt', title: 'Approved At', type: 'datetime' },
    {
      name: 'approvedFromDocument',
      title: 'Approved From Document',
      type: 'reference',
      to: [{ type: 'sogiceDocument' }],
    },
    {
      name: 'includeInAnalysisLexicon',
      title: 'Include Draft in Analysis Orientation Lexicon',
      type: 'boolean',
      initialValue: false,
      description:
        'Stage 3b analysis injects a compact orientation lexicon (max 200 terms). '
        + 'Validated terms are included automatically by status. '
        + 'For draft terms, enable this only when the researcher trusts the term enough to orient analysis. '
        + 'Leave false for unreviewed model suggestions.',
    },

    // ── Evidence Dossier ────────────────────────────────────────
    // One record per document where this term is attested. Each record carries the
    // full extraction context from that document so it can later be compiled into a
    // per-term research dossier. Confirmation gates inclusion in definitions.
    {
      name: 'evidenceDossier',
      title: 'Evidence Dossier',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          // ── Source ──────────────────────────────────────────────
          { name: 'documentRef', title: 'Document', type: 'reference', to: [{ type: 'sogiceDocument' }] },
          { name: 'language', title: 'Language (ISO 639-1)', type: 'string' },
          { name: 'contextDate', title: 'Context Date (from source)', type: 'date' },

          // ── Verbatim evidence ────────────────────────────────────
          { name: 'excerpt', title: 'Excerpt (headline, under 15 words)', type: 'string' },
          { name: 'exactQuote', title: 'Exact Quote (full sentence/passage)', type: 'text', rows: 3 },

          // ── How this document uses the term ─────────────────────
          // definitionAsUsed: what the source says the term means — may differ across documents.
          // This feeds the compiled term document; not necessarily the canonical definition.
          { name: 'definitionAsUsed', title: 'Definition as Used in This Source', type: 'text', rows: 3 },

          // ── Rhetorical context ───────────────────────────────────
          {
            name: 'stanceProfile',
            title: 'Stance Profile',
            type: 'string',
            options: { list: ['promotional', 'critical_advocacy', 'legal_administrative', 'research_clinical'] },
          },
          {
            name: 'usageRegister',
            title: 'Usage Register',
            type: 'string',
            options: { list: ['promotional', 'defensive', 'euphemistic', 'clinical', 'legal', 'conspiratorial', 'testimonial', 'neutral'] },
          },

          // ── Co-occurrence and relationships (within this document) ──
          // coOccurringTerms: other SOGICE terms found alongside this one in the same document.
          { name: 'coOccurringTerms', title: 'Co-occurring Terms (in this document)', type: 'array', of: [{ type: 'string' }] },
          // relationshipNotes: how this document positions this term relative to other terms.
          { name: 'relationshipNotes', title: 'Relationship Notes', type: 'text', rows: 2 },

          // ── Model extraction metadata ────────────────────────────
          { name: 'modelConfidence', title: 'Model Confidence (0–1)', type: 'number' },
          // confidenceRationale: the model's explanation of why it extracted this term here.
          { name: 'confidenceRationale', title: 'Model Confidence Rationale', type: 'text', rows: 2 },
          {
            name: 'extractedBy',
            title: 'Extracted By',
            type: 'string',
            options: { list: ['llm_extracted', 'llm_validation', 'human'] },
          },
          { name: 'extractionModel', title: 'Extraction Model', type: 'string' },

          // ── Researcher assessment ────────────────────────────────
          { name: 'researcherConfidence', title: 'Researcher Confidence (0–1)', type: 'number' },
          { name: 'researcherNote', title: 'Researcher Note', type: 'text', rows: 2 },

          // ── Confirmation gate ────────────────────────────────────
          // confirmed: set by researcher. Only confirmed records contribute to definitions
          // and to the compiled per-term document. Unconfirmed records are stored but
          // labelled "pending confirmation" on any public-facing surface.
          { name: 'confirmed', title: 'Confirmed by researcher', type: 'boolean', initialValue: false },
          { name: 'confirmedAt', title: 'Confirmed At', type: 'datetime' },
          { name: 'confirmedNote', title: 'Confirmation Note', type: 'string' },
        ],
      }],
    },

    // ── Usage Statistics ────────────────────────────────────────
    { name: 'frequency', title: 'Frequency (document count)', type: 'number', initialValue: 0 },
    { name: 'languagesSeen', title: 'Languages Seen (ISO 639-1)', type: 'array', of: [{ type: 'string' }] },
    {
      name: 'actorsUsing',
      title: 'Actors Using This Term',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'person' }, { type: 'organization' }] }],
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
        ],
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
          { name: 'termRef', title: 'Term', type: 'reference', to: [{ type: 'lexiconEntry' }] },
          {
            name: 'relationship',
            type: 'string',
            options: { list: ['synonym_of', 'successor_to', 'euphemism_for', 'derived_from', 'translates_to'] },
          },
        ],
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
            options: { list: ['tier-1-legal', 'tier-2-ngo-academic', 'tier-3-inferred'] },
          },
          { name: 'sourceNote', type: 'string' },
        ],
      }],
    },
  ],

  preview: {
    select: { title: 'term', subtitle: 'status' },
  },
}
