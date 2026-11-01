<?php
/**
 * ============================================================================
 * [TROPHIES & ACHIEVEMENTS]: Achievement Controller
 * Architecture: Controller Layer (MVC Pattern, PHP 8+)
 * Purpose: Handles retrieval of 18 trophies, player progress, and records
 *          real-time game events to unlock achievements.
 * ============================================================================
 */

class AchievementController
{
    private AchievementModel $model;

    public function __construct()
    {
        $this->model = new AchievementModel();
    }

    /**
     * Resolves the current player identifier and user ID
     */
    private function resolvePlayerIdentity(): array
    {
        $userId = null;
        $playerId = null;

        // 1. Check logged-in user via JWT or Session
        $user = AuthMiddleware::getUser();
        if ($user && !empty($user['id'])) {
            $userId = (int)$user['id'];
            $playerId = "user:{$userId}";
        }

        // 2. Fallback to client-provided guest playerId (or generate guest id)
        if (!$playerId) {
            $inputPlayerId = trim($_REQUEST['playerId'] ?? '');
            if (!empty($inputPlayerId) && preg_match('/^[a-zA-Z0-9_\-:]+$/', $inputPlayerId)) {
                $playerId = substr($inputPlayerId, 0, 80);
            } else {
                $playerId = 'guest:default';
            }
        }

        return [$playerId, $userId];
    }

    /**
     * GET /api/achievements
     * Returns full trophy collection with player progress
     */
    public function getAchievements(): void
    {
        try {
            [$playerId, $userId] = $this->resolvePlayerIdentity();
            $data = $this->model->getCollection($playerId, $userId);

            http_response_code(200);
            echo json_encode(array_merge([
                'success' => true,
                'playerId' => $playerId
            ], $data));
        } catch (Exception $e) {
            error_log('[-] Error getting achievements: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to load achievements.'
            ]);
        }
    }

    /**
     * POST /api/achievements/event
     * Records a game event and unlocks achievements
     */
    public function recordEvent(): void
    {
        try {
            $raw = file_get_contents('php://input');
            $body = json_decode($raw, true) ?? [];

            $event = trim($body['event'] ?? '');
            $eventData = $body['data'] ?? [];

            if (empty($event)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Event name is required.']);
                return;
            }

            [$playerId, $userId] = $this->resolvePlayerIdentity();

            // Override with body playerId if not authenticated
            if (!$userId && !empty($body['playerId'])) {
                $cleaned = trim($body['playerId']);
                if (preg_match('/^[a-zA-Z0-9_\-:]+$/', $cleaned)) {
                    $playerId = substr($cleaned, 0, 80);
                }
            }

            $result = $this->model->recordEvent($playerId, $event, $eventData, $userId);

            http_response_code(200);
            echo json_encode(array_merge([
                'success'  => true,
                'playerId' => $playerId
            ], $result));
        } catch (Exception $e) {
            error_log('[-] Error recording achievement event: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to record achievement event.'
            ]);
        }
    }
}
