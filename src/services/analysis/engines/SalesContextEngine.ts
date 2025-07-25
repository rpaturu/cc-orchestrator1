import { Logger } from '../../core/Logger';
import { BedrockCore } from '../core/BedrockCore';
import { JsonExtractor } from '../../utilities/JsonExtractor';
import {
  AnalysisRequest,
  SalesInsights,
  SalesContext,
  AuthoritativeSource,
  AnalysisConfig,
  CitedContent
} from '../types/AnalysisTypes';

export class SalesContextEngine {
  private bedrockCore: BedrockCore;
  private logger: Logger;

  constructor(config: AnalysisConfig, logger: Logger, region?: string) {
    this.logger = logger;
    this.bedrockCore = new BedrockCore(config, logger, region);
    
    // Set logger for JsonExtractor utility
    JsonExtractor.setLogger(logger);
  }

  /**
   * Analyze content for sales context using AWS Bedrock with source citations
   */
  async analyzeForSalesContext(request: AnalysisRequest): Promise<SalesInsights> {
    const { content, sources, companyName, salesContext, additionalContext } = request;

    try {
      this.logger.info('Starting sales context analysis', {
        companyName,
        salesContext,
        contentPieces: content.length,
      });

      const systemPrompt = this.buildSystemPrompt(salesContext);
      const userPrompt = this.buildUserPrompt(content, sources, companyName, salesContext, additionalContext);

      const response = await this.bedrockCore.invokeModel({
        systemPrompt,
        userPrompt,
      });

      const insights = this.parseInsights(response);

      this.logger.info('Sales context analysis completed successfully', {
        companyName,
        salesContext,
        insightsCount: insights.keyInsights?.length || 0,
      });

      return insights;
    } catch (error) {
      this.logger.error('Sales context analysis failed', {
        companyName,
        salesContext,
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
        competitiveLandscape: { 
          competitors: [], 
          marketPosition: '', 
          differentiators: [], 
          vulnerabilities: [], 
          battleCards: [] 
        },
        talkingPoints: [],
        potentialObjections: [],
        recommendedActions: [],
        dealProbability: 0,
        dealProbabilityCitations: [],
        confidence: {
          overall: 50,
          dataQuality: 50,
          sourceReliability: 50
        }
      };
    }
  }

  /**
   * Build system prompt based on sales context
   */
  private buildSystemPrompt(salesContext: SalesContext): string {
    const basePrompt = `You are an expert sales intelligence analyst specializing in B2B sales insights.
Your goal is to extract actionable sales intelligence from company information and present it in a structured format.

Key principles:
- Focus on actionable insights that can drive sales decisions
- Identify specific pain points and opportunities
- Assess competitive positioning and advantages
- Highlight potential risks and challenges
- Suggest concrete next steps for sales engagement
- Always cite your sources when making claims
- Be precise and avoid speculation without evidence

Analysis Context: ${salesContext}`;

    const contextSpecificPrompts: Record<SalesContext, string> = {
      discovery: `
For DISCOVERY analysis, focus on:
- Company overview and business model understanding
- Key decision makers and organizational structure
- Current challenges and strategic initiatives
- Technology stack and vendor relationships
- Budget cycles and procurement processes`,

      competitive: `
For COMPETITIVE analysis, focus on:
- Current vendor landscape and relationships
- Competitive positioning and differentiation
- Switching costs and vendor lock-in factors
- Feature gaps and competitive advantages
- Pricing comparison and value proposition`,

      negotiation: `
For NEGOTIATION analysis, focus on:
- Decision criteria and evaluation process
- Budget constraints and flexibility
- Contract terms and conditions preferences
- Implementation timeline and resource requirements`,

      renewal: `
For RENEWAL analysis, focus on:
- Current solution satisfaction and pain points
- Usage patterns and adoption metrics
- Expansion opportunities and additional needs
- Competitive threats and retention strategies
- Contract terms and pricing negotiations`,

      demo: `
For DEMO analysis, focus on:
- Specific use cases and technical requirements
- Integration needs and technical constraints
- User workflows and process alignment
- Feature priorities and customization needs
- Technical decision maker concerns`,

      closing: `
For CLOSING analysis, focus on:
- Final decision factors and remaining objections
- Implementation planning and resource allocation
- Contract terms and legal requirements
- Success metrics and ROI expectations
- Risk mitigation and contingency planning`
    };

    return basePrompt + (contextSpecificPrompts[salesContext] || '');
  }

  /**
   * Build user prompt with content and context
   */
  private buildUserPrompt(
    content: string[],
    sources: AuthoritativeSource[],
    companyName: string,
    salesContext: SalesContext,
    additionalContext?: string
  ): string {
    const sourceList = sources.map((source, index) => 
      `[${index + 1}] ${source.title} (${source.sourceType}) - ${source.url}`
    ).join('\n');

    const contentSections = content.map((section, index) => 
      `--- Content Section ${index + 1} ---\n${section}\n`
    ).join('\n');

    let prompt = `Please analyze the following information about ${companyName} for ${salesContext} purposes.

SOURCES:
${sourceList}

CONTENT TO ANALYZE:
${contentSections}`;

    if (additionalContext) {
      prompt += `\n\nADDITIONAL CONTEXT:
${additionalContext}`;
    }

    prompt += `\n\nPlease provide a comprehensive analysis in the following JSON format:
{
  "companyOverview": {
    "name": "Company Name",
    "size": "Company Size",
    "sizeCitations": ["citation 1", "citation 2"],
    "industry": "Company Industry",
    "revenue": "Company Revenue",
    "revenueCitations": ["citation 1", "citation 2"],
    "description": "Company Description",
    "descriptionCitations": ["citation 1", "citation 2"]
  },
  "painPoints": ["pain point 1", "pain point 2", ...],
  "keyInsights": ["insight 1", "insight 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "competitiveAdvantages": ["advantage 1", "advantage 2", ...],
  "riskFactors": ["risk 1", "risk 2", ...],
  "nextSteps": ["step 1", "step 2", ...],
  "technologyStack": {
    "current": ["technology 1", "technology 2"],
    "planned": ["technology 1", "technology 2"],
    "vendors": ["vendor 1", "vendor 2"],
    "modernizationAreas": ["area 1", "area 2"]
  },
  "keyContacts": ["contact 1", "contact 2"],
  "competitiveLandscape": {
    "mainCompetitors": ["competitor 1", "competitor 2"],
    "competitorCitations": ["citation 1", "citation 2"]
  },
  "talkingPoints": ["point 1", "point 2", ...],
  "potentialObjections": ["objection 1", "objection 2", ...],
  "recommendedActions": ["action 1", "action 2", ...],
  "dealProbability": 0,
  "dealProbabilityCitations": ["citation 1", "citation 2"],
  "confidence": {
    "overall": 50,
    "dataQuality": 50,
    "sourceReliability": 50
  }
}

Ensure all insights are:
- Specific and actionable
- Backed by evidence from the provided content
- Relevant to the ${salesContext} context
- Properly cited with source references`;

    return prompt;
  }

  /**
   * Parse AI response into structured insights
   */
  private parseInsights(response: string): SalesInsights {
    try {
      // Use shared JsonExtractor utility
      const parsed = JsonExtractor.extractAndParse(response, {
        logErrors: true,
        context: 'SalesContextEngine'
      });
      
      if (!parsed) {
        throw new Error('No JSON found in response');
      }

      // Return minimal but correct SalesInsights structure
      return {
        companyOverview: {
          name: parsed.companyOverview?.name || '',
          size: parsed.companyOverview?.size || '',
          sizeCitations: parsed.companyOverview?.sizeCitations || [],
          industry: parsed.companyOverview?.industry || '',
          revenue: parsed.companyOverview?.revenue || '',
          revenueCitations: parsed.companyOverview?.revenueCitations || [],
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
        technologyStack: { current: [], planned: [], vendors: [], modernizationAreas: [] },
        keyContacts: [],
        competitiveLandscape: { competitors: [], marketPosition: '', differentiators: [], vulnerabilities: [], battleCards: [] },
        talkingPoints: this.convertToCitedContent(parsed.talkingPoints || []),
        potentialObjections: [],
        recommendedActions: this.convertToCitedContent(parsed.recommendedActions || []),
        dealProbability: parsed.dealProbability || 0,
        dealProbabilityCitations: parsed.dealProbabilityCitations || [],
        confidence: {
          overall: 50,
          dataQuality: 50,
          sourceReliability: 50
        }
      };
    } catch (error) {
      this.logger.warn('Failed to parse insights JSON, falling back to text parsing', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback: extract insights from text using regex patterns
      return this.parseInsightsFromText(response);
    }
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
   * Fallback method to parse insights from unstructured text
   */
  private parseInsightsFromText(response: string): SalesInsights {
    const extractList = (pattern: RegExp): CitedContent[] => {
      const matches = response.match(pattern);
      if (!matches) return [];
      
      const items = matches[1]
        .split(/\n|;|,/)
        .map(item => item.trim().replace(/^[-•*]\s*/, ''))
        .filter(item => item.length > 0)
        .slice(0, 5); // Limit to 5 items
      
      return items.map(item => ({ text: item, citations: [] }));
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
      painPoints: extractList(/pain points?:?\s*([\s\S]*?)(?=opportunities|competitive|risk|next steps|key insights|$)/i),
      keyInsights: extractList(/key insights?:?\s*([\s\S]*?)(?=pain points?|opportunities|competitive|risk|next steps|$)/i).map(item => item.text),
      opportunities: extractList(/opportunities:?\s*([\s\S]*?)(?=competitive|risk|next steps|key insights|pain points|$)/i),
      competitiveAdvantages: extractList(/competitive advantages?:?\s*([\s\S]*?)(?=risk|next steps|opportunities|key insights|pain points|$)/i),
      riskFactors: extractList(/risk factors?:?\s*([\s\S]*?)(?=next steps|competitive|opportunities|key insights|pain points|$)/i),
      nextSteps: extractList(/next steps?:?\s*([\s\S]*?)(?=risk|competitive|opportunities|key insights|pain points|$)/i),
      technologyStack: { current: [], planned: [], vendors: [], modernizationAreas: [] },
      keyContacts: [],
      competitiveLandscape: { competitors: [], marketPosition: '', differentiators: [], vulnerabilities: [], battleCards: [] },
      talkingPoints: [],
      potentialObjections: [],
      recommendedActions: [],
      dealProbability: 0,
      dealProbabilityCitations: [],
      confidence: {
        overall: 50,
        dataQuality: 50,
        sourceReliability: 50
      }
    };
  }
} 