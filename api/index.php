<?php
/**
 * ============================================================================
 * [ENTERPRISE REST ROUTER]: Banana Arcade Game
 * Architecture: Front Controller / Gateway (Strict 3-Tier)
 * Standards: PSR-4 Autoloading, Zero SQL, RESTful Endpoint Dispatcher
 * University Coursework: CIS046-3 Software For Enterprise
 * ============================================================================
 */

// Global HTTP Header Definitions for RESTful JSON API
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Preflight CORS handler
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Session configuration
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400 * 7,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    @session_start();
}

// ============================================================================
// PSR-4 Autoloader Registration (App\ namespace)
// ============================================================================
require_once __DIR__ . '/autoload.php';

// Fallback direct requires for legacy non-namespaced controllers if any
require_once __DIR__ . '/models/ScoreModel.php';
require_once __DIR__ . '/models/MultiplayerModel.php';
require_once __DIR__ . '/models/AchievementModel.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/LeaderboardController.php';
require_once __DIR__ . '/controllers/MultiplayerController.php';
require_once __DIR__ . '/controllers/AchievementController.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';

// Initialize JWT with secret key for Virtual Identity authentication
\App\Helpers\JWT::setSecret('banana_arcade_academic_jwt_secret_key_2026');

// ============================================================================
// Parse the request route from the URI
// ============================================================================
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$route = '';
if (preg_match('#/api(?:/(.*))?$#i', $requestUri, $matches)) {
    $route = isset($matches[1]) ? trim($matches[1], '/') : '';
}
if ($route === '') {
    $route = 'health';
}
$method = $_SERVER['REQUEST_METHOD'];

// ============================================================================
// Route Dispatcher - Maps HTTP endpoints to controller actions (Strict 3-Tier)
// ============================================================================
try {
    switch (true) {

        // [VIRTUAL IDENTITY] Authentication Endpoints (/api/auth)
        case $route === 'auth/register' && $method === 'POST':
            (new AuthController())->register();
            break;

        case $route === 'auth/login' && $method === 'POST':
            (new AuthController())->login();
            break;

        case $route === 'auth/logout' && $method === 'POST':
            (new AuthController())->logout();
            break;

        case $route === 'auth/avatar' && $method === 'POST':
            (new AuthController())->updateAvatar();
            break;

        case $route === 'auth/me' && $method === 'GET':
            (new AuthController())->getMe();
            break;

        // [INTEROPERABILITY: API 1 & 2] Banana Game Endpoints (/api/game)
        case $route === 'game/puzzle' && $method === 'GET':
            (new \App\Controllers\GameController())->getPuzzle();
            break;

        case $route === 'game/verify' && $method === 'POST':
            (new \App\Controllers\GameController())->verifyAnswer();
            break;

        // [INTEROPERABILITY: API 2] Math Fact Endpoint (/api/math-fact)
        case $route === 'math-fact' && $method === 'GET':
            $num = isset($_GET['number']) ? (int)$_GET['number'] : rand(0, 9);
            $fact = \App\Services\MathFactService::getMathFact($num);
            http_response_code(200);
            echo json_encode($fact);
            break;

        // [EVENT-DRIVEN MULTIPLAYER] 1v1 Versus Endpoints (/api/multiplayer)
        case $route === 'multiplayer/create' && $method === 'POST':
            (new MultiplayerController())->create();
            break;

        case $route === 'multiplayer/join' && $method === 'POST':
            (new MultiplayerController())->join();
            break;

        case $route === 'multiplayer/status' && $method === 'GET':
            (new MultiplayerController())->status();
            break;

        case $route === 'multiplayer/action' && $method === 'POST':
            (new MultiplayerController())->action();
            break;

        // [VERSION CONTROL] Leaderboard & Persistence Endpoints (/api/leaderboard)
        case $route === 'leaderboard' && $method === 'GET':
            (new LeaderboardController())->getLeaderboard();
            break;

        case $route === 'leaderboard/submit' && $method === 'POST':
            (new LeaderboardController())->submitScore();
            break;

        // [TROPHIES & ACHIEVEMENTS] Endpoints (/api/achievements)
        case $route === 'achievements' && $method === 'GET':
            (new AchievementController())->getAchievements();
            break;

        case $route === 'achievements/event' && $method === 'POST':
            (new AchievementController())->recordEvent();
            break;

        // [HEALTH & LIVE LATENCY BADGE] Complete Diagnostics & Health Check
        case ($route === 'health' || $route === 'status') && $method === 'GET':
            $bananaPing = \App\Services\BananaService::pingBananaApi();
            $mathPing   = \App\Services\MathFactService::getMathFact(7);
            
            $dbHealthy = false;
            try {
                $pdo = \App\Config\Database::getInstance()->getConnection();
                $dbHealthy = (bool)$pdo->query('SELECT 1');
            } catch (Exception $e) {
                $dbHealthy = false;
            }

            http_response_code(200);
            echo json_encode([
                'status'                  => 'ONLINE',
                'app'                     => 'Banana Arcade',
                'version'                 => '2.0.0-Enterprise',
                'backend'                 => 'PHP 8.0+ / MySQL (Strict 3-Tier MVC)',
                'database'                => [
                    'connected' => $dbHealthy,
                    'driver'    => 'PDO MySQL (Singleton Pattern)'
                ],
                'external_apis'           => [
                    'api_1' => [
                        'name'       => 'University Banana Math API',
                        'endpoint'   => \App\Services\BananaService::BANANA_API_ENDPOINT,
                        'online'     => $bananaPing['online'] ?? false,
                        'latency_ms' => $bananaPing['latency_ms'] ?? 0.0
                    ],
                    'api_2' => [
                        'name'       => 'Numbers Math Trivia API',
                        'endpoint'   => 'http://numbersapi.com',
                        'online'     => $mathPing['success'] ?? false,
                        'latency_ms' => $mathPing['latency_ms'] ?? 0.0,
                        'sample'     => $mathPing['fact'] ?? ''
                    ]
                ],
                'standards'               => [
                    'psr4_autoloading' => true,
                    'zero_sql_views'   => true,
                    'virtual_identity' => 'Bcrypt + JWT + Avatars',
                    'testing_suite'    => '/tests/run_tests.php'
                ],
                'timestamp'               => date('c')
            ]);
            break;

        // 404: Endpoint not found
        default:
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error'   => 'API endpoint not found.',
                'route'   => $route,
                'method'  => $method
            ]);
            break;
    }
} catch (Exception $e) {
    error_log('[-] Unhandled server error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Internal server error occurred.'
    ]);
}
