/**
 * Overview Handler
 * 
 * Handles comprehensive company overview generation with snippet-first approach.
 * Provides fast but comprehensive overview for initial company research.
 */

import { BaseEndpointHandler } from '../base/BaseEndpointHandler';
import { OverviewResponseFormatter, OverviewResponse } from '../../formatters/OverviewResponseFormatter';
import { ContentFetcher } from '../../content/ContentFetcher';
import { AIAnalyzer } from '../../analysis/AIAnalyzer';
import { SearchEngine } from '../../search/SearchEngine';
import { SearchQueryBuilder } from '../../search/SearchQueryBuilder';
import { SourceAnalyzer } from '../../analysis/SourceAnalyzer';
import { AuthoritativeSource } from '@/types';
import { CacheType } from '@/types/cache-types';

export class OverviewHandler extends BaseEndpointHandler {
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
   * Get comprehensive company overview
   */
  async getCompanyOverview(domain: string): Promise<OverviewResponse> {
    const startTime = Date.now();
    const companyName = this.extractCompanyName(domain);
    
    // Generate cache key for overview
    const cacheKey = this.generateCacheKey(
      domain,
      'overview' as any,
      'comprehensive_overview'
    );
    
    this.logger.info('Getting comprehensive company overview', { 
      domain, 
      companyName,
      cacheKey
    });

    // Check cache first
    const cachedResult = await this.cache.get(cacheKey);
    if (cachedResult) {
      this.logger.info('Returning cached company overview', { 
        domain, 
        cacheKey,
        cachedAt: cachedResult.generatedAt 
      });
      return OverviewResponseFormatter.formatOverviewResponse(cachedResult.insights);
    }

    this.logger.info('Cache miss - generating new company overview', { domain, cacheKey });

    // Use focused query builder for overview queries
    const searchQueries = SearchQueryBuilder.buildCompanyOverviewQueries(companyName);

    // Perform comprehensive search
    const searchStartTime = Date.now();
    const searchResults = await this.executeBatchedSearches(searchQueries);
    const searchTime = Date.now() - searchStartTime;

    // Create search data structure
    const searchData = {
      results: searchResults,
      totalResults: searchResults.reduce((total, response) => total + response.results.length, 0),
      searchTime
    };

    this.logger.info('Real search completed, now processing with snippet-first approach', {
      totalResults: searchData.totalResults,
      searchTime
    });

    // Use the snippet-first approach for real data
    const result = await this.processOverviewWithSnippetFirstApproach(searchData, companyName, domain, startTime);
    
    // Cache the result for future requests
    const cacheData = {
      insights: result as any,
      sources: result.sources || [],
      confidenceScore: result.confidence?.overall || 0.8,
      generatedAt: new Date(),
      cacheKey,
      totalSources: result.sources?.length || 0,
      citationMap: {}
    };
    
    // Only cache successful overview results, not failures
    if (this.isOverviewSuccessful(result)) {
    await this.cache.set(cacheKey, cacheData, CacheType.COMPANY_OVERVIEW);
      this.logger.info('Cached successful overview result', { domain, cacheKey });
    } else {
      this.logger.warn('Overview analysis failed - not caching result to allow retry', { 
        domain, 
        cacheKey,
        failureIndicators: this.getOverviewFailureIndicators(result)
      });
    }
    
    return OverviewResponseFormatter.formatOverviewResponse(result);
  }

  /**
   * Execute searches sequentially to respect rate limiting
   */
  private async executeBatchedSearches(queries: string[]) {
    const results: any[] = [];
    
    this.logger.info('Executing sequential searches', { 
      totalQueries: queries.length, 
      resultsPerQuery: this.maxResultsPerQuery
    });

    for (const query of queries) {
      const result = await this.searchEngine.search(query, this.maxResultsPerQuery, true);
      results.push(result);
    }

    const successfulSearches = results.filter(r => r.results.length > 0).length;
    this.logger.info('Sequential searches completed', { 
      totalQueries: queries.length,
      successfulSearches,
      failedSearches: queries.length - successfulSearches
    });

    return results;
  }

