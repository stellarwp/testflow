# WordPress Helpers Documentation

TestFlow provides comprehensive WordPress testing utilities that seamlessly integrate with the official WordPress E2E test utils while adding TestFlow-specific enhancements for plugin testing.

## Overview

TestFlow WordPress helpers are built on top of `@wordpress/e2e-test-utils-playwright` and provide:

- **Official WordPress E2E Integration**: Seamless use of WordPress's official test utilities
- **TestFlow Enhancements**: Bulk operations, conflict detection, and plugin-specific helpers
- **Backward Compatibility**: Legacy functions remain available while encouraging modern patterns
- **Default Environment**: All tests run on `https://testflow.lndo.site` by default

## Quick Start

### Using WordPress E2E Test Fixtures (Recommended)

```javascript
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

test('Modern WordPress testing', async ({ admin, editor, pageUtils, requestUtils }) => {
  // Admin operations
  await admin.visitAdminPage('plugins.php');
  await admin.createNewPost();
  
  // Editor operations
  await editor.insertBlock({ name: 'core/paragraph' });
  await editor.publishPost();
  
  // Page utilities
  await pageUtils.pressKeys('primary+a');
  
  // Fast API operations
  await requestUtils.activatePlugin('my-plugin');
});
```

### Using TestFlow Enhanced Helpers

```javascript
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { TestFlowHelpers } from 'testflow/helpers';

test('Enhanced plugin testing', async ({ page, requestUtils }) => {
  const helpers = new TestFlowHelpers(page);
  
  // Bulk plugin operations
  await helpers.bulkActivatePlugins(['plugin-a', 'plugin-b', 'plugin-c']);
  
  // Advanced conflict detection
  const conflicts = await helpers.checkPluginConflicts(['my-plugin']);
  expect(conflicts.conflictCount).toBe(0);
  
  // Performance monitoring
  const metrics = await helpers.measureDetailedPerformance('/');
  expect(metrics.totalLoadTime).toBeLessThan(2000);
});
```

## Test Fixtures

TestFlow extends Playwright's test with WordPress-specific fixtures:

### Available Fixtures

```javascript
export const test = base.extend<{
  admin: Admin;           // WordPress admin utilities
  editor: Editor;         // Gutenberg editor utilities  
  pageUtils: PageUtils;   // Page interaction utilities
  requestUtils: RequestUtils; // Fast API operations
}>
```

### Configuration

Fixtures are automatically configured with:
- **Base URL**: `https://testflow.lndo.site` (override with `WP_BASE_URL`)
- **Authentication**: Admin user credentials (override with `WP_USERNAME`/`WP_PASSWORD`)
- **Storage State**: Persistent login across tests

## TestFlowHelpers Class

The `TestFlowHelpers` class provides advanced functionality not available in WordPress E2E utils:

### Initialization

```javascript
import { TestFlowHelpers } from 'testflow/helpers';

const helpers = new TestFlowHelpers(page);

// Initialize API operations (optional, called automatically when needed)
await helpers.initRequestUtils();
```

### Bulk Plugin Operations

```javascript
// Activate multiple plugins efficiently
await helpers.bulkActivatePlugins(['woocommerce', 'jetpack', 'yoast-seo']);

// Deactivate multiple plugins
await helpers.bulkDeactivatePlugins(['old-plugin', 'conflicting-plugin']);

// Get detailed plugin information
const activePlugins = await helpers.getActivePluginsWithInfo();
console.log(activePlugins);
/*
[
  {
    slug: 'my-plugin',
    name: 'My Plugin',
    version: '1.2.3',
    isActive: true,
    isNetworkActive: false
  }
]
*/
```

### Plugin Conflict Detection

```javascript
// Test plugin combinations for conflicts
const conflicts = await helpers.checkPluginConflicts([
  'plugin-a', 
  'plugin-b', 
  'plugin-c'
]);

if (conflicts.conflictCount > 0) {
  console.log('Conflicts found:', conflicts.conflicts);
  console.log('Error details:', conflicts.errors);
}
```

### Advanced Plugin Initialization

```javascript
// Wait for plugin to fully initialize
await helpers.waitForPluginInitialized('my-plugin', {
  timeout: 15000,
  indicators: [
    '[data-plugin="my-plugin"]',
    '.my-plugin-ready',
    '#my-plugin-status'
  ],
  adminPage: 'admin.php?page=my-plugin'
});
```

### Cache Management

```javascript
// Clear all WordPress caches comprehensively
await helpers.clearAllCaches();

// Supports popular caching plugins:
// - W3 Total Cache
// - WP Super Cache  
// - WP Rocket
// - LiteSpeed Cache
// - WP Fastest Cache
// - WP-Optimize
```

### Performance Testing

```javascript
// Detailed performance measurement
const metrics = await helpers.measureDetailedPerformance('/my-page');

console.log({
  domContentLoaded: metrics.domContentLoaded,
  loadComplete: metrics.loadComplete,
  firstPaint: metrics.firstPaint,
  firstContentfulPaint: metrics.firstContentfulPaint,
  resourceCount: metrics.resourceCount,
  totalResourceSize: metrics.totalResourceSize,
  totalLoadTime: metrics.totalLoadTime,
  timestamp: metrics.timestamp
});
```

### Multisite Operations

```javascript
// Network activate plugin across multisite
await helpers.networkActivatePlugin('my-plugin');

// Switch to specific site in network
await helpers.switchToSite('subsite.example.com');
```

### Error Detection

```javascript
// Check for PHP errors on current page
const phpErrors = await helpers.checkForPHPErrors();
if (phpErrors.length > 0) {
  console.warn('PHP errors detected:', phpErrors);
}
```

### Screenshot Management

