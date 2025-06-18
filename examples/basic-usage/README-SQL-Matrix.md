# SQL Files Matrix Testing with TestFlow

This guide demonstrates how to use SQL files as matrix arguments in TestFlow to pre-configure WordPress databases for different testing scenarios.

## Overview

TestFlow supports executing SQL files at different stages of the testing process to pre-configure WordPress with specific data states. This is particularly useful for:

- Testing plugins with different data configurations
- Simulating production environments
- Performance testing with large datasets
- Migration and compatibility testing
- User role and permission testing

## SQL File Execution Stages

SQL files can be executed at four different stages:

1. **`before-wordpress`** - Before WordPress installation
2. **`after-wordpress`** - After WordPress installation (default)
3. **`before-plugins`** - Before plugin installation and activation
4. **`after-plugins`** - After plugin installation and activation

## Basic SQL Configuration

```yaml
sql:
  files:
    - 'data/setup.sql'
    - 'data/test-users.sql'
  executeOrder: 'after-wordpress'
  continueOnError: false
```

## Matrix Configuration

### SQL Files Matrix

Test your plugin with different database states:

```yaml
matrix:
  sql_files:
    - []  # Clean WordPress installation
    - ['data/minimal.sql']
    - ['data/users.sql', 'data/content.sql']
    - ['data/ecommerce.sql']
    - ['data/performance-dataset.sql']
```

### Combined Matrix

Combine SQL files with plugin combinations and environments:

```yaml
matrix:
  sql_files:
    - ['data/minimal.sql']
    - ['data/full-dataset.sql']
  
  plugin_combinations:
    - ['core-plugin']
    - ['core-plugin', 'extension-plugin']
  
  environments:
    - name: 'Modern Environment'
      php: '8.3'
      mysql: '8.0'
      sql_files: ['data/modern.sql']
    - name: 'Legacy Environment'
      php: '7.4'
      mysql: '5.7'
      sql_files: ['data/legacy.sql']
```

## Usage Examples

### Command Line

```bash
# Run with specific SQL files
testflow run --sql-files setup.sql,users.sql,content.sql

# Run with SQL stage configuration
testflow run --sql-files data.sql --sql-stage after-plugins

# Run matrix with SQL files
testflow run --matrix

# Run specific matrix configuration
testflow run --matrix-index 2

# Execute SQL files directly
testflow sql execute --files setup.sql,data.sql --stage after-wordpress
```

### Matrix Management

```bash
# List available matrix configurations
testflow matrix list

# Show matrix details
testflow matrix list --config testflow-sql-matrix.yaml
```

## SQL File Examples

### User Data (`sql/users.sql`)
```sql
-- Create test users with different roles
INSERT INTO wp_users (user_login, user_pass, user_nicename, user_email, user_registered, user_status, display_name) VALUES
('editor_user', MD5('password123'), 'editor_user', 'editor@example.com', NOW(), 0, 'Editor User'),
('author_user', MD5('password123'), 'author_user', 'author@example.com', NOW(), 0, 'Author User'),
('subscriber_user', MD5('password123'), 'subscriber_user', 'subscriber@example.com', NOW(), 0, 'Subscriber User');

-- Assign user roles
INSERT INTO wp_usermeta (user_id, meta_key, meta_value) VALUES
((SELECT ID FROM wp_users WHERE user_login = 'editor_user'), 'wp_capabilities', 'a:1:{s:6:"editor";b:1;}'),
((SELECT ID FROM wp_users WHERE user_login = 'author_user'), 'wp_capabilities', 'a:1:{s:6:"author";b:1;}'),
((SELECT ID FROM wp_users WHERE user_login = 'subscriber_user'), 'wp_capabilities', 'a:1:{s:10:"subscriber";b:1;}');
```

