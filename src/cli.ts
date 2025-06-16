#!/usr/bin/env node

/**
 * TestFlow CLI - Command line interface for WordPress plugin testing
 * 
 * @since TBD
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { TestFlowRunner } from './core/runner.js';
import { ConfigManager } from './core/config.js';

const program = new Command();

program
  .name('testflow')
  .description('WordPress Plugin Testing Framework')
  .version('1.0.0');

program
  .command('run')
  .description('Run tests')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .option('-p, --profile <name>', 'Configuration profile to use')
  .option('--php <version>', 'PHP version override')
  .option('--mysql <version>', 'MySQL version override')  
  .option('--wordpress <version>', 'WordPress version override')
  .option('--patterns <patterns>', 'Test patterns (comma-separated)')
  .option('--zips <zips>', 'Plugin ZIP patterns (comma-separated)')
  .option('--workers <count>', 'Number of test workers', parseInt)
  .option('--retries <count>', 'Number of test retries', parseInt)
  .option('--timeout <ms>', 'Test timeout in milliseconds', parseInt)
  .option('--debug', 'Enable debug mode')
  .option('--no-activate', 'Skip plugin activation')
  .option('--activate <plugins>', 'Plugins to activate (comma-separated)')
  .option('--skip-activation <plugins>', 'Plugins to skip activation (comma-separated)')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager(options.config);
      const config = await configManager.loadConfig(options.profile);

      // Apply CLI overrides
      if (options.php) config.lando.php = options.php;
      if (options.mysql) config.lando.mysql = options.mysql;
      if (options.wordpress) config.lando.wordpress = options.wordpress;
      if (options.patterns) config.playwright.patterns = options.patterns.split(',');
      if (options.zips) config.plugins.zips = options.zips.split(',');
      if (options.workers) config.playwright.workers = options.workers;
      if (options.retries) config.playwright.retries = options.retries;
      if (options.timeout) config.playwright.timeout = options.timeout;
      
      // Plugin activation overrides
      if (options.noActivate) config.plugins.preActivate = false;
      if (options.activate) {
        config.plugins.activateList = options.activate.split(',');
      }
      if (options.skipActivation) {
        config.plugins.skipActivation = options.skipActivation.split(',');
      }

      const runner = new TestFlowRunner(config, { debug: options.debug });
      const results = await runner.run();
      
      if (results.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize configuration file')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('-m, --multi', 'Create multi-profile configuration')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager(options.config);
      await configManager.initConfig(options.force, options.multi);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate configuration file')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .option('-p, --profile <name>', 'Configuration profile to validate')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager(options.config);
      const config = await configManager.loadConfig(options.profile);
      await configManager.validateConfig(config);
      console.log(chalk.green('✅ Configuration is valid'));
    } catch (error) {
      console.error(chalk.red(`❌ Validation failed: ${error}`));
      process.exit(1);
    }
  });

program
  .command('profiles')
  .description('List available configuration profiles')
  .option('-c, --config <path>', 'Configuration file path', 'testflow.yaml')
  .action(async (options) => {
    try {
      const configManager = new ConfigManager(options.config);
      const profiles = await configManager.listProfiles();
      
      if (profiles.length === 0) {
        console.log(chalk.yellow('No profiles found in configuration'));
        return;
      }
      
      console.log(chalk.blue('Available profiles:'));
      for (const profile of profiles) {
        console.log(chalk.green(`  - ${profile}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('examples')
  .description('Show configuration examples')
  .action(() => {
    console.log(chalk.blue('TestFlow Configuration Examples:\n'));
    
    console.log(chalk.yellow('Single Configuration:'));
    console.log(`
lando:
  php: '8.1'
  mysql: '8.0'
  wordpress: 'latest'

playwright:
  testDir: 'tests/e2e'
  patterns:
    - '**/*.test.js'
    - '**/*.spec.js'
  timeout: 30000
  retries: 2
  workers: 1

plugins:
  zips:
    - 'plugins/*.zip'
  preActivate: true
  activateList:
    - 'my-specific-plugin'
  skipActivation:
    - 'problematic-plugin'

wordpress:
  adminUser: 'admin'
  adminPassword: 'password'
  adminEmail: 'admin@example.com'
  siteUrl: 'https://testflow.lndo.site'
`);
    
    console.log(chalk.yellow('\nMulti-Profile Configuration:'));
    console.log(`
default:
  lando:
    php: '8.1'
    mysql: '8.0' 
    wordpress: 'latest'
  # ... other default config

profiles:
  smoke:
    name: 'smoke'
    description: 'Quick smoke tests'
    config:
      playwright:
        patterns: ['**/*.smoke.test.js']
        timeout: 15000
        
  php74:
    name: 'php74'
    description: 'PHP 7.4 compatibility'
    config:
      lando:
        php: '7.4'
        wordpress: '6.0'
`);

    console.log(chalk.green('\nUsage:'));
    console.log('  testflow run --profile smoke');
    console.log('  testflow run --php 7.4 --wordpress 6.0');
    console.log('  testflow run --activate plugin1,plugin2');
    console.log('  testflow init --multi');
  });

program.parse(); 