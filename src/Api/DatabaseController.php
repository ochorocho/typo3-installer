<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Service\DatabaseTester;

/**
 * Controller for database operations
 */
class DatabaseController extends AbstractController
{
    private DatabaseTester $tester;

    public function __construct(?DatabaseTester $tester = null)
    {
        $this->tester = $tester ?? new DatabaseTester();
    }

    public function test(Request $request): JsonResponse
    {
        if (($denied = $this->assertSameOrigin($request)) !== null) {
            return $denied;
        }

        $data = $this->parseJsonBody($request);

        if ($data instanceof JsonResponse) {
            return $data;
        }

        try {
            // Trim every string field except the password.
            $driver = $this->trimmedField($data, 'driver', 'pdo_mysql');
            $host = $this->trimmedField($data, 'host', 'localhost');
            $rawPort = $data['port'] ?? 3306;
            $port = is_int($rawPort) ? $rawPort : (is_numeric($rawPort) ? (int)$rawPort : 3306);
            $name = $this->trimmedField($data, 'name');
            $user = $this->trimmedField($data, 'user');
            $password = is_string($data['password'] ?? null) ? $data['password'] : '';

            $this->tester->testConnection($driver, $host, $port, $name, $user, $password);

            return $this->successResponse(['message' => 'Database connection successful']);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * @param array<string, mixed> $data
     */
    private function trimmedField(array $data, string $key, string $default = ''): string
    {
        if (!isset($data[$key]) || !is_string($data[$key])) {
            return $default;
        }
        $trimmed = trim($data[$key]);
        return $trimmed === '' ? $default : $trimmed;
    }
}
