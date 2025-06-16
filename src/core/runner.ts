/**
 * TestFlow Runner - Main orchestrator for running tests
 * 
 * @since TBD
 */

import chalk from 'chalk';
import ora from 'ora';
import { TestFlowConfig, TestResult } from '../index.js';
import { LandoManager } from './lando.js';
import { PluginManager } from './plugins.js';
import { PlaywrightManager } from './playwright.js';

export interface RunnerOptions {
  debug?: boolean;
}

export class TestFlowRunner {
  private config: TestFlowConfig;
  private options: RunnerOptions;
  private landoManager: LandoManager;
  private pluginManager: PluginManager;
  private playwrightManager: PlaywrightManager;

  /**
   * Initialize TestFlow runner.
   * 
   * @param {TestFlowConfig} config  - TestFlow configuration.
   * @param {RunnerOptions}  options - Runner options.
   * 
   * @since TBD
   */
  constructor(config: TestFlowConfig, options: RunnerOptions = {}) {
    this.config = config;
    this.options = options;
    
    this.landoManager = new LandoManager(config.lando);
    this.pluginManager = new PluginManager(config.plugins);
    this.playwrightManager = new PlaywrightManager(config.playwright);
  }

  /**
   * Run the complete test flow.
   * 
   * @returns {Promise<TestResult>} - Test execution results.
   * 
   * @since TBD
   */
  async run(): Promise<TestResult> {
    console.log(chalk.blue('🚀 Starting TestFlow...'));
    console.log(chalk.gray(`   PHP: ${this.config.lando.php}`));
    console.log(chalk.gray(`   MySQL: ${this.config.lando.mysql}`));
    console.log(chalk.gray(`   WordPress: ${this.config.lando.wordpress}`));
    console.log();

    let results: TestResult = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      failures: []
    };

    try {
      // Setup Lando environment
      const setupSpinner = ora('Setting up Lando environment...').start();
      await this.landoManager.setup();
      setupSpinner.succeed('Lando environment ready');

      // Install WordPress
      const wpSpinner = ora('Installing WordPress...').start();
      await this.landoManager.installWordPress(this.config.wordpress);
      wpSpinner.succeed('WordPress installed');

      // Install and activate plugins
      const pluginSpinner = ora('Installing plugins...').start();
      const pluginPaths = await this.pluginManager.resolvePluginZips();
      
      for (const pluginPath of pluginPaths) {
        await this.pluginManager.installPlugin(pluginPath);
      }
      
      pluginSpinner.succeed(`Plugins installed (${pluginPaths.length})`);
      
      // Activate plugins based on configuration
      const activationSpinner = ora('Activating plugins...').start();
      await this.pluginManager.activatePlugins();
      activationSpinner.succeed('Plugins activated');

      // Run tests
      const testSpinner = ora('Running Playwright tests...').start();
      results = await this.playwrightManager.runTests();
      
      if (results.failed > 0) {
        testSpinner.fail(`Tests completed with ${results.failed} failure(s)`);
      } else {
        testSpinner.succeed(`All tests passed (${results.passed})`);
      }

      // Display results
      this.displayResults(results);

    } catch (error) {
      console.error(chalk.red(`❌ Test execution failed: ${error}`));
      throw error;
    } finally {
      // Cleanup
      await this.cleanup();
    }

    return results;
  }

  /**
   * Display test results summary.
   * 
   * @param {TestResult} results - Test execution results.
   * 
   * @private
   * 
   * @since TBD
   */
  private displayResults(results: TestResult): void {
    console.log('\n' + chalk.blue('📊 Test Results Summary'));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.green(`✅ Passed: ${results.passed}`));
    console.log(chalk.red(`❌ Failed: ${results.failed}`));
    console.log(chalk.yellow(`⏭️  Skipped: ${results.skipped}`));
    console.log(chalk.blue(`📈 Total: ${results.total}`));
    console.log(chalk.gray(`⏱️  Duration: ${(results.duration / 1000).toFixed(2)}s`));
    
    if (results.failures.length > 0) {
      console.log('\n' + chalk.red('💥 Test Failures:'));
      console.log(chalk.gray('─'.repeat(50)));
      
      for (const failure of results.failures) {
        console.log(chalk.red(`❌ ${failure.test}`));
        console.log(chalk.gray(`   File: ${failure.file}`));
        if (failure.line) {
          console.log(chalk.gray(`   Line: ${failure.line}`));
        }
        console.log(chalk.gray(`   Error: ${failure.error}`));
        console.log();
      }
    }
    
    console.log(chalk.gray('═'.repeat(50)));
    
    if (results.failed > 0) {
      console.log(chalk.red('❌ Tests failed!'));
    } else {
      console.log(chalk.green('✅ All tests passed!'));
    }
  }

  /**
   * Get plugin manager instance for external access.
   * 
   * @returns {PluginManager} - Plugin manager instance.
   * 
   * @since TBD
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get Lando manager instance for external access.
   * 
   * @returns {LandoManager} - Lando manager instance.
   * 
   * @since TBD
   */
  getLandoManager(): LandoManager {
    return this.landoManager;
  }

  /**
   * Get Playwright manager instance for external access.
   * 
   * @returns {PlaywrightManager} - Playwright manager instance.
   * 
   * @since TBD
   */
  getPlaywrightManager(): PlaywrightManager {
    return this.playwrightManager;
  }

  /**
   * Cleanup resources and temporary files.
   * 
   * @private
   * 
   * @since TBD
   */
  private async cleanup(): Promise<void> {
    if (this.options.debug) {
      console.log(chalk.gray('Debug mode: Skipping cleanup'));
      return;
    }

    try {
      await this.pluginManager.cleanup();
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Cleanup failed: ${error}`));
    }
  }
} 