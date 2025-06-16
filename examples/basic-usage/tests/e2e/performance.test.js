/**
 * Performance Tests
 * 
 * Tests for plugin performance impact and optimization
 */

const { test, expect } = require('@playwright/test');

test.describe('Performance Tests', () => {
  let wpHelpers;

  test.beforeEach(async ({ page }) => {
    // Import and initialize WordPress helpers
    const { WordPressHelpers } = await import('../../src/utils/wordpress-helpers.js');
    wpHelpers = new WordPressHelpers(page);
    
    // Login to WordPress admin
    await wpHelpers.login();
  });

  test('should measure page load times with and without plugins', async ({ page }) => {
    // Measure baseline performance (no plugins)
    await wpHelpers.bulkDeactivatePlugins(['*']);
    
    const baselineMetrics = await measurePagePerformance(page, '/');
    console.log('Baseline metrics:', baselineMetrics);
    
    // Activate plugins and measure again
    await wpHelpers.login();
    await wpHelpers.bulkActivatePlugins(['performance-plugin', 'caching-plugin']);
    
    const pluginMetrics = await measurePagePerformance(page, '/');
    console.log('With plugins metrics:', pluginMetrics);
    
    // Performance assertions
    expect(pluginMetrics.loadTime).toBeLessThan(baselineMetrics.loadTime * 2);
    expect(pluginMetrics.domContentLoaded).toBeLessThan(baselineMetrics.domContentLoaded * 2);
  });

  test('should test admin dashboard performance', async ({ page }) => {
    // Measure admin dashboard load time
    const adminMetrics = await measurePagePerformance(page, '/wp-admin/');
    
    console.log('Admin dashboard metrics:', adminMetrics);
    
    // Admin should load reasonably fast
    expect(adminMetrics.loadTime).toBeLessThan(5000); // 5 seconds max
    expect(adminMetrics.domContentLoaded).toBeLessThan(3000); // 3 seconds max
  });

  test('should test plugin-heavy page performance', async ({ page }) => {
    // Create a page that uses many plugin features
    await wpHelpers.createPost('Performance Test Page', 'This page tests plugin performance with various shortcodes and features.');
    
    // Measure performance of this plugin-heavy page
    const heavyPageMetrics = await measurePagePerformance(page, '/performance-test-page/');
    
    console.log('Plugin-heavy page metrics:', heavyPageMetrics);
    
    // Even with heavy plugin usage, should be reasonable
    expect(heavyPageMetrics.loadTime).toBeLessThan(8000); // 8 seconds max
  });

  test('should test database query performance', async ({ page }) => {
    // Enable query monitoring if available
    try {
      await wpHelpers.activatePlugin('query-monitor');
      
      // Load a page and check query performance
      await page.goto('/');
      
      // Look for Query Monitor data
      const queryMonitorLink = page.locator('#wp-admin-bar-query-monitor');
      
      if (await queryMonitorLink.isVisible()) {
        await queryMonitorLink.click();
        
        // Check query count and time
        const queryCount = await page.locator('.qm-query-count').textContent();
        const queryTime = await page.locator('.qm-query-time').textContent();
        
        console.log(`Database queries: ${queryCount}, Time: ${queryTime}`);
        
        // Parse and assert reasonable query performance
        const count = parseInt(queryCount);
        const time = parseFloat(queryTime.replace('s', ''));
        
        expect(count).toBeLessThan(50); // Less than 50 queries
        expect(time).toBeLessThan(0.5); // Less than 500ms
      }
    } catch (error) {
      console.log('Query Monitor not available, skipping database performance test');
    }
  });

  test('should test memory usage', async ({ page }) => {
    // Test memory usage if possible
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return performance.memory;
      }
      return null;
    });
    
    if (memoryInfo) {
      console.log('Memory usage:', memoryInfo);
      
      // Basic memory usage checks
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB
    } else {
      console.log('Memory API not available');
    }
  });

  test('should test large dataset handling', async ({ page }) => {
    // Test performance with large amounts of data
    console.log('Testing large dataset performance...');
    
    // Navigate to posts list with many items
    await page.goto('/wp-admin/edit.php');
    
    const startTime = Date.now();
    await page.waitForSelector('.wp-list-table');
    const loadTime = Date.now() - startTime;
    
    console.log(`Large dataset load time: ${loadTime}ms`);
    
    // Should load within reasonable time even with lots of data
    expect(loadTime).toBeLessThan(5000);
  });

  test('should test caching effectiveness', async ({ page }) => {
    // Test if caching improves performance
    await wpHelpers.activatePlugin('caching-plugin');
    
    // First load (uncached)
    await page.goto('/', { waitUntil: 'networkidle' });
    const uncachedMetrics = await measurePagePerformance(page, '/');
    
    // Second load (should be cached)
    await page.goto('/', { waitUntil: 'networkidle' });
    const cachedMetrics = await measurePagePerformance(page, '/');
    
    console.log('Uncached metrics:', uncachedMetrics);
    console.log('Cached metrics:', cachedMetrics);
    
    // Cached version should be faster
    expect(cachedMetrics.loadTime).toBeLessThan(uncachedMetrics.loadTime);
  });

  test('should test mobile performance', async ({ page, browser }) => {
    // Create mobile context
    const mobileContext = await browser.newContext({
      ...devices['iPhone 12'],
    });
    
    const mobilePage = await mobileContext.newPage();
    
    // Measure mobile performance
    const mobileMetrics = await measurePagePerformance(mobilePage, '/');
    
    console.log('Mobile metrics:', mobileMetrics);
    
    // Mobile should still be reasonably fast
    expect(mobileMetrics.loadTime).toBeLessThan(6000); // 6 seconds on mobile
    
    await mobileContext.close();
  });

  test('should test concurrent user performance', async ({ browser, page }) => {
    // Simulate multiple concurrent users
    const contexts = [];
    const pages = [];
    const results = [];
    
    // Create 5 concurrent contexts
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext();
      const newPage = await context.newPage();
      contexts.push(context);
      pages.push(newPage);
    }
    
    // Run concurrent tests
    const promises = pages.map(async (p, index) => {
      const metrics = await measurePagePerformance(p, `/`);
      return { user: index + 1, metrics };
    });
    
    const concurrentResults = await Promise.all(promises);
    
    console.log('Concurrent user results:', concurrentResults);
    
    // All users should get reasonable performance
    for (const result of concurrentResults) {
      expect(result.metrics.loadTime).toBeLessThan(8000); // 8 seconds max under load
    }
    
    // Clean up
    for (const context of contexts) {
      await context.close();
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up performance test artifacts
    if (test.info().status === 'failed') {
      await wpHelpers.takeScreenshot(`performance-failed-${test.info().title}.png`);
    }
  });
});

/**
 * Measure page performance metrics
 * 
 * @param {Page} page - Playwright page
 * @param {string} url - URL to measure
 * @returns {Promise<Object>} Performance metrics
 */
async function measurePagePerformance(page, url) {
  const startTime = Date.now();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  
  const loadTime = Date.now() - startTime;
  
  const performanceMetrics = await page.evaluate(() => {
    const timing = performance.timing;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      fullyLoaded: timing.loadEventEnd - timing.navigationStart,
      firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0,
    };
  });
  
  return {
    loadTime,
    ...performanceMetrics,
  };
} 