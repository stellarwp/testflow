/**
 * Configuration Manager for TestFlow
 * 
 * @since TBD
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse, stringify } from 'yaml';
import { TestFlowConfig, MultiConfig } from '../index.js';
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

export interface InitOptions {
  name?: string;
  multiProfile?: boolean;
  withSql?: boolean;
  withMatrix?: boolean;
  php?: string;
  mysql?: string;
  wordpress?: string;
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
   * @param {string} configPath - Configuration file path.
   * @param {string} profile    - Profile name to load.
   * 
   * @returns {Promise<TestFlowConfig>} - Loaded configuration.
   * 
   * @since TBD
   */
  async loadConfig(configPath: string, profile?: string): Promise<TestFlowConfig> {
    if (!existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const content = readFileSync(configPath, 'utf8');
    const parsed = parse(content) as TestFlowConfig | MultiConfig;

    // Handle multi-profile configuration
    if (this.isMultiConfig(parsed)) {
      if (profile) {
        if (!parsed.profiles || !parsed.profiles[profile]) {
          throw new Error(`Profile '${profile}' not found in configuration`);
        }
        
        const profileConfig = parsed.profiles[profile];
        const baseConfig = parsed.default || this.getDefaultConfig();
        
        return this.mergeConfigs(baseConfig, profileConfig.config);
      } else {
        return parsed.default || this.getDefaultConfig();
      }
    }

    return parsed as TestFlowConfig;
  }

  /**
   * Initialize configuration file.
   * 
   * @param {InitOptions} options - Initialization options.
   * 
   * @since TBD
   */
  async initConfig(options: InitOptions = {}): Promise<void> {
    const configPath = 'testflow.yaml';
    
    if (existsSync(configPath)) {
      throw new Error('Configuration file already exists. Use --force to overwrite.');
    }

    let config: TestFlowConfig | MultiConfig;

    if (options.multiProfile) {
      config = this.createMultiProfileConfig(options);
    } else {
      config = this.createSingleConfig(options);
    }

    const yamlContent = stringify(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });

    writeFileSync(configPath, yamlContent, 'utf8');
    console.log(chalk.green(`✅ Configuration initialized: ${configPath}`));
  }

  /**
   * Create single configuration.
   * 
   * @param {InitOptions} options - Configuration options.
   * 
   * @returns {TestFlowConfig} - Single configuration.
   * 
   * @private
   * 
   * @since TBD
   */
  private createSingleConfig(options: InitOptions): TestFlowConfig {
    const config: TestFlowConfig = {
      name: options.name || 'TestFlow Project',
      description: 'WordPress Plugin Testing with TestFlow',
      lando: {
        php: options.php || '8.2',
        mysql: options.mysql || '8.0',
        wordpress: options.wordpress || '6.4'
      },
      playwright: {
        testDir: 'tests/e2e',
        patterns: ['**/*.test.js'],
        timeout: 30000,
        retries: 1,
        workers: 1
      },
      plugins: {
        zips: ['plugins/*.zip'],
        installPath: 'wp-content/plugins',
        preActivate: true
      },
      wordpress: {
        adminUser: 'admin',
        adminPassword: 'password',
        adminEmail: 'admin@example.com',
        siteUrl: 'https://testflow.lndo.site'
      }
    };

    if (options.withSql) {
      config.sql = {
        files: [
          'data/setup.sql',
          'data/test-data.sql'
        ],
        executeOrder: 'after-wordpress',
        continueOnError: false,
        insteadOfWordPress: false,
        searchReplace: {
          enabled: false,
          fromUrl: 'https://production-site.com',
          toUrl: 'https://testflow.lndo.site',
          additionalReplacements: [
            {
              from: 'production-domain.com',
              to: 'testflow.lndo.site'
            }
          ]
        }
      };
    }

    if (options.withMatrix) {
      config.matrix = {
        sql_files: [
          [], // Clean WordPress installation
          ['data/minimal.sql'], // Minimal data set
          ['data/setup.sql', 'data/users.sql'], // Standard setup
          ['data/full-dataset.sql'] // Complete data set
        ],
        plugin_combinations: [
          [], // No plugins
          ['core-plugin'], // Core plugin only
          ['core-plugin', 'extension-plugin'], // Core + extension
          ['core-plugin', 'extension-plugin', 'utility-plugin'] // All plugins
        ],
        environments: [
          {
            name: 'Clean Install',
            sql_files: [],
            plugins: ['core-plugin'],
            insteadOfWordPress: false
          },
          {
            name: 'Production Data Import',
            sql_files: ['data/production-backup.sql'],
            plugins: ['core-plugin', 'extension-plugin'],
            insteadOfWordPress: true,
            searchReplace: {
              fromUrl: 'https://production-site.com',
              toUrl: 'https://testflow.lndo.site'
            }
          },
          {
            name: 'Staging Data Import',
            sql_files: ['data/staging-backup.sql'],
            plugins: ['core-plugin'],
            insteadOfWordPress: true,
            searchReplace: {
              fromUrl: 'https://staging-site.com',
              toUrl: 'https://testflow.lndo.site'
            }
          },
          {
            name: 'Multi-site Setup',
            php: '8.1',
            mysql: '8.0',
            sql_files: ['data/multisite.sql'],
            plugins: ['core-plugin', 'multisite-plugin'],
            insteadOfWordPress: true
          }
        ]
      };
    }

    return config;
  }

  /**
   * Create multi-profile configuration.
   * 
   * @param {InitOptions} options - Configuration options.
   * 
   * @returns {MultiConfig} - Multi-profile configuration.
   * 
   * @private
   * 
   * @since TBD
   */
  private createMultiProfileConfig(options: InitOptions): MultiConfig {
    const defaultConfig = this.createSingleConfig(options);

    return {
      default: defaultConfig,
      profiles: {
        'quick': {
          name: 'quick',
          description: 'Quick smoke tests',
          config: {
            playwright: {
              testDir: 'tests/e2e',
              patterns: ['**/*.smoke.test.js'],
              timeout: 15000,
              retries: 0,
              workers: 1
            }
          }
        },
        'sql-instead-wp': {
          name: 'sql-instead-wp',
          description: 'Use SQL data instead of WordPress installation',
          config: {
            sql: {
              files: ['data/production-backup.sql'],
              insteadOfWordPress: true,
              searchReplace: {
                enabled: true,
                fromUrl: 'https://production-site.com',
                toUrl: 'https://testflow.lndo.site'
              }
            }
          }
        },
        'staging-import': {
          name: 'staging-import',
          description: 'Import staging data with URL replacement',
          config: {
            sql: {
              files: ['data/staging-backup.sql'],
              insteadOfWordPress: true,
              searchReplace: {
                enabled: true,
                fromUrl: 'https://staging-site.com',
                toUrl: 'https://testflow.lndo.site',
                additionalReplacements: [
                  {
                    from: 'staging-cdn.com',
                    to: 'testflow.lndo.site'
                  }
                ]
              }
            }
          }
        },
        'legacy': {
          name: 'legacy',
          description: 'Legacy PHP/MySQL compatibility testing',
          config: {
            lando: {
              php: '7.4',
              mysql: '5.7',
              wordpress: '6.0'
            },
            sql: {
              files: ['data/legacy-data.sql'],
              executeOrder: 'after-wordpress'
            }
          }
        },
        'performance': {
          name: 'performance',
          description: 'Performance testing with large dataset',
          config: {
            sql: {
              files: ['data/large-dataset.sql'],
              executeOrder: 'after-wordpress'
            },
            playwright: {
              testDir: 'tests/performance',
              patterns: ['**/*.perf.test.js'],
              timeout: 60000,
              retries: 0,
              workers: 1
            }
          }
        }
      }
    };
  }

  /**
   * Get default configuration.
   * 
   * @returns {TestFlowConfig} - Default configuration.
   * 
   * @private
   * 
   * @since TBD
   */
  private getDefaultConfig(): TestFlowConfig {
    return {
      lando: {
        php: '8.2',
        mysql: '8.0',
        wordpress: '6.4'
      },
      playwright: {
        testDir: 'tests/e2e',
        patterns: ['**/*.test.js'],
        timeout: 30000,
        retries: 1,
        workers: 1
      },
      plugins: {
        zips: ['plugins/*.zip'],
        installPath: 'wp-content/plugins',
        preActivate: true
      },
      wordpress: {
        adminUser: 'admin',
        adminPassword: 'password',
        adminEmail: 'admin@example.com',
        siteUrl: 'https://testflow.lndo.site'
      }
    };
  }

  /**
   * Check if configuration is multi-profile.
   * 
   * @param {any} config - Configuration object.
   * 
   * @returns {boolean} - True if multi-profile configuration.
   * 
   * @private
   * 
   * @since TBD
   */
  private isMultiConfig(config: any): config is MultiConfig {
    return config.profiles !== undefined || config.default !== undefined;
  }

  /**
   * Merge configurations.
   * 
   * @param {TestFlowConfig}         base     - Base configuration.
   * @param {Partial<TestFlowConfig>} override - Override configuration.
   * 
   * @returns {TestFlowConfig} - Merged configuration.
   * 
   * @private
   * 
   * @since TBD
   */
  private mergeConfigs(base: TestFlowConfig, override: Partial<TestFlowConfig>): TestFlowConfig {
    return {
      ...base,
      ...override,
      lando: { ...base.lando, ...override.lando },
      playwright: { ...base.playwright, ...override.playwright },
      plugins: { ...base.plugins, ...override.plugins },
      wordpress: { ...base.wordpress, ...override.wordpress },
      sql: override.sql ? { ...base.sql, ...override.sql } : base.sql,
      matrix: override.matrix ? { ...base.matrix, ...override.matrix } : base.matrix
    };
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