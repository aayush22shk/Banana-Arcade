<?php
/**
 * ============================================================================
 * [VERSION CONTROL]: Banana Arcade - PHP API Router (Entry Point)
 * Architecture: RESTful API Router (MVC Pattern, PHP 8+)
 * Course Assignment: Academic Full-Stack Web Application
 * Mandatory External API: https://marcconrad.com/uob/banana/api.php?out=json
 * ============================================================================
 */

// Suppress HTML error output in JSON API responses
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set JSON content type for all API responses
header('Content-Type: application/json; charset=utf-8');

// Enable Cross-Origin Resource Sharing (CORS) with Credentials Support
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// [VIRTUAL IDENTITY]: Native PHP Session Initialization
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 7 * 86400,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    @session_start();
}

// ============================================================================
// Autoload project files (MVC Architecture)
// ============================================================================
require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/models/UserModel.php';
require_once __DIR__ . '/models/ScoreModel.php';
require_once __DIR__ . '/models/MultiplayerModel.php';
require_once __DIR__ . '/models/AchievementModel.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/GameController.php';
require_once __DIR__ . '/controllers/LeaderboardController.php';
require_once __DIR__ . '/controllers/MultiplayerController.php';
require_once __DIR__ . '/controllers/AchievementController.php';
require_once __DIR__ . '/services/BananaService.php';

// Initialize JWT with secret key for Virtual Identity authentication
JWT::setSecret('banana_arcade_academic_jwt_secret_key_2026');

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
// Route Dispatcher - Maps HTTP endpoints to controller actions (Lazy Loaded)
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

        // [INTEROPERABILITY] Banana API Game Endpoints (/api/game)
        case $route === 'game/puzzle' && $method === 'GET':
            (new GameController())->getPuzzle();
            break;

        case $route === 'game/verify' && $method === 'POST':
            (new GameController())->verifyAnswer();
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

        // System Health Check & Assignment Metadata Endpoint
        case $route === 'health' && $method === 'GET':
            echo json_encode([
                'status'                  => 'ONLINE',
                'app'                     => 'Banana Arcade',
                'version'                 => '1.0.0',
                'backend'                 => 'PHP 8+ / MySQL (XAMPP Apache)',
                'universityApiIntegrated' => 'https://marcconrad.com/uob/banana/api.php?out=json',
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
    // Global Centralized Error Handling
    error_log('[-] Unhandled server error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Internal server error occurred.'
    ]);
}
