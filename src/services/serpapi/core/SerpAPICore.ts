import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { CacheType } from '../../../types/cache-types';
import { 
  SerpAPIConfig, 
  SerpAPIResponse, 
  SerpAPIError,
  CacheOptions,
  SearchEngineConfig 
} from '../types/SerpAPITypes';

export abstract class SerpAPICore {
  protected cacheService: CacheService;
  protected logger: Logger;
  protected config: SerpAPIConfig;

  constructor(cacheService: CacheService, logger: Logger, config?: Partial<SerpAPIConfig>) {
    this.cacheService = cacheService;
    this.logger = logger;
    this.config = {
      apiKey: process.env.SERPAPI_API_KEY || '',
      baseUrl: 'https://serpapi.com/search',
      timeout: 10000,
      maxRetries: 2,
      ...config
    };

    if (!this.config.apiKey) {
      this.logger.warn('SerpAPI key not found in environment variables');
    }
  }

  /**
   * Make authenticated request to SerpAPI
   */
  protected async makeRequest(params: Record<string, any>): Promise<SerpAPIResponse> {
    const searchParams = new URLSearchParams({
      api_key: this.config.apiKey,
      output: 'json',
      ...params
    });

    const url = `${this.config.baseUrl}?${searchParams.toString()}`;
    
    this.logger.debug('Making SerpAPI request', { url: url.replace(this.config.apiKey, '[REDACTED]') });

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'SalesIntelligence/1.0',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as SerpAPIResponse;
      
      if (data.error) {
        throw new Error(`SerpAPI Error: ${data.error}`);
      }

      this.logger.debug('SerpAPI request successful', { 
        totalResults: data.search_information?.total_results 
      });

      return data;
    } catch (error) {
      this.logger.error('SerpAPI request failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get cached results or fetch from API
   */
  protected async getCachedOrFetch<T>(
    cacheKey: string,
    cacheType: CacheType,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { forceRefresh = false, ttlHours = 24 } = options;

    // Check cache first (unless refresh requested)
    if (!forceRefresh) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit', { cacheKey, cacheType });
        return cached as T;
      }
    }

    // Fetch from API
    this.logger.debug('Cache miss - fetching from API', { cacheKey, cacheType });
    const result = await fetchFn();

    // Cache the result
    await this.cacheService.setRawJSON(cacheKey, result, cacheType);
    
    return result;
  }

  /**
   * Build search parameters for specific engine
   */
  protected buildSearchParams(
    query: string, 
    engineConfig: SearchEngineConfig
  ): Record<string, any> {
    return {
      engine: engineConfig.engine,
      q: query,
      location: engineConfig.location || 'United States',
      hl: engineConfig.hl || 'en',
      gl: engineConfig.gl || 'us',
      num: engineConfig.num || 10,
      start: engineConfig.start || 0,
    };
  }

  /**
   * Generate cache key for consistent caching
   */
  protected generateCacheKey(companyName: string, searchType: string): string {
    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `serpapi_${searchType}_${cleanName}`;
  }

  /**
   * Validate API configuration
   */
  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('SerpAPI key is required');
    }
  }

  /**
   * Handle API errors gracefully
   */
  protected handleAPIError(error: any, operation: string): SerpAPIError {
    this.logger.error(`SerpAPI ${operation} failed`, { error: error.message });
    
    return {
      error: `${operation} failed`,
      code: error.code || 'UNKNOWN',
      message: error.message || 'Unknown error occurred'
    };
  }

  /**
   * Rate limiting helper
   */
  protected async rateLimitDelay(): Promise<void> {
    // Simple rate limiting - wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
} 