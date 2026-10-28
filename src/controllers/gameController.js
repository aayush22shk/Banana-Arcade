/**
 * ============================================================================
 * [INTEROPERABILITY]: Game Controller
 * Architecture: Controller Layer (MVC pattern)
 * Purpose: Manages Banana puzzle generation, proxying the University API,
 *          and answer verification logic.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const bananaService = require('../services/bananaService');
const { JWT_SECRET } = require('../middleware/authMiddleware');

/**
 * [INTEROPERABILITY] GET /api/game/puzzle
 * Node.js backend proxy route that queries the university Banana API,
 * returning the puzzle image URL and solution verification data.
 */
async function getPuzzle(req, res) {
  try {
    // [INTEROPERABILITY] Call backend service querying University Banana Web Service
    const puzzle = await bananaService.fetchBananaPuzzle();

    // Create a tamper-proof verification token containing puzzle answer & timestamp
    const puzzleToken = jwt.sign(
      {
        solution: puzzle.solution,
        question: puzzle.question,
        generatedAt: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.status(200).json({
      success: true,
      question: puzzle.question,
      solution: puzzle.solution, // Provided for instant reactive client-side gameplay
      puzzleToken,               // Signed token for optional server-side tamper-proof verification
      isFallback: puzzle.isFallback || false,
      message: puzzle.isFallback 
        ? 'University API fallback activated' 
        : 'Puzzle fetched dynamically from University Banana API'
    });

  } catch (error) {
    console.error('[-] Error in getPuzzle controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate math puzzle. Please try again.'
    });
  }
}

/**
 * POST /api/game/verify
 * Verifies submitted answer against the signed puzzle verification token.
 */
function verifyAnswer(req, res) {
  try {
    const { puzzleToken, answer } = req.body;

    if (!puzzleToken || typeof answer === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'Both puzzleToken and answer are required for verification.'
      });
    }

    // Decode and verify the signed puzzle token
    jwt.verify(puzzleToken, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: 'Puzzle session expired or invalid. Please request a new puzzle.'
        });
      }

      const expected = parseInt(decoded.solution, 10);
      const submitted = parseInt(answer, 10);
      const isCorrect = expected === submitted;

      return res.status(200).json({
        success: true,
        isCorrect,
        expected,
        submitted
      });
    });

  } catch (error) {
    console.error('[-] Error in verifyAnswer controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Error encountered during answer verification.'
    });
  }
}

module.exports = {
  getPuzzle,
  verifyAnswer
};
