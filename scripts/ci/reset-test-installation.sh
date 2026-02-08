#!/usr/bin/env bash

## Description: Reset TYPO3 installation for CI environments
## Usage: scripts/ci/reset-test-installation.sh
##
## Environment variables:
##   DB_DRIVER   - Database driver (pdo_mysql, pdo_pgsql, pdo_sqlite)
##   DB_HOST     - Database host (default: db for MySQL, postgres for PostgreSQL)
##   DB_USER     - Database user (default: db)
##   DB_PASSWORD - Database password (default: db)
##   DB_NAME     - Database name (default: db)
##   INSTALL_DIR - TYPO3 installation directory (default: $CI_PROJECT_DIR/test-installer-root)

set -e

# Configuration with defaults
DB_DRIVER="${DB_DRIVER:-pdo_mysql}"
DB_USER="${DB_USER:-db}"
DB_PASSWORD="${DB_PASSWORD:-db}"
DB_NAME="${DB_NAME:-db}"
INSTALL_DIR="${INSTALL_DIR:-${CI_PROJECT_DIR:-/var/www/html}/test-installer-root}"

echo "=== TYPO3 Test Installation Reset ==="
echo "Driver: $DB_DRIVER"
echo "Install dir: $INSTALL_DIR"

# Reset database based on driver
case "$DB_DRIVER" in
  pdo_mysql)
    DB_HOST="${DB_HOST:-db}"
    echo "Resetting MySQL/MariaDB database at $DB_HOST..."
    mysql -u"$DB_USER" -h "$DB_HOST" -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME;"
    ;;
  pdo_pgsql)
    DB_HOST="${DB_HOST:-postgres}"
    echo "Resetting PostgreSQL database at $DB_HOST..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d postgres \
      -c "DROP DATABASE IF EXISTS $DB_NAME;" \
      -c "CREATE DATABASE $DB_NAME;"
    ;;
  pdo_sqlite)
    echo "Resetting SQLite database..."
    mkdir -p "$INSTALL_DIR/var/sqlite"
    rm -f "$INSTALL_DIR/var/sqlite"/*.sqlite
    ;;
  *)
    echo "Unknown driver: $DB_DRIVER"
    exit 1
    ;;
esac

# Reset TYPO3 installation files
echo "Cleaning TYPO3 installation files..."

# Project root files
rm -Rf "$INSTALL_DIR/config"
rm -Rf "$INSTALL_DIR/var"
rm -Rf "$INSTALL_DIR/vendor"
rm -Rf "$INSTALL_DIR/composer"*

# Public directory files
rm -Rf "$INSTALL_DIR/public/_assets"
rm -Rf "$INSTALL_DIR/public/fileadmin"
rm -Rf "$INSTALL_DIR/public/typo3temp"
rm -Rf "$INSTALL_DIR/public/index.php"

echo "Reset complete!"
