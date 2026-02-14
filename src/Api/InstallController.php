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
        $this->statusFile = $statusFile ?? $this->getStatusFilePath();
    }

    /**
     * Get a deterministic status file path that all requests resolve to.
     *
     * On shared hosting, sys_get_temp_dir() may return different paths per request
     * (per-process isolation, open_basedir, etc.), so polling /api/status would
     * read from a different directory than the one the install process wrote to.
     * Using a path relative to the PHAR ensures consistency.
     */
    private function getStatusFilePath(): string
    {
        $pharPath = \Phar::running(false);
        if ($pharPath !== '') {
            return dirname($pharPath) . '/.typo3-installer-status.json';
        }

        return sys_get_temp_dir() . '/typo3-installer-status.json';
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

            // Register shutdown function to capture fatal errors (e.g. max_execution_time exceeded)
            $statusFile = $this->statusFile;
            register_shutdown_function(static function () use ($statusFile): void {
                $error = error_get_last();
                if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
                    $status = [
                        'progress' => 0,
                        'currentTask' => 'Failed',
                        'completed' => false,
                        'error' => [
                            'message' => 'PHP process terminated unexpectedly: ' . $error['message'],
                            'details' => sprintf('%s in %s on line %d', $error['message'], $error['file'], $error['line']),
                        ],
                    ];
                    file_put_contents($statusFile, json_encode($status, JSON_THROW_ON_ERROR));
                }
            });

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

                $backendUrl = $this->computeBackendUrl();

                // Send completion event
                $this->sendSseEvent('complete', [
                    'message' => 'Installation complete!',
                    'backendUrl' => $backendUrl,
                ]);

                // Update status file
                $this->updateStatus([
                    'progress' => 100,
                    'currentTask' => 'Installation complete',
                    'completed' => true,
                    'error' => null,
                    'backendUrl' => $backendUrl,
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
            'X-Accel-Buffering' => 'no',              // Disable nginx buffering
            'X-Content-Type-Options' => 'nosniff',     // Prevents content-type sniffing delays
            'X-LiteSpeed-Cache-Control' => 'no-cache', // Disable LiteSpeed buffering
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
        if ($progress >= 95) {
            return 'warmup';
        }
        if ($progress >= 90) {
            return 'cache';
        }
        if ($progress >= 85) {
            return 'extensions';
        }
        if ($progress >= 80) {
            return 'assets';
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

        // Clean up status file after completion or error to prevent stale data on next install
        if (($status['completed'] ?? false) === true || ($status['error'] ?? null) !== null) {
            @unlink($this->statusFile);
        }

        return new JsonResponse($status);
    }

    /**
     * Run the installation process (called after response is sent to client)
     */
    private function runInstallation(InstallationConfig $config): void
    {
        // Register shutdown function to capture fatal errors (e.g. max_execution_time exceeded)
        $statusFile = $this->statusFile;
        register_shutdown_function(static function () use ($statusFile): void {
            $error = error_get_last();
            if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
                $status = [
                    'progress' => 0,
                    'currentTask' => 'Failed',
                    'completed' => false,
                    'error' => [
                        'message' => 'PHP process terminated unexpectedly: ' . $error['message'],
                        'details' => sprintf('%s in %s on line %d', $error['message'], $error['file'], $error['line']),
                    ],
                ];
                file_put_contents($statusFile, json_encode($status, JSON_THROW_ON_ERROR));
            }
        });

        try {
            $this->installer->install($config, function (int $progress, string $task) {
                $this->updateStatus([
                    'progress' => $progress,
                    'currentTask' => $task,
                    'completed' => false,
                    'error' => null,
                ]);
            });

            $backendUrl = $this->computeBackendUrl();

            // Installation complete
            $this->updateStatus([
                'progress' => 100,
                'currentTask' => 'Installation complete',
                'completed' => true,
                'error' => null,
                'backendUrl' => $backendUrl,
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
     * Compute the TYPO3 backend URL based on the current request URI.
     *
     * Falls back through multiple $_SERVER variables since DOCUMENT_URI
     * is not available on all hosting environments (e.g. some LiteSpeed setups).
     */
    private function computeBackendUrl(): string
    {
        $documentUri = $_SERVER['DOCUMENT_URI'] ?? $_SERVER['SCRIPT_NAME'] ?? $_SERVER['PHP_SELF'] ?? null;
        $documentUri = is_string($documentUri) ? $documentUri : '/';
        $basePath = dirname(explode('.phar', $documentUri)[0]);
        if ($basePath === '.' || $basePath === '') {
            $basePath = '/';
        }

        return rtrim($basePath, '/') . '/typo3/';
    }

    /**
     * @param array<string, mixed> $status
     */
    private function updateStatus(array $status): void
    {
        file_put_contents($this->statusFile, json_encode($status, JSON_THROW_ON_ERROR));
    }
}
