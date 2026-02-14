<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Process\Process;
use TYPO3\Installer\Model\InstallationConfig;

/**
 * Main service for installing TYPO3
 */
class Typo3Installer
{
    /**
     * Default file permissions for created directories
     */
    private const DEFAULT_DIR_PERMISSIONS = 0755;

    /**
     * Process timeout for CLI commands in seconds
     */
    private const PROCESS_TIMEOUT_SECONDS = 300;

    /**
     * Maximum length for database/admin input values
     */
    private const MAX_INPUT_LENGTH = 255;

    /**
     * Error substring Composer outputs when run under a non-CLI SAPI
     */
    private const COMPOSER_SAPI_ERROR = 'non-CLI SAPIs';

    /**
     * Warning substring Composer outputs when invoked via CGI SAPI
     */
    private const COMPOSER_SAPI_WARNING = 'Composer should be invoked via the CLI';

    private Filesystem $filesystem;
    private InstallationInfoService $infoService;

    /**
     * Cached result of CGI SAPI detection (null = not yet checked)
     */
    private ?bool $isCgiBinary = null;

    public function __construct()
    {
        $this->filesystem = new Filesystem();
        $this->infoService = new InstallationInfoService();
    }

    /**
     * Get the path to the shipped composer.phar
     *
     * When running from a PHAR, the composer.phar must be extracted to a
     * temporary location because PHP cannot execute a PHAR inside another PHAR.
     */
    private function getComposerPath(): string
    {
        // When running from PHAR, extract composer.phar to temp directory
        if (\Phar::running()) {
            $tempComposerPath = sys_get_temp_dir() . '/typo3-installer-composer.phar';

            // Extract only if not already extracted or if installer PHAR is newer
            $pharPath = \Phar::running(false);
            $needsExtraction = !file_exists($tempComposerPath)
                || filemtime($pharPath) > filemtime($tempComposerPath);

            if ($needsExtraction) {
                $sourceComposerPath = \Phar::running() . '/resources/composer.phar';

                if (!file_exists($sourceComposerPath)) {
                    throw new \RuntimeException(
                        sprintf('Composer PHAR not found in installer at: %s', $sourceComposerPath)
                    );
                }

                $content = file_get_contents($sourceComposerPath);
                if ($content === false) {
                    throw new \RuntimeException('Failed to read embedded composer.phar');
                }

                if (file_put_contents($tempComposerPath, $content) === false) {
                    throw new \RuntimeException(
                        sprintf('Failed to extract composer.phar to: %s', $tempComposerPath)
                    );
                }

                chmod($tempComposerPath, 0755);
            }

            return $tempComposerPath;
        }

        // Development mode
        return dirname(__DIR__, 2) . '/resources/composer.phar';
    }

