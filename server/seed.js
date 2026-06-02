// server/seed.js  —  run once: node seed.js
// Creates: 1 Admin, 8 Managers, 34 Employees, 50+ Requests, 16 Role Templates, 30+ Audit Logs
// Admin: admin@earms.com / Admin@@@
const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const User          = require('./models/User');
const AccessRequest = require('./models/AccessRequest');
const RoleTemplate  = require('./models/RoleTemplate');
const AuditLog      = require('./models/AuditLog');

if (!process.env.MONGO_URI) { console.error('❌ MONGO_URI missing'); process.exit(1); }

// ── helpers ───────────────────────────────────────────────────────────────────
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const hoursAgo = (h) => new Date(Date.now() - h * 3600000);
const calcRisk = (role='', dur='Permanent') => {
  const r = role.toLowerCase();
  if (['admin','database','payroll','erp admin','root','superuser','dba'].some(k=>r.includes(k))) return 'high';
  if (['finance','hr','manager','write','delete','modify'].some(k=>r.includes(k)) || (dur && dur!=='Permanent')) return 'medium';
  return 'low';
};

// ── Users ─────────────────────────────────────────────────────────────────────
const USERS = [
  // Admin
  { fullName:'System Admin',        email:'admin@earms.com',       department:'IT',          jobTitle:'System Administrator',  password:'Admin@@@',      role:'admin'    },

  // Managers (8 departments)
  { fullName:'Sarah Chen',          email:'sarah@earms.com',       department:'Finance',     jobTitle:'Finance Manager',       password:'Manager123!',   role:'manager'  },
  { fullName:'Marcus Oduya',        email:'marcus@earms.com',      department:'IT',          jobTitle:'IT Manager',            password:'Manager123!',   role:'manager'  },
  { fullName:'Priya Sharma',        email:'priya.m@earms.com',     department:'HR',          jobTitle:'HR Manager',            password:'Manager123!',   role:'manager'  },
  { fullName:'James Blackwood',     email:'james.m@earms.com',     department:'Operations',  jobTitle:'Operations Manager',    password:'Manager123!',   role:'manager'  },
  { fullName:'Grace Mensah',        email:'grace.m@earms.com',     department:'Security',    jobTitle:'Security Manager',      password:'Manager123!',   role:'manager'  },
  { fullName:'Hiro Tanaka',         email:'hiro.m@earms.com',      department:'Engineering', jobTitle:'Engineering Manager',   password:'Manager123!',   role:'manager'  },
  { fullName:'Elena Petrova',       email:'elena.m@earms.com',     department:'Legal',       jobTitle:'Legal Operations Lead', password:'Manager123!',   role:'manager'  },
  { fullName:'Maya Rahman',         email:'maya.m@earms.com',      department:'Sales',       jobTitle:'Sales Manager',         password:'Manager123!',   role:'manager'  },

  // Finance Employees (5)
  { fullName:'Alex Johnson',        email:'alex@earms.com',        department:'Finance',     jobTitle:'Financial Analyst',     password:'Employee123!',  role:'employee' },
  { fullName:'Priya Kapoor',        email:'priya@earms.com',       department:'Finance',     jobTitle:'Accountant',            password:'Employee123!',  role:'employee' },
  { fullName:'Noah Williams',       email:'noah@earms.com',        department:'Finance',     jobTitle:'Senior Accountant',     password:'Employee123!',  role:'employee' },
  { fullName:'Amelia Brooks',       email:'amelia@earms.com',      department:'Finance',     jobTitle:'Budget Analyst',        password:'Employee123!',  role:'employee' },
  { fullName:'Ethan Kim',           email:'ethan@earms.com',       department:'Finance',     jobTitle:'Finance Coordinator',   password:'Employee123!',  role:'employee' },

  // IT Employees (5)
  { fullName:'James Wilson',        email:'james@earms.com',       department:'IT',          jobTitle:'Software Engineer',     password:'Employee123!',  role:'employee' },
  { fullName:'Lena Müller',         email:'lena@earms.com',        department:'IT',          jobTitle:'DevOps Engineer',       password:'Employee123!',  role:'employee' },
  { fullName:'Carlos Rivera',       email:'carlos@earms.com',      department:'IT',          jobTitle:'Database Administrator',password:'Employee123!',  role:'employee' },
  { fullName:'Aisha Patel',         email:'aisha@earms.com',       department:'IT',          jobTitle:'QA Engineer',           password:'Employee123!',  role:'employee' },
  { fullName:'Ryan Chen',           email:'ryan@earms.com',        department:'IT',          jobTitle:'Backend Developer',     password:'Employee123!',  role:'employee' },

  // HR Employees (4)
  { fullName:'Omar Hassan',         email:'omar@earms.com',        department:'HR',          jobTitle:'HR Specialist',         password:'Employee123!',  role:'employee' },
  { fullName:'Fatima Al-Rashid',    email:'fatima@earms.com',      department:'HR',          jobTitle:'Recruitment Officer',   password:'Employee123!',  role:'employee' },
  { fullName:'Tom Bradley',         email:'tom@earms.com',         department:'HR',          jobTitle:'Training Coordinator',  password:'Employee123!',  role:'employee' },
  { fullName:'Sophie Laurent',      email:'sophie@earms.com',      department:'HR',          jobTitle:'HR Analyst',            password:'Employee123!',  role:'employee' },

  // Operations Employees (4)
  { fullName:'David Park',          email:'david@earms.com',       department:'Operations',  jobTitle:'Operations Analyst',    password:'Employee123!',  role:'employee' },
  { fullName:'Maria Gonzalez',      email:'maria@earms.com',       department:'Operations',  jobTitle:'Supply Chain Analyst',  password:'Employee123!',  role:'employee' },
  { fullName:'Chris Thompson',      email:'chris@earms.com',       department:'Operations',  jobTitle:'Process Engineer',      password:'Employee123!',  role:'employee' },
  { fullName:'Nadia Ivanova',       email:'nadia@earms.com',       department:'Operations',  jobTitle:'Logistics Coordinator', password:'Employee123!',  role:'employee' },

  // Security Employees (4)
  { fullName:'Leah Morgan',         email:'leah@earms.com',        department:'Security',    jobTitle:'IAM Analyst',           password:'Employee123!',  role:'employee' },
  { fullName:'Ahmed Khan',          email:'ahmed@earms.com',       department:'Security',    jobTitle:'SOC Analyst',           password:'Employee123!',  role:'employee' },
  { fullName:'Mei Lin',             email:'mei@earms.com',         department:'Security',    jobTitle:'GRC Specialist',        password:'Employee123!',  role:'employee' },
  { fullName:'Victor Santos',       email:'victor@earms.com',      department:'Security',    jobTitle:'Security Engineer',     password:'Employee123!',  role:'employee' },

  // Engineering Employees (4)
  { fullName:'Anika Das',           email:'anika@earms.com',       department:'Engineering', jobTitle:'Frontend Engineer',      password:'Employee123!',  role:'employee' },
  { fullName:'Ben Carter',          email:'ben@earms.com',         department:'Engineering', jobTitle:'Platform Engineer',      password:'Employee123!',  role:'employee' },
  { fullName:'Nora Ahmed',          email:'nora@earms.com',        department:'Engineering', jobTitle:'Data Engineer',          password:'Employee123!',  role:'employee' },
  { fullName:'Samuel Reed',         email:'samuel@earms.com',      department:'Engineering', jobTitle:'SRE',                    password:'Employee123!',  role:'employee' },

  // Legal Employees (4)
  { fullName:'Iris Campbell',       email:'iris@earms.com',        department:'Legal',       jobTitle:'Contract Analyst',      password:'Employee123!',  role:'employee' },
  { fullName:'Rafael Costa',        email:'rafael@earms.com',      department:'Legal',       jobTitle:'Compliance Associate',  password:'Employee123!',  role:'employee' },
  { fullName:'Mariam Uddin',        email:'mariam@earms.com',      department:'Legal',       jobTitle:'Privacy Analyst',       password:'Employee123!',  role:'employee' },
  { fullName:'Oliver Grant',        email:'oliver@earms.com',      department:'Legal',       jobTitle:'Legal Coordinator',     password:'Employee123!',  role:'employee' },

  // Sales Employees (4)
  { fullName:'Talia Evans',         email:'talia@earms.com',       department:'Sales',       jobTitle:'Account Executive',     password:'Employee123!',  role:'employee' },
  { fullName:'Yusuf Rahman',        email:'yusuf@earms.com',       department:'Sales',       jobTitle:'Sales Operations Analyst',password:'Employee123!', role:'employee' },
  { fullName:'Clara Nguyen',        email:'clara@earms.com',       department:'Sales',       jobTitle:'Customer Success Lead', password:'Employee123!',  role:'employee' },
  { fullName:'Mateo Silva',         email:'mateo@earms.com',       department:'Sales',       jobTitle:'Partner Manager',       password:'Employee123!',  role:'employee' },
];

