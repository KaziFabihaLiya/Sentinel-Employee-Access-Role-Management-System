// server/routes/auditRoutes.js
const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const AuditLog = require('../models/AuditLog');

// GET /api/audit — Admin only, paginated, filterable
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 25);
    const skip   = (page - 1) * limit;

    const filter = {};
    if (req.query.action && req.query.action !== 'all') filter.action = req.query.action;
    if (req.query.user) {
      filter.$or = [
        { userName:  { $regex: req.query.user, $options: 'i' } },
        { userEmail: { $regex: req.query.user, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;