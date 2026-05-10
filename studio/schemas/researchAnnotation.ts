export default {
  name: 'researchAnnotation',
  title: 'Research Annotation',
  type: 'document',
  fields: [
    {
      name: 'sourceDocument',
      title: 'Source Document',
      type: 'reference',
      to: [{ type: 'sogiceDocument' }],
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'profile',
      type: 'string',
      options: {
        list: [
          'visual_network', 'search_discovery', 'shame_article',
          'documentary_analysis', 'podcast_analysis', 'testimony_analysis',
          'anti_gender_network', 'public_website_table',
        ],
      },
      validation: (Rule: any) => Rule.required(),
    },
    { name: 'profileVersion', type: 'string' },
    {
      name: 'annotationStatus',
      type: 'string',
      options: { list: ['model_generated', 'researcher_reviewed', 'corrected', 'rejected'] },
      initialValue: 'model_generated',
    },
    { name: 'modelProvider', type: 'string' },
    { name: 'modelName', type: 'string' },
    { name: 'resolvedModelName', type: 'string' },
    { name: 'promptVersion', type: 'string' },
    { name: 'schemaVersion', type: 'string' },
    { name: 'inputTextHash', type: 'string' },
    { name: 'inputAnalysisHash', type: 'string' },
    { name: 'generatedAt', type: 'datetime' },
    { name: 'reviewedAt', type: 'datetime' },
    { name: 'reviewerNotes', type: 'text', rows: 3 },
    {
      name: 'sourceStance',
      type: 'string',
      options: {
        list: ['pro_sogice', 'anti_sogice', 'media_coverage', 'mixed', 'ambiguous'],
      },
    },
    {
      name: 'resultJson',
      title: 'Result JSON',
      type: 'object',
      fields: [
        {
          name: 'sourceStance',
          type: 'string',
          options: {
            list: ['pro_sogice', 'anti_sogice', 'media_coverage', 'mixed', 'ambiguous'],
          },
        },
        {
          name: 'notes',
          title: 'Studio Notes',
          type: 'text',
          rows: 2,
          description: 'The API may store additional profile-specific keys in this object.',
        },
      ],
    },
    {
      name: 'publicVisibility',
      type: 'string',
      options: {
        list: [
          'private', 'internal_research', 'public_metadata_only',
          'public_table_candidate', 'published',
        ],
      },
      initialValue: 'private',
    },
  ],
  preview: {
    select: {
      title: 'profile',
      subtitle: 'annotationStatus',
    },
  },
}
