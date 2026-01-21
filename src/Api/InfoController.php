<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Service\InstallationInfoService;

/**
 * Controller for installation info endpoint
 */
class InfoController
{
    private InstallationInfoService $infoService;

    public function __construct()
    {
        $this->infoService = new InstallationInfoService();
    }

    public function getInfo(Request $request): JsonResponse
    {
        $info = $this->infoService->getInfo();

        return new JsonResponse([
            'success' => true,
            'installPath' => $info['installPath'],
            'webDir' => $info['webDir'],
            'pharPath' => $info['pharPath'],
            'isRunningFromPhar' => $info['isRunningFromPhar'],
            'validation' => $info['validation'],
        ]);
    }
}
