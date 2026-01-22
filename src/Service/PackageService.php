<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use Composer\Semver\Semver;
use TYPO3\Installer\Utility\ByteConverter;

/**
 * Service for managing TYPO3 packages and their requirements
 */
class PackageService
{
    /**
     * Required core packages that must always be installed
     */
    private const REQUIRED_PACKAGES = [
        'typo3/cms-core',
        'typo3/cms-backend',
        'typo3/cms-frontend',
        'typo3/cms-install',
    ];

    /**
     * Packages to exclude from the list (not actual system extensions)
     */
    private const EXCLUDED_PACKAGES = [
        'typo3/cms-composer-installers',
        'typo3/cms-styleguide',
        'typo3/cms-cli',
    ];

    /**
     * Additional packages to include (searched separately)
     */
    private const ADDITIONAL_PACKAGE_PREFIXES = [
        'typo3/theme-',
    ];

    /**
     * Recommended packages that should be pre-selected
     */
    private const RECOMMENDED_PACKAGES = [
        'typo3/cms-fluid',
        'typo3/cms-fluid-styled-content',
        'typo3/cms-extbase',
        'typo3/cms-rte-ckeditor',
        'typo3/cms-filelist',
        'typo3/cms-beuser',
        'typo3/cms-setup',
        'typo3/theme-camino',
    ];

    /**
     * Minimum supported TYPO3 version
     */
    private const MIN_TYPO3_VERSION = '13.4';

    /**
     * Cached packages list (keyed by version)
     *
     * @var array<string, array<string, array{name: string, description: string, required: bool}>>
     */
    private array $cachedPackages = [];

    /**
     * Cached TYPO3 versions
     *
     * @var array<array{version: string, latest: string}>|null
     */
    private ?array $cachedVersions = null;

    /**
     * Get available TYPO3 versions (13.4 and above)
     *
     * @return array<array{version: string, latest: string}>
     */
    public function getAvailableTypo3Versions(): array
    {
        if ($this->cachedVersions !== null) {
            return $this->cachedVersions;
        }

        $versions = [];

        try {
            $apiUrl = 'https://packagist.org/packages/typo3/cms-core.json';
            $response = $this->fetchFromPackagist($apiUrl);

            if ($response === null) {
                throw new \RuntimeException('Failed to fetch TYPO3 versions');
            }

            $data = json_decode($response, true);

            if (!is_array($data) || !isset($data['package']['versions'])) {
                throw new \RuntimeException('Invalid response from Packagist');
            }

            // Group versions by major.minor and find latest patch for each
            $versionGroups = [];
            foreach ($data['package']['versions'] as $versionString => $versionData) {
                // Skip dev versions
                if (str_contains($versionString, 'dev')) {
                    continue;
                }

                // Parse version (e.g., "v13.4.0", "v13.4.10", "13.4.0")
                if (!preg_match('/^v?(\d+)\.(\d+)\.(\d+)$/', $versionString, $matches)) {
                    continue;
                }

                $major = (int)$matches[1];
                $minor = (int)$matches[2];
                $patch = (int)$matches[3];

                // Only include versions >= MIN_TYPO3_VERSION
                $majorMinor = sprintf('%d.%d', $major, $minor);
                if (version_compare($majorMinor, self::MIN_TYPO3_VERSION, '<')) {
                    continue;
                }

                // Track the latest patch version for each major.minor
                if (!isset($versionGroups[$majorMinor]) || $patch > $versionGroups[$majorMinor]['patch']) {
                    $versionGroups[$majorMinor] = [
                        'patch' => $patch,
                        'full' => $versionString,
                    ];
                }
            }

            // Convert to output format and sort
            foreach ($versionGroups as $majorMinor => $info) {
                $versions[] = [
                    'version' => $majorMinor,
                    'latest' => $info['full'],
                ];
            }

            // Sort by version descending (newest first)
            usort($versions, fn(array $a, array $b): int => version_compare($b['version'], $a['version']));
        } catch (\Throwable $e) {
            // Fallback to known versions
            $versions = [
                ['version' => '13.4', 'latest' => '13.4.0'],
            ];
        }

        $this->cachedVersions = $versions;

        return $versions;
    }

