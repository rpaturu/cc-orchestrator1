import { CacheService } from './core/CacheService';
import { Logger } from './core/Logger';
import { CacheType } from '../types/cache-types';

/**
 * Snov.io Contact Enrichment Service
 * 
 * Provides contact lookup, domain search, and email verification
 * with built-in caching and parallel execution support.
 */

export interface SnovContact {
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  department?: string;
  linkedin?: string;
  verified: boolean;
  confidence: number;
}

export interface SnovDomainSearchResult {
  contacts: SnovContact[];
  total: number;
  domain: string;
  companyName: string;
}

export interface SnovEmailVerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  confidence: number;
}

export class SnovService {
  private cacheService: CacheService;
  private logger: Logger;
  private apiKey: string;
  private baseUrl = 'https://app.snov.io/restapi';
  
  // Cost tracking for $350/year plan
  private dailyCallLimit: number;
  private monthlyBudget: number;

  constructor(cacheService: CacheService, logger: Logger) {
    this.cacheService = cacheService;
    this.logger = logger;
    this.apiKey = process.env.SNOV_API_KEY || '';
    
    // $350/year = ~$29/month budget
    this.monthlyBudget = 29;
    this.dailyCallLimit = parseInt(process.env.SNOV_DAILY_LIMIT || '100'); // Adjust based on plan
    
    if (!this.apiKey) {
      this.logger.warn('SNOV_API_KEY not configured');
    }
  }

