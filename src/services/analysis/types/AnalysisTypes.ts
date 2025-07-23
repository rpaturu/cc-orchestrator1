/**
 * AnalysisTypes - Comprehensive type definitions for analysis engines
 */

// Import core types and re-export them for use by other analysis files
import { AuthoritativeSource, SalesContext } from '../../../types/index';
export { AuthoritativeSource, SalesContext };


// Analysis context and configuration
export interface AnalysisContext {
  companyName: string;
  domain?: string;
  sources: AuthoritativeSource[];
  requestId: string;
  salesContext: SalesContext;
  // ... rest of existing interface ...
}

// Re-export types from the main types index
export type { 
  SalesInsights, 
  AIConfig,
  CitedContent
} from '../../../types';

// Analysis-specific interfaces
export interface AnalysisRequest {
  content: string[];
  sources: AuthoritativeSource[];
  companyName: string;
  salesContext: SalesContext;
  additionalContext?: string;
}

export interface CompanyOverviewRequest {
  content: string;
  companyName: string;
  requestType: 'discovery' | 'overview' | 'analysis';
}

export interface SnippetAnalysisRequest {
  snippets: string[];
  companyName: string;
  analysisType: string;
}

export interface CombinedAnalysisRequest {
  snippetAnalysis: any;
  fullContent: string;
  companyName: string;
  analysisType: string;
}

export interface BedrockRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface BedrockResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AnalysisConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  region?: string;
}

// Response parsing interfaces
export interface ParsedOverviewResponse {
  companyName: string;
  description: string;
  industry: string;
  businessModel: string;
  products: string[];
  keyFinancials: string;
  competitivePosition: string;
  recentDevelopments: string[];
  riskFactors: string[];
  citations: string[];
}

export interface ParsedSnippetAnalysis {
  summary: string;
  keyInsights: string[];
  identifiedGaps: string[];
  dataQuality: string;
  confidenceLevel: string;
  additionalQuestionsNeeded: string[];
}

// Prompt building types
export interface PromptContext {
  salesContext: SalesContext;
  companyName: string;
  analysisType?: string;
  additionalContext?: string;
}

export interface SystemPromptConfig {
  context: SalesContext | string;
  analysisType?: string;
  includeInstructions?: boolean;
  includeCitations?: boolean;
}

export interface UserPromptConfig {
  content: string[] | string;
  sources?: AuthoritativeSource[];
  companyName: string;
  additionalContext?: string;
  snippets?: string[];
  fullContent?: string;
  snippetAnalysis?: any;
}

// Health check response
export interface HealthCheckResponse {
  status: string;
  model: string;
  region: string;
}

// Error types
export interface AnalysisError {
  code: string;
  message: string;
  context?: any;
}

// Model configuration constants
export const MODEL_CONFIGS = {
  CLAUDE_3_SONNET: {
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    maxTokens: 4000,
    temperature: 0.1,
  },
  CLAUDE_3_HAIKU: {
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    maxTokens: 4000,
    temperature: 0.1,
  },
  LLAMA_2_70B: {
    modelId: 'meta.llama2-70b-chat-v1',
    maxTokens: 2000,
    temperature: 0.1,
  },
  TITAN_TEXT: {
    modelId: 'amazon.titan-text-express-v1',
    maxTokens: 4000,
    temperature: 0.1,
  },
} as const;

export type SupportedModel = keyof typeof MODEL_CONFIGS;

// Analysis context types
export type AnalysisMode = 'sales_context' | 'company_overview' | 'snippet_analysis' | 'combined_analysis';

export interface AnalysisMetadata {
  mode: AnalysisMode;
  startTime: number;
  endTime?: number;
  tokensUsed?: number;
  model: string;
  confidence?: number;
} 