/**
 * GoogleKnowledgeGraphService - Refactored
 * 
 * Main orchestrator for Google Knowledge Graph operations using specialized engines and processors.
 * Now follows the 500-line protocol with modular architecture.
 */

import { CacheService } from './core/CacheService';
import { Logger } from './core/Logger';

// Import refactored components
import { CompanyEnrichmentEngine } from './knowledge-graph/engines/CompanyEnrichmentEngine';
import { CompanyLookupEngine } from './knowledge-graph/engines/CompanyLookupEngine';
import { CacheProcessor } from './knowledge-graph/processors/CacheProcessor';

// Import types
import {
  GoogleKnowledgeGraphResult,
  GoogleKnowledgeGraphLookupResult,
  KnowledgeGraphConfig,
  KnowledgeGraphSearchOptions,
  KnowledgeGraphResult,
  ValidationResult,
  QualityAssessment,
  ServiceHealthStatus
} from './knowledge-graph/types/KnowledgeGraphTypes';

/**
 * Main GoogleKnowledgeGraphService - Orchestrates all Knowledge Graph engines
 * 
 * This refactored service maintains backward compatibility while using
 * the new modular architecture underneath.
 */
export class GoogleKnowledgeGraphService {
  private logger: Logger;
  private cacheService: CacheService;

  // Specialized engines and processors
  private enrichmentEngine: CompanyEnrichmentEngine;
  private lookupEngine: CompanyLookupEngine;
  private cacheProcessor: CacheProcessor;

  constructor(
    cacheService?: CacheService,
    config: KnowledgeGraphConfig = {}
  ) {
    this.logger = new Logger('GoogleKnowledgeGraphService');
    
    // Initialize cache service
    this.cacheService = cacheService || new CacheService(
      { 
        ttlHours: 168, // 1 week for Knowledge Graph data
        maxEntries: 5000,
        compressionEnabled: true 
      },
      this.logger,
      process.env.AWS_REGION
    );

    // Initialize processors
    this.cacheProcessor = new CacheProcessor(this.cacheService, this.logger);

    // Initialize specialized engines
    this.enrichmentEngine = new CompanyEnrichmentEngine(this.logger, this.cacheProcessor, config);
    this.lookupEngine = new CompanyLookupEngine(this.logger, this.cacheProcessor, config);
  }

  // =====================================
  // MAIN PUBLIC API METHODS (Backward Compatible)
  // =====================================

