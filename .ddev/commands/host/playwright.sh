#!/usr/bin/env bash

## Description: Run e2e tests using playwright
## Usage: playwright [browser|<playwright options>]
## Example: "ddev playwright" (run tests headless)
## Example: "ddev playwright browser" (open UI in browser)
## Example: "ddev playwright --headed" (run tests with browser visible)
## Example: "ddev playwright tests/example.spec.ts" (run specific test)

set -euo pipefail

# Track background jobs for cleanup
BACKGROUND_PIDS=()

kill_playwright() {
    ddev exec "pkill -9 -f playwright 2>/dev/null || true" 2>/dev/null || true
}

cleanup() {
    echo ""
    echo "Cleaning up..."

    # Kill background jobs started by this script
    if [[ ${#BACKGROUND_PIDS[@]} -gt 0 ]]; then
        for pid in "${BACKGROUND_PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done
    fi

    # Kill playwright processes in container
    kill_playwright

    echo "Done."
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Clean up any leftover processes
echo "Killing any existing playwright processes..."
kill_playwright

# Get port configuration (only needed for browser mode)
container_port=""
https_port=""

if [[ "${1:-}" == "browser" ]]; then
    container_port=$(ddev exec "yq '.web_extra_exposed_ports[] | select(.name == \"playwright\") | .container_port' /mnt/ddev_config/config.yaml" 2>/dev/null || echo "")
    https_port=$(ddev exec "yq '.web_extra_exposed_ports[] | select(.name == \"playwright\") | .https_port' /mnt/ddev_config/config.yaml" 2>/dev/null || echo "")

    if [[ -z "$https_port" || -z "$container_port" ]]; then
        echo "Error: Browser mode requires exposed ports for playwright"
        echo "Please add to your \".ddev/config.yaml\":"
        echo ""
        echo "  web_extra_exposed_ports:"
        echo "    - name: playwright"
        echo "      container_port: 8080"
        echo "      http_port: 8080"
        echo "      https_port: 8443"
        exit 1
    fi
fi

wait_for_ui() {
    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        local status
        status=$(ddev exec "curl -o /dev/null -L -s -w '%{http_code}' http://0.0.0.0:${container_port}" 2>/dev/null || echo "000")

        if [[ "$status" == "200" ]]; then
            echo ""
            echo "Playwright UI is ready at: https://${DDEV_SITENAME}.ddev.site:${https_port}"
            return 0
        fi

        echo "Waiting for Playwright UI on port ${https_port}... (attempt $((attempt + 1))/${max_attempts})"
        sleep 2
        ((attempt++))
    done

    echo "Error: Playwright UI did not become available within timeout"
    return 1
}

# Install dependencies
echo "Installing Playwright dependencies..."
if ! ddev exec "unset npm_config_prefix && cd tests/e2e/ && npm install && sudo npx playwright install-deps && npx playwright install"; then
    echo "Error: Failed to install Playwright dependencies"
    exit 1
fi

# Check if running in browser/UI mode
if [[ "${1:-}" == "browser" ]]; then
    # Start the UI checker in background
    wait_for_ui &
    BACKGROUND_PIDS+=($!)

    # Run playwright UI (this blocks until user exits or error)
    echo "Starting Playwright UI..."
    ddev exec "unset npm_config_prefix && cd tests/e2e/ && npx playwright test --ui --ui-port=${container_port} --ui-host=0.0.0.0" || true
else
    # Pass all arguments through to playwright test
    echo "Running Playwright tests..."
    ddev exec "unset npm_config_prefix && cd tests/e2e/ && npx playwright test $*"
fi

# cleanup will be called via EXIT trap
