<?php

declare(strict_types=1);

namespace TYPO3\Installer\Model;

/**
 * Installation configuration model
 */
class InstallationConfig
{
    /**
     * @param array<string> $packages
     */
    public function __construct(
        public readonly DatabaseConfig $database,
        public readonly AdminConfig $admin,
        public readonly SiteConfig $site,
        public readonly array $packages,
        public readonly string $typo3Version = '13.4',
        public readonly string $installPath = 'typo3-test-install'
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        /** @var array<string> $packages */
        $packages = $data['packages'] ?? [];

        /** @var array<string, mixed> $database */
        $database = $data['database'] ?? [];

        /** @var array<string, mixed> $admin */
        $admin = $data['admin'] ?? [];

        /** @var array<string, mixed> $site */
        $site = $data['site'] ?? [];

        return new self(
            DatabaseConfig::fromArray($database),
            AdminConfig::fromArray($admin),
            SiteConfig::fromArray($site),
            $packages,
            is_string($data['typo3Version'] ?? null) ? $data['typo3Version'] : '13.4',
            is_string($data['installPath'] ?? null) ? $data['installPath'] : 'typo3-test-install'
        );
    }
}

/**
 * Database configuration
 */
class DatabaseConfig
{
    public function __construct(
        public readonly string $driver,
        public readonly string $host,
        public readonly int $port,
        public readonly string $name,
        public readonly string $user,
        public readonly string $password
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $rawPort = $data['port'] ?? 3306;
        $port = is_int($rawPort) ? $rawPort : (is_numeric($rawPort) ? (int)$rawPort : 3306);

        return new self(
            is_string($data['driver'] ?? null) ? $data['driver'] : 'pdo_mysql',
            is_string($data['host'] ?? null) ? $data['host'] : 'localhost',
            $port,
            is_string($data['name'] ?? null) ? $data['name'] : '',
            is_string($data['user'] ?? null) ? $data['user'] : '',
            is_string($data['password'] ?? null) ? $data['password'] : ''
        );
    }
}

/**
 * Admin account configuration
 */
class AdminConfig
{
    public function __construct(
        public readonly string $username,
        public readonly string $password,
        public readonly string $email
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            is_string($data['username'] ?? null) ? $data['username'] : 'admin',
            is_string($data['password'] ?? null) ? $data['password'] : '',
            is_string($data['email'] ?? null) ? $data['email'] : ''
        );
    }
}

/**
 * Site configuration
 */
class SiteConfig
{
    public function __construct(
        public readonly string $name,
        public readonly string $baseUrl
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            is_string($data['name'] ?? null) ? $data['name'] : 'My TYPO3 Site',
            is_string($data['baseUrl'] ?? null) ? $data['baseUrl'] : ''
        );
    }
}
