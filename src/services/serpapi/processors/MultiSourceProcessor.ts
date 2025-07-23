import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { GoogleSearchEngine } from '../engines/GoogleSearchEngine';
import { NewsSearchEngine } from '../engines/NewsSearchEngine';
import { JobsSearchEngine } from '../engines/JobsSearchEngine';
import { LinkedInSearchEngine } from '../engines/LinkedInSearchEngine';
import { YouTubeSearchEngine } from '../engines/YouTubeSearchEngine';
import { 
  SerpAPIMultiSourceResponse, 
  SerpAPIConfig,
  CacheOptions 
} from '../types/SerpAPITypes';

export class MultiSourceProcessor {
  private googleEngine: GoogleSearchEngine;
  private newsEngine: NewsSearchEngine;
  private jobsEngine: JobsSearchEngine;
  private linkedInEngine: LinkedInSearchEngine;
  private youTubeEngine: YouTubeSearchEngine;
  private logger: Logger;

  constructor(cacheService: CacheService, logger: Logger, config?: Partial<SerpAPIConfig>) {
    this.logger = logger;
    this.googleEngine = new GoogleSearchEngine(cacheService, logger, config);
    this.newsEngine = new NewsSearchEngine(cacheService, logger, config);
    this.jobsEngine = new JobsSearchEngine(cacheService, logger, config);
    this.linkedInEngine = new LinkedInSearchEngine(cacheService, logger, config);
    this.youTubeEngine = new YouTubeSearchEngine(cacheService, logger, config);
  }

