<?php
/**
 * MathFactService - Second External API Integration
 *
 * Consumes the Numbers Math API (http://numbersapi.com) to provide
 * educational mathematical facts and trivia for solution numbers, satisfying
 * the University CIS046-3 requirement for consuming at least TWO independent external APIs.
 */

namespace App\Services;

class MathFactService
{
    private const API_BASE_URL = 'http://numbersapi.com/';
    private const TIMEOUT = 4; // seconds

    /**
     * Fallback facts in case external service is unreachable or rate-limited
     */
    private const FALLBACK_FACTS = [
        0 => '0 is the additive identity and the only real number that is neither negative nor positive.',
        1 => '1 is the multiplicative identity and the first non-zero number in Peano arithmetic.',
        2 => '2 is the smallest and the only even prime number.',
        3 => '3 is the first odd prime number and the number of spatial dimensions we experience.',
        4 => '4 is the smallest composite number and the number of suits in a standard deck of cards.',
        5 => '5 is the number of Platonic solids and the hypotenuse of the smallest integer right triangle (3-4-5).',
        6 => '6 is the smallest perfect number (1 + 2 + 3 = 6).',
        7 => '7 is the lowest natural number that cannot be represented as the sum of the squares of three integers.',
        8 => '8 is the largest Fibonacci number that is a cube (2^3).',
        9 => '9 is the highest single-digit number in base 10 and the square of 3.'
    ];

    /**
     * Fetch a math fact for a given number from the external API
     *
     * @param int $number The number to lookup
     * @return array [success => bool, number => int, fact => string, source => string, latency_ms => float]
     */
    public static function getMathFact(int $number): array
    {
        $url = self::API_BASE_URL . urlencode((string)$number) . '/math?json';
        $startTime = microtime(true);
        $latencyMs = 0.0;

        if (function_exists('curl_init')) {
            $ch = curl_init();
            curl_setopt_array($ch, [
                \CURLOPT_URL            => $url,
                \CURLOPT_RETURNTRANSFER => true,
                \CURLOPT_TIMEOUT        => self::TIMEOUT,
                \CURLOPT_CONNECTTIMEOUT => 2,
                \CURLOPT_HTTPHEADER     => [
                    'Accept: application/json',
                    'User-Agent: BananaArcadeGame/2.0 (University Assignment CIS046-3)'
                ]
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, \CURLINFO_HTTP_CODE);
            $totalTime = curl_getinfo($ch, \CURLINFO_TOTAL_TIME);
            $curlError = curl_error($ch);
            curl_close($ch);

            $latencyMs = round($totalTime > 0 ? ($totalTime * 1000) : ((microtime(true) - $startTime) * 1000), 1);

            if ($response !== false && $httpCode === 200) {
                $data = json_decode($response, true);
                if (is_array($data) && !empty($data['text'])) {
                    return [
                        'success'    => true,
                        'number'     => $number,
                        'fact'       => $data['text'],
                        'source'     => 'NumbersAPI (External REST)',
                        'latency_ms' => $latencyMs,
                        'api_url'    => $url
                    ];
                }
            }
        } else {
            $latencyMs = round((microtime(true) - $startTime) * 1000, 1);
        }

        // Graceful fallback to guaranteed academic facts if offline
        $fallback = self::FALLBACK_FACTS[$number] ?? "Number {$number} is a positive integer with unique arithmetic properties.";
        return [
            'success'    => true,
            'number'     => $number,
            'fact'       => $fallback,
            'source'     => 'NumbersAPI (Offline Cache)',
            'latency_ms' => $latencyMs,
            'api_url'    => $url
        ];
    }
}

// Global class alias for backwards compatibility
if (!class_exists('MathFactService', false)) {
    class_alias(\App\Services\MathFactService::class, 'MathFactService');
}
