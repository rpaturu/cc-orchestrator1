import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { SerpAPIService } from '../../SerpAPIService';
import { SnovService } from '../../SnovService';
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

  constructor(
    cacheService: CacheService,
    logger: Logger,
    serpAPIService: SerpAPIService,
    config?: Partial<OrchestrationConfig>
  ) {
    super(cacheService, logger, serpAPIService, config);
    this.snovService = new SnovService(cacheService, logger);
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
        case 'bright_data':
          data = await this.collectBrightData(companyName);
          break;
        case 'apollo':
        case 'apollo_contacts':
          data = await this.collectApolloData(companyName);
          break;
        case 'snov_contacts':
          data = await this.collectSnovData(companyName);
          break;
        case 'zoominfo':
          data = await this.collectZoomInfoData(companyName);
          break;
        case 'clearbit':
          data = await this.collectClearbitData(companyName);
          break;
        case 'hunter':
          data = await this.collectHunterData(companyName);
          break;
        case 'company_db':
          data = await this.collectCompanyDBData(companyName);
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
    // Placeholder - would implement BrightData API integration
    this.logger.debug('Collecting BrightData (placeholder)', { companyName });
    return null;
  }

  private async collectApolloData(companyName: string): Promise<any> {
    // Placeholder - would implement Apollo API integration
    this.logger.debug('Collecting Apollo data (placeholder)', { companyName });
    return null;
  }

  private async collectSnovData(companyName: string): Promise<any> {
    try {
      this.logger.debug('Collecting Snov contact data', { companyName });
      
      // Use SnovService for real contact enrichment
      const result = await this.snovService.getCompanyContacts(companyName, undefined, {
        maxContacts: 25,
        departments: ['sales', 'marketing', 'business development', 'executive'],
        seniority: ['director', 'manager', 'vp', 'chief', 'head', 'lead']
      });

      this.logger.info('Snov contact data collected', {
        companyName,
        contactCount: result.contacts.length,
        verifiedCount: result.contacts.filter(c => c.verified).length
      });

      return {
        source: 'snov_api',
        domain: result.domain,
        contacts: result.contacts,
        total: result.total,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Snov contact collection failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return structured error result
      return {
        source: 'snov_api',
        contacts: [],
        total: 0,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  private async collectZoomInfoData(companyName: string): Promise<any> {
    // Placeholder - would implement ZoomInfo API integration
    this.logger.debug('Collecting ZoomInfo data (placeholder)', { companyName });
    return null;
  }

  private async collectClearbitData(companyName: string): Promise<any> {
    // Placeholder - would implement Clearbit API integration
    this.logger.debug('Collecting Clearbit data (placeholder)', { companyName });
    return null;
  }

  private async collectHunterData(companyName: string): Promise<any> {
    // Placeholder - would implement Hunter API integration
    this.logger.debug('Collecting Hunter data (placeholder)', { companyName });
    return null;
  }

  private async collectCompanyDBData(companyName: string): Promise<any> {
    // Placeholder - would implement Company DB integration
    this.logger.debug('Collecting Company DB data (placeholder)', { companyName });
    return null;
  }
} 