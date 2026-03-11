const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');

// GET /api/users — Admin: get all users
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/users/:id/toggle-active — Admin: activate/deactivate
router.patch('/:id/toggle-active', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/users/:id/role — Admin: change role
router.patch('/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['employee','manager','admin'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(
      req.params.id, { role }, { new: true }
    ).select('-password');
    res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/users/:id — Admin: delete user
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;