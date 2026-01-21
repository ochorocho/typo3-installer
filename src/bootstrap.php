<?php

declare(strict_types=1);

/**
 * TYPO3 Installer Bootstrap
 *
 * This file initializes the installer application and handles routing
 */

// Load Composer autoloader
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} elseif (file_exists('phar://' . __FILE__ . '/vendor/autoload.php')) {
    require_once 'phar://' . __FILE__ . '/vendor/autoload.php';
}

use TYPO3\Installer\Application;
use Symfony\Component\HttpFoundation\Request;

// Create application instance
$app = new Application();

// Handle the request
$request = Request::createFromGlobals();
$response = $app->handle($request);
$response->send();
