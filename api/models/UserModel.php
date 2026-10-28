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
     * Creates a new user record with hashed password
     * @param string $username Unique player identifier
     * @param string $hashedPassword Salted and hashed password string (bcrypt)
     * @return array Created user data (id, username)
     */
    public function create(string $username, string $hashedPassword): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (username, password) VALUES (:username, :password)'
        );
        $stmt->execute([
            ':username' => trim($username),
            ':password' => $hashedPassword
        ]);

        return [
            'id'       => (int) $this->db->lastInsertId(),
            'username' => trim($username)
        ];
    }

    /**
     * Finds user by username (case-insensitive)
     * @param string $username
     * @return array|null User record or null
     */
    public function findByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, username, password, created_at FROM users WHERE LOWER(username) = LOWER(:username)'
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
            'SELECT id, username, created_at FROM users WHERE id = :id'
        );
        $stmt->execute([':id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }
}
