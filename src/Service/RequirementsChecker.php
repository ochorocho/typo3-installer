<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use TYPO3\Installer\Utility\ByteConverter;

/**
 * Service for checking TYPO3 system requirements
 */
class RequirementsChecker
{
    private const REQUIRED_PHP_VERSION = '8.2.0';

    // @todo: Get required extensions dynamically
    private const REQUIRED_EXTENSIONS = [
        'pdo',
        'json',
        'fileinfo',
        'filter',
        'gd',
        'hash',
        'intl',
        'mbstring',
        'openssl',
        'session',
        'xml',
        'zip',
    ];

    // @todo: get dynamically
    private const RECOMMENDED_EXTENSIONS = [
        'curl',
        'zlib',
        'opcache',
    ];

    /**
     * Check all system requirements
     *
     * @return array<int, array<string, mixed>>
     */
    public function check(string $installPath = 'typo3-test-install'): array
    {
        $requirements = [];

        // Check PHP version
        $requirements[] = $this->checkPhpVersion();

        // Check required extensions
        foreach (self::REQUIRED_EXTENSIONS as $extension) {
            $requirements[] = $this->checkExtension($extension, true);
        }

        // Check recommended extensions
        foreach (self::RECOMMENDED_EXTENSIONS as $extension) {
            $requirements[] = $this->checkExtension($extension, false);
        }

        // Check file permissions
        $requirements[] = $this->checkFilePermissions($installPath);

        // Check memory limit
        $requirements[] = $this->checkMemoryLimit();

        return $requirements;
    }

    /**
     * @return array<string, mixed>
     */
    private function checkPhpVersion(): array
    {
        $currentVersion = PHP_VERSION;
        $passed = version_compare($currentVersion, self::REQUIRED_PHP_VERSION, '>=');

        return [
            'title' => 'PHP Version',
            'description' => sprintf(
                'Required: %s or higher (Current: %s)',
                self::REQUIRED_PHP_VERSION,
                $currentVersion
            ),
            'status' => $passed ? 'passed' : 'failed',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function checkExtension(string $extension, bool $required): array
    {
        $loaded = extension_loaded($extension);

        return [
            'title' => sprintf('PHP Extension: %s', $extension),
            'description' => $required ? 'Required extension' : 'Recommended extension',
            'status' => $loaded ? 'passed' : ($required ? 'failed' : 'warning'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function checkFilePermissions(string $installPath): array
    {
        // If it's a relative path, make it absolute from the project root
        if (!str_starts_with($installPath, '/')) {
            // When running from PHAR, use the actual filesystem path, not phar:// path
            $pharPath = \Phar::running(false);
            if ($pharPath) {
                // Get the directory where the PHAR is located
                $projectRoot = dirname($pharPath);
            } else {
                // Running in development mode
                $projectRoot = dirname(__DIR__, 2);
            }
            $targetDir = $projectRoot . '/' . $installPath;
        } else {
            $targetDir = $installPath;
        }

        if (!file_exists($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }

        $writable = is_writable($targetDir);

        return [
            'title' => 'File Permissions',
            'description' => sprintf(
                'Installation directory must be writable (%s)',
                $targetDir
            ),
            'status' => $writable ? 'passed' : 'failed',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function checkMemoryLimit(): array
    {
        $memoryLimitStr = (string)(ini_get('memory_limit') ?: '128M');
        $memoryLimitBytes = ByteConverter::toBytes($memoryLimitStr);
        $recommendedBytes = 256 * 1024 * 1024; // 256M

        $passed = $memoryLimitBytes === -1 || $memoryLimitBytes >= $recommendedBytes;

        return [
            'title' => 'Memory Limit',
            'description' => sprintf(
                'Recommended: 256M or higher (Current: %s)',
                $memoryLimitStr
            ),
            'status' => $passed ? 'passed' : 'warning',
        ];
    }
}
