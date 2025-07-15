/**
 * Discovery Response Formatter
 * 
 * Handles formatting of discovery insights into the enhanced response structure
 * with pain points, opportunities, contacts, and technology stack.
 */

import { AuthoritativeSource } from '@/types';

export interface DiscoveryResponse {
  painPoints: Array<{
    text: string;
    citations: number[];
    severity?: 'high' | 'medium' | 'low';
  }>;
  opportunities: Array<{
    text: string;
    type: 'hiring' | 'funding' | 'expansion' | 'products' | 'partnerships' | 'other';
    potential?: 'high' | 'medium' | 'low';
    citations?: number[];
  }>;
  keyContacts: Array<{
    name: string;
    title: string;
    department?: string;
    influence: 'high' | 'medium' | 'low';
    approachStrategy: string;
    linkedin?: string;
    email?: string;
  }>;
  technologyStack: Array<{
    name: string;
    category: 'current' | 'planned' | 'vendor' | 'modernization';
    description?: string;
  }>;
  companyOverview: {
    name: string;
    industry: string;
    size: string;
    revenue?: string;
    recentGrowth: boolean;
    challengeAreas: string[];
  };
  sources: AuthoritativeSource[];
  confidenceScore: number;
}

export class DiscoveryResponseFormatter {
  /**
   * Format discovery insights into enhanced response structure
   */
  static formatResponse(insights: any, sources: AuthoritativeSource[], confidenceScore: number): DiscoveryResponse {
    return {
      painPoints: this.formatPainPoints(insights.painPoints),
      opportunities: this.formatOpportunities(insights.companyOverview.growth),
      keyContacts: this.formatKeyContacts(insights.keyContacts),
      technologyStack: this.formatTechnologyStack(insights.technologyStack),
      companyOverview: this.formatCompanyOverview(insights.companyOverview),
      sources,
      confidenceScore
    };
  }

  /**
   * Format pain points with severity assessment
   */
  private static formatPainPoints(painPoints: any[]): DiscoveryResponse['painPoints'] {
    return painPoints.map((p: any) => ({
      text: p.text,
      citations: p.citations || [],
      severity: this.assessSeverity(p.text)
    }));
  }

  /**
   * Format opportunities from growth indicators
   */
  private static formatOpportunities(growth: any): DiscoveryResponse['opportunities'] {
    const opportunities: DiscoveryResponse['opportunities'] = [];
    
    if (growth) {
      if (growth.hiring) {
        opportunities.push({
          text: 'Active hiring and team expansion',
          type: 'hiring',
          potential: 'high',
          citations: growth.hiringCitations || []
        });
      }
      if (growth.funding) {
        opportunities.push({
          text: 'Recent funding or investment activity',
          type: 'funding',
          potential: 'high',
          citations: growth.fundingCitations || []
        });
      }
      if (growth.expansion) {
        opportunities.push({
          text: 'Business expansion and market growth',
          type: 'expansion',
          potential: 'medium',
          citations: growth.expansionCitations || []
        });
      }
      if (growth.newProducts) {
        opportunities.push({
          text: 'New product launches and innovation',
          type: 'products',
          potential: 'high'
        });
      }
      if (growth.partnerships) {
        opportunities.push({
          text: 'Strategic partnerships and collaborations',
          type: 'partnerships',
          potential: 'medium'
        });
      }
    }
    
    return opportunities;
  }

  /**
   * Format key contacts with enriched information
   */
  private static formatKeyContacts(keyContacts: any[]): DiscoveryResponse['keyContacts'] {
    return keyContacts.map((c: any) => ({
      name: c.name,
      title: c.title,
      department: c.department,
      influence: c.influence || 'medium',
      approachStrategy: c.approachStrategy,
      linkedin: c.linkedin,
      email: c.email
    }));
  }

  /**
   * Format technology stack with categories
   */
  private static formatTechnologyStack(techStack: any): DiscoveryResponse['technologyStack'] {
    const formatted: DiscoveryResponse['technologyStack'] = [];
    
    if (techStack.current) {
      techStack.current.forEach((tech: string) => {
        formatted.push({
          name: tech,
          category: 'current',
          description: `Currently using ${tech}`
        });
      });
    }
    
    if (techStack.planned) {
      techStack.planned.forEach((tech: string) => {
        formatted.push({
          name: tech,
          category: 'planned',
          description: `Planned implementation of ${tech}`
        });
      });
    }
    
    if (techStack.vendors) {
      techStack.vendors.forEach((vendor: string) => {
        formatted.push({
          name: vendor,
          category: 'vendor',
          description: `Vendor relationship with ${vendor}`
        });
      });
    }
    
    if (techStack.modernizationAreas) {
      techStack.modernizationAreas.forEach((area: string) => {
        formatted.push({
          name: area,
          category: 'modernization',
          description: `Modernization opportunity in ${area}`
        });
      });
    }
    
    return formatted;
  }

  /**
   * Format company overview
   */
  private static formatCompanyOverview(companyOverview: any): DiscoveryResponse['companyOverview'] {
    return {
      name: companyOverview.name,
      industry: companyOverview.industry,
      size: companyOverview.size,
      revenue: companyOverview.revenue,
      recentGrowth: this.hasRecentGrowth(companyOverview.growth),
      challengeAreas: companyOverview.challenges?.map((c: any) => c.text) || []
    };
  }

  /**
   * Assess severity of pain points based on keywords
   */
  private static assessSeverity(painPointText: string): 'high' | 'medium' | 'low' {
    const highSeverityKeywords = ['critical', 'urgent', 'major', 'severe', 'crisis', 'failing'];
    const mediumSeverityKeywords = ['challenge', 'difficulty', 'issue', 'problem', 'concern'];
    
    const lowerText = painPointText.toLowerCase();
    
    if (highSeverityKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'high';
    } else if (mediumSeverityKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Check if company has recent growth indicators
   */
  private static hasRecentGrowth(growth: any): boolean {
    if (!growth) return false;
    return growth.hiring || growth.funding || growth.expansion || growth.newProducts || growth.partnerships;
  }
} 