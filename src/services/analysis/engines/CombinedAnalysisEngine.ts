import { Logger } from '../../core/Logger';
import { BedrockCore } from '../core/BedrockCore';
import { CacheService } from '../../core/CacheService';
import { CacheType } from '../../../types/cache-types';
import { JsonExtractor } from '../../utilities/JsonExtractor';
import {
  SalesInsights,
  AuthoritativeSource,
  SalesContext,
  AnalysisConfig,
  CitedContent
} from '../types/AnalysisTypes';

interface CombinedAnalysisRequest {
  snippetAnalysis: any;
  fullContent: string;
  companyName: string;
  analysisType: string;
  sources?: AuthoritativeSource[];  // Add sources for Perplexity-style citations
}

export class CombinedAnalysisEngine {
  private bedrockCore: BedrockCore;
  private logger: Logger;
  private cacheService: CacheService;

  constructor(config: AnalysisConfig, logger: Logger, region?: string) {
    this.logger = logger;
    this.bedrockCore = new BedrockCore(config, logger, region);
    this.cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: false },
      logger,
      region
    );
    
    // Set logger for JsonExtractor utility
    JsonExtractor.setLogger(logger);
  }

  /**
   * Combine snippet analysis with full content analysis
   */
  async combineSnippetAndFullContentAnalysis(request: CombinedAnalysisRequest): Promise<SalesInsights> {
    const { snippetAnalysis, fullContent, companyName, analysisType, sources } = request;

    try {
      this.logger.info('Starting combined analysis', {
        companyName,
        analysisType,
        hasSnippetAnalysis: !!snippetAnalysis,
        contentLength: fullContent.length,
      });

      const systemPrompt = this.buildCombinedAnalysisSystemPrompt(analysisType);
      const userPrompt = this.buildCombinedAnalysisUserPrompt(
        snippetAnalysis,
        fullContent,
        companyName,
        analysisType,
        sources
      );

      const response = await this.bedrockCore.invokeModel({
        systemPrompt,
        userPrompt,
      });

      // Cache raw LLM response for debugging
      const rawResponseKey = `llm_raw_response:combined_analysis:${companyName}:${Date.now()}`;
      await this.cacheService.setRawJSON(rawResponseKey, {
        response,
        companyName,
        analysisType,
        timestamp: new Date().toISOString(),
        responseLength: response.length,
        prompt: { systemPrompt: systemPrompt.substring(0, 200), userPrompt: userPrompt.substring(0, 200) }
      }, CacheType.LLM_RAW_RESPONSE);
      
      this.logger.info('Raw LLM response cached for debugging', {
        companyName,
        analysisType,
        rawResponseKey,
        responseLength: response.length
      });

      const insights = this.parseCombinedAnalysisResponse(response, sources);

      this.logger.info('Combined analysis completed', {
        companyName,
        analysisType,
        insightsCount: insights.keyInsights?.length || 0,
        opportunitiesCount: insights.opportunities?.length || 0,
        sourcesCount: sources?.length || 0,
        hasPerplexityStyleCitations: true
      });

      return insights;
    } catch (error) {
      this.logger.error('Combined analysis failed', {
        companyName,
        analysisType,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty insights on failure
      return {
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
      };
    }
  }

  /**
   * Build system prompt for combined analysis
   */
  private buildCombinedAnalysisSystemPrompt(analysisType: string): string {
    const basePrompt = `You are an expert business analyst specializing in comprehensive intelligence synthesis with PERPLEXITY-STYLE TRANSPARENCY.

Your task is to combine insights from preliminary snippet analysis with detailed content analysis to provide:
1. Enhanced and validated insights from the snippet analysis
2. Additional insights discovered from the full content  
3. Comprehensive sales intelligence recommendations
4. Gap-filled analysis with increased confidence levels
5. TRANSPARENT SOURCE ATTRIBUTION for every claim

Analysis Type: ${analysisType}

Key Objectives:
- Validate and enhance preliminary insights with full content
- Identify new insights missed in the snippet analysis
- Provide comprehensive sales recommendations
- Increase analysis confidence through data triangulation
- Suggest strategic actions based on complete picture
- CITE EVERY FACTUAL CLAIM with inline source numbers [1], [2], [3]

Synthesis Approach:
1. Review snippet analysis findings
2. Validate against full content
3. Identify additional insights from comprehensive data
4. Synthesize into actionable sales intelligence
5. Provide confidence-weighted recommendations
6. ADD INLINE CITATIONS for transparency and credibility`;

    const contextSpecificGuidance = {
      discovery: `
For DISCOVERY synthesis, focus on:
- Complete company profile and market position
- Comprehensive stakeholder mapping
- Full competitive landscape analysis
- Complete technology and vendor ecosystem
- Strategic initiatives and future direction`,

      qualification: `
For QUALIFICATION synthesis, focus on:
- Complete fit assessment with validation
- Comprehensive buying process analysis
- Full stakeholder influence mapping
- Complete budget and timeline validation
- Risk-adjusted opportunity assessment`,

      competitive: `
For COMPETITIVE synthesis, focus on:
- Complete competitive positioning analysis
- Comprehensive vendor relationship mapping
- Full switching cost and barrier analysis
- Complete differentiation opportunity assessment
- Strategic competitive response planning`,

      negotiation: `
For NEGOTIATION synthesis, focus on:
- Complete value proposition alignment
- Comprehensive ROI and business case validation
- Full pricing and terms optimization
- Complete implementation readiness assessment
- Strategic negotiation positioning`
    };

    return basePrompt + (contextSpecificGuidance[analysisType as keyof typeof contextSpecificGuidance] || '');
  }

  /**
   * Build user prompt for combined analysis
   */
  private buildCombinedAnalysisUserPrompt(
    snippetAnalysis: any,
    fullContent: string,
    companyName: string,
    analysisType: string,
    sources?: AuthoritativeSource[]
  ): string {
    // Build numbered source list for Perplexity-style citations
    let sourceList = '';
    if (sources && sources.length > 0) {
      sourceList = '\n\nSOURCES (for citation):\n' + 
        sources.map((source, index) => 
          `[${index + 1}] ${source.title} (${source.sourceType}) - ${source.domain} - Credibility: ${Math.round(source.credibilityScore * 100)}%`
        ).join('\n') + '\n';
    }

    return `Please provide a comprehensive analysis by combining the preliminary snippet analysis with the full content for ${companyName}.

PRELIMINARY SNIPPET ANALYSIS:
${JSON.stringify(snippetAnalysis, null, 2)}

FULL CONTENT FOR VALIDATION AND ENHANCEMENT:
${fullContent}${sourceList}

Please provide a comprehensive analysis in the following JSON format:
{
  "companyOverview": {
    "name": "Company Name",
    "size": "Employee count or size range",
    "industry": "Primary industry or sector",
    "revenue": "Revenue information or range",
    "description": "Brief company description"
  },
  "keyInsights": ["Enhanced insight 1 with inline citation [1]", "New insight 2 based on source [2]", ...],
  "painPoints": ["Validated pain point 1 mentioned in [1]", "New pain point 2 from analysis [2]", ...],
  "opportunities": ["Enhanced opportunity 1 identified from [1][3]", "New opportunity 2 based on [2]", ...],
  "competitiveAdvantages": ["Validated advantage 1 confirmed by [1]", "New advantage 2 from sources [2][3]", ...],
  "riskFactors": ["Enhanced risk 1 highlighted in [1]", "New risk 2 from analysis [2]", ...],
  "nextSteps": ["Strategic step 1 based on findings [1]", "Tactical step 2 suggested by [2]", ...],
  "talkingPoints": ["Talking point 1 supported by [1]", "Talking point 2 from [2]", ...],
  "recommendedActions": ["Action 1 based on evidence [1]", "Action 2 from insights [2]", ...],
  "dealProbability": 0-100,
  "confidence": "high|medium|low",
  "sources": ["source 1", "source 2", ...],
  "citations": ["Enhanced citation 1 [source]", ...]
}

Synthesis Guidelines:
- Validate snippet insights against full content
- Enhance insights with additional detail from full content
- Add new insights not captured in snippet analysis
- Increase confidence levels where full content supports findings
- Provide comprehensive, actionable recommendations
- Ensure all insights are well-supported by evidence
- Focus on ${analysisType}-specific strategic recommendations

CRITICAL CITATION REQUIREMENTS (Perplexity-style):
- Add inline citations [1], [2], [3] etc. within each insight text
- Use citation numbers that correspond to the SOURCES list above
- Multiple citations per insight are encouraged: [1][2] or [1][3]
- Every factual claim should have a citation
- Only cite sources that actually support the claim
- Be transparent about which sources support which insights`;
  }

  /**
   * Parse combined analysis response into structured insights
   */
  private parseCombinedAnalysisResponse(response: string, sources?: AuthoritativeSource[]): SalesInsights {
    try {
      // Use shared JsonExtractor utility
      const parsed = JsonExtractor.extractAndParse(response, {
        logErrors: true,
        context: 'CombinedAnalysisEngine'
      });
      
      if (!parsed) {
        throw new Error('No valid JSON found in response');
      }

      // Validate and ensure all required fields exist
      // Build complete SalesInsights structure
      return {
        companyOverview: {
          name: parsed.companyOverview?.name || '',
          size: parsed.companyOverview?.size || '',
          sizeCitations: [],
          industry: parsed.companyOverview?.industry || '',
          revenue: parsed.companyOverview?.revenue || '',
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
        painPoints: this.convertToSimpleCitedContent(parsed.painPoints || []),
        keyInsights: parsed.keyInsights || [],
        opportunities: this.convertToSimpleCitedContent(parsed.opportunities || []),
        competitiveAdvantages: this.convertToSimpleCitedContent(parsed.competitiveAdvantages || []),
        riskFactors: this.convertToSimpleCitedContent(parsed.riskFactors || []),
        nextSteps: this.convertToSimpleCitedContent(parsed.nextSteps || []),
        technologyStack: parsed.technologyStack || { current: [], planned: [], vendors: [], modernizationAreas: [] },
        keyContacts: parsed.keyContacts || [],
        competitiveLandscape: parsed.competitiveLandscape || { competitors: [], marketPosition: '', differentiators: [], vulnerabilities: [], battleCards: [] },
        talkingPoints: this.convertToSimpleCitedContent(parsed.talkingPoints || []),
        potentialObjections: parsed.potentialObjections || [],
        recommendedActions: this.convertToSimpleCitedContent(parsed.recommendedActions || []),
        dealProbability: parsed.dealProbability || 0,
        dealProbabilityCitations: parsed.dealProbabilityCitations || [],
        confidence: {
          overall: 75,
          dataQuality: 75,
          sourceReliability: 75
        }
      };
    } catch (error) {
      this.logger.warn('Failed to parse combined analysis JSON, falling back to text parsing', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback: extract insights from text using regex patterns
      return this.parseSalesInsightsFromText(response);
    }
  }

  /**
   * Parse sales insights from LLM response text using regex patterns
   */
  private parseSalesInsightsFromText(content: string): SalesInsights {
    // Enhanced extractList that returns CitedContent directly
    const extractCitedContentList = (regex: RegExp): CitedContent[] => {
      const match = content.match(regex);
      if (!match) return [];

      return match[1]
        .split(/\n|\||\*|•|-/)
        .map(item => item.trim())
        .filter(item => item.length > 0 && item !== '*' && item !== '-')
        .slice(0, 7) // Limit to 7 items for comprehensive analysis
        .map(item => ({
          text: item, // Fixed: use 'text' not 'content'
          citations: [] // Empty citations for now - could be enhanced later
        }));
    };

    // Simple extractList for strings (for keyInsights which is string[])
    const extractStringList = (regex: RegExp): string[] => {
      const match = content.match(regex);
      if (!match) return [];

      return match[1]
        .split(/\n|\||\*|•|-/)
        .map(item => item.trim())
        .filter(item => item.length > 0 && item !== '*' && item !== '-')
        .slice(0, 7);
    };

    return {
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
      painPoints: extractCitedContentList(/pain points?:?\s*([\s\S]*?)(?=opportunities|competitive|risk|next steps|key insights|$)/i),
      keyInsights: extractStringList(/key insights?:?\s*([\s\S]*?)(?=pain points?|opportunities|competitive|risk|next steps|$)/i),
      opportunities: extractCitedContentList(/opportunities:?\s*([\s\S]*?)(?=competitive|risk|next steps|key insights|pain points|$)/i),
      competitiveAdvantages: extractCitedContentList(/competitive advantages?:?\s*([\s\S]*?)(?=risk|next steps|opportunities|key insights|pain points|$)/i),
      riskFactors: extractCitedContentList(/risk factors?:?\s*([\s\S]*?)(?=next steps|competitive|opportunities|key insights|pain points|$)/i),
      nextSteps: extractCitedContentList(/next steps?:?\s*([\s\S]*?)(?=risk|competitive|opportunities|key insights|pain points|$)/i),
      technologyStack: { current: [], planned: [], vendors: [], modernizationAreas: [] },
      keyContacts: [],
      competitiveLandscape: { competitors: [], marketPosition: '', differentiators: [], vulnerabilities: [], battleCards: [] },
      talkingPoints: extractCitedContentList(/talking points?:?\s*([\s\S]*?)(?=objections|recommendations|$)/i),
      potentialObjections: extractStringList(/objections?:?\s*([\s\S]*?)(?=recommendations|talking points|$)/i).map(obj => ({
        objection: obj,
        response: '',
        citations: []
      })),
      recommendedActions: extractCitedContentList(/recommendations?:?\s*([\s\S]*?)(?=objections|talking points|$)/i),
      dealProbability: 0,
      dealProbabilityCitations: [],
      confidence: {
        overall: 0.7,
        dataQuality: 0.7,
        sourceReliability: 0.8
      }
    };
  }

  /**
   * Enhanced analysis with confidence scoring
   */
  async enhancedCombinedAnalysis(
    snippetAnalysis: any,
    fullContent: string,
    companyName: string,
    salesContext: SalesContext
  ): Promise<SalesInsights & { confidenceScores: Record<string, number> }> {
    const baseAnalysis = await this.combineSnippetAndFullContentAnalysis({
      snippetAnalysis,
      fullContent,
      companyName,
      analysisType: salesContext,
    });

    // Calculate confidence scores for each insight category
    const confidenceScores = {
      keyInsights: this.calculateConfidenceScore(baseAnalysis.keyInsights || [], fullContent),
      painPoints: this.calculateConfidenceScore(this.extractTextFromCited(baseAnalysis.painPoints), fullContent),
      opportunities: this.calculateConfidenceScore(this.extractTextFromCited(baseAnalysis.opportunities), fullContent),
      competitiveAdvantages: this.calculateConfidenceScore(this.extractTextFromCited(baseAnalysis.competitiveAdvantages), fullContent),
      riskFactors: this.calculateConfidenceScore(this.extractTextFromCited(baseAnalysis.riskFactors), fullContent),
      nextSteps: this.calculateConfidenceScore(this.extractTextFromCited(baseAnalysis.nextSteps), fullContent),
    };

    return {
      ...baseAnalysis,
      confidenceScores,
    };
  }

  /**
   * Calculate confidence score based on content support
   */
  private calculateConfidenceScore(insights: string[], content: string): number {
    if (!insights.length) return 0;

    const supportedInsights = insights.filter(insight => {
      // Simple heuristic: check if key terms from insight appear in content
      const keyTerms = insight.toLowerCase().split(/\s+/).filter(term => term.length > 3);
      const supportedTerms = keyTerms.filter(term =>
        content.toLowerCase().includes(term)
      );
      return supportedTerms.length / keyTerms.length > 0.3; // 30% term overlap threshold
    });

    return Math.round((supportedInsights.length / insights.length) * 100);
  }

  /**
   * Convert array of strings to CitedContent array
   */
  private convertToCitedContent(items: any[]): CitedContent[] {
    if (!Array.isArray(items)) return [];
    return items.map(item => 
      typeof item === 'string' ? { text: item, citations: [] } : item
    );
  }

  /**
   * Convert strings to simple CitedContent format (no citation extraction)
   * Keep inline citations [1][2] in text for separate display
   */
  private convertToSimpleCitedContent(items: string[]): CitedContent[] {
    if (!Array.isArray(items)) return [];
    
    return items.map(item => ({
      text: typeof item === 'string' ? item : String(item),
      citations: [] // Empty citations - let UI handle the [1][2] numbers separately
    }));
  }

  /**
   * Extract text from CitedContent arrays for confidence scoring
   */
  private extractTextFromCited(citedArray?: CitedContent[]): string[] {
    if (!citedArray || !Array.isArray(citedArray)) return [];
    return citedArray.map(item => item.text);
  }


} 