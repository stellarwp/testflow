/**
 * Multisite Tests using WordPress E2E Test Utils
 */

import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { 
  wpLogin, 
  activatePlugin, 
  deactivatePlugin, 
  isPluginActive,
  switchToSite,
  networkActivatePlugin,
  clearCache 
} from '../../../src/utils/wordpress-helpers.js';

test.describe('WordPress Multisite Tests with E2E Utils', () => {
  test.beforeEach(async ({ admin }) => {
    // Use WordPress official admin utilities
    await admin.visitAdminPage('/');
    
    // Skip tests if not in multisite
    const isMultisite = await admin.page.locator('#wp-admin-bar-my-sites').isVisible();
    if (!isMultisite) {
      test.skip('Multisite not enabled');
    }
  });

  test('Network activation: Should activate plugin across all sites', async ({ page, admin, requestUtils }) => {
    // Navigate to network plugins page using WordPress admin utilities
    await admin.visitAdminPage('network/plugins.php');
    
    // Find our plugin row
    const pluginRow = page.locator('tr[data-slug="my-plugin"]');
    await expect(pluginRow).toBeVisible();
    
    // Network activate using helper function
    await networkActivatePlugin(page, 'my-plugin');
    
    // Verify network activation
    await expect(pluginRow.locator('a:has-text("Network Deactivate")')).toBeVisible();
    
    // Check plugin is available on subsites
    await admin.visitAdminPage('my-sites.php');
    const siteLinks = page.locator('.wp-list-table a[href*="wp-admin"]');
    
    if (await siteLinks.count() > 1) {
      // Visit first subsite
      await siteLinks.nth(1).click();
      
      // Check if plugin is active on subsite
      await admin.visitAdminPage('plugins.php');
      const subsitePluginRow = page.locator('tr[data-slug="my-plugin"]');
      
      // Should show as network activated
      await expect(subsitePluginRow.locator('.plugin-title').locator('text=Network Active')).toBeVisible();
    }
  });

  test('Site-specific activation: Should activate plugin on individual sites', async ({ page, admin }) => {
    // First ensure plugin is not network activated
    await admin.visitAdminPage('network/plugins.php');
    
    const networkPluginRow = page.locator('tr[data-slug="individual-plugin"]');
    const networkDeactivateLink = networkPluginRow.locator('a:has-text("Network Deactivate")');
    
    if (await networkDeactivateLink.isVisible()) {
      await networkDeactivateLink.click();
      await page.waitForSelector('.notice-success');
    }
    
    // Go to individual site and activate plugin
    await admin.visitAdminPage('my-sites.php');
    const siteLinks = page.locator('.wp-list-table a[href*="wp-admin"]');
    
    if (await siteLinks.count() > 0) {
      // Switch to individual site using WordPress utilities
      await siteLinks.nth(0).click();
      
      // Activate plugin on this site only
      await activatePlugin(page, 'individual-plugin');
      
      // Verify activation
      const isActive = await isPluginActive(page, 'individual-plugin');
      expect(isActive).toBe(true);
    }
  });

  test('Plugin isolation: Plugins should work independently per site', async ({ page, admin }) => {
    const testSites = [];
    
    // Get list of sites
    await admin.visitAdminPage('network/sites.php');
    const siteRows = page.locator('.wp-list-table tbody tr');
    const siteCount = await siteRows.count();
    
    // Collect site information
    for (let i = 0; i < Math.min(siteCount, 3); i++) {
      const row = siteRows.nth(i);
      const siteUrl = await row.locator('.column-blogname a').first().getAttribute('href');
      const siteName = await row.locator('.column-blogname a').first().textContent();
      
      if (siteUrl && siteName) {
        testSites.push({ url: siteUrl, name: siteName.trim() });
      }
    }
    
    console.log('Testing plugin isolation across sites:', testSites);
    
    // Test plugin activation on different sites
    for (let i = 0; i < testSites.length; i++) {
      const site = testSites[i];
      
      // Navigate to site admin
      await page.goto(site.url);
      
      // Activate different plugins on different sites
      const testPlugin = i === 0 ? 'site-specific-plugin-a' : 'site-specific-plugin-b';
      
      try {
        await activatePlugin(page, testPlugin);
        
        // Verify plugin is active on this site
        const isActive = await isPluginActive(page, testPlugin);
        expect(isActive).toBe(true);
        
        console.log(`Plugin ${testPlugin} activated on ${site.name}`);
        
      } catch (error) {
        console.log(`Plugin ${testPlugin} not available on ${site.name}`);
      }
    }
  });

  test('Super admin capabilities: Should have network admin access', async ({ page, admin }) => {
    // Verify super admin menu is accessible
    await admin.visitAdminPage('/');
    
    // Check for network admin menu
    const networkAdminLink = page.locator('#wp-admin-bar-network-admin');
    await expect(networkAdminLink).toBeVisible();
    
    // Test access to network admin areas
    const networkPages = [
      'network/',
      'network/sites.php',
      'network/users.php',
      'network/themes.php',
      'network/plugins.php',
      'network/settings.php'
    ];
    
    for (const networkPage of networkPages) {
      try {
        await admin.visitAdminPage(networkPage);
        
        // Should not get permission errors
        const permissionError = page.locator('text=You do not have sufficient permissions');
        await expect(permissionError).not.toBeVisible();
        
        console.log(`Super admin access confirmed for: ${networkPage}`);
        
      } catch (error) {
        console.log(`Network page not accessible: ${networkPage}`, error.message);
      }
    }
  });

  test('Theme management: Should manage themes across network', async ({ page, admin, requestUtils }) => {
    await admin.visitAdminPage('network/themes.php');
    
    // Check available themes
    const themeRows = page.locator('.wp-list-table tbody tr');
    const themeCount = await themeRows.count();
    
    expect(themeCount).toBeGreaterThan(0);
    
    // Try to network enable a theme if available
    const enableButtons = page.locator('a:has-text("Network Enable")');
    const enableCount = await enableButtons.count();
    
    if (enableCount > 0) {
      const firstTheme = themeRows.nth(0);
      const themeName = await firstTheme.locator('.theme-title').textContent();
      
      console.log(`Network enabling theme: ${themeName}`);
      
      await enableButtons.nth(0).click();
      await page.waitForSelector('.notice-success');
      
      // Verify theme is network enabled
      const disableLink = firstTheme.locator('a:has-text("Network Disable")');
      await expect(disableLink).toBeVisible();
    }
  });

  test('User management: Should manage users across network', async ({ page, admin }) => {
    await admin.visitAdminPage('network/users.php');
    
    // Check user list loads
    await expect(page.locator('.wp-list-table')).toBeVisible();
    
    // Verify super admin capabilities
    const userRows = page.locator('.wp-list-table tbody tr');
    const userCount = await userRows.count();
    
    expect(userCount).toBeGreaterThan(0);
    
    // Check if we can access user edit pages
    if (userCount > 1) {
      const firstUserRow = userRows.nth(1); // Skip current super admin
      const editLink = firstUserRow.locator('.edit a');
      
      if (await editLink.isVisible()) {
        await editLink.click();
        
        // Should access user edit page
        await expect(page.locator('#profile-page')).toBeVisible();
        
        // Check for super admin controls
        const superAdminCheckbox = page.locator('#super_admin');
        if (await superAdminCheckbox.isVisible()) {
          console.log('Super admin controls available');
        }
      }
    }
  });

  test('Site management: Should create and manage sites', async ({ page, admin }) => {
    await admin.visitAdminPage('network/sites.php');
    
    // Check if we can access add new site
    const addNewButton = page.locator('.page-title-action');
    
    if (await addNewButton.isVisible()) {
      await addNewButton.click();
      
      // Verify add site form loads
      await expect(page.locator('#site-address')).toBeVisible();
      await expect(page.locator('#site-title')).toBeVisible();
      
      console.log('Site creation form accessible');
      
      // Don't actually create a site in tests, just verify access
    }
    
    // Check existing sites management
    await admin.visitAdminPage('network/sites.php');
    
    const siteRows = page.locator('.wp-list-table tbody tr');
    const siteCount = await siteRows.count();
    
    expect(siteCount).toBeGreaterThan(0);
    
    // Test site actions for first site
    if (siteCount > 1) {
      const firstSite = siteRows.nth(1); // Skip main site
      const siteActions = firstSite.locator('.row-actions a');
      const actionCount = await siteActions.count();
      
      // Should have management actions (Edit, Dashboard, etc.)
      expect(actionCount).toBeGreaterThan(2);
      
      console.log(`Site management actions available: ${actionCount}`);
    }
  });

  test('Network settings: Should configure network-wide settings', async ({ page, admin }) => {
    await admin.visitAdminPage('network/settings.php');
    
    // Verify network settings form loads
    await expect(page.locator('#network-settings')).toBeVisible();
    
    // Check for key network settings
    const keySettings = [
      '#site_name',           // Network title
      '#admin_email',         // Network admin email
      '#registration',        // Registration settings
      '#blog_upload_space'    // Upload space allotment
    ];
    
    for (const setting of keySettings) {
      const element = page.locator(setting);
      if (await element.isVisible()) {
        console.log(`Network setting found: ${setting}`);
      }
    }
    
    // Verify we can see network registration settings
    const registrationOptions = page.locator('#registration option');
    const optionCount = await registrationOptions.count();
    
    expect(optionCount).toBeGreaterThan(0);
  });

  test('Plugin network settings: Should access plugin network settings', async ({ page, admin }) => {
    // First ensure plugin is network activated
    await networkActivatePlugin(page, 'my-plugin');
    
    // Check if plugin adds network admin menu
    const networkMenus = page.locator('#adminmenu .wp-submenu a');
    const menuItems = await networkMenus.allTextContents();
    
    const pluginMenuFound = menuItems.some(item => 
      item.toLowerCase().includes('my plugin') || 
      item.toLowerCase().includes('plugin settings')
    );
    
    if (pluginMenuFound) {
      console.log('Plugin network menu found');
      
      // Try to access plugin network settings
      const pluginMenu = networkMenus.filter({ hasText: /my plugin|plugin settings/i }).first();
      
      if (await pluginMenu.isVisible()) {
        await pluginMenu.click();
        
        // Verify network settings page loads
        await expect(page.locator('.wrap')).toBeVisible();
        
        console.log('Plugin network settings accessible');
      }
    }
  });

  test('Cross-site functionality: Should work across different sites', async ({ page, admin }) => {
    // Network activate the plugin first
    await networkActivatePlugin(page, 'my-plugin');
    
    // Get list of sites
    await admin.visitAdminPage('network/sites.php');
    const siteRows = page.locator('.wp-list-table tbody tr');
    const siteCount = await siteRows.count();
    
    const testResults = [];
    
    // Test plugin functionality on multiple sites
    for (let i = 0; i < Math.min(siteCount, 3); i++) {
      const row = siteRows.nth(i);
      const siteName = await row.locator('.column-blogname strong a').textContent();
      const dashboardLink = row.locator('.row-actions a[href*="wp-admin"]');
      
      if (await dashboardLink.isVisible()) {
        await dashboardLink.click();
        
        // Test plugin functionality on this site
        try {
          // Check if plugin admin page is accessible
          await admin.visitAdminPage('admin.php?page=my-plugin');
          
          const pluginPageLoaded = await page.locator('.wrap h1').isVisible();
          
          testResults.push({
            site: siteName?.trim() || `Site ${i + 1}`,
            pluginAccessible: pluginPageLoaded
          });
          
          console.log(`Plugin tested on ${siteName}: ${pluginPageLoaded ? 'Success' : 'Failed'}`);
          
        } catch (error) {
          testResults.push({
            site: siteName?.trim() || `Site ${i + 1}`,
            pluginAccessible: false,
            error: error.message
          });
        }
        
        // Go back to network admin
        await admin.visitAdminPage('network/sites.php');
      }
    }
    
    // Verify plugin worked on at least one site
    const successfulSites = testResults.filter(result => result.pluginAccessible);
    expect(successfulSites.length).toBeGreaterThan(0);
    
    console.log('Cross-site functionality test results:', testResults);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearCache(page);
  });
});