```javascript
// Take organized screenshots
const screenshotPath = await helpers.takeTestScreenshot('plugin-activation', {
  fullPage: true,
  directory: 'test-screenshots',
  timestamp: true
});
```

## Legacy Functions (Backward Compatibility)

Legacy functions are still available for backward compatibility:

```javascript
import { 
  wpLogin, 
  activatePlugin, 
  deactivatePlugin, 
  isPluginActive,
  createPost,
  clearCache,
  measurePageLoad,
  switchToSite,
  networkActivatePlugin
} from 'testflow/helpers';

// These functions now use WordPress E2E utils internally
test('Legacy approach', async ({ page }) => {
  await wpLogin(page);
  await activatePlugin(page, 'my-plugin');
  
  const isActive = await isPluginActive(page, 'my-plugin');
  expect(isActive).toBe(true);
  
  const loadTime = await measurePageLoad(page, '/');
  expect(loadTime).toBeLessThan(3000);
});
```

## Environment Configuration

### Default Settings

- **Base URL**: `https://testflow.lndo.site`
- **Username**: `admin` 
- **Password**: `password`

### Override with Environment Variables

```bash
# .env file or CI environment
WP_BASE_URL=https://my-test-site.com
WP_USERNAME=testuser
WP_PASSWORD=testpass123
```

### In testflow.yaml

```yaml
environment:
  WP_BASE_URL: 'https://my-custom-site.lndo.site'
  WP_USERNAME: 'admin'
  WP_PASSWORD: 'secure-password'
```

## Best Practices

### 1. Use Modern Fixtures

```javascript
// ✅ Recommended
test('Modern approach', async ({ admin, requestUtils }) => {
  await admin.visitAdminPage('plugins.php');
  await requestUtils.activatePlugin('my-plugin');
});

// ❌ Avoid (legacy)
test('Legacy approach', async ({ page }) => {
  await wpLogin(page);
  await activatePlugin(page, 'my-plugin');
});
```

### 2. Bulk Operations for Efficiency

```javascript
// ✅ Efficient bulk operations
const helpers = new TestFlowHelpers(page);
await helpers.bulkActivatePlugins(['plugin-a', 'plugin-b', 'plugin-c']);

// ❌ Inefficient individual operations
await requestUtils.activatePlugin('plugin-a');
await requestUtils.activatePlugin('plugin-b');
await requestUtils.activatePlugin('plugin-c');
```

### 3. Conflict Detection

```javascript
// ✅ Check for conflicts before testing
const conflicts = await helpers.checkPluginConflicts(pluginsToTest);
if (conflicts.conflictCount > 0) {
  test.skip('Skipping due to plugin conflicts');
}
```

### 4. Performance Monitoring

```javascript
// ✅ Monitor performance impact
test('Performance impact', async ({ page }) => {
  const helpers = new TestFlowHelpers(page);
  
  // Baseline measurement
  const baseline = await helpers.measureDetailedPerformance('/');
  
  // Activate plugin
  await helpers.bulkActivatePlugins(['my-plugin']);
  
  // Measure impact
  const withPlugin = await helpers.measureDetailedPerformance('/');
  
  const performanceImpact = withPlugin.totalLoadTime - baseline.totalLoadTime;
  expect(performanceImpact).toBeLessThan(1000); // Less than 1s impact
});
```

## Type Definitions

TestFlow provides TypeScript support with comprehensive interfaces:

```typescript
interface PluginInfo {
  slug: string;
  name: string;
  version: string;
  isActive: boolean;
  isNetworkActive: boolean;
}

interface ConflictResult {
  conflicts: string[];
  errors: { [key: string]: string[] };
  totalTested: number;
  conflictCount: number;
}

interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  resourceCount: number;
  totalResourceSize: number;
  slowestResource: any;
  totalLoadTime: number;
  timestamp: string;
}

interface WaitOptions {
  timeout?: number;
  indicators?: string[];
  adminPage?: string;
}

interface ScreenshotOptions {
  fullPage?: boolean;
  directory?: string;
  timestamp?: boolean;
}
```

## Migration Guide

### From Legacy to Modern

1. **Replace individual imports**:
```javascript
// Old
const { wpLogin, activatePlugin } = require('testflow/helpers');

// New  
import { test } from '@wordpress/e2e-test-utils-playwright';
```

2. **Use fixtures instead of manual operations**:
```javascript
// Old
test('Old way', async ({ page }) => {
  await wpLogin(page);
  await page.goto('/wp-admin/plugins.php');
});

// New
test('New way', async ({ admin }) => {
  await admin.visitAdminPage('plugins.php');
});
```

3. **Leverage TestFlow enhancements**:
```javascript
// Enhanced with TestFlow
import { TestFlowHelpers } from 'testflow/helpers';

test('Enhanced testing', async ({ page }) => {
  const helpers = new TestFlowHelpers(page);
  await helpers.bulkActivatePlugins(['multiple', 'plugins']);
});
```

## Troubleshooting

### Common Issues

1. **URL Configuration**: Ensure `WP_BASE_URL` matches your Lando setup
2. **Authentication**: Verify `WP_USERNAME`/`WP_PASSWORD` environment variables
3. **Plugin Slugs**: Use exact plugin directory names, not display names
4. **Timeouts**: Increase timeout for slow operations in `waitForPluginInitialized()`

### Debug Mode

```javascript
// Enable debug logging
test('Debug test', async ({ page }) => {
  const helpers = new TestFlowHelpers(page);
  
  // Errors are automatically logged to console
  await helpers.bulkActivatePlugins(['problematic-plugin']);
});
```

## Examples

See the [examples directory](../examples/) for complete test suites showcasing:

- Basic plugin testing
- Performance monitoring
- Multisite operations
- Conflict detection
- Bulk operations
- Cache management 