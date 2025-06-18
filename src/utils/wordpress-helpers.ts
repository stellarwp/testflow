/**
 * TestFlow-Specific WordPress Helper Functions
 * Complements official WordPress E2E Test Utils with TestFlow-specific functionality
 * 
 * @since TBD
 */

import { Page } from 'playwright';
import { test as base, expect } from '@playwright/test';
import { 
  Admin, 
  Editor, 
  RequestUtils,
  PageUtils
} from '@wordpress/e2e-test-utils-playwright';

/**
 * Extended test with WordPress utilities available as fixtures
 */
export const test = base.extend<{
  admin: Admin;
  editor: Editor;
  pageUtils: PageUtils;
  requestUtils: RequestUtils;
}>({
  admin: async ({ page, pageUtils, editor }, use) => {
    await use(new Admin({ page, pageUtils, editor }));
  },
  editor: async ({ page }, use) => {
    await use(new Editor({ page }));
  },
  pageUtils: async ({ page }, use) => {
    await use(new PageUtils({ page }));
  },
  requestUtils: async ({}, use) => {
    const requestUtils = await RequestUtils.setup({
      baseURL: process.env.WP_BASE_URL || 'https://testflow.lndo.site',
      user: {
        username: process.env.WP_USERNAME || 'admin',
        password: process.env.WP_PASSWORD || 'password',
      },
    });
    await use(requestUtils);
  },
});

export { expect };

/**
 * TestFlow-specific WordPress helpers
 * Focused on functionality not provided by WordPress E2E utils
 */
export class TestFlowHelpers {
  private page: Page;
  public admin: Admin;
  public editor: Editor;
  public pageUtils: PageUtils;
  public requestUtils: RequestUtils | undefined;

  /**
   * Initialize TestFlow helpers.
   * 
   * @param {Page} page - Playwright page instance.
   * 
   * @since TBD
   */
  constructor(page: Page) {
    this.page = page;
    this.pageUtils = new PageUtils({ page });
    this.editor = new Editor({ page });
    this.admin = new Admin({ page, pageUtils: this.pageUtils, editor: this.editor });
  }

  /**
   * Initialize RequestUtils for API operations.
   * 
   * @since TBD
   */
  async initRequestUtils(): Promise<void> {
    this.requestUtils = await RequestUtils.setup({
      baseURL: process.env.WP_BASE_URL || 'https://testflow.lndo.site',
      user: {
        username: process.env.WP_USERNAME || 'admin',
        password: process.env.WP_PASSWORD || 'password',
      },
    });
  }

  /**
   * Bulk activate multiple plugins with proper error handling.
   * WordPress E2E utils only support single plugin activation.
   * 
   * @param {string[]} pluginSlugs - Array of plugin slugs.
   * 
   * @since TBD
   */
  async bulkActivatePlugins(pluginSlugs: string[]): Promise<void> {
    if (!this.requestUtils) {
      await this.initRequestUtils();
    }

    // Try using RequestUtils for bulk operations first (faster)
    const failedPlugins: string[] = [];
    
    for (const slug of pluginSlugs) {
      try {
        await this.requestUtils!.activatePlugin(slug);
      } catch (error) {
        console.warn(`Failed to activate plugin ${slug} via API:`, error);
        failedPlugins.push(slug);
      }
    }
    
    // Fallback to UI bulk activation for failed plugins
    if (failedPlugins.length > 0) {
      await this.admin.visitAdminPage('plugins.php');
      
      for (const slug of failedPlugins) {
        const checkbox = this.page.locator(`tr[data-slug="${slug}"] input[type="checkbox"], tr:has-text("${slug}") input[type="checkbox"]`).first();
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }
      
      await this.page.selectOption('[name="action"]', 'activate-selected');
      await this.page.click('#doaction');
      await this.page.waitForSelector('.notice-success', { timeout: 10000 });
    }
  }