// ── Role Templates (16) ────────────────────────────────────────────────────────
const ROLES = [
  { roleName:'Finance Viewer',      description:'Read-only access to financial reports and dashboards',          accessLevel:'Low',    permissions:['read:finance','read:reports','read:dashboard','view:invoices'] },
  { roleName:'Finance Analyst',     description:'Full finance data access including write and reporting',         accessLevel:'Medium', permissions:['read:finance','write:finance','read:reports','write:reports','view:invoices','export:data'] },
  { roleName:'Payroll Processor',   description:'Access to process and view payroll records',                    accessLevel:'High',   permissions:['read:payroll','write:payroll','approve:payroll','view:salaries','export:payroll'] },
  { roleName:'HR Viewer',           description:'Read-only access to HR records and employee data',              accessLevel:'Low',    permissions:['read:hr','view:employees','read:attendance','view:contracts'] },
  { roleName:'HR Administrator',    description:'Full HR module access including write and management',           accessLevel:'Medium', permissions:['read:hr','write:hr','manage:employees','manage:contracts','read:attendance','write:attendance','approve:leave'] },
  { roleName:'ERP Admin',           description:'Full ERP system administration — highest privilege level',      accessLevel:'High',   permissions:['admin:erp','admin:users','admin:roles','read:all','write:all','delete:records','approve:all','system:config'] },
  { roleName:'Report Reader',       description:'Read-only access to cross-department system reports',           accessLevel:'Low',    permissions:['read:reports','view:analytics','read:dashboard','export:reports'] },
  { roleName:'Operations Analyst',  description:'Access to operations data, supply chain and logistics',         accessLevel:'Medium', permissions:['read:operations','write:operations','view:logistics','manage:inventory','read:suppliers','create:orders'] },
  { roleName:'IT Support Access',   description:'Access to IT systems for helpdesk and support operations',      accessLevel:'Medium', permissions:['read:systems','restart:services','view:logs','manage:tickets','access:vpn','remote:support'] },
  { roleName:'Data Analyst',        description:'Cross-functional read access for business intelligence',         accessLevel:'Medium', permissions:['read:finance','read:hr','read:operations','read:reports','export:data','view:analytics','create:reports'] },
  { roleName:'IAM Auditor',         description:'Read access to identity governance evidence and access reviews', accessLevel:'Medium', permissions:['read:iam','read:audit','view:access-reviews','export:evidence'] },
  { roleName:'Security Responder',  description:'Security operations access for incident investigation',          accessLevel:'High',   permissions:['read:systems','read:logs','isolate:endpoint','manage:incidents','export:security'] },
  { roleName:'Source Code Writer',  description:'Repository write access for engineering delivery teams',         accessLevel:'Medium', permissions:['read:repos','write:repos','create:pull-request','run:ci','read:artifacts'] },
  { roleName:'Production Deploy',   description:'Controlled production deployment and release access',            accessLevel:'High',   permissions:['deploy:production','rollback:release','read:logs','manage:feature-flags'] },
  { roleName:'Legal Records Viewer',description:'Read-only access to contracts, legal cases, and policy records', accessLevel:'Low',    permissions:['read:contracts','read:policies','view:legal-cases'] },
  { roleName:'Compliance Manager',  description:'Compliance workflow access for controls and evidence tracking',  accessLevel:'Medium', permissions:['read:compliance','write:controls','approve:evidence','export:audit'] },
  { roleName:'CRM Sales User',      description:'Sales CRM access for account and opportunity management',        accessLevel:'Medium', permissions:['read:crm','write:accounts','write:opportunities','view:forecast'] },
  { roleName:'Customer Data Admin', description:'Privileged customer data access for support and success leads',   accessLevel:'High',   permissions:['read:customers','write:customers','export:customers','manage:consents'] },
];

