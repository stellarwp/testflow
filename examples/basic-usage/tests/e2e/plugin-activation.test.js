/**
 * Plugin Activation Tests
 * 
 * Tests plugin activation, deactivation, and management functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Plugin Activation Tests', () => {
  let wpHelpers;

  test.beforeEach(async ({ page }) => {
    // Import and initialize WordPress helpers
    const { WordPressHelpers } = await import('../../src/utils/wordpress-helpers.js');
    wpHelpers = new WordPressHelpers(page);
    
    // Login to WordPress admin
    await wpHelpers.login();
  });

  test('should pre-activate plugins according to configuration', async ({ page }) => {
    // Navigate to plugins page
    await wpHelpers.goToPlugins();
    
    // Check if plugins are already activated (pre-activation)
    const activePlugins = await wpHelpers.getActivePlugins();
    
    console.log('Active plugins:', activePlugins);
    
    // Verify that expected plugins are active
    expect(activePlugins.length).toBeGreaterThan(0);
    
    // Take screenshot for verification
    await wpHelpers.takeScreenshot('pre-activated-plugins.png');
  });

  test('should manually activate a specific plugin', async ({ page }) => {
    const pluginSlug = 'test-plugin';
    
    // Check if plugin is initially inactive
    const isActive = await wpHelpers.isPluginActive(pluginSlug);
    
    if (!isActive) {
      // Activate the plugin
      await wpHelpers.activatePlugin(pluginSlug);
      
      // Verify activation
      const isNowActive = await wpHelpers.isPluginActive(pluginSlug);
      expect(isNowActive).toBe(true);
      
      // Wait for plugin to fully load
      await wpHelpers.waitForPluginLoaded(pluginSlug);
      
      // Check for any PHP errors
      const errors = await wpHelpers.checkForPHPErrors();
      expect(errors.length).toBe(0);
    }
  });

  test('should deactivate a plugin', async ({ page }) => {
    const pluginSlug = 'test-plugin';
    
    // Ensure plugin is active first
    await wpHelpers.activatePlugin(pluginSlug);
    expect(await wpHelpers.isPluginActive(pluginSlug)).toBe(true);
    
    // Deactivate the plugin
    await wpHelpers.deactivatePlugin(pluginSlug);
    
    // Verify deactivation
    const isActive = await wpHelpers.isPluginActive(pluginSlug);
    expect(isActive).toBe(false);
  });

  test('should bulk activate multiple plugins', async ({ page }) => {
    const pluginSlugs = ['plugin-one', 'plugin-two', 'helper-plugin'];
    
    // Bulk activate plugins
    await wpHelpers.bulkActivatePlugins(pluginSlugs);
    
    // Verify all plugins are active
    for (const slug of pluginSlugs) {
      const isActive = await wpHelpers.isPluginActive(slug);
      expect(isActive).toBe(true);
    }
    
    // Check for any activation errors
    const errors = await wpHelpers.checkForPHPErrors();
    expect(errors.length).toBe(0);
  });

  test('should handle plugin conflicts gracefully', async ({ page }) => {
    // Activate potentially conflicting plugins
    const conflictingPlugins = ['plugin-a', 'conflicting-plugin-b'];
    
    try {
      await wpHelpers.bulkActivatePlugins(conflictingPlugins);
      
      // Check for any error notices
      const errors = await wpHelpers.checkForPHPErrors();
      
      if (errors.length > 0) {
        console.log('Plugin conflicts detected:', errors);
        
        // Deactivate problematic plugins
        await wpHelpers.bulkDeactivatePlugins(['conflicting-plugin-b']);
        
        // Verify main plugin still works
        const isMainActive = await wpHelpers.isPluginActive('plugin-a');
        expect(isMainActive).toBe(true);
      }
      
    } catch (error) {
      console.log('Expected plugin conflict handled:', error.message);
    }
  });

  test('should verify plugin functionality after activation', async ({ page }) => {
    const pluginSlug = 'my-main-plugin';
    
    // Activate plugin
    await wpHelpers.activatePlugin(pluginSlug);
    
    // Wait for plugin to load
    await wpHelpers.waitForPluginLoaded(pluginSlug);
    
    // Test plugin functionality on frontend
    await wpHelpers.goToFrontend('/');
    
    // Check if plugin added expected elements/functionality
    const pluginElements = page.locator('[data-plugin="my-main-plugin"]');
    await expect(pluginElements).toBeVisible();
    
    // Test admin functionality
    await wpHelpers.login();
    
    // Check if plugin added admin menu
    const adminMenu = page.locator('#adminmenu a:has-text("My Plugin")');
    await expect(adminMenu).toBeVisible();
  });

  test('should handle network activation in multisite', async ({ page }) => {
    // This test would run in multisite profile
    const networkPlugin = 'network-activated-plugin';
    
    // Check if we're in a multisite environment
    const isMultisite = await page.locator('body.multisite').isVisible().catch(() => false);
    
    if (isMultisite) {
      // Navigate to network admin
      await page.goto('/wp-admin/network/plugins.php');
      
      // Network activate plugin
      const networkActivateLink = page.locator(`tr:has-text("${networkPlugin}") .activate a`);
      
      if (await networkActivateLink.isVisible()) {
        await networkActivateLink.click();
        
        // Verify network activation
        const networkActiveLink = page.locator(`tr:has-text("${networkPlugin}") .deactivate a`);
        await expect(networkActiveLink).toBeVisible();
      }
    } else {
      test.skip('Not in multisite environment');
    }
  });

  test('should test plugin performance impact', async ({ page }) => {
    // Measure page load time without plugins
    await wpHelpers.bulkDeactivatePlugins(['all']);
    
    const startTime = Date.now();
    await wpHelpers.goToFrontend('/');
    const baselineTime = Date.now() - startTime;
    
    // Activate plugins and measure again
    await wpHelpers.login();
    await wpHelpers.bulkActivatePlugins(['performance-plugin', 'caching-plugin']);
    
    const pluginStartTime = Date.now();
    await wpHelpers.goToFrontend('/');
    const pluginTime = Date.now() - pluginStartTime;
    
    console.log(`Baseline load time: ${baselineTime}ms`);
    console.log(`With plugins load time: ${pluginTime}ms`);
    
    // Ensure performance impact is reasonable (less than 2x slower)
    expect(pluginTime).toBeLessThan(baselineTime * 2);
  });

  test('should verify plugin compatibility with WordPress version', async ({ page }) => {
    await wpHelpers.login();
    
    // Get WordPress version
    const wpVersion = await wpHelpers.getWordPressVersion();
    console.log(`WordPress version: ${wpVersion}`);
    
    // Activate plugins and check for compatibility warnings
    await wpHelpers.activatePlugin('version-sensitive-plugin');
    
    // Check for version compatibility notices
    const compatibilityNotices = await page.locator('.notice:has-text("compatibility"), .notice:has-text("version")').all();
    
    for (const notice of compatibilityNotices) {
      const noticeText = await notice.textContent();
      console.log('Compatibility notice:', noticeText);
    }
    
    // Ensure no critical compatibility errors
    const errors = await wpHelpers.checkForPHPErrors();
    const criticalErrors = errors.filter(error => 
      error.includes('Fatal') || error.includes('Critical')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should test selective plugin activation based on environment', async ({ page }) => {
    // Get environment from page or configuration
    const environment = process.env.ENVIRONMENT || 'development';
    
    console.log(`Testing in ${environment} environment`);
    
    let expectedPlugins = [];
    
    switch (environment) {
      case 'development':
        expectedPlugins = ['query-monitor', 'debug-bar', 'main-plugin'];
        break;
      case 'staging':
        expectedPlugins = ['main-plugin'];
        break;
      case 'production':
        expectedPlugins = ['main-plugin', 'security-plugin'];
        break;
    }
    
    // Verify expected plugins are active
    const activePlugins = await wpHelpers.getActivePlugins();
    
    for (const expectedPlugin of expectedPlugins) {
      const isActive = activePlugins.some(plugin => 
        plugin.toLowerCase().includes(expectedPlugin.toLowerCase())
      );
      
      expect(isActive).toBe(true);
    }
    
    // Verify dev-only plugins are not active in production
    if (environment === 'production') {
      const devPlugins = ['query-monitor', 'debug-bar'];
      
      for (const devPlugin of devPlugins) {
        const isActive = activePlugins.some(plugin => 
          plugin.toLowerCase().includes(devPlugin.toLowerCase())
        );
        
        expect(isActive).toBe(false);
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up: take screenshot if test failed
    if (test.info().status === 'failed') {
      await wpHelpers.takeScreenshot(`failed-${test.info().title}.png`);
    }
    
    // Clear caches to ensure clean state
    await wpHelpers.clearCaches();
  });
}); 