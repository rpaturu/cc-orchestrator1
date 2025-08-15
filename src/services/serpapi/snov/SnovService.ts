import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { CacheType } from '../../../types/cache-types';
import { CacheConfig } from '../../../types';

export interface SnovConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  rateLimitPerMinute?: number;
  retryAttempts?: number;
  timeoutMs?: number;
}

export interface SnovEmailFinderRequest {
  domain: string;
  type?: 'personal' | 'generic';
  department?: string;
  positions?: string[];
  limit?: number;
}

export interface SnovEmailFinderResponse {
  success: boolean;
  emails: Array<{
    email: string;
    firstName: string;
    lastName: string;
    position: string;
    type: 'personal' | 'generic';
    confidence: number;
    sources: string[];
  }>;
  companyName: string;
  domain: string;
  totalFound: number;
}

export interface SnovEmailVerifierRequest {
  emails: string[];
}

export interface SnovEmailVerifierResponse {
  success: boolean;
  results: Array<{
    email: string;
    status: 'valid' | 'invalid' | 'catch-all' | 'unknown';
    confidence: number;
    reason?: string;
  }>;
}

export interface SnovDomainSearchRequest {
  domain: string;
  type?: 'personal' | 'generic';
  limit?: number;
  lastId?: number;
}

export interface SnovDomainSearchResponse {
  success: boolean;
  emails: Array<{
    email: string;
    firstName: string;
    lastName: string;
    position: string;
    socialUrl?: string;
    companyName: string;
  }>;
  domain: string;
  companyName: string;
  totalEmails: number;
  lastId?: number;
}

export interface SnovDataEnrichmentRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  domain?: string;
}

export interface SnovDataEnrichmentResponse {
  success: boolean;
  data: {
    email?: string;
    firstName?: string;
    lastName?: string;
    position?: string;
    company?: string;
    socialProfiles?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    confidence: number;
  };
}

export interface SnovLinkedInEnrichmentRequest {
  linkedinUrl: string;
}

export interface SnovLinkedInEnrichmentResponse {
  success: boolean;
  data: {
    firstName: string;
    lastName: string;
    position: string;
    company: string;
    location: string;
    email?: string;
    industry?: string;
    skills?: string[];
    experience?: Array<{
      company: string;
      position: string;
      duration: string;
    }>;
    education?: Array<{
      school: string;
      degree: string;
      field: string;
    }>;
  };
}

export interface SnovBulkEmailFinderRequest {
  domains: string[];
  positions?: string[];
  departments?: string[];
  limit?: number;
}

export interface SnovBulkEmailFinderResponse {
  success: boolean;
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  results?: Array<{
    domain: string;
    emails: Array<{
      email: string;
      firstName: string;
      lastName: string;
      position: string;
      confidence: number;
    }>;
  }>;
}

export interface SnovBulkEmailVerifierRequest {
  emails: string[];
}

export interface SnovBulkEmailVerifierResponse {
  success: boolean;
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  results?: Array<{
    email: string;
    status: 'valid' | 'invalid' | 'catch-all' | 'unknown';
    confidence: number;
  }>;
}

export class SnovService {
  private readonly logger: Logger;
  private readonly config: SnovConfig;
  private readonly cacheService: CacheService;
  private readonly baseUrl: string;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number;

  constructor(config: SnovConfig, cacheConfig: CacheConfig, logger?: Logger) {
    this.logger = logger || new Logger('SnovService');
    this.config = {
      baseUrl: 'https://api.snov.io/v1',
      rateLimitPerMinute: 60,
      retryAttempts: 3,
      timeoutMs: 30000,
      ...config
    };
    this.baseUrl = this.config.baseUrl!;
    this.minRequestInterval = 60000 / this.config.rateLimitPerMinute!; // ms between requests
    this.cacheService = new CacheService(cacheConfig, this.logger);
  }

