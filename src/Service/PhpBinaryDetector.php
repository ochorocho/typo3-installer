<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;
use TYPO3\Installer\Model\BinaryValidationResult;

/**
 * Service to detect PHP CLI binaries matching the FPM version
 *
 * On shared hosting with multiple PHP versions (e.g., ISPConfig, Plesk, cPanel):
 * - PHP-FPM uses version X for web requests
 * - CLI `php` command may default to a different version
 * - TYPO3 CLI commands need to use the matching PHP version
 */
class PhpBinaryDetector
{
    /**
     * Common paths where PHP binaries are installed on various hosting panels
     * Placeholders: {major} = major version (e.g., 8), {minor} = minor version (e.g., 3)
     *
     * @var array<string>
     */
    private const BINARY_PATHS = [
        // Standard Linux paths
        '/usr/bin/php{major}.{minor}',
        '/usr/bin/php{major}{minor}',
        '/usr/local/bin/php{major}.{minor}',
        '/usr/local/bin/php{major}{minor}',
        // Plesk
        '/opt/plesk/php/{major}.{minor}/bin/php',
        // cPanel/WHM
        '/opt/cpanel/ea-php{major}{minor}/root/usr/bin/php',
        // CloudLinux (alt-php)
        '/opt/alt/php{major}{minor}/usr/bin/php',
        // Remi repository
        '/opt/remi/php{major}{minor}/root/usr/bin/php',
        // Generic local installations
        '/usr/local/php{major}{minor}/bin/php',
        '/usr/local/php{major}.{minor}/bin/php',
        '/usr/local/php/{major}.{minor}/bin/php',
        // ISPConfig
        '/usr/local/ispconfig/server/php-cli/{major}.{minor}/bin/php',
        // DirectAdmin
        '/usr/local/directadmin/custombuild/php{major}{minor}/bin/php',
        // Homebrew (macOS)
        '/opt/homebrew/opt/php@{major}.{minor}/bin/php',
        '/usr/local/opt/php@{major}.{minor}/bin/php',
    ];

    /**
     * PHP versions to scan for (major.minor)
     *
     * @var array<string>
     */
    private const PHP_VERSIONS = [
        '8.4',
        '8.3',
        '8.2',
        '8.1',
        '8.0',
        '7.4',
    ];

    /**
     * Process timeout for PHP version detection in seconds
     */
    private const PROCESS_TIMEOUT_SECONDS = 5;

    /**
     * Detect PHP CLI binary matching the FPM version
     *
     * @return array{
     *     fpmVersion: string,
     *     cliBinary: ?string,
     *     cliVersion: ?string,
     *     mismatch: bool,
     *     availableVersions: array<array{path: string, version: string}>
     * }
     */
    public function detect(): array
    {
        $fpmVersion = $this->getFpmVersion();
        $defaultCliBinary = $this->getDefaultCliBinary();
        $defaultCliVersion = $defaultCliBinary !== null ? $this->validateBinary($defaultCliBinary) : null;

        // Check if default CLI matches FPM version
        $versionMatch = $defaultCliVersion !== null && $this->versionsMatch($fpmVersion, $defaultCliVersion);

        // If versions match, no need to scan for alternatives
        if ($versionMatch) {
            return [
                'fpmVersion' => $fpmVersion,
                'cliBinary' => $defaultCliBinary,
                'cliVersion' => $defaultCliVersion,
                'mismatch' => false,
                'availableVersions' => [],
            ];
        }

        // Versions don't match - try to find a matching binary
        $matchingBinary = $this->findMatchingBinary($fpmVersion);
        $matchingVersion = $matchingBinary !== null ? $this->validateBinary($matchingBinary) : null;

        // Get all available versions for user selection
        $availableVersions = $this->getAvailableVersions();

        return [
            'fpmVersion' => $fpmVersion,
            'cliBinary' => $matchingBinary ?? $defaultCliBinary,
            'cliVersion' => $matchingVersion ?? $defaultCliVersion,
            'mismatch' => $matchingBinary === null,
            'availableVersions' => $availableVersions,
        ];
    }

    /**
     * Get the PHP version used by FPM (current web request)
     */
    public function getFpmVersion(): string
    {
        return PHP_VERSION;
    }

