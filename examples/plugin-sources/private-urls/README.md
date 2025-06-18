# Private Plugin URLs Testing

This example demonstrates how to securely test WordPress plugins from private URLs using GitHub Secrets and environment variables to protect sensitive information.

## 🔒 Security Features

- ✅ **GitHub Secrets Integration**: Sensitive URLs stored securely
- ✅ **Authentication Support**: Bearer tokens, basic auth, API keys
- ✅ **URL Obfuscation**: No private URLs in public repositories
- ✅ **Environment Separation**: Different configs for staging/production
- ✅ **Fallback Mechanisms**: Multiple download sources
- ✅ **License Management**: Secure license key handling

## 🚀 Quick Start

### 1. Setup GitHub Secrets

In your repository settings (`Settings > Secrets and variables > Actions`), add:

```bash
# Private plugin download URLs
PRIVATE_PLUGIN_URL_1=https://secure-cdn.example.com/plugins/premium-plugin-v1.2.3.zip
PRIVATE_PLUGIN_URL_2=https://api.company.com/downloads/enterprise-plugin.zip
PRIVATE_PLUGIN_URL_3=https://license-server.example.com/download/pro-plugin.zip

# Authentication credentials
PRIVATE_API_TOKEN=your-secure-api-token-here
PREMIUM_LICENSE_KEY=your-premium-license-key
DOWNLOAD_AUTH_TOKEN=bearer-token-for-downloads

# Basic authentication (if needed)
PRIVATE_USERNAME=your-username
PRIVATE_PASSWORD=your-secure-password

# Company-specific tokens
COMPANY_CDN_TOKEN=cdn-access-token
ENTERPRISE_API_KEY=enterprise-api-key
```

### 2. Copy Configuration Files

```bash
# Copy example files to your project
cp -r examples/plugin-sources/private-urls/* ./

# Create your own .env file for local development
cp .env.example .env
# Edit .env with your local credentials (never commit this file!)
```

### 3. Run Tests

```bash
# Test with staging plugins
testflow run --config testflow-private-staging.yaml

# Test with production plugins
testflow run --config testflow-private-production.yaml

# Test mixed public/private plugins
testflow run --config testflow-mixed-sources.yaml
```

## 📁 Configuration Files

### Staging Environment (`testflow-private-staging.yaml`)

Tests plugins from staging/development servers:

```yaml
name: 'Private Plugin Testing - Staging'

plugins:
  urls:
    - url: '${STAGING_PLUGIN_URL_1}'
      headers:
        Authorization: 'Bearer ${STAGING_API_TOKEN}'
        User-Agent: 'TestFlow/1.0'
    - url: '${STAGING_PLUGIN_URL_2}'
      auth:
        username: '${STAGING_USERNAME}'
        password: '${STAGING_PASSWORD}'
  preActivate: true
```

### Production Environment (`testflow-private-production.yaml`)

Tests plugins from production/release servers:

```yaml
name: 'Private Plugin Testing - Production'

plugins:
  urls:
    - url: '${PRIVATE_PLUGIN_URL_1}'
      headers:
        Authorization: 'Bearer ${PRIVATE_API_TOKEN}'
        X-License-Key: '${PREMIUM_LICENSE_KEY}'
    - url: '${PRIVATE_PLUGIN_URL_2}'
      headers:
        Authorization: 'Bearer ${ENTERPRISE_API_KEY}'
  preActivate: true
```

### Mixed Sources (`testflow-mixed-sources.yaml`)

Combines public WordPress.org plugins with private plugins:

```yaml
name: 'Mixed Plugin Sources Testing'

plugins:
  # Public plugins from WordPress.org
  wordpress_org:
    - slug: 'woocommerce'
      version: 'latest'
  
  # Private plugins from secure URLs
  urls:
    - url: '${PRIVATE_ADDON_URL}'
      headers:
        Authorization: 'Bearer ${PRIVATE_API_TOKEN}'
  
  preActivate: true
```

## 🔧 GitHub Workflow Integration

### Secure Workflow (`.github/workflows/private-plugin-testing.yml`)

