# TestFlow

WordPress Plugin Testing Framework with Lando and Playwright.

TestFlow is a comprehensive testing framework built specifically for WordPress plugin development. It provides automated End-to-End testing capabilities using Lando for environment management and Playwright for browser automation, with extensive support for SQL data matrix testing and flexible plugin source management.

## Features

- **🚀 Automated Environment Setup**: Uses Lando for consistent WordPress environments
- **🎭 Playwright Integration**: Modern browser automation for E2E testing
- **🔌 Plugin Source Flexibility**: Support for ZIP files, WordPress.org, GitHub repos, private URLs, and local development
- **🗄️ SQL Matrix Testing**: Test with different database states and configurations
- **📦 WordPress Installation Options**: Standard installation or SQL data import with URL replacement
- **🌍 Multi-Configuration Support**: Test across different PHP/MySQL/WordPress versions
- **⚡ Parallel Testing**: Matrix combinations with selective execution
- **🔧 WordPress Helpers**: Built-in utilities for common WordPress testing tasks

## Installation

```bash
npm install -g testflow
# or
bun add -g testflow
```

## Quick Start

1. **Initialize a new TestFlow project:**
```bash
testflow init --with-sql --with-matrix
```

2. **Add your plugin ZIP files to the `plugins/` directory**

3. **Run tests:**
```bash
# Run with default configuration
testflow run

# Run all matrix combinations
testflow run --matrix

# Run with specific SQL files
testflow run --sql-files "data/setup.sql,data/users.sql"

# Use SQL instead of WordPress installation
testflow run --instead-of-wordpress --sql-files "data/production-backup.sql" --search-replace-from "https://production-site.com"
```

## Configuration

TestFlow uses YAML configuration files. Here's a complete example:

```yaml
# Basic configuration
name: "My Plugin Tests"
description: "E2E tests for my WordPress plugin"

lando:
  php: '8.2'
  mysql: '8.0'
  wordpress: '6.4'

playwright:
  testDir: 'tests/e2e'
  patterns:
    - '**/*.test.js'
  timeout: 30000
  retries: 1
  workers: 1

plugins:
  zips:
    - 'plugins/*.zip'
  installPath: 'wp-content/plugins'
  preActivate: true

wordpress:
  adminUser: 'admin'
  adminPassword: 'password'
  adminEmail: 'admin@example.com'
  siteUrl: 'https://testflow.lndo.site'

# SQL configuration with WordPress replacement
sql:
  files:
    - 'data/production-backup.sql'
  insteadOfWordPress: true  # Use SQL instead of WordPress installation
  searchReplace:
    enabled: true
    fromUrl: 'https://production-site.com'
    toUrl: 'https://testflow.lndo.site'
    additionalReplacements:
      - from: 'production-cdn.com'
        to: 'testflow.lndo.site'

# Matrix testing configuration
matrix:
  environments:
    - name: 'Clean Install'
      insteadOfWordPress: false
      plugins: ['my-plugin']
    
    - name: 'Production Data'
      sql_files: ['data/production-backup.sql']
      insteadOfWordPress: true
      searchReplace:
        fromUrl: 'https://production-site.com'
        toUrl: 'https://testflow.lndo.site'
      plugins: ['my-plugin', 'extension-plugin']
```

### SQL Configuration Options

TestFlow provides flexible SQL file handling:

#### Standard SQL Execution
```yaml
sql:
  files:
    - 'data/setup.sql'
    - 'data/test-data.sql'
  executeOrder: 'after-wordpress'  # before-wordpress, after-wordpress, before-plugins, after-plugins
  continueOnError: false
```

#### SQL Instead of WordPress Installation
```yaml
sql:
  files:
    - 'data/production-backup.sql'
  insteadOfWordPress: true  # Replace WordPress installation with SQL data
  searchReplace:
    enabled: true
    fromUrl: 'https://production-site.com'    # URL to replace from SQL
    toUrl: 'https://testflow.lndo.site'       # URL to replace to
    additionalReplacements:
      - from: 'old-domain.com'
        to: 'testflow.lndo.site'
      - from: '/old-path/'
        to: '/new-path/'
```

### Plugin Source Configuration

TestFlow supports multiple plugin sources:

