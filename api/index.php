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

// Enable Cross-Origin Resource Sharing (CORS)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle CORS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================================
// Autoload project files (MVC Architecture)
// ============================================================================
require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/models/UserModel.php';
require_once __DIR__ . '/models/ScoreModel.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/GameController.php';
require_once __DIR__ . '/controllers/LeaderboardController.php';
require_once __DIR__ . '/services/BananaService.php';

// Initialize JWT with secret key (matching original Node.js configuration)
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

        // [VERSION CONTROL] Leaderboard & Persistence Endpoints (/api/leaderboard)
        case $route === 'leaderboard' && $method === 'GET':
            (new LeaderboardController())->getLeaderboard();
            break;

        case $route === 'leaderboard/submit' && $method === 'POST':
            (new LeaderboardController())->submitScore();
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
