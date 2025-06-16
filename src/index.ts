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

export interface TestFlowConfig {
  lando: LandoConfig;
  playwright: PlaywrightConfig;
  plugins: PluginConfig;
  wordpress: WordPressConfig;
}

export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  failures: TestFailure[];
}

export interface TestFailure {
  test: string;
  file: string;
  error: string;
  line?: number;
}

export { ConfigManager } from './core/config.js';
export { TestFlowRunner } from './core/runner.js';
export { LandoManager } from './core/lando.js';
export { PluginManager } from './core/plugins.js';
export { PlaywrightManager } from './core/playwright.js';
export { WordPressHelpers } from './utils/wordpress-helpers.js'; 