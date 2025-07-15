/**
 * Development Configuration
 * 
 * Configuration settings for development environment
 * Now using intelligent caching instead of mock data
 */

export const developmentConfig = {
  // Development logging
  enableVerboseLogging: true,
  logCacheUsage: true,

  // API quotas (for development planning)
  quotaInfo: {
    googleSearch: {
      freeDaily: 100,
      costPer1000: 5.00,
      queriesPerSearch: 3 // Our optimized approach
    }
  },

  // Cache settings for development
  cacheSettings: {
    searchResultsTTL: 96 * 60 * 60, // 24 hours - longer cache to save API calls during development
    analysisTTL: 24 * 60 * 60, // 24 hours
    enableCacheLogs: true,
    // Note: Actual cache TTL is configured in index.ts (96 hours for development, 1 hour for production)
    developmentCacheTTL: 96, // hours - used in index.ts for development mode
  }
}; 