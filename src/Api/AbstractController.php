<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Base controller providing common functionality for API endpoints
 */
abstract class AbstractController
{
    /**
     * Parse JSON body from request
     *
     * @return array<string, mixed>|JsonResponse Returns parsed array on success, JsonResponse on error
     */
    protected function parseJsonBody(Request $request): array|JsonResponse
    {
        $content = $request->getContent();
        /** @var array<string, mixed>|null $data */
        $data = json_decode($content !== '' ? $content : '{}', true);

        if (!is_array($data)) {
            return $this->errorResponse('Invalid request data');
        }

        return $data;
    }

    /**
     * Create a success JSON response
     *
     * @param array<string, mixed> $data Additional data to include in response
     */
    protected function successResponse(array $data = []): JsonResponse
    {
        return new JsonResponse(array_merge(['success' => true], $data));
    }

    /**
     * Create an error JSON response
     *
     * @param string $message Error message
     * @param int $statusCode HTTP status code (default: 400)
     */
    protected function errorResponse(string $message, int $statusCode = 400): JsonResponse
    {
        return new JsonResponse([
            'error' => true,
            'message' => $message,
        ], $statusCode);
    }
}
