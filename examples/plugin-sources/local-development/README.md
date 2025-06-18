# Testing Local Development Plugins

This example demonstrates how to test WordPress plugins during local development, supporting various development workflows and plugin structures.

## Overview

Local development plugin testing is essential for:
- Plugin development and debugging
- Testing changes before deployment
- Integration testing with other plugins
- Performance optimization
- Multi-environment compatibility testing
- Continuous integration workflows

## Features

- **Local Plugin Loading**: Mount and test plugins from local filesystem
- **Development Workflows**: Support for various development setups
- **Hot Reloading**: Automatic testing when plugin files change
- **Multi-Plugin Development**: Test multiple plugins simultaneously
- **Symlink Support**: Work with symbolic links and development environments
- **Build Integration**: Test both source and built plugin versions

## Configuration Files

### Basic Local Development (`testflow-local-basic.yaml`)
For testing a single plugin during development:

```yaml
name: "Local Plugin Development Testing"
description: "Test WordPress plugin from local development environment"

wordpress:
  version: "6.4"
  multisite: false
  
php:
  version: "8.1"

plugins:
  # Local plugin from current directory
  - name: "my-plugin"
    source: "local"
    path: "./src"
    type: "development" # or "built", "symlink"
    
  # Local plugin with specific build process
  - name: "advanced-plugin"
    source: "local"
    path: "./plugins/advanced-plugin"
    type: "built"
    build_command: "npm run build"
    
  # Symlinked plugin for development
  - name: "shared-plugin"
    source: "local"
    path: "/path/to/shared/plugin"
    type: "symlink"

database:
  name: "local_dev_test"
  
tests:
  - "tests/e2e/local-development.test.js"
  - "tests/e2e/plugin-functionality.test.js"

# Watch for file changes and re-run tests
watch:
  enabled: true
  paths:
    - "./src/**/*.php"
    - "./src/**/*.js"
    - "./src/**/*.css"
  debounce: 1000 # ms

environment:
  WP_DEBUG: true
  WP_DEBUG_LOG: true
  WP_DEBUG_DISPLAY: true
  SCRIPT_DEBUG: true
```

### Multi-Plugin Development (`testflow-local-multi.yaml`)
For testing multiple plugins together:

```yaml
name: "Multi-Plugin Local Development"
description: "Test multiple local plugins together"

wordpress:
  version: "6.4"
  multisite: false
  
php:
  version: "8.1"

plugins:
  # Core plugin being developed
  - name: "core-plugin"
    source: "local"
    path: "./plugins/core"
    type: "development"
    priority: 1 # Load first
    
  # Extension plugin that depends on core
  - name: "extension-plugin"
    source: "local"
    path: "./plugins/extension"
    type: "development"
    priority: 2
    dependencies: ["core-plugin"]
    
  # Third-party plugin for compatibility testing
  - name: "woocommerce"
    source: "wordpress-org"
    version: "latest"
    
  # Another local plugin
  - name: "utility-plugin"
    source: "local"
    path: "./plugins/utilities"
    type: "built"
    build_command: "composer install && npm run build"

database:
  name: "multi_plugin_dev"
  
tests:
  - "tests/e2e/plugin-interactions.test.js"
  - "tests/e2e/compatibility.test.js"

# Test different plugin combinations
matrix:
  plugin_combinations:
    - ["core-plugin"]
    - ["core-plugin", "extension-plugin"]
    - ["core-plugin", "extension-plugin", "woocommerce"]
    - ["core-plugin", "utility-plugin"]

environment:
  WP_DEBUG: true
  WP_DEBUG_LOG: true
  PLUGIN_DEV_MODE: true
```

### Development with Build Process (`testflow-local-build.yaml`)
For plugins that require building:

```yaml
name: "Local Plugin with Build Process"
description: "Test local plugin with build and compilation steps"

wordpress:
  version: "6.4"
  multisite: false
  
php:
  version: "8.1"

plugins:
  # Plugin with npm build process
  - name: "modern-plugin"
    source: "local"
    path: "./src"
    type: "built"
    build:
      commands:
        - "npm ci"
        - "npm run build"
        - "composer install --no-dev --optimize-autoloader"
      output_dir: "./dist"
      watch_files:
        - "./src/**/*.js"
        - "./src/**/*.scss"
        - "./src/**/*.php"
        
  # Plugin with webpack build
  - name: "webpack-plugin"
    source: "local"
    path: "./plugins/webpack-plugin"
    type: "built"
    build:
      commands:
        - "npm install"
        - "npm run build:production"
      output_dir: "./build"
      
  # Plugin with composer dependencies
  - name: "composer-plugin"
    source: "local"
    path: "./plugins/composer-plugin"
    type: "built"
    build:
      commands:
        - "composer install"
        - "composer dump-autoload -o"

database:
  name: "build_process_test"
  
tests:
  - "tests/e2e/built-plugin.test.js"
  - "tests/e2e/asset-loading.test.js"

# Development server configuration
dev_server:
  enabled: true
  port: 3000
  hot_reload: true
  
environment:
  WP_DEBUG: true
  WP_DEBUG_LOG: true
  NODE_ENV: "development"
```

