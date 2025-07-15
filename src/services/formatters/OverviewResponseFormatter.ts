/**
 * Overview Response Formatter
 * 
 * Handles formatting of company overview results with comprehensive
 * company information, sources, and confidence scoring.
 */

import { AuthoritativeSource } from '@/types';

export interface OverviewResponse {
  name: string;
  domain: string;
  sources: AuthoritativeSource[];
  confidence?: {
    overall: number;
    [key: string]: any;
  };
  [key: string]: any; // Allow additional properties from AI analysis
}

export class OverviewResponseFormatter {
  /**
   * Format overview result for API response
   */
  static formatOverviewResponse(overview: any): OverviewResponse {
    return {
      name: overview.name || 'Unknown',
      domain: overview.domain || 'Unknown',
      sources: overview.sources || [],
      confidence: overview.confidence || { overall: 0.8 },
      ...overview // Spread all other properties
    };
  }

  /**
   * Format error response
   */
  static formatErrorResponse(error: string, domain: string): OverviewResponse {
    return {
      name: domain,
      domain,
      sources: [],
      confidence: { overall: 0 },
      error: `Error generating overview for ${domain}: ${error}`,
      generatedAt: new Date().toISOString()
    };
  }
} 