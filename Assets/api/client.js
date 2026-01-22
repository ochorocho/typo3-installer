class ApiClient {
    constructor(baseUrl = '') {
        // @todo: verify this statement, not sure if still needed.
        // Use URL API to properly parse and reconstruct base URL
        // Handles both PHAR mode and development mode
        const url = new URL(window.location.href);
        this.baseUrl = url.origin + url.pathname.replace(/\/$/, '');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
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
            body: JSON.stringify({ typo3Version })
        });
    }

    async validateRequirements(packages, typo3Version = '13.4') {
        return this.request('/api/validate-requirements', {
            method: 'POST',
            body: JSON.stringify({ packages, typo3Version })
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
            body: JSON.stringify(config)
        });
    }

    async install(config) {
        return this.request('/api/install', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    }

    async getStatus() {
        return this.request('/api/status', {
            method: 'GET'
        });
    }

    async getInfo() {
        return this.request('/api/info', {
            method: 'GET'
        });
    }
}

export const apiClient = new ApiClient();
