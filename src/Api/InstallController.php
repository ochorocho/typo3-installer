<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Model\InstallationConfig;
use TYPO3\Installer\Service\Typo3Installer;

/**
 * Controller for TYPO3 installation
 */
class InstallController extends AbstractController
{
    private Typo3Installer $installer;
    private string $statusFile;

    public function __construct(
        ?Typo3Installer $installer = null,
        ?string $statusFile = null
    ) {
        $this->installer = $installer ?? new Typo3Installer();
        $this->statusFile = $statusFile ?? sys_get_temp_dir() . '/typo3-installer-status.json';
    }

    public function install(Request $request): JsonResponse
    {
        $data = $this->parseJsonBody($request);

        if ($data instanceof JsonResponse) {
            return $data;
        }

        try {
            $config = InstallationConfig::fromArray($data);

            // Initialize status immediately
            $this->updateStatus([
                'progress' => 0,
                'currentTask' => 'Starting installation...',
                'completed' => false,
                'error' => null,
            ]);

            // Create response first
            $response = $this->successResponse(['message' => 'Installation started']);

            // Send response immediately if possible (FPM)
            if (function_exists('fastcgi_finish_request')) {
                // Send headers and body
                $response->send();
                // Flush output and close connection to client
                fastcgi_finish_request();
                // Now run the installation (client won't wait)
                $this->runInstallation($config);
            } else {
                // Fallback: Use ignore_user_abort and output buffering
                ignore_user_abort(true);
                set_time_limit(0);

                // Send response with Connection: close to hint client to stop waiting
                $response->headers->set('Connection', 'close');
                $response->headers->set('Content-Length', (string)strlen($response->getContent() ?: ''));
                $response->send();

                // Flush all output buffers
                if (ob_get_level() > 0) {
                    ob_end_flush();
                }
                flush();

                // Run installation after response is sent
                $this->runInstallation($config);
            }

            return $response;
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function getStatus(Request $request): JsonResponse
    {
        if (!file_exists($this->statusFile)) {
            return new JsonResponse([
                'progress' => 0,
                'currentTask' => 'Initializing...',
                'completed' => false,
                'error' => null,
            ]);
        }

        $fileContent = file_get_contents($this->statusFile);
        /** @var array<string, mixed> $status */
        $status = json_decode($fileContent !== false ? $fileContent : '{}', true);

        return new JsonResponse($status);
    }

    /**
     * Run the installation process (called after response is sent to client)
     */
    private function runInstallation(InstallationConfig $config): void
    {
        try {
            $this->installer->install($config, function (int $progress, string $task) {
                $this->updateStatus([
                    'progress' => $progress,
                    'currentTask' => $task,
                    'completed' => false,
                    'error' => null,
                ]);
            });

            $basePath = dirname(explode('.phar', $_SERVER['DOCUMENT_URI'])[0] ?? '/');

            // Installation complete
            $this->updateStatus([
                'progress' => 100,
                'currentTask' => 'Installation complete',
                'completed' => true,
                'error' => null,
                'backendUrl' => $basePath . 'typo3/',
            ]);
        } catch (\Exception $e) {
            $this->updateStatus([
                'progress' => 0,
                'currentTask' => 'Failed',
                'completed' => false,
                'error' => [
                    'message' => $e->getMessage(),
                    'details' => $e->getTraceAsString(),
                ],
            ]);
        }
    }

    /**
     * @param array<string, mixed> $status
     */
    private function updateStatus(array $status): void
    {
        file_put_contents($this->statusFile, json_encode($status, JSON_THROW_ON_ERROR));
    }
}
