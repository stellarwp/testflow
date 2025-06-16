/**
 * Configuration Manager for TestFlow
 * 
 * @since TBD
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse, stringify } from 'yaml';
import { TestFlowConfig } from '../index.js';
import chalk from 'chalk';

export interface ConfigProfile {
  name: string;
  description?: string;
  extends?: string;
  config: Partial<TestFlowConfig>;
}

export interface MultiConfig {
  default?: TestFlowConfig;
  profiles?: { [key: string]: ConfigProfile };
}

export class ConfigManager {
  private configPath: string;

  /**
   * Initialize configuration manager.
   * 
   * @param {string} configPath - Path to configuration file.
   * 
   * @since TBD
   */
  constructor(configPath: string = 'testflow.yaml') {
    this.configPath = configPath;
  }

  /**
   * Load configuration from file.
   * 
   * @param {string} profile - Configuration profile to load.
   * 
   * @returns {Promise<TestFlowConfig>} - Parsed configuration.
   * 
   * @since TBD
   */
  async loadConfig(profile?: string): Promise<TestFlowConfig> {
    if (!existsSync(this.configPath)) {
      throw new Error(`Configuration file not found: ${this.configPath}`);
    }

    try {
      const content = readFileSync(this.configPath, 'utf8');
      const rawConfig = parse(content);
      
      let config: TestFlowConfig;
      
      // Check if this is a multi-config file
      if (rawConfig.profiles || rawConfig.default) {
        config = await this.loadMultiConfig(rawConfig as MultiConfig, profile);
      } else {
        config = rawConfig as TestFlowConfig;
      }
      
      // Set defaults
      config.playwright.timeout = config.playwright.timeout || 30000;
      config.playwright.retries = config.playwright.retries || 2;
      config.playwright.workers = config.playwright.workers || 1;
      config.playwright.patterns = config.playwright.patterns || ['**/*.test.js', '**/*.spec.js'];
      
      config.plugins.installPath = config.plugins.installPath || '/wp-content/plugins/';
      config.plugins.preActivate = config.plugins.preActivate !== false;
      config.plugins.activateList = config.plugins.activateList || [];
      config.plugins.skipActivation = config.plugins.skipActivation || [];
      
      config.wordpress.adminUser = config.wordpress.adminUser || 'admin';
      config.wordpress.adminPassword = config.wordpress.adminPassword || 'password';
      config.wordpress.adminEmail = config.wordpress.adminEmail || 'admin@example.com';
      config.wordpress.siteUrl = config.wordpress.siteUrl || 'https://testflow.lndo.site';
      
      return config;
    } catch (error) {
      throw new Error(`Failed to parse configuration: ${error}`);
    }
  }

  /**
   * Load configuration from multi-config file.
   * 
   * @param {MultiConfig} multiConfig - Multi-configuration object.
   * @param {string}      profile     - Profile to load.
   * 
   * @returns {Promise<TestFlowConfig>} - Resolved configuration.
   * 
   * @private
   * 
   * @since TBD
   */
  private async loadMultiConfig(multiConfig: MultiConfig, profile?: string): Promise<TestFlowConfig> {
    let baseConfig: TestFlowConfig;
    
    if (profile && multiConfig.profiles && multiConfig.profiles[profile]) {
      const profileConfig = multiConfig.profiles[profile];
      
      // Start with default config if available
      baseConfig = multiConfig.default ? { ...multiConfig.default } : {} as TestFlowConfig;
      
      // Handle extends
      if (profileConfig.extends && multiConfig.profiles[profileConfig.extends]) {
        const extendedConfig = multiConfig.profiles[profileConfig.extends];
        baseConfig = this.mergeConfigs(baseConfig, extendedConfig.config);
      }
      
      // Apply profile config
      baseConfig = this.mergeConfigs(baseConfig, profileConfig.config);
      
      console.log(chalk.blue(`📋 Using profile: ${profile}`));
      if (profileConfig.description) {
        console.log(chalk.gray(`   ${profileConfig.description}`));
      }
      
    } else if (multiConfig.default) {
      baseConfig = multiConfig.default;
      console.log(chalk.blue('📋 Using default configuration'));
    } else {
      throw new Error(`Profile '${profile}' not found and no default configuration available`);
    }
    
    return baseConfig;
  }

  /**
   * Merge two configuration objects.
   * 
   * @param {any} base   - Base configuration.
   * @param {any} extend - Configuration to merge.
   * 
   * @returns {any} - Merged configuration.
   * 
   * @private
   * 
   * @since TBD
   */
  private mergeConfigs(base: any, extend: any): any {
    const result = { ...base };
    
    for (const [key, value] of Object.entries(extend)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.mergeConfigs(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * List available profiles.
   * 
   * @returns {Promise<string[]>} - Array of profile names.
   * 
   * @since TBD
   */
  async listProfiles(): Promise<string[]> {
    if (!existsSync(this.configPath)) {
      return [];
    }

    try {
      const content = readFileSync(this.configPath, 'utf8');
      const rawConfig = parse(content);
      
      if (rawConfig.profiles) {
        return Object.keys(rawConfig.profiles);
      }
      
      return [];
    } catch (error) {
      console.warn(chalk.yellow(`Failed to list profiles: ${error}`));
      return [];
    }
  }

  /**
   * Initialize default configuration file.
   * 
   * @param {boolean} force      - Whether to overwrite existing file.
   * @param {boolean} multiConfig - Whether to create multi-config format.
   * 
   * @since TBD
   */
  async initConfig(force: boolean = false, multiConfig: boolean = false): Promise<void> {
    if (existsSync(this.configPath) && !force) {
      throw new Error(`Configuration file already exists: ${this.configPath}. Use --force to overwrite.`);
    }

    let configContent: string;
    
    if (multiConfig) {
      configContent = this.generateMultiConfig();
    } else {
      configContent = this.generateSingleConfig();
    }

    try {
      writeFileSync(this.configPath, configContent, 'utf8');
      console.log(chalk.green(`✅ Configuration file created: ${this.configPath}`));
    } catch (error) {
      throw new Error(`Failed to create configuration file: ${error}`);
    }
  }

  /**
   * Generate single configuration format.
   * 
   * @returns {string} - YAML configuration content.
   * 
   * @private
   * 
   * @since TBD
   */
  private generateSingleConfig(): string {
    const defaultConfig: TestFlowConfig = {
      lando: {
        php: '8.1',
        mysql: '8.0',
        wordpress: 'latest'
      },
      playwright: {
        testDir: 'tests/e2e',
        patterns: ['**/*.test.js', '**/*.spec.js'],
        timeout: 30000,
        retries: 2,
        workers: 1
      },
      plugins: {
        zips: ['plugins/*.zip'],
        installPath: '/wp-content/plugins/',
        preActivate: true,
        activateList: [],
        skipActivation: []
      },
      wordpress: {
        adminUser: 'admin',
        adminPassword: 'password',
        adminEmail: 'admin@example.com',
        siteUrl: 'https://testflow.lndo.site'
      }
    };

    return stringify(defaultConfig, { indent: 2, lineWidth: 80 });
  }

  /**
   * Generate multi-configuration format.
   * 
   * @returns {string} - YAML configuration content.
   * 
   * @private
   * 
   * @since TBD
   */
  private generateMultiConfig(): string {
    const multiConfig: MultiConfig = {
      default: {
        lando: {
          php: '8.1',
          mysql: '8.0',
          wordpress: 'latest'
        },
        playwright: {
          testDir: 'tests/e2e',
          patterns: ['**/*.test.js', '**/*.spec.js'],
          timeout: 30000,
          retries: 2,
          workers: 1
        },
        plugins: {
          zips: ['plugins/*.zip'],
          installPath: '/wp-content/plugins/',
          preActivate: true
        },
        wordpress: {
          adminUser: 'admin',
          adminPassword: 'password',
          adminEmail: 'admin@example.com',
          siteUrl: 'https://testflow.lndo.site'
        }
      },
      profiles: {
        'smoke': {
          name: 'smoke',
          description: 'Quick smoke tests',
          config: {
            playwright: {
              patterns: ['**/*.smoke.test.js'],
              workers: 2,
              timeout: 15000
            }
          }
        },
        'integration': {
          name: 'integration',
          description: 'Full integration tests',
          config: {
            playwright: {
              patterns: ['**/*.integration.test.js'],
              timeout: 60000,
              retries: 3
            }
          }
        },
        'php74': {
          name: 'php74',
          description: 'PHP 7.4 compatibility tests',
          config: {
            lando: {
              php: '7.4',
              wordpress: '6.0'
            }
          }
        },
        'multisite': {
          name: 'multisite',
          description: 'WordPress Multisite tests',
          extends: 'default',
          config: {
            lando: {
              wordpress: 'latest'
            },
            wordpress: {
              siteUrl: 'https://multisite.lndo.site'
            },
            plugins: {
              activateList: ['my-plugin']
            }
          }
        }
      }
    };

    return stringify(multiConfig, { indent: 2, lineWidth: 80 });
  }

  /**
   * Validate configuration structure.
   * 
   * @param {TestFlowConfig} config - Configuration to validate.
   * 
   * @since TBD
   */
  async validateConfig(config: TestFlowConfig): Promise<void> {
    const errors: string[] = [];

    // Validate required fields
    if (!config.lando) {
      errors.push('Missing lando configuration');
    } else {
      if (!config.lando.php) errors.push('lando.php is required');
      if (!config.lando.mysql) errors.push('lando.mysql is required');
      if (!config.lando.wordpress) errors.push('lando.wordpress is required');
    }

    if (!config.playwright) {
      errors.push('Missing playwright configuration');
    } else {
      if (!config.playwright.testDir) errors.push('playwright.testDir is required');
    }

    if (!config.plugins) {
      errors.push('Missing plugins configuration');
    } else {
      if (!config.plugins.zips || config.plugins.zips.length === 0) {
        errors.push('plugins.zips must contain at least one ZIP file pattern');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
  }
} 