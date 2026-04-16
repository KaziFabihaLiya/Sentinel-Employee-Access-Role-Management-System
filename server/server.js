// ─────────────────────────────────────────────────────────────────────────────
// server/server.js  —  Sentinel API Server
// ─────────────────────────────────────────────────────────────────────────────
const express   = require('express');
const dotenv    = require('dotenv');
const cors      = require('cors');
const connectDB = require('./config/db');

// Load .env first, then connect DB
dotenv.config();
connectDB();

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users',     require('./routes/userRoutes'));      // Admin user management
app.use('/api/requests',  require('./routes/requestRoutes'));   // Access requests

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'OK',
    project: 'Sentinel',
    message: 'Guard Every Gateway. Grant with Confidence.',
    time:    new Date().toISOString(),
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🛡️  Sentinel server running on port ${PORT}`);
  console.log(`📡  API: http://localhost:${PORT}/api/health`);
});

/*
 ─────────────────────────────────────────────────────────────────────────────
 BUG EXPLANATION — What was wrong in the original server.js:

 3. MISSING ROUTES — /api/users and /api/requests were not registered, so
    AdminHome and ManagerHome API calls would all return 404.

 4. NO ERROR HANDLERS — Without a global error handler, unhandled async errors
    crash the process silently or send HTML error pages to the React client.
 ─────────────────────────────────────────────────────────────────────────────
*/