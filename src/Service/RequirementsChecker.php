<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use Phar;

/**
 * Service for checking TYPO3 system requirements
 *
 * @deprecated Use PackageService::validateRequirements() for dynamic package-based checks
 */
class RequirementsChecker
{
    private PackageService $packageService;

    public function __construct(?PackageService $packageService = null)
    {
        $this->packageService = $packageService ?? new PackageService();
    }

    /**
     * Check all system requirements
     *
     * Delegates to PackageService for dynamic requirements checking.
     * File permissions check is done locally as it requires the install path.
     *
     * @param array<string> $packages Optional list of packages (defaults to required + recommended)
     * @return array<int, array<string, mixed>>
     */
    public function check(string $installPath = '../', array $packages = [], string $typo3Version = '13.4'): array
    {
        // Use default packages if none provided
        if (empty($packages)) {
            $packages = array_merge(
                $this->packageService->getRequiredPackages(),
                $this->packageService->getRecommendedPackages()
            );
        }

        // Get dynamic requirements from PackageService
        $result = $this->packageService->validateRequirements($packages, $typo3Version);
        $requirements = $result['requirements'];

        // Add file permissions check (not package-dependent)
        $requirements[] = $this->checkFilePermissions($installPath);

        return $requirements;
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

        if (file_exists($targetDir)) {
            // If folder exists, check if it's writable
            $writable = is_writable($targetDir);
        } else {
            // If folder doesn't exist, check if parent directory is writable
            $parentDir = dirname($targetDir);
            $writable = is_writable($parentDir);
        }

        return [
            'title' => 'File Permissions',
            'description' => sprintf(
                'Installation directory must be writable (%s)',
                $targetDir
            ),
            'status' => $writable ? 'passed' : 'failed',
        ];
    }
}
