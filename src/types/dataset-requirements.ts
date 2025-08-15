/**
 * Enhanced Dataset Requirements Matrix - Context-Aware Sales Intelligence
 * 
 * Distinguishes between vendor context (who you are) and customer intelligence (who you target).
 * This enables context-aware positioning and personalized sales insights.
 * 
 * 🚀 COST OPTIMIZATION STRATEGY:
 * - Tier 1: Free/Low-cost sources (SerpAPI, cached data)
 * - Tier 2: Mid-cost sources (BrightData, Snov)
 * - Tier 3: High-cost sources (Apollo, ZoomInfo) - Last resort only
 * - Smart fallbacks based on cost-per-quality ratio
 * - Budget-aware collection planning
 */

import { ConsumerType, SourceType } from './orchestrator-types';

// Enhanced cost optimization configuration
export interface CostOptimizationConfig {
  max_budget_per_request: number;        // Maximum cost per customer intelligence request
  preferred_cost_tier: 'tier1' | 'tier2' | 'tier3';  // Preferred cost tier for collection
  enable_smart_fallbacks: boolean;       // Enable intelligent source fallbacks
  cache_aggressive_ttl: boolean;         // Use aggressive caching for cost reduction
  parallel_collection_limit: number;     // Limit parallel API calls to control costs
}

// Core dataset requirement definition with cost optimization
export interface DatasetRequirement {
  sources: SourceOption[];
  required: boolean;
  quality_threshold: number;
  description?: string;
  collection_priority?: 'high' | 'medium' | 'low';
  freshness_requirement?: 'real_time' | 'daily' | 'weekly' | 'monthly';
  cost_optimization?: {
    max_cost_per_dataset: number;        // Maximum cost allowed for this dataset
    preferred_tier: 'tier1' | 'tier2' | 'tier3';  // Preferred cost tier
    fallback_strategy: 'aggressive' | 'moderate' | 'conservative';  // How aggressive to be with fallbacks
  };
}

// Enhanced source option with cost optimization
export interface SourceOption {
  source: SourceType;
  priority: number;           // 1 = highest priority
  cost: number;              // Cost per API call
  reliability: number;       // 0-1 reliability score
  freshness_needed: 'high' | 'medium' | 'low';
  extraction_complexity: 'simple' | 'moderate' | 'complex';
  typical_ttl_hours?: number; // Typical cache TTL for this source
  cost_tier: 'tier1' | 'tier2' | 'tier3';  // Cost tier classification
  cost_per_quality: number;  // Cost divided by reliability (lower is better)
  fallback_priority: number; // Priority for fallback scenarios
}

// Enhanced dataset types for context-aware intelligence
export type DatasetType = 
  // Vendor Context Datasets (Understanding user's company)
  | 'company_products'          // What does the vendor sell?
  | 'value_propositions'        // Key differentiators and unique value
  | 'target_markets'           // Industries and customer segments served
  | 'competitive_landscape'     // Direct and indirect competitors
  | 'positioning_strategy'     // How vendor positions vs competitors
  | 'content_themes'           // Messaging and content strategies
  | 'pricing_model'            // Pricing approach and tiers
  | 'sales_methodology'        // Sales process and approach
  | 'company_culture'          // Values and company personality
  | 'market_presence'          // Geographic and market footprint
  
  // Customer Intelligence Datasets (Understanding prospects)
  | 'company_overview'         // Basic company information
  | 'decision_makers'          // Key contacts and decision makers
  | 'tech_stack'              // Current technology usage and preferences
  | 'business_challenges'      // Pain points and operational challenges
  | 'recent_activities'        // News, hiring, expansion signals
  | 'budget_indicators'        // Financial health and spending signals
  | 'buying_signals'           // Intent data and purchase indicators
  | 'competitive_usage'        // Current vendor relationships
  | 'digital_footprint'       // Online presence and marketing activity
  | 'growth_signals'           // Expansion and scaling indicators
  | 'compliance_requirements'   // Regulatory and security needs
  | 'integration_needs'        // Technical integration requirements
  | 'financial_metrics'        // Revenue, growth, and financial data
  | 'recent_news'             // Latest company news and announcements
  | 'leadership_team'         // Key executives and leadership information
  | 'funding_rounds'          // Investment and funding information
  | 'email_intelligence'      // Email verification and enrichment
  
  // Shared/Basic Datasets
  | 'company_name'            // Official company name
  | 'company_domain'          // Official website domain
  | 'industry'                // Primary industry classification
  | 'employee_count'          // Company size indicator
  | 'company_description';    // Basic company description

