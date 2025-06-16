/**
 * Global Setup for WordPress E2E Test Utils
 * 
 * @since TBD
 */

import { chromium } from '@playwright/test';
import { Admin, RequestUtils } from '@wordpress/e2e-test-utils-playwright';

async function globalSetup() {
  console.log('🚀 Setting up WordPress E2E Test Environment...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // WordPress configuration
    const wpBaseUrl = process.env.WP_BASE_URL || 'https://testflow.lndo.site';
    const wpUsername = process.env.WP_USERNAME || 'admin';
    const wpPassword = process.env.WP_PASSWORD || 'password';
    
    console.log(`📍 WordPress Base URL: ${wpBaseUrl}`);
    console.log(`👤 Admin Username: ${wpUsername}`);
    
    // Initialize WordPress utilities
    const admin = new Admin({ page, pageUtils: { page } });
    const requestUtils = new RequestUtils({
      baseURL: wpBaseUrl,
      username: wpUsername,
      password: wpPassword
    });
    
    // Ensure WordPress is accessible
    console.log('🔍 Checking WordPress accessibility...');
    
    try {
      await page.goto(`${wpBaseUrl}/wp-admin`, { timeout: 30000 });
      
      // Check if login page loads
      const loginForm = page.locator('#loginform');
      if (await loginForm.isVisible()) {
        console.log('✅ WordPress login page accessible');
        
        // Perform login
        await page.fill('#user_login', wpUsername);
        await page.fill('#user_pass', wpPassword);
        await page.click('#wp-submit');
        
        // Wait for successful login
        await page.waitForSelector('#wpadminbar', { timeout: 10000 });
        console.log('✅ WordPress admin login successful');
        
        // Save authentication state
        await page.context().storageState({ 
          path: process.env.STORAGE_STATE_PATH || 'tests/.auth/wordpress.json' 
        });
        console.log('💾 Authentication state saved');
        
      } else if (await page.locator('#wpadminbar').isVisible()) {
        console.log('✅ Already logged in to WordPress');
      }
      
    } catch (error) {
      console.error('❌ WordPress not accessible:', error.message);
      
      // Try to start Lando if not in CI
      if (!process.env.CI) {
        console.log('🐳 Attempting to start Lando...');
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        try {
          await execAsync('lando start', { timeout: 120000 });
          console.log('✅ Lando started successfully');
          
          // Retry WordPress access
          await page.goto(`${wpBaseUrl}/wp-admin`, { timeout: 30000 });
          console.log('✅ WordPress accessible after Lando start');
          
        } catch (landoError) {
          console.error('❌ Failed to start Lando:', landoError.message);
          throw new Error('WordPress environment not accessible and Lando failed to start');
        }
      } else {
        throw error;
      }
    }
    
    // Setup WordPress for testing
    console.log('⚙️ Setting up WordPress for testing...');
    
    try {
      // Activate default theme
      await requestUtils.activateTheme('twentytwentythree');
      console.log('✅ Default theme activated');
      
      // Ensure clean plugin state
      console.log('🧹 Cleaning plugin state...');
      
      // Get list of active plugins and deactivate test plugins
      await admin.visitAdminPage('plugins.php');
      
      const testPluginPatterns = [
        'test-plugin',
        'example-plugin',
        'demo-plugin',
        'sample-plugin'
      ];
      
      for (const pattern of testPluginPatterns) {
        try {
          const pluginRow = page.locator(`tr[data-slug*="${pattern}"]`);
          const deactivateLink = pluginRow.locator('a:has-text("Deactivate")');
          
          if (await deactivateLink.isVisible()) {
            await deactivateLink.click();
            await page.waitForSelector('.notice', { timeout: 5000 });
            console.log(`🔄 Deactivated plugin matching: ${pattern}`);
          }
        } catch (error) {
          // Continue if plugin not found
        }
      }
      
      // Clear any caches
      console.log('🧽 Clearing caches...');
      
      // Check for common caching plugins and clear their caches
      const cachingPlugins = [
        'w3-total-cache',
        'wp-super-cache',
        'wp-rocket',
        'litespeed-cache'
      ];
      
      for (const plugin of cachingPlugins) {
        try {
          const pluginRow = page.locator(`tr[data-slug="${plugin}"]`);
          const deactivateLink = pluginRow.locator('a:has-text("Deactivate")');
          
          if (await deactivateLink.isVisible()) {
            // Plugin is active, try to clear its cache
            console.log(`🔄 Found active caching plugin: ${plugin}`);
            
            // Basic cache clearing - this could be expanded per plugin
            await page.evaluate(() => {
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => {
                    caches.delete(name);
                  });
                });
              }
            });
          }
        } catch (error) {
          // Continue if plugin not found or accessible
        }
      }
      
      // Set up WordPress for optimal testing
      console.log('🎯 Configuring WordPress for testing...');
      
      // Visit admin to ensure everything is working
      await admin.visitAdminPage('/');
      
      // Check for any critical errors
      const errorNotices = page.locator('.notice-error');
      const errorCount = await errorNotices.count();
      
      if (errorCount > 0) {
        console.warn(`⚠️ Found ${errorCount} error notices in WordPress admin`);
        
        for (let i = 0; i < Math.min(errorCount, 3); i++) {
          const errorText = await errorNotices.nth(i).textContent();
          console.warn(`   Error ${i + 1}: ${errorText?.trim()}`);
        }
      } else {
        console.log('✅ No critical errors detected');
      }
      
      console.log('✅ WordPress setup completed successfully');
      
    } catch (setupError) {
      console.error('❌ WordPress setup failed:', setupError.message);
      throw setupError;
    }
    
  } finally {
    await browser.close();
  }
  
  console.log('🎉 Global setup completed successfully');
}

export default globalSetup; 