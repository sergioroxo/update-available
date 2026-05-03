export default {
  name: 'ingestionBatch',
  title: 'Ingestion Batch',
  type: 'document',
  fields: [
    {
      name: 'batchId',
      title: 'Batch ID (e.g. batch-01)',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
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
      options: { list: ['researcher'] },
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
