<?php
/**
 * ============================================================================
 * [EVENT-DRIVEN MULTIPLAYER]: Multiplayer Room Data Access Object (DAO)
 * Architecture: Model Layer (MVC Pattern)
 * Purpose: Manages 1v1 Versus real-time rooms, player health bars (3 HP),
 *          puzzle synchronization, and winner determination in MySQL.
 * ============================================================================
 */

class MultiplayerModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Creates a new multiplayer room with a unique room code
     */
    public function createRoom(string $hostName, string $hostAvatar, array $firstPuzzle): array
    {
        $roomCode = $this->generateUniqueRoomCode();
        $cleanAvatar = preg_match('/^avatar-(10|[1-9])$/', $hostAvatar) ? $hostAvatar : 'avatar-1';
        $cleanName = mb_substr(trim($hostName), 0, 30) ?: 'HostPlayer';

        $stmt = $this->db->prepare("
            INSERT INTO multiplayer_rooms 
                (room_code, status, host_name, host_avatar, host_hp, host_score, 
                 current_puzzle_question, current_puzzle_solution, puzzle_number, last_event_msg)
            VALUES 
                (:code, 'waiting', :hname, :havatar, 3, 0, :pquest, :psol, 1, 'Room created. Waiting for challenger...')
        ");

        $stmt->execute([
            ':code'    => $roomCode,
            ':hname'   => $cleanName,
            ':havatar' => $cleanAvatar,
            ':pquest'  => $firstPuzzle['question'],
            ':psol'    => (int) $firstPuzzle['solution']
        ]);

        return $this->getRoom($roomCode);
    }

    /**
     * Joins an existing room in 'waiting' state
     */
    public function joinRoom(string $roomCode, string $guestName, string $guestAvatar): ?array
    {
        $cleanCode = strtoupper(trim($roomCode));
        $cleanAvatar = preg_match('/^avatar-(10|[1-9])$/', $guestAvatar) ? $guestAvatar : 'avatar-2';
        $cleanName = mb_substr(trim($guestName), 0, 30) ?: 'Challenger';

        $room = $this->getRoom($cleanCode);
        if (!$room) {
            throw new Exception("Room '{$cleanCode}' not found.");
        }
        if ($room['status'] !== 'waiting') {
            throw new Exception("Room is already in progress or completed.");
        }

        $stmt = $this->db->prepare("
            UPDATE multiplayer_rooms 
            SET guest_name = :gname, 
                guest_avatar = :gavatar, 
                guest_hp = 3, 
                guest_score = 0, 
                status = 'ready',
                last_event_msg = :msg
            WHERE room_code = :code AND status = 'waiting'
        ");

        $stmt->execute([
            ':gname'   => $cleanName,
            ':gavatar' => $cleanAvatar,
            ':msg'     => "{$cleanName} joined the arena! Waiting for host to start the match...",
            ':code'    => $cleanCode
        ]);

        return $this->getRoom($cleanCode);
    }

    /**
     * Fetches current state of a room
     */
    public function getRoom(string $roomCode): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM multiplayer_rooms WHERE room_code = :code LIMIT 1");
        $stmt->execute([':code' => strtoupper(trim($roomCode))]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Submits an answer for a player (host or guest).
     * Rule:
     * - Correct: awards points, advances to next puzzle for both.
     * - Incorrect: player loses 1 Health Bar (-1 HP). If HP drops to 0, opponent wins!
     */
    public function submitAnswer(string $roomCode, string $role, int $answer, array $nextPuzzle): array
    {
        $room = $this->getRoom($roomCode);
        if (!$room || !in_array($room['status'], ['playing', 'ready'], true)) {
            throw new Exception("Game session is not currently active.");
        }

        $isHost = ($role === 'host');
        $expectedSolution = (int) $room['current_puzzle_solution'];
        $isCorrect = ($answer === $expectedSolution);
        $playerName = $isHost ? $room['host_name'] : $room['guest_name'];
        $opponentName = $isHost ? $room['guest_name'] : $room['host_name'];

        if ($isCorrect) {
            // Correct Answer: Award points and load next puzzle
            $sql = $isHost
                ? "UPDATE multiplayer_rooms 
                   SET host_score = host_score + 10,
                       current_puzzle_question = :nextQuest,
                       current_puzzle_solution = :nextSol,
                       puzzle_number = puzzle_number + 1,
                       last_event_msg = :msg
                   WHERE room_code = :code"
                : "UPDATE multiplayer_rooms 
                   SET guest_score = guest_score + 10,
                       current_puzzle_question = :nextQuest,
                       current_puzzle_solution = :nextSol,
                       puzzle_number = puzzle_number + 1,
                       last_event_msg = :msg
                   WHERE room_code = :code";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':nextQuest' => $nextPuzzle['question'],
                ':nextSol'   => (int) $nextPuzzle['solution'],
                ':msg'       => "🎯 {$playerName} solved the puzzle correctly (+10 pts)!",
                ':code'      => $room['room_code']
            ]);

        } else {
            // Incorrect Answer: Player loses 1 Health Bar (HP)
            $currentHp = $isHost ? (int) $room['host_hp'] : (int) $room['guest_hp'];
            $newHp = max(0, $currentHp - 1);
            $hasLost = ($newHp <= 0);

            if ($hasLost) {
                // Knockout! Opponent wins
                $sql = $isHost
                    ? "UPDATE multiplayer_rooms 
                       SET host_hp = 0,
                           status = 'finished',
                           winner = :winner,
                           last_event_msg = :msg
                       WHERE room_code = :code"
                    : "UPDATE multiplayer_rooms 
                       SET guest_hp = 0,
                           status = 'finished',
                           winner = :winner,
                           last_event_msg = :msg
                       WHERE room_code = :code";

                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':winner' => $opponentName,
                    ':msg'    => "💥 {$playerName} lost their final health bar! {$opponentName} wins the match!",
                    ':code'   => $room['room_code']
                ]);
            } else {
                // Lost 1 HP, match continues
                $sql = $isHost
                    ? "UPDATE multiplayer_rooms 
                       SET host_hp = :newHp,
                           last_event_msg = :msg
                       WHERE room_code = :code"
                    : "UPDATE multiplayer_rooms 
                       SET guest_hp = :newHp,
                           last_event_msg = :msg
                       WHERE room_code = :code";

                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':newHp' => $newHp,
                    ':msg'   => "💔 {$playerName} answered wrong and lost 1 Health Bar! ({$newHp}/3 HP left)",
                    ':code'  => $room['room_code']
                ]);
            }
        }

        return $this->getRoom($room['room_code']);
    }

    /**
     * Host explicitly starts the game after guest has joined.
     * Transitions room from 'ready' -> 'playing', fetches first shared puzzle.
     */
    public function startGame(string $roomCode, array $firstPuzzle): array
    {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            throw new Exception("Room '{$roomCode}' not found.");
        }

        // Allow starting from 'ready' (guest joined, waiting for host to start)
        // or 'playing' (already transitioned by join — idempotent)
        if (!in_array($room['status'], ['ready', 'playing', 'waiting'], true)) {
            throw new Exception("Cannot start game — room is already finished.");
        }

        $stmt = $this->db->prepare("
            UPDATE multiplayer_rooms
            SET status = 'playing',
                current_puzzle_question = :quest,
                current_puzzle_solution = :sol,
                puzzle_number = 1,
                last_event_msg = 'Match started! Both players — solve the banana puzzle!'
            WHERE room_code = :code
        ");

        $stmt->execute([
            ':quest' => $firstPuzzle['question'],
            ':sol'   => (int) $firstPuzzle['solution'],
            ':code'  => strtoupper(trim($roomCode))
        ]);

        return $this->getRoom($roomCode);
    }

    /**
     * Resets a finished room for a rematch
     */
    public function rematch(string $roomCode, array $firstPuzzle): array
    {
        $stmt = $this->db->prepare("
            UPDATE multiplayer_rooms 
            SET host_hp = 3,
                guest_hp = 3,
                host_score = 0,
                guest_score = 0,
                status = 'playing',
                winner = NULL,
                puzzle_number = 1,
                current_puzzle_question = :quest,
                current_puzzle_solution = :sol,
                last_event_msg = 'Rematch started! Round 1 begins!'
            WHERE room_code = :code
        ");

        $stmt->execute([
            ':quest' => $firstPuzzle['question'],
            ':sol'   => (int) $firstPuzzle['solution'],
            ':code'  => strtoupper(trim($roomCode))
        ]);

        return $this->getRoom($roomCode);
    }

    /**
     * Forfeits or leaves room
     */
    public function leaveRoom(string $roomCode, string $role): void
    {
        $room = $this->getRoom($roomCode);
        if (!$room) return;

        if (in_array($room['status'], ['playing', 'ready'], true)) {
            $winner = ($role === 'host') ? $room['guest_name'] : $room['host_name'];
            $leaver = ($role === 'host') ? $room['host_name'] : $room['guest_name'];
            // Only declare a winner if there's actually an opponent
            if ($winner) {
                $stmt = $this->db->prepare("
                    UPDATE multiplayer_rooms 
                    SET status = 'finished', winner = :winner, last_event_msg = :msg 
                    WHERE room_code = :code
                ");
                $stmt->execute([
                    ':winner' => $winner,
                    ':msg'    => "{$leaver} abandoned the match. {$winner} wins by default!",
                    ':code'   => $room['room_code']
                ]);
            } else {
                // No guest yet — just delete
                $stmt = $this->db->prepare("DELETE FROM multiplayer_rooms WHERE room_code = :code");
                $stmt->execute([':code' => $room['room_code']]);
            }
        } else if ($room['status'] === 'waiting') {
            $stmt = $this->db->prepare("DELETE FROM multiplayer_rooms WHERE room_code = :code");
            $stmt->execute([':code' => $room['room_code']]);
        }
    }

    /**
     * Generates a random alphanumeric room code: e.g. BN-8492
     */
    private function generateUniqueRoomCode(): string
    {
        do {
            $code = 'BN-' . rand(1000, 9999);
            $stmt = $this->db->prepare("SELECT id FROM multiplayer_rooms WHERE room_code = :code");
            $stmt->execute([':code' => $code]);
            $exists = $stmt->fetch();
        } while ($exists);

        return $code;
    }
}
