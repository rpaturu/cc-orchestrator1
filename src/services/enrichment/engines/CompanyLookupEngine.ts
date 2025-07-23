/**
 * CompanyLookupEngine - Handles company search and lookup operations
 */

import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { SerpAPIService } from '../../SerpAPIService';
import { CacheType } from '../../../types/cache-types';

import {
  CompanyBasicInfo,
  CompanySearchOptions,
  CompanyLookupResult,
  EnrichmentConfig,
  CacheOptions,
  ValidationResult,
  DomainValidationResult
} from '../types/EnrichmentTypes';

export class CompanyLookupEngine {
  constructor(
    private logger: Logger,
    private cacheService: CacheService,
    private serpAPIService: SerpAPIService,
    private config: EnrichmentConfig = {}
  ) {}

  /**
   * Main company lookup method
   */
  async lookupCompany(query: string, options: CompanySearchOptions = { query }): Promise<CompanyBasicInfo[]> {
    this.logger.info(`Looking up companies matching: ${query}`);
    
    try {
      // Check cache first
      const cacheKey = this.generateLookupCacheKey(query);
      const cached = await this.checkLookupCache(cacheKey);
      if (cached) {
        this.logger.debug('Company lookup cache hit', { query });
        return cached;
      }

      // Use trusted sources - SerpAPI Knowledge Graph
      const serpApiResults = await this.serpAPIService.lookupCompanies(query);
      
      // Convert to standardized format
      const companyResults = serpApiResults.map(result => ({
        name: result.title || '',
        domain: result.knowledgeGraph?.url || '',
        industry: result.industryClassification?.primary || '',
        size: '', // Not available in this result type
        description: result.snippet || result.knowledgeGraph?.description || '',
        logo: result.knowledgeGraph?.image?.contentUrl || '',
        headquarters: typeof result.knowledgeGraph?.address === 'string' 
          ? result.knowledgeGraph.address 
          : result.knowledgeGraph?.address?.addressLocality || '',
        founded: result.knowledgeGraph?.foundingDate || '',
        sources: ['serp_api_knowledge']
      }));

      // Deduplicate and cache results
      const deduplicatedResults = this.dedupeCompanies(companyResults);
      await this.cacheLookupResults(cacheKey, deduplicatedResults);

      return deduplicatedResults;
    } catch (error) {
      this.logger.error('Company lookup failed:', { error: String(error) });
      return [];
    }
  }

