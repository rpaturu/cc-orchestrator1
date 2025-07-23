/**
 * Enhanced Dataset Requirements Matrix - Context-Aware Sales Intelligence
 * 
 * Distinguishes between vendor context (who you are) and customer intelligence (who you target).
 * This enables context-aware positioning and personalized sales insights.
 */

import { ConsumerType, SourceType } from './orchestrator-types';

// Core dataset requirement definition
export interface DatasetRequirement {
  sources: SourceOption[];
  required: boolean;
  quality_threshold: number;
  description?: string;
  collection_priority?: 'high' | 'medium' | 'low';
  freshness_requirement?: 'real_time' | 'daily' | 'weekly' | 'monthly';
}

// Source option with business intelligence
export interface SourceOption {
  source: SourceType;
  priority: number;           // 1 = highest priority
  cost: number;              // Cost per API call
  reliability: number;       // 0-1 reliability score
  freshness_needed: 'high' | 'medium' | 'low';
  extraction_complexity: 'simple' | 'moderate' | 'complex';
  typical_ttl_hours?: number; // Typical cache TTL for this source
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
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.85, freshness_needed: 'medium', extraction_complexity: 'moderate', typical_ttl_hours: 168 },
      { source: 'brightdata', priority: 2, cost: 0.08, reliability: 0.90, freshness_needed: 'low', extraction_complexity: 'simple', typical_ttl_hours: 336 },
    ],
    required: true,
    quality_threshold: 0.8,
    description: 'Products and services offered by the vendor company',
    collection_priority: 'high',
    freshness_requirement: 'weekly'
  },

  value_propositions: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.80, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 168 },
      { source: 'brightdata', priority: 2, cost: 0.08, reliability: 0.85, freshness_needed: 'low', extraction_complexity: 'moderate', typical_ttl_hours: 336 },
    ],
    required: true,
    quality_threshold: 0.75,
    description: 'Key differentiators and unique value propositions',
    collection_priority: 'high',
    freshness_requirement: 'weekly'
  },

  competitive_landscape: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.03, reliability: 0.85, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 168 },
      { source: 'brightdata', priority: 2, cost: 0.10, reliability: 0.90, freshness_needed: 'low', extraction_complexity: 'moderate', typical_ttl_hours: 336 },
    ],
    required: true,
    quality_threshold: 0.80,
    description: 'Direct and indirect competitors analysis',
    collection_priority: 'high',
    freshness_requirement: 'weekly'
  },

  positioning_strategy: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.75, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 168 },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'How vendor positions against competitors',
    collection_priority: 'medium',
    freshness_requirement: 'weekly'
  },

  target_markets: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.80, freshness_needed: 'low', extraction_complexity: 'moderate', typical_ttl_hours: 336 },
      { source: 'brightdata', priority: 2, cost: 0.08, reliability: 0.85, freshness_needed: 'low', extraction_complexity: 'simple', typical_ttl_hours: 336 },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Industries and customer segments served',
    collection_priority: 'medium',
    freshness_requirement: 'monthly'
  },

  pricing_model: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.70, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 168 },
    ],
    required: false,
    quality_threshold: 0.65,
    description: 'Pricing strategy and models',
    collection_priority: 'low',
    freshness_requirement: 'monthly'
  },

  content_themes: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.75, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 168 },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Content themes and messaging strategies',
    collection_priority: 'low',
    freshness_requirement: 'monthly'
  },

  sales_methodology: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.70, freshness_needed: 'low', extraction_complexity: 'complex', typical_ttl_hours: 336 },
    ],
    required: false,
    quality_threshold: 0.65,
    description: 'Sales process and methodology',
    collection_priority: 'low',
    freshness_requirement: 'monthly'
  },

  company_culture: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.75, freshness_needed: 'low', extraction_complexity: 'moderate', typical_ttl_hours: 336 },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Company culture and values',
    collection_priority: 'low',
    freshness_requirement: 'monthly'
  },

  market_presence: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.80, freshness_needed: 'low', extraction_complexity: 'moderate', typical_ttl_hours: 336 },
      { source: 'brightdata', priority: 2, cost: 0.08, reliability: 0.85, freshness_needed: 'low', extraction_complexity: 'simple', typical_ttl_hours: 336 },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Geographic and market footprint',
    collection_priority: 'medium',
    freshness_requirement: 'monthly'
  },

  // =================================================================
  // CUSTOMER INTELLIGENCE DATASETS (Understanding prospects)
  // =================================================================

  decision_makers: {
    sources: [
      { source: 'snov_contacts', priority: 1, cost: 0.10, reliability: 0.90, freshness_needed: 'high', extraction_complexity: 'simple', typical_ttl_hours: 24 },
      { source: 'apollo_contacts', priority: 2, cost: 0.15, reliability: 0.85, freshness_needed: 'high', extraction_complexity: 'simple', typical_ttl_hours: 24 },
      { source: 'serp_linkedin', priority: 3, cost: 0.03, reliability: 0.75, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 48 },
    ],
    required: true,
    quality_threshold: 0.85,
    description: 'Key decision makers and stakeholders',
    collection_priority: 'high',
    freshness_requirement: 'daily'
  },

  tech_stack: {
    sources: [
      { source: 'brightdata', priority: 1, cost: 0.08, reliability: 0.85, freshness_needed: 'medium', extraction_complexity: 'moderate', typical_ttl_hours: 168 },
      { source: 'serp_organic', priority: 2, cost: 0.02, reliability: 0.70, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 168 },
    ],
    required: true,
    quality_threshold: 0.80,
    description: 'Current technology stack and preferences',
    collection_priority: 'high',
    freshness_requirement: 'weekly'
  },

  business_challenges: {
    sources: [
      { source: 'serp_news', priority: 1, cost: 0.02, reliability: 0.80, freshness_needed: 'high', extraction_complexity: 'complex', typical_ttl_hours: 24 },
      { source: 'serp_organic', priority: 2, cost: 0.02, reliability: 0.75, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 72 },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Current business challenges and pain points',
    collection_priority: 'high',
    freshness_requirement: 'daily'
  },

  buying_signals: {
    sources: [
      { source: 'serp_news', priority: 1, cost: 0.02, reliability: 0.85, freshness_needed: 'high', extraction_complexity: 'moderate', typical_ttl_hours: 12 },
      { source: 'serp_jobs', priority: 2, cost: 0.02, reliability: 0.80, freshness_needed: 'high', extraction_complexity: 'moderate', typical_ttl_hours: 24 },
    ],
    required: false,
    quality_threshold: 0.80,
    description: 'Purchase intent and buying signals',
    collection_priority: 'high',
    freshness_requirement: 'real_time'
  },

  recent_activities: {
    sources: [
      { source: 'serp_news', priority: 1, cost: 0.02, reliability: 0.90, freshness_needed: 'high', extraction_complexity: 'simple', typical_ttl_hours: 12 },
      { source: 'serp_jobs', priority: 2, cost: 0.02, reliability: 0.85, freshness_needed: 'high', extraction_complexity: 'simple', typical_ttl_hours: 24 },
    ],
    required: true,
    quality_threshold: 0.85,
    description: 'Recent news, hiring, and business activities',
    collection_priority: 'high',
    freshness_requirement: 'real_time'
  },

  budget_indicators: {
    sources: [
      { source: 'serp_news', priority: 1, cost: 0.02, reliability: 0.75, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 72 },
      { source: 'brightdata', priority: 2, cost: 0.08, reliability: 0.80, freshness_needed: 'low', extraction_complexity: 'moderate', typical_ttl_hours: 168 },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Financial health and spending indicators',
    collection_priority: 'medium',
    freshness_requirement: 'weekly'
  },

  competitive_usage: {
    sources: [
      { source: 'brightdata', priority: 1, cost: 0.08, reliability: 0.85, freshness_needed: 'medium', extraction_complexity: 'moderate', typical_ttl_hours: 168 },
      { source: 'serp_organic', priority: 2, cost: 0.02, reliability: 0.70, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 168 },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Current vendor relationships and solutions',
    collection_priority: 'medium',
    freshness_requirement: 'weekly'
  },

  growth_signals: {
    sources: [
      { source: 'serp_news', priority: 1, cost: 0.02, reliability: 0.80, freshness_needed: 'high', extraction_complexity: 'moderate', typical_ttl_hours: 24 },
      { source: 'serp_jobs', priority: 2, cost: 0.02, reliability: 0.85, freshness_needed: 'high', extraction_complexity: 'simple', typical_ttl_hours: 24 },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Growth and expansion indicators',
    collection_priority: 'medium',
    freshness_requirement: 'daily'
  },

  digital_footprint: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.85, freshness_needed: 'medium', extraction_complexity: 'moderate', typical_ttl_hours: 168 },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Online presence and digital marketing activity',
    collection_priority: 'low',
    freshness_requirement: 'weekly'
  },

  compliance_requirements: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.75, freshness_needed: 'low', extraction_complexity: 'complex', typical_ttl_hours: 336 },
    ],
    required: false,
    quality_threshold: 0.70,
    description: 'Regulatory and compliance requirements',
    collection_priority: 'low',
    freshness_requirement: 'monthly'
  },

  integration_needs: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.02, reliability: 0.70, freshness_needed: 'medium', extraction_complexity: 'complex', typical_ttl_hours: 168 },
    ],
    required: false,
    quality_threshold: 0.65,
    description: 'Technical integration requirements and preferences',
    collection_priority: 'low',
    freshness_requirement: 'weekly'
  },

  // =================================================================
  // SHARED/BASIC DATASETS
  // =================================================================

  company_name: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.01, reliability: 0.95, freshness_needed: 'low', extraction_complexity: 'simple', typical_ttl_hours: 720 },
    ],
    required: true,
    quality_threshold: 0.95,
    description: 'Official company name verification',
    collection_priority: 'high',
    freshness_requirement: 'monthly'
  },

  company_domain: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.01, reliability: 0.95, freshness_needed: 'low', extraction_complexity: 'simple', typical_ttl_hours: 720 },
    ],
    required: true,
    quality_threshold: 0.95,
    description: 'Official company website domain',
    collection_priority: 'high',
    freshness_requirement: 'monthly'
  },

  industry: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.01, reliability: 0.90, freshness_needed: 'low', extraction_complexity: 'moderate', typical_ttl_hours: 336 },
      { source: 'brightdata', priority: 2, cost: 0.05, reliability: 0.85, freshness_needed: 'low', extraction_complexity: 'simple', typical_ttl_hours: 336 },
    ],
    required: true,
    quality_threshold: 0.85,
    description: 'Primary industry classification',
    collection_priority: 'high',
    freshness_requirement: 'weekly'
  },

  employee_count: {
    sources: [
      { source: 'brightdata', priority: 1, cost: 0.05, reliability: 0.80, freshness_needed: 'medium', extraction_complexity: 'simple', typical_ttl_hours: 168 },
      { source: 'serp_organic', priority: 2, cost: 0.01, reliability: 0.70, freshness_needed: 'medium', extraction_complexity: 'moderate', typical_ttl_hours: 168 },
    ],
    required: false,
    quality_threshold: 0.75,
    description: 'Company size and employee count',
    collection_priority: 'medium',
    freshness_requirement: 'weekly'
  },

  company_overview: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.01, reliability: 0.90, freshness_needed: 'medium', extraction_complexity: 'simple', typical_ttl_hours: 168 },
      { source: 'brightdata', priority: 2, cost: 0.05, reliability: 0.85, freshness_needed: 'low', extraction_complexity: 'simple', typical_ttl_hours: 336 },
    ],
    required: true,
    quality_threshold: 0.85,
    description: 'Comprehensive company overview and description',
    collection_priority: 'high',
    freshness_requirement: 'weekly'
  },

  company_description: {
    sources: [
      { source: 'serp_organic', priority: 1, cost: 0.01, reliability: 0.85, freshness_needed: 'low', extraction_complexity: 'simple', typical_ttl_hours: 336 },
    ],
    required: false,
    quality_threshold: 0.80,
    description: 'Basic company description',
    collection_priority: 'medium',
    freshness_requirement: 'monthly'
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
    'pricing_model'
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

  // Testing with minimal cost
  test: [
    'company_name',
    'company_domain'
  ]
};

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
    skip: 'brightdata',
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
    skip: 'brightdata',
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