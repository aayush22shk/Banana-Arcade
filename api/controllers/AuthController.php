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
     * [VIRTUAL IDENTITY] Register a new user
     * Hashes passwords with bcrypt (cost factor = 10) and stores credentials in MySQL.
     * Route: POST /api/auth/register
     */
    public function register(): void
    {
        try {
            $data     = json_decode(file_get_contents('php://input'), true);
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';

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

            // Persist new user in MySQL database
            $newUser = $this->userModel->create($trimmedUsername, $hashedPassword);

            // [VIRTUAL IDENTITY] Issue signed JSON Web Token (JWT)
            $token = JWT::encode([
                'id'       => $newUser['id'],
                'username' => $newUser['username']
            ], 7 * 24 * 60 * 60); // 7 days expiry

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Player registered successfully!',
                'token'   => $token,
                'user'    => [
                    'id'       => $newUser['id'],
                    'username' => $newUser['username']
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
     * [VIRTUAL IDENTITY] Login an existing user
     * Authenticates user credentials and returns a signed JWT token.
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

            // [VIRTUAL IDENTITY] Verify bcrypt hashed password against supplied plaintext
            if (!password_verify($password, $user['password'])) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Invalid username or password credentials.'
                ]);
                return;
            }

            // [VIRTUAL IDENTITY] Generate active session JWT token
            $token = JWT::encode([
                'id'       => $user['id'],
                'username' => $user['username']
            ], 7 * 24 * 60 * 60); // 7 days expiry

            // Fetch player's personal high score
            $stats = $this->scoreModel->getUserHighScore($user['id']);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Authentication successful. Welcome to Banana Arcade!',
                'token'   => $token,
                'user'    => [
                    'id'       => $user['id'],
                    'username' => $user['username'],
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
     * [VIRTUAL IDENTITY] Verify current active virtual identity session
     * Route: GET /api/auth/me (Protected by AuthMiddleware)
     */
    public function getMe(): void
    {
        try {
            // Authenticate via JWT middleware
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
                    'createdAt' => $user['created_at'],
                    'stats'     => $stats
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
