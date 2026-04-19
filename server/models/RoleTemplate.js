const mongoose = require('mongoose');

const roleTemplateSchema = new mongoose.Schema(
  {
    roleName:    { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '' },
    accessLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    permissions: [{ type: String }],   // e.g. ['read:finance', 'write:hr']
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoleTemplate', roleTemplateSchema);