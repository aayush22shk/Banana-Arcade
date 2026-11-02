<?php
/**
 * ============================================================================
 * [INTEROPERABILITY]: Game Controller
 * Architecture: Controller Layer (Strict 3-Tier MVC Pattern)
 * Purpose: Manages Banana puzzle generation, proxies the University API,
 *          integrates the 2nd External Math Fact API, and verifies answers.
 * ============================================================================
 */

namespace App\Controllers;

use App\Services\BananaService;
use App\Services\MathFactService;
use App\Services\ScoreService;
use App\Helpers\JWT;
use Exception;

class GameController
{
    /**
     * [INTEROPERABILITY - API 1] GET /api/game/puzzle
     * Proxies University Banana API, measuring round-trip latency in ms.
     */
    public function getPuzzle(): void
    {
        try {
            $puzzle = BananaService::fetchBananaPuzzle();

            // Create a tamper-proof verification token containing puzzle answer & timestamp
            $puzzleToken = JWT::encode([
                'solution'    => $puzzle['solution'],
                'question'    => $puzzle['question'],
                'generatedAt' => round(microtime(true) * 1000)
            ], 300); // 5 minute expiry

            http_response_code(200);
            echo json_encode([
                'success'     => true,
                'question'    => $puzzle['question'],
                'solution'    => $puzzle['solution'],
                'puzzleToken' => $puzzleToken,
                'isFallback'  => $puzzle['isFallback'] ?? false,
                'latency_ms'  => $puzzle['latency_ms'] ?? 0.0,
                'endpoint'    => BananaService::BANANA_API_ENDPOINT,
                'message'     => ($puzzle['isFallback'] ?? false)
                    ? 'University API fallback activated'
                    : 'Puzzle fetched dynamically from University Banana API'
            ]);

        } catch (Exception $e) {
            error_log('[-] Error in getPuzzle controller: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to generate math puzzle. Please try again.'
            ]);
        }
    }

    /**
     * [INTEROPERABILITY - API 2 & SCORING] POST /api/game/verify
     * Verifies submitted answer, integrates Numbers API trivia fact, and calculates combo metrics.
     */
    public function verifyAnswer(): void
    {
        try {
            $data        = json_decode(file_get_contents('php://input'), true);
            $puzzleToken = $data['puzzleToken'] ?? '';
            $answer      = $data['answer'] ?? null;
            $streak      = isset($data['streak']) ? (int)$data['streak'] : 0;
            $timeRemaining = isset($data['timeRemaining']) ? (float)$data['timeRemaining'] : 10.0;
            $difficulty  = $data['difficulty'] ?? 'medium';

            if (empty($puzzleToken) || $answer === null) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Both puzzleToken and answer are required for verification.'
                ]);
                return;
            }

            // Decode and verify the signed puzzle token
            try {
                $decoded = JWT::decode($puzzleToken);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Puzzle session expired or invalid. Please request a new puzzle.'
                ]);
                return;
            }

            $expected  = (int) $decoded['solution'];
            $submitted = (int) $answer;
            $isCorrect = ($expected === $submitted);

            $response = [
                'success'   => true,
                'isCorrect' => $isCorrect,
                'expected'  => $expected,
                'submitted' => $submitted
            ];

            if ($isCorrect) {
                $newStreak = $streak + 1;
                $multiplier = ScoreService::getStreakMultiplier($newStreak);
                $milestone  = ScoreService::getComboMilestone($newStreak);
                $points     = ScoreService::calculatePoints(100, $timeRemaining, $difficulty, $newStreak);

                // Fetch Second External API fact for this solution number
                $mathFact = MathFactService::getMathFact($expected);

                $response['newStreak']  = $newStreak;
                $response['multiplier'] = $multiplier;
                $response['milestone']  = $milestone;
                $response['points']     = $points;
                $response['mathFact']   = $mathFact;
            } else {
                $response['newStreak']  = 0;
                $response['multiplier'] = 1.0;
                $response['milestone']  = null;
            }

            http_response_code(200);
            echo json_encode($response);

        } catch (Exception $e) {
            error_log('[-] Error in verifyAnswer controller: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Error encountered during answer verification.'
            ]);
        }
    }
}

// Global class alias for backwards compatibility
if (!class_exists('GameController', false)) {
    class_alias(\App\Controllers\GameController::class, 'GameController');
}
