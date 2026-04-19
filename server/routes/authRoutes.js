const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authcontroller');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');


router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe); // Protected — needs valid token

// PUT /api/auth/profile — update name, department, jobTitle
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, department, jobTitle } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, department, jobTitle },
      { new: true, select: '-password' }
    );
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/change-password
const bcrypt = require('bcryptjs');
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });
    user.password = newPassword;   // model pre-save hook re-hashes it
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;