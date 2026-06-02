// server/models/ApprovalAssignment.js
const mongoose = require('mongoose');

/**
 * ApprovalAssignment — maps a specific User to a specific ApprovalLayer.
 * Supports per-person, per-designation, per-department scoping.
 * Multiple users can be assigned to the same layer; the approvalType on
 * ApprovalLayer determines whether ALL or ANY must act.
 */
const approvalAssignmentSchema = new mongoose.Schema(
  {
    layerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalLayer',
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Stored for quick filtering without populating User
    approverRole: {
      type: String,
      required: true,
      // e.g. "LINE_MANAGER", "SENIOR_MANAGER", "HEAD", "SENIOR_DIRECTOR"
    },

    // The department(s) this assignment covers — '*' = all
    departments: {
      type: [String],
      default: ['*'],
    },

    // The designation (jobTitle) this assignment covers — '*' = all
    designation: { type: String, default: '*' },

    // Maximum approvals this person can grant per day (null = unlimited, system cap = 5)
    approvalLimit: { type: Number, default: 5, min: 1, max: 5 },

    // Backup approver — used when primary is absent or limit reached
    backupApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    isActive: { type: Boolean, default: true },

    startDate: { type: Date, default: Date.now },
    endDate:   { type: Date, default: null }, // null = ongoing
  },
  { timestamps: true }
);

// Prevent duplicate (layerId + userId) pairs
approvalAssignmentSchema.index({ layerId: 1, userId: 1 }, { unique: true });
approvalAssignmentSchema.index({ userId: 1, isActive: 1 });
approvalAssignmentSchema.index({ layerId: 1, isActive: 1 });

module.exports = mongoose.model('ApprovalAssignment', approvalAssignmentSchema);