    /**
     * Get the default CLI binary path
     */
    public function getDefaultCliBinary(): ?string
    {
        // Try to find the default 'php' binary
        $paths = ['/usr/bin/php', '/usr/local/bin/php', 'php'];

        foreach ($paths as $path) {
            if ($this->validateBinary($path) !== null) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Find a PHP binary matching the target version
     */
    public function findMatchingBinary(string $targetVersion): ?string
    {
        $parts = explode('.', $targetVersion);
        $major = $parts[0];
        $minor = $parts[1] ?? '2';

        foreach (self::BINARY_PATHS as $template) {
            $path = str_replace(
                ['{major}', '{minor}'],
                [$major, $minor],
                $template
            );

            $version = $this->validateBinary($path);
            if ($version !== null && $this->versionsMatch($targetVersion, $version)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Get all available PHP versions on the system
     *
     * @return array<array{path: string, version: string}>
     */
    public function getAvailableVersions(): array
    {
        $versions = [];
        $seen = [];

        // Check default php first
        $defaultCliVersion = null;
        $defaultPath = $this->getDefaultCliBinary();
        if ($defaultPath !== null) {
            $defaultCliVersion = $this->validateBinary($defaultPath);
            if ($defaultCliVersion !== null) {
                $versions[] = [
                    'path' => $defaultPath,
                    'version' => $defaultCliVersion,
                ];
                $seen[$defaultPath] = true;
            }
        }

        // Scan all known paths for each supported PHP version
        foreach (self::PHP_VERSIONS as $phpVersion) {
            $parts = explode('.', $phpVersion);
            $major = $parts[0];
            $minor = $parts[1];

            foreach (self::BINARY_PATHS as $template) {
                $path = str_replace(
                    ['{major}', '{minor}'],
                    [$major, $minor],
                    $template
                );

                // Skip if already seen
                if (isset($seen[$path])) {
                    continue;
                }

                $version = $this->validateBinary($path);
                if ($version !== null) {
                    $versions[] = [
                        'path' => $path,
                        'version' => $version,
                    ];
                    $seen[$path] = true;
                }
            }
        }

        // Sort by version (descending)
        usort($versions, function (array $a, array $b): int {
            return version_compare($b['version'], $a['version']);
        });

        return $versions;
    }

    /**
     * Validate a PHP binary and return its version
     *
     * @return ?string PHP version or null if invalid
     */
    public function validateBinary(string $path): ?string
    {
        $result = $this->validateBinaryWithDetails($path);
        return $result->valid ? $result->version : null;
    }

    /**
     * Validate a PHP binary with detailed error information
     *
     * Uses multiple validation methods to support various binary types:
     * - Direct PHP binaries
     * - Shell script wrappers
     * - Symlinks
     */
    public function validateBinaryWithDetails(string $path): BinaryValidationResult
    {
        // For absolute paths, check existence and permissions
        if (str_starts_with($path, '/')) {
            // Check if path exists at all (file, symlink, or directory)
            if (!@file_exists($path) && !@is_link($path)) {
                return BinaryValidationResult::notFound($path);
            }

            // Check for broken symlink
            if (@is_link($path)) {
                $target = @readlink($path);
                if ($target === false || !@file_exists($path)) {
                    return BinaryValidationResult::symlinkBroken($path, $target ?: 'unknown');
                }
            }

            // Resolve symlinks for debugging
            $resolvedPath = @realpath($path);
            if ($resolvedPath === false) {
                $resolvedPath = $path;
            }

            // Check if file is executable
            if (!@is_executable($path)) {
                return BinaryValidationResult::notExecutable($path, $resolvedPath !== $path ? $resolvedPath : null);
            }
        } else {
            $resolvedPath = null;
        }

        // Try multiple validation methods
        $debugMessages = [];

        // Method 1: Inline PHP code (fastest, but may fail with some wrappers)
        $version = $this->tryValidationMethod(
            $path,
            ['-r', 'echo PHP_VERSION;'],
            $debugMessages,
            'inline'
        );
        if ($version !== null) {
            return BinaryValidationResult::success($version, $resolvedPath ?? null);
        }

        // Method 2: --version flag (works with most wrappers)
        $version = $this->tryVersionFlag($path, $debugMessages);
        if ($version !== null) {
            return BinaryValidationResult::success($version, $resolvedPath ?? null);
        }

        // Method 3: php -i (last resort, parses phpinfo output)
        $version = $this->tryPhpInfo($path, $debugMessages);
        if ($version !== null) {
            return BinaryValidationResult::success($version, $resolvedPath ?? null);
        }

        // All methods failed - determine the best error to return
        $debugInfo = implode('; ', $debugMessages);

        // Check if there was a timeout
        if (str_contains($debugInfo, 'timed out')) {
            return BinaryValidationResult::timeout(
                $path,
                self::PROCESS_TIMEOUT_SECONDS,
                $resolvedPath ?? null
            );
        }

        // Check if execution failed vs invalid output
        if (str_contains($debugInfo, 'Exit code')) {
            return BinaryValidationResult::executionFailed($path, $debugInfo, $resolvedPath ?? null);
        }

        return BinaryValidationResult::invalidOutput($path, $debugInfo, $resolvedPath ?? null);
    }

    /**
     * Try validation with inline PHP code
     *
     * @param array<string> $args
     * @param array<string> $debugMessages
     */
    private function tryValidationMethod(string $path, array $args, array &$debugMessages, string $methodName): ?string
    {
        try {
            $process = new Process(
                array_merge([$path], $args),
                null,
                null,
                null,
                self::PROCESS_TIMEOUT_SECONDS
            );

            $process->run();

            if (!$process->isSuccessful()) {
                $debugMessages[] = sprintf(
                    'Method %s: Exit code %d',
                    $methodName,
                    $process->getExitCode()
                );
                return null;
            }

            $output = trim($process->getOutput());

            // Validate version format
            if (preg_match('/^\d+\.\d+\.\d+/', $output)) {
                return $output;
            }

            $debugMessages[] = sprintf('Method %s: Invalid output format', $methodName);
            return null;
        } catch (ProcessTimedOutException $e) {
            $debugMessages[] = sprintf('Method %s: Process timed out', $methodName);
            return null;
        } catch (\Throwable $e) {
            $debugMessages[] = sprintf('Method %s: %s', $methodName, $e->getMessage());
            return null;
        }
    }

    /**
     * Try validation using --version flag
     *
     * @param array<string> $debugMessages
     */
    private function tryVersionFlag(string $path, array &$debugMessages): ?string
    {
        try {
            $process = new Process(
                [$path, '--version'],
                null,
                null,
                null,
                self::PROCESS_TIMEOUT_SECONDS
            );

            $process->run();

            if (!$process->isSuccessful()) {
                $debugMessages[] = sprintf('Method version: Exit code %d', $process->getExitCode());
                return null;
            }

            $output = $process->getOutput();

            // Parse "PHP 8.3.0 (cli)" format
            if (preg_match('/PHP\s+(\d+\.\d+\.\d+)/', $output, $matches)) {
                return $matches[1];
            }

            $debugMessages[] = 'Method version: Could not parse version from output';
            return null;
        } catch (ProcessTimedOutException $e) {
            $debugMessages[] = 'Method version: Process timed out';
            return null;
        } catch (\Throwable $e) {
            $debugMessages[] = sprintf('Method version: %s', $e->getMessage());
            return null;
        }
    }

    /**
     * Try validation using php -i (phpinfo)
     *
     * @param array<string> $debugMessages
     */
    private function tryPhpInfo(string $path, array &$debugMessages): ?string
    {
        try {
            $process = new Process(
                [$path, '-i'],
                null,
                null,
                null,
                self::PROCESS_TIMEOUT_SECONDS
            );

            $process->run();

            if (!$process->isSuccessful()) {
                $debugMessages[] = sprintf('Method phpinfo: Exit code %d', $process->getExitCode());
                return null;
            }

            $output = $process->getOutput();

            // Parse "PHP Version => 8.3.0" format
            if (preg_match('/PHP Version\s*=>\s*(\d+\.\d+\.\d+)/', $output, $matches)) {
                return $matches[1];
            }

            $debugMessages[] = 'Method phpinfo: Could not parse version from output';
            return null;
        } catch (ProcessTimedOutException $e) {
            $debugMessages[] = 'Method phpinfo: Process timed out';
            return null;
        } catch (\Throwable $e) {
            $debugMessages[] = sprintf('Method phpinfo: %s', $e->getMessage());
            return null;
        }
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
