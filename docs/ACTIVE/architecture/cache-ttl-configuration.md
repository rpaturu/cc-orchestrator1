# Cache TTL Configuration

## Overview

This document describes the Time-to-Live (TTL) configuration for different cache types in the Sales Intelligence system. The system uses a smart TTL strategy that optimizes storage costs and performance by assigning different lifespans to different types of cached data based on their reuse value and volatility.

## TTL Strategy Principles

### 🎯 **Design Goals**
- **Cost Optimization**: Aggressive cleanup of high-volume, low-value cache entries
- **Performance**: Longer retention for expensive-to-compute results
- **User Experience**: High cache hit rates for frequently accessed company data
- **Storage Efficiency**: Automatic cleanup prevents cache bloat

### 🔧 **Implementation**
- **DynamoDB TTL**: Automatic cleanup without performance impact
- **Type-Based TTL**: Each cache type gets optimized TTL based on its characteristics
- **Environment-Aware**: Different TTLs for development vs production

---

## Complete TTL Configuration

### 🔬 **Development Environment** 
*NODE_ENV === 'development' | Base TTL: 24 hours*

| Cache Type | TTL | Hours | Days | Purpose & Reasoning |
|------------|-----|-------|------|---------------------|
| **Raw External API Responses** |
| `SERP_API_RAW_RESPONSE` | **7 days** | 168h | 7d | Raw SerpAPI search responses - moderate retention for debugging |
| **Company Core Data** |
| `COMPANY_PROFILE` | **30 days** | 720h | 30d | Individual company profiles - maximum retention for reuse |
| `COMPANY_ENRICHMENT` | **30 days** | 720h | 30d | Company enrichment data - expensive to regenerate |
| `COMPANY_SEARCH` | **14 days** | 336h | 14d | Company search/lookup results - good reuse potential |
| **Analysis & Intelligence** |
| `COMPANY_OVERVIEW` | **30 days** | 720h | 30d | Company overview analysis - complex AI processing |
| `COMPANY_ANALYSIS` | **30 days** | 720h | 30d | Deep company analysis - very expensive to compute |
| `SALES_INTELLIGENCE_CACHE` | **30 days** | 720h | 30d | Sales intelligence results - high-value insights |
| **External API Lookups** |
| `SERP_API_COMPANY_LOOKUP` | **14 days** | 336h | 14d | SerpAPI company lookups - good for development testing |
| `SERP_API_COMPANY_ENRICHMENT` | **21 days** | 504h | 21d | SerpAPI enrichment results - valuable structured data |
| `GOOGLE_KNOWLEDGE_GRAPH_LOOKUP` | **14 days** | 336h | 14d | Google KG lookups - structured company data |
| `GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT` | **21 days** | 504h | 21d | Google KG enrichment - comprehensive metadata |
| **Feature Suggestions** |
| `COMPETITOR_ANALYSIS` | **21 days** | 504h | 21d | Competitor analysis results - evolving insights |
| `PRODUCT_SUGGESTIONS` | **21 days** | 504h | 21d | Product suggestion results - market intelligence |
| `DOMAIN_SUGGESTIONS` | **21 days** | 504h | 21d | Domain suggestion results - useful for testing |
| **Processing & Discovery** |
| `COMPANY_DISCOVERY` | **7 days** | 168h | 7d | Company discovery results - changes frequently |
| **Legacy Types** |
| `COMPANY_LOOKUP_LEGACY` | **3 days** | 72h | 3d | Legacy lookup cache - short TTL encourages migration |
| `COMPANY_ENRICHMENT_LEGACY` | **3 days** | 72h | 3d | Legacy enrichment cache - encourage migration |
| **Fallback** |
| `UNKNOWN` | **1 day** | 24h | 1d | Unknown cache types - conservative approach |

---

### 🚀 **Production Environment**
*NODE_ENV === 'production' | Base TTL: 1 hour*

| Cache Type | TTL | Hours | Purpose & Reasoning |
|------------|-----|-------|---------------------|
| **Raw External API Responses** |
| `SERP_API_RAW_RESPONSE` | **6 hours** | 6h | Aggressive cleanup - high volume, low long-term value |
| **Company Core Data** |
| `COMPANY_PROFILE` | **72 hours** | 72h | Maximum retention - high reuse value, stable data |
| `COMPANY_ENRICHMENT` | **72 hours** | 72h | High retention - expensive API calls and processing |
| `COMPANY_SEARCH` | **24 hours** | 24h | Daily refresh - good for same-day searches |
| **Analysis & Intelligence** |
| `COMPANY_OVERVIEW` | **48 hours** | 48h | Medium retention - expensive AI analysis |
| `COMPANY_ANALYSIS` | **48 hours** | 48h | Medium retention - complex computations |
| `SALES_INTELLIGENCE_CACHE` | **48 hours** | 48h | Medium retention - comprehensive intelligence |
| **External API Lookups** |
| `SERP_API_COMPANY_LOOKUP` | **24 hours** | 24h | Daily refresh - reasonable for API cost optimization |
| `SERP_API_COMPANY_ENRICHMENT` | **48 hours** | 48h | Medium retention - valuable structured data |
| `GOOGLE_KNOWLEDGE_GRAPH_LOOKUP` | **24 hours** | 24h | Daily refresh - Google API optimization |
| `GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT` | **48 hours** | 48h | Medium retention - rich metadata |
| **Feature Suggestions** |
| `COMPETITOR_ANALYSIS` | **36 hours** | 36h | Balanced retention - useful but evolving |
| `PRODUCT_SUGGESTIONS` | **36 hours** | 36h | Balanced retention - market intelligence |
| `DOMAIN_SUGGESTIONS` | **36 hours** | 36h | Balanced retention - reasonably stable |
| **Processing & Discovery** |
| `COMPANY_DISCOVERY` | **12 hours** | 12h | Short retention - changes frequently |
| **Legacy Types** |
| `COMPANY_LOOKUP_LEGACY` | **12 hours** | 12h | Short TTL - encourage migration to new system |
| `COMPANY_ENRICHMENT_LEGACY` | **12 hours** | 12h | Short TTL - encourage migration to new system |
| **Fallback** |
| `UNKNOWN` | **6 hours** | 6h | Conservative short TTL for safety |

