#!/usr/bin/env node

/**
 * TestFlow CLI - Command Line Interface
 * 
 * @since TBD
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { TestFlowRunner } from './core/runner.js';
import { ConfigManager } from './core/config.js';
import { LandoManager } from './core/lando.js';
import { TestFlowConfig } from './index.js';
import path from 'path';

const program = new Command();

// CLI version
program
  .name('testflow')
  .description('WordPress Plugin Testing Framework with Lando and Playwright')
  .version('1.0.0');

// Main run command
program
  .command('run')
  .description('Run TestFlow tests')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .option('-p, --profile <name>', 'Configuration profile to use')
  .option('--debug', 'Enable debug mode')
  .option('--matrix', 'Run matrix tests (all combinations)')
  .option('--matrix-index <index>', 'Run specific matrix configuration (0-based index)', parseInt)
  .option('--sql-files <files>', 'Comma-separated list of SQL files to execute')
  .option('--sql-stage <stage>', 'SQL execution stage', 'after-wordpress')
  .option('--sql-continue-on-error', 'Continue execution if SQL files fail')
  .option('--instead-of-wordpress', 'Use SQL files instead of WordPress installation')
  .option('--search-replace-from <url>', 'URL to replace from SQL')
  .option('--search-replace-to <url>', 'URL to replace to')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config, options.profile);
      
      // Apply CLI overrides
      if (options.sqlFiles) {
        config.sql = {
          ...config.sql,
          files: options.sqlFiles.split(',').map((f: string) => f.trim())
        };
      }
      
      if (options.sqlStage) {
        config.sql = {
          ...config.sql,
          executeOrder: options.sqlStage as any
        };
      }
      
      if (options.sqlContinueOnError) {
        config.sql = {
          ...config.sql,
          continueOnError: true
        };
      }
      
      const runnerOptions = {
        debug: options.debug,
        matrixIndex: options.matrixIndex,
        insteadOfWordPress: options.insteadOfWordpress,
        searchReplaceFromUrl: options.searchReplaceFrom,
        searchReplaceToUrl: options.searchReplaceTo
      };
      
      const runner = new TestFlowRunner(config, runnerOptions);
      
      if (options.matrix || config.matrix) {
        await runner.runWithMatrix();
      } else {
        await runner.run();
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Matrix commands
const matrixCmd = program
  .command('matrix')
  .description('Matrix testing commands');

matrixCmd
  .command('list')
  .description('List available matrix configurations')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .option('-p, --profile <name>', 'Configuration profile to use')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config, options.profile);
      
      if (!config.matrix) {
        console.log(chalk.yellow('⚠️  No matrix configuration found'));
        return;
      }
      
      console.log(chalk.blue('📋 Available Matrix Configurations:'));
      console.log(chalk.gray('═'.repeat(60)));
      
      // Show SQL files matrix
      if (config.matrix.sql_files) {
        console.log(chalk.green('\n🗄️  SQL Files Matrix:'));
        config.matrix.sql_files.forEach((files, index) => {
          console.log(chalk.gray(`   ${index}: ${files.join(', ')}`));
        });
      }
      
      // Show plugin combinations matrix
      if (config.matrix.plugin_combinations) {
        console.log(chalk.green('\n🔌 Plugin Combinations Matrix:'));
        config.matrix.plugin_combinations.forEach((plugins, index) => {
          console.log(chalk.gray(`   ${index}: ${plugins.join(', ')}`));
        });
      }
      
      // Show environments matrix
      if (config.matrix.environments) {
        console.log(chalk.green('\n🌍 Environments Matrix:'));
        config.matrix.environments.forEach((env, index) => {
          console.log(chalk.gray(`   ${index}: ${env.name}`));
          if (env.sql_files) {
            console.log(chalk.gray(`      SQL: ${env.sql_files.join(', ')}`));
          }
          if (env.plugins) {
            console.log(chalk.gray(`      Plugins: ${env.plugins.join(', ')}`));
          }
          if (env.insteadOfWordPress) {
            console.log(chalk.gray(`      Instead of WordPress: ${env.insteadOfWordPress}`));
          }
        });
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

// SQL commands
const sqlCmd = program
  .command('sql')
  .description('SQL file management commands');

sqlCmd
  .command('execute <files...>')
  .description('Execute SQL files directly')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .option('-p, --profile <name>', 'Configuration profile to use')
  .option('--continue-on-error', 'Continue execution if SQL files fail')
  .option('--instead-of-wordpress', 'Use SQL files instead of WordPress installation')
  .option('--search-replace-from <url>', 'URL to replace from SQL')
  .option('--search-replace-to <url>', 'URL to replace to')
  .action(async (files, options) => {
    try {
      const config = await loadConfig(options.config, options.profile);
      
      // Setup SQL configuration
      config.sql = {
        ...config.sql,
        files: files,
        continueOnError: options.continueOnError,
        insteadOfWordPress: options.insteadOfWordpress,
        searchReplace: {
          enabled: !!(options.searchReplaceFrom || options.insteadOfWordpress),
          fromUrl: options.searchReplaceFrom,
          toUrl: options.searchReplaceTo || config.wordpress.siteUrl
        }
      };
      
      const landoManager = new LandoManager(
        config.lando,
        config.sql,
        config.wordpress
      );
      
      console.log(chalk.blue('🚀 Setting up Lando environment...'));
      await landoManager.setup();
      
      if (options.insteadOfWordpress) {
        console.log(chalk.green('✅ WordPress setup from SQL completed'));
      } else {
        console.log(chalk.blue('📄 Executing SQL files...'));
        await landoManager.executeSqlFiles('manual-execution', files);
        console.log(chalk.green('✅ SQL files executed'));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize TestFlow configuration')
  .option('--name <name>', 'Project name')
  .option('--multi-profile', 'Generate multi-profile configuration')
  .option('--with-sql', 'Include SQL configuration examples')
  .option('--with-matrix', 'Include matrix testing configuration')
  .option('--php <version>', 'PHP version', '8.2')
  .option('--mysql <version>', 'MySQL version', '8.0')
  .option('--wordpress <version>', 'WordPress version', '6.4')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager();
      
      await configManager.initConfig({
        name: options.name,
        multiProfile: options.multiProfile,
        withSql: options.withSql,
        withMatrix: options.withMatrix,
        php: options.php,
        mysql: options.mysql,
        wordpress: options.wordpress
      });
      
      console.log(chalk.green('✅ TestFlow configuration initialized'));
      
      if (options.withSql || options.withMatrix) {
        console.log(chalk.blue('\n📖 Next steps:'));
        if (options.withSql) {
          console.log(chalk.gray('   • Add your SQL files to the sql.files array'));
          console.log(chalk.gray('   • Configure SQL execution stage and error handling'));
          if (options.withMatrix) {
            console.log(chalk.gray('   • Set up matrix combinations for different SQL states'));
          }
        }
        console.log(chalk.gray('   • Run: testflow run --matrix (to test all combinations)'));
        console.log(chalk.gray('   • Run: testflow matrix list (to see available configurations)'));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Lando commands
const landoCmd = program
  .command('lando')
  .description('Lando environment management');

landoCmd
  .command('start')
  .description('Start Lando environment')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .option('-p, --profile <name>', 'Configuration profile to use')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config, options.profile);
      const landoManager = new LandoManager(config.lando, config.sql, config.wordpress);
      await landoManager.setup();
      console.log(chalk.green('✅ Lando environment started'));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

landoCmd
  .command('stop')
  .description('Stop Lando environment')
  .action(async () => {
    try {
      const config = await loadConfig('testflow.yaml');
      const landoManager = new LandoManager(config.lando, config.sql, config.wordpress);
      await landoManager.stop();
      console.log(chalk.green('✅ Lando environment stopped'));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

landoCmd
  .command('destroy')
  .description('Destroy Lando environment')
  .action(async () => {
    try {
      const config = await loadConfig('testflow.yaml');
      const landoManager = new LandoManager(config.lando, config.sql, config.wordpress);
      await landoManager.destroy();
      console.log(chalk.green('✅ Lando environment destroyed'));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show TestFlow status and configuration')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .option('-p, --profile <name>', 'Configuration profile to use')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config, options.profile);
      
      console.log(chalk.blue('📊 TestFlow Configuration Status'));
      console.log(chalk.gray('═'.repeat(50)));
      
      console.log(chalk.green('🔧 Environment:'));
      console.log(chalk.gray(`   PHP: ${config.lando.php}`));
      console.log(chalk.gray(`   MySQL: ${config.lando.mysql}`));
      console.log(chalk.gray(`   WordPress: ${config.lando.wordpress}`));
      
      console.log(chalk.green('\n🔌 Plugins:'));
      console.log(chalk.gray(`   ZIP files: ${config.plugins.zips.length}`));
      console.log(chalk.gray(`   Install path: ${config.plugins.installPath}`));
      
      if (config.sql) {
        console.log(chalk.green('\n🗄️  SQL Configuration:'));
        if (config.sql.files) {
          console.log(chalk.gray(`   Files: ${config.sql.files.length}`));
          config.sql.files.forEach(file => {
            const exists = existsSync(file);
            const status = exists ? chalk.green('✅') : chalk.red('❌');
            console.log(chalk.gray(`     ${status} ${file}`));
          });
        }
        console.log(chalk.gray(`   Execute order: ${config.sql.executeOrder || 'after-wordpress'}`));
        console.log(chalk.gray(`   Continue on error: ${config.sql.continueOnError || false}`));
        console.log(chalk.gray(`   Instead of WordPress: ${config.sql.insteadOfWordPress || false}`));
        
        if (config.sql.searchReplace) {
          console.log(chalk.gray(`   Search & Replace: ${config.sql.searchReplace.enabled || false}`));
          if (config.sql.searchReplace.fromUrl) {
            console.log(chalk.gray(`     From: ${config.sql.searchReplace.fromUrl}`));
          }
          if (config.sql.searchReplace.toUrl) {
            console.log(chalk.gray(`     To: ${config.sql.searchReplace.toUrl}`));
          }
        }
      }
      
      if (config.matrix) {
        console.log(chalk.green('\n📋 Matrix Configuration:'));
        if (config.matrix.sql_files) {
          console.log(chalk.gray(`   SQL file combinations: ${config.matrix.sql_files.length}`));
        }
        if (config.matrix.plugin_combinations) {
          console.log(chalk.gray(`   Plugin combinations: ${config.matrix.plugin_combinations.length}`));
        }
        if (config.matrix.environments) {
          console.log(chalk.gray(`   Environment configurations: ${config.matrix.environments.length}`));
        }
      }
      
      console.log(chalk.green('\n🎭 Playwright:'));
      console.log(chalk.gray(`   Test directory: ${config.playwright.testDir}`));
      console.log(chalk.gray(`   Test patterns: ${config.playwright.patterns.join(', ')}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Load configuration file.
 * 
 * @param {string} configPath - Configuration file path.
 * @param {string} profile    - Configuration profile name.
 * 
 * @returns {Promise<TestFlowConfig>} - Loaded configuration.
 * 
 * @since TBD
 */