```yaml
plugins:
  zips:
    # Local ZIP files
    - 'plugins/*.zip'
    - 'dist/my-plugin.zip'
    
    # WordPress.org plugins
    - 'wordpress-org:akismet'
    - 'wordpress-org:jetpack@12.8'
    
    # GitHub repositories
    - 'github:user/repo'
    - 'github:user/repo@v1.2.3'
    - 'github:user/private-repo@main#token'
    
    # Private URLs
    - 'https://releases.example.com/plugin.zip'
    - 'https://releases.example.com/plugin.zip#auth-token'
    
    # Local development directories
    - 'local:../my-plugin-dev'
    - 'local:/absolute/path/to/plugin'
```

## CLI Commands

### Main Commands

```bash
# Run tests
testflow run [options]

# Initialize configuration
testflow init [options]

# Show configuration status
testflow status

# Environment management
testflow lando start
testflow lando stop
testflow lando destroy
```

### SQL Commands

```bash
# Execute SQL files directly
testflow sql execute data.sql users.sql

# Use SQL instead of WordPress installation
testflow sql execute production-backup.sql \
  --instead-of-wordpress \
  --search-replace-from "https://production-site.com"
```

### Matrix Commands

```bash
# List available matrix configurations
testflow matrix list

# Run specific matrix configuration
testflow run --matrix-index 0

# Run all matrix combinations
testflow run --matrix
```

### CLI Options

#### Run Options
- `--config <path>` - Configuration file path
- `--profile <name>` - Configuration profile to use
- `--debug` - Enable debug mode
- `--matrix` - Run matrix tests (all combinations)
- `--matrix-index <index>` - Run specific matrix configuration

#### SQL Options
- `--sql-files <files>` - Comma-separated list of SQL files
- `--sql-stage <stage>` - SQL execution stage (before-wordpress, after-wordpress, before-plugins, after-plugins)
- `--sql-continue-on-error` - Continue execution if SQL files fail
- `--instead-of-wordpress` - Use SQL files instead of WordPress installation
- `--search-replace-from <url>` - URL to replace from SQL (used with --instead-of-wordpress)
- `--search-replace-to <url>` - URL to replace to (defaults to siteUrl)

#### Init Options
- `--name <name>` - Project name
- `--multi-profile` - Generate multi-profile configuration
- `--with-sql` - Include SQL configuration examples
- `--with-matrix` - Include matrix testing configuration
- `--php <version>` - PHP version (default: 8.2)
- `--mysql <version>` - MySQL version (default: 8.0)
- `--wordpress <version>` - WordPress version (default: 6.4)

## Usage Examples

### Basic Plugin Testing
```bash
# Initialize and run basic tests
testflow init
testflow run
```

### SQL Matrix Testing
```bash
# Initialize with SQL matrix support
testflow init --with-sql --with-matrix

# Run with different SQL data states
testflow run --matrix

# Run specific SQL combination
testflow run --matrix-index 2

# Test with production data
testflow run --instead-of-wordpress \
  --sql-files "data/production-backup.sql" \
  --search-replace-from "https://production-site.com"
```

### Multi-Environment Testing
```bash
# Test across different environments
testflow run --matrix

# Test specific environment
testflow run --matrix-index 1

# List available configurations
testflow matrix list
```

### Plugin Source Examples
```bash
# Test with WordPress.org plugin
testflow run --plugins "wordpress-org:woocommerce"

# Test with GitHub repository
testflow run --plugins "github:user/my-plugin@v2.0.0"

# Test with local development version
testflow run --plugins "local:../my-plugin-dev"
```

## WordPress Helpers

TestFlow includes built-in WordPress testing utilities:

```javascript
// tests/e2e/example.test.js
import { test, expect } from '@playwright/test';
import { WordPressHelpers } from 'testflow/wordpress-helpers';

test('plugin functionality', async ({ page }) => {
  const wp = new WordPressHelpers(page);
  
  // Login to WordPress admin
  await wp.loginAsAdmin();
  
  // Navigate to plugin settings
  await wp.goto('/wp-admin/admin.php?page=my-plugin');
  
  // Check if plugin is active
  const isActive = await wp.isPluginActive('my-plugin');
  expect(isActive).toBe(true);
  
  // Test frontend functionality
  await wp.gotoFrontend('/sample-page');
  await expect(page.locator('.my-plugin-output')).toBeVisible();
});
```

