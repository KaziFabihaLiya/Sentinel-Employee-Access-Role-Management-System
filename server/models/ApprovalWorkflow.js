// server/models/ApprovalWorkflow.js
const mongoose = require('mongoose');

/**
 * ApprovalWorkflow — top-level container for a multi-layer approval process.
 * A workflow is matched to an incoming AccessRequest based on
 * applicableAccessTypes + applicableDepartments (or the catch-all "*").
 */
const approvalWorkflowSchema = new mongoose.Schema(
  {
    workflowName: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
      maxlength: 120,
    },
    description: { type: String, default: '', maxlength: 500 },

    isActive: { type: Boolean, default: true },

    workflowType: {
      type: String,
      enum: ['SEQUENTIAL', 'PARALLEL', 'CONDITIONAL'],
      default: 'SEQUENTIAL',
    },

    // Ordered references to ApprovalLayer documents
    approvalLayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApprovalLayer',
      },
    ],

    // e.g. ['Database', 'System', 'Physical', 'Finance', '*'] — '*' = catch-all
    applicableAccessTypes: {
      type: [String],
      default: ['*'],
    },

    // e.g. ['IT', 'Finance', '*'] — '*' = all departments
    applicableDepartments: {
      type: [String],
      default: ['*'],
    },

    // Risk levels this workflow applies to: 'low', 'medium', 'high', '*'
    applicableRiskLevels: {
      type: [String],
      default: ['*'],
    },

    // Priority when multiple workflows match (lower number = higher priority)
    priority: { type: Number, default: 100 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

approvalWorkflowSchema.index({ isActive: 1, priority: 1 });
approvalWorkflowSchema.index({ applicableAccessTypes: 1 });
approvalWorkflowSchema.index({ applicableDepartments: 1 });

module.exports = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);