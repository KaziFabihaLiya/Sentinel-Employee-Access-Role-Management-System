// server/services/slaService.js
/**
 * SLAService — SLA tracking and metrics.
 * Decoupled from the workflow engine for independent testing.
 */

const AccessRequest    = require('../models/AccessRequest');
const ApprovalLayer    = require('../models/ApprovalLayer');
const ApprovalHistory  = require('../models/ApprovalHistory');
const AuditLog         = require('../models/AuditLog');
const { calculateSLADeadline, checkSLABreach } = require('../utils/workflowHelper');

// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculateSLADeadline — proxy for the helper (keeps callers clean).
 */
function calculateLayerSLADeadline(layer, startTime) {
  return calculateSLADeadline(startTime || new Date(), layer.slaHours || 24);
}

/**
 * checkRequestSLABreach
 * Check if the current layer SLA is breached for a single request.
 *
 * @param {string|ObjectId} requestId
 * @returns {{ isBreached, hoursOverdue, slaDeadline }}
 */
async function checkRequestSLABreach(requestId) {
  const request = await AccessRequest.findById(requestId).select('slaDeadline status');
  if (!request || request.status !== 'Pending') {
    return { isBreached: false, hoursOverdue: 0, slaDeadline: null };
  }

  const { isBreached, hoursOverdue } = checkSLABreach(request.slaDeadline);
  return { isBreached, hoursOverdue, slaDeadline: request.slaDeadline };
}

/**
 * getSLAMetrics
 * Aggregated SLA performance for a layer or system-wide over a time range.
 *
 * @param {Object} filters - { layerId?, startDate?, endDate? }
 * @returns {{ totalRequests, breachedCount, avgTimeToApprove, breachedPercentage, byLayer }}
 */
async function getSLAMetrics(filters = {}) {
  const { layerId, startDate, endDate } = filters;

  const match = { approvalAction: { $in: ['APPROVED', 'REJECTED', 'ESCALATED'] } };
  if (layerId)   match.layerId   = mongoose_id(layerId);
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate)   match.createdAt.$lte = new Date(endDate);
  }

  const history = await ApprovalHistory.find(match)
    .populate('layerId', 'layerName layerLevel')
    .lean();

  const totalRequests  = history.length;
  const breachedCount  = history.filter(h => h.slaBreached).length;
  const totalTime      = history.reduce((sum, h) => sum + (h.timeToApprove || 0), 0);
  const avgTimeToApprove = totalRequests
    ? Math.round(totalTime / totalRequests)
    : 0;

  // Group by layer
  const byLayerMap = {};
  for (const h of history) {
    const key = String(h.layerId?._id || h.layerId || 'unknown');
    if (!byLayerMap[key]) {
      byLayerMap[key] = {
        layerName:       h.layerId?.layerName || 'Unknown',
        layerLevel:      h.layerId?.layerLevel || 0,
        total:           0,
        breached:        0,
        totalTime:       0,
      };
    }
    byLayerMap[key].total++;
    if (h.slaBreached) byLayerMap[key].breached++;
    byLayerMap[key].totalTime += h.timeToApprove || 0;
  }

  const byLayer = Object.values(byLayerMap).map(l => ({
    ...l,
    avgTimeToApprove: l.total ? Math.round(l.totalTime / l.total) : 0,
    breachedPercentage: l.total ? Math.round((l.breached / l.total) * 100) : 0,
  })).sort((a, b) => a.layerLevel - b.layerLevel);

  return {
    totalRequests,
    breachedCount,
    avgTimeToApprove,
    breachedPercentage: totalRequests
      ? Math.round((breachedCount / totalRequests) * 100)
      : 0,
    byLayer,
  };
}

/**
 * generateSLAReport — full SLA report for admin export.
 *
 * @param {Object} filters
 * @returns {Object}
 */
async function generateSLAReport(filters = {}) {
  const metrics = await getSLAMetrics(filters);

  // Approver performance
  const approverStats = await ApprovalHistory.aggregate([
    {
      $match: {
        approvalAction: { $in: ['APPROVED', 'REJECTED'] },
        approvedBy: { $ne: null },
        ...(filters.startDate || filters.endDate
          ? { createdAt: {
              ...(filters.startDate ? { $gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate   ? { $lte: new Date(filters.endDate)   } : {}),
            } }
          : {}),
      },
    },
    {
      $group: {
        _id:             '$approvedBy',
        totalActions:    { $sum: 1 },
        approved:        { $sum: { $cond: [{ $eq: ['$approvalAction', 'APPROVED'] }, 1, 0] } },
        rejected:        { $sum: { $cond: [{ $eq: ['$approvalAction', 'REJECTED'] }, 1, 0] } },
        avgTime:         { $avg: '$timeToApprove' },
        slaBreaches:     { $sum: { $cond: ['$slaBreached', 1, 0] } },
      },
    },
    { $sort: { totalActions: -1 } },
    { $limit: 50 },
  ]);

  return {
    generatedAt: new Date(),
    filters,
    summary: metrics,
    approverPerformance: approverStats,
  };
}

/**
 * markSLABreached — update a history record + access request when SLA fires.
 */
async function markSLABreached(requestId, layerId) {
  await ApprovalHistory.findOneAndUpdate(
    { requestId, layerId, approvalAction: 'PENDING' },
    { slaBreached: true },
    { sort: { createdAt: -1 } }
  );

  // Mark layerStatus slaBreached
  const request = await AccessRequest.findById(requestId).select('layerStatuses');
  if (request) {
    const ls = request.layerStatuses.find(l => String(l.layerId) === String(layerId));
    if (ls) {
      ls.slaBreached = true;
      await AccessRequest.findByIdAndUpdate(requestId, { layerStatuses: request.layerStatuses });
    }
  }

  AuditLog.create({
    userName: 'System',
    action:   'SLA_BREACHED',
    details:  `SLA breached for request ${requestId} at layer ${layerId}`,
    resource: `AccessRequest:${requestId}`,
  }).catch(() => {});
}

// tiny helper kept local to avoid requiring mongoose here
function mongoose_id(id) {
  const mongoose = require('mongoose');
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

module.exports = {
  calculateLayerSLADeadline,
  checkRequestSLABreach,
  getSLAMetrics,
  generateSLAReport,
  markSLABreached,
};