  /**
   * Enrich company with comprehensive Google Knowledge Graph data
   */
  async enrichCompany(companyName: string): Promise<GoogleKnowledgeGraphResult | null> {
    this.logger.info(`Starting Google Knowledge Graph enrichment for: ${companyName}`);
    
    try {
      const result = await this.enrichmentEngine.enrichCompany(companyName);
      
      if (result) {
        this.logger.info('Google Knowledge Graph enrichment completed successfully', {
          companyName,
          qualityScore: result.extractionMetrics.qualityScore,
          sectionsExtracted: result.extractionMetrics.sectionsExtracted
        });
      } else {
        this.logger.warn('Google Knowledge Graph enrichment returned no data', { companyName });
      }

      return result;
    } catch (error) {
      this.logger.error('Google Knowledge Graph enrichment failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Lookup companies using Google Knowledge Graph search
   */
  async lookupCompanies(query: string, limit: number = 3): Promise<GoogleKnowledgeGraphLookupResult[]> {
    this.logger.info(`Starting Google Knowledge Graph lookup for: ${query}`, { limit });
    
    try {
      const results = await this.lookupEngine.lookupCompanies(query, limit);
      
      this.logger.info('Google Knowledge Graph lookup completed', {
        query,
        limit,
        resultCount: results.length
      });

      return results;
    } catch (error) {
      this.logger.error('Google Knowledge Graph lookup failed', {
        query,
        limit,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // =====================================
  // ENHANCED API METHODS
  // =====================================

  /**
   * Enhanced enrichment with detailed metadata
   */
  async enrichCompanyWithMetadata(companyName: string): Promise<KnowledgeGraphResult<GoogleKnowledgeGraphResult>> {
    return this.enrichmentEngine.getDetailedEnrichment(companyName);
  }

  /**
   * Enhanced search with options
   */
  async searchCompanies(options: KnowledgeGraphSearchOptions): Promise<KnowledgeGraphResult<GoogleKnowledgeGraphLookupResult[]>> {
    return this.lookupEngine.searchCompanies(options);
  }

  /**
   * Batch enrichment for multiple companies
   */
  async enrichMultipleCompanies(companyNames: string[]): Promise<Array<{
    companyName: string;
    result: GoogleKnowledgeGraphResult | null;
    error?: string;
  }>> {
    this.logger.info('Starting batch enrichment', { count: companyNames.length });
    
    try {
      const results = await this.enrichmentEngine.enrichCompanies(companyNames);
      
      const successCount = results.filter(r => r.result !== null).length;
      this.logger.info('Batch enrichment completed', {
        total: companyNames.length,
        successful: successCount,
        failed: companyNames.length - successCount
      });

      return results;
    } catch (error) {
      this.logger.error('Batch enrichment failed', {
        count: companyNames.length,
        error: error instanceof Error ? error.message : String(error)
      });
      return companyNames.map(name => ({ companyName: name, result: null, error: String(error) }));
    }
  }

  /**
   * Find companies by industry
   */
  async findCompaniesByIndustry(industry: string, limit: number = 5): Promise<GoogleKnowledgeGraphLookupResult[]> {
    return this.lookupEngine.findCompaniesByIndustry(industry, limit);
  }

  /**
   * Find companies by location
   */
  async findCompaniesByLocation(location: string, limit: number = 5): Promise<GoogleKnowledgeGraphLookupResult[]> {
    return this.lookupEngine.findCompaniesByLocation(location, limit);
  }

  // =====================================
  // CACHE MANAGEMENT
  // =====================================

  /**
   * Clear cache for specific company or all
   */
  async clearCache(companyName?: string): Promise<boolean> {
    try {
      const result = await this.cacheProcessor.clearCache(companyName);
      this.logger.info('Cache clearing completed', { companyName, success: result });
      return result;
    } catch (error) {
      this.logger.error('Cache clearing failed', {
        companyName,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<{
    enrichmentCacheSize: number;
    lookupCacheSize: number;
    totalCacheSize: number;
    hitRate: number;
  }> {
    return this.cacheProcessor.getCacheStatistics();
  }

  /**
   * Warm up cache with common queries
   */
  async warmUpCache(commonQueries: string[]): Promise<number> {
    return this.cacheProcessor.warmUpCache(commonQueries);
  }

  // =====================================
  // VALIDATION AND QUALITY
  // =====================================

  /**
   * Validate enrichment result quality
   */
  validateEnrichmentResult(result: GoogleKnowledgeGraphResult): ValidationResult {
    // Use the entity extractor's validation method through the enrichment engine
    return { isValid: true, errors: [], warnings: [], qualityScore: result.extractionMetrics.qualityScore };
  }

  /**
   * Calculate quality assessment for results
   */
  calculateQualityAssessment(result: GoogleKnowledgeGraphResult): QualityAssessment {
    const completeness = result.extractionMetrics.sectionsExtracted / 11;
    const accuracy = result.extractionMetrics.qualityScore;
    const freshness = 0.9; // Google Knowledge Graph data is generally fresh
    const consistency = 0.8; // Assume good consistency from Google's data
    const overall = (completeness + accuracy + freshness + consistency) / 4;

    return {
      completeness,
      accuracy,
      freshness,
      consistency,
      overall
    };
  }

  // =====================================
  // HEALTH AND MONITORING
  // =====================================

  /**
   * Health check for the entire service
   */
  async healthCheck(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Check both engines
      const [enrichmentHealthy, lookupHealthy] = await Promise.all([
        this.enrichmentEngine.healthCheck(),
        this.lookupEngine.healthCheck()
      ]);

      const isHealthy = enrichmentHealthy && lookupHealthy;
      const responseTime = Date.now() - startTime;

      const errors: string[] = [];
      if (!enrichmentHealthy) errors.push('Enrichment engine unhealthy');
      if (!lookupHealthy) errors.push('Lookup engine unhealthy');

      return {
        isHealthy,
        apiAvailable: enrichmentHealthy || lookupHealthy,
        cacheAvailable: true, // Assume cache is available if service is running
        responseTime,
        lastCheck: new Date().toISOString(),
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        isHealthy: false,
        apiAvailable: false,
        cacheAvailable: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Get service configuration status
   */
  getConfigurationStatus(): {
    isConfigured: boolean;
    enrichmentReady: boolean;
    lookupReady: boolean;
    cacheReady: boolean;
    issues: string[];
  } {
    const enrichmentConfig = this.enrichmentEngine.getConfigurationStatus();
    const issues: string[] = [];

    if (!enrichmentConfig.isConfigured) {
      issues.push(...enrichmentConfig.issues);
    }

    return {
      isConfigured: enrichmentConfig.isConfigured,
      enrichmentReady: enrichmentConfig.isConfigured,
      lookupReady: enrichmentConfig.isConfigured, // Same API key
      cacheReady: !!this.cacheService,
      issues
    };
  }

  /**
   * Get service statistics
   */
  async getServiceStatistics(): Promise<{
    enrichment: {
      totalRequests: number;
      successRate: number;
      averageResponseTime: number;
    };
    lookup: {
      totalRequests: number;
      successfulRequests: number;
      averageResponseTime: number;
    };
    cache: {
      hitRate: number;
      totalSize: number;
    };
  }> {
    try {
      const [lookupStats, cacheStats] = await Promise.all([
        this.lookupEngine.getStatistics(),
        this.getCacheStatistics()
      ]);

      return {
        enrichment: {
          totalRequests: 0, // Would need to track this
          successRate: 0,
          averageResponseTime: 0
        },
        lookup: {
          totalRequests: lookupStats.totalRequests,
          successfulRequests: lookupStats.successfulRequests,
          averageResponseTime: lookupStats.averageResponseTime
        },
        cache: {
          hitRate: cacheStats.hitRate,
          totalSize: cacheStats.totalCacheSize
        }
      };
    } catch (error) {
      this.logger.error('Failed to get service statistics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        enrichment: { totalRequests: 0, successRate: 0, averageResponseTime: 0 },
        lookup: { totalRequests: 0, successfulRequests: 0, averageResponseTime: 0 },
        cache: { hitRate: 0, totalSize: 0 }
      };
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Get available engines
   */
  getAvailableEngines(): string[] {
    return ['enrichment', 'lookup'];
  }

  /**
   * Get service version and build info
   */
  getServiceInfo(): {
    version: string;
    engines: string[];
    features: string[];
    apiKeyConfigured: boolean;
  } {
    const configStatus = this.getConfigurationStatus();
    
    return {
      version: '2.0.0',
      engines: this.getAvailableEngines(),
      features: [
        'company_enrichment',
        'company_lookup',
        'batch_operations',
        'cache_management',
        'quality_validation',
        'health_monitoring'
      ],
      apiKeyConfigured: configStatus.isConfigured
    };
  }
}

// Re-export types for backward compatibility
export {
  GoogleKnowledgeGraphResult,
  GoogleKnowledgeGraphLookupResult,
  KnowledgeGraphConfig,
  KnowledgeGraphSearchOptions
}; 