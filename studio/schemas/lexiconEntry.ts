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

    // ── Evidence Dossier ────────────────────────────────────────
    {
      name: 'evidenceDossier',
      title: 'Evidence Dossier',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'documentRef', title: 'Document', type: 'reference', to: [{ type: 'sogiceDocument' }] },
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