  /**
   * Get contacts for a company domain with cost optimization
   */
  async getCompanyContacts(
    companyName: string, 
    domain?: string,
    options: {
      maxContacts?: number;
      departments?: string[];
      seniority?: string[];
      useCache?: boolean;
      priority?: 'high' | 'medium' | 'low'; // NEW: Priority-based usage
    } = {}
  ): Promise<SnovDomainSearchResult> {
    // Smart caching strategy for cost optimization
    const cacheKey = `snov_contacts:${companyName}:${domain || 'auto'}`;
    const cacheHours = this.getCacheTTL(options.priority || 'medium');
    
    // Check cache first (longer TTL for cost savings)
    if (options.useCache !== false) {
      const cached = await this.cacheService.getRawJSON(cacheKey);
      if (cached && !this.isExpired(cached, cacheHours)) {
        this.logger.debug('Snov contacts cache hit (cost saved)', { 
          companyName, 
          domain,
          cacheSavings: '$0.10-0.15'
        });
        return cached.data;
      }
    }

    // Check daily usage limits
    const canMakeCall = await this.checkUsageLimits();
    if (!canMakeCall && options.priority !== 'high') {
      this.logger.warn('Snov daily limit reached, using cache only', { companyName });
      return this.getEmptyResult(companyName, domain);
    }

    try {
      // Track API usage for cost monitoring
      await this.trackAPIUsage(companyName, 'contact_lookup');
      
      // If no domain provided, try to find it first
      const targetDomain = domain || await this.findCompanyDomain(companyName);
      
      if (!targetDomain) {
        throw new Error(`Could not determine domain for company: ${companyName}`);
      }

      // Parallel execution: domain search + company info
      const [contacts, companyInfo] = await Promise.allSettled([
        this.executeDomainSearch(targetDomain, options),
        this.getCompanyInfo(targetDomain)
      ]);

      const result: SnovDomainSearchResult = {
        contacts: contacts.status === 'fulfilled' ? contacts.value : [],
        total: contacts.status === 'fulfilled' ? contacts.value.length : 0,
        domain: targetDomain,
        companyName: companyInfo.status === 'fulfilled' ? companyInfo.value.name : companyName
      };

      // Cache with priority-based TTL
      await this.cacheService.setRawJSON(cacheKey, {
        data: result,
        timestamp: new Date().toISOString(),
        source: 'snov_api',
        cost: this.estimateCallCost(result.contacts.length)
      }, CacheType.SNOV_CONTACTS_RAW);

      this.logger.info('Snov contacts collected', {
        companyName,
        domain: targetDomain,
        contactCount: result.contacts.length,
        estimatedCost: this.estimateCallCost(result.contacts.length),
        cacheFor: `${cacheHours}h`
      });

      return result;

    } catch (error) {
      this.logger.error('Snov contact collection failed', {
        companyName,
        domain,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.getEmptyResult(companyName, domain);
    }
  }

  /**
   * Execute domain search with filtering
   */
  private async executeDomainSearch(
    domain: string,
    options: {
      maxContacts?: number;
      departments?: string[];
      seniority?: string[];
    }
  ): Promise<SnovContact[]> {
    if (!this.apiKey) {
      this.logger.warn('Snov API key not configured, returning empty results');
      return [];
    }

    const params = new URLSearchParams({
      access_token: this.apiKey,
      domain: domain,
      type: 'all',
      limit: String(options.maxContacts || 50)
    });

    const response = await fetch(`${this.baseUrl}/domain-emails-with-info?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Snov API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform Snov response to our format
    const contacts: SnovContact[] = ((data as any)?.emails || []).map((contact: any) => ({
      email: contact.email,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      position: contact.position || '',
      department: contact.department || undefined,
      linkedin: contact.linkedin || undefined,
      verified: contact.verification?.result === 'deliverable',
      confidence: this.calculateConfidence(contact)
    }));

    // Apply filtering if specified
    return this.filterContacts(contacts, options);
  }

  /**
   * Filter contacts based on criteria
   */
  private filterContacts(
    contacts: SnovContact[],
    options: {
      departments?: string[];
      seniority?: string[];
    }
  ): SnovContact[] {
    let filtered = contacts;

    // Filter by department
    if (options.departments && options.departments.length > 0) {
      filtered = filtered.filter(contact => 
        options.departments!.some(dept => 
          contact.department?.toLowerCase().includes(dept.toLowerCase()) ||
          contact.position.toLowerCase().includes(dept.toLowerCase())
        )
      );
    }

    // Filter by seniority
    if (options.seniority && options.seniority.length > 0) {
      filtered = filtered.filter(contact =>
        options.seniority!.some(level =>
          contact.position.toLowerCase().includes(level.toLowerCase())
        )
      );
    }

    // Sort by confidence and verification
    return filtered.sort((a, b) => {
      if (a.verified !== b.verified) {
        return a.verified ? -1 : 1; // Verified first
      }
      return b.confidence - a.confidence; // Higher confidence first
    });
  }

  /**
   * Calculate confidence score for a contact
   */
  private calculateConfidence(contact: any): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for verified emails
    if (contact.verification?.result === 'deliverable') {
      confidence += 0.3;
    }

    // Boost for complete information
    if (contact.firstName && contact.lastName) confidence += 0.1;
    if (contact.position) confidence += 0.1;
    if (contact.linkedin) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Find company domain (placeholder - could integrate with other services)
   */
  private async findCompanyDomain(companyName: string): Promise<string | null> {
    // Placeholder implementation
    // In production, this could:
    // 1. Use Google Knowledge Graph
    // 2. Use company database lookup
    // 3. Use pattern matching for known domains
    
    this.logger.debug('Finding domain for company (placeholder)', { companyName });
    return null;
  }

  /**
   * Get company information from domain
   */
  private async getCompanyInfo(domain: string): Promise<{ name: string; industry?: string }> {
    // Placeholder implementation
    return { name: domain.replace(/\.(com|org|net|io)$/, '') };
  }

  /**
   * Check if cached data is expired
   */
  private isExpired(cached: any, ttlHours: number): boolean {
    const cacheTime = new Date(cached.timestamp).getTime();
    const now = Date.now();
    const ttlMs = ttlHours * 60 * 60 * 1000;
    
    return (now - cacheTime) > ttlMs;
  }

  /**
   * Verify email addresses in parallel
   */
  async verifyEmails(emails: string[]): Promise<SnovEmailVerificationResult[]> {
    const cacheKey = `snov_verification:${emails.join(',')}`;
    
    // Check cache
    const cached = await this.cacheService.getRawJSON(cacheKey);
    if (cached && !this.isExpired(cached, 48)) { // 48 hour TTL for verification
      return cached.data;
    }

    if (!this.apiKey) {
      return emails.map(email => ({
        email,
        status: 'unknown' as const,
        confidence: 0.5
      }));
    }

    try {
      // Batch verify emails in parallel chunks
      const chunks = this.chunkArray(emails, 10); // 10 emails per batch
      const allResults: SnovEmailVerificationResult[] = [];

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(email => this.verifySingleEmail(email));
        const chunkResults = await Promise.allSettled(chunkPromises);
        
        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allResults.push(result.value);
          } else {
            allResults.push({
              email: chunk[index],
              status: 'unknown',
              confidence: 0.5
            });
          }
        });

        // Rate limiting between chunks
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await this.sleep(1000); // 1 second between batches
        }
      }

      // Cache the results
      await this.cacheService.setRawJSON(cacheKey, {
        data: allResults,
        timestamp: new Date().toISOString()
      }, CacheType.SNOV_VERIFICATION_RAW);

      return allResults;

    } catch (error) {
      this.logger.error('Email verification failed', {
        emailCount: emails.length,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return emails.map(email => ({
        email,
        status: 'unknown' as const,
        confidence: 0.5
      }));
    }
  }

  /**
   * Verify a single email address
   */
  private async verifySingleEmail(email: string): Promise<SnovEmailVerificationResult> {
    const params = new URLSearchParams({
      access_token: this.apiKey,
      email: email
    });

    const response = await fetch(`${this.baseUrl}/email-verifier?${params}`);
    
    if (!response.ok) {
      throw new Error(`Email verification failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      email,
      status: this.mapVerificationStatus((data as any)?.result),
      confidence: this.mapVerificationConfidence((data as any)?.result)
    };
  }

  /**
   * Map Snov verification status to our format
   */
  private mapVerificationStatus(result: string): 'valid' | 'invalid' | 'risky' | 'unknown' {
    switch (result?.toLowerCase()) {
      case 'deliverable': return 'valid';
      case 'undeliverable': return 'invalid';
      case 'risky': return 'risky';
      default: return 'unknown';
    }
  }

  /**
   * Map verification result to confidence score
   */
  private mapVerificationConfidence(result: string): number {
    switch (result?.toLowerCase()) {
      case 'deliverable': return 0.9;
      case 'risky': return 0.6;
      case 'undeliverable': return 0.1;
      default: return 0.5;
    }
  }

  /**
   * Utility: chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Utility: sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache TTL based on priority (cost optimization)
   */
  private getCacheTTL(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 48;    // 2 days for high priority
      case 'medium': return 168; // 1 week for medium priority  
      case 'low': return 720;    // 1 month for low priority
      default: return 168;
    }
  }

  /**
   * Check if we're within daily usage limits
   */
  private async checkUsageLimits(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `snov_usage:${today}`;
    
    try {
      const cached = await this.cacheService.getRawJSON(usageKey);
      const usage = cached?.data as { calls: number; cost: number } || { calls: 0, cost: 0 };
      
      return usage.calls < this.dailyCallLimit;
    } catch (error) {
      this.logger.warn('Usage check failed, allowing call', { error });
      return true;
    }
  }

  /**
   * Track API usage for cost monitoring
   */
  private async trackAPIUsage(companyName: string, callType: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `snov_usage:${today}`;
    
    try {
      const cached = await this.cacheService.getRawJSON(usageKey);
      const usage = cached?.data as { calls: number; cost: number } || { calls: 0, cost: 0 };
      
      usage.calls += 1;
      usage.cost += 0.12; // Estimate per call cost
      
      await this.cacheService.setRawJSON(usageKey, {
        data: usage,
        timestamp: new Date().toISOString(),
        source: 'snov_usage_tracker'
      }, CacheType.USAGE_TRACKING);
      
      this.logger.debug('Snov API usage tracked', {
        companyName,
        callType,
        dailyCalls: usage.calls,
        dailyCost: usage.cost,
        limit: this.dailyCallLimit
      });
    } catch (error) {
      this.logger.warn('Usage tracking failed', { 
        companyName, 
        callType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Estimate cost for a contact lookup
   */
  private estimateCallCost(contactCount: number): string {
    const baseCost = 0.12; // Base domain search cost
    const contactCost = contactCount * 0.01; // Additional per contact
    return `$${(baseCost + contactCost).toFixed(3)}`;
  }

  /**
   * Get empty result structure
   */
  private getEmptyResult(companyName: string, domain?: string): SnovDomainSearchResult {
    return {
      contacts: [],
      total: 0,
      domain: domain || '',
      companyName
    };
  }
} 