    /**
     * Get all available TYPO3 packages for a specific version
     *
     * Fetches packages dynamically from Packagist and filters by compatibility.
     *
     * @return array<string, array{name: string, description: string, required: bool}>
     */
    public function getAvailablePackages(string $typo3Version = '13.4'): array
    {
        if (isset($this->cachedPackages[$typo3Version])) {
            return $this->cachedPackages[$typo3Version];
        }

        $packages = $this->fetchPackagesForVersion($typo3Version);
        $this->cachedPackages[$typo3Version] = $packages;

        return $packages;
    }

    /**
     * Fetch TYPO3 CMS packages from Packagist API filtered by version
     *
     * @return array<string, array{name: string, description: string, required: bool}>
     */
    private function fetchPackagesForVersion(string $typo3Version): array
    {
        $packages = [];

        try {
            // Search for typo3/cms-* packages
            $allResults = $this->searchPackagist('typo3/cms-');

            // Also search for additional package prefixes (e.g., typo3/theme-*)
            foreach (self::ADDITIONAL_PACKAGE_PREFIXES as $prefix) {
                $additionalResults = $this->searchPackagist($prefix);
                $allResults = array_merge($allResults, $additionalResults);
            }

            foreach ($allResults as $package) {
                if (!is_array($package) || !isset($package['name'], $package['description'])) {
                    continue;
                }

                $packageName = $package['name'];

                // Only include typo3/cms-* or typo3/theme-* packages
                if (!$this->isAllowedPackage($packageName)) {
                    continue;
                }

                // Exclude non-system extension packages
                if (in_array($packageName, self::EXCLUDED_PACKAGES, true)) {
                    continue;
                }

                // Check if package is compatible with selected TYPO3 version
                if (!$this->isPackageCompatibleWithVersion($packageName, $typo3Version)) {
                    continue;
                }

                $isRequired = in_array($packageName, self::REQUIRED_PACKAGES, true);

                $packages[$packageName] = [
                    'name' => $this->formatPackageName($packageName),
                    'description' => $package['description'],
                    'required' => $isRequired,
                ];
            }

            // Ensure all required packages are present (they might not appear in search)
            foreach (self::REQUIRED_PACKAGES as $requiredPackage) {
                if (!isset($packages[$requiredPackage])) {
                    $packages[$requiredPackage] = [
                        'name' => $this->formatPackageName($requiredPackage),
                        'description' => 'TYPO3 Core package (required)',
                        'required' => true,
                    ];
                }
            }

            // Sort packages: required first, then alphabetically
            uasort($packages, function (array $a, array $b): int {
                if ($a['required'] !== $b['required']) {
                    return $b['required'] <=> $a['required'];
                }
                return $a['name'] <=> $b['name'];
            });
        } catch (\Throwable $e) {
            // Fallback: return only required packages if search fails
            foreach (self::REQUIRED_PACKAGES as $packageName) {
                $packages[$packageName] = [
                    'name' => $this->formatPackageName($packageName),
                    'description' => 'Core TYPO3 package',
                    'required' => true,
                ];
            }
        }

        return $packages;
    }

    /**
     * Search Packagist for packages with a given prefix
     *
     * @return array<mixed>
     */
    private function searchPackagist(string $query): array
    {
        $apiUrl = 'https://packagist.org/search.json?q=' . urlencode($query) . '&per_page=100';
        $response = $this->fetchFromPackagist($apiUrl);

        if ($response === null) {
            return [];
        }

        $data = json_decode($response, true);

        if (!is_array($data) || !isset($data['results'])) {
            return [];
        }

        return $data['results'];
    }

