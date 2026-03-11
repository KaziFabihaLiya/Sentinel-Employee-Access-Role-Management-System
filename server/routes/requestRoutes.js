const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const AccessRequest = require('../models/AccessRequest');

// GET /api/requests — Admin: all requests | Employee: own requests
router.get('/', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    let query   = {};
    if (req.user.role === 'employee') query.employee = req.user.id;
    const requests = await AccessRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('employee', 'fullName department jobTitle email');
    res.json(requests);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/requests — Employee: submit new request
router.post('/', protect, authorize('employee'), async (req, res) => {
  try {
    const { department, jobTitle, requestedRole, justification, accessDuration } = req.body;
    const request = await AccessRequest.create({
      employee: req.user.id,
      department, jobTitle, requestedRole, justification,
      accessDuration: accessDuration || 'Permanent',
    });
    res.status(201).json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/requests/:id/review — Manager: approve or reject
router.patch('/:id/review', protect, authorize('manager'), async (req, res) => {
  try {
    const { status, managerComment } = req.body;
    if (!['Approved', 'Rejected'].includes(status))
      return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    const request = await AccessRequest.findByIdAndUpdate(
      req.params.id,
      { status, managerComment: managerComment || '', reviewedBy: req.user.id, reviewedAt: new Date() },
      { new: true }
    ).populate('employee', 'fullName email');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;