---

## TTL Calculation Logic

### Implementation Details

```typescript
private calculateTTLByType(cacheType: CacheType): number {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Base TTL multipliers based on cache type characteristics
  const baseTTL = isDevelopment ? 24 : 1; // 24 hours dev, 1 hour prod as base
  
  switch (cacheType) {
    // Raw external API responses - shorter TTL
    case CacheType.SERP_API_RAW_RESPONSE:
      return baseTTL * (isDevelopment ? 7 : 6);
      
    // Company profiles - longer TTL (high reuse value)  
    case CacheType.COMPANY_PROFILE:
    case CacheType.COMPANY_ENRICHMENT:
      return baseTTL * (isDevelopment ? 30 : 72);
      
    // ... (see complete implementation in CacheService.ts)
  }
}
```

### TTL Categories

| **Category** | **Production TTL Range** | **Characteristics** |
|--------------|-------------------------|---------------------|
| **High Retention** | 48-72 hours | Expensive to generate, high reuse value |
| **Medium Retention** | 24-36 hours | Good reuse potential, moderate cost |
| **Low Retention** | 6-12 hours | High volume, frequent changes, or legacy |

---

## Cache Lifecycle Examples

### 🏢 **Popular Company Profile (e.g., "Shopify")**

```
Production Environment:
Day 1, 9:00 AM: User searches → Company profile cached (72h TTL)
Day 1, 2:00 PM: Another user searches → Cache hit! Instant response
Day 2, 10:00 AM: Third user searches → Cache hit! Instant response  
Day 3, 11:00 AM: Fourth user searches → Cache hit! Still valid
Day 4, 9:00 AM: Cache expires → Next search will refresh data
```

### 🔍 **Raw Search Data Cleanup**

```
Production Environment:
Hour 1: Search "Shopify" → Raw results cached (6h TTL)
Hour 3: Search "Shopify Inc" → Different query, new cache entry
Hour 7: Both raw caches expired → Storage freed automatically
```

### 📊 **Analysis Results**

```
Production Environment:
Day 1: Complex analysis generated → Cached for 48h
Day 2: Same analysis requested → Cache hit! No recomputation
Day 3: Cache expires → Next request triggers fresh analysis
```

---

## Storage Impact Analysis

### Before Optimization (Same TTL for all types)
```
Raw SerpAPI: 24 hours × 1000 entries = High storage cost
Company Profiles: 24 hours × 50 entries = Frequent re-computation waste
Analysis Results: 24 hours × 20 entries = Expensive re-computation
```

### After Optimization (Type-based TTL)
```
Raw SerpAPI: 6 hours × 250 entries = 75% storage reduction  
Company Profiles: 72 hours × 50 entries = 3x longer retention, better UX
Analysis Results: 48 hours × 20 entries = 2x longer retention, cost savings
```

### Expected Benefits
- **75% reduction** in raw cache storage costs
- **3x improvement** in company profile cache hit rates
- **Automatic cleanup** prevents manual cache management
- **Better user experience** through optimized retention of valuable data

---

## Monitoring & Maintenance

### Cache Statistics Tracking
The system provides comprehensive cache statistics including:
- TTL expiration analysis
- Cache hit/miss rates by type
- Storage usage by cache type
- Automatic cleanup verification

### Adjusting TTL Values
TTL values can be adjusted based on:
- **Usage patterns**: Monitor cache hit rates
- **Storage costs**: Adjust for cost optimization
- **API costs**: Balance API calls vs storage
- **User experience metrics**: Optimize for performance

### Development vs Production Considerations
- **Development**: Longer TTLs for easier debugging and testing
- **Production**: Optimized for cost, performance, and storage efficiency
- **Environment-specific**: Automatic detection via NODE_ENV

---

## Related Documentation

- [Cache Management Guide](../cache-management-guide.md)
- [Architecture Overview](./README.md)
- [API Endpoints](../api-specifications/README.md)

---

*Last Updated: 2024-07-18*
*Version: 1.0* 