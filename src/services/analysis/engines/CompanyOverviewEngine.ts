import { Logger } from '../../core/Logger';
import { BedrockCore } from '../core/BedrockCore';
import { 
  CompanyOverviewRequest,
  ParsedOverviewResponse,
  AnalysisConfig
} from '../types/AnalysisTypes';

export class CompanyOverviewEngine {
  private bedrockCore: BedrockCore;
  private logger: Logger;

  constructor(config: AnalysisConfig, logger: Logger, region?: string) {
    this.logger = logger;
    this.bedrockCore = new BedrockCore(config, logger, region);
  }

  /**
   * Extract comprehensive company overview from content
   */
  async extractCompanyOverview(request: CompanyOverviewRequest): Promise<ParsedOverviewResponse> {
    const { content, companyName, requestType } = request;

    try {
      this.logger.info('Starting company overview extraction', {
        companyName,
        requestType,
        contentLength: content.length,
      });

      const systemPrompt = this.buildComprehensiveOverviewSystemPrompt();
      const userPrompt = this.buildComprehensiveOverviewUserPrompt(content, companyName, requestType);

      const response = await this.bedrockCore.invokeModel({
        systemPrompt,
        userPrompt,
      });

      const overview = this.parseComprehensiveOverviewResponse(response);

      this.logger.info('Company overview extraction completed', {
        companyName,
        requestType,
        productsCount: overview.products?.length || 0,
        developmentsCount: overview.recentDevelopments?.length || 0,
      });

      return overview;
    } catch (error) {
      this.logger.error('Company overview extraction failed', {
        companyName,
        requestType,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return minimal overview on failure
      return {
        companyName,
        description: '',
        industry: '',
        businessModel: '',
        products: [],
        keyFinancials: '',
        competitivePosition: '',
        recentDevelopments: [],
        riskFactors: [],
        citations: [],
      };
    }
  }

  /**
   * Build system prompt for comprehensive overview analysis
   */
  private buildComprehensiveOverviewSystemPrompt(): string {
    return `You are an expert business analyst specializing in comprehensive company analysis.
Your task is to extract and synthesize key information about companies from various sources.

Key Objectives:
- Provide a clear, comprehensive overview of the company
- Identify core business model and value propositions
- Extract key products, services, and market positioning
- Highlight recent developments and strategic initiatives
- Assess financial performance and competitive standing
- Identify potential risks and challenges
- Ensure all claims are properly cited

Analysis Framework:
1. Company Identity: Name, industry, core business
2. Business Model: How the company creates and captures value
3. Products/Services: Key offerings and their market positioning
4. Financial Performance: Revenue, growth, profitability indicators
5. Competitive Position: Market share, competitive advantages
6. Recent Developments: News, initiatives, strategic changes
7. Risk Assessment: Challenges, threats, market risks

Output Requirements:
- Structured, comprehensive analysis
- Factual information with source citations
- Clear distinction between facts and analysis
- Professional business language
- Actionable insights for business stakeholders`;
  }

  /**
   * Build user prompt for overview extraction
   */
  private buildComprehensiveOverviewUserPrompt(
    content: string,
    companyName: string,
    requestType: string
  ): string {
    let prompt = `Please analyze the following content about ${companyName} and provide a comprehensive company overview.

REQUEST TYPE: ${requestType}

CONTENT TO ANALYZE:
${content}

Please provide your analysis in the following JSON format:
{
  "companyName": "${companyName}",
  "description": "Brief but comprehensive company description (2-3 sentences)",
  "industry": "Primary industry/sector",
  "businessModel": "How the company creates and captures value",
  "products": ["Product/service 1", "Product/service 2", ...],
  "keyFinancials": "Summary of financial performance and key metrics",
  "competitivePosition": "Market position and competitive advantages",
  "recentDevelopments": ["Development 1", "Development 2", ...],
  "riskFactors": ["Risk factor 1", "Risk factor 2", ...],
  "citations": ["Quote or fact [source context]", ...]
}

Guidelines:
- Be comprehensive but concise
- Focus on factual information from the provided content
- Include specific examples and data points where available
- Cite sources for key claims
- Highlight strategic information relevant for business analysis
- Limit arrays to 5-7 most significant items`;

    return prompt;
  }

  /**
   * Parse comprehensive overview response
   */
  private parseComprehensiveOverviewResponse(response: string): ParsedOverviewResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and ensure all required fields exist
      return {
        companyName: parsed.companyName || '',
        description: parsed.description || '',
        industry: parsed.industry || '',
        businessModel: parsed.businessModel || '',
        products: Array.isArray(parsed.products) ? parsed.products : [],
        keyFinancials: parsed.keyFinancials || '',
        competitivePosition: parsed.competitivePosition || '',
        recentDevelopments: Array.isArray(parsed.recentDevelopments) ? parsed.recentDevelopments : [],
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      };
    } catch (error) {
      this.logger.warn('Failed to parse overview JSON, falling back to text parsing', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback: extract information from text
      return this.parseOverviewFromText(response);
    }
  }

  /**
   * Fallback method to parse overview from unstructured text
   */
  private parseOverviewFromText(response: string): ParsedOverviewResponse {
    const extractValue = (pattern: RegExp): string => {
      const match = response.match(pattern);
      return match ? match[1].trim() : '';
    };

    const extractList = (pattern: RegExp): string[] => {
      const matches = response.match(pattern);
      if (!matches) return [];
      
      return matches[1]
        .split(/\n|;|,/)
        .map(item => item.trim().replace(/^[-•*]\s*/, ''))
        .filter(item => item.length > 0)
        .slice(0, 5);
    };

    return {
      companyName: extractValue(/company name:?\s*([^\n]+)/i) || '',
      description: extractValue(/description:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\nindustry|\nbusiness model|$)/i),
      industry: extractValue(/industry:?\s*([^\n]+)/i),
      businessModel: extractValue(/business model:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\nproducts|\nfinancials|$)/i),
      products: extractList(/products?:?\s*([\s\S]*?)(?=financials|competitive|developments|risks|$)/i),
      keyFinancials: extractValue(/(?:key )?financials?:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\ncompetitive|\ndevelopments|$)/i),
      competitivePosition: extractValue(/competitive position:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\ndevelopments|\nrisks|$)/i),
      recentDevelopments: extractList(/(?:recent )?developments?:?\s*([\s\S]*?)(?=risks|citations|$)/i),
      riskFactors: extractList(/risk factors?:?\s*([\s\S]*?)(?=citations|$)/i),
      citations: extractList(/citations?:?\s*([\s\S]*?)$/i),
    };
  }

  /**
   * Extract key business metrics from overview
   */
  async extractBusinessMetrics(content: string, companyName: string): Promise<{
    revenue: string;
    employees: string;
    founded: string;
    headquarters: string;
    marketCap: string;
    growth: string;
  }> {
    const systemPrompt = `You are a financial analyst extracting key business metrics from company information.
Extract specific numerical data and factual information about company size and performance.`;

    const userPrompt = `Extract key business metrics for ${companyName} from the following content:

${content}

Please provide the information in JSON format:
{
  "revenue": "Annual revenue or revenue range",
  "employees": "Number of employees or employee range", 
  "founded": "Year founded",
  "headquarters": "Headquarters location",
  "marketCap": "Market capitalization if public",
  "growth": "Growth rate or growth indicators"
}

Return "Not available" for any metrics not found in the content.`;

    try {
      const response = await this.bedrockCore.invokeModel({
        systemPrompt,
        userPrompt,
        maxTokens: 1000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.warn('Failed to extract business metrics', { error: error instanceof Error ? error.message : String(error) });
    }

    // Return empty metrics on failure
    return {
      revenue: 'Not available',
      employees: 'Not available',
      founded: 'Not available',
      headquarters: 'Not available',
      marketCap: 'Not available',
      growth: 'Not available',
    };
  }
} 