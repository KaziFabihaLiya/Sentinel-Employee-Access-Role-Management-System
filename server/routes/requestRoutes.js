// server/routes/requestRoutes.js
const express       = require('express');
const router        = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const AccessRequest = require('../models/AccessRequest');
const User          = require('../models/User');
const { createAuditLog } = require('../utils/auditHelper');

//    Risk helper        
const calcRisk = (requestedRole = '', accessDuration = 'Permanent') => {
  const r = requestedRole.toLowerCase();
  if (['admin','database','finance','payroll','hr','root','superuser','dba','sysadmin','erp admin'].some(k=>r.includes(k))) return 'high';
  if (['manager','approver','write','edit','modify','delete','report'].some(k=>r.includes(k))) return 'medium';
  if (accessDuration && accessDuration !== 'Permanent') return 'medium';
  return 'low';
};

// GET /api/requests/my — Employee own requests (paginated + filtered)
router.get('/my', protect, authorize('employee'), async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 15);
    const skip  = (page - 1) * limit;
    const filter = { employee: req.user.id };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    const [requests, total] = await Promise.all([
      AccessRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reviewedBy','fullName'),
      AccessRequest.countDocuments(filter),
    ]);
    res.json({ requests, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/requests/team — Manager: team requests by department
router.get('/team', protect, authorize('manager'), async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const teamEmployees = await User.find({ department: req.user.department, role: 'employee', isActive: true }).select('_id');
    const empIds = teamEmployees.map(e => e._id);
    const filter = { employee: { $in: empIds } };
    if (req.query.status) filter.status = req.query.status;
    const [requests, total] = await Promise.all([
      AccessRequest.find(filter).sort({ createdAt: 1 }).limit(limit).populate('employee','fullName department jobTitle email'),
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
      const teamEmps = await User.find({ department: req.user.department, role: 'employee' }).select('_id');
      filter.employee = { $in: teamEmps.map(e => e._id) };
    }
    if (req.query.status) filter.status = req.query.status;

    const [requests, total] = await Promise.all([
      AccessRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('employee','fullName department jobTitle email'),
      AccessRequest.countDocuments(filter),
    ]);
    res.json({ requests, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/requests — Employee submits new request
router.post('/', protect, authorize('employee'), async (req, res) => {
  try {
    const { department, jobTitle, requestedRole, justification, accessDuration } = req.body;
    if (!department)    return res.status(400).json({ message: 'Department is required' });
    if (!jobTitle)      return res.status(400).json({ message: 'Job title is required' });
    if (!requestedRole) return res.status(400).json({ message: 'Requested role is required' });
    if (!justification || justification.length < 20) return res.status(400).json({ message: 'Justification must be at least 20 characters' });

    const riskLevel = calcRisk(requestedRole, accessDuration);
    const request = await AccessRequest.create({
      employee: req.user.id,
      department, jobTitle, requestedRole, justification,
      accessDuration: accessDuration || 'Permanent',
      status: 'Pending', riskLevel,
    });

    await createAuditLog(
      req, 'REQUEST_SUBMITTED',
      `${req.user.fullName} submitted access request for role: ${requestedRole}`,
      `AccessRequest:${request._id}`
    );

    const populated = await request.populate('employee', 'fullName email department');
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/requests/:id/review — Manager: approve or reject
router.patch('/:id/review', protect, authorize('manager'), async (req, res) => {
  try {
    const { status, managerComment } = req.body;
    if (!['Approved','Rejected'].includes(status)) return res.status(400).json({ message: 'Status must be Approved or Rejected' });

    const request = await AccessRequest.findById(req.params.id).populate('employee','fullName email department');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ message: 'Request already reviewed' });

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
    const request = await AccessRequest.findById(req.params.id).populate('employee','fullName email');
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

module.exports = router;