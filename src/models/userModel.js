/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: User Data Access Object (DAO)
 * Architecture: Model layer (MVC pattern)
 * Purpose: Manage user identity records, credentials, and verification queries
 * ============================================================================
 */

const { runAsync, getAsync, allAsync } = require('./db');

/**
 * Creates a new user record with hashed password
 * @param {string} username - Unique player identifier
 * @param {string} hashedPassword - Salted and hashed password string (bcrypt)
 * @returns {Promise<{id: number, username: string}>}
 */
async function createUser(username, hashedPassword) {
  const result = await runAsync(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username.trim(), hashedPassword]
  );
  return {
    id: result.lastID,
    username: username.trim()
  };
}

/**
 * Finds user by username (case-insensitive)
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function findUserByUsername(username) {
  const user = await getAsync(
    'SELECT id, username, password, created_at FROM users WHERE username = ? COLLATE NOCASE',
    [username.trim()]
  );
  return user || null;
}

/**
 * Finds user by primary key ID
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function findUserById(id) {
  const user = await getAsync(
    'SELECT id, username, created_at FROM users WHERE id = ?',
    [id]
  );
  return user || null;
}

module.exports = {
  createUser,
  findUserByUsername,
  findUserById
};
