const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ['policy', 'role', 'workflow', 'request'],
      required: true,
    },
    sourceId: { type: String, default: null },   // original MongoDB _id as string
    title: { type: String, required: true },
    embedding: { type: [Number], required: true }, // 384 floats
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// TTL: auto-delete request chunks after 7 days so stale request data
// doesn't pollute search results. Role/workflow/policy chunks are permanent.
knowledgeChunkSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7, partialFilterExpression: { type: 'request' } }
);

module.exports = mongoose.model('KnowledgeChunk', knowledgeChunkSchema, 'knowledgechunks');
