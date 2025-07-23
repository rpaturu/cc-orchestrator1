# Testing Documentation

This directory contains comprehensive testing strategies, test plans, and quality assurance documentation for the Sales Intelligence platform.

## 📋 Documents

### 🧪 [API Testing Guide](./api-testing-guide.md)
Comprehensive guide for testing all API endpoints:
- Interactive testing with `test-api` script
- Smoke tests, functionality tests, and performance tests
- Response validation and expected outputs
- Troubleshooting common issues
- Cache testing procedures

### 📊 [Data Quality Testing Strategy](./data-quality-testing-strategy.md)
Methodology for ensuring company data accuracy and reliability:
- **Tier 1**: Well-known companies (Shopify, Tesla, Microsoft)
- **Tier 2**: Mid-size companies (Zoom, Stripe, Canva)
- **Tier 3**: Smaller companies (Linear, Luma, Retool)
- **Tier 4**: Edge cases (Meta, X, ambiguous queries)

## 🎯 Testing Categories

### 🚀 **Smoke Tests**
Essential functionality verification:
- Health checks
- Basic company search
- Cache connectivity

### 🔍 **Functional Tests**
Core feature validation:
- Company lookup and enrichment
- Data quality across all tiers
- API response validation

### 📈 **Performance Tests**
System performance verification:
- Response time monitoring
- Cache hit rate analysis
- Load testing procedures

### 🛡️ **Security Tests**
Security and error handling:
- Input validation
- Error response handling
- API key management

## 🛠️ Testing Tools

### Primary Testing Tool
```bash
./test-api
```
Interactive menu-driven testing script with 17 different test options.

### Automated Testing
```bash
npm test                    # Unit tests
npm run test:integration    # Integration tests
```

### Testing Workflow

#### 1. **Pre-deployment Testing**
```bash
# Run full test suite
npm test

# Interactive API testing
./test-api
# Test options 1, 5, 7, 11 (smoke tests)
```

#### 2. **Post-deployment Verification**
```bash
# Verify deployment
./test-api
# Test options 1, 12, 13 (health and cache)

# Data quality testing
# Test Tier 1 companies (Shopify, Tesla, etc.)
```

#### 3. **Regular Quality Assurance**
- **Daily**: Smoke tests and cache monitoring
- **Weekly**: Full data quality testing across all tiers
- **Monthly**: Performance analysis and optimization review

## 📊 Testing Metrics

### Success Criteria
- **API Response Time**: < 2 seconds (uncached), < 500ms (cached)
- **Cache Hit Rate**: > 80% for company profiles
- **Data Quality**: > 90% accuracy for Tier 1 companies
- **Error Rate**: < 1% for valid requests

### Quality Thresholds
- **Tier 1 Companies**: 95%+ complete data expected
- **Tier 2 Companies**: 80%+ complete data expected
- **Tier 3 Companies**: 60%+ complete data expected
- **Tier 4 Companies**: Graceful handling of edge cases

## 🔗 Related Documentation

- [Operations Guide](../operations/) - Production monitoring
- [API Specifications](../api-specifications/) - Endpoint documentation
- [Architecture](../architecture/) - System design
- [Cache TTL Configuration](../architecture/cache-ttl-configuration.md) - Cache testing

---

*Comprehensive testing documentation to ensure system reliability and data quality.* 