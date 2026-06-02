// server/services/workflowEngine.js
/**
 * WorkflowEngine — the brain of the multi-level approval system.
 *
 * Responsibilities:
 *  1. Match an incoming request to the best workflow
 *  2. Initialize the workflow on the AccessRequest document
 *  3. Advance/complete layers as approvers act
 *  4. Handle rejection (reset to Layer 1)
 *  5. Handle skip (higher-level approver acts before their turn)
 *  6. Report workflow status
 */

const AccessRequest    = require('../models/AccessRequest');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ApprovalLayer    = require('../models/ApprovalLayer');
const ApprovalHistory  = require('../models/ApprovalHistory');
const ApprovalAssignment = require('../models/ApprovalAssignment');
const AuditLog         = require('../models/AuditLog');

const routingEngine    = require('./routingEngine');
const slaService       = require('./slaService');
const { calculateSLADeadline, extractRequestAttributes, generateApprovalPath } = require('../utils/workflowHelper');

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emit a non-blocking audit log entry.
 */
function _audit(action, details, resource, userId = null) {
  AuditLog.create({
    userId,
    userName:  userId ? undefined : 'System',
    userRole:  'system',
    action,
    details,
    resource,
  }).catch(() => {});
}

/**
 * Create an ApprovalHistory record + push its _id onto AccessRequest.
 */
