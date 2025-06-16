/**
 * WordPress Helper Functions for TestFlow
 * 
 * @since TBD
 */

import { Page } from 'playwright';

export class WordPressHelpers {
  private page: Page;

  /**
   * Initialize WordPress helpers.
   * 
   * @param {Page} page - Playwright page instance.
   * 
   * @since TBD
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Login to WordPress admin.
   * 
   * @param {string} username - Username.
   * @param {string} password - Password.
   * @param {string} siteUrl  - Site URL.
   * 
   * @since TBD
   */
  async login(username: string = 'admin', password: string = 'password', siteUrl: string = 'https://testflow.lndo.site'): Promise<void> {
    const loginUrl = `${siteUrl}/wp-admin`;
    
    await this.page.goto(loginUrl);
    
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
   * Logout from WordPress admin.
   * 
   * @since TBD
   */
  async logout(): Promise<void> {
    await this.page.hover('#wpadminbar');
    await this.page.click('text=Log Out');
  }

  /**
   * Navigate to plugins page.
   * 
   * @since TBD
   */
  async goToPlugins(): Promise<void> {
    await this.page.click('text=Plugins');
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
   * Activate a plugin.
   * 
   * @param {string} pluginSlug - Plugin slug or name.
   * 
   * @since TBD
   */
  async activatePlugin(pluginSlug: string): Promise<void> {
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

  /**
   * Deactivate a plugin.
   * 
   * @param {string} pluginSlug - Plugin slug or name.
   * 
   * @since TBD
   */
  async deactivatePlugin(pluginSlug: string): Promise<void> {
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

  /**
   * Bulk activate plugins.
   * 
   * @param {string[]} pluginSlugs - Array of plugin slugs.
   * 
   * @since TBD
   */
  async bulkActivatePlugins(pluginSlugs: string[]): Promise<void> {
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

  /**
   * Bulk deactivate plugins.
   * 
   * @param {string[]} pluginSlugs - Array of plugin slugs.
   * 
   * @since TBD
   */
  async bulkDeactivatePlugins(pluginSlugs: string[]): Promise<void> {
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
    const pluginRows = this.page.locator('.wp-list-table tbody tr');
    const count = await pluginRows.count();
    
    for (let i = 0; i < count; i++) {
      const row = pluginRows.nth(i);
      const deactivateLink = row.locator('a:has-text("Deactivate")');
      
      if (await deactivateLink.isVisible()) {
        const pluginName = await row.locator('.plugin-title strong').textContent();
        if (pluginName) {
          activePlugins.push(pluginName.trim());
        }
      }
    }
    
    return activePlugins;
  }

  /**
   * Wait for plugin to be fully loaded.
   * 
   * @param {string} pluginSlug - Plugin slug or identifier.
   * @param {number} timeout    - Timeout in milliseconds.
   * 
   * @since TBD
   */
  async waitForPluginLoaded(pluginSlug: string, timeout: number = 10000): Promise<void> {
    // Wait for any plugin-specific elements or JavaScript to load
    await this.page.waitForTimeout(1000); // Basic wait
    
    // Check if plugin has added any admin notices
    try {
      await this.page.waitForSelector('.notice', { timeout: 3000 });
    } catch {
      // No notices is fine
    }
  }

  /**
   * Create a new post.
   * 
   * @param {string} title   - Post title.
   * @param {string} content - Post content.
   * @param {string} status  - Post status (draft, publish).
   * 
   * @returns {Promise<string>} - Post URL.
   * 
   * @since TBD
   */
  async createPost(title: string, content: string = '', status: string = 'publish'): Promise<string> {
    await this.page.goto('/wp-admin/post-new.php');
    
    // Wait for editor to load
    await this.page.waitForSelector('.edit-post-header', { timeout: 10000 });
    
    // Fill in title
    await this.page.fill('.editor-post-title__input', title);
    
    // Add content if provided
    if (content) {
      await this.page.click('.block-editor-default-block-appender__content');
      await this.page.fill('.block-editor-rich-text__editable', content);
    }
    
    // Publish or save based on status
    if (status === 'publish') {
      await this.page.click('.editor-post-publish-button');
      await this.page.waitForSelector('.components-snackbar', { timeout: 5000 });
    } else {
      await this.page.click('.editor-post-save-draft');
    }
    
    // Get the post URL
    const postUrl = await this.page.url();
    return postUrl;
  }

  /**
   * Navigate to WordPress frontend.
   * 
   * @param {string} path    - Path relative to site URL.
   * @param {string} siteUrl - Site URL.
   * 
   * @since TBD
   */
  async goToFrontend(path: string = '/', siteUrl: string = 'https://testflow.lndo.site'): Promise<void> {
    const frontendUrl = `${siteUrl}${path}`;
    await this.page.goto(frontendUrl);
  }

  /**
   * Clear all caches (if caching plugins are active).
   * 
   * @since TBD
   */
  async clearCaches(): Promise<void> {
    // Try common cache clearing methods
    try {
      // WP Super Cache
      if (await this.page.locator('text=WP Super Cache').isVisible()) {
        await this.page.goto('/wp-admin/options-general.php?page=wpsupercache');
        await this.page.click('text=Delete Cache');
      }
    } catch {
      // Cache plugin not found or accessible
    }
    
    try {
      // W3 Total Cache
      if (await this.page.locator('text=W3 Total Cache').isVisible()) {
        await this.page.goto('/wp-admin/admin.php?page=w3tc_dashboard');
        await this.page.click('text=Empty All Cache');
      }
    } catch {
      // Cache plugin not found or accessible
    }
  }

  /**
   * Take a screenshot for debugging.
   * 
   * @param {string} filename - Screenshot filename.
   * 
   * @since TBD
   */
  async takeScreenshot(filename: string): Promise<void> {
    await this.page.screenshot({ 
      path: `screenshots/${filename}`, 
      fullPage: true 
    });
  }

  /**
   * Wait for admin page to load completely.
   * 
   * @since TBD
   */
  async waitForAdminPageLoad(): Promise<void> {
    await this.page.waitForSelector('#wpadminbar', { timeout: 10000 });
    await this.page.waitForSelector('#wpfooter', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if WordPress has any PHP errors.
   * 
   * @returns {Promise<string[]>} - Array of error messages.
   * 
   * @since TBD
   */
  async checkForPHPErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    // Check for PHP errors in admin notices
    const errorNotices = await this.page.locator('.notice-error, .error').all();
    
    for (const notice of errorNotices) {
      const errorText = await notice.textContent();
      if (errorText) {
        errors.push(errorText.trim());
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
    // This would typically be done via WP-CLI or config modification
    console.log('Debug mode should be enabled via configuration');
  }

  /**
   * Get WordPress version.
   * 
   * @returns {Promise<string>} - WordPress version.
   * 
   * @since TBD
   */
  async getWordPressVersion(): Promise<string> {
    await this.page.goto('/wp-admin/');
    
    // Try to get version from footer
    try {
      const versionText = await this.page.locator('#wpfooter .alignright').textContent();
      const versionMatch = versionText?.match(/Version ([\d.]+)/);
      return versionMatch ? versionMatch[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }
} 