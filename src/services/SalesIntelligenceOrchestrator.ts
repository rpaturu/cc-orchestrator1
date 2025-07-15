/**
 * Sales Intelligence Orchestrator
 * 
 * Coordinates between all the focused services to provide comprehensive sales intelligence.
 * This replaces the monolithic SalesIntelligenceService with a clean orchestrator pattern.
 */

import { 
  SalesIntelligenceRequest, 
  ContentAnalysis, 
  SalesContext,
  AppConfig,
  AuthoritativeSource,
  SearchEngineResponse,
  SalesInsights
} from '@/types';

import { SearchEngine } from './SearchEngine';
import { ContentFetcher } from './ContentFetcher';
import { AIAnalyzer } from './AIAnalyzer';
import { CacheService } from './CacheService';
import { Logger } from './Logger';


// New focused services
import { CompanyExtractor } from './CompanyExtractor';
import { SourceAnalyzer } from './SourceAnalyzer';
import { ContentFilter } from './ContentFilter';
import { SearchQueryBuilder } from './SearchQueryBuilder';
import { IntentAnalyzer } from './IntentAnalyzer';

export class SalesIntelligenceOrchestrator {
  private readonly searchEngine: SearchEngine;
  private readonly contentFetcher: ContentFetcher;
  private readonly aiAnalyzer: AIAnalyzer;
  private readonly cache: CacheService;
  private readonly logger: Logger;
  private readonly config: AppConfig;
  private readonly contentFilter: ContentFilter;

  constructor(config: AppConfig) {
    this.config = config;
    this.logger = new Logger('SalesIntelligenceOrchestrator');
    
    // Initialize cache BEFORE SearchEngine needs it
    this.cache = new CacheService(
      config.cache, 
      this.logger,
      process.env.AWS_REGION
    );
    
    this.searchEngine = new SearchEngine(
      config.apis.googleSearchApiKey,
      config.apis.googleSearchEngineId,
      config.search,
      this.logger,
      this.cache
    );
    
    this.contentFetcher = new ContentFetcher(
      this.logger,
      config.search.rateLimitRps
    );
    
    this.aiAnalyzer = new AIAnalyzer(
      config.ai,
      this.logger,
      process.env.AWS_REGION
    );

    this.contentFilter = new ContentFilter(this.logger);
  }

  /**
   * Generate comprehensive sales intelligence for a company
   */
  async generateIntelligence(request: SalesIntelligenceRequest): Promise<ContentAnalysis> {
    const startTime = Date.now();
    const cacheKey = CompanyExtractor.generateCacheKey(request);

    try {
      this.logger.info('Generating sales intelligence', { 
        companyDomain: request.companyDomain,
        salesContext: request.salesContext 
      });

      // Check cache first
      const cachedResult = await this.cache.get(cacheKey);
      if (cachedResult) {
        this.logger.info('Returning cached intelligence', { cacheKey });
        return cachedResult;
      }

      // Generate search queries using focused service
      const searchQueries = SearchQueryBuilder.buildSearchQueries(request);
      this.logger.debug('Generated search queries', { queries: searchQueries });

      // Perform sequential search with rate limiting
      const searchStartTime = Date.now();
      const searchResponses = await this.executeBatchedSearches(searchQueries, this.config.search.maxResultsPerQuery);
      const searchTime = Date.now() - searchStartTime;

      // Extract all URLs to fetch
      const urlsToFetch = searchResponses
        .flatMap(response => response.results.map(result => result.url))
        .slice(0, 30); // Optimized to 30 URLs total

      this.logger.debug('URLs to fetch', { count: urlsToFetch.length });

      // Fetch content from URLs
      const fetchStartTime = Date.now();
      const fetchResults = await this.contentFetcher.fetchBatch(urlsToFetch);
      const fetchTime = Date.now() - fetchStartTime;

      // Apply relevancy filtering using focused service
      const companyName = CompanyExtractor.extractCompanyName(request.companyDomain);
      const allSearchResults = searchResponses.flatMap(response => response.results);
      
      const { filteredResults, filteredUrls, relevancyScores } = this.contentFilter.filterByRelevancy(
        fetchResults,
        urlsToFetch,
        allSearchResults,
        companyName,
        0.2 // Lower threshold for comprehensive analysis
      );

      // Create AuthoritativeSource objects using focused services
      const authoritativeSources = this.createAuthoritativeSources(
        filteredResults,
        filteredUrls,
        allSearchResults,
        relevancyScores
      );

      this.logger.info('Content processing completed', { 
        totalUrls: urlsToFetch.length,
        authoritativeSources: authoritativeSources.length
      });

      // AI analysis
      const analysisStartTime = Date.now();
      const allContent = filteredResults.filter(result => result.content !== null).map(result => result.content!);
      const insights = await this.aiAnalyzer.analyzeForSalesContext(
        allContent,
        authoritativeSources,
        companyName,
        request.salesContext,
        request.additionalContext
      );
      const analysisTime = Date.now() - analysisStartTime;

      // Create result
      const result: ContentAnalysis = {
        insights,
        sources: authoritativeSources,
        confidenceScore: this.contentFilter.calculateConfidenceScore(allContent.length, authoritativeSources.length),
        generatedAt: new Date(),
        cacheKey,
        totalSources: authoritativeSources.length,
        citationMap: {}
      };

      // Cache the result
      await this.cache.set(cacheKey, result);

      const totalTime = Date.now() - startTime;
      this.logger.info('Sales intelligence generated successfully', {
        companyDomain: request.companyDomain,
        totalTime,
        searchTime,
        fetchTime,
        analysisTime,
        sourcesAnalyzed: allContent.length
      });

      return result;

    } catch (error) {
      this.logger.error('Sales intelligence generation failed', { 
        companyDomain: request.companyDomain,
        error 
      });
      throw error;
    }
  }

