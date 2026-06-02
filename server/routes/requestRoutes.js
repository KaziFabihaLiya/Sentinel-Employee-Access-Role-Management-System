// server/routes/requestRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// UPDATED — integrates multi-level workflow on new request submission.
// All original endpoints preserved. New endpoints added at the bottom.
// ─────────────────────────────────────────────────────────────────────────────
const express       = require('express');
const router        = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const AccessRequest = require('../models/AccessRequest');
const User          = require('../models/User');
const { createAuditLog } = require('../utils/auditHelper');
const workflowEngine = require('../services/workflowEngine');
const { generateApprovalPath } = require('../utils/workflowHelper');

// ── Risk helper ───────────────────────────────────────────────────────────────
const calcRisk = (requestedRole = '', accessDuration = 'Permanent') => {
  const r = requestedRole.toLowerCase();
  if (['admin','database','finance','payroll','hr','root','superuser','dba','sysadmin','erp admin'].some(k=>r.includes(k))) return 'high';
  if (['manager','approver','write','edit','modify','delete','report'].some(k=>r.includes(k))) return 'medium';
  if (accessDuration && accessDuration !== 'Permanent') return 'medium';
  return 'low';
};

// ─────────────────────────────────────────────────────────────────────────────
// ORIGINAL ENDPOINTS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/requests/my — Employee own requests (paginated + filtered)
router.get('/my', protect, authorize('employee'), async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 15);
    const skip  = (page - 1) * limit;
    const filter = { employee: req.user.id };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    const [requests, total] = await Promise.all([
      AccessRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reviewedBy', 'fullName')
        .populate('workflowId', 'workflowName')
        .populate('currentApprovalLayerId', 'layerName layerLevel'),
      AccessRequest.countDocuments(filter),
    ]);
    res.json({ requests, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/requests/team — Manager: team requests by department
router.get('/team', protect, authorize('manager'), async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const teamEmployees = await User.find({
      department: req.user.department, role: 'employee', isActive: true,
    }).select('_id');
    const empIds = teamEmployees.map(e => e._id);
    const filter = { employee: { $in: empIds } };
    if (req.query.status) filter.status = req.query.status;
    const [requests, total] = await Promise.all([
      AccessRequest.find(filter)
        .sort({ createdAt: 1 })
        .limit(limit)
        .populate('employee', 'fullName department jobTitle email')
        .populate('workflowId', 'workflowName')
        .populate('currentApprovalLayerId', 'layerName layerLevel'),
      AccessRequest.countDocuments(filter),
    ]);
    res.json({ requests, total });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/requests — Admin: all | Manager: team | Employee: own
router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const page  = Math.max(1, parseInt(req.query.page)   || 1);
    const skip  = (page - 1) * limit;
    let filter  = {};
    if (req.user.role === 'employee') {
      filter.employee = req.user.id;
    } else if (req.user.role === 'manager') {
      const teamEmps = await User.find({
        department: req.user.department, role: 'employee',
      }).select('_id');
      filter.employee = { $in: teamEmps.map(e => e._id) };
    }
    if (req.query.status) filter.status = req.query.status;
    const [requests, total] = await Promise.all([
      AccessRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'fullName department jobTitle email')
        .populate('workflowId', 'workflowName')
        .populate('currentApprovalLayerId', 'layerName layerLevel'),
      AccessRequest.countDocuments(filter),
    ]);
    res.json({ requests, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/requests — Employee submits new request
// ⭐ UPDATED: workflow engine is invoked after creation
router.post('/', protect, authorize('employee'), async (req, res) => {
  try {
    const { department, jobTitle, requestedRole, justification, accessDuration } = req.body;
    if (!department)    return res.status(400).json({ message: 'Department is required' });
    if (!jobTitle)      return res.status(400).json({ message: 'Job title is required' });
    if (!requestedRole) return res.status(400).json({ message: 'Requested role is required' });
    if (!justification || justification.length < 20)
      return res.status(400).json({ message: 'Justification must be at least 20 characters' });

    const riskLevel = calcRisk(requestedRole, accessDuration);
    const request = await AccessRequest.create({
      employee: req.user.id,
      department, jobTitle, requestedRole, justification,
      accessDuration: accessDuration || 'Permanent',
      status: 'Pending', riskLevel,
    });

    // ── Attempt to initialize multi-level workflow ───────────────────────────
    let workflowInfo = null;
    try {
      workflowInfo = await workflowEngine.initializeWorkflow(request._id);
    } catch (wfErr) {
      // Non-fatal: log and fall back to legacy single-level flow
      console.warn('[WorkflowEngine] Failed to initialize workflow:', wfErr.message);
    }

    await createAuditLog(
      req, 'REQUEST_SUBMITTED',
      `${req.user.fullName} submitted access request for role: ${requestedRole}` +
      (workflowInfo ? ` (Workflow: ${workflowInfo.workflowId})` : ' (legacy single-level)'),
      `AccessRequest:${request._id}`
    );

    const populated = await AccessRequest.findById(request._id)
      .populate('employee', 'fullName email department')
      .populate('workflowId', 'workflowName')
      .populate('currentApprovalLayerId', 'layerName layerLevel');

    res.status(201).json({
      ...populated.toObject(),
      workflowInitialized: !!workflowInfo,
      workflowInfo,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY SINGLE-LEVEL REVIEW (kept for backward compatibility)
// Managers in departments without a configured workflow still use this.
// ─────────────────────────────────────────────────────────────────────────────

// PATCH /api/requests/:id/review — Manager: approve or reject (legacy)
router.patch('/:id/review', protect, authorize('manager'), async (req, res) => {
  try {
    const { status, managerComment } = req.body;
    if (!['Approved','Rejected'].includes(status))
      return res.status(400).json({ message: 'Status must be Approved or Rejected' });

    const request = await AccessRequest.findById(req.params.id)
      .populate('employee','fullName email department');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending')
      return res.status(400).json({ message: 'Request already reviewed' });

    // If this request has a workflow attached, redirect to multi-level endpoint
    if (request.workflowId) {
      return res.status(400).json({
        message: 'This request uses a multi-level workflow. Use PUT /api/approvals/:requestId/approve or /reject.',
        workflowId: request.workflowId,
      });
    }

    request.status         = status;
    request.managerComment = managerComment || '';
    request.reviewedBy     = req.user.id;
    request.reviewedAt     = new Date();
    await request.save();

    const action = status === 'Approved' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED';
    await createAuditLog(
      req, action,
      `${req.user.fullName} ${status.toLowerCase()} access request for ${request.employee?.fullName} (${request.requestedRole})`,
      `AccessRequest:${request._id}`
    );

    res.json(request);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/requests/:id/revoke — Admin: revoke approved access
router.patch('/:id/revoke', protect, authorize('admin'), async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id)
      .populate('employee','fullName email');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status         = 'Rejected';
    request.managerComment = `Access revoked by admin on ${new Date().toLocaleDateString()}. ${req.body.reason || ''}`.trim();
    request.reviewedBy     = req.user.id;
    request.reviewedAt     = new Date();
    await request.save();

    await createAuditLog(
      req, 'ACCESS_REVOKED',
      `Admin revoked ${request.requestedRole} access from ${request.employee?.fullName}. Reason: ${req.body.reason || 'Not specified'}`,
      `AccessRequest:${request._id}`
    );

    res.json({ message: 'Access revoked', request });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW MULTI-LEVEL STATUS ENDPOINTS (employee-facing)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/requests/:requestId/approval-status
// Full workflow status for a specific request (employee can see their own)
router.get('/:requestId/approval-status', protect, async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Authorization: employee can only view their own
    if (req.user.role === 'employee' && String(request.employee) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    if (!request.workflowId) {
      // Legacy single-level — return simplified status
      return res.json({
        isLegacy:           true,
        status:             request.status,
        reviewedBy:         request.reviewedBy,
        reviewedAt:         request.reviewedAt,
        managerComment:     request.managerComment,
        approvalPath:       [],
        currentApprovers:   [],
      });
    }

    const status = await workflowEngine.getWorkflowStatus(req.params.requestId);
    res.json(status);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/requests/:requestId/approval-timeline
// Timeline for the employee progress view — ordered history entries
router.get('/:requestId/approval-timeline', protect, async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.requestId)
      .populate({
        path: 'approvalHistory',
        populate: [
          { path: 'approvedBy', select: 'fullName email jobTitle' },
          { path: 'layerId',    select: 'layerName layerLevel approvalRoleType' },
        ],
        options: { sort: { createdAt: 1 } },
      });

    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (req.user.role === 'employee' && String(request.employee) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    const approvalPath = generateApprovalPath(
      request.layerStatuses,
      request.currentApprovalLayerId
    );

    res.json({
      requestId:       request._id,
      status:          request.status,
      approvalPath,
      history:         request.approvalHistory,
      currentLayer:    request.currentApprovalLayerId,
      escalationCount: request.escalationCount,
      rejectedCount:   request.rejectedCount,
      completedAt:     request.completedAt,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
// TEMP DEBUG ROUTE - Manager's pending approvals (NEW SYSTEM)
router.get('/manager-pending', protect, authorize('manager'), async (req, res) => {
  try {
    const requests = await AccessRequest.find({
      status: 'Pending',
      $or: [
        { currentApproverIds: req.user._id },
        { 'layerStatuses.status': 'PENDING' }  // fallback
      ]
    })
    .sort({ slaDeadline: 1, createdAt: 1 })
    .populate('employee', 'fullName email department jobTitle')
    .populate('currentApprovalLayerId', 'layerName layerLevel slaHours')
    .populate('workflowId', 'workflowName');

    res.json({ requests, total: requests.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;