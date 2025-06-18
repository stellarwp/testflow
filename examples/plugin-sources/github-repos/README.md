# Testing Plugins from GitHub Repositories

This example demonstrates how to test WordPress plugins directly from GitHub repositories, supporting both public and private repositories with various authentication methods.

## Overview

GitHub repositories are a common source for WordPress plugins, especially for:
- Development versions of plugins
- Fork testing and contributions
- Private organizational plugins
- Beta/pre-release versions
- Custom plugin development

## Features

- **Public Repository Support**: Clone and test any public GitHub plugin repository
- **Private Repository Access**: Secure authentication for private repos using GitHub tokens
- **Branch/Tag Flexibility**: Test specific branches, tags, or commits
- **Release Testing**: Test both development and release versions
- **Fork Management**: Easy testing of forked repositories
- **Automated Updates**: Monitor and test repository changes

## Security Best Practices

### GitHub Token Management
- Use GitHub Personal Access Tokens (PAT) or Fine-grained tokens
- Store tokens in GitHub repository secrets
- Use minimum required permissions (Contents: Read for public repos)
- Rotate tokens regularly
- Never commit tokens to repository

### Repository Access
- Verify repository authenticity before testing
- Use specific commits/tags for reproducible testing
- Monitor for unauthorized changes in dependencies

## Configuration Files

### Basic GitHub Testing (`testflow-github-basic.yaml`)
For testing public GitHub repositories:

```yaml
name: "GitHub Repository Plugin Testing"
description: "Test WordPress plugins from GitHub repositories"

wordpress:
  version: "6.4"
  multisite: false
  
php:
  version: "8.1"

plugins:
  # Public repository - latest release
  - name: "query-monitor"
    source: "github"
    repository: "johnbillion/query-monitor"
    type: "release" # or "branch", "tag", "commit"
    
  # Public repository - specific branch
  - name: "debug-bar"
    source: "github"
    repository: "WordPress/debug-bar"
    type: "branch"
    branch: "trunk"
    
  # Public repository - specific tag
  - name: "wp-cli"
    source: "github"
    repository: "wp-cli/wp-cli"
    type: "tag"
    tag: "v2.8.1"

database:
  name: "github_plugin_test"
  
tests:
  - "tests/e2e/github-plugins.test.js"

environment:
  WP_DEBUG: true
  WP_DEBUG_LOG: true
```

### Private Repository Testing (`testflow-github-private.yaml`)
For testing private GitHub repositories with authentication:

```yaml
name: "Private GitHub Repository Testing"
description: "Test WordPress plugins from private GitHub repositories"

wordpress:
  version: "6.4"
  multisite: false
  
php:
  version: "8.1"

plugins:
  # Private repository with token authentication
  - name: "company-plugin"
    source: "github"
    repository: "company/private-wordpress-plugin"
    type: "branch"
    branch: "develop"
    auth:
      token: "${GITHUB_TOKEN}"
      
  # Private repository with specific commit
  - name: "internal-tools"
    source: "github"
    repository: "organization/internal-wp-tools"
    type: "commit"
    commit: "abc123def456"
    auth:
      token: "${GITHUB_PRIVATE_TOKEN}"
      
  # Fork testing
  - name: "forked-plugin"
    source: "github"
    repository: "username/forked-plugin"
    type: "branch"
    branch: "feature/new-functionality"
    auth:
      token: "${GITHUB_FORK_TOKEN}"

database:
  name: "private_github_test"
  
tests:
  - "tests/e2e/private-plugins.test.js"

environment:
  WP_DEBUG: true
  WP_DEBUG_LOG: true
  GITHUB_TOKEN: "${GITHUB_TOKEN}"
```

### Multi-Branch Testing (`testflow-github-matrix.yaml`)
For testing multiple branches/versions simultaneously:

