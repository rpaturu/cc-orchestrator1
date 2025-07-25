/**
 * Centralized Cache Type Definitions
 * 
 * This file defines all standardized cache types used throughout the application.
 * All cache operations must use these predefined types for consistency and type safety.
 */

export enum CacheType {
  // Raw Data Cache Types
  SERP_ORGANIC_RAW = 'serp_organic_raw',
  SERP_NEWS_RAW = 'serp_news_raw',
  SERP_JOBS_RAW = 'serp_jobs_raw',
  SERP_LINKEDIN_RAW = 'serp_linkedin_raw',
  SERP_YOUTUBE_RAW = 'serp_youtube_raw',
  SERP_API_RAW_RESPONSE = 'serp_api_raw_response',
  GOOGLE_KNOWLEDGE_GRAPH_RAW = 'google_kg_raw',
  GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT = 'google_kg_enrichment',
  GOOGLE_KNOWLEDGE_GRAPH_LOOKUP = 'google_kg_lookup',
  BRIGHTDATA_RAW = 'brightdata_raw',
  SNOV_CONTACTS_RAW = 'snov_contacts_raw',
  SNOV_VERIFICATION_RAW = 'snov_verification_raw',
  APOLLO_CONTACTS_RAW = 'apollo_contacts_raw',

  // SerpAPI Specific Results
  SERP_API_COMPANY_ENRICHMENT = 'serp_api_company_enrichment',
  SERP_API_COMPANY_LOOKUP = 'serp_api_company_lookup',
  SERP_API_ORGANIC_RESULTS = 'serp_api_organic_results',
  SERP_API_NEWS_RESULTS = 'serp_api_news_results',
  SERP_API_JOBS_RESULTS = 'serp_api_jobs_results',
  SERP_API_LINKEDIN_RESULTS = 'serp_api_linkedin_results',
  SERP_API_YOUTUBE_RESULTS = 'serp_api_youtube_results',
  SERP_API_KNOWLEDGE_GRAPH = 'serp_api_knowledge_graph',

  // Processing Cache Types
  SALES_INTELLIGENCE_CACHE = 'sales_intelligence_cache',
  COMPANY_ENRICHMENT = 'company_enrichment',
  COMPANY_SEARCH = 'company_search',
  COMPANY_LOOKUP = 'company_lookup',
  DOMAIN_SUGGESTIONS = 'domain_suggestions',

  // Analysis Cache Types
  COMPANY_OVERVIEW = 'company_overview',
  COMPANY_DISCOVERY = 'company_discovery', 
  COMPANY_ANALYSIS = 'company_analysis',
  COMPETITOR_ANALYSIS = 'competitor_analysis',
  PRODUCT_SUGGESTIONS = 'product_suggestions',

  // Vendor Context Cache Types (NEW)
  VENDOR_CONTEXT_ENRICHMENT = 'vendor_context_enrichment',
  VENDOR_CONTEXT_PARSED = 'vendor_context_parsed',
  VENDOR_CONTEXT_ANALYSIS = 'vendor_context_analysis',
  VENDOR_CONTEXT_RAW_DATA = 'vendor_context_raw_data',
  VENDOR_CONTEXT_REFERENCE = 'vendor_context_reference',
  
  // Customer Intelligence Cache Types (NEW)
  CUSTOMER_INTELLIGENCE_RAW = 'customer_intelligence_raw',
  CUSTOMER_INTELLIGENCE_PARSED = 'customer_intelligence_parsed',
  CUSTOMER_INTELLIGENCE_ANALYSIS = 'customer_intelligence_analysis',
  CUSTOMER_INTELLIGENCE_ENRICHMENT = 'customer_intelligence_enrichment',
  
  // LLM Analysis Cache Types (NEW)
  LLM_ANALYSIS = 'llm_analysis',
  LLM_CUSTOMER_INTELLIGENCE = 'llm_customer_intelligence',
  LLM_RAW_RESPONSE = 'llm_raw_response',

  // Enhanced Enrichment Cache Types (NEW)
  BRIGHTDATA_COMPANY_ENRICHMENT = 'brightdata_company_enrichment',
  APOLLO_CONTACT_ENRICHMENT = 'apollo_contact_enrichment',
  ZOOMINFO_CONTACT_ENRICHMENT = 'zoominfo_contact_enrichment',
  CLEARBIT_COMPANY_ENRICHMENT = 'clearbit_company_enrichment',
  HUNTER_EMAIL_ENRICHMENT = 'hunter_email_enrichment',
  COMPANY_DATABASE_ENRICHMENT = 'company_database_enrichment',

