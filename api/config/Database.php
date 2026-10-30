<?php
/**
 * ============================================================================
 * [VERSION CONTROL]: Database Connection Manager
 * Architecture: Model Layer (MVC Pattern)
 * Purpose: PDO MySQL connection singleton for persistent data storage (XAMPP)
 * ============================================================================
 */

class Database
{
    private static ?Database $instance = null;
    private PDO $pdo;

    /**
     * Database connection configuration (XAMPP MySQL defaults)
     */
    private string $host     = 'localhost';
    private string $dbName   = 'banana_arcade';
    private string $username = 'root';
    private string $password = '';
    private string $charset  = 'utf8mb4';

    private function __construct()
    {
        $dsn = "mysql:host={$this->host};dbname={$this->dbName};charset={$this->charset}";
        try {
            $this->pdo = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false
            ]);

            // Auto-heal avatar column in users and scores if running on an existing database
            try {
                $this->pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(50) DEFAULT 'avatar-1' NOT NULL");
            } catch (Exception $ign) {}
            try {
                $this->pdo->exec("ALTER TABLE scores ADD COLUMN IF NOT EXISTS avatar VARCHAR(50) DEFAULT 'avatar-1' NOT NULL");
            } catch (Exception $ign) {}
        } catch (PDOException $e) {
            // Auto-create database and tables if missing
            if ($e->getCode() == 1049 || stripos($e->getMessage(), 'Unknown database') !== false) {
                try {
                    $rootPdo = new PDO("mysql:host={$this->host};charset={$this->charset}", $this->username, $this->password);
                    $sqlFile = dirname(__DIR__, 2) . '/database/setup.sql';
                    if (file_exists($sqlFile)) {
                        $sql = file_get_contents($sqlFile);
                        $rootPdo->exec($sql);
                    }
                    $this->pdo = new PDO($dsn, $this->username, $this->password, [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES   => false
                    ]);
                    return;
                } catch (Exception $initErr) {
                    // Fall through
                }
            }

            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Database connection failed. Ensure MySQL is running in XAMPP and the banana_arcade database exists.',
                'details' => $e->getMessage()
            ]);
            exit;
        }
    }

    /**
     * Singleton pattern: Returns the single Database instance
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Returns the active PDO connection
     */
    public function getConnection(): PDO
    {
        return $this->pdo;
    }
}
