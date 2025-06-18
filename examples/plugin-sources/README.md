# Plugin Sources Examples

This directory contains examples demonstrating how to test WordPress plugins from various sources using TestFlow, including public plugins from WordPress.org and private plugins from secure URLs.

## Overview

TestFlow supports testing plugins from multiple sources:

- **WordPress.org Repository**: Public plugins downloaded directly from the WordPress plugin directory
- **Private URLs**: Plugins hosted on private servers, CDNs, or repositories
- **GitHub Releases**: Plugins distributed via GitHub releases
- **Local Development**: Plugins built and packaged locally

## Security Considerations

When testing private plugins or using authenticated sources:

- ✅ **Use GitHub Secrets** for sensitive URLs and authentication
- ✅ **Obfuscate private URLs** in public repositories
- ✅ **Use environment variables** for configuration
- ✅ **Separate public and private configurations**
- ❌ **Never commit private URLs or credentials** to version control

## Examples in this Directory

### 1. [WordPress.org Plugins](wordpress-org/)
- Testing popular public plugins from WordPress.org
- Automatic plugin download and installation
- Version-specific testing
- Performance benchmarking and compatibility testing

### 2. [Private Plugin URLs](private-urls/)
- Testing plugins from private/authenticated URLs
- Using GitHub Secrets for URL obfuscation
- Authentication headers and tokens
- Environment separation (staging/production)

### 3. [GitHub Repositories](github-repos/)
- Testing plugins directly from GitHub repositories
- Public and private repository support
- Branch, tag, and commit-specific testing
- GitHub token authentication for private repos

### 4. [Local Development](local-development/)
- Testing plugins from local development environments
- Hot reloading and file watching
- Build process integration
- Multi-plugin development and testing

## Quick Start

### 1. WordPress.org Plugins

```yaml
# testflow-wordpress-org.yaml
name: 'WordPress.org Plugin Testing'

plugins:
  wordpress_org:
    - slug: 'woocommerce'
      version: 'latest'
    - slug: 'yoast-seo'
      version: '21.0'
    - slug: 'jetpack'
      version: 'latest'
  preActivate: true

environment:
  php: '8.1'
  wordpress: 'latest'
```

### 2. Private URLs with Secrets

```yaml
# testflow-private.yaml
name: 'Private Plugin Testing'

plugins:
  urls:
    - url: '${PRIVATE_PLUGIN_URL_1}'
      headers:
        Authorization: 'Bearer ${PRIVATE_API_TOKEN}'
    - url: '${PRIVATE_PLUGIN_URL_2}'
      auth:
        username: '${PRIVATE_USERNAME}'
        password: '${PRIVATE_PASSWORD}'
  preActivate: true
```

### 3. GitHub Workflow Integration

```yaml
# .github/workflows/plugin-testing.yml
name: Plugin Testing from Multiple Sources

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install TestFlow
        run: bun add -g testflow
        
      - name: Test WordPress.org Plugins
        run: testflow run --config testflow-wordpress-org.yaml
        
      - name: Test Private Plugins
        env:
          PRIVATE_PLUGIN_URL_1: ${{ secrets.PRIVATE_PLUGIN_URL_1 }}
          PRIVATE_PLUGIN_URL_2: ${{ secrets.PRIVATE_PLUGIN_URL_2 }}
          PRIVATE_API_TOKEN: ${{ secrets.PRIVATE_API_TOKEN }}
          PRIVATE_USERNAME: ${{ secrets.PRIVATE_USERNAME }}
          PRIVATE_PASSWORD: ${{ secrets.PRIVATE_PASSWORD }}
        run: testflow run --config testflow-private.yaml
```

## Configuration Reference

### WordPress.org Plugin Configuration

```yaml
plugins:
  wordpress_org:
    - slug: 'plugin-slug'           # Required: WordPress.org plugin slug
      version: 'latest'             # Optional: specific version or 'latest'
      activate: true                # Optional: auto-activate this plugin
    - slug: 'another-plugin'
      version: '2.1.0'
      activate: false
```

### Private URL Configuration

```yaml
plugins:
  urls:
    - url: '${PLUGIN_DOWNLOAD_URL}'     # Environment variable for URL
      filename: 'custom-plugin.zip'     # Optional: custom filename
      headers:                          # Optional: HTTP headers
        Authorization: 'Bearer ${TOKEN}'
        User-Agent: 'TestFlow/1.0'
      auth:                            # Optional: basic auth
        username: '${USERNAME}'
        password: '${PASSWORD}'
      verify_ssl: true                 # Optional: SSL verification
      timeout: 30                      # Optional: download timeout
```

### GitHub Releases Configuration

```yaml
plugins:
  github_releases:
    - repo: 'owner/plugin-repo'         # GitHub repository
      tag: 'latest'                     # Tag or 'latest'
      asset_pattern: '*.zip'            # Asset filename pattern
      token: '${GITHUB_TOKEN}'          # Optional: for private repos
    - repo: 'company/premium-plugin'
      tag: 'v2.0.0'
      asset_pattern: 'premium-*.zip'
      token: '${PRIVATE_GITHUB_TOKEN}'
```

## GitHub Secrets Setup

### Required Secrets for Private Testing

Set these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

```bash
# Private plugin URLs (obfuscated)
PRIVATE_PLUGIN_URL_1=https://secure-cdn.example.com/plugins/premium-plugin-v1.2.3.zip
PRIVATE_PLUGIN_URL_2=https://api.company.com/downloads/enterprise-plugin.zip

# Authentication tokens
PRIVATE_API_TOKEN=your-api-token-here
GITHUB_PRIVATE_TOKEN=ghp_your-private-repo-token

# Basic authentication
PRIVATE_USERNAME=your-username
PRIVATE_PASSWORD=your-secure-password

# License keys (if needed)
PLUGIN_LICENSE_KEY=your-license-key
PREMIUM_ACTIVATION_TOKEN=activation-token
```