async function _recordHistory(requestId, layerId, action, opts = {}) {
  const entry = await ApprovalHistory.create({
    requestId,
    layerId,
    approvalAction:   action,
    approvedBy:       opts.approvedBy       || null,
    approvalComments: opts.comments         || '',
    slaDeadline:      opts.slaDeadline      || null,
    slaBreached:      opts.slaBreached      || false,
    timeToApprove:    opts.timeToApprove    || null,
    rejectionReason:  opts.rejectionReason  || '',
    resubmitRequired: opts.resubmitRequired !== false,
    previousStatus:   opts.previousStatus   || '',
    newStatus:        opts.newStatus        || '',
    escalationCount:  opts.escalationCount  || 0,
    delegatedFrom:    opts.delegatedFrom    || null,
  });

  await AccessRequest.findByIdAndUpdate(requestId, {
    $push: { approvalHistory: entry._id },
  });

  return entry;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * initializeWorkflow
 * Called right after an AccessRequest is created.
 * Finds a matching workflow, stamps it on the request, sets up Layer 1.
 *
 * @param {string|ObjectId} requestId
 * @returns {{ workflowId, currentLayerId, currentApprovers, slaDeadline, layerStatuses } | null}
 *   Returns null if no matching workflow exists (legacy single-level flow).
 */
async function initializeWorkflow(requestId) {
  const request = await AccessRequest.findById(requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);

  const attrs = extractRequestAttributes(request.toObject());

  // 1. Find matching workflow via routing engine
  const workflow = await routingEngine.findWorkflowForRequest(attrs);
  if (!workflow) return null; // no workflow → fall back to legacy approval

  // 2. Load layers ordered by level
  const layers = await ApprovalLayer.find({ workflowId: workflow._id })
    .sort({ layerLevel: 1 });

  if (!layers.length) return null;

  // 3. Find approvers for Layer 1
  const layer1 = layers[0];
  const approvers = await routingEngine.findApproversForLayer(layer1._id, request.department);

  // 4. Calculate SLA deadline for Layer 1
  const slaDeadline = calculateSLADeadline(new Date(), layer1.slaHours);

  // 5. Build layerStatuses snapshot
  const layerStatuses = layers.map(l => ({
    layerId:     l._id,
    layerName:   l.layerName,
    layerLevel:  l.layerLevel,
    status:      l.layerLevel === 1 ? 'PENDING' : 'PENDING',
    slaDeadline: l.layerLevel === 1 ? slaDeadline : null,
    slaBreached: false,
  }));

  // 6. Stamp everything on the request
  await AccessRequest.findByIdAndUpdate(requestId, {
    workflowId:             workflow._id,
    currentApprovalLayerId: layer1._id,
    currentLayerLevel:      layer1.layerLevel,
    currentApproverIds:     approvers.map(a => a._id),
    slaDeadline,
    layerStatuses,
  });

  // 7. Create initial PENDING history entry for Layer 1
  await _recordHistory(requestId, layer1._id, 'PENDING', {
    slaDeadline,
    newStatus: 'PENDING',
  });

  _audit(
    'WORKFLOW_INITIALIZED',
    `Workflow "${workflow.workflowName}" initialized for request ${requestId}. Layer 1: ${layer1.layerName}`,
    `AccessRequest:${requestId}`
  );

  return {
    workflowId:      workflow._id,
    currentLayerId:  layer1._id,
    currentApprovers: approvers,
    slaDeadline,
    layerStatuses,
  };
}

/**
 * completeLayerApproval
 * Called when an approver acts (approve / reject).
 *
 * Rules:
 * - APPROVED at a non-final layer → advance to next layer
 * - APPROVED at final layer       → mark request Approved + WORKFLOW_COMPLETED
 * - REJECTED at any layer         → reset request to Layer 1, notify employee
 * - Higher-level approver acting  → skip all intermediate layers
 *
 * @param {string}   requestId
 * @param {string}   layerId      - layer the approver acted on
 * @param {string}   action       - 'APPROVED' | 'REJECTED'
 * @param {Object}   actingUser   - { _id, fullName, email, role }
 * @param {Object}   opts         - { comments, rejectionReason }
 * @returns {{ nextLayer, isComplete, finalStatus, action }}
 */
async function completeLayerApproval(requestId, layerId, action, actingUser, opts = {}) {
  const request = await AccessRequest.findById(requestId).populate('workflowId');
  if (!request) throw new Error(`Request ${requestId} not found`);
  if (!request.workflowId) throw new Error('No workflow attached to this request');
  if (request.status !== 'Pending') throw new Error('Request is no longer pending');

  // Daily limit enforcement (max 5 per approver per day)
  await _enforceDailyLimit(actingUser._id);

  const now = new Date();
  const currentLayerStatus = request.layerStatuses.find(
    ls => String(ls.layerId) === String(layerId)
  );
  if (!currentLayerStatus) throw new Error(`Layer ${layerId} not found in this request`);

  // Compute time-to-approve from when this layer became active
  const layerStart = currentLayerStatus.approvalDate || request.createdAt;
  const minutesElapsed = Math.round((now - new Date(layerStart)) / 60000);
  const { isBreached } = currentLayerStatus.slaDeadline
    ? { isBreached: now > new Date(currentLayerStatus.slaDeadline) }
    : { isBreached: false };

  // --- REJECTION ─────────────────────────────────────────────────────────────
  if (action === 'REJECTED') {
    return _handleRejection(request, layerId, actingUser, opts, {
      timeToApprove: minutesElapsed,
      slaBreached: isBreached,
    });
  }

  // --- APPROVAL ──────────────────────────────────────────────────────────────
  // Check if this is a skip (approver is from a higher layer acting early)
  const actingLayerLevel = currentLayerStatus.layerLevel;
  const currentLevel     = request.currentLayerLevel;
  const isSkip           = actingLayerLevel < currentLevel; // acting on a past layer
  const isHigherApprover = actingLayerLevel > currentLevel; // skipping ahead

  if (isHigherApprover) {
    return _handleHigherLevelApproval(request, layerId, actingLayerLevel, actingUser, opts, {
      timeToApprove: minutesElapsed,
      slaBreached: isBreached,
    });
  }

  // Normal approval of current layer
  return _handleNormalApproval(request, layerId, actingLayerLevel, actingUser, opts, {
    timeToApprove: minutesElapsed,
    slaBreached: isBreached,
    now,
  });
}

/**
 * Handle normal sequential approval of the current layer.
 */
async function _handleNormalApproval(request, layerId, layerLevel, actingUser, opts, meta) {
  const now = meta.now || new Date();
  const workflowId = request.workflowId._id || request.workflowId;

  // Stamp this layer as APPROVED in the snapshot
  await _updateLayerStatus(request._id, layerId, {
    status:       'APPROVED',
    approvedBy:   actingUser._id,
    approvalDate: now,
    comments:     opts.comments || '',
    slaBreached:  meta.slaBreached,
  });

  // Record history
  await _recordHistory(request._id, layerId, 'APPROVED', {
    approvedBy:     actingUser._id,
    comments:       opts.comments || '',
    slaDeadline:    request.slaDeadline,
    slaBreached:    meta.slaBreached,
    timeToApprove:  meta.timeToApprove,
    previousStatus: 'PENDING',
    newStatus:      'APPROVED',
  });

  // Load next layer
  const nextLayer = await ApprovalLayer.findOne({
    workflowId: workflowId,
    layerLevel: layerLevel + 1,
  });

  if (!nextLayer) {
    // All layers done → request APPROVED
    return _finalizeWorkflow(request._id, actingUser);
  }

  // Advance to next layer
  const nextApprovers = await routingEngine.findApproversForLayer(nextLayer._id, request.department);
  const nextSLA       = calculateSLADeadline(now, nextLayer.slaHours);

  await AccessRequest.findByIdAndUpdate(request._id, {
    currentApprovalLayerId: nextLayer._id,
    currentLayerLevel:      nextLayer.layerLevel,
    currentApproverIds:     nextApprovers.map(a => a._id),
    slaDeadline:            nextSLA,
    $set: { [`layerStatuses.${_layerIdx(request, nextLayer._id)}.slaDeadline`]: nextSLA },
  });

  await _recordHistory(request._id, nextLayer._id, 'PENDING', {
    slaDeadline: nextSLA,
    newStatus:   'PENDING',
  });

  _audit('LAYER_APPROVED',
    `${actingUser.fullName} approved layer "${layerLevel}" on request ${request._id}. Moving to layer ${nextLayer.layerLevel}.`,
    `AccessRequest:${request._id}`, actingUser._id);

  return {
    isComplete:   false,
    nextLayer:    { id: nextLayer._id, name: nextLayer.layerName, level: nextLayer.layerLevel },
    nextApprovers,
    finalStatus:  null,
    action:       'APPROVED',
  };
}

/**
 * A higher-level approver acts → skip all intermediate layers.
 */
async function _handleHigherLevelApproval(request, layerId, actorLayerLevel, actingUser, opts, meta) {
  const now = new Date();
  const workflowId = request.workflowId._id || request.workflowId;

  // Mark all layers from current up to actorLayerLevel - 1 as SKIPPED
  const skippedLayers = request.layerStatuses.filter(
    ls => ls.layerLevel > request.currentLayerLevel && ls.layerLevel < actorLayerLevel
  );
  for (const ls of skippedLayers) {
    await _updateLayerStatus(request._id, ls.layerId, { status: 'SKIPPED' });
    await _recordHistory(request._id, ls.layerId, 'SKIPPED', {
      approvedBy:  actingUser._id,
      comments:    `Skipped — higher-level approver (${actingUser.fullName}) approved directly.`,
      newStatus:   'SKIPPED',
    });
    _audit('LAYER_SKIPPED',
      `Layer level ${ls.layerLevel} skipped on request ${request._id} by ${actingUser.fullName}`,
      `AccessRequest:${request._id}`, actingUser._id);
  }

  // Mark this layer APPROVED
  await _updateLayerStatus(request._id, layerId, {
    status: 'APPROVED', approvedBy: actingUser._id, approvalDate: now,
    comments: opts.comments || '', slaBreached: meta.slaBreached,
  });
  await _recordHistory(request._id, layerId, 'APPROVED', {
    approvedBy:    actingUser._id,
    comments:      opts.comments || '',
    slaBreached:   meta.slaBreached,
    timeToApprove: meta.timeToApprove,
    previousStatus:'PENDING',
    newStatus:     'APPROVED',
  });

  // Check if any layers remain after this level
  const nextLayer = await ApprovalLayer.findOne({
    workflowId: workflowId,
    layerLevel: { $gt: actorLayerLevel },
  }).sort({ layerLevel: 1 });

  if (!nextLayer) {
    return _finalizeWorkflow(request._id, actingUser);
  }

  const nextApprovers = await routingEngine.findApproversForLayer(nextLayer._id, request.department);
  const nextSLA       = calculateSLADeadline(now, nextLayer.slaHours);

  await AccessRequest.findByIdAndUpdate(request._id, {
    currentApprovalLayerId: nextLayer._id,
    currentLayerLevel:      nextLayer.layerLevel,
    currentApproverIds:     nextApprovers.map(a => a._id),
    slaDeadline:            nextSLA,
  });

  return {
    isComplete:   false,
    nextLayer:    { id: nextLayer._id, name: nextLayer.layerName, level: nextLayer.layerLevel },
    nextApprovers,
    finalStatus:  null,
    action:       'APPROVED',
  };
}

/**
 * Handle rejection: reset request to Layer 1 for resubmission.
 */
async function _handleRejection(request, layerId, actingUser, opts, meta) {
  const now = new Date();
  const workflowId = request.workflowId._id || request.workflowId;

  await _updateLayerStatus(request._id, layerId, {
    status:       'REJECTED',
    approvedBy:   actingUser._id,
    approvalDate: now,
    comments:     opts.rejectionReason || opts.comments || '',
    slaBreached:  meta.slaBreached,
  });

  await _recordHistory(request._id, layerId, 'REJECTED', {
    approvedBy:       actingUser._id,
    rejectionReason:  opts.rejectionReason || '',
    comments:         opts.comments        || '',
    slaBreached:      meta.slaBreached,
    timeToApprove:    meta.timeToApprove,
    resubmitRequired: true,
    previousStatus:   'PENDING',
    newStatus:        'REJECTED',
  });

  // Reset all layer statuses back to PENDING for potential resubmission
  const resetStatuses = request.layerStatuses.map(ls => ({
    ...ls.toObject ? ls.toObject() : ls,
    status:       'PENDING',
    approvedBy:   null,
    approvalDate: null,
    comments:     '',
    slaDeadline:  null,
    slaBreached:  false,
  }));

  // Load Layer 1 to reset to it
  const layer1 = await ApprovalLayer.findOne({ workflowId, layerLevel: 1 });
  const layer1Approvers = layer1
    ? await routingEngine.findApproversForLayer(layer1._id, request.department)
    : [];
  const layer1SLA = layer1 ? calculateSLADeadline(now, layer1.slaHours) : null;

  await AccessRequest.findByIdAndUpdate(request._id, {
    status:                 'Rejected',
    managerComment:         opts.rejectionReason || 'Rejected at approval layer.',
    reviewedBy:             actingUser._id,
    reviewedAt:             now,
    currentApprovalLayerId: layer1 ? layer1._id  : null,
    currentLayerLevel:      layer1 ? layer1.layerLevel : null,
    currentApproverIds:     layer1Approvers.map(a => a._id),
    slaDeadline:            layer1SLA,
    layerStatuses:          resetStatuses,
    $inc: { rejectedCount: 1 },
  });

  _audit('LAYER_REJECTED',
    `${actingUser.fullName} rejected request ${request._id} at layer ${layerId}. Reason: ${opts.rejectionReason || 'none'}`,
    `AccessRequest:${request._id}`, actingUser._id);
  _audit('WORKFLOW_TERMINATED',
    `Workflow rejected for request ${request._id}. Request returned to employee.`,
    `AccessRequest:${request._id}`);

  return {
    isComplete:  true,
    nextLayer:   null,
    finalStatus: 'Rejected',
    action:      'REJECTED',
    message:     'Request rejected and returned to employee with reason.',
  };
}

/**
 * Finalize workflow — all layers approved.
 */
async function _finalizeWorkflow(requestId, actingUser) {
  const now = new Date();

  await AccessRequest.findByIdAndUpdate(requestId, {
    status:      'Approved',
    reviewedBy:  actingUser._id,
    reviewedAt:  now,
    completedAt: now,
    currentApprovalLayerId: null,
    currentApproverIds:     [],
  });

  _audit('WORKFLOW_COMPLETED',
    `All approval layers completed for request ${requestId}. Access APPROVED.`,
    `AccessRequest:${requestId}`, actingUser._id);

  return {
    isComplete:  true,
    nextLayer:   null,
    finalStatus: 'Approved',
    action:      'APPROVED',
    message:     'All approval layers completed. Access granted.',
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _updateLayerStatus(requestId, layerId, updates) {
  const request = await AccessRequest.findById(requestId).select('layerStatuses');
  if (!request) return;

  const idx = request.layerStatuses.findIndex(
    ls => String(ls.layerId) === String(layerId)
  );
  if (idx === -1) return;

  Object.assign(request.layerStatuses[idx], updates);
  await AccessRequest.findByIdAndUpdate(requestId, {
    layerStatuses: request.layerStatuses,
  });
}

function _layerIdx(request, layerId) {
  return request.layerStatuses.findIndex(
    ls => String(ls.layerId) === String(layerId)
  );
}

/**
 * Enforce daily 5-approval limit per approver.
 * Throws if limit reached.
 */
async function _enforceDailyLimit(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await ApprovalHistory.countDocuments({
    approvedBy:     userId,
    approvalAction: 'APPROVED',
    createdAt:      { $gte: startOfDay },
  });

  if (count >= 5) {
    throw new Error('Daily approval limit reached (max 5). Please try again tomorrow or delegate.');
  }
}

// ── Status & Reporting ────────────────────────────────────────────────────────

/**
 * getWorkflowStatus — full status snapshot for a request.
 */
async function getWorkflowStatus(requestId) {
  const request = await AccessRequest.findById(requestId)
    .populate('workflowId', 'workflowName workflowType')
    .populate('currentApprovalLayerId', 'layerName layerLevel slaHours')
    .populate('currentApproverIds', 'fullName email jobTitle department')
    .populate({
      path: 'approvalHistory',
      populate: { path: 'approvedBy', select: 'fullName email' },
      options: { sort: { createdAt: 1 } },
    });

  if (!request) throw new Error(`Request ${requestId} not found`);

  const { isBreached, hoursOverdue } = request.slaDeadline
    ? { isBreached: new Date() > request.slaDeadline, hoursOverdue: Math.max(0, Math.round((new Date() - request.slaDeadline) / 3600000)) }
    : { isBreached: false, hoursOverdue: 0 };

  const approvalPath = generateApprovalPath(
    request.layerStatuses,
    request.currentApprovalLayerId
  );

  return {
    requestId:          request._id,
    status:             request.status,
    workflow:           request.workflowId,
    currentLayer:       request.currentApprovalLayerId,
    currentApprovers:   request.currentApproverIds,
    approvalPath,
    approvalHistory:    request.approvalHistory,
    slaDeadline:        request.slaDeadline,
    slaBreached:        isBreached,
    hoursOverdue,
    escalationCount:    request.escalationCount,
    rejectedCount:      request.rejectedCount,
    completedAt:        request.completedAt,
    estimatedCompletion: _estimateCompletion(request),
  };
}

function _estimateCompletion(request) {
  const pending = (request.layerStatuses || []).filter(ls => ls.status === 'PENDING');
  if (!pending.length) return null;
  // Simple heuristic: current SLA deadline of the last pending layer
  const last = pending[pending.length - 1];
  return last.slaDeadline || null;
}

/**
 * escalateApproval — manually or automatically escalates the current layer.
 */
async function escalateApproval(requestId, reason, triggeredByUserId = null) {
  const request = await AccessRequest.findById(requestId)
    .populate('currentApprovalLayerId');

  if (!request || !request.currentApprovalLayerId) return null;

  const currentLayer = request.currentApprovalLayerId;
  const workflowId   = request.workflowId;

  // Find next layer for escalation
  const escalationLayer = currentLayer.escalationTarget
    ? await ApprovalLayer.findById(currentLayer.escalationTarget)
    : await ApprovalLayer.findOne({ workflowId, layerLevel: currentLayer.layerLevel + 1 });

  if (!escalationLayer) return null; // already at top

  const now          = new Date();
  const nextApprovers = await routingEngine.findApproversForLayer(escalationLayer._id, request.department);
  const nextSLA       = calculateSLADeadline(now, escalationLayer.slaHours);

  await _updateLayerStatus(request._id, currentLayer._id, { status: 'ESCALATED', slaBreached: true });

  await _recordHistory(request._id, currentLayer._id, 'ESCALATED', {
    approvedBy:     triggeredByUserId,
    comments:       reason || 'Auto-escalated due to SLA breach',
    slaBreached:    true,
    newStatus:      'ESCALATED',
    previousStatus: 'PENDING',
    escalationCount: request.escalationCount + 1,
  });

  await AccessRequest.findByIdAndUpdate(request._id, {
    currentApprovalLayerId: escalationLayer._id,
    currentLayerLevel:      escalationLayer.layerLevel,
    currentApproverIds:     nextApprovers.map(a => a._id),
    slaDeadline:            nextSLA,
    lastEscalationAt:       now,
    $inc: { escalationCount: 1 },
  });

  _audit('LAYER_ESCALATED',
    `Request ${requestId} escalated from layer ${currentLayer.layerLevel} → ${escalationLayer.layerLevel}. Reason: ${reason || 'SLA breach'}`,
    `AccessRequest:${requestId}`, triggeredByUserId);

  return {
    escalatedToLayer: escalationLayer,
    newApprovers:     nextApprovers,
    newDeadline:      nextSLA,
  };
}

/**
 * validateWorkflowCompletion — can be called before finalizing to double-check.
 */
async function validateWorkflowCompletion(requestId) {
  const request = await AccessRequest.findById(requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);

  const allApproved = request.layerStatuses.every(
    ls => ['APPROVED', 'SKIPPED'].includes(ls.status)
  );
  const anyRejected = request.layerStatuses.some(ls => ls.status === 'REJECTED');

  return {
    isComplete:  allApproved,
    anyRejected,
    finalStatus: allApproved ? 'Approved' : anyRejected ? 'Rejected' : 'Pending',
  };
}

module.exports = {
  initializeWorkflow,
  completeLayerApproval,
  getWorkflowStatus,
  escalateApproval,
  validateWorkflowCompletion,
};