async function loadConfig(configPath: string, profile?: string): Promise<TestFlowConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  const configManager = new ConfigManager();
  return await configManager.loadConfig(configPath, profile);
}

// Help examples
program.addHelpText('after', `

Examples:
  $ testflow init                                    Initialize basic configuration
  $ testflow init --with-sql --with-matrix          Initialize with SQL matrix support
  $ testflow run                                     Run tests with default configuration
  $ testflow run --matrix                            Run all matrix combinations
  $ testflow run --matrix-index 0                   Run specific matrix configuration
  $ testflow run --sql-files "data.sql,users.sql"   Run with specific SQL files
  $ testflow run --instead-of-wordpress \\
    --sql-files "full-site.sql" \\
    --search-replace-from "https://old-site.com"     Use SQL instead of WordPress install
  $ testflow matrix list                             List available matrix configurations
  $ testflow sql execute data.sql users.sql         Execute SQL files directly
  $ testflow sql execute full-site.sql \\
    --instead-of-wordpress \\
    --search-replace-from "https://old-site.com"     Replace WordPress with SQL data
  $ testflow status                                  Show configuration status
  $ testflow lando start                             Start Lando environment only

SQL Matrix Testing:
  TestFlow supports running tests with different SQL database states:
  
  • Use --sql-files to specify SQL files for database setup
  • Use --instead-of-wordpress to replace WordPress installation with SQL data
  • Use --search-replace-from/to for URL replacement in SQL data
  • Configure matrix testing in testflow.yaml for automated combinations
  • SQL files can be executed at different stages: before/after WordPress/plugins

For more information, visit: https://github.com/your-org/testflow
`);

// Parse CLI arguments
program.parse(); 