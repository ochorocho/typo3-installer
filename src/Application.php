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

    public function __construct()
    {
        $this->requirementsController = new RequirementsCheckController();
        $this->databaseController = new DatabaseController();
        $this->installController = new InstallController();
        $this->packageController = new PackageController();
        $this->infoController = new InfoController();
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
                '/api/versions' => $this->packageController->versions($request),
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

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TYPO3 Installer</title>
    <script>{$js}</script>
    <style>{$css}</style>
</head>
<body>
    <installer-app></installer-app>
</body>
</html>
HTML;
    }
}
