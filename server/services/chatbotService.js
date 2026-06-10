const AccessRequest    = require('../models/AccessRequest');
const RoleTemplate     = require('../models/RoleTemplate');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ApprovalLayer    = require('../models/ApprovalLayer');
const User             = require('../models/User');
const KnowledgeChunk   = require('../models/KnowledgeChunk');

const { getEmbedding, getQueryEmbedding } = require('./embeddingService');

// ── Stop words + helpers ──────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'our', 'the',
  'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your',
]);

const tokenize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

const unique = (items) => [...new Set(items.filter(Boolean))];

const formatDate = (value) => {
  if (!value) return 'not set';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const riskForRole = (roleName = '', duration = 'Permanent') => {
  const role = roleName.toLowerCase();
  if (['admin', 'database', 'payroll', 'erp admin', 'root', 'superuser', 'dba', 'finance', 'hr'].some((t) => role.includes(t))) return 'high';
  if (['manager', 'write', 'edit', 'modify', 'delete', 'report'].some((t) => role.includes(t)) || (duration && duration !== 'Permanent')) return 'medium';
  return 'low';
};

// ── Count / stat helpers ──────────────────────────────────────────────────────

const COUNT_TRIGGERS = [
  'how many', 'count', 'total users', 'total employees', 'total managers',
  'total admins', 'number of users', 'number of employees',
];

const isCountQuestion = (lower) => COUNT_TRIGGERS.some((t) => lower.includes(t));

const summarizeUsers = async () => {
  const [total, admins, managers, employees] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'manager' }),
    User.countDocuments({ role: 'employee' }),
  ]);
  return `There are ${total} users in the system: ${admins} admin${admins !== 1 ? 's' : ''}, ${managers} manager${managers !== 1 ? 's' : ''}, and ${employees} employee${employees !== 1 ? 's' : ''}.`;
};

// ── Request visibility ────────────────────────────────────────────────────────

const requestVisibilityFilter = async (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'employee') return { employee: user._id };
  const teamEmployees = await User.find({ department: user.department, role: 'employee' }).select('_id').lean();
  return { employee: { $in: teamEmployees.map((e) => e._id) } };
};

// ── Live request docs (for request-specific queries) ─────────────────────────

const buildRequestDocs = async (user) => {
  const filter = await requestVisibilityFilter(user);
  const requests = await AccessRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(60)
    .populate('employee', 'fullName email department jobTitle')
    .populate('workflowId', 'workflowName')
    .populate('currentApprovalLayerId', 'layerName layerLevel')
    .lean();

  return requests.map((r) => ({
    id: `request-${r._id}`,
    type: 'request',
    title: `${r.requestedRole} request for ${r.employee?.fullName || 'employee'}`,
    text: `${r.employee?.fullName || 'Employee'} from ${r.department} requested ${r.requestedRole} for ${r.accessDuration || 'Permanent'}. Status: ${r.status}. Risk: ${r.riskLevel}. Justification: ${r.justification}. Workflow: ${r.workflowId?.workflowName || 'legacy manager review'}. Current layer: ${r.currentApprovalLayerId?.layerName || 'none'}. Created: ${formatDate(r.createdAt)}.`,
    score: 0,
    data: r,
  }));
};

// ── Core: vector retrieval ────────────────────────────────────────────────────

/**
 * retrieveContext
 * 1. Embeds the question via HuggingFace
 * 2. Runs MongoDB Atlas $vectorSearch on knowledgechunks
 * 3. For request-related questions, appends live request docs (not in vector store for privacy)
 * 4. Falls back to keyword scoring if vector search fails (HF timeout, cold start, etc.)
 */
const retrieveContext = async (question, user) => {
  const lower = question.toLowerCase();
  const isRequestQuery = ['status', 'pending', 'approved', 'rejected', 'my request', 'request'].some((t) => lower.includes(t));

  let vectorChunks = [];

  try {
    const queryEmbedding = await getQueryEmbedding(question);

    vectorChunks = await KnowledgeChunk.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 50,
          limit: 5,
        },
      },
      {
        $project: {
          _id: 0,
          id: { $concat: ['chunk-', { $toString: '$_id' }] },
          type: 1,
          title: 1,
          text: 1,
          score: { $meta: 'vectorSearchScore' },
          sourceId: 1,
        },
      },
    ]);
  } catch (err) {
    console.warn('[chatbotService] Vector search failed, falling back to keyword search:', err.message);
    // Graceful fallback — keyword scoring on roles + policies
    return keywordFallback(question, user);
  }

  // Append live request docs when the question is request-related
  // (requests are not stored in the vector index for data-freshness reasons)
  if (isRequestQuery) {
    const requestDocs = await buildRequestDocs(user);
    // Score request docs by keyword so the most relevant bubble up
    const queryTokens = unique(tokenize(question));
    const scoredRequests = requestDocs
      .map((doc) => ({
        ...doc,
        score: queryTokens.reduce((s, t) => s + (doc.text.toLowerCase().includes(t) ? 2 : 0), 0),
      }))
      .filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return [...vectorChunks, ...scoredRequests];
  }

  return vectorChunks;
};

