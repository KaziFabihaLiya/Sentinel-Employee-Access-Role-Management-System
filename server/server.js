// server/server.js  —  Sentinel API Server                
const express   = require('express');
const dotenv    = require('dotenv');
const cors      = require('cors');
const connectDB = require('./config/db');

// Load .env first, then connect DB
dotenv.config();
connectDB();

const app = express();

//    Middleware:
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173' || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//    Routes            
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users',     require('./routes/userRoutes'));
app.use('/api/requests',  require('./routes/requestRoutes'));
app.use('/api/roles',     require('./routes/roleRoutes'));     
app.use('/api/audit',     require('./routes/auditRoutes'));
//    Health check      ─
app.get('/api/health', (req, res) => {
  res.json({
    status:  'OK',
    project: 'Sentinel',
    message: 'Guard Every Gateway. Grant with Confidence.',
    time:    new Date().toISOString(),
  });
});

//    404 handler        
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

//    Global error handler                                                     ─
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

//    Start              
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🛡️  Sentinel server running on port ${PORT}`);
  console.log(`📡  API: http://localhost:${PORT}/api/health`);
});