  // Legacy Cache Types
  COMPANY_LOOKUP_LEGACY = 'company_lookup_legacy',
  COMPANY_ENRICHMENT_LEGACY = 'company_enrichment_legacy',

  // Request Tracking
  ASYNC_REQUEST_TRACKING = 'async_request_tracking',
  STEP_FUNCTION_EXECUTION = 'step_function_execution',
  
  // Profile Management
  USER_PROFILE = 'user_profile',
  ORGANIZATION_PROFILE = 'organization_profile',
  
  // Performance Monitoring
  PERFORMANCE_METRICS = 'performance_metrics',
  ERROR_TRACKING = 'error_tracking',
  USAGE_TRACKING = 'usage_tracking',

  // Fallback
  UNKNOWN = 'unknown'
}

// Human-readable display names for cache types
export const CACHE_TYPE_DISPLAY_NAMES: Record<CacheType, string> = {
  // Raw Data Types
  [CacheType.SERP_ORGANIC_RAW]: 'SerpAPI Organic Raw Data',
  [CacheType.SERP_NEWS_RAW]: 'SerpAPI News Raw Data',
  [CacheType.SERP_JOBS_RAW]: 'SerpAPI Jobs Raw Data',
  [CacheType.SERP_LINKEDIN_RAW]: 'SerpAPI LinkedIn Raw Data',
  [CacheType.SERP_YOUTUBE_RAW]: 'SerpAPI YouTube Raw Data',
  [CacheType.SERP_API_RAW_RESPONSE]: 'SerpAPI Raw Response',
  [CacheType.GOOGLE_KNOWLEDGE_GRAPH_RAW]: 'Google Knowledge Graph Raw',
  [CacheType.GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT]: 'Google Knowledge Graph Enrichment',
  [CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP]: 'Google Knowledge Graph Lookup',
  [CacheType.BRIGHTDATA_RAW]: 'BrightData Raw Response',
  [CacheType.SNOV_CONTACTS_RAW]: 'Snov.io Contacts Raw Data',
  [CacheType.SNOV_VERIFICATION_RAW]: 'Snov.io Verification Raw Data',
  [CacheType.APOLLO_CONTACTS_RAW]: 'Apollo Contacts Raw Data',

  // SerpAPI Specific Results
  [CacheType.SERP_API_COMPANY_ENRICHMENT]: 'SerpAPI Company Enrichment',
  [CacheType.SERP_API_COMPANY_LOOKUP]: 'SerpAPI Company Lookup',
  [CacheType.SERP_API_ORGANIC_RESULTS]: 'SerpAPI Organic Results',
  [CacheType.SERP_API_NEWS_RESULTS]: 'SerpAPI News Results',
  [CacheType.SERP_API_JOBS_RESULTS]: 'SerpAPI Jobs Results',
  [CacheType.SERP_API_LINKEDIN_RESULTS]: 'SerpAPI LinkedIn Results',
  [CacheType.SERP_API_YOUTUBE_RESULTS]: 'SerpAPI YouTube Results',
  [CacheType.SERP_API_KNOWLEDGE_GRAPH]: 'SerpAPI Knowledge Graph',

  // Processing Types
  [CacheType.SALES_INTELLIGENCE_CACHE]: 'Sales Intelligence Cache',
  [CacheType.COMPANY_ENRICHMENT]: 'Company Enrichment',
  [CacheType.COMPANY_SEARCH]: 'Company Search',
  [CacheType.COMPANY_LOOKUP]: 'Company Lookup',
  [CacheType.DOMAIN_SUGGESTIONS]: 'Domain Suggestions',

  // Analysis Types
  [CacheType.COMPANY_OVERVIEW]: 'Company Overview',
  [CacheType.COMPANY_DISCOVERY]: 'Company Discovery',
  [CacheType.COMPANY_ANALYSIS]: 'Company Analysis',
  [CacheType.COMPETITOR_ANALYSIS]: 'Competitor Analysis',
  [CacheType.PRODUCT_SUGGESTIONS]: 'Product Suggestions',

  // Vendor Context Types
  [CacheType.VENDOR_CONTEXT_ENRICHMENT]: 'Vendor Context Enrichment',
  [CacheType.VENDOR_CONTEXT_PARSED]: 'Vendor Context Parsed',
  [CacheType.VENDOR_CONTEXT_ANALYSIS]: 'Vendor Context Analysis',
  [CacheType.VENDOR_CONTEXT_RAW_DATA]: 'Vendor Context Raw Data',
  [CacheType.VENDOR_CONTEXT_REFERENCE]: 'Vendor Context Reference',

  // Customer Intelligence Types
  [CacheType.CUSTOMER_INTELLIGENCE_RAW]: 'Customer Intelligence Raw',
  [CacheType.CUSTOMER_INTELLIGENCE_PARSED]: 'Customer Intelligence Parsed',
  [CacheType.CUSTOMER_INTELLIGENCE_ANALYSIS]: 'Customer Intelligence Analysis',
  [CacheType.CUSTOMER_INTELLIGENCE_ENRICHMENT]: 'Customer Intelligence Enrichment',

  // LLM Analysis Types
  [CacheType.LLM_ANALYSIS]: 'LLM Analysis',
  [CacheType.LLM_CUSTOMER_INTELLIGENCE]: 'LLM Customer Intelligence',
  [CacheType.LLM_RAW_RESPONSE]: 'LLM Raw Response',

  // Enhanced Enrichment Types
  [CacheType.BRIGHTDATA_COMPANY_ENRICHMENT]: 'BrightData Company Enrichment',
  [CacheType.APOLLO_CONTACT_ENRICHMENT]: 'Apollo Contact Enrichment',
  [CacheType.ZOOMINFO_CONTACT_ENRICHMENT]: 'ZoomInfo Contact Enrichment',
  [CacheType.CLEARBIT_COMPANY_ENRICHMENT]: 'Clearbit Company Enrichment',
  [CacheType.HUNTER_EMAIL_ENRICHMENT]: 'Hunter Email Enrichment',
  [CacheType.COMPANY_DATABASE_ENRICHMENT]: 'Company Database Enrichment',

  // Legacy Types
  [CacheType.COMPANY_LOOKUP_LEGACY]: 'Company Lookup (Legacy)',
  [CacheType.COMPANY_ENRICHMENT_LEGACY]: 'Company Enrichment (Legacy)',

  // Request Tracking
  [CacheType.ASYNC_REQUEST_TRACKING]: 'Async Request Tracking',
  [CacheType.STEP_FUNCTION_EXECUTION]: 'Step Function Execution',

  // Profile Management
  [CacheType.USER_PROFILE]: 'User Profile',
  [CacheType.ORGANIZATION_PROFILE]: 'Organization Profile',

  // Performance Monitoring
  [CacheType.PERFORMANCE_METRICS]: 'Performance Metrics',
  [CacheType.ERROR_TRACKING]: 'Error Tracking',
  [CacheType.USAGE_TRACKING]: 'Usage Tracking',

  // Fallback
  [CacheType.UNKNOWN]: 'Unknown Cache Type'
};