### Continuous Integration (`testflow-local-ci.yaml`)
For CI/CD pipeline integration:

```yaml
name: "Local Plugin CI Testing"
description: "Continuous integration testing for local plugin development"

matrix:
  wordpress: ["6.2", "6.3", "6.4"]
  php: ["7.4", "8.0", "8.1", "8.2"]
  plugin_mode: ["development", "production"]

wordpress:
  version: "${MATRIX_WORDPRESS}"
  
php:
  version: "${MATRIX_PHP}"

plugins:
  - name: "test-plugin"
    source: "local"
    path: "${CI_PROJECT_DIR}/src"
    type: "${MATRIX_PLUGIN_MODE}"
    build:
      commands:
        - "composer install --no-dev"
        - "npm ci"
        - "npm run build:${MATRIX_PLUGIN_MODE}"

database:
  name: "ci_test_${MATRIX_WORDPRESS}_${MATRIX_PHP}_${MATRIX_PLUGIN_MODE}"
  
tests:
  - "tests/e2e/ci-validation.test.js"
  - "tests/e2e/cross-version.test.js"

# CI-specific settings
ci:
  timeout: 300000 # 5 minutes
  retry_failed: 2
  parallel: true
  
performance:
  enabled: true
  thresholds:
    page_load: 2000
    memory_usage: "256M"
    
code_quality:
  enabled: true
  tools:
    - "phpcs"
    - "eslint"
    - "phpstan"
```

## Environment Configuration

### Local Development Environment (`.env.local`)

```bash
# WordPress Configuration
WP_VERSION=6.4
PHP_VERSION=8.1
WP_DEBUG=true
WP_DEBUG_LOG=true
WP_DEBUG_DISPLAY=true
SCRIPT_DEBUG=true

# Plugin Development
PLUGIN_DEV_MODE=true
HOT_RELOAD=true
AUTO_REBUILD=true

# Database
DB_NAME=local_plugin_dev
DB_USER=root
DB_PASSWORD=root
DB_HOST=localhost

# Development Server
DEV_SERVER_PORT=3000
WEBPACK_DEV_SERVER=true

# Testing
TEST_TIMEOUT=30000
SCREENSHOT_ON_FAILURE=true
HEADLESS=false

# Build Configuration
NODE_ENV=development
COMPOSER_OPTIMIZE=false
```

### Production-like Testing (`.env.production`)

```bash
# WordPress Configuration
WP_VERSION=6.4
PHP_VERSION=8.1
WP_DEBUG=false
WP_DEBUG_LOG=false
WP_DEBUG_DISPLAY=false
SCRIPT_DEBUG=false

# Plugin Configuration
PLUGIN_DEV_MODE=false
HOT_RELOAD=false
AUTO_REBUILD=false

# Database
DB_NAME=prod_test
DB_USER=testuser
DB_PASSWORD=testpass
DB_HOST=localhost

# Testing
TEST_TIMEOUT=60000
SCREENSHOT_ON_FAILURE=true
HEADLESS=true

# Build Configuration
NODE_ENV=production
COMPOSER_OPTIMIZE=true
```

## Test Examples

### Local Development Test (`tests/e2e/local-development.test.js`)

