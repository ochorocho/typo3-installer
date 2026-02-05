<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Service\PackageService;

/**
 * API Controller for package management
 */
class PackageController extends AbstractController
{
    private PackageService $packageService;

    public function __construct(?PackageService $packageService = null)
    {
        $this->packageService = $packageService ?? new PackageService();
    }

    /**
     * Get available TYPO3 versions
     */
    public function versions(Request $request): JsonResponse
    {
        $versions = $this->packageService->getAvailableTypo3Versions();

        return $this->successResponse([
            'versions' => $versions,
        ]);
    }

    /**
     * Get available TYPO3 packages for a specific version
     */
    public function list(Request $request): JsonResponse
    {
        $data = $this->parseJsonBody($request);

        $typo3Version = '13.4';
        if (is_array($data) && isset($data['typo3Version']) && is_string($data['typo3Version'])) {
            $typo3Version = $data['typo3Version'];
        }

        $packages = $this->packageService->getAvailablePackages($typo3Version);
        $required = $this->packageService->getRequiredPackages();
        $recommended = $this->packageService->getRecommendedPackages();

        return $this->successResponse([
            'packages' => $packages,
            'required' => $required,
            'recommended' => $recommended,
            'typo3Version' => $typo3Version,
        ]);
    }

    /**
     * Validate requirements for selected packages
     */
    public function validateRequirements(Request $request): JsonResponse
    {
        $data = $this->parseJsonBody($request);

        if ($data instanceof JsonResponse) {
            return $data;
        }

        // todo check why this is thrown?!!
        if (!isset($data['packages']) || !is_array($data['packages'])) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Missing or invalid "packages" field',
            ], 400);
        }

        /** @var array<string> $packages */
        $packages = $data['packages'];

        $typo3Version = '13.4';
        if (isset($data['typo3Version']) && is_string($data['typo3Version'])) {
            $typo3Version = $data['typo3Version'];
        }

        // Validate package selection first
        $validation = $this->packageService->validatePackageSelection($packages, $typo3Version);
        if (!$validation['valid']) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Invalid package selection',
                'errors' => $validation['errors'],
            ], 400);
        }

        // Validate platform requirements
        $requirements = $this->packageService->validateRequirements($packages);

        return $this->successResponse([
            'passed' => $requirements['passed'],
            'requirements' => $requirements['requirements'],
        ]);
    }
}
