<?php
/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: Authentication Controller
 * Architecture: Controller Layer (MVC Pattern)
 * Purpose: Handles user registration, password hashing (bcrypt),
 *          login, and virtual identity verification (JWT)
 * ============================================================================
 */

class AuthController
{
    private UserModel $userModel;
    private ScoreModel $scoreModel;

    public function __construct()
    {
        $this->userModel  = new UserModel();
        $this->scoreModel = new ScoreModel();
    }

    /**
     * [VIRTUAL IDENTITY] Register a new player with chosen Avatar, Session & Cookies
     * Route: POST /api/auth/register
     */
    public function register(): void
    {
        try {
            $data     = json_decode(file_get_contents('php://input'), true);
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            $avatar   = $data['avatar'] ?? 'avatar-1';

            // Validate avatar selection (10 arcade avatars)
            if (!preg_match('/^avatar-(10|[1-9])$/', $avatar)) {
                $avatar = 'avatar-1';
            }

            // Input validation
            if (empty($username) || empty($password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Both username and password are required.'
                ]);
                return;
            }

            $trimmedUsername = trim($username);
            if (strlen($trimmedUsername) < 3 || strlen($trimmedUsername) > 20) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Username must be between 3 and 20 characters long.'
                ]);
                return;
            }

            if (strlen($password) < 6) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Password must be at least 6 characters long.'
                ]);
                return;
            }

            // Check if user already exists in MySQL
            $existingUser = $this->userModel->findByUsername($trimmedUsername);
            if ($existingUser) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error'   => 'A player with this username already exists. Please choose another.'
                ]);
                return;
            }

            // [VIRTUAL IDENTITY] Secure password hashing using bcrypt (cost = 10)
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

            // Persist new user in MySQL database with chosen avatar
            $newUser = $this->userModel->create($trimmedUsername, $hashedPassword, $avatar);

            // [VIRTUAL IDENTITY] Issue signed JSON Web Token (JWT)
            $token = JWT::encode([
                'id'       => $newUser['id'],
                'username' => $newUser['username'],
                'avatar'   => $newUser['avatar']
            ], 7 * 24 * 60 * 60); // 7 days expiry

            // [VIRTUAL IDENTITY]: Initialize Native PHP Session
            if (session_status() === PHP_SESSION_NONE) {
                @session_start();
            }
            @session_regenerate_id(true);
            $_SESSION['user_id']   = $newUser['id'];
            $_SESSION['username']  = $newUser['username'];
            $_SESSION['avatar']    = $newUser['avatar'];
            $_SESSION['logged_in'] = true;
            $_SESSION['auth_time'] = time();

            // [VIRTUAL IDENTITY]: Set HTTP Cookies
            setcookie('banana_session', $token, [
                'expires'  => time() + 7 * 86400,
                'path'     => '/',
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            setcookie('banana_avatar', $newUser['avatar'], [
                'expires'  => time() + 7 * 86400,
                'path'     => '/',
                'httponly' => false,
                'samesite' => 'Lax'
            ]);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Player registered successfully! Virtual identity created.',
                'token'   => $token,
                'session' => [
                    'active'    => true,
                    'sessionId' => session_id()
                ],
                'user'    => [
                    'id'       => $newUser['id'],
                    'username' => $newUser['username'],
                    'avatar'   => $newUser['avatar'],
                    'stats'    => ['high_score' => 0, 'games_played' => 0, 'total_puzzles' => 0]
                ]
            ]);

        } catch (Exception $e) {
            error_log('[-] Error in register controller: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'An internal server error occurred while creating player account.'
            ]);
        }
    }

    /**
     * [VIRTUAL IDENTITY] Login an existing user, initializing Session & Cookies
     * Route: POST /api/auth/login
     */
    public function login(): void
    {
        try {
            $data     = json_decode(file_get_contents('php://input'), true);
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';

            if (empty($username) || empty($password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Both username and password are required.'
                ]);
                return;
            }

            $trimmedUsername = trim($username);

            // Query MySQL database for user record
            $user = $this->userModel->findByUsername($trimmedUsername);
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Invalid username or password credentials.'
                ]);
                return;
            }

            // [VIRTUAL IDENTITY] Verify bcrypt hashed password
            if (!password_verify($password, $user['password'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Invalid username or password credentials.'
                ]);
                return;
            }

            $userAvatar = $user['avatar'] ?? 'avatar-1';

            // [VIRTUAL IDENTITY] Generate active session JWT token
            $token = JWT::encode([
                'id'       => $user['id'],
                'username' => $user['username'],
                'avatar'   => $userAvatar
            ], 7 * 24 * 60 * 60);

            // [VIRTUAL IDENTITY]: Initialize Native PHP Session
            if (session_status() === PHP_SESSION_NONE) {
                @session_start();
            }
            @session_regenerate_id(true);
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['username']  = $user['username'];
            $_SESSION['avatar']    = $userAvatar;
            $_SESSION['logged_in'] = true;
            $_SESSION['auth_time'] = time();

            // [VIRTUAL IDENTITY]: Set HTTP Cookies
            setcookie('banana_session', $token, [
                'expires'  => time() + 7 * 86400,
                'path'     => '/',
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            setcookie('banana_avatar', $userAvatar, [
                'expires'  => time() + 7 * 86400,
                'path'     => '/',
                'httponly' => false,
                'samesite' => 'Lax'
            ]);

            // Fetch player's personal high score & stats
            $stats = $this->scoreModel->getUserHighScore($user['id']);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Authentication successful. Welcome to Banana Arcade!',
                'token'   => $token,
                'session' => [
                    'active'    => true,
                    'sessionId' => session_id()
                ],
                'user'    => [
                    'id'       => $user['id'],
                    'username' => $user['username'],
                    'avatar'   => $userAvatar,
                    'stats'    => $stats
                ]
            ]);

        } catch (Exception $e) {
            error_log('[-] Error in login controller: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'An internal server error occurred during authentication.'
            ]);
        }
    }

    /**
     * [VIRTUAL IDENTITY] Terminate session & clear cookies on logout
     * Route: POST /api/auth/logout
     */
    public function logout(): void
    {
        try {
            // Clear native PHP session
            if (session_status() === PHP_SESSION_NONE) {
                @session_start();
            }
            $_SESSION = [];
            if (ini_get("session.use_cookies")) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000,
                    $params["path"], $params["domain"],
                    $params["secure"], $params["httponly"]
                );
            }
            @session_destroy();

            // Expire HTTP cookies
            setcookie('banana_session', '', time() - 3600, '/');
            setcookie('banana_avatar', '', time() - 3600, '/');

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Logged out successfully. Session and cookies cleared.'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to clear session.'
            ]);
        }
    }

    /**
     * [VIRTUAL IDENTITY] Update player avatar
     * Route: POST /api/auth/avatar (Protected by AuthMiddleware)
     */
    public function updateAvatar(): void
    {
        try {
            $authUser = AuthMiddleware::authenticate();
            $data     = json_decode(file_get_contents('php://input'), true);
            $avatar   = $data['avatar'] ?? '';

            if (!preg_match('/^avatar-(10|[1-9])$/', $avatar)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Invalid avatar choice. Must be one of avatar-1 through avatar-10.'
                ]);
                return;
            }

            // Update in MySQL
            $this->userModel->updateAvatar((int) $authUser['id'], $avatar);

            // Update PHP session
            if (session_status() === PHP_SESSION_NONE) {
                @session_start();
            }
            $_SESSION['avatar'] = $avatar;

            // Update HTTP Cookie
            setcookie('banana_avatar', $avatar, [
                'expires'  => time() + 7 * 86400,
                'path'     => '/',
                'httponly' => false,
                'samesite' => 'Lax'
            ]);

            // Issue updated JWT token
            $newToken = JWT::encode([
                'id'       => $authUser['id'],
                'username' => $authUser['username'],
                'avatar'   => $avatar
            ], 7 * 24 * 60 * 60);

            // Update session cookie
            setcookie('banana_session', $newToken, [
                'expires'  => time() + 7 * 86400,
                'path'     => '/',
                'httponly' => true,
                'samesite' => 'Lax'
            ]);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Player avatar updated successfully!',
                'avatar'  => $avatar,
                'token'   => $newToken
            ]);

        } catch (Exception $e) {
            error_log('[-] Error updating avatar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to update player avatar.'
            ]);
        }
    }

    /**
     * [VIRTUAL IDENTITY] Verify current active virtual identity session
     * Route: GET /api/auth/me (Protected by AuthMiddleware)
     */
    public function getMe(): void
    {
        try {
            // Authenticate via JWT, Cookie, or PHP Session
            $authUser = AuthMiddleware::authenticate();

            $user = $this->userModel->findById((int) $authUser['id']);
            if (!$user) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Virtual identity not found in database records.'
                ]);
                return;
            }

            $stats = $this->scoreModel->getUserHighScore($user['id']);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'user'    => [
                    'id'        => $user['id'],
                    'username'  => $user['username'],
                    'avatar'    => $user['avatar'] ?? 'avatar-1',
                    'createdAt' => $user['created_at'],
                    'stats'     => $stats
                ],
                'session' => [
                    'active'    => session_status() === PHP_SESSION_ACTIVE,
                    'hasCookie' => !empty($_COOKIE['banana_session'])
                ]
            ]);

        } catch (Exception $e) {
            error_log('[-] Error in getMe controller: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Failed to verify active virtual identity.'
            ]);
        }
    }
}
