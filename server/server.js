// server/server.js
const express   = require('express');
const dotenv    = require('dotenv');
const cors      = require('cors');
const connectDB = require('./config/db');
const path = require('path');
dotenv.config();
connectDB();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
// server.js — add these two lines

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/dashboard',     require('./routes/dashboardRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/requests',      require('./routes/requestRoutes'));
app.use('/api/roles',         require('./routes/roleRoutes'));
app.use('/api/audit',         require('./routes/auditRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.get('/api/health', (req, res) => res.json({ status:'OK', project:'Sentinel — EARMS', time: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => { console.error('❌', err.stack); res.status(err.status||500).json({ message: err.message||'Internal server error' }); });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`Uweeeee, Sentinel on port ${PORT}`); console.log(`📡  http://localhost:${PORT}/api/health`); });