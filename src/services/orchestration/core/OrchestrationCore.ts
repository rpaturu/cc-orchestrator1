import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { SerpAPIService } from '../../SerpAPIService';
import { CacheType } from '../../../types/cache-types';
import { 
  SourceType, 
  OrchestrationConfig, 
  OrchestrationHealth,
  MultiSourceData,
  SourceAvailability,
  DEFAULT_SOURCE_COSTS
} from '../types/OrchestrationTypes';

export abstract class OrchestrationCore {
  protected cacheService: CacheService;
  protected logger: Logger;
  protected serpAPIService: SerpAPIService;
  protected config: OrchestrationConfig;

  constructor(
    cacheService: CacheService,
    logger: Logger,
    serpAPIService: SerpAPIService,
    config?: Partial<OrchestrationConfig>
  ) {
    this.cacheService = cacheService;
    this.logger = logger;
    this.serpAPIService = serpAPIService;
    
    // Enhanced parallel execution configuration
    this.config = {
      maxParallelSources: 5, // Increased from 3 for better performance
      defaultTimeout: 30000, // 30 seconds
      retryAttempts: 2,
      cacheEnabled: true,
      qualityThreshold: 70,
      costOptimizationEnabled: true,
      redundancyOptimizationEnabled: true,
      ...config
    };
  }

  /**
   * Generate cache key for consistent caching across orchestration
   */
  protected generateCacheKey(source: SourceType, companyName: string): string {
    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `orchestration_${source}_${cleanName}`;
  }

  /**
   * Get cost for a specific source
   */
  protected getSourceCost(source: SourceType): number {
    return DEFAULT_SOURCE_COSTS[source] || 1.0;
  }

  /**
   * Get estimated duration for a source collection
   */
  protected getEstimatedDuration(source: SourceType): number {
    const durations: Record<SourceType, number> = {
      serp_organic: 2000,
      serp_news: 2000,
      serp_jobs: 2000,
      serp_linkedin: 2500,
      serp_youtube: 2000,
      serp_api: 2000,
      brightdata: 5000,
      bright_data: 5000,
      snov_contacts: 3000,
      apollo_contacts: 3000,
      apollo: 3000,
      zoominfo: 4000,
      clearbit: 3500,
      hunter: 2500,
      company_db: 1500,
    };
    return durations[source] || 3000;
  }

  /**
   * Get cache type for a specific source
   */
  protected getCacheTypeForSource(source: SourceType): CacheType {
    const cacheTypeMap: Record<SourceType, CacheType> = {
      serp_organic: CacheType.SERP_ORGANIC_RAW,
      serp_news: CacheType.SERP_NEWS_RAW,
      serp_jobs: CacheType.SERP_JOBS_RAW,
      serp_linkedin: CacheType.SERP_LINKEDIN_RAW,
      serp_youtube: CacheType.SERP_YOUTUBE_RAW,
      serp_api: CacheType.SERP_API_RAW_RESPONSE,
      bright_data: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      snov_contacts: CacheType.SNOV_CONTACTS_RAW,
      apollo_contacts: CacheType.APOLLO_CONTACT_ENRICHMENT,
      apollo: CacheType.APOLLO_CONTACT_ENRICHMENT,
      zoominfo: CacheType.ZOOMINFO_CONTACT_ENRICHMENT,
      clearbit: CacheType.CLEARBIT_COMPANY_ENRICHMENT,
      hunter: CacheType.HUNTER_EMAIL_ENRICHMENT,
      company_db: CacheType.COMPANY_DATABASE_ENRICHMENT,
    };
    return cacheTypeMap[source] || CacheType.UNKNOWN;
  }

  /**
   * Get API endpoint for a specific source
   */
  protected getEndpointForSource(source: SourceType): string {
    const endpoints: Record<SourceType, string> = {
      serp_organic: '/api/serp/organic',
      serp_news: '/api/serp/news',
      serp_jobs: '/api/serp/jobs',
      serp_linkedin: '/api/serp/linkedin',
      serp_youtube: '/api/serp/youtube',
      serp_api: '/api/serp',
      bright_data: '/api/brightdata',
      brightdata: '/api/brightdata',
      snov_contacts: '/api/snov',
      apollo_contacts: '/api/apollo',
      apollo: '/api/apollo',
      zoominfo: '/api/zoominfo',
      clearbit: '/api/clearbit',
      hunter: '/api/hunter',
      company_db: '/api/company-db',
    };
    return endpoints[source] || '/api/unknown';
  }

  /**
   * Check if cached data is expired based on source configuration
   */
  protected isExpired(cached: any, maxAgeHours: number): boolean {
    if (!cached || !cached.timestamp) {
      return true;
    }

    const cachedTime = new Date(cached.timestamp);
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
    const now = new Date();

    return (now.getTime() - cachedTime.getTime()) > maxAge;
  }