## Examples

The `examples/` directory contains comprehensive configuration examples:

- **[Basic Usage](examples/basic-usage/)** - Standard plugin testing configurations
- **[Plugin Sources](examples/plugin-sources/)** - Different plugin source configurations
- **[Multi-Plugin Repository](examples/multi-plugin-repo/)** - Testing multiple plugins together
- **[SQL Matrix Testing](examples/basic-usage/testflow-sql-matrix.yaml)** - Advanced SQL matrix configurations
- **[Instead of WordPress](examples/basic-usage/testflow-instead-of-wordpress.yaml)** - Using SQL data instead of WordPress installation

## GitHub Actions Integration

TestFlow works seamlessly with GitHub Actions:

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        config: [0, 1, 2, 3]  # Matrix indices
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install TestFlow
        run: bun add -g testflow
        
      - name: Install Lando
        run: |
          wget https://files.lando.dev/installer/lando-x64-stable.deb
          sudo dpkg -i lando-x64-stable.deb
          
      - name: Run Tests
        run: testflow run --matrix-index ${{ matrix.config }}
        
      - name: Upload Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-${{ matrix.config }}
          path: test-results/
```

## Advanced Configuration

### Multi-Profile Configuration

```yaml
# testflow.yaml
default:
  lando:
    php: '8.2'
    mysql: '8.0'
    wordpress: '6.4'
  # ... other default config

profiles:
  quick:
    name: 'quick'
    description: 'Quick smoke tests'
    config:
      playwright:
        patterns: ['**/*.smoke.test.js']
        timeout: 15000
  
  production-data:
    name: 'production-data'
    description: 'Test with production data'
    config:
      sql:
        files: ['data/production-backup.sql']
        insteadOfWordPress: true
        searchReplace:
          enabled: true
          fromUrl: 'https://production-site.com'
          toUrl: 'https://testflow.lndo.site'

  legacy:
    name: 'legacy'
    description: 'Legacy compatibility'
    config:
      lando:
        php: '7.4'
        mysql: '5.7'
        wordpress: '6.0'
```

Usage:
```bash
testflow run --profile quick
testflow run --profile production-data
testflow run --profile legacy
```

### Complex Matrix Configuration

```yaml
matrix:
  # Simple combinations
  sql_files:
    - []  # Clean install
    - ['data/minimal.sql']
    - ['data/setup.sql', 'data/users.sql']
    - ['data/full-dataset.sql']
  
  plugin_combinations:
    - ['core-plugin']
    - ['core-plugin', 'extension-plugin']
    - ['core-plugin', 'extension-plugin', 'utility-plugin']
  
  # Complex environment configurations
  environments:
    - name: 'Production Mirror'
      php: '8.1'
      mysql: '8.0'
      sql_files: ['data/production-backup.sql']
      insteadOfWordPress: true
      searchReplace:
        fromUrl: 'https://production-site.com'
        toUrl: 'https://testflow.lndo.site'
      plugins: ['core-plugin', 'production-plugin']
    
    - name: 'Staging Environment'
      php: '8.2'
      mysql: '8.0'
      sql_files: ['data/staging-backup.sql']
      insteadOfWordPress: true
      searchReplace:
        fromUrl: 'https://staging-site.com'
        toUrl: 'https://testflow.lndo.site'
      plugins: ['core-plugin']
```

## Troubleshooting

### Common Issues

1. **Lando not starting**: Ensure Docker is running and Lando is properly installed
2. **SQL file not found**: Check file paths relative to project root
3. **Plugin activation failures**: Verify ZIP file structure and plugin headers
4. **URL replacement issues**: Check search/replace URLs match exactly
5. **Test timeouts**: Increase timeout values for large datasets

### Debug Mode

Enable debug mode for detailed logging:
```bash
testflow run --debug
```

### Logs and Artifacts

TestFlow saves logs and artifacts in:
- `test-results/` - Playwright test results
- `.lando.yml` - Generated Lando configuration
- `playwright-report/` - HTML test reports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/your-org/testflow/issues)
- 💬 [Discussions](https://github.com/your-org/testflow/discussions)
- 📧 [Email Support](mailto:support@testflow.dev) 