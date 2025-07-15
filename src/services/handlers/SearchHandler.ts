/**
 * Search Handler
 * 
 * Handles search operations with optional relationship-aware queries.
 * Provides fast search results without content analysis.
 */

import { BaseEndpointHandler } from './BaseEndpointHandler';
import { SearchResponseFormatter, SearchResponse } from '../formatters/SearchResponseFormatter';
import { SearchEngine } from '../search/SearchEngine';
import { SearchQueryBuilder } from '../search/SearchQueryBuilder';
import { SearchEngineResponse, SalesContext, SalesIntelligenceRequest } from '@/types';

export class SearchHandler extends BaseEndpointHandler {
  private readonly searchEngine: SearchEngine;
  private readonly maxResultsPerQuery: number;

  constructor(
    searchEngine: SearchEngine,
    maxResultsPerQuery: number,
    cache: any,
    logger: any,
    contentFilter: any
  ) {
    super(cache, logger, contentFilter);
    this.searchEngine = searchEngine;
    this.maxResultsPerQuery = maxResultsPerQuery;
  }

  /**
   * Perform search and return raw results (fast endpoint)
   */
  async performSearch(domain: string, context: SalesContext): Promise<SearchResponse> {
    const startTime = Date.now();
    const companyName = this.extractCompanyName(domain);
    
    this.logger.info('Performing search', { 
      domain, 
      context, 
      companyName
    });

    // Build context-specific queries using focused service
    const queries = SearchQueryBuilder.buildSearchQueries({ 
      companyDomain: domain, 
      salesContext: context 
    });
    
    // Perform searches using batched approach
    const results = await this.executeBatchedSearches(queries);
    const searchTime = Date.now() - startTime;
    
    const totalResults = results.reduce((total, response) => total + response.results.length, 0);
    
    this.logger.info('Search completed', { domain, context, totalResults, searchTime });

    return SearchResponseFormatter.formatSearchResponse(
      queries,
      results,
      totalResults,
      searchTime,
      domain,
      context
    );
  }

  /**
   * Enhanced search with optional seller context for relationship-aware queries
   */
  async performSearchWithContext(
    domain: string, 
    context: SalesContext, 
    sellerCompany?: string,
    sellerDomain?: string
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    const companyName = this.extractCompanyName(domain);
    
    this.logger.info('Performing enhanced search', { 
      domain, 
      context, 
      companyName, 
      sellerCompany, 
      relationshipAware: !!sellerCompany
    });

    // Build relationship-aware queries using focused service
    const request: SalesIntelligenceRequest = {
      companyDomain: domain,
      salesContext: context,
      sellerCompany,
      sellerDomain
    };

    const queries = SearchQueryBuilder.buildSearchQueries(request);
    
    // Perform searches
    const results = await this.executeBatchedSearches(queries);
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

    return SearchResponseFormatter.formatSearchResponse(
      queries,
      results,
      totalResults,
      searchTime,
      domain,
      context,
      !!sellerCompany
    );
  }

  /**
   * Execute searches sequentially to respect rate limiting
   */
  private async executeBatchedSearches(queries: string[]): Promise<SearchEngineResponse[]> {
    const results: SearchEngineResponse[] = [];
    
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
} 