```yaml
name: "GitHub Multi-Branch Testing"
description: "Test multiple branches and versions from GitHub"

matrix:
  wordpress: ["6.3", "6.4"]
  php: ["8.0", "8.1", "8.2"]
  plugin_branch: ["main", "develop", "staging"]

wordpress:
  version: "${MATRIX_WORDPRESS}"
  
php:
  version: "${MATRIX_PHP}"

plugins:
  - name: "test-plugin"
    source: "github"
    repository: "company/wordpress-plugin"
    type: "branch"
    branch: "${MATRIX_PLUGIN_BRANCH}"
    auth:
      token: "${GITHUB_TOKEN}"

database:
  name: "github_matrix_${MATRIX_WORDPRESS}_${MATRIX_PHP}_${MATRIX_PLUGIN_BRANCH}"
  
tests:
  - "tests/e2e/matrix-testing.test.js"

performance:
  enabled: true
  thresholds:
    page_load: 2000
    memory_usage: "128M"
```

## Environment Variables

Create a `.env` file for local development:

```bash
# GitHub Authentication
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_PRIVATE_TOKEN=ghp_token_for_private_repos
GITHUB_FORK_TOKEN=ghp_token_for_fork_access

# Repository Configuration
DEFAULT_GITHUB_ORG=your-organization
DEFAULT_BRANCH=main

# Testing Configuration
GITHUB_TEST_TIMEOUT=300000
GITHUB_CLONE_DEPTH=1
```

## GitHub Actions Workflow

The workflow supports GitHub repository testing with proper authentication:

```yaml
name: GitHub Repository Plugin Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  test-github-plugins:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        wordpress: ['6.3', '6.4']
        php: ['8.0', '8.1', '8.2']
        plugin-source: ['public', 'private', 'mixed']
        
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
          
      - name: Install TestFlow
        run: bun add @your-org/testflow
        
      - name: Configure GitHub Access
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_PRIVATE_TOKEN: ${{ secrets.GITHUB_PRIVATE_TOKEN }}
        run: |
          echo "GITHUB_TOKEN=${GITHUB_TOKEN}" >> $GITHUB_ENV
          echo "GITHUB_PRIVATE_TOKEN=${GITHUB_PRIVATE_TOKEN}" >> $GITHUB_ENV
          
      - name: Run GitHub Plugin Tests
        run: |
          case "${{ matrix.plugin-source }}" in
            "public")
              bun testflow run testflow-github-basic.yaml
              ;;
            "private")
              bun testflow run testflow-github-private.yaml
              ;;
            "mixed")
              bun testflow run testflow-github-matrix.yaml
              ;;
          esac
        env:
          MATRIX_WORDPRESS: ${{ matrix.wordpress }}
          MATRIX_PHP: ${{ matrix.php }}
          
      - name: Upload Test Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: github-test-results-${{ matrix.plugin-source }}-wp${{ matrix.wordpress }}-php${{ matrix.php }}
          path: |
            test-results/
            screenshots/
            
      - name: Security Scan
        if: matrix.plugin-source == 'private'
        run: |
          # Scan for exposed secrets in test outputs
          bun testflow security-scan --type github-tokens
```

## Test Examples

### Basic GitHub Plugin Test (`tests/e2e/github-plugins.test.js`)

```javascript
import { test, expect } from '@playwright/test';
import { TestFlowHelpers } from '@your-org/testflow';

test.describe('GitHub Repository Plugins', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestFlowHelpers(page);
    await helpers.wpLogin();
  });

  test('should activate plugin from GitHub repository', async () => {
    // Test plugin activation
    await helpers.activatePlugin('query-monitor');
    
    // Verify plugin is active
    const isActive = await helpers.isPluginActive('query-monitor');
    expect(isActive).toBe(true);
    
    // Test plugin functionality
    await helpers.admin.visitAdminPage('');
    await expect(page.locator('#query-monitor')).toBeVisible();
  });

  test('should handle plugin updates from repository', async () => {
    await helpers.activatePlugin('debug-bar');
    
    // Check for updates
    await helpers.admin.visitAdminPage('plugins.php');
    
    // Verify plugin version
    const pluginInfo = await helpers.getActivePluginsWithInfo();
    const debugBar = pluginInfo.find(p => p.slug === 'debug-bar');
    
    expect(debugBar).toBeDefined();
    expect(debugBar.version).toMatch(/^\d+\.\d+/);
  });

  test('should test specific branch functionality', async () => {
    await helpers.activatePlugin('debug-bar');
    
    // Test trunk branch specific features
    await helpers.admin.visitAdminPage('');
    
    // Debug bar should be visible with trunk features
    await expect(page.locator('#debug-bar')).toBeVisible();
    
    // Test branch-specific functionality
    const debugPanels = await page.locator('.debug-menu-item').count();
    expect(debugPanels).toBeGreaterThan(0);
  });
});
```

