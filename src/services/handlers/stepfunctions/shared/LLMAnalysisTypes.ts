/**
 * Shared Types and Interfaces for LLM Analysis Handlers
 * 
 * Common types used across vendor and customer LLM analysis workflows
 */

import { DatasetType } from '../../../../types/dataset-requirements';
import { MultiSourceData } from '../../../../types/orchestrator-types';

/**
 * Base event structure for LLM analysis handlers
 */
export interface LLMAnalysisEvent {
  companyName: string;
  vendorCompany?: string;
  requester: string;
  data: MultiSourceData;
  requestId: string;
  userPersona?: {
    role: 'AE' | 'CSM' | 'SE';
    name?: string;
    segment?: string;
    region?: string;
  };
  workflowType: 'vendor_context' | 'customer_intelligence';
  datasetsCollected?: DatasetType[];
  refresh?: boolean;
}

/**
 * Base response structure for LLM analysis handlers
 */
export interface LLMAnalysisResponse {
  companyName: string;
  vendorCompany?: string | null;
  requester: string;
  analysis?: any;  // ✅ Made optional for cache-based responses
  analysisRef?: string;  // ✅ Cache key reference to full analysis
  rawResponseRef?: string;  // ✅ Cache key reference to raw LLM response
  source: 'cache' | 'llm' | 'error';
  cost: number;
  requestId: string;
  workflowStep: 'llm_analysis';
  workflowType: string;
  data: MultiSourceData;
  error?: string;
}

/**
 * Structured Customer Intelligence Output
 */
export interface CustomerIntelligenceOutput {
  customer: {
    name: string;
    industry?: string;
    size?: string;
    headquarters?: string;
    founded?: string;
    description?: string;
  };
  news_signals: Array<{
    date: string;
    headline: string;
    source: string;
    insight: string;
    signal_type: 'expansion' | 'funding' | 'hiring' | 'product' | 'leadership' | 'partnership';
  }>;
  tech_stack: {
    frontend?: string[];
    backend?: string[];
    infrastructure?: string[];
    analytics?: string[];
    collaboration?: string[];
    security?: string[];
    observations: string[];
  };
  target_contacts: Array<{
    name?: string;
    title: string;
    role: 'Decision Maker' | 'Champion' | 'Technical Buyer' | 'Influencer';
    persona_fit: string;
    signal?: string;
  }>;
  recommended_products: Array<{
    product: string;
    reason: string;
    outcome: string;
    dataset_source: DatasetType;
  }>;
  competitor_context: {
    known_usage?: string[];
    pain_points?: string[];
    positioning_advantage: string;
    objection_handling: string[];
  };
  talking_points: string[];
  opportunity_signals: Array<{
    signal: string;
    source: string;
    urgency: 'high' | 'medium' | 'low';
    action: string;
  }>;
  data_quality: {
    completeness: number;
    freshness: number;
    reliability: number;
    overall: number;
  };
  last_updated: string;
}

/**
 * Structured Vendor Context Output
 */
export interface VendorContextOutput {
  companyName: string;
  industry: string;
  products: string[];
  targetMarkets: string[];
  competitors: string[];
  valuePropositions: string[];
  positioningStrategy: string;
  pricingModel: string;
  companySize: string;
  marketPresence: string;
  recentNews: string[];
  keyExecutives: string[];
  businessChallenges: string[];
  growthIndicators: string[];
  techStack: string[];
  partnerships: string[];
  data_quality: {
    completeness: number;
    freshness: number;
    reliability: number;
    overall: number;
  };
  last_updated: string;
}

/**
 * Data quality assessment structure
 */
export interface DataQuality {
  completeness: number;
  freshness: number;
  reliability: number;
  overall: number;
}

/**
 * Cache configuration for LLM analysis
 */
export interface LLMAnalysisCache {
  analysisKey: string;
  cacheType: string;
  ttlHours: number;
} 