### Content Data (`sql/content.sql`)
```sql
-- Create sample posts
INSERT INTO wp_posts (post_author, post_date, post_date_gmt, post_content, post_title, post_status, post_name, post_type) VALUES
(1, NOW(), UTC_TIMESTAMP(), 'This is a sample post for testing.', 'Sample Post 1', 'publish', 'sample-post-1', 'post'),
(1, NOW(), UTC_TIMESTAMP(), 'This is another sample post for testing.', 'Sample Post 2', 'publish', 'sample-post-2', 'post'),
(1, NOW(), UTC_TIMESTAMP(), 'This is a sample page for testing.', 'Sample Page', 'publish', 'sample-page', 'page');

-- Create sample categories
INSERT INTO wp_terms (name, slug, term_group) VALUES
('Technology', 'technology', 0),
('Business', 'business', 0),
('Lifestyle', 'lifestyle', 0);

INSERT INTO wp_term_taxonomy (term_id, taxonomy, description, parent, count) VALUES
((SELECT term_id FROM wp_terms WHERE slug = 'technology'), 'category', 'Technology related posts', 0, 1),
((SELECT term_id FROM wp_terms WHERE slug = 'business'), 'category', 'Business related posts', 0, 1),
((SELECT term_id FROM wp_terms WHERE slug = 'lifestyle'), 'category', 'Lifestyle related posts', 0, 1);
```

### E-commerce Data (`sql/ecommerce.sql`)
```sql
-- WooCommerce product data
INSERT INTO wp_posts (post_author, post_date, post_date_gmt, post_content, post_title, post_status, post_name, post_type) VALUES
(1, NOW(), UTC_TIMESTAMP(), 'High-quality product for testing.', 'Test Product 1', 'publish', 'test-product-1', 'product'),
(1, NOW(), UTC_TIMESTAMP(), 'Another great product for testing.', 'Test Product 2', 'publish', 'test-product-2', 'product');

-- Product meta data
INSERT INTO wp_postmeta (post_id, meta_key, meta_value) VALUES
((SELECT ID FROM wp_posts WHERE post_name = 'test-product-1'), '_price', '29.99'),
((SELECT ID FROM wp_posts WHERE post_name = 'test-product-1'), '_regular_price', '29.99'),
((SELECT ID FROM wp_posts WHERE post_name = 'test-product-1'), '_stock_status', 'instock'),
((SELECT ID FROM wp_posts WHERE post_name = 'test-product-2'), '_price', '49.99'),
((SELECT ID FROM wp_posts WHERE post_name = 'test-product-2'), '_regular_price', '49.99'),
((SELECT ID FROM wp_posts WHERE post_name = 'test-product-2'), '_stock_status', 'instock');
```

### Performance Data (`sql/performance.sql`)
```sql
-- Generate large dataset for performance testing
-- Create 1000 sample posts
INSERT INTO wp_posts (post_author, post_date, post_date_gmt, post_content, post_title, post_status, post_name, post_type)
SELECT 
    1,
    DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY),
    DATE_SUB(UTC_TIMESTAMP(), INTERVAL FLOOR(RAND() * 365) DAY),
    CONCAT('Performance test content for post ', n),
    CONCAT('Performance Test Post ', n),
    'publish',
    CONCAT('performance-post-', n),
    'post'
FROM (
    SELECT a.N + b.N * 10 + c.N * 100 + 1 n
    FROM 
        (SELECT 0 as N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 as N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
        (SELECT 0 as N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c
) numbers
WHERE n <= 1000;
```

## Testing Scenarios

### 1. Clean Installation Testing
```yaml
matrix:
  sql_files:
    - []  # No SQL files - clean WordPress
```
**Use Case**: Test plugin behavior on fresh WordPress installations.

### 2. User Role Testing
```yaml
matrix:
  sql_files:
    - ['sql/admin-users.sql']
    - ['sql/editor-users.sql']
    - ['sql/subscriber-users.sql']
    - ['sql/mixed-roles.sql']
```
**Use Case**: Test plugin functionality with different user roles and permissions.

### 3. Content Scenarios
```yaml
matrix:
  sql_files:
    - ['sql/empty-content.sql']
    - ['sql/minimal-content.sql']
    - ['sql/rich-content.sql']
    - ['sql/large-content.sql']
```
**Use Case**: Test plugin behavior with different amounts and types of content.

