// server/routes/notificationRoutes.js
const express     = require('express');
const router      = express.Router();
const { protect } = require('../middleware/authMiddleware');
const AccessRequest = require('../models/AccessRequest');
const User          = require('../models/User');

router.get('/', protect, async (req, res) => {
  try {
    const notifications = [];
    const now  = new Date();
    const role = req.user.role;

    if (role === 'employee') {
      const reviewed = await AccessRequest.find({
        employee: req.user.id,
        status: { $ne: 'Pending' },
        reviewedAt: { $gte: new Date(now - 14 * 86400000) },
      }).sort({ reviewedAt: -1 }).limit(5);

      reviewed.forEach(r => {
        notifications.push({
          id: String(r._id),
          type: r.status === 'Approved' ? 'success' : 'error',
          icon: r.status === 'Approved' ? 'check' : 'x',
          title: `Request ${r.status}`,
          msg: `Your "${r.requestedRole}" request was ${r.status.toLowerCase()}.${r.managerComment ? ' Note: ' + r.managerComment : ''}`,
          time: r.reviewedAt || r.updatedAt,
          link: '/dashboard/my-requests',
          urgent: r.status === 'Rejected',
        });
      });

      const pendingCnt = await AccessRequest.countDocuments({ employee: req.user.id, status: 'Pending' });
      if (pendingCnt > 0) {
        notifications.push({ id:'emp-pending', type:'info', icon:'clock', title:`${pendingCnt} Pending Request${pendingCnt>1?'s':''}`, msg:`Awaiting manager review.`, time: now, link:'/dashboard/my-requests', urgent:false });
      }
    }

    if (role === 'manager') {
      const teamEmps = await User.find({ department: req.user.department, role:'employee', isActive:true }).select('_id');
      const empIds   = teamEmps.map(e => e._id);
      const pendingReqs = await AccessRequest.find({ employee:{ $in:empIds }, status:'Pending' }).sort({ createdAt:1 }).limit(15).populate('employee','fullName');

      pendingReqs.forEach(r => {
        const hrs    = Math.floor((now - new Date(r.createdAt)) / 3600000);
        const urgent = hrs >= 40;
        notifications.push({
          id: String(r._id),
          type: hrs >= 48 ? 'error' : hrs >= 40 ? 'warning' : 'info',
          icon: hrs >= 48 ? 'alert-octagon' : hrs >= 40 ? 'alert-triangle' : 'clipboard',
          title: hrs >= 48 ? 'Escalation Required' : urgent ? 'Urgent: Review Needed' : 'Pending Request',
          msg: `${r.employee?.fullName} requested "${r.requestedRole}" — ${hrs}h ago`,
          time: r.createdAt,
          link: '/dashboard/review-requests',
          urgent,
        });
      });

      if (pendingReqs.length === 0) {
        notifications.push({ id:'mgr-clear', type:'success', icon:'check-circle', title:'All Caught Up!', msg:'No pending requests from your team.', time:now, link:'/dashboard/review-requests', urgent:false });
      }
    }

    if (role === 'admin') {
      const highRisk = await AccessRequest.find({ status:'Pending', riskLevel:'high' }).sort({ createdAt:1 }).limit(8).populate('employee','fullName department');
      highRisk.forEach(r => {
        const hrs = Math.floor((now - new Date(r.createdAt)) / 3600000);
        notifications.push({ id:String(r._id), type:'error', icon:'alert-octagon', title:'High-Risk Request Pending', msg:`${r.employee?.fullName} (${r.employee?.department}) requested "${r.requestedRole}" — ${hrs}h ago`, time:r.createdAt, link:'/dashboard/analytics', urgent:true });
      });

      const allPending = await AccessRequest.find({ status:'Pending' }).select('createdAt');
      const escalated  = allPending.filter(r => (now - new Date(r.createdAt)) > 48*3600000);
      if (escalated.length > 0) {
        notifications.push({ id:'admin-escalated', type:'warning', icon:'zap', title:`${escalated.length} Escalated Request${escalated.length>1?'s':''}`, msg:`${escalated.length} request${escalated.length>1?'s have':' has'} exceeded 48-hour limit.`, time:now, link:'/dashboard/analytics', urgent:true });
      }

      const totalPending = await AccessRequest.countDocuments({ status:'Pending' });
      if (totalPending > 0) {
        notifications.push({ id:'admin-pending', type:'info', icon:'clock', title:`${totalPending} Total Pending`, msg:`${totalPending} requests await approval system-wide.`, time:now, link:'/dashboard/analytics', urgent:false });
      }

      const inactiveCnt = await User.countDocuments({ isActive:false });
      if (inactiveCnt > 0) {
        notifications.push({ id:'admin-inactive', type:'info', icon:'user-x', title:`${inactiveCnt} Inactive Account${inactiveCnt>1?'s':''}`, msg:`${inactiveCnt} user account${inactiveCnt>1?'s are':' is'} deactivated.`, time:now, link:'/dashboard/manage-users', urgent:false });
      }
    }

    notifications.sort((a,b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return new Date(b.time) - new Date(a.time);
    });

    const unreadCount = notifications.filter(n => n.urgent || n.type==='error' || n.type==='warning').length;
    res.json({ notifications: notifications.slice(0,15), unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;