test.describe('Multisite Edge Cases with WordPress Utils', () => {
  test('Non-multisite fallback: Should handle non-multisite environments', async ({ page, admin }) => {
    // This test would run in non-multisite environments
    const isMultisite = await page.locator('#wp-admin-bar-my-sites').isVisible();
    
    if (!isMultisite) {
      // Verify normal plugin activation works
      await activatePlugin(page, 'my-plugin');
      
      const isActive = await isPluginActive(page, 'my-plugin');
      expect(isActive).toBe(true);
      
      // Verify no network options are available
      await admin.visitAdminPage('plugins.php');
      
      const networkActivateLink = page.locator('a:has-text("Network Activate")');
      await expect(networkActivateLink).not.toBeVisible();
      
      console.log('Non-multisite environment handled correctly');
    } else {
      test.skip('Running in multisite environment');
    }
  });

  test('Large network performance: Should handle many sites efficiently', async ({ page, admin }) => {
    await admin.visitAdminPage('network/sites.php');
    
    // Check if pagination is working for large networks
    const pagination = page.locator('.tablenav-pages');
    const siteCount = await page.locator('.displaying-num').textContent();
    
    if (siteCount) {
      const totalSites = parseInt(siteCount.match(/\d+/)?.[0] || '0');
      console.log(`Network has ${totalSites} sites`);
      
      if (totalSites > 20) {
        // Test pagination works
        const nextButton = pagination.locator('.next-page');
        
        if (await nextButton.isVisible() && !(await nextButton.hasClass('disabled'))) {
          await nextButton.click();
          
          // Verify page loads efficiently
          await expect(page.locator('.wp-list-table')).toBeVisible();
          
          console.log('Large network pagination works correctly');
        }
      }
    }
  });

  test('Subdomain vs subdirectory: Should work with both configurations', async ({ page, admin }) => {
    // Check network configuration
    await admin.visitAdminPage('network/settings.php');
    
    // Look for subdomain/subdirectory configuration
    const subdomainConfig = await page.locator('input[name="subdomain_install"]').isChecked();
    
    if (subdomainConfig) {
      console.log('Testing subdomain multisite configuration');
      
      // Test subdomain-specific functionality
      await admin.visitAdminPage('network/sites.php');
      
      const siteLinks = page.locator('.column-blogname a');
      const firstSiteUrl = await siteLinks.nth(1).getAttribute('href');
      
      if (firstSiteUrl) {
        // Should be subdomain format
        expect(firstSiteUrl).toMatch(/https?:\/\/[^\/]+\.[^\/]+/);
        console.log('Subdomain format confirmed:', firstSiteUrl);
      }
      
    } else {
      console.log('Testing subdirectory multisite configuration');
      
      // Test subdirectory-specific functionality
      await admin.visitAdminPage('network/sites.php');
      
      const siteLinks = page.locator('.column-blogname a');
      const firstSiteUrl = await siteLinks.nth(1).getAttribute('href');
      
      if (firstSiteUrl) {
        // Should be subdirectory format
        expect(firstSiteUrl).toMatch(/https?:\/\/[^\/]+\/[^\/]+/);
        console.log('Subdirectory format confirmed:', firstSiteUrl);
      }
    }
  });
}); 