/**
 * Search Query Builder Service
 * 
 * Handles building context-aware search queries for different sales contexts,
 * company relationships, and search strategies.
 */

import { SalesContext, SalesIntelligenceRequest } from '@/types';
import { CompanyExtractor } from './CompanyExtractor';

export interface QueryStrategy {
  queries: string[];
  strategy: 'generic' | 'relationship-aware' | 'context-specific';
  targetCompany: string;
  sellerCompany?: string;
  context: SalesContext;
}

export class SearchQueryBuilder {
  
  /**
   * Build context-specific search queries with recency enhancements
   */
  static buildSearchQueries(request: SalesIntelligenceRequest): string[] {
    const targetCompany = CompanyExtractor.extractCompanyName(request.companyDomain);
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
  static buildRelationshipAwareQueries(targetCompany: string, sellerCompany: string, context: SalesContext): string[] {
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
  static buildGenericQueries(targetCompany: string, context: SalesContext): string[] {
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
  static getTargetChallengesQuery(targetCompany: string, context: SalesContext): string {
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
  static getRelationshipQuery(targetCompany: string, sellerCompany: string, context: SalesContext): string {
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
  static getContextSpecificQueries(companyName: string, context: SalesContext): string[] {
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
   * Build comprehensive company overview queries (used by getCompanyOverview)
   */
  static buildCompanyOverviewQueries(companyName: string): string[] {
    // Perplexity-style strategy: 3 simple, strategic queries targeting different information spaces
    // Trust Google's algorithm to surface the best sources naturally
    return [
      // 1. Company basics - let Google find official sites, Wikipedia, Crunchbase naturally
      `${companyName} company overview`,
      
      // 2. Business intelligence - financial and operational data  
      `${companyName} business model revenue financials`,
      
      // 3. Recent developments - current news and market changes
      `${companyName} news 2024`
    ];
  }

  /**
   * Build discovery-focused queries (used by getDiscoveryInsights)
   */
  static buildDiscoveryQueries(companyName: string): string[] {
    // Perplexity-style: 3 simple discovery queries
    return [
      `${companyName} challenges problems 2024`,
      `${companyName} growth initiatives`,
      `${companyName} leadership team`
    ];
  }

  /**
   * Build queries from detected user intent (for chat interface)
   */
  static buildQueriesFromIntent(
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
   * Build industry-specific queries
   */
  static buildIndustryQueries(companyName: string, industry?: string): string[] {
    const baseQuery = `${companyName} company overview`;
    
    if (!industry) {
      return [baseQuery, `${companyName} industry market`, `${companyName} competitors`];
    }

    return [
      baseQuery,
      `${companyName} ${industry} market trends`,
      `${companyName} ${industry} competitive landscape`
    ];
  }

  /**
   * Build time-sensitive queries with recency focus
   */
  static buildRecentQueries(companyName: string, timeframe: 'week' | 'month' | 'quarter' | 'year' = 'quarter'): string[] {
    const timeframeMap = {
      week: 'past week',
      month: 'past month', 
      quarter: 'past 3 months',
      year: '2024'
    };

    const period = timeframeMap[timeframe];

    return [
      `${companyName} news ${period}`,
      `${companyName} updates announcements ${period}`,
      `${companyName} developments ${period}`
    ];
  }

  /**
   * Build competitive analysis queries
   */
  static buildCompetitiveQueries(targetCompany: string, competitorCompany?: string): string[] {
    if (competitorCompany) {
      return [
        `${targetCompany} vs ${competitorCompany} comparison`,
        `${targetCompany} ${competitorCompany} market share`,
        `${targetCompany} ${competitorCompany} competitive analysis`
      ];
    }

    return [
      `${targetCompany} competitors market`,
      `${targetCompany} competitive analysis`,
      `${targetCompany} market position industry`
    ];
  }

  /**
   * Build financial research queries
   */
  static buildFinancialQueries(companyName: string): string[] {
    return [
      `${companyName} financial results revenue`,
      `${companyName} funding valuation investment`,
      `${companyName} earnings financial performance`
    ];
  }

  /**
   * Build technology stack queries
   */
  static buildTechnologyQueries(companyName: string): string[] {
    return [
      `${companyName} technology stack tools`,
      `${companyName} software infrastructure`,
      `${companyName} technical architecture platform`
    ];
  }

  /**
   * Get a complete query strategy based on request type
   */
  static getQueryStrategy(request: SalesIntelligenceRequest, strategyType?: 'comprehensive' | 'focused' | 'recent'): QueryStrategy {
    const targetCompany = CompanyExtractor.extractCompanyName(request.companyDomain);
    
    let queries: string[];
    let strategy: 'generic' | 'relationship-aware' | 'context-specific';

    if (request.sellerCompany) {
      queries = this.buildRelationshipAwareQueries(targetCompany, request.sellerCompany, request.salesContext);
      strategy = 'relationship-aware';
    } else {
      switch (strategyType) {
        case 'comprehensive':
          queries = this.buildCompanyOverviewQueries(targetCompany);
          break;
        case 'recent':
          queries = this.buildRecentQueries(targetCompany);
          break;
        case 'focused':
        default:
          queries = this.buildGenericQueries(targetCompany, request.salesContext);
          break;
      }
      strategy = 'context-specific';
    }

    return {
      queries,
      strategy,
      targetCompany,
      sellerCompany: request.sellerCompany,
      context: request.salesContext
    };
  }
} 