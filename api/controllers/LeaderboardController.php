<?php
/**
 * ============================================================================
 * [VERSION CONTROL]: Leaderboard Controller
 * Architecture: Controller Layer (MVC Pattern)
 * Purpose: Handles score submissions, leaderboard persistence in MySQL,
 *          and global top 10 rankings.
 * ============================================================================
 */

class LeaderboardController
{
    private ScoreModel $scoreModel;

    public function __construct()
    {
        $this->scoreModel = new ScoreModel();
    }

    /**
     * [VIRTUAL IDENTITY] POST /api/leaderboard/submit
     * Authenticated endpoint that records player high score and timestamp into MySQL.
     */
    public function submitScore(): void
    {
        try {
            // Authenticate via JWT middleware
            $authUser = AuthMiddleware::authenticate();

            $data           = json_decode(file_get_contents('php://input'), true);
            $score          = isset($data['score']) ? (int) $data['score'] : -1;
            $puzzlesSolved  = isset($data['puzzlesSolved']) ? (int) $data['puzzlesSolved'] : 0;
            $difficulty     = isset($data['difficulty']) ? (string) $data['difficulty'] : 'medium';

            // Validate score
            if ($score < 0 || !is_numeric($data['score'] ?? '')) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Invalid score submitted.'
                ]);
                return;
            }

            // Persist score in MySQL database with player's avatar and difficulty mode
            $avatar = $authUser['avatar'] ?? 'avatar-1';
            $savedRecord = $this->scoreModel->recordScore(
                (int) $authUser['id'],
                $authUser['username'],
                $score,
                $puzzlesSolved,
                $avatar,
                $difficulty
            );

            // Fetch updated user stats and global top scores
            $userStats = $this->scoreModel->getUserHighScore((int) $authUser['id']);
            $topScores = $this->scoreModel->getTopScores(10, $difficulty);

            http_response_code(201);
            echo json_encode([
                'success'   => true,
                'message'   => 'Arcade score recorded to persistent database successfully!',
                'entry'     => $savedRecord,
                'userStats' => $userStats,
                'topScores' => $topScores
            ]);

        } catch (Exception $e) {
            error_log('[-] Error submitting score: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to record arcade score into MySQL database.'
            ]);
        }
    }

    /**
     * GET /api/leaderboard
     * Public endpoint: Returns top 10 global scores, with optional difficulty filter (?difficulty=easy|medium|hard).
     */
    public function getLeaderboard(): void
    {
        try {
            $difficulty = isset($_GET['difficulty']) && !empty($_GET['difficulty'])
                ? (string) $_GET['difficulty']
                : null;

            $topScores = $this->scoreModel->getTopScores(10, $difficulty);

            http_response_code(200);
            echo json_encode([
                'success'     => true,
                'difficulty'  => $difficulty ?? 'all',
                'leaderboard' => $topScores
            ]);

        } catch (Exception $e) {
            error_log('[-] Error fetching leaderboard: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to retrieve leaderboard from database.'
            ]);
        }
    }
}
