// client/src/services/workflowService.js
import axiosInstance from '../api/axiosInstance';

// ── Workflows ─────────────────────────────────────────────────────────────────

export const getWorkflows = (params = {}) =>
  axiosInstance.get('/admin/workflows', { params }).then(r => r.data);

export const getWorkflowById = (workflowId) =>
  axiosInstance.get(`/admin/workflows/${workflowId}`).then(r => r.data);

export const createWorkflow = (data) =>
  axiosInstance.post('/admin/workflows', data).then(r => r.data);

export const updateWorkflow = (workflowId, data) =>
  axiosInstance.put(`/admin/workflows/${workflowId}`, data).then(r => r.data);

export const deleteWorkflow = (workflowId) =>
  axiosInstance.delete(`/admin/workflows/${workflowId}`).then(r => r.data);

export const previewWorkflow = (workflowId) =>
  axiosInstance.get(`/admin/workflows/${workflowId}/preview`).then(r => r.data);

/** Duplicate a workflow by fetching it and re-posting with " (Copy)" suffix */
export const duplicateWorkflow = async (workflowId) => {
  const { workflow } = await getWorkflowById(workflowId);
  return createWorkflow({
    workflowName:          `${workflow.workflowName} (Copy)`,
    description:           workflow.description,
    workflowType:          workflow.workflowType,
    applicableAccessTypes: workflow.applicableAccessTypes,
    applicableDepartments: workflow.applicableDepartments,
    applicableRiskLevels:  workflow.applicableRiskLevels,
    priority:              workflow.priority + 1,
  });
};

// ── Layers ────────────────────────────────────────────────────────────────────

export const getLayers = (workflowId) =>
  axiosInstance.get(`/admin/workflows/${workflowId}/layers`).then(r => r.data);

export const createLayer = (workflowId, data) =>
  axiosInstance.post(`/admin/workflows/${workflowId}/layers`, data).then(r => r.data);

export const updateLayer = (layerId, data) =>
  axiosInstance.put(`/admin/layers/${layerId}`, data).then(r => r.data);

export const deleteLayer = (layerId) =>
  axiosInstance.delete(`/admin/layers/${layerId}`).then(r => r.data);

export const reorderLayer = (layerId, newLayerLevel) =>
  axiosInstance.put(`/admin/layers/${layerId}/reorder`, { newLayerLevel }).then(r => r.data);

// ── Rules ─────────────────────────────────────────────────────────────────────

export const getRules = (workflowId) =>
  axiosInstance.get(`/admin/workflows/${workflowId}/rules`).then(r => r.data);

export const createRule = (workflowId, data) =>
  axiosInstance.post(`/admin/workflows/${workflowId}/rules`, data).then(r => r.data);

export const updateRule = (ruleId, data) =>
  axiosInstance.put(`/admin/rules/${ruleId}`, data).then(r => r.data);

export const deleteRule = (ruleId) =>
  axiosInstance.delete(`/admin/rules/${ruleId}`).then(r => r.data);

export const testRule = (ruleId, testCondition) =>
  axiosInstance.post(`/admin/rules/${ruleId}/test`, { testCondition }).then(r => r.data);

// ── Approval Assignments ──────────────────────────────────────────────────────

export const getAssignments = (params = {}) =>
  axiosInstance.get('/admin/approval-assignments', { params }).then(r => r.data);

export const assignApprover = (data) =>
  axiosInstance.post('/admin/approval-assignments', data).then(r => r.data);

export const updateApproverAssignment = (assignmentId, data) =>
  axiosInstance.put(`/admin/approval-assignments/${assignmentId}`, data).then(r => r.data);

export const removeApproverAssignment = (assignmentId) =>
  axiosInstance.delete(`/admin/approval-assignments/${assignmentId}`).then(r => r.data);

export const getUserAssignedLayers = (userId) =>
  axiosInstance.get(`/admin/users/${userId}/assigned-layers`).then(r => r.data);

// ── SLA & Metrics ─────────────────────────────────────────────────────────────

export const getMetrics = (filters = {}) =>
  axiosInstance.get('/admin/sla-metrics', { params: filters }).then(r => r.data);

export const getSLAReport = (filters = {}) =>
  axiosInstance.get('/admin/sla-report', { params: filters }).then(r => r.data);

export const getEscalationHistory = (filters = {}) =>
  axiosInstance.get('/admin/escalation-history', { params: filters }).then(r => r.data);

export const runEscalationCheck = () =>
  axiosInstance.post('/admin/escalation/run').then(r => r.data);

export const getApprovalDashboard = () =>
  axiosInstance.get('/admin/approval-dashboard').then(r => r.data);