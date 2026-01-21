<?php

declare(strict_types=1);

namespace TYPO3\Installer;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use TYPO3\Installer\Api\RequirementsCheckController;
use TYPO3\Installer\Api\DatabaseController;
use TYPO3\Installer\Api\InstallController;
use TYPO3\Installer\Api\PackageController;

/**
 * Main application class that handles routing and request dispatching
 */
class Application
{
    private RequirementsCheckController $requirementsController;
    private DatabaseController $databaseController;
    private InstallController $installController;
    private PackageController $packageController;

    public function __construct()
    {
        $this->requirementsController = new RequirementsCheckController();
        $this->databaseController = new DatabaseController();
        $this->installController = new InstallController();
        $this->packageController = new PackageController();
    }

    public function handle(Request $request): Response
    {
        $path = $request->getPathInfo();
        $method = $request->getMethod();

        // API routes
        if (str_starts_with($path, '/api/')) {
            return $this->handleApiRequest($path, $method, $request);
        }

        // Serve static assets (JS, CSS)
        if (str_starts_with($path, '/assets/')) {
            return $this->serveAsset($path);
        }

        // Serve frontend
        return $this->serveFrontend();
    }

    private function handleApiRequest(string $path, string $method, Request $request): Response
    {
        try {
            return match ($path) {
                '/api/packages' => $this->packageController->list($request),
                '/api/validate-requirements' => $this->packageController->validateRequirements($request),
                '/api/check-requirements' => $this->requirementsController->check($request),
                '/api/test-database' => $this->databaseController->test($request),
                '/api/install' => $this->installController->install($request),
                '/api/status' => $this->installController->getStatus($request),
                default => new JsonResponse(['error' => 'Not found'], 404)
            };
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => true,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function serveAsset(string $path): Response
    {
        // Remove leading /assets/ to get the filename
        $filename = substr($path, 8); // "/assets/" is 8 characters

        // Security: only allow specific file extensions and no path traversal
        if (str_contains($filename, '..') || str_contains($filename, '/')) {
            return new Response('Not found', 404);
        }

        $contentTypes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'html' => 'text/html',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'gif' => 'image/gif',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
        ];

        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        if (!isset($contentTypes[$extension])) {
            return new Response('Not found', 404);
        }

        $assetPath = $this->getAssetPath() . '/' . $filename;

        if (!file_exists($assetPath)) {
            return new Response('Not found', 404);
        }

        $content = file_get_contents($assetPath);
        if ($content === false) {
            return new Response('Not found', 404);
        }

        return new Response($content, 200, [
            'Content-Type' => $contentTypes[$extension],
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    }

    private function serveFrontend(): Response
    {
        // Determine if we're running from PHAR or development
        $assetPath = $this->getAssetPath();

        if (file_exists($assetPath . '/index.html')) {
            $content = file_get_contents($assetPath . '/index.html');
            if ($content !== false) {
                return new Response($content, 200, ['Content-Type' => 'text/html']);
            }
        }

        // Fallback to simple HTML if assets not built yet
        return new Response($this->getDefaultHtml(), 200, ['Content-Type' => 'text/html']);
    }

    private function getAssetPath(): string
    {
        // Check if running from PHAR
        if (str_starts_with(__FILE__, 'phar://')) {
            return 'phar://' . \Phar::running(false) . '/public/assets';
        }

        return __DIR__ . '/../public/assets';
    }

    private function getDefaultHtml(): string
    {
        return <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TYPO3 Installer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #ff8700; }
    </style>
</head>
<body>
    <div class="container">
        <h1>TYPO3 Installer</h1>
        <p>Assets not built. Please run:</p>
        <code>composer run build:frontend</code>
    </div>
</body>
</html>
HTML;
    }
}
