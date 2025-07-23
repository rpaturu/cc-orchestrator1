import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { CacheType } from '../../../types/cache-types';
import { SerpAPICore } from '../core/SerpAPICore';
import { 
  SerpAPIYouTubeResult, 
  SerpAPIConfig, 
  CacheOptions 
} from '../types/SerpAPITypes';

export class YouTubeSearchEngine extends SerpAPICore {
  constructor(cacheService: CacheService, logger: Logger, config?: Partial<SerpAPIConfig>) {
    super(cacheService, logger, config);
  }

  /**
   * Get YouTube results for a company with caching
   */
  async getYouTubeResults(companyName: string, options: CacheOptions = {}): Promise<SerpAPIYouTubeResult[]> {
    const cacheKey = this.generateCacheKey(companyName, 'youtube');
    
    return this.getCachedOrFetch(
      cacheKey,
      CacheType.SERP_API_YOUTUBE_RESULTS,
      () => this.fetchYouTubeResults(companyName),
      options
    );
  }

  /**
   * Fetch YouTube results from SerpAPI
   */
  private async fetchYouTubeResults(companyName: string): Promise<SerpAPIYouTubeResult[]> {
    this.validateConfig();
    
    try {
      const params = this.buildSearchParams(`"${companyName}"`, {
        engine: 'youtube',
        num: 10,
      });

      const response = await this.makeRequest(params);
      
      if (!response.video_results) {
        this.logger.warn('No YouTube results found', { companyName });
        return [];
      }

      return this.processYouTubeResults(response.video_results);
    } catch (error) {
      this.logger.error('Failed to fetch YouTube results', { 
        companyName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Process raw SerpAPI results into structured YouTube results
   */
  private processYouTubeResults(videoResults: any[]): SerpAPIYouTubeResult[] {
    return videoResults
      .filter(video => video.title && video.link)
      .map(video => ({
        title: video.title,
        link: video.link,
        channel: video.channel?.name || '',
        duration: video.duration,
        views: video.views,
        published: video.published_date,
        thumbnail: video.thumbnail?.static,
        snippet: video.snippet || '',
      }))
      .slice(0, 10); // Limit to 10 results
  }

  /**
   * Search for company promotional content
   */
  async getPromotionalContent(companyName: string): Promise<SerpAPIYouTubeResult[]> {
    const query = `"${companyName}" (commercial OR advertisement OR promo OR campaign)`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'youtube',
        num: 10,
      });

      const response = await this.makeRequest(params);
      return this.processYouTubeResults(response.video_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch promotional content', { 
        companyName,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Search for product demos and tutorials
   */
  async getProductContent(companyName: string): Promise<SerpAPIYouTubeResult[]> {
    const query = `"${companyName}" (demo OR tutorial OR how-to OR review OR unboxing)`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'youtube',
        num: 10,
      });

      const response = await this.makeRequest(params);
      return this.processYouTubeResults(response.video_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch product content', { 
        companyName,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Search for company events and presentations
   */
  async getCompanyEvents(companyName: string): Promise<SerpAPIYouTubeResult[]> {
    const query = `"${companyName}" (conference OR presentation OR keynote OR webinar OR earnings)`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'youtube',
        num: 10,
      });

      const response = await this.makeRequest(params);
      return this.processYouTubeResults(response.video_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch company events', { 
        companyName,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Search for recent videos (last 30 days)
   */
  async getRecentVideos(companyName: string): Promise<SerpAPIYouTubeResult[]> {
    try {
      const params = this.buildSearchParams(`"${companyName}"`, {
        engine: 'youtube',
        num: 10,
        sp: 'EgIIAg%253D%253D', // Filter for videos uploaded in the last month
      });

      const response = await this.makeRequest(params);
      return this.processYouTubeResults(response.video_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch recent videos', { 
        companyName,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Get YouTube analytics for a company
   */
  async getYouTubeAnalytics(companyName: string): Promise<{
    totalVideos: number;
    totalViews: number;
    averageViews: number;
    contentTypes: Record<string, number>;
    channels: Record<string, number>;
    recentActivity: SerpAPIYouTubeResult[];
  }> {
    const videos = await this.getYouTubeResults(companyName);
    
    const analytics = {
      totalVideos: videos.length,
      totalViews: 0,
      averageViews: 0,
      contentTypes: {} as Record<string, number>,
      channels: {} as Record<string, number>,
      recentActivity: [] as SerpAPIYouTubeResult[],
    };

    videos.forEach(video => {
      // Parse view count
      const viewCount = this.parseViewCount(video.views || '0');
      analytics.totalViews += viewCount;

      // Analyze content type
      const contentType = this.analyzeContentType(video.title);
      analytics.contentTypes[contentType] = (analytics.contentTypes[contentType] || 0) + 1;

      // Count by channel
      if (video.channel) {
        analytics.channels[video.channel] = (analytics.channels[video.channel] || 0) + 1;
      }
    });

    analytics.averageViews = videos.length > 0 ? Math.round(analytics.totalViews / videos.length) : 0;
    analytics.recentActivity = await this.getRecentVideos(companyName);

    return analytics;
  }

  /**
   * Parse view count string to number
   */
  private parseViewCount(viewsString: string): number {
    const cleanViews = viewsString.replace(/[^\d.KMB]/gi, '').toLowerCase();
    
    if (cleanViews.includes('k')) {
      return Math.round(parseFloat(cleanViews) * 1000);
    }
    if (cleanViews.includes('m')) {
      return Math.round(parseFloat(cleanViews) * 1000000);
    }
    if (cleanViews.includes('b')) {
      return Math.round(parseFloat(cleanViews) * 1000000000);
    }
    
    return parseInt(cleanViews) || 0;
  }

  /**
   * Analyze content type from video title
   */
  private analyzeContentType(title: string): string {
    const titleLower = title.toLowerCase();
    
    const contentTypes = {
      'tutorial': ['tutorial', 'how-to', 'guide', 'learn', 'training'],
      'demo': ['demo', 'demonstration', 'showcase', 'walkthrough'],
      'review': ['review', 'unboxing', 'test', 'comparison'],
      'promotional': ['commercial', 'ad', 'advertisement', 'promo'],
      'event': ['conference', 'keynote', 'presentation', 'webinar'],
      'interview': ['interview', 'ceo', 'founder', 'executive'],
      'news': ['news', 'announcement', 'launch', 'release'],
    };

    for (const [type, keywords] of Object.entries(contentTypes)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return type;
      }
    }

    return 'other';
  }

  /**
   * Search for competitor content mentioning the company
   */
  async getCompetitorMentions(companyName: string): Promise<SerpAPIYouTubeResult[]> {
    const query = `"${companyName}" (vs OR versus OR compared OR comparison OR alternative)`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'youtube',
        num: 15,
      });

      const response = await this.makeRequest(params);
      return this.processYouTubeResults(response.video_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch competitor mentions', { 
        companyName,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }
} 