// server/models/AccessRequest.js
const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department:    { type: String, required: true },
    jobTitle:      { type: String, required: true },
    requestedRole: { type: String, required: true },
    justification: { type: String, required: true, minlength: 20 },
    accessDuration:{ type: String, default: 'Permanent' },

    status: {
      type:    String,
      enum:    ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },

    //    Auto-calculated on submission                                         ─
    riskLevel: {
      type:    String,
      enum:    ['low', 'medium', 'high'],
      default: 'low',
    },

    managerComment: { type: String,  default: '' },
    reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt:     { type: Date,    default: null },
  },
  { timestamps: true }
);

// Index for faster employee queries
accessRequestSchema.index({ employee: 1, createdAt: -1 });
accessRequestSchema.index({ status: 1 });

module.exports = mongoose.model('AccessRequest', accessRequestSchema);