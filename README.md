# TestFlow

A comprehensive WordPress plugin testing framework built with Bun, Lando, and Playwright. TestFlow enables end-to-end testing of WordPress plugins across multiple environments and configurations.

## 📦 Installation

```bash
# Install globally
bun add -g testflow

# Or install in your project
bun add -D testflow
```

### WordPress E2E Test Utils Integration

TestFlow seamlessly integrates with **official WordPress E2E test utilities** (`@wordpress/e2e-test-utils-playwright`) providing standardized, well-maintained helpers for WordPress testing:

- **Admin utilities**: Navigate WordPress admin with `admin.visitAdminPage()`
- **Editor utilities**: Interact with Gutenberg editor via `editor.canvas`
- **Request utilities**: Fast plugin/theme activation with `requestUtils.activatePlugin()`
- **Page utilities**: Enhanced page interactions with `pageUtils`
- **Authentication**: Built-in WordPress login handling with persistent storage state

**Default URL**: All tests run on `https://testflow.lndo.site` (configurable via `WP_BASE_URL` environment variable)

## 🚀 Quick Start

### 1. Initialize TestFlow in your project

```bash
testflow init
```

This creates a basic `testflow.yaml` configuration file:

```yaml
name: 'My Plugin Test'
plugins:
  zips:
    - 'dist/my-plugin.zip'
  preActivate: true
environment:
  php: '8.1'
  mysql: '8.0'
  wordpress: 'latest'
playwright:
  testDir: 'tests/e2e'
  workers: 2
  timeout: 30000
```

### 2. Create your first test

```javascript
// tests/e2e/basic-functionality.test.js
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

test('Plugin loads successfully', async ({ admin, page }) => {
  // Use WordPress E2E test utilities for seamless admin navigation
  await admin.visitAdminPage('plugins.php');
  
  // Verify plugin is active using official utilities
  const pluginRow = page.locator('tr[data-slug="my-plugin"]');
  await expect(pluginRow).toBeVisible();
  await expect(pluginRow.locator('.activate')).not.toBeVisible(); // Should be inactive link
});

test('Plugin settings page accessible', async ({ admin, page }) => {
  // Navigate to plugin settings using admin utilities
  await admin.visitAdminPage('admin.php?page=my-plugin-settings');
  
  // Verify settings page loads
  await expect(page.locator('.wrap h1')).toContainText('My Plugin Settings');
});

test('TestFlow helpers for bulk operations', async ({ page, requestUtils }) => {
  // Import TestFlow-specific helpers
  const { TestFlowHelpers } = await import('testflow/helpers');
  const helpers = new TestFlowHelpers(page);
  
  // Bulk activate multiple plugins efficiently
  await helpers.bulkActivatePlugins(['plugin-a', 'plugin-b', 'plugin-c']);
  
  // Check for plugin conflicts
  const conflicts = await helpers.checkPluginConflicts(['my-plugin', 'other-plugin']);
  expect(conflicts.conflictCount).toBe(0);
});
```

### 3. Run your tests

```bash
# Run with default configuration
testflow run

# Run with specific configuration
testflow run --config testflow-production.yaml

# Run with specific environment
testflow run --php 8.3 --wordpress latest --mysql 8.0
```

## 🔧 Configuration

### Basic Configuration

```yaml
# testflow.yaml
name: 'WordPress Plugin Tests'

# Plugin Management
plugins:
  zips:
    - 'dist/my-plugin.zip'
    - 'dist/addon-plugin.zip'
  preActivate: true                    # Activate plugins before tests
  activateList:                        # Specific plugins to activate
    - 'my-plugin'
    - 'addon-plugin'
  skipActivation:                      # Plugins to skip activation
    - 'conflicting-plugin'

# Environment Configuration
environment:
  php: '8.1'
  mysql: '8.0'
  wordpress: 'latest'
  multisite: false                     # Enable WordPress multisite
  debug: false                         # Enable WordPress debug mode

# Playwright Configuration
playwright:
  testDir: 'tests/e2e'
  testMatch: '**/*.test.js'
  workers: 2
  timeout: 30000
  retries: 1
  reporter: 'html'

# Lando Configuration
lando:
  recipe: 'wordpress'
  config:
    webroot: '.'
```

### Multi-Profile Configuration

