<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

/**
 * Service to compute installation paths based on PHAR location
 *
 * When running from PHAR:
 * - PHAR at: /var/www/html/project/public/typo3-installer.phar
 * - Install directory: /var/www/html/project/ (parent of PHAR directory)
 * - Web directory: "public" (basename of PHAR directory)
 */
class InstallationInfoService
{
    /**
     * Get the directory where TYPO3 will be installed (project root)
     *
     * This is the parent of the directory containing the PHAR file.
     */
    public function getInstallDirectory(): string
    {
        $pharDirectory = $this->getPharDirectory();

        // Return parent directory of where PHAR is located
        return dirname($pharDirectory);
    }

    /**
     * Get the web directory name (basename of PHAR directory)
     *
     * This is used as the "web-dir" in composer.json for TYPO3.
     */
    public function getWebDir(): string
    {
        $pharDirectory = $this->getPharDirectory();

        return basename($pharDirectory);
    }

    /**
     * Get the directory containing the PHAR file
     */
    public function getPharDirectory(): string
    {
        if ($this->isRunningFromPhar()) {
            // Get the filesystem path of the PHAR (not the phar:// stream)
            return dirname(\Phar::running(false));
        }

        // Development mode: use public/ directory relative to project root
        return dirname(__DIR__, 2) . '/public';
    }

    /**
     * Check if we're running from a PHAR file
     */
    public function isRunningFromPhar(): bool
    {
        return \Phar::running(false) !== '';
    }

    /**
     * Get the full path to the PHAR file
     */
    public function getPharPath(): ?string
    {
        if (!$this->isRunningFromPhar()) {
            return null;
        }

        return \Phar::running(false);
    }

    /**
     * Validate the installation location
     *
     * @return array{valid: bool, warnings: array<string>}
     */
    public function validateInstallLocation(): array
    {
        $installDir = $this->getInstallDirectory();
        $webDir = $this->getWebDir();
        $warnings = [];

        // Check if install directory is writable
        if (!is_writable($installDir)) {
            $warnings[] = sprintf('Install directory is not writable: %s', $installDir);
        }

        // Check for existing TYPO3 installation markers
        $existingMarkers = [
            $installDir . '/composer.json',
            $installDir . '/config/system/settings.php',
            $installDir . '/vendor/typo3',
        ];

        foreach ($existingMarkers as $marker) {
            if (file_exists($marker)) {
                $warnings[] = sprintf('Existing file/directory found: %s (will be overwritten)', $marker);
            }
        }

        // Check web directory
        $webDirPath = $installDir . '/' . $webDir;
        if (file_exists($webDirPath) && !is_writable($webDirPath)) {
            $warnings[] = sprintf('Web directory is not writable: %s', $webDirPath);
        }

        return [
            'valid' => empty(array_filter($warnings, fn($w) => str_contains($w, 'not writable'))),
            'warnings' => $warnings,
        ];
    }

    /**
     * Get all installation info as an array
     *
     * @return array{installPath: string, webDir: string, pharPath: string, isRunningFromPhar: bool, validation: array{valid: bool, warnings: array<string>}}
     */
    public function getInfo(): array
    {
        return [
            'installPath' => $this->getInstallDirectory(),
            'webDir' => $this->getWebDir(),
            'pharPath' => $this->getPharDirectory(),
            'isRunningFromPhar' => $this->isRunningFromPhar(),
            'validation' => $this->validateInstallLocation(),
        ];
    }
}
