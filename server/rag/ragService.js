const axios = require('axios');
const knowledgeBase = require('./knowledgeBase');
const User = require('../models/User');
const AccessRequest = require('../models/AccessRequest');
const RoleTemplate = require('../models/RoleTemplate');
const AuditLog = require('../models/AuditLog');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const GENERATION_MODEL = process.env.OLLAMA_GENERATION_MODEL || 'llama3.2:1b';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const TOP_K = 3;

let cachedKnowledgeEmbeddings = null;

const ollama = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 120000,
});

function isOllamaConnectionError(error) {
  return ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code);
}

function isOllamaModelError(error) {
  const data = error.response?.data;
  const errorText = typeof data?.error === 'string' ? data.error.toLowerCase() : '';
  return error.response?.status === 404 || errorText.includes('model') || errorText.includes('not found');
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;

  let dot = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aMagnitude += a[i] * a[i];
    bMagnitude += b[i] * b[i];
  }

  if (!aMagnitude || !bMagnitude) return 0;
  return dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

async function createEmbedding(text) {
  const response = await ollama.post('/api/embeddings', {
    model: EMBEDDING_MODEL,
    prompt: text,
  });

  if (!Array.isArray(response.data?.embedding)) {
    throw new Error('Ollama did not return a valid embedding. Confirm the nomic-embed-text model is installed.');
  }

  return response.data.embedding;
}

async function getKnowledgeEmbeddings() {
  if (cachedKnowledgeEmbeddings) return cachedKnowledgeEmbeddings;

  cachedKnowledgeEmbeddings = await Promise.all(
    knowledgeBase.map(async (doc) => ({
      ...doc,
      embedding: await createEmbedding(`${doc.title}\nTopic: ${doc.topic}\n${doc.content}`),
    }))
  );

  return cachedKnowledgeEmbeddings;
}

async function retrieveRelevantDocs(question) {
  const [questionEmbedding, docsWithEmbeddings] = await Promise.all([
    createEmbedding(question),
    getKnowledgeEmbeddings(),
  ]);

  return docsWithEmbeddings
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      topic: doc.topic,
      content: doc.content,
      score: cosineSimilarity(questionEmbedding, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

async function getLiveSystemDocs(user) {
  if (!user?._id && !user?.id) return [];

  if (user.role === 'admin') {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalEmployees,
      activeEmployees,
      totalManagers,
      totalAdmins,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      highRiskPending,
      activeRoleTemplates,
      auditLogCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ role: 'employee' }),
      User.countDocuments({ role: 'employee', isActive: true }),
      User.countDocuments({ role: 'manager' }),
      User.countDocuments({ role: 'admin' }),
      AccessRequest.countDocuments(),
      AccessRequest.countDocuments({ status: 'Pending' }),
      AccessRequest.countDocuments({ status: 'Approved' }),
      AccessRequest.countDocuments({ status: 'Rejected' }),
      AccessRequest.countDocuments({ status: 'Pending', riskLevel: 'high' }),
      RoleTemplate.countDocuments({ isActive: true }),
      AuditLog.countDocuments(),
    ]);

    return [
      {
        id: 'live-admin-system-metrics',
        title: 'Live Admin System Metrics',
        topic: 'live dashboard data',
        content:
          `Live Sentinel EARMS admin database metrics: total users/accounts ${totalUsers}; active users ${activeUsers}; inactive users ${inactiveUsers}; total employee accounts ${totalEmployees}; active employee accounts ${activeEmployees}; manager accounts ${totalManagers}; admin accounts ${totalAdmins}; total access requests ${totalRequests}; pending requests ${pendingRequests}; approved requests ${approvedRequests}; rejected requests ${rejectedRequests}; high-risk pending requests ${highRiskPending}; active role templates ${activeRoleTemplates}; audit log entries ${auditLogCount}. The admin dashboard card named Active Employees uses active employee accounts, not total user accounts.`,
        score: 1,
      },
      {
        id: 'live-user-scope',
        title: 'Live User Scope',
        topic: 'current authenticated user',
        content: `Current authenticated user scope: admin role in ${user.department || 'unknown'} department. Admins can answer organization-wide Sentinel EARMS user, request, role template, audit, and risk metric questions.`,
        score: 1,
      },
    ];
  }

  if (user.role === 'manager') {
    const teamEmployeeFilter = { department: user.department, role: 'employee', isActive: true };
    const teamEmployees = await User.find(teamEmployeeFilter).select('_id');
    const employeeIds = teamEmployees.map((employee) => employee._id);

    const [teamSize, totalTeamRequests, pendingTeamRequests, approvedTeamRequests] = await Promise.all([
      User.countDocuments(teamEmployeeFilter),
      AccessRequest.countDocuments({ employee: { $in: employeeIds } }),
      AccessRequest.countDocuments({ employee: { $in: employeeIds }, status: 'Pending' }),
      AccessRequest.countDocuments({ employee: { $in: employeeIds }, status: 'Approved' }),
    ]);

    return [
      {
        id: 'live-manager-team-metrics',
        title: 'Live Manager Team Metrics',
        topic: 'live team data',
        content:
          `Live Sentinel EARMS manager metrics for ${user.department || 'unknown'} department: active team employees ${teamSize}; total team access requests ${totalTeamRequests}; pending team requests ${pendingTeamRequests}; approved team requests ${approvedTeamRequests}. Managers should answer team questions using department-scoped data.`,
        score: 1,
      },
    ];
  }

  const userId = user._id || user.id;
  const [totalOwnRequests, pendingOwnRequests, approvedOwnRequests, rejectedOwnRequests] = await Promise.all([
    AccessRequest.countDocuments({ employee: userId }),
    AccessRequest.countDocuments({ employee: userId, status: 'Pending' }),
    AccessRequest.countDocuments({ employee: userId, status: 'Approved' }),
    AccessRequest.countDocuments({ employee: userId, status: 'Rejected' }),
  ]);

  return [
    {
      id: 'live-employee-request-metrics',
      title: 'Live Employee Request Metrics',
      topic: 'live employee data',
      content:
        `Live Sentinel EARMS employee metrics for the authenticated user: total own access requests ${totalOwnRequests}; pending own requests ${pendingOwnRequests}; approved own requests ${approvedOwnRequests}; rejected own requests ${rejectedOwnRequests}. Employees should receive answers about their own requests and general Sentinel EARMS workflow, not organization-wide admin counts.`,
      score: 1,
    },
  ];
}

