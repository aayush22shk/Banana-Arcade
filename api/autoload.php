<?php
/**
 * ============================================================================
 * [PSR-4 COMPLIANT AUTOLOADER]
 * Architecture: Core Framework / System Loader
 * Standards: PHP-FIG PSR-4 (https://www.php-fig.org/psr/psr-4/)
 * Purpose: Automatically loads namespaced classes within the App\ namespace
 *          and manages class aliases for backwards compatibility.
 * ============================================================================
 */

spl_autoload_register(function ($class) {
    // Project-specific namespace prefix
    $prefix = 'App\\';

    // Base directory for the namespace prefix
    $baseDir = __DIR__ . '/';

    // Does the class use the namespace prefix?
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        // Not in App\ namespace, ignore
        return;
    }

    // Get the relative class name
    $relativeClass = substr($class, $len);

    // Replace namespace separators with directory separators, append with .php
    $parts = explode('\\', $relativeClass);

    // Map capitalized namespace folders to lowercase directory names if needed
    // e.g. App\Services\BananaService -> services/BananaService.php
    $filename = array_pop($parts) . '.php';
    $dirPath = '';
    if (!empty($parts)) {
        $dirPath = strtolower(implode('/', $parts)) . '/';
    }

    $file = $baseDir . $dirPath . $filename;

    if (file_exists($file)) {
        require_once $file;
        return;
    }

    // Secondary search: exact case match
    $directFile = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($directFile)) {
        require_once $directFile;
    }
});

// If composer vendor autoloader exists, load it as well
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

