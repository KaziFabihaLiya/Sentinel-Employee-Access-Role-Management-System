// server/seed.js
// Run once: node seed.js
// Creates: 1 Admin, 2 Managers, 4 Employees, 8 Sample Requests, 4 Role Templates
// Admin credentials: admin@earms.com / Admin@@@

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const User          = require('./models/User');
const AccessRequest = require('./models/AccessRequest');
const RoleTemplate  = require('./models/RoleTemplate');
const AuditLog      = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('❌ MONGO_URI not found in .env'); process.exit(1); }

//  Seed data 
const USERS = [
  // Admin
  { fullName:'System Admin',      email:'admin@earms.com',   department:'IT',          jobTitle:'System Administrator', password:'Admin@@@',     role:'admin'    },

  // Managers
  { fullName:'Sarah Chen',        email:'sarah@earms.com',   department:'Finance',     jobTitle:'Finance Manager',      password:'Manager123!',  role:'manager'  },
  { fullName:'Marcus Oduya',      email:'marcus@earms.com',  department:'IT',          jobTitle:'IT Manager',           password:'Manager123!',  role:'manager'  },

  // Employees
  { fullName:'Alex Johnson',      email:'alex@earms.com',    department:'Finance',     jobTitle:'Financial Analyst',    password:'Employee123!', role:'employee' },
  { fullName:'Priya Kapoor',      email:'priya@earms.com',   department:'Finance',     jobTitle:'Accountant',           password:'Employee123!', role:'employee' },
  { fullName:'James Wilson',      email:'james@earms.com',   department:'IT',          jobTitle:'Software Engineer',    password:'Employee123!', role:'employee' },
  { fullName:'Lena Müller',       email:'lena@earms.com',    department:'IT',          jobTitle:'DevOps Engineer',      password:'Employee123!', role:'employee' },
  { fullName:'Omar Hassan',       email:'omar@earms.com',    department:'HR',          jobTitle:'HR Specialist',        password:'Employee123!', role:'employee' },
];

