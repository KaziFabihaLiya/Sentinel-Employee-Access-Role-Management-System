const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper: Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
    
  );
};
console.log("JWT SECRET:", process.env.JWT_SECRET);
// ─── REGISTER ────────────────────────────────────────────────────
// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { fullName, email, department, jobTitle, password } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user (password is auto-hashed by the model)
    const user = await User.create({
      fullName,
      email,
      department,
      jobTitle,
      password,
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Compare password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    console.log("JWT SECRET:", process.env.JWT_SECRET);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET CURRENT USER ────────────────────────────────────────────
// GET /api/auth/me  (protected route)
const getMe = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe };