/**
 * ============================================================================
 * [INTEROPERABILITY]: Game & Banana API Routes
 * Architecture: Route Layer (MVC pattern)
 * Purpose: REST API endpoints for dynamic puzzle retrieval and solution verification
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// [INTEROPERABILITY] Proxy route querying University Banana API
router.get('/puzzle', gameController.getPuzzle);

// Route for optional server-side answer verification
router.post('/verify', gameController.verifyAnswer);

module.exports = router;
