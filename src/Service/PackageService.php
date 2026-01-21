<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use Composer\Semver\Semver;

/**
 * Service for managing TYPO3 packages and their requirements
 */
class PackageService
{
    private const TYPO3_PACKAGES = [
        'core' => [
            'typo3/cms-core' => [
                'name' => 'Core',
                'description' => 'The core of TYPO3 CMS',
                'required' => true,
            ],
            'typo3/cms-backend' => [
                'name' => 'Backend',
                'description' => 'Backend interface for content management',
                'required' => true,
            ],
            'typo3/cms-frontend' => [
                'name' => 'Frontend',
                'description' => 'Frontend rendering and page delivery',
                'required' => true,
            ],
            'typo3/cms-install' => [
                'name' => 'Install Tool',
                'description' => 'Installation and maintenance tools',
                'required' => true,
            ],
        ],
        'content' => [
            'typo3/cms-fluid' => [
                'name' => 'Fluid',
                'description' => 'Fluid templating engine',
                'required' => false,
            ],
            'typo3/cms-fluid-styled-content' => [
                'name' => 'Fluid Styled Content',
                'description' => 'Content elements rendered with Fluid',
                'required' => false,
            ],
            'typo3/cms-extbase' => [
                'name' => 'Extbase',
                'description' => 'Extension framework with MVC pattern',
                'required' => false,
            ],
            'typo3/cms-form' => [
                'name' => 'Form',
                'description' => 'Form framework for creating web forms',
                'required' => false,
            ],
            'typo3/cms-rte-ckeditor' => [
                'name' => 'RTE CKEditor',
                'description' => 'Rich text editor integration',
                'required' => false,
            ],
        ],
        'user_management' => [
            'typo3/cms-beuser' => [
                'name' => 'Backend Users',
                'description' => 'Backend user and group management',
                'required' => false,
            ],
            'typo3/cms-felogin' => [
                'name' => 'Frontend Login',
                'description' => 'Frontend user authentication',
                'required' => false,
            ],
            'typo3/cms-setup' => [
                'name' => 'User Settings',
                'description' => 'User profile and settings module',
                'required' => false,
            ],
        ],
        'infrastructure' => [
            'typo3/cms-dashboard' => [
                'name' => 'Dashboard',
                'description' => 'Customizable backend dashboard',
                'required' => false,
            ],
            'typo3/cms-filelist' => [
                'name' => 'File List',
                'description' => 'File management module',
                'required' => false,
            ],
            'typo3/cms-recycler' => [
                'name' => 'Recycler',
                'description' => 'Restore deleted records',
                'required' => false,
            ],
            'typo3/cms-belog' => [
                'name' => 'Backend Log',
                'description' => 'Backend event logging',
                'required' => false,
            ],
            'typo3/cms-info' => [
                'name' => 'Info',
                'description' => 'Page information module',
                'required' => false,
            ],
            'typo3/cms-impexp' => [
                'name' => 'Import/Export',
                'description' => 'Import and export functionality',
                'required' => false,
            ],
            'typo3/cms-reports' => [
                'name' => 'Reports',
                'description' => 'System status reports',
                'required' => false,
            ],
        ],
        'developer' => [
            'typo3/cms-lowlevel' => [
                'name' => 'Lowlevel',
                'description' => 'Low-level database and system tools',
                'required' => false,
            ],
            'typo3/cms-tstemplate' => [
                'name' => 'TypoScript Template',
                'description' => 'TypoScript template management',
                'required' => false,
            ],
        ],
        'seo_publishing' => [
            'typo3/cms-seo' => [
                'name' => 'SEO',
                'description' => 'Search engine optimization tools',
                'required' => false,
            ],
            'typo3/cms-redirects' => [
                'name' => 'Redirects',
                'description' => 'URL redirect management',
                'required' => false,
            ],
            'typo3/cms-scheduler' => [
                'name' => 'Scheduler',
                'description' => 'Task scheduling and automation',
                'required' => false,
            ],
        ],
        'advanced' => [
            'typo3/cms-adminpanel' => [
                'name' => 'Admin Panel',
                'description' => 'Frontend admin panel for debugging',
                'required' => false,
            ],
            'typo3/cms-viewpage' => [
                'name' => 'View Page',
                'description' => 'Preview pages in the backend',
                'required' => false,
            ],
            'typo3/cms-sys-note' => [
                'name' => 'System Notes',
                'description' => 'Internal notes and messages',
                'required' => false,
            ],
            'typo3/cms-reactions' => [
                'name' => 'Reactions',
                'description' => 'Incoming webhooks and reactions',
                'required' => false,
            ],
            'typo3/cms-webhooks' => [
                'name' => 'Webhooks',
                'description' => 'Outgoing webhook support',
                'required' => false,
            ],
            'typo3/cms-workspaces' => [
                'name' => 'Workspaces',
                'description' => 'Staging and versioning workflows',
                'required' => false,
            ],
        ],
    ];

    private const CATEGORY_LABELS = [
        'core' => 'Core (Required)',
        'content' => 'Content & Templating',
        'user_management' => 'User Management',
        'infrastructure' => 'Infrastructure',
        'developer' => 'Developer Tools',
        'seo_publishing' => 'SEO & Publishing',
        'advanced' => 'Advanced Features',
    ];

    /**
     * Get all available TYPO3 packages grouped by category
     *
     * @return array<string, array{label: string, packages: array<string, array{name: string, description: string, required: bool}>}>
     */
    public function getAvailablePackages(): array
    {
        $result = [];

        foreach (self::TYPO3_PACKAGES as $category => $packages) {
            $result[$category] = [
                'label' => self::CATEGORY_LABELS[$category],
                'packages' => $packages,
            ];
        }

        return $result;
    }

    /**
     * Get the list of required (core) packages
     *
     * @return array<string>
     */
    public function getRequiredPackages(): array
    {
        $required = [];

        foreach (self::TYPO3_PACKAGES as $packages) {
            foreach ($packages as $packageName => $info) {
                if ($info['required']) {
                    $required[] = $packageName;
                }
            }
        }

        return $required;
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
        $bytes = $this->convertToBytes($memoryLimit);
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
     * Convert memory string to bytes
     */
    private function convertToBytes(string $value): int
    {
        $value = trim($value);

        if ($value === '-1') {
            return -1;
        }

        $unit = strtolower(substr($value, -1));
        $bytes = (int)$value;

        switch ($unit) {
            case 'g':
                $bytes *= 1024 * 1024 * 1024;
                break;
            case 'm':
                $bytes *= 1024 * 1024;
                break;
            case 'k':
                $bytes *= 1024;
                break;
        }

        return $bytes;
    }

    /**
     * Validate that a list of packages is valid
     *
     * @param array<string> $packages
     * @return array{valid: bool, errors: array<string>}
     */
    public function validatePackageSelection(array $packages): array
    {
        $errors = [];
        $allPackages = $this->getAllPackageNames();
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
    private function getAllPackageNames(): array
    {
        $names = [];

        foreach (self::TYPO3_PACKAGES as $packages) {
            foreach (array_keys($packages) as $packageName) {
                $names[] = $packageName;
            }
        }

        return $names;
    }
}
