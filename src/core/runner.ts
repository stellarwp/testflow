/**
 * TestFlow Runner - Main orchestrator for running tests
 * 
 * @since TBD
 */

import chalk from 'chalk';
import ora from 'ora';
import { TestFlowConfig, TestResult, MatrixConfig } from '../index.js';
import { LandoManager } from './lando.js';
import { PluginManager } from './plugins.js';
import { PlaywrightManager } from './playwright.js';

export interface RunnerOptions {
  debug?: boolean;
  matrixIndex?: number;
  insteadOfWordPress?: boolean;
  searchReplaceFromUrl?: string;
  searchReplaceToUrl?: string;
}

export interface MatrixRunResult {
  name: string;
  result: TestResult;
  config: TestFlowConfig;
  matrixIndex: number;
  sqlFiles?: string[];
  plugins?: string[];
  environment?: string;
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
    
    // Apply CLI overrides to SQL config
    if (options.insteadOfWordPress) {
      this.config.sql = {
        ...this.config.sql,
        insteadOfWordPress: true,
        searchReplace: {
          ...this.config.sql?.searchReplace,
          enabled: true,
          fromUrl: options.searchReplaceFromUrl || this.config.sql?.searchReplace?.fromUrl,
          toUrl: options.searchReplaceToUrl || this.config.sql?.searchReplace?.toUrl || this.config.wordpress.siteUrl
        }
      };
    }
    