### Private Repository Test (`tests/e2e/private-plugins.test.js`)

```javascript
import { test, expect } from '@playwright/test';
import { TestFlowHelpers } from '@your-org/testflow';

test.describe('Private GitHub Repository Plugins', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestFlowHelpers(page);
    await helpers.wpLogin();
  });

  test('should access private repository with authentication', async () => {
    // Verify GitHub token is configured
    expect(process.env.GITHUB_TOKEN).toBeDefined();
    
    // Test private plugin activation
    await helpers.activatePlugin('company-plugin');
    
    const isActive = await helpers.isPluginActive('company-plugin');
    expect(isActive).toBe(true);
  });

  test('should test development branch features', async () => {
    await helpers.activatePlugin('company-plugin');
    
    // Test development branch specific functionality
    await helpers.admin.visitAdminPage('admin.php?page=company-plugin');
    
    // Check for development features
    await expect(page.locator('.dev-feature-flag')).toBeVisible();
    
    // Test beta functionality
    const betaFeatures = await page.locator('[data-beta="true"]').count();
    expect(betaFeatures).toBeGreaterThan(0);
  });

  test('should handle fork-specific changes', async () => {
    await helpers.activatePlugin('forked-plugin');
    
    // Test fork-specific modifications
    await helpers.admin.visitAdminPage('');
    
    // Verify fork changes are applied
    const forkChanges = await page.evaluate(() => {
      return window.forkSpecificFeatures || false;
    });
    
    expect(forkChanges).toBeTruthy();
  });

  test('should validate commit-specific functionality', async () => {
    await helpers.activatePlugin('internal-tools');
    
    // Test specific commit features
    await helpers.admin.visitAdminPage('tools.php?page=internal-tools');
    
    // Verify commit-specific code is present
    const commitHash = await page.locator('[data-commit]').getAttribute('data-commit');
    expect(commitHash).toMatch(/^[a-f0-9]{7,40}$/);
  });
});
```

## GitHub-Specific Features

### Repository Validation
- Verify repository exists and is accessible
- Check for WordPress plugin structure
- Validate plugin headers and metadata
- Ensure required files are present

### Branch/Tag Management
- Test multiple branches simultaneously
- Compare functionality between versions
- Validate release vs development branches
- Monitor for breaking changes

### Authentication Methods
- Personal Access Tokens (classic)
- Fine-grained personal access tokens
- GitHub App authentication
- SSH key authentication

### Performance Considerations
- Shallow clones for faster downloads
- Cached repository data
- Parallel plugin downloads
- Incremental updates

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   ```bash
   Error: Repository not found or access denied
   ```
   - Verify GitHub token has correct permissions
   - Check repository name and organization
   - Ensure token is not expired

2. **Plugin Structure Issues**
   ```bash
   Error: Invalid plugin structure
   ```
   - Verify plugin has proper WordPress headers
   - Check for main plugin file
   - Ensure plugin follows WordPress standards

3. **Branch/Tag Not Found**
   ```bash
   Error: Branch 'feature-branch' not found
   ```
   - Verify branch exists in repository
   - Check for typos in branch name
   - Ensure you have access to the branch

### Debug Commands

```bash
# Test GitHub connectivity
bun testflow github-test --repository="owner/repo" --token="$GITHUB_TOKEN"

# Validate plugin structure
bun testflow validate-plugin --source="github" --repository="owner/repo"

# Check authentication
bun testflow github-auth --token="$GITHUB_TOKEN"
```

## Best Practices

1. **Security**
   - Use minimal required permissions
   - Rotate tokens regularly
   - Monitor token usage
   - Audit repository access

2. **Performance**
   - Use shallow clones when possible
   - Cache frequently used repositories
   - Implement parallel downloads
   - Monitor bandwidth usage

3. **Reliability**
   - Pin to specific commits for critical tests
   - Test multiple branches/versions
   - Implement retry mechanisms
   - Monitor repository changes

4. **Maintenance**
   - Regular token rotation
   - Update repository references
   - Monitor for deprecated features
   - Keep authentication methods current 