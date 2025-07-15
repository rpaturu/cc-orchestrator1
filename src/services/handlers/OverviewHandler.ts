/**
 * Overview Handler
 * 
 * Handles comprehensive company overview generation with snippet-first approach.
 * Provides fast but comprehensive overview for initial company research.
 */

import { BaseEndpointHandler } from './BaseEndpointHandler';
import { OverviewResponseFormatter, OverviewResponse } from '../formatters/OverviewResponseFormatter';
import { ContentFetcher } from '../content/ContentFetcher';
import { AIAnalyzer } from '../analysis/AIAnalyzer';
import { SearchEngine } from '../search/SearchEngine';
import { SearchQueryBuilder } from '../search/SearchQueryBuilder';
import { SourceAnalyzer } from '../analysis/SourceAnalyzer';
import { AuthoritativeSource } from '@/types';

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
    
    await this.cache.set(cacheKey, cacheData);
    this.logger.info('Cached company overview result', { domain, cacheKey });
    
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
      confidence: snippetAnalysis.confidence,
      missingInfoCount: snippetAnalysis.missingInfo.length,
      criticalUrlsCount: snippetAnalysis.criticalUrls.length,
      analysisTime: snippetAnalysisTime
    });

    // STEP 3: Selectively fetch only critical URLs (max 3)
    const criticalUrls = snippetAnalysis.criticalUrls
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(u => u.url);

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
      snippetConfidence: snippetAnalysis.confidence,
      additionalContentPieces: fetchResults.filter(r => r.content !== null).length
    });

    const combineStartTime = Date.now();
    const fullContent = fetchResults.filter(r => r.content !== null).map(r => r.content);
    
    const overview = await this.aiAnalyzer.combineSnippetAndFullContentAnalysis(
      snippetAnalysis.snippetInsights,
      fullContent,
      sources,
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
      ...overview,
      domain,
      sources
    };
  }

  /**
   * Create sources from snippets only
   */
  private createSourcesFromSnippets(snippets: any[]): AuthoritativeSource[] {
    return snippets.slice(0, 10).map((snippet: any, index: number) => ({
      id: index + 1,
      url: snippet.url,
      title: snippet.title,
      domain: snippet.sourceDomain,
      sourceType: SourceAnalyzer.determineSourceType(snippet.url),
      snippet: snippet.snippet,
      credibilityScore: SourceAnalyzer.calculateCredibilityScore(snippet.sourceDomain),
      publishedDate: new Date().toISOString(),
      author: undefined,
      domainAuthority: SourceAnalyzer.calculateCredibilityScore(snippet.sourceDomain),
      lastUpdated: new Date().toISOString(),
      relevancyScore: 0.8 - (index * 0.05) // Descending relevancy
    }));
  }
} 