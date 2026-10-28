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
     * [VIRTUAL IDENTITY] Authenticates the request via JWT Bearer Token
     * Extracts and verifies the Authorization header, returning decoded user data.
     * Terminates request with 401/403 if token is missing, invalid, or expired.
     * 
     * @return array Decoded user data (id, username) from the token
     */
    public static function authenticate(): array
    {
        $authHeader = '';

        // Check standard Authorization header
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        // Check Apache redirect header (set by .htaccess RewriteRule)
        elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        // Fallback: Check via apache_request_headers()
        elseif (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        // Extract token from "Bearer <token>" format
        $token = '';
        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            $token = $matches[1];
        }

        if (empty($token)) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error'   => 'Access denied. Virtual identity token is required to access this resource.'
            ]);
            exit;
        }

        try {
            $decoded = JWT::decode($token);
            return $decoded;
        } catch (Exception $e) {
            $isExpired = strpos($e->getMessage(), 'Expired') !== false;
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'error'   => $isExpired
                    ? 'Virtual identity session has expired. Please log in again.'
                    : 'Invalid virtual identity token provided.'
            ]);
            exit;
        }
    }
}
