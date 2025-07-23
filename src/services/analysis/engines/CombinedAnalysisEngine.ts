import { Logger } from '../../core/Logger';
import { BedrockCore } from '../core/BedrockCore';
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
}

export class CombinedAnalysisEngine {
  private bedrockCore: BedrockCore;
  private logger: Logger;

  constructor(config: AnalysisConfig, logger: Logger, region?: string) {
    this.logger = logger;
    this.bedrockCore = new BedrockCore(config, logger, region);
  }

  /**
   * Combine snippet analysis with full content analysis
   */
  async combineSnippetAndFullContentAnalysis(request: CombinedAnalysisRequest): Promise<SalesInsights> {
    const { snippetAnalysis, fullContent, companyName, analysisType } = request;

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
        analysisType
      );

      const response = await this.bedrockCore.invokeModel({
        systemPrompt,
        userPrompt,
      });

      const insights = this.parseCombinedAnalysisResponse(response);

      this.logger.info('Combined analysis completed', {
        companyName,
        analysisType,
        insightsCount: insights.keyInsights?.length || 0,
        opportunitiesCount: insights.opportunities?.length || 0,
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
    const basePrompt = `You are an expert business analyst specializing in comprehensive intelligence synthesis.

Your task is to combine insights from preliminary snippet analysis with detailed content analysis to provide:
1. Enhanced and validated insights from the snippet analysis
2. Additional insights discovered from the full content
3. Comprehensive sales intelligence recommendations
4. Gap-filled analysis with increased confidence levels

Analysis Type: ${analysisType}

Key Objectives:
- Validate and enhance preliminary insights with full content
- Identify new insights missed in the snippet analysis
- Provide comprehensive sales recommendations
- Increase analysis confidence through data triangulation
- Suggest strategic actions based on complete picture

Synthesis Approach:
1. Review snippet analysis findings
2. Validate against full content
3. Identify additional insights from comprehensive data
4. Synthesize into actionable sales intelligence
5. Provide confidence-weighted recommendations`;

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
    analysisType: string
  ): string {
    return `Please provide a comprehensive analysis by combining the preliminary snippet analysis with the full content for ${companyName}.

PRELIMINARY SNIPPET ANALYSIS:
${JSON.stringify(snippetAnalysis, null, 2)}

FULL CONTENT FOR VALIDATION AND ENHANCEMENT:
${fullContent}

Please provide a comprehensive analysis in the following JSON format:
{
  "keyInsights": ["Enhanced insight 1", "New insight 2", ...],
  "painPoints": ["Validated pain point 1", "New pain point 2", ...],
  "opportunities": ["Enhanced opportunity 1", "New opportunity 2", ...],
  "competitiveAdvantages": ["Validated advantage 1", "New advantage 2", ...],
  "riskFactors": ["Enhanced risk 1", "New risk 2", ...],
  "nextSteps": ["Strategic step 1", "Tactical step 2", ...],
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
- Focus on ${analysisType}-specific strategic recommendations`;
  }

  /**
   * Parse combined analysis response into structured insights
   */
  private parseCombinedAnalysisResponse(response: string): SalesInsights {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and ensure all required fields exist
      // Build complete SalesInsights structure
      return {
        companyOverview: parsed.companyOverview || {
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
        painPoints: this.convertToCitedContent(parsed.painPoints || []),
        keyInsights: parsed.keyInsights || [],
        opportunities: this.convertToCitedContent(parsed.opportunities || []),
        competitiveAdvantages: this.convertToCitedContent(parsed.competitiveAdvantages || []),
        riskFactors: this.convertToCitedContent(parsed.riskFactors || []),
        nextSteps: this.convertToCitedContent(parsed.nextSteps || []),
        technologyStack: parsed.technologyStack || { current: [], planned: [], vendors: [], modernizationAreas: [] },
        keyContacts: parsed.keyContacts || [],
        competitiveLandscape: parsed.competitiveLandscape || { competitors: [], marketPosition: '', differentiators: [], vulnerabilities: [], battleCards: [] },
        talkingPoints: this.convertToCitedContent(parsed.talkingPoints || []),
        potentialObjections: parsed.potentialObjections || [],
        recommendedActions: this.convertToCitedContent(parsed.recommendedActions || []),
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
   * Extract text from CitedContent arrays for confidence scoring
   */
  private extractTextFromCited(citedArray?: CitedContent[]): string[] {
    if (!citedArray || !Array.isArray(citedArray)) return [];
    return citedArray.map(item => item.text);
  }
} 