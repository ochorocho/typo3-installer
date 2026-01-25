<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
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
            'phpBinary' => $phpDetection['cliBinary'],
            'phpMismatch' => $phpDetection['mismatch'],
        ]);
    }
}
