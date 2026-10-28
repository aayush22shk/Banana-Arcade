/**
 * ============================================================================
 * [VERSION CONTROL]: Banana Arcade - Server Entry Point
 * Architecture: RESTful API & Static Asset Server (Express.js)
 * Course Assignment: Academic Full-Stack Web Application
 * Mandatory External API: https://marcconrad.com/uob/banana/api.php?out=json
 * ============================================================================
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

// Import modular routes (MVC Architecture)
const authRoutes = require('./src/routes/authRoutes');
const gameRoutes = require('./src/routes/gameRoutes');
const leaderboardRoutes = require('./src/routes/leaderboardRoutes');

// Initialize database schema
require('./src/models/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Body parser middleware for handling JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (Single Page App)
app.use(express.static(path.join(__dirname, 'public')));

// [VIRTUAL IDENTITY] Authentication Endpoints (/api/auth)
app.use('/api/auth', authRoutes);

// [INTEROPERABILITY] Banana API Game Endpoints (/api/game)
app.use('/api/game', gameRoutes);

// [VERSION CONTROL] Leaderboard & Persistence Endpoints (/api/leaderboard)
app.use('/api/leaderboard', leaderboardRoutes);

// System Health Check & Assignment Metadata Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    app: 'Banana Arcade',
    version: '1.0.0',
    universityApiIntegrated: 'https://marcconrad.com/uob/banana/api.php?out=json',
    timestamp: new Date().toISOString()
  });
});

// Fallback route for Single Page Application navigation (Express 5 compatible)
app.use((req, res, next) => {
  // If request accepts HTML, serve SPA index.html
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[-] Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start listening on configured port
const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🍌 BANANA ARCADE SERVER INITIALIZED`);
  console.log(`📡 Local Server URL: http://localhost:${PORT}`);
  console.log(`🌐 University Banana API: https://marcconrad.com/uob/banana/api.php?out=json`);
  console.log(`🎮 Serving frontend from: ${path.join(__dirname, 'public')}`);
  console.log('====================================================');
});

// Graceful process termination
process.on('SIGINT', () => {
  console.log('\n[!] Shutting down server gracefully...');
  server.close(() => {
    console.log('[✓] HTTP server closed.');
    process.exit(0);
  });
});

module.exports = app;
