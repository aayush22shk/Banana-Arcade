<?php
/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: User Data Access Object (DAO)
 * Architecture: Model Layer (MVC Pattern)
 * Purpose: Manage user identity records, credentials, and verification queries
 *          using PDO prepared statements against MySQL database
 * ============================================================================
 */

class UserModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Creates a new user record with hashed password and chosen avatar
     * @param string $username Unique player identifier
     * @param string $hashedPassword Salted and hashed password string (bcrypt)
     * @param string $avatar Selected avatar identifier (e.g. avatar-1)
     * @return array Created user data (id, username, avatar)
     */
    public function create(string $username, string $hashedPassword, string $avatar = 'avatar-1'): array
    {
        $cleanAvatar = preg_match('/^avatar-(10|[1-9])$/', $avatar) ? $avatar : 'avatar-1';
        $stmt = $this->db->prepare(
            'INSERT INTO users (username, password, avatar) VALUES (:username, :password, :avatar)'
        );
        $stmt->execute([
            ':username' => trim($username),
            ':password' => $hashedPassword,
            ':avatar'   => $cleanAvatar
        ]);

        return [
            'id'       => (int) $this->db->lastInsertId(),
            'username' => trim($username),
            'avatar'   => $cleanAvatar
        ];
    }

    /**
     * Updates player avatar in database
     * @param int $userId
     * @param string $avatar
     * @return bool
     */
    public function updateAvatar(int $userId, string $avatar): bool
    {
        $cleanAvatar = preg_match('/^avatar-(10|[1-9])$/', $avatar) ? $avatar : 'avatar-1';
        $stmt = $this->db->prepare('UPDATE users SET avatar = :avatar WHERE id = :id');
        $success = $stmt->execute([
            ':avatar' => $cleanAvatar,
            ':id'     => $userId
        ]);

        // Keep scores table avatar snapshot synchronized
        try {
            $stmtScore = $this->db->prepare('UPDATE scores SET avatar = :avatar WHERE user_id = :user_id');
            $stmtScore->execute([':avatar' => $cleanAvatar, ':user_id' => $userId]);
        } catch (Exception $e) {}

        return $success;
    }

    /**
     * Finds user by username (case-insensitive)
     * @param string $username
     * @return array|null User record or null
     */
    public function findByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, username, password, COALESCE(avatar, "avatar-1") as avatar, created_at FROM users WHERE LOWER(username) = LOWER(:username)'
        );
        $stmt->execute([':username' => trim($username)]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Finds user by primary key ID
     * @param int $id
     * @return array|null User record or null
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, username, COALESCE(avatar, "avatar-1") as avatar, created_at FROM users WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }
}
