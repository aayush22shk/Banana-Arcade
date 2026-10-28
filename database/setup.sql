-- ============================================================================
-- [VERSION CONTROL]: Banana Arcade - MySQL Database Schema
-- Architecture: Database Layer (XAMPP MySQL)
-- Purpose: Creates the banana_arcade database and initializes tables for
--          Virtual Identity credentials and persistent Leaderboard scores
-- Usage: Import via phpMyAdmin or run: mysql -u root < setup.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS banana_arcade
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE banana_arcade;

-- [VIRTUAL IDENTITY] Users Table: Stores player credentials with bcrypt hash
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- [VERSION CONTROL] Scores Table: Persistent game sessions and high scores
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    score INT NOT NULL,
    puzzles_solved INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Performance index for leaderboard queries
CREATE INDEX idx_scores_ranking ON scores (score DESC, created_at ASC);
CREATE INDEX idx_scores_user ON scores (user_id);
