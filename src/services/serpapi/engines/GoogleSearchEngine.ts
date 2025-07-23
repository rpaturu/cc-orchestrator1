import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { CacheType } from '../../../types/cache-types';
import { SerpAPICore } from '../core/SerpAPICore';
import { 
  SerpAPIResponse,
  GoogleKnowledgeGraphResult,
  SerpAPIConfig, 
  CacheOptions 
} from '../types/SerpAPITypes';

export class GoogleSearchEngine extends SerpAPICore {
  constructor(cacheService: CacheService, logger: Logger, config?: Partial<SerpAPIConfig>) {
    super(cacheService, logger, config);
  }

  /**
   * Get raw company data from Google search with knowledge graph
   */
  async getRawCompanyData(companyName: string, options: CacheOptions = {}): Promise<SerpAPIResponse | null> {
    const cacheKey = this.generateCacheKey(companyName, 'organic');
    
    return this.getCachedOrFetch(
      cacheKey,
      CacheType.SERP_API_RAW_RESPONSE,
      () => this.fetchRawCompanyData(companyName),
      options
    );
  }

  /**
   * Get organic search results for a company
   */
  async getOrganicResults(companyName: string, options: CacheOptions = {}): Promise<any> {
    const cacheKey = this.generateCacheKey(companyName, 'organic');
    
    return this.getCachedOrFetch(
      cacheKey,
      CacheType.SERP_API_ORGANIC_RESULTS,
      () => this.fetchOrganicResults(companyName),
      options
    );
  }

  /**
   * Get knowledge graph data for a company
   */
  async getKnowledgeGraph(companyName: string): Promise<GoogleKnowledgeGraphResult | null> {
    const rawData = await this.getRawCompanyData(companyName);
    
    if (!rawData?.knowledge_graph) {
      this.logger.warn('No knowledge graph found', { companyName });
      return null;
    }

    return rawData.knowledge_graph;
  }

  /**
   * Fetch raw company data from SerpAPI
   */
  private async fetchRawCompanyData(companyName: string): Promise<SerpAPIResponse | null> {
    this.validateConfig();
    
    try {
      const params = this.buildSearchParams(companyName, {
        engine: 'google',
        num: 10,
      });

      const response = await this.makeRequest(params);
      
      if (!response || response.error) {
        this.logger.error('SerpAPI returned error or empty response', { 
          companyName,
          error: response?.error 
        });
        return null;
      }

      this.logger.debug('SerpAPI organic search successful', { 
        companyName,
        hasKnowledgeGraph: !!response.knowledge_graph,
        organicCount: response.organic_results?.length || 0
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to fetch raw company data', { 
        companyName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Fetch organic results only
   */
  private async fetchOrganicResults(companyName: string): Promise<any> {
    const rawData = await this.fetchRawCompanyData(companyName);
    return rawData?.organic_results || [];
  }

  /**
   * Search for company with specific query terms
   */
  async searchWithTerms(companyName: string, additionalTerms: string[]): Promise<SerpAPIResponse | null> {
    const query = `"${companyName}" ${additionalTerms.join(' ')}`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'google',
        num: 10,
      });

      return await this.makeRequest(params);
    } catch (error) {
      this.logger.error('Failed to search with terms', { 
        companyName, 
        additionalTerms,
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Get company website and domain information
   */
  async getCompanyWebsite(companyName: string): Promise<string | null> {
    const knowledgeGraph = await this.getKnowledgeGraph(companyName);
    
    if (knowledgeGraph?.url) {
      return knowledgeGraph.url;
    }

    // Fallback to organic results
    const organicResults = await this.getOrganicResults(companyName);
    const firstResult = organicResults?.[0];
    
    if (firstResult?.link) {
      // Extract domain from URL
      try {
        const url = new URL(firstResult.link);
        return url.origin;
      } catch {
        return firstResult.link;
      }
    }

    return null;
  }
} 