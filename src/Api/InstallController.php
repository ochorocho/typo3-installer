<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use TYPO3\Installer\Service\Typo3Installer;
use TYPO3\Installer\Model\InstallationConfig;

/**
 * Controller for TYPO3 installation
 */
class InstallController
{
    private Typo3Installer $installer;
    private string $statusFile;

    public function __construct()
    {
        $this->installer = new Typo3Installer();
        $this->statusFile = sys_get_temp_dir() . '/typo3-installer-status.json';
    }

    public function install(Request $request): JsonResponse
    {
        $content = $request->getContent();
        /** @var array<string, mixed>|null $data */
        $data = json_decode($content !== '' ? $content : '{}', true);

        if (!is_array($data)) {
            return new JsonResponse([
                'error' => true,
                'message' => 'Invalid request data'
            ], 400);
        }

        try {
            $config = InstallationConfig::fromArray($data);

            // Start installation in background
            $this->startInstallation($config);

            return new JsonResponse([
                'success' => true,
                'message' => 'Installation started'
            ]);
        } catch (\Exception $e) {
            return new JsonResponse([
                'error' => true,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function getStatus(Request $request): JsonResponse
    {
        if (!file_exists($this->statusFile)) {
            return new JsonResponse([
                'progress' => 0,
                'currentTask' => 'Initializing...',
                'completed' => false,
                'error' => null
            ]);
        }

        $fileContent = file_get_contents($this->statusFile);
        /** @var array<string, mixed> $status */
        $status = json_decode($fileContent !== false ? $fileContent : '{}', true);

        return new JsonResponse($status);
    }

    private function startInstallation(InstallationConfig $config): void
    {
        // Initialize status
        $this->updateStatus([
            'progress' => 0,
            'currentTask' => 'Starting installation...',
            'completed' => false,
            'error' => null
        ]);

        // In a real-world scenario, this would be done via a background job/process
        // For simplicity, we'll do it synchronously but update status as we go
        try {
            $this->installer->install($config, function (int $progress, string $task) {
                $this->updateStatus([
                    'progress' => $progress,
                    'currentTask' => $task,
                    'completed' => false,
                    'error' => null
                ]);
            });

            // Installation complete
            $this->updateStatus([
                'progress' => 100,
                'currentTask' => 'Installation complete',
                'completed' => true,
                'error' => null,
                'backendUrl' => '/typo3-test-installation/typo3'
            ]);
        } catch (\Exception $e) {
            $this->updateStatus([
                'progress' => 0,
                'currentTask' => 'Failed',
                'completed' => false,
                'error' => [
                    'message' => $e->getMessage(),
                    'details' => $e->getTraceAsString()
                ]
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
