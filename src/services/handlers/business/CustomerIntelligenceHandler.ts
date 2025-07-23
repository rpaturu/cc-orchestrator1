import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BaseEndpointHandler } from '../base/BaseEndpointHandler';
import { DataSourceOrchestrator } from '../../DataSourceOrchestrator';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { ContentFilter } from '../../content/ContentFilter';
import { AIAnalyzer } from '../../analysis/AIAnalyzer';

export interface CustomerIntelligenceRequest {
  prospectCompany: string;
  vendorCompany: string;
  refresh?: boolean;
  priorityDatasets?: string[]; // Optional: specific datasets to prioritize
}

export interface CustomerIntelligenceResponse {
  success: boolean;
  prospectCompany: string;
  vendorCompany: string;
  customerIntelligence?: {
    companyOverview: {
      name: string;
      industry?: string;
      size?: string;
      description?: string;
    };
    contextualInsights: {
      relevantDecisionMakers?: string[];
      techStackRelevance?: string[];
      businessChallenges?: string[];
      buyingSignals?: string[];
      competitiveUsage?: string[];
      growthIndicators?: string[];
    };
    positioningGuidance: {
      recommendedApproach?: string;
      keyValueProps?: string[];
      potentialPainPoints?: string[];
      bestContactStrategy?: string;
    };
    lastUpdated: string;
  };
  vendorContext?: {
    companyName: string;
    industry?: string;
    products?: string[];
    competitors?: string[];
    positioningStrategy?: string;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    fromCache: boolean;
    processingTimeMs: number;
    datasetsCollected: number;
    totalCost: number;
    contextualizationUsed: boolean;
  };
  error?: string;
}

