<?php

declare(strict_types=1);

namespace TYPO3\Installer\Model;

/**
 * Read a string field from input, trim it, and return the default if absent or empty.
 *
 * @param array<string, mixed> $data
 */
function trimmedString(array $data, string $key, string $default = ''): string
{
    if (!isset($data[$key]) || !is_string($data[$key])) {
        return $default;
    }
    $trimmed = trim($data[$key]);
    return $trimmed === '' ? $default : $trimmed;
}

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
        public readonly string $installPath = 'typo3-test-install',
        public readonly ?string $phpBinary = null
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

        // Extract typo3Version with proper type checking and trimming
        $typo3Version = '13.4';
        if (isset($data['typo3Version'])) {
            $rawVersion = $data['typo3Version'];
            if (is_string($rawVersion) && trim($rawVersion) !== '') {
                $typo3Version = trim($rawVersion);
            } elseif (is_numeric($rawVersion)) {
                $typo3Version = (string)$rawVersion;
            }
        }

        $installPath = trimmedString($data, 'installPath', 'typo3-test-install');

        // Extract phpBinary if provided (trimmed; null when absent or empty)
        $phpBinary = null;
        if (isset($data['phpBinary']) && is_string($data['phpBinary'])) {
            $trimmed = trim($data['phpBinary']);
            if ($trimmed !== '') {
                $phpBinary = $trimmed;
            }
        }

        return new self(
            DatabaseConfig::fromArray($database),
            AdminConfig::fromArray($admin),
            SiteConfig::fromArray($site),
            $packages,
            $typo3Version,
            $installPath,
            $phpBinary
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

        // Trim everything except the password — trimming a user-chosen secret silently
        // alters credentials and can cause confusing lockouts.
        $password = is_string($data['password'] ?? null) ? $data['password'] : '';

        return new self(
            trimmedString($data, 'driver', 'pdo_mysql'),
            trimmedString($data, 'host', 'localhost'),
            $port,
            trimmedString($data, 'name'),
            trimmedString($data, 'user'),
            $password
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
        // Same rationale as DatabaseConfig: trim user-facing identifiers, never the password.
        $password = is_string($data['password'] ?? null) ? $data['password'] : '';

        return new self(
            trimmedString($data, 'username', 'admin'),
            $password,
            trimmedString($data, 'email')
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
     * @throws \InvalidArgumentException When baseUrl is malformed
     */
    public static function fromArray(array $data): self
    {
        $name = trimmedString($data, 'name', 'My TYPO3 Site');
        $baseUrl = trimmedString($data, 'baseUrl');

        if ($baseUrl !== '') {
            $parsed = parse_url($baseUrl);
            $scheme = is_array($parsed) && isset($parsed['scheme']) ? $parsed['scheme'] : null;
            $host = is_array($parsed) && isset($parsed['host']) ? $parsed['host'] : null;
            if ($scheme !== 'http' && $scheme !== 'https') {
                throw new \InvalidArgumentException('site.baseUrl must use http or https scheme');
            }
            if (!is_string($host) || $host === '') {
                throw new \InvalidArgumentException('site.baseUrl must include a host');
            }
        }

        return new self($name, $baseUrl);
    }
}