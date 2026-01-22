<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Service\RequirementsChecker;

/**
 * Controller for checking system requirements
 */
class RequirementsCheckController extends AbstractController
{
    private RequirementsChecker $checker;

    public function __construct(?RequirementsChecker $checker = null)
    {
        $this->checker = $checker ?? new RequirementsChecker();
    }

    public function check(Request $request): JsonResponse
    {
        $requirements = $this->checker->check();

        return $this->successResponse(['requirements' => $requirements]);
    }
}