### 4. E-commerce Testing
```yaml
matrix:
  sql_files:
    - ['sql/woocommerce-empty.sql']
    - ['sql/woocommerce-products.sql']
    - ['sql/woocommerce-orders.sql']
    - ['sql/woocommerce-full.sql']
```
**Use Case**: Test e-commerce plugin integrations and functionality.

### 5. Performance Testing
```yaml
matrix:
  sql_files:
    - ['sql/small-dataset.sql']
    - ['sql/medium-dataset.sql']
    - ['sql/large-dataset.sql']
    - ['sql/huge-dataset.sql']
```
**Use Case**: Test plugin performance under different load conditions.

### 6. Migration Testing
```yaml
matrix:
  sql_files:
    - ['sql/wp-4x-data.sql']
    - ['sql/wp-5x-data.sql']
    - ['sql/wp-6x-data.sql']
    - ['sql/custom-schema.sql']
```
**Use Case**: Test plugin compatibility with different WordPress versions and schemas.

## Best Practices

### 1. SQL File Organization
```
sql/
├── setup/
│   ├── users.sql
│   ├── roles.sql
│   └── permissions.sql
├── content/
│   ├── posts.sql
│   ├── pages.sql
│   └── media.sql
├── ecommerce/
│   ├── products.sql
│   ├── orders.sql
│   └── customers.sql
└── performance/
    ├── small.sql
    ├── medium.sql
    └── large.sql
```

### 2. Error Handling
```yaml
sql:
  continueOnError: true  # Continue if SQL fails
  files:
    - 'sql/critical.sql'      # Must succeed
    - 'sql/optional.sql'      # Can fail
```

### 3. Conditional SQL
```sql
-- Use conditional statements for flexibility
INSERT IGNORE INTO wp_options (option_name, option_value) VALUES 
('test_option', 'test_value');

-- Check if table exists before operations
CREATE TABLE IF NOT EXISTS test_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data TEXT
);
```

### 4. Performance Considerations
- Keep SQL files focused and modular
- Use transactions for multiple related operations
- Consider file size for large datasets
- Use appropriate indexes for test data

### 5. Security
- Never include real production data
- Use placeholder data for sensitive information
- Sanitize any user input in SQL files
- Use parameterized queries when possible

## Troubleshooting

### Common Issues

1. **SQL Syntax Errors**
   ```bash
   # Test SQL files directly
   testflow sql execute --files problematic.sql --continue-on-error
   ```

2. **File Not Found**
   ```yaml
   sql:
     continueOnError: true  # Skip missing files
   ```

3. **Large File Performance**
   ```yaml
   sql:
     executeOrder: 'before-plugins'  # Execute before plugin overhead
   ```

### Debug Mode
```bash
# Run with debug to see SQL execution details
testflow run --debug --sql-files setup.sql
```

## GitHub Actions Integration

```yaml
name: SQL Matrix Testing

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        sql-scenario:
          - 'clean'
          - 'users'
          - 'content'
          - 'ecommerce'
          - 'performance'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup TestFlow
        run: npm install -g testflow
        
      - name: Run SQL Matrix Tests
        run: |
          case "${{ matrix.sql-scenario }}" in
            "clean")
              testflow run --sql-files ""
              ;;
            "users")
              testflow run --sql-files sql/users.sql
              ;;
            "content")
              testflow run --sql-files sql/content.sql,sql/media.sql
              ;;
            "ecommerce")
              testflow run --sql-files sql/woocommerce.sql,sql/products.sql
              ;;
            "performance")
              testflow run --sql-files sql/large-dataset.sql
              ;;
          esac
```

## Related Documentation

- [TestFlow Configuration](../../README.md)
- [Plugin Matrix Testing](../multi-plugin-repo/README.md)
- [WordPress Helpers](../../docs/wordpress-helpers.md)
- [Lando Integration](https://docs.lando.dev/wordpress/)

## Contributing

When adding new SQL matrix examples:

1. Keep SQL files modular and focused
2. Document the purpose and use case
3. Test with different WordPress versions
4. Consider performance implications
5. Follow security best practices 