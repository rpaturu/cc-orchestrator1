import { CacheService } from './core/CacheService';
import { Logger } from './core/Logger';

// Import refactored components
import { GoogleSearchEngine } from './serpapi/engines/GoogleSearchEngine';
import { NewsSearchEngine } from './serpapi/engines/NewsSearchEngine';
import { JobsSearchEngine } from './serpapi/engines/JobsSearchEngine';
import { LinkedInSearchEngine } from './serpapi/engines/LinkedInSearchEngine';
import { YouTubeSearchEngine } from './serpapi/engines/YouTubeSearchEngine';
import { MultiSourceProcessor } from './serpapi/processors/MultiSourceProcessor';

// Import types
import { 
  SerpAPIResponse,
  SerpAPIMultiSourceResponse,
  SerpAPINewsResult,
  SerpAPIJobResult,
  SerpAPILinkedInResult,
  SerpAPIYouTubeResult,
  GoogleKnowledgeGraphLookupResult,
  GoogleKnowledgeGraphResult,
  SerpAPIConfig,
  CacheOptions
} from './serpapi/types/SerpAPITypes';

/**
 * Main SerpAPI Service - Orchestrates all search engines and processors
 * 
 * This refactored service maintains backward compatibility while using
 * the new modular architecture underneath.
 */
export class SerpAPIService {
  private googleEngine: GoogleSearchEngine;
  private newsEngine: NewsSearchEngine;
  private jobsEngine: JobsSearchEngine;
  private linkedInEngine: LinkedInSearchEngine;
  private youTubeEngine: YouTubeSearchEngine;
  private multiSourceProcessor: MultiSourceProcessor;
  private cacheService: CacheService;
  private logger: Logger;

  constructor(cacheService: CacheService, logger: Logger) {
    this.cacheService = cacheService;
    this.logger = logger;

    // Initialize all engines with shared dependencies
    const config: Partial<SerpAPIConfig> = {
      apiKey: process.env.SERPAPI_API_KEY || '',
    };

    this.googleEngine = new GoogleSearchEngine(cacheService, logger, config);
    this.newsEngine = new NewsSearchEngine(cacheService, logger, config);
    this.jobsEngine = new JobsSearchEngine(cacheService, logger, config);
    this.linkedInEngine = new LinkedInSearchEngine(cacheService, logger, config);
    this.youTubeEngine = new YouTubeSearchEngine(cacheService, logger, config);
    this.multiSourceProcessor = new MultiSourceProcessor(cacheService, logger, config);

    if (!process.env.SERPAPI_API_KEY) {
      this.logger.warn('SerpAPI key not found in environment variables');
    }
  }

  // =====================================
  // MAIN PUBLIC API METHODS (Backward Compatible)
  // =====================================

  /**
   * Get raw company data from Google search
   * @deprecated Use googleEngine.getRawCompanyData() for new implementations
   */
  async getRawCompanyData(companyName: string): Promise<SerpAPIResponse | null> {
    return this.googleEngine.getRawCompanyData(companyName);
  }

  /**
   * Lookup companies using Google Knowledge Graph
   * @deprecated Use CompanyLookupProcessor for new implementations
   */
  async lookupCompanies(query: string, limit: number = 3): Promise<GoogleKnowledgeGraphLookupResult[]> {
    // For backward compatibility, implement a simple lookup using Google search
    const rawData = await this.googleEngine.getRawCompanyData(query);
    
    if (!rawData?.knowledge_graph) {
      return [];
    }

    // Convert to expected format
    return [{
      resultId: `kg_${query.toLowerCase().replace(/\s+/g, '_')}`,
      title: rawData.knowledge_graph.name || query,
      entityType: rawData.knowledge_graph.types || ['Organization'],
      snippet: rawData.knowledge_graph.description || '',
      knowledgeGraph: rawData.knowledge_graph,
      confidence: 0.95, // High confidence for knowledge graph results
    }].slice(0, limit);
  }

  /**
   * Get multi-source company data
   */
  async getMultiSourceCompanyData(companyName: string): Promise<SerpAPIMultiSourceResponse> {
    return this.multiSourceProcessor.getMultiSourceCompanyData(companyName);
  }

  // =====================================
  // ENGINE-SPECIFIC METHODS
  // =====================================

  /**
   * Google Search Engine Methods
   */
  async getOrganicResults(companyName: string, options: CacheOptions = {}): Promise<any> {
    return this.googleEngine.getOrganicResults(companyName, options);
  }

  async getKnowledgeGraph(companyName: string): Promise<GoogleKnowledgeGraphResult | null> {
    return this.googleEngine.getKnowledgeGraph(companyName);
  }

