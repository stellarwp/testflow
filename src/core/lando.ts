/**
 * Lando Manager - Handles Lando environment setup and management
 * 
 * @since TBD
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { TestFlowConfig, SqlConfig } from '../index.js';
import chalk from 'chalk';
import path from 'path';

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
  private sqlConfig?: SqlConfig;
  private wordpressConfig?: WordPressConfig;
  private landoFile: string = '.lando.yml';

  /**
   * Initialize Lando manager.
   * 
   * @param {LandoConfig} config - Lando configuration.
   * @param {SqlConfig} sqlConfig - SQL configuration.
   * @param {WordPressConfig} wordpressConfig - WordPress configuration.
   * 
   * @since TBD
   */
  constructor(config: LandoConfig, sqlConfig?: SqlConfig, wordpressConfig?: WordPressConfig) {
    this.config = config;
    this.sqlConfig = sqlConfig;
    this.wordpressConfig = wordpressConfig;
  }

  /**
   * Setup Lando environment.
   * 
   * @since TBD
   */
  async setup(): Promise<void> {
    console.log(chalk.blue('🚀 Setting up Lando environment...'));
    
    // Generate Lando configuration
    this.generateLandoFile();
    
    // Start Lando
    await this.startLando();
    
    // Setup WordPress
    if (this.sqlConfig?.insteadOfWordPress) {
      await this.setupWordPressFromSql();
    } else {
      await this.setupWordPress();
    }
    
    console.log(chalk.green('✅ Lando environment ready'));
  }

  /**
   * Setup WordPress using SQL files instead of normal installation.
   * 
   * @since TBD
   */
  private async setupWordPressFromSql(): Promise<void> {
    console.log(chalk.blue('📁 Setting up WordPress from SQL files...'));
    
    if (!this.sqlConfig?.files || this.sqlConfig.files.length === 0) {
      throw new Error('No SQL files specified for WordPress setup');
    }

    try {
      // Create WordPress core files structure (without installation)
      console.log(chalk.gray('Creating WordPress file structure...'));
      execSync('lando wp core download --skip-content', { stdio: 'inherit' });
      
      // Create wp-config.php
      console.log(chalk.gray('Creating wp-config.php...'));
      execSync('lando wp config create --dbname=wordpress --dbuser=wordpress --dbpass=wordpress --dbhost=database', { stdio: 'inherit' });
      
      // Execute SQL files to setup database
      await this.executeSqlFiles('instead-of-wordpress', this.sqlConfig.files);
      
      // Perform URL search and replace
      await this.performUrlSearchReplace();
      
      // Update admin user credentials if specified
      if (this.wordpressConfig?.adminUser && this.wordpressConfig?.adminPassword) {
        await this.updateAdminCredentials();
      }
      
      console.log(chalk.green('✅ WordPress setup from SQL completed'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to setup WordPress from SQL: ${error}`));
      if (!this.sqlConfig?.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Perform URL search and replace using WP-CLI.
   * 
   * @since TBD
   */
  private async performUrlSearchReplace(): Promise<void> {
    if (!this.sqlConfig?.searchReplace?.enabled && !this.sqlConfig?.insteadOfWordPress) {
      return;
    }

    console.log(chalk.blue('🔄 Performing URL search and replace...'));

    try {
      const siteUrl = this.wordpressConfig?.siteUrl || 'https://testflow.lndo.site';
      
      // Default search and replace
      if (this.sqlConfig?.searchReplace?.fromUrl) {
        const fromUrl = this.sqlConfig.searchReplace.fromUrl;
        const toUrl = this.sqlConfig.searchReplace.toUrl || siteUrl;
        
        console.log(chalk.gray(`Replacing ${fromUrl} with ${toUrl}...`));
        execSync(`lando wp search-replace "${fromUrl}" "${toUrl}" --all-tables --dry-run=false`, { stdio: 'inherit' });
      } else if (this.sqlConfig?.insteadOfWordPress) {
        // Auto-detect URLs from database and replace with site URL
        console.log(chalk.gray('Auto-detecting URLs for replacement...'));
        
        // Get current site URL from database
        const currentUrlCmd = 'lando wp option get siteurl 2>/dev/null || echo ""';
        let currentUrl = '';
        try {
          currentUrl = execSync(currentUrlCmd, { encoding: 'utf8' }).trim();
        } catch (error) {
          console.log(chalk.yellow('Could not detect current site URL, skipping auto-replace'));
        }
        
        if (currentUrl && currentUrl !== siteUrl) {
          console.log(chalk.gray(`Auto-replacing ${currentUrl} with ${siteUrl}...`));
          execSync(`lando wp search-replace "${currentUrl}" "${siteUrl}" --all-tables --dry-run=false`, { stdio: 'inherit' });
        }
        
        // Also check home URL
        const currentHomeCmd = 'lando wp option get home 2>/dev/null || echo ""';
        try {
          const currentHome = execSync(currentHomeCmd, { encoding: 'utf8' }).trim();
          if (currentHome && currentHome !== siteUrl && currentHome !== currentUrl) {
            console.log(chalk.gray(`Auto-replacing home URL ${currentHome} with ${siteUrl}...`));
            execSync(`lando wp search-replace "${currentHome}" "${siteUrl}" --all-tables --dry-run=false`, { stdio: 'inherit' });
          }
        } catch (error) {
          // Ignore home URL errors
        }
      }
      
      // Additional custom replacements
      if (this.sqlConfig?.searchReplace?.additionalReplacements) {
        for (const replacement of this.sqlConfig.searchReplace.additionalReplacements) {
          console.log(chalk.gray(`Replacing ${replacement.from} with ${replacement.to}...`));
          execSync(`lando wp search-replace "${replacement.from}" "${replacement.to}" --all-tables --dry-run=false`, { stdio: 'inherit' });
        }
      }
      
      // Update site and home URLs in wp_options
      execSync(`lando wp option update siteurl "${siteUrl}"`, { stdio: 'inherit' });
      execSync(`lando wp option update home "${siteUrl}"`, { stdio: 'inherit' });
      
      // Flush rewrite rules
      execSync('lando wp rewrite flush', { stdio: 'inherit' });
      
      console.log(chalk.green('✅ URL search and replace completed'));
      
    } catch (error) {
      console.error(chalk.red(`❌ URL search and replace failed: ${error}`));
      if (!this.sqlConfig?.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Update admin user credentials.
   * 
   * @since TBD
   */
  private async updateAdminCredentials(): Promise<void> {
    if (!this.wordpressConfig?.adminUser || !this.wordpressConfig?.adminPassword) {
      return;
    }

    console.log(chalk.blue('👤 Updating admin user credentials...'));

    try {
      const adminUser = this.wordpressConfig.adminUser;
      const adminPassword = this.wordpressConfig.adminPassword;
      const adminEmail = this.wordpressConfig.adminEmail || 'admin@example.com';

      // Try to update existing admin user
      try {
        execSync(`lando wp user update "${adminUser}" --user_pass="${adminPassword}" --user_email="${adminEmail}" 2>/dev/null`, { stdio: 'inherit' });
        console.log(chalk.gray(`Updated existing user: ${adminUser}`));
      } catch (error) {
        // If user doesn't exist, create it
        console.log(chalk.gray(`Creating admin user: ${adminUser}`));
        execSync(`lando wp user create "${adminUser}" "${adminEmail}" --role=administrator --user_pass="${adminPassword}"`, { stdio: 'inherit' });
      }

      console.log(chalk.green('✅ Admin credentials updated'));

    } catch (error) {
      console.error(chalk.red(`❌ Failed to update admin credentials: ${error}`));
      if (!this.sqlConfig?.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Setup WordPress normally.
   * 
   * @since TBD
   */
  private async setupWordPress(): Promise<void> {
    console.log(chalk.blue('🔧 Installing WordPress...'));
    
    try {
      // Download WordPress core
      execSync('lando wp core download', { stdio: 'inherit' });
      
      // Create wp-config.php
      execSync('lando wp config create --dbname=wordpress --dbuser=wordpress --dbpass=wordpress --dbhost=database', { stdio: 'inherit' });
      
      // Install WordPress
      const siteUrl = this.wordpressConfig?.siteUrl || 'https://testflow.lndo.site';
      const adminUser = this.wordpressConfig?.adminUser || 'admin';
      const adminPassword = this.wordpressConfig?.adminPassword || 'password';
      const adminEmail = this.wordpressConfig?.adminEmail || 'admin@example.com';
      
      execSync(`lando wp core install --url="${siteUrl}" --title="TestFlow Site" --admin_user="${adminUser}" --admin_password="${adminPassword}" --admin_email="${adminEmail}"`, { stdio: 'inherit' });
      
      console.log(chalk.green('✅ WordPress installation completed'));
      
    } catch (error) {
      console.error(chalk.red(`❌ WordPress installation failed: ${error}`));
      throw error;
    }
  }

  /**
   * Execute SQL files at specified stage.
   * 
   * @param {string} stage - Execution stage.
   * @param {string[]} files - SQL files to execute.
   * 
   * @since TBD
   */
  async executeSqlFiles(stage: string, files: string[]): Promise<void> {
    if (!files || files.length === 0) {
      return;
    }

    console.log(chalk.blue(`📄 Executing SQL files at stage: ${stage}`));

    for (const file of files) {
      if (!existsSync(file)) {
        const message = `SQL file not found: ${file}`;
        console.error(chalk.red(`❌ ${message}`));
        
        if (!this.sqlConfig?.continueOnError) {
          throw new Error(message);
        }
        continue;
      }

      try {
        console.log(chalk.gray(`Executing: ${file}`));
        
        // Read SQL file content
        const sqlContent = readFileSync(file, 'utf8');
        
        // Execute SQL using Lando MySQL
        execSync(`lando mysql wordpress < "${file}"`, { stdio: 'inherit' });
        
        console.log(chalk.green(`✅ Executed: ${file}`));
        
      } catch (error) {
        const message = `Failed to execute SQL file ${file}: ${error}`;
        console.error(chalk.red(`❌ ${message}`));
        
        if (!this.sqlConfig?.continueOnError) {
          throw new Error(message);
        }
      }
    }
  }

  /**
   * Generate Lando configuration file.
   * 
   * @private
   * 
   * @since TBD
   */
  private generateLandoFile(): void {
    const landoConfig = {
      name: 'testflow',
      recipe: 'wordpress',
      config: {
        php: this.config.php,
        database: `mysql:${this.config.mysql}`,
        webroot: '.'
      },
      services: {
        appserver: {
          xdebug: false,
          config: {
            php: 'config/php.ini'
          }
        }
      },
      proxy: {
        appserver: ['testflow.lndo.site']
      },
      tooling: {
        'wp': {
          service: 'appserver'
        },
        'mysql': {
          service: 'database'
        }
      }
    };

    writeFileSync(this.landoFile, `# Auto-generated Lando configuration for TestFlow
# Do not edit manually

name: ${landoConfig.name}
recipe: ${landoConfig.recipe}
config:
  php: '${landoConfig.config.php}'
  database: '${landoConfig.config.database}'
  webroot: ${landoConfig.config.webroot}

services:
  appserver:
    xdebug: ${landoConfig.services.appserver.xdebug}

proxy:
  appserver:
    - ${landoConfig.proxy.appserver[0]}

tooling:
  wp:
    service: appserver
  mysql:
    service: database
`);

    console.log(chalk.gray('Generated .lando.yml'));
  }

  /**
   * Start Lando environment.
   * 
   * @private
   * 
   * @since TBD
   */
  private async startLando(): Promise<void> {
    console.log(chalk.blue('🔄 Starting Lando...'));
    
    try {
      execSync('lando start', { stdio: 'inherit' });
      console.log(chalk.green('✅ Lando started'));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to start Lando: ${error}`));
      throw error;
    }
  }

  /**
   * Stop Lando environment.
   * 
   * @since TBD
   */
  async stop(): Promise<void> {
    console.log(chalk.blue('🛑 Stopping Lando...'));
    
    try {
      execSync('lando stop', { stdio: 'inherit' });
      console.log(chalk.green('✅ Lando stopped'));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to stop Lando: ${error}`));
      throw error;
    }
  }

  /**
   * Destroy Lando environment.
   * 
   * @since TBD
   */
  async destroy(): Promise<void> {
    console.log(chalk.blue('💥 Destroying Lando environment...'));
    
    try {
      execSync('lando destroy -y', { stdio: 'inherit' });
      console.log(chalk.green('✅ Lando environment destroyed'));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to destroy Lando: ${error}`));
      throw error;
    }
  }
} 