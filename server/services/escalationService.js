// server/services/escalationService.js
/**
 * EscalationService — handles automatic SLA-based escalation.
 *
 * Designed to be called by a periodic cron job (every 15–30 min).
 * Uses workflowEngine.escalateApproval() for the actual escalation logic.
 */

const AccessRequest   = require('../models/AccessRequest');
const ApprovalLayer   = require('../models/ApprovalLayer');
const AuditLog        = require('../models/AuditLog');
const workflowEngine  = require('./workflowEngine');
const slaService      = require('./slaService');

// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkForExpiredApprovals
 * Scans all PENDING multi-level requests whose SLA deadline has passed
 * and auto-escalates them if escalation is enabled on the current layer.
 *
 * @returns {{ checked, escalated, errors }}
 */
async function checkForExpiredApprovals() {
  const now    = new Date();
  const result = { checked: 0, escalated: 0, errors: [] };

  // Find pending requests with a past SLA deadline and an attached workflow
  const overdueRequests = await AccessRequest.find({
    status:     'Pending',
    workflowId: { $ne: null },
    slaDeadline:{ $lt: now },
    currentApprovalLayerId: { $ne: null },
  }).select('_id currentApprovalLayerId escalationCount slaDeadline');

  result.checked = overdueRequests.length;

  for (const req of overdueRequests) {
    try {
      const layer = await ApprovalLayer.findById(req.currentApprovalLayerId)
        .select('escalationEnabled autoEscalateAfterHours layerLevel');

      if (!layer || !layer.escalationEnabled) continue;

      // Check whether the auto-escalate threshold has been crossed
      const hoursOverdue = (now - new Date(req.slaDeadline)) / 3600000;
      if (hoursOverdue < (layer.autoEscalateAfterHours - layer.slaHours || 0)) continue;

      // Mark SLA as breached in the history/layer
      await slaService.markSLABreached(req._id, req.currentApprovalLayerId);

      // Escalate
      const escalation = await workflowEngine.escalateApproval(
        req._id,
        `Auto-escalated after SLA breach (${Math.round(hoursOverdue)}h overdue)`,
        null // system-triggered
      );

      if (escalation) {
        result.escalated++;
        // Log the auto-escalation event
        AuditLog.create({
          userName: 'System',
          action:   'AUTO_ESCALATION_FIRED',
          details:  `Auto-escalated request ${req._id} from layer ${layer.layerLevel} — ${Math.round(hoursOverdue)}h overdue`,
          resource: `AccessRequest:${req._id}`,
        }).catch(() => {});
      }
    } catch (err) {
      result.errors.push({ requestId: String(req._id), error: err.message });
      console.error(`[EscalationService] Failed to escalate ${req._id}:`, err.message);
    }
  }

  return result;
}

/**
 * escalateExpiredApproval
 * Manually escalate a single request (can also be called by admins via API).
 *
 * @param {string} requestId
 * @param {string} layerId
 * @param {string} reason
 * @param {Object} triggeredByUser - { _id, fullName }
 * @returns escalation result from workflowEngine
 */
async function escalateExpiredApproval(requestId, layerId, reason, triggeredByUser = null) {
  await slaService.markSLABreached(requestId, layerId);
  return workflowEngine.escalateApproval(
    requestId,
    reason || 'Manually escalated by admin',
    triggeredByUser?._id || null
  );
}

/**
 * sendEscalationNotification
 * Placeholder — integrate with your email/notification service here.
 * e.g. nodemailer, SendGrid, or an internal notificationService.
 *
 * @param {string} requestId
 * @param {Object} escalatedToUser - { fullName, email }
 * @param {Object} request         - populated AccessRequest
 */
async function sendEscalationNotification(requestId, escalatedToUser, requestData) {
  // TODO: replace with real email logic
  console.log(
    `[EscalationService] 📧 Notification → ${escalatedToUser.email}: ` +
    `Request ${requestId} has been escalated to you for approval.`
  );

  // Example stub for nodemailer:
  // await transporter.sendMail({
  //   to:      escalatedToUser.email,
  //   subject: `[Sentinel] Approval Escalated: ${requestData.requestedRole}`,
  //   html:    escalationEmailTemplate(requestData, escalatedToUser),
  // });
}

/**
 * getEscalationHistory
 * Returns audit log entries for escalation events on a given request or date range.
 *
 * @param {Object} filters - { requestId?, startDate?, endDate? }
 * @returns AuditLog[]
 */
async function getEscalationHistory(filters = {}) {
  const query = {
    action: { $in: ['LAYER_ESCALATED', 'AUTO_ESCALATION_FIRED'] },
  };

  if (filters.requestId) {
    query.resource = `AccessRequest:${filters.requestId}`;
  }
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate)   query.createdAt.$lte = new Date(filters.endDate);
  }

  return AuditLog.find(query).sort({ createdAt: -1 }).limit(200).lean();
}

module.exports = {
  checkForExpiredApprovals,
  escalateExpiredApproval,
  sendEscalationNotification,
  getEscalationHistory,
};