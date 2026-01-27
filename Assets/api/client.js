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
        const externalSignal = options.signal;

        // Create abort controller for timeout
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

        // Combine external signal with timeout signal
        let combinedSignal;
        if (externalSignal) {
            if (typeof AbortSignal.any === 'function') {
                combinedSignal = AbortSignal.any([timeoutController.signal, externalSignal]);
            } else {
                // Fallback: create new controller that aborts when either signal aborts
                const combinedController = new AbortController();
                const abort = () => combinedController.abort();

                if (timeoutController.signal.aborted || externalSignal.aborted) {
                    combinedController.abort();
                } else {
                    timeoutController.signal.addEventListener('abort', abort, { once: true });
                    externalSignal.addEventListener('abort', abort, { once: true });
                }
                combinedSignal = combinedController.signal;
            }
        } else {
            combinedSignal = timeoutController.signal;
        }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: combinedSignal,
            ...options
        };

        // Remove our custom options from fetch config
        delete config.timeout;
        delete config.signal;
        config.signal = combinedSignal;

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

            // Handle abort - distinguish between timeout and external signal
            if (error.name === 'AbortError') {
                // If external signal was aborted, re-throw as AbortError (not timeout)
                if (externalSignal?.aborted) {
                    throw error;
                }
                // Otherwise it's a timeout
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

    async validateRequirements(packages, typo3Version = '13.4', options = {}) {
        return this.request('/api/validate-requirements', {
            method: 'POST',
            body: JSON.stringify({ packages, typo3Version }),
            timeout: 60000, // 60 seconds for requirements validation
            signal: options.signal
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

    async getPhpInfo() {
        const url = `${this.baseUrl}/api/phpinfo`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new ApiError('Failed to load PHP info', { statusCode: response.status });
        }
        return response.text();
    }

    async getDatabaseDrivers() {
        return this.request('/api/database-drivers', {
            method: 'GET'
        });
    }

    async detectPhp(options = {}) {
        return this.request('/api/detect-php', {
            method: 'POST',
            signal: options.signal
        });
    }

    async validatePhpBinary(binaryPath) {
        return this.request('/api/validate-php-binary', {
            method: 'POST',
            body: JSON.stringify({ binaryPath })
        });
    }

    /**
     * Start installation with SSE streaming
     * Returns an object with EventSource and control methods
     *
     * @param {Object} config Installation configuration
     * @param {Object} callbacks Event callbacks: onOutput, onProgress, onStep, onComplete, onError
     * @returns {Object} Control object with close() method
     */
    installWithStreaming(config, callbacks = {}) {
        const url = `${this.baseUrl}/api/install-stream`;

        // Use fetch with POST to send config, then read as stream
        const controller = new AbortController();

        const streamPromise = fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(config),
            signal: controller.signal
        }).then(async response => {
            if (!response.ok) {
                throw new ApiError(`Failed to start streaming: ${response.status}`, {
                    statusCode: response.status
                });
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (value) {
                        buffer += decoder.decode(value, { stream: !done });
                    }

                    // Parse SSE events from buffer
                    const lines = buffer.split('\n');
                    buffer = done ? '' : (lines.pop() || ''); // Process all lines on done

                    let currentEvent = null;
                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            currentEvent = line.substring(7).trim();
                        } else if (line.startsWith('data: ') && currentEvent) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                this._handleSseEvent(currentEvent, data, callbacks);
                            } catch (parseError) {
                                console.warn('Failed to parse SSE data:', line);
                            }
                            currentEvent = null;
                        }
                    }

                    if (done) break;
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    if (callbacks.onError) {
                        callbacks.onError(new ApiError('Stream connection lost', {
                            isNetworkError: true,
                            originalError: error.message
                        }));
                    }
                }
            }
        }).catch(error => {
            if (error.name !== 'AbortError' && callbacks.onError) {
                callbacks.onError(error instanceof ApiError ? error : new ApiError(error.message, {
                    isNetworkError: true
                }));
            }
        });

        return {
            close: () => controller.abort(),
            promise: streamPromise
        };
    }

    /**
     * Handle SSE events
     * @private
     */
    _handleSseEvent(event, data, callbacks) {
        switch (event) {
            case 'start':
                if (callbacks.onStart) callbacks.onStart(data);
                break;
            case 'step':
                if (callbacks.onStep) callbacks.onStep(data);
                break;
            case 'progress':
                if (callbacks.onProgress) callbacks.onProgress(data);
                break;
            case 'output':
                if (callbacks.onOutput) callbacks.onOutput(data);
                break;
            case 'complete':
                if (callbacks.onComplete) callbacks.onComplete(data);
                break;
            case 'error':
                if (callbacks.onError) {
                    callbacks.onError(new ApiError(data.message, {
                        details: data.details
                    }));
                }
                break;
            default:
                console.log('Unknown SSE event:', event, data);
        }
    }
}

export const apiClient = new ApiClient();
export { ApiError };
