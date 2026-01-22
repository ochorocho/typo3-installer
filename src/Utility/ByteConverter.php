<?php

declare(strict_types=1);

namespace TYPO3\Installer\Utility;

/**
 * Utility class for converting memory/size strings to bytes
 */
final class ByteConverter
{
    /**
     * Convert a memory size string to bytes
     *
     * Handles values like "128M", "1G", "512K", "-1" (unlimited)
     *
     * @param string $value Memory size string (e.g., "256M", "1G", "512K")
     * @return int Size in bytes, or -1 for unlimited
     */
    public static function toBytes(string $value): int
    {
        $value = trim($value);

        if ($value === '-1') {
            return -1;
        }

        $unit = strtolower($value[strlen($value) - 1]);
        $bytes = (int)$value;

        return match ($unit) {
            'g' => $bytes * 1024 * 1024 * 1024,
            'm' => $bytes * 1024 * 1024,
            'k' => $bytes * 1024,
            default => $bytes,
        };
    }
}
