/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: JWT Authentication & Session Middleware
 * Architecture: Middleware layer
 * Purpose: Verifies JSON Web Tokens to protect private routes and preserve Virtual Identity
 * ============================================================================
 */

const jwt = require('jsonwebtoken');

// Secret key for cryptographic signing of Virtual Identity tokens
const JWT_SECRET = process.env.JWT_SECRET || 'banana_arcade_academic_jwt_secret_key_2026';

/**
 * [VIRTUAL IDENTITY] Express middleware to authenticate requests via JWT Bearer Token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  // Extract token from format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Virtual identity token is required to access this resource.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(403).json({
        success: false,
        error: isExpired 
          ? 'Virtual identity session has expired. Please log in again.' 
          : 'Invalid virtual identity token provided.'
      });
    }

    // Attach decoded user information (id, username) to request object
    req.user = decodedUser;
    next();
  });
}

module.exports = {
  JWT_SECRET,
  authenticateToken
};
