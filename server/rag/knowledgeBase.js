const knowledgeBase = [
  {
    id: 'employee-access-request-workflow',
    title: 'Employee Access Request Workflow',
    topic: 'access requests',
    content:
      'In Sentinel EARMS, employees submit access requests from the employee dashboard. A request includes department, job title, requested role, justification, and access duration. The backend validates that department, job title, requested role, and a justification of at least 20 characters are present before creating the request. New requests start with Pending status and are linked to the authenticated employee.',
  },
  {
    id: 'manager-approval-workflow',
    title: 'Manager Approval Workflow',
    topic: 'approvals',
    content:
      'Managers review access requests for employees in their own department. A manager can approve or reject a Pending request and may add a manager comment. Once reviewed, the request stores the reviewer, review time, and final status. Requests that are already reviewed cannot be reviewed again through the normal manager review endpoint.',
  },
  {
    id: 'admin-monitoring-and-revocation',
    title: 'Admin Monitoring and Revocation',
    topic: 'admin monitoring',
    content:
      'Administrators monitor Sentinel EARMS through admin pages for users, roles, audit logs, analytics, approval dashboards, and access revocation. Admins can view and manage users, change user roles, deactivate accounts, manage role templates, and revoke access by updating an approved access request with a revocation reason.',
  },
  {
    id: 'role-templates',
    title: 'Role Templates',
    topic: 'roles',
    content:
      'Role templates define reusable access options in Sentinel EARMS. Each role template can include a role name, description, access level, permissions, active status, and creator. Authenticated users can view active role templates when creating requests. Admin users can create, update, and delete role templates.',
  },
  {
    id: 'high-risk-role-classification',
    title: 'High-Risk Roles',
    topic: 'risk levels',
    content:
      'Sentinel EARMS calculates request risk from the requested role and access duration. Roles containing admin, database, finance, payroll, HR, root, superuser, DBA, sysadmin, or ERP admin are treated as high risk. Manager, approver, write, edit, modify, delete, and report roles are generally medium risk. Temporary access can also raise risk to medium.',
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    topic: 'audit logs',
    content:
      'Audit logs record important Sentinel EARMS activity. Logged events include request submission, request approval, request rejection, role creation, role update, role deletion, profile update, password change, account activation or deactivation, user deletion, user role changes, and access revocation. Audit logs help administrators trace security-relevant actions.',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    topic: 'notifications',
    content:
      'Sentinel EARMS includes notification routes for notification-related operations. Notifications support awareness around access request activity, approvals, and system updates. They are part of the backend API under the notifications module and are intended to keep users informed about workflow events.',
  },
  {
    id: 'jwt-authentication',
    title: 'JWT Authentication',
    topic: 'security',
    content:
      'Sentinel EARMS protects backend routes with JWT authentication. Clients send a bearer token in the Authorization header. The auth middleware verifies the token with JWT_SECRET, loads the matching user from MongoDB without the password, and attaches that user to req.user. Requests without a valid token receive an unauthorized response.',
  },
  {
    id: 'user-profile-password-management',
    title: 'User Profile and Password Management',
    topic: 'user accounts',
    content:
      'Authenticated users can update their profile details, including full name, department, job title, and avatar. Avatar uploads are handled with Multer and are limited to image files such as jpeg, jpg, png, and webp. Users can also change their password by providing the current password and a new password of at least six characters. Passwords are hashed with bcrypt before storage.',
  },
  {
    id: 'departments-role-based-access',
    title: 'Departments and Role-Based Access',
    topic: 'authorization',
    content:
      'Sentinel EARMS uses role-based access for employee, manager, and admin users. Employees can submit and view their own requests. Managers can review team requests for employees in the same department. Admins have broader control over users, role templates, audit logs, analytics, and revocation. Department data is important for routing manager approval work.',
  },
  {
    id: 'request-statuses',
    title: 'Request Statuses',
    topic: 'request lifecycle',
    content:
      'Access requests use the statuses Pending, Approved, and Rejected. Pending means the request is awaiting manager review. Approved means the manager granted the requested access. Rejected means the request was denied or access was later revoked by an admin. Request history lets employees and managers track these lifecycle states.',
  },
  {
    id: 'api-and-local-development',
    title: 'API and Local Development',
    topic: 'development',
    content:
      'The Sentinel EARMS backend runs on Express at http://localhost:5000 by default, and the React Vite client calls the API through an Axios base URL of http://localhost:5000/api. The chatbot endpoint is POST /api/chatbot/message and requires the same JWT protection as the rest of the authenticated application.',
  },
];

module.exports = knowledgeBase;
