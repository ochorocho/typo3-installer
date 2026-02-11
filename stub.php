<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
@set_time_limit(0);

if (PHP_SAPI === 'cli') {
    echo "TYPO3 Installer\n";
    echo "===============\n\n";
    echo "Please access this installer via your web browser.\n";
    echo "Example: http://your-domain.com/typo3-installer.phar\n\n";
    exit(0);
}

// Check Phar extension availability
if (!class_exists('Phar')) {
    header('Content-Type: application/json', true, 500);
    echo json_encode([
        'error' => true,
        'message' => "PHP's phar extension is missing. The TYPO3 Installer requires it to run.",
        'details' => 'Enable the phar extension in your PHP configuration or contact your hosting provider.',
    ], JSON_PRETTY_PRINT);
    exit(1);
}

try {
    Phar::mapPhar('typo3-installer.phar');
    require 'phar://typo3-installer.phar/src/bootstrap.php';
} catch (\Throwable $e) {
    // Collect diagnostics for troubleshooting
    $diagnostics = [
        'phar_stream_registered' => in_array('phar', stream_get_wrappers(), true),
        'open_basedir' => ini_get('open_basedir') ?: '(none)',
        'phar_readonly' => ini_get('phar.readonly'),
        'file_path' => __FILE__,
        'file_readable' => is_readable(__FILE__),
        'file_size' => @filesize(__FILE__),
    ];

    header('Content-Type: application/json', true, 500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'diagnostics' => $diagnostics,
    ], JSON_PRETTY_PRINT);
    exit(1);
}

__HALT_COMPILER();
