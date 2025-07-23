// Enhanced data source interfaces
export interface SerpAPINewsResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
  thumbnail?: string;
}

export interface SerpAPIJobResult {
  title: string;
  company: string;
  location: string;
  via?: string;
  description?: string;
  posted_at?: string;
  schedule_type?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

export interface SerpAPILinkedInResult {
  name: string;
  title: string;
  company?: string;
  location?: string;
  profile_url?: string;
  snippet?: string;
}

export interface SerpAPIYouTubeResult {
  title: string;
  link: string;
  channel: string;
  duration?: string;
  views?: string;
  published?: string;
  thumbnail?: string;
  snippet?: string;
}

export interface SerpAPIMultiSourceResponse {
  companyName: string;
  organic?: any;
  news?: SerpAPINewsResult[];
  jobs?: SerpAPIJobResult[];
  linkedin?: SerpAPILinkedInResult[];
  youtube?: SerpAPIYouTubeResult[];
  cached: {
    organic: boolean;
    news: boolean;
    jobs: boolean;
    linkedin: boolean;
    youtube: boolean;
  };
  apiCalls: number;
  sources: string[];
  timing?: {
    total: number;
    parallel: number;
    cache: number;
  };
  costEstimate?: string;
}

// Keep the same interfaces for compatibility
export interface GoogleKnowledgeGraphResult {
  name: string;
  types?: string[];
  description?: string;
  image?: {
    contentUrl?: string;
    url?: string;
  };
  detailedDescription?: {
    articleBody?: string;
    url?: string;
  };
  url?: string;
  sameAs?: string[];
  // Company-specific fields
  foundingDate?: string;
  founders?: string[];
  parentOrganization?: {
    name?: string;
  };
  subsidiaries?: Array<{
    name?: string;
  }>;
  numberOfEmployees?: number;
  industry?: string[];
  headquarters?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
  revenue?: {
    value?: number;
    currency?: string;
  };
  stock?: {
    tickerSymbol?: string;
    exchange?: string;
  };
  // Additional structured fields that might appear
  telephone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
}

// Industries & Classification
export interface IndustryClassification {
  primary?: string;
  secondary?: string[];
  naics?: string[];
  sic?: string[];
}

export interface GoogleKnowledgeGraphLookupResult {
  resultId: string;
  title: string;
  entityType: string[];
  snippet?: string;
  knowledgeGraph?: GoogleKnowledgeGraphResult;
  industryClassification?: IndustryClassification;
  confidence: number;
}

export interface SerpAPIResponse {
  search_metadata?: {
    id?: string;
    status?: string;
    json_endpoint?: string;
    created_at?: string;
    processed_at?: string;
    google_url?: string;
    raw_html_file?: string;
    total_time_taken?: number;
  };
  search_parameters?: {
    engine?: string;
    q?: string;
    location_requested?: string;
    location_used?: string;
    google_domain?: string;
    hl?: string;
    gl?: string;
    device?: string;
  };
  search_information?: {
    organic_results_state?: string;
    query_displayed?: string;
    total_results?: number;
    time_taken_displayed?: number;
  };
  knowledge_graph?: GoogleKnowledgeGraphResult;
  organic_results?: any[];
  related_searches?: any[];
  jobs_results?: any[];
  video_results?: any[];
  error?: string;
}

export interface SerpAPIRawCacheData {
  companyName: string;
  searchType: 'organic' | 'news' | 'jobs' | 'linkedin' | 'youtube';
  rawResponse: any;
  processedAt: string;
  sourceMetadata: {
    totalResults?: number;
    searchTime?: number;
    location?: string;
    parameters?: any;
  };
}

// Configuration interfaces
export interface SerpAPIConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface SearchEngineConfig {
  engine: string;
  location?: string;
  hl?: string;
  gl?: string;
  num?: number;
  start?: number;
  tbm?: string; // Search type (nws for news, isch for images, etc.)
  tbs?: string; // Time-based search filters
  sp?: string; // YouTube-specific search parameters
}

// Cache-related types
export interface CacheOptions {
  ttlHours?: number;
  forceRefresh?: boolean;
  cacheKey?: string;
}

// Error types
export interface SerpAPIError {
  error: string;
  code?: string;
  message?: string;
} 