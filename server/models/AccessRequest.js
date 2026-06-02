// server/models/AccessRequest.js
// ─────────────────────────────────────────────────────────────────────────────
// UPDATED — adds multi-level approval fields while keeping all original fields.
// Existing single-level requests (no workflowId) continue to work unchanged.
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require('mongoose');

// Per-layer status snapshot stored inside the document (quick reads)
const layerStatusSchema = new mongoose.Schema(
  {
    layerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalLayer' },
    layerName:    { type: String, default: '' },
    layerLevel:   { type: Number },
    status:       { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'SKIPPED', 'ESCALATED'], default: 'PENDING' },
    approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvalDate: { type: Date, default: null },
    comments:     { type: String, default: '' },
    slaDeadline:  { type: Date, default: null },
    slaBreached:  { type: Boolean, default: false },
  },
  { _id: false }
);

const accessRequestSchema = new mongoose.Schema(
  {
    // ── ORIGINAL FIELDS (unchanged) ──────────────────────────────────────────
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

    riskLevel: {
      type:    String,
      enum:    ['low', 'medium', 'high'],
      default: 'low',
    },

    managerComment: { type: String, default: '' },
    reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt:     { type: Date, default: null },

    // ── NEW MULTI-LEVEL APPROVAL FIELDS ──────────────────────────────────────
    // Set when a matching workflow is found on submission; null = legacy single-level flow
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalWorkflow',
      default: null,
    },

    // Pointer to the ApprovalLayer currently awaiting action
    currentApprovalLayerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalLayer',
      default: null,
    },

    // Layer level number of the current layer (denormalized for quick queries)
    currentLayerLevel: { type: Number, default: null },

    // Array of User IDs whose action is required right now
    currentApproverIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Quick snapshot of each layer's outcome — keyed by layerId string
    layerStatuses: { type: [layerStatusSchema], default: [] },

    // References to ApprovalHistory documents for full audit detail
    approvalHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApprovalHistory',
      },
    ],

    // SLA deadline for the CURRENT layer
    slaDeadline: { type: Date, default: null },

    // How many times this request has been auto-escalated total
    escalationCount: { type: Number, default: 0 },
    lastEscalationAt: { type: Date, default: null },

    // Rejection tracking (resets to 0 when resubmitted)
    rejectedCount: { type: Number, default: 0 },

    // Set when the whole workflow completes (all layers approved)
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
accessRequestSchema.index({ employee: 1, createdAt: -1 });
accessRequestSchema.index({ status: 1 });
accessRequestSchema.index({ workflowId: 1, status: 1 });
accessRequestSchema.index({ currentApproverIds: 1, status: 1 }); // approver pending list
accessRequestSchema.index({ slaDeadline: 1, status: 1 });        // escalation cron

module.exports = mongoose.model('AccessRequest', accessRequestSchema);