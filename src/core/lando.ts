/**
 * Lando Manager - Handles Lando environment setup and management
 * 
 * @since TBD
 */

import { writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { TestFlowConfig } from '../index.js';
import chalk from 'chalk';

export interface LandoConfig {
  php: string;
  mysql: string;
  wordpress: string;
  plugins?: string[];
  themes?: string[];
}

export interface WordPressConfig {
  adminUser?: string;
  adminPassword?: string;
  adminEmail?: string;
  siteUrl?: string;
}

export class LandoManager {
  private config: LandoConfig;
  private landoFile: string = '.lando.yml';

  /**
   * Initialize Lando manager.
   * 
   * @param {LandoConfig} config - Lando configuration.
   * 
   * @since TBD
   */
  constructor(config: LandoConfig) {
    this.config = config;
  }

  /**
   * Generate Lando configuration file.
   * 
   * @since TBD
   */
  async generateLandoFile(): Promise<void> {
    const landoConfig = {
      name: 'testflow',
      recipe: 'wordpress',
      config: {
        php: this.config.php,
        database: 'mysql:' + this.config.mysql,
        wordpress: this.config.wordpress,
        via: 'nginx',
        ssl: true,
        xdebug: false
      },
      services: {
        appserver: {
          build_as_root: [
            'apt-get update',
            'apt-get install -y zip unzip wget'
          ],
          run_as_root: [
            'chown -R www-data:www-data /app'
          ]
        },
        database: {
          type: `mysql:${this.config.mysql}`,
          config: {
            database: 'wordpress'
          }
        }
      },
      tooling: {
        'wp-cli': {
          service: 'appserver',
          cmd: 'wp'
        },
        'install-plugin': {
          service: 'appserver',
          cmd: 'wp plugin install --activate'
        },
        'activate-plugin': {
          service: 'appserver',
          cmd: 'wp plugin activate'
        }
      },
      events: {
        'post-start': [
          'appserver: chmod -R 755 /app/wp-content',
          'appserver: chown -R www-data:www-data /app/wp-content'
        ]
      }
    };

    const yamlContent = this.objectToYaml(landoConfig);
    writeFileSync(this.landoFile, yamlContent, 'utf8');
  }

  /**
   * Start Lando environment.
   * 
   * @since TBD
   */
  async start(): Promise<void> {
    try {
      execSync('lando start', { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Failed to start Lando: ${error}`);
    }
  }

  /**
   * Stop Lando environment.
   * 
   * @since TBD
   */
  async stop(): Promise<void> {
    try {
      execSync('lando stop', { stdio: 'pipe' });
    } catch (error) {
      // Non-critical error
      console.warn(chalk.yellow('Warning: Failed to stop Lando'), error);
    }
  }

  /**
   * Install and configure WordPress.
   * 
   * @param {WordPressConfig} wpConfig - WordPress configuration.
   * 
   * @since TBD
   */
  async installWordPress(wpConfig: WordPressConfig): Promise<void> {
    const {
      adminUser = 'admin',
      adminPassword = 'password',
      adminEmail = 'admin@example.com',
      siteUrl = 'https://testflow.lndo.site'
    } = wpConfig;

    try {
      // Check if WordPress is already installed
      try {
        execSync('lando wp core is-installed', { stdio: 'pipe' });
        console.log(chalk.blue('WordPress already installed, skipping installation'));
        return;
      } catch {
        // WordPress not installed, proceed with installation
      }

      // Install WordPress
      const installCmd = [
        'lando wp core install',
        `--url="${siteUrl}"`,
        `--title="TestFlow WordPress"`,
        `--admin_user="${adminUser}"`,
        `--admin_password="${adminPassword}"`,
        `--admin_email="${adminEmail}"`,
        '--skip-email'
      ].join(' ');

      execSync(installCmd, { stdio: 'pipe' });

      // Set up additional WordPress configuration
      execSync('lando wp rewrite structure "/%postname%/"', { stdio: 'pipe' });
      execSync('lando wp option update blog_public 0', { stdio: 'pipe' }); // Discourage search engines

    } catch (error) {
      throw new Error(`Failed to install WordPress: ${error}`);
    }
  }

  /**
   * Execute WP-CLI command.
   * 
   * @param {string} command - WP-CLI command to execute.
   * 
   * @returns {string} - Command output.
   * 
   * @since TBD
   */
  async executeWpCli(command: string): Promise<string> {
    try {
      const output = execSync(`lando wp ${command}`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return output.trim();
    } catch (error) {
      throw new Error(`WP-CLI command failed: ${command}\n${error}`);
    }
  }

  /**
   * Get site URL from Lando.
   * 
   * @returns {string} - Site URL.
   * 
   * @since TBD
   */
  async getSiteUrl(): Promise<string> {
    try {
      const output = execSync('lando info --format json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const info = JSON.parse(output);
      const appserver = info.find((service: any) => service.service === 'appserver');
      
      if (!appserver || !appserver.urls || appserver.urls.length === 0) {
        throw new Error('No URLs found in Lando info');
      }
      
      return appserver.urls[0];
    } catch (error) {
      throw new Error(`Failed to get site URL: ${error}`);
    }
  }

  /**
   * Convert object to YAML string.
   * 
   * @param {any} obj - Object to convert.
   * 
   * @returns {string} - YAML string.
   * 
   * @private
   * 
   * @since TBD
   */
  private objectToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.objectToYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`;
            yaml += this.objectToYaml(item, indent + 2);
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        }
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }
} 