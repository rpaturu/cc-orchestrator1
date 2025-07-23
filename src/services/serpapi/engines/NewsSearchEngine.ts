import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { CacheType } from '../../../types/cache-types';
import { SerpAPICore } from '../core/SerpAPICore';
import { 
  SerpAPINewsResult, 
  SerpAPIConfig, 
  CacheOptions 
} from '../types/SerpAPITypes';

export class NewsSearchEngine extends SerpAPICore {
  constructor(cacheService: CacheService, logger: Logger, config?: Partial<SerpAPIConfig>) {
    super(cacheService, logger, config);
  }

  /**
   * Get news results for a company with caching
   */
  async getNewsResults(companyName: string, options: CacheOptions = {}): Promise<SerpAPINewsResult[]> {
    const cacheKey = this.generateCacheKey(companyName, 'news');
    
    return this.getCachedOrFetch(
      cacheKey,
      CacheType.SERP_API_NEWS_RESULTS,
      () => this.fetchNewsResults(companyName),
      options
    );
  }

  /**
   * Fetch news results from SerpAPI
   */
  private async fetchNewsResults(companyName: string): Promise<SerpAPINewsResult[]> {
    this.validateConfig();
    
    try {
      const params = this.buildSearchParams(companyName, {
        engine: 'google',
        tbm: 'nws',  // News search
        num: 10,
      });

      const response = await this.makeRequest(params);
      
      if (!response.organic_results) {
        this.logger.warn('No organic results found for news search', { companyName });
        return [];
      }

      return this.processNewsResults(response.organic_results);
    } catch (error) {
      this.logger.error('Failed to fetch news results', { 
        companyName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Process raw SerpAPI results into structured news results
   */
  private processNewsResults(organicResults: any[]): SerpAPINewsResult[] {
    return organicResults
      .filter(result => result.title && result.link)
      .map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet || '',
        date: result.date,
        source: result.source,
        thumbnail: result.thumbnail,
      }))
      .slice(0, 10); // Limit to 10 results
  }

  /**
   * Search for recent news about a company
   */
  async getRecentNews(companyName: string, days: number = 30): Promise<SerpAPINewsResult[]> {
    const dateFilter = `after:${this.getDateString(days)}`;
    const query = `"${companyName}" ${dateFilter}`;
    
    const params = this.buildSearchParams(query, {
      engine: 'google',
      tbm: 'nws',
      num: 10,
      tbs: 'qdr:m', // Past month
    });

    try {
      const response = await this.makeRequest(params);
      return this.processNewsResults(response.organic_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch recent news', { 
        companyName, 
        days,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Get company news by category (earnings, acquisitions, etc.)
   */
  async getCategorizedNews(
    companyName: string, 
    category: 'earnings' | 'acquisition' | 'partnership' | 'product' | 'funding'
  ): Promise<SerpAPINewsResult[]> {
    const categoryTerms = {
      earnings: 'earnings report revenue quarterly',
      acquisition: 'acquisition merger acquired',
      partnership: 'partnership alliance collaboration',
      product: 'product launch release announcement',
      funding: 'funding investment round raised'
    };

    const query = `"${companyName}" ${categoryTerms[category]}`;
    
    const params = this.buildSearchParams(query, {
      engine: 'google',
      tbm: 'nws',
      num: 10,
    });

    try {
      const response = await this.makeRequest(params);
      return this.processNewsResults(response.organic_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch categorized news', { 
        companyName, 
        category,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Helper to get date string for filtering
   */
  private getDateString(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }
} 