  /**
   * Get comprehensive multi-source data for a company with enhanced parallel execution
   */
  async getMultiSourceCompanyData(
    companyName: string, 
    options: CacheOptions = {}
  ): Promise<SerpAPIMultiSourceResponse> {
    this.logger.info('Starting enhanced multi-source data collection', { companyName });

    const startTime = Date.now();
    let apiCalls = 0;

    // Initialize response structure
    const response: SerpAPIMultiSourceResponse = {
      companyName,
      cached: {
        organic: false,
        news: false,
        jobs: false,
        linkedin: false,
        youtube: false
      },
      sources: [],
      organic: {},
      news: [],
      jobs: [],
      linkedin: [],
      youtube: [],
      apiCalls: 0,
      timing: {
        total: 0,
        parallel: 0,
        cache: 0
      },
      costEstimate: '$0.00'
    };

    try {
      // ENHANCED: Execute all sources in parallel with aggressive optimization
      this.logger.debug('Executing parallel SerpAPI collection', { 
        companyName,
        engines: ['google', 'news', 'jobs', 'linkedin', 'youtube']
      });

      const parallelStart = Date.now();

      // Execute all engines simultaneously for maximum speed
      const [organicResults, newsResults, jobsResults, linkedInResults, youTubeResults] = 
        await Promise.allSettled([
          this.googleEngine.getOrganicResults(companyName, options),
          this.newsEngine.getNewsResults(companyName, options),
          this.jobsEngine.getJobsResults(companyName, options),
          this.linkedInEngine.getLinkedInResults(companyName, options),
          this.youTubeEngine.getYouTubeResults(companyName, options)
        ]);

      const parallelDuration = Date.now() - parallelStart;
      if (response.timing) {
        response.timing.parallel = parallelDuration;
      }

      // ENHANCED: Process results with detailed cost tracking
      let totalCost = 0;

      // Process organic results (special case - has cached info from base engine)
      if (organicResults.status === 'fulfilled') {
        response.organic = organicResults.value || {};
        response.cached.organic = false; // Assume API call for now
        apiCalls++;
        totalCost += 0.02; // Organic search cost
        response.sources.push('google_organic');
      } else {
        this.logger.error('Failed to fetch organic results', { error: organicResults.reason });
      }

      // Process news results
      if (newsResults.status === 'fulfilled') {
        response.news = newsResults.value || [];
        response.cached.news = false; // Assume API call for now  
        apiCalls++;
        totalCost += 0.02; // News search cost
        response.sources.push('google_news');
      } else {
        this.logger.error('Failed to fetch news results', { error: newsResults.reason });
      }

      // Process job results  
      if (jobsResults.status === 'fulfilled') {
        response.jobs = jobsResults.value || [];
        response.cached.jobs = false; // Assume API call for now
        apiCalls++;
        totalCost += 0.02; // Jobs search cost
        response.sources.push('google_jobs');
      } else {
        this.logger.error('Failed to fetch job results', { error: jobsResults.reason });
      }

      // Process LinkedIn results
      if (linkedInResults.status === 'fulfilled') {
        response.linkedin = linkedInResults.value || [];
        response.cached.linkedin = false; // Assume API call for now
        apiCalls++;
        totalCost += 0.03; // LinkedIn search cost (slightly higher)
        response.sources.push('linkedin');
      } else {
        this.logger.error('Failed to fetch LinkedIn results', { error: linkedInResults.reason });
      }

      // Process YouTube results
      if (youTubeResults.status === 'fulfilled') {
        response.youtube = youTubeResults.value || [];
        response.cached.youtube = false; // Assume API call for now
        apiCalls++;
        totalCost += 0.02; // YouTube search cost
        response.sources.push('youtube');
      } else {
        this.logger.error('Failed to fetch YouTube results', { error: youTubeResults.reason });
      }

      response.apiCalls = apiCalls;
      response.costEstimate = `$${totalCost.toFixed(3)}`;

      const totalDuration = Date.now() - startTime;
      if (response.timing) {
        response.timing.total = totalDuration;
      }

      this.logger.info('Enhanced multi-source data collection completed', {
        companyName,
        totalDuration,
        parallelDuration,
        apiCalls,
        sources: response.sources.length,
        cacheHits: Object.values(response.cached).filter(Boolean).length,
        costEstimate: response.costEstimate,
        efficiency: `${Math.round((parallelDuration / totalDuration) * 100)}% parallel execution`
      });

      return response;
    } catch (error) {
      this.logger.error('Enhanced multi-source data collection failed', {
        companyName,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  /**
   * Get organic results with cache tracking
   */
  private async getOrganicResultsCached(
    companyName: string, 
    options: CacheOptions
  ): Promise<{ data: any; cached: boolean }> {
    const beforeCount = await this.getRequestCount();
    const data = await this.googleEngine.getOrganicResults(companyName, options);
    const afterCount = await this.getRequestCount();
    
    return {
      data,
      cached: beforeCount === afterCount,
    };
  }

  /**
   * Get news results with cache tracking
   */
  private async getNewsResultsCached(
    companyName: string, 
    options: CacheOptions
  ): Promise<{ data: any; cached: boolean }> {
    const beforeCount = await this.getRequestCount();
    const data = await this.newsEngine.getNewsResults(companyName, options);
    const afterCount = await this.getRequestCount();
    
    return {
      data,
      cached: beforeCount === afterCount,
    };
  }

  /**
   * Get job results with cache tracking
   */
  private async getJobsResultsCached(
    companyName: string, 
    options: CacheOptions
  ): Promise<{ data: any; cached: boolean }> {
    const beforeCount = await this.getRequestCount();
    const data = await this.jobsEngine.getJobsResults(companyName, options);
    const afterCount = await this.getRequestCount();
    
    return {
      data,
      cached: beforeCount === afterCount,
    };
  }

  /**
   * Get LinkedIn results with cache tracking
   */
  private async getLinkedInResultsCached(
    companyName: string, 
    options: CacheOptions
  ): Promise<{ data: any; cached: boolean }> {
    const beforeCount = await this.getRequestCount();
    const data = await this.linkedInEngine.getLinkedInResults(companyName, options);
    const afterCount = await this.getRequestCount();
    
    return {
      data,
      cached: beforeCount === afterCount,
    };
  }

  /**
   * Get YouTube results with cache tracking
   */
  private async getYouTubeResultsCached(
    companyName: string, 
    options: CacheOptions
  ): Promise<{ data: any; cached: boolean }> {
    const beforeCount = await this.getRequestCount();
    const data = await this.youTubeEngine.getYouTubeResults(companyName, options);
    const afterCount = await this.getRequestCount();
    
    return {
      data,
      cached: beforeCount === afterCount,
    };
  }

  /**
   * Simple request counter (placeholder - could be enhanced with actual tracking)
   */
  private async getRequestCount(): Promise<number> {
    // This is a simplified implementation
    // In a real system, you might track API request counts in a more sophisticated way
    return Date.now();
  }

  /**
   * Get selective multi-source data (only specified sources)
   */
  async getSelectiveMultiSourceData(
    companyName: string,
    sources: ('organic' | 'news' | 'jobs' | 'linkedin' | 'youtube')[],
    options: CacheOptions = {}
  ): Promise<Partial<SerpAPIMultiSourceResponse>> {
    this.logger.info('Starting selective multi-source data collection', { companyName, sources });

    const response: Partial<SerpAPIMultiSourceResponse> = {
      companyName,
      cached: {} as any,
      apiCalls: 0,
      sources: [],
    };

    let apiCalls = 0;

    const promises = [];

    if (sources.includes('organic')) {
      promises.push(
        this.getOrganicResultsCached(companyName, options).then(result => ({
          type: 'organic' as const,
          ...result,
        }))
      );
    }

    if (sources.includes('news')) {
      promises.push(
        this.getNewsResultsCached(companyName, options).then(result => ({
          type: 'news' as const,
          ...result,
        }))
      );
    }

    if (sources.includes('jobs')) {
      promises.push(
        this.getJobsResultsCached(companyName, options).then(result => ({
          type: 'jobs' as const,
          ...result,
        }))
      );
    }

    if (sources.includes('linkedin')) {
      promises.push(
        this.getLinkedInResultsCached(companyName, options).then(result => ({
          type: 'linkedin' as const,
          ...result,
        }))
      );
    }

    if (sources.includes('youtube')) {
      promises.push(
        this.getYouTubeResultsCached(companyName, options).then(result => ({
          type: 'youtube' as const,
          ...result,
        }))
      );
    }

    const results = await Promise.allSettled(promises);

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { type, data, cached } = result.value;
        (response as any)[type] = data;
        (response.cached as any)[type] = cached;
        if (!cached) apiCalls++;
        response.sources?.push(type);
      }
    });

    response.apiCalls = apiCalls;

    return response;
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
    const [overview, recentNews, hiringTrends, keyContacts, contentPresence] = await Promise.allSettled([
      this.googleEngine.getOrganicResults(companyName),
      this.newsEngine.getRecentNews(companyName, 30),
      this.jobsEngine.getHiringTrends(companyName),
      this.linkedInEngine.getExecutives(companyName),
      this.youTubeEngine.getYouTubeAnalytics(companyName),
    ]);

    return {
      overview: overview.status === 'fulfilled' ? overview.value : null,
      recentNews: recentNews.status === 'fulfilled' ? recentNews.value : [],
      hiringTrends: hiringTrends.status === 'fulfilled' ? hiringTrends.value : {},
      keyContacts: keyContacts.status === 'fulfilled' ? keyContacts.value : [],
      contentPresence: contentPresence.status === 'fulfilled' ? contentPresence.value : {},
    };
  }
} 