  /**
   * Get OAuth access token for API requests
   */
  private async getAccessToken(): Promise<string> {
    const cacheKey = `snov_access_token_${this.config.apiKey}`;
    
    try {
      // Check cache first
      const cachedToken = await this.cacheService.getRawJSON(cacheKey);
      
      if (cachedToken && typeof cachedToken === 'object' && 'access_token' in cachedToken) {
        this.logger.info('Using cached Snov.io access token');
        return cachedToken.access_token as string;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached access token', { error });
    }

    // Get new token
    const response = await this.makeRequest('/oauth/access_token', 'POST', {
      grant_type: 'client_credentials',
      client_id: this.config.apiKey,
      client_secret: this.config.apiSecret
    }, false);

    if (response.access_token) {
      // Cache token for 50 minutes (expires in 1 hour)
      await this.cacheService.setRawJSON(
        cacheKey,
        response,
        CacheType.SNOV_CONTACTS_RAW
      );
      
      this.logger.info('Obtained new Snov.io access token');
      return response.access_token;
    }

    throw new Error('Failed to obtain Snov.io access token');
  }

  /**
   * Rate limiting helper
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      this.logger.debug(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: any,
    useAuth: boolean = true
  ): Promise<any> {
    await this.enforceRateLimit();

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SalesIntelligence/1.0'
    };

    if (useAuth) {
      const accessToken = await this.getAccessToken();
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const requestConfig: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeoutMs!)
    };

    if (data && method === 'POST') {
      requestConfig.body = JSON.stringify(data);
    } else if (data && method === 'GET') {
      const params = new URLSearchParams(data).toString();
      url.concat(`?${params}`);
    }

    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        this.logger.debug(`Snov.io API request attempt ${attempt}`, { 
          endpoint, 
          method,
          hasData: !!data 
        });

        const response = await fetch(url, requestConfig);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        this.logger.debug('Snov.io API request successful', { 
          endpoint,
          statusCode: response.status 
        });
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logger.warn(`Snov.io API request attempt ${attempt} failed`, {
          endpoint,
          error: lastError.message,
          willRetry: attempt < this.config.retryAttempts!
        });

        if (attempt < this.config.retryAttempts!) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    this.logger.error('Snov.io API request failed after all retries', {
      endpoint,
      attempts: this.config.retryAttempts,
      error: lastError?.message || 'Unknown error'
    });
    
    throw lastError || new Error('Unknown error occurred');
  }

  /**
   * Find emails for a domain
   */
  async findEmails(request: SnovEmailFinderRequest): Promise<SnovEmailFinderResponse> {
    const cacheKey = `snov_email_finder_${request.domain}_${JSON.stringify(request)}`;
    
    try {
      const cached = await this.cacheService.getRawJSON(cacheKey);
      if (cached) {
        this.logger.info('Returning cached email finder results', { domain: request.domain });
        return cached as SnovEmailFinderResponse;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached email finder results', { error });
    }

    const response = await this.makeRequest('/get-emails-from-domain', 'POST', {
      domain: request.domain,
      type: request.type || 'all',
      department: request.department,
      positions: request.positions,
      limit: request.limit || 100
    });

    const result: SnovEmailFinderResponse = {
      success: true,
      emails: response.emails || [],
      companyName: response.companyName || '',
      domain: request.domain,
      totalFound: response.emails?.length || 0
    };

    // Cache for 24 hours
    await this.cacheService.setRawJSON(cacheKey, result, CacheType.SNOV_CONTACTS_RAW);
    
    this.logger.info('Email finder completed', {
      domain: request.domain,
      emailsFound: result.totalFound
    });

    return result;
  }

  /**
   * Verify email addresses
   */
  async verifyEmails(request: SnovEmailVerifierRequest): Promise<SnovEmailVerifierResponse> {
    const cacheKey = `snov_email_verifier_${request.emails.join(',')}`;
    
    try {
      const cached = await this.cacheService.getRawJSON(cacheKey);
      if (cached) {
        this.logger.info('Returning cached email verification results');
        return cached as SnovEmailVerifierResponse;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached email verification results', { error });
    }

    const response = await this.makeRequest('/get-emails-verification', 'POST', {
      emails: request.emails
    });

    const result: SnovEmailVerifierResponse = {
      success: true,
      results: response.results || []
    };

    // Cache for 7 days (email verification is stable)
    await this.cacheService.setRawJSON(cacheKey, result, CacheType.SNOV_VERIFICATION_RAW);
    
    this.logger.info('Email verification completed', {
      emailsProcessed: request.emails.length,
      results: result.results.length
    });

    return result;
  }

  /**
   * Search for emails by domain
   */
  async searchDomain(request: SnovDomainSearchRequest): Promise<SnovDomainSearchResponse> {
    const cacheKey = `snov_domain_search_${request.domain}_${JSON.stringify(request)}`;
    
    try {
      const cached = await this.cacheService.getRawJSON(cacheKey);
      if (cached) {
        this.logger.info('Returning cached domain search results', { domain: request.domain });
        return cached as SnovDomainSearchResponse;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached domain search results', { error });
    }

    const response = await this.makeRequest('/get-domain-emails-with-info', 'POST', {
      domain: request.domain,
      type: request.type || 'all',
      limit: request.limit || 100,
      lastId: request.lastId
    });

    const result: SnovDomainSearchResponse = {
      success: true,
      emails: response.emails || [],
      domain: request.domain,
      companyName: response.companyName || '',
      totalEmails: response.emails?.length || 0,
      lastId: response.lastId
    };

    // Cache for 12 hours
    await this.cacheService.setRawJSON(cacheKey, result, CacheType.SNOV_CONTACTS_RAW);
    
    this.logger.info('Domain search completed', {
      domain: request.domain,
      emailsFound: result.totalEmails
    });

    return result;
  }

  /**
   * Enrich data for a person
   */
  async enrichData(request: SnovDataEnrichmentRequest): Promise<SnovDataEnrichmentResponse> {
    const cacheKey = `snov_data_enrichment_${JSON.stringify(request)}`;
    
    try {
      const cached = await this.cacheService.getRawJSON(cacheKey);
      if (cached) {
        this.logger.info('Returning cached data enrichment results');
        return cached as SnovDataEnrichmentResponse;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached data enrichment results', { error });
    }

    const response = await this.makeRequest('/get-profile-by-email', 'POST', request);

    const result: SnovDataEnrichmentResponse = {
      success: true,
      data: {
        email: response.data?.email,
        firstName: response.data?.firstName,
        lastName: response.data?.lastName,
        position: response.data?.position,
        company: response.data?.company,
        socialProfiles: response.data?.socialProfiles,
        location: response.data?.location,
        confidence: response.data?.confidence || 0.5
      }
    };

    // Cache for 30 days (personal data is relatively stable)
    await this.cacheService.setRawJSON(cacheKey, result, CacheType.SNOV_CONTACTS_RAW);
    
    this.logger.info('Data enrichment completed', {
      hasEmail: !!request.email,
      hasName: !!(request.firstName && request.lastName)
    });

    return result;
  }

  /**
   * Enrich LinkedIn profile
   */
  async enrichLinkedIn(request: SnovLinkedInEnrichmentRequest): Promise<SnovLinkedInEnrichmentResponse> {
    const cacheKey = `snov_linkedin_enrichment_${request.linkedinUrl}`;
    
    try {
      const cached = await this.cacheService.getRawJSON(cacheKey);
      if (cached) {
        this.logger.info('Returning cached LinkedIn enrichment results');
        return cached as SnovLinkedInEnrichmentResponse;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached LinkedIn enrichment results', { error });
    }

    const response = await this.makeRequest('/get-profile-by-url', 'POST', {
      url: request.linkedinUrl
    });

    const result: SnovLinkedInEnrichmentResponse = {
      success: true,
      data: {
        firstName: response.data?.firstName || '',
        lastName: response.data?.lastName || '',
        position: response.data?.position || '',
        company: response.data?.company || '',
        location: response.data?.location || '',
        email: response.data?.email,
        industry: response.data?.industry,
        skills: response.data?.skills || [],
        experience: response.data?.experience || [],
        education: response.data?.education || []
      }
    };

    // Cache for 7 days (LinkedIn data changes moderately)
    await this.cacheService.setRawJSON(cacheKey, result, CacheType.SNOV_CONTACTS_RAW);
    
    this.logger.info('LinkedIn enrichment completed', {
      linkedinUrl: request.linkedinUrl
    });

    return result;
  }

  /**
   * Bulk email finder (async operation)
   */
  async bulkFindEmails(request: SnovBulkEmailFinderRequest): Promise<SnovBulkEmailFinderResponse> {
    const response = await this.makeRequest('/bulk-get-emails-from-domain', 'POST', {
      domains: request.domains,
      positions: request.positions,
      departments: request.departments,
      limit: request.limit || 100
    });

    const result: SnovBulkEmailFinderResponse = {
      success: true,
      jobId: response.jobId,
      status: response.status || 'processing',
      results: response.results
    };

    this.logger.info('Bulk email finder initiated', {
      jobId: result.jobId,
      domains: request.domains.length
    });

    return result;
  }

  /**
   * Bulk email verifier (async operation)
   */
  async bulkVerifyEmails(request: SnovBulkEmailVerifierRequest): Promise<SnovBulkEmailVerifierResponse> {
    const response = await this.makeRequest('/bulk-get-emails-verification', 'POST', {
      emails: request.emails
    });

    const result: SnovBulkEmailVerifierResponse = {
      success: true,
      jobId: response.jobId,
      status: response.status || 'processing',
      results: response.results
    };

    this.logger.info('Bulk email verifier initiated', {
      jobId: result.jobId,
      emails: request.emails.length
    });

    return result;
  }

  /**
   * Get bulk job status and results
   */
  async getBulkJobStatus(jobId: string): Promise<{ status: string; results?: any }> {
    const response = await this.makeRequest(`/bulk-job-status/${jobId}`, 'GET');
    
    this.logger.info('Bulk job status retrieved', {
      jobId,
      status: response.status
    });

    return {
      status: response.status,
      results: response.results
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Try to get access token as a simple health check
      await this.getAccessToken();
      
      return {
        status: 'healthy',
        details: {
          baseUrl: this.baseUrl,
          rateLimitPerMinute: this.config.rateLimitPerMinute,
          lastRequestTime: this.lastRequestTime
        }
      };
    } catch (error) {
      this.logger.error('Snov.io health check failed', { error });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}
