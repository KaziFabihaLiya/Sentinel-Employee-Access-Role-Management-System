// server/seedWorkflow.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const ApprovalWorkflow = require('./models/ApprovalWorkflow');
const ApprovalLayer = require('./models/ApprovalLayer');
const ApprovalAssignment = require('./models/ApprovalAssignment');
const ApprovalRule = require('./models/ApprovalRule');
const AccessRequest = require('./models/AccessRequest');
const User = require('./models/User');
const routingEngine = require('./services/routingEngine');

const calcSlaDeadline = (hours) => new Date(Date.now() + hours * 3600000);

async function seedWorkflows() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Promise.all([
      ApprovalWorkflow.deleteMany({}),
      ApprovalLayer.deleteMany({}),
      ApprovalAssignment.deleteMany({}),
      ApprovalRule.deleteMany({}),
    ]);
    console.log('Cleared old workflow data');

    const [admin, managers] = await Promise.all([
      User.findOne({ role: 'admin' }),
      User.find({ role: 'manager', isActive: true }).sort({ department: 1 }),
    ]);

    if (!admin || managers.length === 0) {
      console.error('No admin or manager found. Run seed.js first.');
      process.exit(1);
    }

    const managerByDept = (dept) => managers.find(m => m.department === dept) || managers[0];
    const seniorPool = [
      managerByDept('IT'),
      managerByDept('Security'),
      managerByDept('Finance'),
      managerByDept('Operations'),
      managerByDept('Engineering'),
      managerByDept('Legal'),
      managerByDept('Sales'),
      managerByDept('HR'),
    ].filter(Boolean);

    const workflows = [
      {
        name: 'Low Risk Standard Access',
        description: 'Fast path for low-risk read-only access.',
        type: 'SEQUENTIAL',
        accessTypes: ['Standard'],
        depts: ['*'],
        risks: ['low'],
        priority: 90,
        layers: [
          { name: 'Line Manager Review', level: 1, role: 'LINE_MANAGER', sla: 24, departments: ['*'] },
          { name: 'Access Administrator Verification', level: 2, role: 'ADMIN', sla: 24, departments: ['*'] },
        ],
      },
      {
        name: 'Medium Risk Business Access',
        description: 'Three-layer approval for write access and time-bound access.',
        type: 'SEQUENTIAL',
        accessTypes: ['Medium'],
        depts: ['*'],
        risks: ['medium'],
        priority: 50,
        layers: [
          { name: 'Line Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 18, departments: ['*'] },
          { name: 'Department Head Approval', level: 2, role: 'HEAD', sla: 36, departments: ['*'] },
          { name: 'IAM Control Check', level: 3, role: 'ADMIN', sla: 24, departments: ['*'] },
        ],
      },
      {
        name: 'High Risk Privileged Access',
        description: 'Four-layer governance track for privileged or sensitive access.',
        type: 'SEQUENTIAL',
        accessTypes: ['High'],
        depts: ['*'],
        risks: ['high'],
        priority: 10,
        layers: [
          { name: 'Line Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 12, departments: ['*'] },
          { name: 'Department Head Approval', level: 2, role: 'HEAD', sla: 24, departments: ['*'] },
          { name: 'Security Review', level: 3, role: 'SENIOR_MANAGER', sla: 24, departments: ['Security', 'IT', '*'] },
          { name: 'Executive Approval', level: 4, role: 'SENIOR_DIRECTOR', sla: 48, departments: ['*'] },
        ],
      },
      {
        name: 'Finance And Payroll Access',
        description: 'Layered controls for finance reporting, payroll, and ERP finance permissions.',
        type: 'SEQUENTIAL',
        accessTypes: ['Medium', 'High'],
        depts: ['Finance', 'HR'],
        risks: ['medium', 'high'],
        priority: 20,
        layers: [
          { name: 'Department Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 12, departments: ['Finance', 'HR'] },
          { name: 'Finance Owner Approval', level: 2, role: 'HEAD', sla: 24, departments: ['Finance', 'HR'], assigneeEmails: ['priya.m@earms.com'] },
          { name: 'Payroll Compliance Review', level: 3, role: 'SENIOR_MANAGER', sla: 36, departments: ['Finance', 'HR'] },
          { name: 'Admin Provisioning Gate', level: 4, role: 'ADMIN', sla: 24, departments: ['*'] },
        ],
      },
      {
        name: 'Database And ERP Administration',
        description: 'Privileged technical access requiring technology and security sign-off.',
        type: 'SEQUENTIAL',
        accessTypes: ['High'],
        depts: ['IT', 'Engineering', 'Finance'],
        risks: ['high'],
        priority: 15,
        layers: [
          { name: 'Engineering Or IT Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 12, departments: ['IT', 'Engineering', 'Finance'] },
          { name: 'Platform Owner Approval', level: 2, role: 'HEAD', sla: 24, departments: ['IT', 'Engineering'] },
          { name: 'Security Architecture Review', level: 3, role: 'SENIOR_MANAGER', sla: 24, departments: ['Security'] },
          { name: 'Senior Director Approval', level: 4, role: 'SENIOR_DIRECTOR', sla: 48, departments: ['*'] },
        ],
      },
      {
        name: 'Security Operations Access',
        description: 'Incident response and SOC access with security leadership review.',
        type: 'SEQUENTIAL',
        accessTypes: ['Medium', 'High'],
        depts: ['Security', 'IT'],
        risks: ['medium', 'high'],
        priority: 25,
        layers: [
          { name: 'Security Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 8, departments: ['Security', 'IT'] },
          { name: 'Incident Commander Review', level: 2, role: 'SENIOR_MANAGER', sla: 12, departments: ['Security'] },
          { name: 'Admin Provisioning Gate', level: 3, role: 'ADMIN', sla: 12, departments: ['*'] },
        ],
      },
      {
        name: 'Production Deployment Access',
        description: 'Release access with manager, platform, security, and executive controls.',
        type: 'SEQUENTIAL',
        accessTypes: ['High'],
        depts: ['Engineering', 'IT'],
        risks: ['high'],
        priority: 18,
        layers: [
          { name: 'Engineering Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 12, departments: ['Engineering', 'IT'] },
          { name: 'Platform Reliability Approval', level: 2, role: 'HEAD', sla: 18, departments: ['Engineering', 'IT'] },
          { name: 'Security Change Review', level: 3, role: 'SENIOR_MANAGER', sla: 24, departments: ['Security'] },
          { name: 'Senior Director Approval', level: 4, role: 'SENIOR_DIRECTOR', sla: 48, departments: ['*'] },
        ],
      },
      {
        name: 'Legal And Compliance Access',
        description: 'Legal records and compliance evidence access with privacy controls.',
        type: 'SEQUENTIAL',
        accessTypes: ['Standard', 'Medium'],
        depts: ['Legal', 'Security', 'HR'],
        risks: ['low', 'medium'],
        priority: 35,
        layers: [
          { name: 'Line Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 24, departments: ['Legal', 'Security', 'HR'] },
          { name: 'Legal Operations Approval', level: 2, role: 'HEAD', sla: 36, departments: ['Legal'] },
          { name: 'Privacy And Compliance Check', level: 3, role: 'SENIOR_MANAGER', sla: 36, departments: ['Legal', 'Security'] },
        ],
      },
      {
        name: 'Customer Data And CRM Access',
        description: 'Customer and sales data approval track with privacy review.',
        type: 'SEQUENTIAL',
        accessTypes: ['Medium', 'High'],
        depts: ['Sales', 'Legal', 'Operations'],
        risks: ['medium', 'high'],
        priority: 30,
        layers: [
          { name: 'Sales Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 18, departments: ['Sales', 'Operations'] },
          { name: 'Data Owner Approval', level: 2, role: 'HEAD', sla: 24, departments: ['Sales', 'Operations'] },
          { name: 'Privacy Review', level: 3, role: 'SENIOR_MANAGER', sla: 36, departments: ['Legal', 'Security'] },
          { name: 'Admin Provisioning Gate', level: 4, role: 'ADMIN', sla: 24, departments: ['*'] },
        ],
      },
      {
        name: 'Operations And Facility Access',
        description: 'Operations tooling and facility-sensitive access approvals.',
        type: 'SEQUENTIAL',
        accessTypes: ['Standard', 'Medium'],
        depts: ['Operations'],
        risks: ['low', 'medium'],
        priority: 45,
        layers: [
          { name: 'Operations Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 24, departments: ['Operations'] },
          { name: 'Facilities Or Process Owner Approval', level: 2, role: 'HEAD', sla: 36, departments: ['Operations'] },
          { name: 'Access Administration Check', level: 3, role: 'ADMIN', sla: 24, departments: ['*'] },
        ],
      },
      {
        name: 'Emergency Break Glass Access',
        description: 'Parallel emergency path that still records security and executive accountability.',
        type: 'PARALLEL',
        accessTypes: ['High'],
        depts: ['*'],
        risks: ['high'],
        priority: 5,
        layers: [
          { name: 'Duty Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 4, departments: ['*'] },
          { name: 'Security Duty Officer Approval', level: 2, role: 'SENIOR_MANAGER', sla: 4, departments: ['Security'] },
          { name: 'Executive Ratification', level: 3, role: 'SENIOR_DIRECTOR', sla: 12, departments: ['*'] },
        ],
      },
      {
        name: 'Conditional High Impact Access',
        description: 'Conditional example for high-risk or temporary cross-department access.',
        type: 'CONDITIONAL',
        accessTypes: ['Medium', 'High'],
        depts: ['*'],
        risks: ['medium', 'high'],
        priority: 40,
        layers: [
          { name: 'Line Manager Approval', level: 1, role: 'LINE_MANAGER', sla: 12, departments: ['*'] },
          { name: 'Department Head Approval', level: 2, role: 'HEAD', sla: 24, departments: ['*'] },
          { name: 'Security Review', level: 3, role: 'SENIOR_MANAGER', sla: 24, departments: ['Security'] },
          { name: 'Admin Provisioning Gate', level: 4, role: 'ADMIN', sla: 24, departments: ['*'] },
        ],
        rules: [
          {
            name: 'High risk or temporary duration',
            condition: {
              logicalOperator: 'OR',
              conditions: [
                { field: 'riskLevel', operator: 'EQUALS', value: 'high' },
                { field: 'accessDuration', operator: 'NOT_EQUALS', value: 'Permanent' },
              ],
            },
            targetLevels: [1, 2, 3, 4],
          },
        ],
      },
    ];

    let totalLayers = 0;
    let totalAssignments = 0;
    let totalRules = 0;

    for (const wf of workflows) {
      const workflow = await ApprovalWorkflow.create({
        workflowName: wf.name,
        description: wf.description,
        workflowType: wf.type,
        applicableAccessTypes: wf.accessTypes,
        applicableDepartments: wf.depts,
        applicableRiskLevels: wf.risks,
        priority: wf.priority,
        createdBy: admin._id,
      });

      const layers = [];
      for (const layerConfig of wf.layers) {
        const layer = await ApprovalLayer.create({
          workflowId: workflow._id,
          layerName: layerConfig.name,
          layerLevel: layerConfig.level,
          approvalRoleType: layerConfig.role,
          requiredApprovers: layerConfig.requiredApprovers || 1,
          approvalType: layerConfig.approvalType || 'ANY_ONE',
          slaHours: layerConfig.sla,
          escalationEnabled: true,
          autoEscalateAfterHours: layerConfig.sla + 12,
          description: `${layerConfig.name} approval layer for ${wf.name}`,
        });
        layers.push({ layer, config: layerConfig });
        totalLayers++;
      }

      await ApprovalWorkflow.findByIdAndUpdate(workflow._id, {
        approvalLayers: layers.map(({ layer }) => layer._id),
      });

      for (let i = 0; i < layers.length - 1; i++) {
        await ApprovalLayer.findByIdAndUpdate(layers[i].layer._id, {
          escalationTarget: layers[i + 1].layer._id,
        });
      }

      for (const { layer, config } of layers) {
        const explicitAssignees = config.assigneeEmails?.length
          ? managers.filter(m => config.assigneeEmails.includes(m.email))
          : [];

        const scopedManagers = config.departments.includes('*')
          ? seniorPool
          : config.departments.map(managerByDept).filter(Boolean);

        const assignees = config.role === 'ADMIN'
          ? [admin]
          : config.role === 'SENIOR_DIRECTOR'
          ? [admin, seniorPool[0]].filter(Boolean)
          : explicitAssignees.length
          ? explicitAssignees
          : scopedManagers;

        const uniqueAssignees = assignees.filter((user, idx, arr) =>
          user && arr.findIndex(u => String(u._id) === String(user._id)) === idx
        );

        for (const user of uniqueAssignees.slice(0, 4)) {
          await ApprovalAssignment.create({
            layerId: layer._id,
            userId: user._id,
            approverRole: config.role,
            departments: config.role === 'LINE_MANAGER' && !config.departments.includes('*')
              ? [user.department]
              : config.departments,
            designation: '*',
            approvalLimit: 5,
            backupApproverId: config.role === 'ADMIN' ? null : admin._id,
          });
          totalAssignments++;
        }
      }

      if (wf.rules) {
        for (const rule of wf.rules) {
          const targetLayers = layers
            .filter(({ layer }) => rule.targetLevels.includes(layer.layerLevel))
            .map(({ layer }) => layer._id);

          await ApprovalRule.create({
            workflowId: workflow._id,
            ruleName: rule.name,
            description: `${rule.name} routing rule for ${wf.name}`,
            ruleCondition: rule.condition,
            targetLayers,
            priority: 10,
          });
          totalRules++;
        }
      }
    }

    const pendingRequests = await AccessRequest.find({ status: 'Pending' }).limit(25);
    let updatedRequests = 0;

    for (const req of pendingRequests) {
      const riskCategory = req.riskLevel === 'high' ? 'High' : req.riskLevel === 'medium' ? 'Medium' : 'Standard';
      const workflow = await ApprovalWorkflow.findOne({
        isActive: true,
        applicableRiskLevels: { $in: [req.riskLevel, '*'] },
        applicableAccessTypes: { $in: [riskCategory, '*'] },
        applicableDepartments: { $in: [req.department, '*'] },
      }).populate({
        path: 'approvalLayers',
        options: { sort: { layerLevel: 1 } },
      }).sort({ priority: 1 });

      const firstLayer = workflow?.approvalLayers?.[0];
      if (!workflow || !firstLayer) continue;

      const approvers = await routingEngine.findApproversForLayer(firstLayer._id, req.department);
      const approverIds = approvers.length
        ? approvers.map(approver => approver._id)
        : [managerByDept(req.department)._id];
      const slaDeadline = calcSlaDeadline(firstLayer.slaHours || 24);

      await AccessRequest.findByIdAndUpdate(req._id, {
        workflowId: workflow._id,
        currentApprovalLayerId: firstLayer._id,
        currentLayerLevel: firstLayer.layerLevel,
        currentApproverIds: approverIds,
        slaDeadline,
        layerStatuses: workflow.approvalLayers.map(layer => ({
          layerId: layer._id,
          layerName: layer.layerName,
          layerLevel: layer.layerLevel,
          status: 'PENDING',
          slaDeadline: String(layer._id) === String(firstLayer._id) ? slaDeadline : null,
          slaBreached: false,
        })),
      });
      updatedRequests++;
    }

    console.log(`Created ${workflows.length} workflows`);
    console.log(`Created ${totalLayers} layers`);
    console.log(`Created ${totalAssignments} assignments`);
    console.log(`Created ${totalRules} conditional rules`);
    console.log(`Updated ${updatedRequests} existing pending requests with workflows`);
    console.log('Workflow seeding completed successfully!');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedWorkflows();