// ── Keyword fallback (when HF is unavailable) ─────────────────────────────────

const POLICY_DOCS = [
  { id: 'policy-request-submit', title: 'Submitting access requests', type: 'policy', text: 'Employees submit access requests with department, job title, requested role, business justification, and access duration.' },
  { id: 'policy-risk-level',     title: 'Risk levels',                type: 'policy', text: 'High-risk roles include admin, ERP admin, root, superuser, DBA, payroll, database, HR, and finance access. Medium-risk: write, edit, modify, delete, manager, report. Low-risk: read-only permanent.' },
  { id: 'policy-approval-flow',  title: 'Approval flow',              type: 'policy', text: 'Pending access requests are routed to the configured workflow. Workflows can be sequential, parallel, or conditional.' },
  { id: 'policy-escalation',     title: 'SLA and escalation',         type: 'policy', text: 'Approval layers define SLA hours and escalation rules. Overdue approvals are auto-escalated.' },
  { id: 'policy-least-priv',     title: 'Least privilege guidance',   type: 'policy', text: 'Request the least privileged role that allows the work. Prefer read-only for reporting and temporary durations for project access.' },
];

const scoreDocument = (doc, queryTokens) => {
  if (!queryTokens.length) return 0;
  const haystack = `${doc.title} ${doc.type} ${doc.text}`.toLowerCase();
  const docTokenSet = new Set(tokenize(haystack));
  return queryTokens.reduce((s, t) => {
    if (haystack.includes(t)) s += 2;
    if (docTokenSet.has(t))   s += 3;
    return s;
  }, 0);
};

const keywordFallback = async (question, user) => {
  const queryTokens = unique(tokenize(question));
  const roles     = await RoleTemplate.find({ isActive: true }).lean();
  const workflows = await ApprovalWorkflow.find({ isActive: true }).lean();
  const layers    = await ApprovalLayer.find({ workflowId: { $in: workflows.map((w) => w._id) } }).lean();

  const roleDocs = roles.map((r) => ({
    id: `role-${r._id}`, type: 'role', title: r.roleName,
    text: `${r.roleName} is a ${r.accessLevel || 'Low'} access role. ${r.description || ''} Permissions: ${(r.permissions || []).join(', ') || 'none'}.`,
  }));

  const workflowDocs = workflows.map((wf) => {
    const wfLayers = layers.filter((l) => String(l.workflowId) === String(wf._id));
    return {
      id: `workflow-${wf._id}`, type: 'workflow', title: wf.workflowName,
      text: `${wf.workflowName} is a ${wf.workflowType} workflow. Layers: ${wfLayers.map((l) => `${l.layerName} (SLA ${l.slaHours}h)`).join('; ') || 'none'}.`,
      data: { workflow: wf, layers: wfLayers },
    };
  });

  const docs = [...POLICY_DOCS, ...roleDocs, ...workflowDocs];
  const ranked = docs
    .map((doc) => ({ ...doc, score: scoreDocument(doc, queryTokens) }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return ranked.length ? ranked : docs.slice(0, 4).map((doc) => ({ ...doc, score: 0 }));
};

// ── Summarize requests ────────────────────────────────────────────────────────

const summarizeRequests = async (user) => {
  const filter = await requestVisibilityFilter(user);
  const [pending, approved, rejected, latest] = await Promise.all([
    AccessRequest.countDocuments({ ...filter, status: 'Pending' }),
    AccessRequest.countDocuments({ ...filter, status: 'Approved' }),
    AccessRequest.countDocuments({ ...filter, status: 'Rejected' }),
    AccessRequest.find(filter).sort({ createdAt: -1 }).limit(5).populate('employee', 'fullName department').lean(),
  ]);
  const latestLines = latest.map((r) => `${r.requestedRole} for ${r.employee?.fullName || 'employee'} is ${r.status} (${r.riskLevel} risk)`);
  return [
    `I found ${pending} pending, ${approved} approved, and ${rejected} rejected requests in your visible scope.`,
    latestLines.length ? `Latest: ${latestLines.join('; ')}.` : 'No visible requests yet.',
  ].join(' ');
};

// Fix 1 — summarizeUsers: counts all users by role and returns a plain summary string.
const summarizeUsers = async () => {
  const [total, admins, managers, employees] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'manager' }),
    User.countDocuments({ role: 'employee' }),
  ]);

  return `There are ${total} users total: ${admins} admin${admins !== 1 ? 's' : ''}, ${managers} manager${managers !== 1 ? 's' : ''}, ${employees} employee${employees !== 1 ? 's' : ''}.`;
};

