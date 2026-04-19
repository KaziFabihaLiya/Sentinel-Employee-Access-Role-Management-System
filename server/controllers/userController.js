const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');

const audit = (req, action, resourceId, details) =>
  AuditLog.create({
    userId: req.user._id, userName: req.user.fullName, userEmail: req.user.email,
    action, resource: 'User', resourceId: String(resourceId), details,
    ipAddress: req.ip || '—',
  }).catch(() => {});

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/users/:id/toggle-active
const toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (String(user._id) === String(req.user._id))
      return res.status(400).json({ message: 'Cannot deactivate your own account' });

    user.isActive = !user.isActive;
    await user.save();

    await audit(req, user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      user._id, `Admin ${user.isActive ? 'activated' : 'deactivated'} user: ${user.email}`);

    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/users/:id/role
const changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['employee', 'manager', 'admin'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    const user = await User.findByIdAndUpdate(
      req.params.id, { role }, { new: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    await audit(req, 'ROLE_CHANGED', user._id, `Role changed to ${role} for: ${user.email}`);
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === String(req.user._id))
      return res.status(400).json({ message: 'Cannot delete your own account' });

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await audit(req, 'USER_DELETED', req.params.id, `Admin deleted user: ${user.email}`);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, toggleActive, changeRole, deleteUser };