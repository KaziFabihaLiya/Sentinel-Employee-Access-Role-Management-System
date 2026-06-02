// server/models/AuditLog.js
// UPDATED — extended action enum to include multi-level approval events.
// All original actions preserved; new ones appended.
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userName:  { type: String, default: 'System' },
    userEmail: { type: String, default: '' },
    userRole:  { type: String, default: '' },

    action: {
      type: String,
      required: true,
      enum: [
        // ── Original actions ─────────────────────────────────────────────────
        'REQUEST_SUBMITTED',
        'REQUEST_APPROVED',
        'REQUEST_REJECTED',
        'ACCESS_REVOKED',
        'ROLE_CREATED',
        'ROLE_UPDATED',
        'ROLE_DELETED',
        'USER_ACTIVATED',
        'USER_DEACTIVATED',
        'USER_DELETED',
        'ROLE_CHANGED',
        'USER_LOGIN',
        'USER_REGISTERED',
        'PROFILE_UPDATED',
        'PASSWORD_CHANGED',

        // ── New workflow/approval actions ────────────────────────────────────
        'WORKFLOW_CREATED',
        'WORKFLOW_UPDATED',
        'WORKFLOW_DELETED',
        'WORKFLOW_ACTIVATED',
        'WORKFLOW_DEACTIVATED',

        'LAYER_CREATED',
        'LAYER_UPDATED',
        'LAYER_DELETED',

        'RULE_CREATED',
        'RULE_UPDATED',
        'RULE_DELETED',

        'APPROVAL_ASSIGNMENT_CREATED',
        'APPROVAL_ASSIGNMENT_UPDATED',
        'APPROVAL_ASSIGNMENT_DELETED',

        'LAYER_APPROVED',          // A specific layer was approved
        'LAYER_REJECTED',          // A specific layer was rejected
        'LAYER_ESCALATED',         // A layer was escalated (manual or auto)
        'LAYER_DELEGATED',         // Approval delegated to another user
        'LAYER_SKIPPED',           // Layer skipped by higher-level approver

        'WORKFLOW_INITIALIZED',    // Workflow engine attached to a new request
        'WORKFLOW_COMPLETED',      // All layers approved → request Approved
        'WORKFLOW_TERMINATED',     // Workflow ended due to rejection (not resubmit)

        'SLA_BREACHED',            // SLA deadline missed
        'AUTO_ESCALATION_FIRED',   // Cron job triggered escalation
      ],
    },

    details:    { type: String, default: '' },
    resource:   { type: String, default: '' }, // e.g. "AccessRequest:abc123"
    ipAddress:  { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ resource: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);