export class CustomerIntelligenceHandler extends BaseEndpointHandler {
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
        model: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
        maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '4000'),
        temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.1'),
        systemPrompt: 'You are a customer intelligence analyst specializing in extracting structured company insights for sales optimization.'
      },
      this.logger,
      process.env.AWS_REGION || 'us-west-2'
    );
  }

  async handleRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.info('Customer intelligence request received', { 
        requestId,
        userAgent: event.headers['User-Agent'],
        sourceIp: event.requestContext.identity.sourceIp
      });

      // Parse and validate request
      const request = this.parseRequest(event);
      
      // Validate required fields
      if (!request.prospectCompany || request.prospectCompany.trim().length === 0) {
        return this.createErrorResponse(400, 'prospectCompany is required', requestId);
      }
      
      if (!request.vendorCompany || request.vendorCompany.trim().length === 0) {
        return this.createErrorResponse(400, 'vendorCompany is required', requestId);
      }

      // Sanitize company names
      const prospectCompany = request.prospectCompany.trim();
      const vendorCompany = request.vendorCompany.trim();

      this.logger.info('Processing customer intelligence request', {
        requestId,
        prospectCompany,
        vendorCompany,
        refresh: request.refresh || false
      });

      // Check cache first (unless refresh requested)
      let fromCache = false;
      let customerIntelligence;

      if (!request.refresh) {
        const cacheKey = `customer_intel:${prospectCompany.toLowerCase().replace(/\s+/g, '_')}:${vendorCompany.toLowerCase().replace(/\s+/g, '_')}`;
        const cachedIntelligence = await this.cache.get(cacheKey);
        
        if (cachedIntelligence) {
          customerIntelligence = cachedIntelligence as any;
          fromCache = true;
          
          this.logger.info('Customer intelligence served from cache', {
            requestId,
            prospectCompany,
            vendorCompany,
            cacheKey
          });
        }
      }

      // If not in cache or refresh requested, collect customer intelligence
      if (!customerIntelligence) {
        this.logger.info('Collecting context-aware customer intelligence', {
          requestId,
          prospectCompany,
          vendorCompany
        });

        // Use orchestrator's context-aware collection
        const intelligenceData = await this.orchestrator.getCustomerIntelligence({
          customerCompany: prospectCompany,
          vendorCompany: vendorCompany,
          consumerType: 'customer_intelligence'
        });

        // Extract structured customer intelligence using LLM analysis
        customerIntelligence = await this.extractCustomerIntelligenceWithLLM(
          intelligenceData, 
          prospectCompany, 
          vendorCompany,
          (intelligenceData as any).vendorContext
        );

        // Cache the customer intelligence
        const cacheKey = `customer_intel:${prospectCompany.toLowerCase().replace(/\s+/g, '_')}:${vendorCompany.toLowerCase().replace(/\s+/g, '_')}`;
        await this.cache.setRawJSON(cacheKey, customerIntelligence, 'CUSTOMER_INTELLIGENCE_ANALYSIS' as any);

        this.logger.info('Customer intelligence collected and cached', {
          requestId,
          prospectCompany,
          vendorCompany,
          insightsGenerated: Object.keys(customerIntelligence.contextualInsights).length,
          guidanceGenerated: Object.keys(customerIntelligence.positioningGuidance).length
        });
      }

      // Create response
      const response: CustomerIntelligenceResponse = {
        success: true,
        prospectCompany,
        vendorCompany,
        customerIntelligence,
        vendorContext: (customerIntelligence as any).vendorContext || undefined,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          fromCache,
          processingTimeMs: Date.now() - startTime,
          datasetsCollected: fromCache ? 0 : 8, // Approximate count for context-aware collection
          totalCost: fromCache ? 0 : 2.50, // Estimated cost for comprehensive customer intelligence
          contextualizationUsed: true
        }
      };

      this.logger.info('Customer intelligence request completed successfully', {
        requestId,
        prospectCompany,
        vendorCompany,
        fromCache,
        processingTimeMs: response.metadata.processingTimeMs
      });

      return this.createSuccessResponse(response, requestId);

    } catch (error) {
      this.logger.error('Customer intelligence request failed', {
        requestId,
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      const errorResponse: CustomerIntelligenceResponse = {
        success: false,
        prospectCompany: '',
        vendorCompany: '',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          fromCache: false,
          processingTimeMs: Date.now() - startTime,
          datasetsCollected: 0,
          totalCost: 0,
          contextualizationUsed: false
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      return this.createErrorResponse(500, errorResponse.error!, requestId);
    }
  }

  private parseRequest(event: APIGatewayProxyEvent): CustomerIntelligenceRequest {
    if (event.httpMethod === 'GET') {
      // GET request - extract from query parameters
      return {
        prospectCompany: event.queryStringParameters?.prospectCompany || '',
        vendorCompany: event.queryStringParameters?.vendorCompany || '',
        refresh: event.queryStringParameters?.refresh === 'true',
        priorityDatasets: event.queryStringParameters?.priorityDatasets?.split(',')
      };
    } else if (event.httpMethod === 'POST') {
      // POST request - extract from body
      const body = event.body ? JSON.parse(event.body) : {};
      return {
        prospectCompany: body.prospectCompany || '',
        vendorCompany: body.vendorCompany || '',
        refresh: body.refresh || false,
        priorityDatasets: body.priorityDatasets || undefined
      };
    } else {
      throw new Error(`Unsupported HTTP method: ${event.httpMethod}`);
    }
  }

  // All extraction is now handled by extractCustomerIntelligenceWithLLM method using LLM analysis

  private async extractCustomerIntelligenceWithLLM(
    intelligenceData: any, 
    prospectCompany: string, 
    vendorCompany: string,
    vendorContext: any
  ): Promise<any> {
    try {
      const dataContent = this.prepareIntelligenceDataForAnalysis(intelligenceData, vendorContext);
      
      const prompt = `
        Analyze customer intelligence data for ${prospectCompany} in the context of vendor ${vendorCompany}.
        
        Prospect Company Data:
        ${dataContent}
        
        Vendor Context:
        ${JSON.stringify(vendorContext, null, 2)}
        
        Extract comprehensive customer intelligence and return as valid JSON:
        
        {
          "companyOverview": {
            "name": "${prospectCompany}",
            "industry": "Primary industry classification",
            "size": "Company size (e.g., Enterprise, Mid-Market, Small Business)",
            "description": "Brief company description"
          },
          "contextualInsights": {
            "relevantDecisionMakers": ["List of decision makers and titles"],
            "techStackRelevance": ["Technology stack relevant to vendor offerings"],
            "businessChallenges": ["Current business challenges and pain points"],
            "buyingSignals": ["Recent buying signals and growth indicators"],
            "competitiveUsage": ["Current competitive vendors and solutions"],
            "growthIndicators": ["Growth signals and expansion indicators"]
          },
          "positioningGuidance": {
            "recommendedApproach": "Recommended sales approach based on vendor context",
            "keyValueProps": ["Key value propositions relevant to this prospect"],
            "potentialPainPoints": ["Pain points that vendor can address"],
            "bestContactStrategy": "Best strategy for initial contact"
          },
          "lastUpdated": "${new Date().toISOString()}"
        }
        
        Consider the vendor's products, positioning, and competitive landscape when analyzing the prospect.
        Return only valid JSON without explanations.
      `;

      const response = await this.aiAnalyzer.parseUserInput(prompt);
      return JSON.parse(response);
      
    } catch (error) {
      this.logger.error('LLM customer intelligence extraction failed', { 
        prospectCompany,
        vendorCompany,
        error: String(error) 
      });
      
      // Fallback to basic structure
      return {
        companyOverview: {
          name: prospectCompany,
          industry: undefined,
          size: undefined,
          description: undefined
        },
        contextualInsights: {
          relevantDecisionMakers: [],
          techStackRelevance: [],
          businessChallenges: [],
          buyingSignals: [],
          competitiveUsage: [],
          growthIndicators: []
        },
        positioningGuidance: {
          recommendedApproach: 'Value-based consultative approach with relevant case studies',
          keyValueProps: [],
          potentialPainPoints: [],
          bestContactStrategy: 'Research-based personalized outreach'
        },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private prepareIntelligenceDataForAnalysis(intelligenceData: any, vendorContext: any): string {
    const content = [];
    
    // Add organic search results
    if (intelligenceData.organic?.results) {
      const topResults = intelligenceData.organic.results.slice(0, 5);
      content.push(`Search Results: ${JSON.stringify(topResults.map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        url: r.link
      })))}`);
    }
    
    // Add knowledge graph data
    if (intelligenceData.organic?.knowledge_graph) {
      content.push(`Knowledge Graph: ${JSON.stringify(intelligenceData.organic.knowledge_graph)}`);
    }
    
    // Add news results for recent activities and signals
    if (intelligenceData.news?.results) {
      content.push(`Recent News: ${JSON.stringify(intelligenceData.news.results.map((n: any) => ({
        title: n.title,
        snippet: n.snippet,
        date: n.date,
        source: n.source
      })))}`);
    }
    
    // Add job listings for growth signals
    if (intelligenceData.jobs?.results) {
      content.push(`Job Listings: ${JSON.stringify(intelligenceData.jobs.results.map((j: any) => ({
        title: j.title,
        company: j.company,
        location: j.location,
        description: j.description?.substring(0, 200)
      })))}`);
    }
    
    // Add LinkedIn data if available
    if (intelligenceData.linkedin?.results) {
      content.push(`LinkedIn Data: ${JSON.stringify(intelligenceData.linkedin.results)}`);
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