```javascript
import { test, expect } from '@playwright/test';
import { TestFlowHelpers } from '@your-org/testflow';
import fs from 'fs';
import path from 'path';

test.describe('Local Plugin Development', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestFlowHelpers(page);
    await helpers.wpLogin();
  });

  test('should load local plugin from development directory', async () => {
    // Verify plugin files exist locally
    const pluginPath = path.join(process.cwd(), 'src');
    expect(fs.existsSync(pluginPath)).toBeTruthy();
    
    // Check for main plugin file
    const mainFile = path.join(pluginPath, 'my-plugin.php');
    expect(fs.existsSync(mainFile)).toBeTruthy();
    
    // Test plugin activation
    await helpers.activatePlugin('my-plugin');
    
    const isActive = await helpers.isPluginActive('my-plugin');
    expect(isActive).toBe(true);
  });

  test('should reflect local file changes', async ({ page }) => {
    await helpers.activatePlugin('my-plugin');
    
    // Navigate to plugin page
    await helpers.admin.visitAdminPage('admin.php?page=my-plugin');
    
    // Get initial content
    const initialContent = await page.locator('.plugin-content').textContent();
    
    // Modify plugin file (in real scenario, this would be done externally)
    // For testing, we'll check if the plugin responds to changes
    await page.evaluate(() => {
      // Simulate a plugin update by triggering a cache clear
      if (window.myPlugin && window.myPlugin.refresh) {
        window.myPlugin.refresh();
      }
    });
    
    // Reload page to see changes
    await page.reload();
    
    // Verify plugin is still working
    await expect(page.locator('.plugin-content')).toBeVisible();
  });

  test('should handle plugin dependencies', async () => {
    // Test dependency resolution
    const dependencies = ['core-plugin'];
    
    for (const dep of dependencies) {
      await helpers.activatePlugin(dep);
      const isActive = await helpers.isPluginActive(dep);
      expect(isActive).toBe(true);
    }
    
    // Now activate the dependent plugin
    await helpers.activatePlugin('extension-plugin');
    
    // Verify both plugins work together
    await helpers.admin.visitAdminPage('admin.php?page=extension-plugin');
    
    // Check for integration features
    await expect(page.locator('.core-integration')).toBeVisible();
  });

  test('should validate plugin build process', async ({ page }) => {
    // Check if built assets exist
    const buildPath = path.join(process.cwd(), 'dist');
    
    if (fs.existsSync(buildPath)) {
      // Verify built assets are loaded
      await helpers.admin.visitAdminPage('');
      
      // Check for built CSS
      const cssLoaded = await page.evaluate(() => {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        return Array.from(links).some(link => 
          link.href.includes('my-plugin') && link.href.includes('dist')
        );
      });
      
      // Check for built JS
      const jsLoaded = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[src]');
        return Array.from(scripts).some(script => 
          script.src.includes('my-plugin') && script.src.includes('dist')
        );
      });
      
      if (process.env.PLUGIN_MODE === 'built') {
        expect(cssLoaded || jsLoaded).toBeTruthy();
      }
    }
  });

  test('should handle development vs production modes', async ({ page }) => {
    await helpers.activatePlugin('my-plugin');
    await helpers.admin.visitAdminPage('admin.php?page=my-plugin');
    
    // Check for development-specific features
    const devMode = process.env.PLUGIN_DEV_MODE === 'true';
    
    if (devMode) {
      // Development mode should show debug info
      await expect(page.locator('.debug-info')).toBeVisible();
      
      // Check for unminified assets
      const unminifiedAssets = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[src]');
        return Array.from(scripts).some(script => 
          script.src.includes('my-plugin') && !script.src.includes('.min.')
        );
      });
      expect(unminifiedAssets).toBeTruthy();
    } else {
      // Production mode should not show debug info
      await expect(page.locator('.debug-info')).not.toBeVisible();
    }
  });
});
```

### Multi-Plugin Integration Test (`tests/e2e/plugin-interactions.test.js`)

```javascript
import { test, expect } from '@playwright/test';
import { TestFlowHelpers } from '@your-org/testflow';

test.describe('Multi-Plugin Interactions', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestFlowHelpers(page);
    await helpers.wpLogin();
  });

  test('should activate plugins in correct order', async () => {
    const plugins = ['core-plugin', 'extension-plugin'];
    
    // Activate in dependency order
    for (const plugin of plugins) {
      await helpers.activatePlugin(plugin);
      const isActive = await helpers.isPluginActive(plugin);
      expect(isActive).toBe(true);
    }
  });

  test('should handle plugin communication', async ({ page }) => {
    await helpers.bulkActivatePlugins(['core-plugin', 'extension-plugin']);
    
    // Test inter-plugin communication
    await helpers.admin.visitAdminPage('admin.php?page=core-plugin');
    
    // Trigger action that should affect extension plugin
    await page.click('#trigger-extension');
    
    // Navigate to extension plugin page
    await helpers.admin.visitAdminPage('admin.php?page=extension-plugin');
    
    // Verify the communication worked
    await expect(page.locator('.communication-success')).toBeVisible();
  });

  test('should detect plugin conflicts', async () => {
    const conflictResult = await helpers.checkPluginConflicts([
      'core-plugin',
      'extension-plugin',
      'utility-plugin'
    ]);
    
    expect(conflictResult.conflictCount).toBe(0);
    expect(conflictResult.totalTested).toBe(3);
  });

  test('should test different plugin combinations', async () => {
    const combinations = [
      ['core-plugin'],
      ['core-plugin', 'extension-plugin'],
      ['core-plugin', 'utility-plugin']
    ];
    
    for (const combination of combinations) {
      // Deactivate all plugins first
      const activePlugins = await helpers.getActivePluginsWithInfo();
      const activeLocalPlugins = activePlugins
        .filter(p => ['core-plugin', 'extension-plugin', 'utility-plugin'].includes(p.slug))
        .map(p => p.slug);
      
      if (activeLocalPlugins.length > 0) {
        await helpers.bulkDeactivatePlugins(activeLocalPlugins);
      }
      
      // Activate current combination
      await helpers.bulkActivatePlugins(combination);
      
      // Test basic functionality
      await helpers.admin.visitAdminPage('');
      
      // Check for any PHP errors
      const phpErrors = await helpers.checkForPHPErrors();
      expect(phpErrors.length).toBe(0);
      
      // Performance check
      const metrics = await helpers.measureDetailedPerformance(
        `${process.env.WP_BASE_URL || 'https://testflow.lndo.site'}/wp-admin/`
      );
      expect(metrics.totalLoadTime).toBeLessThan(5000);
    }
  });
});
```

