/**
 * ============================================================================
 * [VERSION CONTROL]: Leaderboard Controller
 * Architecture: Controller Layer (MVC pattern)
 * Purpose: Handles score submissions, leaderboard persistence in SQLite, 
 *          and global top 10 rankings.
 * ============================================================================
 */

const scoreModel = require('../models/scoreModel');

/**
 * [VIRTUAL IDENTITY] POST /api/leaderboard/submit
 * Authenticated endpoint that records player high score and timestamp into SQLite.
 */
async function submitScore(req, res) {
  try {
    const { score, puzzlesSolved } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    // Validate score
    const numericScore = parseInt(score, 10);
    const numericPuzzles = parseInt(puzzlesSolved, 10) || 0;

    if (isNaN(numericScore) || numericScore < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid score submitted.'
      });
    }

    // Persist score in SQLite database
    const savedRecord = await scoreModel.recordScore(
      userId,
      username,
      numericScore,
      numericPuzzles
    );

    // Fetch updated user stats and global top scores
    const userStats = await scoreModel.getUserHighScore(userId);
    const topScores = await scoreModel.getTopScores(10);

    return res.status(201).json({
      success: true,
      message: 'Arcade score recorded to persistent database successfully!',
      entry: savedRecord,
      userStats,
      topScores
    });

  } catch (error) {
    console.error('[-] Error submitting score:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record arcade score into SQLite database.'
    });
  }
}

/**
 * GET /api/leaderboard
 * Public endpoint: Returns top 10 global scores sorted in descending order.
 */
async function getLeaderboard(req, res) {
  try {
    const topScores = await scoreModel.getTopScores(10);

    return res.status(200).json({
      success: true,
      leaderboard: topScores
    });

  } catch (error) {
    console.error('[-] Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve leaderboard from database.'
    });
  }
}

module.exports = {
  submitScore,
  getLeaderboard
};
