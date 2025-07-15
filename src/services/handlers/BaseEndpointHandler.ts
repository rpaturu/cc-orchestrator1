/**
 * Base Endpoint Handler
 * 
 * Provides common functionality for all endpoint handlers including caching,
 * logging, and shared utility methods.
 */

import { CacheService } from '../core/CacheService';
import { Logger } from '../core/Logger';
import { CompanyExtractor } from '../utilities/CompanyExtractor';
import { ContentFilter } from '../content/ContentFilter';
import { AuthoritativeSource } from '@/types';
import { SourceAnalyzer } from '../analysis/SourceAnalyzer';

export abstract class BaseEndpointHandler {
  protected readonly cache: CacheService;
  protected readonly logger: Logger;
  protected readonly contentFilter: ContentFilter;

  constructor(
    cache: CacheService,
    logger: Logger,
    contentFilter: ContentFilter
  ) {
    this.cache = cache;
    this.logger = logger;
    this.contentFilter = contentFilter;
  }

  /**
   * Check cache for endpoint result
   */
  protected async checkCache(cacheKey: string, context: { domain: string; endpoint: string }): Promise<any> {
    this.logger.info(`Checking cache for ${context.endpoint}`, { 
      domain: context.domain, 
      cacheKey 
    });

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.info(`Returning cached ${context.endpoint} result`, { 
        domain: context.domain, 
        cacheKey,
        cachedAt: cached.generatedAt 
      });
      return cached;
    }

    this.logger.info(`Cache miss - generating new ${context.endpoint} result`, { 
      domain: context.domain, 
      cacheKey 
    });

    return null;
  }

  /**
   * Cache endpoint result
   */
  protected async cacheResult(cacheKey: string, result: any, context: { domain: string; endpoint: string }): Promise<void> {
    await this.cache.set(cacheKey, result);
    
    this.logger.info(`Cached ${context.endpoint} result`, { 
      domain: context.domain, 
      cacheKey 
    });
  }

  /**
   * Create authoritative sources using focused services
   */
  protected createAuthoritativeSources(
    filteredResults: { content: string | null; [key: string]: any }[],
    filteredUrls: string[],
    allSearchResults: any[],
    relevancyScores: number[]
  ): AuthoritativeSource[] {
    const sources: AuthoritativeSource[] = [];
    
    for (let i = 0; i < filteredUrls.length; i++) {
      const url = filteredUrls[i];
      const content = filteredResults[i].content!;
      const searchResult = allSearchResults.find(result => result.url === url);
      
      const domain = searchResult?.sourceDomain || CompanyExtractor.extractDomain(url);
      const author = CompanyExtractor.extractAuthor(content, url);
      const publishedDate = CompanyExtractor.extractPublicationDate(content);
      
      sources.push({
        id: i + 1,
        url: url,
        title: searchResult?.title || 'Unknown Title',
        domain: domain,
        sourceType: SourceAnalyzer.determineSourceType(url),
        snippet: searchResult?.snippet || 'No snippet available',
        credibilityScore: SourceAnalyzer.calculateComprehensiveCredibilityScore(domain, content, url),
        publishedDate: publishedDate,
        author: author,
        domainAuthority: SourceAnalyzer.calculateCredibilityScore(domain),
        lastUpdated: new Date().toISOString(),
        relevancyScore: relevancyScores[i]
      });
    }
    
    return sources;
  }

  /**
   * Extract company name from domain
   */
  protected extractCompanyName(domain: string): string {
    return CompanyExtractor.extractCompanyName(domain);
  }

  /**
   * Generate cache key for endpoint
   */
  protected generateCacheKey(domain: string, context: any, additionalContext: string): string {
    return CompanyExtractor.generateCacheKey({
      companyDomain: domain,
      salesContext: context,
      additionalContext
    });
  }

  /**
   * Calculate confidence score
   */
  protected calculateConfidenceScore(contentLength: number, sourcesLength: number): number {
    return this.contentFilter.calculateConfidenceScore(contentLength, sourcesLength);
  }
} 