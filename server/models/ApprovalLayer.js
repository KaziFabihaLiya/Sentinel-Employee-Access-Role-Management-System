// server/models/ApprovalLayer.js
const mongoose = require('mongoose');

/**
 * ApprovalLayer — one step in a workflow.
 * layerLevel 1 = first approver (e.g. Line Manager), 2 = second, etc.
 */
const approvalLayerSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalWorkflow',
      required: true,
    },

    layerName: {
      type: String,
      required: [true, 'Layer name is required'],
      trim: true,
      maxlength: 100,
      // e.g. "Line Manager", "Senior Manager", "Department Head", "Senior Director"
    },

    layerLevel: {
      type: Number,
      required: true,
      min: 1,
      // Lower number = earlier in the chain
    },

    // Functional role tag used to find assigned approvers
    approvalRoleType: {
      type: String,
      required: true,
      enum: [
        'LINE_MANAGER',
        'SENIOR_MANAGER',
        'HEAD',
        'SENIOR_DIRECTOR',
        'ADMIN',
        'CUSTOM',
      ],
      default: 'LINE_MANAGER',
    },

    // Minimum number of distinct approvers needed at this layer
    requiredApprovers: { type: Number, default: 1, min: 1 },

    // ANY_ONE: any single assigned approver can move it forward
    // ALL_REQUIRED: every assigned approver must act
    approvalType: {
      type: String,
      enum: ['ANY_ONE', 'ALL_REQUIRED'],
      default: 'ANY_ONE',
    },

    // Service Level Agreement: hours until auto-escalation kicks in
    slaHours: { type: Number, default: 24, min: 1 },

    escalationEnabled: { type: Boolean, default: true },

    // If escalation fires, route to this layer's approvers (usually next layer)
    escalationTarget: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalLayer',
      default: null,
    },

    // Separate auto-escalation threshold — can be different from slaHours
    autoEscalateAfterHours: { type: Number, default: 48 },

    description: { type: String, default: '', maxlength: 300 },

    // If true, this layer can be skipped when a higher-layer approver acts first
    isOptional: { type: Boolean, default: false },
  },
  { timestamps: true }
);

approvalLayerSchema.index({ workflowId: 1, layerLevel: 1 });

module.exports = mongoose.model('ApprovalLayer', approvalLayerSchema);