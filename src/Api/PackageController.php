<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Service\PackageService;

/**
 * API Controller for package management
 */
class PackageController
{
    private PackageService $packageService;

    public function __construct()
    {
        $this->packageService = new PackageService();
    }

    /**
     * Get available TYPO3 packages
     */
    public function list(Request $request): JsonResponse
    {
        $packages = $this->packageService->getAvailablePackages();
        $required = $this->packageService->getRequiredPackages();

        return new JsonResponse([
            'success' => true,
            'packages' => $packages,
            'required' => $required,
        ]);
    }

    /**
     * Validate requirements for selected packages
     */
    public function validateRequirements(Request $request): JsonResponse
    {
        $content = $request->getContent();
        /** @var array<string, mixed>|null $data */
        $data = json_decode($content !== '' ? $content : '{}', true);

        if (!is_array($data) || !isset($data['packages']) || !is_array($data['packages'])) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Missing or invalid "packages" field',
            ], 400);
        }

        /** @var array<string> $packages */
        $packages = $data['packages'];

        // Validate package selection first
        $validation = $this->packageService->validatePackageSelection($packages);
        if (!$validation['valid']) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Invalid package selection',
                'errors' => $validation['errors'],
            ], 400);
        }

        // Validate platform requirements
        $requirements = $this->packageService->validateRequirements($packages);

        return new JsonResponse([
            'success' => true,
            'passed' => $requirements['passed'],
            'requirements' => $requirements['requirements'],
        ]);
    }
}
