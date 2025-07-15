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

    await this.cacheResult(cacheKey, cacheData, { domain, endpoint: 'discovery' });

    const totalTime = Date.now() - startTime;
    this.logger.info('Discovery insights completed', { 
      domain, 
      totalTime, 
      sourcesFound: sources.length 
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
} 