const recommendRoles = async (question) => {
  const roles = await RoleTemplate.find({ isActive: true }).sort({ accessLevel: 1, roleName: 1 }).lean();
  const ranked = roles
    .map((role) => ({
      role,
      score: scoreDocument(
        { title: role.roleName, type: 'role', text: `${role.description || ''} ${(role.permissions || []).join(' ')}` },
        tokenize(question)
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!ranked.length) {
    const lowRisk = roles.filter((r) => r.accessLevel === 'Low').slice(0, 3);
    return `Start with least-privilege roles: ${lowRisk.map((r) => r.roleName).join(', ') || 'none found'}.`;
  }
  return `Closest matches: ${ranked.map(({ role }) => `${role.roleName} (${role.accessLevel} risk)`).join(', ')}. Choose the lowest-risk role that covers your task.`;
};

// ── Risk explain ──────────────────────────────────────────────────────────────

const explainRisk = (question) => {
  const roleMatch = question.match(/(?:risk|for|role)\s+(.+)$/i);
  const roleName  = roleMatch?.[1]?.replace(/[?.!]/g, '').trim();
  if (!roleName || roleName.length < 3) {
    return 'Admin, database, payroll, HR, finance, root, superuser, and ERP admin access is high risk. Write, delete, reporting, or temporary access is medium risk. Read-only permanent access is low risk.';
  }
  return `${roleName} looks like a ${riskForRole(roleName)}-risk request. Add a precise justification, expected usage, and duration.`;
};

// ── Answer from context ───────────────────────────────────────────────────────

const answerFromContext = (question, context, user) => {
  const lower        = question.toLowerCase();
  const requestDocs  = context.filter((d) => d.type === 'request');
  const roleDocs     = context.filter((d) => d.type === 'role');
  const workflowDocs = context.filter((d) => d.type === 'workflow');

  const hasLiveData = requestDocs.length > 0 || roleDocs.length > 0 || workflowDocs.length > 0;
  if (!hasLiveData) return null; // let Groq handle it

  if (['status', 'pending', 'approved', 'rejected'].some((t) => lower.includes(t)) && requestDocs.length) {
    const lines = requestDocs.slice(0, 3).map((doc) => {
      const r = doc.data;
      return `${r.requestedRole}: ${r.status}, ${r.riskLevel} risk, layer: ${r.currentApprovalLayerId?.layerName || 'none'}`;
    });
    return `Most relevant requests: ${lines.join('; ')}.`;
  }

  if (['workflow', 'approval', 'layer', 'sla'].some((t) => lower.includes(t)) && workflowDocs.length) {
    const wf     = workflowDocs[0].data?.workflow || workflowDocs[0];
    const layers = workflowDocs[0].data?.layers || [];
    const name   = wf.workflowName || wf.title;
    const type   = wf.workflowType ? wf.workflowType.toLowerCase() : '';
    return `${name}${type ? ` uses ${type} approval` : ''}. ${layers.length ? `Layers: ${layers.map((l) => `${l.layerLevel}. ${l.layerName} (${l.slaHours}h SLA)`).join('; ')}.` : ''}`;
  }

  if (['role', 'permission', 'access'].some((t) => lower.includes(t)) && roleDocs.length) {
    return `Relevant roles: ${roleDocs.slice(0, 3).map((d) => d.text).join(' ')}`;
  }

  const snippets = context.slice(0, 3).map((d) => `${d.title}: ${d.text}`);
  return `Based on EARMS data for your ${user.role} account: ${snippets.join(' ')}`;
};

// ── Suggest actions ───────────────────────────────────────────────────────────

const suggestActions = (question, context, user) => {
  const suggestions = ['Show my pending requests', 'Which role should I request?', 'Explain approval workflow'];
  if (user.role === 'admin') suggestions.push('Summarize configured workflows');
  if (context.some((d) => d.type === 'request')) suggestions.push('Explain this request status');
  if (question.toLowerCase().includes('justify')) suggestions.push('Draft a better justification');
  return unique(suggestions).slice(0, 4);
};

// ── Main entry ────────────────────────────────────────────────────────────────

async function answerQuestion(question, user) {
  const cleanQuestion = String(question || '').trim();
  if (!cleanQuestion) {
    return {
      answer: 'Ask me about access roles, request status, approval workflows, risk levels, or how to write a stronger justification.',
      sources: [], suggestions: ['Show my pending requests', 'Which role should I request?', 'Explain risk levels'],
    };
  }

  const lower = cleanQuestion.toLowerCase();
  let answer;

  // Fix 2 — Detect stat/count questions BEFORE all other branches.
  // Trigger words: how many, count, total users, how many users/employees/managers/admins.
  const isUserCountQuestion =
    lower.includes('how many users') ||
    lower.includes('how many employees') ||
    lower.includes('how many managers') ||
    lower.includes('how many admins') ||
    lower.includes('total users') ||
    (lower.includes('how many') && lower.includes('user')) ||
    (lower.includes('count') && (lower.includes('user') || lower.includes('employee') || lower.includes('manager') || lower.includes('admin')));

  if (isUserCountQuestion) {
    answer = await summarizeUsers();
  } else if (lower.includes('summary') || lower.includes('summarize') || lower.includes('overview')) {
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
    mode: 'vector-rag',
    sources: context.slice(0, 4).map((doc) => ({
      id: doc.id, title: doc.title, type: doc.type, score: doc.score,
    })),
    suggestions: suggestActions(cleanQuestion, context, user),
  };
}

// Fix 4 — retrieveContext is already defined above; both are exported here
// so chatbotRoutes.js can call retrieveContext directly for the context
// injection decision in the Groq fallback path.
module.exports = { answerQuestion, retrieveContext };