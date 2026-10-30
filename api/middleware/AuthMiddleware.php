<?php
/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: JWT Authentication Middleware
 * Architecture: Middleware Layer
 * Purpose: Verifies JSON Web Tokens to protect private routes and
 *          preserve Virtual Identity session integrity
 * ============================================================================
 */

class AuthMiddleware
{
    /**
     * [VIRTUAL IDENTITY] Authenticates the request via JWT Bearer Token, HTTP Cookie, or PHP Session
     * 1. Checks Authorization header (Bearer <token>)
     * 2. Checks HTTP Cookie ('banana_session')
     * 3. Checks active native PHP Session ($_SESSION)
     * 
     * @return array Decoded user data (id, username, avatar)
     */
    public static function authenticate(): array
    {
        $token = '';

        // 1. Check standard Authorization header
        $authHeader = '';
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        } elseif (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        // Extract token from "Bearer <token>" format
        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            $token = trim($matches[1]);
        }

        // 2. Fallback: Check HTTP Cookie ('banana_session')
        if (empty($token) && !empty($_COOKIE['banana_session'])) {
            $token = trim($_COOKIE['banana_session']);
        }

        // 3. Fallback: Check native PHP Session
        if (empty($token)) {
            if (session_status() === PHP_SESSION_NONE) {
                @session_start();
            }
            if (!empty($_SESSION['logged_in']) && !empty($_SESSION['user_id'])) {
                return [
                    'id'       => (int) $_SESSION['user_id'],
                    'username' => $_SESSION['username'] ?? 'Player',
                    'avatar'   => $_SESSION['avatar'] ?? 'avatar-1'
                ];
            }

            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error'   => 'Access denied. Virtual identity token, cookie, or active session is required.'
            ]);
            exit;
        }

        try {
            $decoded = JWT::decode($token);
            $decoded['avatar'] = $decoded['avatar'] ?? 'avatar-1';

            // Synchronize active PHP session
            if (session_status() === PHP_SESSION_NONE) {
                @session_start();
            }
            if (empty($_SESSION['user_id'])) {
                $_SESSION['user_id']   = (int) $decoded['id'];
                $_SESSION['username']  = $decoded['username'];
                $_SESSION['avatar']    = $decoded['avatar'];
                $_SESSION['logged_in'] = true;
            }

            return $decoded;
        } catch (Exception $e) {
            // If token expired/invalid, also check if PHP session is still valid
            if (session_status() === PHP_SESSION_NONE) {
                @session_start();
            }
            if (!empty($_SESSION['logged_in']) && !empty($_SESSION['user_id'])) {
                return [
                    'id'       => (int) $_SESSION['user_id'],
                    'username' => $_SESSION['username'] ?? 'Player',
                    'avatar'   => $_SESSION['avatar'] ?? 'avatar-1'
                ];
            }

            $isExpired = strpos($e->getMessage(), 'Expired') !== false;
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error'   => $isExpired
                    ? 'Virtual identity session has expired. Please log in again.'
                    : 'Invalid virtual identity credentials provided.'
            ]);
            exit;
        }
    }
}
