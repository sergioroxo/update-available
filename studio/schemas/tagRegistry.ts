// Generic controlled-vocabulary registry for document classification tags.
// Categories: Type, Format, Evidence, Country, Function, Harm, Migration.
// Network tags are stored as organization records (orgType: network).
export default {
  name: 'tagRegistry',
  title: 'Tag Registry',
  type: 'document',
  fields: [

    // ── Core ────────────────────────────────────────────────────
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
      options: {
        list: [
          { title: 'Type — document type classification', value: 'Type' },
          { title: 'Format — file/media format', value: 'Format' },
          { title: 'Evidence — evidence tier', value: 'Evidence' },
          { title: 'Country — geographic origin', value: 'Country' },
          { title: 'Function — lexical/rhetorical function', value: 'Function' },
          { title: 'Harm — harm profile', value: 'Harm' },
          { title: 'Migration — migration/asylum dimension', value: 'Migration' },
        ],
      },
    },
    {
      name: 'tag',
      title: 'Tag (full label)',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
      description: 'Exact tag string used in ingestion pipeline, e.g. "Type: Academic".',
    },
    {
      name: 'slug',
      title: 'Slug (machine key)',
      type: 'slug',
      options: { source: 'tag' },
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['active', 'deprecated', 'candidate'] },
      initialValue: 'active',
    },

    // ── Semantics ───────────────────────────────────────────────
    {
      name: 'definition',
      title: 'Definition',
      type: 'text',
      rows: 3,
      description: 'What this tag means and when to apply it.',
    },
    {
      name: 'taggingRule',
      title: 'Tagging Rule',
      type: 'text',
      rows: 2,
      description: 'When to apply this tag. When NOT to apply it.',
    },
    {
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 2,
      description: 'Edge cases, disambiguation notes, or alignment notes with ingestion prompt.',
    },

    // ── Alignment Notes ─────────────────────────────────────────
    {
      name: 'promptAlignment',
      title: 'Ingestion Prompt Alignment',
      type: 'string',
      options: {
        list: [
          { title: 'Exact match — same label in prompt vocabulary', value: 'exact' },
          { title: 'Synonym — different label, same concept', value: 'synonym' },
          { title: 'Subset — this tag is a subset of a prompt category', value: 'subset' },
          { title: 'Superseded — prompt uses different taxonomy', value: 'superseded' },
          { title: 'CSV-only — not in current prompt vocabulary', value: 'csv-only' },
        ],
      },
    },
    {
      name: 'promptEquivalent',
      title: 'Prompt Vocabulary Equivalent',
      type: 'string',
      description: 'If different from tag, the label used in the ingestion prompt.',
    },

    // ── Frequency ───────────────────────────────────────────────
    { name: 'frequency', title: 'Frequency (document count)', type: 'number', initialValue: 0 },
  ],

  preview: {
    select: { title: 'tag', subtitle: 'category' },
  },
}