  /**
   * Get comprehensive company overview
   */
  async getCompanyOverview(domain: string): Promise<{
    name: string;
    domain: string;
    // ... full type definition as in original
    sources: AuthoritativeSource[];
  }> {
    const startTime = Date.now();
    const companyName = CompanyExtractor.extractCompanyName(domain);
    
    // Generate cache key for overview
    const cacheKey = CompanyExtractor.generateCacheKey({
      companyDomain: domain,
      salesContext: 'overview' as any,
      additionalContext: 'comprehensive_overview'
    });
    
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
      return cachedResult.insights as any; // Convert ContentAnalysis to overview format
    }

    this.logger.info('Cache miss - generating new company overview', { domain, cacheKey });

    // Use Google Search API with snippet-first approach
    this.logger.info('Using Google Search API with snippet-first approach', { domain });

    // Use focused query builder for overview queries
    const searchQueries = SearchQueryBuilder.buildCompanyOverviewQueries(companyName);

    // Perform comprehensive search
    const searchStartTime = Date.now();
    const searchResults = await this.executeBatchedSearches(searchQueries, this.config.search.maxResultsPerQuery);
    const searchTime = Date.now() - searchStartTime;

    // Create search data structure similar to mock data
    const searchData = {
      results: searchResults,
      totalResults: searchResults.reduce((total, response) => total + response.results.length, 0),
      searchTime
    };

    this.logger.info('Real search completed, now processing with snippet-first approach', {
      totalResults: searchData.totalResults,
      searchTime
    });

    // Use the same snippet-first approach for real data
    const result = await this.processOverviewWithSnippetFirstApproach(searchData, companyName, domain, startTime);
    
    // Cache the result for future requests
    const cacheData = {
      insights: result,
      sources: result.sources || [],
      confidenceScore: result.confidence?.overall || 0.8,
      generatedAt: new Date(),
      cacheKey,
      totalSources: result.sources?.length || 0,
      citationMap: {}
    };
    
    await this.cache.set(cacheKey, cacheData);
    this.logger.info('Cached company overview result', { domain, cacheKey });
    
