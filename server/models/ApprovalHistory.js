// server/models/ApprovalHistory.js
const mongoose = require('mongoose');

/**
 * ApprovalHistory — immutable audit record for every individual approval action.
 * One record per (requestId + layerId + action). This is the compliance trail.
 */
const approvalHistorySchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccessRequest',
      required: true,
    },

    layerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalLayer',
      required: true,
    },

    // The user who acted (null for system actions like auto-escalation)
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    approvalAction: {
      type: String,
      required: true,
      enum: ['APPROVED', 'REJECTED', 'ESCALATED', 'PENDING', 'DELEGATED', 'SKIPPED'],
    },

    approvalComments: { type: String, default: '' },

    // Layer-level SLA info
    slaDeadline:    { type: Date,    default: null },
    slaBreached:    { type: Boolean, default: false },
    timeToApprove:  { type: Number,  default: null }, // minutes from layer start to action

    // Delegation info
    delegatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Rejection detail
    rejectionReason:  { type: String, default: '' },
    resubmitRequired: { type: Boolean, default: false },

    // Snapshot for auditors
    previousStatus: { type: String, default: '' },
    newStatus:      { type: String, default: '' },

    // Escalation tracking
    escalationCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // Prevent mutation after creation — approval records are append-only
    // (enforce in application layer; schema allows updates for SLA breach flag)
  }
);

approvalHistorySchema.index({ requestId: 1, createdAt: -1 });
approvalHistorySchema.index({ approvedBy: 1, createdAt: -1 });
approvalHistorySchema.index({ layerId: 1, approvalAction: 1 });
approvalHistorySchema.index({ slaBreached: 1 });

module.exports = mongoose.model('ApprovalHistory', approvalHistorySchema);