import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CompanyEnrichmentService, CompanyBasicInfo, ProductSuggestion, CompetitorSuggestion } from '../CompanyEnrichmentService';
import { Logger } from '../core/Logger';
import { BaseEndpointHandler } from './BaseEndpointHandler';
import { CacheService } from '../core/CacheService';
import { ContentFilter } from '../content/ContentFilter';
import { CacheConfig } from '@/types';

export interface CompanyLookupRequest {
  query: string;
  limit?: number;
}

export interface CompanyEnrichRequest {
  companyName: string;
  domain?: string;
  includeProducts?: boolean;
  includeCompetitors?: boolean;
}

export interface ProductSuggestRequest {
  companyName: string;
  domain?: string;
  industry?: string;
  size?: string;
}

export interface CompetitorFindRequest {
  companyName: string;
  domain?: string;
  industry?: string;
}

export class CompanyLookupHandler extends BaseEndpointHandler {
  private enrichmentService: CompanyEnrichmentService;

  constructor(
    cache?: CacheService,
    logger?: Logger,
    contentFilter?: ContentFilter
  ) {
    const defaultLogger = logger || new Logger('CompanyLookupHandler');
    const defaultCache = cache || new CacheService(
      { ttlHours: 24 } as CacheConfig,
      defaultLogger,
      'us-east-1'
    );
    const defaultContentFilter = contentFilter || new ContentFilter(defaultLogger);
    
    super(defaultCache, defaultLogger, defaultContentFilter);
    this.enrichmentService = new CompanyEnrichmentService();
  }

