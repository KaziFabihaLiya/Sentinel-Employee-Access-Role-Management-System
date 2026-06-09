/**
 * indexKnowledge.js
 * Run once (and re-run when roles/workflows change):
 *   node server/scripts/indexKnowledge.js
 *
 * What it does:
 *   1. Clears all non-request chunks (policy, role, workflow)
 *   2. Fetches all active roles + workflows from MongoDB
 *   3. Embeds them via HuggingFace
 *   4. Stores chunks + vectors in knowledgechunks collection
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
};

// ── Models ────────────────────────────────────────────────────────────────────
const RoleTemplate     = require('../models/RoleTemplate');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const ApprovalLayer    = require('../models/ApprovalLayer');
const KnowledgeChunk   = require('../models/KnowledgeChunk');
const { getEmbeddings } = require('../services/embeddingService');

// ── Static policy text ────────────────────────────────────────────────────────
const POLICY_CHUNKS = [
  {
    title: 'Submitting access requests',
    type: 'policy',
    text: 'Employees submit access requests with department, job title, requested role, business justification, and access duration. Justification should include the project, business need, expected usage, and time period.',
  },
  {
    title: 'Risk levels',
    type: 'policy',
    text: 'High-risk roles include admin, ERP admin, root, superuser, DBA, payroll, database, HR, and finance access. Medium-risk access includes write, edit, modify, delete, manager, report, or temporary access. Low-risk access is typically read-only and permanent.',
  },
  {
    title: 'Approval flow',
    type: 'policy',
    text: 'Pending access requests are routed to the configured workflow when a matching workflow exists. Workflows can be sequential, parallel, or conditional. Legacy requests without workflow configuration use manager review.',
  },
  {
    title: 'SLA and escalation',
    type: 'policy',
    text: 'Approval layers can define SLA hours and escalation rules. The server checks expired approvals periodically and escalates overdue pending approvals when escalation is enabled.',
  },
  {
    title: 'Least privilege guidance',
    type: 'policy',
    text: 'Employees should request the least privileged role that allows the work to be completed. Prefer read-only roles for reporting and temporary durations for project-based elevated access.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

// HuggingFace free tier can time out on cold start — retry once
const embedWithRetry = async (texts) => {
  try {
    return await getEmbeddings(texts);
  } catch (err) {
    if (err.response?.status === 503) {
      console.log('HF model loading, retrying in 20s...');
      await new Promise((r) => setTimeout(r, 20000));
      return getEmbeddings(texts);
    }
    throw err;
  }
};

// Embed in batches of 16 to stay within HF free tier limits
const batchEmbed = async (items) => {
  const BATCH = 16;
  const results = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    console.log(`  Embedding batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(items.length / BATCH)}...`);
    const vecs = await embedWithRetry(batch.map((item) => item.text));
    batch.forEach((item, idx) => results.push({ ...item, embedding: vecs[idx] }));
  }
  return results;
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await connectDB();

  // 1. Clear stale policy/role/workflow chunks (keep request chunks — they expire via TTL)
  await KnowledgeChunk.deleteMany({ type: { $in: ['policy', 'role', 'workflow'] } });
  console.log('Cleared old policy/role/workflow chunks');

  // 2. Build raw chunks array
  const rawChunks = [];

  // Policy
  POLICY_CHUNKS.forEach((p) => rawChunks.push({ ...p, sourceId: null, metadata: {} }));
  console.log(`Added ${POLICY_CHUNKS.length} policy chunks`);

  // Roles
  const roles = await RoleTemplate.find({ isActive: true }).lean();
  roles.forEach((role) => {
    rawChunks.push({
      title: role.roleName,
      type: 'role',
      sourceId: String(role._id),
      text: `${role.roleName} is a ${role.accessLevel || 'Low'} access role. ${role.description || ''} Permissions: ${(role.permissions || []).join(', ') || 'none'}.`,
      metadata: { accessLevel: role.accessLevel },
    });
  });
  console.log(`Added ${roles.length} role chunks`);

  // Workflows
  const workflows = await ApprovalWorkflow.find({ isActive: true }).lean();
  const layers    = await ApprovalLayer.find({
    workflowId: { $in: workflows.map((w) => w._id) },
  }).lean();

  workflows.forEach((wf) => {
    const wfLayers = layers.filter((l) => String(l.workflowId) === String(wf._id));
    rawChunks.push({
      title: wf.workflowName,
      type: 'workflow',
      sourceId: String(wf._id),
      text: `${wf.workflowName} is a ${wf.workflowType} workflow for departments: ${(wf.applicableDepartments || []).join(', ')} and risk levels: ${(wf.applicableRiskLevels || []).join(', ')}. Layers: ${wfLayers.map((l) => `${l.layerLevel}. ${l.layerName} (${l.approvalRoleType}, SLA ${l.slaHours}h)`).join('; ') || 'none'}.`,
      metadata: { workflowType: wf.workflowType },
    });
  });
  console.log(`Added ${workflows.length} workflow chunks`);

  // 3. Embed everything
  console.log(`\nEmbedding ${rawChunks.length} total chunks via HuggingFace...`);
  const embedded = await batchEmbed(rawChunks);

  // 4. Insert into MongoDB
  await KnowledgeChunk.insertMany(embedded);
  console.log(`\n✅ Indexed ${embedded.length} chunks into knowledgechunks collection`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Indexing failed:', err.message);
  process.exit(1);
});
