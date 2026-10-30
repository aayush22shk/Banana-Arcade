<?php
/**
 * ============================================================================
 * [VERSION CONTROL]: Score & Leaderboard Data Access Object (DAO)
 * Architecture: Model Layer (MVC Pattern)
 * Purpose: Manage persistent arcade game scores, rankings, and player statistics
 *          using PDO prepared statements against MySQL database
 * ============================================================================
 */

class ScoreModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Saves a completed game session score
     * @param int $userId Player foreign key ID
     * @param string $username Player username snapshot
     * @param int $score Total arcade points scored
     * @param int $puzzlesSolved Number of Banana puzzles correctly solved
     * @param string $avatar Player avatar identifier
     * @return array Saved score record
     */
    public function recordScore(int $userId, string $username, int $score, int $puzzlesSolved = 0, string $avatar = 'avatar-1'): array
    {
        $cleanAvatar = preg_match('/^avatar-(10|[1-9])$/', $avatar) ? $avatar : 'avatar-1';
        $stmt = $this->db->prepare(
            'INSERT INTO scores (user_id, username, avatar, score, puzzles_solved) VALUES (:user_id, :username, :avatar, :score, :puzzles_solved)'
        );
        $stmt->execute([
            ':user_id'        => $userId,
            ':username'       => $username,
            ':avatar'         => $cleanAvatar,
            ':score'          => $score,
            ':puzzles_solved' => $puzzlesSolved
        ]);

        return [
            'id'            => (int) $this->db->lastInsertId(),
            'userId'        => $userId,
            'username'      => $username,
            'avatar'        => $cleanAvatar,
            'score'         => $score,
            'puzzlesSolved' => $puzzlesSolved
        ];
    }

    /**
     * Retrieves the global top high scores sorted descending
     * @param int $limit Number of top scores (default: 10)
     * @return array List of top score records with avatar
     */
    public function getTopScores(int $limit = 10): array
    {
        $stmt = $this->db->prepare(
            'SELECT s.id, s.user_id, s.username, COALESCE(u.avatar, s.avatar, "avatar-1") as avatar, s.score, s.puzzles_solved, s.created_at
             FROM scores s
             LEFT JOIN users u ON s.user_id = u.id
             ORDER BY s.score DESC, s.created_at ASC
             LIMIT :lim'
        );
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * Retrieves a user's personal best high score and aggregated statistics
     * @param int $userId
     * @return array User stats (high_score, games_played, total_puzzles)
     */
    public function getUserHighScore(int $userId): array
    {
        $stmt = $this->db->prepare(
            'SELECT MAX(score) as high_score, COUNT(*) as games_played, COALESCE(SUM(puzzles_solved), 0) as total_puzzles
             FROM scores
             WHERE user_id = :user_id'
        );
        $stmt->execute([':user_id' => $userId]);
        $row = $stmt->fetch();

        return $row ?: ['high_score' => 0, 'games_played' => 0, 'total_puzzles' => 0];
    }
}