### Environment Variables for Development

Create `.env.example` for documentation:

```bash
# .env.example - Copy to .env and fill in values
PRIVATE_PLUGIN_URL_1=https://example.com/path/to/plugin.zip
PRIVATE_PLUGIN_URL_2=https://api.example.com/download/plugin
PRIVATE_API_TOKEN=your-token-here
PRIVATE_USERNAME=username
PRIVATE_PASSWORD=password
```

## Best Practices

### 1. URL Obfuscation Strategies

```yaml
# ✅ Good: Use environment variables
plugins:
  urls:
    - url: '${COMPANY_PLUGIN_URL}'
    - url: '${PREMIUM_DOWNLOAD_ENDPOINT}'

# ❌ Bad: Hardcoded private URLs
plugins:
  urls:
    - url: 'https://private-server.company.com/secret-plugin.zip'
```

### 2. Conditional Plugin Loading

```yaml
# testflow.yaml
name: 'Conditional Plugin Testing'

profiles:
  public:
    plugins:
      wordpress_org:
        - slug: 'woocommerce'
        - slug: 'yoast-seo'
  
  private:
    plugins:
      urls:
        - url: '${PRIVATE_PLUGIN_URL}'
          headers:
            Authorization: 'Bearer ${API_TOKEN}'
      wordpress_org:
        - slug: 'woocommerce'  # Mix public and private
```

### 3. Error Handling and Fallbacks

```yaml
plugins:
  urls:
    - url: '${PRIMARY_PLUGIN_URL}'
      fallback_url: '${BACKUP_PLUGIN_URL}'
      retry_count: 3
      retry_delay: 5
  
  # Fallback to local if remote fails
  zips:
    - 'fallback/local-plugin.zip'
```

### 4. Version Management

```yaml
plugins:
  wordpress_org:
    - slug: 'woocommerce'
      version: '${WC_VERSION:-latest}'  # Default to latest
    - slug: 'yoast-seo'
      version: '${YOAST_VERSION:-21.0}' # Default to specific version
```

## Testing Strategies

### 1. Plugin Compatibility Matrix

```yaml
# .github/workflows/compatibility-matrix.yml
strategy:
  matrix:
    plugin_source:
      - 'wordpress-org'
      - 'private-staging'
      - 'private-production'
    wordpress_version: ['6.3', '6.4', 'latest']
    php_version: ['8.1', '8.2', '8.3']

steps:
  - name: Test Plugin Source
    env:
      PLUGIN_SOURCE: ${{ matrix.plugin_source }}
    run: testflow run --config testflow-${{ matrix.plugin_source }}.yaml
```

### 2. Staged Testing Pipeline

```yaml
# .github/workflows/staged-testing.yml
jobs:
  test-public:
    name: 'Test Public Plugins'
    runs-on: ubuntu-latest
    steps:
      - name: Test WordPress.org plugins
        run: testflow run --config testflow-public.yaml
  
  test-private:
    name: 'Test Private Plugins'
    needs: test-public
    runs-on: ubuntu-latest
    environment: production  # Requires approval for private plugins
    steps:
      - name: Test private plugins
        env:
          PRIVATE_PLUGIN_URL: ${{ secrets.PRIVATE_PLUGIN_URL }}
        run: testflow run --config testflow-private.yaml
```

### 3. License Validation Testing

```javascript
// tests/e2e/license-validation.test.js
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

test.describe('Premium Plugin License', () => {
  test('License activation works', async ({ admin, page }) => {
    // Navigate to plugin license page
    await admin.visitAdminPage('admin.php?page=premium-plugin-license');
    
    // Enter license key from environment
    const licenseKey = process.env.PLUGIN_LICENSE_KEY;
    await page.fill('#license-key', licenseKey);
    await page.click('#activate-license');
    
    // Verify activation
    await expect(page.locator('.license-status')).toContainText('Active');
  });
});
```

## Troubleshooting

### Common Issues

1. **Download Failures**
   - Check URL accessibility
   - Verify authentication credentials
   - Test SSL certificate validity

2. **Plugin Activation Issues**
   - Ensure plugin ZIP structure is correct
   - Check for missing dependencies
   - Verify WordPress compatibility

3. **GitHub Secrets Not Working**
   - Verify secret names match exactly
   - Check repository access permissions
   - Ensure secrets are available in the environment

### Debug Mode

```yaml
# Enable debug logging for plugin downloads
environment:
  TESTFLOW_DEBUG: 'true'
  TESTFLOW_LOG_LEVEL: 'verbose'
```

## Security Checklist

- [ ] Private URLs stored in GitHub Secrets
- [ ] No hardcoded credentials in configuration files
- [ ] `.env` files added to `.gitignore`
- [ ] Separate configurations for public/private plugins
- [ ] License keys stored securely
- [ ] SSL verification enabled for downloads
- [ ] Access logs reviewed regularly
- [ ] Secrets rotated periodically

## Example Workflows

Each subdirectory contains complete working examples:

- **[wordpress-org/](wordpress-org/)**: Complete setup for testing WordPress.org plugins
- **[private-urls/](private-urls/)**: Secure testing of private plugins
- **[mixed-sources/](mixed-sources/)**: Complex scenarios with multiple sources
- **[github-releases/](github-releases/)**: GitHub-based plugin distribution

Choose the example that best matches your use case and follow the included documentation for setup and configuration. 