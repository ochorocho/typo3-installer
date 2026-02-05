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

            // SQLite doesn't use user/password
            if ($driver === 'pdo_sqlite') {
                $pdo = new \PDO(
                    $dsn,
                    null,
                    null,
                    [
                        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                        \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                    ]
                );
            } else {
                $pdo = new \PDO(
                    $dsn,
                    $user,
                    $password,
                    [
                        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                        \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                    ]
                );
            }

            // Test if we can actually query the database
            $pdo->query('SELECT 1');

            // Verify the database is empty (TYPO3 requires a fresh database)
            $tableCountQuery = match ($driver) {
                'pdo_mysql' => 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()',
                'pdo_pgsql' => "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'",
                'pdo_sqlite' => "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
                default => null,
            };

            if ($tableCountQuery !== null) {
                $stmt = $pdo->query($tableCountQuery);
                if ($stmt === false) {
                    throw new \RuntimeException('Failed to query table count');
                }
                $tableCount = (int)$stmt->fetchColumn();
                if ($tableCount > 0) {
                    throw new \RuntimeException(
                        sprintf(
                            'The database is not empty (%d table%s found). Please select an empty database for TYPO3 installation.',
                            $tableCount,
                            $tableCount !== 1 ? 's' : ''
                        )
                    );
                }
            }
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
            'pdo_sqlite' => sprintf('sqlite:%s', $name),
            default => throw new \InvalidArgumentException(sprintf('Unsupported database driver: %s', $driver)),
        };
    }
}
