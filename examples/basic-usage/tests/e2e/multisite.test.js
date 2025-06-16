/**
 * WordPress Multisite Tests
 * 
 * Tests specific to WordPress multisite functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Multisite Tests', () => {
  let wpHelpers;

  test.beforeEach(async ({ page }) => {
    // Import and initialize WordPress helpers
    const { WordPressHelpers } = await import('../../src/utils/wordpress-helpers.js');
    wpHelpers = new WordPressHelpers(page);
    
    // Check if we're in multisite environment
    await wpHelpers.login();
    
    const isMultisite = await page.locator('body.multisite').isVisible().catch(() => false);
    
    if (!isMultisite) {
      test.skip('Not in multisite environment');
    }
  });

  test('should network activate plugins', async ({ page }) => {
    // Navigate to network admin plugins
    await page.goto('/wp-admin/network/plugins.php');
    
    // Network activate a plugin
    const pluginRow = page.locator('tr:has-text("Test Plugin")').first();
    const networkActivateLink = pluginRow.locator('a:has-text("Network Activate")');
    
    if (await networkActivateLink.isVisible()) {
      await networkActivateLink.click();
      
      // Verify success notice
      await expect(page.locator('.notice-success')).toContainText('Plugin activated');
      
      // Verify plugin shows as network active
      const networkDeactivateLink = pluginRow.locator('a:has-text("Network Deactivate")');
      await expect(networkDeactivateLink).toBeVisible();
    }
  });

  test('should create and manage subsites', async ({ page }) => {
    // Navigate to network sites
    await page.goto('/wp-admin/network/sites.php');
    
    // Click Add New site
    await page.click('a:has-text("Add New")');
    
    // Fill in site details
    const siteDomain = `test-${Date.now()}`;
    await page.fill('#site-address', siteDomain);
    await page.fill('#site-title', 'Test Subsite');
    await page.fill('#admin-email', 'admin@example.com');
    
    // Submit form
    await page.click('#submit');
    
    // Verify site was created
    await expect(page.locator('.notice-success')).toContainText('Site added');
    
    // Navigate back to sites list
    await page.goto('/wp-admin/network/sites.php');
    
    // Verify new site appears in list
    await expect(page.locator(`tr:has-text("${siteDomain}")`)).toBeVisible();
  });

  test('should manage network users', async ({ page }) => {
    // Navigate to network users
    await page.goto('/wp-admin/network/users.php');
    
    // Verify users table is visible
    await expect(page.locator('.wp-list-table')).toBeVisible();
    
    // Check for super admin indicators
    const superAdminRows = page.locator('tr:has-text("Super Admin")');
    const superAdminCount = await superAdminRows.count();
    
    expect(superAdminCount).toBeGreaterThan(0);
  });

  test('should configure network settings', async ({ page }) => {
    // Navigate to network settings
    await page.goto('/wp-admin/network/settings.php');
    
    // Verify settings form is present
    await expect(page.locator('#network-settings')).toBeVisible();
    
    // Test updating a setting
    const currentTitle = await page.inputValue('#site_name');
    const newTitle = `Updated Network ${Date.now()}`;
    
    await page.fill('#site_name', newTitle);
    await page.click('#submit');
    
    // Verify setting was saved
    await expect(page.locator('.notice-updated')).toContainText('Settings saved');
    
    // Restore original title
    await page.fill('#site_name', currentTitle);
    await page.click('#submit');
  });

  test('should handle plugin activation on individual sites', async ({ page }) => {
    // Navigate to a subsite's admin area
    await page.goto('/wp-admin/network/sites.php');
    
    // Find first subsite and click dashboard link
    const firstSite = page.locator('.wp-list-table tr').nth(1);
    const dashboardLink = firstSite.locator('a:has-text("Dashboard")');
    
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      
      // Now we're in the subsite admin
      await page.click('text=Plugins');
      
      // Try to activate a plugin on this subsite
      const pluginRow = page.locator('tr:has-text("Test Plugin")').first();
      const activateLink = pluginRow.locator('a:has-text("Activate")');
      
      if (await activateLink.isVisible()) {
        await activateLink.click();
        
        // Verify activation
        await expect(page.locator('.notice-success')).toContainText('Plugin activated');
      }
    }
  });

  test('should test multisite specific plugin functionality', async ({ page }) => {
    // Test functionality that only works in multisite
    await page.goto('/wp-admin/network/');
    
    // Check for network-specific admin elements
    await expect(page.locator('#network-admin-bar-my-account')).toBeVisible();
    
    // Test switching between sites
    const siteSwitcher = page.locator('#wp-admin-bar-my-sites');
    
    if (await siteSwitcher.isVisible()) {
      await siteSwitcher.hover();
      
      // Verify subsites menu appears
      await expect(page.locator('.ab-submenu')).toBeVisible();
    }
  });

  test('should handle network themes', async ({ page }) => {
    // Navigate to network themes
    await page.goto('/wp-admin/network/themes.php');
    
    // Verify themes table
    await expect(page.locator('.wp-list-table')).toBeVisible();
    
    // Test network enabling a theme
    const themeRow = page.locator('.theme').first();
    const networkEnableLink = themeRow.locator('a:has-text("Network Enable")');
    
    if (await networkEnableLink.isVisible()) {
      await networkEnableLink.click();
      
      // Verify theme is network enabled
      const networkDisableLink = themeRow.locator('a:has-text("Network Disable")');
      await expect(networkDisableLink).toBeVisible();
    }
  });

  test('should test domain mapping functionality', async ({ page }) => {
    // This would test domain mapping if plugin is active
    await page.goto('/wp-admin/network/settings.php');
    
    // Look for domain mapping settings
    const domainMappingSection = page.locator(':has-text("Domain Mapping")');
    
    if (await domainMappingSection.isVisible()) {
      console.log('Domain mapping is available');
      
      // Test domain mapping configuration
      // Implementation would depend on specific domain mapping plugin
    } else {
      console.log('Domain mapping not available - skipping test');
    }
  });

  test.afterEach(async ({ page }) => {
    // Take screenshot if test failed
    if (test.info().status === 'failed') {
      await wpHelpers.takeScreenshot(`multisite-failed-${test.info().title}.png`);
    }
  });
}); 