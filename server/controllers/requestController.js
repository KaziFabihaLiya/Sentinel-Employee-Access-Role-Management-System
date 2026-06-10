const AccessRequest      = require('../models/AccessRequest');
const User               = require('../models/User');
const AuditLog           = require('../models/AuditLog');
const routingEngine      = require('../services/routingEngine');

//    Helper: log to audit                                                     
const audit = (req, action, resource, resourceId, details) =>
  AuditLog.create({
    userId:    req.user._id,
    userName:  req.user.fullName,
    userEmail: req.user.email,
    action, resource, resourceId: String(resourceId), details,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '—',
  }).catch(() => {});   // non-blocking — never crash on audit failure

//    Calculate risk score                                                     
const calcRisk = (requestedRole, accessDuration) => {
  const sensitiveKeywords = ['admin', 'finance', 'payroll', 'hr', 'database', 'root', 'superuser'];
  const roleLower = requestedRole.toLowerCase();
  const hasKeyword = sensitiveKeywords.some(k => roleLower.includes(k));
  if (hasKeyword) return 'high';
  if (accessDuration && accessDuration !== 'Permanent') return 'medium';
  return 'low';
};

//    POST /api/requests — Employee submits                                   
const submitRequest = async (req, res) => {
  try {
    const { department, jobTitle, requestedRole, justification, accessDuration } = req.body;

    if (!department || !jobTitle || !requestedRole || !justification)
      return res.status(400).json({ message: 'All required fields must be filled' });

    const riskLevel = calcRisk(requestedRole, accessDuration);

    // Create the base request first so we always have a record even if routing fails
    const request = await AccessRequest.create({
      employee:       req.user._id,
      department, jobTitle, requestedRole, justification,
      accessDuration: accessDuration || 'Permanent',
      riskLevel,
      status: 'Pending',
    });

    // ── Workflow routing ──────────────────────────────────────────────────────
    // Runs in its own try/catch so a routing failure never blocks the submission
    try {
      const workflow = await routingEngine.findWorkflowForRequest({
        department,
        requestedRole,
        riskLevel,
        accessDuration: accessDuration || 'Permanent',
      });

      const firstLayer = workflow?.approvalLayers?.[0];

      if (workflow && firstLayer) {
        const approvers = await routingEngine.findApproversForLayer(
          firstLayer._id,
          department
        );

        // If routing finds nobody, fall back to any manager in the same department
        let approverIds = approvers.map(a => a._id);
        if (!approverIds.length) {
          const fallbackMgr = await User.findOne({
            role: 'manager',
            department,
            isActive: true,
          }).select('_id');
          if (fallbackMgr) approverIds = [fallbackMgr._id];
        }

        const slaDeadline = new Date(
          Date.now() + (firstLayer.slaHours || 24) * 3_600_000
        );

        await AccessRequest.findByIdAndUpdate(request._id, {
          workflowId:             workflow._id,
          currentApprovalLayerId: firstLayer._id,
          currentLayerLevel:      firstLayer.layerLevel,
          currentApproverIds:     approverIds,
          slaDeadline,
          layerStatuses: workflow.approvalLayers.map(layer => ({
            layerId:    layer._id,
            layerName:  layer.layerName,
            layerLevel: layer.layerLevel,
            status:     'PENDING',
            slaDeadline:
              String(layer._id) === String(firstLayer._id) ? slaDeadline : null,
            slaBreached: false,
          })),
        });
      }
    } catch (routingErr) {
      // Log but never let this crash the response — request is already saved
      console.error(
        `[submitRequest] Workflow routing failed for request ${request._id}:`,
        routingErr.message
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    await audit(req, 'REQUEST_SUBMITTED', 'AccessRequest', request._id,
      `Submitted request for role: ${requestedRole}`);

    res.status(201).json({ message: 'Request submitted successfully', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//    GET /api/requests/my — Employee gets own requests                       
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

//    GET /api/requests/team — Manager gets team's pending requests           
//    NOTE: This uses the workflow-aware currentApproverIds index so a manager
//    only sees requests explicitly routed to them, not their whole department.
const getTeamRequests = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;

    // Primary filter: requests where this manager is a current approver
    const workflowFilter = { currentApproverIds: req.user._id };
    if (status !== 'all') workflowFilter.status = status;

    // Secondary filter: legacy requests (no workflowId) from their department
    const employees = await User.find({
      department: req.user.department,
      role: 'employee',
    }).select('_id');
    const ids = employees.map(e => e._id);

    const legacyFilter = {
      employee:   { $in: ids },
      workflowId: null,           // only truly workflow-less records
    };
    if (status !== 'all') legacyFilter.status = status;

    // Combine both with $or so nothing is missed
    const combinedFilter = { $or: [workflowFilter, legacyFilter] };

    const total    = await AccessRequest.countDocuments(combinedFilter);
    const requests = await AccessRequest.find(combinedFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('employee',    'fullName department jobTitle email')
      .populate('reviewedBy',  'fullName')
      .populate('workflowId',  'workflowName')
      .populate('currentApprovalLayerId', 'layerName layerLevel');

    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//    PATCH /api/requests/:id/review — Manager approves or rejects           
const reviewRequest = async (req, res) => {
  try {
    const { status, managerComment } = req.body;
    if (!['approved', 'rejected'].includes(status?.toLowerCase()))
      return res.status(400).json({ message: 'Status must be approved or rejected' });

    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending')
      return res.status(400).json({ message: 'Request has already been reviewed' });

    // Guard: only an assigned approver (or admin) may act
    const isAssigned = request.currentApproverIds.some(
      id => String(id) === String(req.user._id)
    );
    if (!isAssigned && req.user.role !== 'admin')
      return res.status(403).json({ message: 'You are not assigned to review this request' });

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

//    GET /api/requests — Admin gets all requests                             
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
      .populate('reviewedBy', 'fullName')
      .populate('workflowId', 'workflowName')
      .populate('currentApprovalLayerId', 'layerName layerLevel');

    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//    DELETE /api/requests/:id — Admin deletes request                       
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

//    PATCH /api/requests/:id/revoke — Admin revokes approved access         
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