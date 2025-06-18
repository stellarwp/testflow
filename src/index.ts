/**
 * TestFlow - WordPress Plugin Testing Framework
 * 
 * @since TBD
 */

export interface LandoConfig {
  php: string;
  mysql: string;
  wordpress: string;
}

export interface PlaywrightConfig {
  testDir: string;
  patterns: string[];
  timeout: number;
  retries: number;
  workers: number;
}

export interface PluginConfig {
  zips: string[];
  installPath: string;
  preActivate?: boolean;
  activateList?: string[];
  skipActivation?: string[];
}

export interface WordPressConfig {
  adminUser: string;
  adminPassword: string;
  adminEmail: string;
  siteUrl: string;
}

export interface SqlConfig {
  files?: string[];
  executeOrder?: 'before-wordpress' | 'after-wordpress' | 'before-plugins' | 'after-plugins';
  continueOnError?: boolean;
  insteadOfWordPress?: boolean;  // Use SQL files instead of WordPress installation
  searchReplace?: {
    enabled?: boolean;
    fromUrl?: string;  // URL to replace from SQL
    toUrl?: string;    // URL to replace to (defaults to siteUrl)
    additionalReplacements?: Array<{
      from: string;
      to: string;
    }>;
  };
}

export interface MatrixConfig {
  sql_files?: string[][];
  plugin_combinations?: string[][];
  environments?: Array<{
    name: string;
    php?: string;
    mysql?: string;
    wordpress?: string;
    sql_files?: string[];
    plugins?: string[];
    insteadOfWordPress?: boolean;
    searchReplace?: {
      fromUrl?: string;
      toUrl?: string;
    };
  }>;
}

export interface TestFlowConfig {
  name?: string;
  description?: string;
  lando: LandoConfig;
  playwright: PlaywrightConfig;
  plugins: PluginConfig;
  wordpress: WordPressConfig;
  sql?: SqlConfig;
  matrix?: MatrixConfig;
}

export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

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

export { ConfigManager } from './core/config.js';
export { TestFlowRunner } from './core/runner.js';
export { LandoManager } from './core/lando.js';
export { PluginManager } from './core/plugins.js';
export { PlaywrightManager } from './core/playwright.js';
export { WordPressHelpers } from './utils/wordpress-helpers.js'; 