const ROLES = [
  { roleName:'Finance Viewer',    description:'Read-only access to financial reports',         accessLevel:'Low',    permissions:['read:finance','read:reports'] },
  { roleName:'Finance Analyst',   description:'Full access to financial data and analytics',   accessLevel:'Medium', permissions:['read:finance','write:finance','read:reports','write:reports'] },
  { roleName:'HR Administrator',  description:'Full HR module access',                          accessLevel:'Medium', permissions:['read:hr','write:hr'] },
  { roleName:'ERP Admin',         description:'Full ERP system administration access',          accessLevel:'High',   permissions:['admin:erp','admin:users','read:finance','write:finance','read:hr','write:hr','read:payroll','write:payroll'] },
  { roleName:'Payroll Processor', description:'Access to payroll processing and records',       accessLevel:'High',   permissions:['read:payroll','write:payroll'] },
  { roleName:'Report Reader',     description:'Read access to system-wide reports',             accessLevel:'Low',    permissions:['read:reports'] },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    //  Clear existing data 
    await Promise.all([
      User.deleteMany({}),
      AccessRequest.deleteMany({}),
      RoleTemplate.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    //    Create users  
    const createdUsers = [];
    for (const u of USERS) {
      const user = await User.create(u);  // Pre-save hook hashes password
      createdUsers.push(user);
      console.log(`👤 Created ${u.role}: ${u.fullName} (${u.email})`);
    }

    //    Create role templates                                                 ─
    const adminUser = createdUsers.find(u => u.role === 'admin');
    for (const r of ROLES) {
      await RoleTemplate.create({ ...r, createdBy: adminUser._id });
    }
    console.log(`✦  Created ${ROLES.length} role templates`);

    //    Create sample access requests                                         ─
    const employees = createdUsers.filter(u => u.role === 'employee');
    const managers  = createdUsers.filter(u => u.role === 'manager');

    const REQUESTS = [
      // Finance dept requests (Sarah Chen is manager)
      {
        employee: employees[0]._id,   // Alex Johnson
        department: 'Finance', jobTitle: 'Financial Analyst',
        requestedRole: 'Finance Analyst', justification: 'Required for Q2 quarterly reporting and financial analysis tasks assigned by department head.',
        accessDuration: 'Permanent', status: 'Approved',
        riskLevel: 'medium', reviewedBy: managers[0]._id,
        reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        managerComment: 'Approved — role matches job responsibilities.',
      },
      {
        employee: employees[1]._id,   // Priya Kapoor
        department: 'Finance', jobTitle: 'Accountant',
        requestedRole: 'Finance Viewer', justification: 'Need read access to financial dashboards for monthly reconciliation process.',
        accessDuration: 'Permanent', status: 'Pending', riskLevel: 'low',
      },
      {
        employee: employees[1]._id,   // Priya Kapoor
        department: 'Finance', jobTitle: 'Accountant',
        requestedRole: 'Payroll Processor', justification: 'Temporary payroll processing access required while senior processor is on leave for 3 months.',
        accessDuration: '3 Months', status: 'Rejected', riskLevel: 'high',
        reviewedBy: managers[0]._id,
        reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        managerComment: 'Rejected — payroll access requires additional security clearance.',
      },
      // IT dept requests (Marcus Oduya is manager)
      {
        employee: employees[2]._id,   // James Wilson
        department: 'IT', jobTitle: 'Software Engineer',
        requestedRole: 'ERP Admin', justification: 'Need admin access for system migration project scheduled for Q3. Will be used for database restructuring.',
        accessDuration: '3 Months', status: 'Pending', riskLevel: 'high',
      },
      {
        employee: employees[3]._id,   // Lena Müller
        department: 'IT', jobTitle: 'DevOps Engineer',
        requestedRole: 'Report Reader', justification: 'Required to monitor deployment metrics and system performance reports for SLA compliance.',
        accessDuration: 'Permanent', status: 'Approved', riskLevel: 'low',
        reviewedBy: managers[1]._id,
        reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        managerComment: 'Approved.',
      },
      {
        employee: employees[2]._id,   // James Wilson (second request)
        department: 'IT', jobTitle: 'Software Engineer',
        requestedRole: 'Finance Viewer', justification: 'Need read access to finance module to integrate payment APIs correctly.',
        accessDuration: '1 Month', status: 'Pending', riskLevel: 'medium',
      },
      // HR dept
      {
        employee: employees[4]._id,   // Omar Hassan
        department: 'HR', jobTitle: 'HR Specialist',
        requestedRole: 'HR Administrator', justification: 'Full HR access required for new onboarding process implementation and employee record management.',
        accessDuration: 'Permanent', status: 'Approved', riskLevel: 'medium',
        reviewedBy: managers[0]._id,
        reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        managerComment: 'Approved — role is appropriate for HR Specialist position.',
      },
      {
        employee: employees[4]._id,   // Omar Hassan
        department: 'HR', jobTitle: 'HR Specialist',
        requestedRole: 'Payroll Processor', justification: 'Need payroll access for end-of-month salary processing as primary processor is transitioning out.',
        accessDuration: '1 Month', status: 'Pending', riskLevel: 'high',
      },
    ];

    for (const r of REQUESTS) {
      await AccessRequest.create(r);
    }
    console.log(`📋 Created ${REQUESTS.length} sample access requests`);

    //    Create sample audit logs                                               
    const fakeLogs = [
      { userId:adminUser._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'USER_LOGIN', details:'System Admin logged in', ipAddress:'192.168.1.1' },
      { userId:managers[0]._id, userName:'Sarah Chen', userEmail:'sarah@earms.com', userRole:'manager', action:'REQUEST_APPROVED', details:'Sarah Chen approved Finance Analyst access for Alex Johnson', ipAddress:'192.168.1.10' },
      { userId:managers[0]._id, userName:'Sarah Chen', userEmail:'sarah@earms.com', userRole:'manager', action:'REQUEST_REJECTED', details:'Sarah Chen rejected Payroll Processor access for Priya Kapoor', ipAddress:'192.168.1.10' },
      { userId:employees[0]._id, userName:'Alex Johnson', userEmail:'alex@earms.com', userRole:'employee', action:'REQUEST_SUBMITTED', details:'Alex Johnson submitted request for Finance Analyst role', ipAddress:'192.168.1.20' },
      { userId:adminUser._id, userName:'System Admin', userEmail:'admin@earms.com', userRole:'admin', action:'ROLE_CREATED', details:'Created role template: ERP Admin', ipAddress:'192.168.1.1' },
    ];
    for (const log of fakeLogs) {
      await AuditLog.create({ ...log, createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) });
    }
    console.log(`📋 Created ${fakeLogs.length} sample audit logs`);

    //    Summary        
    console.log('\n🎉 Seeding complete!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('  CREDENTIALS');
    console.log('═══════════════════════════════════════════════');
    console.log('  ADMIN    admin@earms.com     Admin@@@');
    console.log('  MANAGER  sarah@earms.com     Manager123!  (Finance)');
    console.log('  MANAGER  marcus@earms.com    Manager123!  (IT)');
    console.log('  EMPLOYEE alex@earms.com      Employee123! (Finance)');
    console.log('  EMPLOYEE priya@earms.com     Employee123! (Finance)');
    console.log('  EMPLOYEE james@earms.com     Employee123! (IT)');
    console.log('  EMPLOYEE lena@earms.com      Employee123! (IT)');
    console.log('  EMPLOYEE omar@earms.com      Employee123! (HR)');
    console.log('═══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();