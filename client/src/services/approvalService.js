// client/src/services/approvalService.js
import axiosInstance from '../api/axiosInstance';

// ── Approver Queue ────────────────────────────────────────────────────────────

export const getPendingApprovals = (params = {}) =>
  axiosInstance.get('/approver/pending-approvals', { params }).then(r => r.data);

export const getApprovalDetails = (requestId) =>
  axiosInstance.get(`/approver/pending-approvals/${requestId}/details`).then(r => r.data);

export const getApprovalStatistics = () =>
  axiosInstance.get('/approver/approval-statistics').then(r => r.data);

// ── Actions ───────────────────────────────────────────────────────────────────

export const approveRequest = (requestId, comments = '') =>
  axiosInstance.put(`/approvals/${requestId}/approve`, { comments }).then(r => r.data);

export const rejectRequest = (requestId, rejectionReason, suggestedChanges = '', resubmitAllowed = true) =>
  axiosInstance.put(`/approvals/${requestId}/reject`, {
    rejectionReason,
    suggestedChanges,
    resubmitAllowed,
  }).then(r => r.data);

export const delegateApproval = (requestId, delegateToUserId, reason = '', endDate = null) =>
  axiosInstance.post(`/approvals/${requestId}/delegate`, {
    delegateToUserId,
    reason,
    endDate,
  }).then(r => r.data);

export const escalateApproval = (requestId, reason = '') =>
  axiosInstance.post(`/approvals/${requestId}/escalate`, { reason }).then(r => r.data);

// ── Employee status endpoints ─────────────────────────────────────────────────

export const getApprovalStatus = (requestId) =>
  axiosInstance.get(`/requests/${requestId}/approval-status`).then(r => r.data);

export const getApprovalTimeline = (requestId) =>
  axiosInstance.get(`/requests/${requestId}/approval-timeline`).then(r => r.data);