```yaml
# testflow.yaml - Multi-profile setup
name: 'Multi-Profile WordPress Tests'

# Default configuration
default:
  environment:
    php: '8.1'
    mysql: '8.0'
    wordpress: 'latest'
  playwright:
    workers: 2
    timeout: 30000

# Profile-specific configurations
profiles:
  smoke:
    name: 'Smoke Tests'
    playwright:
      testMatch: '**/*.smoke.test.js'
      timeout: 15000
    plugins:
      preActivate: true
      activateList: ['core-plugin']

  compatibility:
    name: 'Compatibility Tests'
    environment:
      php: '7.4'
      wordpress: '6.0'
    playwright:
      testMatch: '**/*.compat.test.js'
      workers: 1

  performance:
    name: 'Performance Tests'
    environment:
      php: '8.3'
      mysql: '8.0'
    playwright:
      testMatch: '**/*.perf.test.js'
      workers: 4
      timeout: 60000

  multisite:
    name: 'Multisite Tests'
    environment:
      multisite: true
    playwright:
      testMatch: '**/*.multisite.test.js'
      workers: 1
```

## 🧪 WordPress E2E Test Utilities

TestFlow seamlessly integrates the **official WordPress E2E test utilities** for reliable, standardized testing:

> 📚 **[Complete WordPress Helpers Documentation](docs/wordpress-helpers.md)** - Comprehensive guide with examples, best practices, and migration instructions.

### Admin Navigation

```javascript
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

test('Admin navigation', async ({ admin, page, pageUtils }) => {
  // Navigate to any admin page
  await admin.visitAdminPage('plugins.php');
  await admin.visitAdminPage('themes.php');
  await admin.visitAdminPage('options-general.php');
  
  // Create posts/pages
  await admin.createNewPost();
  await admin.createNewPage({ title: 'Test Page' });
  
  // Use page utilities for enhanced interactions
  await pageUtils.pressKeys('primary+a'); // Select all
});
```

### Editor Utilities

```javascript
test('Gutenberg editor', async ({ admin, editor, page }) => {
  await admin.createNewPost();
  
  // Add blocks using editor utilities
  await editor.insertBlock({ name: 'core/paragraph' });
  await page.keyboard.type('Hello WordPress!');
  
  // Publish post
  await editor.publishPost();
});
```

### Request Utilities (Fast Operations)

```javascript
test('Fast plugin operations', async ({ requestUtils }) => {
  // Fast plugin activation without UI
  await requestUtils.activatePlugin('my-plugin');
  await requestUtils.deactivatePlugin('my-plugin');
  
  // Fast theme switching
  await requestUtils.activateTheme('twentytwentythree');
  
  // Fast content creation
  const post = await requestUtils.createPost({
    title: 'Test Post',
    content: 'This is a test post',
    status: 'publish'
  });
});

test('TestFlow enhanced operations', async ({ page }) => {
  // Import TestFlow helpers for advanced operations
  const { TestFlowHelpers } = await import('testflow/helpers');
  const helpers = new TestFlowHelpers(page);
  
  // Initialize request utils for API operations
  await helpers.initRequestUtils();
  
  // Advanced plugin management
  const activePlugins = await helpers.getActivePluginsWithInfo();
  console.log('Active plugins:', activePlugins);
  
  // Clear all caches comprehensively
  await helpers.clearAllCaches();
  
  // Performance measurement
  const metrics = await helpers.measureDetailedPerformance('https://testflow.lndo.site');
  expect(metrics.totalLoadTime).toBeLessThan(3000);
});
```

### Authentication & Storage

```javascript
// Authentication is handled automatically
test('Authenticated actions', async ({ admin }) => {
  // Already logged in as admin user
  await admin.visitAdminPage('users.php');
  
  // Storage state is preserved between tests
  // No need to login repeatedly
});
```

## 🎯 Plugin Management

### Pre-activation

TestFlow can automatically activate plugins before running tests:

```yaml
plugins:
  zips:
    - 'dist/my-plugin.zip'
  preActivate: true  # Activate all plugins before tests
```

### Selective Activation

Control which plugins to activate:

```yaml
plugins:
  zips:
    - 'dist/plugin-a.zip'
    - 'dist/plugin-b.zip'
    - 'dist/plugin-c.zip'
  activateList:      # Only activate these plugins
    - 'plugin-a'
    - 'plugin-b'
  skipActivation:    # Skip these plugins
    - 'plugin-c'
```

### Plugin Helpers

TestFlow provides both legacy helpers and enhanced utilities for plugin management:

