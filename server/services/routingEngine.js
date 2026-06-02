// server/services/routingEngine.js
/**
 * RoutingEngine — matches requests to workflows and resolves approvers.
 *
 * Matching priority (first match wins):
 *   1. Exact department + exact accessType (or riskLevel)
 *   2. Exact department + wildcard accessType
 *   3. Wildcard department + exact accessType
 *   4. Fully wildcard (catch-all) workflow
 */

const ApprovalWorkflow   = require('../models/ApprovalWorkflow');
const ApprovalLayer      = require('../models/ApprovalLayer');
const ApprovalRule       = require('../models/ApprovalRule');
const ApprovalAssignment = require('../models/ApprovalAssignment');
const User               = require('../models/User');
const ApprovalHistory    = require('../models/ApprovalHistory');

const { evaluateConditionLogic } = require('../utils/workflowHelper');

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the best active workflow for a request's attributes.
 * Falls back through specificity levels until a match is found.
 *
 * @param {{ department, requestedRole, riskLevel, accessDuration }} attrs
 * @returns {ApprovalWorkflow|null}
 */
async function findWorkflowForRequest(attrs) {
  const { department, riskLevel } = attrs;

  // Derive a loose "accessType" category from riskLevel for matching
  const riskCategory = riskLevel === 'high'
    ? 'High'
    : riskLevel === 'medium'
    ? 'Medium'
    : 'Standard';

  const candidates = await ApprovalWorkflow.find({ isActive: true })
    .populate({
      path: 'approvalLayers',
      options: { sort: { layerLevel: 1 } },
    })
    .sort({ priority: 1 }); // lower priority number = evaluated first

  for (const wf of candidates) {
    const deptMatch = wf.applicableDepartments.includes('*') ||
                      wf.applicableDepartments.includes(department);

    const typeMatch = wf.applicableAccessTypes.includes('*') ||
                      wf.applicableAccessTypes.includes(riskCategory);

    const riskMatch = wf.applicableRiskLevels.includes('*') ||
                      wf.applicableRiskLevels.includes(riskLevel);

    if (deptMatch && typeMatch && riskMatch) {
      // Also evaluate any conditional rules
      if (wf.workflowType === 'CONDITIONAL') {
        const rulesMatch = await evaluateRules(wf._id, attrs);
        if (rulesMatch.length === 0) continue; // rules didn't fire — skip
      }
      return wf;
    }
  }

  return null; // no match → legacy single-level flow
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate all active rules for a workflow against request attributes.
 * Returns the matching layers from rules, sorted by priority.
 *
 * @param {ObjectId} workflowId
 * @param {Object}   requestAttributes
 * @returns {ApprovalLayer[]}
 */
async function evaluateRules(workflowId, requestAttributes) {
  const rules = await ApprovalRule.find({ workflowId, isActive: true })
    .sort({ priority: 1 });

  const matchedLayerIds = new Set();

  for (const rule of rules) {
    const matches = evaluateConditionLogic(rule.ruleCondition, requestAttributes);
    if (matches) {
      rule.targetLayers.forEach(id => matchedLayerIds.add(String(id)));
    }
  }

  if (matchedLayerIds.size === 0) return [];

  return ApprovalLayer.find({ _id: { $in: [...matchedLayerIds] } })
    .sort({ layerLevel: 1 });
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROVER RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find active approvers for a specific layer + department.
 * Falls back to backup approvers if primary has hit daily limit.
 *
 * @param {ObjectId} layerId
 * @param {string}   department
 * @returns {User[]}
 */
async function findApproversForLayer(layerId, department) {
  const assignments = await ApprovalAssignment.find({
    layerId,
    isActive: true,
    $or: [
      { endDate: null },
      { endDate: { $gte: new Date() } },
    ],
  }).populate('userId backupApproverId');

  // Filter by department scope
  const scoped = assignments.filter(a =>
    a.departments.includes('*') || a.departments.includes(department)
  );

  if (!scoped.length) {
    // Fallback: look for managers in the department with the matching approvalRoleType
    return _fallbackToRoleBasedApprovers(layerId, department);
  }

  const resolvedApprovers = [];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  for (const assignment of scoped) {
    const primaryUser = assignment.userId;
    if (!primaryUser || !primaryUser.isActive) continue;

    // Check daily limit
    const todayCount = await ApprovalHistory.countDocuments({
      approvedBy:     primaryUser._id,
      approvalAction: 'APPROVED',
      createdAt:      { $gte: startOfDay },
    });

    if (todayCount < assignment.approvalLimit) {
      resolvedApprovers.push(primaryUser);
    } else if (assignment.backupApproverId) {
      // Primary hit limit — try backup
      const backup = assignment.backupApproverId;
      if (backup && backup.isActive) {
        resolvedApprovers.push(backup);
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  return resolvedApprovers.filter(u => {
    const id = String(u._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Fallback: find approvers by role from the User collection.
 * Maps ApprovalLayer.approvalRoleType → User.role
 */
async function _fallbackToRoleBasedApprovers(layerId, department) {
  const layer = await ApprovalLayer.findById(layerId);
  if (!layer) return [];

  // Map role type → system role
  const roleMap = {
    LINE_MANAGER:    'manager',
    SENIOR_MANAGER:  'manager',
    HEAD:            'manager',
    SENIOR_DIRECTOR: 'admin',
    ADMIN:           'admin',
    CUSTOM:          'manager',
  };

  const systemRole = roleMap[layer.approvalRoleType] || 'manager';

  return User.find({
    role:       systemRole,
    isActive:   true,
    department, // same department
  }).select('fullName email department jobTitle role');
}

/**
 * assignApproversToRequest — convenience wrapper that stamps currentApproverIds
 * on an AccessRequest (called by workflowEngine after layer advance).
 *
 * @param {string}      requestId
 * @param {ObjectId[]}  approverIds
 */
async function assignApproversToRequest(requestId, approverIds) {
  const AccessRequest = require('../models/AccessRequest');
  await AccessRequest.findByIdAndUpdate(requestId, {
    currentApproverIds: approverIds,
  });
}

/**
 * resolveApprovalPath — returns all layers that will be traversed for a request.
 * Used by the frontend to display the full approval timeline upfront.
 *
 * @param {string} workflowId
 * @returns {ApprovalLayer[]}
 */
async function resolveApprovalPath(workflowId) {
  return ApprovalLayer.find({ workflowId }).sort({ layerLevel: 1 });
}

module.exports = {
  findWorkflowForRequest,
  evaluateRules,
  findApproversForLayer,
  assignApproversToRequest,
  resolveApprovalPath,
};