  async getCompanyWebsite(companyName: string): Promise<string | null> {
    return this.googleEngine.getCompanyWebsite(companyName);
  }

  /**
   * News Search Engine Methods
   */
  async getNewsResults(companyName: string, options: CacheOptions = {}): Promise<SerpAPINewsResult[]> {
    return this.newsEngine.getNewsResults(companyName, options);
  }

  async getRecentNews(companyName: string, days: number = 30): Promise<SerpAPINewsResult[]> {
    return this.newsEngine.getRecentNews(companyName, days);
  }

  async getCategorizedNews(
    companyName: string, 
    category: 'earnings' | 'acquisition' | 'partnership' | 'product' | 'funding'
  ): Promise<SerpAPINewsResult[]> {
    return this.newsEngine.getCategorizedNews(companyName, category);
  }

  /**
   * Jobs Search Engine Methods
   */
  async getJobsResults(companyName: string, options: CacheOptions = {}): Promise<SerpAPIJobResult[]> {
    return this.jobsEngine.getJobsResults(companyName, options);
  }

  async getJobsByRole(
    companyName: string, 
    role: string, 
    location?: string
  ): Promise<SerpAPIJobResult[]> {
    return this.jobsEngine.getJobsByRole(companyName, role, location);
  }

  async getHiringTrends(companyName: string): Promise<{
    totalOpenings: number;
    departments: Record<string, number>;
    locations: Record<string, number>;
    experienceLevels: Record<string, number>;
  }> {
    return this.jobsEngine.getHiringTrends(companyName);
  }

  /**
   * LinkedIn Search Engine Methods
   */
  async getLinkedInResults(companyName: string, options: CacheOptions = {}): Promise<SerpAPILinkedInResult[]> {
    return this.linkedInEngine.getLinkedInResults(companyName, options);
  }

  async getExecutives(companyName: string): Promise<SerpAPILinkedInResult[]> {
    return this.linkedInEngine.getExecutives(companyName);
  }

  async getSalesContacts(companyName: string): Promise<SerpAPILinkedInResult[]> {
    return this.linkedInEngine.getSalesContacts(companyName);
  }

  /**
   * YouTube Search Engine Methods
   */
  async getYouTubeResults(companyName: string, options: CacheOptions = {}): Promise<SerpAPIYouTubeResult[]> {
    return this.youTubeEngine.getYouTubeResults(companyName, options);
  }

  async getPromotionalContent(companyName: string): Promise<SerpAPIYouTubeResult[]> {
    return this.youTubeEngine.getPromotionalContent(companyName);
  }

  async getYouTubeAnalytics(companyName: string): Promise<{
    totalVideos: number;
    totalViews: number;
    averageViews: number;
    contentTypes: Record<string, number>;
    channels: Record<string, number>;
    recentActivity: SerpAPIYouTubeResult[];
  }> {
    return this.youTubeEngine.getYouTubeAnalytics(companyName);
  }

  // =====================================
  // ADVANCED ORCHESTRATION METHODS
  // =====================================

  /**
   * Get selective multi-source data
   */
  async getSelectiveData(
    companyName: string,
    sources: ('organic' | 'news' | 'jobs' | 'linkedin' | 'youtube')[],
    options: CacheOptions = {}
  ): Promise<Partial<SerpAPIMultiSourceResponse>> {
    return this.multiSourceProcessor.getSelectiveMultiSourceData(companyName, sources, options);
  }

  /**
   * Get comprehensive company intelligence
   */
  async getCompanyIntelligence(companyName: string): Promise<{
    overview: any;
    recentNews: any[];
    hiringTrends: any;
    keyContacts: any[];
    contentPresence: any;
  }> {
    return this.multiSourceProcessor.getCompanyIntelligence(companyName);
  }

  // =====================================
  // CACHE MANAGEMENT
  // =====================================

  /**
   * Clear all SerpAPI caches for a company
   */
  async clearCompanyCache(companyName: string): Promise<void> {
    const cacheKeys = [
      `serpapi_organic_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      `serpapi_news_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      `serpapi_jobs_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      `serpapi_linkedin_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      `serpapi_youtube_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    ];

    await Promise.all(
      cacheKeys.map(key => this.cacheService.delete(key))
    );

    this.logger.info('Cleared SerpAPI cache for company', { companyName });
  }

  /**
   * Refresh all data for a company (bypass cache)
   */
  async refreshCompanyData(companyName: string): Promise<SerpAPIMultiSourceResponse> {
    await this.clearCompanyCache(companyName);
    return this.getMultiSourceCompanyData(companyName);
  }
} 