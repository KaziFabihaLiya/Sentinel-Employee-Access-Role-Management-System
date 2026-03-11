const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authcontroller');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe); // Protected — needs valid token

module.exports = router;