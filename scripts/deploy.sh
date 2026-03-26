#!/usr/bin/env bash
#
# Deploy typo3-installer.php to multiple servers via FTP or SCP
# and call each server's nuke/reset URL afterward.
#
# Configuration: .deploy-servers.json (see .deploy-servers.example.json)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.deploy-servers.json"
PHAR_FILE="$PROJECT_ROOT/test-installer-root/public/typo3-installer.php"
NUKE_USER="nuke"
NUKE_PASS="Password.1"
FILTER_HOST="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ------------------------------------------------------------------
# Dependency checks
# ------------------------------------------------------------------
for cmd in curl jq; do
    if ! command -v "$cmd" &>/dev/null; then
        error "Required command '$cmd' is not installed."
        exit 1
    fi
done

# ------------------------------------------------------------------
# Config & PHAR validation
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

if [[ ! -f "$PHAR_FILE" ]]; then
    error "PHAR file not found: $PHAR_FILE"
    echo "  Run 'ddev composer run build' first."
    exit 1
fi

SERVER_COUNT=$(jq 'length' "$CONFIG_FILE")
if [[ "$SERVER_COUNT" -eq 0 ]]; then
    warn "No servers defined in $CONFIG_FILE — nothing to do."
    exit 0
fi

if [[ -n "$FILTER_HOST" ]]; then
    info "Deploying $(basename "$PHAR_FILE") to host '$FILTER_HOST' only…"
else
    info "Deploying $(basename "$PHAR_FILE") to $SERVER_COUNT server(s)…"
fi
echo

# ------------------------------------------------------------------
# Deploy loop
# ------------------------------------------------------------------
SUCCESS=0
FAIL=0

for i in $(seq 0 $((SERVER_COUNT - 1))); do
    PROTOCOL=$(jq -r ".[$i].protocol // \"ftp\"" "$CONFIG_FILE")
    HOST=$(jq -r ".[$i].host"         "$CONFIG_FILE")
    USER=$(jq -r ".[$i].user"         "$CONFIG_FILE")
    PASS=$(jq -r ".[$i].password // empty" "$CONFIG_FILE")
    RPATH=$(jq -r ".[$i].remote_path"  "$CONFIG_FILE")
    NUKE=$(jq -r ".[$i].nuke_url"     "$CONFIG_FILE")
    INSECURE=$(jq -r ".[$i].insecure // false" "$CONFIG_FILE")

    # Skip servers that don't match the filter
    if [[ -n "$FILTER_HOST" && "$HOST" != "$FILTER_HOST" ]]; then
        continue
    fi

    echo "──────────────────────────────────────────"
    info "Server: $HOST → $RPATH ($PROTOCOL)"

    # --- Upload ---
    UPLOAD_OK=false

    LOCAL_SIZE=$(stat -f%z "$PHAR_FILE" 2>/dev/null || stat -c%s "$PHAR_FILE" 2>/dev/null)

    case "$PROTOCOL" in
        ftp)
            FTP_URL="ftp://${HOST}${RPATH}"
            info "  Uploading via FTPS (explicit TLS, binary mode)…"
            INSECURE_FLAG=""
            [[ "$INSECURE" == "true" ]] && INSECURE_FLAG="-k"
            CURL_OPTS=(--ftp-create-dirs --ssl-reqd $INSECURE_FLAG
                      -Q "-TYPE I" -Q "*TYPE I"
                      -T "$PHAR_FILE" -u "$USER:$PASS"
                      --connect-timeout 30 --max-time 300 -s -S)
            if curl "${CURL_OPTS[@]}" "$FTP_URL" 2>&1; then
                # Verify file size on remote server to detect ASCII-mode corruption
                REMOTE_SIZE=$(curl --ssl-reqd $INSECURE_FLAG -u "$USER:$PASS" \
                    -s -I "ftp://${HOST}${RPATH}" 2>/dev/null \
                    | grep -i "Content-Length" | awk '{print $2}' | tr -d '\r')
                if [[ -n "$REMOTE_SIZE" && "$REMOTE_SIZE" != "$LOCAL_SIZE" ]]; then
                    error "  Size mismatch! Local: ${LOCAL_SIZE}, Remote: ${REMOTE_SIZE} — file likely corrupted (ASCII mode transfer?)"
                    UPLOAD_OK=false
                else
                    UPLOAD_OK=true
                    [[ -n "$REMOTE_SIZE" ]] && info "  Size verified: ${REMOTE_SIZE} bytes"
                fi
            fi
            ;;
        scp)
            info "  Uploading via SCP…"
            if scp "$PHAR_FILE" "${USER}@${HOST}:${RPATH}"; then
                UPLOAD_OK=true
            fi
            ;;
        *)
            error "  Unknown protocol '$PROTOCOL' for $HOST"
            FAIL=$((FAIL + 1))
            continue
            ;;
    esac

    if $UPLOAD_OK; then
        info "  Upload OK"
    else
        error "  Upload failed for $HOST"
        FAIL=$((FAIL + 1))
        continue
    fi

    # --- Nuke/reset call ---
    if [[ -n "$NUKE" && "$NUKE" != "null" ]]; then
        info "  Calling nuke URL: $NUKE"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
                         -u "$NUKE_USER:$NUKE_PASS" \
                         --connect-timeout 15 \
                         --max-time 60 \
                         "$NUKE")
        if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
            info "  Nuke OK (HTTP $HTTP_CODE)"
        else
            warn "  Nuke returned HTTP $HTTP_CODE for $HOST"
        fi
    else
        info "  No nuke URL configured — skipping reset"
    fi

    SUCCESS=$((SUCCESS + 1))
    echo
done

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
echo "══════════════════════════════════════════"
info "Deployment complete: ${GREEN}${SUCCESS} succeeded${NC}, ${RED}${FAIL} failed${NC} (of $SERVER_COUNT)"
[[ "$FAIL" -gt 0 ]] && exit 1
exit 0