// The Enhanced Dataset Requirements Matrix
export const DATASET_REQUIREMENTS_MAP: Record<DatasetType, DatasetRequirement> = {
  // =================================================================
  // VENDOR CONTEXT DATASETS (Understanding user's company)
  // =================================================================
  
  company_products: {
    sources: [
      { 
        source: 'serp_google_shopping', 
        priority: 1, 
        cost: 0.03, 
        reliability: 0.85, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.035,
        fallback_priority: 1
      },
      { 
        source: 'serp_organic', 
        priority: 2, 
        cost: 0.02, 
        reliability: 0.85, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.024,
        fallback_priority: 2
      },
      { 
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info', 
        priority: 3, 
        cost: 0.08, 
        reliability: 0.90, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.089,
        fallback_priority: 3
      },
      { 
        source: 'brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info', 
        priority: 4, 
        cost: 0.10, 
        reliability: 0.88, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.114,
        fallback_priority: 4
      },
    ],
    required: true,
    quality_threshold: 0.8,
    description: 'Products and services offered by the vendor company',
    collection_priority: 'high',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.23,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  value_propositions: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.80, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.025,
        fallback_priority: 1
      },
      { 
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info', 
        priority: 2, 
        cost: 0.08, 
        reliability: 0.85, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.094,
        fallback_priority: 2
      },
      { 
        source: 'brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info', 
        priority: 3, 
        cost: 0.10, 
        reliability: 0.88, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.114,
        fallback_priority: 3
      },
    ],
    required: true,
    quality_threshold: 0.75,
    description: 'Key differentiators and unique value propositions',
    collection_priority: 'high',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.20,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  competitive_landscape: {
    sources: [
      { 
        source: 'serp_google_patents', 
        priority: 1, 
        cost: 0.04, 
        reliability: 0.92, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.043,
        fallback_priority: 1
      },
      { 
        source: 'serp_organic', 
        priority: 2, 
        cost: 0.03, 
        reliability: 0.85, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.035,
        fallback_priority: 2
      },
      { 
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info', 
        priority: 3, 
        cost: 0.10, 
        reliability: 0.90, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.111,
        fallback_priority: 3
      },
      { 
        source: 'brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info', 
        priority: 4, 
        cost: 0.12, 
        reliability: 0.88, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.136,
        fallback_priority: 4
      },
      { 
        source: 'brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies', 
        priority: 5, 
        cost: 0.15, 
        reliability: 0.92, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.163,
        fallback_priority: 5
      },
    ],
    required: true,
    quality_threshold: 0.80,
    description: 'Direct and indirect competitors analysis',
    collection_priority: 'high',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.44,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  positioning_strategy: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.027,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'How vendor positions against competitors',
    collection_priority: 'medium',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.02,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  target_markets: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.80, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.025,
        fallback_priority: 1
      },
      { 
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info', 
        priority: 2, 
        cost: 0.08, 
        reliability: 0.85, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.094,
        fallback_priority: 2
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Industries and customer segments served',
    collection_priority: 'medium',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.10,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  pricing_model: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.70, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.029,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.65,
    description: 'Pricing strategy and models',
    collection_priority: 'low',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.02,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  content_themes: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.027,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Content themes and messaging strategies',
    collection_priority: 'low',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.02,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  sales_methodology: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.70, 
        freshness_needed: 'low', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.029,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.65,
    description: 'Sales process and methodology',
    collection_priority: 'low',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.02,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  company_culture: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.75, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.027,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Company culture and values',
    collection_priority: 'low',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.02,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  market_presence: {
    sources: [
      { 
        source: 'serp_google_maps', 
        priority: 1, 
        cost: 0.04, 
        reliability: 0.90, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.044,
        fallback_priority: 1
      },
      { 
        source: 'serp_google_local', 
        priority: 2, 
        cost: 0.04, 
        reliability: 0.85, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.047,
        fallback_priority: 2
      },
      { 
        source: 'serp_organic', 
        priority: 3, 
        cost: 0.02, 
        reliability: 0.80, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.025,
        fallback_priority: 3
      },
      { 
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info', 
        priority: 4, 
        cost: 0.08, 
        reliability: 0.85, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.094,
        fallback_priority: 4
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Geographic and market footprint',
    collection_priority: 'medium',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.18,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  // =================================================================
  // CUSTOMER INTELLIGENCE DATASETS (Understanding prospects)
  // =================================================================

  decision_makers: {
    sources: [
      { 
        source: 'snov_domain_search', 
        priority: 1, 
        cost: 0.12, 
        reliability: 0.88, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier2',
        cost_per_quality: 0.136,
        fallback_priority: 1
      },
      { 
        source: 'snov_email_finder', 
        priority: 2, 
        cost: 0.10, 
        reliability: 0.85, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier2',
        cost_per_quality: 0.118,
        fallback_priority: 2
      },
      { 
        source: 'snov_linkedin_enrichment', 
        priority: 3, 
        cost: 0.12, 
        reliability: 0.88, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier2',
        cost_per_quality: 0.136,
        fallback_priority: 3
      },
      { 
        source: 'brightdata_gd_m2a6waqv18439a8thq_b2b_contacts_companies', 
        priority: 4, 
        cost: 0.12, 
        reliability: 0.88, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier2',
        cost_per_quality: 0.136,
        fallback_priority: 4
      },
      { 
        source: 'brightdata_gd_l1viktl72bvl7bjuj0_linkedin_people_profiles', 
        priority: 5, 
        cost: 0.15, 
        reliability: 0.85, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 48,
        cost_tier: 'tier2',
        cost_per_quality: 0.176,
        fallback_priority: 5
      },
      { 
        source: 'apollo_contacts', 
        priority: 6, 
        cost: 0.15, 
        reliability: 0.85, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier3',
        cost_per_quality: 0.176,
        fallback_priority: 6
      },
      { 
        source: 'serp_linkedin', 
        priority: 7, 
        cost: 0.03, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 48,
        cost_tier: 'tier1',
        cost_per_quality: 0.040,
        fallback_priority: 7
      },
    ],
    required: true,
    quality_threshold: 0.85,
    description: 'Key decision makers and stakeholders',
    collection_priority: 'high',
    freshness_requirement: 'daily',
    cost_optimization: {
      max_cost_per_dataset: 0.79,
      preferred_tier: 'tier2',
      fallback_strategy: 'moderate'
    }
  },

  tech_stack: {
    sources: [
      { 
        source: 'brightdata_gd_l88xp4k01qnhvyqlvw_g2_software_product_overview', 
        priority: 1, 
        cost: 0.08, 
        reliability: 0.85, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier2',
        cost_per_quality: 0.094,
        fallback_priority: 1
      },
      { 
        source: 'brightdata_gd_l88xvdka1uao86xvlb_g2_software_product_reviews', 
        priority: 2, 
        cost: 0.10, 
        reliability: 0.88, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier2',
        cost_per_quality: 0.114,
        fallback_priority: 2
      },
      { 
        source: 'brightdata_gd_lztojazw1389985ops_trustradius_product_reviews', 
        priority: 3, 
        cost: 0.12, 
        reliability: 0.86, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier2',
        cost_per_quality: 0.140,
        fallback_priority: 3
      },
      { 
        source: 'serp_organic', 
        priority: 4, 
        cost: 0.02, 
        reliability: 0.70, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.029,
        fallback_priority: 4
      },
    ],
    required: true,
    quality_threshold: 0.80,
    description: 'Current technology stack and preferences',
    collection_priority: 'high',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.32,
      preferred_tier: 'tier2',
      fallback_strategy: 'moderate'
    }
  },

  business_challenges: {
    sources: [
      { 
        source: 'serp_news', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.80, 
        freshness_needed: 'high', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.025,
        fallback_priority: 1
      },
      { 
        source: 'serp_organic', 
        priority: 2, 
        cost: 0.02, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 72,
        cost_tier: 'tier1',
        cost_per_quality: 0.027,
        fallback_priority: 2
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Current business challenges and pain points',
    collection_priority: 'high',
    freshness_requirement: 'daily',
    cost_optimization: {
      max_cost_per_dataset: 0.04,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  buying_signals: {
    sources: [
      { 
        source: 'serp_news', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.85, 
        freshness_needed: 'high', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 12,
        cost_tier: 'tier1',
        cost_per_quality: 0.024,
        fallback_priority: 1
      },
      { 
        source: 'serp_jobs', 
        priority: 2, 
        cost: 0.02, 
        reliability: 0.80, 
        freshness_needed: 'high', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.025,
        fallback_priority: 2
      },
    ],
    required: false,
    quality_threshold: 0.80,
    description: 'Purchase intent and buying signals',
    collection_priority: 'high',
    freshness_requirement: 'real_time',
    cost_optimization: {
      max_cost_per_dataset: 0.04,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  recent_activities: {
    sources: [
      { 
        source: 'serp_news', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.90, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 12,
        cost_tier: 'tier1',
        cost_per_quality: 0.022,
        fallback_priority: 1
      },
      { 
        source: 'serp_bing_search', 
        priority: 2, 
        cost: 0.03, 
        reliability: 0.80, 
        freshness_needed: 'high', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 12,
        cost_tier: 'tier1',
        cost_per_quality: 0.038,
        fallback_priority: 2
      },
      { 
        source: 'serp_jobs', 
        priority: 3, 
        cost: 0.02, 
        reliability: 0.85, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.024,
        fallback_priority: 3
      },
    ],
    required: true,
    quality_threshold: 0.85,
    description: 'Recent news, hiring, and business activities',
    collection_priority: 'high',
    freshness_requirement: 'real_time',
    cost_optimization: {
      max_cost_per_dataset: 0.07,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  budget_indicators: {
    sources: [
      { 
        source: 'serp_news', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 72,
        cost_tier: 'tier1',
        cost_per_quality: 0.027,
        fallback_priority: 1
      },
      { 
        source: 'brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies', 
        priority: 2, 
        cost: 0.10, 
        reliability: 0.92, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier2',
        cost_per_quality: 0.109,
        fallback_priority: 2
      },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Financial health and spending indicators',
    collection_priority: 'medium',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.10,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  competitive_usage: {
    sources: [
      { 
        source: 'brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info', 
        priority: 1, 
        cost: 0.08, 
        reliability: 0.88, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier2',
        cost_per_quality: 0.091,
        fallback_priority: 1
      },
      { 
        source: 'serp_organic', 
        priority: 2, 
        cost: 0.02, 
        reliability: 0.70, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.029,
        fallback_priority: 2
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Current vendor relationships and solutions',
    collection_priority: 'medium',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.10,
      preferred_tier: 'tier2',
      fallback_strategy: 'moderate'
    }
  },

  growth_signals: {
    sources: [
      { 
        source: 'serp_google_trends', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.85, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.024,
        fallback_priority: 1
      },
      { 
        source: 'serp_news', 
        priority: 2, 
        cost: 0.02, 
        reliability: 0.80, 
        freshness_needed: 'high', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.025,
        fallback_priority: 2
      },
      { 
        source: 'serp_jobs', 
        priority: 3, 
        cost: 0.02, 
        reliability: 0.85, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.024,
        fallback_priority: 3
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Growth and expansion indicators',
    collection_priority: 'medium',
    freshness_requirement: 'daily',
    cost_optimization: {
      max_cost_per_dataset: 0.06,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  digital_footprint: {
    sources: [
      { 
        source: 'serp_google_images', 
        priority: 1, 
        cost: 0.03, 
        reliability: 0.80, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.038,
        fallback_priority: 1
      },
      { 
        source: 'serp_google_videos', 
        priority: 2, 
        cost: 0.03, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.040,
        fallback_priority: 2
      },
      { 
        source: 'serp_organic', 
        priority: 3, 
        cost: 0.02, 
        reliability: 0.85, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.024,
        fallback_priority: 3
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Online presence and digital marketing activity',
    collection_priority: 'low',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.08,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  compliance_requirements: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.75, 
        freshness_needed: 'low', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.027,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Regulatory and compliance requirements',
    collection_priority: 'low',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.02,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  integration_needs: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.70, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.029,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.65,
    description: 'Technical integration requirements and preferences',
    collection_priority: 'low',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.02,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  financial_metrics: {
    sources: [
      { 
        source: 'serp_google_finance', 
        priority: 1, 
        cost: 0.03, 
        reliability: 0.88, 
        freshness_needed: 'high', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.034,
        fallback_priority: 1
      },
      { 
        source: 'serp_news', 
        priority: 2, 
        cost: 0.02, 
        reliability: 0.85, 
        freshness_needed: 'high', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.024,
        fallback_priority: 2
      },
      { 
        source: 'serp_organic', 
        priority: 3, 
        cost: 0.01, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'complex', 
        typical_ttl_hours: 72,
        cost_tier: 'tier1',
        cost_per_quality: 0.013,
        fallback_priority: 3
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Revenue, growth rate, and financial performance metrics',
    collection_priority: 'high',
    freshness_requirement: 'daily',
    cost_optimization: {
      max_cost_per_dataset: 0.06,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  recent_news: {
    sources: [
      { 
        source: 'serp_news', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.90, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 12,
        cost_tier: 'tier1',
        cost_per_quality: 0.022,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.80,
    description: 'Latest company news and announcements',
    collection_priority: 'high',
    freshness_requirement: 'daily',
    cost_optimization: {
      max_cost_per_dataset: 0.02,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  leadership_team: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.01, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.013,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Key executives and leadership team information',
    collection_priority: 'medium',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.015,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  funding_rounds: {
    sources: [
      { 
        source: 'serp_news', 
        priority: 1, 
        cost: 0.02, 
        reliability: 0.85, 
        freshness_needed: 'high', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 72,
        cost_tier: 'tier1',
        cost_per_quality: 0.024,
        fallback_priority: 1
      },
      { 
        source: 'serp_organic', 
        priority: 2, 
        cost: 0.01, 
        reliability: 0.75, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.013,
        fallback_priority: 2
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Investment rounds, funding, and valuation information',
    collection_priority: 'medium',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.03,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  email_intelligence: {
    sources: [
      { 
        source: 'snov_email_verifier', 
        priority: 1, 
        cost: 0.08, 
        reliability: 0.90, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier2',
        cost_per_quality: 0.089,
        fallback_priority: 1
      },
      { 
        source: 'snov_bulk_email_verifier', 
        priority: 2, 
        cost: 0.12, 
        reliability: 0.90, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier2',
        cost_per_quality: 0.133,
        fallback_priority: 2
      },
      { 
        source: 'snov_data_enrichment', 
        priority: 3, 
        cost: 0.10, 
        reliability: 0.85, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 48,
        cost_tier: 'tier2',
        cost_per_quality: 0.118,
        fallback_priority: 3
      },
      { 
        source: 'hunter', 
        priority: 4, 
        cost: 0.08, 
        reliability: 0.78, 
        freshness_needed: 'high', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 24,
        cost_tier: 'tier1',
        cost_per_quality: 0.103,
        fallback_priority: 4
      },
    ],
    required: false,
    quality_threshold: 0.85,
    description: 'Email verification, validation, and contact enrichment',
    collection_priority: 'medium',
    freshness_requirement: 'daily',
    cost_optimization: {
      max_cost_per_dataset: 0.38,
      preferred_tier: 'tier2',
      fallback_strategy: 'moderate'
    }
  },

  // =================================================================
  // SHARED/BASIC DATASETS
  // =================================================================

  company_name: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.01, 
        reliability: 0.95, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 720,
        cost_tier: 'tier1',
        cost_per_quality: 0.011,
        fallback_priority: 1
      },
    ],
    required: true,
    quality_threshold: 0.95,
    description: 'Official company name verification',
    collection_priority: 'high',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.01,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  company_domain: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.01, 
        reliability: 0.95, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 720,
        cost_tier: 'tier1',
        cost_per_quality: 0.011,
        fallback_priority: 1
      },
    ],
    required: true,
    quality_threshold: 0.95,
    description: 'Official company website domain',
    collection_priority: 'high',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.01,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  },

  industry: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.01, 
        reliability: 0.90, 
        freshness_needed: 'low', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.011,
        fallback_priority: 1
      },
      { 
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info', 
        priority: 2, 
        cost: 0.05, 
        reliability: 0.85, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.059,
        fallback_priority: 2
      },
    ],
    required: true,
    quality_threshold: 0.85,
    description: 'Primary industry classification',
    collection_priority: 'high',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.06,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

    employee_count: {
    sources: [
      { 
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info', 
        priority: 1, 
        cost: 0.05, 
        reliability: 0.85, 
        freshness_needed: 'medium', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 168,
        cost_tier: 'tier2',
        cost_per_quality: 0.059,
        fallback_priority: 1
      },
      { 
        source: 'serp_organic', 
        priority: 2, 
        cost: 0.01, 
        reliability: 0.70, 
        freshness_needed: 'medium', 
        extraction_complexity: 'moderate', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.014,
        fallback_priority: 2
      },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Company size and employee count',
    collection_priority: 'medium',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.06,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  company_overview: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.01, 
        reliability: 0.90, 
        freshness_needed: 'medium', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 168,
        cost_tier: 'tier1',
        cost_per_quality: 0.011,
        fallback_priority: 1
      },
      { 
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info', 
        priority: 2, 
        cost: 0.05, 
        reliability: 0.85, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.059,
        fallback_priority: 2
      },
      { 
        source: 'brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info', 
        priority: 3, 
        cost: 0.08, 
        reliability: 0.88, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.091,
        fallback_priority: 3
      },
      { 
        source: 'brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies', 
        priority: 4, 
        cost: 0.10, 
        reliability: 0.92, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier2',
        cost_per_quality: 0.109,
        fallback_priority: 4
      },
    ],
    required: true,
    quality_threshold: 0.85,
    description: 'Comprehensive company overview and description',
    collection_priority: 'high',
    freshness_requirement: 'weekly',
    cost_optimization: {
      max_cost_per_dataset: 0.24,
      preferred_tier: 'tier1',
      fallback_strategy: 'moderate'
    }
  },

  company_description: {
    sources: [
      { 
        source: 'serp_organic', 
        priority: 1, 
        cost: 0.01, 
        reliability: 0.85, 
        freshness_needed: 'low', 
        extraction_complexity: 'simple', 
        typical_ttl_hours: 336,
        cost_tier: 'tier1',
        cost_per_quality: 0.012,
        fallback_priority: 1
      },
    ],
    required: false,
    quality_threshold: 0.80,
    description: 'Basic company description',
    collection_priority: 'medium',
    freshness_requirement: 'monthly',
    cost_optimization: {
      max_cost_per_dataset: 0.01,
      preferred_tier: 'tier1',
      fallback_strategy: 'conservative'
    }
  }
};

// Enhanced Consumer Dataset Requirements - Context-Aware Intelligence
export const CONSUMER_DATASET_REQUIREMENTS: Record<ConsumerType, DatasetType[]> = {
  // Basic profile lookup - minimal data for user profiles
  profile: [
    'company_name',
    'company_domain',
    'industry',
    'employee_count',
    'company_description'
  ],

  // Vendor context collection - understanding the user's company
  vendor_context: [
    'company_name',
    'company_domain',
    'industry',
    'employee_count',
    'company_overview',
    'company_products',
    'value_propositions',
    'target_markets',
    'competitive_landscape',
    'positioning_strategy',
    'pricing_model',
    'financial_metrics',      // For revenue and financial data
    'growth_signals',         // For growth indicators
    'recent_news',           // For latest financial announcements
    'leadership_team',       // For key executives
    'funding_rounds'         // For investment and valuation data
  ],

  // Customer intelligence - understanding prospects with context awareness
  customer_intelligence: [
    'company_name',
    'company_domain',
    'industry',
    'employee_count',
    'company_overview',
    'decision_makers',
    'tech_stack',
    'business_challenges',
    'recent_activities',
    'buying_signals',
    'growth_signals',
    'competitive_usage',
    'budget_indicators'
  ],

  // Research areas - modular, area-specific intelligence collection
  research: [
    'company_name',
    'company_domain',
    'industry',
    'employee_count'
    // Note: Additional datasets will be determined dynamically based on research area
    // This is handled by getResearchAreaDatasets() function
  ],

  // Testing with minimal cost
  test: [
    'company_name',
    'company_domain'
  ]
};

/**
 * Get area-specific dataset requirements for research consumer type
 */
export function getResearchAreaDatasets(areaId: string): DatasetType[] {
  const areaDatasetMap: Record<string, DatasetType[]> = {
    'decision_makers': [
      'company_name',
      'company_domain',
      'industry',
      'employee_count',
      'decision_makers',
      'leadership_team',
      'company_overview'
    ],
    'tech_stack': [
      'company_name', 
      'company_domain',
      'industry',
      'tech_stack',
      'competitive_usage',
      'integration_needs'
    ],
    'competitive_positioning': [
      'company_name',
      'company_domain',
      'industry',
      'competitive_landscape',
      'competitive_usage',
      'positioning_strategy',
      'value_propositions',
      'recent_activities'
    ],
    'buying_signals': [
      'company_name',
      'company_domain',
      'industry', 
      'buying_signals',
      'recent_activities',
      'growth_signals',
      'budget_indicators'
    ],
    'growth_signals': [
      'company_name',
      'company_domain',
      'industry',
      'growth_signals',
      'recent_activities',
      'employee_count',
      'financial_metrics'
    ],
    'digital_footprint': [
      'company_name',
      'company_domain',
      'industry',
      'recent_activities',
      'company_overview',
      'value_propositions'
    ],
    'recent_activities': [
      'company_name',
      'company_domain',
      'industry',
      'recent_activities',
      'recent_news',
      'growth_signals',
      'buying_signals'
    ],
    'integration_needs': [
      'company_name',
      'company_domain',
      'industry',
      'tech_stack',
      'integration_needs',
      'competitive_usage'
    ],
    'compliance_requirements': [
      'company_name',
      'company_domain',
      'industry',
      'compliance_requirements',
      'tech_stack'
    ],
    'business_challenges': [
      'company_name',
      'company_domain',
      'industry',
      'business_challenges',
      'recent_activities',
      'competitive_landscape'
    ],
    'budget_indicators': [
      'company_name',
      'company_domain',
      'industry',
      'budget_indicators',
      'financial_metrics',
      'growth_signals',
      'funding_rounds'
    ],
    // Snov.io specific areas
    'snov_email_finder': [
      'company_name',
      'company_domain',
      'decision_makers'
    ],
    'snov_email_verifier': [
      'company_name',
      'company_domain', 
      'decision_makers'
    ],
    'snov_domain_search': [
      'company_name',
      'company_domain',
      'decision_makers'
    ]
  };

  return areaDatasetMap[areaId] || CONSUMER_DATASET_REQUIREMENTS.research;
}

/**
 * Get area-specific source requirements for research consumer type
 */
export function getResearchAreaSources(areaId: string): SourceType[] {
  const areaSourceMap: Record<string, SourceType[]> = {
    'decision_makers': [
      'serp_organic' as SourceType,
      'serp_linkedin' as SourceType, 
      'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info' as SourceType
    ],
    'tech_stack': [
      'serp_organic' as SourceType,
      'serp_jobs' as SourceType, // Job postings often mention tech stack
      'serp_news' as SourceType, // Tech news and announcements
      'brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings' as SourceType, // Indeed job listings
      'brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info' as SourceType, // Indeed company info
      'brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings' as SourceType // LinkedIn job listings
    ],
    'competitive_positioning': [
      'serp_organic' as SourceType,
      'serp_news' as SourceType,
      'brightdata_gd_l1vikfnt1wgvvqz95w_crunchbase' as SourceType
    ],
    'buying_signals': [
      'serp_news' as SourceType,
      'serp_organic' as SourceType,
      'brightdata_gd_l1oojs36kb59w6jg8i1_news' as SourceType
    ],
    'growth_signals': [
      'serp_jobs' as SourceType,
      'serp_organic' as SourceType,
      'brightdata_gd_l1h1p0i0a2j09z4ln8m_glassdoor' as SourceType
    ],
    'digital_footprint': [
      'serp_organic' as SourceType,
      'serp_youtube' as SourceType,
      'brightdata_gd_l1fgqsm9f9e3z6u8q9r_social' as SourceType
    ],
    'recent_activities': [
      'serp_news' as SourceType,
      'serp_youtube' as SourceType,
      'serp_organic' as SourceType
    ],
    'integration_needs': [
      'serp_organic' as SourceType,
      'brightdata_gd_l17ib13hb5j20b36gy2_stackshare' as SourceType
    ],
    'compliance_requirements': [
      'serp_organic' as SourceType,
      'brightdata_gd_l1p0d1j8j2l0c0o8v9w_regulatory' as SourceType
    ],
    'business_challenges': [
      'serp_news' as SourceType,
      'serp_organic' as SourceType
    ],
    'budget_indicators': [
      'serp_google_finance' as SourceType,
      'serp_organic' as SourceType,
      'brightdata_gd_l1vikfnt1wgvvqz95w_crunchbase' as SourceType
    ],
    // Snov.io specific areas
    'snov_email_finder': [
      'snov_email_finder' as SourceType
    ],
    'snov_email_verifier': [
      'snov_email_verifier' as SourceType
    ],
    'snov_domain_search': [
      'snov_domain_search' as SourceType
    ]
  };

  return areaSourceMap[areaId] || ['serp_organic' as SourceType];
}

// Smart redundancy rules - when sources overlap
export interface RedundancyRule {
  condition: SourceType[];  // If we have these sources
  skip: SourceType;         // Then skip this source
  context: ConsumerType[];  // For these consumer types
  reason: string;          // Why this redundancy exists
}

export const REDUNDANCY_RULES: RedundancyRule[] = [
  {
    condition: ['serp_organic', 'serp_news'],
    skip: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info',
    context: ['profile'],
    reason: 'SerpAPI organic + news provides sufficient company info for basic needs'
  },
  {
    condition: ['snov_contacts'],
    skip: 'apollo_contacts', 
    context: ['customer_intelligence'],
    reason: 'Snov contacts sufficient for most contact needs, Apollo redundant'
  },
  {
    condition: ['serp_organic'],
    skip: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info',
    context: ['profile'],
    reason: 'Organic search sufficient for basic profile information'
  }
];

// Quality validation helpers
export interface DatasetQuality {
  completeness: number;  // 0-1 how complete is the dataset
  freshness: number;     // 0-1 how fresh is the data
  reliability: number;   // 0-1 how reliable is the source
  overall: number;       // 0-1 overall quality score
}

export function calculateDatasetQuality(
  dataset: DatasetType,
  sourceUsed: SourceType,
  dataAge: number,
  dataCompleteness: number
): DatasetQuality {
  const requirement = DATASET_REQUIREMENTS_MAP[dataset];
  const sourceOption = requirement.sources.find(s => s.source === sourceUsed);
  
  if (!sourceOption) {
    return { completeness: 0, freshness: 0, reliability: 0, overall: 0 };
  }

  // Calculate freshness based on age vs expected TTL
  const expectedTtlMs = (sourceOption.typical_ttl_hours || 24) * 60 * 60 * 1000;
  const freshness = Math.max(0, 1 - (dataAge / expectedTtlMs));
  
  // Use source reliability
  const reliability = sourceOption.reliability;
  
  // Overall quality combines all factors
  const overall = (dataCompleteness * 0.4) + (freshness * 0.3) + (reliability * 0.3);
  
  return {
    completeness: dataCompleteness,
    freshness,
    reliability,
    overall
  };
} 