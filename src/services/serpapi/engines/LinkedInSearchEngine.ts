import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { CacheType } from '../../../types/cache-types';
import { SerpAPICore } from '../core/SerpAPICore';
import { 
  SerpAPILinkedInResult, 
  SerpAPIConfig, 
  CacheOptions 
} from '../types/SerpAPITypes';

export class LinkedInSearchEngine extends SerpAPICore {
  constructor(cacheService: CacheService, logger: Logger, config?: Partial<SerpAPIConfig>) {
    super(cacheService, logger, config);
  }

  /**
   * Get LinkedIn results for a company with caching
   */
  async getLinkedInResults(companyName: string, options: CacheOptions = {}): Promise<SerpAPILinkedInResult[]> {
    const cacheKey = this.generateCacheKey(companyName, 'linkedin');
    
    return this.getCachedOrFetch(
      cacheKey,
      CacheType.SERP_API_LINKEDIN_RESULTS,
      () => this.fetchLinkedInResults(companyName),
      options
    );
  }

  /**
   * Fetch LinkedIn results from SerpAPI
   */
  private async fetchLinkedInResults(companyName: string): Promise<SerpAPILinkedInResult[]> {
    this.validateConfig();
    
    try {
      const params = this.buildSearchParams(`site:linkedin.com/in "${companyName}"`, {
        engine: 'google',
        num: 10,
      });

      const response = await this.makeRequest(params);
      
      if (!response.organic_results) {
        this.logger.warn('No LinkedIn results found', { companyName });
        return [];
      }

      return this.processLinkedInResults(response.organic_results);
    } catch (error) {
      this.logger.error('Failed to fetch LinkedIn results', { 
        companyName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Process raw SerpAPI results into structured LinkedIn results
   */
  private processLinkedInResults(organicResults: any[]): SerpAPILinkedInResult[] {
    return organicResults
      .filter(result => 
        result.link?.includes('linkedin.com/in/') && 
        result.title && 
        !result.title.toLowerCase().includes('linkedin')
      )
      .map(result => ({
        name: this.extractPersonName(result.title),
        title: this.extractJobTitle(result.snippet || result.title),
        company: this.extractCompany(result.snippet || ''),
        location: this.extractLocation(result.snippet || ''),
        profile_url: result.link,
        snippet: result.snippet || '',
      }))
      .slice(0, 10); // Limit to 10 results
  }

  /**
   * Search for LinkedIn profiles by role
   */
  async getLinkedInByRole(
    companyName: string, 
    role: string
  ): Promise<SerpAPILinkedInResult[]> {
    const query = `site:linkedin.com/in "${companyName}" "${role}"`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'google',
        num: 10,
      });

      const response = await this.makeRequest(params);
      return this.processLinkedInResults(response.organic_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch LinkedIn profiles by role', { 
        companyName, 
        role,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Find company executives on LinkedIn
   */
  async getExecutives(companyName: string): Promise<SerpAPILinkedInResult[]> {
    const executiveRoles = [
      'CEO', 'CTO', 'CFO', 'COO', 'President', 'VP', 'Director', 'Head of'
    ];
    
    const query = `site:linkedin.com/in "${companyName}" (${executiveRoles.join(' OR ')})`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'google',
        num: 15,
      });

      const response = await this.makeRequest(params);
      return this.processLinkedInResults(response.organic_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch company executives', { 
        companyName,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Find sales and business development contacts
   */
  async getSalesContacts(companyName: string): Promise<SerpAPILinkedInResult[]> {
    const salesRoles = [
      'Sales', 'Business Development', 'Account Manager', 'Customer Success', 'Revenue'
    ];
    
    const query = `site:linkedin.com/in "${companyName}" (${salesRoles.join(' OR ')})`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'google',
        num: 15,
      });

      const response = await this.makeRequest(params);
      return this.processLinkedInResults(response.organic_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch sales contacts', { 
        companyName,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Extract person name from LinkedIn title
   */
  private extractPersonName(title: string): string {
    // Remove common suffixes like "| LinkedIn", "- LinkedIn", etc.
    const cleanTitle = title.replace(/[\|\-\–]\s*(LinkedIn|Professional Profile).*$/i, '').trim();
    
    // Extract the first part which is usually the name
    const parts = cleanTitle.split(/\s*[\|\-\–]\s*/);
    return parts[0] || cleanTitle;
  }

  /**
   * Extract job title from snippet
   */
  private extractJobTitle(snippet: string): string {
    // Look for patterns like "Title at Company" or "Title - Company"
    const titleMatch = snippet.match(/^([^|•\n]+?)(?:\s+at\s+|\s*[\|\-\–]\s*)/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    // Fallback to first line of snippet
    const firstLine = snippet.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
  }

  /**
   * Extract company name from snippet
   */
  private extractCompany(snippet: string): string {
    // Look for "at Company" pattern
    const companyMatch = snippet.match(/\s+at\s+([^|\n•]+)/i);
    if (companyMatch) {
      return companyMatch[1].trim();
    }
    
    // Look for "Company -" pattern
    const dashMatch = snippet.match(/[\|\-\–]\s*([^|\n•]+)/);
    if (dashMatch) {
      return dashMatch[1].trim();
    }
    
    return '';
  }

  /**
   * Extract location from snippet
   */
  private extractLocation(snippet: string): string {
    // Look for location patterns (City, State or City, Country)
    const locationMatch = snippet.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,})/);
    if (locationMatch) {
      return locationMatch[1];
    }
    
    // Look for "Greater [City] Area" pattern
    const areaMatch = snippet.match(/Greater\s+([^•\n|]+?)\s+Area/i);
    if (areaMatch) {
      return areaMatch[0];
    }
    
    return '';
  }

  /**
   * Get LinkedIn company insights
   */
  async getCompanyInsights(companyName: string): Promise<{
    totalProfiles: number;
    departments: Record<string, number>;
    seniority: Record<string, number>;
    recentHires: SerpAPILinkedInResult[];
  }> {
    const profiles = await this.getLinkedInResults(companyName);
    
    const insights = {
      totalProfiles: profiles.length,
      departments: {} as Record<string, number>,
      seniority: {} as Record<string, number>,
      recentHires: [] as SerpAPILinkedInResult[],
    };

    profiles.forEach(profile => {
      // Analyze department from job title
      const department = this.extractDepartmentFromTitle(profile.title);
      insights.departments[department] = (insights.departments[department] || 0) + 1;

      // Analyze seniority level
      const level = this.extractSeniorityLevel(profile.title);
      insights.seniority[level] = (insights.seniority[level] || 0) + 1;
    });

    return insights;
  }

  /**
   * Extract department from job title
   */
  private extractDepartmentFromTitle(title: string): string {
    const titleLower = title.toLowerCase();
    
    const departments = {
      'engineering': ['engineer', 'developer', 'architect', 'tech', 'software'],
      'sales': ['sales', 'business development', 'account'],
      'marketing': ['marketing', 'growth', 'brand', 'content'],
      'product': ['product', 'pm'],
      'operations': ['operations', 'ops', 'supply'],
      'finance': ['finance', 'accounting', 'controller'],
      'hr': ['hr', 'human resources', 'people', 'talent'],
      'executive': ['ceo', 'cto', 'cfo', 'president', 'founder'],
    };

    for (const [dept, keywords] of Object.entries(departments)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return dept;
      }
    }

    return 'other';
  }

  /**
   * Extract seniority level from title
   */
  private extractSeniorityLevel(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal')) {
      return 'senior';
    }
    if (titleLower.includes('director') || titleLower.includes('vp') || titleLower.includes('head')) {
      return 'executive';
    }
    if (titleLower.includes('junior') || titleLower.includes('associate') || titleLower.includes('coordinator')) {
      return 'junior';
    }
    
    return 'mid';
  }
} 