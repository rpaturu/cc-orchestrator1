/**
 * KnowledgeGraphTypes - Comprehensive type definitions for Google Knowledge Graph
 */

// Main comprehensive enrichment result
export interface GoogleKnowledgeGraphResult {
  // Basic Identity
  name: string;
  domain?: string;
  description?: string;
  alternateName?: string;
  legalName?: string;
  disambiguatingDescription?: string;

  // Contact Information
  contactInfo?: {
    phone?: string;
    email?: string;
    fax?: string;
    address?: string;
    legalAddress?: string;
  };

  // Business Details
  businessDetails?: {
    foundingDate?: string;
    foundingLocation?: string;
    dissolutionDate?: string;
    employeeCount?: number;
    companySize?: string;
  };

  // Business Identifiers
  businessIdentifiers?: {
    naicsCode?: string;
    isicCode?: string;
    dunsNumber?: string;
    globalLocationNumber?: string;
    leiCode?: string;
    taxId?: string;
    vatId?: string;
  };

  // Industries & Classification
  industries?: string[];

  // Branding & Media
  branding?: {
    logo?: string;
    image?: string;
    slogan?: string;
  };

  // Organizational Relationships
  relationships?: {
    parentOrganization?: string;
    subsidiaries?: string[];
    departments?: string[];
    founders?: string[];
    keyEmployees?: string[];
    memberOf?: string[];
    notableAlumni?: string[];
  };

  // Trust & Quality Indicators
  qualityIndicators?: {
    rating?: {
      ratingValue: number;
      reviewCount?: number;
      bestRating?: number;
      worstRating?: number;
    };
    awards?: string[];
    certifications?: string[];
  };

  // Commercial Intelligence
  commercialInfo?: {
    marketsServed?: string[];
    paymentMethods?: string[];
    physicalLocations?: number;
  };

  // Financial & Governance
  governance?: {
    funders?: string[];
    sponsors?: string[];
    ethicsPolicy?: string;
    diversityPolicy?: string;
    correctionsPolicy?: string;
  };

  // External References
  externalReferences?: {
    socialMedia?: string[];
    referenceSites?: string[];
  };

  // Knowledge & Expertise
  expertise?: {
    knowledgeAreas?: string[];
    languages?: string[];
  };

  // Metadata
  sources: string[];
  extractionMetrics: {
    totalFieldsFound: number;
    sectionsExtracted: number;
    qualityScore: number;
  };
}

// Simplified lookup result for search operations
export interface GoogleKnowledgeGraphLookupResult {
  name: string;
  domain?: string;
  description?: string;
  industry?: string;
  size?: string;
  logo?: string;
  headquarters?: string;
  founded?: string;
}

// Configuration and processing types
export interface KnowledgeGraphConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  cacheEnabled?: boolean;
  defaultLimit?: number;
}

export interface KnowledgeGraphSearchOptions {
  query: string;
  limit?: number;
  types?: string[];
  languages?: string[];
  exactMatch?: boolean;
}

export interface EntityExtractionContext {
  entity: any;
  query: string;
  extractionType: 'enrichment' | 'lookup';
  requestedFields?: string[];
}

// Processing results
export interface ExtractionResult<T> {
  data: T;
  confidence: number;
  fieldsExtracted: string[];
  processingTime: number;
  warnings?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
}

// Cache management types
export interface KnowledgeGraphCacheKey {
  companyName?: string;
  query?: string;
  limit?: number;
  type: 'enrichment' | 'lookup';
  timestamp: string;
}

export interface CacheOptions {
  ttlHours?: number;
  forceRefresh?: boolean;
  cacheType?: string;
}

// Error handling types
export interface KnowledgeGraphError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  retryAfter?: number;
}

export interface KnowledgeGraphResult<T> {
  success: boolean;
  data?: T;
  error?: KnowledgeGraphError;
  metadata: {
    processingTime: number;
    cacheHit: boolean;
    apiCalls: number;
  };
}

// API response types
export interface GoogleKnowledgeGraphAPIResponse {
  '@context'?: any;
  '@type'?: string;
  itemListElement?: Array<{
    '@type': string;
    result: any;
    resultScore: number;
  }>;
}