// Cache type groupings for management and analysis
export const CACHE_TYPE_GROUPS = {
  serp_api: [
    CacheType.SERP_API_RAW_RESPONSE,
    CacheType.SERP_API_COMPANY_ENRICHMENT,
    CacheType.SERP_API_COMPANY_LOOKUP,
    CacheType.SERP_API_ORGANIC_RESULTS,
    CacheType.SERP_API_NEWS_RESULTS,
    CacheType.SERP_API_JOBS_RESULTS,
    CacheType.SERP_API_LINKEDIN_RESULTS,
    CacheType.SERP_API_YOUTUBE_RESULTS,
    CacheType.SERP_API_KNOWLEDGE_GRAPH
  ],
  raw_data: [
    CacheType.SERP_NEWS_RAW,
    CacheType.SERP_JOBS_RAW,
    CacheType.SERP_LINKEDIN_RAW,
    CacheType.SERP_YOUTUBE_RAW,
    CacheType.SERP_ORGANIC_RAW,
    CacheType.BRIGHTDATA_RAW,
    CacheType.SNOV_CONTACTS_RAW,
    CacheType.SNOV_VERIFICATION_RAW,
    CacheType.APOLLO_CONTACTS_RAW
  ],
  google_services: [
    CacheType.GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT,
    CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP
  ],
  company_processing: [
    CacheType.COMPANY_ENRICHMENT,
    CacheType.COMPANY_SEARCH,
    CacheType.DOMAIN_SUGGESTIONS
  ],
  analysis: [
    CacheType.COMPANY_OVERVIEW,
    CacheType.COMPANY_DISCOVERY,
    CacheType.COMPANY_ANALYSIS,
    CacheType.COMPETITOR_ANALYSIS,
    CacheType.PRODUCT_SUGGESTIONS
  ],
  vendor_context: [
    CacheType.VENDOR_CONTEXT_ENRICHMENT,
    CacheType.VENDOR_CONTEXT_PARSED,
    CacheType.VENDOR_CONTEXT_ANALYSIS,
    CacheType.VENDOR_CONTEXT_RAW_DATA,
    CacheType.VENDOR_CONTEXT_REFERENCE
  ],
  customer_intelligence: [
    CacheType.CUSTOMER_INTELLIGENCE_RAW,
    CacheType.CUSTOMER_INTELLIGENCE_PARSED,
    CacheType.CUSTOMER_INTELLIGENCE_ANALYSIS,
    CacheType.CUSTOMER_INTELLIGENCE_ENRICHMENT
  ],
  llm_analysis: [
    CacheType.LLM_ANALYSIS,
    CacheType.LLM_CUSTOMER_INTELLIGENCE
  ],
  legacy: [
    CacheType.COMPANY_LOOKUP_LEGACY,
    CacheType.COMPANY_ENRICHMENT_LEGACY
  ]
};

