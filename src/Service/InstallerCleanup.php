<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

/**
 * Service for cleaning up installer files after successful installation
 */
class InstallerCleanup
{
    /**
     * Delete the installer PHAR file
     */
    public function cleanupInstaller(): bool
    {
        // Determine if running from PHAR
        $pharPath = \Phar::running(false);

        if ($pharPath === '') {
            // Not running from PHAR, nothing to cleanup
            return false;
        }

        // Schedule deletion on shutdown
        register_shutdown_function(function () use ($pharPath): void {
            if (file_exists($pharPath)) {
                @unlink($pharPath);
            }
        });

        return true;
    }

    /**
     * Create a cleanup script that can be run manually
     */
    public function createCleanupScript(): string
    {
        $pharPath = \Phar::running(false);

        if ($pharPath === '') {
            return '';
        }

        $scriptPath = dirname($pharPath) . '/cleanup-installer.php';

        $script = <<<'PHP'
<?php
// TYPO3 Installer Cleanup Script
// This script will delete the installer PHAR file

$installerPath = __DIR__ . '/typo3-installer.phar';

if (file_exists($installerPath)) {
    if (unlink($installerPath)) {
        echo "✓ Installer deleted successfully\n";
        echo "✓ You can now delete this cleanup script\n";
    } else {
        echo "✗ Failed to delete installer\n";
        echo "Please delete manually: " . $installerPath . "\n";
    }
} else {
    echo "Installer file not found\n";
}

// Self-destruct
@unlink(__FILE__);
PHP;

        file_put_contents($scriptPath, $script);

        return $scriptPath;
    }
}
