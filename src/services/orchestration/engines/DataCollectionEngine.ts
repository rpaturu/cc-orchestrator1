import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { SerpAPIService } from '../../SerpAPIService';
import { SnovService, SnovConfig } from '../../serpapi/snov/SnovService';
import { BrightDataService } from '../../BrightDataService';
import { OrchestrationCore } from '../core/OrchestrationCore';
import { 
  DataCollectionPlan,
  MultiSourceData,
  CollectionResult,
  CollectionSummary,
  SourceType,
  OrchestrationConfig
} from '../types/OrchestrationTypes';

export class DataCollectionEngine extends OrchestrationCore {
  private snovService: SnovService;
  private brightDataService: BrightDataService | null;

  constructor(
    cacheService: CacheService,
    logger: Logger,
    serpAPIService: SerpAPIService,
    config?: Partial<OrchestrationConfig>
  ) {
    super(cacheService, logger, serpAPIService, config);
    
    // Initialize Snov.io service with configuration
    const snovConfig: SnovConfig = {
      apiKey: process.env.SNOV_API_KEY || '',
      apiSecret: process.env.SNOV_API_SECRET || '',
      baseUrl: process.env.SNOV_BASE_URL || 'https://api.snov.io/v1',
      rateLimitPerMinute: 60,
      retryAttempts: 3,
      timeoutMs: 30000
    };
    
    // Create a minimal CacheConfig for SnovService
    const cacheConfig = {
      ttlHours: 24,
      maxEntries: 10000,
      compressionEnabled: true
    };
    
    this.snovService = new SnovService(snovConfig, cacheConfig, logger);
    
    // Initialize BrightData service if API key is available
    if (process.env.BRIGHTDATA_API_KEY) {
      this.brightDataService = new BrightDataService(
        process.env.BRIGHTDATA_API_KEY,
        logger
      );
      logger.info('BrightData service initialized in DataCollectionEngine');
    } else {
      this.brightDataService = null;
      logger.warn('BrightData API key not found - BrightData sources will be skipped');
    }
  }

