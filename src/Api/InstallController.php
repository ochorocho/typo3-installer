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
    private string $logFile;

    public function __construct(
        ?Typo3Installer $installer = null,
        ?string $statusFile = null,
        ?string $logFile = null
    ) {
        $this->installer = $installer ?? new Typo3Installer();
        $this->statusFile = $statusFile ?? $this->getStatusFilePath();
        $this->logFile = $logFile ?? $this->getLogFilePath();
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

    /**
     * Log file path where the install writes line-by-line subprocess output.
     * `installStream` tails this file to emit 'output' SSE events without
     * having to run the install in the same request.
     */
    private function getLogFilePath(): string
    {
        $pharPath = \Phar::running(false);
        if ($pharPath !== '') {
            return dirname($pharPath) . '/.typo3-installer-log.txt';
        }

        return sys_get_temp_dir() . '/typo3-installer-log.txt';
    }

    public function install(Request $request): JsonResponse
    {
        $data = $this->parseJsonBody($request);

        if ($data instanceof JsonResponse) {
            return $data;
        }

        try {
            $config = InstallationConfig::fromArray($data);

            // Reset the log file so stale output from a previous install doesn't
            // leak into the SSE stream. Status file is overwritten a line below.
            @file_put_contents($this->logFile, '');

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
     * Stream installation progress via Server-Sent Events.
     *
     * Pure observer: does NOT run the install itself. The frontend is expected
     * to POST to /api/install first (which starts the install in the background
     * via `fastcgi_finish_request`) and then open this endpoint for live output.
     *
     * Why the split? On some shared hosts (observed on Manitu/Plesk) the
     * reverse proxy closes long-lived SSE responses after ~99 s regardless of
     * activity, and the streaming PHP request gets killed too — taking the
     * install down with it. By running the install in a separate, detached
     * FPM request, it survives even when the observer stream is dropped, and
     * the frontend's polling fallback can still report completion.
     */
    public function installStream(Request $request): StreamedResponse
    {
        return new StreamedResponse(function (): void {
            // Disable output buffering for SSE streaming
            // This is critical for shared hosting environments
            @ini_set('output_buffering', 'off');
            @ini_set('zlib.output_compression', 'off');
            @ini_set('implicit_flush', '1');

            while (ob_get_level() > 0) {
                ob_end_clean();
            }

            set_time_limit(0);
            ignore_user_abort(true);

            // Initial padding to break through proxy buffers immediately
            echo ': ' . str_repeat(' ', 8192) . "\n\n";
            flush();

            $this->streamObservedInstall();
        }, 200, $this->getSseHeaders());
    }

    /**
     * Tail the log + status files written by the background install, emitting
     * SSE `start`/`step`/`progress`/`output`/`complete`/`error` events until
     * the install finishes, errors out, or the client disconnects.
     *
     * Idempotent over status-file disappearance: if the frontend's polling
     * fallback (/api/status) races ahead and auto-unlinks the status file on
     * completion, we still emit `complete` from whatever we read last.
     */
    private function streamObservedInstall(): void
    {
        $maxWaitSeconds = 600;   // Safety cap — longest observed install is ~3 min.
        $pollIntervalUs = 300_000; // 300 ms
        $startupGraceSec = 10;   // How long to tolerate a missing status file at start.

        $deadline = microtime(true) + $maxWaitSeconds;
        $startedAt = microtime(true);

        $currentStep = 'init';
        $lastProgress = -1;
        $lastLogOffset = 0;
        $startSent = false;

        while (microtime(true) < $deadline) {
            $this->drainLogFile($lastLogOffset, $currentStep);

            $status = $this->readStatus();
            if ($status === null) {
                // Background install hasn't written the first status yet — wait briefly.
                if (!$startSent && microtime(true) - $startedAt < $startupGraceSec) {
                    usleep($pollIntervalUs);
                    continue;
                }
                // No install appears to be running. Bail with a clear error.
                $this->sendSseEvent('error', [
                    'message' => 'No installation in progress',
                    'details' => 'Call POST /api/install before opening the install-stream.',
                ]);
                return;
            }

            if (!$startSent) {
                $this->sendSseEvent('start', [
                    'message' => 'Installation starting...',
                    'step' => 'init',
                ]);
                $startSent = true;
            }

            $progressRaw = $status['progress'] ?? 0;
            $progress = is_int($progressRaw) ? $progressRaw : (int)(is_string($progressRaw) ? $progressRaw : 0);
            $taskRaw = $status['currentTask'] ?? '';
            $task = is_string($taskRaw) ? $taskRaw : '';
            $step = $this->mapProgressToStep($progress);

            if ($step !== $currentStep) {
                $this->sendSseEvent('step', [
                    'step' => $step,
                    'progress' => $progress,
                    'task' => $task,
                ]);
                $currentStep = $step;
            }

            if ($progress !== $lastProgress) {
                $this->sendSseEvent('progress', [
                    'progress' => $progress,
                    'task' => $task,
                    'step' => $step,
                ]);
                $lastProgress = $progress;
            }

            if (($status['error'] ?? null) !== null) {
                // Flush any tail output before the error event.
                $this->drainLogFile($lastLogOffset, $currentStep);
                /** @var array{message?: string, details?: string} $err */
                $err = $status['error'];
                $this->sendSseEvent('error', [
                    'message' => (string)($err['message'] ?? 'Installation failed'),
                    'details' => (string)($err['details'] ?? ''),
                ]);
                return;
            }

            if (($status['completed'] ?? false) === true) {
                // Flush any tail output before the complete event.
                $this->drainLogFile($lastLogOffset, $currentStep);
                $backendUrlRaw = $status['backendUrl'] ?? '';
                $this->sendSseEvent('complete', [
                    'message' => 'Installation complete!',
                    'backendUrl' => is_string($backendUrlRaw) ? $backendUrlRaw : '',
                ]);
                return;
            }

            usleep($pollIntervalUs);
        }

        $this->sendSseEvent('error', [
            'message' => 'Installation observer timed out',
            'details' => sprintf('No completion after %ds; client should poll /api/status.', $maxWaitSeconds),
        ]);
    }

    /**
     * Read new lines appended to the log file since $offset (which is updated
     * by reference). Emits an `output` SSE event per non-empty line.
     */
    private function drainLogFile(int &$offset, string $currentStep): void
    {
        if (!file_exists($this->logFile)) {
            return;
        }
        clearstatcache(false, $this->logFile);
        $size = @filesize($this->logFile);
        if ($size === false || $size <= $offset) {
            return;
        }

        $fh = @fopen($this->logFile, 'rb');
        if ($fh === false) {
            return;
        }
        if (fseek($fh, $offset) !== 0) {
            fclose($fh);
            return;
        }
        $length = $size - $offset;
        if ($length < 1) {
            fclose($fh);
            return;
        }
        $chunk = @fread($fh, $length);
        fclose($fh);

        if ($chunk === false || $chunk === '') {
            return;
        }
        $offset = $size;

        foreach (explode("\n", rtrim($chunk, "\n")) as $line) {
            if ($line === '') {
                continue;
            }
            $this->sendSseEvent('output', [
                'line' => $line,
                'step' => $currentStep,
            ]);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function readStatus(): ?array
    {
        if (!file_exists($this->statusFile)) {
            return null;
        }
        $raw = @file_get_contents($this->statusFile);
        if ($raw === false || $raw === '') {
            return null;
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }
        /** @var array<string, mixed> $decoded */
        return $decoded;
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

        // Do NOT auto-unlink on completion/error. The SSE observer
        // (installStream) may still be polling in parallel with the client's
        // fallback polling; unlinking here caused the observer to fall into
        // its "no install in progress" branch and emit a spurious onError
        // that overwrote a legitimate onComplete. The file is reset at the
        // start of the next install via updateStatus() anyway, so leftover
        // completed state doesn't leak into a fresh run.

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

        $logFile = $this->logFile;
        $outputCallback = static function (string $line) use ($logFile): void {
            // Append raw line; installStream tails this file and emits SSE events.
            @file_put_contents($logFile, $line . "\n", FILE_APPEND | LOCK_EX);
        };

        try {
            $this->installer->install(
                $config,
                function (int $progress, string $task): void {
                    $this->updateStatus([
                        'progress' => $progress,
                        'currentTask' => $task,
                        'completed' => false,
                        'error' => null,
                    ]);
                },
                $outputCallback
            );

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
