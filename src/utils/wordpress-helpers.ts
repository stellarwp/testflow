/**
 * WordPress Helper Functions for TestFlow
 * Enhanced with official WordPress E2E Test Utils
 * 
 * @since TBD
 */

import { Page } from 'playwright';
import { 
  Admin, 
  Editor, 
  RequestUtils,
  test as wpTest
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Extended WordPress test with official utilities
 */
export const test = wpTest.extend<{
  admin: Admin;
  editor: Editor;
  requestUtils: RequestUtils;
}>({
  admin: async ({ page, pageUtils }, use) => {
    await use(new Admin({ page, pageUtils }));
  },
  editor: async ({ page }, use) => {
    await use(new Editor({ page }));
  },
  requestUtils: async ({ }, use) => {
    await use(new RequestUtils({
      baseURL: process.env.WP_BASE_URL || 'http://localhost',
      storageStatePath: process.env.STORAGE_STATE_PATH,
    }));
  },
});

export class WordPressHelpers {
  private page: Page;
  public admin: Admin;
  public editor: Editor;
  public requestUtils: RequestUtils;

  /**
   * Initialize WordPress helpers.
   * 
   * @param {Page} page - Playwright page instance.
   * 
   * @since TBD
   */
  constructor(page: Page) {
    this.page = page;
    this.admin = new Admin({ page, pageUtils: { page } });
    this.editor = new Editor({ page });
    this.requestUtils = new RequestUtils({
      baseURL: process.env.WP_BASE_URL || 'http://localhost',
    });
  }

  /**
   * Login to WordPress admin using official WordPress utilities.
   * 
   * @param {string} username - Username.
   * @param {string} password - Password.
   * @param {string} siteUrl  - Site URL.
   * 
   * @since TBD
   */
  async login(username: string = 'admin', password: string = 'password', siteUrl: string = 'https://testflow.lndo.site'): Promise<void> {
    // Use WordPress official login method
    await this.admin.visitAdminPage('/', 'wp-login.php');
    
    // Check if already logged in
    if (await this.page.locator('#wpadminbar').isVisible()) {
      return;
    }
    
    await this.page.fill('#user_login', username);
    await this.page.fill('#user_pass', password);
    await this.page.click('#wp-submit');
    
    // Wait for successful login
    await this.page.waitForSelector('#wpadminbar', { timeout: 10000 });
  }

  /**
   * Login to WordPress admin using the official WordPress method.
   * 
   * @since TBD
   */
  async wpLogin(): Promise<void> {
    // Use the official WordPress login utility
    await this.requestUtils.activateTheme('twentytwentythree');
    await this.admin.visitAdminPage('/');
  }

  /**
   * Logout from WordPress admin.
   * 
   * @since TBD
   */
  async logout(): Promise<void> {
    await this.page.hover('#wpadminbar');
    await this.page.click('text=Log Out');
  }

  /**
   * Navigate to plugins page using WordPress admin utilities.
   * 
   * @since TBD
   */
  async goToPlugins(): Promise<void> {
    await this.admin.visitAdminPage('plugins.php');
    await this.page.waitForSelector('.wp-list-table');
  }

  /**
   * Check if a plugin is active.
   * 
   * @param {string} pluginSlug - Plugin slug or name.
   * 
   * @returns {Promise<boolean>} - Whether the plugin is active.
   * 
   * @since TBD
   */
  async isPluginActive(pluginSlug: string): Promise<boolean> {
    await this.goToPlugins();
    
    const pluginRow = this.page.locator(`tr[data-slug="${pluginSlug}"], tr:has-text("${pluginSlug}")`).first();
    
    if (!(await pluginRow.isVisible())) {
      return false;
    }
    
    const deactivateLink = pluginRow.locator('a:has-text("Deactivate")');
    return await deactivateLink.isVisible();
  }

  /**
   * Activate a plugin using WordPress utilities when possible.
   * 
   * @param {string} pluginSlug - Plugin slug or name.
   * 
   * @since TBD
   */
  async activatePlugin(pluginSlug: string): Promise<void> {
    try {
      // Try using WordPress RequestUtils first (faster)
      await this.requestUtils.activatePlugin(pluginSlug);
    } catch (error) {
      // Fallback to UI activation
      await this.goToPlugins();
      
      const pluginRow = this.page.locator(`tr[data-slug="${pluginSlug}"], tr:has-text("${pluginSlug}")`).first();
      
      if (!(await pluginRow.isVisible())) {
        throw new Error(`Plugin not found: ${pluginSlug}`);
      }
      
      const activateLink = pluginRow.locator('a:has-text("Activate")');
      
      if (await activateLink.isVisible()) {
        await activateLink.click();
        await this.page.waitForSelector('.notice-success', { timeout: 5000 });
      }
    }
  }

  /**
   * Deactivate a plugin using WordPress utilities when possible.
   * 
   * @param {string} pluginSlug - Plugin slug or name.
   * 
   * @since TBD
   */
  async deactivatePlugin(pluginSlug: string): Promise<void> {
    try {
      // Try using WordPress RequestUtils first (faster)
      await this.requestUtils.deactivatePlugin(pluginSlug);
    } catch (error) {
      // Fallback to UI deactivation
      await this.goToPlugins();
      
      const pluginRow = this.page.locator(`tr[data-slug="${pluginSlug}"], tr:has-text("${pluginSlug}")`).first();
      
      if (!(await pluginRow.isVisible())) {
        throw new Error(`Plugin not found: ${pluginSlug}`);
      }
      
      const deactivateLink = pluginRow.locator('a:has-text("Deactivate")');
      
      if (await deactivateLink.isVisible()) {
        await deactivateLink.click();
        await this.page.waitForSelector('.notice-success', { timeout: 5000 });
      }
    }
  }

  /**
   * Bulk activate plugins.
   * 
   * @param {string[]} pluginSlugs - Array of plugin slugs.
   * 
   * @since TBD
   */
  async bulkActivatePlugins(pluginSlugs: string[]): Promise<void> {
    // Try using RequestUtils for bulk operations
    try {
      for (const slug of pluginSlugs) {
        await this.requestUtils.activatePlugin(slug);
      }
    } catch (error) {
      // Fallback to UI bulk activation
      await this.goToPlugins();
      
      // Check all specified plugins
      for (const slug of pluginSlugs) {
        const checkbox = this.page.locator(`tr[data-slug="${slug}"] input[type="checkbox"], tr:has-text("${slug}") input[type="checkbox"]`).first();
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }
      
      // Select bulk action
      await this.page.selectOption('[name="action"]', 'activate-selected');
      await this.page.click('#doaction');
      
      // Wait for success message
      await this.page.waitForSelector('.notice-success', { timeout: 10000 });
    }
  }

  /**
   * Bulk deactivate plugins.
   * 
   * @param {string[]} pluginSlugs - Array of plugin slugs.
   * 
   * @since TBD
   */
  async bulkDeactivatePlugins(pluginSlugs: string[]): Promise<void> {
    // Try using RequestUtils for bulk operations
    try {
      for (const slug of pluginSlugs) {
        await this.requestUtils.deactivatePlugin(slug);
      }
    } catch (error) {
      // Fallback to UI bulk deactivation
      await this.goToPlugins();
      
      // Check all specified plugins
      for (const slug of pluginSlugs) {
        const checkbox = this.page.locator(`tr[data-slug="${slug}"] input[type="checkbox"], tr:has-text("${slug}") input[type="checkbox"]`).first();
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }
      
      // Select bulk action
      await this.page.selectOption('[name="action"]', 'deactivate-selected');
      await this.page.click('#doaction');
      
      // Wait for success message
      await this.page.waitForSelector('.notice-success', { timeout: 10000 });
    }
  }

  /**
   * Get list of active plugins.
   * 
   * @returns {Promise<string[]>} - Array of active plugin names.
   * 
   * @since TBD
   */
  async getActivePlugins(): Promise<string[]> {
    await this.goToPlugins();
    
    const activePlugins: string[] = [];
    const rows = await this.page.locator('tr[data-slug]').all();
    
    for (const row of rows) {
      const deactivateLink = row.locator('a:has-text("Deactivate")');
      if (await deactivateLink.isVisible()) {
        const slug = await row.getAttribute('data-slug');
        if (slug) {
          activePlugins.push(slug);
        }
      }
    }
    
    return activePlugins;
  }

  /**
   * Check for plugin conflicts.
   * 
   * @param {string[]} pluginSlugs - Array of plugin slugs to check.
   * 
   * @returns {Promise<string[]>} - Array of conflicting plugins.
   * 
   * @since TBD
   */
  async checkPluginConflicts(pluginSlugs: string[]): Promise<string[]> {
    const conflicts: string[] = [];
    
    for (const slug of pluginSlugs) {
      try {
        await this.activatePlugin(slug);
        
        // Check for PHP errors or conflicts
        const errors = await this.checkForPHPErrors();
        if (errors.length > 0) {
          conflicts.push(slug);
          await this.deactivatePlugin(slug);
        }
      } catch (error) {
        conflicts.push(slug);
      }
    }
    
    return conflicts;
  }

  /**
   * Wait for plugin to be fully loaded.
   * 
   * @param {string} pluginSlug - Plugin slug.
   * @param {number} timeout   - Timeout in milliseconds.
   * 
   * @since TBD
   */
  async waitForPluginLoaded(pluginSlug: string, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.isPluginActive(pluginSlug)) {
        // Additional check - look for plugin-specific indicators
        const pluginIndicators = [
          `[data-plugin="${pluginSlug}"]`,
          `.${pluginSlug}`,
          `#${pluginSlug}`,
          `[class*="${pluginSlug}"]`
        ];
        
        for (const indicator of pluginIndicators) {
          if (await this.page.locator(indicator).isVisible()) {
            return;
          }
        }
      }
      
      await this.page.waitForTimeout(500);
    }
    
    throw new Error(`Plugin ${pluginSlug} not loaded within ${timeout}ms`);
  }

  /**
   * Create a post using WordPress Editor utilities.
   * 
   * @param {string} title   - Post title.
   * @param {string} content - Post content.
   * @param {string} status  - Post status.
   * 
   * @returns {Promise<string>} - Created post URL.
   * 
   * @since TBD
   */
  async createPost(title: string, content: string = '', status: string = 'publish'): Promise<string> {
    // Use WordPress Editor utilities
    await this.admin.createNewPost();
    
    // Set post title
    await this.editor.canvas.click('role=textbox[name="Add title"i]');
    await this.page.keyboard.type(title);
    
    // Set post content
    if (content) {
      await this.editor.canvas.click('role=textbox[name="Type / to choose a block"i]');
      await this.page.keyboard.type(content);
    }
    
    // Publish or save post
    if (status === 'publish') {
      await this.editor.publishPost();
    } else {
      await this.page.click('button[aria-label="Save draft"]');
    }
    
    // Get the post URL
    const currentUrl = this.page.url();
    const postId = currentUrl.match(/post=(\d+)/)?.[1];
    
    if (postId) {
      return `/?p=${postId}`;
    }
    
    return '/';
  }

  /**
   * Navigate to frontend.
   * 
   * @param {string} path    - Frontend path.
   * @param {string} siteUrl - Site URL.
   * 
   * @since TBD
   */
  async goToFrontend(path: string = '/', siteUrl: string = 'https://testflow.lndo.site'): Promise<void> {
    const frontendUrl = `${siteUrl}${path}`;
    await this.page.goto(frontendUrl);
  }

  /**
   * Clear all caches.
   * 
   * @since TBD
   */
  async clearCaches(): Promise<void> {
    // Try to clear common caching plugins
    const cachingPlugins = [
      'w3-total-cache',
      'wp-super-cache',
      'wp-rocket',
      'litespeed-cache',
      'wp-fastest-cache'
    ];
    
    for (const plugin of cachingPlugins) {
      if (await this.isPluginActive(plugin)) {
        try {
          await this.admin.visitAdminPage(`admin.php?page=${plugin}`);
          
          // Look for clear cache buttons
          const clearButtons = [
            'input[value*="Clear"]',
            'button:has-text("Clear Cache")',
            'a:has-text("Purge Cache")',
            'button:has-text("Flush Cache")'
          ];
          
          for (const selector of clearButtons) {
            const button = this.page.locator(selector);
            if (await button.isVisible()) {
              await button.click();
              await this.page.waitForTimeout(1000);
              break;
            }
          }
        } catch (error) {
          // Continue if clearing specific cache fails
          console.warn(`Failed to clear cache for ${plugin}:`, error);
        }
      }
    }
    
    // Clear browser cache
    await this.page.evaluate(() => {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
    });
  }

  /**
   * Take a screenshot.
   * 
   * @param {string} filename - Screenshot filename.
   * 
   * @since TBD
   */
  async takeScreenshot(filename: string): Promise<void> {
    const screenshotPath = `test-results/screenshots/${filename}`;
    await this.page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
  }

  /**
   * Wait for admin page to load completely.
   * 
   * @since TBD
   */
  async waitForAdminPageLoad(): Promise<void> {
    // Wait for WordPress admin bar
    await this.page.waitForSelector('#wpadminbar', { timeout: 10000 });
    
    // Wait for admin menu
    await this.page.waitForSelector('#adminmenu', { timeout: 5000 });
    
    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check for PHP errors on the page.
   * 
   * @returns {Promise<string[]>} - Array of PHP error messages.
   * 
   * @since TBD
   */
  async checkForPHPErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    // Check page content for PHP errors
    const pageContent = await this.page.content();
    
    const errorPatterns = [
      /Fatal error:.*?in.*?on line \d+/gi,
      /Parse error:.*?in.*?on line \d+/gi,
      /Warning:.*?in.*?on line \d+/gi,
      /Notice:.*?in.*?on line \d+/gi,
      /Deprecated:.*?in.*?on line \d+/gi
    ];
    
    for (const pattern of errorPatterns) {
      const matches = pageContent.match(pattern);
      if (matches) {
        errors.push(...matches);
      }
    }
    
    return errors;
  }

  /**
   * Enable WordPress debug mode.
   * 
   * @since TBD
   */
  async enableDebugMode(): Promise<void> {
    // This would typically be done at the wp-config level
    // For testing, we can check if debug info is visible
    await this.page.goto('/wp-admin/site-health.php?tab=debug');
    await this.page.waitForSelector('.health-check-accordion-panel');
  }

  /**
   * Get WordPress version.
   * 
   * @returns {Promise<string>} - WordPress version.
   * 
   * @since TBD
   */
  async getWordPressVersion(): Promise<string> {
    await this.admin.visitAdminPage('about.php');
    
    const versionElement = this.page.locator('.wp-badge');
    if (await versionElement.isVisible()) {
      const versionText = await versionElement.textContent();
      const versionMatch = versionText?.match(/Version ([\d.]+)/);
      return versionMatch?.[1] || 'unknown';
    }
    
    return 'unknown';
  }

  /**
   * Switch to a multisite subsite.
   * 
   * @param {string} siteName - Site name or ID.
   * 
   * @since TBD
   */
  async switchToSite(siteName: string): Promise<void> {
    await this.admin.visitAdminPage('my-sites.php');
    
    const siteLink = this.page.locator(`a:has-text("${siteName}")`);
    if (await siteLink.isVisible()) {
      await siteLink.click();
    } else {
      throw new Error(`Site not found: ${siteName}`);
    }
  }

  /**
   * Network activate a plugin (multisite).
   * 
   * @param {string} pluginSlug - Plugin slug.
   * 
   * @since TBD
   */
  async networkActivatePlugin(pluginSlug: string): Promise<void> {
    await this.admin.visitAdminPage('network/plugins.php');
    
    const pluginRow = this.page.locator(`tr[data-slug="${pluginSlug}"], tr:has-text("${pluginSlug}")`).first();
    
    if (!(await pluginRow.isVisible())) {
      throw new Error(`Plugin not found: ${pluginSlug}`);
    }
    
    const networkActivateLink = pluginRow.locator('a:has-text("Network Activate")');
    
    if (await networkActivateLink.isVisible()) {
      await networkActivateLink.click();
      await this.page.waitForSelector('.notice-success', { timeout: 5000 });
    }
  }

  /**
   * Measure page load time.
   * 
   * @param {string} url - URL to measure.
   * 
   * @returns {Promise<number>} - Load time in milliseconds.
   * 
   * @since TBD
   */
  async measurePageLoad(url: string): Promise<number> {
    const startTime = Date.now();
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    const endTime = Date.now();
    
    return endTime - startTime;
  }

  /**
   * Check accessibility using basic checks.
   * 
   * @returns {Promise<string[]>} - Array of accessibility issues.
   * 
   * @since TBD
   */
  async checkAccessibility(): Promise<string[]> {
    const issues: string[] = [];
    
    // Check for images without alt text
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images without alt text`);
    }
    
    // Check for links without accessible names
    const linksWithoutText = await this.page.locator('a:not(:has-text())').count();
    if (linksWithoutText > 0) {
      issues.push(`${linksWithoutText} links without accessible text`);
    }
    
    // Check for form inputs without labels
    const inputsWithoutLabels = await this.page.locator('input:not([aria-label]):not([aria-labelledby])').count();
    if (inputsWithoutLabels > 0) {
      issues.push(`${inputsWithoutLabels} form inputs without labels`);
    }
    
    return issues;
  }

  /**
   * Get performance metrics.
   * 
   * @returns {Promise<object>} - Performance metrics.
   * 
   * @since TBD
   */
  async getPerformanceMetrics(): Promise<any> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
    
    return metrics;
  }
}

// Export utility functions for backward compatibility
export async function wpLogin(page: Page, username: string = 'admin', password: string = 'password'): Promise<void> {
  const helpers = new WordPressHelpers(page);
  await helpers.login(username, password);
}

export async function activatePlugin(page: Page, pluginSlug: string): Promise<void> {
  const helpers = new WordPressHelpers(page);
  await helpers.activatePlugin(pluginSlug);
}

export async function deactivatePlugin(page: Page, pluginSlug: string): Promise<void> {
  const helpers = new WordPressHelpers(page);
  await helpers.deactivatePlugin(pluginSlug);
}

export async function isPluginActive(page: Page, pluginSlug: string): Promise<boolean> {
  const helpers = new WordPressHelpers(page);
  return await helpers.isPluginActive(pluginSlug);
}

export async function createPost(page: Page, title: string, content: string = ''): Promise<string> {
  const helpers = new WordPressHelpers(page);
  return await helpers.createPost(title, content);
}

export async function clearCache(page: Page): Promise<void> {
  const helpers = new WordPressHelpers(page);
  await helpers.clearCaches();
}

export async function measurePageLoad(page: Page, url: string): Promise<number> {
  const helpers = new WordPressHelpers(page);
  return await helpers.measurePageLoad(url);
}

export async function switchToSite(page: Page, siteName: string): Promise<void> {
  const helpers = new WordPressHelpers(page);
  await helpers.switchToSite(siteName);
}

export async function networkActivatePlugin(page: Page, pluginSlug: string): Promise<void> {
  const helpers = new WordPressHelpers(page);
  await helpers.networkActivatePlugin(pluginSlug);
}

// Export the extended test for use in test files
export { test };
export { expect } from '@playwright/test'; 