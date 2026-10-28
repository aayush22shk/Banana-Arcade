/**
 * ============================================================================
 * [VERSION CONTROL]: Database Schema & Connection Management Module
 * Architecture: Model layer (MVC pattern)
 * Purpose: Persistent SQLite3 storage for Virtual Identities and Leaderboard scores
 * ============================================================================
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Determine database path at the project root
const DB_PATH = path.resolve(__dirname, '../../database.db');

// Initialize SQLite3 database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[-] Failed to connect to SQLite database:', err.message);
  } else {
    console.log('[+] Connected to SQLite database at:', DB_PATH);
  }
});

/**
 * Initializes database schema:
 * 1. users: Stores Virtual Identity credentials with bcrypt password hash
 * 2. scores: Stores persistent game sessions and high scores linked to users
 */
function initDatabase() {
  db.serialize(() => {
    // [VIRTUAL IDENTITY] Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('[-] Error initializing users table:', err.message);
      else console.log('[✓] Users table initialized');
    });

    // Leaderboard / Game Scores Table
    db.run(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        score INTEGER NOT NULL,
        puzzles_solved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('[-] Error initializing scores table:', err.message);
      else console.log('[✓] Scores table initialized');
    });
  });
}

// Execute schema creation
initDatabase();

/**
 * Promise wrapper for db.run (INSERT, UPDATE, DELETE)
 */
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Promise wrapper for db.get (Single row SELECT)
 */
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Promise wrapper for db.all (Multi row SELECT)
 */
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  runAsync,
  getAsync,
  allAsync
};
