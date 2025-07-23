/**
 * OrchestrationTypes - Type definitions for orchestration components
 */

// Import core types from their respective files
import { 
  DataCollectionPlan, 
  MultiSourceData, 
  CollectionMetrics, 
  SourceType, 
  ConsumerType
} from '../../../types/orchestrator-types';

import { DatasetType } from '../../../types/dataset-requirements';

// Define VendorContext interface locally (not exported from cache-types)
export interface VendorContext {
  companyName: string;
  industry?: string;
  products?: string[];
  targetMarkets?: string[];
  competitors?: string[];
  valuePropositions?: string[];
  positioningStrategy?: string;
  pricingModel?: string;
  lastUpdated: string;
}

// Export all imported types for re-use
export {
  DataCollectionPlan,
  MultiSourceData,
  CollectionMetrics,
  SourceType,
  DatasetType,
  ConsumerType
};

/**
 * Context-aware collection plan that extends the base DataCollectionPlan
 */
export interface ContextAwareCollectionPlan extends DataCollectionPlan {
  vendorContext?: VendorContext;
  customerSpecificDatasets?: DatasetType[];
  contextualPriorities?: Partial<Record<DatasetType, number>>;
}

/**
 * Raw data availability status
 */
export interface RawDataAvailability {
  companyName: string;
  sources: Record<SourceType, boolean>;
  overallAvailability: number;
  lastChecked: string;
  cacheAge: string;
}

/**
 * Customer intelligence request
 */
export interface CustomerIntelligenceRequest {
  customerCompany: string;
  vendorCompany: string;
  consumerType: ConsumerType;
  maxCost?: number;
  urgency?: 'low' | 'medium' | 'high';
  requiredDatasets?: DatasetType[];
}

/**
 * Customer intelligence response
 */
export interface CustomerIntelligenceResponse {
  plan: ContextAwareCollectionPlan;
  data: MultiSourceData;
  metrics: CollectionMetrics;
  vendorContext: VendorContext;
  qualityScore: number;
  recommendations: string[];
}

/**
 * Orchestration configuration
 */
export interface OrchestrationConfig {
  maxConcurrentRequests?: number;
  defaultTimeout?: number;
  retryAttempts?: number;
  cacheTTL?: number;
  maxParallelSources?: number;
  cacheEnabled?: boolean;
  qualityThreshold?: number;
  costOptimizationEnabled?: boolean;
  redundancyOptimizationEnabled?: boolean;
}

/**
 * Orchestration health status
 */
export interface OrchestrationHealth {
  isHealthy: boolean;
  components: {
    cache: boolean;
    serpAPI: boolean;
    dataCollection: boolean;
  };
  lastCheck: string;
  overall?: boolean;
}

/**
 * Default source costs mapping
 */
export const DEFAULT_SOURCE_COSTS: Record<SourceType, number> = {
  serp_organic: 0.05,
  serp_news: 0.05,
  serp_jobs: 0.05,
  serp_linkedin: 0.08,
  serp_youtube: 0.05,
  serp_api: 0.05,
  brightdata: 0.15,
  bright_data: 0.15,
  snov_contacts: 0.12,
  apollo_contacts: 0.10,
  apollo: 0.10,
  zoominfo: 0.20,
  clearbit: 0.18,
  hunter: 0.08,
  company_db: 0.05
};

// Collection execution types
export interface CollectionTask {
  source: SourceType;
  companyName: string;
  priority: number;
  estimatedCost: number;
  estimatedDuration: number;
  dependencies?: SourceType[];
}

export interface CollectionBatch {
  tasks: CollectionTask[];
  maxParallelism: number;
  timeoutMs: number;
  retryAttempts: number;
}

export interface CollectionResult {
  source: SourceType;
  data: any;
  success: boolean;
  duration: number;
  cost: number;
  cached: boolean;
  error?: string;
}

export interface CollectionSummary {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  totalCost: number;
  totalDuration: number;
  cacheHitRate: number;
  qualityScore: number;
}

// Cache optimization types
export interface CacheStrategy {
  enabled: boolean;
  maxAge: number; // in hours
  priority: 'low' | 'medium' | 'high';
  redundancyLevel: number;
  compressionEnabled: boolean;
}

export interface CacheEntry {
  data: any;
  timestamp: string;
  source: SourceType;
  companyName: string;
  expiresAt: string;
  size: number;
  accessCount: number;
  lastAccessed: string;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalSize: number;
  entryCount: number;
  oldestEntry: string;
  newestEntry: string;
  averageAccessTime: number;
}

// Planning types
export interface PlanningContext {
  consumerType: ConsumerType;
  maxCost: number;
  maxDuration: number;
  requiredDatasets: DatasetType[];
  optionalDatasets: DatasetType[];
  qualityThreshold: number;
  prioritizeSpeed: boolean;
  prioritizeCost: boolean;
}

export interface PlanningConstraints {
  maxCostPerSource: Record<SourceType, number>;
  maxTotalCost: number;
  maxDuration: number;
  requiredSources: SourceType[];
  excludedSources: SourceType[];
  redundancyRequirements: Record<DatasetType, number>;
}

export interface PlanningResult {
  plan: DataCollectionPlan;
  estimatedCost: number;
  estimatedDuration: number;
  estimatedQuality: number;
  riskAssessment: string[];
  alternatives: DataCollectionPlan[];
}

// Context analysis types
export interface ContextAnalysisRequest {
  vendorCompany: string;
  existingData?: MultiSourceData;
  analysisDepth: 'shallow' | 'medium' | 'deep';
  focusAreas?: ('products' | 'markets' | 'competitors' | 'positioning' | 'pricing')[];
}

export interface ContextAnalysisResult {
  vendorContext: VendorContext;
  confidence: number;
  gaps: string[];
  recommendations: DatasetType[];
  extractionSources: Record<keyof VendorContext, SourceType[]>;
}

// Metrics and quality types
export interface QualityMetrics {
  completeness: number; // 0-100
  accuracy: number; // 0-100
  freshness: number; // 0-100
  relevance: number; // 0-100
  consistency: number; // 0-100
  overall: number; // weighted average
}

export interface SourceQualityProfile {
  source: SourceType;
  reliability: number;
  speed: number;
  coverage: number;
  cost: number;
  historicalPerformance: QualityMetrics[];
}

// Error types
export interface OrchestrationErrorContext {
  operation: string;
  source?: SourceType;
  companyName?: string;
  timestamp: string;
  retryable: boolean;
}

// Orchestration status types
export type OrchestrationStatus = 
  | 'planning'
  | 'collecting'
  | 'processing'
  | 'caching'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface OrchestrationProgress {
  status: OrchestrationStatus;
  progress: number; // 0-100
  currentTask?: string;
  estimatedTimeRemaining?: number;
  tasksCompleted: number;
  tasksTotal: number;
  errors: string[];
}

/**
 * Source availability information
 */
export interface SourceAvailability {
  source: SourceType;
  available: boolean;
  responseTime?: number;
  errorMessage?: string;
  lastChecked?: string;
  errorRate?: number;
} 