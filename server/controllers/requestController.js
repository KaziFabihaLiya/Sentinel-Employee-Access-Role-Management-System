const AccessRequest = require('../models/AccessRequest');
const User          = require('../models/User');
const AuditLog      = require('../models/AuditLog');

// ── Helper: log to audit ────────────────────────────────────────────────────
const audit = (req, action, resource, resourceId, details) =>
  AuditLog.create({
    userId:    req.user._id,
    userName:  req.user.fullName,
    userEmail: req.user.email,
    action, resource, resourceId: String(resourceId), details,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '—',
  }).catch(() => {});   // non-blocking — never crash on audit failure

// ── Calculate risk score ────────────────────────────────────────────────────
const calcRisk = (requestedRole, accessDuration) => {
  const sensitiveKeywords = ['admin', 'finance', 'payroll', 'hr', 'database', 'root', 'superuser'];
  const roleLower = requestedRole.toLowerCase();
  const hasKeyword = sensitiveKeywords.some(k => roleLower.includes(k));
  if (hasKeyword) return 'high';
  if (accessDuration && accessDuration !== 'Permanent') return 'medium';
  return 'low';
};

// ── POST /api/requests — Employee submits ──────────────────────────────────
const submitRequest = async (req, res) => {
  try {
    const { department, jobTitle, requestedRole, justification, accessDuration } = req.body;

    if (!department || !jobTitle || !requestedRole || !justification)
      return res.status(400).json({ message: 'All required fields must be filled' });

    const riskLevel = calcRisk(requestedRole, accessDuration);

    const request = await AccessRequest.create({
      employee:       req.user._id,
      department, jobTitle, requestedRole, justification,
      accessDuration: accessDuration || 'Permanent',
      riskLevel,
      status: 'Pending',
    });

    await audit(req, 'REQUEST_SUBMITTED', 'AccessRequest', request._id,
      `Submitted request for role: ${requestedRole}`);

    res.status(201).json({ message: 'Request submitted successfully', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/requests/my — Employee gets own requests ──────────────────────
const getMyRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { employee: req.user._id };
    if (status && status !== 'all') filter.status = status;

    const total    = await AccessRequest.countDocuments(filter);
    const requests = await AccessRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('requestedRole department status managerComment riskLevel accessDuration createdAt');

    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/requests/team — Manager gets team's pending requests ──────────
const getTeamRequests = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;

    // Find employees in same department
    const employees = await User.find({
      department: req.user.department,
      role: 'employee',
    }).select('_id');
    const ids = employees.map(e => e._id);

    const filter = { employee: { $in: ids } };
    if (status !== 'all') filter.status = status;

    const total    = await AccessRequest.countDocuments(filter);
    const requests = await AccessRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('employee', 'fullName department jobTitle email');

    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/requests/:id/review — Manager approves or rejects ──────────
const reviewRequest = async (req, res) => {
  try {
    const { status, managerComment } = req.body;
    if (!['approved', 'rejected'].includes(status?.toLowerCase()))
      return res.status(400).json({ message: 'Status must be approved or rejected' });

    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending')
      return res.status(400).json({ message: 'Request has already been reviewed' });

    // Normalize: keep first letter uppercase to match schema enum
    const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    request.status         = normalized;
    request.managerComment = managerComment || '';
    request.reviewedBy     = req.user._id;
    request.reviewedAt     = new Date();
    await request.save();

    await audit(req, `REQUEST_${normalized.toUpperCase()}`, 'AccessRequest', request._id,
      `Manager ${normalized.toLowerCase()} request for role: ${request.requestedRole}. Comment: ${managerComment || 'none'}`);

    res.json({ message: `Request ${normalized.toLowerCase()} successfully`, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/requests — Admin gets all requests ────────────────────────────
const getAllRequests = async (req, res) => {
  try {
    const { limit = 20, status, page = 1 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const total    = await AccessRequest.countDocuments(filter);
    const requests = await AccessRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('employee', 'fullName department jobTitle email')
      .populate('reviewedBy', 'fullName');

    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/requests/:id — Admin deletes request ──────────────────────
const deleteRequest = async (req, res) => {
  try {
    const request = await AccessRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await audit(req, 'REQUEST_DELETED', 'AccessRequest', req.params.id,
      `Admin deleted request for role: ${request.requestedRole}`);

    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/requests/:id/revoke — Admin revokes approved access ────────
const revokeAccess = async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Approved')
      return res.status(400).json({ message: 'Only approved access can be revoked' });

    request.status = 'Rejected';
    request.managerComment = `Access revoked by admin on ${new Date().toLocaleDateString()}. ${req.body.reason || ''}`;
    await request.save();

    await audit(req, 'ACCESS_REVOKED', 'AccessRequest', request._id,
      `Access revoked for role: ${request.requestedRole}. Reason: ${req.body.reason || 'Admin action'}`);

    res.json({ message: 'Access revoked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  submitRequest, getMyRequests, getTeamRequests,
  reviewRequest, getAllRequests, deleteRequest, revokeAccess,
};