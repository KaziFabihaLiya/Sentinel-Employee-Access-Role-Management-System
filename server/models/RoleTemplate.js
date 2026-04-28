// server/models/RoleTemplate.js
const mongoose = require('mongoose');

const roleTemplateSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
    },
    description:  { type: String, default: '' },
    accessLevel:  { type: String, enum: ['Low','Medium','High'], default: 'Low' },
    permissions:  { type: [String], default: [] },
    isActive:     { type: Boolean, default: true },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoleTemplate', roleTemplateSchema);