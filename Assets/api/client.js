/**
 * Custom error class for API errors with additional context
 */
class ApiError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'ApiError';
        this.details = details;
        this.isNetworkError = details.isNetworkError || false;
        this.isTimeout = details.isTimeout || false;
        this.statusCode = details.statusCode || null;
        this.endpoint = details.endpoint || null;
    }

    /**
     * Get a user-friendly error message with suggested action
     */
    getUserMessage() {
        if (this.isNetworkError) {
            return 'Network connection failed. Please check your internet connection and try again.';
        }
        if (this.isTimeout) {
            return 'The request timed out. The server might be busy. Please try again.';
        }
        if (this.statusCode === 500) {
            return 'A server error occurred. Please check the server logs for more details.';
        }
        if (this.statusCode === 404) {
            return 'The requested resource was not found. Please refresh the page and try again.';
        }
        return this.message || 'An unexpected error occurred. Please try again.';
    }
}

class ApiClient {
    constructor(baseUrl = '') {
        const url = new URL(window.location.href);
        this.baseUrl = url.origin + url.pathname.replace(/\/$/, '');
        this.defaultTimeout = 30000; // 30 seconds
    }

    /**
     * Make an API request with timeout and error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const timeout = options.timeout || this.defaultTimeout;

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: controller.signal,
            ...options
        };

        // Remove our custom timeout option from fetch config
        delete config.timeout;

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Try to parse JSON response
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (parseError) {
                    throw new ApiError('Invalid JSON response from server', {
                        endpoint,
                        statusCode: response.status,
                        parseError: parseError.message
                    });
                }
            } else {
                // Non-JSON response - likely an error page
                const text = await response.text();
                throw new ApiError('Server returned an unexpected response', {
                    endpoint,
                    statusCode: response.status,
                    responsePreview: text.substring(0, 200)
                });
            }

            if (!response.ok) {
                throw new ApiError(data.message || `Request failed with status ${response.status}`, {
                    endpoint,
                    statusCode: response.status,
                    serverError: data.error || null,
                    details: data.details || null
                });
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);

            // Handle abort (timeout)
            if (error.name === 'AbortError') {
                throw new ApiError('Request timed out', {
                    endpoint,
                    isTimeout: true
                });
            }

            // Handle network errors
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new ApiError('Network connection failed', {
                    endpoint,
                    isNetworkError: true,
                    originalError: error.message
                });
            }

            // Re-throw ApiError as-is
            if (error instanceof ApiError) {
                throw error;
            }

            // Wrap other errors
            throw new ApiError(error.message || 'An unexpected error occurred', {
                endpoint,
                originalError: error.toString()
            });
        }
    }

    async getVersions() {
        return this.request('/api/versions', {
            method: 'POST'
        });
    }

    async getPackages(typo3Version = '13.4') {
        return this.request('/api/packages', {
            method: 'POST',
            body: JSON.stringify({ typo3Version }),
            timeout: 60000 // 60 seconds for package fetching
        });
    }

    async validateRequirements(packages, typo3Version = '13.4') {
        return this.request('/api/validate-requirements', {
            method: 'POST',
            body: JSON.stringify({ packages, typo3Version }),
            timeout: 60000 // 60 seconds for requirements validation
        });
    }

    async checkRequirements() {
        return this.request('/api/check-requirements', {
            method: 'POST'
        });
    }

    async testDatabase(config) {
        return this.request('/api/test-database', {
            method: 'POST',
            body: JSON.stringify(config),
            timeout: 15000 // 15 seconds for database test
        });
    }

    async install(config) {
        return this.request('/api/install', {
            method: 'POST',
            body: JSON.stringify(config),
            timeout: 60000 // 60 seconds to start installation
        });
    }

    async getStatus() {
        return this.request('/api/status', {
            method: 'GET',
            timeout: 10000 // 10 seconds for status check
        });
    }

    async getInfo() {
        return this.request('/api/info', {
            method: 'GET'
        });
    }
}

export const apiClient = new ApiClient();
export { ApiError };
