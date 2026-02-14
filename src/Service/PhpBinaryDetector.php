<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\PhpExecutableFinder;
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
        // Standard Linux paths (php-cli first, as 'php' may be a CGI wrapper on cPanel)
        '/usr/bin/php-cli{major}.{minor}',
        '/usr/bin/php{major}.{minor}',
        '/usr/bin/php{major}{minor}',
        '/usr/local/bin/php-cli{major}.{minor}',
        '/usr/local/bin/php{major}.{minor}',
        '/usr/local/bin/php{major}{minor}',
        // Plesk
        '/opt/plesk/php/{major}.{minor}/bin/php',
        // cPanel/WHM (php-cli variant first)
        '/opt/cpanel/ea-php{major}{minor}/root/usr/bin/php-cli',
        '/opt/cpanel/ea-php{major}{minor}/root/usr/bin/php',
        // CloudLinux (alt-php, php-cli variant first)
        '/opt/alt/php{major}{minor}/usr/bin/php-cli',
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
     * 2-tier detection:
     * 1. Candidates — runtime paths + common paths + Symfony finder
     * 2. Brute-force scan — BINARY_PATHS templates across known PHP versions
     *
     * @return array{
     *     fpmVersion: string,
     *     cliBinary: ?string,
     *     cliVersion: ?string,
     *     mismatch: bool,
     *     availableVersions: array<array{path: string, version: string}>,
     *     detectionMethod: ?string
     * }
     */
    public function detect(?string $composerPath = null): array
    {
        $fpmVersion = $this->getFpmVersion();
        $candidates = $this->getCandidates();

        // Tier 1: Iterate candidates, find version-matching binary
        $firstValidBinary = null;
        $firstValidVersion = null;

        foreach ($candidates as $candidate) {
            $result = $this->validateBinaryWithDetails($candidate);
            if (!$result->valid || $result->version === null) {
                continue;
            }

            // Remember first valid binary as fallback
            if ($firstValidBinary === null) {
                $firstValidBinary = $candidate;
                $firstValidVersion = $result->version;
            }

            if (!$this->versionsMatch($fpmVersion, $result->version)) {
                continue;
            }

            // Optionally validate with Composer
            if ($composerPath !== null && !$this->validateWithComposer($candidate, $composerPath)) {
                continue;
            }

            return [
                'fpmVersion' => $fpmVersion,
                'cliBinary' => $candidate,
                'cliVersion' => $result->version,
                'mismatch' => false,
                'availableVersions' => [],
                'detectionMethod' => 'candidates',
            ];
        }

        // Tier 2: Brute-force scan across BINARY_PATHS templates
        $matchingBinary = $this->findMatchingBinary($fpmVersion);
        if ($matchingBinary !== null) {
            $matchingVersion = $this->validateBinary($matchingBinary);
            if ($matchingVersion !== null) {
                return [
                    'fpmVersion' => $fpmVersion,
                    'cliBinary' => $matchingBinary,
                    'cliVersion' => $matchingVersion,
                    'mismatch' => false,
                    'availableVersions' => [],
                    'detectionMethod' => 'scan',
                ];
            }
        }

        // Fallback: first valid candidate (any version) with mismatch flag
        $availableVersions = $this->getAvailableVersions($candidates);

        return [
            'fpmVersion' => $fpmVersion,
            'cliBinary' => $firstValidBinary,
            'cliVersion' => $firstValidVersion,
            'mismatch' => true,
            'availableVersions' => $availableVersions,
            'detectionMethod' => null,
        ];
    }

    /**
     * Get CLI binary candidates derived from runtime PHP constants
     *
     * Uses PHP_BINDIR, php_ini_loaded_file(), and PHP_BINARY to find
     * the CLI binary without scanning hardcoded path templates.
     *
     * @return array<string>
     */
    public function getRuntimeCandidates(): array
    {
        $candidates = [];
        $seen = [];

        $addCandidate = function (string $path) use (&$candidates, &$seen): void {
            if (!isset($seen[$path])) {
                $candidates[] = $path;
                $seen[$path] = true;
            }
        };

        // 1. PHP_BINDIR — most reliable on cPanel/shared hosting
        $binDir = $this->getPhpBinDir();
        if ($binDir !== '') {
            $addCandidate($binDir . '/php-cli');
            $addCandidate($binDir . '/php');
        }

        // 2. php_ini_loaded_file() — derive prefix from ini path
        //    e.g. /opt/cpanel/ea-php82/root/etc/php.ini → prefix /opt/cpanel/ea-php82/root
        $iniFile = $this->getPhpIniLoadedFile();
        if ($iniFile !== false && $iniFile !== '') {
            $etcPos = strpos($iniFile, '/etc/');
            if ($etcPos !== false) {
                $prefix = substr($iniFile, 0, $etcPos);
                $addCandidate($prefix . '/usr/bin/php-cli');
                $addCandidate($prefix . '/usr/bin/php');
            }
        }

        // 3. PHP_BINARY — current process binary's directory
        $phpBinary = $this->getPhpBinaryPath();
        if ($phpBinary !== '') {
            $binaryDir = dirname($phpBinary);
            $addCandidate($binaryDir . '/php-cli');
            $addCandidate($binaryDir . '/php');
        }

        return $candidates;
    }

    /**
     * Get all CLI binary candidates in priority order, deduplicated
     *
     * Merges runtime-derived paths (PHP_BINDIR, ini, PHP_BINARY) with
     * common hardcoded paths and Symfony PhpExecutableFinder results.
     *
     * @return array<string>
     */
    public function getCandidates(): array
    {
        $candidates = [];
        $seen = [];

        $addCandidate = function (string $path) use (&$candidates, &$seen): void {
            if (!isset($seen[$path])) {
                $candidates[] = $path;
                $seen[$path] = true;
            }
        };

        // 1. Runtime-derived paths (PHP_BINDIR, ini, PHP_BINARY)
        foreach ($this->getRuntimeCandidates() as $candidate) {
            $addCandidate($candidate);
        }

        // 2. Common hardcoded paths (php-cli first, as 'php' may be a CGI wrapper)
        foreach (['/usr/bin/php-cli', '/usr/local/bin/php-cli', 'php-cli', '/usr/bin/php', '/usr/local/bin/php', 'php'] as $path) {
            $addCandidate($path);
        }

        // 3. Symfony PhpExecutableFinder (checks PATH, env vars)
        $finder = new PhpExecutableFinder();
        $found = $finder->find(false);
        if ($found !== false) {
            $addCandidate($found);
        }

        return $candidates;
    }

    /**
     * Detect CLI binary from runtime constants
     *
     * Iterates runtime candidates, validates each, checks version match
     * against FPM, and optionally validates with Composer.
     */
    public function detectFromRuntime(?string $composerPath = null): ?string
    {
        $fpmVersion = $this->getFpmVersion();
        $candidates = $this->getRuntimeCandidates();

        foreach ($candidates as $candidate) {
            $result = $this->validateBinaryWithDetails($candidate);
            if (!$result->valid || $result->version === null) {
                continue;
            }

            if (!$this->versionsMatch($fpmVersion, $result->version)) {
                continue;
            }

            // Optionally validate with Composer
            if ($composerPath !== null && !$this->validateWithComposer($candidate, $composerPath)) {
                continue;
            }

            return $candidate;
        }

        return null;
    }

    /**
     * Validate a PHP binary by running a Composer command
     *
     * Runs `<php-cli> <composer.phar> show --self --no-ansi` to exercise
     * the full stack: CLI SAPI, PHAR loading, Composer bootstrap.
     */
    public function validateWithComposer(string $binaryPath, string $composerPath): bool
    {
        if (!@file_exists($composerPath)) {
            return false;
        }

        try {
            $process = new Process(
                [$binaryPath, $composerPath, 'show', '--self', '--no-ansi'],
                null,
                null,
                null,
                self::PROCESS_TIMEOUT_SECONDS
            );

            $process->run();

            return $process->isSuccessful();
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Get PHP_BINDIR value (protected for testability)
     */
    protected function getPhpBinDir(): string
    {
        return PHP_BINDIR;
    }

    /**
     * Get php_ini_loaded_file() value (protected for testability)
     */
    protected function getPhpIniLoadedFile(): string|false
    {
        return php_ini_loaded_file();
    }

    /**
     * Get PHP_BINARY value (protected for testability)
     */
    protected function getPhpBinaryPath(): string
    {
        return PHP_BINARY;
    }

    /**
     * Get the PHP version used by FPM (current web request)
     */
    public function getFpmVersion(): string
    {
        return PHP_VERSION;
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
     * @param array<string> $additionalCandidates Pre-checked candidate paths to include
     * @return array<array{path: string, version: string}>
     */
    public function getAvailableVersions(array $additionalCandidates = []): array
    {
        $versions = [];
        $seen = [];

        // Validate additional candidates first (e.g. from getCandidates())
        foreach ($additionalCandidates as $path) {
            if (isset($seen[$path])) {
                continue;
            }
            $version = $this->validateBinary($path);
            if ($version !== null) {
                $versions[] = [
                    'path' => $path,
                    'version' => $version,
                ];
            }
            $seen[$path] = true;
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
            $outsideOpenBasedir = !$this->isPathWithinOpenBasedir($path);

            if ($outsideOpenBasedir) {
                // Path is outside open_basedir: filesystem checks (file_exists,
                // is_executable, etc.) would fail, but proc_open() is NOT restricted
                // by open_basedir. Skip filesystem checks and fall through to
                // execution-based validation below.
                $resolvedPath = null;
            } else {
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
        )
        // Method 2: --version flag (works with most wrappers)
        ?? $this->tryVersionFlag($path, $debugMessages)
        // Method 3: php -i (last resort, parses phpinfo output)
        ?? $this->tryPhpInfo($path, $debugMessages);

        if ($version !== null) {
            // Check SAPI to detect wrapper scripts (e.g. cPanel CGI wrappers)
            $sapi = $this->detectSapi($path);
            if ($sapi !== null && $sapi !== 'cli') {
                return BinaryValidationResult::wrapperScript($path, $version, $sapi, $resolvedPath ?? null);
            }
            return BinaryValidationResult::success($version, $resolvedPath ?? null, $sapi);
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
     * Detect the SAPI type of a PHP binary
     *
     * Returns the SAPI name (e.g. 'cli', 'cgi-fcgi', 'fpm-fcgi') or null on failure.
     * Used to detect wrapper scripts that route through CGI/FPM instead of CLI.
     */
    private function detectSapi(string $path): ?string
    {
        try {
            $process = new Process(
                [$path, '-r', 'echo php_sapi_name();'],
                null,
                null,
                null,
                self::PROCESS_TIMEOUT_SECONDS
            );

            $process->run();

            if (!$process->isSuccessful()) {
                return null;
            }

            $output = trim($process->getOutput());

            // Strip CGI headers if present (e.g., "Content-type: text/html\r\n\r\ncgi-fcgi")
            if (preg_match('/^[A-Za-z][A-Za-z0-9-]*:\s/', $output)) {
                $pos = strpos($output, "\r\n\r\n");
                if ($pos !== false) {
                    $output = trim(substr($output, $pos + 4));
                } else {
                    $pos = strpos($output, "\n\n");
                    if ($pos !== false) {
                        $output = trim(substr($output, $pos + 2));
                    }
                }
            }

            if ($output !== '' && preg_match('/^[a-z][a-z0-9_-]*$/i', $output)) {
                return $output;
            }

            return null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Check if a path is accessible under open_basedir restrictions
     *
     * Returns true if no restriction is active or if the path is within allowed directories.
     */
    protected function isPathWithinOpenBasedir(string $path, ?string $openBasedir = null): bool
    {
        $openBasedir ??= ini_get('open_basedir');
        if ($openBasedir === '' || $openBasedir === false) {
            return true;
        }

        foreach (explode(PATH_SEPARATOR, $openBasedir) as $dir) {
            $dir = rtrim($dir, '/');
            if ($dir === '') {
                continue;
            }
            if (str_starts_with($path, $dir . '/') || $path === $dir) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if two PHP versions match (major.minor)
     */
    public function versionsMatch(string $version1, string $version2): bool
    {
        $parts1 = explode('.', $version1);
        $parts2 = explode('.', $version2);

        // Compare major and minor versions
        return $parts1[0] === $parts2[0]
            && ($parts1[1] ?? '0') === ($parts2[1] ?? '0');
    }
}
