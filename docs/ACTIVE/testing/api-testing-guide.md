# API Testing Guide

## Overview

This guide covers testing procedures for all Sales Intelligence API endpoints, including manual testing, automated testing, and quality assurance.

## Testing Tools

### Interactive Test Script
The primary testing tool is the included `test-api` script:

```bash
./test-api
```

### Menu Options

#### **Core Sales Intelligence APIs**
1. **Health Check** - Basic connectivity test
2. **Company Overview** - Async company overview generation
3. **Company Discovery** - Sales discovery insights
4. **Company Analysis** - Deep AI analysis
5. **Company Search** - Synchronous company search
6. **Request Status Check** - Async request monitoring

#### **Company Lookup APIs**
7. **Company Lookup/Search** - Company lookup with domain suggestions
8. **Company Enrichment** - Full company enrichment
9. **Product Suggestions** - Product recommendation testing
10. **Competitor Discovery** - Competitor analysis testing
11. **Vendor Context Enrichment** - Enhanced vendor intelligence

#### **Cache Management**
12. **Cache Statistics** - Cache performance monitoring
13. **Cache Types Summary** - Cache type analysis
14. **List Cache Entries** - Detailed cache inspection
15. **Inspect Cache Entry** - Individual cache entry examination
16. **Delete Cache Entry** - Selective cache removal
17. **Clear All Cache** - Complete cache reset

#### **Enhanced Data Sources**
18. **Multi-Source Data Collection** - Test news, jobs, LinkedIn, YouTube integration

## Test Categories

### 🚀 **Smoke Tests** (Essential functionality)
- Health Check (Option 1)
- Company Search (Option 5) 
- Cache Statistics (Option 11)

### 🔍 **Company Lookup Tests** (Core functionality)
- Company Lookup (Option 7)
- Company Enrichment (Option 8)
- Data Quality Testing (See [Data Quality Strategy](./data-quality-testing-strategy.md))

### 📊 **Analysis Tests** (AI functionality)
- Company Overview (Option 2)
- Company Discovery (Option 3)
- Company Analysis (Option 4)
- Vendor Context Enrichment (Option 11)

### 🔧 **Cache Tests** (Performance)
- Cache Statistics (Option 12)
- Cache Types Summary (Option 13)
- List Cache Entries (Option 14)
- Inspect Cache Entry (Option 15)
- TTL verification

### 🌐 **Enhanced Data Source Tests** (Multi-source integration)
- Multi-Source Data Collection (Option 18)
- Discrete cache validation
- Source attribution testing
- Performance impact assessment

## Data Quality Testing

### Company Tiers
Following the [Data Quality Testing Strategy](./data-quality-testing-strategy.md):

#### **Tier 1: Well-Known Companies**
Test with: Shopify, Slack, Tesla, Microsoft, Apple
- Expected: Complete data, high confidence
- Verify: Name, domain, industry, description, logo

#### **Tier 2: Mid-Size Companies**
Test with: Zoom, Stripe, Canva, Notion, Figma
- Expected: Good data coverage, medium confidence
- Verify: Basic company info, some enrichment

#### **Tier 3: Smaller Companies**
Test with: Linear, Luma, Retool, smaller startups
- Expected: Limited data, lower confidence
- Verify: Basic lookup success, graceful degradation

#### **Tier 4: Edge Cases**
Test with: Meta, X (Twitter), very new companies
- Expected: Complex disambiguation, varied results
- Verify: Proper handling of ambiguous queries

### Test Scenarios

#### **Happy Path Testing**
```bash
# Test successful company lookup
./test-api
# Select option 7 (Company Lookup)
# Enter: "Shopify"
# Verify: Returns company with domain shopify.com
```

#### **Cache Testing**
```bash
# Test cache hit behavior
./test-api
# Select option 7, search "Shopify" (first time - cache miss)
# Select option 7, search "Shopify" again (should be cache hit)
# Select option 12 to verify cache statistics
```

#### **Multi-Source Data Collection Testing**
```bash
# Test enhanced data source integration
./test-api
# Select option 18 (Multi-Source Data Collection)
# Enter: "Shopify" (or any target company)
# Verify: Discrete cache creation, source attribution, enhanced data
```

