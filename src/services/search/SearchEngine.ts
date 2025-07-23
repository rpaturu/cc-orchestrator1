import axios, { AxiosResponse } from 'axios';
import { SearchResult, SearchEngineResponse, SearchConfig } from '@/types';
import { Logger } from '../core/Logger';
import { CacheService } from '../core/CacheService';
import { CacheType } from '@/types/cache-types';

interface GoogleSearchResponse {
  items?: Array<{
    link: string;
    title: string;
    snippet: string;
  }>;
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
}

export class SearchEngine {
  private readonly apiKey: string;
  private readonly searchEngineId: string;
  private readonly config: SearchConfig;
  private readonly logger: Logger;
  private readonly cache: CacheService;
  private readonly baseUrl = 'https://www.googleapis.com/customsearch/v1';
  private lastRequestTime = 0;

  constructor(
    apiKey: string,
    searchEngineId: string,
    config: SearchConfig,
    logger: Logger,
    cache: CacheService
  ) {
    this.apiKey = apiKey;
    this.searchEngineId = searchEngineId;
    this.config = config;
    this.logger = logger;
    this.cache = cache;
  }

  /**
   * Perform Google Custom Search with recency enhancements and rate limiting
   */
  async search(query: string, numResults: number = 5, prioritizeRecent: boolean = true): Promise<SearchEngineResponse> {
    const startTime = Date.now();
    
    try {
      // Generate cache key for search results
      const cacheKey = this.generateSearchCacheKey(query, numResults, prioritizeRecent);
      
      // Check cache first
      const cachedResult = await this.getSearchResultsFromCache(cacheKey);
      if (cachedResult) {
        this.logger.info('Returning cached search results', { 
          query, 
          cacheKey,
          cachedAt: new Date() 
        });
        return cachedResult;
      }

      this.logger.info('Cache miss - performing new search', { query, cacheKey });

      // Apply rate limiting
      await this.applyRateLimit();

      // Enhance query with current year for recency
      const enhancedQuery = prioritizeRecent ? this.enhanceQueryForRecency(query) : query;

      this.logger.info('Performing search', { originalQuery: query, enhancedQuery, numResults });

      const params: any = {
        key: this.apiKey,
        cx: this.searchEngineId,
        q: enhancedQuery,
        num: Math.min(numResults, 10) // Google's max is 10 results per request
      };

      // Add date filtering for recent results
      if (prioritizeRecent) {
        params.dateRestrict = 'y2'; // Prefer results from last 2 years
        // Note: Google Custom Search API doesn't support sort parameter
      }

      const response: AxiosResponse<GoogleSearchResponse> = await axios.get(
        this.baseUrl,
        { 
          params,
          timeout: this.config.timeoutMs
        }
      );

      // Log quota-related headers
      const quotaHeaders = {
        'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
        'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
        'x-ratelimit-reset': response.headers['x-ratelimit-reset'],
        'x-quota-limit': response.headers['x-quota-limit'],
        'x-quota-remaining': response.headers['x-quota-remaining']
      };
      this.logger.info('API quota info', { quotaHeaders });

      const results = this.parseSearchResults(response.data);
      const searchTime = Date.now() - startTime;

      this.logger.info('Search completed', { 
        query, 
        resultsCount: results.length, 
        searchTime 
      });

      const searchResult = {
        results,
        totalResults: parseInt(response.data.searchInformation?.totalResults || '0'),
        searchTime,
        query
      };

      // Cache the search result
      await this.cacheSearchResults(cacheKey, searchResult);

      return searchResult;

    } catch (error: any) {
      const searchTime = Date.now() - startTime;
      
      // Log detailed error info, especially for 429 errors
      const errorInfo: any = { query, error: error.message, searchTime };
      
      if (error.response) {
        errorInfo.status = error.response.status;
        errorInfo.statusText = error.response.statusText;
        
        // Log response headers for quota info, especially on 429 errors
        if (error.response.headers) {
          errorInfo.headers = {
            'x-ratelimit-limit': error.response.headers['x-ratelimit-limit'],
            'x-ratelimit-remaining': error.response.headers['x-ratelimit-remaining'],
            'x-ratelimit-reset': error.response.headers['x-ratelimit-reset'],
            'retry-after': error.response.headers['retry-after']
          };
        }
        
        // Log response body for additional quota details
        if (error.response.data) {
          errorInfo.responseData = error.response.data;
        }
      }
      
      this.logger.error('Search failed', errorInfo);
      
      return {
        results: [],
        totalResults: 0,
        searchTime,
        query
      };
    }
  }

  /**
   * Apply rate limiting between requests
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.config.rateLimitRps;

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      this.logger.debug('Applying rate limit delay', { delay });
          await this.sleep(delay);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Parse Google Search API response into our SearchResult format
   */
  private parseSearchResults(data: GoogleSearchResponse): SearchResult[] {
    if (!data.items) {
      return [];
    }

    return data.items.map(item => ({
      url: item.link,
      title: item.title,
      snippet: item.snippet,
      sourceDomain: this.extractDomain(item.link)
    }));
  }

  /**
   * Enhance query with recency indicators for better recent results
   */
  private enhanceQueryForRecency(query: string): string {
    const currentYear = new Date().getFullYear();
    
    // Add current year to the query for recency
    if (!query.includes(currentYear.toString())) {
      return `${query} ${currentYear}`;
    }
    
    return query;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if search service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testResponse = await this.search('test query', 1);
      return testResponse.results !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Generate cache key for search results
   */
  private generateSearchCacheKey(query: string, numResults: number, prioritizeRecent: boolean): string {
    const keyData = `search:${query}:${numResults}:${prioritizeRecent}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `search_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get search results from cache
   */
  private async getSearchResultsFromCache(cacheKey: string): Promise<SearchEngineResponse | null> {
    try {
      const cachedData = await this.cache.get(cacheKey);
      if (cachedData && cachedData.insights) {
        return (cachedData.insights as unknown) as SearchEngineResponse;
      }
      return null;
    } catch (error) {
      this.logger.error('Error retrieving search results from cache', { 
        cacheKey, 
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Cache search results
   */
  private async cacheSearchResults(cacheKey: string, searchResult: SearchEngineResponse): Promise<void> {
    try {
      // Store search results in cache format compatible with ContentAnalysis
      // Using type casting to fit into the existing cache structure
      const cacheData = {
        insights: (searchResult as unknown) as any,
        sources: [],
        confidenceScore: 0.9, // High confidence for search results
        generatedAt: new Date(), // Keep as Date to match ContentAnalysis interface
        cacheKey,
        totalSources: 0,
        citationMap: {}
      };
      
      await this.cache.set(cacheKey, cacheData, CacheType.COMPANY_SEARCH);
      this.logger.info('Cached search results', { cacheKey, query: searchResult.query });
    } catch (error) {
      this.logger.error('Error caching search results', { 
        cacheKey, 
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
    }
  }
} 