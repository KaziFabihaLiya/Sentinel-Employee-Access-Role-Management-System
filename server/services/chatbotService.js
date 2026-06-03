const AccessRequest = require('../models/AccessRequest');
const RoleTemplate = require('../models/RoleTemplate');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ApprovalLayer = require('../models/ApprovalLayer');
const User = require('../models/User');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'our', 'the',
  'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);

const POLICY_DOCS = [
  {
    id: 'policy-request-submit',
    title: 'Submitting access requests',
    type: 'policy',
    text: 'Employees submit access requests with department, job title, requested role, business justification, and access duration. Justification should include the project, business need, expected usage, and time period.',
  },
  {
    id: 'policy-risk-level',
    title: 'Risk levels',
    type: 'policy',
    text: 'High-risk roles include admin, ERP admin, root, superuser, DBA, payroll, database, HR, and finance access. Medium-risk access includes write, edit, modify, delete, manager, report, or temporary access. Low-risk access is typically read-only and permanent.',
  },
  {
    id: 'policy-approval-flow',
    title: 'Approval flow',
    type: 'policy',
    text: 'Pending access requests are routed to the configured workflow when a matching workflow exists. Workflows can be sequential, parallel, or conditional. Legacy requests without workflow configuration use manager review.',
  },
  {
    id: 'policy-escalation',
    title: 'SLA and escalation',
    type: 'policy',
    text: 'Approval layers can define SLA hours and escalation rules. The server checks expired approvals periodically and escalates overdue pending approvals when escalation is enabled.',
  },
  {
    id: 'policy-least-privilege',
    title: 'Least privilege guidance',
    type: 'policy',
    text: 'Employees should request the least privileged role that allows the work to be completed. Prefer read-only roles for reporting and temporary durations for project-based elevated access.',
  },
];

const tokenize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const unique = (items) => [...new Set(items.filter(Boolean))];

const formatDate = (value) => {
  if (!value) return 'not set';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const riskForRole = (roleName = '', duration = 'Permanent') => {
  const role = roleName.toLowerCase();
  if (['admin', 'database', 'payroll', 'erp admin', 'root', 'superuser', 'dba', 'finance', 'hr'].some((term) => role.includes(term))) {
    return 'high';
  }
  if (['manager', 'write', 'edit', 'modify', 'delete', 'report'].some((term) => role.includes(term)) || (duration && duration !== 'Permanent')) {
    return 'medium';
  }
  return 'low';
};

const scoreDocument = (doc, queryTokens) => {
  if (!queryTokens.length) return 0;
  const haystack = `${doc.title} ${doc.type} ${doc.text}`.toLowerCase();
  const docTokenSet = new Set(tokenize(haystack));

  return queryTokens.reduce((score, token) => {
    if (haystack.includes(token)) score += 2;
    if (docTokenSet.has(token)) score += 3;
    return score;
  }, 0);
};

const buildRoleDocs = async () => {
  const roles = await RoleTemplate.find({ isActive: true }).sort({ roleName: 1 }).lean();
  return roles.map((role) => ({
    id: `role-${role._id}`,
    type: 'role',
    title: role.roleName,
    text: `${role.roleName} is a ${role.accessLevel || 'Low'} access role. ${role.description || ''} Permissions: ${(role.permissions || []).join(', ') || 'not listed'}.`,
    data: role,
  }));
};

const buildWorkflowDocs = async () => {
  const workflows = await ApprovalWorkflow.find({ isActive: true })
    .sort({ priority: 1, workflowName: 1 })
    .lean();
  const layers = await ApprovalLayer.find({ workflowId: { $in: workflows.map((workflow) => workflow._id) } })
    .sort({ layerLevel: 1 })
    .lean();

  return workflows.map((workflow) => {
    const workflowLayers = layers.filter((layer) => String(layer.workflowId) === String(workflow._id));
    return {
      id: `workflow-${workflow._id}`,
      type: 'workflow',
      title: workflow.workflowName,
      text: `${workflow.workflowName} is a ${workflow.workflowType} workflow for departments ${(workflow.applicableDepartments || []).join(', ')} and risk levels ${(workflow.applicableRiskLevels || []).join(', ')}. Layers: ${workflowLayers.map((layer) => `${layer.layerLevel}. ${layer.layerName} (${layer.approvalRoleType}, SLA ${layer.slaHours}h)`).join('; ') || 'no layers configured'}. ${workflow.description || ''}`,
      data: { workflow, layers: workflowLayers },
    };
  });
};

const requestVisibilityFilter = async (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'employee') return { employee: user._id };

  const teamEmployees = await User.find({
    department: user.department,
    role: 'employee',
  }).select('_id').lean();

  return { employee: { $in: teamEmployees.map((employee) => employee._id) } };
};

