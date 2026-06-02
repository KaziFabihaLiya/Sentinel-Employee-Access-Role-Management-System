
/**
 * Middleware functions specific to the multi-level approval system.
 * Works alongside the existing authMiddleware (protect / authorize).
 */

const AccessRequest      = require('../models/AccessRequest');
const ApprovalLayer      = require('../models/ApprovalLayer');
const ApprovalAssignment = require('../models/ApprovalAssignment');
const ApprovalHistory    = require('../models/ApprovalHistory');
const AuditLog           = require('../models/AuditLog');
const { validateRuleCondition } = require('../utils/workflowHelper');

// ─────────────────────────────────────────────────────────────────────────────

/**
 * validateWorkflowId
 * Confirms :workflowId param resolves to an existing ApprovalWorkflow.
 */
const validateWorkflowId = async (req, res, next) => {
  try {
    const { ApprovalWorkflow } = require('../models/ApprovalWorkflow');
    // Lazy require to avoid circular deps
    const ApprovalWorkflowModel = require('../models/ApprovalWorkflow');
    const wf = await ApprovalWorkflowModel.findById(req.params.workflowId || req.body.workflowId);
    if (!wf) return res.status(404).json({ message: 'Workflow not found' });
    req.workflow = wf;
    next();
  } catch {
    return res.status(400).json({ message: 'Invalid workflow ID' });
  }
};

/**
 * validateLayerId
 * Confirms :layerId param resolves to an existing ApprovalLayer.
 */
const validateLayerId = async (req, res, next) => {
  try {
    const layer = await ApprovalLayer.findById(req.params.layerId || req.body.layerId);
    if (!layer) return res.status(404).json({ message: 'Approval layer not found' });
    req.layer = layer;
    next();
  } catch {
    return res.status(400).json({ message: 'Invalid layer ID' });
  }
};

/**
 * validateApprovalRequest
 * Confirms the AccessRequest:
 *   - exists
 *   - is currently Pending
 *   - has a workflow attached
 */
const validateApprovalRequest = async (req, res, next) => {
  try {
    const request = await AccessRequest.findById(req.params.requestId || req.params.id)
      .populate('workflowId currentApprovalLayerId');
    if (!request)              return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending')
      return res.status(400).json({ message: `Request is already ${request.status}` });
    if (!request.workflowId)
      return res.status(400).json({ message: 'No workflow attached — use legacy approval endpoint' });

    req.accessRequest = request;
    next();
  } catch {
    return res.status(400).json({ message: 'Invalid request ID' });
  }
};

/**
 * checkApprovalAuthority
 * Verifies the acting user:
 *   a) is listed in currentApproverIds, OR
 *   b) is assigned to a layer with a higher level (senior override), OR
 *   c) is an admin
 *
 * Attaches req.approvalLayerId (the layer the user has authority to act on).
 */
const checkApprovalAuthority = async (req, res, next) => {
  try {
    const userId  = req.user._id;
    const request = req.accessRequest;

    // Admins can always act
    if (req.user.role === 'admin') {
      req.approvalLayerId = request.currentApprovalLayerId?._id || request.currentApprovalLayerId;
      return next();
    }

    // Check if user is a current approver
    const isCurrentApprover = request.currentApproverIds
      .some(id => String(id) === String(userId));

    if (isCurrentApprover) {
      req.approvalLayerId = request.currentApprovalLayerId?._id || request.currentApprovalLayerId;
      return next();
    }

    // Check if user is assigned to any layer in this workflow (senior override)
    const assignment = await ApprovalAssignment.findOne({
      userId,
      isActive: true,
    }).populate('layerId');

    if (assignment && assignment.layerId) {
      const assignedLevel = assignment.layerId.layerLevel;
      const currentLevel  = request.currentLayerLevel || 1;

      if (assignedLevel > currentLevel) {
        // Senior override — can skip to their layer
        req.approvalLayerId = assignment.layerId._id;
        req.isSeniorOverride = true;
        return next();
      }
    }

    return res.status(403).json({
      message: 'You are not authorised to approve this request at the current stage',
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * checkDailyLimit
 * Rejects the request if the approver has already hit 5 approvals today.
 */
const checkDailyLimit = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await ApprovalHistory.countDocuments({
      approvedBy:     req.user._id,
      approvalAction: 'APPROVED',
      createdAt:      { $gte: startOfDay },
    });

    if (count >= 5) {
      return res.status(429).json({
        message: 'Daily approval limit reached (max 5 per day). Please delegate or try tomorrow.',
        limit: 5,
        used:  count,
      });
    }

    req.approvalsToday = count;
    next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * validateRuleBody
 * Used on POST/PUT rule endpoints — validates the ruleCondition structure.
 */
const validateRuleBody = (req, res, next) => {
  const { ruleCondition } = req.body;
  if (!ruleCondition) {
    return res.status(400).json({ message: 'ruleCondition is required' });
  }

  const { valid, errors } = validateRuleCondition(ruleCondition);
  if (!valid) {
    return res.status(400).json({ message: 'Invalid rule condition', errors });
  }

  next();
};

/**
 * auditApprovalAction — non-blocking audit middleware.
 * Call AFTER the main handler sends its response to avoid blocking.
 * Usage: router.patch('/:id/approve', protect, ..., handler, auditApprovalAction)
 *
 * In practice it's easier to audit inside the controller, so this is
 * an optional convenience wrapper.
 */
const auditApprovalAction = (action) => async (req, res, next) => {
  // This runs after res.json() — the response is already sent
  const resource = `AccessRequest:${req.params.requestId || req.params.id}`;
  AuditLog.create({
    userId:    req.user._id,
    userName:  req.user.fullName,
    userEmail: req.user.email,
    userRole:  req.user.role,
    action,
    details:   `${req.user.fullName} performed ${action} on ${resource}`,
    resource,
    ipAddress: req.ip || '',
  }).catch(() => {});
  next();
};

module.exports = {
  validateWorkflowId,
  validateLayerId,
  validateApprovalRequest,
  checkApprovalAuthority,
  checkDailyLimit,
  validateRuleBody,
  auditApprovalAction,
};