    return result;
  }

  /**
   * Perform search and return raw results (fast endpoint)
   */
  async performSearch(domain: string, context: SalesContext): Promise<{
    queries: string[];
    results: SearchEngineResponse[];
    totalResults: number;
    searchTime: number;
  }> {
    const startTime = Date.now();
    const companyName = CompanyExtractor.extractCompanyName(domain);
    
    this.logger.info('Performing search', { 
      domain, 
      context, 
      companyName
    });

    // Use Google Search API
    this.logger.info('Using Google Search API', { domain });

    // Build context-specific queries using focused service
    const queries = SearchQueryBuilder.buildSearchQueries({ companyDomain: domain, salesContext: context });
    
    // Perform searches using batched approach
    const results = await this.executeBatchedSearches(queries, this.config.search.maxResultsPerQuery);
    const searchTime = Date.now() - startTime;
    
    const totalResults = results.reduce((total, response) => total + response.results.length, 0);
    
    this.logger.info('Search completed', { domain, context, totalResults, searchTime });

    return {
      queries,
      results,
      totalResults,
      searchTime
    };
  }

  /**
   * Enhanced search with optional seller context for relationship-aware queries
   */
  async performSearchWithContext(
    domain: string, 
    context: SalesContext, 
    sellerCompany?: string,
    sellerDomain?: string
  ): Promise<{
    queries: string[];
    results: SearchEngineResponse[];
    totalResults: number;
    searchTime: number;
    relationshipAware: boolean;
  }> {
    const startTime = Date.now();
    const companyName = CompanyExtractor.extractCompanyName(domain);
    
    this.logger.info('Performing enhanced search', { 
      domain, 
      context, 
      companyName, 
      sellerCompany, 
      relationshipAware: !!sellerCompany
    });

    // Use Google Search API
    this.logger.info('Using Google Search API', { domain, sellerCompany });

    // Build relationship-aware queries using focused service
    const request: SalesIntelligenceRequest = {
      companyDomain: domain,
      salesContext: context,
      sellerCompany,
      sellerDomain
    };

    const queries = SearchQueryBuilder.buildSearchQueries(request);
    
    // Perform searches
    const results = await this.executeBatchedSearches(queries, this.config.search.maxResultsPerQuery);
    const searchTime = Date.now() - startTime;
    
    const totalResults = results.reduce((total, response) => total + response.results.length, 0);
    
    this.logger.info('Enhanced search completed', { 
      domain, 
      context, 
      totalResults, 
      searchTime,
      relationshipAware: !!sellerCompany,
      queries
    });

    return {
      queries,
      results,
      totalResults,
      searchTime,
      relationshipAware: !!sellerCompany
    };
  }

  /**
   * Perform AI analysis on provided content (slower endpoint)
   */
  async performAnalysis(domain: string, context: SalesContext, searchResults: SearchEngineResponse[]): Promise<ContentAnalysis> {
    const startTime = Date.now();
    const companyName = CompanyExtractor.extractCompanyName(domain);
    
    this.logger.info('Starting AI analysis', { domain, context, companyName });

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
    const authoritativeSources = this.createAuthoritativeSources(filteredResults, filteredUrls, allSearchResults, relevancyScores);

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
    const totalTime = Date.now() - startTime;

    this.logger.info('AI analysis completed', { 
      domain, 
      context, 
      totalTime, 
      fetchTime, 
      analysisTime, 
      sourcesAnalyzed: authoritativeSources.length 
    });

    return {
      insights,
      sources: authoritativeSources,
      confidenceScore,
      generatedAt: new Date(),
      cacheKey: CompanyExtractor.generateCacheKey({ companyDomain: domain, salesContext: context }),
      totalSources: authoritativeSources.length,
      citationMap: {}
    };
  }

  /**
   * Get discovery-focused insights (medium speed endpoint)
   */
  async getDiscoveryInsights(domain: string): Promise<{
    painPoints: string[];
    opportunities: string[];
    keyContacts: string[];
    technologyStack: string[];
    sources: AuthoritativeSource[];
  }> {
    const startTime = Date.now();
    const companyName = CompanyExtractor.extractCompanyName(domain);
    
    this.logger.info('Getting discovery insights', { domain, companyName });

    // Use focused query builder for discovery queries
    const queries = SearchQueryBuilder.buildDiscoveryQueries(companyName);

    // Perform searches
    const searchResponses = await this.executeBatchedSearches(queries, this.config.search.maxResultsPerQuery);
    
    // Fetch and filter content
    const allUrls = searchResponses.flatMap(response => response.results.slice(0, 5).map(result => result.url));
    const uniqueUrls = [...new Set(allUrls)];
    const fetchResults = await this.contentFetcher.fetchBatch(uniqueUrls);

    const allSearchResults = searchResponses.flatMap(response => response.results);
    const { filteredResults, filteredUrls, relevancyScores } = this.contentFilter.filterByRelevancy(
      fetchResults,
      uniqueUrls,
      allSearchResults,
      companyName,
      0.25 // Medium threshold for discovery insights
    );

    // Create sources
    const sources = this.createAuthoritativeSources(filteredResults, filteredUrls, allSearchResults, relevancyScores);

    // Extract discovery insights using AI
    const content = filteredResults.filter(r => r.content !== null).map(r => r.content!);
    const insights = await this.aiAnalyzer.analyzeForSalesContext(
      content,
      sources,
      companyName,
      'discovery'
    );

    const totalTime = Date.now() - startTime;
    this.logger.info('Discovery insights completed', { domain, totalTime, sourcesFound: sources.length });

    return {
      painPoints: insights.painPoints.map(p => p.text) || [],
      opportunities: insights.recommendedActions.map(a => a.text) || [],
      keyContacts: insights.keyContacts.map(c => `${c.name} - ${c.title}`) || [],
      technologyStack: insights.technologyStack.current || [],
      sources
    };
  }

  /**
   * Generate dynamic queries from user input (Chat Interface Support)
   */
  async generateDynamicQueries(
    userInput: string, 
    targetCompany?: string, 
    sellerCompany?: string
  ): Promise<{
    queries: string[];
    intent: string;
    confidence: number;
  }> {
    const result = await IntentAnalyzer.generateDynamicQueries(userInput, targetCompany, sellerCompany);
    return {
      queries: result.queries,
      intent: result.intent,
      confidence: result.confidence
    };
  }

  /**
   * Parse user input using AI (legacy method)
   */
  async parseUserInput(prompt: string): Promise<string> {
    return this.aiAnalyzer.parseUserInput(prompt);
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{ [service: string]: boolean }> {
    const checks = await Promise.allSettled([
      this.searchEngine.healthCheck(),
      this.cache.healthCheck(),
      this.aiAnalyzer.healthCheck()
    ]);

    return {
      searchEngine: checks[0].status === 'fulfilled' && checks[0].value,
      cache: checks[1].status === 'fulfilled' && checks[1].value,
      aiAnalyzer: checks[2].status === 'fulfilled' && checks[2].value.status === 'healthy'
    };
  }

  /**
   * Private helper methods
   */

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
  ): Promise<any> {
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
    let sources: any[] = [];

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
      sources = snippets.slice(0, 10).map((snippet: any, index: number) => ({
        id: index + 1,
        url: snippet.url,
        title: snippet.title,
        domain: snippet.sourceDomain,
        sourceType: SourceAnalyzer.determineSourceType(snippet.url),
        snippet: snippet.snippet,
        credibilityScore: SourceAnalyzer.calculateCredibilityScore(snippet.sourceDomain),
        publishedDate: new Date().toISOString(),
        author: null,
        domainAuthority: SourceAnalyzer.calculateCredibilityScore(snippet.sourceDomain),
        lastUpdated: new Date().toISOString(),
        relevancyScore: 0.8 - (index * 0.05) // Descending relevancy
      }));
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
   * Execute searches sequentially to respect rate limiting
   */
  private async executeBatchedSearches(queries: string[], resultsPerQuery: number): Promise<SearchEngineResponse[]> {
    const results: SearchEngineResponse[] = [];
    
    this.logger.info('Executing sequential searches', { 
      totalQueries: queries.length, 
      resultsPerQuery 
    });

    for (const query of queries) {
      const result = await this.searchEngine.search(query, resultsPerQuery, true);
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
   * Create authoritative sources using focused services
   */
  private createAuthoritativeSources(
    filteredResults: { content: string | null; [key: string]: any }[],
    filteredUrls: string[],
    allSearchResults: any[],
    relevancyScores: number[]
  ): AuthoritativeSource[] {
    const sources: AuthoritativeSource[] = [];
    
    for (let i = 0; i < filteredUrls.length; i++) {
      const url = filteredUrls[i];
      const content = filteredResults[i].content!;
      const searchResult = allSearchResults.find(result => result.url === url);
      
      const domain = searchResult?.sourceDomain || CompanyExtractor.extractDomain(url);
      const author = CompanyExtractor.extractAuthor(content, url);
      const publishedDate = CompanyExtractor.extractPublicationDate(content);
      
      sources.push({
        id: i + 1,
        url: url,
        title: searchResult?.title || 'Unknown Title',
        domain: domain,
        sourceType: SourceAnalyzer.determineSourceType(url),
        snippet: searchResult?.snippet || 'No snippet available',
        credibilityScore: SourceAnalyzer.calculateComprehensiveCredibilityScore(domain, content, url),
        publishedDate: publishedDate,
        author: author,
        domainAuthority: SourceAnalyzer.calculateCredibilityScore(domain),
        lastUpdated: new Date().toISOString(),
        relevancyScore: relevancyScores[i]
      });
    }
    
    return sources;
  }
} 