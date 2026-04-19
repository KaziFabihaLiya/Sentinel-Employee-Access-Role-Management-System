const RoleTemplate = require('../models/RoleTemplate');
const AuditLog     = require('../models/AuditLog');

const audit = (req, action, id, details) =>
  AuditLog.create({
    userId: req.user._id, userName: req.user.fullName, userEmail: req.user.email,
    action, resource: 'RoleTemplate', resourceId: String(id), details,
    ipAddress: req.ip || '—',
  }).catch(() => {});

const getRoles   = async (req, res) => {
  try {
    const roles = await RoleTemplate.find().sort({ createdAt: -1 });
    res.json(roles);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createRole = async (req, res) => {
  try {
    const { roleName, description, accessLevel, permissions } = req.body;
    if (!roleName) return res.status(400).json({ message: 'Role name is required' });

    const role = await RoleTemplate.create({
      roleName, description, accessLevel,
      permissions: permissions || [],
      createdBy: req.user._id,
    });
    await audit(req, 'ROLE_CREATED', role._id, `Created role template: ${roleName}`);
    res.status(201).json(role);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Role name already exists' });
    res.status(500).json({ message: err.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const role = await RoleTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    await audit(req, 'ROLE_UPDATED', role._id, `Updated role: ${role.roleName}`);
    res.json(role);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteRole = async (req, res) => {
  try {
    const role = await RoleTemplate.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    await audit(req, 'ROLE_DELETED', req.params.id, `Deleted role: ${role.roleName}`);
    res.json({ message: 'Role deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getRoles, createRole, updateRole, deleteRole };