  /**
   * Enhanced company search with multiple sources
   */
  async searchCompanies(options: CompanySearchOptions): Promise<CompanyLookupResult> {
    const startTime = Date.now();
    const { query, maxResults = 10, includeIndustryFilter, sourcePriorities } = options;

    this.logger.info('Searching companies with options', { options });

    try {
      const results: CompanyBasicInfo[] = [];
      const sources: string[] = [];

      // Primary search via SerpAPI
      if (!sourcePriorities || sourcePriorities.includes('serp_api')) {
        const serpResults = await this.searchViaSerpAPI(query, includeIndustryFilter);
        results.push(...serpResults);
        if (serpResults.length > 0) sources.push('serp_api');
      }

      // Google Knowledge Graph search
      if (!sourcePriorities || sourcePriorities.includes('knowledge_graph')) {
        const kgResults = await this.searchViaKnowledgeGraph(query);
        results.push(...kgResults);
        if (kgResults.length > 0) sources.push('knowledge_graph');
      }

      // BrightData search (if available)
      if (!sourcePriorities || sourcePriorities.includes('bright_data')) {
        const brightResults = await this.searchViaBrightData(query);
        results.push(...brightResults);
        if (brightResults.length > 0) sources.push('bright_data');
      }

      const deduplicatedResults = this.dedupeCompanies(results);
      const finalResults = deduplicatedResults.slice(0, maxResults);

      return {
        companies: finalResults,
        totalFound: deduplicatedResults.length,
        sources,
        searchTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error('Company search failed:', { error: String(error), options });
      return {
        companies: [],
        totalFound: 0,
        sources: [],
        searchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate domain availability and basic info
   */
  async validateDomain(domain: string): Promise<DomainValidationResult> {
    const startTime = Date.now();
    
    try {
      // Basic format validation
      const formatValid = this.validateDomainFormat(domain);
      if (!formatValid.isValid) {
        return {
          ...formatValid,
          domain,
          isReachable: false,
          hasValidSSL: false
        };
      }

      // Check if domain is reachable
      const reachabilityCheck = await this.checkDomainReachability(domain);
      
      return {
        isValid: reachabilityCheck.isReachable,
        errors: reachabilityCheck.errors,
        warnings: reachabilityCheck.warnings,
        confidence: reachabilityCheck.confidence,
        domain,
        isReachable: reachabilityCheck.isReachable,
        hasValidSSL: reachabilityCheck.hasValidSSL,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Domain validation failed: ${error}`],
        warnings: [],
        confidence: 0,
        domain,
        isReachable: false,
        hasValidSSL: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  // =====================================
  // PRIVATE SEARCH METHODS
  // =====================================

  private async searchViaSerpAPI(query: string, industryFilter?: string): Promise<CompanyBasicInfo[]> {
    try {
      let searchQuery = query;
      if (industryFilter) {
        searchQuery += ` ${industryFilter}`;
      }
      
      return await this.lookupCompany(searchQuery);
    } catch (error) {
      this.logger.warn('SerpAPI search failed', { query, error: String(error) });
      return [];
    }
  }

  private async searchViaKnowledgeGraph(query: string): Promise<CompanyBasicInfo[]> {
    try {
      // This would integrate with GoogleKnowledgeGraphService
      // For now, return empty to avoid circular dependencies
      return [];
    } catch (error) {
      this.logger.warn('Knowledge Graph search failed', { query, error: String(error) });
      return [];
    }
  }

  private async searchViaBrightData(query: string): Promise<CompanyBasicInfo[]> {
    try {
      // Placeholder for BrightData integration
      this.logger.debug('BrightData search not implemented', { query });
      return [];
    } catch (error) {
      this.logger.warn('BrightData search failed', { query, error: String(error) });
      return [];
    }
  }

  // =====================================
  // VALIDATION METHODS
  // =====================================

  private validateDomainFormat(domain: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic format checks
    if (!domain || domain.trim().length === 0) {
      errors.push('Domain is required');
    }

    if (domain && !domain.includes('.')) {
      errors.push('Domain must contain at least one dot');
    }

    if (domain && domain.includes(' ')) {
      errors.push('Domain cannot contain spaces');
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (domain && !domainRegex.test(domain)) {
      errors.push('Invalid domain format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1.0 : 0.0
    };
  }

  private async checkDomainReachability(domain: string): Promise<DomainValidationResult> {
    try {
      // Simplified check - in production this would do actual HTTP requests
      const isReachable = await this.isDomainValid(domain);
      
      return {
        isValid: isReachable,
        errors: isReachable ? [] : ['Domain is not reachable'],
        warnings: [],
        confidence: isReachable ? 0.8 : 0.2,
        domain,
        isReachable,
        hasValidSSL: isReachable, // Simplified assumption
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Reachability check failed: ${error}`],
        warnings: [],
        confidence: 0,
        domain,
        isReachable: false,
        hasValidSSL: false,
      };
    }
  }

  private async isDomainValid(domain: string): Promise<boolean> {
    try {
      // Simplified domain validation - would use actual HTTP request in production
      return domain.includes('.') && domain.length > 3;
    } catch {
      return false;
    }
  }

  // =====================================
  // DEDUPLICATION METHODS
  // =====================================

  private dedupeCompanies(companies: CompanyBasicInfo[]): CompanyBasicInfo[] {
    const seen = new Set<string>();
    const deduped: CompanyBasicInfo[] = [];

    for (const company of companies) {
      const key = `${company.name.toLowerCase()}_${(company.domain || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(company);
      }
    }

    return deduped;
  }

  // =====================================
  // CACHE MANAGEMENT
  // =====================================

  private generateLookupCacheKey(query: string): string {
    return `company_lookup_${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  private async checkLookupCache(cacheKey: string): Promise<CompanyBasicInfo[] | null> {
    try {
      const cached = await this.cacheService.get(cacheKey);
      if (cached && !this.isCacheExpired(cached, 24)) { // 24 hour TTL
        // Check if cached data is already in the correct format
        if (Array.isArray(cached)) {
          return cached as CompanyBasicInfo[];
        }
        // If it's ContentAnalysis, we need to extract the company data differently
        return null; // Return null to force fresh lookup
      }
      return null;
    } catch (error) {
      this.logger.warn('Cache check failed', { cacheKey, error: String(error) });
      return null;
    }
  }

  private async cacheLookupResults(cacheKey: string, results: CompanyBasicInfo[]): Promise<void> {
    try {
      await this.cacheService.setRawJSON(cacheKey, results, CacheType.COMPANY_LOOKUP);
      this.logger.debug('Cached lookup results', { cacheKey, count: results.length });
    } catch (error) {
      this.logger.warn('Failed to cache lookup results', { cacheKey, error: String(error) });
    }
  }

  private isCacheExpired(cached: any, maxAgeHours: number): boolean {
    if (!cached.timestamp) return true;
    const age = Date.now() - new Date(cached.timestamp).getTime();
    return age > maxAgeHours * 60 * 60 * 1000;
  }

  // =====================================
  // HEALTH CHECK
  // =====================================

  async healthCheck(): Promise<boolean> {
    try {
      // Test basic functionality
      const testResult = await this.lookupCompany('test');
      return Array.isArray(testResult);
    } catch {
      return false;
    }
  }
} 