// ── Build requests from a template array ──────────────────────────────────────
// We'll generate them dynamically after users are created
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await Promise.all([User.deleteMany({}), AccessRequest.deleteMany({}), RoleTemplate.deleteMany({}), AuditLog.deleteMany({})]);
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const u of USERS) {
      createdUsers.push(await User.create(u));
    }
    console.log(`👥 Created ${createdUsers.length} users`);

    const admin     = createdUsers.find(u=>u.role==='admin');
    const managers  = createdUsers.filter(u=>u.role==='manager');
    const employees = createdUsers.filter(u=>u.role==='employee');
    const mgByDept  = (dept) => managers.find(m=>m.department===dept);
    const empByDept = (dept) => employees.filter(e=>e.department===dept);

    // Create role templates
    for (const r of ROLES) {
      await RoleTemplate.create({ ...r, createdBy: admin._id });
    }
    console.log(`✦  Created ${ROLES.length} role templates`);

    // ── Access Requests (55 total) ────────────────────────────────────────────
    const REQ_TEMPLATES = [
      // Finance dept requests (mgr: Sarah Chen)
      ...empByDept('Finance').flatMap(emp => [
        { employee:emp._id, department:'Finance', jobTitle:emp.jobTitle, requestedRole:'Finance Viewer',    justification:`Required for daily financial dashboard access and monthly reporting for ${emp.jobTitle} role. Essential for completing quarterly reviews.`, accessDuration:'Permanent',  status:'Approved', reviewedBy:mgByDept('Finance')._id, reviewedAt:daysAgo(5),  managerComment:'Approved — aligns with job responsibilities.' },
        { employee:emp._id, department:'Finance', jobTitle:emp.jobTitle, requestedRole:'Finance Analyst',   justification:`Need full finance access to complete Q3 analysis project assigned by department head. Will use for budget reconciliation.`, accessDuration:'3 Months',   status:'Pending',  riskLevel:'medium' },
        { employee:emp._id, department:'Finance', jobTitle:emp.jobTitle, requestedRole:'Report Reader',     justification:`Cross-departmental reporting access needed for management presentation preparation scheduled for next month.`, accessDuration:'Permanent',  status:'Approved', reviewedBy:mgByDept('Finance')._id, reviewedAt:daysAgo(12), managerComment:'Approved.' },
      ]),
      // Extra Finance requests
      { employee:empByDept('Finance')[0]._id, department:'Finance', jobTitle:'Financial Analyst', requestedRole:'Payroll Processor', justification:`Temporary payroll access needed while senior processor is on medical leave. Required for end-of-month salary processing and compliance.`, accessDuration:'1 Month', status:'Rejected', reviewedBy:mgByDept('Finance')._id, reviewedAt:daysAgo(3), managerComment:'Rejected — payroll access requires security clearance not yet completed.' },
      { employee:empByDept('Finance')[1]._id, department:'Finance', jobTitle:'Accountant', requestedRole:'ERP Admin', justification:`Need admin access for emergency data migration during system upgrade scheduled this week.`, accessDuration:'1 Week', status:'Pending', riskLevel:'high' },
      { employee:empByDept('Finance')[2]._id, department:'Finance', jobTitle:'Senior Accountant', requestedRole:'Data Analyst', justification:`Cross-functional data access needed for annual audit preparation. Will work with external auditors who require multiple data sources.`, accessDuration:'2 Weeks', status:'Approved', reviewedBy:mgByDept('Finance')._id, reviewedAt:daysAgo(8), managerComment:'Approved for audit period only.' },

      // IT dept requests (mgr: Marcus Oduya)
      ...empByDept('IT').flatMap(emp => [
        { employee:emp._id, department:'IT', jobTitle:emp.jobTitle, requestedRole:'IT Support Access',  justification:`Required for helpdesk operations and remote support capabilities. Standard access for ${emp.jobTitle} role to manage support tickets.`, accessDuration:'Permanent',  status:'Approved', reviewedBy:mgByDept('IT')._id, reviewedAt:daysAgo(7),  managerComment:'Approved — standard IT role access.' },
        { employee:emp._id, department:'IT', jobTitle:emp.jobTitle, requestedRole:'Report Reader',      justification:`Need system-wide report access to monitor SLA compliance metrics and generate monthly performance reports for management.`, accessDuration:'Permanent',  status:'Approved', reviewedBy:mgByDept('IT')._id, reviewedAt:daysAgo(4),  managerComment:'Approved.' },
      ]),
      // Extra IT
      { employee:empByDept('IT')[0]._id, department:'IT', jobTitle:'Software Engineer', requestedRole:'ERP Admin', justification:`Admin access required for Q3 system migration project. Will be used strictly for database schema changes during the maintenance window.`, accessDuration:'3 Months', status:'Pending', riskLevel:'high' },
      { employee:empByDept('IT')[1]._id, department:'IT', jobTitle:'DevOps Engineer', requestedRole:'Finance Viewer', justification:`Read access to finance module needed for integrating payment gateway API. Only read operations will be performed.`, accessDuration:'1 Month', status:'Pending', riskLevel:'medium' },
      { employee:empByDept('IT')[2]._id, department:'IT', jobTitle:'Database Administrator', requestedRole:'Payroll Processor', justification:`Need payroll database access to perform schema optimization and index maintenance for performance improvements.`, accessDuration:'2 Weeks', status:'Rejected', reviewedBy:mgByDept('IT')._id, reviewedAt:daysAgo(2), managerComment:'Rejected — payroll access not required for DB optimization. Use read-only replica.' },
      { employee:empByDept('IT')[3]._id, department:'IT', jobTitle:'QA Engineer', requestedRole:'Data Analyst', justification:`Cross-functional data access needed to test data pipeline integrity across finance and HR modules. Part of Q4 testing sprint.`, accessDuration:'1 Month', status:'Approved', reviewedBy:mgByDept('IT')._id, reviewedAt:daysAgo(1), managerComment:'Approved for testing sprint duration.' },

      // HR dept requests (mgr: Priya Sharma)
      ...empByDept('HR').flatMap(emp => [
        { employee:emp._id, department:'HR', jobTitle:emp.jobTitle, requestedRole:'HR Viewer',        justification:`Basic HR record access required for ${emp.jobTitle} daily operations. Need to view employee files and attendance records.`, accessDuration:'Permanent',  status:'Approved', reviewedBy:mgByDept('HR')._id, reviewedAt:daysAgo(9),  managerComment:'Approved — standard HR access.' },
        { employee:emp._id, department:'HR', jobTitle:emp.jobTitle, requestedRole:'HR Administrator', justification:`Full HR access needed for onboarding new employees, managing contracts, and processing leave approvals. Core to my role responsibilities.`, accessDuration:'Permanent',  status:'Pending',  riskLevel:'medium' },
      ]),
      { employee:empByDept('HR')[0]._id, department:'HR', jobTitle:'HR Specialist', requestedRole:'Payroll Processor', justification:`Payroll processing access needed as backup processor while primary is on extended leave. Trained and certified for payroll operations.`, accessDuration:'1 Month', status:'Pending', riskLevel:'high' },
      { employee:empByDept('HR')[1]._id, department:'HR', jobTitle:'Recruitment Officer', requestedRole:'Report Reader', justification:`Need cross-department report access for workforce analytics and recruitment planning presentations to leadership.`, accessDuration:'Permanent', status:'Approved', reviewedBy:mgByDept('HR')._id, reviewedAt:daysAgo(6), managerComment:'Approved — essential for recruitment analytics.' },

      // Operations dept requests (mgr: James Blackwood)
      ...empByDept('Operations').flatMap(emp => [
        { employee:emp._id, department:'Operations', jobTitle:emp.jobTitle, requestedRole:'Operations Analyst',  justification:`Core access for daily operations management, supply chain tracking, and inventory management responsibilities.`, accessDuration:'Permanent',  status:'Approved', reviewedBy:mgByDept('Operations')._id, reviewedAt:daysAgo(10), managerComment:'Approved.' },
        { employee:emp._id, department:'Operations', jobTitle:emp.jobTitle, requestedRole:'Report Reader',       justification:`Cross-departmental reporting access for operational efficiency analysis and monthly KPI dashboard preparation.`, accessDuration:'Permanent',  status:'Approved', reviewedBy:mgByDept('Operations')._id, reviewedAt:daysAgo(3),  managerComment:'Approved for KPI reporting.' },
      ]),
      { employee:empByDept('Operations')[0]._id, department:'Operations', jobTitle:'Operations Analyst', requestedRole:'Finance Viewer', justification:`Read access to financial data needed for cost-benefit analysis of new supply chain initiatives being evaluated this quarter.`, accessDuration:'3 Months', status:'Pending', riskLevel:'low' },
      { employee:empByDept('Operations')[1]._id, department:'Operations', jobTitle:'Supply Chain Analyst', requestedRole:'Data Analyst', justification:`Multi-department data access for comprehensive supply chain optimization study being conducted across Finance, HR and Operations.`, accessDuration:'2 Weeks', status:'Approved', reviewedBy:mgByDept('Operations')._id, reviewedAt:daysAgo(2), managerComment:'Approved for research project.' },
      { employee:empByDept('Operations')[2]._id, department:'Operations', jobTitle:'Process Engineer', requestedRole:'ERP Admin', justification:`Temporary ERP admin access required for implementing new workflow automation that requires system-level configuration changes.`, accessDuration:'1 Week', status:'Pending', riskLevel:'high' },
      { employee:empByDept('Operations')[3]._id, department:'Operations', jobTitle:'Logistics Coordinator', requestedRole:'IT Support Access', justification:`IT support access needed to manage remote terminals in warehouse locations and troubleshoot daily operational issues.`, accessDuration:'Permanent', status:'Rejected', reviewedBy:mgByDept('Operations')._id, reviewedAt:daysAgo(1), managerComment:'Rejected — please submit an IT Support ticket instead for individual issues.' },
    ];

    let requestsCreated = 0;
    for (const r of REQ_TEMPLATES) {
      const risk = r.riskLevel || calcRisk(r.requestedRole, r.accessDuration);
      await AccessRequest.create({
        ...r,
        riskLevel: risk,
        createdAt: daysAgo(Math.floor(Math.random()*20)+1),
      });
      requestsCreated++;
    }
    console.log(`📋 Created ${requestsCreated} access requests`);

    // ── Audit Logs (35+) ──────────────────────────────────────────────────────
    const allReqs = await AccessRequest.find().populate('employee','fullName email');
    const auditEntries = [
      // Logins
      { userId:admin._id,       userName:'System Admin',     userEmail:'admin@earms.com',    userRole:'admin',    action:'USER_LOGIN',      details:'System Admin logged in',                       ipAddress:'192.168.1.1' },
      ...managers.map(m=>({ userId:m._id, userName:m.fullName, userEmail:m.email, userRole:'manager', action:'USER_LOGIN', details:`${m.fullName} logged in`, ipAddress:`10.0.0.${Math.floor(Math.random()*50)+10}` })),
      ...employees.slice(0,8).map(e=>({ userId:e._id, userName:e.fullName, userEmail:e.email, userRole:'employee', action:'USER_LOGIN', details:`${e.fullName} logged in`, ipAddress:`10.0.1.${Math.floor(Math.random()*100)+10}` })),

      // Registrations
      ...employees.slice(0,5).map(e=>({ userId:e._id, userName:e.fullName, userEmail:e.email, userRole:'employee', action:'USER_REGISTERED', details:`${e.fullName} registered as employee in ${e.department}`, ipAddress:`10.0.1.${Math.floor(Math.random()*100)+10}` })),

      // Request submissions
      ...allReqs.slice(0,10).map(r=>({ userId:r.employee?._id, userName:r.employee?.fullName||'Unknown', userEmail:r.employee?.email||'', userRole:'employee', action:'REQUEST_SUBMITTED', details:`${r.employee?.fullName||'Employee'} submitted access request for role: ${r.requestedRole}`, resource:`AccessRequest:${r._id}`, ipAddress:`10.0.1.${Math.floor(Math.random()*100)+10}` })),

      // Approvals & rejections
      ...allReqs.filter(r=>r.status==='Approved').slice(0,8).map(r=>({ userId:r.reviewedBy, userName:managers.find(m=>m._id.toString()===r.reviewedBy?.toString())?.fullName||'Manager', userEmail:managers.find(m=>m._id.toString()===r.reviewedBy?.toString())?.email||'', userRole:'manager', action:'REQUEST_APPROVED', details:`Approved ${r.requestedRole} access for ${r.employee?.fullName||'employee'}`, resource:`AccessRequest:${r._id}`, ipAddress:`10.0.0.${Math.floor(Math.random()*50)+10}` })),
      ...allReqs.filter(r=>r.status==='Rejected').slice(0,5).map(r=>({ userId:r.reviewedBy, userName:managers.find(m=>m._id.toString()===r.reviewedBy?.toString())?.fullName||'Manager', userEmail:managers.find(m=>m._id.toString()===r.reviewedBy?.toString())?.email||'', userRole:'manager', action:'REQUEST_REJECTED', details:`Rejected ${r.requestedRole} access for ${r.employee?.fullName||'employee'}. Comment: ${r.managerComment}`, resource:`AccessRequest:${r._id}`, ipAddress:`10.0.0.${Math.floor(Math.random()*50)+10}` })),

      // Admin actions
      { userId:admin._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'ROLE_CREATED',      details:'Created role template: Finance Analyst with Medium risk level',      resource:'RoleTemplate', ipAddress:'192.168.1.1' },
      { userId:admin._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'ROLE_CREATED',      details:'Created role template: ERP Admin with High risk level',             resource:'RoleTemplate', ipAddress:'192.168.1.1' },
      { userId:admin._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'ROLE_UPDATED',      details:'Updated permissions for HR Administrator role template',           resource:'RoleTemplate', ipAddress:'192.168.1.1' },
      { userId:admin._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'ROLE_CHANGED',      details:`Changed ${employees[0].fullName}'s role from employee to employee`, resource:`User:${employees[0]._id}`, ipAddress:'192.168.1.1' },
      { userId:admin._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'USER_ACTIVATED',    details:`Activated user account: ${employees[2].fullName}`,                resource:`User:${employees[2]._id}`, ipAddress:'192.168.1.1' },
      { userId:admin._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'USER_DEACTIVATED',  details:'Temporarily deactivated contractor account for security review',   resource:'User', ipAddress:'192.168.1.1' },
      { userId:admin._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'ACCESS_REVOKED',    details:`Revoked Finance Viewer access from ${employees[4].fullName} — role change`, resource:`User:${employees[4]._id}`, ipAddress:'192.168.1.1' },

      // Profile updates
      ...employees.slice(0,4).map(e=>({ userId:e._id, userName:e.fullName, userEmail:e.email, userRole:'employee', action:'PROFILE_UPDATED', details:`${e.fullName} updated their profile information`, resource:`User:${e._id}`, ipAddress:`10.0.1.${Math.floor(Math.random()*100)+10}` })),
      { userId:admin._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'PASSWORD_CHANGED', details:'System Admin changed their password', resource:`User:${admin._id}`, ipAddress:'192.168.1.1' },
    ];

    for (let i = 0; i < auditEntries.length; i++) {
      const entry = auditEntries[i];
      // Spread timestamps over last 30 days
      await AuditLog.create({
        ...entry,
        createdAt: new Date(Date.now() - (auditEntries.length - i) * 2 * 3600000 - Math.random() * 3600000),
      });
    }
    console.log(`📜 Created ${auditEntries.length} audit log entries`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n🎉 ══════════════════════════════════════════════════');
    console.log('   SENTINEL DATABASE SEEDED SUCCESSFULLY');
    console.log('   ════════════════════════════════════════════════');
    console.log('   ADMIN      admin@earms.com        Admin@@@');
    console.log('   MANAGER    sarah@earms.com         Manager123!  (Finance)');
    console.log('   MANAGER    marcus@earms.com        Manager123!  (IT)');
    console.log('   MANAGER    priya.m@earms.com       Manager123!  (HR)');
    console.log('   MANAGER    james.m@earms.com       Manager123!  (Operations)');
    console.log('   MANAGER    grace.m@earms.com       Manager123!  (Security)');
    console.log('   MANAGER    hiro.m@earms.com        Manager123!  (Engineering)');
    console.log('   MANAGER    elena.m@earms.com       Manager123!  (Legal)');
    console.log('   MANAGER    maya.m@earms.com        Manager123!  (Sales)');
    console.log('   EMPLOYEE   alex@earms.com          Employee123! (Finance)');
    console.log('   EMPLOYEE   james@earms.com         Employee123! (IT)');
    console.log('   EMPLOYEE   omar@earms.com          Employee123! (HR)');
    console.log('   EMPLOYEE   david@earms.com         Employee123! (Operations)');
    console.log(`   Total users: ${createdUsers.length} | Requests: ${requestsCreated} | Logs: ${auditEntries.length}`);
    console.log('   ════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