const buildRequestDocs = async (user) => {
  const filter = await requestVisibilityFilter(user);
  const requests = await AccessRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(60)
    .populate('employee', 'fullName email department jobTitle')
    .populate('workflowId', 'workflowName')
    .populate('currentApprovalLayerId', 'layerName layerLevel')
    .lean();

  return requests.map((request) => ({
    id: `request-${request._id}`,
    type: 'request',
    title: `${request.requestedRole} request for ${request.employee?.fullName || 'employee'}`,
    text: `${request.employee?.fullName || 'Employee'} from ${request.department} requested ${request.requestedRole} for ${request.accessDuration || 'Permanent'}. Status: ${request.status}. Risk: ${request.riskLevel}. Job title: ${request.jobTitle}. Justification: ${request.justification}. Workflow: ${request.workflowId?.workflowName || 'legacy manager review'}. Current layer: ${request.currentApprovalLayerId?.layerName || 'none'}. Created: ${formatDate(request.createdAt)}. Manager comment: ${request.managerComment || 'none'}.`,
    data: request,
  }));
};

const retrieveContext = async (question, user) => {
  const queryTokens = unique(tokenize(question));
  const [roleDocs, workflowDocs, requestDocs] = await Promise.all([
    buildRoleDocs(),
    buildWorkflowDocs(),
    buildRequestDocs(user),
  ]);

  const docs = [...POLICY_DOCS, ...roleDocs, ...workflowDocs, ...requestDocs];
  const ranked = docs
    .map((doc) => ({ ...doc, score: scoreDocument(doc, queryTokens) }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return ranked.length ? ranked : docs.slice(0, 4).map((doc) => ({ ...doc, score: 0 }));
};

const summarizeRequests = async (user) => {
  const filter = await requestVisibilityFilter(user);
  const [pending, approved, rejected, latest] = await Promise.all([
    AccessRequest.countDocuments({ ...filter, status: 'Pending' }),
    AccessRequest.countDocuments({ ...filter, status: 'Approved' }),
    AccessRequest.countDocuments({ ...filter, status: 'Rejected' }),
    AccessRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('employee', 'fullName department')
      .lean(),
  ]);

  const latestLines = latest.map((request) =>
    `${request.requestedRole} for ${request.employee?.fullName || 'employee'} is ${request.status} (${request.riskLevel} risk)`
  );

  return [
    `I found ${pending} pending, ${approved} approved, and ${rejected} rejected requests in your visible scope.`,
    latestLines.length ? `Latest visible requests: ${latestLines.join('; ')}.` : 'No visible requests are available yet.',
  ].join(' ');
};

const recommendRoles = async (question) => {
  const roles = await RoleTemplate.find({ isActive: true }).sort({ accessLevel: 1, roleName: 1 }).lean();
  const ranked = roles
    .map((role) => ({
      role,
      score: scoreDocument({
        title: role.roleName,
        type: 'role',
        text: `${role.description || ''} ${(role.permissions || []).join(' ')}`,
      }, tokenize(question)),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.role.accessLevel).localeCompare(String(b.role.accessLevel)))
    .slice(0, 3);

  if (!ranked.length) {
    const lowRisk = roles.filter((role) => role.accessLevel === 'Low').slice(0, 3);
    return `Start with least-privilege roles: ${lowRisk.map((role) => role.roleName).join(', ') || 'no low-risk roles found'}. Add the project name and exact data you need in the justification.`;
  }

  return `The closest role matches are ${ranked.map(({ role }) => `${role.roleName} (${role.accessLevel} risk)`).join(', ')}. Choose the lowest-risk role that covers your exact task and use a temporary duration for project work.`;
};

const explainRisk = (question) => {
  const roleMatch = question.match(/(?:risk|for|role)\s+(.+)$/i);
  const roleName = roleMatch?.[1]?.replace(/[?.!]/g, '').trim();
  if (!roleName || roleName.length < 3) {
    return 'Risk is estimated from the requested role and duration. Admin, database, payroll, HR, finance, root, superuser, and ERP admin access is high risk. Write, delete, reporting, or temporary access is usually medium risk. Read-only permanent access is usually low risk.';
  }
  const risk = riskForRole(roleName);
  return `${roleName} looks like a ${risk}-risk request based on the local risk rules. Add a precise business justification, expected usage, and duration so approvers can validate least privilege.`;
};

const answerFromContext = (question, context, user) => {
  const lower = question.toLowerCase();
  const requestDocs = context.filter((doc) => doc.type === 'request');
  const roleDocs = context.filter((doc) => doc.type === 'role');
  const workflowDocs = context.filter((doc) => doc.type === 'workflow');

  // If every matched doc is a static policy doc (no live DB data matched),
  // return null so the caller can escalate to Groq with enriched context
  // rather than serving a generic policy dump.
  const hasLiveData = requestDocs.length > 0 || roleDocs.length > 0 || workflowDocs.length > 0;
  if (!hasLiveData) return null;

  if (lower.includes('status') || lower.includes('pending') || lower.includes('approved') || lower.includes('rejected')) {
    if (requestDocs.length) {
      const lines = requestDocs.slice(0, 3).map((doc) => {
        const request = doc.data;
        return `${request.requestedRole}: ${request.status}, ${request.riskLevel} risk, current layer ${request.currentApprovalLayerId?.layerName || 'none'}`;
      });
      return `Here are the most relevant visible requests: ${lines.join('; ')}.`;
    }
  }

  if (lower.includes('workflow') || lower.includes('approval') || lower.includes('layer') || lower.includes('sla')) {
    if (workflowDocs.length) {
      const workflow = workflowDocs[0].data.workflow;
      const layers = workflowDocs[0].data.layers;
      return `${workflow.workflowName} uses ${workflow.workflowType.toLowerCase()} approval. ${layers.length ? `Layers: ${layers.map((layer) => `${layer.layerLevel}. ${layer.layerName} (${layer.slaHours}h SLA)`).join('; ')}.` : 'No approval layers are configured yet.'}`;
    }
  }

  if (lower.includes('role') || lower.includes('permission') || lower.includes('access')) {
    if (roleDocs.length) {
      return `Relevant roles I found: ${roleDocs.slice(0, 3).map((doc) => doc.text).join(' ')}`;
    }
  }

  const snippets = context.slice(0, 3).map((doc) => `${doc.title}: ${doc.text}`);
  return `Based on the EARMS knowledge available to your ${user.role} account: ${snippets.join(' ')}`;
};

const suggestActions = (question, context, user) => {
  const suggestions = ['Show my pending requests', 'Which role should I request?', 'Explain approval workflow'];
  if (user.role === 'admin') suggestions.push('Summarize configured workflows');
  if (context.some((doc) => doc.type === 'request')) suggestions.push('Explain this request status');
  if (question.toLowerCase().includes('justify')) suggestions.push('Draft a better justification');
  return unique(suggestions).slice(0, 4);
};

async function answerQuestion(question, user) {
  const cleanQuestion = String(question || '').trim();
  if (!cleanQuestion) {
    return {
      answer: 'Ask me about access roles, request status, approval workflows, risk levels, or how to write a stronger justification.',
      sources: [],
      suggestions: ['Show my pending requests', 'Which role should I request?', 'Explain risk levels'],
    };
  }

  const lower = cleanQuestion.toLowerCase();
  let answer;

  if (lower.includes('summary') || lower.includes('summarize') || lower.includes('overview')) {
    answer = await summarizeRequests(user);
  } else if (lower.includes('recommend') || lower.includes('which role') || lower.includes('what role')) {
    answer = await recommendRoles(cleanQuestion);
  } else if (lower.includes('risk')) {
    answer = explainRisk(cleanQuestion);
  }

  const context = await retrieveContext(cleanQuestion, user);
  if (!answer) answer = answerFromContext(cleanQuestion, context, user);

  return {
    answer,
    mode: 'local-rag',
    sources: context.slice(0, 4).map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      score: doc.score,
    })),
    suggestions: suggestActions(cleanQuestion, context, user),
  };
}

module.exports = { answerQuestion, retrieveContext };