<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use Composer\Console\Application as ComposerApplication;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;
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

    private Filesystem $filesystem;
    private InstallationInfoService $infoService;

    public function __construct()
    {
        $this->filesystem = new Filesystem();
        $this->infoService = new InstallationInfoService();
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
        $serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? '';

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
     * @param callable(int, string): void $progressCallback
     */
    public function install(InstallationConfig $config, callable $progressCallback): void
    {
        $installDir = $this->getInstallDir($config);

        // Step 1: Prepare installation directory (10%)
        $progressCallback(10, 'Preparing installation directory');
        $this->prepareDirectory($installDir);

        // Step 2: Initialize Composer project (15%)
        $progressCallback(15, 'Initializing Composer project');
        $this->initComposerProject($installDir);

        // Step 3: Install selected packages via Composer (40%)
        $progressCallback(20, 'Installing TYPO3 packages via Composer');
        $this->installPackages($installDir, $config->packages, $config->typo3Version);

        // Step 4: Run TYPO3 setup with database and admin config (70%)
        $progressCallback(50, 'Setting up TYPO3');
        $this->setupTypo3($config, $installDir);

        // Step 6: Clear caches (95%)
        $progressCallback(95, 'Clearing caches');
        $this->clearCaches($installDir);

        // Step 7: Finalize (100%)
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
     */
    private function initComposerProject(string $installDir): void
    {
        $originalDir = getcwd();

        try {
            chdir($installDir);
            putenv('COMPOSER_HOME=' . sys_get_temp_dir() . '/composer');
            // Set absolute path for composer.json to avoid PHAR path resolution issues
            putenv('COMPOSER=' . $installDir . '/composer.json');

            $input = new ArrayInput([
                'command' => 'init',
                '--name' => 'typo3/site',
                '--description' => 'TYPO3 CMS Site',
                '--type' => 'project',
                '--no-interaction' => true,
            ]);

            $output = new BufferedOutput();

            $application = new ComposerApplication();
            $application->setAutoExit(false);
            $application->setCatchExceptions(false);

            $exitCode = $application->run($input, $output);

            if ($exitCode !== 0) {
                throw new \RuntimeException(
                    sprintf('Composer init failed: %s', $output->fetch())
                );
            }

            // Add TYPO3 installer paths configuration to composer.json
            $this->configureComposerJson($installDir);
        } finally {
            if ($originalDir !== false) {
                chdir($originalDir);
            }
            // Clean up COMPOSER env var
            putenv('COMPOSER');
        }
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

        // @todo: Add scripts section, see whats needed.
        //        $composerJson['scripts'] = [
        //        ];

        file_put_contents(
            $composerJsonPath,
            json_encode($composerJson, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n"
        );
    }

    /**
     * Install selected TYPO3 packages via Composer require
     *
     * @param array<string> $packages
     */
    private function installPackages(string $installDir, array $packages, string $typo3Version): void
    {
        if (empty($packages)) {
            throw new \RuntimeException('No packages selected for installation');
        }

        $originalDir = getcwd();

        try {
            chdir($installDir);
            putenv('COMPOSER_HOME=' . sys_get_temp_dir() . '/composer');
            // Set absolute path for composer.json to avoid PHAR path resolution issues
            putenv('COMPOSER=' . $installDir . '/composer.json');

            // Build package list with version constraint based on selected TYPO3 version
            $versionConstraint = '^' . $typo3Version;
            $packagesWithVersion = array_map(
                fn(string $pkg): string => $pkg . ':' . $versionConstraint,
                $packages
            );

            $input = new ArrayInput([
                'command' => 'require',
                'packages' => $packagesWithVersion,
                '--no-interaction' => true,
                '--prefer-dist' => true,
            ]);

            $output = new BufferedOutput();

            $application = new ComposerApplication();
            $application->setAutoExit(false);
            $application->setCatchExceptions(false);

            $exitCode = $application->run($input, $output);

            if ($exitCode !== 0) {
                throw new \RuntimeException(
                    sprintf('Composer require failed: %s', $output->fetch())
                );
            }
        } finally {
            if ($originalDir !== false) {
                chdir($originalDir);
            }
            // Clean up COMPOSER env var
            putenv('COMPOSER');
        }
    }

    /**
     * Run TYPO3 setup command with database and admin configuration
     *
     * @throws \InvalidArgumentException if input validation fails
     */
    private function setupTypo3(InstallationConfig $config, string $installDir): void
    {
        $dbConfig = $config->database;
        $admin = $config->admin;

        // Validate all user inputs before passing to CLI
        $host = $this->validateInput($dbConfig->host, 'database.host');
        $dbName = $this->validateInput($dbConfig->name, 'database.name');
        $dbUser = $this->validateInput($dbConfig->user, 'database.user');
        $dbPassword = $this->validateInput($dbConfig->password, 'database.password', true);
        $adminUsername = $this->validateInput($admin->username, 'admin.username');
        $adminPassword = $this->validateInput($admin->password, 'admin.password');
        $adminEmail = $this->validateInput($admin->email, 'admin.email');
        $siteName = $this->validateInput($config->site->name, 'site.name');
        $baseUrl = $this->validateInput($config->site->baseUrl, 'site.baseUrl');

        // Map driver names: pdo_mysql -> mysqli for TYPO3
        $driver = match ($dbConfig->driver) {
            'pdo_mysql' => 'mysqli',
            'pdo_pgsql' => 'pdo_pgsql',
            default => 'mysqli'
        };

        // Run TYPO3 setup command with all parameters non-interactively
        $this->runTypo3Command(
            'setup',
            [
                '--driver=' . $driver,
                '--host=' . $host,
                '--port=' . $dbConfig->port,
                '--dbname=' . $dbName,
                '--username=' . $dbUser,
                '--password=' . $dbPassword,
                '--admin-username=' . $adminUsername,
                '--admin-user-password=' . $adminPassword,
                '--admin-email=' . $adminEmail,
                '--project-name=' . $siteName,
                '--create-site=' . $baseUrl,
                '--server-type=' . $this->detectServerType(),
                '--no-interaction',
                '--force',
            ],
            $installDir
        );

        // Create additional configuration for trusted hosts and other settings
        $additionalConfig = $installDir . '/config/system/additional.php';
        $configDir = dirname($additionalConfig);

        if (!file_exists($configDir)) {
            $this->filesystem->mkdir($configDir, self::DEFAULT_DIR_PERMISSIONS);
        }

        $configContent = <<<PHP
<?php

// Additional TYPO3 configuration
\$GLOBALS['TYPO3_CONF_VARS']['BE']['lockSSL'] = false;
\$GLOBALS['TYPO3_CONF_VARS']['SYS']['trustedHostsPattern'] = '.*';

PHP;

        file_put_contents($additionalConfig, $configContent);
    }

    private function clearCaches(string $installDir): void
    {
        // Clear TYPO3 caches
        try {
            $this->runTypo3Command('cache:flush', [], $installDir);
        } catch (\Exception $e) {
            // Ignore cache flush errors
        }

        // Clear OPcache
        if (function_exists('opcache_reset')) {
            opcache_reset();
        }
    }

    /**
     * @param array<string> $arguments
     */
    private function runTypo3Command(string $command, array $arguments = [], string $installDir = '.'): void
    {
        $typo3Binary = $installDir . '/vendor/bin/typo3';

        if (!file_exists($typo3Binary)) {
            throw new \RuntimeException('TYPO3 CLI not found. Installation may have failed.');
        }

        $process = new Process(
            array_merge(['php', $typo3Binary, $command], $arguments),
            $installDir,
            null,
            null,
            self::PROCESS_TIMEOUT_SECONDS
        );

        $process->run();

        if (!$process->isSuccessful()) {
            $errorOutput = $process->getErrorOutput();
            $standardOutput = $process->getOutput();
            $combinedOutput = trim($errorOutput . "\n" . $standardOutput);

            throw new \RuntimeException(
                sprintf('TYPO3 command "%s" failed: %s', $command, $combinedOutput ?: 'Unknown error')
            );
        }
    }
}
