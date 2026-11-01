<?php
/**
 * ============================================================================
 * [TROPHIES & ACHIEVEMENTS]: Achievement Model
 * Architecture: Model Layer (MVC Pattern, PHP 8+)
 * Purpose: Manages persistent tracking of player stats, unlocks of 18 trophies,
 *          progress evaluation, and tiers (Bronze, Silver, Gold, Platinum).
 * ============================================================================
 */

class AchievementModel
{
    private PDO $db;

    /**
     * 18 Configurable Achievements definition
     */
    public const TROPHIES = [
        // ── 1. Gameplay Trophies ─────────────────────────────────────────────
        'first_banana' => [
            'id'          => 'first_banana',
            'title'       => 'First Banana',
            'desc'        => 'Complete your first arcade game.',
            'category'    => 'gameplay',
            'tier'        => 'bronze',
            'target'      => 1,
            'metric'      => 'games_played',
            'icon'        => '🍌',
            'requirement' => 'Play 1 game'
        ],
        'getting_started' => [
            'id'          => 'getting_started',
            'title'       => 'Getting Started',
            'desc'        => 'Complete 10 arcade games.',
            'category'    => 'gameplay',
            'tier'        => 'bronze',
            'target'      => 10,
            'metric'      => 'games_played',
            'icon'        => '🎮',
            'requirement' => 'Play 10 games'
        ],
        'arcade_veteran' => [
            'id'          => 'arcade_veteran',
            'title'       => 'Arcade Veteran',
            'desc'        => 'Complete 50 arcade games.',
            'category'    => 'gameplay',
            'tier'        => 'silver',
            'target'      => 50,
            'metric'      => 'games_played',
            'icon'        => '🕹️',
            'requirement' => 'Play 50 games'
        ],
        'arcade_legend' => [
            'id'          => 'arcade_legend',
            'title'       => 'Arcade Legend',
            'desc'        => 'Complete 100 arcade games.',
            'category'    => 'gameplay',
            'tier'        => 'gold',
            'target'      => 100,
            'metric'      => 'games_played',
            'icon'        => '👑',
            'requirement' => 'Play 100 games'
        ],

        // ── 2. Combo Trophies ────────────────────────────────────────────────
        'combo_starter' => [
            'id'          => 'combo_starter',
            'title'       => 'Combo Starter',
            'desc'        => 'Reach a 3-answer streak.',
            'category'    => 'combo',
            'tier'        => 'bronze',
            'target'      => 3,
            'metric'      => 'max_streak',
            'icon'        => '⚡',
            'requirement' => 'Achieve 3 streak'
        ],
        'combo_master' => [
            'id'          => 'combo_master',
            'title'       => 'Combo Master',
            'desc'        => 'Reach a 5-answer streak.',
            'category'    => 'combo',
            'tier'        => 'silver',
            'target'      => 5,
            'metric'      => 'max_streak',
            'icon'        => '🔥',
            'requirement' => 'Achieve 5 streak'
        ],
        'unstoppable' => [
            'id'          => 'unstoppable',
            'title'       => 'Unstoppable',
            'desc'        => 'Reach a 10-answer streak.',
            'category'    => 'combo',
            'tier'        => 'gold',
            'target'      => 10,
            'metric'      => 'max_streak',
            'icon'        => '💥',
            'requirement' => 'Achieve 10 streak'
        ],
        'banana_god' => [
            'id'          => 'banana_god',
            'title'       => 'Banana God',
            'desc'        => 'Reach a legendary 20-answer streak.',
            'category'    => 'combo',
            'tier'        => 'platinum',
            'target'      => 20,
            'metric'      => 'max_streak',
            'icon'        => '🌟',
            'requirement' => 'Achieve 20 streak'
        ],

        // ── 3. Winning Trophies ──────────────────────────────────────────────
        'first_victory' => [
            'id'          => 'first_victory',
            'title'       => 'First Victory',
            'desc'        => 'Win your first game.',
            'category'    => 'winning',
            'tier'        => 'bronze',
            'target'      => 1,
            'metric'      => 'games_won',
            'icon'        => '🏆',
            'requirement' => 'Win 1 game'
        ],
        'winning_streak' => [
            'id'          => 'winning_streak',
            'title'       => 'Winning Streak',
            'desc'        => 'Win 5 games in a row.',
            'category'    => 'winning',
            'tier'        => 'silver',
            'target'      => 5,
            'metric'      => 'consecutive_wins',
            'icon'        => '🎯',
            'requirement' => 'Win 5 games in a row'
        ],
        'champion' => [
            'id'          => 'champion',
            'title'       => 'Champion',
            'desc'        => 'Win 25 games.',
            'category'    => 'winning',
            'tier'        => 'gold',
            'target'      => 25,
            'metric'      => 'games_won',
            'icon'        => '🥇',
            'requirement' => 'Win 25 games'
        ],
        'dominator' => [
            'id'          => 'dominator',
            'title'       => 'Dominator',
            'desc'        => 'Win 50 games.',
            'category'    => 'winning',
            'tier'        => 'platinum',
            'target'      => 50,
            'metric'      => 'games_won',
            'icon'        => '🎖️',
            'requirement' => 'Win 50 games'
        ],

        // ── 4. Multiplayer Trophies ──────────────────────────────────────────
        'first_blood' => [
            'id'          => 'first_blood',
            'title'       => 'First Blood',
            'desc'        => 'Win your first 1v1 multiplayer match.',
            'category'    => 'multiplayer',
            'tier'        => 'bronze',
            'target'      => 1,
            'metric'      => 'mp_wins',
            'icon'        => '⚔️',
            'requirement' => 'Win 1 multiplayer match'
        ],
        'friendly_rival' => [
            'id'          => 'friendly_rival',
            'title'       => 'Friendly Rival',
            'desc'        => 'Play 10 multiplayer matches.',
            'category'    => 'multiplayer',
            'tier'        => 'silver',
            'target'      => 10,
            'metric'      => 'mp_matches',
            'icon'        => '🤝',
            'requirement' => 'Play 10 multiplayer matches'
        ],
        'multiplayer_champion' => [
            'id'          => 'multiplayer_champion',
            'title'       => 'Multiplayer Champion',
            'desc'        => 'Win 10 multiplayer matches.',
            'category'    => 'multiplayer',
            'tier'        => 'gold',
            'target'      => 10,
            'metric'      => 'mp_wins',
            'icon'        => '🛡️',
            'requirement' => 'Win 10 multiplayer matches'
        ],

        // ── 5. Special Trophies ──────────────────────────────────────────────
        'perfect_game' => [
            'id'          => 'perfect_game',
            'title'       => 'Perfect Game',
            'desc'        => 'Complete a game without making a mistake or losing a life.',
            'category'    => 'special',
            'tier'        => 'gold',
            'target'      => 1,
            'metric'      => 'perfect_games',
            'icon'        => '💎',
            'requirement' => 'Complete a flawless game'
        ],
        'survivor' => [
            'id'          => 'survivor',
            'title'       => 'Survivor',
            'desc'        => 'Win a multiplayer match with only 1 HP remaining.',
            'category'    => 'special',
            'tier'        => 'silver',
            'target'      => 1,
            'metric'      => 'survivor_wins',
            'icon'        => '❤️',
            'requirement' => 'Win multiplayer with 1 HP left'
        ],
        'difficulty_master' => [
            'id'          => 'difficulty_master',
            'title'       => 'Difficulty Master',
            'desc'        => 'Win a game on each difficulty: Easy, Medium, and Hard.',
            'category'    => 'special',
            'tier'        => 'platinum',
            'target'      => 3,
            'metric'      => 'difficulties_count',
            'icon'        => '🌈',
            'requirement' => 'Win on Easy, Medium & Hard'
        ]
    ];

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Retrieves or initializes stats for a player
     */
    public function getPlayerStats(string $playerId, ?int $userId = null): array
    {
        $stmt = $this->db->prepare("SELECT * FROM player_stats WHERE player_id = :pid LIMIT 1");
        $stmt->execute([':pid' => $playerId]);
        $row = $stmt->fetch();

        if (!$row) {
            $stmt = $this->db->prepare("
                INSERT INTO player_stats (player_id, user_id) 
                VALUES (:pid, :uid)
            ");
            $stmt->execute([':pid' => $playerId, ':uid' => $userId]);

            return [
                'player_id'        => $playerId,
                'user_id'          => $userId,
                'games_played'     => 0,
                'games_won'        => 0,
                'consecutive_wins' => 0,
                'max_streak'       => 0,
                'mp_matches'       => 0,
                'mp_wins'          => 0,
                'perfect_games'    => 0,
                'survivor_wins'    => 0,
                'difficulties_won' => ''
            ];
        }

        // Auto-link user_id if player just logged in
        if ($userId && empty($row['user_id'])) {
            $update = $this->db->prepare("UPDATE player_stats SET user_id = :uid WHERE player_id = :pid");
            $update->execute([':uid' => $userId, ':pid' => $playerId]);
            $row['user_id'] = $userId;
        }

        return $row;
    }

    /**
     * Returns full achievement collection with unlock statuses and progress
     */
    public function getCollection(string $playerId, ?int $userId = null): array
    {
        $stats = $this->getPlayerStats($playerId, $userId);

        // Fetch unlocked achievements
        $stmt = $this->db->prepare("SELECT achievement_id, unlocked_at FROM player_achievements WHERE player_id = :pid");
        $stmt->execute([':pid' => $playerId]);
        $unlockedRows = $stmt->fetchAll();

        $unlockedMap = [];
        foreach ($unlockedRows as $u) {
            $unlockedMap[$u['achievement_id']] = $u['unlocked_at'];
        }

        // Count unique difficulties won
        $diffList = array_filter(array_map('trim', explode(',', strtolower($stats['difficulties_won'] ?? ''))));
        $diffCount = count(array_unique($diffList));

        $collection = [];
        $unlockedCount = 0;

        foreach (self::TROPHIES as $id => $info) {
            $isUnlocked = isset($unlockedMap[$id]);
            if ($isUnlocked) $unlockedCount++;

            // Calculate current value for progress
            $metric = $info['metric'];
            if ($metric === 'difficulties_count') {
                $currentVal = $diffCount;
            } else {
                $currentVal = (int)($stats[$metric] ?? 0);
            }

            $target = (int)$info['target'];
            $progressPct = $isUnlocked ? 100 : min(100, (int)round(($currentVal / max(1, $target)) * 100));

            $collection[] = [
                'id'          => $id,
                'title'       => $info['title'],
                'desc'        => $info['desc'],
                'category'    => $info['category'],
                'tier'        => $info['tier'],
                'target'      => $target,
                'current'     => min($currentVal, $target),
                'progressPct' => $progressPct,
                'isUnlocked'  => $isUnlocked,
                'unlockedAt'  => $unlockedMap[$id] ?? null,
                'icon'        => $info['icon'],
                'requirement' => $info['requirement']
            ];
        }

        $totalAvailable = count(self::TROPHIES);
        $completionPct = (int)round(($unlockedCount / max(1, $totalAvailable)) * 100);

        return [
            'stats'          => $stats,
            'achievements'   => $collection,
            'totalUnlocked'  => $unlockedCount,
            'totalAvailable' => $totalAvailable,
            'completionPct'  => $completionPct
        ];
    }

    /**
     * Records a game event, updates stats, and checks for newly unlocked trophies
     */
    public function recordEvent(string $playerId, string $event, array $data, ?int $userId = null): array
    {
        $stats = $this->getPlayerStats($playerId, $userId);

        $gamesPlayed    = (int)$stats['games_played'];
        $gamesWon       = (int)$stats['games_won'];
        $consecWins     = (int)$stats['consecutive_wins'];
        $maxStreak      = (int)$stats['max_streak'];
        $mpMatches      = (int)$stats['mp_matches'];
        $mpWins         = (int)$stats['mp_wins'];
        $perfectGames   = (int)$stats['perfect_games'];
        $survivorWins   = (int)$stats['survivor_wins'];
        $difficultiesWon = array_filter(array_map('trim', explode(',', strtolower($stats['difficulties_won'] ?? ''))));

        switch ($event) {
            case 'solo_game_completed':
                $gamesPlayed++;
                $streak = (int)($data['streak'] ?? 0);
                if ($streak > $maxStreak) $maxStreak = $streak;

                $score = (int)($data['score'] ?? 0);
                $attempts = (int)($data['attempts'] ?? 0);
                $solved = (int)($data['puzzlesSolved'] ?? 0);
                $diff = strtolower(trim($data['difficulty'] ?? 'medium'));

                // Solo game is considered won if score >= 30 and solved >= 3
                $isWin = ($score >= 30 && $solved >= 3);
                if ($isWin) {
                    $gamesWon++;
                    $consecWins++;
                    if (!in_array($diff, $difficultiesWon, true)) {
                        $difficultiesWon[] = $diff;
                    }
                } else {
                    $consecWins = 0;
                }

                // Perfect game if at least 5 solved with zero mistakes
                if ($solved >= 5 && $attempts === $solved) {
                    $perfectGames++;
                }
                break;

            case 'multiplayer_match_ended':
                $gamesPlayed++;
                $mpMatches++;
                $won = !empty($data['won']);
                $remainingHp = (int)($data['remainingHp'] ?? 0);
                $streak = (int)($data['streak'] ?? 0);
                if ($streak > $maxStreak) $maxStreak = $streak;

                if ($won) {
                    $gamesWon++;
                    $mpWins++;
                    $consecWins++;
                    if ($remainingHp === 1) {
                        $survivorWins++;
                    }
                    if ($remainingHp === 3) {
                        $perfectGames++;
                    }
                } else {
                    $consecWins = 0;
                }
                break;

            case 'combo_reached':
                $streak = (int)($data['streak'] ?? 0);
                if ($streak > $maxStreak) $maxStreak = $streak;
                break;
        }

        $diffStr = implode(',', array_unique($difficultiesWon));

        // Update player stats
        $stmt = $this->db->prepare("
            UPDATE player_stats 
            SET games_played = :gp,
                games_won = :gw,
                consecutive_wins = :cw,
                max_streak = :ms,
                mp_matches = :mm,
                mp_wins = :mw,
                perfect_games = :pg,
                survivor_wins = :sw,
                difficulties_won = :dw
            WHERE player_id = :pid
        ");
        $stmt->execute([
            ':gp'  => $gamesPlayed,
            ':gw'  => $gamesWon,
            ':cw'  => $consecWins,
            ':ms'  => $maxStreak,
            ':mm'  => $mpMatches,
            ':mw'  => $mpWins,
            ':pg'  => $perfectGames,
            ':sw'  => $survivorWins,
            ':dw'  => $diffStr,
            ':pid' => $playerId
        ]);

        // Evaluate achievement criteria
        $newlyUnlocked = [];
        $existingUnlocked = $this->getUnlockedIds($playerId);

        $diffCount = count(array_unique($difficultiesWon));

        foreach (self::TROPHIES as $id => $info) {
            if (in_array($id, $existingUnlocked, true)) continue;

            $metric = $info['metric'];
            $target = (int)$info['target'];

            $currentVal = ($metric === 'difficulties_count') ? $diffCount : match ($metric) {
                'games_played'     => $gamesPlayed,
                'games_won'        => $gamesWon,
                'consecutive_wins' => $consecWins,
                'max_streak'       => $maxStreak,
                'mp_matches'       => $mpMatches,
                'mp_wins'          => $mpWins,
                'perfect_games'    => $perfectGames,
                'survivor_wins'    => $survivorWins,
                default            => 0
            };

            if ($currentVal >= $target) {
                // UNLOCK ACHIEVEMENT!
                $ins = $this->db->prepare("
                    INSERT IGNORE INTO player_achievements (player_id, achievement_id, unlocked_at) 
                    VALUES (:pid, :aid, NOW())
                ");
                $ins->execute([':pid' => $playerId, ':aid' => $id]);

                $newlyUnlocked[] = [
                    'id'       => $id,
                    'title'    => $info['title'],
                    'desc'     => $info['desc'],
                    'tier'     => $info['tier'],
                    'icon'     => $info['icon'],
                    'category' => $info['category']
                ];
            }
        }

        $fullCollection = $this->getCollection($playerId, $userId);
        $fullCollection['newlyUnlocked'] = $newlyUnlocked;

        return $fullCollection;
    }

    private function getUnlockedIds(string $playerId): array
    {
        $stmt = $this->db->prepare("SELECT achievement_id FROM player_achievements WHERE player_id = :pid");
        $stmt->execute([':pid' => $playerId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    }
}

