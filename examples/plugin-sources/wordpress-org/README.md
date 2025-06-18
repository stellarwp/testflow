# WordPress.org Plugin Testing

This example demonstrates how to test popular WordPress plugins directly from the WordPress.org plugin repository using TestFlow.

## Features

- ✅ **Automatic Downloads**: Plugins downloaded directly from WordPress.org
- ✅ **Version Control**: Test specific versions or always use latest
- ✅ **Popular Plugins**: Examples with WooCommerce, Yoast SEO, Jetpack, etc.
- ✅ **Compatibility Testing**: Test across different WordPress/PHP versions
- ✅ **Performance Impact**: Measure plugin performance impact

## Quick Start

1. **Copy the configuration files** to your project
2. **Run the tests** with TestFlow
3. **Customize** for your specific needs

```bash
# Copy example files
cp -r examples/plugin-sources/wordpress-org/* ./

# Run basic WordPress.org plugin tests
testflow run --config testflow-wordpress-org.yaml

# Run performance tests
testflow run --config testflow-performance.yaml

# Run compatibility matrix
testflow run --config testflow-compatibility.yaml
```

## Configuration Files

### Basic Configuration (`testflow-wordpress-org.yaml`)

Tests popular WordPress plugins with default settings:

- WooCommerce (latest)
- Yoast SEO (specific version)
- Jetpack (latest)
- Contact Form 7 (latest)
- Akismet (latest)

### Performance Testing (`testflow-performance.yaml`)

Measures performance impact of popular plugins:

- Baseline WordPress performance
- Individual plugin performance impact
- Combined plugin performance
- Resource usage monitoring

### Compatibility Matrix (`testflow-compatibility.yaml`)

Tests plugin compatibility across:

- WordPress versions: 6.3, 6.4, latest
- PHP versions: 8.1, 8.2, 8.3
- Plugin combinations

## GitHub Workflow

The included workflow (`.github/workflows/wordpress-org-testing.yml`) provides:

- **Automated Testing**: Runs on every push/PR
- **Matrix Testing**: Multiple WordPress/PHP versions
- **Performance Monitoring**: Tracks plugin performance impact
- **Compatibility Reporting**: Detailed compatibility reports

## Test Examples

### Plugin Activation Tests (`tests/e2e/plugin-activation.test.js`)

```javascript
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

test.describe('WordPress.org Plugin Activation', () => {
  test('WooCommerce activates successfully', async ({ admin, page }) => {
    await admin.visitAdminPage('plugins.php');
    
    const wooRow = page.locator('tr[data-slug="woocommerce"]');
    await expect(wooRow).toBeVisible();
    
    // Check if activated (should show Deactivate link)
    const deactivateLink = wooRow.locator('a:has-text("Deactivate")');
    await expect(deactivateLink).toBeVisible();
  });
});
```

### Performance Impact Tests (`tests/e2e/performance-impact.test.js`)

```javascript
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
import { TestFlowHelpers } from 'testflow/helpers';

test.describe('Plugin Performance Impact', () => {
  test('WooCommerce performance impact', async ({ page }) => {
    const helpers = new TestFlowHelpers(page);
    
    // Measure baseline
    const baseline = await helpers.measureDetailedPerformance('https://testflow.lndo.site/');
    
    // Activate WooCommerce
    await helpers.bulkActivatePlugins(['woocommerce']);
    
    // Measure with plugin
    const withPlugin = await helpers.measureDetailedPerformance('https://testflow.lndo.site/');
    
    // Check impact is reasonable
    const impact = withPlugin.totalLoadTime - baseline.totalLoadTime;
    expect(impact).toBeLessThan(2000); // Less than 2s impact
  });
});
```

## Customization

### Adding New Plugins

```yaml
# testflow-wordpress-org.yaml
plugins:
  wordpress_org:
    - slug: 'your-plugin-slug'
      version: 'latest'
      activate: true
    - slug: 'another-plugin'
      version: '2.1.0'
      activate: false
```

### Version-Specific Testing

```yaml
plugins:
  wordpress_org:
    - slug: 'woocommerce'
      version: '8.0.0'    # Test specific version
    - slug: 'yoast-seo'
      version: 'latest'   # Always use latest
```

### Conditional Activation

```yaml
plugins:
  wordpress_org:
    - slug: 'woocommerce'
      activate: true      # Always activate
    - slug: 'jetpack'
      activate: false     # Install but don't activate
```

## Environment Variables

```bash
# Optional: Override default WordPress.org API settings
WORDPRESS_ORG_API_URL=https://api.wordpress.org
WORDPRESS_ORG_TIMEOUT=30
WORDPRESS_ORG_RETRIES=3

# Plugin-specific settings
WC_VERSION=latest
YOAST_VERSION=21.0
JETPACK_VERSION=latest
```

## Common Plugin Slugs

Popular WordPress.org plugins and their slugs:

```yaml
# E-commerce
- slug: 'woocommerce'
- slug: 'easy-digital-downloads'

# SEO
- slug: 'yoast-seo'
- slug: 'all-in-one-seo-pack'

# Security
- slug: 'wordfence'
- slug: 'jetpack'

# Forms
- slug: 'contact-form-7'
- slug: 'wpforms-lite'

# Performance
- slug: 'w3-total-cache'
- slug: 'wp-super-cache'

# Backup
- slug: 'updraftplus'
- slug: 'backwpup'
```

## Troubleshooting

### Plugin Not Found

```yaml
# Ensure plugin slug matches WordPress.org exactly
- slug: 'contact-form-7'  # ✅ Correct
- slug: 'contact-form'    # ❌ Wrong
```

### Version Issues

```yaml
# Use 'latest' for most recent version
- slug: 'woocommerce'
  version: 'latest'

# Or specify exact version
- slug: 'woocommerce'
  version: '8.0.0'
```

### Download Failures

Check network connectivity and WordPress.org API status:

```bash
# Test WordPress.org API
curl -I https://api.wordpress.org/plugins/info/1.0/woocommerce.json
```

## Performance Benchmarks

Expected performance impact for popular plugins:

| Plugin | Load Time Impact | Memory Usage | Database Queries |
|--------|------------------|--------------|------------------|
| WooCommerce | +500-1000ms | +15-25MB | +10-20 queries |
| Yoast SEO | +200-400ms | +5-10MB | +3-5 queries |
| Jetpack | +300-600ms | +10-15MB | +5-10 queries |
| Contact Form 7 | +100-200ms | +2-5MB | +1-2 queries |

## Best Practices

1. **Pin Critical Versions**: Use specific versions for production testing
2. **Test Combinations**: Test plugins together, not just individually  
3. **Monitor Performance**: Track performance impact over time
4. **Update Regularly**: Keep test plugin versions current
5. **Document Dependencies**: Note plugin dependencies and conflicts

## Next Steps

- Review the [Private URLs example](../private-urls/) for testing premium plugins
- Check the [Mixed Sources example](../mixed-sources/) for complex scenarios
- Explore [GitHub Releases example](../github-releases/) for GitHub-hosted plugins 