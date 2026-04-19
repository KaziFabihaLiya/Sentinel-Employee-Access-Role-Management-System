const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName:  { type: String },
    userEmail: { type: String },
    action:    { type: String, required: true }, // e.g. 'REQUEST_SUBMITTED'
    resource:  { type: String },                 // e.g. 'AccessRequest'
    resourceId:{ type: String },
    details:   { type: String },
    ipAddress: { type: String, default: '—' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);