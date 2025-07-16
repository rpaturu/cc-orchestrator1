/**
 * Discovery Handler
 * 
 * Handles discovery-focused insights with enhanced response structure.
 * Provides medium-speed processing for initial sales research and preparation.
 */

import { BaseEndpointHandler } from './BaseEndpointHandler';
import { DiscoveryResponseFormatter, DiscoveryResponse } from '../formatters/DiscoveryResponseFormatter';
import { SearchQueryBuilder } from '../search/SearchQueryBuilder';
import { ContentFetcher } from '../content/ContentFetcher';
import { AIAnalyzer } from '../analysis/AIAnalyzer';
import { SearchEngine } from '../search/SearchEngine';
import { SearchEngineResponse } from '@/types';

export class DiscoveryHandler extends BaseEndpointHandler {
  private readonly contentFetcher: ContentFetcher;
  private readonly aiAnalyzer: AIAnalyzer;
  private readonly searchEngine: SearchEngine;
  private readonly maxResultsPerQuery: number;

  constructor(
    contentFetcher: ContentFetcher,
    aiAnalyzer: AIAnalyzer,
    searchEngine: SearchEngine,
    maxResultsPerQuery: number,
    cache: any,
    logger: any,
    contentFilter: any
  ) {
    super(cache, logger, contentFilter);
    this.contentFetcher = contentFetcher;
    this.aiAnalyzer = aiAnalyzer;
    this.searchEngine = searchEngine;
    this.maxResultsPerQuery = maxResultsPerQuery;
  }

  /**
   * Get discovery-focused insights with enhanced response structure
   */
  async getDiscoveryInsights(domain: string): Promise<DiscoveryResponse> {
    const startTime = Date.now();
    const companyName = this.extractCompanyName(domain);
    const cacheKey = this.generateCacheKey(domain, 'discovery', 'discovery_insights');
    
    this.logger.info('Getting discovery insights', { 
      domain, 
      companyName,
      cacheKey
    });

    // Check cache first
    const cachedResult = await this.checkCache(cacheKey, { domain, endpoint: 'discovery' });
    if (cachedResult) {
      return DiscoveryResponseFormatter.formatResponse(
        cachedResult.insights, 
        cachedResult.sources, 
        cachedResult.confidenceScore
      );
    }

    // Generate and execute discovery queries
    const queries = SearchQueryBuilder.buildDiscoveryQueries(companyName);
    this.logger.info('Generated discovery queries', { queries });

    const searchResponses = await this.executeBatchedSearches(queries);
    
    // Fetch and filter content
    const { filteredResults, filteredUrls, sources, allSearchResults } = await this.fetchAndFilterContent(
      searchResponses, 
      companyName
    );

    // Extract discovery insights using AI
    const content = filteredResults.filter(r => r.content !== null).map(r => r.content!);
    const insights = await this.aiAnalyzer.analyzeForSalesContext(
      content,
      sources,
      companyName,
      'discovery'
    );

    // Create and cache result
    const confidenceScore = this.calculateConfidenceScore(content.length, sources.length);
    const cacheData = {
      insights,
      sources,
      confidenceScore,
      generatedAt: new Date(),
      cacheKey,
      totalSources: sources.length,
      citationMap: {}
    };

    // Only cache successful analysis results, not failures
    if (this.isAnalysisSuccessful(insights)) {
      await this.cacheResult(cacheKey, cacheData, { domain, endpoint: 'discovery' });
      this.logger.info('Cached successful discovery result', { domain, cacheKey });
    } else {
      this.logger.warn('Discovery analysis failed - not caching result to allow retry', { 
        domain, 
        cacheKey,
        failureIndicators: this.getFailureIndicators(insights)
      });
    }

    const totalTime = Date.now() - startTime;
    this.logger.info('Discovery insights completed', { 
      domain, 
      totalTime, 
      sourcesFound: sources.length,
      analysisSuccessful: this.isAnalysisSuccessful(insights)
    });

    return DiscoveryResponseFormatter.formatResponse(insights, sources, confidenceScore);
  }

