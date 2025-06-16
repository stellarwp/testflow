/**
 * Playwright Manager - Handles test discovery and execution
 * 
 * @since TBD
 */

import { test, expect } from '@playwright/test';
import { glob } from 'glob';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import chalk from 'chalk';

export interface PlaywrightConfig {
  testDir: string;
  patterns?: string[];
  timeout?: number;
  retries?: number;
  workers?: number;
}

export interface PlaywrightOptions {
  headless?: boolean;
  debug?: boolean;
}

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

export class PlaywrightManager {
  private config: PlaywrightConfig;
  private options: PlaywrightOptions;

  /**
   * Initialize Playwright manager.
   * 
   * @param {PlaywrightConfig} config  - Playwright configuration.
   * @param {PlaywrightOptions} options - Playwright options.
   * 
   * @since TBD
   */
  constructor(config: PlaywrightConfig, options: PlaywrightOptions = {}) {
    this.config = config;
    this.options = {
      headless: true,
      debug: false,
      ...options
    };
  }

  /**
   * Discover test files based on patterns.
   * 
   * @returns {Promise<string[]>} - Array of test file paths.
   * 
   * @since TBD
   */
  async discoverTests(): Promise<string[]> {
    const testFiles: string[] = [];
    const patterns = this.config.patterns || ['**/*.test.js', '**/*.spec.js'];

    for (const pattern of patterns) {
      const searchPath = join(this.config.testDir, pattern);
      const matches = await glob(searchPath, {
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      });

      for (const match of matches) {
        if (existsSync(match)) {
          testFiles.push(match);
        }
      }
    }

    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Run Playwright tests.
   * 
   * @param {string[]} testFiles - Array of test files to run.
   * 
   * @returns {Promise<TestResults>} - Test execution results.
   * 
   * @since TBD
   */
  async runTests(testFiles: string[] = []): Promise<TestResults> {
    const results: TestResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };

    if (testFiles.length === 0) {
      testFiles = await this.discoverTests();
    }

    if (testFiles.length === 0) {
      throw new Error('No test files found to execute');
    }

    try {
      // Generate Playwright config
      await this.generatePlaywrightConfig();

      // Build the Playwright command
      const playwrightCmd = this.buildPlaywrightCommand(testFiles);

      // Run tests
      const output = execSync(playwrightCmd, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Parse results from output
      results.total = testFiles.length;
      results.passed = this.parseTestResults(output, 'passed');
      results.failed = this.parseTestResults(output, 'failed');
      results.skipped = this.parseTestResults(output, 'skipped');

      if (this.options.debug) {
        console.log(chalk.blue('📊 Test Results:'));
        console.log(chalk.green(`  ✅ Passed: ${results.passed}`));
        console.log(chalk.red(`  ❌ Failed: ${results.failed}`));
        console.log(chalk.yellow(`  ⏭️  Skipped: ${results.skipped}`));
        console.log(chalk.blue(`  📋 Total: ${results.total}`));
      }

      return results;

    } catch (error) {
      // Handle test failures
      const errorOutput = error.toString();
      
      if (errorOutput.includes('failed')) {
        results.failed = this.parseTestResults(errorOutput, 'failed') || testFiles.length;
        results.total = testFiles.length;
        
        if (this.options.debug) {
          console.log(chalk.red('❌ Test execution failed:'));
          console.log(errorOutput);
        }
        
        return results;
      }
      
      throw new Error(`Playwright execution failed: ${error}`);
    }
  }

  /**
   * Generate Playwright configuration file.
   * 
   * @private
   * 
   * @since TBD
   */
  private async generatePlaywrightConfig(): Promise<void> {
    const config = {
      testDir: this.config.testDir,
      timeout: this.config.timeout || 30000,
      retries: this.config.retries || 2,
      workers: this.config.workers || 1,
      use: {
        headless: this.options.headless,
        viewport: { width: 1280, height: 720 },
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure'
      },
      projects: [
        {
          name: 'chromium',
          use: { 
            ...require('@playwright/test').devices['Desktop Chrome'],
            baseURL: 'https://testflow.lndo.site'
          }
        }
      ],
      webServer: {
        command: 'echo "Lando server already running"',
        url: 'https://testflow.lndo.site',
        reuseExistingServer: true,
        timeout: 5000,
        ignoreHTTPSErrors: true
      }
    };

    const configContent = `
import { defineConfig } from '@playwright/test';

export default defineConfig(${JSON.stringify(config, null, 2)});
`;

    const fs = require('fs');
    fs.writeFileSync('playwright.config.js', configContent, 'utf8');
  }

  /**
   * Build Playwright command.
   * 
   * @param {string[]} testFiles - Test files to run.
   * 
   * @returns {string} - Playwright command.
   * 
   * @private
   * 
   * @since TBD
   */
  private buildPlaywrightCommand(testFiles: string[]): string {
    const cmd = ['npx playwright test'];

    // Add test files
    if (testFiles.length > 0) {
      cmd.push(testFiles.join(' '));
    }

    // Add options
    if (this.options.headless) {
      cmd.push('--headed=false');
    }

    if (this.config.workers) {
      cmd.push(`--workers=${this.config.workers}`);
    }

    if (this.config.retries) {
      cmd.push(`--retries=${this.config.retries}`);
    }

    // Add reporter
    cmd.push('--reporter=list');

    return cmd.join(' ');
  }

  /**
   * Parse test results from Playwright output.
   * 
   * @param {string} output - Playwright output.
   * @param {string} type   - Result type (passed, failed, skipped).
   * 
   * @returns {number} - Number of tests with the specified result.
   * 
   * @private
   * 
   * @since TBD
   */
  private parseTestResults(output: string, type: string): number {
    const patterns = {
      passed: /(\d+) passed/i,
      failed: /(\d+) failed/i,
      skipped: /(\d+) skipped/i
    };

    const pattern = patterns[type as keyof typeof patterns];
    const match = output.match(pattern);
    
    return match ? parseInt(match[1], 10) : 0;
  }
} 