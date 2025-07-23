import { Logger } from '../core/Logger';

// Import refactored components
import { BedrockCore } from './core/BedrockCore';
import { SalesContextEngine } from './engines/SalesContextEngine';
import { CompanyOverviewEngine } from './engines/CompanyOverviewEngine';
import { SnippetAnalysisEngine } from './engines/SnippetAnalysisEngine';
import { CombinedAnalysisEngine } from './engines/CombinedAnalysisEngine';

// Import types
import { 
  SalesInsights, 
  SalesContext, 
  AIConfig,
  AuthoritativeSource,
  AnalysisRequest,
  CompanyOverviewRequest,
  SnippetAnalysisRequest,
  CombinedAnalysisRequest,
  AnalysisConfig,
  HealthCheckResponse
} from './types/AnalysisTypes';

/**
 * Main AI Analyzer Service - Orchestrates all analysis engines
 * 
 * This refactored service maintains backward compatibility while using
 * the new modular architecture underneath.
 */
export class AIAnalyzer {
  private salesContextEngine: SalesContextEngine;
  private companyOverviewEngine: CompanyOverviewEngine;
  private snippetAnalysisEngine: SnippetAnalysisEngine;
  private combinedAnalysisEngine: CombinedAnalysisEngine;
  private bedrockCore: BedrockCore;
  private logger: Logger;
  private config: AnalysisConfig;

  constructor(config: AIConfig, logger: Logger, region?: string) {
    this.logger = logger;
    
    // Convert AIConfig to AnalysisConfig
    this.config = {
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      region,
    };

    // Initialize core Bedrock service
    this.bedrockCore = new BedrockCore(this.config, logger, region);

    // Initialize all analysis engines
    this.salesContextEngine = new SalesContextEngine(this.config, logger, region);
    this.companyOverviewEngine = new CompanyOverviewEngine(this.config, logger, region);
    this.snippetAnalysisEngine = new SnippetAnalysisEngine(this.config, logger, region);
    this.combinedAnalysisEngine = new CombinedAnalysisEngine(this.config, logger, region);
  }

  // =====================================
  // MAIN PUBLIC API METHODS (Backward Compatible)
  // =====================================

  /**
   * Analyze content for sales context using AWS Bedrock with source citations
   */
  async analyzeForSalesContext(
    content: string[],
    sources: AuthoritativeSource[],
    companyName: string,
    salesContext: SalesContext,
    additionalContext?: string
  ): Promise<SalesInsights> {
    const request: AnalysisRequest = {
      content,
      sources,
      companyName,
      salesContext,
      additionalContext,
    };

    return this.salesContextEngine.analyzeForSalesContext(request);
  }

  /**
   * Extract comprehensive company overview from content
   */
  async extractCompanyOverview(
    content: string,
    companyName: string,
    requestType: 'discovery' | 'overview' | 'analysis' = 'overview'
  ): Promise<{
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
  }> {
    const request: CompanyOverviewRequest = {
      content,
      companyName,
      requestType,
    };

    return this.companyOverviewEngine.extractCompanyOverview(request);
  }

  /**
   * Analyze snippets and identify information gaps
   */
  async analyzeSnippetsAndIdentifyGaps(
    snippets: string[],
    companyName: string,
    analysisType: string
  ): Promise<{
    summary: string;
    keyInsights: string[];
    identifiedGaps: string[];
    dataQuality: string;
    confidenceLevel: string;
    additionalQuestionsNeeded: string[];
  }> {
    const request: SnippetAnalysisRequest = {
      snippets,
      companyName,
      analysisType,
    };

    return this.snippetAnalysisEngine.analyzeSnippetsAndIdentifyGaps(request);
  }

