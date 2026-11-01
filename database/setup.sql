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

-- [VIRTUAL IDENTITY] Users Table: Stores player credentials and avatar with bcrypt hash
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(50) DEFAULT 'avatar-1' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- [VERSION CONTROL] Scores Table: Persistent game sessions and high scores
CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    avatar VARCHAR(50) DEFAULT 'avatar-1' NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium' NOT NULL,
    score INT NOT NULL,
    puzzles_solved INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Performance index for leaderboard queries
CREATE INDEX idx_scores_ranking ON scores (score DESC, created_at ASC);
CREATE INDEX idx_scores_user ON scores (user_id);
CREATE INDEX idx_scores_difficulty ON scores (difficulty, score DESC);

-- [EVENT-DRIVEN MULTIPLAYER] Multiplayer Rooms Table: Real-Time 1v1 Battle Arena
CREATE TABLE IF NOT EXISTS multiplayer_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' NOT NULL,
    host_name VARCHAR(50) NOT NULL,
    host_avatar VARCHAR(50) DEFAULT 'avatar-1' NOT NULL,
    host_hp INT DEFAULT 3 NOT NULL,
    host_score INT DEFAULT 0 NOT NULL,
    guest_name VARCHAR(50) NULL,
    guest_avatar VARCHAR(50) DEFAULT 'avatar-2' NOT NULL,
    guest_hp INT DEFAULT 3 NOT NULL,
    guest_score INT DEFAULT 0 NOT NULL,
    current_puzzle_question TEXT NULL,
    current_puzzle_solution INT NULL,
    puzzle_number INT DEFAULT 1 NOT NULL,
    last_event_msg VARCHAR(255) NULL,
    winner VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_room_code ON multiplayer_rooms (room_code);

