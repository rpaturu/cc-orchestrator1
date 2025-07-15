import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { 
  SalesInsights, 
  SalesContext, 
  AIConfig,
  AuthoritativeSource,
  CitedContent
} from '@/types';
import { Logger } from './Logger';

export class AIAnalyzer {
  private readonly bedrock: BedrockRuntimeClient;
  private readonly logger: Logger;
  private readonly config: AIConfig;

  constructor(config: AIConfig, logger: Logger, region?: string) {
    this.config = config;
    this.logger = logger;
    this.bedrock = new BedrockRuntimeClient({ region });
  }

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
    try {
      this.logger.info('Starting AI analysis with Bedrock', {
        companyName,
        salesContext,
        contentPieces: content.length,
        model: this.config.model
      });

      const systemPrompt = this.buildSystemPrompt(salesContext);
      const userPrompt = this.buildUserPrompt(content, sources, companyName, salesContext, additionalContext);

      const response = await this.invokeBedrock(systemPrompt, userPrompt);
      const insights = this.parseInsights(response);

      this.logger.info('AI analysis completed successfully', {
        companyName,
        salesContext,
        insightsGenerated: true
      });

      return insights;

    } catch (error) {
      this.logger.error('AI analysis failed', { 
        companyName, 
        salesContext, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract comprehensive company overview for enhanced sales intelligence
   */
  async extractCompanyOverview(
    content: string[],
    sources: AuthoritativeSource[],
    companyName: string
  ): Promise<{
    name: string;
    domain: string;
    industry: string;
    description: string;
    foundedYear?: number;
    financialData?: {
      stockSymbol?: string;
      stockExchange?: string;
      marketCap?: string;
      revenue?: string;
      revenueGrowth?: string;
      totalFunding?: string;
      latestFundingRound?: {
        type: string;
        amount: string;
        date: string;
        investors: string[];
        citations: number[];
      };
      peRatio?: number;
      citations: number[];
    };
    employeeCount?: number;
    employeeRange?: string;
    leadership?: Array<{
      name: string;
      title: string;
      department?: string;
      background?: string;
      citations: number[];
    }>;
    marketData?: {
      marketSize?: string;
      marketShare?: string;
      marketPosition?: string;
      majorCompetitors?: string[];
      competitiveAdvantages?: string[];
      citations: number[];
    };
    products?: string[];
    services?: string[];
    recentNews?: Array<{
      title: string;
      summary: string;
      date: string;
      source: string;
      relevance: 'high' | 'medium' | 'low';
      citations: number[];
    }>;
    majorCustomers?: string[];
    businessModel?: string;
    revenueModel?: string;
    pricingStructure?: Array<{
      name: string;
      price: string;
      period: string;
      features?: string[];
      citations: number[];
    }>;
    performanceMetrics?: Array<{
      name: string;
      value: string;
      trend?: 'up' | 'down' | 'stable';
      period?: string;
      citations: number[];
    }>;
    competitivePosition?: string;
    keyDifferentiators?: string[];
    confidence: {
      overall: number;
      financial: number;
      leadership: number;
      market: number;
      products: number;
      size: number;
      revenue: number;
    };
  }> {
    try {
      this.logger.info('Starting comprehensive company overview extraction', {
        companyName,
        contentPieces: content.length,
        model: this.config.model
      });

      const systemPrompt = this.buildComprehensiveOverviewSystemPrompt();
      const userPrompt = this.buildComprehensiveOverviewUserPrompt(content, sources, companyName);

      const response = await this.invokeBedrock(systemPrompt, userPrompt);
      const overview = this.parseComprehensiveOverviewResponse(response);

      this.logger.info('Comprehensive company overview extraction completed', {
        companyName,
        confidence: overview.confidence.overall
      });

      return overview;
    } catch (error) {
      this.logger.error('Comprehensive company overview extraction failed', { error: error instanceof Error ? error.message : String(error) });
      
      // Return fallback response with basic structure
      return {
        name: companyName,
        domain: '',
        industry: 'Technology',
        description: 'Company information not available',
        confidence: {
          overall: 0.1,
          financial: 0.1,
          leadership: 0.1,
          market: 0.1,
          products: 0.1,
          size: 0.1,
          revenue: 0.1
        }
      };
    }
  }

  /**
   * STEP 1: Analyze search snippets first and identify information gaps
   */
  async analyzeSnippetsAndIdentifyGaps(
    snippets: Array<{title: string, snippet: string, url: string, sourceDomain: string}>,
    companyName: string,
    analysisType: 'overview' | 'discovery' | 'analysis' = 'overview'
  ): Promise<{
    snippetInsights: any;
    missingInfo: string[];
    criticalUrls: Array<{url: string, reason: string, priority: number}>;
    confidence: number;
  }> {
    try {
      this.logger.info('Analyzing snippets and identifying gaps', { 
        companyName, 
        snippetCount: snippets.length,
        analysisType 
      });

      const systemPrompt = this.buildSnippetAnalysisSystemPrompt(analysisType);
      const userPrompt = this.buildSnippetAnalysisUserPrompt(snippets, companyName, analysisType);

      const response = await this.invokeBedrock(systemPrompt, userPrompt);
      const analysis = this.parseSnippetAnalysisResponse(response);

      this.logger.info('Snippet analysis completed', { 
        companyName, 
        confidence: analysis.confidence,
        missingInfoCount: analysis.missingInfo.length,
        criticalUrlsCount: analysis.criticalUrls.length
      });

      return analysis;
    } catch (error) {
      this.logger.error('Snippet analysis failed', { error: error instanceof Error ? error.message : String(error) });
      
      // Return fallback response
      return {
        snippetInsights: { summary: `Basic information available for ${companyName}` },
        missingInfo: ['detailed_financial_data', 'recent_developments', 'leadership_info'],
        criticalUrls: snippets.slice(0, 3).map((s, i) => ({
          url: s.url,
          reason: 'Contains promising information',
          priority: i + 1
        })),
        confidence: 0.3
      };
    }
  }

  /**
   * STEP 2: Combine snippet insights with selective full content
   */
  async combineSnippetAndFullContentAnalysis(
    snippetInsights: any,
    fullContent: string[],
    sources: AuthoritativeSource[],
    companyName: string,
    analysisType: 'overview' | 'discovery' | 'analysis' = 'overview'
  ): Promise<any> {
    try {
      this.logger.info('Combining snippet and full content analysis', { 
        companyName, 
        contentPieces: fullContent.length,
        analysisType 
      });

      const systemPrompt = this.buildCombinedAnalysisSystemPrompt(analysisType);
      const userPrompt = this.buildCombinedAnalysisUserPrompt(
        snippetInsights, 
        fullContent, 
        sources, 
        companyName, 
        analysisType
      );

      const response = await this.invokeBedrock(systemPrompt, userPrompt);
      
      if (analysisType === 'overview') {
        const overview = this.parseComprehensiveOverviewResponse(response);
        this.logger.info('Combined analysis completed', { 
          companyName, 
          confidence: overview.confidence.overall 
        });
        return overview;
      }

      // For other analysis types, parse accordingly
      const analysis = this.parseInsights(response);
      return analysis;

    } catch (error) {
      this.logger.error('Combined analysis failed', { error: error instanceof Error ? error.message : String(error) });
      
      // Return fallback based on snippets only
      return {
        name: companyName,
        domain: '',
        industry: 'Technology',
        description: 'Company information based on search snippets',
        confidence: { overall: 0.4 }
      };
    }
  }

  /**
   * Parse user input using AI for extracting company and sales context
   */
  async parseUserInput(prompt: string): Promise<string> {
    try {
      this.logger.info('Parsing user input with AI', { prompt });
      
      const systemPrompt = 'You are a precise input parser. Return only valid JSON as requested.';
      const response = await this.invokeBedrock(systemPrompt, prompt);
      
      this.logger.info('User input parsing completed', { response });
      return response;
    } catch (error) {
      this.logger.error('User input parsing failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Health check for Bedrock service
   */
  async healthCheck(): Promise<{ status: string; model: string; region: string }> {
    try {
      const testPrompt = 'Hello, this is a health check. Please respond with "OK".';
      const response = await this.invokeBedrock(
        'You are a helpful assistant. Respond concisely.',
        testPrompt
      );
      
      const region = await this.bedrock.config.region();
      return {
        status: response.length > 0 ? 'healthy' : 'unhealthy',
        model: this.config.model,
        region: typeof region === 'string' ? region : 'unknown'
      };
    } catch (error) {
      this.logger.error('Bedrock health check failed', { error });
      const region = await this.bedrock.config.region();
      return {
        status: 'unhealthy',
        model: this.config.model,
        region: typeof region === 'string' ? region : 'unknown'
      };
    }
  }

  /**
   * Invoke Bedrock model
   */
  private async invokeBedrock(systemPrompt: string, userPrompt: string): Promise<string> {
    const modelId = this.config.model;
    
    let requestBody: any;
    
    // Different models have different input formats
    if (modelId.includes('claude')) {
      // Claude models
      requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt
          }
        ]
      };
    } else if (modelId.includes('llama')) {
      // Llama models
      requestBody = {
        prompt: `<s>[INST] ${systemPrompt}\n\n${userPrompt} [/INST]`,
        max_gen_len: this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: 0.9
      };
    } else if (modelId.includes('titan')) {
      // Titan models
      requestBody = {
        inputText: `${systemPrompt}\n\nHuman: ${userPrompt}\n\nAssistant:`,
        textGenerationConfig: {
          maxTokenCount: this.config.maxTokens,
          temperature: this.config.temperature,
          topP: 0.9,
          stopSequences: ["Human:", "User:"]
        }
      };
    } else {
      throw new Error(`Unsupported model: ${modelId}`);
    }

    const input: InvokeModelCommandInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    };

    const command = new InvokeModelCommand(input);
    const response = await this.bedrock.send(command);

    if (!response.body) {
      throw new Error('No response body from Bedrock');
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract content based on model type
    if (modelId.includes('claude')) {
      return responseBody.content[0].text;
    } else if (modelId.includes('llama')) {
      return responseBody.generation;
    } else if (modelId.includes('titan')) {
      return responseBody.results[0].outputText;
    }

    throw new Error(`Unknown response format for model: ${modelId}`);
  }

  /**
   * Build system prompt based on sales context
   */
  private buildSystemPrompt(salesContext: SalesContext): string {
    const basePrompt = `You are a sales intelligence analyst. Your role is to analyze company information and provide actionable insights for sales professionals.

IMPORTANT: When analyzing content, you must include inline citations [N] where N is the source number provided in the content. Each claim should be supported by specific sources.

You must respond with a valid JSON object containing sales insights. The response should be structured exactly as follows:

{
  "companyOverview": {
    "name": "Company Name",
    "industry": "Industry",
    "size": "Employee count or range",
    "revenue": "Revenue range or estimate",
    "recentNews": ["news item 1", "news item 2"],
    "growth": {
      "hiring": true/false,
      "funding": true/false,
      "expansion": true/false
    }
  },
  "painPoints": ["pain point 1", "pain point 2"],
  "technologyStack": {
    "current": ["tech 1", "tech 2"],
    "planned": ["planned tech 1"],
    "vendors": ["vendor 1", "vendor 2"]
  },
  "keyContacts": [
    {
      "name": "Contact Name",
      "title": "Job Title",
      "influence": "high/medium/low",
      "approachStrategy": "How to approach this contact"
    }
  ],
  "competitiveLandscape": {
    "competitors": [
      {
        "name": "Competitor Name",
        "marketShare": "percentage or description",
        "strengths": ["strength 1"],
        "weaknesses": ["weakness 1"]
      }
    ],
    "marketPosition": "Description of market position",
    "differentiators": ["differentiator 1", "differentiator 2"]
  },
  "talkingPoints": ["talking point 1", "talking point 2"],
  "potentialObjections": ["objection 1", "objection 2"],
  "dealProbability": 75
}`;

    const contextSpecificPrompts = {
      discovery: `Focus on identifying pain points, growth signals, and technology gaps. Look for expansion indicators and budget signals.`,
      competitive: `Emphasize competitive analysis, vendor evaluation criteria, and differentiation opportunities. Identify decision criteria and competitive threats.`,
      renewal: `Focus on satisfaction indicators, contract renewal signals, and relationship health. Look for expansion opportunities and retention risks.`,
      demo: `Highlight technical requirements, use cases, and integration needs. Focus on success metrics and implementation considerations.`,
      negotiation: `Emphasize budget information, decision timelines, and procurement processes. Look for urgency signals and decision authority.`,
      closing: `Focus on implementation readiness, stakeholder alignment, and go-live requirements. Identify potential blockers and success factors.`
    };

    return `${basePrompt}\n\nSales Context: ${salesContext}\n${contextSpecificPrompts[salesContext]}`;
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
    // Create numbered sources for AI reference
    const numberedSources = sources.map((source, index) => 
      `[${index + 1}] ${source.title} - ${source.domain} (${source.url})`
    ).join('\n');
    
    const contentWithSources = content.map((text, index) => 
      `Source [${index + 1}]: ${text}`
    ).join('\n\n---\n\n');
    
    return `Please analyze the following information about ${companyName} and provide sales intelligence insights in the exact JSON format specified.

Company: ${companyName}
Sales Context: ${salesContext}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Available Sources:
${numberedSources}

Content to analyze (with source references):
${contentWithSources}

Remember to include citation numbers [N] in your responses where N corresponds to the source numbers above.

Please provide a comprehensive analysis in the specified JSON format. Ensure all fields are populated with relevant information based on the available content. If specific information is not available, provide reasonable estimates or indicate "Not available" where appropriate.`;
  }

  /**
   * Parse AI response into structured insights
   */
  private parseInsights(response: string): SalesInsights {
    try {
      // Clean up the response - remove any markdown formatting
      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanResponse);
      
      // Validate and structure the response
      const insights: SalesInsights = {
        companyOverview: {
          name: parsed.companyOverview?.name || 'Unknown',
          industry: parsed.companyOverview?.industry || 'Unknown',
          size: parsed.companyOverview?.size || 'Unknown',
          revenue: parsed.companyOverview?.revenue || 'Unknown',
          recentNews: parsed.companyOverview?.recentNews?.map((news: any) => ({
            title: news.title || 'Unknown',
            summary: news.summary || 'No summary available',
            date: news.date || new Date().toISOString(),
            source: news.source || 'Unknown',
            relevance: news.relevance || 'medium',
            citations: news.citations || []
          })) || [],
          sizeCitations: [],
          revenueCitations: [],
          growth: {
            hiring: parsed.companyOverview?.growth?.hiring || false,
            hiringCitations: [],
            funding: parsed.companyOverview?.growth?.funding || false,
            fundingCitations: [],
            expansion: parsed.companyOverview?.growth?.expansion || false,
            expansionCitations: [],
            newProducts: parsed.companyOverview?.growth?.newProducts || false,
            partnerships: parsed.companyOverview?.growth?.partnerships || false
          },
          challenges: (parsed.companyOverview?.challenges || []).map((challenge: any) => ({
            text: typeof challenge === 'string' ? challenge : challenge.text || 'Unknown challenge',
            citations: challenge.citations || []
          }))
        },
        painPoints: (parsed.painPoints || []).map((point: any) => ({
          text: typeof point === 'string' ? point : point.text || 'Unknown pain point',
          citations: point.citations || []
        })),
        technologyStack: {
          current: parsed.technologyStack?.current || [],
          planned: parsed.technologyStack?.planned || [],
          vendors: parsed.technologyStack?.vendors || [],
          modernizationAreas: parsed.technologyStack?.modernizationAreas || []
        },
        keyContacts: parsed.keyContacts?.map((contact: any) => ({
          name: contact.name || 'Unknown',
          title: contact.title || 'Unknown',
          department: contact.department || 'Unknown',
          linkedin: contact.linkedin,
          email: contact.email,
          influence: contact.influence || 'medium',
          approachStrategy: contact.approachStrategy || 'Standard approach'
        })) || [],
        competitiveLandscape: {
          competitors: parsed.competitiveLandscape?.competitors?.map((comp: any) => ({
            name: comp.name || 'Unknown',
            strength: comp.strength || 'medium',
            marketShare: comp.marketShare || 'Unknown',
            advantages: comp.advantages || [],
            weaknesses: comp.weaknesses || []
          })) || [],
          marketPosition: parsed.competitiveLandscape?.marketPosition || 'Unknown',
          differentiators: parsed.competitiveLandscape?.differentiators || [],
          vulnerabilities: parsed.competitiveLandscape?.vulnerabilities || [],
          battleCards: parsed.competitiveLandscape?.battleCards?.map((card: any) => ({
            competitor: card.competitor || 'Unknown',
            keyMessages: card.keyMessages || [],
            objectionHandling: card.objectionHandling || [],
            winStrategies: card.winStrategies || []
          })) || []
        },
        talkingPoints: (parsed.talkingPoints || []).map((point: any) => ({
          text: typeof point === 'string' ? point : point.text || 'Unknown talking point',
          citations: point.citations || []
        })),
        potentialObjections: parsed.potentialObjections?.map((obj: any) => ({
          objection: obj.objection || obj,
          response: obj.response || 'Standard response',
          supporting_data: obj.supporting_data
        })) || [],
        recommendedActions: (parsed.recommendedActions || []).map((action: any) => ({
          text: typeof action === 'string' ? action : action.text || 'Unknown action',
          citations: action.citations || []
        })),
        dealProbability: parsed.dealProbability || 50,
        dealProbabilityCitations: []
      };

      return insights;

    } catch (error) {
      this.logger.error('Failed to parse AI response', { error, response: response.substring(0, 500) });
      
      // Return a default structure if parsing fails
      return {
        companyOverview: {
          name: 'Unknown',
          industry: 'Unknown',
          size: 'Unknown',
          sizeCitations: [],
          revenue: 'Unknown',
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
        painPoints: [{ text: 'Analysis failed - please try again', citations: [] }],
        technologyStack: { 
          current: [], 
          planned: [], 
          vendors: [],
          modernizationAreas: []
        },
        keyContacts: [],
        competitiveLandscape: {
          competitors: [],
          marketPosition: 'Unknown',
          differentiators: [],
          vulnerabilities: [],
          battleCards: []
        },
        talkingPoints: [{ text: 'Analysis failed - please try again', citations: [] }],
        potentialObjections: [],
        recommendedActions: [{ text: 'Analysis failed - please try again', citations: [] }],
        dealProbability: 0,
        dealProbabilityCitations: []
      };
    }
  }

  /**
   * Build comprehensive system prompt for company overview extraction
   */
  private buildComprehensiveOverviewSystemPrompt(): string {
    return `You are a comprehensive business intelligence analyst specializing in extracting detailed company information for sales and business intelligence purposes.

Your task: Extract comprehensive company information from provided content to create a detailed company profile for business intelligence and sales use.

REQUIRED OUTPUT: Valid JSON with this exact structure:
{
  "name": "Official company name [source_numbers]",
  "domain": "company.com",
  "industry": "Primary industry classification [source_numbers]", 
  "description": "Comprehensive company description [source_numbers]",
  "foundedYear": 2006,
  "financialData": {
    "stockSymbol": "SHOP",
    "stockExchange": "NASDAQ",
    "marketCap": "$145.3B [source_numbers]",
    "revenue": "$7.1B (2023) [source_numbers]",
    "revenueGrowth": "26% YoY [source_numbers]",
    "totalFunding": "$122M [source_numbers]",
    "latestFundingRound": {
      "type": "Series C",
      "amount": "$100M",
      "date": "2023-01-15",
      "investors": ["Investor A", "Investor B"],
      "citations": [1, 2]
    },
    "peRatio": 91.9,
    "citations": [1, 2, 3]
  },
  "employeeCount": 8100,
  "employeeRange": "5,000-10,000 employees [source_numbers]",
  "leadership": [
    {
      "name": "John Doe",
      "title": "CEO",
      "department": "Executive",
      "background": "Former CTO at TechCorp",
      "citations": [2, 3]
    }
  ],
  "marketData": {
    "marketSize": "$24B global e-commerce platform market [source_numbers]",
    "marketShare": "10% of global e-commerce platforms [source_numbers]",
    "marketPosition": "Leading e-commerce platform provider [source_numbers]",
    "majorCompetitors": ["Competitor A", "Competitor B"],
    "competitiveAdvantages": ["Ease of use", "Scalability"],
    "citations": [1, 2]
  },
  "products": ["E-commerce Platform", "POS System", "Payment Processing"],
  "services": ["Platform hosting", "Payment processing", "Analytics"],
  "recentNews": [
    {
      "title": "Company launches new AI feature",
      "summary": "Brief summary of the news",
      "date": "2024-01-15",
      "source": "TechCrunch",
      "relevance": "high",
      "citations": [1]
    }
  ],
  "majorCustomers": ["Tesla", "Allbirds", "Gymshark"],
  "businessModel": "SaaS subscription model [source_numbers]",
  "revenueModel": "Monthly/yearly subscriptions with transaction fees [source_numbers]",
  "pricingStructure": [
    {
      "name": "Basic",
      "price": "$29/month",
      "period": "monthly",
      "features": ["Online store", "Unlimited products"],
      "citations": [2]
    }
  ],
  "performanceMetrics": [
    {
      "name": "Monthly Recurring Revenue",
      "value": "$150M",
      "trend": "up",
      "period": "Q4 2023",
      "citations": [1]
    }
  ],
  "competitivePosition": "Market leader in SMB e-commerce [source_numbers]",
  "keyDifferentiators": ["Ease of use", "Comprehensive ecosystem", "Strong app store"],
  "confidence": {
    "overall": 0.85,
    "financial": 0.90,
    "leadership": 0.75,
    "market": 0.80,
    "products": 0.85,
    "size": 0.90,
    "revenue": 0.85
  }
}

INLINE CITATIONS: 
- Include [N] or [N,M] after each claim where N,M are source numbers
- Every factual claim MUST have a citation
- Use the source numbers provided in the content

EXTRACTION PRIORITIES:
1. Financial data (stock info, revenue, funding, valuation)
2. Leadership team (C-suite, key executives)
3. Market position and competitive landscape
4. Product/service portfolio
5. Customer base and segments
6. Business model and pricing
7. Recent developments and news
8. Performance metrics and growth indicators

CONFIDENCE SCORING:
- 0.9+ = Direct, authoritative statement from official sources
- 0.7-0.9 = Strong indicators from credible sources
- 0.5-0.7 = Reasonable estimates based on available data
- 0.3-0.5 = Weak indicators, best guess
- 0.1-0.3 = Very limited or unreliable data

Extract comprehensive company information with inline citations [N] for every factual claim.`;
  }

  /**
   * Build comprehensive user prompt for company overview
   */
  private buildComprehensiveOverviewUserPrompt(
    content: string[],
    sources: AuthoritativeSource[],
    companyName: string
  ): string {
    // Create numbered sources for reference
    const numberedSources = sources.map((source, index) => 
      `[${index + 1}] ${source.title} - ${source.domain} (Credibility: ${source.credibilityScore}) - ${source.sourceType}`
    ).join('\n');
    
    const contentWithSources = content.map((text, index) => 
      `Source [${index + 1}]: ${text.substring(0, 4000)}...` // Increased content limit for comprehensive extraction
    ).join('\n\n---\n\n');
    
    return `Extract comprehensive company information for business intelligence with INLINE CITATIONS:

COMPANY: ${companyName}
PURPOSE: Comprehensive business intelligence and sales enablement

AVAILABLE SOURCES (use these numbers for citations):
${numberedSources}

CONTENT TO ANALYZE:
${contentWithSources}

CRITICAL REQUIREMENTS:
1. Include inline citations [N] in every response field using the source numbers above
2. Extract financial data including stock information, revenue, funding, and financial metrics
3. Identify key leadership personnel with their roles and backgrounds
4. Analyze market position, competitors, and competitive advantages
5. List products, services, and business model information
6. Find recent news, developments, and performance metrics
7. Identify major customers and customer segments
8. Extract pricing information and revenue models

EXAMPLES of proper citation format:
- "E-commerce Platform [1,3]" (if sources 1 and 3 support this)
- "CEO: Tobias Lütke [2]" (if source 2 mentions the CEO)
- "Revenue: $7.1B (2023) [1,4]" (if sources 1 and 4 have revenue data)
- "Market Cap: $145.3B [3]" (if source 3 has market cap info)

Extract the comprehensive company information in the exact JSON format specified. Focus on actionable business intelligence that helps with:
1. Sales qualification and approach strategy
2. Competitive positioning and differentiation
3. Financial health and growth trajectory
4. Leadership and organizational structure
5. Market opportunity and competitive landscape
6. Product portfolio and business model understanding

Provide detailed confidence scores for each category based on source authority and data availability.
REMEMBER: Every factual claim must include [source_number] citations.`;
  }

  /**
   * Parse comprehensive company overview response from AI
   */
  private parseComprehensiveOverviewResponse(response: string): {
    name: string;
    domain: string;
    industry: string;
    description: string;
    foundedYear?: number;
    financialData?: {
      stockSymbol?: string;
      stockExchange?: string;
      marketCap?: string;
      revenue?: string;
      revenueGrowth?: string;
      totalFunding?: string;
      latestFundingRound?: {
        type: string;
        amount: string;
        date: string;
        investors: string[];
        citations: number[];
      };
      peRatio?: number;
      citations: number[];
    };
    employeeCount?: number;
    employeeRange?: string;
    leadership?: Array<{
      name: string;
      title: string;
      department?: string;
      background?: string;
      citations: number[];
    }>;
    marketData?: {
      marketSize?: string;
      marketShare?: string;
      marketPosition?: string;
      majorCompetitors?: string[];
      competitiveAdvantages?: string[];
      citations: number[];
    };
    products?: string[];
    services?: string[];
    recentNews?: Array<{
      title: string;
      summary: string;
      date: string;
      source: string;
      relevance: 'high' | 'medium' | 'low';
      citations: number[];
    }>;
    majorCustomers?: string[];
    businessModel?: string;
    revenueModel?: string;
    pricingStructure?: Array<{
      name: string;
      price: string;
      period: string;
      features?: string[];
      citations: number[];
    }>;
    performanceMetrics?: Array<{
      name: string;
      value: string;
      trend?: 'up' | 'down' | 'stable';
      period?: string;
      citations: number[];
    }>;
    competitivePosition?: string;
    keyDifferentiators?: string[];
    confidence: {
      overall: number;
      financial: number;
      leadership: number;
      market: number;
      products: number;
      size: number;
      revenue: number;
    };
  } {
    try {
      // More robust JSON extraction - handle text before/after JSON
      let cleanResponse = response.trim();
      
      // Remove markdown formatting
      cleanResponse = cleanResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Find JSON boundaries - look for first { and last }
      const firstBrace = cleanResponse.indexOf('{');
      const lastBrace = cleanResponse.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
        throw new Error('No valid JSON structure found in response');
      }
      
      // Extract just the JSON portion
      const jsonPortion = cleanResponse.substring(firstBrace, lastBrace + 1);
      
      this.logger.info('Extracted JSON portion for comprehensive parsing', { 
        originalLength: response.length, 
        jsonLength: jsonPortion.length,
        firstChars: jsonPortion.substring(0, 100) 
      });

      const parsed = JSON.parse(jsonPortion);

      // Validate and clean the parsed data
      return {
        name: parsed.name || 'Unknown',
        domain: parsed.domain || '',
        industry: parsed.industry || 'Technology',
        description: parsed.description || 'Company information not available',
        foundedYear: parsed.foundedYear && typeof parsed.foundedYear === 'number' ? parsed.foundedYear : undefined,
        financialData: parsed.financialData ? {
          stockSymbol: parsed.financialData.stockSymbol,
          stockExchange: parsed.financialData.stockExchange,
          marketCap: parsed.financialData.marketCap,
          revenue: parsed.financialData.revenue,
          revenueGrowth: parsed.financialData.revenueGrowth,
          totalFunding: parsed.financialData.totalFunding,
          latestFundingRound: parsed.financialData.latestFundingRound,
          peRatio: parsed.financialData.peRatio,
          citations: Array.isArray(parsed.financialData.citations) ? parsed.financialData.citations : []
        } : undefined,
        employeeCount: parsed.employeeCount && typeof parsed.employeeCount === 'number' ? parsed.employeeCount : undefined,
        employeeRange: parsed.employeeRange,
        leadership: Array.isArray(parsed.leadership) ? parsed.leadership : undefined,
        marketData: parsed.marketData ? {
          marketSize: parsed.marketData.marketSize,
          marketShare: parsed.marketData.marketShare,
          marketPosition: parsed.marketData.marketPosition,
          majorCompetitors: Array.isArray(parsed.marketData.majorCompetitors) ? parsed.marketData.majorCompetitors : [],
          competitiveAdvantages: Array.isArray(parsed.marketData.competitiveAdvantages) ? parsed.marketData.competitiveAdvantages : [],
          citations: Array.isArray(parsed.marketData.citations) ? parsed.marketData.citations : []
        } : undefined,
        products: Array.isArray(parsed.products) ? parsed.products : undefined,
        services: Array.isArray(parsed.services) ? parsed.services : undefined,
        recentNews: Array.isArray(parsed.recentNews) ? parsed.recentNews : undefined,
        majorCustomers: Array.isArray(parsed.majorCustomers) ? parsed.majorCustomers : undefined,
        businessModel: parsed.businessModel,
        revenueModel: parsed.revenueModel,
        pricingStructure: Array.isArray(parsed.pricingStructure) ? parsed.pricingStructure : undefined,
        performanceMetrics: Array.isArray(parsed.performanceMetrics) ? parsed.performanceMetrics : undefined,
        competitivePosition: parsed.competitivePosition,
        keyDifferentiators: Array.isArray(parsed.keyDifferentiators) ? parsed.keyDifferentiators : undefined,
        confidence: {
          overall: Math.min(Math.max(parsed.confidence?.overall || 0.3, 0), 1),
          financial: Math.min(Math.max(parsed.confidence?.financial || 0.3, 0), 1),
          leadership: Math.min(Math.max(parsed.confidence?.leadership || 0.3, 0), 1),
          market: Math.min(Math.max(parsed.confidence?.market || 0.3, 0), 1),
          products: Math.min(Math.max(parsed.confidence?.products || 0.3, 0), 1),
          size: Math.min(Math.max(parsed.confidence?.size || 0.3, 0), 1),
          revenue: Math.min(Math.max(parsed.confidence?.revenue || 0.3, 0), 1)
        }
      };
    } catch (error) {
      this.logger.error('Failed to parse comprehensive overview response', { 
        error: error instanceof Error ? error.message : String(error),
        responseLength: response.length,
        firstChars: response.substring(0, 200)
      });
      
      // Return fallback with basic structure
      return {
        name: 'Unknown',
        domain: '',
        industry: 'Technology',
        description: 'Company information not available',
        confidence: {
          overall: 0.1,
          financial: 0.1,
          leadership: 0.1,
          market: 0.1,
          products: 0.1,
          size: 0.1,
          revenue: 0.1
        }
      };
    }
  }

  /**
   * Build system prompt for snippet analysis
   */
  private buildSnippetAnalysisSystemPrompt(analysisType: string): string {
    return `You are a sales intelligence analyst. Your task is to analyze search result snippets and identify information gaps.

ANALYSIS TYPE: ${analysisType}

Your job:
1. Extract all available insights from the provided snippets
2. Identify what critical information is missing for comprehensive ${analysisType} analysis
3. Recommend which URLs should be fetched for full content to fill the gaps
4. Assign priority scores (1-10) based on how likely each URL is to contain missing info

For ${analysisType} analysis, focus on:
${analysisType === 'overview' ? `
- Company basics (founding, location, size)
- Financial data (revenue, funding, performance)
- Leadership and key personnel
- Products/services and business model
- Recent news and developments
- Market position and competitors` : `
- Sales opportunities and pain points
- Technology stack and tools
- Recent initiatives and challenges
- Key contacts and decision makers`}

Respond in valid JSON format with these fields:
{
  "snippetInsights": { /* comprehensive analysis from snippets */ },
  "missingInfo": ["category1", "category2"], /* what's missing */
  "criticalUrls": [
    {"url": "...", "reason": "why this URL is important", "priority": 1-10}
  ],
  "confidence": 0.0-1.0 /* how complete the snippet info is */
}`;
  }

  /**
   * Build user prompt for snippet analysis
   */
  private buildSnippetAnalysisUserPrompt(
    snippets: Array<{title: string, snippet: string, url: string, sourceDomain: string}>,
    companyName: string,
    analysisType: string
  ): string {
    const snippetText = snippets.map((s, i) => 
      `[${i + 1}] ${s.title}\nSource: ${s.sourceDomain}\nURL: ${s.url}\nSnippet: ${s.snippet}\n`
    ).join('\n');

    return `Company: ${companyName}
Analysis Type: ${analysisType}

Search Result Snippets:
${snippetText}

Analyze these snippets and identify what information is available versus what's missing for comprehensive ${analysisType} analysis. Recommend the 2-3 most critical URLs to fetch for full content.`;
  }

  /**
   * Build system prompt for combined analysis
   */
  private buildCombinedAnalysisSystemPrompt(analysisType: string): string {
    if (analysisType === 'overview') {
      return this.buildComprehensiveOverviewSystemPrompt();
    }
    
    // For other types, return appropriate system prompt
    return this.buildSystemPrompt('discovery' as SalesContext);
  }

  /**
   * Build user prompt for combined analysis
   */
  private buildCombinedAnalysisUserPrompt(
    snippetInsights: any,
    fullContent: string[],
    sources: AuthoritativeSource[],
    companyName: string,
    analysisType: string
  ): string {
    const snippetSummary = JSON.stringify(snippetInsights, null, 2);
    const contentText = fullContent.join('\n\n---\n\n');
    const sourcesText = sources.map(s => `[${s.id}] ${s.title} (${s.domain})`).join('\n');

    return `Company: ${companyName}

SNIPPET-BASED INSIGHTS:
${snippetSummary}

ADDITIONAL FULL CONTENT:
${contentText}

SOURCES:
${sourcesText}

Combine the snippet insights with the additional full content to create a comprehensive ${analysisType} analysis. Use the snippet insights as the foundation and enhance with details from the full content.`;
  }

  /**
   * Parse snippet analysis response
   */
  private parseSnippetAnalysisResponse(response: string): {
    snippetInsights: any;
    missingInfo: string[];
    criticalUrls: Array<{url: string, reason: string, priority: number}>;
    confidence: number;
  } {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        snippetInsights: parsed.snippetInsights || {},
        missingInfo: parsed.missingInfo || [],
        criticalUrls: parsed.criticalUrls || [],
        confidence: parsed.confidence || 0.5
      };
    } catch (error) {
      this.logger.error('Failed to parse snippet analysis response', { error });
      
      return {
        snippetInsights: { summary: 'Analysis completed from snippets' },
        missingInfo: ['detailed_information'],
        criticalUrls: [],
        confidence: 0.3
      };
    }
  }
} 