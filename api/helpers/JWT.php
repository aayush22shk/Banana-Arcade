<?php
/**
 * ============================================================================
 * [VIRTUAL IDENTITY]: JSON Web Token (JWT) Helper
 * Architecture: Helper/Utility Layer
 * Purpose: Cryptographic signing and verification of Virtual Identity tokens
 *          using HMAC-SHA256 (zero external dependencies)
 * ============================================================================
 */

class JWT
{
    private static string $secret = '';

    /**
     * Set the cryptographic secret key for JWT signing
     */
    public static function setSecret(string $secret): void
    {
        self::$secret = $secret;
    }

    /**
     * Encode a payload into a signed JWT token string
     * @param array $payload Associative array of claims
     * @param int $expiresIn Expiration time in seconds (default: 7 days)
     * @return string Signed JWT token
     */
    public static function encode(array $payload, int $expiresIn = 604800): string
    {
        $header = self::base64UrlEncode(json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT'
        ]));

        if (!isset($payload['iat'])) {
            $payload['iat'] = time();
        }
        if (!isset($payload['exp'])) {
            $payload['exp'] = time() + $expiresIn;
        }

        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "{$header}.{$payloadEncoded}", self::$secret, true)
        );

        return "{$header}.{$payloadEncoded}.{$signature}";
    }

    /**
     * Decode and verify a JWT token string
     * @param string $token The JWT token to decode
     * @return array Decoded payload
     * @throws Exception on invalid/expired token
     */
    public static function decode(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new Exception('Invalid token structure');
        }

        [$header, $payload, $signature] = $parts;

        // Verify HMAC-SHA256 signature
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "{$header}.{$payload}", self::$secret, true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            throw new Exception('Invalid token signature');
        }

        $decoded = json_decode(self::base64UrlDecode($payload), true);
        if ($decoded === null) {
            throw new Exception('Invalid token payload');
        }

        // Check token expiration
        if (isset($decoded['exp']) && $decoded['exp'] < time()) {
            throw new Exception('TokenExpiredError');
        }

        return $decoded;
    }

    /**
     * Base64 URL-safe encoding (RFC 4648)
     */
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL-safe decoding (RFC 4648)
     */
    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
