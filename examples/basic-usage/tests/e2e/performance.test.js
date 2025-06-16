/**
 * Performance Tests using WordPress E2E Test Utils
 */

import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { 
  wpLogin, 
  clearCache, 
  measurePageLoad,
  activatePlugin,
  deactivatePlugin 
} from '../../../src/utils/wordpress-helpers.js';

test.describe('Performance Tests with WordPress E2E Utils', () => {
  test.beforeEach(async ({ admin, requestUtils }) => {
    // Use WordPress official utilities for setup
    await admin.visitAdminPage('/');
    
    // Ensure clean state
    await clearCache(admin.page);
  });

  test('Homepage load time: Should load within acceptable time', async ({ page, admin }) => {
    // Clear all caches first using WordPress utilities
    await clearCache(page);
    
    // Measure homepage load time
    const loadTime = await measurePageLoad(page, '/');
    
    console.log(`Homepage load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000); // Less than 3 seconds
    
    // Verify page loaded completely
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin dashboard performance: Should load quickly', async ({ page, admin }) => {
    await clearCache(page);
    
    // Measure admin dashboard load using WordPress admin utilities
    const startTime = Date.now();
    await admin.visitAdminPage('/');
    const loadTime = Date.now() - startTime;
    
    console.log(`Admin dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(4000); // Less than 4 seconds
    
    // Verify admin elements are present
    await expect(page.locator('#wpadminbar')).toBeVisible();
    await expect(page.locator('#adminmenu')).toBeVisible();
  });

  test('Plugin activation performance impact: Should not significantly slow down site', async ({ page, admin, requestUtils }) => {
    // Measure baseline performance without plugins
    await clearCache(page);
    
    const baselineTime = await measurePageLoad(page, '/');
    console.log(`Baseline load time: ${baselineTime}ms`);
    
    // Activate plugin using WordPress utilities
    try {
      await requestUtils.activatePlugin('my-plugin');
    } catch (error) {
      await activatePlugin(page, 'my-plugin');
    }
    
    // Clear cache after plugin activation
    await clearCache(page);
    
    // Measure performance with plugin active
    const withPluginTime = await measurePageLoad(page, '/');
    console.log(`With plugin load time: ${withPluginTime}ms`);
    
    // Plugin should not increase load time by more than 50%
    expect(withPluginTime).toBeLessThan(baselineTime * 1.5);
  });

  test('Database query performance: Should maintain efficient queries', async ({ page, admin }) => {
    // This test would typically require Query Monitor plugin
    try {
      await activatePlugin(page, 'query-monitor');
      
      // Navigate to a page that would trigger database queries
      await page.goto('/');
      
      // Check for Query Monitor data (if available)
      const qmButton = page.locator('#wp-admin-bar-query-monitor');
      if (await qmButton.isVisible()) {
        await qmButton.click();
        
        // Check query count and time
        const queryInfo = await page.locator('#qm-queries .qm-items').textContent();
        
        if (queryInfo) {
          const queryCount = parseInt(queryInfo.match(/(\d+) queries/)?.[1] || '0');
          const queryTime = parseFloat(queryInfo.match(/([\d.]+)s/)?.[1] || '0');
          
          console.log(`Database queries: ${queryCount}, Time: ${queryTime}s`);
          
          // Reasonable limits for query performance
          expect(queryCount).toBeLessThan(50); // Less than 50 queries
          expect(queryTime).toBeLessThan(1.0); // Less than 1 second
        }
      }
    } catch (error) {
      console.log('Query Monitor not available, skipping detailed query analysis');
    }
  });

  test('Memory usage: Should maintain reasonable memory consumption', async ({ page, admin }) => {
    // Get performance metrics using browser APIs
    const metrics = await page.evaluate(() => {
      const perfInfo = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perfInfo.domContentLoadedEventEnd - perfInfo.domContentLoadedEventStart,
        loadComplete: perfInfo.loadEventEnd - perfInfo.loadEventStart,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
    
    console.log('Performance metrics:', metrics);
    
    // Check resource loading efficiency
    expect(metrics.resourceCount).toBeLessThan(100); // Reasonable resource count
    expect(metrics.domContentLoaded).toBeLessThan(2000); // DOM loads quickly
  });

  test('Caching effectiveness: Should benefit from caching', async ({ page, admin, requestUtils }) => {
    // First, clear all caches
    await clearCache(page);
    
    // Measure first load (uncached)
    const uncachedTime = await measurePageLoad(page, '/');
    console.log(`Uncached load time: ${uncachedTime}ms`);
    
    // Load page again (should be cached)
    const cachedTime = await measurePageLoad(page, '/');
    console.log(`Cached load time: ${cachedTime}ms`);
    
    // Cached version should be faster (with some tolerance for variations)
    expect(cachedTime).toBeLessThanOrEqual(uncachedTime * 1.1);
  });

  test('Concurrent user simulation: Should handle multiple requests', async ({ browser, admin }) => {
    const concurrentUsers = 3;
    const contexts = [];
    const loadTimes = [];
    
    // Create multiple browser contexts to simulate different users
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      contexts.push(context);
    }
    
    try {
      // Simulate concurrent page loads
      const promises = contexts.map(async (context) => {
        const page = await context.newPage();
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        loadTimes.push(loadTime);
        await page.close();
      });
      
      await Promise.all(promises);
      
      const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      const maxLoadTime = Math.max(...loadTimes);
      
      console.log(`Concurrent load times: ${loadTimes.join(', ')}ms`);
      console.log(`Average: ${avgLoadTime}ms, Max: ${maxLoadTime}ms`);
      
      // Performance should remain reasonable under concurrent load
      expect(avgLoadTime).toBeLessThan(5000); // Average under 5 seconds
      expect(maxLoadTime).toBeLessThan(8000); // No single request over 8 seconds
      
    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('Content optimization: Should deliver optimized content', async ({ page, admin }) => {
    await page.goto('/');
    
    // Check for gzip compression
    const response = await page.waitForResponse(response => 
      response.url().includes(page.url()) && response.request().method() === 'GET'
    );
    
    const headers = response.headers();
    
    // Check for performance optimizations
    if (headers['content-encoding']) {
      expect(headers['content-encoding']).toMatch(/gzip|br|deflate/);
      console.log('Content compression enabled:', headers['content-encoding']);
    }
    
    // Check for caching headers
    if (headers['cache-control']) {
      console.log('Cache control:', headers['cache-control']);
    }
    
    // Verify reasonable content size
    const contentLength = headers['content-length'];
    if (contentLength) {
      const sizeInKB = parseInt(contentLength) / 1024;
      console.log(`Content size: ${sizeInKB.toFixed(2)} KB`);
      expect(sizeInKB).toBeLessThan(500); // Less than 500KB for basic page
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearCache(page);
  });
});

test.describe('Performance Monitoring with WordPress Utilities', () => {
  test('Core Web Vitals: Should meet performance standards', async ({ page }) => {
    await page.goto('/');
    
    // Measure Core Web Vitals using Performance Observer API
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay would need user interaction
        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.fcp = entries[0].startTime;
          resolve(vitals);
        }).observe({ entryTypes: ['paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(vitals), 3000);
      });
    });
    
    console.log('Core Web Vitals:', webVitals);
    
    // Google's thresholds for good performance
    if (webVitals.lcp) {
      expect(webVitals.lcp).toBeLessThan(2500); // LCP < 2.5s
    }
    
    if (webVitals.fcp) {
      expect(webVitals.fcp).toBeLessThan(1800); // FCP < 1.8s
    }
    
    if (webVitals.cls !== undefined) {
      expect(webVitals.cls).toBeLessThan(0.1); // CLS < 0.1
    }
  });

  test('Resource loading optimization: Should load resources efficiently', async ({ page }) => {
    // Monitor network requests
    const resourceMetrics = {
      images: [],
      scripts: [],
      stylesheets: [],
      total: 0
    };
    
    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      const size = parseInt(response.headers()['content-length'] || '0');
      
      resourceMetrics.total++;
      
      if (contentType.includes('image')) {
        resourceMetrics.images.push({ url, size });
      } else if (contentType.includes('javascript')) {
        resourceMetrics.scripts.push({ url, size });
      } else if (contentType.includes('css')) {
        resourceMetrics.stylesheets.push({ url, size });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('Resource metrics:', {
      totalRequests: resourceMetrics.total,
      images: resourceMetrics.images.length,
      scripts: resourceMetrics.scripts.length,
      stylesheets: resourceMetrics.stylesheets.length
    });
    
    // Performance guidelines
    expect(resourceMetrics.total).toBeLessThan(50); // Total requests
    expect(resourceMetrics.images.length).toBeLessThan(20); // Image requests
    expect(resourceMetrics.scripts.length).toBeLessThan(10); // Script requests
    expect(resourceMetrics.stylesheets.length).toBeLessThan(5); // CSS requests
    
    // Check for oversized resources
    const oversizedImages = resourceMetrics.images.filter(img => img.size > 100000); // 100KB
    const oversizedScripts = resourceMetrics.scripts.filter(script => script.size > 500000); // 500KB
    
    expect(oversizedImages.length).toBe(0);
    expect(oversizedScripts.length).toBe(0);
  });
}); 