  /**
   * Combine snippet analysis with full content analysis
   */
  async combineSnippetAndFullContentAnalysis(
    snippetAnalysis: any,
    fullContent: string,
    companyName: string,
    analysisType: string
  ): Promise<SalesInsights> {
    const request: CombinedAnalysisRequest = {
      snippetAnalysis,
      fullContent,
      companyName,
      analysisType,
    };

    return this.combinedAnalysisEngine.combineSnippetAndFullContentAnalysis(request);
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Parse user input with a simple model call
   */
  async parseUserInput(prompt: string): Promise<string> {
    return this.bedrockCore.parseUserInput(prompt);
  }

  /**
   * Health check for the AI analysis service
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.bedrockCore.healthCheck();
  }

  // =====================================
  // ENHANCED ANALYSIS METHODS
  // =====================================

  /**
   * Get comprehensive sales intelligence (combines multiple analysis types)
   */
  async getComprehensiveSalesIntelligence(
    content: string[],
    sources: AuthoritativeSource[],
    companyName: string,
    salesContext: SalesContext,
    additionalContext?: string
  ): Promise<{
    salesInsights: SalesInsights;
    companyOverview: any;
    gapAnalysis: any;
    confidence: number;
  }> {
    try {
      this.logger.info('Starting comprehensive sales intelligence analysis', {
        companyName,
        salesContext,
        contentPieces: content.length,
      });

      // Run analyses in parallel for efficiency
      const [salesInsights, companyOverview, gapAnalysis] = await Promise.allSettled([
        this.analyzeForSalesContext(content, sources, companyName, salesContext, additionalContext),
        this.extractCompanyOverview(content.join('\n\n'), companyName, 'discovery'),
        this.analyzeSnippetsAndIdentifyGaps(content, companyName, salesContext),
      ]);

      const results = {
        salesInsights: salesInsights.status === 'fulfilled' ? salesInsights.value : {
          companyOverview: {
            name: '',
            size: '',
            sizeCitations: [],
            industry: '',
            revenue: '',
            revenueCitations: [],
            recentNews: [],
            growth: {
              hiring: false,
              hiringCitations: [],
              funding: false,
              fundingCitations: [],
              expansion: false,
              expansionCitations: [],
              newProducts: false,
              partnerships: false
            },
            challenges: []
          },
          painPoints: [],
          keyInsights: [],
          opportunities: [],
          competitiveAdvantages: [],
          riskFactors: [],
          nextSteps: [],
          technologyStack: { current: [], planned: [], vendors: [], modernizationAreas: [] },
          keyContacts: [],
          competitiveLandscape: { competitors: [], marketPosition: '', differentiators: [], vulnerabilities: [], battleCards: [] },
          talkingPoints: [],
          potentialObjections: [],
          recommendedActions: [],
          dealProbability: 0,
          dealProbabilityCitations: [],
          confidence: {
            overall: 25,
            dataQuality: 25,
            sourceReliability: 25
          }
        },
        companyOverview: companyOverview.status === 'fulfilled' ? companyOverview.value : null,
        gapAnalysis: gapAnalysis.status === 'fulfilled' ? gapAnalysis.value : null,
        confidence: this.calculateOverallConfidence(
          salesInsights.status === 'fulfilled' ? salesInsights.value : null,
          gapAnalysis.status === 'fulfilled' ? gapAnalysis.value : null
        ),
      };

      this.logger.info('Comprehensive sales intelligence analysis completed', {
        companyName,
        salesContext,
        confidence: results.confidence,
      });

      return results;
    } catch (error) {
      this.logger.error('Comprehensive sales intelligence analysis failed', {
        companyName,
        salesContext,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Quick gap assessment for rapid analysis
   */
  async quickGapAssessment(content: string[], requiredInfo: string[]): Promise<{
    coverage: number;
    missingInfo: string[];
    recommendations: string[];
  }> {
    return this.snippetAnalysisEngine.quickGapAssessment(content, requiredInfo);
  }

  /**
   * Enhanced combined analysis with confidence scoring
   */
  async enhancedCombinedAnalysis(
    snippetAnalysis: any,
    fullContent: string,
    companyName: string,
    salesContext: SalesContext
  ): Promise<SalesInsights & { confidenceScores: Record<string, number> }> {
    return this.combinedAnalysisEngine.enhancedCombinedAnalysis(
      snippetAnalysis,
      fullContent,
      companyName,
      salesContext
    );
  }

  // =====================================
  // PRIVATE HELPER METHODS
  // =====================================

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(salesInsights: SalesInsights | null, gapAnalysis: any): number {
    let confidence = 50; // Base confidence

    if (salesInsights) {
      // Increase confidence based on insights quality
      if (salesInsights.keyInsights && salesInsights.keyInsights.length > 3) confidence += 15;
      if (salesInsights.opportunities && salesInsights.opportunities.length > 2) confidence += 10;
      
      // Adjust based on stated confidence object
      if (salesInsights.confidence && salesInsights.confidence.overall > 80) confidence += 15;
      else if (salesInsights.confidence && salesInsights.confidence.overall < 40) confidence -= 15;
    }

    if (gapAnalysis) {
      // Adjust based on data quality
      const qualityScores = { excellent: 20, good: 10, fair: 0, poor: -15 };
      confidence += qualityScores[gapAnalysis.dataQuality as keyof typeof qualityScores] || 0;
      
      // Penalize for many gaps
      if (gapAnalysis.identifiedGaps.length > 5) confidence -= 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }
} 