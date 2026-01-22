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
        $data = $this->parseJsonBody($request);

        if ($data instanceof JsonResponse) {
            return $data;
        }

        try {
            $driver = is_string($data['driver'] ?? null) ? $data['driver'] : 'pdo_mysql';
            $host = is_string($data['host'] ?? null) ? $data['host'] : 'localhost';
            $rawPort = $data['port'] ?? 3306;
            $port = is_int($rawPort) ? $rawPort : (is_numeric($rawPort) ? (int)$rawPort : 3306);
            $name = is_string($data['name'] ?? null) ? $data['name'] : '';
            $user = is_string($data['user'] ?? null) ? $data['user'] : '';
            $password = is_string($data['password'] ?? null) ? $data['password'] : '';

            $this->tester->testConnection($driver, $host, $port, $name, $user, $password);

            return $this->successResponse(['message' => 'Database connection successful']);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
}
