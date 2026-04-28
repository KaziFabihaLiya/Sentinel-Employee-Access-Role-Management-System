// server/models/AuditLog.js
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
      ],
    },

    details:    { type: String, default: '' },   // Human-readable description
    resource:   { type: String, default: '' },   // e.g. "AccessRequest:abc123"
    ipAddress:  { type: String, default: '' },
  },
  { timestamps: true }
);

// Indexes for fast querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);