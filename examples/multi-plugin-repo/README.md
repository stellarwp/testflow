# Multi-Plugin Repository Testing with TestFlow

This example demonstrates how to use TestFlow for comprehensive testing of multiple WordPress plugins in a single repository with various configuration matrices.

## Repository Structure

```
examples/multi-plugin-repo/
├── .github/workflows/
│   └── comprehensive-matrix.yml    # Comprehensive testing workflow
├── tests/e2e/                      # End-to-end tests
├── dist/                           # Built plugin ZIP files
├── testflow-all.yaml               # Test all plugins together
├── testflow-core.yaml              # Test core plugin only
├── testflow-multisite.yaml         # Multisite testing
├── testflow-performance.yaml       # Performance testing
└── README.md                       # This file
```

## Key Features Demonstrated

### 🔧 Multiple Test Configurations

Different scenarios require different testing approaches:

- **`testflow-all.yaml`** - Tests all plugins working together
- **`testflow-core.yaml`** - Tests core plugin in isolation
- **`testflow-multisite.yaml`** - Tests in WordPress multisite environment
- **`testflow-performance.yaml`** - Performance and load testing

### 🧩 Plugin Pre-activation

TestFlow can automatically activate plugins before tests run:

```yaml
plugins:
  zips:
    - 'dist/core-plugin.zip'
    - 'dist/admin-plugin.zip'
    - 'dist/frontend-plugin.zip'
  preActivate: true
  activateList:
    - 'core-plugin'
    - 'admin-plugin'
    - 'frontend-plugin'
  skipActivation:
    - 'conflicting-plugin'
```

### 🎯 Selective Plugin Testing

Test specific plugin combinations:

```yaml
# Core + Admin only
plugins:
  zips:
    - 'dist/core-plugin.zip'
    - 'dist/admin-plugin.zip'
  activateList:
    - 'core-plugin'
    - 'admin-plugin'
  skipActivation:
    - 'frontend-plugin'
```

### 🌐 Comprehensive Matrix Testing

The workflow tests across multiple dimensions:

#### PHP Version Matrix
- PHP 8.3 (Latest)
- PHP 8.2 (Current)
- PHP 8.1 (Stable)
- PHP 8.0 (Supported)
- PHP 7.4 (Legacy, limited)

#### MySQL Version Matrix
- MySQL 8.0 (Recommended)
- MySQL 5.7 (Legacy)

#### WordPress Version Matrix
- Latest (Current release)
- 6.4, 6.3, 6.2, 6.1, 6.0 (Previous versions)

#### Plugin Combination Matrix
- All plugins active
- Core + Admin only
- Core + Frontend only
- Individual plugin testing
- Conflict resolution testing

## Test Categories

### 🚀 Smoke Tests
Quick validation tests that run on every push/PR:
- Basic plugin activation
- Core functionality verification
- Fast feedback loop

### 🔄 Compatibility Tests
Comprehensive compatibility matrix:
- Multiple PHP/MySQL/WordPress combinations
- Cross-version compatibility
- Legacy support verification

### ⚡ Performance Tests
Performance benchmarking and optimization:
- Page load time measurements
- Memory usage monitoring
- Database query performance
- Caching effectiveness

### 🔒 Security Tests
Security and vulnerability testing:
- SQL injection prevention
- XSS prevention
- Authentication testing
- Permission verification

### ♿ Accessibility Tests
Accessibility compliance testing:
- WCAG 2.1 compliance
- Screen reader compatibility
- Keyboard navigation

### 🌍 Cross-Browser Tests
Browser compatibility testing:
- Chrome, Firefox, Safari, Edge
- Mobile browser testing
- Progressive enhancement

## Usage Examples

### Running All Tests
```bash
# Trigger comprehensive testing
gh workflow run comprehensive-matrix.yml -f test_type=full

# Run only compatibility tests
gh workflow run comprehensive-matrix.yml -f test_type=compatibility

# Run performance tests with debug
gh workflow run comprehensive-matrix.yml -f test_type=performance -f debug=true
```

### Local Testing
```bash
# Test with all plugins
testflow run --config testflow-all.yaml

# Test core plugin only
testflow run --config testflow-core.yaml

# Test with specific PHP/WordPress versions
testflow run --config testflow-all.yaml --php 8.3 --wordpress latest

# Test multisite configuration
testflow run --config testflow-multisite.yaml
```

## Configuration Profiles

