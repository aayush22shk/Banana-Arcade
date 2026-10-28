/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: Authentication Routes
 * Architecture: Route Layer (MVC pattern)
 * Purpose: REST API endpoints for user registration, authentication, and session check
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// [VIRTUAL IDENTITY] Public registration endpoint
router.post('/register', authController.register);

// [VIRTUAL IDENTITY] Public login endpoint
router.post('/login', authController.login);

// [VIRTUAL IDENTITY] Protected endpoint to verify active virtual identity
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
