class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = window.location.href;
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

    async getPackages() {
        return this.request('/api/packages', {
            method: 'GET'
        });
    }

    async validateRequirements(packages) {
        return this.request('/api/validate-requirements', {
            method: 'POST',
            body: JSON.stringify({packages})
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
