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
  // Enhanced SerpAPI sources (lower cost alternatives)
  serp_google_finance: 0.03,
  serp_google_trends: 0.02,
  serp_google_images: 0.03,
  serp_google_videos: 0.03,
  serp_google_local: 0.04,
  serp_google_maps: 0.04,
  serp_google_shopping: 0.03,
  serp_google_patents: 0.04,
  serp_bing_search: 0.03,
  serp_duckduckgo: 0.02,
  // Enhanced Snov.io APIs
  snov_email_finder: 0.10,
  snov_email_verifier: 0.08,
  snov_domain_search: 0.12,
  snov_data_enrichment: 0.10,
  snov_linkedin_enrichment: 0.12,
  snov_bulk_email_finder: 0.15,
  snov_bulk_email_verifier: 0.12,
  // Bright Data specific datasets
  brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info: 0.12,
  brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info: 0.10,
  brightdata_gd_l1vilsfd1xpsndbtpr_ventureradar_company_info: 0.08,
  brightdata_gd_m0ci4a4ivx3j5l6nx_zoominfo_companies: 0.15,
  brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies: 0.12,
  brightdata_gd_m4ijiqfp2n9oe3oluj_pitchbook_companies: 0.18,
  brightdata_gd_l1vilaxi10wutoage7_owler_companies: 0.08,
  brightdata_gd_m3fl0mwzmfpfn4cw4_companies_enriched: 0.10,
  brightdata_gd_l1viktl72bvl7bjuj0_linkedin_people_profiles: 0.15,
  brightdata_gd_m5zhkpdgryvlxn8zg_pitchbook_people_profiles: 0.18,
  brightdata_gd_m2a6waqv18439a8thq_b2b_contacts_companies: 0.12,
  brightdata_gd_m18zt6ec11wfqohyrs_employees_business_enriched: 0.10,
  brightdata_gd_l7j0bx501ockwldaqf_glassdoor_companies_overview: 0.10,
  brightdata_gd_l7j1po0921hbu0ri1z_glassdoor_companies_reviews: 0.08,
  brightdata_gd_lpfbbndm1xnopbrcr0_glassdoor_job_listings: 0.08,
  brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings: 0.08,
  brightdata_gd_l88xp4k01qnhvyqlvw_g2_software_product_overview: 0.08,
  brightdata_gd_l88xvdka1uao86xvlb_g2_software_product_reviews: 0.08,
  brightdata_gd_lztojazw1389985ops_trustradius_product_reviews: 0.08,
  brightdata_gd_lm5zmhwd2sni130p_trustpilot_business_reviews: 0.08,
  brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings: 0.08,
  brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info: 0.08,
  brightdata_gd_m487ihp32jtc4ujg45_linkedin_profiles_jobs_listings: 0.10,
  brightdata_gd_l88xvdka1uao86xvlb_g2_software_reviews: 0.08,
  brightdata_gd_lnsxoxzi1omrwnka5r_google_news: 0.10,
  snov_contacts: 0.12,
  apollo_contacts: 0.10,
  apollo: 0.10,
  zoominfo: 0.20,
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