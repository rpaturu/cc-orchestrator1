import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BaseEndpointHandler } from '../base/BaseEndpointHandler';
import { DataSourceOrchestrator } from '../../DataSourceOrchestrator';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { ContentFilter } from '../../content/ContentFilter';
import { AIAnalyzer } from '../../analysis/AIAnalyzer';
import { CacheType } from '../../../types/cache-types';

export interface VendorContextRequest {
  companyName: string;
  refresh?: boolean; // Force refresh from sources
}

export interface VendorContextResponse {
  success: boolean;
  companyName: string;
  vendorContext?: {
    companyName: string;
    industry?: string;
    products?: string[];
    targetMarkets?: string[];
    competitors?: string[];
    valuePropositions?: string[];
    positioningStrategy?: string;
    pricingModel?: string;
    // Financial Information
    revenue?: string;
    revenueGrowth?: string;
    stockSymbol?: string;
    marketCap?: string;
    companySize?: string;
    marketPresence?: string;
    recentNews?: string[];
    keyExecutives?: string[];
    businessChallenges?: string[];
    growthIndicators?: string[];
    techStack?: string[];
    partnerships?: string[];
    lastUpdated: string;
    dataQuality?: {
      completeness: number;
      freshness: number;
      reliability: number;
      overall: number;
    };
  };
  metadata: {
    requestId: string;
    timestamp: string;
    fromCache: boolean;
    processingTimeMs: number;
    datasetsCollected: number;
    totalCost: number;
  };
  error?: string;
}

export class VendorContextHandler extends BaseEndpointHandler {
  private orchestrator: DataSourceOrchestrator;
  private aiAnalyzer: AIAnalyzer;

  constructor(
    cacheService: CacheService,
    logger: Logger,
    contentFilter: ContentFilter,
    orchestrator: DataSourceOrchestrator
  ) {
    super(cacheService, logger, contentFilter);
    this.orchestrator = orchestrator;
    
    // Initialize AIAnalyzer for LLM-based extraction
    this.aiAnalyzer = new AIAnalyzer(
      {
                  model: process.env.BEDROCK_MODEL!,
                  maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
          temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
        systemPrompt: 'You are a vendor intelligence analyst specializing in extracting structured company information.'
      },
      this.logger,
      process.env.AWS_REGION
    );
  }

  async handleRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.info('Vendor context request received', { 
        requestId,
        userAgent: event.headers['User-Agent'],
        sourceIp: event.requestContext.identity.sourceIp
      });

      // Parse and validate request
      const request = this.parseRequest(event);
      
      // Validate required fields
      if (!request.companyName || request.companyName.trim().length === 0) {
        return this.createErrorResponse(400, 'companyName is required', requestId);
      }

      // Sanitize company name
      const companyName = request.companyName.trim();

      this.logger.info('Processing vendor context request', {
        requestId,
        companyName,
        refresh: request.refresh || false
      });

      // Check cache first (unless refresh requested)
      let fromCache = false;
      let vendorContext;

             if (!request.refresh) {
         const cacheKey = `vendor_context:${companyName.toLowerCase().replace(/\s+/g, '_')}`;
         const cachedContext = await this.cache.get(cacheKey);
        
                 if (cachedContext) {
           vendorContext = cachedContext as any;
           fromCache = true;
          
          this.logger.info('Vendor context served from cache', {
            requestId,
            companyName,
            cacheKey
          });
        }
      }

      // If not in cache or refresh requested, collect vendor context
      if (!vendorContext) {
        this.logger.info('Collecting vendor context from sources', {
          requestId,
          companyName
        });

        // Use orchestrator to collect vendor context data
        const vendorData = await this.orchestrator.getMultiSourceData(
          companyName,
          'vendor_context'
        );

        // Extract structured vendor context using LLM analysis
        vendorContext = await this.extractVendorContextWithLLM(vendorData, companyName);

                         // Cache the extracted context
        const cacheKey = `vendor_context:${companyName.toLowerCase().replace(/\s+/g, '_')}`;
        await this.cache.setRawJSON(cacheKey, vendorContext, CacheType.VENDOR_CONTEXT_ENRICHMENT);

        this.logger.info('Vendor context collected and cached', {
          requestId,
          companyName,
          datasetsFound: Object.keys(vendorData).length,
          productsFound: vendorContext.products?.length || 0,
          competitorsFound: vendorContext.competitors?.length || 0
        });
      }

