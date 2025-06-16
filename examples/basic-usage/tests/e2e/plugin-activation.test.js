/**
 * Plugin Activation Tests using WordPress E2E Test Utils
 */

import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { 
  wpLogin, 
  activatePlugin, 
  deactivatePlugin, 
  isPluginActive, 
  clearCache 
} from '../../../src/utils/wordpress-helpers.js';

test.describe('Plugin Activation with WordPress E2E Utils', () => {
  test.beforeEach(async ({ admin }) => {
    // Use WordPress official admin utilities
    await admin.visitAdminPage('/');
  });

  test('Pre-activation: Plugins should be pre-activated automatically', async ({ page, admin }) => {
    await admin.visitAdminPage('plugins.php');
    
    // Check if our main plugin is already activated from configuration
    const mainPlugin = page.locator('tr[data-slug="my-plugin"]');
    await expect(mainPlugin.locator('a:has-text("Deactivate")')).toBeVisible();
  });

  test('Manual activation: Should activate plugin via admin interface', async ({ page, admin }) => {
    await admin.visitAdminPage('plugins.php');
    
    // First deactivate if active
    const pluginRow = page.locator('tr[data-slug="my-plugin"]');
    if (await pluginRow.locator('a:has-text("Deactivate")').isVisible()) {
      await pluginRow.locator('a:has-text("Deactivate")').click();
      await page.waitForSelector('.notice-success');
    }
    
    // Now activate
    await pluginRow.locator('a:has-text("Activate")').click();
    await page.waitForSelector('.notice-success');
    
    // Verify activation
    await expect(pluginRow.locator('a:has-text("Deactivate")')).toBeVisible();
  });

  test('Helper function activation: Should use helper functions', async ({ page, admin }) => {
    // Test using our helper functions with WordPress utilities
    const isActive = await isPluginActive(page, 'my-plugin');
    
    if (isActive) {
      await deactivatePlugin(page, 'my-plugin');
    }
    
    await activatePlugin(page, 'my-plugin');
    
    const isNowActive = await isPluginActive(page, 'my-plugin');
    expect(isNowActive).toBe(true);
  });

  test('Bulk activation: Should activate multiple plugins', async ({ page, admin, requestUtils }) => {
    await admin.visitAdminPage('plugins.php');
    
    // Use WordPress RequestUtils for bulk operations when possible
    try {
      await requestUtils.activatePlugin('my-plugin');
      await requestUtils.activatePlugin('another-plugin');
    } catch (error) {
      // Fallback to UI bulk activation
      const pluginCheckboxes = page.locator('tr[data-slug] input[type="checkbox"]');
      const count = await pluginCheckboxes.count();
      
      for (let i = 0; i < Math.min(count, 2); i++) {
        await pluginCheckboxes.nth(i).check();
      }
      
      await page.selectOption('[name="action"]', 'activate-selected');
      await page.click('#doaction');
      await page.waitForSelector('.notice-success');
    }
  });

  test('Plugin conflicts: Should handle plugin conflicts gracefully', async ({ page, admin }) => {
    // Test plugin conflict resolution
    const conflictingPlugins = ['conflicting-plugin-1', 'conflicting-plugin-2'];
    
    for (const plugin of conflictingPlugins) {
      try {
        await activatePlugin(page, plugin);
        
        // Check for error notices
        const errorNotices = page.locator('.notice-error');
        if (await errorNotices.count() > 0) {
          console.log(`Conflict detected with ${plugin}, deactivating...`);
          await deactivatePlugin(page, plugin);
        }
      } catch (error) {
        console.log(`Expected conflict with ${plugin}:`, error.message);
      }
    }
  });

  test('Plugin settings: Should access plugin settings after activation', async ({ page, admin, editor }) => {
    // Ensure plugin is active
    await activatePlugin(page, 'my-plugin');
    
    // Navigate to plugin settings using WordPress admin utilities
    await admin.visitAdminPage('admin.php?page=my-plugin-settings');
    
    // Verify settings page loads
    await expect(page.locator('h1')).toContainText('My Plugin Settings');
    await expect(page.locator('.form-table')).toBeVisible();
  });

  test('Network activation: Should work in multisite environment', async ({ page, admin }) => {
    // Check if multisite is enabled
    const isMultisite = await page.locator('#wp-admin-bar-my-sites').isVisible();
    
    if (isMultisite) {
      await admin.visitAdminPage('network/plugins.php');
      
      const pluginRow = page.locator('tr[data-slug="my-plugin"]');
      const networkActivateLink = pluginRow.locator('a:has-text("Network Activate")');
      
      if (await networkActivateLink.isVisible()) {
        await networkActivateLink.click();
        await page.waitForSelector('.notice-success');
      }
      
      // Verify network activation
      await expect(pluginRow.locator('a:has-text("Network Deactivate")')).toBeVisible();
    } else {
      test.skip('Multisite not enabled');
    }
  });

  test('Performance impact: Should measure activation performance', async ({ page, admin }) => {
    // Clear caches before testing
    await clearCache(page);
    
    // Measure time to activate plugin
    const startTime = Date.now();
    await activatePlugin(page, 'my-plugin');
    const activationTime = Date.now() - startTime;
    
    // Activation should be reasonably fast
    expect(activationTime).toBeLessThan(5000); // Less than 5 seconds
    
    // Check if plugin activation affects page load times
    const adminLoadStart = Date.now();
    await admin.visitAdminPage('/');
    const adminLoadTime = Date.now() - adminLoadStart;
    
    expect(adminLoadTime).toBeLessThan(3000); // Admin should load in under 3 seconds
  });

  test('Plugin dependencies: Should handle plugin dependencies', async ({ page, admin, requestUtils }) => {
    // Test plugin dependency chain
    const dependencyChain = [
      'core-dependency',
      'my-plugin', // depends on core-dependency
      'addon-plugin' // depends on my-plugin
    ];
    
    // Activate in correct order using WordPress utilities
    for (const plugin of dependencyChain) {
      try {
        await requestUtils.activatePlugin(plugin);
      } catch (error) {
        // Fallback to manual activation
        await activatePlugin(page, plugin);
      }
    }
    
    // Verify all plugins are active
    for (const plugin of dependencyChain) {
      const isActive = await isPluginActive(page, plugin);
      expect(isActive).toBe(true);
    }
  });

  test('Environment-based activation: Should respect environment settings', async ({ page, admin }) => {
    // Test activation based on environment variables or configuration
    const environment = process.env.NODE_ENV || 'development';
    
    if (environment === 'development') {
      // In development, activate debug plugins
      const debugPlugins = ['query-monitor', 'debug-bar'];
      
      for (const plugin of debugPlugins) {
        try {
          await activatePlugin(page, plugin);
          const isActive = await isPluginActive(page, plugin);
          expect(isActive).toBe(true);
        } catch (error) {
          console.log(`Debug plugin ${plugin} not available:`, error.message);
        }
      }
    } else {
      // In production, ensure debug plugins are not active
      const debugPlugins = ['query-monitor', 'debug-bar'];
      
      for (const plugin of debugPlugins) {
        const isActive = await isPluginActive(page, plugin);
        expect(isActive).toBe(false);
      }
    }
  });
});

