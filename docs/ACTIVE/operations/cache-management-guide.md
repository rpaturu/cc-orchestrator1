# Advanced Cache Management Guide

## Overview

The sales intelligence platform now includes comprehensive cache management capabilities for development and debugging. This allows developers to inspect, manage, and selectively clear cache entries during development.

### **🚀 Major Architectural Improvement**

**Standardized Cache Type System**: The system now uses a centralized enum-based cache type system that provides:

#### **1. Explicit Cache Type Attributes**
- **DynamoDB Storage**: `cacheType` attribute stored explicitly in each cache entry
- **Type Safety**: TypeScript enum prevents typos and ensures consistency
- **Performance**: Direct attribute access instead of pattern matching
- **Analytics**: GSI on `cacheType` for efficient type-based queries

#### **2. Centralized Type Management**
- **Standardized Enum**: All cache types defined in `src/types/cache-types.ts`
- **Display Names**: Human-readable names for UI/reporting
- **Categories**: Grouped by purpose (external_api, processing, analysis, legacy)
- **Migration Support**: Automatic migration of existing cache entries

#### **3. Benefits**
- **🚀 Performance**: No more regex scanning - direct attribute lookup
- **🛡️ Type Safety**: Compile-time validation of cache types
- **🔧 Maintainability**: Add new types without touching inference logic
- **📊 Analytics**: Rich categorization and filtering capabilities
- **🎯 Consistency**: Same cache types used across all services

## Cache Types

The system uses **standardized cache types** defined in TypeScript enums for reliable categorization:

### **External API Cache Types**
- **`serp_api_raw_response`** - Raw JSON responses from SerpAPI
- **`serp_api_company_enrichment`** - Processed SerpAPI company enrichment data  
- **`serp_api_company_lookup`** - SerpAPI company lookup/autocomplete results
- **`google_knowledge_graph_enrichment`** - Google Knowledge Graph enrichment data
- **`google_knowledge_graph_lookup`** - Google Knowledge Graph company lookup

### **Processing Cache Types**
- **`sales_intelligence_cache`** - Hash-based cache keys from CompanyExtractor
- **`company_enrichment`** - General company enrichment data
- **`company_search`** - Company search results
- **`domain_suggestions`** - Domain suggestion data

### **Analysis Cache Types**  
- **`company_overview`** - Company overview analysis
- **`company_discovery`** - Company discovery results
- **`company_analysis`** - Detailed company analysis
- **`competitor_analysis`** - Competitor discovery data
- **`product_suggestions`** - Product recommendation data

### **Legacy Cache Types**
- **`company_lookup_legacy`** - Legacy company lookup data
- **`company_enrichment_legacy`** - Legacy enrichment data

### **Type Definition**
All cache types are defined in `src/types/cache-types.ts`:
```typescript
export enum CacheType {
  SERP_API_RAW_RESPONSE = 'serp_api_raw_response',
  SERP_API_COMPANY_ENRICHMENT = 'serp_api_company_enrichment',
  // ... etc
}
```

## API Endpoints

### 1. Cache Statistics
```bash
GET /cache/stats
```
Returns comprehensive cache analytics:
```json
{
  "stats": {
    "overview": {
      "totalEntries": 156,
      "totalSizeBytes": 2847392,
      "averageEntrySize": 18252,
      "maxSize": 10000
    },
    "byType": [
      {
        "type": "SerpAPI Company Enrichment",
        "count": 45,
        "totalSizeBytes": 1523840,
        "averageSizeBytes": 33863,
        "percentage": 29
      },
      {
        "type": "SerpAPI Raw Response",
        "count": 38,
        "totalSizeBytes": 892156,
        "averageSizeBytes": 23478,
        "percentage": 24
      }
    ],
    "expiration": {
      "expired": 3,
      "expiringIn1Hour": 0,
      "expiringIn24Hours": 12,
      "validEntries": 153
    },
    "recent": [
      {
        "key": "serp_enrichment:tesla",
        "type": "SerpAPI Company Enrichment",
        "createdAt": "2024-01-13T15:30:45Z",
        "sizeBytes": 15432
      }
    ],
    "largest": [
      {
        "key": "serp_raw:microsoft_corporation_detailed",
        "type": "SerpAPI Raw Response",
        "sizeBytes": 87234,
        "createdAt": "2024-01-13T14:20:15Z"
      }
    ]
  }
}
```

