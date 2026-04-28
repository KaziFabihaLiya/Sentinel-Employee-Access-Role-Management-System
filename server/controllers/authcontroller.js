// server/controllers/authController.js
const User = require('../models/User');
const jwt  = require('jsonwebtoken');
const { createAuditLog } = require('../utils/auditHelper');

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { fullName, email, department, jobTitle, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ fullName, email, department, jobTitle, password });
    const token = generateToken(user);

    // Attach user to req for audit log
    req.user = user;
    await createAuditLog(req, 'USER_REGISTERED', `New user registered: ${user.fullName} (${user.email})`, `User:${user._id}`);

    res.status(201).json({
      message: 'Registration successful', token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, department: user.department, jobTitle: user.jobTitle },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)         return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is deactivated. Contact your administrator.' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user);
    req.user = user;
    await createAuditLog(req, 'USER_LOGIN', `${user.fullName} logged in`, `User:${user._id}`);

    res.status(200).json({
      message: 'Login successful', token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, department: user.department, jobTitle: user.jobTitle },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe };