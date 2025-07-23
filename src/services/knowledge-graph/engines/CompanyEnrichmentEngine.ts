/**
 * CompanyEnrichmentEngine - Handles comprehensive company enrichment via Google Knowledge Graph
 */

import { Logger } from '../../core/Logger';
import { EntityExtractor } from '../extractors/EntityExtractor';
import { CacheProcessor } from '../processors/CacheProcessor';

import {
  GoogleKnowledgeGraphResult,
  KnowledgeGraphConfig,
  GoogleKnowledgeGraphAPIResponse,
  KnowledgeGraphResult,
  KnowledgeGraphError
} from '../types/KnowledgeGraphTypes';

export class CompanyEnrichmentEngine {
  private entityExtractor: EntityExtractor;
  private cacheProcessor: CacheProcessor;
  private config: KnowledgeGraphConfig;

  constructor(
    private logger: Logger,
    cacheProcessor: CacheProcessor,
    config: KnowledgeGraphConfig = {}
  ) {
    this.entityExtractor = new EntityExtractor(logger);
    this.cacheProcessor = cacheProcessor;
    this.config = {
      apiKey: process.env.GOOGLE_API_KEY,
      baseUrl: 'https://kgsearch.googleapis.com/v1/entities:search',
      timeout: 10000,
      maxRetries: 2,
      cacheEnabled: true,
      ...config
    };
  }

  /**
   * Enrich company with comprehensive metadata from Google Knowledge Graph
   */
  async enrichCompany(companyName: string): Promise<GoogleKnowledgeGraphResult | null> {
    const startTime = Date.now();
    
    this.logger.info('Starting Google Knowledge Graph enrichment', { companyName });

    try {
      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cached = await this.checkCache(companyName);
        if (cached) {
          this.logger.info('Returning cached enrichment result', { 
            companyName, 
            processingTime: Date.now() - startTime 
          });
          return cached;
        }
      }

      // Perform API enrichment
      const result = await this.performEnrichment(companyName);
      
      // Cache successful results
      if (result && this.config.cacheEnabled) {
        await this.cacheResult(companyName, result);
      }

      this.logger.info('Google Knowledge Graph enrichment completed', {
        companyName,
        success: !!result,
        processingTime: Date.now() - startTime,
        qualityScore: result?.extractionMetrics.qualityScore
      });

      return result;
    } catch (error) {
      this.logger.error('Google Knowledge Graph enrichment failed', { 
        companyName, 
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime
      });
      return null;
    }
  }

  /**
   * Enrich multiple companies in batch
   */
  async enrichCompanies(companyNames: string[]): Promise<Array<{
    companyName: string;
    result: GoogleKnowledgeGraphResult | null;
    error?: string;
  }>> {
    this.logger.info('Starting batch enrichment', { count: companyNames.length });

    const results = await Promise.allSettled(
      companyNames.map(name => this.enrichCompany(name))
    );

    return companyNames.map((name, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        return { companyName: name, result: result.value };
      } else {
        return { 
          companyName: name, 
          result: null, 
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        };
      }
    });
  }

  /**
   * Get enrichment result with detailed metadata
   */
  async getDetailedEnrichment(companyName: string): Promise<KnowledgeGraphResult<GoogleKnowledgeGraphResult>> {
    const startTime = Date.now();
    let apiCalls = 0;
    let cacheHit = false;

    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = await this.checkCache(companyName);
        if (cached) {
          cacheHit = true;
          return {
            success: true,
            data: cached,
            metadata: {
              processingTime: Date.now() - startTime,
              cacheHit,
              apiCalls
            }
          };
        }
      }

      // Perform enrichment
      apiCalls = 1;
      const result = await this.performEnrichment(companyName);

      if (!result) {
        return {
          success: false,
          error: {
            code: 'NO_DATA_FOUND',
            message: `No data found for company: ${companyName}`,
            recoverable: false
          },
          metadata: {
            processingTime: Date.now() - startTime,
            cacheHit,
            apiCalls
          }
        };
      }

      // Cache successful result
      if (this.config.cacheEnabled) {
        await this.cacheResult(companyName, result);
      }

      return {
        success: true,
        data: result,
        metadata: {
          processingTime: Date.now() - startTime,
          cacheHit,
          apiCalls
        }
      };
    } catch (error) {
      const knowledgeGraphError: KnowledgeGraphError = {
        code: 'ENRICHMENT_FAILED',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
        retryAfter: 5000
      };

      return {
        success: false,
        error: knowledgeGraphError,
        metadata: {
          processingTime: Date.now() - startTime,
          cacheHit,
          apiCalls
        }
      };
    }
  }

  // =====================================
  // PRIVATE METHODS
  // =====================================

  private async checkCache(companyName: string): Promise<GoogleKnowledgeGraphResult | null> {
    try {
      const cacheKey = this.cacheProcessor.generateEnrichmentCacheKey(companyName);
      return await this.cacheProcessor.checkEnrichmentCache(cacheKey);
    } catch (error) {
      this.logger.warn('Cache check failed', { companyName, error: String(error) });
      return null;
    }
  }

  private async cacheResult(companyName: string, result: GoogleKnowledgeGraphResult): Promise<void> {
    try {
      const cacheKey = this.cacheProcessor.generateEnrichmentCacheKey(companyName);
      await this.cacheProcessor.cacheEnrichmentResult(cacheKey, result, 'ENRICHMENT' as any);
    } catch (error) {
      this.logger.warn('Failed to cache result', { companyName, error: String(error) });
    }
  }

  private async performEnrichment(companyName: string): Promise<GoogleKnowledgeGraphResult | null> {
    if (!this.config.apiKey) {
      this.logger.warn('Google Knowledge Graph API key not configured');
      return null;
    }

    const response = await this.makeAPIRequest(companyName);
    if (!response) return null;

    const entity = response.itemListElement?.[0]?.result;
    if (!entity) {
      this.logger.debug('No entity found in Knowledge Graph response', { companyName });
      return null;
    }

    const enrichedResult = this.entityExtractor.extractComprehensiveMetadata(entity, companyName);
    
    // Validate result quality
    const validation = this.entityExtractor.validateExtractionResult(enrichedResult);
    if (!validation.isValid) {
      this.logger.warn('Extraction validation failed', { 
        companyName, 
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    return enrichedResult;
  }

  private async makeAPIRequest(companyName: string): Promise<GoogleKnowledgeGraphAPIResponse | null> {
    const url = `${this.config.baseUrl}?query=${encodeURIComponent(companyName)}&types=Organization&key=${this.config.apiKey}`;

    this.logger.debug('Making Google Knowledge Graph API request', { 
      companyName,
      url: url.replace(this.config.apiKey!, '[REDACTED]')
    });

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (this.config.maxRetries || 2); attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'SalesIntelligence/1.0',
          },
          signal: AbortSignal.timeout(this.config.timeout || 10000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as GoogleKnowledgeGraphAPIResponse;
        
        this.logger.debug('Google Knowledge Graph API request successful', {
          companyName,
          entityCount: data.itemListElement?.length || 0,
          attempt
        });

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logger.warn('Google Knowledge Graph API request failed', {
          companyName,
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message
        });

        if (attempt < (this.config.maxRetries || 2)) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All API request attempts failed');
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Check if enrichment result is successful enough to cache
   */
  private isEnrichmentSuccessful(result: GoogleKnowledgeGraphResult): boolean {
    return !!(
      result.name &&
      result.sources?.length > 0 &&
      result.extractionMetrics.qualityScore > 0.2 &&
      result.extractionMetrics.sectionsExtracted > 0
    );
  }

  /**
   * Get failure indicators for debugging
   */
  private getEnrichmentFailureIndicators(result: GoogleKnowledgeGraphResult): string[] {
    const indicators: string[] = [];

    if (!result.name) indicators.push('No company name extracted');
    if (!result.sources?.length) indicators.push('No sources found');
    if (result.extractionMetrics.qualityScore <= 0.2) indicators.push('Low quality score');
    if (result.extractionMetrics.sectionsExtracted === 0) indicators.push('No sections extracted');
    if (!result.domain && !result.description) indicators.push('No basic information found');

    return indicators;
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus(): {
    isConfigured: boolean;
    hasApiKey: boolean;
    cacheEnabled: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const hasApiKey = !!this.config.apiKey;
    
    if (!hasApiKey) {
      issues.push('Google API key not configured');
    }

    if (!this.config.baseUrl) {
      issues.push('Base URL not configured');
    }

    return {
      isConfigured: hasApiKey && !!this.config.baseUrl,
      hasApiKey,
      cacheEnabled: !!this.config.cacheEnabled,
      issues
    };
  }

  /**
   * Health check for the enrichment engine
   */
  async healthCheck(): Promise<boolean> {
    try {
      const configStatus = this.getConfigurationStatus();
      if (!configStatus.isConfigured) {
        this.logger.warn('Enrichment engine not properly configured', { 
          issues: configStatus.issues 
        });
        return false;
      }

      // Test with a simple, known entity
      const testResult = await this.enrichCompany('Google');
      return !!testResult;
    } catch (error) {
      this.logger.error('Enrichment engine health check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
} 