## Development Workflows

### Hot Reloading Setup
Configure automatic test re-runs when files change:

```javascript
// testflow.config.js
export default {
  watch: {
    enabled: process.env.NODE_ENV === 'development',
    paths: [
      './src/**/*.php',
      './src/**/*.js',
      './src/**/*.css',
      './tests/**/*.test.js'
    ],
    ignore: [
      './node_modules/**',
      './vendor/**',
      './dist/**'
    ],
    debounce: 1000
  }
};
```

### Build Integration
Integrate with common build tools:

```bash
# Package.json scripts
{
  "scripts": {
    "test": "testflow run testflow-local-basic.yaml",
    "test:watch": "testflow run testflow-local-basic.yaml --watch",
    "test:build": "npm run build && testflow run testflow-local-build.yaml",
    "test:ci": "testflow run testflow-local-ci.yaml",
    "dev": "concurrently \"npm run build:watch\" \"npm run test:watch\""
  }
}
```

### IDE Integration
VS Code tasks configuration:

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "TestFlow: Run Local Tests",
      "type": "shell",
      "command": "bun testflow run testflow-local-basic.yaml",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "TestFlow: Watch Mode",
      "type": "shell",
      "command": "bun testflow run testflow-local-basic.yaml --watch",
      "group": "test",
      "isBackground": true,
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "dedicated"
      }
    }
  ]
}
```

## Best Practices

### Development Setup
1. **Version Control**: Keep test configurations in version control
2. **Environment Consistency**: Use consistent PHP/WordPress versions
3. **Dependency Management**: Properly handle plugin dependencies
4. **Build Processes**: Separate development and production builds

### Testing Strategy
1. **Incremental Testing**: Test small changes frequently
2. **Integration Testing**: Test plugin interactions
3. **Performance Monitoring**: Monitor performance impact
4. **Cross-Version Testing**: Test multiple WordPress/PHP versions

### File Organization
```
project/
├── src/                     # Plugin source code
├── tests/
│   ├── e2e/                # End-to-end tests
│   └── unit/               # Unit tests
├── testflow-local-*.yaml   # TestFlow configurations
├── .env.local              # Local environment variables
└── package.json            # Build scripts and dependencies
```

### Security Considerations
1. **Local Paths**: Avoid hardcoded absolute paths
2. **Environment Variables**: Use environment variables for configuration
3. **Build Artifacts**: Don't commit build artifacts
4. **Sensitive Data**: Keep sensitive data out of test configurations

## Troubleshooting

### Common Issues

1. **Plugin Not Found**
   ```bash
   Error: Plugin directory not found
   ```
   - Verify the path in configuration
   - Check file permissions
   - Ensure plugin structure is correct

2. **Build Process Fails**
   ```bash
   Error: Build command failed
   ```
   - Check build dependencies
   - Verify build commands
   - Check for build tool versions

3. **File Watching Issues**
   ```bash
   Error: File watcher failed
   ```
   - Check file system limits
   - Verify watch paths exist
   - Restart the development server

### Debug Commands

```bash
# Validate local plugin structure
bun testflow validate-plugin --path="./src"

# Test build process
bun testflow build-test --config="testflow-local-build.yaml"

# Check file permissions
bun testflow check-permissions --path="./src"
```

This comprehensive local development example provides everything needed to test WordPress plugins during development, from simple file mounting to complex build processes and CI/CD integration. 