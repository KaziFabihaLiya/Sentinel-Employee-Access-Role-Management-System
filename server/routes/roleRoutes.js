// server/routes/roleRoutes.js
const express      = require('express');
const router       = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const RoleTemplate = require('../models/RoleTemplate');
const { createAuditLog } = require('../utils/auditHelper');

// GET /api/roles — All authenticated users (employees need to see roles for requests)
router.get('/', protect, async (req, res) => {
  try {
    const roles = await RoleTemplate.find({ isActive: true }).sort({ roleName: 1 });
    res.json(roles);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/roles — Admin only
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { roleName, description, accessLevel, permissions } = req.body;
    if (!roleName?.trim()) return res.status(400).json({ message: 'Role name is required' });

    const existing = await RoleTemplate.findOne({ roleName: roleName.trim() });
    if (existing) return res.status(400).json({ message: 'A role with this name already exists' });

    const role = await RoleTemplate.create({
      roleName: roleName.trim(),
      description, accessLevel: accessLevel || 'Low',
      permissions: permissions || [],
      createdBy: req.user.id,
    });

    await createAuditLog(req, 'ROLE_CREATED', `Created role template: ${role.roleName}`, `RoleTemplate:${role._id}`);
    res.status(201).json(role);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/roles/:id — Admin only
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { roleName, description, accessLevel, permissions } = req.body;
    const role = await RoleTemplate.findByIdAndUpdate(
      req.params.id,
      { roleName, description, accessLevel, permissions },
      { new: true, runValidators: true }
    );
    if (!role) return res.status(404).json({ message: 'Role not found' });
    await createAuditLog(req, 'ROLE_UPDATED', `Updated role template: ${role.roleName}`, `RoleTemplate:${role._id}`);
    res.json(role);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/roles/:id — Admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const role = await RoleTemplate.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    await createAuditLog(req, 'ROLE_DELETED', `Deleted role template: ${role.roleName}`, `RoleTemplate:${role._id}`);
    res.json({ message: 'Role deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;