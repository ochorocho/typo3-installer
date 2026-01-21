<?php

declare(strict_types=1);

/**
 * PHAR Stub for TYPO3 Installer
 *
 * This file is executed when the PHAR is run
 */

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

// Include the bootstrap
Phar::interceptFileFuncs();
require 'phar://' . __FILE__ . '/src/bootstrap.php';

__HALT_COMPILER();