    this.landoManager = new LandoManager(
      this.config.lando,
      this.config.sql,
      this.config.wordpress
    );
    this.pluginManager = new PluginManager(this.config.plugins);
    this.playwrightManager = new PlaywrightManager(this.config.playwright);
  }

  /**
   * Run tests with current configuration.
   * 
   * @returns {Promise<TestResult>} - Test results.
   * 
   * @since TBD
   */
  async run(): Promise<TestResult> {
    const spinner = ora('Initializing TestFlow...').start();
    
    try {
      // Setup environment
      spinner.text = 'Setting up Lando environment...';
      await this.landoManager.setup();
      
      // Execute SQL files before plugins if configured
      if (this.config.sql && !this.config.sql.insteadOfWordPress) {
        const stage = this.config.sql.executeOrder || 'after-wordpress';
        if (stage === 'before-plugins' && this.config.sql.files) {
          await this.landoManager.executeSqlFiles('before-plugins', this.config.sql.files);
        }
      }
      
      // Setup plugins
      spinner.text = 'Setting up plugins...';
      await this.pluginManager.setup();
      
      // Execute SQL files after plugins if configured
      if (this.config.sql && !this.config.sql.insteadOfWordPress) {
        const stage = this.config.sql.executeOrder || 'after-wordpress';
        if (stage === 'after-plugins' && this.config.sql.files) {
          await this.landoManager.executeSqlFiles('after-plugins', this.config.sql.files);
        }
      }
      
      spinner.succeed('Environment setup completed');
      
      // Run tests
      const testSpinner = ora('Running Playwright tests...').start();
      const results = await this.playwrightManager.runTests();
      
      if (results.failed > 0) {
        testSpinner.fail(`Tests completed with ${results.failed} failures`);
      } else {
        testSpinner.succeed(`All ${results.passed} tests passed`);
      }
      
      return results;
      
    } catch (error) {
      spinner.fail(`TestFlow execution failed: ${error}`);
      throw error;
    }
  }

  /**
   * Run tests with matrix configuration.
   * 
   * @returns {Promise<MatrixRunResult[]>} - Matrix test results.
   * 
   * @since TBD
   */
  async runWithMatrix(): Promise<MatrixRunResult[]> {
    if (!this.config.matrix) {
      // Run single configuration if no matrix
      const result = await this.run();
      return [{
        name: 'Default Configuration',
        result,
        config: this.config,
        matrixIndex: 0
      }];
    }

    const results: MatrixRunResult[] = [];
    const matrixConfigurations = this.generateMatrixConfigurations();

    console.log(chalk.blue(`🔄 Running ${matrixConfigurations.length} matrix configurations...`));

    for (let i = 0; i < matrixConfigurations.length; i++) {
      // Skip if specific matrix index requested
      if (this.options.matrixIndex !== undefined && this.options.matrixIndex !== i) {
        continue;
      }

      const matrixConfig = matrixConfigurations[i];
      
      console.log(chalk.yellow(`\n📋 Matrix ${i + 1}/${matrixConfigurations.length}: ${matrixConfig.name}`));
      
      if (matrixConfig.sqlFiles && matrixConfig.sqlFiles.length > 0) {
        console.log(chalk.gray(`   SQL Files: ${matrixConfig.sqlFiles.join(', ')}`));
      }
      
      if (matrixConfig.plugins && matrixConfig.plugins.length > 0) {
        console.log(chalk.gray(`   Plugins: ${matrixConfig.plugins.join(', ')}`));
      }
      
      if (matrixConfig.environment) {
        console.log(chalk.gray(`   Environment: ${matrixConfig.environment}`));
      }

      try {
        // Create runner with matrix configuration
        const runner = new TestFlowRunner(matrixConfig.config, {
          ...this.options,
          insteadOfWordPress: matrixConfig.insteadOfWordPress
        });
        
        const result = await runner.run();
        
        results.push({
          name: matrixConfig.name,
          result,
          config: matrixConfig.config,
          matrixIndex: i,
          sqlFiles: matrixConfig.sqlFiles,
          plugins: matrixConfig.plugins,
          environment: matrixConfig.environment
        });
        
        // Clean up between matrix runs
        await runner.cleanup();
        
      } catch (error) {
        console.error(chalk.red(`❌ Matrix configuration ${i + 1} failed: ${error}`));
        
        results.push({
          name: matrixConfig.name,
          result: {
            passed: 0,
            failed: 1,
            skipped: 0,
            duration: 0,
            errors: [String(error)]
          },
          config: matrixConfig.config,
          matrixIndex: i,
          sqlFiles: matrixConfig.sqlFiles,
          plugins: matrixConfig.plugins,
          environment: matrixConfig.environment
        });
      }
    }

    // Print matrix summary
    this.printMatrixSummary(results);

    return results;
  }

  /**
   * Generate matrix configurations.
   * 
   * @returns {Array} - Array of matrix configurations.
   * 
   * @private
   * 
   * @since TBD
   */
  private generateMatrixConfigurations(): Array<{
    name: string;
    config: TestFlowConfig;
    sqlFiles?: string[];
    plugins?: string[];
    environment?: string;
    insteadOfWordPress?: boolean;
  }> {
    const configurations: Array<{
      name: string;
      config: TestFlowConfig;
      sqlFiles?: string[];
      plugins?: string[];
      environment?: string;
      insteadOfWordPress?: boolean;
    }> = [];

    if (!this.config.matrix) {
      return configurations;
    }

    // Handle environment-specific configurations
    if (this.config.matrix.environments) {
      for (const env of this.config.matrix.environments) {
        const config = { ...this.config };
        
        // Apply environment overrides
        if (env.php) config.lando.php = env.php;
        if (env.mysql) config.lando.mysql = env.mysql;
        if (env.wordpress) config.lando.wordpress = env.wordpress;
        
        // Apply SQL files
        if (env.sql_files) {
          config.sql = {
            ...config.sql,
            files: env.sql_files,
            insteadOfWordPress: env.insteadOfWordPress || false
          };
          
          // Apply search and replace if specified
          if (env.searchReplace) {
            config.sql.searchReplace = {
              ...config.sql.searchReplace,
              enabled: true,
              fromUrl: env.searchReplace.fromUrl,
              toUrl: env.searchReplace.toUrl || config.wordpress.siteUrl
            };
          }
        }
        
        // Apply plugins
        if (env.plugins) {
          config.plugins = {
            ...config.plugins,
            activateList: env.plugins
          };
        }

        configurations.push({
          name: env.name,
          config,
          sqlFiles: env.sql_files,
          plugins: env.plugins,
          environment: env.name,
          insteadOfWordPress: env.insteadOfWordPress
        });
      }
    }

    // Handle simple matrix combinations
    if (this.config.matrix.sql_files || this.config.matrix.plugin_combinations) {
      const sqlMatrix = this.config.matrix.sql_files || [[]];
      const pluginMatrix = this.config.matrix.plugin_combinations || [[]];

      for (let sqlIndex = 0; sqlIndex < sqlMatrix.length; sqlIndex++) {
        for (let pluginIndex = 0; pluginIndex < pluginMatrix.length; pluginIndex++) {
          const sqlFiles = sqlMatrix[sqlIndex];
          const plugins = pluginMatrix[pluginIndex];
          
          const config = { ...this.config };
          
          // Apply SQL files
          if (sqlFiles.length > 0) {
            config.sql = {
              ...config.sql,
              files: sqlFiles
            };
          }
          
          // Apply plugins
          if (plugins.length > 0) {
            config.plugins = {
              ...config.plugins,
              activateList: plugins
            };
          }

          const name = this.generateMatrixName(sqlFiles, plugins);
          
          configurations.push({
            name,
            config,
            sqlFiles: sqlFiles.length > 0 ? sqlFiles : undefined,
            plugins: plugins.length > 0 ? plugins : undefined
          });
        }
      }
    }

    return configurations;
  }

  /**
   * Generate matrix configuration name.
   * 
   * @param {string[]} sqlFiles - SQL files.
   * @param {string[]} plugins  - Plugins.
   * 
   * @returns {string} - Configuration name.
   * 
   * @private
   * 
   * @since TBD
   */
  private generateMatrixName(sqlFiles: string[], plugins: string[]): string {
    const parts: string[] = [];
    
    if (sqlFiles.length > 0) {
      parts.push(`SQL: ${sqlFiles.map(f => f.split('/').pop()).join(', ')}`);
    } else {
      parts.push('Clean Install');
    }
    
    if (plugins.length > 0) {
      parts.push(`Plugins: ${plugins.join(', ')}`);
    } else {
      parts.push('No Plugins');
    }
    
    return parts.join(' | ');
  }

  /**
   * Print matrix summary.
   * 
   * @param {MatrixRunResult[]} results - Matrix results.
   * 
   * @private
   * 
   * @since TBD
   */
  private printMatrixSummary(results: MatrixRunResult[]): void {
    console.log(chalk.blue('\n📊 Matrix Test Summary:'));
    console.log(chalk.gray('═'.repeat(80)));
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    
    for (const result of results) {
      const status = result.result.failed > 0 ? 
        chalk.red('❌ FAILED') : 
        chalk.green('✅ PASSED');
      
      console.log(`${status} ${result.name}`);
      console.log(chalk.gray(`   Passed: ${result.result.passed}, Failed: ${result.result.failed}, Skipped: ${result.result.skipped}`));
      
      if (result.result.errors && result.result.errors.length > 0) {
        console.log(chalk.red(`   Errors: ${result.result.errors.join(', ')}`));
      }
      
      totalPassed += result.result.passed;
      totalFailed += result.result.failed;
      totalSkipped += result.result.skipped;
    }
    
    console.log(chalk.gray('═'.repeat(80)));
    console.log(chalk.blue(`Total: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`));
    
    if (totalFailed > 0) {
      console.log(chalk.red(`\n❌ ${totalFailed} matrix configurations failed`));
    } else {
      console.log(chalk.green(`\n✅ All ${results.length} matrix configurations passed`));
    }
  }

  /**
   * Get Lando manager instance.
   * 
   * @returns {LandoManager} - Lando manager.
   * 
   * @since TBD
   */
  getLandoManager(): LandoManager {
    return this.landoManager;
  }

  /**
   * Clean up test environment.
   * 
   * @since TBD
   */
  async cleanup(): Promise<void> {
    try {
      await this.landoManager.stop();
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Cleanup failed: ${error}`));
    }
  }

  /**
   * Destroy test environment.
   * 
   * @since TBD
   */
  async destroy(): Promise<void> {
    try {
      await this.landoManager.destroy();
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Destroy failed: ${error}`));
    }
  }
} 