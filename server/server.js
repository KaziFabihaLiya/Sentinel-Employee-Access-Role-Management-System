// server/server.js
// ─────────────────────────────────────────────────────────────────────────────
// UPDATED — new workflow, approval, and admin routes registered.
// Escalation cron starts automatically every 15 minutes.
// All original routes and behaviour preserved.
// ─────────────────────────────────────────────────────────────────────────────
const express   = require('express');
const dotenv    = require('dotenv');
const cors      = require('cors');
const path      = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Original routes ───────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/dashboard',     require('./routes/dashboardRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/requests',      require('./routes/requestRoutes'));      // ⭐ updated
app.use('/api/roles',         require('./routes/roleRoutes'));
app.use('/api/audit',         require('./routes/auditRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
// Chatbot route registered above. Health, 404 and error handlers
// are defined once later in the file to avoid duplication.

// ── NEW: Multi-level approval routes ─────────────────────────────────────────
// Admin workflow & layer management
app.use('/api/admin',         require('./routes/workflowRoutes'));

// Approver actions (approve / reject / delegate / escalate)
// GET  /api/approver/pending-approvals
// PUT  /api/approvals/:id/approve
// PUT  /api/approvals/:id/reject
// POST /api/approvals/:id/delegate
// POST /api/approvals/:id/escalate
// GET  /api/approver/approval-statistics
app.use('/api/approver',      require('./routes/approvalRoutes'));     // pending list + stats
app.use('/api/approvals',     require('./routes/approvalRoutes'));     // action endpoints

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({
    status:  'OK',
    project: 'Sentinel — EARMS v2 (Multi-Level Approval)',
    time:    new Date().toISOString(),
  })
);

// ── 404 + global error handler (single, canonical instance) ─────────────────
app.use((req, res) =>
  res.status(404).json({ message: `Route ${req.originalUrl} not found` })
);
app.use((err, req, res, next) => {
  console.error('❌', err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION CRON — runs every 15 minutes
// Checks all PENDING requests whose SLA deadline has passed and escalates them.
// ─────────────────────────────────────────────────────────────────────────────
const escalationService = require('./services/escalationService');

const ESCALATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

function startEscalationCron() {
  console.log('⏰  Escalation cron started (every 15 min)');
  setInterval(async () => {
    try {
      const result = await escalationService.checkForExpiredApprovals();
      if (result.checked > 0 || result.escalated > 0) {
        console.log(
          `[Escalation Cron] Checked: ${result.checked} | Escalated: ${result.escalated}` +
          (result.errors.length ? ` | Errors: ${result.errors.length}` : '')
        );
      }
    } catch (err) {
      console.error('[Escalation Cron] Error:', err.message);
    }
  }, ESCALATION_INTERVAL_MS);
}

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  Sentinel EARMS v2 running on port ${PORT}`);
  console.log(`📡  http://localhost:${PORT}/api/health`);
  console.log(`🔀  Multi-level approval system: ACTIVE\n`);
  startEscalationCron();
});
