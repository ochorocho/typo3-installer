<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Service\InstallationInfoService;
use TYPO3\Installer\Service\PhpBinaryDetector;

/**
 * Controller for PHP version detection and validation
 */
class PhpDetectionController extends AbstractController
{
    private PhpBinaryDetector $detector;
    private InstallationInfoService $installationInfo;

    public function __construct(
        ?PhpBinaryDetector $detector = null,
        ?InstallationInfoService $installationInfo = null
    ) {
        $this->detector = $detector ?? new PhpBinaryDetector();
        $this->installationInfo = $installationInfo ?? new InstallationInfoService();
    }

    /**
     * Detect PHP CLI binary matching FPM version
     *
     * POST /api/detect-php
     *
     * Response:
     * {
     *   "success": true,
     *   "fpmVersion": "8.3.0",
     *   "cliBinary": "/usr/bin/php8.3",
     *   "cliVersion": "8.3.0",
     *   "mismatch": false,
     *   "detectionMethod": "runtime",
     *   "availableVersions": [
     *     {"path": "/usr/bin/php8.3", "version": "8.3.0"},
     *     {"path": "/usr/bin/php8.2", "version": "8.2.15"}
     *   ]
     * }
     */
    public function detect(Request $request): JsonResponse
    {
        $composerPath = $this->resolveComposerPath();
        $result = $this->detector->detect($composerPath);

        return $this->successResponse([
            'fpmVersion' => $result['fpmVersion'],
            'cliBinary' => $result['cliBinary'],
            'cliVersion' => $result['cliVersion'],
            'mismatch' => $result['mismatch'],
            'detectionMethod' => $result['detectionMethod'],
            'availableVersions' => $result['availableVersions'],
        ]);
    }

    /**
     * Validate a user-provided PHP binary path
     *
     * POST /api/validate-php-binary
     *
     * Request:
     * {
     *   "binaryPath": "/usr/local/bin/php8.3"
     * }
     *
     * Response:
     * {
     *   "success": true,
     *   "valid": true,
     *   "version": "8.3.0",
     *   "matchesFpm": true
     * }
     */
    public function validate(Request $request): JsonResponse
    {
        $data = $this->parseJsonBody($request);

        if ($data instanceof JsonResponse) {
            return $data;
        }

        $binaryPath = $data['binaryPath'] ?? null;

        if (!is_string($binaryPath) || $binaryPath === '') {
            return $this->errorResponse('Binary path is required');
        }

        // Sanitize path - prevent command injection
        if (preg_match('/[;&|`$]/', $binaryPath)) {
            return $this->errorResponse('Invalid characters in binary path');
        }

        $result = $this->detector->validateBinaryWithDetails($binaryPath);

        if (!$result->valid) {
            return $this->successResponse([
                'valid' => false,
                'version' => null,
                'matchesFpm' => false,
                'error' => $result->error ?? 'Binary not found or is not a valid PHP executable',
                'errorCode' => $result->errorCode,
                'debugInfo' => $result->debugInfo,
                'resolvedPath' => $result->resolvedPath,
                'sapi' => $result->sapi,
            ]);
        }

        // Check if it matches the FPM version
        $fpmVersion = $this->detector->getFpmVersion();
        $matchesFpm = $this->detector->versionsMatch($fpmVersion, $result->version ?? '');

        return $this->successResponse([
            'valid' => true,
            'version' => $result->version,
            'matchesFpm' => $matchesFpm,
            'resolvedPath' => $result->resolvedPath,
            'sapi' => $result->sapi,
        ]);
    }

    /**
     * Resolve the composer.phar path if the file exists
     */
    private function resolveComposerPath(): ?string
    {
        $path = $this->installationInfo->getComposerPath();

        return @file_exists($path) ? $path : null;
    }
}