      // Create response
      const response: VendorContextResponse = {
        success: true,
        companyName,
        vendorContext,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          fromCache,
          processingTimeMs: Date.now() - startTime,
          datasetsCollected: fromCache ? 0 : 5, // Approximate count
          totalCost: fromCache ? 0 : 1.50 // Estimated cost for vendor context collection
        }
      };

      this.logger.info('Vendor context request completed successfully', {
        requestId,
        companyName,
        fromCache,
        processingTimeMs: response.metadata.processingTimeMs
      });

      return this.createSuccessResponse(response, requestId);

    } catch (error) {
      this.logger.error('Vendor context request failed', {
        requestId,
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      const errorResponse: VendorContextResponse = {
        success: false,
        companyName: '',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          fromCache: false,
          processingTimeMs: Date.now() - startTime,
          datasetsCollected: 0,
          totalCost: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      return this.createErrorResponse(500, errorResponse.error!, requestId);
    }
  }

  private parseRequest(event: APIGatewayProxyEvent): VendorContextRequest {
    if (event.httpMethod === 'GET') {
      // GET request - extract from query parameters
      return {
        companyName: event.queryStringParameters?.companyName || '',
        refresh: event.queryStringParameters?.refresh === 'true'
      };
    } else if (event.httpMethod === 'POST') {
      // POST request - extract from body
      const body = event.body ? JSON.parse(event.body) : {};
      return {
        companyName: body.companyName || '',
        refresh: body.refresh || false
      };
    } else {
      throw new Error(`Unsupported HTTP method: ${event.httpMethod}`);
    }
  }

  // LLM-based extraction methods
  private async extractVendorContextWithLLM(vendorData: any, companyName: string): Promise<any> {
    try {
      const dataContent = this.prepareDataForAnalysis(vendorData);
      
      const prompt = `
        Analyze the following vendor data for ${companyName} and extract comprehensive vendor context including financial information.
        
        Data Sources:
        ${dataContent}
        
        Extract the following information and return as valid JSON:
        
        {
          "companyName": "${companyName}",
          "industry": "Primary industry (e.g., Software/Technology, Financial Services, Healthcare)",
          "products": ["List of products/services offered"],
          "targetMarkets": ["List of target markets or customer segments"],
          "competitors": ["List of direct competitors"],
          "valuePropositions": ["List of key value propositions"],
          "positioningStrategy": "Brief positioning strategy",
          "pricingModel": "Primary pricing model",
          "revenue": "Annual revenue if mentioned (e.g., '$2.4 billion', '$100M-500M range')",
          "revenueGrowth": "Revenue growth rate if mentioned (e.g., '25% YoY', 'Growing 15% annually')",
          "stockSymbol": "Stock ticker symbol if public company (e.g., 'OKTA', 'MSFT')",
          "marketCap": "Market capitalization if mentioned (e.g., '$12.5 billion')",
          "companySize": "Employee count or company size description",
          "marketPresence": "Geographic presence and market reach",
          "recentNews": ["Recent significant company news or announcements"],
          "keyExecutives": ["Key leadership team members mentioned"],
          "businessChallenges": ["Business challenges or market pressures mentioned"],
          "growthIndicators": ["Growth signals like expansion, new products, hiring"],
          "techStack": ["Technology platforms and tools used"],
          "partnerships": ["Strategic partnerships or integrations mentioned"],
          "lastUpdated": "${new Date().toISOString()}",
          "dataQuality": {
            "completeness": 0.85,
            "freshness": 0.90,
            "reliability": 0.80,
            "overall": 0.85
          }
        }
        
        For any field where information is not available in the data sources, use null or an empty array.
        Return only valid JSON without any explanations.
      `;

      const response = await this.aiAnalyzer.parseUserInput(prompt);
      return JSON.parse(response);
      
    } catch (error) {
      this.logger.error('LLM vendor context extraction failed', { 
        companyName, 
        error: String(error) 
      });
      
      // Fallback to basic structure with all new fields
      return {
        companyName,
        industry: null,
        products: [],
        targetMarkets: [],
        competitors: [],
        valuePropositions: [],
        positioningStrategy: 'Industry-leading solutions',
        pricingModel: 'Contact for pricing',
        revenue: null,
        revenueGrowth: null,
        stockSymbol: null,
        marketCap: null,
        companySize: null,
        marketPresence: null,
        recentNews: [],
        keyExecutives: [],
        businessChallenges: [],
        growthIndicators: [],
        techStack: [],
        partnerships: [],
        lastUpdated: new Date().toISOString(),
        dataQuality: {
          completeness: 0.20,
          freshness: 0.10,
          reliability: 0.30,
          overall: 0.20
        }
      };
    }
  }

  private prepareDataForAnalysis(vendorData: any): string {
    const content = [];
    
    // Add knowledge graph data
    if (vendorData.organic?.knowledge_graph) {
      content.push(`Knowledge Graph: ${JSON.stringify(vendorData.organic.knowledge_graph)}`);
    }
    
    // Add top organic search results
    if (vendorData.organic?.results) {
      const topResults = vendorData.organic.results.slice(0, 5); // Increased for more context
      content.push(`Search Results: ${JSON.stringify(topResults.map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        url: r.link
      })))}`);
    }
    
    // Add news results (important for financial information)
    if (vendorData.news?.results) {
      const newsResults = vendorData.news.results.slice(0, 3);
      content.push(`Recent News: ${JSON.stringify(newsResults.map((n: any) => ({
        title: n.title,
        snippet: n.snippet,
        date: n.date,
        source: n.source
      })))}`);
    }
    
    // Add related questions
    if (vendorData.organic?.related_questions) {
      content.push(`Related Questions: ${JSON.stringify(vendorData.organic.related_questions)}`);
    }
    
    // Add any financial/stock data if available
    if (vendorData.financial) {
      content.push(`Financial Data: ${JSON.stringify(vendorData.financial)}`);
    }
    
    // Add job postings for growth indicators
    if (vendorData.jobs?.results) {
      const jobCount = vendorData.jobs.results.length;
      const jobTitles = vendorData.jobs.results.slice(0, 5).map((j: any) => j.title);
      content.push(`Job Postings (${jobCount} total): ${JSON.stringify(jobTitles)}`);
    }
    
    return content.join('\n\n');
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `req_${timestamp}_${randomPart}`;
  }

  /**
   * Create success response
   */
  private createSuccessResponse(data: any, requestId: string): APIGatewayProxyResult {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'X-Request-ID': requestId
      },
      body: JSON.stringify(data)
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(statusCode: number, message: string, requestId: string): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'X-Request-ID': requestId
      },
      body: JSON.stringify({
        success: false,
        error: message,
        requestId,
        timestamp: new Date().toISOString()
      })
    };
  }
} 