  /**
   * Bulk deactivate multiple plugins with proper error handling.
   * WordPress E2E utils only support single plugin deactivation.
   * 
   * @param {string[]} pluginSlugs - Array of plugin slugs.
   * 
   * @since TBD
   */
  async bulkDeactivatePlugins(pluginSlugs: string[]): Promise<void> {
    if (!this.requestUtils) {
      await this.initRequestUtils();
    }

    const failedPlugins: string[] = [];
    
    for (const slug of pluginSlugs) {
      try {
        await this.requestUtils!.deactivatePlugin(slug);
      } catch (error) {
        console.warn(`Failed to deactivate plugin ${slug} via API:`, error);
        failedPlugins.push(slug);
      }
    }
    
    // Fallback to UI bulk deactivation for failed plugins
    if (failedPlugins.length > 0) {
      await this.admin.visitAdminPage('plugins.php');
      
      for (const slug of failedPlugins) {
        const checkbox = this.page.locator(`tr[data-slug="${slug}"] input[type="checkbox"], tr:has-text("${slug}") input[type="checkbox"]`).first();
        if (await checkbox.isVisible()) {
          await checkbox.check();
        }
      }
      
      await this.page.selectOption('[name="action"]', 'deactivate-selected');
      await this.page.click('#doaction');
      await this.page.waitForSelector('.notice-success', { timeout: 10000 });
    }
  }

  /**
   * Get comprehensive list of active plugins with metadata.
   * Enhanced version of what WordPress E2E utils provide.
   * 
   * @returns {Promise<PluginInfo[]>} - Array of active plugin info objects.
   * 
   * @since TBD
   */
  async getActivePluginsWithInfo(): Promise<PluginInfo[]> {
    await this.admin.visitAdminPage('plugins.php');
    
    const activePlugins: PluginInfo[] = [];
    const rows = await this.page.locator('tr[data-slug]').all();
    
    for (const row of rows) {
      const deactivateLink = row.locator('a:has-text("Deactivate")');
      if (await deactivateLink.isVisible()) {
        const slug = await row.getAttribute('data-slug');
        const name = await row.locator('.plugin-title strong').textContent();
        const version = await row.locator('.plugin-version-author-uri').textContent();
        
        if (slug && name) {
          activePlugins.push({
            slug,
            name: name.trim(),
            version: version?.match(/Version\s+([\d.]+)/)?.[1] || 'unknown',
            isActive: true,
            isNetworkActive: await row.locator('.plugin-title').locator(':has-text("Network Active")').isVisible()
          });
        }
      }
    }
    
    return activePlugins;
  }

  /**
   * Check for plugin conflicts by testing activation combinations.
   * TestFlow-specific functionality for plugin testing.
   * 
   * @param {string[]} pluginSlugs - Array of plugin slugs to test.
   * 
   * @returns {Promise<ConflictResult>} - Conflict analysis results.
   * 
   * @since TBD
   */
  async checkPluginConflicts(pluginSlugs: string[]): Promise<ConflictResult> {
    if (!this.requestUtils) {
      await this.initRequestUtils();
    }

    const conflicts: string[] = [];
    const errors: { [key: string]: string[] } = {};
    
    for (const slug of pluginSlugs) {
      try {
        await this.requestUtils!.activatePlugin(slug);
        
        // Check for PHP errors or conflicts
        const phpErrors = await this.checkForPHPErrors();
        if (phpErrors.length > 0) {
          conflicts.push(slug);
          errors[slug] = phpErrors;
          await this.requestUtils!.deactivatePlugin(slug);
        }
      } catch (error) {
        conflicts.push(slug);
        errors[slug] = [error instanceof Error ? error.message : String(error)];
      }
    }
    
    return {
      conflicts,
      errors,
      totalTested: pluginSlugs.length,
      conflictCount: conflicts.length
    };
  }

