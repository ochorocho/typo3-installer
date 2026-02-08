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
     * Minimum required memory in bytes (256MB)
     */
    private const MIN_MEMORY_BYTES = 256 * 1024 * 1024;

    /**
     * Required core packages that must always be installed
     */
    private const REQUIRED_PACKAGES = [
        'typo3/cms-core',
        'typo3/cms-backend',
        'typo3/cms-frontend',
        'typo3/cms-filelist',
        'typo3/cms-fluid',
        'typo3/cms-install',
        'typo3/cms-setup',
        'typo3/cms-recycler',
    ];

    /**
     * Packages to exclude from the list (not actual system extensions)
     */
    private const EXCLUDED_PACKAGES = [
        'typo3/cms-composer-installers',
        'typo3/cms-styleguide',
        'typo3/cms-cli',
        // Replaced by the Package Manager
        'typo3/cms-extensionmanager',
        // No v14.1 version as of today, leads to stability issues with composer
        'typo3/cms-base-distribution',
        // Not working in v13.4/v14.1
        'typo3/cms-introduction'
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
        'typo3/cms-rte-ckeditor',
        'typo3/cms-beuser',
        'typo3/cms-setup',
        'typo3/theme-camino',
        'typo3/cms-viewpage',
        'typo3/cms-seo',
        'typo3/cms-scheduler',
        'typo3/cms-form',
        'typo3/cms-redirects',
        'typo3/cms-linkvalidator',
    ];

    /**
     * Minimum supported TYPO3 version
     */
    private const MIN_TYPO3_VERSION = '13.4';

    /**
     * Packagist API base URL
     */
    private const PACKAGIST_API_URL = 'https://packagist.org';

    /**
     * HTTP client for API requests
     */
    private HttpClient $httpClient;

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
     * Cached package metadata from Packagist
     *
     * @var array<string, array{versions?: mixed}>
     */
    private array $packageMetadataCache = [];

    public function __construct(?HttpClient $httpClient = null)
    {
        $this->httpClient = $httpClient ?? new HttpClient();
    }

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
            $apiUrl = self::PACKAGIST_API_URL . '/packages/typo3/cms-core.json';
            $data = $this->httpClient->getJson($apiUrl);

            if ($data === null
                || !isset($data['package'])
                || !is_array($data['package'])
                || !isset($data['package']['versions'])
                || !is_array($data['package']['versions'])
            ) {
                throw new \RuntimeException('Failed to fetch TYPO3 versions');
            }

            /** @var array<string, mixed> $packageVersions */
            $packageVersions = $data['package']['versions'];

            // Group versions by major and find latest minor.patch for each
            /** @var array<string, array{minor: int, patch: int, full: string, majorMinor: string}> $versionGroups */
            $versionGroups = [];
            foreach ($packageVersions as $versionString => $versionData) {
                $versionStr = (string)$versionString;
                // Skip dev versions
                if (str_contains($versionStr, 'dev')) {
                    continue;
                }

                // Parse version (e.g., "v13.4.0", "v13.4.10", "13.4.0")
                if (!preg_match('/^v?(\d+)\.(\d+)\.(\d+)$/', $versionStr, $matches)) {
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

                $majorKey = (string)$major;

                // Track the latest minor.patch version for each major
                if (!isset($versionGroups[$majorKey])) {
                    $versionGroups[$majorKey] = [
                        'minor' => $minor,
                        'patch' => $patch,
                        'full' => $versionStr,
                        'majorMinor' => $majorMinor,
                    ];
                } elseif ($minor > $versionGroups[$majorKey]['minor']
                    || ($minor === $versionGroups[$majorKey]['minor'] && $patch > $versionGroups[$majorKey]['patch'])
                ) {
                    $versionGroups[$majorKey] = [
                        'minor' => $minor,
                        'patch' => $patch,
                        'full' => $versionStr,
                        'majorMinor' => $majorMinor,
                    ];
                }
            }

            // Convert to output format and sort
            foreach ($versionGroups as $majorKey => $info) {
                $versions[] = [
                    'version' => $info['majorMinor'],  // e.g., "14.1" (not just "14")
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

            // Filter and collect package names for batch metadata fetching
            $packageNames = [];
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

                $packageNames[$packageName] = $package['description'];
            }

            // Pre-warm cache with all package metadata URLs to minimize API calls
            $this->preWarmPackageMetadataCache(array_keys($packageNames));

            // Now check compatibility using cached metadata
            foreach ($packageNames as $packageName => $description) {
                // Check if package is compatible with selected TYPO3 version
                if (!$this->isPackageCompatibleWithVersion($packageName, $typo3Version)) {
                    continue;
                }

                $isRequired = in_array($packageName, self::REQUIRED_PACKAGES, true);

                $packages[$packageName] = [
                    'name' => $this->formatPackageName($packageName),
                    'description' => $description,
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
     * Pre-warm the package metadata cache with concurrent requests
     *
     * This significantly reduces API calls by fetching all package metadata in parallel.
     *
     * @param array<string> $packageNames
     */
    private function preWarmPackageMetadataCache(array $packageNames): void
    {
        $urls = [];
        foreach ($packageNames as $packageName) {
            if (!isset($this->packageMetadataCache[$packageName])) {
                $urls[] = sprintf('%s/packages/%s.json', self::PACKAGIST_API_URL, $packageName);
            }
        }

        if (empty($urls)) {
            return;
        }

        // Use concurrent requests to fetch all metadata
        $this->httpClient->preWarmCache($urls);

        // Now fetch from cache and populate our metadata cache
        foreach ($packageNames as $packageName) {
            if (!isset($this->packageMetadataCache[$packageName])) {
                $url = sprintf('%s/packages/%s.json', self::PACKAGIST_API_URL, $packageName);
                $data = $this->httpClient->getJson($url);
                if ($data !== null && isset($data['package']) && is_array($data['package'])) {
                    /** @var array{versions?: mixed} $packageData */
                    $packageData = $data['package'];
                    $this->packageMetadataCache[$packageName] = $packageData;
                }
            }
        }
    }

    /**
     * Get package metadata from cache or fetch it
     *
     * @return array{versions?: mixed}|null
     */
    private function getPackageMetadata(string $packageName): ?array
    {
        if (isset($this->packageMetadataCache[$packageName])) {
            return $this->packageMetadataCache[$packageName];
        }

        $apiUrl = sprintf('%s/packages/%s.json', self::PACKAGIST_API_URL, $packageName);
        $data = $this->httpClient->getJson($apiUrl);

        if ($data === null || !isset($data['package']) || !is_array($data['package'])) {
            return null;
        }

        /** @var array{versions?: mixed} $packageData */
        $packageData = $data['package'];
        $this->packageMetadataCache[$packageName] = $packageData;

        return $packageData;
    }

    /**
     * Search Packagist for packages with a given prefix
     *
     * @return array<int, array{name?: string, description?: string}>
     */
    private function searchPackagist(string $query): array
    {
        $apiUrl = self::PACKAGIST_API_URL . '/search.json?q=' . urlencode($query) . '&per_page=100';
        $data = $this->httpClient->getJson($apiUrl);

        if ($data === null || !isset($data['results']) || !is_array($data['results'])) {
            return [];
        }

        /** @var array<int, array{name?: string, description?: string}> $results */
        $results = $data['results'];

        return $results;
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
            $packageData = $this->getPackageMetadata($packageName);

            if ($packageData === null || !isset($packageData['versions']) || !is_array($packageData['versions'])) {
                return false;
            }

            // Check each version of the package
            foreach ($packageData['versions'] as $versionString => $versionData) {
                $versionStr = (string)$versionString;
                // Skip dev versions
                if (str_contains($versionStr, 'dev')) {
                    continue;
                }

                if (!is_array($versionData)) {
                    continue;
                }

                // Check if this package version requires a compatible typo3/cms-core
                $require = isset($versionData['require']) && is_array($versionData['require'])
                    ? $versionData['require']
                    : [];
                $coreConstraint = isset($require['typo3/cms-core']) && is_string($require['typo3/cms-core'])
                    ? $require['typo3/cms-core']
                    : null;

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
     * Fetch platform requirements for a package compatible with given TYPO3 version
     *
     * @return array{php: string|null, required: array<string>, suggested: array<string>}
     */
    private function fetchPackageRequirements(string $packageName, string $typo3Version): array
    {
        $emptyResult = ['php' => null, 'required' => [], 'suggested' => []];

        try {
            $packageData = $this->getPackageMetadata($packageName);

            if ($packageData === null || !isset($packageData['versions']) || !is_array($packageData['versions'])) {
                return $emptyResult;
            }

            $versions = $packageData['versions'];

            // Find version compatible with TYPO3 version
            foreach ($versions as $versionString => $versionData) {
                if (!is_array($versionData)) {
                    continue;
                }

                $versionStr = (string)$versionString;

                // Skip dev versions
                if (str_contains($versionStr, 'dev')) {
                    continue;
                }

                $require = isset($versionData['require']) && is_array($versionData['require'])
                    ? $versionData['require']
                    : [];

                $coreConstraint = isset($require['typo3/cms-core']) && is_string($require['typo3/cms-core'])
                    ? $require['typo3/cms-core']
                    : null;

                // For TYPO3 packages, check core compatibility
                if ($coreConstraint !== null) {
                    $testVersion = $typo3Version . '.0';
                    if (!Semver::satisfies($testVersion, $coreConstraint)) {
                        continue;
                    }
                }

                // Extract requirements
                $phpConstraint = isset($require['php']) && is_string($require['php'])
                    ? $require['php']
                    : null;
                $requiredExt = [];
                $suggestedExt = [];

                foreach ($require as $key => $constraint) {
                    $keyStr = (string)$key;
                    if (str_starts_with($keyStr, 'ext-')) {
                        $requiredExt[] = substr($keyStr, 4); // Remove 'ext-' prefix
                    }
                }

                $suggest = isset($versionData['suggest']) && is_array($versionData['suggest'])
                    ? $versionData['suggest']
                    : [];
                foreach ($suggest as $key => $description) {
                    $keyStr = (string)$key;
                    if (str_starts_with($keyStr, 'ext-')) {
                        $suggestedExt[] = substr($keyStr, 4);
                    }
                }

                return [
                    'php' => $phpConstraint,
                    'required' => $requiredExt,
                    'suggested' => $suggestedExt,
                ];
            }

            return $emptyResult;
        } catch (\Throwable $e) {
            return $emptyResult;
        }
    }

    /**
     * Aggregate platform requirements from all selected packages
     *
     * @param array<string> $packages
     * @return array{php: string, required: array<string, array<string>>, suggested: array<string, array<string>>}
     */
    private function aggregatePackageRequirements(array $packages, string $typo3Version): array
    {
        // Pre-warm cache for all packages at once
        $this->preWarmPackageMetadataCache($packages);

        $phpConstraints = [];
        /** @var array<string, array<string>> $requiredExtensions */
        $requiredExtensions = [];  // ext => [packages that need it]
        /** @var array<string, array<string>> $suggestedExtensions */
        $suggestedExtensions = []; // ext => [packages that suggest it]

        foreach ($packages as $packageName) {
            $requirements = $this->fetchPackageRequirements($packageName, $typo3Version);

            if ($requirements['php'] !== null) {
                $phpConstraints[] = $requirements['php'];
            }

            foreach ($requirements['required'] as $ext) {
                if (!isset($requiredExtensions[$ext])) {
                    $requiredExtensions[$ext] = [];
                }
                $requiredExtensions[$ext][] = $packageName;
            }

            foreach ($requirements['suggested'] as $ext) {
                // Only suggest if not already required
                if (!isset($requiredExtensions[$ext])) {
                    if (!isset($suggestedExtensions[$ext])) {
                        $suggestedExtensions[$ext] = [];
                    }
                    $suggestedExtensions[$ext][] = $packageName;
                }
            }
        }

        // Merge PHP constraints - use most restrictive
        // All TYPO3 13+ packages require ^8.2, so this is the safe default
        $mergedPhp = '^8.2';
        if (!empty($phpConstraints)) {
            $mergedPhp = $phpConstraints[0];
        }

        return [
            'php' => $mergedPhp,
            'required' => $requiredExtensions,
            'suggested' => $suggestedExtensions,
        ];
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
     * Dynamically fetches requirements from Packagist based on the selected packages.
     *
     * @param array<string> $packages List of package names to validate
     * @return array{passed: bool, requirements: array<array{title: string, description: string, status: string}>}
     */
    public function validateRequirements(array $packages, string $typo3Version = '13.4'): array
    {
        $platform = $this->getPlatformInfo();
        $requirements = [];
        $allPassed = true;

        // Aggregate requirements from all selected packages
        $aggregated = $this->aggregatePackageRequirements($packages, $typo3Version);

        // Check PHP version against aggregated constraint
        $phpRequirement = $this->checkPhpVersion($platform['php'], $aggregated['php']);
        $requirements[] = $phpRequirement;
        if ($phpRequirement['status'] === 'failed') {
            $allPassed = false;
        }

        // Check required extensions (from packages)
        foreach ($aggregated['required'] as $ext => $sourcePackages) {
            $extRequirement = $this->checkExtensionDynamic(
                $ext,
                $sourcePackages,
                $platform['extensions'],
                true
            );
            $requirements[] = $extRequirement;
            if ($extRequirement['status'] === 'failed') {
                $allPassed = false;
            }
        }

        // Check suggested extensions (from packages)
        foreach ($aggregated['suggested'] as $ext => $sourcePackages) {
            $extRequirement = $this->checkExtensionDynamic(
                $ext,
                $sourcePackages,
                $platform['extensions'],
                false
            );
            $requirements[] = $extRequirement;
            // Warnings don't fail the check
        }

        // Check memory limit (static, not package-dependent)
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
     * Normalize PHP version for semver comparison
     *
     * PHP versions may include custom suffixes (e.g., "8.4.16-nmm1" for NMM hosting)
     * which semver treats as pre-release identifiers. This strips suffixes to get
     * a clean major.minor.patch version.
     */
    private function normalizePhpVersion(string $version): string
    {
        if (preg_match('/^(\d+\.\d+\.\d+)/', $version, $matches)) {
            return $matches[1];
        }
        return $version;
    }

    /**
     * Check PHP version requirement
     *
     * @return array{title: string, description: string, status: string}
     */
    private function checkPhpVersion(string $currentVersion, string $constraint): array
    {
        $normalizedVersion = $this->normalizePhpVersion($currentVersion);
        $satisfies = Semver::satisfies($normalizedVersion, $constraint);

        return [
            'title' => 'PHP Version',
            'description' => sprintf(
                'Required: %s (Current: %s)',
                $constraint,
                $currentVersion  // Show original version in description
            ),
            'status' => $satisfies ? 'passed' : 'failed',
        ];
    }

    /**
     * Check extension with dynamic source information from packages
     *
     * @param array<string> $sourcePackages Packages that require/suggest this extension
     * @param array<string, string> $loadedExtensions
     * @return array{title: string, description: string, status: string, packages: array<string>}
     */
    private function checkExtensionDynamic(
        string $extension,
        array $sourcePackages,
        array $loadedExtensions,
        bool $required
    ): array {
        $isLoaded = isset($loadedExtensions[$extension]) || extension_loaded($extension);

        $status = 'passed';
        if (!$isLoaded) {
            $status = $required ? 'failed' : 'warning';
        }

        // Format package list for display
        $packageList = implode(', ', array_map(
            fn(string $p): string => str_replace(['typo3/cms-', 'typo3/'], '', $p),
            array_slice($sourcePackages, 0, 3)
        ));
        if (count($sourcePackages) > 3) {
            $packageList .= ' +' . (count($sourcePackages) - 3) . ' more';
        }

        return [
            'title' => sprintf('PHP Extension: %s', $extension),
            'description' => sprintf(
                '%s by %s',
                $required ? 'Required' : 'Recommended',
                $packageList
            ),
            'status' => $status,
            'packages' => $sourcePackages,
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

        $status = 'passed';
        if ($bytes !== -1 && $bytes < self::MIN_MEMORY_BYTES) {
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
