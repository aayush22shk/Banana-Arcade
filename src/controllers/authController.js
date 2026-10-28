/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: Authentication Controller
 * Architecture: Controller Layer (MVC pattern)
 * Purpose: Handles user registration, password hashing (bcrypt), login, 
 *          and virtual identity verification (JWT)
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const scoreModel = require('../models/scoreModel');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Bcrypt salt rounds as specified in technical assignment requirements
const BCRYPT_SALT_ROUNDS = 10;

/**
 * [VIRTUAL IDENTITY] Register a new user
 * Hashes passwords with bcrypt (salt rounds = 10) and stores credentials in SQLite.
 * Route: POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Both username and password are required.'
      });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 3 and 20 characters long.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists in SQLite
    const existingUser = await userModel.findUserByUsername(trimmedUsername);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'A player with this username already exists. Please choose another.'
      });
    }

    // [VIRTUAL IDENTITY] Secure password hashing using bcrypt with 10 salt rounds
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Persist new user in SQLite database
    const newUser = await userModel.createUser(trimmedUsername, hashedPassword);

    // [VIRTUAL IDENTITY] Issue signed JSON Web Token (JWT)
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Player registered successfully!',
      token,
      user: {
        id: newUser.id,
        username: newUser.username
      }
    });

  } catch (error) {
    console.error('[-] Error in register controller:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while creating player account.'
    });
  }
}

/**
 * [VIRTUAL IDENTITY] Login an existing user
 * Authenticates user credentials and returns a signed JWT token.
 * Route: POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Both username and password are required.'
      });
    }

    const trimmedUsername = username.trim();

    // Query SQLite database for user record
    const user = await userModel.findUserByUsername(trimmedUsername);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password credentials.'
      });
    }

    // [VIRTUAL IDENTITY] Verify bcrypt hashed password against supplied plaintext
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password credentials.'
      });
    }

    // [VIRTUAL IDENTITY] Generate active session JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fetch player's personal high score
    const stats = await scoreModel.getUserHighScore(user.id);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful. Welcome to Banana Arcade!',
      token,
      user: {
        id: user.id,
        username: user.username,
        stats
      }
    });

  } catch (error) {
    console.error('[-] Error in login controller:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred during authentication.'
    });
  }
}

/**
 * [VIRTUAL IDENTITY] Verify current active virtual identity session
 * Route: GET /api/auth/me (Protected by authenticateToken middleware)
 */
async function getMe(req, res) {
  try {
    const user = await userModel.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Virtual identity not found in database records.'
      });
    }

    const stats = await scoreModel.getUserHighScore(user.id);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.created_at,
        stats
      }
    });
  } catch (error) {
    console.error('[-] Error in getMe controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify active virtual identity.'
    });
  }
}

module.exports = {
  register,
  login,
  getMe
};