  /**
   * Process company overview using snippet-first approach
   * 1. Analyze snippets first
   * 2. Identify gaps
   * 3. Selectively fetch critical URLs
   * 4. Combine insights
   */
  private async processOverviewWithSnippetFirstApproach(
    searchData: any,
    companyName: string,
    domain: string,
    startTime: number
  ): Promise<OverviewResponse> {
    // Extract all search results
    const allSearchResults = searchData.results.flatMap((response: any) => response.results);
    
    // STEP 1: Extract snippets for analysis
    const snippets = allSearchResults.map((result: any) => ({
      title: result.title,
      snippet: result.snippet,
      url: result.url,
      sourceDomain: result.sourceDomain
    }));

    this.logger.info('STEP 1: Analyzing snippets first', { 
      snippetCount: snippets.length,
      companyName 
    });

    // STEP 2: Analyze snippets and identify gaps
    const snippetAnalysisStartTime = Date.now();
    const snippetAnalysis = await this.aiAnalyzer.analyzeSnippetsAndIdentifyGaps(
      snippets,
      companyName,
      'overview'
    );
    const snippetAnalysisTime = Date.now() - snippetAnalysisStartTime;

    this.logger.info('STEP 2: Identified information gaps', {
      confidence: snippetAnalysis.confidenceLevel,
      missingInfoCount: snippetAnalysis.identifiedGaps.length,
      criticalUrlsCount: 0, // Not available in current snippet analysis
      analysisTime: snippetAnalysisTime
    });

    // Log critical URLs that need immediate attention
    const criticalUrls = [] // No criticalUrls property available
      .sort((a: any, b: any) => b.priority - a.priority)
      .slice(0, 5)
      .map((u: any) => u.url);

    let fetchResults: any[] = [];
    let fetchTime = 0;
    let sources: AuthoritativeSource[] = [];

    if (criticalUrls.length > 0) {
      this.logger.info('STEP 3: Fetching critical URLs only', { 
        urlCount: criticalUrls.length,
        urls: criticalUrls
      });

      const fetchStartTime = Date.now();
      fetchResults = await this.contentFetcher.fetchBatch(criticalUrls);
      fetchTime = Date.now() - fetchStartTime;

      // Apply relevancy filtering to fetched content
      const { filteredResults, filteredUrls, relevancyScores } = this.contentFilter.filterByRelevancy(
        fetchResults,
        criticalUrls,
        allSearchResults,
        companyName,
        0.05 // Lower threshold for comprehensive coverage
      );

      // Create sources from fetched content
      sources = this.createAuthoritativeSources(filteredResults, filteredUrls, allSearchResults, relevancyScores);
    } else {
      this.logger.info('STEP 3: No critical URLs identified, using snippets only');
      
      // Create sources from snippets only
      sources = this.createSourcesFromSnippets(snippets);
    }

    // STEP 4: Combine snippet insights with selective full content
    this.logger.info('STEP 4: Combining snippet insights with selective content', {
      snippetConfidence: snippetAnalysis.confidenceLevel,
      additionalContentPieces: fetchResults.filter(r => r.content !== null).length
    });

    const combineStartTime = Date.now();
    const fullContent = fetchResults.filter(r => r.content !== null).map(r => r.content);
    
    const overview = await this.aiAnalyzer.combineSnippetAndFullContentAnalysis(
      snippetAnalysis,
      fullContent.join('\n\n'),
      companyName,
      'overview'
    );
    const combineTime = Date.now() - combineStartTime;

    const totalTime = Date.now() - startTime;
    
    this.logger.info('Snippet-first company overview completed', { 
      domain, 
      totalTime,
      snippetAnalysisTime,
      fetchTime,
      combineTime,
      sourcesFound: sources.length,
      criticalUrlsFetched: criticalUrls.length,
      finalConfidence: overview.confidence?.overall || 'N/A'
    });

    return {
      name: companyName,
      domain,
      ...overview,
      sources
    };
  }

  /**
   * Create sources from snippets only (fallback when no URLs are fetched)
   */
  private createSourcesFromSnippets(snippets: any[]): AuthoritativeSource[] {
    return snippets.map((snippet, index) => ({
      id: index + 1,
      url: snippet.url,
      title: snippet.title,
      domain: snippet.sourceDomain,
      sourceType: SourceAnalyzer.determineSourceType(snippet.url),
      snippet: snippet.snippet,
      credibilityScore: SourceAnalyzer.calculateCredibilityScore(snippet.sourceDomain),
      domainAuthority: SourceAnalyzer.calculateCredibilityScore(snippet.sourceDomain),
      lastUpdated: new Date().toISOString(),
      relevancyScore: 0.5 // Default for snippet-only sources
    }));
  }

  /**
   * Check if overview analysis was successful by looking for failure indicators
   */
  private isOverviewSuccessful(result: any): boolean {
    // Check for very low confidence scores (indicates AI analysis failure)
    if (result.confidence?.overall && result.confidence.overall < 0.2) {
      return false;
    }

    // Check for failure description
    if (result.description?.includes('Company information not available')) {
      return false;
    }

    // Check for empty/minimal data indicating failure
    if (!result.domain || result.domain === '' || result.domain === 'Unknown') {
      return false;
    }

    // Check if name is just the fallback company name with no additional info
    if (result.name === result.companyName && !result.industry) {
      return false;
    }

    // Check for generic fallback industry with no other meaningful data
    if (result.industry === 'Technology' && 
        !result.description && 
        (!result.sources || result.sources.length === 0)) {
      return false;
    }

    return true;
  }

  /**
   * Get failure indicators for logging
   */
  private getOverviewFailureIndicators(result: any): string[] {
    const indicators: string[] = [];
    
    if (result.confidence?.overall && result.confidence.overall < 0.2) {
      indicators.push(`low_confidence_${result.confidence.overall}`);
    }
    
    if (result.description?.includes('Company information not available')) {
      indicators.push('unavailable_description');
    }
    
    if (!result.domain || result.domain === '' || result.domain === 'Unknown') {
      indicators.push('empty_domain');
    }
    
    if (result.industry === 'Technology' && !result.description) {
      indicators.push('generic_industry_no_description');
    }
    
    if (!result.sources || result.sources.length === 0) {
      indicators.push('no_sources');
    }
    
    return indicators;
  }
} 