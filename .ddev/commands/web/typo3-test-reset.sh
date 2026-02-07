#!/usr/bin/env bash

## Description: Reset TYPO3 installation to re-run the Composer GUI installer
## Usage: typo3:reset
## Example: "ddev typo3:reset"

# MySQL/MariaDB reset
mysql -udb -h db -pdb db -e "DROP DATABASE db; CREATE DATABASE db;"

# PostgreSQL reset (ignore if container not running)
# Note: Each -c runs outside a transaction block, required for DROP DATABASE
PGPASSWORD=db psql -h postgres -U db -d postgres -c "DROP DATABASE IF EXISTS db;" -c "CREATE DATABASE db;" 2>/dev/null || echo "PostgreSQL not available, skipping..."

# SQLite directory - create and clean
mkdir -p /var/www/html/test-installer-root/var/sqlite
rm -f /var/www/html/test-installer-root/var/sqlite/*.sqlite

# Project root
rm -Rf /var/www/html/test-installer-root/config
rm -Rf /var/www/html/test-installer-root/var
rm -Rf /var/www/html/test-installer-root/vendor
rm -Rf /var/www/html/test-installer-root/composer*

# Public
rm -Rf /var/www/html/test-installer-root/public/_assets
rm -Rf /var/www/html/test-installer-root/public/fileadmin
rm -Rf /var/www/html/test-installer-root/public/typo3temp
rm -Rf /var/www/html/test-installer-root/public/index.php
