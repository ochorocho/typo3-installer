# TYPO3 Installer

A self-contained single-file installer for TYPO3 CMS that works on any web hosting - no SSH or Composer required!

## Features

- **Single PHAR file** - Upload one file and you're ready to install
- **Web-based GUI** - Modern, step-by-step installation wizard
- **No SSH required** - Works on shared hosting
- **No Composer required** - Composer is embedded in the installer
- **Multi-step validation** - System requirements check, database testing
- **Real-time progress** - Watch the installation progress live
- **Automatic setup** - Database, admin user, and site configuration

## Requirements

- PHP 8.2 or higher
- SQLite / MySQL 8.0+ / MariaDB 10.4+ or PostgreSQL 10+
- Web server (Apache, Nginx, etc.)
- Write permissions in the upload directory (document root) and it's parent
  directory (project root)

## Quick Start

### For End Users

1. Download `typo3-installer.php`
2. Upload to your web server
3. Access via browser: `https://your-domain.com/typo3-installer.php`
4. Follow the installation wizard
5. Access your TYPO3 backend when complete!

### For Developers

#### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/your-repo/typo3-installer.git
cd typo3-installer

# Start DDEV
ddev start

# Install dependencies
ddev composer install
ddev exec "cd frontend && npm install"

# Build the installer
ddev composer run build
```

#### Development Workflow

```bash
# Run frontend with hot reload
ddev exec "cd frontend && npm run dev"

# Run PHP backend
ddev composer serve

# Or use DDEV
ddev start
# Access at https://typo3-installer.ddev.site
```

#### Build PHAR

```bash
# Build everything (frontend + PHAR)
ddev composer run build

# The output is: typo3-installer.php
```

## Installation Steps

1. **System Requirements** - Checks PHP version, extensions, and permissions
2. **Database Configuration** - Configure and test database connection
3. **Admin Account** - Create TYPO3 administrator account
4. **Site Configuration** - Set site name and base URL
5. **Installation** - Automatic TYPO3 installation with progress tracking

## Technology

**Frontend:**
- Lit 3.x (Web Components)
- Vite (bundler)
- Progressive enhancement

**Backend:**
- PHP 8.2+
- Symfony Components
- Embedded Composer

**Packaging:**
- Box 4.x (PHAR builder)

## Development

See [CLAUDE.md](CLAUDE.md) for detailed development documentation.

## Testing

```bash
# Unit tests
ddev composer run test:unit

# E2E tests (Playwright)
ddev composer run install:playwright  # First time only
ddev composer run test:e2e

# Static analysis
ddev composer run phpstan
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

GPL-2.0-or-later

## Credits

Built with ❤️
