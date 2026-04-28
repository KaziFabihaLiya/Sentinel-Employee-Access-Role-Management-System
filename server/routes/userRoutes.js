// server/routes/userRoutes.js
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');
const { createAuditLog } = require('../utils/auditHelper');

// PATCH /api/users/profile — Any authenticated user updates own profile
router.patch('/profile', protect, async (req, res) => {
  try {
    const { fullName, department, jobTitle } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id, { fullName, department, jobTitle },
      { new: true, runValidators: true }
    ).select('-password');
    await createAuditLog(req, 'PROFILE_UPDATED', `${user.fullName} updated their profile`, `User:${user._id}`);
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/users/change-password — Any authenticated user
router.patch('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user.id);
    const match = await user.matchPassword(currentPassword);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    await createAuditLog(req, 'PASSWORD_CHANGED', `${user.fullName} changed their password`, `User:${user._id}`);
    res.json({ message: 'Password changed successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

//    Admin routes      ─

// GET /api/users — List all users
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/users/:id/toggle-active
router.patch('/:id/toggle-active', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    const action = user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
    await createAuditLog(req, action, `Admin ${user.isActive ? 'activated' : 'deactivated'} user: ${user.fullName}`, `User:${user._id}`);
    res.json({ isActive: user.isActive });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/users/:id/role
router.patch('/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['employee','manager','admin'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    await createAuditLog(req, 'ROLE_CHANGED', `Admin changed ${user.fullName}'s role to ${role}`, `User:${user._id}`);
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id.toString()) return res.status(400).json({ message: 'Cannot delete your own account' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await createAuditLog(req, 'USER_DELETED', `Admin deleted user: ${user.fullName} (${user.email})`, `User:${req.params.id}`);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;