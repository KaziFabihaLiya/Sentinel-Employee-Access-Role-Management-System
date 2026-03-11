const express = require('express');
const router  = express.Router();
const { getEmployeeStats, getManagerStats, getAdminStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/employee-stats', protect, authorize('employee'), getEmployeeStats);
router.get('/manager-stats',  protect, authorize('manager'),  getManagerStats);
router.get('/admin-stats',    protect, authorize('admin'),    getAdminStats);

module.exports = router;