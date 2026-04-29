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
     * Reject any state-changing request that doesn't come from a same-origin
     * browser context. Returns null when the request is allowed; a 403 JSON
     * response otherwise. GET / HEAD requests bypass this check — browsers
     * (legitimately) do not send `Origin` for same-origin GETs, so we cannot
     * use it as a signal there.
     *
     * For POST and other state-changing methods, the `Origin` header MUST be
     * present AND match the request's scheme+host. Missing Origin (typical
     * for non-browser clients like curl) and the literal string "null"
     * (opaque origins, file://, sandboxed iframes) are both rejected — the
     * installer is only intended to be driven by its own bundled frontend.
     */
    protected function assertSameOrigin(Request $request): ?JsonResponse
    {
        if ($request->isMethod('GET') || $request->isMethod('HEAD')) {
            return null;
        }

        $origin = $request->headers->get('Origin');
        if ($origin === null || $origin === '' || $origin === 'null') {
            return $this->errorResponse('Cross-origin request rejected', 403);
        }

        $expected = $request->getSchemeAndHttpHost();
        if ($origin !== $expected) {
            return $this->errorResponse('Cross-origin request rejected', 403);
        }

        return null;
    }

    /**
     * Create a success JSON response
     *
     * @param array<string, mixed> $data Additional data to include in response
     */
    protected function successResponse(array $data = []): JsonResponse
    {
        return $this->withSecurityHeaders(
            new JsonResponse(array_merge(['success' => true], $data))
        );
    }

    /**
     * Create an error JSON response
     *
     * @param string $message Error message
     * @param int $statusCode HTTP status code (default: 400)
     */
    protected function errorResponse(string $message, int $statusCode = 400): JsonResponse
    {
        return $this->withSecurityHeaders(new JsonResponse([
            'error' => true,
            'message' => $message,
        ], $statusCode));
    }

    /**
     * Apply default security headers to a JSON API response. The installer's
     * API never serves embeddable resources, so we deny framing, forbid
     * caching, suppress referrer leakage, and pin the content type.
     */
    private function withSecurityHeaders(JsonResponse $response): JsonResponse
    {
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Cache-Control', 'no-store');
        return $response;
    }
}