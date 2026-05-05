export default {
  name: 'practiceEntry',
  title: 'Practice Entry',
  type: 'document',
  fields: [

    // ── Core Identity ───────────────────────────────────────────
    { name: 'practice', title: 'Practice Name', type: 'string', validation: (Rule: any) => Rule.required() },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['candidate', 'draft', 'validated', 'deprecated'] },
      initialValue: 'draft',
    },
    {
      name: 'practiceType',
      title: 'Practice Type',
      type: 'string',
      options: {
        list: [
          { title: 'Spiritual — prayer, deliverance, exorcism, pastoral care', value: 'spiritual' },
          { title: 'Psychological — therapy, counselling, coaching', value: 'psychological' },
          { title: 'Medical — hormonal, surgical, aversion', value: 'medical' },
          { title: 'Social — family pressure, community pressure, isolation', value: 'social' },
          { title: 'Hybrid — combines multiple modalities', value: 'hybrid' },
        ],
      },
    },
    {
      name: 'deliveryContext',
      title: 'Delivery Context',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          'individual', 'group', 'residential-retreat', 'online',
          'in-person', 'family-setting', 'institutional',
        ],
      },
    },

    // ── Definitions ─────────────────────────────────────────────
    {
      name: 'definition',
      title: 'Definition (academic)',
      type: 'text',
      rows: 6,
      description: 'What this practice involves — method, mechanism, and deployment context.',
    },
    {
      name: 'accessibleDefinition',
      title: 'Accessible Definition (plain English, max 2 sentences)',
      type: 'string',
      description: 'Powers the public SOGICE Wikipedia. Required before validated status.',
    },
    {
      name: 'boundaries',
      title: 'Boundaries (what distinguishes this from adjacent practices)',
      type: 'text',
      rows: 4,
    },
    {
      name: 'taggingRule',
      title: 'Tagging Rule',
      type: 'text',
      rows: 3,
      description: 'When to apply this practice tag. When NOT to apply it.',
    },

    // ── Legal & Harm Profile ─────────────────────────────────────
    {
      name: 'legalStatus',
      title: 'Legal Status (global)',
      type: 'string',
      options: {
        list: [
          { title: 'Banned in some jurisdictions', value: 'banned-partial' },
          { title: 'Banned in most jurisdictions', value: 'banned-broad' },
          { title: 'Regulated / restricted', value: 'regulated' },
          { title: 'Contested / under review', value: 'contested' },
          { title: 'Permitted / unregulated', value: 'permitted' },
        ],
      },
    },
    {
      name: 'harmCategories',
      title: 'Harm Categories',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          'psychological', 'physical', 'spiritual', 'suicidality',
          'family-rupture', 'social-isolation', 'financial-exploitation',
        ],
      },
      description: 'Types of harm this practice is documented to cause.',
    },

    // ── Historical & Cultural Context ───────────────────────────
    {
      name: 'firstDocumented',
      title: 'First Documented',
      type: 'date',
    },
    {
      name: 'activeFrom',
      title: 'Active From (year)',
      type: 'number',
    },
    {
      name: 'activeTo',
      title: 'Active To (year, leave blank if ongoing)',
      type: 'number',
    },
    {
      name: 'geographicScope',
      title: 'Geographic Scope',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'ISO 3166-1 country codes or region names.',
    },
    {
      name: 'religiousContext',
      title: 'Religious / Ideological Context',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          'Evangelical-Protestant', 'Catholic', 'Eastern-Orthodox',
          'LDS-Mormon', 'Islamic', 'Jewish-Orthodox',
          'Secular-Conservative', 'Gender-Critical', 'Far-Right',
          'Cross-Denominational',
        ],
      },
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
          { name: 'excerpt', title: 'Excerpt (under 30 words)', type: 'string' },
          {
            name: 'stanceProfile',
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
    {
      name: 'keyDocuments',
      title: 'Key Documents',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'sogiceDocument' }] }],
      description: 'Canonical corpus documents that exemplify or define this practice.',
    },

    // ── Relationships ────────────────────────────────────────────
    {
      name: 'linkedLexiconTerms',
      title: 'Linked Lexicon Terms',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'lexiconEntry' }] }],
      description: 'Terms that name, describe, or euphemize this practice.',
    },
    {
      name: 'relatedTactics',
      title: 'Related Tactics',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'tacticEntry' }] }],
      description: 'Rhetorical tactics commonly paired with or used to justify this practice.',
    },
    {
      name: 'relatedPractices',
      title: 'Related Practices',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'practiceRef', title: 'Practice', type: 'reference', to: [{ type: 'practiceEntry' }] },
          {
            name: 'relationship',
            title: 'Relationship',
            type: 'string',
            options: {
              list: [
                'pairs_with', 'precedes', 'escalates_to', 'subset_of', 'contrasts_with', 'rebrand_of',
              ],
            },
          },
        ],
      }],
    },
    {
      name: 'linkedOrganizations',
      title: 'Organizations Delivering This Practice',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'organization' }] }],
    },

    // ── Approval & Registry ──────────────────────────────────────
    {
      name: 'registryStatus',
      title: 'Registry Status',
      type: 'string',
      options: { list: ['seeded', 'confirmed', 'deprecated'] },
      initialValue: 'seeded',
    },
    { name: 'approvedBy', type: 'string', options: { list: ['researcher'] } },
    { name: 'approvedAt', type: 'datetime' },
    { name: 'frequency', title: 'Frequency (document count)', type: 'number', initialValue: 0 },
    { name: 'firstSeen', type: 'datetime' },
    { name: 'lastSeen', type: 'datetime' },
  ],

  preview: {
    select: { title: 'practice', subtitle: 'practiceType' },
  },
}