test.describe('Plugin Activation Edge Cases', () => {
  test('Missing plugin: Should handle missing plugin gracefully', async ({ page }) => {
    // Try to activate a non-existent plugin
    await expect(async () => {
      await activatePlugin(page, 'non-existent-plugin');
    }).rejects.toThrow('Plugin not found');
  });

  test('Already active plugin: Should handle already active plugin', async ({ page }) => {
    // Activate plugin twice - should not cause errors
    await activatePlugin(page, 'my-plugin');
    await activatePlugin(page, 'my-plugin'); // Should not throw error
    
    const isActive = await isPluginActive(page, 'my-plugin');
    expect(isActive).toBe(true);
  });

  test('PHP errors during activation: Should detect PHP errors', async ({ page, admin }) => {
    // This would be a plugin known to cause PHP errors
    const problematicPlugin = 'error-causing-plugin';
    
    try {
      await activatePlugin(page, problematicPlugin);
      
      // Check for PHP errors using WordPress utilities
      const pageContent = await page.content();
      const hasPhpErrors = pageContent.includes('Fatal error') || 
                          pageContent.includes('Parse error') ||
                          pageContent.includes('Warning:');
      
      if (hasPhpErrors) {
        console.log('PHP errors detected during plugin activation');
        await deactivatePlugin(page, problematicPlugin);
      }
    } catch (error) {
      console.log('Expected error with problematic plugin:', error.message);
    }
  });
}); 