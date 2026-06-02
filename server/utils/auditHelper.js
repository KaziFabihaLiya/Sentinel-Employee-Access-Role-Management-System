// server/utils/auditHelper.js
//                      
// Call createAuditLog(req, action, details, resource) from any route handler
// It reads the authenticated user from req.user (set by authMiddleware)
//                      
const AuditLog = require('../models/AuditLog');

const createAuditLog = async (req, action, details = '', resource = '') => {
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      '0.0.0.0';

    await AuditLog.create({
      userId:    req.user?._id  || null,
      userName:  req.user?.fullName  || 'System',
      userEmail: req.user?.email     || '',
      userRole:  req.user?.role      || '',
      action,
      details,
      resource,
      ipAddress: ip,
    });
  } catch (err) {
    // Never crash the main request because of a logging failure
    console.error('⚠ Audit log error:', err.message);
  }
};

module.exports = { createAuditLog };