/**
 * NEW: Base cache entry interface - all cached data extends this
 */
export interface BaseCacheEntry {
  cacheKey: string;
  cacheType: CacheType;
  createdAt: string;
  expiresAt: string;
  lastAccessed: string;
  accessCount: number;
  dataSize: number;
}

/**
 * NEW: Raw API response cache entry
 */
export interface RawApiCacheEntry extends BaseCacheEntry {
  companyName: string;
  source: string;
  apiEndpoint: string;
  rawResponse: any;                    // The actual API response
  requestParams: Record<string, any>;  // Parameters used for the request
  apiCost: number;
  responseTime: number;
  firstRequester: string;              // Which consumer first requested this data
  requestCount: number;                // How many times this data has been requested
}

/**
 * NEW: Processed data cache entry (for enriched/analyzed content)
 */
export interface ProcessedCacheEntry extends BaseCacheEntry {
  companyName: string;
  processor: string;                   // Which service processed this data
  sourceData: string[];               // Keys of raw data used as input
  processingCost: number;              // Cost to process (e.g., LLM costs)
  confidence: number;                  // Processing confidence score
  version: string;                     // Processing version for invalidation
}

/**
 * NEW: Content Analysis cache entry (for sales intelligence)
 */
export interface ContentAnalysisCacheEntry extends ProcessedCacheEntry {
  insights: any;                       // Sales insights data
  sources: any[];                      // Authoritative sources
  confidenceScore: number;
  totalSources: number;
  citationMap: Record<string, number[]>;
}

/**
 * NEW: Vendor Context cache entry
 */
export interface VendorContextCacheEntry extends ProcessedCacheEntry {
  vendorContext: {
    enrichedCompanyData: any;
    coreProducts: any[];
    competitorInsights: any[];
    marketPosition: any;
    businessIntelligence: any;
  };
  costAttribution: {
    profile: number;
    vendor_context: number;
    customer_intelligence: number;
    test: number;
  };
  dataSourcesUsed: string[];
}

/**
 * Union type for all possible cache entry types
 */
export type CacheEntry = 
  | RawApiCacheEntry 
  | ProcessedCacheEntry 
  | ContentAnalysisCacheEntry 
  | VendorContextCacheEntry;

/**
 * Helper to determine cache entry type from CacheType enum
 */
export function getCacheEntryType(cacheType: CacheType): 'raw' | 'processed' | 'content_analysis' | 'vendor_context' {
  if (CACHE_TYPE_GROUPS.raw_data.includes(cacheType)) {
    return 'raw';
  }
  
  if (cacheType === CacheType.VENDOR_CONTEXT_ENRICHMENT || cacheType === CacheType.VENDOR_CONTEXT_PARSED ||
      cacheType === CacheType.VENDOR_CONTEXT_ANALYSIS || cacheType === CacheType.VENDOR_CONTEXT_RAW_DATA ||
      cacheType === CacheType.VENDOR_CONTEXT_REFERENCE) {
    return 'vendor_context';
  }
  
  if (cacheType === CacheType.SALES_INTELLIGENCE_CACHE || 
      cacheType === CacheType.COMPANY_ANALYSIS ||
      cacheType === CacheType.LLM_ANALYSIS || cacheType === CacheType.LLM_CUSTOMER_INTELLIGENCE) {
    return 'content_analysis';
  }
  
  return 'processed';
}

/**
 * Infer cache type from legacy key pattern (for migration only)
 * @deprecated Use explicit CacheType enum values instead
 */
