<?php
/**
 * ScoreService - Business Logic Layer for Scoring and Combos
 *
 * Implements strict 3-tier architecture by decoupling scoring algorithms,
 * combo streak multipliers, and milestone evaluation from Controllers and Views.
 */

namespace App\Services;

class ScoreService
{
    /**
     * Streak multiplier thresholds
     */
    public const MULTIPLIERS = [
        10 => 3.0,
        7  => 2.5,
        5  => 2.0,
        3  => 1.5,
        0  => 1.0
    ];

    /**
     * Difficulty score scaling
     */
    public const DIFFICULTY_WEIGHTS = [
        'easy'   => 1.0,
        'medium' => 1.5,
        'hard'   => 2.0
    ];

    /**
     * Calculate score multiplier based on consecutive correct answer streak
     *
     * @param int $streak Current consecutive correct answers
     * @return float Multiplier (1.0x, 1.5x, 2.0x, 2.5x, 3.0x)
     */
    public static function getStreakMultiplier(int $streak): float
    {
        if ($streak >= 10) {
            return 3.0;
        }
        if ($streak >= 7) {
            return 2.5;
        }
        if ($streak >= 5) {
            return 2.0;
        }
        if ($streak >= 3) {
            return 1.5;
        }
        return 1.0;
    }

    /**
     * Evaluate combo milestone notification and animation metadata
     *
     * @param int $streak Current streak
     * @return array|null Returns milestone data or null if not a threshold
     */
    public static function getComboMilestone(int $streak): ?array
    {
        switch ($streak) {
            case 2:
                return [
                    'streak'    => 2,
                    'title'     => 'Nice!',
                    'sound'     => 'combo_nice',
                    'tier'      => 1,
                    'effect'    => 'bounce'
                ];
            case 3:
                return [
                    'streak'    => 3,
                    'title'     => 'COMBO x3!',
                    'sound'     => 'combo_3',
                    'tier'      => 2,
                    'effect'    => 'scale-pop'
                ];
            case 5:
                return [
                    'streak'    => 5,
                    'title'     => 'AMAZING x5!',
                    'sound'     => 'combo_5',
                    'tier'      => 3,
                    'effect'    => 'sparkle-burst'
                ];
            case 7:
                return [
                    'streak'    => 7,
                    'title'     => 'FANTASTIC x7!',
                    'sound'     => 'combo_7',
                    'tier'      => 4,
                    'effect'    => 'fire-pulse'
                ];
            case 10:
                return [
                    'streak'    => 10,
                    'title'     => 'UNSTOPPABLE x10!',
                    'sound'     => 'combo_10',
                    'tier'      => 5,
                    'effect'    => 'cosmic-explode'
                ];
            default:
                if ($streak > 10 && $streak % 5 === 0) {
                    return [
                        'streak' => $streak,
                        'title'  => "GODLIKE x{$streak}!",
                        'sound'  => 'combo_10',
                        'tier'   => 5,
                        'effect' => 'cosmic-explode'
                    ];
                }
                return null;
        }
    }

    /**
     * Compute points earned for an answer
     *
     * @param int $basePoints Base point value (e.g., 100)
     * @param float $timeRemaining Seconds remaining on timer
     * @param string $difficulty easy|medium|hard
     * @param int $streak Current consecutive correct answers
     * @return int Total points calculated
     */
    public static function calculatePoints(
        int $basePoints,
        float $timeRemaining,
        string $difficulty = 'medium',
        int $streak = 0
    ): int {
        $diffWeight = self::DIFFICULTY_WEIGHTS[strtolower($difficulty)] ?? 1.0;
        $multiplier = self::getStreakMultiplier($streak);
        $timeBonus  = max(0, (int)($timeRemaining * 10));

        $points = (int)round(($basePoints + $timeBonus) * $diffWeight * $multiplier);
        return max(10, $points);
    }
}

