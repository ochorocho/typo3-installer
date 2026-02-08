<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Service\PhpBinaryDetector;

/**
 * Controller for PHP version detection and validation
 */
class PhpDetectionController extends AbstractController
{
    private PhpBinaryDetector $detector;

    public function __construct(?PhpBinaryDetector $detector = null)
    {
        $this->detector = $detector ?? new PhpBinaryDetector();
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
     *   "availableVersions": [
     *     {"path": "/usr/bin/php8.3", "version": "8.3.0"},
     *     {"path": "/usr/bin/php8.2", "version": "8.2.15"}
     *   ]
     * }
     */
    public function detect(Request $request): JsonResponse
    {
        $result = $this->detector->detect();

        return $this->successResponse([
            'fpmVersion' => $result['fpmVersion'],
            'cliBinary' => $result['cliBinary'],
            'cliVersion' => $result['cliVersion'],
            'mismatch' => $result['mismatch'],
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
            ]);
        }

        // Check if it matches the FPM version
        $fpmVersion = $this->detector->getFpmVersion();
        $matchesFpm = $this->versionsMatch($fpmVersion, $result->version ?? '');

        return $this->successResponse([
            'valid' => true,
            'version' => $result->version,
            'matchesFpm' => $matchesFpm,
            'resolvedPath' => $result->resolvedPath,
        ]);
    }

    /**
     * Check if two PHP versions match (major.minor)
     */
    private function versionsMatch(string $version1, string $version2): bool
    {
        $parts1 = explode('.', $version1);
        $parts2 = explode('.', $version2);

        // Compare major and minor versions
        return $parts1[0] === $parts2[0]
            && ($parts1[1] ?? '0') === ($parts2[1] ?? '0');
    }
}
