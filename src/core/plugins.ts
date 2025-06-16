/**
 * Plugin Manager - Handles WordPress plugin installation and management
 * 
 * @since TBD
 */

import { glob } from 'glob';
import { existsSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { extract } from 'extract-zip';
import { join, basename, dirname } from 'path';
import chalk from 'chalk';

export interface PluginConfig {
  zips: string[];
  installPath?: string;
  preActivate?: boolean;
  activateList?: string[];
  skipActivation?: string[];
}

export class PluginManager {
  private config: PluginConfig;
  private installedPlugins: string[] = [];
  private tempDir: string = '.testflow-temp';

  /**
   * Initialize plugin manager.
   * 
   * @param {PluginConfig} config - Plugin configuration.
   * 
   * @since TBD
   */
  constructor(config: PluginConfig) {
    this.config = config;
    this.config.installPath = this.config.installPath || '/wp-content/plugins/';
    this.config.preActivate = this.config.preActivate !== false; // Default to true
    this.config.activateList = this.config.activateList || [];
    this.config.skipActivation = this.config.skipActivation || [];
  }

  /**
   * Resolve plugin ZIP file paths from patterns.
   * 
   * @returns {Promise<string[]>} - Array of resolved plugin paths.
   * 
   * @since TBD
   */
  async resolvePluginZips(): Promise<string[]> {
    const resolvedPaths: string[] = [];

    for (const pattern of this.config.zips) {
      const matches = await glob(pattern, { 
        absolute: true,
        ignore: ['**/node_modules/**', '**/.git/**']
      });
      
      for (const match of matches) {
        if (match.endsWith('.zip') && existsSync(match)) {
          resolvedPaths.push(match);
        }
      }
    }

    if (resolvedPaths.length === 0) {
      throw new Error(`No plugin ZIP files found for patterns: ${this.config.zips.join(', ')}`);
    }

    return resolvedPaths;
  }

  /**
   * Install a plugin from ZIP file.
   * 
   * @param {string} zipPath - Path to plugin ZIP file.
   * 
   * @since TBD
   */
  async installPlugin(zipPath: string): Promise<void> {
    if (!existsSync(zipPath)) {
      throw new Error(`Plugin ZIP file not found: ${zipPath}`);
    }

    const pluginName = basename(zipPath, '.zip');
    const tempExtractPath = join(this.tempDir, pluginName);

    try {
      // Create temp directory if it doesn't exist
      if (!existsSync(this.tempDir)) {
        mkdirSync(this.tempDir, { recursive: true });
      }

      // Extract ZIP file to temp directory
      await extract(zipPath, { dir: join(process.cwd(), tempExtractPath) });

      // Find the plugin directory (handle nested structures)
      const extractedItems = await glob(join(tempExtractPath, '*'), { 
        absolute: true 
      });
      
      let pluginDir = tempExtractPath;
      
      // If there's only one directory, use that as the plugin directory
      if (extractedItems.length === 1 && extractedItems[0].includes('/')) {
        pluginDir = extractedItems[0];
      }

      // Install plugin via WP-CLI
      const installCommand = `wp plugin install ${pluginDir} --force`;
      
      try {
        execSync(`lando ${installCommand}`, { stdio: 'pipe' });
      } catch (error) {
        // Fallback: try copying directly to plugins directory
        await this.copyPluginDirectory(pluginDir, pluginName);
      }

      this.installedPlugins.push(pluginName);
      
      console.log(chalk.green(`✅ Plugin installed: ${pluginName}`));

    } catch (error) {
      throw new Error(`Failed to install plugin ${pluginName}: ${error}`);
    }
  }

  /**
   * Activate plugins based on configuration.
   * 
   * @since TBD
   */
  async activatePlugins(): Promise<void> {
    if (!this.config.preActivate && this.config.activateList.length === 0) {
      console.log(chalk.yellow('⏭️  Plugin activation skipped'));
      return;
    }

    // Get plugins to activate
    let pluginsToActivate: string[] = [];
    
    if (this.config.preActivate) {
      pluginsToActivate = [...this.installedPlugins];
    }
    
    // Add specific plugins from activateList
    pluginsToActivate.push(...this.config.activateList);
    
    // Remove plugins from skipActivation list
    pluginsToActivate = pluginsToActivate.filter(
      plugin => !this.config.skipActivation.includes(plugin)
    );

    // Remove duplicates
    pluginsToActivate = [...new Set(pluginsToActivate)];

    if (pluginsToActivate.length === 0) {
      console.log(chalk.yellow('⏭️  No plugins to activate'));
      return;
    }

    try {
      for (const pluginName of pluginsToActivate) {
        await this.activatePlugin(pluginName);
      }
    } catch (error) {
      throw new Error(`Failed to activate plugins: ${error}`);
    }
  }

  /**
   * Activate a specific plugin.
   * 
   * @param {string} pluginName - Plugin name to activate.
   * 
   * @private
   * 
   * @since TBD
   */
  private async activatePlugin(pluginName: string): Promise<void> {
    try {
      execSync(`lando wp plugin activate ${pluginName}`, { stdio: 'pipe' });
      console.log(chalk.green(`✅ Plugin activated: ${pluginName}`));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to activate plugin: ${pluginName}`));
      
      // Try to find and activate by directory structure
      const pluginFiles = await this.findPluginFiles(pluginName);
      
      for (const file of pluginFiles) {
        try {
          execSync(`lando wp plugin activate ${file}`, { stdio: 'pipe' });
          console.log(chalk.green(`✅ Plugin activated: ${file}`));
          return;
        } catch {
          // Continue trying other files
        }
      }
      
      console.warn(chalk.yellow(`⚠️  Could not activate plugin: ${pluginName}`));
    }
  }

  /**
   * Deactivate a specific plugin.
   * 
   * @param {string} pluginName - Plugin name to deactivate.
   * 
   * @since TBD
   */
  async deactivatePlugin(pluginName: string): Promise<void> {
    try {
      execSync(`lando wp plugin deactivate ${pluginName}`, { stdio: 'pipe' });
      console.log(chalk.green(`✅ Plugin deactivated: ${pluginName}`));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to deactivate plugin: ${pluginName}`));
    }
  }

  /**
   * Activate specific plugins during test execution.
   * 
   * @param {string[]} pluginNames - Plugin names to activate.
   * 
   * @since TBD
   */
  async activateSpecificPlugins(pluginNames: string[]): Promise<void> {
    for (const pluginName of pluginNames) {
      await this.activatePlugin(pluginName);
    }
  }

  /**
   * Deactivate specific plugins during test execution.
   * 
   * @param {string[]} pluginNames - Plugin names to deactivate.
   * 
   * @since TBD
   */
  async deactivateSpecificPlugins(pluginNames: string[]): Promise<void> {
    for (const pluginName of pluginNames) {
      await this.deactivatePlugin(pluginName);
    }
  }

  /**
   * Get list of installed plugins.
   * 
   * @returns {Promise<string[]>} - List of installed plugin names.
   * 
   * @since TBD
   */
  async getInstalledPlugins(): Promise<string[]> {
    try {
      const output = execSync('lando wp plugin list --format=json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const plugins = JSON.parse(output);
      return plugins.map((plugin: any) => plugin.name);
    } catch (error) {
      console.warn(chalk.yellow('Failed to get installed plugins list'));
      return [];
    }
  }

  /**
   * Get list of active plugins.
   * 
   * @returns {Promise<string[]>} - List of active plugin names.
   * 
   * @since TBD
   */
  async getActivePlugins(): Promise<string[]> {
    try {
      const output = execSync('lando wp plugin list --status=active --format=json', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const plugins = JSON.parse(output);
      return plugins.map((plugin: any) => plugin.name);
    } catch (error) {
      console.warn(chalk.yellow('Failed to get active plugins list'));
      return [];
    }
  }

  /**
   * Check if a plugin is active.
   * 
   * @param {string} pluginName - Plugin name to check.
   * 
   * @returns {Promise<boolean>} - Whether the plugin is active.
   * 
   * @since TBD
   */
  async isPluginActive(pluginName: string): Promise<boolean> {
    const activePlugins = await this.getActivePlugins();
    return activePlugins.some(plugin => 
      plugin.includes(pluginName) || pluginName.includes(plugin)
    );
  }

  /**
   * Cleanup temporary files and directories.
   * 
   * @since TBD
   */
  async cleanup(): Promise<void> {
    if (existsSync(this.tempDir)) {
      try {
        rmSync(this.tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Failed to cleanup temp directory: ${error}`));
      }
    }
  }

  /**
   * Copy plugin directory to WordPress plugins directory.
   * 
   * @param {string} sourceDir  - Source plugin directory.
   * @param {string} pluginName - Plugin name.
   * 
   * @private
   * 
   * @since TBD
   */
  private async copyPluginDirectory(sourceDir: string, pluginName: string): Promise<void> {
    try {
      const targetDir = `wp-content/plugins/${pluginName}`;
      
      // Create target directory
      execSync(`lando mkdir -p ${targetDir}`, { stdio: 'pipe' });
      
      // Copy files
      execSync(`lando cp -r ${sourceDir}/* ${targetDir}/`, { stdio: 'pipe' });
      
      // Set proper permissions
      execSync(`lando chown -R www-data:www-data ${targetDir}`, { stdio: 'pipe' });
      execSync(`lando chmod -R 755 ${targetDir}`, { stdio: 'pipe' });
      
    } catch (error) {
      throw new Error(`Failed to copy plugin directory: ${error}`);
    }
  }

  /**
   * Find plugin files for activation.
   * 
   * @param {string} pluginName - Plugin name.
   * 
   * @returns {Promise<string[]>} - Array of potential plugin files.
   * 
   * @private
   * 
   * @since TBD
   */
  private async findPluginFiles(pluginName: string): Promise<string[]> {
    try {
      const output = execSync(`lando wp plugin list --format=json`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const plugins = JSON.parse(output);
      const matchingPlugins = plugins.filter((plugin: any) => 
        plugin.name.includes(pluginName) || plugin.file.includes(pluginName)
      );
      
      return matchingPlugins.map((plugin: any) => plugin.file);
    } catch (error) {
      return [];
    }
  }
} 