### 2. Cache Types Summary
```bash
GET /cache/types
```
Returns detailed breakdown by cache type:
```json
{
  "types": [
    {
      "type": "SerpAPI Company Enrichment",
      "count": 45,
      "totalSize": 2847392,
      "examples": [
        "serp_enrich:Tesla",
        "serp_enrich:Apple Inc",
        "serp_enrich:Microsoft"
      ]
    }
  ],
  "totalEntries": 156
}
```

### 3. List Cache Entries
```bash
GET /cache/list?pattern=serp_*&limit=20
```

Query parameters:
- `pattern` (optional) - Filter by pattern (supports wildcards with *)
- `limit` (optional) - Number of results to return (default: 50)

Returns:
```json
{
  "keys": [
    {
      "key": "serp_enrich:Tesla",
      "type": "SerpAPI Company Enrichment",
      "size": 15432,
      "ttl": 1705123456,
      "createdAt": "2024-01-13T10:30:45Z"
    }
  ],
  "total": 45,
  "filtered": true
}
```

### 4. Inspect Cache Entry
```bash
GET /cache/inspect/{cacheKey}
```

Returns complete cache entry with metadata:
```json
{
  "key": "serp_enrich:Tesla",
  "type": "SerpAPI Company Enrichment",
  "data": {
    "companyName": "Tesla",
    "domain": "tesla.com",
    "enrichmentResult": { /* full data */ }
  },
  "metadata": {
    "size": 15432,
    "ttl": 1705123456,
    "createdAt": "2024-01-13T10:30:45Z",
    "expiresAt": "2024-02-12T10:30:45Z"
  }
}
```

### 5. Delete Cache Entry
```bash
DELETE /cache/delete/{cacheKey}
```

Removes a specific cache entry.

### 6. Clear All Cache
```bash
POST /cache/clear
```

Removes all cache entries (use with caution).

## Using the Test Script

The enhanced `test-api` script includes an interactive cache management menu:

```bash
./test-api
```

### Cache Management Options:

- **11) Cache Statistics** - View overall cache metrics
- **12) Cache Types Summary** - See breakdown by cache type
- **13) List Cache Entries** - Browse cache with filtering options
- **14) Inspect Cache Entry** - View specific cache entry details
- **15) Delete Cache Entry** - Remove specific cache entry
- **16) Clear All Cache** - Remove all cache entries

### Example Workflows

#### 1. Debug SerpAPI Integration
```bash
# List all SerpAPI raw responses
Pattern: serp_raw*
Limit: 10

# Inspect a specific raw response
Cache key: serp_raw:Tesla

# Delete problematic cache entry
Cache key: serp_raw:Tesla
```

#### 2. Analyze Cache Performance
```bash
# View comprehensive cache statistics
Option 11

# Review breakdown by type, size usage, expiration status
# See recent entries and largest cache consumers
# Identify which cache types use most memory

# Then drill into specific types
Option 13: List Cache Entries
Pattern: serp_enrichment*
Limit: 50
```

#### 3. Clear Selective Cache During Testing
```bash
# Clear only raw responses (to force fresh API calls)
Pattern: serp_raw*
# Delete each key individually, or clear all cache

# Keep processed enrichment data
Pattern: serp_enrich*
# Review but don't delete
```

## Development Best Practices

### Cache Key Patterns

1. **Always use descriptive prefixes**:
   - `serp_raw:` for raw API responses
   - `serp_enrich:` for processed enrichment data
   - `serp_lookup:` for lookup results

2. **Include relevant parameters**:
   - `serp_lookup:tesla:limit_5` for parameterized lookups
   - `overview:tesla.com:detailed` for different analysis levels

3. **Use consistent naming**:
   - Lowercase company names
   - Underscores for parameters
   - Colons as separators

