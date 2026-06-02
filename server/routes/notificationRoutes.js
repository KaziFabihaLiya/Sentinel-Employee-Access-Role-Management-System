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
        notifications.push({ 
          id:'emp-pending', 
          type:'info', 
          icon:'clock', 
          title:`${pendingCnt} Pending Request${pendingCnt>1?'s':''}`, 
          msg:`Awaiting manager review.`, 
          time: now, 
          link:'/dashboard/my-requests', 
          urgent:false 
        });
      }
    }

    // ==================== FIXED MANAGER SECTION ====================
    if (role === 'manager') {
      const now = new Date();

      // NEW: Use currentApproverIds + fallback for legacy requests
      const pendingReqs = await AccessRequest.find({
        status: 'Pending',
        $or: [
          { currentApproverIds: req.user._id },                    // Multi-level system
          { 
            employee: { $in: (await User.find({ 
              department: req.user.department, 
              role: 'employee', 
              isActive: true 
            }).select('_id')).map(e => e._id) },
            workflowId: null                                    // Legacy single-level
          }
        ]
      })
      .sort({ slaDeadline: 1, createdAt: 1 })
      .limit(15)
      .populate('employee', 'fullName department jobTitle')
      .populate('currentApprovalLayerId', 'layerName layerLevel');

      pendingReqs.forEach(r => {
        const hrs = Math.floor((now - new Date(r.createdAt)) / 3600000);
        const isSlaBreached = r.slaDeadline && now > new Date(r.slaDeadline);
        const urgent = isSlaBreached || hrs >= 48;

        notifications.push({
          id: String(r._id),
          type: urgent || isSlaBreached ? 'error' : hrs >= 24 ? 'warning' : 'info',
          icon: isSlaBreached ? 'alert-octagon' : urgent ? 'alert-triangle' : 'clipboard',
          title: r.currentApprovalLayerId 
            ? `${r.currentApprovalLayerId.layerName} Review` 
            : (urgent ? 'Escalation Required' : 'Pending Request'),
          msg: `${r.employee?.fullName} requested "${r.requestedRole}" — ${hrs}h ago`,
          time: r.createdAt,
          link: '/dashboard/review-requests',
          urgent: urgent || isSlaBreached,
        });
      });

      if (pendingReqs.length === 0) {
        notifications.push({ 
          id:'mgr-clear', 
          type:'success', 
          icon:'check-circle', 
          title:'All Caught Up!', 
          msg:'No pending requests in your approval queue.', 
          time: now, 
          link:'/dashboard/review-requests', 
          urgent: false 
        });
      }
    }
    // ==================== END FIXED SECTION ====================

    if (role === 'admin') {
      // Admin section remains mostly the same (you can improve later)
      const highRisk = await AccessRequest.find({ status:'Pending', riskLevel:'high' })
        .sort({ createdAt:1 }).limit(8).populate('employee','fullName department');

      highRisk.forEach(r => {
        const hrs = Math.floor((now - new Date(r.createdAt)) / 3600000);
        notifications.push({ 
          id:String(r._id), 
          type:'error', 
          icon:'alert-octagon', 
          title:'High-Risk Request Pending', 
          msg:`${r.employee?.fullName} (${r.employee?.department}) requested "${r.requestedRole}" — ${hrs}h ago`, 
          time:r.createdAt, 
          link:'/dashboard/analytics', 
          urgent:true 
        });
      });

      const totalPending = await AccessRequest.countDocuments({ status:'Pending' });
      if (totalPending > 0) {
        notifications.push({ 
          id:'admin-pending', 
          type:'info', 
          icon:'clock', 
          title:`${totalPending} Total Pending`, 
          msg:`${totalPending} requests await approval system-wide.`, 
          time:now, 
          link:'/dashboard/analytics', 
          urgent:false 
        });
      }
    }

    // Sort: urgent first, then newest
    notifications.sort((a,b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return new Date(b.time) - new Date(a.time);
    });

    // Count pending approvals for badge (all pending, not just urgent/warning)
    let unreadCount = 0;
    if (role === 'manager' || role === 'admin') {
      unreadCount = await AccessRequest.countDocuments({ 
        status: 'Pending', 
        currentApproverIds: req.user._id 
      });
    } else if (role === 'employee') {
      unreadCount = await AccessRequest.countDocuments({ 
        employee: req.user.id, 
        status: 'Pending' 
      });
    }

    res.json({ 
      notifications: notifications.slice(0, 15), 
      unreadCount 
    });

  } catch (err) {
    console.error('Notification error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;