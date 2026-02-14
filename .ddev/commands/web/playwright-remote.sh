#!/usr/bin/env bash

## Description: Run Playwright SQLite full-flow test against remote servers
## Usage: playwright-remote [host]
## Example: "ddev playwright-remote" (test all configured servers)
## Example: "ddev playwright-remote ftp.example.com" (test specific host only)

set -euo pipefail

CONFIG_FILE="/var/www/html/.deploy-servers.json"
FILTER_HOST="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ------------------------------------------------------------------
# Dependency checks
# ------------------------------------------------------------------
for cmd in curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
        error "Required command '$cmd' is not installed."
        exit 1
    fi
done

# Install dependencies
echo "Installing Playwright dependencies..."
if ! (unset npm_config_prefix && cd tests/e2e/ && npm install && sudo npx playwright install-deps && npx playwright install); then
    echo "Error: Failed to install Playwright dependencies"
    exit 1
fi


# ------------------------------------------------------------------
# Config validation
# ------------------------------------------------------------------
if [[ ! -f "$CONFIG_FILE" ]]; then
    error "Config file not found: $CONFIG_FILE"
    echo "  Copy .deploy-servers.example.json to .deploy-servers.json and fill in your server details."
    exit 1
fi

if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
    error "Invalid JSON in $CONFIG_FILE"
    exit 1
fi

SERVER_COUNT=$(jq 'length' "$CONFIG_FILE")
if [[ "$SERVER_COUNT" -eq 0 ]]; then
    warn "No servers defined in $CONFIG_FILE — nothing to do."
    exit 0
fi

# Filter to servers with playwright_url (and optionally by host)
if [[ -n "$FILTER_HOST" ]]; then
    TESTABLE=$(jq --arg host "$FILTER_HOST" '[.[] | select(.playwright_url and .playwright_url != "" and .host == $host)]' "$CONFIG_FILE")
else
    TESTABLE=$(jq '[.[] | select(.playwright_url and .playwright_url != "")]' "$CONFIG_FILE")
fi
TESTABLE_COUNT=$(echo "$TESTABLE" | jq 'length')

if [[ "$TESTABLE_COUNT" -eq 0 ]]; then
    if [[ -n "$FILTER_HOST" ]]; then
        warn "No testable server found matching host '$FILTER_HOST'."
    else
        warn "No servers with 'playwright_url' configured — nothing to test."
    fi
    exit 0
fi

if [[ -n "$FILTER_HOST" ]]; then
    info "Running remote Playwright test against host '$FILTER_HOST'…"
else
    info "Running remote Playwright tests against $TESTABLE_COUNT server(s)…"
fi
echo

# ------------------------------------------------------------------
# Test loop
# ------------------------------------------------------------------
SUCCESS=0
FAIL=0

for i in $(seq 0 $((TESTABLE_COUNT - 1))); do
    HOST=$(echo "$TESTABLE" | jq -r ".[$i].host")
    NUKE_URL=$(echo "$TESTABLE" | jq -r ".[$i].nuke_url // empty")
    PLAYWRIGHT_URL=$(echo "$TESTABLE" | jq -r ".[$i].playwright_url")
    BASE_URL="${PLAYWRIGHT_URL%/typo3-installer.php}"

    echo "──────────────────────────────────────────"
    info "Server: $HOST"
    info "  URL: $PLAYWRIGHT_URL"

    # --- Build env vars for Playwright ---
    export BASE_URL
    export REMOTE_TEST=true
    if [[ -n "$NUKE_URL" && "$NUKE_URL" != "null" ]]; then
        export NUKE_URL
    else
        unset NUKE_URL 2>/dev/null || true
    fi

    # --- Run Playwright test (global-setup.js handles nuke call) ---
    info "  Running SQLite full-flow test (BASE_URL='$BASE_URL')…"
    if (unset npm_config_prefix && cd /var/www/html/tests/e2e && npx playwright test --project=sqlite tests/full-flows/sqlite.spec.js); then
        info "  ✓ PASSED: $HOST"
        SUCCESS=$((SUCCESS + 1))
    else
        error "  ✗ FAILED: $HOST"
        FAIL=$((FAIL + 1))
    fi

    echo
done

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
echo "══════════════════════════════════════════"
info "Remote tests complete: ${GREEN}${SUCCESS} passed${NC}, ${RED}${FAIL} failed${NC} (of $TESTABLE_COUNT)"
[[ "$FAIL" -gt 0 ]] && exit 1
exit 0