    /**
     * Check if a package name is allowed (matches allowed prefixes)
     */
    private function isAllowedPackage(string $packageName): bool
    {
        if (str_starts_with($packageName, 'typo3/cms-')) {
            return true;
        }

        foreach (self::ADDITIONAL_PACKAGE_PREFIXES as $prefix) {
            if (str_starts_with($packageName, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a package has a version compatible with the specified TYPO3 version
     */
    private function isPackageCompatibleWithVersion(string $packageName, string $typo3Version): bool
    {
        try {
            $apiUrl = sprintf('https://packagist.org/packages/%s.json', $packageName);
            $response = $this->fetchFromPackagist($apiUrl);

            if ($response === null) {
                return false;
            }

            $data = json_decode($response, true);

            if (!is_array($data) || !isset($data['package']['versions'])) {
                return false;
            }

            // Check each version of the package
            foreach ($data['package']['versions'] as $versionString => $versionData) {
                // Skip dev versions
                if (str_contains($versionString, 'dev')) {
                    continue;
                }

                // Check if this package version requires a compatible typo3/cms-core
                $require = $versionData['require'] ?? [];
                $coreConstraint = $require['typo3/cms-core'] ?? null;

                if ($coreConstraint === null) {
                    continue;
                }

                // Check if the constraint matches our target version
                // We need to check if any version in the typo3Version range satisfies the constraint
                $testVersion = $typo3Version . '.0';
                if (Semver::satisfies($testVersion, $coreConstraint)) {
                    return true;
                }
            }

            return false;
        } catch (\Throwable $e) {
            // If we can't check, assume compatible to be safe
            return true;
        }
    }

    /**
     * Fetch data from Packagist API with caching
     */
    private function fetchFromPackagist(string $url): ?string
    {
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'user_agent' => 'TYPO3-Installer/1.0',
            ],
        ]);

        $response = @file_get_contents($url, false, $context);

        return $response !== false ? $response : null;
    }

    /**
     * Format package name from typo3/cms-xyz to a human-readable name
     */
    private function formatPackageName(string $packageName): string
    {
        // Remove vendor prefix
        $name = str_replace('typo3/cms-', '', $packageName);

        // Convert hyphens to spaces and capitalize
        $name = str_replace('-', ' ', $name);

        return ucwords($name);
    }

    /**
     * Get the list of required (core) packages
     *
     * @return array<string>
     */
    public function getRequiredPackages(): array
    {
        return self::REQUIRED_PACKAGES;
    }

    /**
     * Get the list of recommended packages for pre-selection
     *
     * @return array<string>
     */
    public function getRecommendedPackages(): array
    {
        return self::RECOMMENDED_PACKAGES;
    }

    /**
     * Get current platform information using Composer
     *
     * @return array{php: string, extensions: array<string, string>}
     */
    public function getPlatformInfo(): array
    {
        $extensions = [];

        // Get loaded extensions
        foreach (get_loaded_extensions() as $ext) {
            $version = phpversion($ext);
            $extensions[strtolower($ext)] = $version !== false ? $version : '0.0.0';
        }

        return [
            'php' => PHP_VERSION,
            'extensions' => $extensions,
        ];
    }

    /**
     * Validate platform requirements for selected packages
     *
     * @param array<string> $packages List of package names to validate
     * @return array{passed: bool, requirements: array<array{title: string, description: string, status: string, package?: string}>}
     */
    public function validateRequirements(array $packages): array
    {
        $platform = $this->getPlatformInfo();
        $requirements = [];
        $allPassed = true;

        // Always check PHP version for TYPO3 13+
        $phpRequirement = $this->checkPhpVersion($platform['php'], '^8.2');
        $requirements[] = $phpRequirement;
        if ($phpRequirement['status'] === 'failed') {
            $allPassed = false;
        }

        // Check common required extensions for TYPO3
        $requiredExtensions = [
            'pdo' => 'Database connectivity',
            'json' => 'JSON processing',
            'pcre' => 'Regular expressions',
            'session' => 'Session handling',
            'xml' => 'XML processing',
            'filter' => 'Data filtering',
            'hash' => 'Hashing functions',
            'mbstring' => 'Multibyte string support',
            'intl' => 'Internationalization',
            'gd' => 'Image processing',
            'zip' => 'ZIP archive support',
            'openssl' => 'SSL/TLS encryption',
            'fileinfo' => 'File type detection',
            'tokenizer' => 'PHP token parsing',
        ];

        foreach ($requiredExtensions as $ext => $purpose) {
            $extRequirement = $this->checkExtension($ext, $purpose, $platform['extensions']);
            $requirements[] = $extRequirement;
            if ($extRequirement['status'] === 'failed') {
                $allPassed = false;
            }
        }

        // Check recommended extensions
        $recommendedExtensions = [
            'curl' => 'HTTP requests',
            'zlib' => 'Compression',
            'opcache' => 'Opcode caching for performance',
            'apcu' => 'User data caching',
        ];

        foreach ($recommendedExtensions as $ext => $purpose) {
            $extRequirement = $this->checkExtension($ext, $purpose, $platform['extensions'], false);
            $requirements[] = $extRequirement;
            // Warnings don't fail the check
        }

        // Check memory limit
        $memoryRequirement = $this->checkMemoryLimit();
        $requirements[] = $memoryRequirement;
        if ($memoryRequirement['status'] === 'failed') {
            $allPassed = false;
        }

        return [
            'passed' => $allPassed,
            'requirements' => $requirements,
        ];
    }

    /**
     * Check PHP version requirement
     *
     * @return array{title: string, description: string, status: string}
     */
    private function checkPhpVersion(string $currentVersion, string $constraint): array
    {
        $satisfies = Semver::satisfies($currentVersion, $constraint);

        return [
            'title' => 'PHP Version',
            'description' => sprintf(
                'Required: %s (Current: %s)',
                $constraint,
                $currentVersion
            ),
            'status' => $satisfies ? 'passed' : 'failed',
        ];
    }

    /**
     * Check if a PHP extension is available
     *
     * @param array<string, string> $loadedExtensions
     * @return array{title: string, description: string, status: string}
     */
    private function checkExtension(
        string $extension,
        string $purpose,
        array $loadedExtensions,
        bool $required = true
    ): array {
        $isLoaded = isset($loadedExtensions[$extension]) || extension_loaded($extension);

        $status = 'passed';
        if (!$isLoaded) {
            $status = $required ? 'failed' : 'warning';
        }

        return [
            'title' => sprintf('PHP Extension: %s', $extension),
            'description' => sprintf(
                '%s - %s',
                $purpose,
                $isLoaded ? 'Available' : ($required ? 'Missing (required)' : 'Missing (recommended)')
            ),
            'status' => $status,
        ];
    }

    /**
     * Check memory limit
     *
     * @return array{title: string, description: string, status: string}
     */
    private function checkMemoryLimit(): array
    {
        $memoryLimit = (string)(ini_get('memory_limit') ?: '128M');
        $bytes = ByteConverter::toBytes($memoryLimit);
        $required = 256 * 1024 * 1024; // 256MB

        $status = 'passed';
        if ($bytes !== -1 && $bytes < $required) {
            $status = 'warning';
        }

        return [
            'title' => 'Memory Limit',
            'description' => sprintf(
                'Recommended: 256MB or higher (Current: %s)',
                $memoryLimit
            ),
            'status' => $status,
        ];
    }

    /**
     * Validate that a list of packages is valid
     *
     * @param array<string> $packages
     * @return array{valid: bool, errors: array<string>}
     */
    public function validatePackageSelection(array $packages, string $typo3Version = '13.4'): array
    {
        $errors = [];
        $allPackages = $this->getAllPackageNames($typo3Version);
        $requiredPackages = $this->getRequiredPackages();

        // Check all required packages are included
        foreach ($requiredPackages as $required) {
            if (!in_array($required, $packages, true)) {
                $errors[] = sprintf('Required package "%s" must be selected', $required);
            }
        }

        // Check all selected packages are valid
        foreach ($packages as $package) {
            if (!in_array($package, $allPackages, true)) {
                $errors[] = sprintf('Unknown package "%s"', $package);
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Get all package names as a flat list
     *
     * @return array<string>
     */
    private function getAllPackageNames(string $typo3Version = '13.4'): array
    {
        return array_keys($this->getAvailablePackages($typo3Version));
    }
}
