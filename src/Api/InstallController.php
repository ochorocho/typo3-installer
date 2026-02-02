<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
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

    /**
     * Stream installation progress via Server-Sent Events
     *
     * This endpoint provides real-time output streaming from installation commands
     */
    public function installStream(Request $request): StreamedResponse
    {
        $data = $this->parseJsonBody($request);

        if ($data instanceof JsonResponse) {
            // Convert error to SSE format
            return new StreamedResponse(function () use ($data): void {
                $this->sendSseEvent('error', [
                    'message' => 'Invalid request',
                    'details' => $data->getContent(),
                ]);
            }, 200, $this->getSseHeaders());
        }

        return new StreamedResponse(function () use ($data): void {
            // Disable output buffering for SSE streaming
            // This is critical for shared hosting environments
            @ini_set('output_buffering', 'off');
            @ini_set('zlib.output_compression', 'off');
            @ini_set('implicit_flush', '1');

            // Clear any existing output buffers
            while (ob_get_level() > 0) {
                ob_end_clean();
            }

            // Set unlimited execution time for installation
            set_time_limit(0);
            // Keep installation running even if SSE connection drops
            // (frontend can fall back to polling /api/status)
            ignore_user_abort(true);

            // Initial padding to break through proxy buffers immediately
            echo ': ' . str_repeat(' ', 8192) . "\n\n";
            flush();

            try {
                $config = InstallationConfig::fromArray($data);

                // Send initial event
                $this->sendSseEvent('start', [
                    'message' => 'Installation starting...',
                    'step' => 'init',
                ]);

                $currentStep = 'init';

                // Progress callback - sends step changes
                $progressCallback = function (int $progress, string $task) use (&$currentStep): void {
                    $step = $this->mapProgressToStep($progress);

                    // Send step change event if step changed
                    if ($step !== $currentStep) {
                        $this->sendSseEvent('step', [
                            'step' => $step,
                            'progress' => $progress,
                            'task' => $task,
                        ]);
                        $currentStep = $step;
                    }

                    // Also send progress event
                    $this->sendSseEvent('progress', [
                        'progress' => $progress,
                        'task' => $task,
                        'step' => $step,
                    ]);

                    // Update status file for compatibility
                    $this->updateStatus([
                        'progress' => $progress,
                        'currentTask' => $task,
                        'completed' => false,
                        'error' => null,
                    ]);
                };

                // Output callback - sends real-time command output
                $outputCallback = function (string $line) use (&$currentStep): void {
                    $this->sendSseEvent('output', [
                        'line' => $line,
                        'step' => $currentStep,
                    ]);
                };

                // Run installation with streaming callbacks
                $this->installer->install($config, $progressCallback, $outputCallback);

                $basePath = dirname(explode('.phar', $_SERVER['DOCUMENT_URI'])[0] ?? '/');

                // Send completion event
                $this->sendSseEvent('complete', [
                    'message' => 'Installation complete!',
                    'backendUrl' => $basePath . 'typo3/',
                ]);

                // Update status file
                $this->updateStatus([
                    'progress' => 100,
                    'currentTask' => 'Installation complete',
                    'completed' => true,
                    'error' => null,
                    'backendUrl' => $basePath . 'typo3/',
                ]);
            } catch (\Exception $e) {
                $this->sendSseEvent('error', [
                    'message' => $e->getMessage(),
                    'details' => $e->getTraceAsString(),
                ]);

                // Update status file
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
        }, 200, $this->getSseHeaders());
    }

    /**
     * Get SSE headers
     *
     * @return array<string, string>
     */
    private function getSseHeaders(): array
    {
        return [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-store',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',           // Disable nginx buffering
            'X-Content-Type-Options' => 'nosniff',  // Prevents content-type sniffing delays
        ];
    }

    /**
     * Send an SSE event
     *
     * @param array<string, mixed> $data
     */
    private function sendSseEvent(string $event, array $data): void
    {
        echo "event: {$event}\n";
        echo 'data: ' . json_encode($data, JSON_THROW_ON_ERROR) . "\n";
        // Padding to exceed proxy buffer thresholds (4KB+)
        echo ': ' . str_repeat(' ', 4096) . "\n";
        echo "\n";

        while (ob_get_level() > 0) {
            ob_end_flush();
        }
        flush();

        if ($event === 'complete' || $event === 'error') {
            usleep(100000); // 100ms delay for final events
        }
    }

    /**
     * Map progress percentage to step identifier
     */
    private function mapProgressToStep(int $progress): string
    {
        if ($progress >= 98) {
            return 'finalize';
        }
        if ($progress >= 90) {
            return 'cache';
        }
        if ($progress >= 50) {
            return 'setup';
        }
        if ($progress >= 20) {
            return 'composer';
        }
        if ($progress >= 15) {
            return 'init';
        }

        return 'prepare';
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
