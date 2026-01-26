<?php

declare(strict_types=1);

namespace TYPO3\Installer;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use TYPO3\Installer\Api\DatabaseController;
use TYPO3\Installer\Api\InfoController;
use TYPO3\Installer\Api\InstallController;
use TYPO3\Installer\Api\PackageController;
use TYPO3\Installer\Api\PhpDetectionController;
use TYPO3\Installer\Api\RequirementsCheckController;

/**
 * Main application class that handles routing and request dispatching
 */
class Application
{
    private RequirementsCheckController $requirementsController;
    private DatabaseController $databaseController;
    private InstallController $installController;
    private PackageController $packageController;
    private InfoController $infoController;
    private PhpDetectionController $phpDetectionController;

    public function __construct()
    {
        $this->requirementsController = new RequirementsCheckController();
        $this->databaseController = new DatabaseController();
        $this->installController = new InstallController();
        $this->packageController = new PackageController();
        $this->infoController = new InfoController();
        $this->phpDetectionController = new PhpDetectionController();
    }

    public function handle(Request $request): Response
    {
        $path = $request->getPathInfo();
        $method = $request->getMethod();

        // API routes
        if (str_starts_with($path, '/api/')) {
            return $this->handleApiRequest($path, $method, $request);
        }

        // Serve static assets (JS, CSS) - files like /installer.js, /installer.css
        if (preg_match('/^\/(installer\.(js|css))$/', $path, $matches)) {
            return $this->serveAsset($matches[1]);
        }

        // Serve frontend
        return $this->serveFrontend();
    }

    private function handleApiRequest(string $path, string $method, Request $request): Response
    {
        try {
            return match ($path) {
                '/api/info' => $this->infoController->getInfo($request),
                '/api/phpinfo' => $this->infoController->getPhpInfo($request),
                '/api/database-drivers' => $this->infoController->getDatabaseDrivers($request),
                '/api/versions' => $this->packageController->versions($request),
                '/api/packages' => $this->packageController->list($request),
                '/api/validate-requirements' => $this->packageController->validateRequirements($request),
                '/api/check-requirements' => $this->requirementsController->check($request),
                '/api/test-database' => $this->databaseController->test($request),
                '/api/detect-php' => $this->phpDetectionController->detect($request),
                '/api/validate-php-binary' => $this->phpDetectionController->validate($request),
                '/api/install' => $this->installController->install($request),
                '/api/install-stream' => $this->installController->installStream($request),
                '/api/status' => $this->installController->getStatus($request),
                default => new JsonResponse(['error' => 'Not found'], 404)
            };
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => true,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function serveAsset(string $filename): Response
    {
        $contentTypes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
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
        return new Response($this->getDefaultHtml(), 200, ['Content-Type' => 'text/html']);
    }

    private function getAssetPath(): string
    {
        // Check if running from PHAR
        if (str_starts_with(__FILE__, 'phar://')) {
            return 'phar://' . \Phar::running(false) . '/public';
        }

        return __DIR__ . '/../public';
    }

    private function getDefaultHtml(): string
    {
        $assetPath = $this->getAssetPath();
        $css = file_get_contents($assetPath . '/installer.css');
        $js = file_get_contents($assetPath . '/installer.js');

        if ($css === false || $js === false) {
            throw new \RuntimeException('Failed to load frontend assets');
        }

        $favicon = $this->getFaviconDataUri();

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TYPO3 Installer</title>
    <link rel="icon" type="image/svg+xml" href="{$favicon}">
    <script>{$js}</script>
    <style>{$css}</style>
</head>
<body>
    <installer-app></installer-app>
</body>
</html>
HTML;
    }

    private function getFaviconDataUri(): string
    {
        // actions-shield-typo3 icon from @typo3/icons with TYPO3 orange color
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="#ff8700"><path d="M13 2v6c0 3.067-3.749 5.246-5 5.888C6.747 13.246 3 11.066 3 8V2h10m1-1H2v7c0 4.375 6 7 6 7s6-2.625 6-7V1z"/><path d="M9.672 8.38c-.087.044-.174.044-.261.044-.783 0-1.913-2.696-1.913-3.609 0-.348.087-.435.174-.522-.913.131-2.044.479-2.392.914-.087.086-.13.26-.13.478 0 1.435 1.478 4.609 2.565 4.609.478-.001 1.305-.783 1.957-1.914M9.193 4.207c.957 0 1.957.174 1.957.696 0 1.13-.696 2.478-1.087 2.478-.652 0-1.435-1.783-1.435-2.696 0-.392.174-.478.565-.478"/></g></svg>';

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}