```yaml
name: Private Plugin Testing

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-private-plugins:
    name: Test Private Plugins
    runs-on: ubuntu-latest
    environment: production  # Requires approval for private plugins
    
    strategy:
      matrix:
        environment: ['staging', 'production']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install TestFlow
        run: bun add -g testflow
      
      - name: Test Staging Plugins
        if: matrix.environment == 'staging'
        env:
          STAGING_PLUGIN_URL_1: ${{ secrets.STAGING_PLUGIN_URL_1 }}
          STAGING_PLUGIN_URL_2: ${{ secrets.STAGING_PLUGIN_URL_2 }}
          STAGING_API_TOKEN: ${{ secrets.STAGING_API_TOKEN }}
          STAGING_USERNAME: ${{ secrets.STAGING_USERNAME }}
          STAGING_PASSWORD: ${{ secrets.STAGING_PASSWORD }}
        run: testflow run --config testflow-private-staging.yaml
      
      - name: Test Production Plugins
        if: matrix.environment == 'production'
        env:
          PRIVATE_PLUGIN_URL_1: ${{ secrets.PRIVATE_PLUGIN_URL_1 }}
          PRIVATE_PLUGIN_URL_2: ${{ secrets.PRIVATE_PLUGIN_URL_2 }}
          PRIVATE_API_TOKEN: ${{ secrets.PRIVATE_API_TOKEN }}
          PREMIUM_LICENSE_KEY: ${{ secrets.PREMIUM_LICENSE_KEY }}
          ENTERPRISE_API_KEY: ${{ secrets.ENTERPRISE_API_KEY }}
        run: testflow run --config testflow-private-production.yaml
```

## 🛡️ Security Best Practices

### 1. URL Obfuscation Patterns

```yaml
# ✅ GOOD: Use descriptive environment variable names
plugins:
  urls:
    - url: '${COMPANY_PREMIUM_PLUGIN_URL}'
    - url: '${ENTERPRISE_ADDON_DOWNLOAD_URL}'
    - url: '${STAGING_BETA_PLUGIN_URL}'

# ❌ BAD: Hardcoded private URLs
plugins:
  urls:
    - url: 'https://private-server.company.com/secret-plugin.zip'
    - url: 'https://downloads.company.com/premium/plugin.zip'
```

### 2. Authentication Strategies

```yaml
# Bearer Token Authentication
- url: '${PLUGIN_DOWNLOAD_URL}'
  headers:
    Authorization: 'Bearer ${API_TOKEN}'

# API Key Authentication
- url: '${PLUGIN_DOWNLOAD_URL}'
  headers:
    X-API-Key: '${API_KEY}'
    X-License-Key: '${LICENSE_KEY}'

# Basic Authentication
- url: '${PLUGIN_DOWNLOAD_URL}'
  auth:
    username: '${USERNAME}'
    password: '${PASSWORD}'

# Custom Headers
- url: '${PLUGIN_DOWNLOAD_URL}'
  headers:
    Authorization: 'Bearer ${TOKEN}'
    User-Agent: 'TestFlow/1.0'
    X-Client-ID: '${CLIENT_ID}'
```

### 3. Environment Separation

```yaml
# Staging configuration
staging:
  plugins:
    urls:
      - url: '${STAGING_PLUGIN_URL}'
        headers:
          Authorization: 'Bearer ${STAGING_TOKEN}'

# Production configuration  
production:
  plugins:
    urls:
      - url: '${PRODUCTION_PLUGIN_URL}'
        headers:
          Authorization: 'Bearer ${PRODUCTION_TOKEN}'
```

## 📋 Environment Variables Reference

### Required for Private Testing

```bash
# Plugin Download URLs
PRIVATE_PLUGIN_URL_1=https://secure-cdn.example.com/plugins/premium-plugin.zip
PRIVATE_PLUGIN_URL_2=https://api.company.com/downloads/enterprise-plugin.zip
PRIVATE_PLUGIN_URL_3=https://license-server.example.com/download/pro-plugin.zip

# Authentication Tokens
PRIVATE_API_TOKEN=your-api-token-here
PREMIUM_LICENSE_KEY=license-key-here
ENTERPRISE_API_KEY=enterprise-key-here

# Basic Authentication
PRIVATE_USERNAME=your-username
PRIVATE_PASSWORD=your-password

# Company-specific
COMPANY_CDN_TOKEN=cdn-token
STAGING_API_TOKEN=staging-token
```

### Optional Configuration

```bash
# Download settings
DOWNLOAD_TIMEOUT=30
DOWNLOAD_RETRIES=3
VERIFY_SSL=true

# Plugin-specific settings
PLUGIN_LICENSE_VALIDATION=true
AUTO_UPDATE_CHECK=false
```

## 🧪 Test Examples

### License Validation Test

```javascript
// tests/e2e/license-validation.test.js
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

test.describe('Premium Plugin License', () => {
  test('License key activates successfully', async ({ admin, page }) => {
    // Navigate to plugin license page
    await admin.visitAdminPage('admin.php?page=premium-plugin-license');
    
    // Enter license key from environment
    const licenseKey = process.env.PREMIUM_LICENSE_KEY;
    await page.fill('#license-key', licenseKey);
    await page.click('#activate-license');
    
    // Verify activation success
    await expect(page.locator('.license-status')).toContainText('Active');
    await expect(page.locator('.license-expires')).toBeVisible();
  });
  
  test('Invalid license key shows error', async ({ admin, page }) => {
    await admin.visitAdminPage('admin.php?page=premium-plugin-license');
    
    // Enter invalid license key
    await page.fill('#license-key', 'invalid-license-key');
    await page.click('#activate-license');
    
    // Verify error message
    await expect(page.locator('.license-error')).toContainText('Invalid license');
  });
});
```