  /**
   * Execute searches sequentially for discovery queries
   */
  private async executeBatchedSearches(queries: string[]): Promise<SearchEngineResponse[]> {
    const results: SearchEngineResponse[] = [];
    
    this.logger.info('Executing discovery searches', { 
      totalQueries: queries.length, 
      resultsPerQuery: this.maxResultsPerQuery 
    });

    for (const query of queries) {
      const result = await this.searchEngine.search(query, this.maxResultsPerQuery, true);
      results.push(result);
    }

    const successfulSearches = results.filter(r => r.results.length > 0).length;
    this.logger.info('Discovery searches completed', { 
      totalQueries: queries.length,
      successfulSearches,
      failedSearches: queries.length - successfulSearches
    });

    return results;
  }

  /**
   * Fetch and filter content for discovery insights
   */
  private async fetchAndFilterContent(
    searchResponses: SearchEngineResponse[],
    companyName: string
  ): Promise<{
    filteredResults: any[];
    filteredUrls: string[];
    sources: any[];
    allSearchResults: any[];
  }> {
    // Extract URLs (limit to 5 per query for medium-speed processing)
    const allUrls = searchResponses.flatMap(response => 
      response.results.slice(0, 5).map(result => result.url)
    );
    const uniqueUrls = [...new Set(allUrls)];
    
    this.logger.info('Fetching content for discovery', { urlCount: uniqueUrls.length });

    // Fetch content
    const fetchResults = await this.contentFetcher.fetchBatch(uniqueUrls);

    // Apply relevancy filtering (medium threshold for discovery)
    const allSearchResults = searchResponses.flatMap(response => response.results);
    const { filteredResults, filteredUrls, relevancyScores } = this.contentFilter.filterByRelevancy(
      fetchResults,
      uniqueUrls,
      allSearchResults,
      companyName,
      0.25 // Medium threshold for discovery insights
    );

    // Create sources
    const sources = this.createAuthoritativeSources(
      filteredResults, 
      filteredUrls, 
      allSearchResults, 
      relevancyScores
    );

    return {
      filteredResults,
      filteredUrls,
      sources,
      allSearchResults
    };
  }

  /**
   * Check if analysis was successful by looking for failure indicators
   */
  private isAnalysisSuccessful(insights: any): boolean {
    // Check for common failure indicators
    const failureMessages = [
      'Analysis failed - please try again',
      'Unknown',
      'Not available'
    ];

    // Check pain points for failure messages
    if (insights.painPoints?.some((point: any) => 
      failureMessages.some(msg => point.text?.includes(msg)))) {
      return false;
    }

    // Check talking points for failure messages
    if (insights.talkingPoints?.some((point: any) => 
      failureMessages.some(msg => point.text?.includes(msg)))) {
      return false;
    }

    // Check recommended actions for failure messages
    if (insights.recommendedActions?.some((action: any) => 
      failureMessages.some(msg => action.text?.includes(msg)))) {
      return false;
    }

    // Check if deal probability is 0 (indicates failure)
    if (insights.dealProbability === 0) {
      return false;
    }

    // Check if company overview has all unknown values
    if (insights.companyOverview?.name === 'Unknown' && 
        insights.companyOverview?.industry === 'Unknown' && 
        insights.companyOverview?.size === 'Unknown') {
      return false;
    }

    return true;
  }

  /**
   * Get failure indicators for logging
   */
  private getFailureIndicators(insights: any): string[] {
    const indicators: string[] = [];
    
    if (insights.painPoints?.some((point: any) => point.text?.includes('Analysis failed'))) {
      indicators.push('pain_points_failed');
    }
    
    if (insights.talkingPoints?.some((point: any) => point.text?.includes('Analysis failed'))) {
      indicators.push('talking_points_failed');
    }
    
    if (insights.recommendedActions?.some((action: any) => action.text?.includes('Analysis failed'))) {
      indicators.push('recommended_actions_failed');
    }
    
    if (insights.dealProbability === 0) {
      indicators.push('zero_deal_probability');
    }
    
    if (insights.companyOverview?.name === 'Unknown') {
      indicators.push('unknown_company_data');
    }
    
    return indicators;
  }
} 