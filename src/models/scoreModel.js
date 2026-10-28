/**
 * ============================================================================
 * [VERSION CONTROL]: Score & Leaderboard Data Access Object (DAO)
 * Architecture: Model layer (MVC pattern)
 * Purpose: Manage persistent arcade game scores, rankings, and player statistics
 * ============================================================================
 */

const { runAsync, getAsync, allAsync } = require('./db');

/**
 * Saves a completed game session score
 * @param {number} userId - Player foreign key ID
 * @param {string} username - Player username snapshot
 * @param {number} score - Total arcade points scored
 * @param {number} puzzlesSolved - Number of Banana puzzles correctly solved
 * @returns {Promise<object>}
 */
async function recordScore(userId, username, score, puzzlesSolved = 0) {
  const result = await runAsync(
    'INSERT INTO scores (user_id, username, score, puzzles_solved) VALUES (?, ?, ?, ?)',
    [userId, username, score, puzzlesSolved]
  );
  return {
    id: result.lastID,
    userId,
    username,
    score,
    puzzlesSolved
  };
}

/**
 * Retrieves the global top 10 high scores
 * @param {number} limit - Number of top scores (default: 10)
 * @returns {Promise<Array<object>>}
 */
async function getTopScores(limit = 10) {
  const rows = await allAsync(
    `SELECT id, user_id, username, score, puzzles_solved, created_at
     FROM scores
     ORDER BY score DESC, created_at ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

/**
 * Retrieves a user's personal best high score
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
async function getUserHighScore(userId) {
  const row = await getAsync(
    `SELECT MAX(score) as high_score, COUNT(*) as games_played, SUM(puzzles_solved) as total_puzzles
     FROM scores
     WHERE user_id = ?`,
    [userId]
  );
  return row || { high_score: 0, games_played: 0, total_puzzles: 0 };
}

module.exports = {
  recordScore,
  getTopScores,
  getUserHighScore
};