**What to validate:**
- **Discrete Caching**: Separate cache entries for organic, news, jobs, linkedin, youtube
- **TTL Strategy**: Different cache lifespans (news: 1h, jobs: 6h, linkedin: 12h, etc.)
- **Source Attribution**: Perplexity-style source references in vendor context
- **Data Enhancement**: Richer vendor intelligence compared to legacy format
- **Performance**: Parallel data collection efficiency

#### **Edge Case Testing**
```bash
# Test invalid inputs
./test-api
# Select option 7
# Enter: "xyz123invalid" (should return empty results gracefully)
# Enter: "a" (should handle short queries)
# Enter: "" (should handle empty queries)
```

### Expected Response Validation

#### **Company Lookup Response**
```json
{
  "companies": [
    {
      "name": "Shopify: The All-in-One Commerce Platform for Businesses",
      "domain": "shopify.com",
      "description": "...",
      "industry": "E-commerce",
      "sources": ["serp_api_knowledge"]
    }
  ],
  "total": 1,
  "query": "Shopify",
  "cached": false
}
```

#### **Cache Statistics Response**
```json
{
  "types": [
    {
      "type": "Company Search",
      "count": 5,
      "totalSize": 2048,
      "examples": ["sales_intel_abc123"]
    },
    {
      "type": "SerpAPI Raw Response", 
      "count": 3,
      "totalSize": 15000,
      "examples": ["serp_raw:shopify"]
    }
  ]
}
```

#### **Enhanced Vendor Context Response**
```json
{
  "vendorContext": {
    "enrichedCompanyData": {
      "name": "Shopify",
      "industry": "E-commerce",
      "description": "The one commerce platform behind it all..."
    },
    "coreProducts": [
      {"name": "Platform", "description": "E-commerce platform for online stores"},
      {"name": "POS", "description": "Point of sale system for retail"}
    ],
    "competitorInsights": [
      {
        "competitor": "Amazon",
        "relationship": "alternative",
        "known_issues": ["Limited branding control"],
        "why_we_win": "Better brand control"
      }
    ],
    "sourceMap": [
      {
        "url": "https://www.shopify.com/",
        "title": "Shopify: The All-in-One Commerce Platform",
        "source_type": "organic_result",
        "relevance_score": 0.9
      }
    ],
    "sourcedContent": {
      "enrichedCompanyData": {
        "industry": "E-commerce [1]",
        "description": "The one commerce platform behind it all... [1]"
      },
      "coreProducts": [
        {
          "name": "Platform [1][2]",
          "description": "E-commerce platform for online stores [1]",
          "sourceIds": [1, 2]
        }
      ]
    }
  }
}
```

## Performance Testing

### Response Time Expectations
- **Company Search**: < 2 seconds (cached: < 500ms)
- **Company Enrichment**: < 5 seconds (cached: < 1 second)
- **Cache Operations**: < 200ms

### Cache Hit Rate Monitoring
- **Target**: >80% cache hit rate for company profiles
- **Monitor**: Using cache statistics (Option 12)

## Automated Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Continuous Testing
Run automated tests on:
- Every deployment
- Daily scheduled runs
- Before major releases

## Troubleshooting

### Common Issues

#### **CORS Errors**
- **Symptom**: Frontend API calls failing
- **Solution**: Verify OPTIONS methods in API Gateway

#### **Empty Results**
- **Symptom**: Company lookup returns no results
- **Diagnosis**: Check cache for stale empty results
- **Solution**: Clear cache or check query validation

#### **Cache Issues**
- **Symptom**: Slow responses despite caching
- **Diagnosis**: Check TTL configuration
- **Solution**: Review [Cache TTL Configuration](../architecture/cache-ttl-configuration.md)

### Debugging Steps
1. Check API health (Option 1)
2. Verify cache statistics (Option 12)
3. Test with known good company (e.g., "Shopify")
4. Check CloudWatch logs for errors
5. Validate environment variables

## Test Data Management

### Test Companies
Maintain a list of reliable test companies:
- **Always Available**: Shopify, Microsoft, Apple
- **Good Coverage**: Tesla, Stripe, Zoom
- **Edge Cases**: Meta, X, very new companies

### Cache Management During Testing
- Clear cache before major test runs
- Monitor cache growth during testing
- Verify TTL behavior with time-based tests

---

## Related Documentation

- [Data Quality Testing Strategy](./data-quality-testing-strategy.md)
- [Cache TTL Configuration](../architecture/cache-ttl-configuration.md)
- [API Specifications](../api-specifications/README.md)

---

*Last Updated: 2024-07-18* 