  /**
   * Handle company lookup for autocomplete/search
   * GET /api/companies/lookup?query=acme&limit=5
   */
  async handleLookup(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const query = event.queryStringParameters?.query;
      if (!query) {
        return this.errorResponse(400, 'Query parameter is required');
      }

      const limit = parseInt(event.queryStringParameters?.limit || '5');
      
      // Generate cache key for company lookup
      const cacheKey = this.generateCacheKey(query, 'lookup', `limit_${limit}`);
      
      this.logger.info('Company lookup request', { query, limit, cacheKey });

      // Check cache first
      const cachedResult = await this.checkCache(cacheKey, { domain: query, endpoint: 'lookup' });
      if (cachedResult && cachedResult.companies) {
        this.logger.info('Returning cached company lookup result', { query, cacheKey });
        return this.successResponse({
          companies: cachedResult.companies,
          total: cachedResult.companies.length,
          query,
          cached: true
        });
      }

      // Cache miss - perform lookup
      this.logger.info('Cache miss - performing company lookup', { query, cacheKey });
      const companies = await this.enrichmentService.lookupCompany(query);
      const limitedResults = companies.slice(0, limit);

      // Cache the result
      const cacheData = {
        companies: limitedResults,
        query,
        generatedAt: new Date(),
        sources: ['company_lookup_api']
      };
      
      await this.cacheResult(cacheKey, cacheData, { domain: query, endpoint: 'lookup' });

      return this.successResponse({
        companies: limitedResults,
        total: limitedResults.length,
        query,
        cached: false
      });

    } catch (error) {
      this.logger.error('Company lookup error:', { error: String(error) });
      return this.errorResponse(500, 'Failed to lookup companies');
    }
  }

  /**
   * Handle company enrichment with full details
   * POST /api/companies/enrich
   * Body: { companyName: string, domain?: string, includeProducts?: boolean, includeCompetitors?: boolean }
   */
  async handleEnrich(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return this.errorResponse(400, 'Request body is required');
      }

      const request: CompanyEnrichRequest = JSON.parse(event.body);
      
      if (!request.companyName) {
        return this.errorResponse(400, 'Company name is required');
      }

      // Generate cache key for enrichment
      const cacheKey = this.generateCacheKey(
        request.companyName, 
        'enrich', 
        `${request.domain || 'no_domain'}_${request.includeProducts}_${request.includeCompetitors}`
      );

      this.logger.info('Company enrichment request', { 
        companyName: request.companyName,
        domain: request.domain,
        includeProducts: request.includeProducts,
        includeCompetitors: request.includeCompetitors,
        cacheKey
      });

      // Check cache first
      const cachedResult = await this.checkCache(cacheKey, { domain: request.companyName, endpoint: 'enrich' });
      if (cachedResult && cachedResult.enrichmentResult) {
        this.logger.info('Returning cached enrichment result', { companyName: request.companyName, cacheKey });
        return this.successResponse({
          ...cachedResult.enrichmentResult,
          cached: true
        });
      }

      // Cache miss - perform enrichment
      this.logger.info('Cache miss - performing company enrichment', { companyName: request.companyName, cacheKey });

      // Get basic enrichment
      const enrichmentResult = await this.enrichmentService.enrichCompany(
        request.companyName, 
        request.domain
      );

      // Optionally get detailed product suggestions
      let productSuggestions: ProductSuggestion[] = [];
      if (request.includeProducts) {
        productSuggestions = await this.enrichmentService.suggestProducts(enrichmentResult.basicInfo);
      }

      // Optionally get competitor analysis
      let competitorSuggestions: CompetitorSuggestion[] = [];
      if (request.includeCompetitors) {
        competitorSuggestions = await this.enrichmentService.findCompetitors(enrichmentResult.basicInfo);
      }

      const response = {
        basicInfo: enrichmentResult.basicInfo,
        products: productSuggestions,
        competitors: competitorSuggestions,
        industries: enrichmentResult.suggestedIndustries,
        sources: enrichmentResult.sources,
        confidence: enrichmentResult.confidence,
        enrichedAt: new Date().toISOString()
      };

      // Cache the result
      const cacheData = {
        enrichmentResult: response,
        companyName: request.companyName,
        generatedAt: new Date(),
        sources: ['company_enrichment_api']
      };
      await this.cacheResult(cacheKey, cacheData, { domain: request.companyName, endpoint: 'enrich' });

      return this.successResponse({
        ...response,
        cached: false
      });

    } catch (error) {
      this.logger.error('Company enrichment error:', { error: String(error) });
      return this.errorResponse(500, 'Failed to enrich company data');
    }
  }

  /**
   * Handle product suggestions based on company profile
   * POST /api/products/suggest
   * Body: { companyName: string, domain?: string, industry?: string, size?: string }
   */
  async handleProductSuggestions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return this.errorResponse(400, 'Request body is required');
      }

      const request: ProductSuggestRequest = JSON.parse(event.body);
      
      if (!request.companyName) {
        return this.errorResponse(400, 'Company name is required');
      }

      this.logger.info('Product suggestion request', request);

      // Generate cache key for product suggestions
      const cacheKey = this.generateCacheKey(
        request.companyName, 
        'product_suggest', 
        `${request.domain || 'no_domain'}_${request.industry || 'no_industry'}_${request.size || 'no_size'}`
      );

             // Check cache first
       const cachedResult = await this.checkCache(cacheKey, { domain: request.companyName, endpoint: 'product_suggest' });
       if (cachedResult && cachedResult.productSuggestions) {
         this.logger.info('Returning cached product suggestions', { companyName: request.companyName, cacheKey });
         return this.successResponse({
           ...cachedResult.productSuggestions,
           cached: true
         });
       }

       // Cache miss - perform product suggestion
       this.logger.info('Cache miss - performing product suggestion', { companyName: request.companyName, cacheKey });

      // Build company profile for product matching
      const companyProfile: CompanyBasicInfo = {
        name: request.companyName,
        domain: request.domain,
        industry: request.industry,
        size: request.size
      };

      const productSuggestions = await this.enrichmentService.suggestProducts(companyProfile);

      const response = {
        companyName: request.companyName,
        products: productSuggestions,
        total: productSuggestions.length,
        generatedAt: new Date().toISOString()
      };

      // Cache the result
      const cacheData = {
        productSuggestions: response,
        companyName: request.companyName,
        generatedAt: new Date(),
        sources: ['product_suggestion_api']
      };
             await this.cacheResult(cacheKey, cacheData, { domain: request.companyName, endpoint: 'product_suggest' });

      return this.successResponse({
        ...response,
        cached: false
      });

    } catch (error) {
      this.logger.error('Product suggestion error:', { error: String(error) });
      return this.errorResponse(500, 'Failed to suggest products');
    }
  }

  /**
   * Handle competitor discovery
   * POST /api/competitors/find
   * Body: { companyName: string, domain?: string, industry?: string }
   */
  async handleCompetitorFind(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!event.body) {
        return this.errorResponse(400, 'Request body is required');
      }

      const request: CompetitorFindRequest = JSON.parse(event.body);
      
      if (!request.companyName) {
        return this.errorResponse(400, 'Company name is required');
      }

      this.logger.info('Competitor discovery request', request);

      // Generate cache key for competitor find
      const cacheKey = this.generateCacheKey(
        request.companyName, 
        'competitor_find', 
        `${request.domain || 'no_domain'}_${request.industry || 'no_industry'}`
      );

             // Check cache first
       const cachedResult = await this.checkCache(cacheKey, { domain: request.companyName, endpoint: 'competitor_find' });
       if (cachedResult && cachedResult.competitors) {
         this.logger.info('Returning cached competitor result', { companyName: request.companyName, cacheKey });
         return this.successResponse({
           ...cachedResult.competitors,
           cached: true
         });
       }

       // Cache miss - perform competitor find
       this.logger.info('Cache miss - performing competitor discovery', { companyName: request.companyName, cacheKey });

      // Build company profile for competitor matching
      const companyProfile: CompanyBasicInfo = {
        name: request.companyName,
        domain: request.domain,
        industry: request.industry
      };

      const competitors = await this.enrichmentService.findCompetitors(companyProfile);

      const response = {
        companyName: request.companyName,
        competitors: competitors,
        total: competitors.length,
        discoveredAt: new Date().toISOString()
      };

      // Cache the result
      const cacheData = {
        competitors: response,
        companyName: request.companyName,
        generatedAt: new Date(),
        sources: ['competitor_discovery_api']
      };
             await this.cacheResult(cacheKey, cacheData, { domain: request.companyName, endpoint: 'competitor_find' });

      return this.successResponse({
        ...response,
        cached: false
      });

    } catch (error) {
      this.logger.error('Competitor discovery error:', { error: String(error) });
      return this.errorResponse(500, 'Failed to find competitors');
    }
  }

  /**
   * Handle company domain suggestion
   * GET /api/companies/suggest-domain?name=Acme Corp
   */
  async handleDomainSuggestion(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const companyName = event.queryStringParameters?.name;
      if (!companyName) {
        return this.errorResponse(400, 'Company name parameter is required');
      }

      this.logger.info('Domain suggestion request', { companyName });

      // Generate cache key for domain suggestion
      const cacheKey = this.generateCacheKey(companyName, 'domain_suggest', 'no_query');

             // Check cache first
       const cachedResult = await this.checkCache(cacheKey, { domain: companyName, endpoint: 'domain_suggest' });
       if (cachedResult && cachedResult.domainSuggestions) {
         this.logger.info('Returning cached domain suggestions', { companyName, cacheKey });
         return this.successResponse({
           ...cachedResult.domainSuggestions,
           cached: true
         });
       }

       // Cache miss - perform domain suggestion
       this.logger.info('Cache miss - performing domain suggestion', { companyName, cacheKey });

      // Use the private guessDomain method via enrichment
      // First try enrichment to see if we can get domain
      const enrichmentResult = await this.enrichmentService.enrichCompany(companyName);
      
      const suggestions = [];
      
      if (enrichmentResult.basicInfo.domain) {
        suggestions.push({
          domain: enrichmentResult.basicInfo.domain,
          confidence: 0.9,
          source: 'enrichment'
        });
      }

      // Add some basic domain guessing
      const cleanName = companyName.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
      
      const commonTlds = ['.com', '.io', '.ai', '.co'];
      for (const tld of commonTlds) {
        const guessedDomain = `${cleanName}${tld}`;
        if (!suggestions.find(s => s.domain === guessedDomain)) {
          suggestions.push({
            domain: guessedDomain,
            confidence: tld === '.com' ? 0.7 : 0.4,
            source: 'guess'
          });
        }
      }

      const response = {
        companyName,
        domainSuggestions: suggestions.slice(0, 5)
      };

      // Cache the result
      const cacheData = {
        domainSuggestions: response,
        companyName: companyName,
        generatedAt: new Date(),
        sources: ['domain_suggestion_api']
      };
             await this.cacheResult(cacheKey, cacheData, { domain: companyName, endpoint: 'domain_suggest' });

      return this.successResponse({
        ...response,
        cached: false
      });

    } catch (error) {
      this.logger.error('Domain suggestion error:', { error: String(error) });
      return this.errorResponse(500, 'Failed to suggest domains');
    }
  }

  /**
   * Health check for company lookup services
   */
  async handleHealthCheck(): Promise<APIGatewayProxyResult> {
    try {
      // Check if data sources are available
      const healthStatus = {
        status: 'healthy',
        services: {
          clearbit: process.env.CLEARBIT_API_KEY ? 'configured' : 'not_configured',
          googleKnowledge: process.env.GOOGLE_API_KEY ? 'configured' : 'not_configured',
          websiteScraping: 'available',
          g2Scraping: 'available'
        },
        timestamp: new Date().toISOString()
      };

      return this.successResponse(healthStatus);

    } catch (error) {
      this.logger.error('Health check error:', { error: String(error) });
      return this.errorResponse(500, 'Health check failed');
    }
  }

  /**
   * Create a success response
   */
  private successResponse(data: any): APIGatewayProxyResult {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  }

  /**
   * Create an error response
   */
  private errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: message,
        timestamp: new Date().toISOString()
      })
    };
  }
} 