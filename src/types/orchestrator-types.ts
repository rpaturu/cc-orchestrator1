/**
 * Type definitions for DataSourceOrchestrator
 * Supports multi-consumer raw data architecture with cost optimization
 */

export interface DataCollectionPlan {
  companyName: string;
  requester: ConsumerType;
  toCollect: SourceType[];      // Sources that need API calls
  fromCache: SourceType[];      // Sources available from cache
  estimatedCost: number;        // Total API cost needed
  estimatedDuration: number;    // Estimated time in milliseconds
  cacheSavings: number;         // Money saved from existing cache
  costsAttribution: {           // Which consumer originally paid for cached data
    profile: number;
    vendor_context: number;
    customer_intelligence: number;
    test: number;
  };
}

export interface RawDataAvailability {
  [source: string]: {
    cached: boolean;
    age: number | null;          // Age in milliseconds
    expired: boolean;
    cost: number;               // Original API cost
    originalRequester: string;  // Who originally collected this data
    cacheKey: string;           // The actual cache key used
    responseSize?: number;      // Size of cached response
    lastAccessed?: string;      // When last accessed
  };
}

export interface MultiSourceData {
  organic?: SerpOrganicResponse;
  news?: SerpNewsResponse;
  jobs?: SerpJobsResponse;
  linkedin?: SerpLinkedInResponse;
  youtube?: SerpYouTubeResponse;
  brightdata?: BrightDataResponse;
  totalNewCost: number;         // Cost of new API calls made
  totalCacheSavings: number;    // Money saved from cache hits
  cacheHits: number;            // Number of cache hits
  newApiCalls: number;          // Number of new API calls made
  cacheAttribution: {           // Cost attribution to original requesters
    profile: number;
    vendor_enrichment: number;
    customer_enrichment: number;
  };
  collectionDuration: number;   // Total time to collect all data
  dataQuality: {                // Quality metrics for collected data
    completeness: number;       // 0-1 score of data completeness
    freshness: number;          // 0-1 score of data freshness
    reliability: number;        // 0-1 score of source reliability
  };
}

export interface RawDataResult {
  source: 'cache' | 'api';
  data: any;                    // The actual response data
  cost: number;                 // Cost of this specific data
  duration: number;             // Time to retrieve this data
  cacheAge?: number;            // Age of cached data (if from cache)
  originalRequester?: string;   // Who originally paid for this data
}

export interface CollectionMetrics {
  totalRequests: number;
  cacheHits: number;
  apiCalls: number;
  totalCost: number;
  totalSavings: number;
  averageResponseTime: number;
  requestsByConsumer: Record<ConsumerType, number>;
  costsByConsumer: Record<ConsumerType, number>;
  savingsByConsumer: Record<ConsumerType, number>;
}

// Consumer and Source Type Definitions
export type ConsumerType = 'profile' | 'vendor_context' | 'customer_intelligence' | 'test';

export type SourceType = 
  | 'serp_organic' 
  | 'serp_news' 
  | 'serp_jobs' 
  | 'serp_linkedin' 
  | 'serp_youtube' 
  | 'serp_api'
  | 'brightdata' 
  | 'bright_data'
  | 'snov_contacts'
  | 'apollo_contacts'
  | 'apollo'
  | 'zoominfo'
  | 'clearbit'
  | 'hunter'
  | 'company_db';

// SerpAPI Response Types (Enhanced)
export interface SerpOrganicResponse {
  organic_results?: Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
    sourceDomain?: string;
    date?: string;
  }>;
  related_questions?: Array<{
    question: string;
    snippet: string;
    link?: string;
  }>;
  discussions_and_forums?: Array<{
    title: string;
    link: string;
    snippet: string;
    date?: string;
  }>;
  knowledge_graph?: {
    title?: string;
    description?: string;
    website?: string;
    images?: Array<{ url: string }>;
    founded?: string;
    headquarters?: string;
    subsidiaries?: string[];
    parent_company?: string;
  };
  related_searches?: string[];
}

export interface SerpNewsResponse {
  news_results?: Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
    date: string;
    source: string;
    thumbnail?: string;
  }>;
}

export interface SerpJobsResponse {
  jobs_results?: Array<{
    title: string;
    company_name: string;
    location: string;
    via: string;
    description: string;
    job_highlights?: {
      Qualifications?: string[];
      Responsibilities?: string[];
      Benefits?: string[];
    };
    posted_at?: string;
    schedule_type?: string;
    salary?: {
      min?: number;
      max?: number;
      currency?: string;
      period?: string;
    };
  }>;
}

export interface SerpLinkedInResponse {
  linkedin_results?: Array<{
    name: string;
    title: string;
    company: string;
    location: string;
    profile_url: string;
    summary?: string;
    connections?: number;
  }>;
}

export interface SerpYouTubeResponse {
  youtube_results?: Array<{
    title: string;
    link: string;
    channel: string;
    views: string;
    published: string;
    description: string;
    duration?: string;
    thumbnail?: string;
  }>;
}

export interface BrightDataResponse {
  company_profile?: {
    name: string;
    description: string;
    industry: string;
    size: string;
    founded: string;
    headquarters: string;
    website: string;
  };
  employee_data?: Array<{
    name: string;
    title: string;
    department: string;
    linkedin_url?: string;
  }>;
}

// Cost Configuration
export interface SourceCostConfig {
  [key: string]: {
    cost: number;               // Cost per API call
    ttl: number;                // Time to live in milliseconds
    priority: number;           // Collection priority (1-10)
    reliability: number;        // Source reliability score (0-1)
  };
}

export const DEFAULT_SOURCE_COSTS: SourceCostConfig = {
  'serp_organic': { cost: 0.01, ttl: 24 * 60 * 60 * 1000, priority: 9, reliability: 0.95 },
  'serp_news': { cost: 0.01, ttl: 1 * 60 * 60 * 1000, priority: 7, reliability: 0.90 },
  'serp_jobs': { cost: 0.01, ttl: 6 * 60 * 60 * 1000, priority: 6, reliability: 0.85 },
  'serp_linkedin': { cost: 0.01, ttl: 12 * 60 * 60 * 1000, priority: 8, reliability: 0.90 },
  'serp_youtube': { cost: 0.01, ttl: 24 * 60 * 60 * 1000, priority: 5, reliability: 0.80 },
  'brightdata': { cost: 0.05, ttl: 7 * 24 * 60 * 60 * 1000, priority: 4, reliability: 0.75 },
  'snov_contacts': { cost: 0.10, ttl: 30 * 24 * 60 * 60 * 1000, priority: 3, reliability: 0.85 },
  'apollo_contacts': { cost: 0.15, ttl: 30 * 24 * 60 * 60 * 1000, priority: 2, reliability: 0.80 }
};

// Error Types
export class OrchestrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public source?: SourceType,
    public consumer?: ConsumerType
  ) {
    super(message);
    this.name = 'OrchestrationError';
  }
}

export class CostLimitExceededError extends OrchestrationError {
  constructor(
    estimatedCost: number,
    limit: number,
    consumer: ConsumerType
  ) {
    super(
      `Estimated cost $${estimatedCost} exceeds limit $${limit} for consumer ${consumer}`,
      'COST_LIMIT_EXCEEDED',
      undefined,
      consumer
    );
  }
}

export class SourceUnavailableError extends OrchestrationError {
  constructor(source: SourceType, reason: string) {
    super(
      `Source ${source} is unavailable: ${reason}`,
      'SOURCE_UNAVAILABLE',
      source
    );
  }
} 