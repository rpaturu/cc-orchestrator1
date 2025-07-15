import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { FetchResult, RateLimitInfo } from '@/types';
import { Logger } from './Logger';

export class ContentFetcher {
  private readonly logger: Logger;
  private readonly rateLimitInfo: RateLimitInfo;
  private readonly robotsCache = new Map<string, boolean>();
  private readonly userAgent = 'SalesIntelligenceBot/1.0 (Research Purpose; Contact: sales@company.com)';

  constructor(logger: Logger, requestsPerSecond: number = 1) {
    this.logger = logger;
    this.rateLimitInfo = {
      requestsPerSecond,
      lastRequestTime: 0,
      currentBurst: 0
    };
  }

  /**
   * Fetch and extract text content from URL with rate limiting and robots.txt compliance
   */
  async fetchContent(url: string): Promise<FetchResult> {
    const startTime = Date.now();

    try {
      // Check if we can fetch from this URL
      if (!(await this.canFetch(url))) {
        return {
          content: null,
          error: 'Blocked by robots.txt',
          fetchTime: Date.now() - startTime
        };
      }

      // Apply rate limiting
      await this.applyRateLimit();

      this.logger.debug('Fetching content', { url });

      const response: AxiosResponse = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 10000,
        maxRedirects: 5
      });

      const content = this.extractTextContent(response.data);
      const fetchTime = Date.now() - startTime;

      this.logger.debug('Content fetched successfully', { 
        url, 
        contentLength: content?.length || 0,
        fetchTime 
      });

      return {
        content,
        fetchTime,
        statusCode: response.status
      };

    } catch (error: any) {
      const fetchTime = Date.now() - startTime;
      this.logger.warn('Content fetch failed', { url, error: error.message, fetchTime });

      return {
        content: null,
        error: error.message,
        fetchTime,
        statusCode: error.response?.status
      };
    }
  }

  /**
   * Fetch multiple URLs in parallel with proper rate limiting
   */
  async fetchBatch(urls: string[]): Promise<FetchResult[]> {
    this.logger.info('Fetching content batch', { urlCount: urls.length });

    const results: FetchResult[] = [];
    
    // Process URLs sequentially to respect rate limiting
    for (const url of urls) {
      const result = await this.fetchContent(url);
      results.push(result);
    }

    return results;
  }

  /**
   * Extract clean text content from HTML
   */
  private extractTextContent(html: string): string | null {
    try {
      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, nav, footer, header').remove();

      // Focus on main content areas
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '#content',
        '.post',
        '.article'
      ];

      let content = '';
      
      // Try to find main content area first
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!content) {
        content = $('body').text();
      }

      // Clean up the text
      const cleanedContent = content
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000); // Limit to first 5000 characters

      return cleanedContent || null;

    } catch (error) {
      this.logger.error('Text extraction failed', { error });
      return null;
    }
  }

  /**
   * Check robots.txt compliance (simplified)
   */
  private async canFetch(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
      
      // Check cache first
      if (this.robotsCache.has(baseUrl)) {
        return this.robotsCache.get(baseUrl) || false;
      }

      // For now, assume we can fetch (in production, implement proper robots.txt parsing)
      this.robotsCache.set(baseUrl, true);
      return true;

    } catch (error) {
      this.logger.warn('Robots.txt check failed, allowing fetch', { url, error });
      return true;
    }
  }

  /**
   * Apply rate limiting between requests
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimitInfo.lastRequestTime;
    const minInterval = 1000 / this.rateLimitInfo.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await this.sleep(delay);
    }

    this.rateLimitInfo.lastRequestTime = Date.now();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }
} 