  /**
   * Validate cost limits for orchestration operations
   */
  protected validateCostLimits(estimatedCost: number, maxCost: number): void {
    if (estimatedCost > maxCost) {
      throw new Error(`Estimated cost ($${estimatedCost}) exceeds maximum allowed cost ($${maxCost})`);
    }
  }

  /**
   * Calculate data quality score based on completeness and source reliability
   */
  protected calculateDataQuality(data: MultiSourceData, primarySource: SourceType): number {
    const reliabilityScores: Record<SourceType, number> = {
      serp_organic: 85,
      serp_news: 75,
      serp_jobs: 70,
      serp_linkedin: 90,
      serp_youtube: 60,
      serp_api: 85,
      bright_data: 90,
      brightdata: 90,
      snov_contacts: 80,
      apollo_contacts: 85,
      apollo: 85,
      zoominfo: 88,
      clearbit: 82,
      hunter: 78,
      company_db: 75,
    };

    const baseScore = reliabilityScores[primarySource] || 70;
    
    // Additional quality factors could be calculated here
    let qualityScore = baseScore;
    
    // Adjust based on data completeness
    const sourceCount = Object.keys(data).length;
    if (sourceCount > 1) {
      qualityScore += 5; // Bonus for multiple sources
    }
    
    return Math.min(100, qualityScore);
  }

  /**
   * Calculate completeness score based on data fields
   */
  private calculateCompleteness(data: any): number {
    if (!data) return 0;

    const expectedFields = [
      'companyName', 'industry', 'description', 'website',
      'employees', 'revenue', 'location', 'founded'
    ];

    const presentFields = expectedFields.filter(field => 
      data[field] && data[field] !== '' && data[field] !== null
    );

    return Math.round((presentFields.length / expectedFields.length) * 100);
  }

  /**
   * Get reliability score for a specific source
   */
  private getSourceReliability(source: SourceType): number {
    const reliabilityScores: Record<SourceType, number> = {
      serp_organic: 85,
      serp_news: 75,
      serp_jobs: 70,
      serp_linkedin: 90,
      serp_youtube: 60,
      serp_api: 85,
      bright_data: 90,
      brightdata: 90,
      snov_contacts: 80,
      apollo_contacts: 85,
      apollo: 88,
      zoominfo: 92,
      clearbit: 87,
      hunter: 83,
      company_db: 80,
    };
    return reliabilityScores[source] || 75;
  }

  /**
   * Check health of orchestration system
   */
  async checkOrchestrationHealth(): Promise<OrchestrationHealth> {
    const sources: SourceType[] = ['serp_api', 'bright_data', 'apollo', 'zoominfo', 'clearbit', 'hunter', 'company_db'];
    const sourceAvailability: SourceAvailability[] = [];

    for (const source of sources) {
      try {
        const startTime = Date.now();
        // Simple health check - could be enhanced with actual API calls
        const available = await this.checkSourceAvailability(source);
        const responseTime = Date.now() - startTime;

        sourceAvailability.push({
          source,
          available,
          responseTime,
          lastChecked: new Date().toISOString(),
          errorRate: 0, // Would be calculated from historical data
        });
      } catch (error) {
        sourceAvailability.push({
          source,
          available: false,
          lastChecked: new Date().toISOString(),
          errorRate: 100,
        });
      }
    }

    const healthySources = sourceAvailability.filter(s => s.available).length;
    const totalSources = sourceAvailability.length;
    const healthRatio = healthySources / totalSources;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthRatio >= 0.8) overall = 'healthy';
    else if (healthRatio >= 0.5) overall = 'degraded';
    else overall = 'unhealthy';

    return {
      isHealthy: overall === 'healthy',
      components: {
        cache: true, // Would check cache service health
        serpAPI: true, // Would check SerpAPI service health
        dataCollection: true, // Would check data collection health
      },
      lastCheck: new Date().toISOString(),
      overall: overall === 'healthy',
    };
  }

  /**
   * Check if a specific source is available
   */
  private async checkSourceAvailability(_source: SourceType): Promise<boolean> {
    // This would implement actual health checks for each source
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Generate health recommendations based on source availability
   */
  private generateHealthRecommendations(sources: SourceAvailability[]): string[] {
    const recommendations: string[] = [];
    
    const unavailableSources = sources.filter(s => !s.available);
    if (unavailableSources.length > 0) {
      recommendations.push(`${unavailableSources.length} sources are unavailable. Consider using fallback sources.`);
    }

    const slowSources = sources.filter(s => s.responseTime && s.responseTime > 5000);
    if (slowSources.length > 0) {
      recommendations.push(`${slowSources.length} sources have slow response times. Consider reducing parallelism.`);
    }

    return recommendations;
  }

  /**
   * Sleep utility for rate limiting
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry mechanism for failed operations
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts || 2,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt <= maxRetries) {
          this.logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
            error: lastError.message,
            delay,
          });
          await this.sleep(delay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }
} 