// server/database/migrations/001_create_workflow_collections.js
/**
 * Migration: Create all multi-level approval collections + indexes.
 * Also seeds one default "Standard Approval Workflow" as a catch-all
 * so new requests immediately benefit from multi-level routing.
 *
 * Run once:  node server/database/migrations/001_create_workflow_collections.js
 *
 * Safe to re-run — uses createIndex({ background: true }) which is idempotent,
 * and checks for existing data before seeding.
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

if (!process.env.MONGO_URI) {
  console.error('❌  MONGO_URI not set in .env');
  process.exit(1);
}

// ── Import models so Mongoose registers the schemas ──────────────────────────
const User               = require('../../models/User');
const AccessRequest      = require('../../models/AccessRequest');
const ApprovalWorkflow   = require('../../models/ApprovalWorkflow');
const ApprovalLayer      = require('../../models/ApprovalLayer');
const ApprovalRule       = require('../../models/ApprovalRule');
const ApprovalAssignment = require('../../models/ApprovalAssignment');
const ApprovalHistory    = require('../../models/ApprovalHistory');

// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  console.log('✅  Connected:', mongoose.connection.host);

  // ── 1. Ensure collections exist ───────────────────────────────────────────
  const colls = await db.listCollections().toArray();
  const names  = colls.map(c => c.name);
  const needed = [
    'approvalworkflows',
    'approvallayers',
    'approvalrules',
    'approvalassignments',
    'approvalhistories',
  ];
  for (const n of needed) {
    if (!names.includes(n)) {
      await db.createCollection(n);
      console.log(`  📁  Created collection: ${n}`);
    } else {
      console.log(`  ✓   Collection exists:  ${n}`);
    }
  }

  // ── 2. Ensure indexes ─────────────────────────────────────────────────────
  console.log('\n🔑  Building indexes …');

  // ApprovalWorkflow
  await db.collection('approvalworkflows').createIndex({ isActive: 1, priority: 1 });
  await db.collection('approvalworkflows').createIndex({ applicableAccessTypes: 1 });
  await db.collection('approvalworkflows').createIndex({ applicableDepartments: 1 });
  console.log('  ✓   approvalworkflows indexes');

  // ApprovalLayer
  await db.collection('approvallayers').createIndex({ workflowId: 1, layerLevel: 1 });
  console.log('  ✓   approvallayers indexes');

  // ApprovalRule
  await db.collection('approvalrules').createIndex({ workflowId: 1, isActive: 1, priority: 1 });
  console.log('  ✓   approvalrules indexes');

  // ApprovalAssignment
  await db.collection('approvalassignments').createIndex(
    { layerId: 1, userId: 1 }, { unique: true }
  );
  await db.collection('approvalassignments').createIndex({ userId: 1, isActive: 1 });
  await db.collection('approvalassignments').createIndex({ layerId: 1, isActive: 1 });
  console.log('  ✓   approvalassignments indexes');

  // ApprovalHistory
  await db.collection('approvalhistories').createIndex({ requestId: 1, createdAt: -1 });
  await db.collection('approvalhistories').createIndex({ approvedBy: 1, createdAt: -1 });
  await db.collection('approvalhistories').createIndex({ layerId: 1, approvalAction: 1 });
  await db.collection('approvalhistories').createIndex({ slaBreached: 1 });
  console.log('  ✓   approvalhistories indexes');

  // AccessRequest — add new indexes for multi-level fields
  await db.collection('accessrequests').createIndex({ workflowId: 1, status: 1 });
  await db.collection('accessrequests').createIndex({ currentApproverIds: 1, status: 1 });
  await db.collection('accessrequests').createIndex({ slaDeadline: 1, status: 1 });
  console.log('  ✓   accessrequests new indexes');

  // ── 3. Seed default workflows (skip if already present) ───────────────────
  const existing = await ApprovalWorkflow.countDocuments();
  if (existing > 0) {
    console.log(`\n⏭   Seed skipped — ${existing} workflow(s) already exist.`);
  } else {
    console.log('\n🌱  Seeding default workflows …');

    // Find admin user for createdBy
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.warn('  ⚠️   No admin user found — run seed.js first, then re-run this migration.');
    } else {
      await _seedDefaultWorkflows(admin._id);
    }
  }

  console.log('\n🎉  Migration 001 complete.\n');
  await mongoose.disconnect();
}

// ─────────────────────────────────────────────────────────────────────────────

async function _seedDefaultWorkflows(adminId) {
  // ── Workflow A: High-Risk Requests (Finance/IT/HR/Ops) ────────────────────
  const highRiskWF = await ApprovalWorkflow.create({
    workflowName:          'High-Risk Access Workflow',
    description:           'Three-layer approval for high-risk role requests (admin, database, payroll, ERP)',
    workflowType:          'SEQUENTIAL',
    applicableAccessTypes: ['*'],
    applicableDepartments: ['*'],
    applicableRiskLevels:  ['high'],
    priority:              10,
    isActive:              true,
    createdBy:             adminId,
  });

  const hrL1 = await ApprovalLayer.create({
    workflowId: highRiskWF._id, layerName: 'Line Manager',
    layerLevel: 1, approvalRoleType: 'LINE_MANAGER',
    requiredApprovers: 1, approvalType: 'ANY_ONE',
    slaHours: 24, escalationEnabled: true, autoEscalateAfterHours: 48,
    description: 'Immediate manager approval',
  });
  const hrL2 = await ApprovalLayer.create({
    workflowId: highRiskWF._id, layerName: 'Senior Manager',
    layerLevel: 2, approvalRoleType: 'SENIOR_MANAGER',
    requiredApprovers: 1, approvalType: 'ANY_ONE',
    slaHours: 24, escalationEnabled: true, autoEscalateAfterHours: 48,
    description: 'Senior manager sign-off',
  });
  const hrL3 = await ApprovalLayer.create({
    workflowId: highRiskWF._id, layerName: 'Department Head / Admin',
    layerLevel: 3, approvalRoleType: 'HEAD',
    requiredApprovers: 1, approvalType: 'ANY_ONE',
    slaHours: 48, escalationEnabled: true, autoEscalateAfterHours: 72,
    description: 'Final sign-off by Head or System Admin',
  });

  // Wire escalation targets
  await ApprovalLayer.findByIdAndUpdate(hrL1._id, { escalationTarget: hrL2._id });
  await ApprovalLayer.findByIdAndUpdate(hrL2._id, { escalationTarget: hrL3._id });

  await ApprovalWorkflow.findByIdAndUpdate(highRiskWF._id, {
    approvalLayers: [hrL1._id, hrL2._id, hrL3._id],
  });
  console.log(`  ✓   High-Risk Workflow: ${highRiskWF._id}`);

  // ── Workflow B: Medium-Risk Requests ──────────────────────────────────────
  const medWF = await ApprovalWorkflow.create({
    workflowName:          'Medium-Risk Access Workflow',
    description:           'Two-layer approval for medium-risk role requests',
    workflowType:          'SEQUENTIAL',
    applicableAccessTypes: ['*'],
    applicableDepartments: ['*'],
    applicableRiskLevels:  ['medium'],
    priority:              20,
    isActive:              true,
    createdBy:             adminId,
  });
  const medL1 = await ApprovalLayer.create({
    workflowId: medWF._id, layerName: 'Line Manager',
    layerLevel: 1, approvalRoleType: 'LINE_MANAGER',
    requiredApprovers: 1, approvalType: 'ANY_ONE',
    slaHours: 24, escalationEnabled: true, autoEscalateAfterHours: 48,
  });
  const medL2 = await ApprovalLayer.create({
    workflowId: medWF._id, layerName: 'Senior Manager',
    layerLevel: 2, approvalRoleType: 'SENIOR_MANAGER',
    requiredApprovers: 1, approvalType: 'ANY_ONE',
    slaHours: 24, escalationEnabled: true, autoEscalateAfterHours: 48,
  });
  await ApprovalLayer.findByIdAndUpdate(medL1._id, { escalationTarget: medL2._id });
  await ApprovalWorkflow.findByIdAndUpdate(medWF._id, {
    approvalLayers: [medL1._id, medL2._id],
  });
  console.log(`  ✓   Medium-Risk Workflow: ${medWF._id}`);

  // ── Workflow C: Standard / Low-Risk (catch-all) ───────────────────────────
  const stdWF = await ApprovalWorkflow.create({
    workflowName:          'Standard Single-Layer Workflow',
    description:           'Single manager approval for low-risk requests (catch-all)',
    workflowType:          'SEQUENTIAL',
    applicableAccessTypes: ['*'],
    applicableDepartments: ['*'],
    applicableRiskLevels:  ['low', '*'],
    priority:              100, // lowest priority — matched last
    isActive:              true,
    createdBy:             adminId,
  });
  const stdL1 = await ApprovalLayer.create({
    workflowId: stdWF._id, layerName: 'Line Manager',
    layerLevel: 1, approvalRoleType: 'LINE_MANAGER',
    requiredApprovers: 1, approvalType: 'ANY_ONE',
    slaHours: 48, escalationEnabled: true, autoEscalateAfterHours: 72,
  });
  await ApprovalWorkflow.findByIdAndUpdate(stdWF._id, {
    approvalLayers: [stdL1._id],
  });
  console.log(`  ✓   Standard Workflow:   ${stdWF._id}`);

  // ── Seed conditional rule example ─────────────────────────────────────────
  await ApprovalRule.create({
    workflowId:    highRiskWF._id,
    ruleName:      'Finance High-Risk Rule',
    description:   'Add all three layers for Finance dept high-risk requests',
    ruleCondition: {
      logicalOperator: 'AND',
      conditions: [
        { field: 'department', operator: 'EQUALS',   value: 'Finance' },
        { field: 'riskLevel',  operator: 'EQUALS',   value: 'high'    },
      ],
    },
    targetLayers: [hrL1._id, hrL2._id, hrL3._id],
    priority:     10,
    isActive:     true,
  });
  console.log('  ✓   Seeded Finance High-Risk rule');

  // ── Now assign existing managers to Layer 1 of each workflow ─────────────
  const managers = await User.find({ role: 'manager', isActive: true });
  const adminUser = await User.findById(adminId);

  const layerAssignments = [
    // Standard & Medium Workflow — Line Manager (Layer 1) for each dept
    ...managers.map(m => ({
      layerId:      stdL1._id,
      userId:       m._id,
      approverRole: 'LINE_MANAGER',
      departments:  [m.department],
      designation:  m.jobTitle,
      approvalLimit: 5,
    })),
    ...managers.map(m => ({
      layerId:      medL1._id,
      userId:       m._id,
      approverRole: 'LINE_MANAGER',
      departments:  [m.department],
      designation:  m.jobTitle,
      approvalLimit: 5,
    })),
    ...managers.map(m => ({
      layerId:      hrL1._id,
      userId:       m._id,
      approverRole: 'LINE_MANAGER',
      departments:  [m.department],
      designation:  m.jobTitle,
      approvalLimit: 5,
    })),
    // Layer 2 (SENIOR_MANAGER) for high-risk and medium — any manager cross-dept
    // In production, assign specific people per department
    ...managers.map(m => ({
      layerId:      hrL2._id,
      userId:       m._id,
      approverRole: 'SENIOR_MANAGER',
      departments:  ['*'],
      designation:  m.jobTitle,
      approvalLimit: 5,
    })),
    ...managers.map(m => ({
      layerId:      medL2._id,
      userId:       m._id,
      approverRole: 'SENIOR_MANAGER',
      departments:  ['*'],
      designation:  m.jobTitle,
      approvalLimit: 5,
    })),
    // Layer 3 (HEAD) for high-risk — admin
    {
      layerId:      hrL3._id,
      userId:       adminId,
      approverRole: 'HEAD',
      departments:  ['*'],
      designation:  adminUser?.jobTitle || 'System Administrator',
      approvalLimit: 5,
    },
  ];

  for (const a of layerAssignments) {
    try {
      await ApprovalAssignment.create({ ...a, isActive: true });
    } catch (e) {
      if (e.code !== 11000) console.warn('  ⚠️   Assignment skip:', e.message);
    }
  }
  console.log(`  ✓   Created ${layerAssignments.length} approver assignments`);
}

run().catch(err => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});