### Interpreting Cache Statistics

The enhanced cache statistics provide actionable insights:

#### **Overview Section**
- **Total Entries**: Number of cached items
- **Total Size**: Memory usage in bytes/KB  
- **Average Entry Size**: Helps identify if entries are too large
- **Max Capacity**: DynamoDB theoretical limit

#### **By Type Section**
- **Count**: How many entries of each type
- **Percentage**: Distribution of cache usage
- **Total/Average Size**: Which types consume most memory
- Use this to identify cache hotspots and optimization opportunities

#### **Expiration Section**
- **Expired**: Old entries that should be cleaned up
- **Expiring Soon**: Entries about to expire (may cause API spikes)
- **Valid Entries**: Current usable cache
- Use this to predict when fresh API calls will be needed

#### **Recent Entries**
- See what's being cached most recently
- Identify new patterns or unexpected cache usage
- Verify cache keys are being generated correctly

#### **Largest Entries**
- Find memory-heavy cache entries
- Candidates for compression or data reduction
- May indicate overly verbose API responses

### Cache Debugging Tips

1. **Start with cache statistics** to understand overall cache health
2. **Check by-type breakdown** to identify problematic cache categories
3. **Monitor expiration status** to predict API load spikes
4. **Inspect largest entries** if memory usage is high
5. **Review recent entries** to verify cache key patterns
6. **Use pattern filtering** to focus on specific components after initial analysis

### Performance Considerations

- **List operations** scan the entire cache - use filters to reduce load
- **Inspect operations** are lightweight for individual entries
- **Pattern matching** uses regex - simple patterns perform better
- **Large cache entries** may take time to serialize in inspect calls

## Environment Differences

### Development (NODE_ENV=development)
- Cache TTL: 30 days (720 hours)
- All cache management endpoints available
- Detailed logging enabled

### Production (NODE_ENV=production)
- Cache TTL: 24 hours
- Cache management endpoints require API key
- Reduced logging for performance

## Security Notes

- All cache management endpoints require API key authentication
- Cache data may contain sensitive company information
- Use cache clearing judiciously in shared development environments
- Inspect operations show full data - be careful with logs

## Migration

### **Migrating Existing Cache Entries**

To add `cacheType` attributes to existing cache entries, use the migration script:

```bash
# Dry run (see what would be changed without making changes)
npm run cache:migrate:dry-run

# Apply the migration
npm run cache:migrate
```

The migration script:
- Scans all existing cache entries in DynamoDB
- Infers cache types from key patterns using the same logic as the fallback
- Adds the `cacheType` attribute to entries that don't have it
- Provides detailed statistics on cache type distribution
- Supports dry-run mode for safe testing

#### **Migration Output Example**
```
🚀 Starting cache type migration...
📊 Found 5 cache entries

🔄 sales_intel_4gxilh → sales_intelligence_cache
🔄 gkg_enrichment:tesla → google_knowledge_graph_enrichment
🔄 gkg_lookup:tesla:3 → google_knowledge_graph_lookup

📈 Migration Summary:
   Total entries: 5
   Updated: 5
   Skipped (already had type): 0

📊 Cache Type Distribution:
   sales_intelligence_cache: 3 entries
   google_knowledge_graph_enrichment: 1 entries  
   google_knowledge_graph_lookup: 1 entries

✅ Migration completed successfully!
```

### **Environment Variables**
- `CACHE_TABLE_NAME` - DynamoDB table name (default: `sales-intelligence-cache`)
- `AWS_REGION` - AWS region (default: `us-west-2`)  
- `DRY_RUN` - Set to `true` for dry run mode

## Future Enhancements

Planned improvements for cache management:

1. **Advanced analytics** - Category-based cache analysis using the new type system
2. **Automated cleanup** - Remove entries by type and age
3. **Cache warming** - Pre-populate cache with common queries by type
4. **Usage analytics** - Track cache hit/miss rates by type and category
5. **Export/import** - Save and restore cache states with type metadata
6. **Real-time monitoring** - WebSocket updates for cache changes with type filtering 