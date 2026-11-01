<?php
/**
 * ============================================================================
 * [EVENT-DRIVEN MULTIPLAYER]: Multiplayer Controller
 * Architecture: Controller Layer (MVC Pattern)
 * Purpose: Handles room creation, code-based matching, real-time status polling,
 *          answer combat resolution, and 3-Health Bar loss conditions.
 * ============================================================================
 */

class MultiplayerController
{
    private MultiplayerModel $model;

    public function __construct()
    {
        $this->model = new MultiplayerModel();
    }

    /**
     * POST /api/multiplayer/create
     * Generates a new 1v1 Versus room with unique code and initial Banana puzzle.
     */
    public function create(): void
    {
        try {
            $data     = json_decode(file_get_contents('php://input'), true) ?? [];
            $username = trim($data['username'] ?? '') ?: 'Player 1';
            $avatar   = trim($data['avatar'] ?? 'avatar-1');

            // Fetch initial Banana API puzzle
            $firstPuzzle = BananaService::fetchBananaPuzzle();

            $room = $this->model->createRoom($username, $avatar, $firstPuzzle);

            http_response_code(201);
            echo json_encode([
                'success'  => true,
                'roomCode' => $room['room_code'],
                'role'     => 'host',
                'room'     => $room,
                'message'  => "Room {$room['room_code']} created! Share this code with your opponent."
            ]);

        } catch (Exception $e) {
            error_log('[-] Error creating multiplayer room: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to create battle room: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/multiplayer/join
     * Joins an existing room using the 6-character room code.
     */
    public function join(): void
    {
        try {
            $data     = json_decode(file_get_contents('php://input'), true) ?? [];
            $roomCode = trim($data['roomCode'] ?? '');
            $username = trim($data['username'] ?? '') ?: 'Challenger';
            $avatar   = trim($data['avatar'] ?? 'avatar-2');

            if (empty($roomCode)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Room code is required.']);
                return;
            }

            $room = $this->model->joinRoom($roomCode, $username, $avatar);

            http_response_code(200);
            echo json_encode([
                'success'  => true,
                'roomCode' => $room['room_code'],
                'role'     => 'guest',
                'room'     => $room,
                'message'  => "Joined battle room {$room['room_code']} successfully!"
            ]);

        } catch (Exception $e) {
            error_log('[-] Error joining multiplayer room: ' . $e->getMessage());
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error'   => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/multiplayer/status?roomCode=BN-1234
     * Returns the latest synchronized room state for polling.
     */
    public function status(): void
    {
        try {
            $roomCode = trim($_GET['roomCode'] ?? '');
            if (empty($roomCode)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Room code is required.']);
                return;
            }

            $room = $this->model->getRoom($roomCode);
            if (!$room) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Room not found.']);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'room'    => $room
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/multiplayer/action
     * Dispatches combat actions (submit_answer, rematch, leave).
     */
    public function action(): void
    {
        try {
            $data     = json_decode(file_get_contents('php://input'), true) ?? [];
            $roomCode = trim($data['roomCode'] ?? '');
            $role     = trim($data['role'] ?? '');
            $action   = trim($data['action'] ?? '');

            if (empty($roomCode) || empty($role) || empty($action)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Missing roomCode, role, or action.']);
                return;
            }

            if ($action === 'submit_answer') {
                $answer = isset($data['answer']) ? (int) $data['answer'] : -1;
                // Fetch next puzzle in case answer is correct
                $nextPuzzle = BananaService::fetchBananaPuzzle();
                $updatedRoom = $this->model->submitAnswer($roomCode, $role, $answer, $nextPuzzle);

                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'room'    => $updatedRoom
                ]);
                return;
            }

            if ($action === 'start_game') {
                if ($role !== 'host') {
                    http_response_code(403);
                    echo json_encode(['success' => false, 'error' => 'Only the host can start the game.']);
                    return;
                }
                $firstPuzzle = BananaService::fetchBananaPuzzle();
                $updatedRoom = $this->model->startGame($roomCode, $firstPuzzle);

                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'room'    => $updatedRoom
                ]);
                return;
            }

            if ($action === 'rematch') {
                $firstPuzzle = BananaService::fetchBananaPuzzle();
                $updatedRoom = $this->model->rematch($roomCode, $firstPuzzle);

                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'room'    => $updatedRoom
                ]);
                return;
            }

            if ($action === 'leave') {
                $this->model->leaveRoom($roomCode, $role);
                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Left room.']);
                return;
            }

            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid action specified.']);

        } catch (Exception $e) {
            error_log('[-] Multiplayer action error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}