function buildContext(retrievedDocs) {
  return retrievedDocs
    .map((doc, index) => {
      const score = Number.isFinite(doc.score) ? doc.score.toFixed(4) : '0.0000';
      return `[${index + 1}] ${doc.title} (${doc.topic}, similarity: ${score})\n${doc.content}`;
    })
    .join('\n\n');
}

function buildPrompt(question, context, user) {
  const userRole = user?.role || 'unknown';
  const department = user?.department || 'unknown';

  return `You are the Sentinel EARMS assistant for the Sentinel Employee Access Role Management System.

Use only the retrieved context below to answer.
Stay grounded in Sentinel EARMS topics: employee access requests, roles, approval workflow, audit logs, risk levels, users, managers, admins, departments, profiles, password management, notifications, JWT authentication, authorization, and security.
If the question is unrelated to Sentinel EARMS, politely redirect the user to Sentinel EARMS topics.
If the context does not contain enough information, say what is known from Sentinel EARMS and avoid inventing details.
Keep the answer concise, practical, and helpful.

Current user:
- Role: ${userRole}
- Department: ${department}

Retrieved context:
${context}

User question:
${question}

Answer:`;
}

async function generateAnswer(prompt) {
  const response = await ollama.post('/api/generate', {
    model: GENERATION_MODEL,
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
      top_p: 0.9,
    },
  });

  const answer = response.data?.response?.trim();
  if (!answer) {
    throw new Error('Ollama did not return a generated answer.');
  }

  return answer;
}

async function answerQuestion(question, user) {
  const [retrievedDocs, liveDocs] = await Promise.all([
    retrieveRelevantDocs(question),
    getLiveSystemDocs(user),
  ]);
  const allDocs = [...liveDocs, ...retrievedDocs];
  const contextUsed = buildContext(allDocs);
  const prompt = buildPrompt(question, contextUsed, user);
  const finalAnswer = await generateAnswer(prompt);

  const sources = allDocs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    topic: doc.topic,
    score: Number(doc.score.toFixed(4)),
    content: doc.content,
  }));

  return {
    answer: finalAnswer,
    sources,
    contextUsed,
  };
}

module.exports = {
  answerQuestion,
  isOllamaConnectionError,
  isOllamaModelError,
};
