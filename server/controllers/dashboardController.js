// server/controllers/dashboardController.js
const User          = require('../models/User');
const AccessRequest = require('../models/AccessRequest');

// GET /api/dashboard/employee-stats
const getEmployeeStats = async (req, res) => {
  try {
    const id = req.user.id;
    const [total, pending, approved, rejected] = await Promise.all([
      AccessRequest.countDocuments({ employee: id }),
      AccessRequest.countDocuments({ employee: id, status: 'Pending' }),
      AccessRequest.countDocuments({ employee: id, status: 'Approved' }),
      AccessRequest.countDocuments({ employee: id, status: 'Rejected' }),
    ]);
    const recentRequests = await AccessRequest.find({ employee: id })
      .sort({ createdAt: -1 }).limit(5)
      .select('requestedRole status createdAt managerComment riskLevel accessDuration');
    res.json({ total, pending, approved, rejected, recentRequests });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/dashboard/manager-stats
const getManagerStats = async (req, res) => {
  try {
    const teamEmployees = await User.find({
      department: req.user.department,
      role: 'employee',
    }).select('_id');
    const empIds = teamEmployees.map(e => e._id);

    const [totalTeam, pendingApprovals, recentlyApproved] = await Promise.all([
      AccessRequest.countDocuments({ employee: { $in: empIds } }),
      AccessRequest.countDocuments({ employee: { $in: empIds }, status: 'Pending' }),
      AccessRequest.countDocuments({ employee: { $in: empIds }, status: 'Approved' }),
    ]);

    // Pending list sorted oldest-first (most urgent — approaching 48h escalation)
    const pendingList = await AccessRequest.find({ employee: { $in: empIds }, status: 'Pending' })
      .sort({ createdAt: 1 }).limit(10)
      .populate('employee', 'fullName department jobTitle');

    // Flag requests older than 48h for escalation warning
    const now = new Date();
    const pendingWithEscalation = pendingList.map(req => {
      const hoursOld = (now - new Date(req.createdAt)) / (1000 * 60 * 60);
      return { ...req.toObject(), nearEscalation: hoursOld >= 40, escalated: hoursOld >= 48 };
    });

    res.json({ totalTeam, pendingApprovals, recentlyApproved, pendingList: pendingWithEscalation });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/dashboard/admin-stats
const getAdminStats = async (req, res) => {
  try {
    const [totalEmployees, totalRequests, pendingApprovals, approvedRoles, highRiskPending] = await Promise.all([
      User.countDocuments({ role: 'employee', isActive: true }),
      AccessRequest.countDocuments(),
      AccessRequest.countDocuments({ status: 'Pending' }),
      AccessRequest.countDocuments({ status: 'Approved' }),
      AccessRequest.countDocuments({ status: 'Pending', riskLevel: 'high' }),
    ]);

    // Monthly trend for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await AccessRequest.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status','Approved'] }, 1, 0] } },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({ totalEmployees, totalRequests, pendingApprovals, approvedRoles, highRiskPending, monthlyTrend });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getEmployeeStats, getManagerStats, getAdminStats };