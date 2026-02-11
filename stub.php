<?php

declare(strict_types=1);

/**
 * PHAR Stub for TYPO3 Installer
 *
 * This file is executed when the PHAR is run
 */

// Force error reporting for diagnostics (PHAR runs in a controlled context)
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Disable time limit for installation
@set_time_limit(0);

// Check if accessed via CLI or web
if (PHP_SAPI === 'cli') {
    echo "TYPO3 Installer\n";
    echo "===============\n\n";
    echo "Please access this installer via your web browser.\n";
    echo "Example: http://your-domain.com/typo3-installer.phar\n\n";
    exit(0);
}

try {
    Phar::interceptFileFuncs();
    require 'phar://' . __FILE__ . '/src/bootstrap.php';
} catch (\Throwable $e) {
    header('Content-Type: application/json', true, 500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
    ], JSON_PRETTY_PRINT);
    exit(1);
}

__HALT_COMPILER();
