<?php

declare(strict_types=1);

namespace TYPO3\Installer\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use TYPO3\Installer\Service\DatabaseTester;

/**
 * Controller for database operations
 */
class DatabaseController
{
    private DatabaseTester $tester;

    public function __construct()
    {
        $this->tester = new DatabaseTester();
    }

    public function test(Request $request): JsonResponse
    {
        $content = $request->getContent();
        /** @var array<string, mixed>|null $data */
        $data = json_decode($content !== '' ? $content : '{}', true);

        if (!is_array($data)) {
            return new JsonResponse([
                'error' => true,
                'message' => 'Invalid request data',
            ], 400);
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

            return new JsonResponse([
                'success' => true,
                'message' => 'Database connection successful',
            ]);
        } catch (\Exception $e) {
            return new JsonResponse([
                'error' => true,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