export function inferCacheTypeFromKeyPattern(key: string): CacheType {
  // Multi-source raw data patterns (NEW)
  if (key.startsWith('serp_organic_raw:')) return CacheType.SERP_ORGANIC_RAW;
  if (key.startsWith('serp_news_raw:')) return CacheType.SERP_NEWS_RAW;
  if (key.startsWith('serp_jobs_raw:')) return CacheType.SERP_JOBS_RAW;
  if (key.startsWith('serp_linkedin_raw:')) return CacheType.SERP_LINKEDIN_RAW;
  if (key.startsWith('serp_youtube_raw:')) return CacheType.SERP_YOUTUBE_RAW;
  if (key.startsWith('brightdata_raw:')) return CacheType.BRIGHTDATA_RAW;
  if (key.startsWith('snov_contacts_raw:')) return CacheType.SNOV_CONTACTS_RAW;
  if (key.startsWith('snov_verification_raw:')) return CacheType.SNOV_VERIFICATION_RAW;
  if (key.startsWith('apollo_contacts_raw:')) return CacheType.APOLLO_CONTACTS_RAW;
  
  // SerpAPI patterns
  if (key.startsWith('serp_raw:')) return CacheType.SERP_API_RAW_RESPONSE;
  if (key.startsWith('serp_enrichment:')) return CacheType.SERP_API_COMPANY_ENRICHMENT;
  if (key.startsWith('serp_lookup:')) return CacheType.SERP_API_COMPANY_LOOKUP;
  
  // Google Knowledge Graph patterns  
  if (key.startsWith('gkg_enrichment:')) return CacheType.GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT;
  if (key.startsWith('gkg_lookup:')) return CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP;
  
  // Company processing patterns
  if (key.startsWith('enrichment:')) return CacheType.COMPANY_ENRICHMENT;
  if (key.startsWith('overview:')) return CacheType.COMPANY_OVERVIEW;
  if (key.startsWith('discovery:')) return CacheType.COMPANY_DISCOVERY;
  if (key.startsWith('analysis:')) return CacheType.COMPANY_ANALYSIS;
  if (key.startsWith('search:')) return CacheType.COMPANY_SEARCH;
  
  // Hash-based cache keys from CompanyExtractor
  if (key.startsWith('sales_intel_')) return CacheType.SALES_INTELLIGENCE_CACHE;
  
  // Legacy patterns
  if (key.startsWith('lookup:')) return CacheType.COMPANY_LOOKUP_LEGACY;
  if (key.startsWith('enrich:')) return CacheType.COMPANY_ENRICHMENT_LEGACY;
  
  // Vendor context patterns
  if (key.startsWith('vendor_context:')) return CacheType.VENDOR_CONTEXT_ENRICHMENT;
  if (key.startsWith('vendor_parsed:')) return CacheType.VENDOR_CONTEXT_PARSED;
  if (key.startsWith('vendor_analysis:')) return CacheType.VENDOR_CONTEXT_ANALYSIS;
  if (key.startsWith('vendor_raw_data:')) return CacheType.VENDOR_CONTEXT_RAW_DATA;
  if (key.startsWith('vendor_reference:')) return CacheType.VENDOR_CONTEXT_REFERENCE;
  
  // Customer Intelligence patterns
  if (key.startsWith('customer_intelligence_raw:')) return CacheType.CUSTOMER_INTELLIGENCE_RAW;
  if (key.startsWith('customer_intelligence_parsed:')) return CacheType.CUSTOMER_INTELLIGENCE_PARSED;
  if (key.startsWith('customer_intelligence_analysis:')) return CacheType.CUSTOMER_INTELLIGENCE_ANALYSIS;
  if (key.startsWith('customer_intelligence_enrichment:')) return CacheType.CUSTOMER_INTELLIGENCE_ENRICHMENT;

  // LLM Analysis patterns
  if (key.startsWith('llm_analysis:')) return CacheType.LLM_ANALYSIS;
  if (key.startsWith('llm_customer_intelligence:')) return CacheType.LLM_CUSTOMER_INTELLIGENCE;
  if (key.startsWith('llm_raw_response:')) return CacheType.LLM_RAW_RESPONSE;
  
  // Specific feature patterns
  if (key.includes('competitor')) return CacheType.COMPETITOR_ANALYSIS;
  if (key.includes('product')) return CacheType.PRODUCT_SUGGESTIONS;
  if (key.includes('domain')) return CacheType.DOMAIN_SUGGESTIONS;
  
  return CacheType.UNKNOWN;
} 