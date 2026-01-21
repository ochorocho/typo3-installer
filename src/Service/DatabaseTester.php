<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

/**
 * Service for testing database connections
 */
class DatabaseTester
{
    /**
     * Test database connection
     *
     * @throws \RuntimeException
     */
    public function testConnection(
        string $driver,
        string $host,
        int $port,
        string $name,
        string $user,
        string $password
    ): void {
        try {
            $dsn = $this->buildDsn($driver, $host, $port, $name);

            $pdo = new \PDO(
                $dsn,
                $user,
                $password,
                [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                ]
            );

            // Test if we can actually query the database
            $pdo->query('SELECT 1');
        } catch (\PDOException $e) {
            throw new \RuntimeException(
                sprintf('Database connection failed: %s', $e->getMessage()),
                0,
                $e
            );
        }
    }

    private function buildDsn(string $driver, string $host, int $port, string $name): string
    {
        return match ($driver) {
            'pdo_mysql' => sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $name),
            'pdo_pgsql' => sprintf('pgsql:host=%s;port=%d;dbname=%s', $host, $port, $name),
            default => throw new \InvalidArgumentException(sprintf('Unsupported database driver: %s', $driver)),
        };
    }
}
