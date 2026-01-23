<?php

declare(strict_types=1);

namespace TYPO3\Installer\Utility;

/**
 * Utility class for type-safe array value extraction
 *
 * Provides helper methods to safely extract typed values from mixed arrays,
 * reducing repetitive type validation code throughout the codebase.
 */
final class TypedArrayParser
{
    /**
     * Get a string value from array with default fallback
     *
     * @param array<string, mixed> $data
     */
    public static function getString(array $data, string $key, string $default = ''): string
    {
        $value = $data[$key] ?? null;
        return is_string($value) ? $value : $default;
    }

    /**
     * Get an integer value from array with default fallback
     *
     * @param array<string, mixed> $data
     */
    public static function getInt(array $data, string $key, int $default = 0): int
    {
        $value = $data[$key] ?? null;

        if (is_int($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int)$value;
        }

        return $default;
    }

    /**
     * Get a float value from array with default fallback
     *
     * @param array<string, mixed> $data
     */
    public static function getFloat(array $data, string $key, float $default = 0.0): float
    {
        $value = $data[$key] ?? null;

        if (is_float($value) || is_int($value)) {
            return (float)$value;
        }

        if (is_numeric($value)) {
            return (float)$value;
        }

        return $default;
    }

    /**
     * Get a boolean value from array with default fallback
     *
     * @param array<string, mixed> $data
     */
    public static function getBool(array $data, string $key, bool $default = false): bool
    {
        $value = $data[$key] ?? null;

        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            return in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true);
        }

        if (is_int($value)) {
            return $value !== 0;
        }

        return $default;
    }

    /**
     * Get an array value from array with default fallback
     *
     * @param array<string, mixed> $data
     * @param array<mixed> $default
     * @return array<mixed>
     */
    public static function getArray(array $data, string $key, array $default = []): array
    {
        $value = $data[$key] ?? null;
        return is_array($value) ? $value : $default;
    }

    /**
     * Get a string array value from array with default fallback
     *
     * @param array<string, mixed> $data
     * @param array<string> $default
     * @return array<string>
     */
    public static function getStringArray(array $data, string $key, array $default = []): array
    {
        $value = $data[$key] ?? null;

        if (!is_array($value)) {
            return $default;
        }

        return array_values(array_filter($value, 'is_string'));
    }
}
