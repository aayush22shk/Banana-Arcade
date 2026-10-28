<?php
/**
 * ============================================================================
 * Banana Arcade - One-Time Database Setup Script
 * Purpose: Automatically creates the MySQL database and tables via browser.
 * Usage: Visit http://localhost/BananaAPI/database/setup.php in your browser
 * NOTE: Delete this file after setup for security.
 * ============================================================================
 */

header('Content-Type: text/html; charset=utf-8');

$host     = 'localhost';
$username = 'root';
$password = '';
$dbName   = 'banana_arcade';

echo "<h1>🍌 Banana Arcade - Database Setup</h1>";
echo "<pre style='background:#1a1a2e;color:#00f2fe;padding:20px;border-radius:10px;font-size:14px;'>";

try {
    // Connect to MySQL without selecting a database
    $pdo = new PDO("mysql:host={$host};charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    echo "[✓] Connected to MySQL server successfully.\n";

    // Create database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "[✓] Database '{$dbName}' created (or already exists).\n";

    // Select database
    $pdo->exec("USE `{$dbName}`");
    echo "[✓] Using database '{$dbName}'.\n";

    // Create users table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    ");
    echo "[✓] Users table initialized.\n";

    // Create scores table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS scores (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            username VARCHAR(50) NOT NULL,
            score INT NOT NULL,
            puzzles_solved INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
    echo "[✓] Scores table initialized.\n";

    // Create indexes (ignore if already exist)
    try {
        $pdo->exec("CREATE INDEX idx_scores_ranking ON scores (score DESC, created_at ASC)");
        echo "[✓] Score ranking index created.\n";
    } catch (PDOException $e) {
        echo "[~] Score ranking index already exists (skipped).\n";
    }

    try {
        $pdo->exec("CREATE INDEX idx_scores_user ON scores (user_id)");
        echo "[✓] User score index created.\n";
    } catch (PDOException $e) {
        echo "[~] User score index already exists (skipped).\n";
    }

    echo "\n====================================================\n";
    echo "🎮 DATABASE SETUP COMPLETE!\n";
    echo "====================================================\n";
    echo "\nYou can now play Banana Arcade at:\n";
    echo "  → http://localhost/BananaAPI/\n";
    echo "\n⚠ SECURITY: Delete this setup.php file after use.\n";

} catch (PDOException $e) {
    echo "[-] ERROR: " . $e->getMessage() . "\n";
    echo "\n⚠ Make sure MySQL is running in XAMPP Control Panel!\n";
}

echo "</pre>";