```javascript
// Legacy helpers (backward compatible)
const { activatePlugin, deactivatePlugin, isPluginActive } = require('testflow/helpers');

test('Legacy plugin activation test', async ({ page }) => {
  // Check if plugin is active
  const isActive = await isPluginActive(page, 'my-plugin');
  expect(isActive).toBe(true);
  
  // Deactivate plugin
  await deactivatePlugin(page, 'my-plugin');
  
  // Reactivate plugin
  await activatePlugin(page, 'my-plugin');
});

// Enhanced TestFlow helpers (recommended for new code)
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { TestFlowHelpers } from 'testflow/helpers';

test('Enhanced plugin management', async ({ page, requestUtils }) => {
  const helpers = new TestFlowHelpers(page);
  
  // Bulk operations
  await helpers.bulkActivatePlugins(['plugin-a', 'plugin-b', 'plugin-c']);
  await helpers.bulkDeactivatePlugins(['old-plugin']);
  
  // Wait for plugin initialization with custom indicators
  await helpers.waitForPluginInitialized('my-plugin', {
    timeout: 15000,
    indicators: ['[data-plugin-ready="my-plugin"]'],
    adminPage: 'plugins.php'
  });
  
  // Advanced plugin conflict detection
  const conflicts = await helpers.checkPluginConflicts(['plugin-a', 'plugin-b']);
  if (conflicts.conflictCount > 0) {
    console.warn('Plugin conflicts detected:', conflicts.errors);
  }
  
  // Multisite operations
  await helpers.networkActivatePlugin('my-plugin');
  await helpers.switchToSite('subsite.example.com');
});
```

## 🌐 Multi-Environment Testing

### GitHub Actions Integration

```yaml
# .github/workflows/test.yml
name: WordPress Plugin Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          # Smoke tests - fast feedback
          - name: 'Smoke Tests'
            profile: 'smoke'
            php: '8.1'
            mysql: '8.0'
            wordpress: 'latest'
          
          # Compatibility matrix
          - name: 'PHP 8.3 Latest'
            profile: 'compatibility'
            php: '8.3'
            mysql: '8.0'
            wordpress: 'latest'
          
          - name: 'PHP 8.2 WP 6.4'
            profile: 'compatibility'
            php: '8.2'
            mysql: '8.0'
            wordpress: '6.4'
          
          - name: 'PHP 8.1 WP 6.3'
            profile: 'compatibility'
            php: '8.1'
            mysql: '5.7'
            wordpress: '6.3'
          
          - name: 'Legacy PHP 7.4'
            profile: 'compatibility'
            php: '7.4'
            mysql: '5.7'
            wordpress: '6.0'
          
          # Performance testing
          - name: 'Performance Tests'
            profile: 'performance'
            php: '8.3'
            mysql: '8.0'
            wordpress: 'latest'
          
          # Multisite testing
          - name: 'Multisite Tests'
            profile: 'multisite'
            php: '8.1'
            mysql: '8.0'
            wordpress: 'latest'

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run TestFlow
        uses: bordoni/testflow-action@v1
        with:
          profile: ${{ matrix.profile }}
          php: ${{ matrix.php }}
          mysql: ${{ matrix.mysql }}
          wordpress: ${{ matrix.wordpress }}
          plugins: 'dist/*.zip'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 📊 Test Examples

### Basic Plugin Test

```javascript
// tests/e2e/plugin-activation.test.js
const { test, expect } = require('@playwright/test');
const { wpLogin, activatePlugin, isPluginActive } = require('testflow/helpers');

test.describe('Plugin Activation', () => {
  test('Plugin activates successfully', async ({ page }) => {
    await wpLogin(page);
    await activatePlugin(page, 'my-plugin');
    
    const isActive = await isPluginActive(page, 'my-plugin');
    expect(isActive).toBe(true);
  });
  
  test('Plugin settings page loads', async ({ page }) => {
    await wpLogin(page);
    await page.goto('/wp-admin/admin.php?page=my-plugin-settings');
    
    await expect(page.locator('h1')).toContainText('My Plugin Settings');
  });
});
```

### Performance Testing

```javascript
// tests/e2e/performance.test.js
const { test, expect } = require('@playwright/test');
const { measurePageLoad, clearCache } = require('testflow/helpers');

test.describe('Performance Tests', () => {
  test('Homepage loads within acceptable time', async ({ page }) => {
    await clearCache(page);
    
    const loadTime = await measurePageLoad(page, 'https://testflow.lndo.site/');
    expect(loadTime).toBeLessThan(2000); // Less than 2 seconds
  });
  
  test('Admin dashboard performance', async ({ page }) => {
    await wpLogin(page);
    
    const loadTime = await measurePageLoad(page, 'https://testflow.lndo.site/wp-admin/');
    expect(loadTime).toBeLessThan(3000); // Less than 3 seconds
  });
});
```

### Multisite Testing

```javascript
// tests/e2e/multisite.test.js
const { test, expect } = require('@playwright/test');
const { wpLogin, switchToSite, networkActivatePlugin } = require('testflow/helpers');