  /**
   * Execute parallel data collection according to plan
   */
  async executeParallelCollection(plan: DataCollectionPlan): Promise<MultiSourceData> {
    this.logger.info('Starting parallel collection execution', {
      companyName: plan.companyName,
      sourcesCount: plan.toCollect.length,
      estimatedCost: plan.estimatedCost,
    });

    const startTime = Date.now();
    const results: CollectionResult[] = [];

    try {
      // Collect from cache first
      const cacheResults = await this.collectFromCache(plan.companyName, plan.toCollect);
      
      // Determine which sources need API calls
      const uncachedSources = plan.toCollect.filter((source: SourceType) => !(cacheResults as any)[source]);
      
      // Execute API calls for uncached sources
      if (uncachedSources.length > 0) {
        const apiResults = await this.collectFromAPIs(plan.companyName, uncachedSources);
        
        // Merge cache and API results
        Object.assign(cacheResults, apiResults);
      }

      // Convert to collection results format
      for (const source of plan.toCollect) {
        const data = (cacheResults as any)[source];
        results.push({
          source,
          data: data || null,
          success: !!data,
          duration: 0, // Would be tracked per source
          cost: this.getSourceCost(source),
          cached: !!(cacheResults as any)[source] && !uncachedSources.includes(source),
        });
      }

      const summary = this.calculateCollectionSummary(results, Date.now() - startTime);
      
      this.logger.info('Parallel data collection completed', {
        companyName: plan.companyName,
        duration: summary.totalDuration,
        successRate: `${summary.successfulTasks}/${summary.totalTasks}`,
        cacheHitRate: `${Math.round(summary.cacheHitRate * 100)}%`,
      });

      return cacheResults as MultiSourceData;
    } catch (error) {
      this.logger.error('Parallel data collection failed', {
        companyName: plan.companyName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Collect data from cache for specified sources
   */
  private async collectFromCache(companyName: string, sources: SourceType[]): Promise<Partial<MultiSourceData>> {
    const results: Partial<MultiSourceData> = {};

    await Promise.all(
      sources.map(async (source) => {
        try {
          const cacheKey = this.generateCacheKey(source, companyName);
          const cached = await this.cacheService.get(cacheKey);

          if (cached) {
            // Store cached result
            (results as any)[source] = cached;
            this.logger.debug('Cache hit', { source, companyName });
          }
        } catch (error) {
          this.logger.warn('Cache read failed', { 
            source, 
            companyName,
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      })
    );

    return results;
  }

  /**
   * Collect data from APIs for specified sources
   */
  private async collectFromAPIs(
    companyName: string,
    sources: SourceType[]
  ): Promise<Partial<MultiSourceData>> {
    const results: Partial<MultiSourceData> = {};

    // Execute API calls with limited parallelism
    const chunks = this.chunkArray(sources, this.config.maxParallelSources || 3);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(source => 
        this.collectFromSingleAPI(companyName, source)
      );

      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        const source = chunk[index];
        if (result.status === 'fulfilled' && result.value) {
          (results as any)[source] = result.value;
        } else {
          this.logger.warn('API collection failed', { 
            source, 
            companyName,
            error: result.status === 'rejected' ? result.reason : 'No data returned' 
          });
        }
      });

      // Rate limiting between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.sleep(500);
      }
    }

    return results;
  }

  /**
   * Collect data from a single API source
   */
  private async collectFromSingleAPI(companyName: string, source: SourceType): Promise<any> {
    return this.withRetry(async () => {
      let data: any = null;

      switch (source) {
        case 'serp_api':
        case 'serp_organic':
          data = await this.serpAPIService.getOrganicResults(companyName);
          break;
        case 'serp_news':
          data = await this.serpAPIService.getNewsResults(companyName);
          break;
        case 'serp_jobs':
          data = await this.serpAPIService.getJobsResults(companyName);
          break;
        case 'serp_linkedin':
          data = await this.serpAPIService.getLinkedInResults(companyName);
          break;
        case 'serp_youtube':
          data = await this.serpAPIService.getYouTubeResults(companyName);
          break;
        case 'apollo':
        case 'apollo_contacts':
          data = await this.collectApolloData(companyName);
          break;
        case 'snov_contacts':
        case 'snov_email_finder':
          data = await this.collectSnovData(companyName);
          break;
        case 'snov_email_verifier':
          data = await this.collectSnovEmailVerification(companyName);
          break;
        case 'snov_domain_search':
          data = await this.collectSnovDomainSearch(companyName);
          break;
        case 'snov_data_enrichment':
          data = await this.collectSnovDataEnrichment(companyName);
          break;
        case 'snov_linkedin_enrichment':
          data = await this.collectSnovLinkedInEnrichment(companyName);
          break;
        case 'snov_bulk_email_finder':
          data = await this.collectSnovBulkEmailFinder(companyName);
          break;
        case 'snov_bulk_email_verifier':
          data = await this.collectSnovBulkEmailVerifier(companyName);
          break;
        case 'zoominfo':
          data = await this.collectZoomInfoData(companyName);
          break;
        case 'hunter':
          data = await this.collectHunterData(companyName);
          break;
        case 'company_db':
          data = await this.collectCompanyDBData(companyName);
          break;
        case 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info':
          data = await this.collectBrightData(companyName);
          break;
        case 'brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies':
          data = await this.collectBrightDataCompanyInfo(companyName);
          break;
        case 'brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings':
          data = await this.collectBrightDataIndeedJobs(companyName);
          break;
        case 'brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info':
          data = await this.collectBrightDataIndeedCompanyInfo(companyName);
          break;
        case 'brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings':
          data = await this.collectBrightDataLinkedInJobs(companyName);
          break;
        case 'brightdata_gd_lnsxoxzi1omrwnka5r_google_news':
          data = await this.collectBrightDataNews(companyName);
          break;
        default:
          throw new Error(`Unknown source: ${source}`);
      }

      // Cache the result if data was collected
      if (data) {
        await this.cacheAPIResult(companyName, source, data);
      }

      return data;
    });
  }

  /**
   * Cache API result for future use
   */
  private async cacheAPIResult(companyName: string, source: SourceType, data: any): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(source, companyName);
      const cacheType = this.getCacheTypeForSource(source);
      
      await this.cacheService.setRawJSON(cacheKey, {
        data,
        source,
        companyName,
        timestamp: new Date().toISOString(),
        collectedBy: 'DataCollectionEngine',
      }, cacheType);

      this.logger.debug('API result cached', { source, companyName, cacheKey });
    } catch (error) {
      this.logger.warn('Failed to cache API result', {
        source,
        companyName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Calculate collection summary from results
   */
  private calculateCollectionSummary(results: CollectionResult[], totalDuration: number): CollectionSummary {
    const successfulTasks = results.filter(r => r.success).length;
    const failedTasks = results.length - successfulTasks;
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const cachedTasks = results.filter(r => r.cached).length;
    const cacheHitRate = cachedTasks / results.length;

    return {
      totalTasks: results.length,
      successfulTasks,
      failedTasks,
      totalCost,
      totalDuration,
      cacheHitRate,
      qualityScore: this.calculateAverageQuality(results),
    };
  }

  /**
   * Calculate average quality score from results
   */
  private calculateAverageQuality(results: CollectionResult[]): number {
    const successfulResults = results.filter(r => r.success && r.data);
    if (successfulResults.length === 0) return 0;

    const qualityScores = successfulResults.map(r => 
      this.calculateDataQuality(r.data, r.source)
    );

    return Math.round(
      qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
    );
  }

  /**
   * Calculate enhanced data quality score for collected data
   */
  protected calculateEnhancedDataQuality(data: any, source: SourceType): number {
    if (!data) return 0;

    let score = 0;
    let maxScore = 100;

    // Base completeness score (30 points)
    const completeness = this.calculateEnhancedCompleteness(data);
    score += completeness * 0.3;

    // Source reliability score (25 points)
    const reliability = this.getEnhancedSourceReliability(source);
    score += reliability * 0.25;

    // Data freshness score (20 points)
    const freshness = this.calculateEnhancedFreshness(data);
    score += freshness * 0.2;

    // Data consistency score (15 points)
    const consistency = this.calculateEnhancedConsistency(data);
    score += consistency * 0.15;

    // Data relevance score (10 points)
    const relevance = this.calculateEnhancedRelevance(data);
    score += relevance * 0.1;

    return Math.round(score);
  }

  /**
   * Calculate enhanced data completeness score
   */
  private calculateEnhancedCompleteness(data: any): number {
    if (!data || typeof data !== 'object') return 0;

    const requiredFields = this.getEnhancedRequiredFieldsForSource(data.source || 'unknown');
    if (requiredFields.length === 0) return 100;

    let presentFields = 0;
    for (const field of requiredFields) {
      if (data[field] !== undefined && data[field] !== null) {
        presentFields++;
      }
    }

    return Math.round((presentFields / requiredFields.length) * 100);
  }

  /**
   * Get enhanced required fields for a specific data source
   */
  private getEnhancedRequiredFieldsForSource(source: string): string[] {
    const fieldMap: Record<string, string[]> = {
      'serp_organic': ['organic_results', 'knowledge_graph'],
      'serp_news': ['news_results'],
      'serp_jobs': ['jobs_results'],
      'serp_linkedin': ['linkedin_results'],
      'serp_youtube': ['youtube_results'],
      'snov_contacts': ['contacts', 'domain'],
      'apollo_contacts': ['contacts', 'domain'],
      'zoominfo': ['company_intelligence', 'employee_insights'],
      'clearbit': ['company'],
      'hunter': ['emails', 'domain'],
      'company_db': ['company', 'financial']
    };

    return fieldMap[source] || [];
  }

  /**
   * Calculate enhanced data freshness score
   */
  private calculateEnhancedFreshness(data: any): number {
    if (!data || !data.timestamp) return 50; // Default score if no timestamp

    try {
      const dataTime = new Date(data.timestamp).getTime();
      const now = Date.now();
      const ageHours = (now - dataTime) / (1000 * 60 * 60);

      if (ageHours < 1) return 100;      // Less than 1 hour
      if (ageHours < 24) return 90;     // Less than 1 day
      if (ageHours < 168) return 70;    // Less than 1 week
      if (ageHours < 720) return 50;    // Less than 1 month
      if (ageHours < 2160) return 30;   // Less than 3 months
      return 10;                         // Older than 3 months
    } catch (error) {
      return 50; // Default score if timestamp parsing fails
    }
  }

  /**
   * Calculate enhanced data consistency score
   */
  private calculateEnhancedConsistency(data: any): number {
    if (!data || typeof data !== 'object') return 0;

    let consistencyScore = 100;
    let checks = 0;

    // Check for consistent data types
    if (data.contacts && Array.isArray(data.contacts)) {
      checks++;
      const hasConsistentStructure = data.contacts.every((contact: any) => 
        contact.name && contact.title && contact.email
      );
      if (!hasConsistentStructure) consistencyScore -= 20;
    }

    // Check for consistent naming conventions
    if (data.company_profile && data.company_profile.name) {
      checks++;
      if (data.company_profile.name !== data.company_profile.name.trim()) {
        consistencyScore -= 15;
      }
    }

    // Check for consistent date formats
    if (data.timestamp) {
      checks++;
      try {
        new Date(data.timestamp);
      } catch {
        consistencyScore -= 25;
      }
    }

    return checks > 0 ? Math.max(0, consistencyScore) : 100;
  }

  /**
   * Calculate enhanced data relevance score
   */
  private calculateEnhancedRelevance(data: any): number {
    if (!data || typeof data !== 'object') return 0;

    let relevanceScore = 100;

    // Check if data contains meaningful content
    if (data.contacts && Array.isArray(data.contacts)) {
      const hasValidContacts = data.contacts.some((contact: any) => 
        contact.name && contact.title && contact.email
      );
      if (!hasValidContacts) relevanceScore -= 40;
    }

    if (data.company_profile) {
      const hasCompanyInfo = data.company_profile.name || data.company_profile.description;
      if (!hasCompanyInfo) relevanceScore -= 30;
    }

    if (data.emails && Array.isArray(data.emails)) {
      const hasValidEmails = data.emails.some((email: any) => 
        email.value && email.confidence > 50
      );
      if (!hasValidEmails) relevanceScore -= 30;
    }

    return Math.max(0, relevanceScore);
  }

  /**
   * Get enhanced source reliability score
   */
  private getEnhancedSourceReliability(source: SourceType): number {
    const reliabilityScores: Record<SourceType, number> = {
      serp_organic: 85,
      serp_news: 75,
      serp_jobs: 70,
      serp_linkedin: 90,
      serp_youtube: 60,
      serp_api: 85,
      // Enhanced SerpAPI sources
      serp_google_finance: 88,
      serp_google_trends: 85,
      serp_google_images: 80,
      serp_google_videos: 75,
      serp_google_local: 85,
      serp_google_maps: 90,
      serp_google_shopping: 85,
      serp_google_patents: 92,
      serp_bing_search: 80,
      serp_duckduckgo: 75,
      // Enhanced Snov.io APIs
      snov_email_finder: 85,
      snov_email_verifier: 90,
      snov_domain_search: 88,
      snov_data_enrichment: 85,
      snov_linkedin_enrichment: 88,
      snov_bulk_email_finder: 85,
      snov_bulk_email_verifier: 90,
      // Bright Data specific datasets
      brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info: 92,
      brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info: 88,
      brightdata_gd_l1vilsfd1xpsndbtpr_ventureradar_company_info: 85,
      brightdata_gd_m0ci4a4ivx3j5l6nx_zoominfo_companies: 90,
      brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies: 92,
      brightdata_gd_m4ijiqfp2n9oe3oluj_pitchbook_companies: 95,
      brightdata_gd_l1vilaxi10wutoage7_owler_companies: 85,
      brightdata_gd_m3fl0mwzmfpfn4cw4_companies_enriched: 88,
      brightdata_gd_l1viktl72bvl7bjuj0_linkedin_people_profiles: 92,
      brightdata_gd_m5zhkpdgryvlxn8zg_pitchbook_people_profiles: 95,
      brightdata_gd_m2a6waqv18439a8thq_b2b_contacts_companies: 88,
      brightdata_gd_m18zt6ec11wfqohyrs_employees_business_enriched: 85,
      brightdata_gd_l7j0bx501ockwldaqf_glassdoor_companies_overview: 88,
      brightdata_gd_l7j1po0921hbu0ri1z_glassdoor_companies_reviews: 85,
      brightdata_gd_lpfbbndm1xnopbrcr0_glassdoor_job_listings: 85,
      brightdata_gd_l88xp4k01qnhvyqlvw_g2_software_product_overview: 88,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_product_reviews: 85,
      brightdata_gd_lztojazw1389985ops_trustradius_product_reviews: 85,
      brightdata_gd_lm5zmhwd2sni130p_trustpilot_business_reviews: 85,
      brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings: 85,
      brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info: 85,
      brightdata_gd_m487ihp32jtc4ujg45_linkedin_profiles_jobs_listings: 88,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_reviews: 88,
      brightdata_gd_lnsxoxzi1omrwnka5r_google_news: 90,
      brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings: 90,
      snov_contacts: 80,
      apollo_contacts: 85,
      apollo: 85,
      zoominfo: 88,
      hunter: 78,
      company_db: 75,
    };
    return reliabilityScores[source] || 75;
  }

  /**
   * Utility to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Placeholder methods for different data sources
  private async collectBrightData(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting BrightData company enrichment', { companyName });
      
      if (!this.brightDataService) {
        this.logger.warn('BrightData service not available - skipping collection');
        return {
          source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info',
          error: 'BrightData service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Collect company information from multiple BrightData datasets
      const [companyInfo, linkedInInfo] = await Promise.allSettled([
        this.brightDataService.getCompanyInfo(companyName),
        this.brightDataService.getLinkedInCompanyInfo(companyName)
      ]);

      const result = {
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info',
        company_profile: companyInfo.status === 'fulfilled' ? companyInfo.value : null,
        linkedin_profile: linkedInInfo.status === 'fulfilled' ? linkedInInfo.value : null,
        timestamp: new Date().toISOString()
      };

      this.logger.info('BrightData collection completed', {
        companyName,
        companyInfoSuccess: companyInfo.status === 'fulfilled',
        linkedInInfoSuccess: linkedInInfo.status === 'fulfilled'
      });

      return result;

    } catch (error) {
      this.logger.error('BrightData collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect tech stack data from BrightData
   */
  private async collectBrightDataTechStack(companyName: string, source: 'builtwith' | 'stackshare'): Promise<any> {
    try {
      this.logger.debug('Collecting BrightData tech stack', { companyName, source });
      
      if (!this.brightDataService) {
        this.logger.warn('BrightData service not available - skipping tech stack collection');
        return {
          source: `brightdata_${source}`,
          error: 'BrightData service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Extract domain from company name for tech stack lookup
      const domain = companyName.toLowerCase().replace(/\s+/g, '');
      
      let techStack;
      if (source === 'builtwith') {
        techStack = await this.brightDataService.getTechStack(domain);
      } else {
        techStack = await this.brightDataService.getStackShareTechStack(domain);
      }

      const result = {
        source: `brightdata_${source}`,
        tech_stack: techStack,
        domain,
        timestamp: new Date().toISOString()
      };

      this.logger.info('BrightData tech stack collection completed', {
        companyName,
        source,
        hasTechStack: !!techStack
      });

      return result;

    } catch (error) {
      this.logger.error('BrightData tech stack collection failed', {
        companyName,
        source,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: `brightdata_${source}`,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect company info from BrightData Crunchbase
   */
  private async collectBrightDataCompanyInfo(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting BrightData company info', { companyName });
      
      if (!this.brightDataService) {
        this.logger.warn('BrightData service not available - skipping company info collection');
        return {
          source: 'brightdata_crunchbase',
          error: 'BrightData service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      const companyInfo = await this.brightDataService.getCompanyInfo(companyName);

      const result = {
        source: 'brightdata_crunchbase',
        company_info: companyInfo,
        timestamp: new Date().toISOString()
      };

      this.logger.info('BrightData company info collection completed', {
        companyName,
        hasCompanyInfo: !!companyInfo
      });

      return result;

    } catch (error) {
      this.logger.error('BrightData company info collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'brightdata_crunchbase',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect news data from BrightData
   */
  private async collectBrightDataNews(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting BrightData news data', { companyName });
      
      if (!this.brightDataService) {
        this.logger.warn('BrightData service not available - skipping news collection');
        return {
          source: 'brightdata_news',
          error: 'BrightData service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      const newsData = await this.brightDataService.getNewsData(companyName, 10);

      const result = {
        source: 'brightdata_news',
        news_data: newsData,
        timestamp: new Date().toISOString()
      };

      this.logger.info('BrightData news collection completed', {
        companyName,
        newsCount: newsData.length
      });

      return result;

    } catch (error) {
      this.logger.error('BrightData news collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'brightdata_news',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect BrightData G2 software reviews data for a company
   */
  private async collectBrightDataG2Reviews(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting BrightData G2 reviews data', { companyName });
      
      if (!this.brightDataService) {
        this.logger.warn('BrightData service not available - skipping G2 reviews collection');
        return {
          source: 'brightdata_g2_reviews',
          error: 'BrightData service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Use the G2 software reviews dataset
      const g2Data = await this.brightDataService.filterDataset(
        'gd_l88xvdka1uao86xvlb',
        { company: companyName },
        'json'
      );

      const result = {
        source: 'brightdata_g2_reviews',
        g2_reviews: g2Data,
        timestamp: new Date().toISOString()
      };

      this.logger.info('BrightData G2 reviews collection completed', {
        companyName,
        g2DataCount: Array.isArray(g2Data) ? g2Data.length : 0
      });

      return result;

    } catch (error) {
      this.logger.error('BrightData G2 reviews collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'brightdata_g2_reviews',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect Indeed job listings data for tech stack analysis
   */
  private async collectBrightDataIndeedJobs(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting BrightData Indeed job listings', { companyName });
      
      if (!this.brightDataService) {
        this.logger.warn('BrightData service not available - skipping Indeed jobs collection');
        return {
          source: 'brightdata_indeed_jobs',
          error: 'BrightData service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Use the Indeed job listings dataset
      const jobData = await this.brightDataService.filterDataset(
        'gd_l4dx9j9sscpvs7no2',
        { company: companyName },
        'json'
      );

      const result = {
        source: 'brightdata_indeed_jobs',
        job_listings: jobData,
        companyName,
        timestamp: new Date().toISOString()
      };

      this.logger.info('BrightData Indeed jobs collection completed', {
        companyName,
        jobCount: Array.isArray(jobData) ? jobData.length : 0
      });

      return result;

    } catch (error) {
      this.logger.error('BrightData Indeed jobs collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'brightdata_indeed_jobs',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect Indeed company information data
   */
  private async collectBrightDataIndeedCompanyInfo(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting BrightData Indeed company info', { companyName });
      
      if (!this.brightDataService) {
        this.logger.warn('BrightData service not available - skipping Indeed company info collection');
        return {
          source: 'brightdata_indeed_company_info',
          error: 'BrightData service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Use the Indeed companies info dataset
      const companyData = await this.brightDataService.filterDataset(
        'gd_l7qekxkv2i7ve6hx1s',
        { company: companyName },
        'json'
      );

      const result = {
        source: 'brightdata_indeed_company_info',
        company_info: companyData,
        companyName,
        timestamp: new Date().toISOString()
      };

      this.logger.info('BrightData Indeed company info collection completed', {
        companyName,
        dataAvailable: !!companyData
      });

      return result;

    } catch (error) {
      this.logger.error('BrightData Indeed company info collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'brightdata_indeed_company_info',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect LinkedIn job listings data for tech stack analysis
   */
  private async collectBrightDataLinkedInJobs(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting BrightData LinkedIn job listings', { companyName });
      
      if (!this.brightDataService) {
        this.logger.warn('BrightData service not available - skipping LinkedIn jobs collection');
        return {
          source: 'brightdata_linkedin_jobs',
          error: 'BrightData service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Use the LinkedIn job listings dataset
      const jobData = await this.brightDataService.filterDataset(
        'gd_lpfll7v5hcqtkxl6l',
        { company: companyName },
        'json'
      );

      const result = {
        source: 'brightdata_linkedin_jobs',
        job_listings: jobData,
        companyName,
        timestamp: new Date().toISOString()
      };

      this.logger.info('BrightData LinkedIn jobs collection completed', {
        companyName,
        jobCount: Array.isArray(jobData) ? jobData.length : 0
      });

      return result;

    } catch (error) {
      this.logger.error('BrightData LinkedIn jobs collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'brightdata_linkedin_jobs',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  private async collectApolloData(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Apollo contact enrichment', { companyName });
      
      // Simulate Apollo API call with contact data
      const mockData = {
        source: 'apollo_contacts',
        domain: `${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        contacts: [
          {
            id: 'apollo_1',
            first_name: 'Alex',
            last_name: 'Thompson',
            name: 'Alex Thompson',
            title: 'Senior Sales Manager',
            department: 'Sales',
            seniority: 'senior',
            email: 'alex.thompson@company.com',
            phone: '+1-555-0123',
            linkedin_url: 'https://linkedin.com/in/alexthompson',
            location: 'San Francisco, CA',
            company: companyName,
            verified: true,
            confidence: 0.95
          },
          {
            id: 'apollo_2',
            first_name: 'Jennifer',
            last_name: 'Wilson',
            name: 'Jennifer Wilson',
            title: 'Marketing Director',
            department: 'Marketing',
            seniority: 'director',
            email: 'jennifer.wilson@company.com',
            phone: '+1-555-0124',
            linkedin_url: 'https://linkedin.com/in/jenniferwilson',
            location: 'San Francisco, CA',
            company: companyName,
            verified: true,
            confidence: 0.92
          },
          {
            id: 'apollo_3',
            first_name: 'David',
            last_name: 'Brown',
            name: 'David Brown',
            title: 'Product Manager',
            department: 'Product',
            seniority: 'manager',
            email: 'david.brown@company.com',
            phone: '+1-555-0125',
            linkedin_url: 'https://linkedin.com/in/davidbrown',
            location: 'San Francisco, CA',
            company: companyName,
            verified: false,
            confidence: 0.78
          }
        ],
        total: 3,
        timestamp: new Date().toISOString()
      };

      this.logger.info('Apollo contact collection completed', {
        companyName,
        contactCount: mockData.contacts.length,
        verifiedCount: mockData.contacts.filter(c => c.verified).length
      });

      return mockData;

    } catch (error) {
      this.logger.error('Apollo contact collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'apollo_contacts',
        contacts: [],
        total: 0,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  private async collectSnovData(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Snov contact data', { companyName });
      
      // Extract domain from company name (simplified)
      const domain = companyName.toLowerCase().replace(/\s+/g, '') + '.com';
      
      // Use new SnovService for email finding and domain search
      const [emailFinderResult, domainSearchResult] = await Promise.allSettled([
        this.snovService.findEmails({
          domain,
          type: 'personal',
          positions: ['director', 'manager', 'vp', 'chief', 'head', 'lead', 'sales', 'marketing'],
          limit: 25
        }),
        this.snovService.searchDomain({
          domain,
          type: 'personal',
          limit: 25
        })
      ]);

      const emails = emailFinderResult.status === 'fulfilled' ? emailFinderResult.value.emails : [];
      const domainEmails = domainSearchResult.status === 'fulfilled' ? domainSearchResult.value.emails : [];
      
      // Combine and deduplicate results
      const allContacts = [...emails, ...domainEmails];
      const uniqueContacts = allContacts.reduce((acc, contact) => {
        if (!acc.find(c => c.email === contact.email)) {
          acc.push({
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            position: contact.position,
            department: this.inferDepartment(contact.position),
            linkedin: 'socialUrl' in contact ? contact.socialUrl : undefined,
            verified: 'confidence' in contact ? contact.confidence > 0.7 : false,
            confidence: 'confidence' in contact ? contact.confidence : 0.5
          });
        }
        return acc;
      }, [] as any[]);

      this.logger.info('Snov contact data collected', {
        companyName,
        domain,
        contactCount: uniqueContacts.length,
        verifiedCount: uniqueContacts.filter(c => c.verified).length
      });

      return {
        source: 'snov_contacts',
        domain,
        contacts: uniqueContacts,
        total: uniqueContacts.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Snov contact collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return structured error result
      return {
        source: 'snov_contacts',
        contacts: [],
        total: 0,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Infer department from position title
   */
  private inferDepartment(position: string): string {
    const positionLower = position.toLowerCase();
    
    if (positionLower.includes('sales') || positionLower.includes('business development') || positionLower.includes('account')) {
      return 'sales';
    } else if (positionLower.includes('marketing') || positionLower.includes('growth') || positionLower.includes('brand')) {
      return 'marketing';
    } else if (positionLower.includes('engineer') || positionLower.includes('developer') || positionLower.includes('tech')) {
      return 'engineering';
    } else if (positionLower.includes('ceo') || positionLower.includes('cto') || positionLower.includes('cfo') || positionLower.includes('chief')) {
      return 'executive';
    } else if (positionLower.includes('hr') || positionLower.includes('people') || positionLower.includes('talent')) {
      return 'hr';
    } else {
      return 'other';
    }
  }

  private async collectZoomInfoData(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting ZoomInfo company intelligence', { companyName });
      
      // Simulate ZoomInfo API call with comprehensive company data
      const mockData = {
        source: 'zoominfo',
        company_intelligence: {
          basic_info: {
            name: companyName,
            website: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
            industry: 'Software & Technology',
            sub_industry: 'Enterprise Software',
            company_size: '1000-5000 employees',
            revenue: '$100M - $500M',
            founded: '2010',
            headquarters: 'San Francisco, CA',
            ownership: 'Private',
            parent_company: null
          },
          financial_data: {
            annual_revenue: '$250M',
            growth_rate: '25%',
            funding_stage: 'Series C',
            total_funding: '$75M',
            last_funding_date: '2023-06-15',
            investors: ['Sequoia Capital', 'Andreessen Horowitz', 'Battery Ventures']
          },
          technology_stack: {
            primary_technologies: ['AWS', 'React', 'Node.js', 'PostgreSQL', 'Redis'],
            cloud_providers: ['AWS', 'Google Cloud'],
            databases: ['PostgreSQL', 'MongoDB', 'Redis'],
            frameworks: ['React', 'Angular', 'Vue.js', 'Express.js']
          },
          market_position: {
            target_markets: ['Enterprise', 'Mid-Market', 'SMB'],
            geographic_focus: ['North America', 'Europe', 'Asia-Pacific'],
            competitive_landscape: ['Salesforce', 'HubSpot', 'Pipedrive'],
            market_share: 'Top 5 in category'
          }
        },
        employee_insights: {
          total_employees: 2500,
          department_breakdown: {
            'Engineering': 800,
            'Sales': 600,
            'Marketing': 300,
            'Customer Success': 400,
            'Operations': 200,
            'Executive': 20
          },
          key_contacts: [
            {
              name: 'Robert Chen',
              title: 'Chief Executive Officer',
              department: 'Executive',
              email: 'robert.chen@company.com',
              phone: '+1-555-0100',
              linkedin: 'https://linkedin.com/in/robertchen'
            },
            {
              name: 'Lisa Rodriguez',
              title: 'Chief Revenue Officer',
              department: 'Sales',
              email: 'lisa.rodriguez@company.com',
              phone: '+1-555-0101',
              linkedin: 'https://linkedin.com/in/lisarodriguez'
            }
          ]
        },
        timestamp: new Date().toISOString()
      };

      this.logger.info('ZoomInfo collection completed', {
        companyName,
        intelligenceComplete: !!mockData.company_intelligence,
        contactCount: mockData.employee_insights.key_contacts.length
      });

      return mockData;

    } catch (error) {
      this.logger.error('ZoomInfo collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'zoominfo',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }



  private async collectHunterData(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Hunter email verification data', { companyName });
      
      // Simulate Hunter API call with email verification data
      const mockData = {
        source: 'hunter',
        domain: `${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        emails: [
          {
            value: 'john.doe@company.com',
            type: 'personal',
            confidence: 95,
            sources: [
              {
                domain: 'company.com',
                uri: 'https://company.com/team',
                extracted_on: '2024-01-15'
              }
            ],
            first_name: 'John',
            last_name: 'Doe',
            position: 'Sales Manager',
            seniority: 'senior',
            department: 'Sales',
            linkedin: 'https://linkedin.com/in/johndoe',
            twitter: '@johndoe'
          },
          {
            value: 'sarah.smith@company.com',
            type: 'personal',
            confidence: 92,
            sources: [
              {
                domain: 'company.com',
                uri: 'https://company.com/about',
                extracted_on: '2024-01-10'
              }
            ],
            first_name: 'Sarah',
            last_name: 'Smith',
            position: 'Marketing Director',
            seniority: 'director',
            department: 'Marketing',
            linkedin: 'https://linkedin.com/in/sarahsmith',
            twitter: '@sarahsmith'
          },
          {
            value: 'mike.johnson@company.com',
            type: 'personal',
            confidence: 88,
            sources: [
              {
                domain: 'company.com',
                uri: 'https://company.com/contact',
                extracted_on: '2024-01-12'
              }
            ],
            first_name: 'Mike',
            last_name: 'Johnson',
            position: 'Product Manager',
            seniority: 'manager',
            department: 'Product',
            linkedin: 'https://linkedin.com/in/mikejohnson',
            twitter: '@mikejohnson'
          }
        ],
        total: 3,
        timestamp: new Date().toISOString()
      };

      this.logger.info('Hunter collection completed', {
        companyName,
        emailCount: mockData.emails.length,
        averageConfidence: Math.round(
          mockData.emails.reduce((sum, email) => sum + email.confidence, 0) / mockData.emails.length
        )
      });

      return mockData;

    } catch (error) {
      this.logger.error('Hunter collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'hunter',
        emails: [],
        total: 0,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  private async collectCompanyDBData(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Company DB data', { companyName });
      
      // Simulate Company DB API call with company information
      const mockData = {
        source: 'company_db',
        company: {
          name: companyName,
          legal_name: `${companyName} Inc.`,
          duns_number: '123456789',
          tax_id: '12-3456789',
          registration_number: 'CA1234567',
          entity_type: 'Corporation',
          incorporation_date: '2010-03-15',
          status: 'Active',
          jurisdiction: 'Delaware'
        },
        financial: {
          revenue_range: '$100M - $500M',
          employee_count: '1000-5000',
          credit_score: 'A+',
          risk_rating: 'Low',
          payment_terms: 'Net 30',
          bankruptcy_history: false,
          liens: false
        },
        operations: {
          primary_naics: '511210',
          primary_sic: '7372',
          business_type: 'B2B Software',
          year_established: 2010,
          ownership_type: 'Private',
          parent_company: null,
          subsidiaries: []
        },
        contacts: [
          {
            name: 'Legal Department',
            email: 'legal@company.com',
            phone: '+1-555-0126',
            address: '123 Main Street, Suite 100, San Francisco, CA 94105'
          },
          {
            name: 'Finance Department',
            email: 'finance@company.com',
            phone: '+1-555-0127',
            address: '123 Main Street, Suite 100, San Francisco, CA 94105'
          }
        ],
        timestamp: new Date().toISOString()
      };

      this.logger.info('Company DB collection completed', {
        companyName,
        companyComplete: !!mockData.company,
        hasFinancial: !!mockData.financial
      });

      return mockData;

    } catch (error) {
      this.logger.error('Company DB collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        source: 'company_db',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect email verification data using Snov.io
   */
  private async collectSnovEmailVerification(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Snov email verification data', { companyName });
      
      // Get some sample emails to verify (could come from previous collections)
      const domain = companyName.toLowerCase().replace(/\s+/g, '') + '.com';
      const sampleEmails = [
        `info@${domain}`,
        `contact@${domain}`,
        `sales@${domain}`,
        `support@${domain}`
      ];

      const result = await this.snovService.verifyEmails({
        emails: sampleEmails
      });

      this.logger.info('Snov email verification completed', {
        companyName,
        emailsVerified: result.results.length,
        validEmails: result.results.filter(r => r.status === 'valid').length
      });

      return {
        source: 'snov_email_verifier',
        domain,
        verificationResults: result.results,
        validEmails: result.results.filter(r => r.status === 'valid'),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Snov email verification failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        source: 'snov_email_verifier',
        verificationResults: [],
        validEmails: [],
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect domain search data using Snov.io
   */
  private async collectSnovDomainSearch(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Snov domain search data', { companyName });
      
      const domain = companyName.toLowerCase().replace(/\s+/g, '') + '.com';
      
      const result = await this.snovService.searchDomain({
        domain,
        type: 'personal',
        limit: 50
      });

      this.logger.info('Snov domain search completed', {
        companyName,
        domain,
        emailsFound: result.totalEmails
      });

      return {
        source: 'snov_domain_search',
        domain,
        companyName: result.companyName,
        emails: result.emails,
        totalEmails: result.totalEmails,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Snov domain search failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        source: 'snov_domain_search',
        emails: [],
        totalEmails: 0,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect data enrichment using Snov.io
   */
  private async collectSnovDataEnrichment(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Snov data enrichment', { companyName });
      
      const domain = companyName.toLowerCase().replace(/\s+/g, '') + '.com';
      
      // Enrich common executive email patterns
      const executivePatterns = [
        `ceo@${domain}`,
        `founder@${domain}`,
        `president@${domain}`
      ];

      const enrichmentResults = await Promise.allSettled(
        executivePatterns.map(email => 
          this.snovService.enrichData({ email, domain })
        )
      );

      const enrichedData = enrichmentResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value.data)
        .filter(data => data.email);

      this.logger.info('Snov data enrichment completed', {
        companyName,
        domain,
        enrichedProfiles: enrichedData.length
      });

      return {
        source: 'snov_data_enrichment',
        domain,
        enrichedProfiles: enrichedData,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Snov data enrichment failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        source: 'snov_data_enrichment',
        enrichedProfiles: [],
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect LinkedIn enrichment using Snov.io
   */
  private async collectSnovLinkedInEnrichment(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Snov LinkedIn enrichment', { companyName });
      
      // Sample LinkedIn URLs (in real implementation, these would come from previous data collection)
      const linkedinUrls = [
        `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
        `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '')}`
      ];

      const enrichmentResults = await Promise.allSettled(
        linkedinUrls.map(url => 
          this.snovService.enrichLinkedIn({ linkedinUrl: url })
        )
      );

      const enrichedProfiles = enrichmentResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value.data)
        .filter(data => data.firstName);

      this.logger.info('Snov LinkedIn enrichment completed', {
        companyName,
        enrichedProfiles: enrichedProfiles.length
      });

      return {
        source: 'snov_linkedin_enrichment',
        companyName,
        enrichedProfiles,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Snov LinkedIn enrichment failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        source: 'snov_linkedin_enrichment',
        enrichedProfiles: [],
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect bulk email finder data using Snov.io
   */
  private async collectSnovBulkEmailFinder(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Snov bulk email finder data', { companyName });
      
      const domain = companyName.toLowerCase().replace(/\s+/g, '') + '.com';
      const domains = [domain, `www.${domain}`, `app.${domain}`];
      
      const result = await this.snovService.bulkFindEmails({
        domains,
        positions: ['ceo', 'cto', 'founder', 'director', 'manager', 'vp'],
        departments: ['sales', 'marketing', 'engineering', 'executive'],
        limit: 100
      });

      this.logger.info('Snov bulk email finder initiated', {
        companyName,
        jobId: result.jobId,
        status: result.status
      });

      return {
        source: 'snov_bulk_email_finder',
        companyName,
        jobId: result.jobId,
        status: result.status,
        results: result.results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Snov bulk email finder failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        source: 'snov_bulk_email_finder',
        jobId: null,
        status: 'failed',
        results: [],
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Collect bulk email verifier data using Snov.io
   */
  private async collectSnovBulkEmailVerifier(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Snov bulk email verifier data', { companyName });
      
      const domain = companyName.toLowerCase().replace(/\s+/g, '') + '.com';
      
      // Sample emails for bulk verification (in real implementation, these would come from previous collections)
      const emails = [
        `info@${domain}`,
        `contact@${domain}`,
        `sales@${domain}`,
        `support@${domain}`,
        `hello@${domain}`,
        `team@${domain}`,
        `ceo@${domain}`,
        `founder@${domain}`
      ];
      
      const result = await this.snovService.bulkVerifyEmails({
        emails
      });

      this.logger.info('Snov bulk email verifier initiated', {
        companyName,
        jobId: result.jobId,
        status: result.status,
        emailCount: emails.length
      });

      return {
        source: 'snov_bulk_email_verifier',
        companyName,
        domain,
        jobId: result.jobId,
        status: result.status,
        results: result.results,
        emailCount: emails.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Snov bulk email verifier failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        source: 'snov_bulk_email_verifier',
        jobId: null,
        status: 'failed',
        results: [],
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
} 