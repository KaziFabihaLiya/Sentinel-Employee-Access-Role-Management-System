// server/models/ApprovalRule.js
const mongoose = require('mongoose');

/**
 * ApprovalRule — conditional routing within a workflow.
 *
 * Example ruleCondition:
 * {
 *   "operator": "AND",
 *   "conditions": [
 *     { "field": "riskLevel",  "operator": "EQUALS",       "value": "high"  },
 *     { "field": "department", "operator": "EQUALS",       "value": "Finance" }
 *   ]
 * }
 *
 * Supported field operators: EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, CONTAINS, IN
 * Top-level operators: AND, OR
 */

// Nested condition sub-document (not a full model — just schema shape)
const conditionNodeSchema = new mongoose.Schema(
  {
    // For leaf nodes
    field:    { type: String, default: '' }, // e.g. "riskLevel", "department"
    operator: { type: String, default: '' }, // e.g. "EQUALS", "GREATER_THAN"
    value:    { type: mongoose.Schema.Types.Mixed, default: null },

    // For compound nodes
    logicalOperator: { type: String, enum: ['AND', 'OR', ''], default: '' },
    conditions:      { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const approvalRuleSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApprovalWorkflow',
      required: true,
    },

    ruleName:    { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 300 },

    // JSON object stored as Mixed — validated in workflowHelper.validateRuleCondition()
    ruleCondition: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // The layers that should be added/activated when this rule matches
    targetLayers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApprovalLayer',
      },
    ],

    // Lower number = evaluated first
    priority: { type: Number, default: 100 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

approvalRuleSchema.index({ workflowId: 1, isActive: 1, priority: 1 });

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);