test.describe('Multisite Tests', () => {
  test('Plugin network activation', async ({ page }) => {
    await wpLogin(page);
    await networkActivatePlugin(page, 'my-plugin');
    
    // Test on main site
    await page.goto('https://testflow.lndo.site/');
    await expect(page.locator('[data-plugin="my-plugin"]')).toBeVisible();
    
    // Test on subsite
    await switchToSite(page, 'subsite');
    await page.goto('https://testflow.lndo.site/subsite/');
    await expect(page.locator('[data-plugin="my-plugin"]')).toBeVisible();
  });
});
```

## 🔧 CLI Commands

```bash
# Initialize new TestFlow project
testflow init

# Run tests with default configuration
testflow run

# Run with specific profile
testflow run --profile smoke

# Run with custom environment
testflow run --php 8.3 --wordpress latest --mysql 8.0

# List available configurations and profiles
testflow list

# Validate configuration
testflow validate

# Generate test reports
testflow report

# Clean up test environments
testflow clean

# Debug mode
testflow run --debug

# Dry run (validate without running)
testflow run --dry-run
```

## 📁 Project Structure

```
your-plugin-project/
├── .github/workflows/
│   └── test.yml                 # GitHub Actions workflow
├── tests/e2e/
│   ├── basic-functionality.test.js
│   ├── admin-interface.test.js
│   ├── frontend-display.test.js
│   ├── performance.test.js
│   └── multisite.test.js
├── dist/
│   └── my-plugin.zip           # Built plugin ZIP
├── testflow.yaml               # Main configuration
├── testflow-smoke.yaml         # Smoke test config
├── testflow-performance.yaml   # Performance test config
└── package.json
```

## 📋 Examples

### Basic Usage
- [Simple Plugin Testing](examples/basic-usage/)
- [Single configuration with matrix testing](examples/basic-usage/.github/workflows/test.yml)

### Multi-Plugin Repository
- [Multiple Plugin Testing](examples/multi-plugin-repo/)
- [Comprehensive matrix testing](examples/multi-plugin-repo/.github/workflows/comprehensive-matrix.yml)
- [Different configuration profiles](examples/multi-plugin-repo/)

### Configuration Examples
- [Standard Testing](examples/testflow.yaml)
- [No Plugin Activation](examples/testflow-no-activation.yaml)
- [Selective Plugin Activation](examples/testflow-selective.yaml)
- [High Concurrency Testing](examples/testflow-high-concurrency.yaml)
- [Stress Testing](examples/testflow-stress.yaml)

## 🛠 Advanced Configuration

### Custom Lando Configuration

```yaml
# testflow.yaml
lando:
  recipe: 'wordpress'
  config:
    webroot: 'wordpress'
    database: 'mysql:8.0'
    php: '8.1'
    xdebug: false
    config:
      php: 'config/php.ini'
      vhosts: 'config/wordpress.conf'
  services:
    redis:
      type: 'redis:6'
    elasticsearch:
      type: 'elasticsearch:7'
```

### Custom Playwright Configuration

```yaml
# testflow.yaml
playwright:
  testDir: 'tests/e2e'
  outputDir: 'test-results'
  testMatch: '**/*.{test,spec}.{js,ts}'
  timeout: 30000
  expect:
    timeout: 10000
  fullyParallel: true
  forbidOnly: !!process.env.CI
  retries: process.env.CI ? 2 : 0
  workers: process.env.CI ? 1 : undefined
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ]
  use:
    baseURL: 'https://testflow.lndo.site'
    trace: 'on-first-retry'
    screenshot: 'only-on-failure'
    video: 'retain-on-failure'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

- **[WordPress Helpers Guide](docs/wordpress-helpers.md)**: Comprehensive guide to WordPress testing utilities
- **[Configuration Reference](docs/configuration.md)**: Detailed testflow.yaml configuration options
- **[Migration Guide](docs/migration.md)**: Upgrading from legacy helpers to modern WordPress E2E utils

## 🆘 Support

- [Documentation](https://github.com/bordoni/testflow/docs)
- [Issues](https://github.com/bordoni/testflow/issues)
- [Discussions](https://github.com/bordoni/testflow/discussions)

## 🎯 Roadmap

- [ ] Visual regression testing
- [ ] Automated accessibility testing
- [ ] Database migration testing
- [ ] API endpoint testing
- [ ] Mobile responsiveness testing
- [ ] Integration with popular CI/CD platforms
- [ ] Plugin dependency management
- [ ] Custom test reporters 