/**
 * CompanyLookupEngine - Handles company lookup/search via Google Knowledge Graph
 */

import { Logger } from '../../core/Logger';
import { EntityExtractor } from '../extractors/EntityExtractor';
import { CacheProcessor } from '../processors/CacheProcessor';

import {
  GoogleKnowledgeGraphLookupResult,
  KnowledgeGraphConfig,
  KnowledgeGraphSearchOptions,
  GoogleKnowledgeGraphAPIResponse,
  KnowledgeGraphResult
} from '../types/KnowledgeGraphTypes';

export class CompanyLookupEngine {
  private entityExtractor: EntityExtractor;
  private cacheProcessor: CacheProcessor;
  private config: KnowledgeGraphConfig;

  constructor(
    private logger: Logger,
    cacheProcessor: CacheProcessor,
    config: KnowledgeGraphConfig = {}
  ) {
    this.entityExtractor = new EntityExtractor(logger);
    this.cacheProcessor = cacheProcessor;
    this.config = {
      apiKey: process.env.GOOGLE_API_KEY,
      baseUrl: 'https://kgsearch.googleapis.com/v1/entities:search',
      timeout: 10000,
      maxRetries: 2,
      cacheEnabled: true,
      defaultLimit: 3,
      ...config
    };
  }

  /**
   * Lookup companies by query string
   */
  async lookupCompanies(query: string, limit: number = 3): Promise<GoogleKnowledgeGraphLookupResult[]> {
    const startTime = Date.now();
    
    this.logger.info('Starting Google Knowledge Graph lookup', { query, limit });

    try {
      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cached = await this.checkCache(query, limit);
        if (cached) {
          this.logger.info('Returning cached lookup results', { 
            query, 
            resultCount: cached.length,
            processingTime: Date.now() - startTime 
          });
          return cached;
        }
      }

      // Perform API lookup
      const results = await this.performLookup(query, limit);
      
      // Cache successful results
      if (results.length > 0 && this.config.cacheEnabled) {
        await this.cacheResults(query, limit, results);
      }

      this.logger.info('Google Knowledge Graph lookup completed', {
        query,
        limit,
        resultCount: results.length,
        processingTime: Date.now() - startTime
      });

      return results;
    } catch (error) {
      this.logger.error('Google Knowledge Graph lookup failed', { 
        query, 
        limit,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime
      });
      return [];
    }
  }

  /**
   * Enhanced search with options
   */
  async searchCompanies(options: KnowledgeGraphSearchOptions): Promise<KnowledgeGraphResult<GoogleKnowledgeGraphLookupResult[]>> {
    const startTime = Date.now();
    const { query, limit = 3, types = ['Organization'], exactMatch = false } = options;
    let apiCalls = 0;
    let cacheHit = false;

    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = await this.checkCache(query, limit);
        if (cached) {
          cacheHit = true;
          return {
            success: true,
            data: cached,
            metadata: {
              processingTime: Date.now() - startTime,
              cacheHit,
              apiCalls
            }
          };
        }
      }

      // Perform search
      apiCalls = 1;
      const results = await this.performSearchWithOptions(options);

      // Cache results
      if (results.length > 0 && this.config.cacheEnabled) {
        await this.cacheResults(query, limit, results);
      }

      return {
        success: true,
        data: results,
        metadata: {
          processingTime: Date.now() - startTime,
          cacheHit,
          apiCalls
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
          retryAfter: 3000
        },
        metadata: {
          processingTime: Date.now() - startTime,
          cacheHit,
          apiCalls
        }
      };
    }
  }

  /**
   * Find companies by industry
   */
  async findCompaniesByIndustry(industry: string, limit: number = 5): Promise<GoogleKnowledgeGraphLookupResult[]> {
    const query = `${industry} companies`;
    return this.lookupCompanies(query, limit);
  }

  /**
   * Find companies by location
   */
  async findCompaniesByLocation(location: string, limit: number = 5): Promise<GoogleKnowledgeGraphLookupResult[]> {
    const query = `companies in ${location}`;
    return this.lookupCompanies(query, limit);
  }

  // =====================================
  // PRIVATE METHODS
  // =====================================

  private async checkCache(query: string, limit: number): Promise<GoogleKnowledgeGraphLookupResult[] | null> {
    try {
      const cacheKey = this.cacheProcessor.generateLookupCacheKey(query, limit);
      return await this.cacheProcessor.checkLookupCache(cacheKey);
    } catch (error) {
      this.logger.warn('Cache check failed', { query, limit, error: String(error) });
      return null;
    }
  }

  private async cacheResults(query: string, limit: number, results: GoogleKnowledgeGraphLookupResult[]): Promise<void> {
    try {
      const cacheKey = this.cacheProcessor.generateLookupCacheKey(query, limit);
      await this.cacheProcessor.cacheLookupResult(cacheKey, results, 'LOOKUP' as any);
    } catch (error) {
      this.logger.warn('Failed to cache results', { query, limit, error: String(error) });
    }
  }

  private async performLookup(query: string, limit: number): Promise<GoogleKnowledgeGraphLookupResult[]> {
    const response = await this.makeAPIRequest(query, limit);
    if (!response || !response.itemListElement) {
      return [];
    }

    const results: GoogleKnowledgeGraphLookupResult[] = [];
    
    for (const item of response.itemListElement.slice(0, limit)) {
      try {
        const entity = item.result;
        if (entity) {
          const basicInfo = this.entityExtractor.extractBasicInfo(entity, query);
          results.push(basicInfo);
        }
      } catch (error) {
        this.logger.warn('Failed to extract entity info', { 
          query, 
          entityId: item.result?.['@id'],
          error: String(error) 
        });
      }
    }

    return results;
  }

  private async performSearchWithOptions(options: KnowledgeGraphSearchOptions): Promise<GoogleKnowledgeGraphLookupResult[]> {
    const { query, limit = 3, types = ['Organization'], languages = ['en'] } = options;
    
    const response = await this.makeAPIRequestWithOptions({
      query,
      types,
      languages,
      limit
    });

    if (!response || !response.itemListElement) {
      return [];
    }

    const results: GoogleKnowledgeGraphLookupResult[] = [];
    
    for (const item of response.itemListElement.slice(0, limit)) {
      try {
        const entity = item.result;
        if (entity && this.isValidOrganization(entity)) {
          const basicInfo = this.entityExtractor.extractBasicInfo(entity, query);
          results.push(basicInfo);
        }
      } catch (error) {
        this.logger.warn('Failed to extract search result', { 
          query, 
          error: String(error) 
        });
      }
    }

    return results;
  }

  private async makeAPIRequest(query: string, limit: number): Promise<GoogleKnowledgeGraphAPIResponse | null> {
    if (!this.config.apiKey) {
      this.logger.warn('Google Knowledge Graph API key not configured');
      return null;
    }

    const url = `${this.config.baseUrl}?query=${encodeURIComponent(query)}&types=Organization&limit=${limit}&key=${this.config.apiKey}`;

    return this.executeAPIRequest(url, query);
  }

  private async makeAPIRequestWithOptions(options: {
    query: string;
    types: string[];
    languages: string[];
    limit: number;
  }): Promise<GoogleKnowledgeGraphAPIResponse | null> {
    if (!this.config.apiKey) {
      this.logger.warn('Google Knowledge Graph API key not configured');
      return null;
    }

    const params = new URLSearchParams({
      query: options.query,
      types: options.types.join(','),
      languages: options.languages.join(','),
      limit: options.limit.toString(),
      key: this.config.apiKey
    });

    const url = `${this.config.baseUrl}?${params.toString()}`;

    return this.executeAPIRequest(url, options.query);
  }

  private async executeAPIRequest(url: string, query: string): Promise<GoogleKnowledgeGraphAPIResponse | null> {
    this.logger.debug('Making Google Knowledge Graph API request', { 
      query,
      url: url.replace(this.config.apiKey!, '[REDACTED]')
    });

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (this.config.maxRetries || 2); attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'SalesIntelligence/1.0',
          },
          signal: AbortSignal.timeout(this.config.timeout || 10000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as GoogleKnowledgeGraphAPIResponse;
        
        this.logger.debug('Google Knowledge Graph API request successful', {
          query,
          entityCount: data.itemListElement?.length || 0,
          attempt
        });

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logger.warn('Google Knowledge Graph API request failed', {
          query,
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message
        });

        if (attempt < (this.config.maxRetries || 2)) {
          // Wait before retry
          const delay = Math.min(1000 * attempt, 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All API request attempts failed');
  }

  private isValidOrganization(entity: any): boolean {
    // Check if entity has organization indicators
    const entityTypes = entity['@type'];
    if (Array.isArray(entityTypes)) {
      return entityTypes.some(type => 
        type.includes('Organization') || 
        type.includes('Corporation') || 
        type.includes('Company')
      );
    }
    
    return typeof entityTypes === 'string' && (
      entityTypes.includes('Organization') || 
      entityTypes.includes('Corporation') || 
      entityTypes.includes('Company')
    );
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Health check for the lookup engine
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        this.logger.warn('Lookup engine API key not configured');
        return false;
      }

      // Test with a simple, known query
      const testResults = await this.lookupCompanies('Microsoft', 1);
      return testResults.length > 0;
    } catch (error) {
      this.logger.error('Lookup engine health check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Get engine statistics
   */
  async getStatistics(): Promise<{
    totalRequests: number;
    successfulRequests: number;
    averageResponseTime: number;
    cacheHitRate: number;
  }> {
    // This would require tracking metrics over time
    // For now, return placeholder values
    return {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Clear lookup cache
   */
  async clearCache(query?: string): Promise<boolean> {
    try {
      if (query) {
        // Clear specific query cache with common limits
        const commonLimits = [1, 3, 5, 10];
        for (const limit of commonLimits) {
          const cacheKey = this.cacheProcessor.generateLookupCacheKey(query, limit);
          await this.cacheProcessor.clearCache(cacheKey);
        }
      } else {
        // Clear all lookup cache - would need cache service support
        this.logger.warn('Global lookup cache clearing not implemented');
        return false;
      }
      
      this.logger.info('Lookup cache cleared', { query });
      return true;
    } catch (error) {
      this.logger.error('Failed to clear lookup cache', { 
        query, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
} 