
/**
 * Admin-only routes for managing approval workflows, layers, rules, and assignments.
 * All routes require: protect + authorize('admin')
 */

const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRuleBody }   = require('../middleware/workflowMiddleware');

const ApprovalWorkflow   = require('../models/ApprovalWorkflow');
const ApprovalLayer      = require('../models/ApprovalLayer');
const ApprovalRule       = require('../models/ApprovalRule');
const ApprovalAssignment = require('../models/ApprovalAssignment');
const AuditLog           = require('../models/AuditLog');
const routingEngine      = require('../services/routingEngine');
const slaService         = require('../services/slaService');
const escalationService  = require('../services/escalationService');
const { evaluateConditionLogic, formatWorkflowResponse } = require('../utils/workflowHelper');

// All routes admin-only
router.use(protect, authorize('admin'));

// ── Audit helper ──────────────────────────────────────────────────────────────
const audit = (req, action, details, resource = '') =>
  AuditLog.create({
    userId: req.user._id, userName: req.user.fullName,
    userEmail: req.user.email, userRole: 'admin',
    action, details, resource,
    ipAddress: req.ip || '',
  }).catch(() => {});

// ═════════════════════════════════════════════════════════════════════════════
// WORKFLOWS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/admin/workflows
router.get('/workflows', async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.department) filter.applicableDepartments = { $in: [req.query.department, '*'] };

    const workflows = await ApprovalWorkflow.find(filter)
      .populate({ path: 'approvalLayers', options: { sort: { layerLevel: 1 } } })
      .sort({ priority: 1 })
      .lean();

    res.json({ workflows: workflows.map(formatWorkflowResponse), total: workflows.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/workflows
router.post('/workflows', async (req, res) => {
  try {
    const {
      workflowName, description, workflowType,
      applicableAccessTypes, applicableDepartments,
      applicableRiskLevels, priority,
    } = req.body;

    if (!workflowName) return res.status(400).json({ message: 'workflowName is required' });

    const workflow = await ApprovalWorkflow.create({
      workflowName, description,
      workflowType:          workflowType          || 'SEQUENTIAL',
      applicableAccessTypes: applicableAccessTypes || ['*'],
      applicableDepartments: applicableDepartments || ['*'],
      applicableRiskLevels:  applicableRiskLevels  || ['*'],
      priority:              priority              ?? 100,
      isActive:              true,
      createdBy:             req.user._id,
    });

    await audit(req, 'WORKFLOW_CREATED',
      `Created workflow "${workflowName}"`, `ApprovalWorkflow:${workflow._id}`);

    res.status(201).json({ workflow, status: 'created' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/workflows/:workflowId
router.get('/workflows/:workflowId', async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.workflowId)
      .populate({ path: 'approvalLayers', options: { sort: { layerLevel: 1 } } });
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    const rules = await ApprovalRule.find({ workflowId: workflow._id, isActive: true })
      .sort({ priority: 1 });

    res.json({ workflow: formatWorkflowResponse(workflow), rules });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/workflows/:workflowId
router.put('/workflows/:workflowId', async (req, res) => {
  try {
    const allowed = [
      'workflowName','description','isActive','workflowType',
      'applicableAccessTypes','applicableDepartments','applicableRiskLevels','priority',
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const workflow = await ApprovalWorkflow.findByIdAndUpdate(
      req.params.workflowId, updates, { new: true, runValidators: true }
    );
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    const action = updates.isActive === true  ? 'WORKFLOW_ACTIVATED'
                 : updates.isActive === false ? 'WORKFLOW_DEACTIVATED'
                 : 'WORKFLOW_UPDATED';
    await audit(req, action, `Updated workflow "${workflow.workflowName}"`,
      `ApprovalWorkflow:${workflow._id}`);

    res.json({ workflow, status: 'updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/admin/workflows/:workflowId
router.delete('/workflows/:workflowId', async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findByIdAndDelete(req.params.workflowId);
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    // Cascade: delete layers, rules, assignments for this workflow
    const layers = await ApprovalLayer.find({ workflowId: req.params.workflowId });
    const layerIds = layers.map(l => l._id);
    await ApprovalLayer.deleteMany({ workflowId: req.params.workflowId });
    await ApprovalRule.deleteMany({ workflowId: req.params.workflowId });
    await ApprovalAssignment.deleteMany({ layerId: { $in: layerIds } });

    await audit(req, 'WORKFLOW_DELETED',
      `Deleted workflow "${workflow.workflowName}" and its ${layers.length} layers`,
      `ApprovalWorkflow:${req.params.workflowId}`);

    res.json({ status: 'deleted', deletedLayers: layers.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/workflows/:workflowId/preview
router.get('/workflows/:workflowId/preview', async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.workflowId);
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    const [layers, rules] = await Promise.all([
      ApprovalLayer.find({ workflowId: workflow._id }).sort({ layerLevel: 1 }),
      ApprovalRule.find({ workflowId: workflow._id, isActive: true }).sort({ priority: 1 }),
    ]);

    // Fetch assignments per layer
    const layersWithAssignments = await Promise.all(
      layers.map(async l => {
        const assignments = await ApprovalAssignment.find({ layerId: l._id, isActive: true })
          .populate('userId', 'fullName email jobTitle department')
          .populate('backupApproverId', 'fullName email');
        return { ...l.toObject(), assignments };
      })
    );

    res.json({
      workflow: formatWorkflowResponse(workflow),
      layers:   layersWithAssignments,
      rules,
      stats: {
        totalLayers:      layers.length,
        totalRules:       rules.length,
        estimatedSLAHours: layers.reduce((sum, l) => sum + (l.slaHours || 0), 0),
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// LAYERS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/admin/workflows/:workflowId/layers
router.get('/workflows/:workflowId/layers', async (req, res) => {
  try {
    const layers = await ApprovalLayer.find({ workflowId: req.params.workflowId })
      .sort({ layerLevel: 1 });
    res.json({ layers, total: layers.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/workflows/:workflowId/layers
router.post('/workflows/:workflowId/layers', async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.workflowId);
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    const {
      layerName, layerLevel, approvalRoleType, requiredApprovers,
      approvalType, slaHours, escalationEnabled, autoEscalateAfterHours,
      description, isOptional,
    } = req.body;

    if (!layerName)   return res.status(400).json({ message: 'layerName is required' });
    if (!layerLevel)  return res.status(400).json({ message: 'layerLevel is required' });
    if (!approvalRoleType) return res.status(400).json({ message: 'approvalRoleType is required' });

    const layer = await ApprovalLayer.create({
      workflowId: req.params.workflowId,
      layerName, layerLevel, approvalRoleType,
      requiredApprovers:      requiredApprovers      || 1,
      approvalType:           approvalType           || 'ANY_ONE',
      slaHours:               slaHours               || 24,
      escalationEnabled:      escalationEnabled      !== false,
      autoEscalateAfterHours: autoEscalateAfterHours || 48,
      description:            description            || '',
      isOptional:             isOptional             || false,
    });

    // Push layer ref into workflow
    await ApprovalWorkflow.findByIdAndUpdate(req.params.workflowId, {
      $addToSet: { approvalLayers: layer._id },
    });

    await audit(req, 'LAYER_CREATED',
      `Created layer "${layerName}" (level ${layerLevel}) in workflow "${workflow.workflowName}"`,
      `ApprovalLayer:${layer._id}`);

    res.status(201).json({ layer, status: 'created' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/layers/:layerId
router.put('/layers/:layerId', async (req, res) => {
  try {
    const allowed = [
      'layerName','layerLevel','approvalRoleType','requiredApprovers',
      'approvalType','slaHours','escalationEnabled','escalationTarget',
      'autoEscalateAfterHours','description','isOptional',
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const layer = await ApprovalLayer.findByIdAndUpdate(
      req.params.layerId, updates, { new: true, runValidators: true }
    );
    if (!layer) return res.status(404).json({ message: 'Layer not found' });

    await audit(req, 'LAYER_UPDATED',
      `Updated layer "${layer.layerName}"`, `ApprovalLayer:${layer._id}`);

    res.json({ layer, status: 'updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/admin/layers/:layerId
router.delete('/layers/:layerId', async (req, res) => {
  try {
    const layer = await ApprovalLayer.findByIdAndDelete(req.params.layerId);
    if (!layer) return res.status(404).json({ message: 'Layer not found' });

    // Remove from workflow's layers array
    await ApprovalWorkflow.findByIdAndUpdate(layer.workflowId, {
      $pull: { approvalLayers: layer._id },
    });
    // Clean up assignments for this layer
    await ApprovalAssignment.deleteMany({ layerId: layer._id });

    await audit(req, 'LAYER_DELETED',
      `Deleted layer "${layer.layerName}"`, `ApprovalLayer:${req.params.layerId}`);

    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/layers/:layerId/reorder
router.put('/layers/:layerId/reorder', async (req, res) => {
  try {
    const { newLayerLevel } = req.body;
    if (!newLayerLevel) return res.status(400).json({ message: 'newLayerLevel is required' });

    const layer = await ApprovalLayer.findByIdAndUpdate(
      req.params.layerId, { layerLevel: newLayerLevel }, { new: true }
    );
    if (!layer) return res.status(404).json({ message: 'Layer not found' });

    // Return all layers for this workflow re-sorted
    const layers = await ApprovalLayer.find({ workflowId: layer.workflowId })
      .sort({ layerLevel: 1 });

    res.json({ layer, layers, status: 'reordered' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// RULES
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/admin/workflows/:workflowId/rules
router.get('/workflows/:workflowId/rules', async (req, res) => {
  try {
    const rules = await ApprovalRule.find({ workflowId: req.params.workflowId })
      .populate('targetLayers', 'layerName layerLevel')
      .sort({ priority: 1 });
    res.json({ rules, total: rules.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/workflows/:workflowId/rules
router.post('/workflows/:workflowId/rules', validateRuleBody, async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.workflowId);
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    const { ruleName, description, ruleCondition, targetLayers, priority } = req.body;
    if (!ruleName) return res.status(400).json({ message: 'ruleName is required' });
    if (!targetLayers?.length) return res.status(400).json({ message: 'At least one targetLayer is required' });

    const rule = await ApprovalRule.create({
      workflowId: req.params.workflowId,
      ruleName, description, ruleCondition,
      targetLayers,
      priority: priority ?? 100,
      isActive: true,
    });

    await audit(req, 'RULE_CREATED',
      `Created rule "${ruleName}" in workflow "${workflow.workflowName}"`,
      `ApprovalRule:${rule._id}`);

    res.status(201).json({ rule, status: 'created' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/admin/rules/:ruleId
router.put('/rules/:ruleId', async (req, res) => {
  try {
    // Validate condition if provided
    if (req.body.ruleCondition) {
      const { valid, errors } = require('../utils/workflowHelper').validateRuleCondition(req.body.ruleCondition);
      if (!valid) return res.status(400).json({ message: 'Invalid rule condition', errors });
    }

    const allowed = ['ruleName','description','ruleCondition','targetLayers','priority','isActive'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const rule = await ApprovalRule.findByIdAndUpdate(
      req.params.ruleId, updates, { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    await audit(req, 'RULE_UPDATED',
      `Updated rule "${rule.ruleName}"`, `ApprovalRule:${rule._id}`);

    res.json({ rule, status: 'updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/admin/rules/:ruleId
router.delete('/rules/:ruleId', async (req, res) => {
  try {
    const rule = await ApprovalRule.findByIdAndDelete(req.params.ruleId);
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    await audit(req, 'RULE_DELETED',
      `Deleted rule "${rule.ruleName}"`, `ApprovalRule:${req.params.ruleId}`);

    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/rules/:ruleId/test
router.post('/rules/:ruleId/test', async (req, res) => {
  try {
    const rule = await ApprovalRule.findById(req.params.ruleId)
      .populate('targetLayers', 'layerName layerLevel');
    if (!rule) return res.status(404).json({ message: 'Rule not found' });

    const testData = req.body.testCondition || {};
    const matched  = evaluateConditionLogic(rule.ruleCondition, testData);

    res.json({
      matched,
      matchedLayers: matched ? rule.targetLayers : [],
      ruleCondition: rule.ruleCondition,
      testData,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// APPROVAL ASSIGNMENTS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/admin/approval-assignments
router.get('/approval-assignments', async (req, res) => {
  try {
    const filter = {};
    if (req.query.layerId)    filter.layerId  = req.query.layerId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.department) filter.departments = { $in: [req.query.department, '*'] };

    const assignments = await ApprovalAssignment.find(filter)
      .populate('userId',          'fullName email jobTitle department role')
      .populate('backupApproverId','fullName email jobTitle')
      .populate({ path: 'layerId', populate: { path: 'workflowId', select: 'workflowName' } })
      .sort({ createdAt: -1 });

    res.json({ assignments, total: assignments.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/approval-assignments
router.post('/approval-assignments', async (req, res) => {
  try {
    const {
      layerId, userId, approverRole, departments,
      designation, approvalLimit, backupApproverId, startDate, endDate,
    } = req.body;

    if (!layerId)      return res.status(400).json({ message: 'layerId is required' });
    if (!userId)       return res.status(400).json({ message: 'userId is required' });
    if (!approverRole) return res.status(400).json({ message: 'approverRole is required' });

    const assignment = await ApprovalAssignment.create({
      layerId, userId, approverRole,
      departments:      departments      || ['*'],
      designation:      designation      || '*',
      approvalLimit:    approvalLimit    || 5,
      backupApproverId: backupApproverId || null,
      isActive:         true,
      startDate:        startDate        || new Date(),
      endDate:          endDate          || null,
    });

    const populated = await assignment.populate([
      { path: 'userId',           select: 'fullName email jobTitle department' },
      { path: 'backupApproverId', select: 'fullName email' },
      { path: 'layerId',          select: 'layerName layerLevel' },
    ]);

    await audit(req, 'APPROVAL_ASSIGNMENT_CREATED',
      `Assigned ${populated.userId?.fullName} to layer "${populated.layerId?.layerName}"`,
      `ApprovalAssignment:${assignment._id}`);

    res.status(201).json({ assignment: populated, status: 'created' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'This user is already assigned to this layer' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/approval-assignments/:assignmentId
router.put('/approval-assignments/:assignmentId', async (req, res) => {
  try {
    const allowed = [
      'approverRole','departments','designation','approvalLimit',
      'backupApproverId','isActive','startDate','endDate',
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const assignment = await ApprovalAssignment.findByIdAndUpdate(
      req.params.assignmentId, updates, { new: true, runValidators: true }
    ).populate('userId', 'fullName email').populate('layerId', 'layerName');

    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    await audit(req, 'APPROVAL_ASSIGNMENT_UPDATED',
      `Updated assignment for ${assignment.userId?.fullName} on layer "${assignment.layerId?.layerName}"`,
      `ApprovalAssignment:${assignment._id}`);

    res.json({ assignment, status: 'updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/admin/approval-assignments/:assignmentId
router.delete('/approval-assignments/:assignmentId', async (req, res) => {
  try {
    const assignment = await ApprovalAssignment.findByIdAndDelete(req.params.assignmentId)
      .populate('userId', 'fullName').populate('layerId', 'layerName');
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    await audit(req, 'APPROVAL_ASSIGNMENT_DELETED',
      `Removed ${assignment.userId?.fullName} from layer "${assignment.layerId?.layerName}"`,
      `ApprovalAssignment:${req.params.assignmentId}`);

    res.json({ status: 'deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/users/:userId/assigned-layers
router.get('/users/:userId/assigned-layers', async (req, res) => {
  try {
    const assignments = await ApprovalAssignment.find({
      userId: req.params.userId, isActive: true,
    })
      .populate({ path: 'layerId', populate: { path: 'workflowId', select: 'workflowName' } });

    res.json({ assignments, total: assignments.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// SLA & ESCALATION
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/admin/sla-metrics
router.get('/sla-metrics', async (req, res) => {
  try {
    const filters = {
      layerId:   req.query.layerId,
      startDate: req.query.startDate,
      endDate:   req.query.endDate,
    };
    // Default: last 30 days
    if (!filters.startDate) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      filters.startDate = d.toISOString();
    }

    const metrics = await slaService.getSLAMetrics(filters);
    res.json(metrics);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/sla-report
router.get('/sla-report', async (req, res) => {
  try {
    const report = await slaService.generateSLAReport({
      layerId:   req.query.layerId,
      startDate: req.query.startDate,
      endDate:   req.query.endDate,
    });
    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/admin/escalation-history
router.get('/escalation-history', async (req, res) => {
  try {
    const history = await escalationService.getEscalationHistory({
      requestId: req.query.requestId,
      startDate: req.query.startDate,
      endDate:   req.query.endDate,
    });
    res.json({ history, total: history.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/admin/escalation/run — manually trigger the escalation cron
router.post('/escalation/run', async (req, res) => {
  try {
    const result = await escalationService.checkForExpiredApprovals();
    res.json({ message: 'Escalation check complete', ...result });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// APPROVAL DASHBOARD — live admin overview
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/admin/approval-dashboard
router.get('/approval-dashboard', async (req, res) => {
  try {
    const AccessRequest    = require('../models/AccessRequest');
    const ApprovalHistory  = require('../models/ApprovalHistory');

    const now         = new Date();
    const startOfDay  = new Date(now); startOfDay.setHours(0,0,0,0);
    const thirtyAgo   = new Date(now); thirtyAgo.setDate(thirtyAgo.getDate() - 30);

    const [
      totalPending,
      pendingWithWorkflow,
      pendingLegacy,
      completedToday,
      slaBreached,
      escalated,
    ] = await Promise.all([
      AccessRequest.countDocuments({ status: 'Pending' }),
      AccessRequest.countDocuments({ status: 'Pending', workflowId: { $ne: null } }),
      AccessRequest.countDocuments({ status: 'Pending', workflowId: null }),
      AccessRequest.countDocuments({ status: { $in: ['Approved','Rejected'] }, reviewedAt: { $gte: startOfDay } }),
      AccessRequest.countDocuments({ status: 'Pending', workflowId: { $ne: null }, slaDeadline: { $lt: now } }),
      AccessRequest.countDocuments({ status: 'Pending', escalationCount: { $gt: 0 } }),
    ]);

    // Pending grouped by workflow
    const byWorkflow = await AccessRequest.aggregate([
      { $match: { status: 'Pending', workflowId: { $ne: null } } },
      { $group: { _id: '$workflowId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'approvalworkflows', localField: '_id', foreignField: '_id',
          as: 'workflow',
        },
      },
      { $unwind: { path: '$workflow', preserveNullAndEmptyArrays: true } },
      { $project: { workflowName: '$workflow.workflowName', count: 1 } },
    ]);

    // Recent approvals (last 20)
    const recentHistory = await ApprovalHistory.find({
      approvalAction: { $in: ['APPROVED','REJECTED','ESCALATED'] },
      createdAt: { $gte: thirtyAgo },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('approvedBy', 'fullName email')
      .populate('layerId',    'layerName layerLevel')
      .populate('requestId',  'requestedRole department');

    res.json({
      summary: {
        totalPending, pendingWithWorkflow, pendingLegacy,
        completedToday, slaBreached, escalated,
      },
      byWorkflow,
      recentActivity: recentHistory,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;