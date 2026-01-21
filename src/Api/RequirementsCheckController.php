<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use TYPO3\Installer\Service\RequirementsChecker;

/**
 * Controller for checking system requirements
 */
class RequirementsCheckController
{
    private RequirementsChecker $checker;

    public function __construct()
    {
        $this->checker = new RequirementsChecker();
    }

    public function check(Request $request): JsonResponse
    {
        $requirements = $this->checker->check();

        return new JsonResponse([
            'success' => true,
            'requirements' => $requirements
        ]);
    }
}
