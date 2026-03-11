const User          = require('../models/User');
const AccessRequest = require('../models/AccessRequest');

// ─── EMPLOYEE: My stats ────────────────────────────────
// GET /api/dashboard/employee-stats
const getEmployeeStats = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const [total, pending, approved, rejected] = await Promise.all([
      AccessRequest.countDocuments({ employee: employeeId }),
      AccessRequest.countDocuments({ employee: employeeId, status: 'Pending' }),
      AccessRequest.countDocuments({ employee: employeeId, status: 'Approved' }),
      AccessRequest.countDocuments({ employee: employeeId, status: 'Rejected' }),
    ]);

    // Recent 5 requests
    const recentRequests = await AccessRequest.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('requestedRole status createdAt managerComment');

    res.json({ total, pending, approved, rejected, recentRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── MANAGER: Team stats ───────────────────────────────
// GET /api/dashboard/manager-stats
const getManagerStats = async (req, res) => {
  try {
    // Find all employees in the same department as manager
    const manager = req.user;

    const teamEmployees = await User.find({
      department: manager.department,
      role: 'employee',
    }).select('_id');

    const employeeIds = teamEmployees.map((e) => e._id);

    const [totalTeam, pendingApprovals, recentlyApproved] = await Promise.all([
      AccessRequest.countDocuments({ employee: { $in: employeeIds } }),
      AccessRequest.countDocuments({ employee: { $in: employeeIds }, status: 'Pending' }),
      AccessRequest.countDocuments({ employee: { $in: employeeIds }, status: 'Approved' }),
    ]);

    // Pending requests list for quick action
    const pendingList = await AccessRequest.find({
      employee: { $in: employeeIds },
      status: 'Pending',
    })
      .sort({ createdAt: 1 }) // Oldest first (most urgent)
      .limit(5)
      .populate('employee', 'fullName department jobTitle');

    res.json({ totalTeam, pendingApprovals, recentlyApproved, pendingList });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── ADMIN: System stats ───────────────────────────────
// GET /api/dashboard/admin-stats
const getAdminStats = async (req, res) => {
  try {
    const [totalEmployees, totalRequests, pendingApprovals, approvedRoles] = await Promise.all([
      User.countDocuments({ role: 'employee', isActive: true }),
      AccessRequest.countDocuments(),
      AccessRequest.countDocuments({ status: 'Pending' }),
      AccessRequest.countDocuments({ status: 'Approved' }),
    ]);

    res.json({ totalEmployees, totalRequests, pendingApprovals, approvedRoles });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getEmployeeStats, getManagerStats, getAdminStats };