<?php

declare(strict_types=1);

namespace TYPO3\Installer\Service;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Exception\TransferException;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;

/**
 * HTTP client wrapper with retry logic and caching
 *
 * Provides a robust HTTP client for external API calls with:
 * - Automatic retry on timeout/connection errors (configurable retries)
 * - In-memory response caching to minimize API calls
 * - Configurable timeouts
 * - Proper error handling without PHP warnings
 */
class HttpClient
{
    /**
     * Default timeout in seconds
     */
    private const DEFAULT_TIMEOUT = 10;

    /**
     * Default connect timeout in seconds
     */
    private const DEFAULT_CONNECT_TIMEOUT = 5;

    /**
     * Maximum number of retries on failure
     */
    private const MAX_RETRIES = 2;

    /**
     * Delay between retries in milliseconds
     */
    private const RETRY_DELAY_MS = 500;

    /**
     * User agent string
     */
    private const USER_AGENT = 'TYPO3-Installer/1.0 (Guzzle)';

    /**
     * In-memory cache for responses
     *
     * @var array<string, array{data: string, timestamp: int}>
     */
    private array $cache = [];

    /**
     * Cache TTL in seconds (5 minutes)
     */
    private const CACHE_TTL = 300;

    private Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? $this->createClient();
    }

    /**
     * Create a Guzzle client with retry middleware
     */
    private function createClient(): Client
    {
        $stack = HandlerStack::create();

        // Add retry middleware
        $stack->push(Middleware::retry(
            $this->createRetryDecider(),
            $this->createRetryDelay()
        ));

        return new Client([
            'handler' => $stack,
            'timeout' => self::DEFAULT_TIMEOUT,
            'connect_timeout' => self::DEFAULT_CONNECT_TIMEOUT,
            'headers' => [
                'User-Agent' => self::USER_AGENT,
                'Accept' => 'application/json',
            ],
            'http_errors' => false, // Don't throw on 4xx/5xx
        ]);
    }

    /**
     * Create retry decider callback
     *
     * @return callable
     */
    private function createRetryDecider(): callable
    {
        return function (
            int $retries,
            Request $request,
            ?Response $response = null,
            ?\Throwable $exception = null
        ): bool {
            // Don't retry if we've exceeded max retries
            if ($retries >= self::MAX_RETRIES) {
                return false;
            }

            // Retry on connection errors (timeout, DNS, etc.)
            if ($exception instanceof ConnectException) {
                return true;
            }

            // Retry on specific HTTP status codes
            if ($response !== null) {
                $statusCode = $response->getStatusCode();
                // Retry on 429 (rate limit), 502, 503, 504 (server errors)
                if (in_array($statusCode, [429, 502, 503, 504], true)) {
                    return true;
                }
            }

            // Retry on request timeout exceptions
            if ($exception instanceof RequestException) {
                return true;
            }

            return false;
        };
    }

    /**
     * Create retry delay callback (exponential backoff)
     *
     * @return callable
     */
    private function createRetryDelay(): callable
    {
        return function (int $retries): int {
            // Exponential backoff: 500ms, 1000ms, 2000ms...
            return self::RETRY_DELAY_MS * (int)pow(2, $retries);
        };
    }

    /**
     * Fetch data from a URL with caching
     *
     * @param string $url The URL to fetch
     * @param bool $useCache Whether to use cached responses
     * @return string|null The response body or null on failure
     */
    public function get(string $url, bool $useCache = true): ?string
    {
        // Check cache first
        if ($useCache && $this->isCached($url)) {
            return $this->getFromCache($url);
        }

        try {
            $response = $this->client->get($url);

            $statusCode = $response->getStatusCode();

            // Return null for error status codes
            if ($statusCode >= 400) {
                return null;
            }

            $body = (string)$response->getBody();

            // Cache successful responses
            if ($useCache && $statusCode === 200) {
                $this->setCache($url, $body);
            }

            return $body;
        } catch (TransferException $e) {
            // All Guzzle exceptions extend TransferException
            // Log if needed, return null
            return null;
        } catch (\Throwable $e) {
            // Catch any other unexpected errors
            return null;
        }
    }

    /**
     * Fetch JSON data from a URL
     *
     * @param string $url The URL to fetch
     * @param bool $useCache Whether to use cached responses
     * @return array<mixed>|null The decoded JSON or null on failure
     */
    public function getJson(string $url, bool $useCache = true): ?array
    {
        $response = $this->get($url, $useCache);

        if ($response === null) {
            return null;
        }

        $data = json_decode($response, true);

        if (!is_array($data)) {
            return null;
        }

        return $data;
    }

    /**
     * Check if a URL response is cached and valid
     */
    private function isCached(string $url): bool
    {
        if (!isset($this->cache[$url])) {
            return false;
        }

        $cached = $this->cache[$url];
        $age = time() - $cached['timestamp'];

        return $age < self::CACHE_TTL;
    }

    /**
     * Get cached response for a URL
     */
    private function getFromCache(string $url): ?string
    {
        return $this->cache[$url]['data'] ?? null;
    }

    /**
     * Cache a response
     */
    private function setCache(string $url, string $data): void
    {
        $this->cache[$url] = [
            'data' => $data,
            'timestamp' => time(),
        ];
    }

    /**
     * Clear the cache
     */
    public function clearCache(): void
    {
        $this->cache = [];
    }

    /**
     * Pre-warm cache with multiple URLs concurrently
     *
     * This is useful for batch fetching multiple package details at once.
     *
     * @param array<string> $urls URLs to fetch
     */
    public function preWarmCache(array $urls): void
    {
        // Filter out already cached URLs
        $urlsToFetch = array_filter($urls, fn(string $url): bool => !$this->isCached($url));

        if (empty($urlsToFetch)) {
            return;
        }

        // Use Guzzle's concurrent request capabilities
        $promises = [];
        foreach ($urlsToFetch as $url) {
            $promises[$url] = $this->client->getAsync($url);
        }

        // Wait for all requests to complete
        /** @var array<string, array{state: string, value?: Response, reason?: \Throwable}> $results */
        $results = \GuzzleHttp\Promise\Utils::settle($promises)->wait();

        // Cache successful responses
        foreach ($results as $url => $result) {
            if ($result['state'] === 'fulfilled' && isset($result['value'])) {
                /** @var Response $response */
                $response = $result['value'];
                if ($response->getStatusCode() === 200) {
                    $this->setCache($url, (string)$response->getBody());
                }
            }
        }
    }
}