  /**
   * Wait for plugin to fully initialize with custom indicators.
   * More comprehensive than basic activation check.
   * 
   * @param {string} pluginSlug   - Plugin slug.
   * @param {WaitOptions} options - Wait configuration options.
   * 
   * @since TBD
   */
  async waitForPluginInitialized(pluginSlug: string, options: WaitOptions = {}): Promise<void> {
    const { 
      timeout = 10000, 
      indicators = [], 
      adminPage = 'plugins.php' 
    } = options;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check if plugin is active using WordPress utils
      try {
        await this.admin.visitAdminPage(adminPage);
        const pluginRow = this.page.locator(`tr[data-slug="${pluginSlug}"]`);
        const isActive = await pluginRow.locator('a:has-text("Deactivate")').isVisible();
        
        if (isActive) {
          // Check for custom indicators if provided
          if (indicators.length > 0) {
            for (const indicator of indicators) {
              if (await this.page.locator(indicator).isVisible()) {
                return;
              }
            }
          } else {
            // Default indicators
            const defaultIndicators = [
              `[data-plugin="${pluginSlug}"]`,
              `.${pluginSlug}-initialized`,
              `#${pluginSlug}-status`,
              `[data-testid="${pluginSlug}"]`
            ];
            
            for (const indicator of defaultIndicators) {
              if (await this.page.locator(indicator).isVisible()) {
                return;
              }
            }
          }
        }
      } catch (error) {
        // Continue waiting
      }
      
      await this.page.waitForTimeout(500);
    }
    
