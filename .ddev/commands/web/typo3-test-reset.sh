#!/usr/bin/env bash

## Description: Open PhpStorm with the current project
## Usage: typo3:reset
## Example: "ddev typo3:reset"

mysql -udb -h db -pdb db -e "DROP DATABASE db; CREATE DATABASE db;"

# Porject root
rm -Rf /var/www/html/test-installer-root/config
rm -Rf /var/www/html/test-installer-root/var
rm -Rf /var/www/html/test-installer-root/vendor
rm -Rf /var/www/html/test-installer-root/composer*

# Public
rm -Rf /var/www/html/test-installer-root/public/_assets
rm -Rf /var/www/html/test-installer-root/public/fileadmin
rm -Rf /var/www/html/test-installer-root/public/typo3temp
rm -Rf /var/www/html/test-installer-root/public/index.php