    /**
     * Run a Composer command using the shipped composer.phar
     *
     * @param array<string> $arguments
     * @param callable(string): void|null $outputCallback Called with each output line
     */
    private function runComposerCommand(
        array $arguments,
        string $installDir,
        ?string $phpBinary = null,
        ?callable $outputCallback = null
    ): void {
        $php = $phpBinary ?? 'php';
        $composerPath = $this->getComposerPath();

        if (!file_exists($composerPath)) {
            throw new \RuntimeException(
                sprintf('Composer PHAR not found at: %s', $composerPath)
            );
        }

        // CGI mode: use wrapper script to bypass Composer's SAPI check
        if ($this->isCgiBinary === true) {
            $env = [
                'COMPOSER_HOME' => sys_get_temp_dir() . '/composer',
                'COMPOSER' => $installDir . '/composer.json',
            ];
            $this->runViaCgiWrapper(
                $php,
                $composerPath,
                [$composerPath, ...$arguments],
                $installDir,
                $env,
                $outputCallback
            );
            return;
        }

        $process = new Process(
            array_merge([$php, $composerPath], $arguments),
            $installDir,
            [
                'COMPOSER_HOME' => sys_get_temp_dir() . '/composer',
                'COMPOSER' => $installDir . '/composer.json',
            ],
            null,
            self::PROCESS_TIMEOUT_SECONDS
        );

        // Run with real-time output streaming, filtering Composer SAPI warning
        $process->run(function (string $type, string $buffer) use ($outputCallback): void {
            if ($outputCallback !== null) {
                // Split buffer into lines and send each line
                $lines = explode("\n", $buffer);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line !== '' && !str_contains($line, self::COMPOSER_SAPI_WARNING)) {
                        $outputCallback($line);
                    }
                }
            }
        });

        if (!$process->isSuccessful()) {
            $errorOutput = $process->getErrorOutput();
            $standardOutput = $process->getOutput();
            $combinedOutput = trim($errorOutput . "\n" . $standardOutput);

            // Safety net: if Composer failed due to non-CLI SAPI, retry via CGI wrapper
            if (str_contains($combinedOutput, self::COMPOSER_SAPI_ERROR)) {
                $this->isCgiBinary = true;
                if ($outputCallback !== null) {
                    $outputCallback('[INFO] Composer rejected non-CLI SAPI — retrying via CGI wrapper');
                }
                $env = [
                    'COMPOSER_HOME' => sys_get_temp_dir() . '/composer',
                    'COMPOSER' => $installDir . '/composer.json',
                ];
                $this->runViaCgiWrapper(
                    $php,
                    $composerPath,
                    [$composerPath, ...$arguments],
                    $installDir,
                    $env,
                    $outputCallback
                );
                return;
            }

            throw new \RuntimeException(
                sprintf('Composer command failed: %s', $combinedOutput ?: 'Unknown error')
            );
        }
    }

    /**
     * Get the absolute installation directory path
     *
     * Uses InstallationInfoService to compute paths:
     * - When running from PHAR: installs to parent directory of PHAR location
     * - In development: uses configured installPath relative to project root
     */
    private function getInstallDir(InstallationConfig $config): string
    {
        // Use the InstallationInfoService to get the correct install directory
        // This is the parent of the PHAR directory (project root)
        return $this->infoService->getInstallDirectory();
    }

    /**
     * Detect the web server type from SERVER_SOFTWARE
     *
     * @return string One of: apache, iis, other
     */
    private function detectServerType(): string
    {
        $serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? null;
        $serverSoftware = is_string($serverSoftware) ? $serverSoftware : '';

        if (stripos($serverSoftware, 'apache') !== false) {
            return 'apache';
        }

        if (stripos($serverSoftware, 'microsoft-iis') !== false || stripos($serverSoftware, 'iis') !== false) {
            return 'iis';
        }

        return 'other';
    }

    /**
     * Install TYPO3
     *
     * @param callable(int, string): void $progressCallback Called with progress percentage and task name
     * @param callable(string): void|null $outputCallback Called with each output line (for live streaming)
     */
    public function install(
        InstallationConfig $config,
        callable $progressCallback,
        ?callable $outputCallback = null
    ): void {
        $installDir = $this->getInstallDir($config);
        $phpBinary = $config->phpBinary ?? 'php';

        // Detect CGI SAPI upfront so all sub-methods can use the cached result
        if ($this->detectCgiSapi($phpBinary)) {
            if ($outputCallback !== null) {
                $outputCallback('[INFO] Detected CGI SAPI for PHP binary — using CGI wrapper mode');
            }
        }

        // Step 1: Prepare installation directory (10%)
        $progressCallback(10, 'Preparing installation directory');
        $this->prepareDirectory($installDir);

        // Step 2: Initialize Composer project (15%)
        $progressCallback(15, 'Initializing Composer project');
        $this->initComposerProject($installDir, $config->admin->username, $config->admin->email ?? '', $config->phpBinary, $outputCallback);

        // Step 3: Install selected packages via Composer (40%)
        $progressCallback(20, 'Installing TYPO3 packages via Composer');
        $this->installPackages($installDir, $config->packages, $config->typo3Version, $config->phpBinary, $outputCallback);

        // Step 4: Run TYPO3 setup with database and admin config (50%)
        $progressCallback(50, 'Setting up TYPO3');
        $this->setupTypo3($config, $installDir, $outputCallback);

        // Step 5: Composer dump-autoload to populate _assets (80%)
        $progressCallback(80, 'Publishing assets');
        $this->runComposerCommand(['dump-autoload'], $installDir, $config->phpBinary, $outputCallback);

        // Replace _assets symlinks with file copies to avoid stat cache issues on LiteSpeed/cPanel
        $this->resolveAssetSymlinks($installDir);

        // Step 6: Extension setup (85%)
        $progressCallback(85, 'Setting up extensions');
        $this->runTypo3Command('extension:setup', [], $installDir, $config->phpBinary, $outputCallback);

        // Step 7: Clear caches (90%)
        $progressCallback(90, 'Clearing caches');
        $this->clearCaches($installDir, $config->phpBinary, $outputCallback);

        // Step 8: Warm up caches (95%)
        $progressCallback(95, 'Warming up caches');
        $this->warmupCaches($installDir, $config->phpBinary, $outputCallback);

        // Step 9: Finalize (100%)
        $progressCallback(100, 'Installation complete!');
    }

    /**
     * Validate and sanitize a string input value
     *
     * @throws \InvalidArgumentException if validation fails
     */
    private function validateInput(string $value, string $fieldName, bool $allowEmpty = false): string
    {
        $trimmed = trim($value);

        if (!$allowEmpty && $trimmed === '') {
            throw new \InvalidArgumentException(
                sprintf('Field "%s" cannot be empty', $fieldName)
            );
        }

        if (strlen($trimmed) > self::MAX_INPUT_LENGTH) {
            throw new \InvalidArgumentException(
                sprintf('Field "%s" exceeds maximum length of %d characters', $fieldName, self::MAX_INPUT_LENGTH)
            );
        }

        // Prevent shell metacharacter injection in CLI arguments
        // Note: Symfony Process handles arguments safely, but we sanitize for defense in depth
        if (preg_match('/[\x00-\x1f]/', $trimmed)) {
            throw new \InvalidArgumentException(
                sprintf('Field "%s" contains invalid control characters', $fieldName)
            );
        }

        return $trimmed;
    }

    private function prepareDirectory(string $installDir): void
    {
        // Create install directory if it doesn't exist
        if (!file_exists($installDir)) {
            $this->filesystem->mkdir($installDir, self::DEFAULT_DIR_PERMISSIONS);
            return;
        }

        // Only clean directories that TYPO3 installation will create/overwrite
        // DO NOT remove the web-dir (e.g., public/) as it contains the PHAR file
        $dirsToClean = [
            $installDir . '/config',
            $installDir . '/var',
            $installDir . '/vendor',
            $installDir . '/packages',
        ];

        // Also clean files in root that will be overwritten
        $filesToClean = [
            $installDir . '/composer.json',
            $installDir . '/composer.lock',
        ];

        foreach ($dirsToClean as $dir) {
            if (file_exists($dir)) {
                $this->filesystem->remove($dir);
            }
        }

        foreach ($filesToClean as $file) {
            if (file_exists($file)) {
                $this->filesystem->remove($file);
            }
        }
    }

    /**
     * Initialize a new Composer project with composer init
     *
     * @param callable(string): void|null $outputCallback
     */
    private function initComposerProject(
        string $installDir,
        string $adminUsername,
        string $adminEmail,
        ?string $phpBinary = null,
        ?callable $outputCallback = null
    ): void {
        $arguments = [
            'init',
            '--name=typo3/site',
            '--description=TYPO3 CMS Site',
            '--type=project',
            '--no-interaction',
        ];

        if ($adminUsername !== '' && $adminEmail !== '') {
            $arguments[] = '--author=' . $adminUsername . ' <' . $adminEmail . '>';
        }

        $this->runComposerCommand(
            $arguments,
            $installDir,
            $phpBinary,
            $outputCallback
        );

        // Add TYPO3 installer paths configuration to composer.json
        $this->configureComposerJson($installDir);
    }

    /**
     * Configure composer.json with TYPO3-specific settings
     */
    private function configureComposerJson(string $installDir): void
    {
        $composerJsonPath = $installDir . '/composer.json';
        $content = file_get_contents($composerJsonPath);

        if ($content === false) {
            throw new \RuntimeException('Could not read composer.json');
        }

        $decoded = json_decode($content, true);

        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid composer.json format');
        }

        /** @var array<string, mixed> $composerJson */
        $composerJson = $decoded;

        // Ensure require is an object, not an array (composer init may create [])
        if (!isset($composerJson['require']) || $composerJson['require'] === []) {
            $composerJson['require'] = new \stdClass();
        }

        // Add TYPO3 configuration
        $composerJson['config'] = [
            'allow-plugins' => [
                'typo3/class-alias-loader' => true,
                'typo3/cms-composer-installers' => true,
            ],
            'sort-packages' => true,
        ];

        $composerJson['extra'] = [
            'typo3/cms' => [
                // Dynamically set web-dir to the directory containing the PHAR
                'web-dir' => $this->infoService->getWebDir(),
            ],
        ];

        file_put_contents(
            $composerJsonPath,
            json_encode($composerJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n"
        );
    }

    /**
     * Install selected TYPO3 packages via Composer require
     *
     * @param array<string> $packages
     * @param callable(string): void|null $outputCallback
     */
    private function installPackages(
        string $installDir,
        array $packages,
        string $typo3Version,
        ?string $phpBinary = null,
        ?callable $outputCallback = null
    ): void {
        if (empty($packages)) {
            throw new \RuntimeException('No packages selected for installation');
        }

        // Build package list with version constraint based on selected TYPO3 version
        $versionConstraint = '^' . $typo3Version;
        $packagesWithVersion = array_map(
            fn(string $pkg): string => $pkg . ':' . $versionConstraint,
            $packages
        );

        $this->runComposerCommand(
            array_merge(
                ['require', '--no-interaction', '--prefer-dist'],
                $packagesWithVersion
            ),
            $installDir,
            $phpBinary,
            $outputCallback
        );
    }

    /**
     * Run TYPO3 setup command with database and admin configuration
     *
     * @param callable(string): void|null $outputCallback
     * @throws \InvalidArgumentException if input validation fails
     */
    private function setupTypo3(
        InstallationConfig $config,
        string $installDir,
        ?callable $outputCallback = null
    ): void {
        // Remove any settings.php created by composer plugins to ensure clean setup
        // The typo3 setup command needs a fresh state to properly configure the database
        $settingsPath = $installDir . '/config/system/settings.php';
        if (file_exists($settingsPath)) {
            $this->filesystem->remove($settingsPath);
        }

        // Also remove var/cache to ensure no stale configuration cache
        $varCachePath = $installDir . '/var/cache';
        if (file_exists($varCachePath)) {
            $this->filesystem->remove($varCachePath);
        }

        $dbConfig = $config->database;
        $admin = $config->admin;
        $isSqlite = $dbConfig->driver === 'pdo_sqlite';

        // Map driver names to TYPO3 connection types
        $driver = match ($dbConfig->driver) {
            'mysqli' => 'mysqli',
            'pdo_mysql' => 'pdoMysql',
            'pdo_pgsql' => 'postgres',
            'pdo_sqlite' => 'sqlite',
            default => throw new \RuntimeException(sprintf('Unsupported database driver: %s', $dbConfig->driver))
        };

        // Validate inputs - SQLite does not need a database name because it is autogenerated
        $dbName = $this->validateInput($dbConfig->name, 'database.name', $driver === 'sqlite');
        $adminUsername = $this->validateInput($admin->username, 'admin.username');
        $adminPassword = $this->validateInput($admin->password, 'admin.password');
        $adminEmail = $this->validateInput($admin->email ?? '', 'admin.email', true);
        $siteName = $this->validateInput($config->site->name, 'site.name');
        $baseUrl = $this->validateInput($config->site->baseUrl, 'site.baseUrl');

        // Build base CLI arguments
        $cliArgs = [
            '--driver=' . $driver,
            '--admin-username=' . $adminUsername,
            '--admin-user-password=' . $adminPassword,
            '--project-name=' . $siteName,
            '--create-site=' . $baseUrl,
            '--server-type=' . $this->detectServerType(),
            '--no-interaction',
            '--force',
        ];

        // Add database-specific arguments
        if (!$isSqlite) {
            // MySQL/PostgreSQL need host, port, user, password
            $host = $this->validateInput($dbConfig->host, 'database.host');
            $dbUser = $this->validateInput($dbConfig->user, 'database.user');
            $dbPassword = $this->validateInput($dbConfig->password, 'database.password', true);

            $cliArgs[] = '--host=' . $host;
            $cliArgs[] = '--port=' . $dbConfig->port;
            $cliArgs[] = '--dbname=' . $dbName;
            $cliArgs[] = '--username=' . $dbUser;
            $cliArgs[] = '--password=' . $dbPassword;
        }

        // Only add email if provided
        if ($adminEmail !== '') {
            $cliArgs[] = '--admin-email=' . $adminEmail;
        }

        // Run TYPO3 setup command with all parameters non-interactively
        $this->runTypo3Command('setup', $cliArgs, $installDir, $config->phpBinary, $outputCallback);

        // @todo: This should not be needed ... like not at all.
        // Create additional configuration for trusted hosts and other settings
        $additionalConfig = $installDir . '/config/system/additional.php';
        $configDir = dirname($additionalConfig);

        if (!file_exists($configDir)) {
            $this->filesystem->mkdir($configDir, self::DEFAULT_DIR_PERMISSIONS);
        }

        $trustedHost = parse_url($baseUrl, PHP_URL_HOST);
        $trustedHostsPattern = is_string($trustedHost) ? preg_quote($trustedHost, '/') : '.*';

        $configContent = <<<PHP
<?php

// Additional TYPO3 configuration for maximum compatability
\$GLOBALS['TYPO3_CONF_VARS']['SYS']['trustedHostsPattern'] = '{$trustedHostsPattern}';
\$GLOBALS['TYPO3_CONF_VARS']['SYS']['devIPmask'] = '*';
\$GLOBALS['TYPO3_CONF_VARS']['SYS']['displayErrors'] = 1;
\$GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxySSL'] = '*';
\$GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyIP'] = '*';
\$GLOBALS['TYPO3_CONF_VARS']['SYS']['reverseProxyHeaderMultiValue'] = 'first';

PHP;

        file_put_contents($additionalConfig, $configContent);
    }

    /**
     * @param callable(string): void|null $outputCallback
     */
    private function warmupCaches(
        string $installDir,
        ?string $phpBinary = null,
        ?callable $outputCallback = null
    ): void {
        try {
            $this->runTypo3Command('cache:warmup', [], $installDir, $phpBinary, $outputCallback);
        } catch (\Exception $e) {
            // Ignore cache warmup errors — non-critical
        }
    }

    /**
     * @param callable(string): void|null $outputCallback
     */
    private function clearCaches(
        string $installDir,
        ?string $phpBinary = null,
        ?callable $outputCallback = null
    ): void {
        // Clear TYPO3 caches
        try {
            $this->runTypo3Command('cache:flush', [], $installDir, $phpBinary, $outputCallback);
        } catch (\Exception $e) {
            // Ignore cache flush errors
        }

        // Clear OPcache
        if (function_exists('opcache_reset')) {
            opcache_reset();
        }
    }

    /**
     * Replace _assets symlinks with actual file copies.
     *
     * After composer dump-autoload creates _assets symlinks, web servers with
     * stat caches (especially LiteSpeed on BlueHost/cPanel) may 404 on first
     * request. Replacing symlinks with real directory copies eliminates this
     * problem entirely.
     */
    private function resolveAssetSymlinks(string $installDir): void
    {
        $webDir = $this->infoService->getWebDir();
        $assetsDir = $installDir . '/' . $webDir . '/_assets';

        if (!is_dir($assetsDir)) {
            return;
        }

        $entries = scandir($assetsDir);
        if ($entries === false) {
            return;
        }

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $path = $assetsDir . '/' . $entry;
            if (!is_link($path)) {
                continue;
            }

            $target = realpath($path);
            if ($target === false || !is_dir($target)) {
                continue;
            }

            // Replace symlink with a copy of the target directory
            unlink($path);
            $this->filesystem->mirror($target, $path);
        }
    }

    /**
     * @param array<string> $arguments
     * @param callable(string): void|null $outputCallback Called with each output line
     */
    private function runTypo3Command(
        string $command,
        array $arguments = [],
        string $installDir = '.',
        ?string $phpBinary = null,
        ?callable $outputCallback = null
    ): void {
        $typo3Binary = $installDir . '/vendor/bin/typo3';

        if (!file_exists($typo3Binary)) {
            throw new \RuntimeException('TYPO3 CLI not found. Installation may have failed.');
        }

        // Use provided PHP binary or fall back to 'php'
        $php = $phpBinary ?? 'php';

        // CGI mode: use wrapper script to avoid SAPI issues
        if ($this->isCgiBinary === true) {
            $this->runViaCgiWrapper(
                $php,
                $typo3Binary,
                [$typo3Binary, $command, ...$arguments],
                $installDir,
                null,
                $outputCallback
            );
            return;
        }

        $process = new Process(
            array_merge([$php, $typo3Binary, $command], $arguments),
            $installDir,
            null,
            null,
            self::PROCESS_TIMEOUT_SECONDS
        );

        // Run with real-time output streaming
        $process->run(function (string $type, string $buffer) use ($outputCallback): void {
            if ($outputCallback !== null) {
                // Split buffer into lines and send each line
                $lines = explode("\n", $buffer);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line !== '') {
                        $outputCallback($line);
                    }
                }
            }
        });

        if (!$process->isSuccessful()) {
            $errorOutput = $process->getErrorOutput();
            $standardOutput = $process->getOutput();
            $combinedOutput = trim($errorOutput . "\n" . $standardOutput);

            throw new \RuntimeException(
                sprintf('TYPO3 command "%s" failed: %s', $command, $combinedOutput ?: 'Unknown error')
            );
        }
    }

    /**
     * Detect if a PHP binary uses a CGI SAPI (not CLI)
     *
     * Caches the result in $this->isCgiBinary for the duration of the install run.
     */
    public function detectCgiSapi(string $phpBinary): bool
    {
        if ($this->isCgiBinary !== null) {
            return $this->isCgiBinary;
        }

        try {
            $process = new Process(
                [$phpBinary, '-r', 'echo php_sapi_name();'],
                null,
                null,
                null,
                5
            );
            $process->run();

            if (!$process->isSuccessful()) {
                $this->isCgiBinary = false;
                return false;
            }

            $output = $this->stripCgiHeaders($process->getOutput());
            $sapi = trim($output);

            $this->isCgiBinary = ($sapi !== '' && $sapi !== 'cli' && $sapi !== 'phpdbg');
            return $this->isCgiBinary;
        } catch (\Throwable $e) {
            $this->isCgiBinary = false;
            return false;
        }
    }

    /**
     * Strip CGI headers from output
     *
     * CGI binaries prepend HTTP headers (e.g., "Content-type: text/html; charset=UTF-8")
     * followed by a blank line before the actual script output.
     */
    public function stripCgiHeaders(string $output): string
    {
        // Check if output starts with an HTTP header pattern (e.g., "Header-Name: value")
        if (preg_match('/^[A-Za-z][A-Za-z0-9-]*:\s/', $output)) {
            // Find the first blank line (double newline) that separates headers from body
            $pos = strpos($output, "\r\n\r\n");
            if ($pos !== false) {
                return substr($output, $pos + 4);
            }
            $pos = strpos($output, "\n\n");
            if ($pos !== false) {
                return substr($output, $pos + 2);
            }
        }

        return $output;
    }

    /**
     * Create a temporary PHP wrapper script for CGI mode
     *
     * The wrapper sets $_SERVER['argv']/$_SERVER['argc'] manually (since
     * register_argc_argv is disabled) and then requires the target script.
     *
     * @param array<string> $argv The argument values to inject
     */
    public function createCgiWrapperScript(string $targetScript, array $argv): string
    {
        $escapedArgv = var_export($argv, true);
        $escapedTarget = var_export($targetScript, true);

        $script = <<<PHP
<?php
// CGI wrapper: inject argv/argc and require target script
\$_SERVER['argv'] = {$escapedArgv};
\$_SERVER['argc'] = count(\$_SERVER['argv']);
\$GLOBALS['argv'] = \$_SERVER['argv'];
\$GLOBALS['argc'] = \$_SERVER['argc'];
require {$escapedTarget};
PHP;

        $tempFile = tempnam(sys_get_temp_dir(), 'typo3-cgi-wrapper-');
        if ($tempFile === false) {
            throw new \RuntimeException('Failed to create temporary CGI wrapper script');
        }

        file_put_contents($tempFile, $script);
        return $tempFile;
    }

    /**
     * Run a PHP script via CGI wrapper
     *
     * Creates a wrapper that injects argv/argc, runs it with register_argc_argv=0
     * and default_mimetype= to suppress CGI headers, then cleans up.
     *
     * @param array<string> $argv The argv values for the target script
     * @param array<string, string>|null $env Environment variables
     * @param callable(string): void|null $outputCallback
     */
    private function runViaCgiWrapper(
        string $phpBinary,
        string $targetScript,
        array $argv,
        string $cwd,
        ?array $env = null,
        ?callable $outputCallback = null
    ): void {
        $wrapperPath = $this->createCgiWrapperScript($targetScript, $argv);

        try {
            $process = new Process(
                [$phpBinary, '-d', 'register_argc_argv=0', '-d', 'default_mimetype=', '-d', 'html_errors=0', $wrapperPath],
                $cwd,
                $env,
                null,
                self::PROCESS_TIMEOUT_SECONDS
            );

            $process->run(function (string $type, string $buffer) use ($outputCallback): void {
                if ($outputCallback !== null) {
                    $buffer = $this->stripCgiHeaders($buffer);
                    $lines = explode("\n", $buffer);
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if ($line !== '' && !str_contains($line, self::COMPOSER_SAPI_WARNING)) {
                            $outputCallback($line);
                        }
                    }
                }
            });

            if (!$process->isSuccessful()) {
                $errorOutput = $this->stripCgiHeaders($process->getErrorOutput());
                $standardOutput = $this->stripCgiHeaders($process->getOutput());
                $combinedOutput = trim($errorOutput . "\n" . $standardOutput);

                throw new \RuntimeException(
                    sprintf('CGI wrapper command failed: %s', $combinedOutput ?: 'Unknown error')
                );
            }
        } finally {
            @unlink($wrapperPath);
        }
    }
}