### Default Profile (testflow-all.yaml)
- **Purpose**: Standard testing with all plugins
- **Environment**: PHP 8.1, MySQL 8.0, WordPress latest
- **Plugins**: All plugins pre-activated
- **Workers**: 2 parallel workers
- **Timeout**: 45 seconds

### Core Profile (testflow-core.yaml)
- **Purpose**: Core plugin isolation testing
- **Environment**: PHP 8.1, MySQL 8.0, WordPress latest
- **Plugins**: Only core plugin activated
- **Pattern**: `**/*.core.test.js`, `**/*.basic.test.js`
- **Timeout**: 30 seconds

### Multisite Profile (testflow-multisite.yaml)
- **Purpose**: WordPress multisite testing
- **Environment**: PHP 8.1, MySQL 8.0, WordPress latest + Multisite
- **Plugins**: Network activation testing
- **Workers**: 1 (for stability)
- **Timeout**: 60 seconds

### Performance Profile (testflow-performance.yaml)
- **Purpose**: Performance and load testing
- **Environment**: PHP 8.3, MySQL 8.0, WordPress latest
- **Plugins**: All + caching plugins
- **Workers**: 4 (for load testing)
- **Timeout**: 90 seconds

## Matrix Strategy Examples

### Basic Compatibility Matrix
```yaml
strategy:
  matrix:
    include:
      - php: '8.3'
        mysql: '8.0'
        wordpress: 'latest'
        plugins: 'all'
      - php: '8.2'
        mysql: '8.0'
        wordpress: '6.4'
        plugins: 'core,admin'
      - php: '8.1'
        mysql: '5.7'
        wordpress: '6.3'
        plugins: 'core'
```

### Plugin Combination Matrix
```yaml
strategy:
  matrix:
    combination:
      - name: 'All Plugins'
        zips: 'dist/*.zip'
        activate: 'core-plugin,admin-plugin,frontend-plugin'
      - name: 'Core + Admin'
        zips: 'dist/core-plugin.zip,dist/admin-plugin.zip'
        activate: 'core-plugin,admin-plugin'
        skip: 'frontend-plugin'
```

### Environment Matrix
```yaml
strategy:
  matrix:
    environment:
      - name: 'Development'
        debug: true
        plugins: 'all'
        debug_plugins: 'query-monitor,debug-bar'
      - name: 'Production'
        debug: false
        plugins: 'core,admin,frontend'
        security_plugins: 'security-plugin'
```

## Test Result Aggregation

The workflow automatically generates comprehensive reports:

- **Test Summary**: Overview of all test categories
- **Performance Metrics**: Load times, memory usage, query counts
- **Security Scan Results**: Vulnerability reports
- **Coverage Reports**: Code coverage across test scenarios
- **Screenshots**: Visual regression testing artifacts

## Best Practices

### 1. Test Organization
- Group tests by functionality (`*.core.test.js`, `*.admin.test.js`)
- Use descriptive test names
- Include performance and security tests

### 2. Configuration Management
- Separate configs for different test scenarios
- Use environment-specific settings
- Document plugin dependencies

### 3. Matrix Optimization
- Use `fail-fast: false` for compatibility testing
- Set appropriate timeouts for different test types
- Use conditional execution for expensive tests

### 4. Plugin Management
- Pre-activate plugins when possible
- Test plugin combinations and conflicts
- Verify plugin compatibility across versions

### 5. Performance Monitoring
- Include baseline performance tests
- Monitor memory usage and query counts
- Test with realistic data sets

## Troubleshooting

### Common Issues

1. **Plugin Activation Failures**
   ```yaml
   # Solution: Use skipActivation for problematic plugins
   plugins:
     skipActivation:
       - 'problematic-plugin'
   ```

2. **Timeout Issues**
   ```yaml
   # Solution: Increase timeout for complex tests
   playwright:
     timeout: 60000
   ```

3. **Memory Issues**
   ```yaml
   # Solution: Reduce workers or test fewer plugins
   playwright:
     workers: 1
   ```

### Debug Mode
Enable debug mode for detailed logging:
```bash
testflow run --config testflow-all.yaml --debug
```

## Contributing

When adding new tests or configurations:
1. Follow the naming conventions
2. Update the matrix strategy if needed
3. Add appropriate test patterns
4. Document any new features

## Resources

- [TestFlow Documentation](../../README.md)
- [WordPress Plugin Development](https://developer.wordpress.org/plugins/)
- [Playwright Testing](https://playwright.dev/)
- [GitHub Actions Workflows](https://docs.github.com/en/actions) 