/**
 * Analysis Handler
 * 
 * Handles AI analysis on provided search results with content fetching and filtering.
 * Provides slower but comprehensive analysis for specific sales contexts.
 */

import { BaseEndpointHandler } from './BaseEndpointHandler';
import { AnalysisResponseFormatter, AnalysisResponse } from '../formatters/AnalysisResponseFormatter';
import { ContentFetcher } from '../content/ContentFetcher';
import { AIAnalyzer } from '../analysis/AIAnalyzer';
import { SearchEngineResponse, SalesContext, ContentAnalysis } from '@/types';

export class AnalysisHandler extends BaseEndpointHandler {
  private readonly contentFetcher: ContentFetcher;
  private readonly aiAnalyzer: AIAnalyzer;

  constructor(
    contentFetcher: ContentFetcher,
    aiAnalyzer: AIAnalyzer,
    cache: any,
    logger: any,
    contentFilter: any
  ) {
    super(cache, logger, contentFilter);
    this.contentFetcher = contentFetcher;
    this.aiAnalyzer = aiAnalyzer;
  }

  /**
   * Perform AI analysis on provided search results
   */
  async performAnalysis(
    domain: string, 
    context: SalesContext, 
    searchResults: SearchEngineResponse[]
  ): Promise<AnalysisResponse> {
    const startTime = Date.now();
    const companyName = this.extractCompanyName(domain);
    
    // Generate cache key for analysis
    const cacheKey = this.generateCacheKey(
      domain,
      context,
      'analysis_endpoint'
    );
    
    this.logger.info('Starting AI analysis', { 
      domain, 
      context, 
      companyName,
      cacheKey
    });

    // Check cache first
    const cachedResult = await this.cache.get(cacheKey);
    if (cachedResult) {
      this.logger.info('Returning cached analysis result', { 
        domain, 
        context,
        cacheKey,
        cachedAt: cachedResult.generatedAt 
      });
      return cachedResult;
    }

    this.logger.info('Cache miss - generating new analysis', { domain, context, cacheKey });

    // Extract URLs from search results
    const allUrls = searchResults.flatMap(response => response.results.map(result => result.url));
    const uniqueUrls = [...new Set(allUrls)];
    
    // Fetch content
    const fetchStartTime = Date.now();
    const fetchResults = await this.contentFetcher.fetchBatch(uniqueUrls);
    const fetchTime = Date.now() - fetchStartTime;

    // Apply relevancy filtering
    const allSearchResults = searchResults.flatMap(response => response.results);
    const { filteredResults, filteredUrls, relevancyScores } = this.contentFilter.filterByRelevancy(
      fetchResults,
      uniqueUrls,
      allSearchResults,
      companyName,
      0.3 // Standard threshold for analysis
    );

    // Create authoritative sources
    const authoritativeSources = this.createAuthoritativeSources(
      filteredResults, 
      filteredUrls, 
      allSearchResults, 
      relevancyScores
    );

    // AI Analysis with filtered content
    const analysisStartTime = Date.now();
    const allContent = filteredResults.filter(result => result.content !== null).map(result => result.content!);
    
    const insights = await this.aiAnalyzer.analyzeForSalesContext(
      allContent,
      authoritativeSources,
      companyName,
      context
    );
    const analysisTime = Date.now() - analysisStartTime;

    const confidenceScore = this.contentFilter.calculateConfidenceScore(allContent.length, authoritativeSources.length);
    
    // Create result
    const result: ContentAnalysis = {
      insights,
      sources: authoritativeSources,
      confidenceScore,
      generatedAt: new Date(),
      cacheKey,
      totalSources: authoritativeSources.length,
      citationMap: {}
    };

    // Cache the result
    await this.cache.set(cacheKey, result);

    const totalTime = Date.now() - startTime;
    this.logger.info('AI analysis completed', { 
      domain, 
      context, 
      totalTime, 
      fetchTime, 
      analysisTime, 
      sourcesAnalyzed: authoritativeSources.length 
    });

    return AnalysisResponseFormatter.formatAnalysisResponse(result);
  }
} 