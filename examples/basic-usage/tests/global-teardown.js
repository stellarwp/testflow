/**
 * Global Teardown for WordPress E2E Test Utils
 * 
 * @since TBD
 */

import { chromium } from '@playwright/test';
import { Admin, RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import fs from 'fs-extra';
import path from 'path';

async function globalTeardown() {
  console.log('🧹 Starting WordPress E2E Test Environment Cleanup...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // WordPress configuration
    const wpBaseUrl = process.env.WP_BASE_URL || 'https://testflow.lndo.site';
    const wpUsername = process.env.WP_USERNAME || 'admin';
    const wpPassword = process.env.WP_PASSWORD || 'password';
    
    console.log(`📍 Cleaning up WordPress at: ${wpBaseUrl}`);
    
    // Initialize WordPress utilities
    const admin = new Admin({ page, pageUtils: { page } });
    const requestUtils = new RequestUtils({
      baseURL: wpBaseUrl,
      username: wpUsername,
      password: wpPassword
    });
    
    // Load authentication state if available
    const authStatePath = process.env.STORAGE_STATE_PATH || 'tests/.auth/wordpress.json';
    
    if (await fs.pathExists(authStatePath)) {
      const authState = await fs.readJson(authStatePath);
      await page.context().addCookies(authState.cookies);
      console.log('🔐 Authentication state loaded');
    } else {
      // Login if no auth state
      try {
        await page.goto(`${wpBaseUrl}/wp-admin`);
        
        const loginForm = page.locator('#loginform');
        if (await loginForm.isVisible()) {
          await page.fill('#user_login', wpUsername);
          await page.fill('#user_pass', wpPassword);
          await page.click('#wp-submit');
          await page.waitForSelector('#wpadminbar', { timeout: 10000 });
        }
      } catch (error) {
        console.warn('⚠️ Could not login for cleanup, continuing...');
      }
    }
    
    try {
      // Clean up test content
      console.log('🗑️ Cleaning up test content...');
      
      // Deactivate test plugins
      await admin.visitAdminPage('plugins.php');
      
      const testPluginPatterns = [
        'test-plugin',
        'example-plugin',
        'demo-plugin',
        'sample-plugin',
        'my-plugin'
      ];
      
      for (const pattern of testPluginPatterns) {
        try {
          const pluginRow = page.locator(`tr[data-slug*="${pattern}"]`);
          const deactivateLink = pluginRow.locator('a:has-text("Deactivate")');
          
          if (await deactivateLink.isVisible()) {
            await deactivateLink.click();
            await page.waitForSelector('.notice', { timeout: 5000 });
            console.log(`🔄 Deactivated test plugin: ${pattern}`);
          }
        } catch (error) {
          // Continue if plugin not found
        }
      }
      
      // Clean up test posts
      console.log('📝 Cleaning up test posts...');
      
      await admin.visitAdminPage('edit.php');
      
      // Look for test posts and move them to trash
      const testPostTitles = [
        'Performance Test',
        'Test Post',
        'Sample Post',
        'Demo Post',
        'Plugin Test'
      ];
      
      for (const title of testPostTitles) {
        try {
          const postRow = page.locator(`tr:has(.row-title:has-text("${title}"))`);
          
          if (await postRow.isVisible()) {
            const trashLink = postRow.locator('.row-actions .trash a');
            
            if (await trashLink.isVisible()) {
              await trashLink.click();
              await page.waitForSelector('.notice', { timeout: 5000 });
              console.log(`🗑️ Moved test post to trash: ${title}`);
            }
          }
        } catch (error) {
          // Continue if post not found
        }
      }
      
      // Empty trash
      try {
        const emptyTrashLink = page.locator('a:has-text("Empty Trash")');
        if (await emptyTrashLink.isVisible()) {
          await emptyTrashLink.click();
          await page.waitForSelector('.notice', { timeout: 5000 });
          console.log('🗑️ Emptied post trash');
        }
      } catch (error) {
        // Continue if no trash to empty
      }
      
      // Clean up test pages
      console.log('📄 Cleaning up test pages...');
      
      await admin.visitAdminPage('edit.php?post_type=page');
      
      const testPageTitles = [
        'Test Page',
        'Sample Page', 
        'Demo Page',
        'Plugin Test Page'
      ];
      
      for (const title of testPageTitles) {
        try {
          const pageRow = page.locator(`tr:has(.row-title:has-text("${title}"))`);
          
          if (await pageRow.isVisible()) {
            const trashLink = pageRow.locator('.row-actions .trash a');
            
            if (await trashLink.isVisible()) {
              await trashLink.click();
              await page.waitForSelector('.notice', { timeout: 5000 });
              console.log(`🗑️ Moved test page to trash: ${title}`);
            }
          }
        } catch (error) {
          // Continue if page not found
        }
      }
      
      // Clear caches
      console.log('🧽 Clearing caches...');
      
      // Clear browser cache
      await page.evaluate(() => {
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
      });
      
      // Check for caching plugins and clear their caches
      const cachingPlugins = [
        'w3-total-cache',
        'wp-super-cache', 
        'wp-rocket',
        'litespeed-cache'
      ];
      
      for (const plugin of cachingPlugins) {
        try {
          const pluginRow = page.locator(`tr[data-slug="${plugin}"]`);
          const isActive = await pluginRow.locator('a:has-text("Deactivate")').isVisible();
          
          if (isActive) {
            console.log(`🔄 Clearing cache for: ${plugin}`);
            
            // Try to access plugin's cache clearing page
            try {
              await admin.visitAdminPage(`admin.php?page=${plugin}`);
              
              // Look for clear cache buttons
              const clearButtons = [
                'input[value*="Clear"]',
                'button:has-text("Clear Cache")',
                'a:has-text("Purge Cache")',
                'button:has-text("Flush Cache")'
              ];
              
              for (const selector of clearButtons) {
                const button = page.locator(selector);
                if (await button.isVisible()) {
                  await button.click();
                  await page.waitForTimeout(1000);
                  console.log(`✅ Cleared cache for ${plugin}`);
                  break;
                }
              }
            } catch (error) {
              console.warn(`⚠️ Could not clear cache for ${plugin}`);
            }
          }
        } catch (error) {
          // Continue if plugin not found
        }
      }
      
      // Reset to default theme
      console.log('🎨 Resetting to default theme...');
      
      try {
        await requestUtils.activateTheme('twentytwentythree');
        console.log('✅ Default theme activated');
      } catch (error) {
        console.warn('⚠️ Could not activate default theme:', error.message);
      }
      
      console.log('✅ WordPress cleanup completed successfully');
      
    } catch (cleanupError) {
      console.error('❌ WordPress cleanup failed:', cleanupError.message);
      // Don't throw error for cleanup failures
    }
    
  } finally {
    await browser.close();
  }
  
  // Clean up test artifacts
  console.log('🧽 Cleaning up test artifacts...');
  
  try {
    // Clean up authentication files
    const authDir = 'tests/.auth';
    if (await fs.pathExists(authDir)) {
      await fs.remove(authDir);
      console.log('🗑️ Removed authentication files');
    }
    
    // Clean up old test results (keep only the latest)
    const testResultsDir = 'test-results';
    if (await fs.pathExists(testResultsDir)) {
      const files = await fs.readdir(testResultsDir);
      const oldFiles = files.filter(file => {
        const filePath = path.join(testResultsDir, file);
        const stats = fs.statSync(filePath);
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return stats.mtime.getTime() < oneDayAgo;
      });
      
      for (const file of oldFiles) {
        await fs.remove(path.join(testResultsDir, file));
      }
      
      if (oldFiles.length > 0) {
        console.log(`🗑️ Cleaned up ${oldFiles.length} old test result files`);
      }
    }
    
    // Clean up screenshots older than 7 days
    const screenshotsDir = 'test-results/screenshots';
    if (await fs.pathExists(screenshotsDir)) {
      const files = await fs.readdir(screenshotsDir);
      const oldScreenshots = files.filter(file => {
        const filePath = path.join(screenshotsDir, file);
        const stats = fs.statSync(filePath);
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return stats.mtime.getTime() < sevenDaysAgo;
      });
      
      for (const file of oldScreenshots) {
        await fs.remove(path.join(screenshotsDir, file));
      }
      
      if (oldScreenshots.length > 0) {
        console.log(`🗑️ Cleaned up ${oldScreenshots.length} old screenshots`);
      }
    }
    
  } catch (artifactError) {
    console.warn('⚠️ Could not clean up some test artifacts:', artifactError.message);
  }
  
  // Optional: Stop Lando if we started it and not in CI
  if (!process.env.CI && process.env.STOP_LANDO_AFTER_TESTS) {
    console.log('🐳 Stopping Lando...');
    
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('lando stop');
      console.log('✅ Lando stopped successfully');
      
    } catch (landoError) {
      console.warn('⚠️ Could not stop Lando:', landoError.message);
    }
  }
  
  console.log('🎉 Global teardown completed successfully');
}

export default globalTeardown; 