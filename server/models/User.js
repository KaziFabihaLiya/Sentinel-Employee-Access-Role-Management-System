// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName:   { type: String, required: [true, 'Full name required'], trim: true },
  email:      { type: String, required: [true, 'Email required'], unique: true, lowercase: true, trim: true },
  department: { type: String, required: [true, 'Department required'] },
  jobTitle:   { type: String, required: [true, 'Job title required'] },
  password:   { type: String, required: [true, 'Password required'], minlength: [6, 'Min 6 characters'] },
  role:       { type: String, enum: ['employee', 'manager', 'admin'], default: 'employee' },
  isActive:   { type: Boolean, default: true },
  avatarUrl:  { type: String, default: '' },
}, { timestamps: true });

// ✅ Fixed for Mongoose 9+
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);