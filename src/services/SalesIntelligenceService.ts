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


export class SalesIntelligenceService {
  private readonly searchEngine: SearchEngine;
  private readonly contentFetcher: ContentFetcher;
  private readonly aiAnalyzer: AIAnalyzer;
  private readonly cache: CacheService;
  private readonly logger: Logger;
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.logger = new Logger('SalesIntelligenceService');
    
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
  }

  /**
   * Generate comprehensive sales intelligence for a company
   */
  async generateIntelligence(request: SalesIntelligenceRequest): Promise<ContentAnalysis> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

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

      // Generate search queries based on context
      const searchQueries = this.buildSearchQueries(request);
      this.logger.debug('Generated search queries', { queries: searchQueries });

      // Perform sequential search with rate limiting
      const searchStartTime = Date.now();
      const searchResponses = await this.executeBatchedSearches(searchQueries, this.config.search.maxResultsPerQuery);
      const searchTime = Date.now() - searchStartTime;

      // Extract all URLs to fetch
      const urlsToFetch = searchResponses
        .flatMap(response => response.results.map(result => result.url))
        .slice(0, 30); // Increased to 30 URLs total (10 per query) to ensure quality after filtering

      this.logger.debug('URLs to fetch', { count: urlsToFetch.length });

      // Fetch content from URLs
      const fetchStartTime = Date.now();
      const fetchResults = await this.contentFetcher.fetchBatch(urlsToFetch);
      const fetchTime = Date.now() - fetchStartTime;

      // Apply relevancy filtering to prioritize relevant content
      const companyNameForFiltering = this.extractCompanyName(request.companyDomain);
      const allSearchResults = searchResponses.flatMap(response => response.results);
      
      const { filteredResults, filteredUrls, relevancyScores } = this.filterByRelevancy(
        fetchResults,
        urlsToFetch,
        allSearchResults,
        companyNameForFiltering,
        0.2 // Lower threshold for comprehensive analysis
      );

      // Filter successful fetches and create AuthoritativeSource objects
      const successfulFetches = filteredResults.filter(result => result.content !== null);
      const allContent = successfulFetches.map(result => result.content!);
      
      // Create AuthoritativeSource objects from filtered results
      const authoritativeSources: AuthoritativeSource[] = [];
      
      for (let i = 0; i < filteredUrls.length; i++) {
        const url = filteredUrls[i];
        const content = filteredResults[i].content!;
        
        // Find the corresponding search result
        const searchResult = allSearchResults.find(result => result.url === url);
        
        const domain = searchResult?.sourceDomain || this.extractDomain(url);
        const author = this.extractAuthor(content, url);
        const publishedDate = this.extractPublicationDate(content);
        
        authoritativeSources.push({
          id: i + 1,
          url: url,
          title: searchResult?.title || 'Unknown Title',
          domain: domain,
          sourceType: this.determineSourceType(url),
          snippet: searchResult?.snippet || 'No snippet available',
          credibilityScore: this.calculateComprehensiveCredibilityScore(domain, content, url),
          publishedDate: publishedDate,
          author: author,
          domainAuthority: this.calculateCredibilityScore(domain),
          lastUpdated: new Date().toISOString(),
          relevancyScore: relevancyScores[i] // Add relevancy score to track quality
        });
      }

      this.logger.info('Content fetching completed', { 
        totalUrls: urlsToFetch.length,
        successfulFetches: successfulFetches.length,
        authoritativeSources: authoritativeSources.length
      });

      // AI analysis
      const analysisStartTime = Date.now();
      const companyName = this.extractCompanyName(request.companyDomain);
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
        confidenceScore: this.calculateConfidenceScore(allContent.length, successfulFetches.length),
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
   * Get comprehensive company overview (enhanced endpoint)
   */
  async getCompanyOverview(domain: string): Promise<{
    name: string;
    domain: string;
    industry: string;
    description: string;
    foundedYear?: number;
    financialData?: {
      stockSymbol?: string;
      stockExchange?: string;
      marketCap?: string;
      revenue?: string;
      revenueGrowth?: string;
      totalFunding?: string;
      latestFundingRound?: {
        type: string;
        amount: string;
        date: string;
        investors: string[];
        citations: number[];
      };
      peRatio?: number;
      citations: number[];
    };
    employeeCount?: number;
    employeeRange?: string;
    leadership?: Array<{
      name: string;
      title: string;
      department?: string;
      background?: string;
      citations: number[];
    }>;
    marketData?: {
      marketSize?: string;
      marketShare?: string;
      marketPosition?: string;
      majorCompetitors?: string[];
      competitiveAdvantages?: string[];
      citations: number[];
    };
    products?: string[];
    services?: string[];
    recentNews?: Array<{
      title: string;
      summary: string;
      date: string;
      source: string;
      relevance: 'high' | 'medium' | 'low';
      citations: number[];
    }>;
    majorCustomers?: string[];
    businessModel?: string;
    revenueModel?: string;
    pricingStructure?: Array<{
      name: string;
      price: string;
      period: string;
      features?: string[];
      citations: number[];
    }>;
    performanceMetrics?: Array<{
      name: string;
      value: string;
      trend?: 'up' | 'down' | 'stable';
      period?: string;
      citations: number[];
    }>;
    competitivePosition?: string;
    keyDifferentiators?: string[];
    confidence: {
      overall: number;
      financial: number;
      leadership: number;
      market: number;
      products: number;
      size: number;
      revenue: number;
    };
    sources: AuthoritativeSource[];
  }> {
    const startTime = Date.now();
    const companyName = this.extractCompanyName(domain);
    
    this.logger.info('Getting comprehensive company overview', { domain, companyName });

    // Perplexity-style strategy: 3 simple, strategic queries targeting different information spaces
    // Trust Google's algorithm to surface the best sources naturally
    const searchQueries = [
      // 1. Company basics - let Google find official sites, Wikipedia, Crunchbase naturally
      `${companyName} company overview`,
      
      // 2. Business intelligence - financial and operational data  
      `${companyName} business model revenue financials`,
      
      // 3. Recent developments - current news and market changes
      `${companyName} news 2024`
    ];

    // Perform comprehensive search across multiple queries with rate-limited batched execution
    this.logger.info('Starting batched search execution', { queriesCount: searchQueries.length });
    const searchStartTime = Date.now();
    
    const searchResults = await this.executeBatchedSearches(searchQueries, this.config.search.maxResultsPerQuery);
    const searchTime = Date.now() - searchStartTime;
    const allSearchResults = searchResults.flatMap(result => result.results);
    
    // Collect all unique URLs to fetch with increased limit and source prioritization
    const uniqueUrls = [...new Set(allSearchResults.map(result => result.url))];
    
    // Prioritize sources similar to Perplexity's approach
    const prioritizedUrls = this.prioritizeSourcesByType(uniqueUrls, allSearchResults, domain);
    const urlsToFetch = prioritizedUrls.slice(0, 20); // Optimized to 20 for faster execution while maintaining quality
    
    // Fetch content from URLs
    this.logger.info('Starting content fetch', { urlCount: urlsToFetch.length });
    const fetchStartTime = Date.now();
    const fetchResults = await this.contentFetcher.fetchBatch(urlsToFetch);
    const fetchTime = Date.now() - fetchStartTime;
    
    // Apply relevancy filtering with moderate threshold for comprehensive data
    const { filteredResults, filteredUrls, relevancyScores } = this.filterByRelevancy(
      fetchResults,
      urlsToFetch,
      allSearchResults,
      companyName,
      0.05 // Lower threshold to ensure comprehensive coverage
    );
    
    // Create authoritative sources from filtered results
    const sources: AuthoritativeSource[] = [];
    for (let i = 0; i < filteredUrls.length; i++) {
      const url = filteredUrls[i];
      const content = filteredResults[i].content!;
      const searchResult = allSearchResults.find(result => result.url === url);
      const sourceDomain = searchResult?.sourceDomain || this.extractDomain(url);
      const author = this.extractAuthor(content, url);
      const publishedDate = this.extractPublicationDate(content);
      
      sources.push({
        id: i + 1,
        url: url,
        title: searchResult?.title || 'Unknown Title',
        domain: sourceDomain,
        sourceType: this.determineSourceType(url),
        snippet: searchResult?.snippet || 'No snippet available',
        credibilityScore: this.calculateComprehensiveCredibilityScore(sourceDomain, content, url),
        publishedDate: publishedDate,
        author: author,
        domainAuthority: this.calculateCredibilityScore(sourceDomain),
        lastUpdated: new Date().toISOString(),
        relevancyScore: relevancyScores[i]
      });
    }

    // Extract comprehensive information using enhanced AI analysis
    const content = filteredResults.filter(r => r.content !== null).map(r => r.content!);
    
    // Use comprehensive AI extraction for detailed synthesis
    this.logger.info('Starting AI analysis', { contentPieces: content.length, sources: sources.length });
    const aiStartTime = Date.now();
    const overview = await this.aiAnalyzer.extractCompanyOverview(content, sources, companyName);
    const aiTime = Date.now() - aiStartTime;

    const totalTime = Date.now() - startTime;
    this.logger.info('Comprehensive company overview completed', { 
      domain, 
      totalTime, 
      searchTime,
      fetchTime,
      aiTime,
      sourcesFound: sources.length,
      searchQueriesUsed: searchQueries.length,
      urlsFetched: urlsToFetch.length
    });

    return {
      ...overview,
      domain,
      sources
    };
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
    const companyName = this.extractCompanyName(domain);
    
    this.logger.info('Performing search', { 
      domain, 
      context, 
      companyName
    });

    // Use Google Search API
    this.logger.info('Using Google Search API', { domain });

    // Build context-specific queries
    const queries = this.buildSearchQueries({ companyDomain: domain, salesContext: context });
    
    // Perform searches using batched approach to respect rate limiting
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
    const companyName = this.extractCompanyName(domain);
    
    this.logger.info('Performing enhanced search', { 
      domain, 
      context, 
      companyName, 
      sellerCompany, 
      relationshipAware: !!sellerCompany
    });

    // Use Google Search API
    this.logger.info('Using Google Search API', { domain, sellerCompany });

    // Build relationship-aware queries when seller info available
    const request: SalesIntelligenceRequest = {
      companyDomain: domain,
      salesContext: context,
      sellerCompany,
      sellerDomain
    };

    const queries = this.buildSearchQueries(request);
    
    // Perform searches using batched approach to respect rate limiting
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
    const companyName = this.extractCompanyName(domain);
    
    this.logger.info('Starting AI analysis', { domain, context, companyName });

    // Extract URLs from search results
    const allUrls = searchResults.flatMap(response => response.results.map(result => result.url));
    const uniqueUrls = [...new Set(allUrls)];
    
    // Fetch content
    const fetchStartTime = Date.now();
    const fetchResults = await this.contentFetcher.fetchBatch(uniqueUrls);
    const fetchTime = Date.now() - fetchStartTime;

    // Apply relevancy filtering for analysis
    const companyNameForFiltering = this.extractCompanyName(domain);
    const allSearchResults = searchResults.flatMap(response => response.results);
    const { filteredResults, filteredUrls, relevancyScores } = this.filterByRelevancy(
      fetchResults,
      uniqueUrls,
      allSearchResults,
      companyNameForFiltering,
      0.3 // Standard threshold for analysis
    );

    // Create authoritative sources from filtered results
    const authoritativeSources: AuthoritativeSource[] = [];
    
    for (let i = 0; i < filteredUrls.length; i++) {
      const url = filteredUrls[i];
      const content = filteredResults[i].content!;
      
      // Find the corresponding search result
      const searchResult = allSearchResults.find(result => result.url === url);
      
      const domainName = searchResult?.sourceDomain || this.extractDomain(url);
      const author = this.extractAuthor(content, url);
      const publishedDate = this.extractPublicationDate(content);
      
      authoritativeSources.push({
        id: i + 1,
        url: url,
        title: searchResult?.title || 'Unknown Title',
        domain: domainName,
        sourceType: this.determineSourceType(url),
        snippet: searchResult?.snippet || 'No snippet available',
        credibilityScore: this.calculateComprehensiveCredibilityScore(domainName, content, url),
        publishedDate: publishedDate,
        author: author,
        domainAuthority: this.calculateCredibilityScore(domainName),
        lastUpdated: new Date().toISOString(),
        relevancyScore: relevancyScores[i]
      });
    }

    // AI Analysis with filtered content
    const analysisStartTime = Date.now();
    const allContent = filteredResults.filter(result => result.content !== null).map(result => result.content!);
    
    const insights = await this.aiAnalyzer.analyzeForSalesContext(
      allContent,
      authoritativeSources,
      companyNameForFiltering,
      context
    );
    const analysisTime = Date.now() - analysisStartTime;

    const confidenceScore = this.calculateConfidenceScore(allContent.length, authoritativeSources.length);
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
      cacheKey: this.generateCacheKey({ companyDomain: domain, salesContext: context }),
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
    const companyName = this.extractCompanyName(domain);
    
    this.logger.info('Getting discovery insights', { domain, companyName });

    // Perplexity-style: 3 simple discovery queries
    const queries = [
      `${companyName} challenges problems 2024`,
      `${companyName} growth initiatives`,
      `${companyName} leadership team`
    ];

    // Perform searches with recency priority using sequential approach
    const searchResponses = await this.executeBatchedSearches(queries, this.config.search.maxResultsPerQuery);
    
    // Fetch top results - increased to 5 per query to ensure quality after filtering
    const allUrls = searchResponses.flatMap(response => response.results.slice(0, 5).map(result => result.url));
    const uniqueUrls = [...new Set(allUrls)];
    const fetchResults = await this.contentFetcher.fetchBatch(uniqueUrls);

    // Apply relevancy filtering for discovery insights
    const allSearchResults = searchResponses.flatMap(response => response.results);
    const { filteredResults, filteredUrls, relevancyScores } = this.filterByRelevancy(
      fetchResults,
      uniqueUrls,
      allSearchResults,
      companyName,
      0.25 // Medium threshold for discovery insights
    );

    // Create sources from filtered results
    const sources: AuthoritativeSource[] = [];
    for (let i = 0; i < filteredUrls.length; i++) {
      const url = filteredUrls[i];
      const content = filteredResults[i].content!;
      const searchResult = allSearchResults.find(result => result.url === url);
      const domain = searchResult?.sourceDomain || this.extractDomain(url);
      const author = this.extractAuthor(content, url);
      const publishedDate = this.extractPublicationDate(content);
      
      sources.push({
        id: i + 1,
        url: url,
        title: searchResult?.title || 'Unknown Title',
        domain: domain,
        sourceType: this.determineSourceType(url),
        snippet: searchResult?.snippet || 'No snippet available',
        credibilityScore: this.calculateComprehensiveCredibilityScore(domain, content, url),
        publishedDate: publishedDate,
        author: author,
        domainAuthority: this.calculateCredibilityScore(domain),
        lastUpdated: new Date().toISOString(),
        relevancyScore: relevancyScores[i]
      });
    }

    // Extract discovery insights using AI with filtered content
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
   * Execute searches sequentially to respect rate limiting (no retries)
   */
  private async executeBatchedSearches(queries: string[], resultsPerQuery: number): Promise<SearchEngineResponse[]> {
    const results: SearchEngineResponse[] = [];
    
    this.logger.info('Executing sequential searches', { 
      totalQueries: queries.length, 
      resultsPerQuery 
    });

    // Simple sequential execution - no batching, no retries, just rate limiting
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
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build context-specific search queries with recency enhancements
   */
  private buildSearchQueries(request: SalesIntelligenceRequest): string[] {
    const targetCompany = this.extractCompanyName(request.companyDomain);
    const sellerCompany = request.sellerCompany;
    
    // Perplexity-style: Context-aware relationship queries when seller info available
    if (sellerCompany) {
      return this.buildRelationshipAwareQueries(targetCompany, sellerCompany, request.salesContext);
    }
    
    // Fallback to generic queries if no seller info
    return this.buildGenericQueries(targetCompany, request.salesContext);
  }

  /**
   * Build relationship-aware queries following Perplexity's approach
   * Example: "Atlassian selling to Shopify" -> queries about both companies and their relationship
   */
  private buildRelationshipAwareQueries(targetCompany: string, sellerCompany: string, context: SalesContext): string[] {
    const baseQueries = [
      // 1. Who are they? (target company overview)
      `${targetCompany} company overview`,
      
      // 2. What problems do they have? (context-aware challenges)
      this.getTargetChallengesQuery(targetCompany, context),
      
      // 3. Existing relationship? (partnership/integration potential)
      this.getRelationshipQuery(targetCompany, sellerCompany, context)
    ];
    
    return baseQueries;
  }

  /**
   * Fallback generic queries when no seller context available
   */
  private buildGenericQueries(targetCompany: string, context: SalesContext): string[] {
    const baseQueries = [
      `${targetCompany} company overview`,
      `${targetCompany} news 2024`
    ];
    
    // Add one context-specific query to reach 3 total
    const contextQueries = this.getContextSpecificQueries(targetCompany, context);
    return [...baseQueries, ...contextQueries.slice(0, 1)];
  }

  /**
   * Get target company challenges query based on sales context
   */
  private getTargetChallengesQuery(targetCompany: string, context: SalesContext): string {
    const challengeQueryMap: Record<SalesContext, string> = {
      discovery: `${targetCompany} digital transformation challenges`,
      competitive: `${targetCompany} technology stack problems`,
      renewal: `${targetCompany} vendor management issues`,
      demo: `${targetCompany} technical requirements needs`,
      negotiation: `${targetCompany} procurement challenges`,
      closing: `${targetCompany} implementation challenges`
    };
    
    return challengeQueryMap[context] || `${targetCompany} business challenges 2024`;
  }

  /**
   * Get relationship query between seller and target company
   */
  private getRelationshipQuery(targetCompany: string, sellerCompany: string, context: SalesContext): string {
    const relationshipQueryMap: Record<SalesContext, string> = {
      discovery: `${sellerCompany} ${targetCompany} partnership integration`,
      competitive: `${sellerCompany} ${targetCompany} case study success`,
      renewal: `${sellerCompany} ${targetCompany} contract renewal`,
      demo: `${sellerCompany} ${targetCompany} technical integration`,
      negotiation: `${sellerCompany} ${targetCompany} vendor selection`,
      closing: `${sellerCompany} ${targetCompany} implementation`
    };
    
    return relationshipQueryMap[context] || `${sellerCompany} ${targetCompany} partnership`;
  }

  /**
   * Get queries specific to sales context with recency enhancements
   */
  private getContextSpecificQueries(companyName: string, context: SalesContext): string[] {
    // Perplexity-style: simple, focused queries for each sales context
    const queryMap: Record<SalesContext, string[]> = {
      discovery: [
        `${companyName} growth initiatives 2024`
      ],
      competitive: [
        `${companyName} competitors analysis`
      ],
      renewal: [
        `${companyName} vendor contracts`
      ],
      demo: [
        `${companyName} technical requirements`
      ],
      negotiation: [
        `${companyName} procurement process`
      ],
      closing: [
        `${companyName} implementation timeline`
      ]
    };

    return queryMap[context] || [];
  }

  /**
   * Extract company name from domain
   */
  private extractCompanyName(domain: string): string {
    // Remove common prefixes and suffixes
    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('.')[0];
    
    // Convert to title case and handle common cases
    return cleanDomain
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Calculate confidence score based on available data
   */
  private calculateConfidenceScore(contentCount: number, successfulFetches: number): number {
    // Base score on content volume and fetch success rate
    const volumeScore = Math.min(contentCount / 10, 1); // Max at 10 pieces of content
    const successRate = successfulFetches > 0 ? contentCount / successfulFetches : 0;
    
    return Math.round((volumeScore * 0.7 + successRate * 0.3) * 100) / 100;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Enhanced source type determination to better categorize sources
   */
  private determineSourceType(url: string): 'news' | 'company' | 'blog' | 'social' | 'press_release' | 'report' | 'financial' | 'educational' | 'other' {
    const domain = this.extractDomain(url);
    const urlLower = url.toLowerCase();
    
    // Financial and stock sites
    if (domain.includes('finance.yahoo.com') || 
        domain.includes('marketwatch.com') || 
        domain.includes('bloomberg.com') || 
        domain.includes('reuters.com') || 
        domain.includes('sec.gov') ||
        domain.includes('nasdaq.com') ||
        domain.includes('crunchbase.com') ||
        urlLower.includes('stock') || 
        urlLower.includes('investor') || 
        urlLower.includes('earnings')) {
      return 'financial';
    }
    
    // Educational and tutorial sites
    if (domain.includes('wikipedia.org') || 
        domain.includes('simplilearn.com') || 
        domain.includes('coursera.org') || 
        domain.includes('udemy.com') ||
        domain.includes('youtube.com') ||
        urlLower.includes('tutorial') || 
        urlLower.includes('guide') || 
        urlLower.includes('learn') ||
        urlLower.includes('explained')) {
      return 'educational';
    }
    
    // News sites
    if (domain.includes('techcrunch.com') || 
        domain.includes('venturebeat.com') || 
        domain.includes('businessinsider.com') || 
        domain.includes('forbes.com') || 
        domain.includes('reuters.com') || 
        domain.includes('cnn.com') || 
        domain.includes('bbc.com') || 
        domain.includes('wsj.com') || 
        domain.includes('nytimes.com') ||
        urlLower.includes('news') || 
        urlLower.includes('press')) {
      return 'news';
    }
    
    // Press releases
    if (urlLower.includes('press-release') || 
        urlLower.includes('press_release') || 
        urlLower.includes('newsroom') || 
        urlLower.includes('/news/') ||
        domain.includes('prnewswire.com') || 
        domain.includes('businesswire.com')) {
      return 'press_release';
    }
    
    // Company/official sources
    if (urlLower.includes('/about') || 
        urlLower.includes('/company') || 
        urlLower.includes('/investor') || 
        urlLower.includes('careers') ||
        urlLower.includes('/our-') ||
        domain.includes('.com') && !domain.includes('blog')) {
      return 'company';
    }
    
    // Social media
    if (domain.includes('linkedin.com') || 
        domain.includes('twitter.com') || 
        domain.includes('facebook.com') || 
        domain.includes('instagram.com') || 
        domain.includes('youtube.com')) {
      return 'social';
    }
    
    // Blog sites
    if (domain.includes('medium.com') || 
        urlLower.includes('blog') || 
        urlLower.includes('/post/') || 
        urlLower.includes('/article/')) {
      return 'blog';
    }
    
    // Research and reports
    if (domain.includes('gartner.com') || 
        domain.includes('forrester.com') || 
        domain.includes('mckinsey.com') || 
        urlLower.includes('research') || 
        urlLower.includes('report') || 
        urlLower.includes('analysis')) {
      return 'report';
    }
    
    return 'other';
  }

  /**
   * Calculate enhanced credibility score for a domain with detailed authority assessment
   */
  private calculateCredibilityScore(domain: string): number {
    const domainLower = domain.toLowerCase();
    
    // Tier 1: Highest credibility sources (financial, government, major news)
    const tier1Domains = [
      // Financial & Business Authority
      'sec.gov', 'edgar.gov', 'irs.gov', 'treasury.gov',
      'bloomberg.com', 'reuters.com', 'wsj.com', 'ft.com', 'economist.com',
      'marketwatch.com', 'barrons.com', 'morningstar.com',
      
      // Major News Organizations
      'nytimes.com', 'washingtonpost.com', 'bbc.com', 'cnn.com', 'npr.org',
      'apnews.com', 'usatoday.com', 'abcnews.go.com',
      
      // Professional Research & Analysis
      'mckinsey.com', 'bcg.com', 'bain.com', 'deloitte.com', 'pwc.com',
      'kpmg.com', 'ey.com', 'accenture.com',
      
      // Industry Authority
      'crunchbase.com', 'pitchbook.com', 'cbinsights.com'
    ];
    
    // Tier 2: High credibility sources (tech news, industry publications)
    const tier2Domains = [
      // Technology & Business News
      'techcrunch.com', 'venturebeat.com', 'wired.com', 'arstechnica.com',
      'engadget.com', 'theverge.com', 'zdnet.com', 'cnet.com',
      'forbes.com', 'businessinsider.com', 'cnbc.com', 'fortune.com',
      'inc.com', 'fastcompany.com', 'hbr.org',
      
      // Industry Specific
      'salesforce.com', 'hubspot.com', 'gartner.com', 'forrester.com',
      'idc.com', 'statista.com'
    ];
    
    // Tier 3: Medium credibility sources (professional networks, specialized sites)
    const tier3Domains = [
      // Professional Networks
      'linkedin.com', 'glassdoor.com', 'indeed.com', 'angel.co',
      
      // Information Resources
      'wikipedia.org', 'github.com', 'stackoverflow.com',
      
      // Academic & Educational
      'edu', '.ac.uk', '.edu.au', 'harvard.edu', 'mit.edu', 'stanford.edu'
    ];
    
    // Tier 4: Company websites and PR sources
    const tier4Patterns = [
      'investor', 'ir.', 'about.', 'newsroom.', 'press.',
      '.com', '.co', '.org', '.net'
    ];
    
    // Check domain tiers
    if (tier1Domains.includes(domainLower)) {
      return 0.95; // Highest authority
    }
    
    if (tier2Domains.includes(domainLower)) {
      return 0.85; // High authority
    }
    
    if (tier3Domains.some(domain => domainLower.includes(domain))) {
      return 0.75; // Medium-high authority
    }
    
    // Check for educational domains
    if (domainLower.includes('.edu') || domainLower.includes('.ac.')) {
      return 0.80; // Academic sources get high credibility
    }
    
    // Check for government domains
    if (domainLower.includes('.gov') || domainLower.includes('.mil')) {
      return 0.90; // Government sources get very high credibility
    }
    
    // Check for investor relations and official company sources
    if (tier4Patterns.some(pattern => domainLower.includes(pattern))) {
      // Company official sources get medium credibility
      if (domainLower.includes('investor') || domainLower.includes('ir.')) {
        return 0.70; // IR pages are more credible
      }
      return 0.60; // General company pages
    }
    
    return 0.50; // Default credibility for unknown sources
  }

  /**
   * Extract author information from content
   */
  private extractAuthor(content: string, url: string): string | undefined {
    try {
      // Common author patterns in content
      const authorPatterns = [
        /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /author[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /written\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /"author":\s*"([^"]+)"/i,
        /'author':\s*'([^']+)'/i
      ];

      for (const pattern of authorPatterns) {
        const match = content.match(pattern);
        if (match && match[1] && match[1].length > 2 && match[1].length < 50) {
          return match[1].trim();
        }
      }

      // Check for LinkedIn profiles as authors
      if (url.includes('linkedin.com')) {
        const linkedinMatch = url.match(/linkedin\.com\/in\/([^/]+)/);
        if (linkedinMatch) {
          return linkedinMatch[1].replace(/-/g, ' ');
        }
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extract publication date from content
   */
  private extractPublicationDate(content: string): string | undefined {
    try {
      // Common date patterns
      const datePatterns = [
        /"datePublished":\s*"([^"]+)"/i,
        /"publishedAt":\s*"([^"]+)"/i,
        /"date":\s*"([^"]+)"/i,
        /published[:\s]+(\d{4}-\d{2}-\d{2})/i,
        /(\w+\s+\d{1,2},\s+\d{4})/i, // "January 15, 2025"
        /(\d{1,2}\/\d{1,2}\/\d{4})/i, // "01/15/2025"
        /(\d{4}-\d{2}-\d{2})/i // "2025-01-15"
      ];

      for (const pattern of datePatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1];
          // Validate it's a reasonable date
          const date = new Date(dateStr);
          if (date.getFullYear() >= 2020 && date.getFullYear() <= new Date().getFullYear() + 1) {
            return date.toISOString();
          }
        }
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Calculate comprehensive credibility score including author and date factors
   */
  private calculateComprehensiveCredibilityScore(
    domain: string, 
    content: string, 
    url: string
  ): number {
    let baseScore = this.calculateCredibilityScore(domain);
    
    // Author factor
    const author = this.extractAuthor(content, url);
    if (author) {
      baseScore += 0.05; // Small boost for having an identifiable author
    }
    
    // Recency factor
    const publishDate = this.extractPublicationDate(content);
    if (publishDate) {
      const pubDate = new Date(publishDate);
      const now = new Date();
      const daysDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 90) {
        baseScore += 0.10; // Recent content gets significant boost
      } else if (daysDiff <= 365) {
        baseScore += 0.05; // Moderately recent gets small boost
      }
      // Older content doesn't get penalized, just no boost
    }
    
    // Content quality indicators
    if (content.length > 1000) {
      baseScore += 0.02; // Longer content often indicates more thorough reporting
    }
    
    // Cap at 1.0
    return Math.min(baseScore, 1.0);
  }

  /**
   * Calculate relevancy score for content based on company mention and context
   */
  private calculateRelevancyScore(
    content: string, 
    companyName: string, 
    url: string, 
    snippet: string
  ): number {
    let relevancyScore = 0.0;
    const contentLower = content.toLowerCase();
    const companyLower = companyName.toLowerCase();
    const snippetLower = snippet.toLowerCase();
    
    // Company name mentions (highest relevancy indicator)
    const exactMatches = (contentLower.match(new RegExp(`\\b${companyLower}\\b`, 'g')) || []).length;
    if (exactMatches > 0) {
      relevancyScore += Math.min(exactMatches * 0.3, 0.6); // Up to 0.6 for company mentions
    }
    
    // Company name in URL or title
    if (url.toLowerCase().includes(companyLower)) {
      relevancyScore += 0.2;
    }
    
    // Company name in snippet
    if (snippetLower.includes(companyLower)) {
      relevancyScore += 0.15;
    }
    
    // Business-relevant keywords
    const businessKeywords = [
      'revenue', 'funding', 'growth', 'employees', 'strategy', 'expansion',
      'acquisition', 'merger', 'leadership', 'ceo', 'cfo', 'executives',
      'market', 'industry', 'competition', 'customers', 'products', 'services',
      'technology', 'innovation', 'investment', 'valuation', 'ipo'
    ];
    
    const keywordMatches = businessKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    
    relevancyScore += Math.min(keywordMatches * 0.02, 0.2); // Up to 0.2 for business keywords
    
    // Content length factor (very short content is often not useful)
    if (content.length < 200) {
      relevancyScore *= 0.5; // Penalize very short content
    } else if (content.length > 1000) {
      relevancyScore += 0.1; // Bonus for substantial content
    }
    
    return Math.min(relevancyScore, 1.0);
  }

  /**
   * Filter content by relevancy threshold
   */
  private filterByRelevancy(
    fetchResults: { content: string | null; [key: string]: any }[],
    urls: string[],
    searchResults: any[],
    companyName: string,
    threshold: number = 0.3
  ): {
    filteredResults: { content: string | null; [key: string]: any }[];
    filteredUrls: string[];
    relevancyScores: number[];
  } {
    const relevancyData: Array<{
      result: { content: string | null; [key: string]: any };
      url: string;
      score: number;
      index: number;
    }> = [];

    // Calculate relevancy scores for all successful fetches
    for (let i = 0; i < fetchResults.length; i++) {
      if (fetchResults[i].content !== null) {
        const url = urls[i];
        const searchResult = searchResults.find(r => r.url === url);
        const snippet = searchResult?.snippet || '';
        
        const score = this.calculateRelevancyScore(
          fetchResults[i].content!,
          companyName,
          url,
          snippet
        );
        
        relevancyData.push({
          result: fetchResults[i],
          url: url,
          score: score,
          index: i
        });
      }
    }

    // Sort by relevancy score (highest first) and filter by threshold
    const filtered = relevancyData
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score);

    this.logger.info('Content relevancy filtering', {
      totalContent: relevancyData.length,
      filteredContent: filtered.length,
      averageRelevancy: relevancyData.reduce((sum, item) => sum + item.score, 0) / relevancyData.length,
      threshold
    });

    return {
      filteredResults: filtered.map(item => item.result),
      filteredUrls: filtered.map(item => item.url),
      relevancyScores: filtered.map(item => item.score)
    };
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: SalesIntelligenceRequest): string {
    const keyData = `${request.companyDomain}:${request.salesContext}:${request.additionalContext || ''}`;
    
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `sales_intel_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Parse natural language input and generate dynamic search queries (Chat Interface Support)
   * Examples: 
   * - "Tell me about Shopify's challenges" -> generates challenge-focused queries
   * - "How can Atlassian help Shopify?" -> generates relationship queries
   * - "What's Shopify's technology stack?" -> generates tech-focused queries
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
    const intent = this.detectUserIntent(userInput);
    const extractedCompanies = this.extractCompaniesFromInput(userInput, targetCompany, sellerCompany);
    
    const queries = this.buildQueriesFromIntent(
      intent, 
      extractedCompanies.target, 
      extractedCompanies.seller
    );
    
    return {
      queries,
      intent: intent.type,
      confidence: intent.confidence
    };
  }

  /**
   * Detect user intent from natural language input
   */
  private detectUserIntent(input: string): { type: string; confidence: number } {
    // Intent patterns with confidence scores
    const intentPatterns = [
      { pattern: /(?:challenge|problem|issue|pain|difficult)/i, type: 'challenges', confidence: 0.9 },
      { pattern: /(?:partnership|integration|work together|collaborate)/i, type: 'relationship', confidence: 0.9 },
      { pattern: /(?:technology|tech stack|software|tools|platform)/i, type: 'technology', confidence: 0.8 },
      { pattern: /(?:competitor|competition|versus|vs|compare)/i, type: 'competitive', confidence: 0.8 },
      { pattern: /(?:financial|revenue|funding|valuation|money)/i, type: 'financial', confidence: 0.8 },
      { pattern: /(?:news|recent|latest|update|development)/i, type: 'news', confidence: 0.7 },
      { pattern: /(?:leadership|ceo|executive|team|management)/i, type: 'leadership', confidence: 0.7 },
      { pattern: /(?:how can|help|solution|benefit)/i, type: 'solution', confidence: 0.8 },
      { pattern: /(?:overview|about|summary|profile)/i, type: 'overview', confidence: 0.6 }
    ];
    
    for (const { pattern, type, confidence } of intentPatterns) {
      if (pattern.test(input)) {
        return { type, confidence };
      }
    }
    
    return { type: 'overview', confidence: 0.5 }; // Default fallback
  }

  /**
   * Extract company names from user input
   */
  private extractCompaniesFromInput(
    input: string, 
    defaultTarget?: string, 
    defaultSeller?: string
  ): { target: string; seller?: string } {
    // Simple extraction - could be enhanced with NER
    const words = input.toLowerCase().split(/\s+/);
    
    // Look for company names in input
    const knownCompanies = ['shopify', 'atlassian', 'google', 'microsoft', 'amazon', 'apple', 'meta', 'salesforce'];
    const foundCompanies = words.filter(word => 
      knownCompanies.some(company => company.includes(word) || word.includes(company))
    );
    
    return {
      target: foundCompanies[0] || defaultTarget || 'target company',
      seller: foundCompanies[1] || defaultSeller
    };
  }

  /**
   * Build queries based on detected intent
   */
  private buildQueriesFromIntent(
    intent: { type: string; confidence: number },
    targetCompany: string,
    sellerCompany?: string
  ): string[] {
    const queryStrategies: Record<string, (target: string, seller?: string) => string[]> = {
      challenges: (target, seller) => [
        `${target} business challenges 2024`,
        `${target} digital transformation problems`,
        seller ? `${seller} ${target} solution case study` : `${target} technology challenges`
      ],
      
      relationship: (target, seller) => [
        seller ? `${seller} ${target} partnership` : `${target} partnerships`,
        seller ? `${seller} ${target} integration` : `${target} technology integrations`,
        seller ? `${seller} ${target} case study` : `${target} vendor relationships`
      ],
      
      technology: (target, seller) => [
        `${target} technology stack 2024`,
        `${target} software tools platform`,
        seller ? `${seller} ${target} technical integration` : `${target} technology modernization`
      ],
      
      competitive: (target, seller) => [
        `${target} competitors analysis`,
        `${target} market position`,
        seller ? `${seller} ${target} competitive advantage` : `${target} competitive landscape`
      ],
      
      financial: (target, seller) => [
        `${target} financial results 2024`,
        `${target} revenue funding valuation`,
        `${target} business model growth`
      ],
      
      leadership: (target, seller) => [
        `${target} leadership team executives`,
        `${target} CEO management team`,
        `${target} organizational structure`
      ],
      
      solution: (target, seller) => [
        seller ? `${seller} solutions for ${target}` : `${target} solution needs`,
        seller ? `${seller} ${target} benefits` : `${target} technology solutions`,
        seller ? `${seller} ${target} success story` : `${target} vendor evaluation`
      ],
      
      news: (target, seller) => [
        `${target} latest news 2024`,
        `${target} recent developments`,
        `${target} company updates announcements`
      ],
      
      overview: (target, seller) => [
        `${target} company overview`,
        `${target} business model products`,
        `${target} market position industry`
      ]
    };
    
    const strategy = queryStrategies[intent.type] || queryStrategies.overview;
    return strategy(targetCompany, sellerCompany);
  }

  /**
   * Parse user input using AI for extracting company and sales context (legacy method)
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
   * Prioritize sources by type to improve coverage and credibility.
   * This is a simplified example and would need more sophisticated logic
   * based on actual domain expertise and source types.
   */
  private prioritizeSourcesByType(
    urls: string[],
    searchResults: any[],
    companyDomain: string
  ): string[] {
    const prioritized: string[] = [];
    const companyLower = this.extractCompanyName(companyDomain).toLowerCase();

    // 1. Official company sources (highest priority)
    const officialSources = searchResults.filter(r => 
      r.url.includes(companyDomain) || r.url.includes(`site:${companyDomain}`)
    );
    prioritized.push(...officialSources.map(r => r.url));

    // 2. News and authoritative news sites
    const newsSources = searchResults.filter(r => 
      r.sourceType === 'news' || r.sourceType === 'press_release' || r.sourceType === 'report'
    );
    prioritized.push(...newsSources.map(r => r.url));

    // 3. Blogs and industry publications
    const blogSources = searchResults.filter(r => 
      r.sourceType === 'blog' || r.sourceType === 'report'
    );
    prioritized.push(...blogSources.map(r => r.url));

    // 4. Professional networks and directories
    const professionalSources = searchResults.filter(r => 
      r.sourceType === 'social' || r.sourceType === 'company'
    );
    prioritized.push(...professionalSources.map(r => r.url));

    // 5. General web pages (fallback)
    const remainingUrls = urls.filter(url => !prioritized.includes(url));
    prioritized.push(...remainingUrls);

    return prioritized;
  }
} 