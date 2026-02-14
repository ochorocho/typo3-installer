<?php

declare(strict_types=1);

namespace TYPO3\Installer\Model;

/**
 * Value object for detailed PHP binary validation results
 *
 * Provides structured error information to help users troubleshoot
 * custom PHP binary path issues.
 */
class BinaryValidationResult
{
    /**
     * Error codes for programmatic handling
     */
    public const ERROR_NOT_FOUND = 'not_found';
    public const ERROR_NOT_EXECUTABLE = 'not_executable';
    public const ERROR_SYMLINK_BROKEN = 'symlink_broken';
    public const ERROR_EXECUTION_FAILED = 'execution_failed';
    public const ERROR_TIMEOUT = 'timeout';
    public const ERROR_INVALID_OUTPUT = 'invalid_output';
    public const ERROR_WRAPPER_SCRIPT = 'wrapper_script';

    public function __construct(
        public readonly bool $valid,
        public readonly ?string $version = null,
        public readonly ?string $error = null,
        public readonly ?string $errorCode = null,
        public readonly ?string $resolvedPath = null,
        public readonly ?string $debugInfo = null,
        public readonly ?string $sapi = null
    ) {}

    /**
     * Create a successful validation result
     */
    public static function success(string $version, ?string $resolvedPath = null, ?string $sapi = null): self
    {
        return new self(
            valid: true,
            version: $version,
            resolvedPath: $resolvedPath,
            sapi: $sapi
        );
    }

    /**
     * Create a failure result for a wrapper script (non-CLI SAPI)
     */
    public static function wrapperScript(string $path, string $version, string $sapi, ?string $resolvedPath = null): self
    {
        return new self(
            valid: false,
            version: $version,
            error: sprintf('Binary is a wrapper script using SAPI "%s" instead of CLI', $sapi),
            errorCode: self::ERROR_WRAPPER_SCRIPT,
            resolvedPath: $resolvedPath,
            debugInfo: sprintf('Detected SAPI: %s at path: %s', $sapi, $path),
            sapi: $sapi
        );
    }

    /**
     * Create a failure result for path not found
     */
    public static function notFound(string $path): self
    {
        return new self(
            valid: false,
            error: sprintf('Path does not exist: %s', $path),
            errorCode: self::ERROR_NOT_FOUND
        );
    }

    /**
     * Create a failure result for broken symlink
     */
    public static function symlinkBroken(string $path, string $target): self
    {
        return new self(
            valid: false,
            error: sprintf('Symlink is broken: %s', $path),
            errorCode: self::ERROR_SYMLINK_BROKEN,
            debugInfo: sprintf('Target does not exist: %s', $target)
        );
    }

    /**
     * Create a failure result for non-executable file
     */
    public static function notExecutable(string $path, ?string $resolvedPath = null): self
    {
        return new self(
            valid: false,
            error: sprintf('File is not executable: %s', $path),
            errorCode: self::ERROR_NOT_EXECUTABLE,
            resolvedPath: $resolvedPath
        );
    }

    /**
     * Create a failure result for execution failure
     */
    public static function executionFailed(string $path, string $debugInfo, ?string $resolvedPath = null): self
    {
        return new self(
            valid: false,
            error: 'Binary failed to execute or returned an error',
            errorCode: self::ERROR_EXECUTION_FAILED,
            resolvedPath: $resolvedPath,
            debugInfo: $debugInfo
        );
    }

    /**
     * Create a failure result for timeout
     */
    public static function timeout(string $path, int $timeoutSeconds, ?string $resolvedPath = null): self
    {
        return new self(
            valid: false,
            error: sprintf('Binary execution timed out after %d seconds', $timeoutSeconds),
            errorCode: self::ERROR_TIMEOUT,
            resolvedPath: $resolvedPath
        );
    }

    /**
     * Create a failure result for invalid output
     */
    public static function invalidOutput(string $path, string $debugInfo, ?string $resolvedPath = null): self
    {
        return new self(
            valid: false,
            error: 'Binary does not appear to be a valid PHP executable',
            errorCode: self::ERROR_INVALID_OUTPUT,
            resolvedPath: $resolvedPath,
            debugInfo: $debugInfo
        );
    }

    /**
     * Convert to array for JSON response
     *
     * @return array{valid: bool, version: ?string, error: ?string, errorCode: ?string, resolvedPath: ?string, debugInfo: ?string, sapi: ?string}
     */
    public function toArray(): array
    {
        return [
            'valid' => $this->valid,
            'version' => $this->version,
            'error' => $this->error,
            'errorCode' => $this->errorCode,
            'resolvedPath' => $this->resolvedPath,
            'debugInfo' => $this->debugInfo,
            'sapi' => $this->sapi,
        ];
    }
}
