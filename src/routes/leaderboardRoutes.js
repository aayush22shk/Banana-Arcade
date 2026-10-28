/**
 * ============================================================================
 * [VERSION CONTROL]: Leaderboard Routes
 * Architecture: Route Layer (MVC pattern)
 * Purpose: REST API endpoints for persistent arcade score submission and ranking retrieval
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public route: Fetch top 10 global arcade high scores
router.get('/', leaderboardController.getLeaderboard);

// [VIRTUAL IDENTITY] Protected route: Submit game score authenticated via JWT
router.post('/submit', authenticateToken, leaderboardController.submitScore);

module.exports = router;
