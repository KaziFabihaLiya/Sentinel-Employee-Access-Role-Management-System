const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: { type: String, required: true },
    jobTitle:   { type: String, required: true },
    requestedRole: { type: String, required: true },
    justification: { type: String, required: true },
    accessDuration: { type: String, default: 'Permanent' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    managerComment: { type: String, default: '' },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AccessRequest', accessRequestSchema);