### Private Plugin Functionality Test

```javascript
// tests/e2e/private-plugin-functionality.test.js
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { TestFlowHelpers } from 'testflow/helpers';

test.describe('Private Plugin Functionality', () => {
  test('Premium features are available', async ({ admin, page }) => {
    const helpers = new TestFlowHelpers(page);
    
    // Verify plugin is active
    const activePlugins = await helpers.getActivePluginsWithInfo();
    const premiumPlugin = activePlugins.find(p => p.slug === 'premium-plugin');
    expect(premiumPlugin).toBeTruthy();
    expect(premiumPlugin.isActive).toBe(true);
    
    // Test premium features
    await admin.visitAdminPage('admin.php?page=premium-plugin');
    await expect(page.locator('.premium-feature')).toBeVisible();
    await expect(page.locator('.pro-badge')).toBeVisible();
  });
  
  test('Enterprise features work correctly', async ({ admin, page }) => {
    await admin.visitAdminPage('admin.php?page=enterprise-plugin');
    
    // Test enterprise-specific functionality
    await expect(page.locator('.enterprise-dashboard')).toBeVisible();
    await expect(page.locator('.advanced-settings')).toBeVisible();
  });
});
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Download Authentication Failures

```yaml
# Check token format and permissions
- url: '${PLUGIN_URL}'
  headers:
    Authorization: 'Bearer ${TOKEN}'  # Ensure 'Bearer ' prefix
  verify_ssl: true  # Check SSL certificate validity
```

#### 2. License Validation Issues

```javascript
// Verify license key format in tests
test('License key format validation', async ({ page }) => {
  const licenseKey = process.env.PREMIUM_LICENSE_KEY;
  expect(licenseKey).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$/);
});
```

#### 3. URL Accessibility

```bash
# Test URL accessibility locally
curl -I -H "Authorization: Bearer $PRIVATE_API_TOKEN" "$PRIVATE_PLUGIN_URL_1"
```

### Debug Configuration

```yaml
# Enable debug logging
environment:
  TESTFLOW_DEBUG: 'true'
  TESTFLOW_LOG_DOWNLOADS: 'true'
  TESTFLOW_VERBOSE: 'true'

plugins:
  urls:
    - url: '${PLUGIN_URL}'
      debug: true  # Enable per-plugin debugging
      timeout: 60  # Increase timeout for debugging
```

## 🔄 Fallback Strategies

### Multiple Download Sources

```yaml
plugins:
  urls:
    # Primary source
    - url: '${PRIMARY_PLUGIN_URL}'
      headers:
        Authorization: 'Bearer ${PRIMARY_TOKEN}'
      fallback_url: '${BACKUP_PLUGIN_URL}'
      fallback_headers:
        Authorization: 'Bearer ${BACKUP_TOKEN}'
    
    # Secondary source with different auth
    - url: '${SECONDARY_PLUGIN_URL}'
      auth:
        username: '${SECONDARY_USERNAME}'
        password: '${SECONDARY_PASSWORD}'
  
  # Local fallback
  zips:
    - 'fallback/premium-plugin-backup.zip'
```

### Conditional Loading

```yaml
# Load different plugins based on environment
plugins:
  urls:
    - url: '${PLUGIN_URL_STAGING}'
      condition: '${ENVIRONMENT} == staging'
    - url: '${PLUGIN_URL_PRODUCTION}'  
      condition: '${ENVIRONMENT} == production'
```

## 📊 Monitoring and Reporting

### Download Success Tracking

```javascript
// tests/e2e/download-monitoring.test.js
test('Track plugin download success', async ({ page }) => {
  const helpers = new TestFlowHelpers(page);
  
  // Monitor download attempts
  const downloadAttempts = [];
  page.on('request', request => {
    if (request.url().includes('plugin')) {
      downloadAttempts.push({
        url: request.url(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Test plugin functionality
  await helpers.bulkActivatePlugins(['premium-plugin']);
  
  // Report download metrics
  console.log('Download attempts:', downloadAttempts.length);
});
```

## 🔐 Security Checklist

- [ ] All private URLs stored in GitHub Secrets
- [ ] No hardcoded credentials in configuration files  
- [ ] `.env` files added to `.gitignore`
- [ ] Separate staging/production configurations
- [ ] License keys stored securely
- [ ] SSL verification enabled for all downloads
- [ ] Authentication tokens have appropriate permissions
- [ ] Secrets are rotated regularly
- [ ] Access logs reviewed periodically
- [ ] Fallback mechanisms tested

## 🚀 Next Steps

- Explore the [Mixed Sources example](../mixed-sources/) for complex scenarios
- Check the [GitHub Releases example](../github-releases/) for GitHub-hosted plugins
- Review the [WordPress.org example](../wordpress-org/) for public plugin testing 