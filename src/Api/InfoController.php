<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use TYPO3\Installer\Service\InstallationInfoService;
use TYPO3\Installer\Service\PhpBinaryDetector;

/**
 * Controller for installation info endpoint
 */
class InfoController extends AbstractController
{
    private InstallationInfoService $infoService;
    private PhpBinaryDetector $phpDetector;

    public function __construct(
        ?InstallationInfoService $infoService = null,
        ?PhpBinaryDetector $phpDetector = null
    ) {
        $this->infoService = $infoService ?? new InstallationInfoService();
        $this->phpDetector = $phpDetector ?? new PhpBinaryDetector();
    }

    public function getInfo(Request $request): JsonResponse
    {
        $info = $this->infoService->getInfo();
        $phpDetection = $this->phpDetector->detect();

        return $this->successResponse([
            'installPath' => $info['installPath'],
            'webDir' => $info['webDir'],
            'pharPath' => $info['pharPath'],
            'isRunningFromPhar' => $info['isRunningFromPhar'],
            'composerPath' => $info['composerPath'],
            'validation' => $info['validation'],
            'phpVersion' => $phpDetection['fpmVersion'],
            'cliVersion' => $phpDetection['cliVersion'],
            'phpBinary' => $phpDetection['cliBinary'],
            'phpMismatch' => $phpDetection['mismatch'],
        ]);
    }

    public function getPhpInfo(Request $request): Response
    {
        ob_start();
        phpinfo();
        $phpinfo = ob_get_clean();

        return new Response($phpinfo ?: '', 200, [
            'Content-Type' => 'text/html; charset=utf-8',
        ]);
    }

    public function getDatabaseDrivers(Request $request): JsonResponse
    {
        $drivers = [];

        // MySQL / MariaDB via mysqli
        if (extension_loaded('mysqli')) {
            $drivers[] = [
                'value' => 'mysqli',
                'label' => 'MySQL / MariaDB (mysqli)',
                'defaultPort' => 3306,
            ];
        }

        // MySQL / MariaDB via PDO
        if (extension_loaded('pdo_mysql')) {
            $drivers[] = [
                'value' => 'pdo_mysql',
                'label' => 'MySQL / MariaDB (PDO)',
                'defaultPort' => 3306,
            ];
        }

        // PostgreSQL via PDO
        if (extension_loaded('pdo_pgsql')) {
            $drivers[] = [
                'value' => 'pdo_pgsql',
                'label' => 'PostgreSQL',
                'defaultPort' => 5432,
            ];
        }

        // SQLite via PDO (mainly for testing)
        if (extension_loaded('pdo_sqlite')) {
            $drivers[] = [
                'value' => 'pdo_sqlite',
                'label' => 'SQLite',
                'defaultPort' => null,
            ];
        }

        return $this->successResponse([
            'drivers' => $drivers,
        ]);
    }
}
