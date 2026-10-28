<?php
/**
 * ============================================================================
 * [INTEROPERABILITY]: Game Controller
 * Architecture: Controller Layer (MVC Pattern)
 * Purpose: Manages Banana puzzle generation, proxying the University API,
 *          and answer verification logic.
 * ============================================================================
 */

class GameController
{
    /**
     * [INTEROPERABILITY] GET /api/game/puzzle
     * PHP backend proxy route that queries the university Banana API,
     * returning the puzzle image URL and solution verification data.
     */
    public function getPuzzle(): void
    {
        try {
            // [INTEROPERABILITY] Call backend service querying University Banana Web Service
            $puzzle = BananaService::fetchBananaPuzzle();

            // Create a tamper-proof verification token containing puzzle answer & timestamp
            $puzzleToken = JWT::encode([
                'solution'    => $puzzle['solution'],
                'question'    => $puzzle['question'],
                'generatedAt' => round(microtime(true) * 1000) // milliseconds for JS compatibility
            ], 300); // 5 minute expiry

            http_response_code(200);
            echo json_encode([
                'success'     => true,
                'question'    => $puzzle['question'],
                'solution'    => $puzzle['solution'], // Provided for instant reactive client-side gameplay
                'puzzleToken' => $puzzleToken,         // Signed token for optional server-side tamper-proof verification
                'isFallback'  => $puzzle['isFallback'] ?? false,
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
     * POST /api/game/verify
     * Verifies submitted answer against the signed puzzle verification token.
     */
    public function verifyAnswer(): void
    {
        try {
            $data        = json_decode(file_get_contents('php://input'), true);
            $puzzleToken = $data['puzzleToken'] ?? '';
            $answer      = $data['answer'] ?? null;

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

            http_response_code(200);
            echo json_encode([
                'success'   => true,
                'isCorrect' => $isCorrect,
                'expected'  => $expected,
                'submitted' => $submitted
            ]);

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
