import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SerpAPIService } from '../../SerpAPIService';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { CacheType } from '../../../types/cache-types';

interface CompanyLookupRequest {
  query: string;
  limit?: number;
}

interface DomainSuggestionRequest {
  companyName: string;
  includeAlternatives?: boolean;
}

/**
 * Clean CompanyLookupHandler - Direct service usage only
 * Handles basic company lookup and domain suggestions
 */
export class CompanyLookupHandler {
  private serpAPIService: SerpAPIService;
  private cache: CacheService;
  private logger: Logger;

  constructor(
    cache?: CacheService,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('CompanyLookupHandler');
    this.cache = cache || new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      this.logger,
      process.env.AWS_REGION
    );
    this.serpAPIService = new SerpAPIService(this.cache, this.logger);
  }

  /**
   * Handle basic company lookup
   * POST /api/companies/lookup
   */
  async handleLookup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return this.errorResponse(400, 'Request body is required');
      }

      const request: CompanyLookupRequest = JSON.parse(event.body);
      
      if (!request.query) {
        return this.errorResponse(400, 'Query is required');
      }

      const limit = request.limit || 10;
      const cacheKey = this.generateCacheKey(request.query, 'lookup', `limit_${limit}`);

      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('Cache hit for company lookup', { query: request.query });
        return this.successResponse(cached);
      }

      // Perform lookup using SerpAPI
      this.logger.info('Performing company lookup', { query: request.query });
      const results = await this.serpAPIService.getOrganicResults(request.query);
      
      const response = {
        companies: results.slice(0, limit),
        query: request.query,
        total: results.length,
        cached: false,
        generatedAt: new Date().toISOString()
      };

      // Cache the result
      await this.cache.setRawJSON(cacheKey, response, CacheType.COMPANY_SEARCH);

      return this.successResponse(response);

    } catch (error) {
      this.logger.error('Company lookup failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.errorResponse(500, 'Internal server error');
    }
  }

  /**
   * Handle domain suggestions
   * POST /api/companies/domain-suggestions
   */
  async handleDomainSuggestion(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return this.errorResponse(400, 'Request body is required');
      }

      const request: DomainSuggestionRequest = JSON.parse(event.body);
      
      if (!request.companyName) {
        return this.errorResponse(400, 'Company name is required');
      }

      const cacheKey = this.generateCacheKey(request.companyName, 'domain-suggestion');

      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('Cache hit for domain suggestion', { companyName: request.companyName });
        return this.successResponse(cached);
      }

      // Generate domain suggestions based on company name
      this.logger.info('Generating domain suggestions', { companyName: request.companyName });
      
      const baseDomain = request.companyName.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);

      const suggestions = [
        `${baseDomain}.com`,
        `${baseDomain}.io`,
        `${baseDomain}.co`,
        `${baseDomain}.net`,
        `${baseDomain}.org`
      ];

      const response = {
        companyName: request.companyName,
        suggestions: suggestions,
        cached: false,
        generatedAt: new Date().toISOString()
      };

      // Cache the result
      await this.cache.setRawJSON(cacheKey, response, CacheType.DOMAIN_SUGGESTIONS);

      return this.successResponse(response);

    } catch (error) {
      this.logger.error('Domain suggestion failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.errorResponse(500, 'Internal server error');
    }
  }

  /**
   * Health check
   */
  async handleHealthCheck(): Promise<APIGatewayProxyResult> {
    try {
      const health = {
        status: 'healthy',
        service: 'CompanyLookupHandler',
        timestamp: new Date().toISOString(),
        services: {
          serpAPI: !!process.env.SERPAPI_API_KEY,
          cache: true
        }
      };

      return this.successResponse(health);
    } catch (error) {
      this.logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return this.errorResponse(500, 'Health check failed');
    }
  }

  private generateCacheKey(query: string, operation: string, suffix?: string): string {
    const base = `company_${operation}_${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    return suffix ? `${base}_${suffix}` : base;
  }

  private successResponse(data: any): APIGatewayProxyResult {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(data)
    };
  }

  private errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: message })
    };
  }
} 