export interface EntityDetails {
  '@context'?: any;
  '@type'?: string | string[];
  '@id'?: string;
  name?: string;
  alternateName?: string;
  description?: string;
  detailedDescription?: {
    articleBody?: string;
    url?: string;
    license?: string;
  };
  image?: {
    contentUrl?: string;
    url?: string;
    license?: string;
  };
  logo?: {
    contentUrl?: string;
    url?: string;
  };
  url?: string;
  sameAs?: string[];
  
  // Organization-specific fields
  legalName?: string;
  foundingDate?: string;
  foundingLocation?: any;
  dissolutionDate?: string;
  numberOfEmployees?: string | number;
  naics?: string;
  duns?: string;
  leiCode?: string;
  taxID?: string;
  vatID?: string;
  address?: any;
  location?: any;
  telephone?: string;
  email?: string;
  faxNumber?: string;
  industry?: string | string[];
  knowsAbout?: string | string[];
  memberOf?: any[];
  parentOrganization?: any;
  subOrganization?: any[];
  department?: any[];
  employee?: any[];
  founder?: any[];
  award?: string | string[];
  aggregateRating?: {
    ratingValue?: number;
    reviewCount?: number;
    bestRating?: number;
    worstRating?: number;
  };
  funder?: any[];
  sponsor?: any[];
  ethicsPolicy?: string;
  diversityPolicy?: string;
  correctionsPolicy?: string;
  knowsLanguage?: string | string[];
  areaServed?: any[];
  paymentAccepted?: string | string[];
  slogan?: string;
}

// Extraction method types
export interface ExtractionMethods {
  extractBasicInfo: (entity: EntityDetails, query: string) => Partial<GoogleKnowledgeGraphLookupResult>;
  extractComprehensiveMetadata: (entity: EntityDetails, companyName: string) => GoogleKnowledgeGraphResult;
  extractContactInfo: (entity: EntityDetails) => GoogleKnowledgeGraphResult['contactInfo'];
  extractBusinessDetails: (entity: EntityDetails) => GoogleKnowledgeGraphResult['businessDetails'];
  extractBusinessIdentifiers: (entity: EntityDetails) => GoogleKnowledgeGraphResult['businessIdentifiers'];
  extractBranding: (entity: EntityDetails) => GoogleKnowledgeGraphResult['branding'];
  extractRelationships: (entity: EntityDetails) => GoogleKnowledgeGraphResult['relationships'];
  extractQualityIndicators: (entity: EntityDetails) => GoogleKnowledgeGraphResult['qualityIndicators'];
  extractCommercialInfo: (entity: EntityDetails) => GoogleKnowledgeGraphResult['commercialInfo'];
  extractGovernance: (entity: EntityDetails) => GoogleKnowledgeGraphResult['governance'];
  extractExternalReferences: (entity: EntityDetails) => GoogleKnowledgeGraphResult['externalReferences'];
  extractExpertise: (entity: EntityDetails) => GoogleKnowledgeGraphResult['expertise'];
}

// Health check types
export interface ServiceHealthStatus {
  isHealthy: boolean;
  apiAvailable: boolean;
  cacheAvailable: boolean;
  responseTime: number;
  lastCheck: string;
  errors?: string[];
}

export interface KnowledgeGraphHealthCheck {
  overall: boolean;
  api: ServiceHealthStatus;
  cache: {
    isAvailable: boolean;
    hitRate: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
  };
}

// Analytics and metrics
export interface ExtractionMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  cacheHitRate: number;
  apiQuotaUsed: number;
  fieldsExtractedCount: Record<string, number>;
}

export interface QualityAssessment {
  completeness: number; // 0-1
  accuracy: number; // 0-1
  freshness: number; // 0-1
  consistency: number; // 0-1
  overall: number; // 0-1
}

// Entity classification types
export interface EntityClassification {
  entityType: string;
  confidence: number;
  isOrganization: boolean;
  isPerson: boolean;
  isPlace: boolean;
  isThing: boolean;
  subTypes: string[];
}

// Data transformation types
export interface DataTransformation {
  originalFormat: string;
  targetFormat: string;
  transformationRules: Record<string, any>;
  preserveOriginal: boolean;
}

export interface TransformationResult<T> {
  transformedData: T;
  originalData: any;
  transformationApplied: string[];
  dataLoss: string[];
  confidence: number;
} 