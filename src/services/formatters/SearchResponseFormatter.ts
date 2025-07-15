/**
 * Search Response Formatter
 * 
 * Handles formatting of search results for search endpoints.
 * Provides consistent search response structure with metadata.
 */

import { SearchEngineResponse, SalesContext } from '@/types';

export interface SearchResponse {
  queries: string[];
  results: SearchEngineResponse[];
  totalResults: number;
  searchTime: number;
  relationshipAware?: boolean;
  domain: string;
  context: SalesContext;
  generatedAt: string;
  error?: string;
}

export class SearchResponseFormatter {
  /**
   * Format search result for API response
   */
  static formatSearchResponse(
    queries: string[],
    results: SearchEngineResponse[],
    totalResults: number,
    searchTime: number,
    domain: string,
    context: SalesContext,
    relationshipAware?: boolean
  ): SearchResponse {
    return {
      queries,
      results,
      totalResults,
      searchTime,
      domain,
      context,
      relationshipAware,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Format error response
   */
  static formatErrorResponse(
    error: string, 
    domain: string, 
    context: SalesContext
  ): SearchResponse {
    return {
      queries: [],
      results: [],
      totalResults: 0,
      searchTime: 0,
      domain,
      context,
      relationshipAware: false,
      generatedAt: new Date().toISOString(),
      error: `Error performing search for ${domain}: ${error}`
    };
  }
} 