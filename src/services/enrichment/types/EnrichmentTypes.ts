/**
 * EnrichmentTypes - Comprehensive type definitions for company enrichment
 */

// Core Company Information
export interface CompanyBasicInfo {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  description?: string;
  logo?: string;
  headquarters?: string;
  founded?: string;
  sources?: string[];
}

// Product-related types
export interface ProductSuggestion {
  name: string;
  category?: string;
  description?: string;
  confidence: number; // 0-1 score
}

// Competitor-related types
export interface CompetitorSuggestion {
  name: string;
  domain?: string;
  category?: string;
  reason?: string;
  confidence: number; // 0-1 score
}

// Main enrichment result
export interface CompanyEnrichmentResult {
  basicInfo: CompanyBasicInfo;
  suggestedProducts: ProductSuggestion[];
  suggestedCompetitors: CompetitorSuggestion[];
  suggestedIndustries: string[];
  sources: string[];
  confidence: number; // Overall confidence 0-1
}

// Data source management
export interface DataSource {
  name: string;
  priority: number;
  isAvailable: boolean;
  rateLimitRemaining?: number;
}

// Engine configuration
export interface EnrichmentConfig {
  maxConcurrentRequests?: number;
  timeoutMs?: number;
  cacheEnabled?: boolean;
  sourcePriorities?: Record<string, number>;
}

// Search and lookup types
export interface CompanySearchOptions {
  query: string;
  maxResults?: number;
  includeIndustryFilter?: string;
  sourcePriorities?: string[];
}

export interface CompanyLookupResult {
  companies: CompanyBasicInfo[];
  totalFound: number;
  sources: string[];
  searchTime: number;
}

// Product suggestion types
export interface ProductSearchContext {
  companyInfo: CompanyBasicInfo;
  industryContext?: string;
  competitorProducts?: string[];
  websiteContext?: string;
}

export interface ProductSuggestionResult {
  products: ProductSuggestion[];
  confidence: number;
  sources: string[];
  reasoning?: string;
}

// Competitor analysis types
export interface CompetitorSearchContext {
  companyInfo: CompanyBasicInfo;
  industryFilter?: string;
  sizeFilter?: string;
  geographicFilter?: string;
}

export interface CompetitorAnalysisResult {
  competitors: CompetitorSuggestion[];
  confidence: number;
  sources: string[];
  analysisMethod: string;
}

// Data processing types
export interface ProcessingResult<T> {
  data: T;
  confidence: number;
  source: string;
  processingTime: number;
  errors?: string[];
}

export interface DeduplicationOptions {
  threshold?: number;
  priorityField?: string;
  mergeStrategy?: 'highest_confidence' | 'merge_data' | 'latest';
}

// Cache management types
export interface EnrichmentCacheKey {
  companyName: string;
  domain?: string;
  type: 'enrichment' | 'lookup' | 'products' | 'competitors';
  timestamp: string;
}

export interface CacheOptions {
  ttlHours?: number;
  forceRefresh?: boolean;
  cacheType?: string;
}

// Error handling types
export interface EnrichmentError {
  code: string;
  message: string;
  source?: string;
  recoverable: boolean;
  retryAfter?: number;
}

export interface EnrichmentResult<T> {
  success: boolean;
  data?: T;
  error?: EnrichmentError;
  metadata: {
    processingTime: number;
    sources: string[];
    cacheHit: boolean;
  };
}

// Source-specific types
export interface SerpAPIEnrichmentData {
  organicResults: any[];
  knowledgeGraph: any;
  relatedQuestions: any[];
  confidence: number;
}

export interface BrightDataEnrichmentData {
  companyProfile: any;
  contactInfo: any;
  technographics: any;
  confidence: number;
}

export interface WebScrapingData {
  htmlContent: string;
  extractedText: string;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
  };
  products: ProductSuggestion[];
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
}

export interface DomainValidationResult extends ValidationResult {
  domain: string;
  isReachable: boolean;
  hasValidSSL: boolean;
  responseTime?: number;
}

// Analytics and metrics
export interface EnrichmentMetrics {
  totalRequests: number;
  successRate: number;
  averageConfidence: number;
  sourcesUsed: Record<string, number>;
  averageProcessingTime: number;
  cacheHitRate: number;
}

export interface QualityMetrics {
  completeness: number; // 0-1
  accuracy: number; // 0-1
  freshness: number; // 0-1
  consistency: number; // 0-1
  overall: number; // 0-1
}

// Health check types
export interface SourceHealthStatus {
  name: string;
  isHealthy: boolean;
  responseTime: number;
  lastCheck: string;
  rateLimitStatus?: {
    remaining: number;
    resetTime: string;
  };
  errors?: string[];
}

export interface EnrichmentHealthCheck {
  overall: boolean;
  sources: SourceHealthStatus[];
  cache: {
    isAvailable: boolean;
    hitRate: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
  };
} 