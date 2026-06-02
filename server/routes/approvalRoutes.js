// server/routes/approvalRoutes.js
/**
 * Approver-facing routes for the multi-level approval system.
 * Accessible by: manager, admin (employees are read-only via requestRoutes)
 */

const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  validateApprovalRequest,
  checkApprovalAuthority,
  checkDailyLimit,
} = require('../middleware/workflowMiddleware');

const AccessRequest      = require('../models/AccessRequest');
const ApprovalHistory    = require('../models/ApprovalHistory');
const ApprovalAssignment = require('../models/ApprovalAssignment');
const AuditLog           = require('../models/AuditLog');
const User               = require('../models/User');

const workflowEngine     = require('../services/workflowEngine');
const escalationService  = require('../services/escalationService');
const { generateApprovalPath } = require('../utils/workflowHelper');

// ── Audit helper ──────────────────────────────────────────────────────────────
const audit = (req, action, details, resource) =>
  AuditLog.create({
    userId:    req.user._id,
    userName:  req.user.fullName,
    userEmail: req.user.email,
    userRole:  req.user.role,
    action, details, resource,
    ipAddress: req.ip || '',
  }).catch(() => {});

// ═════════════════════════════════════════════════════════════════════════════
// PENDING APPROVALS — what the approver sees in their queue
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/approver/pending-approvals
router.get('/pending-approvals', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const now  = new Date();
    const page = Math.max(1, parseInt(req.query.page)  || 1);
    const limit= Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    // Requests where this user is in currentApproverIds
    const filter = {
      status:             'Pending',
      currentApproverIds: req.user._id,
    };

    const [requests, total] = await Promise.all([
      AccessRequest.find(filter)
        .sort({ slaDeadline: 1, createdAt: 1 }) // most urgent first
        .skip(skip)
        .limit(limit)
        .populate('employee',  'fullName email department jobTitle avatarUrl')
        .populate('workflowId','workflowName workflowType')
        .populate('currentApprovalLayerId', 'layerName layerLevel slaHours')
        .populate('currentApproverIds', 'fullName email jobTitle'),
      AccessRequest.countDocuments(filter),
    ]);

    // Annotate with SLA status
    const enriched = requests.map(r => {
      const obj        = r.toObject();
      const isBreached = r.slaDeadline && now > r.slaDeadline;
      const hoursLeft  = r.slaDeadline
        ? Math.max(0, Math.round((r.slaDeadline - now) / 3600000))
        : null;
      return { ...obj, slaBreached: isBreached, slaHoursRemaining: hoursLeft };
    });

    res.json({ requests: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/approver/pending-approvals/:requestId/details
router.get(
  '/pending-approvals/:requestId/details',
  protect, authorize('manager', 'admin'),
  async (req, res) => {
    try {
      const request = await AccessRequest.findById(req.params.requestId)
        .populate('employee',  'fullName email department jobTitle avatarUrl')
        .populate('workflowId','workflowName workflowType')
        .populate('currentApprovalLayerId', 'layerName layerLevel slaHours requiredApprovers approvalType')
        .populate('currentApproverIds',     'fullName email jobTitle')
        .populate({
          path: 'approvalHistory',
          populate: { path: 'approvedBy', select: 'fullName email' },
          options: { sort: { createdAt: 1 } },
        });

      if (!request) return res.status(404).json({ message: 'Request not found' });

      // Only the assigned approver (or admin) can see full details
      const isCurrentApprover = request.currentApproverIds
        ?.some(u => String(u._id) === String(req.user._id));
      if (!isCurrentApprover && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorised to view this request' });
      }

      const approvalPath = generateApprovalPath(
        request.layerStatuses,
        request.currentApprovalLayerId
      );

      res.json({ request, approvalPath });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// GET /api/approver/delegation-candidates/:requestId
// Returns active users who can receive a delegated approval for this request.
router.get(
  '/delegation-candidates/:requestId',
  protect,
  authorize('manager', 'admin'),
  validateApprovalRequest,
  async (req, res) => {
    try {
      const request = req.accessRequest;
      const currentLayerId = request.currentApprovalLayerId?._id || request.currentApprovalLayerId;
      const isCurrentApprover = request.currentApproverIds
        ?.some(id => String(id) === String(req.user._id));

      if (!isCurrentApprover && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only the current approver can delegate this request' });
      }

      const candidatesById = new Map();
      const addCandidate = (user, source) => {
        if (!user || !user.isActive) return;
        if (!['manager', 'admin'].includes(user.role)) return;
        if (String(user._id) === String(req.user._id)) return;
        if (String(user._id) === String(request.employee)) return;

        candidatesById.set(String(user._id), {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          department: user.department,
          jobTitle: user.jobTitle,
          source,
        });
      };

      const assignments = await ApprovalAssignment.find({
        layerId: currentLayerId,
        isActive: true,
        $or: [
          { endDate: null },
          { endDate: { $gte: new Date() } },
        ],
      })
        .populate('userId', 'fullName email role department jobTitle isActive')
        .populate('backupApproverId', 'fullName email role department jobTitle isActive');

      assignments
        .filter(a => a.departments.includes('*') || a.departments.includes(request.department))
        .forEach(a => {
          addCandidate(a.userId, 'assigned');
          addCandidate(a.backupApproverId, 'backup');
        });

      const fallbackUsers = await User.find({
        isActive: true,
        role: { $in: ['manager', 'admin'] },
        _id: { $ne: req.user._id },
        $or: [
          { department: request.department },
          { role: 'admin' },
        ],
      }).select('fullName email role department jobTitle isActive');

      fallbackUsers.forEach(user => addCandidate(user, user.role === 'admin' ? 'admin' : 'department'));

      const candidates = [...candidatesById.values()]
        .sort((a, b) => {
          const sourceRank = { assigned: 0, backup: 1, department: 2, admin: 3 };
          return (sourceRank[a.source] ?? 9) - (sourceRank[b.source] ?? 9) ||
            a.fullName.localeCompare(b.fullName);
        });

      res.json({ candidates });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// APPROVE
// ═════════════════════════════════════════════════════════════════════════════

// PUT /api/approvals/:requestId/approve
router.put(
  '/:requestId/approve',
  protect,
  authorize('manager', 'admin'),
  validateApprovalRequest,
  checkApprovalAuthority,
  checkDailyLimit,
  async (req, res) => {
    try {
      const { comments } = req.body;
      const layerId = req.approvalLayerId; // set by checkApprovalAuthority

      const result = await workflowEngine.completeLayerApproval(
        req.params.requestId,
        layerId,
        'APPROVED',
        req.user,
        { comments }
      );

      await audit(
        req,
        'LAYER_APPROVED',
        `${req.user.fullName} approved layer on request ${req.params.requestId}. ` +
        (result.isComplete ? 'Workflow COMPLETE.' : `Next: ${result.nextLayer?.name}`),
        `AccessRequest:${req.params.requestId}`
      );

      res.json({
        message: result.isComplete
          ? 'All approval layers completed. Access approved.'
          : `Layer approved. Request moved to: ${result.nextLayer?.name}`,
        ...result,
      });
    } catch (err) {
      // Daily limit or other business rule errors
      const status = err.message.includes('Daily') ? 429 : 500;
      res.status(status).json({ message: err.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// REJECT
// ═════════════════════════════════════════════════════════════════════════════

// PUT /api/approvals/:requestId/reject
router.put(
  '/:requestId/reject',
  protect,
  authorize('manager', 'admin'),
  validateApprovalRequest,
  checkApprovalAuthority,
  async (req, res) => {
    try {
      const { rejectionReason, comments, suggestedChanges, resubmitAllowed = true } = req.body;
      if (!rejectionReason)
        return res.status(400).json({ message: 'rejectionReason is required' });

      const layerId = req.approvalLayerId;

      const result = await workflowEngine.completeLayerApproval(
        req.params.requestId,
        layerId,
        'REJECTED',
        req.user,
        { rejectionReason, comments, resubmitAllowed }
      );

      await audit(
        req,
        'LAYER_REJECTED',
        `${req.user.fullName} rejected request ${req.params.requestId}. Reason: ${rejectionReason}`,
        `AccessRequest:${req.params.requestId}`
      );

      res.json({
        message:  'Request rejected and returned to employee.',
        action:   resubmitAllowed ? 'request_update_required' : 'workflow_terminated',
        ...result,
        suggestedChanges: suggestedChanges || null,
      });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// DELEGATE
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/approvals/:requestId/delegate
router.post(
  '/:requestId/delegate',
  protect,
  authorize('manager', 'admin'),
  validateApprovalRequest,
  async (req, res) => {
    try {
      const { delegateToUserId, reason, endDate } = req.body;
      if (!delegateToUserId) return res.status(400).json({ message: 'delegateToUserId is required' });

      const request = req.accessRequest;
      const isCurrentApprover = request.currentApproverIds
        ?.some(id => String(id) === String(req.user._id));

      if (!isCurrentApprover && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only the current approver can delegate this request' });
      }
      if (String(delegateToUserId) === String(req.user._id)) {
        return res.status(400).json({ message: 'Cannot delegate to yourself' });
      }

      const delegatee = await User.findById(delegateToUserId).select('fullName email role isActive');
      if (!delegatee || !delegatee.isActive)
        return res.status(404).json({ message: 'Delegate user not found or inactive' });
      if (!['manager', 'admin'].includes(delegatee.role)) {
        return res.status(400).json({ message: 'Delegation is only allowed to managers or admins' });
      }

      // Swap current approver: remove req.user, add delegatee
      const updatedApprovers = request.currentApproverIds
        .map(id => String(id) === String(req.user._id) ? delegateToUserId : id);

      // If req.user wasn't in the list (admin acting), just add delegatee
      if (!updatedApprovers.includes(delegateToUserId)) {
        updatedApprovers.push(delegateToUserId);
      }

      await AccessRequest.findByIdAndUpdate(req.params.requestId, {
        currentApproverIds: [...new Set(updatedApprovers.map(String))],
      });

      // Record delegation in history
      const histEntry = await ApprovalHistory.create({
        requestId:        req.params.requestId,
        layerId:          request.currentApprovalLayerId,
        approvedBy:       delegateToUserId,
        approvalAction:   'DELEGATED',
        approvalComments: reason || '',
        delegatedFrom:    req.user._id,
        previousStatus:   'PENDING',
        newStatus:        'PENDING',
      });
      await AccessRequest.findByIdAndUpdate(req.params.requestId, {
        $push: { approvalHistory: histEntry._id },
      });

      await audit(
        req,
        'LAYER_DELEGATED',
        `${req.user.fullName} delegated approval to ${delegatee.fullName} for request ${req.params.requestId}`,
        `AccessRequest:${req.params.requestId}`
      );

      res.json({
        message:     `Approval delegated to ${delegatee.fullName}`,
        delegatedTo: { id: delegatee._id, fullName: delegatee.fullName, email: delegatee.email },
        status:      'delegated',
        endDate:     endDate || null,
      });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// MANUAL ESCALATION (admin)
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/approvals/:requestId/escalate
router.post(
  '/:requestId/escalate',
  protect,
  authorize('admin'),
  validateApprovalRequest,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const result = await escalationService.escalateExpiredApproval(
        req.params.requestId,
        req.accessRequest.currentApprovalLayerId,
        reason || 'Manually escalated by admin',
        req.user
      );

      if (!result) {
        return res.status(400).json({ message: 'Cannot escalate — request is already at the top approval layer' });
      }

      await audit(
        req,
        'LAYER_ESCALATED',
        `Admin ${req.user.fullName} manually escalated request ${req.params.requestId}`,
        `AccessRequest:${req.params.requestId}`
      );

      res.json({ message: 'Request escalated', ...result });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// APPROVER STATISTICS
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/approver/approval-statistics
router.get('/approval-statistics', protect, authorize('manager', 'admin'), async (req, res) => {
  try {
    const now        = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const thirtyAgo  = new Date(now); thirtyAgo.setDate(thirtyAgo.getDate() - 30);

    const [total, approved, rejected, todayCount, slaBreaches, avgTime] = await Promise.all([
      ApprovalHistory.countDocuments({ approvedBy: req.user._id, approvalAction: { $in: ['APPROVED','REJECTED'] } }),
      ApprovalHistory.countDocuments({ approvedBy: req.user._id, approvalAction: 'APPROVED' }),
      ApprovalHistory.countDocuments({ approvedBy: req.user._id, approvalAction: 'REJECTED' }),
      ApprovalHistory.countDocuments({ approvedBy: req.user._id, approvalAction: 'APPROVED', createdAt: { $gte: startOfDay } }),
      ApprovalHistory.countDocuments({ approvedBy: req.user._id, slaBreached: true }),
      ApprovalHistory.aggregate([
        { $match: { approvedBy: req.user._id, approvalAction: 'APPROVED', timeToApprove: { $ne: null }, createdAt: { $gte: thirtyAgo } } },
        { $group: { _id: null, avg: { $avg: '$timeToApprove' } } },
      ]),
    ]);

    const pendingCount = await AccessRequest.countDocuments({
      status: 'Pending', currentApproverIds: req.user._id,
    });

    res.json({
      totalActions:       total,
      totalApproved:      approved,
      totalRejected:      rejected,
      todayApprovals:     todayCount,
      dailyLimitRemaining: Math.max(0, 5 - todayCount),
      pendingInQueue:     pendingCount,
      slaBreaches,
      avgTimeToApproveMinutes: avgTime[0]?.avg ? Math.round(avgTime[0].avg) : null,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/approver/bulk-approvers
// Returns approvers for multiple layers at once (used by ApprovalTimeline)
router.post('/bulk-approvers', protect, authorize('manager', 'admin', 'employee'), async (req, res) => {
  try {
    const { layerIds } = req.body;

    if (!Array.isArray(layerIds) || layerIds.length === 0) {
      return res.json({});
    }

    const cleanLayerIds = layerIds
      .filter(id => id && String(id).length > 10)
      .map(id => String(id));

    const assignments = await ApprovalAssignment.find({
      layerId: { $in: cleanLayerIds },
      isActive: true,
      $or: [
        { endDate: null },
        { endDate: { $gte: new Date() } }
      ]
    })
    .populate('userId', 'fullName email jobTitle department avatarUrl')
    .populate('backupApproverId', 'fullName email');

    const result = {};

    assignments.forEach(assignment => {
      const layerIdStr = String(assignment.layerId);
      if (!result[layerIdStr]) result[layerIdStr] = [];

      if (assignment.userId) {
        result[layerIdStr].push({
          _id: assignment.userId._id,
          fullName: assignment.userId.fullName,
          email: assignment.userId.email,
          jobTitle: assignment.userId.jobTitle,
          department: assignment.userId.department,
          avatarUrl: assignment.userId.avatarUrl,
        });
      }
    });

    res.json(result);
  } catch (err) {
    console.error('Bulk approvers error:', err);
    res.status(500).json({ message: 'Failed to load approvers' });
  }
});

module.exports = router;
