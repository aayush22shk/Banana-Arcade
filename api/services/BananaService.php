<?php
/**
 * ============================================================================
 * [INTEROPERABILITY]: University Banana API Service Integration
 * Architecture: Service Layer
 * Purpose: Interoperate with external university-provided web service
 * Endpoint: https://marcconrad.com/uob/banana/api.php?out=json
 * ============================================================================
 */

class BananaService
{
    /**
     * University-provided endpoint for Banana Math Puzzles
     */
    const BANANA_API_ENDPOINT = 'https://marcconrad.com/uob/banana/api.php?out=json';

    /**
     * Fallback puzzle pool used ONLY if university server suffers outage or network drop.
     * Guarantees zero application downtime and adheres to resilient software design.
     */
    private static array $FALLBACK_PUZZLES = [
        [
            'question' => 'https://www.sanfoh.com/uob/banana/data/tf5ee98cd2d0f07cf40ebb965d2n103.png',
            'solution' => 3
        ],
        [
            'question' => 'https://www.sanfoh.com/uob/banana/data/tf5ee98cd2d0f07cf40ebb965d2n104.png',
            'solution' => 7
        ],
        [
            'question' => 'https://www.sanfoh.com/uob/banana/data/tf5ee98cd2d0f07cf40ebb965d2n105.png',
            'solution' => 5
        ]
    ];

    /**
     * [INTEROPERABILITY] Queries the university-provided Banana API.
     * Uses HTTP GET via file_get_contents with stream context for timeout handling.
     * Implements graceful fallback on network failure.
     *
     * @param int $timeoutSec Request timeout in seconds (default: 5)
     * @return array Puzzle data (question URL, solution integer, isFallback flag)
     */
    public static function fetchBananaPuzzle(int $timeoutSec = 5): array
    {
        try {
            // [INTEROPERABILITY] Configure HTTP stream context for University API request
            $context = stream_context_create([
                'http' => [
                    'method'  => 'GET',
                    'header'  => "Accept: application/json\r\nUser-Agent: BananaArcade-AcademicClient/1.0\r\n",
                    'timeout' => $timeoutSec
                ],
                'ssl' => [
                    'verify_peer'      => true,
                    'verify_peer_name' => true
                ]
            ]);

            // [INTEROPERABILITY] Outgoing HTTP request to external University Banana Web Service
            $response = @file_get_contents(self::BANANA_API_ENDPOINT, false, $context);

            if ($response === false) {
                throw new Exception('Failed to reach University Banana API');
            }

            $data = json_decode($response, true);

            // Validate payload structure from university API
            if (!$data || !isset($data['question']) || !is_string($data['question']) || !isset($data['solution'])) {
                throw new Exception('Malformed payload received from University Banana API');
            }

            return [
                'question'   => $data['question'],
                'solution'   => (int) $data['solution'],
                'isFallback' => false
            ];

        } catch (Exception $e) {
            // [INTEROPERABILITY] Graceful Error Handling: Prevent crash on external network failure
            error_log(
                "[INTEROPERABILITY WARNING] University Banana API unreachable ({$e->getMessage()}). " .
                "Activating graceful fallback puzzle to sustain uninterrupted gameplay."
            );

            // Pick random fallback puzzle to keep client gameplay functioning seamlessly
            $fallback = self::$FALLBACK_PUZZLES[array_rand(self::$FALLBACK_PUZZLES)];

            return [
                'question'    => $fallback['question'],
                'solution'    => $fallback['solution'],
                'isFallback'  => true,
                'errorNotice' => 'University Banana API was temporarily unreachable; loaded fallback puzzle.'
            ];
        }
    }
}
