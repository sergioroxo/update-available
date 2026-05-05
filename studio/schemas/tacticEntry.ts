export default {
  name: 'tacticEntry',
  title: 'Tactic Entry',
  type: 'document',
  fields: [

    // ── Core Identity ───────────────────────────────────────────
    { name: 'tactic', title: 'Tactic', type: 'string', validation: (Rule: any) => Rule.required() },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['candidate', 'draft', 'validated', 'deprecated'] },
      initialValue: 'draft',
    },
    {
      name: 'primaryCluster',
      title: 'Primary Cluster',
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
      name: 'secondaryCluster',
      title: 'Secondary Cluster',
      type: 'string',
      options: {
        list: [
          'SSA-Rhetoric', 'Pastoral-Coercion', 'Pseudo-Science',
          'Policy-Resistance', 'Anti-Trans/ROGD', 'Anti-Gender',
          'Pro-Trans-SOGICE', 'Non-SOGICE',
        ],
      },
    },

    // ── Definitions ─────────────────────────────────────────────
    {
      name: 'definition',
      title: 'Definition (academic)',
      type: 'text',
      rows: 6,
      description: 'What rhetorical or political move this tactic makes. Include mechanism, framing, and deployment context.',
    },
    {
      name: 'accessibleDefinition',
      title: 'Accessible Definition (plain English, max 2 sentences)',
      type: 'string',
      description: 'Powers the public SOGICE Wikipedia. Required before validated status.',
    },
    {
      name: 'boundaries',
      title: 'Boundaries (what distinguishes this from adjacent tactics)',
      type: 'text',
      rows: 4,
      description: 'Where this tactic ends and an adjacent one begins. Cite the adjacent tactic by name.',
    },
    {
      name: 'promotionalUseRule',
      title: 'Tagging Rule',
      type: 'text',
      rows: 3,
      description: 'When to apply this tactic tag. When NOT to apply it.',
    },

    // ── Historical & Cultural Context ───────────────────────────
    {
      name: 'firstDocumented',
      title: 'First Documented',
      type: 'date',
      description: 'Earliest known use of this tactic in the corpus or literature.',
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
      description: 'ISO 3166-1 country codes or region names where this tactic is documented.',
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
      description: 'Traditions in which this tactic predominantly appears.',
    },

    // ── Cultural Variants ────────────────────────────────────────
    // Parallel to lexiconEntry.multilingualVariants but captures how the
    // tactic manifests differently across cultures, legal systems, or
    // historical periods — not just language differences.
    {
      name: 'culturalVariants',
      title: 'Cultural & Regional Variants',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'variantName',
            title: 'Variant Name / Label',
            type: 'string',
            description: 'How this tactic is named or operationalized in this context.',
          },
          {
            name: 'context',
            title: 'Context (country, tradition, or period)',
            type: 'string',
          },
          {
            name: 'language',
            title: 'Language (ISO 639-1)',
            type: 'string',
          },
          {
            name: 'description',
            title: 'Description',
            type: 'text',
            rows: 3,
            description: 'How this variant differs from the canonical form.',
          },
          {
            name: 'attestationTier',
            title: 'Attestation Tier',
            type: 'string',
            options: { list: ['tier-1-legal', 'tier-2-ngo-academic', 'tier-3-inferred'] },
          },
          {
            name: 'sourceNote',
            title: 'Source Note',
            type: 'string',
          },
        ],
      }],
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

    // ── Key Documents ────────────────────────────────────────────
    {
      name: 'keyDocuments',
      title: 'Key Documents',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'sogiceDocument' }] }],
      description: 'Canonical corpus documents that exemplify or define this tactic.',
    },

    // ── Relationships ────────────────────────────────────────────
    {
      name: 'linkedLexiconTerms',
      title: 'Linked Lexicon Terms',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'lexiconEntry' }] }],
      description: 'Terms that operationalize, euphemize, or signal this tactic.',
    },
    {
      name: 'relatedTactics',
      title: 'Related Tactics',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'tacticRef', title: 'Tactic', type: 'reference', to: [{ type: 'tacticEntry' }] },
          {
            name: 'relationship',
            title: 'Relationship',
            type: 'string',
            options: {
              list: [
                'pairs_with',     // commonly co-deployed
                'precedes',       // this tactic sets up the other
                'escalates_to',   // this tactic intensifies into the other
                'subset_of',      // this is a specific instance of the other
                'contrasts_with', // conceptually adjacent but distinct
              ],
            },
          },
        ],
      }],
    },
    {
      name: 'linkedOrganizations',
      title: 'Organizations Using This Tactic',
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
    { name: 'lastReanalyzed', type: 'datetime' },

    // ── Validation History ───────────────────────────────────────
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
            options: { list: ['confirm', 'revise', 'merge', 'deprecate'] },
          },
          { name: 'reasoning', type: 'text', rows: 3 },
          { name: 'resolvedByResearcher', type: 'boolean' },
        ],
      }],
    },
  ],

  preview: {
    select: { title: 'tactic', subtitle: 'primaryCluster' },
  },
}
