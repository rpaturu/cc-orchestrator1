import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { CacheType } from '../../../types/cache-types';
import { SerpAPICore } from '../core/SerpAPICore';
import { 
  SerpAPIJobResult, 
  SerpAPIConfig, 
  CacheOptions 
} from '../types/SerpAPITypes';

export class JobsSearchEngine extends SerpAPICore {
  constructor(cacheService: CacheService, logger: Logger, config?: Partial<SerpAPIConfig>) {
    super(cacheService, logger, config);
  }

  /**
   * Get job results for a company with caching
   */
  async getJobsResults(companyName: string, options: CacheOptions = {}): Promise<SerpAPIJobResult[]> {
    const cacheKey = this.generateCacheKey(companyName, 'jobs');
    
    return this.getCachedOrFetch(
      cacheKey,
      CacheType.SERP_API_JOBS_RESULTS,
      () => this.fetchJobsResults(companyName),
      options
    );
  }

  /**
   * Fetch job results from SerpAPI
   */
  private async fetchJobsResults(companyName: string): Promise<SerpAPIJobResult[]> {
    this.validateConfig();
    
    try {
      const params = this.buildSearchParams(`jobs at ${companyName}`, {
        engine: 'google_jobs',
        num: 10,
      });

      const response = await this.makeRequest(params);
      
      if (!response.jobs_results) {
        this.logger.warn('No job results found', { companyName });
        return [];
      }

      return this.processJobResults(response.jobs_results);
    } catch (error) {
      this.logger.error('Failed to fetch job results', { 
        companyName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Process raw SerpAPI job results into structured format
   */
  private processJobResults(jobResults: any[]): SerpAPIJobResult[] {
    return jobResults
      .filter(job => job.title && job.company_name)
      .map(job => ({
        title: job.title,
        company: job.company_name,
        location: job.location || '',
        via: job.via,
        description: job.description,
        posted_at: job.detected_extensions?.posted_at,
        schedule_type: job.detected_extensions?.schedule_type,
        salary: job.salary ? {
          min: job.salary.min,
          max: job.salary.max,
          currency: job.salary.currency,
        } : undefined,
      }))
      .slice(0, 10); // Limit to 10 results
  }

  /**
   * Search for jobs by specific role or department
   */
  async getJobsByRole(
    companyName: string, 
    role: string,
    location?: string
  ): Promise<SerpAPIJobResult[]> {
    const query = location 
      ? `${role} jobs at ${companyName} in ${location}`
      : `${role} jobs at ${companyName}`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'google_jobs',
        num: 10,
      });

      const response = await this.makeRequest(params);
      return this.processJobResults(response.jobs_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch jobs by role', { 
        companyName, 
        role,
        location,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Get remote job opportunities
   */
  async getRemoteJobs(companyName: string): Promise<SerpAPIJobResult[]> {
    const query = `remote jobs at ${companyName}`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'google_jobs',
        num: 10,
      });

      const response = await this.makeRequest(params);
      return this.processJobResults(response.jobs_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch remote jobs', { 
        companyName,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Get job openings by experience level
   */
  async getJobsByLevel(
    companyName: string, 
    level: 'entry' | 'mid' | 'senior' | 'executive'
  ): Promise<SerpAPIJobResult[]> {
    const levelTerms = {
      entry: 'entry level junior graduate',
      mid: 'mid level experienced',
      senior: 'senior lead principal',
      executive: 'director VP executive manager'
    };

    const query = `${levelTerms[level]} jobs at ${companyName}`;
    
    try {
      const params = this.buildSearchParams(query, {
        engine: 'google_jobs',
        num: 10,
      });

      const response = await this.makeRequest(params);
      return this.processJobResults(response.jobs_results || []);
    } catch (error) {
      this.logger.error('Failed to fetch jobs by level', { 
        companyName, 
        level,
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * Analyze hiring trends for a company
   */
  async getHiringTrends(companyName: string): Promise<{
    totalOpenings: number;
    departments: Record<string, number>;
    locations: Record<string, number>;
    experienceLevels: Record<string, number>;
  }> {
    const jobs = await this.getJobsResults(companyName);
    
    const trends = {
      totalOpenings: jobs.length,
      departments: {} as Record<string, number>,
      locations: {} as Record<string, number>,
      experienceLevels: {} as Record<string, number>,
    };

    jobs.forEach(job => {
      // Analyze department from job title
      const title = job.title.toLowerCase();
      const department = this.extractDepartment(title);
      trends.departments[department] = (trends.departments[department] || 0) + 1;

      // Count locations
      if (job.location) {
        trends.locations[job.location] = (trends.locations[job.location] || 0) + 1;
      }

      // Analyze experience level
      const level = this.extractExperienceLevel(title);
      trends.experienceLevels[level] = (trends.experienceLevels[level] || 0) + 1;
    });

    return trends;
  }

  /**
   * Extract department from job title
   */
  private extractDepartment(title: string): string {
    const departments = {
      'engineering': ['engineer', 'developer', 'programmer', 'architect', 'devops'],
      'sales': ['sales', 'account', 'business development', 'revenue'],
      'marketing': ['marketing', 'growth', 'content', 'seo', 'digital'],
      'product': ['product', 'pm', 'product manager'],
      'design': ['design', 'ux', 'ui', 'creative'],
      'data': ['data', 'analyst', 'scientist', 'analytics'],
      'hr': ['hr', 'human resources', 'recruiter', 'people'],
      'finance': ['finance', 'accounting', 'controller', 'cfo'],
      'operations': ['operations', 'ops', 'supply chain', 'logistics'],
      'customer': ['customer', 'support', 'success', 'service'],
    };

    for (const [dept, keywords] of Object.entries(departments)) {
      if (keywords.some(keyword => title.includes(keyword))) {
        return dept;
      }
    }

    return 'other';
  }

  /**
   * Extract experience level from job title
   */
  private extractExperienceLevel(title: string): string {
    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) {
      return 'senior';
    }
    if (title.includes('junior') || title.includes('entry') || title.includes('graduate')) {
      return 'entry';
    }
    if (title.includes('director') || title.includes('vp') || title.includes('executive')) {
      return 'executive';
    }
    return 'mid';
  }
} 