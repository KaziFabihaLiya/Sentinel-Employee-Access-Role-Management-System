const express  = require('express');
const router   = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/audit?page=1&action=&user=
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 30, action, user } = req.query;
    const filter = {};
    if (action && action !== 'all') filter.action = action;
    if (user) filter.$or = [
      { userName:  { $regex: user, $options: 'i' } },
      { userEmail: { $regex: user, $options: 'i' } },
    ];

    const total = await AuditLog.countDocuments(filter);
    const logs  = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;