    throw new Error(`Plugin ${pluginSlug} not fully initialized within ${timeout}ms`);
  }

  /**
   * Clear all types of WordPress caches (TestFlow-specific implementation).
   * More comprehensive than WordPress E2E utils.
   * 
   * @since TBD
   */
  async clearAllCaches(): Promise<void> {
    const cachingPlugins = [
      { slug: 'w3-total-cache', clearUrl: 'admin.php?page=w3tc_general' },
      { slug: 'wp-super-cache', clearUrl: 'options-general.php?page=wpsupercache' },
      { slug: 'wp-rocket', clearUrl: 'options-general.php?page=wprocket' },
      { slug: 'litespeed-cache', clearUrl: 'admin.php?page=litespeed' },
      { slug: 'wp-fastest-cache', clearUrl: 'admin.php?page=wpfastestcacheoptions' },
      { slug: 'wp-optimize', clearUrl: 'admin.php?page=WP-Optimize' }
    ];
    
    for (const { slug, clearUrl } of cachingPlugins) {
      try {
        const activePlugins = await this.getActivePluginsWithInfo();
        const isActive = activePlugins.some(plugin => plugin.slug === slug);
        
        if (isActive) {
          await this.admin.visitAdminPage(clearUrl);
          
          // Look for clear cache buttons with multiple selectors
          const clearSelectors = [
            'input[value*="Clear"]',
            'button:has-text("Clear Cache")',
            'a:has-text("Purge Cache")',
            'button:has-text("Flush Cache")',
            'input[value*="Flush"]',
            'button:has-text("Empty Cache")',
            '.wp-rocket-button:has-text("Clear")'
          ];
          
          for (const selector of clearSelectors) {
            const button = this.page.locator(selector);
            if (await button.isVisible()) {
              await button.click();
              await this.page.waitForTimeout(1000);
              break;
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to clear cache for ${slug}:`, error);
      }
    }
    
    // Clear object cache and opcache if possible
    await this.clearObjectCache();
    await this.clearOpcache();
  }

  /**
   * Clear WordPress object cache.
   * 
   * @since TBD
   */
  private async clearObjectCache(): Promise<void> {
    try {
      await this.page.evaluate(() => {
        // Clear browser-side caches
        if ('caches' in globalThis) {
          (globalThis as any).caches.keys().then((names: string[]) => {
            names.forEach((name: string) => {
              (globalThis as any).caches.delete(name);
            });
          });
        }
      });
    } catch (error) {
      // Silently handle if not supported
    }
  }

  /**
   * Clear OPcache via WordPress admin.
   * 
   * @since TBD
   */
  private async clearOpcache(): Promise<void> {
    try {
      await this.admin.visitAdminPage('site-health.php?tab=debug');
      
      // Look for OPcache section and clear button
      const opcacheSection = this.page.locator('.health-check-accordion-panel:has-text("OPcache")');
      if (await opcacheSection.isVisible()) {
        const clearButton = opcacheSection.locator('button:has-text("Clear"), a:has-text("Clear")');
        if (await clearButton.isVisible()) {
          await clearButton.click();
        }
      }
    } catch (error) {
      // OPcache clearing not available
    }
  }

  /**
   * Check for PHP errors in page content (TestFlow-specific).
   * 
   * @returns {Promise<string[]>} - Array of PHP error messages.
   * 
   * @since TBD
   */
  async checkForPHPErrors(): Promise<string[]> {
    const errors: string[] = [];
    const pageContent = await this.page.content();
    
    const errorPatterns = [
      /Fatal error:.*?in.*?on line \d+/gi,
      /Parse error:.*?in.*?on line \d+/gi,
      /Warning:.*?in.*?on line \d+/gi,
      /Notice:.*?in.*?on line \d+/gi,
      /Deprecated:.*?in.*?on line \d+/gi,
      /Uncaught.*?in.*?on line \d+/gi
    ];
    
    for (const pattern of errorPatterns) {
      const matches = pageContent.match(pattern);
      if (matches) {
        errors.push(...matches);
      }
    }
    
    // Also check console for JavaScript errors that might indicate PHP issues
    const consoleErrors = await this.page.evaluate(() => {
      const errors: string[] = [];
      const originalError = console.error;
      console.error = (...args: any[]) => {
        errors.push(args.join(' '));
        originalError.apply(console, args);
      };
      return errors;
    });
    
    return [...errors, ...consoleErrors];
  }

  /**
   * Measure detailed page performance with TestFlow-specific metrics.
   * More comprehensive than basic WordPress E2E utils.
   * 
   * @param {string} url - URL to measure performance for.
   * 
   * @returns {Promise<PerformanceMetrics>} - Detailed performance metrics.
   * 
   * @since TBD
   */
  async measureDetailedPerformance(url: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    await this.page.goto(url);
    
    const performanceData = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      const paint = performance.getEntriesByType('paint') as any[];
      const resources = performance.getEntriesByType('resource') as any[];
      
      return {
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
        firstPaint: paint.find((p: any) => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find((p: any) => p.name === 'first-contentful-paint')?.startTime || 0,
        resourceCount: resources.length,
        totalResourceSize: resources.reduce((total: number, resource: any) => total + (resource.transferSize || 0), 0),
        slowestResource: resources.reduce((slowest: any, resource: any) => 
          resource.duration > (slowest?.duration || 0) ? resource : slowest, null
        )
      };
    });
    
    return {
      ...performanceData,
      totalLoadTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Network activate plugin (multisite only).
   * TestFlow-specific multisite functionality.
   * 
   * @param {string} pluginSlug - Plugin slug to network activate.
   * 
   * @since TBD
   */
  async networkActivatePlugin(pluginSlug: string): Promise<void> {
    await this.admin.visitAdminPage('network/plugins.php');
    
    const pluginRow = this.page.locator(`tr[data-slug="${pluginSlug}"]`);
    const networkActivateLink = pluginRow.locator('a:has-text("Network Activate")');
    
    if (await networkActivateLink.isVisible()) {
      await networkActivateLink.click();
      await this.page.waitForSelector('.notice-success', { timeout: 10000 });
    } else {
      // Check if already network activated
      const networkDeactivateLink = pluginRow.locator('a:has-text("Network Deactivate")');
      if (!(await networkDeactivateLink.isVisible())) {
        throw new Error(`Cannot network activate plugin: ${pluginSlug}`);
      }
    }
  }

  /**
   * Switch to specific site in multisite network.
   * TestFlow-specific multisite functionality.
   * 
   * @param {string} siteName - Name or URL of the site to switch to.
   * 
   * @since TBD
   */
  async switchToSite(siteName: string): Promise<void> {
    await this.admin.visitAdminPage('network/sites.php');
    
    const siteRow = this.page.locator(`tr:has-text("${siteName}")`);
    const editLink = siteRow.locator('a:has-text("Edit")');
    
    if (await editLink.isVisible()) {
      await editLink.click();
      await this.page.waitForLoadState('networkidle');
    } else {
      throw new Error(`Cannot find site: ${siteName}`);
    }
  }

  /**
   * Take screenshot with TestFlow-specific naming and organization.
   * 
   * @param {string} testName        - Name of the test.
   * @param {ScreenshotOptions} options - Screenshot options.
   * 
   * @returns {Promise<string>} - Path to saved screenshot.
   * 
   * @since TBD
   */
  async takeTestScreenshot(testName: string, options: ScreenshotOptions = {}): Promise<string> {
    const { 
      fullPage = true, 
      directory = 'screenshots', 
      timestamp = true 
    } = options;
    
    const fileName = `${testName}${timestamp ? `-${Date.now()}` : ''}.png`;
    const filePath = `${directory}/${fileName}`;
    
    await this.page.screenshot({ 
      path: filePath, 
      fullPage 
    });
    
    return filePath;
  }
}

// Type definitions for TestFlow helpers
export interface PluginInfo {
  slug: string;
  name: string;
  version: string;
  isActive: boolean;
  isNetworkActive: boolean;
}

export interface ConflictResult {
  conflicts: string[];
  errors: { [key: string]: string[] };
  totalTested: number;
  conflictCount: number;
}

export interface WaitOptions {
  timeout?: number;
  indicators?: string[];
  adminPage?: string;
}

export interface PerformanceMetrics {
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

export interface ScreenshotOptions {
  fullPage?: boolean;
  directory?: string;
  timestamp?: boolean;
}

// Legacy standalone functions for backward compatibility
// These now use the new WordPress E2E utils under the hood

/**
 * Login to WordPress admin (legacy function).
 * Use WordPress E2E utils test fixtures for new code.
 * 
 * @param {Page} page     - Playwright page instance.
 * @param {string} username - WordPress username.
 * @param {string} password - WordPress password.
 * 
 * @since TBD
 */
export async function wpLogin(page: Page, username: string = 'admin', password: string = 'password'): Promise<void> {
  const requestUtils = await RequestUtils.setup({
    baseURL: process.env.WP_BASE_URL || 'https://testflow.lndo.site',
    user: { username, password },
  });
  await requestUtils.login();
}

/**
 * Activate plugin (legacy function).
 * Use WordPress E2E utils or TestFlowHelpers for new code.
 * 
 * @param {Page} page       - Playwright page instance.
 * @param {string} pluginSlug - Plugin slug to activate.
 * 
 * @since TBD
 */
export async function activatePlugin(page: Page, pluginSlug: string): Promise<void> {
  const requestUtils = await RequestUtils.setup({
    baseURL: process.env.WP_BASE_URL || 'https://testflow.lndo.site',
    user: {
      username: process.env.WP_USERNAME || 'admin',
      password: process.env.WP_PASSWORD || 'password',
    },
  });
  await requestUtils.activatePlugin(pluginSlug);
}

/**
 * Deactivate plugin (legacy function).
 * Use WordPress E2E utils or TestFlowHelpers for new code.
 * 
 * @param {Page} page       - Playwright page instance.
 * @param {string} pluginSlug - Plugin slug to deactivate.
 * 
 * @since TBD
 */
export async function deactivatePlugin(page: Page, pluginSlug: string): Promise<void> {
  const requestUtils = await RequestUtils.setup({
    baseURL: process.env.WP_BASE_URL || 'https://testflow.lndo.site',
    user: {
      username: process.env.WP_USERNAME || 'admin',
      password: process.env.WP_PASSWORD || 'password',
    },
  });
  await requestUtils.deactivatePlugin(pluginSlug);
}

/**
 * Check if plugin is active (legacy function).
 * Use WordPress E2E utils for new code.
 * 
 * @param {Page} page       - Playwright page instance.
 * @param {string} pluginSlug - Plugin slug to check.
 * 
 * @returns {Promise<boolean>} - Whether plugin is active.
 * 
 * @since TBD
 */
export async function isPluginActive(page: Page, pluginSlug: string): Promise<boolean> {
  const pageUtils = new PageUtils({ page });
  const editor = new Editor({ page });
  const admin = new Admin({ page, pageUtils, editor });
  
  await admin.visitAdminPage('plugins.php');
  const pluginRow = page.locator(`tr[data-slug="${pluginSlug}"]`);
  const deactivateLink = pluginRow.locator('a:has-text("Deactivate")');
  
  return await deactivateLink.isVisible();
}

/**w
 * Create post (legacy function).
 * Use WordPress E2E utils for new code.
 * 
 * @param {Page} page    - Playwright page instance.
 * @param {string} title   - Post title.
 * @param {string} content - Post content.
 * 
 * @returns {Promise<string>} - Created post URL.
 * 
 * @since TBD
 */
export async function createPost(page: Page, title: string, content: string = ''): Promise<string> {
  const pageUtils = new PageUtils({ page });
  const editor = new Editor({ page });
  const admin = new Admin({ page, pageUtils, editor });
  
  await admin.createNewPost();
  await editor.canvas.locator('role=textbox[name="Add title"i]').fill(title);
  
  if (content) {
    await editor.canvas.locator('role=document[name="Empty block"i]').click();
    await page.keyboard.type(content);
  }
  
  // Save post
  await page.keyboard.press('Meta+s'); // Or Ctrl+s on Windows/Linux
  await page.waitForSelector('.editor-post-save-draft', { state: 'hidden', timeout: 10000 });
  
  // Get the post URL
  const postUrl = await page.url();
  return postUrl.replace('/wp-admin/post.php', '').replace('?post=', '/?p=').replace('&action=edit', '');
}

/**
 * Clear cache (legacy function).
 * Use TestFlowHelpers.clearAllCaches() for new code.
 * 
 * @param {Page} page - Playwright page instance.
 * 
 * @since TBD
 */
export async function clearCache(page: Page): Promise<void> {
  const helpers = new TestFlowHelpers(page);
  await helpers.clearAllCaches();
}

/**
 * Measure page load time (legacy function).
 * Use TestFlowHelpers.measureDetailedPerformance() for new code.
 * 
 * @param {Page} page - Playwright page instance.
 * @param {string} url  - URL to measure.
 * 
 * @returns {Promise<number>} - Load time in milliseconds.
 * 
 * @since TBD
 */
export async function measurePageLoad(page: Page, url: string): Promise<number> {
  const helpers = new TestFlowHelpers(page);
  const metrics = await helpers.measureDetailedPerformance(url);
  return metrics.totalLoadTime;
}

/**
 * Switch to site (legacy function).
 * Use TestFlowHelpers.switchToSite() for new code.
 * 
 * @param {Page} page     - Playwright page instance.
 * @param {string} siteName - Site name to switch to.
 * 
 * @since TBD
 */
export async function switchToSite(page: Page, siteName: string): Promise<void> {
  const helpers = new TestFlowHelpers(page);
  await helpers.switchToSite(siteName);
}

/**
 * Network activate plugin (legacy function).
 * Use TestFlowHelpers.networkActivatePlugin() for new code.
 * 
 * @param {Page} page       - Playwright page instance.
 * @param {string} pluginSlug - Plugin slug to network activate.
 * 
 * @since TBD
 */
export async function networkActivatePlugin(page: Page, pluginSlug: string): Promise<void> {
  const helpers = new TestFlowHelpers(page);
  await helpers.networkActivatePlugin(pluginSlug);
} 