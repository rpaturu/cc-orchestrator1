/**
 * Analysis Response Formatter
 * 
 * Handles formatting of AI analysis results for the analysis endpoint.
 * Provides comprehensive analysis with insights, sources, and confidence scoring.
 */

import { ContentAnalysis } from '@/types';

export interface AnalysisResponse extends ContentAnalysis {
  // Analysis response is the same as ContentAnalysis
  // but we can extend it if needed for specific formatting
}

export class AnalysisResponseFormatter {
  /**
   * Format analysis result for API response
   */
  static formatAnalysisResponse(analysis: ContentAnalysis): AnalysisResponse {
    return {
      ...analysis,
      // Add any additional formatting if needed
    };
  }

  /**
   * Format error response
   */
  static formatErrorResponse(error: string, domain: string): Partial<AnalysisResponse> {
    return {
      insights: {
        companyOverview: {
          name: domain,
          size: 'Unknown',
          sizeCitations: [],
          industry: 'Unknown',
          revenue: 'Unknown',
          revenueCitations: [],
          recentNews: [],
          growth: {
            hiring: false,
            hiringCitations: [],
            funding: false,
            fundingCitations: [],
            expansion: false,
            expansionCitations: [],
            newProducts: false,
            partnerships: false
          },
          challenges: []
        },
        painPoints: [{ text: `Error analyzing ${domain}: ${error}`, citations: [] }],
        technologyStack: {
          current: [],
          planned: [],
          vendors: [],
          modernizationAreas: []
        },
        keyContacts: [],
        competitiveLandscape: {
          competitors: [],
          marketPosition: '',
          differentiators: [],
          vulnerabilities: [],
          battleCards: []
        },
        talkingPoints: [],
        potentialObjections: [],
        recommendedActions: [],
        dealProbability: 0,
        dealProbabilityCitations: []
      },
      sources: [],
      confidenceScore: 0,
      generatedAt: new Date(),
      totalSources: 0,
      citationMap: {}
    };
  }
} 