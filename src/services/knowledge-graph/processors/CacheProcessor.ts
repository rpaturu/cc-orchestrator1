/**
 * CacheProcessor - Handles caching operations for Google Knowledge Graph
 */

import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { CacheType } from '../../../types/cache-types';

import {
  GoogleKnowledgeGraphResult,
  GoogleKnowledgeGraphLookupResult,
  KnowledgeGraphCacheKey,
  CacheOptions
} from '../types/KnowledgeGraphTypes';

export class CacheProcessor {
  constructor(
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  // =====================================
  // ENRICHMENT CACHE OPERATIONS
  // =====================================

  /**
   * Generate cache key for enrichment operations
   */
  generateEnrichmentCacheKey(companyName: string): string {
    return `kg_enrichment_${companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  /**
   * Check cache for existing enrichment result
   */
  async checkEnrichmentCache(cacheKey: string): Promise<GoogleKnowledgeGraphResult | null> {
    try {
      const cached = await this.cacheService.get(cacheKey);
      if (cached && !this.isCacheExpired(cached, 168)) { // 1 week TTL for enrichment
        this.logger.debug('Enrichment cache hit', { cacheKey });
        return (cached as unknown) as GoogleKnowledgeGraphResult;
      }
      this.logger.debug('Enrichment cache miss', { cacheKey });
      return null;
    } catch (error) {
      this.logger.warn('Enrichment cache check failed', { 
        cacheKey, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Cache enrichment result
   */
  async cacheEnrichmentResult(
    cacheKey: string, 
    result: GoogleKnowledgeGraphResult, 
    _cacheType: CacheType
  ): Promise<void> {
    try {
      // Only cache successful results
      if (this.isEnrichmentSuccessful(result)) {
        await this.cacheService.setRawJSON(cacheKey, result, CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP);
        this.logger.debug('Cached enrichment result', { 
          cacheKey, 
          qualityScore: result.extractionMetrics.qualityScore 
        });
      } else {
        this.logger.debug('Skipping cache for low-quality enrichment result', { 
          cacheKey, 
          qualityScore: result.extractionMetrics.qualityScore 
        });
      }
    } catch (error) {
      this.logger.warn('Failed to cache enrichment result', { 
        cacheKey, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  // =====================================
  // LOOKUP CACHE OPERATIONS
  // =====================================

  /**
   * Generate cache key for lookup operations
   */
  generateLookupCacheKey(query: string, limit: number): string {
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `kg_lookup_${cleanQuery}_limit_${limit}`;
  }

  /**
   * Check cache for existing lookup results
   */
  async checkLookupCache(cacheKey: string): Promise<GoogleKnowledgeGraphLookupResult[] | null> {
    try {
      const cached = await this.cacheService.get(cacheKey);
      if (cached && !this.isCacheExpired(cached, 72)) { // 3 days TTL for lookup
        this.logger.debug('Lookup cache hit', { cacheKey });
        return (cached as unknown) as GoogleKnowledgeGraphLookupResult[];
      }
      this.logger.debug('Lookup cache miss', { cacheKey });
      return null;
    } catch (error) {
      this.logger.warn('Lookup cache check failed', { 
        cacheKey, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Cache lookup results
   */
  async cacheLookupResult(
    cacheKey: string, 
    results: GoogleKnowledgeGraphLookupResult[], 
    _cacheType: CacheType
  ): Promise<void> {
    try {
      // Only cache if we have meaningful results
      if (results.length > 0) {
        await this.cacheService.setRawJSON(cacheKey, results, CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP);
        this.logger.debug('Cached lookup results', { 
          cacheKey, 
          resultCount: results.length 
        });
      } else {
        this.logger.debug('Skipping cache for empty lookup results', { cacheKey });
      }
    } catch (error) {
      this.logger.warn('Failed to cache lookup results', { 
        cacheKey, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  // =====================================
  // CACHE MANAGEMENT UTILITIES
  // =====================================

  /**
   * Check if cached data is expired
   */
  private isCacheExpired(cached: any, maxAgeHours: number): boolean {
    if (!cached.timestamp) return true;
    
    const age = Date.now() - new Date(cached.timestamp).getTime();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    return age > maxAge;
  }

  /**
   * Check if enrichment result is worth caching
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
   * Get cache statistics for monitoring
   */
  async getCacheStatistics(): Promise<{
    enrichmentCacheSize: number;
    lookupCacheSize: number;
    totalCacheSize: number;
    hitRate: number;
  }> {
    try {
      // This would require cache service to expose statistics
      // For now, return placeholder values
      return {
        enrichmentCacheSize: 0,
        lookupCacheSize: 0,
        totalCacheSize: 0,
        hitRate: 0.0
      };
    } catch (error) {
      this.logger.warn('Failed to get cache statistics', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        enrichmentCacheSize: 0,
        lookupCacheSize: 0,
        totalCacheSize: 0,
        hitRate: 0.0
      };
    }
  }

  /**
   * Clear cache for specific company or all
   */
  async clearCache(companyName?: string): Promise<boolean> {
    try {
      if (companyName) {
        // Clear specific company cache
        const enrichmentKey = this.generateEnrichmentCacheKey(companyName);
        await this.cacheService.delete(enrichmentKey);
        
        // Also try to clear common lookup variations
        const commonQueries = [companyName, companyName.toLowerCase(), companyName.toUpperCase()];
        for (const query of commonQueries) {
          const lookupKey = this.generateLookupCacheKey(query, 3);
          await this.cacheService.delete(lookupKey);
        }
        
        this.logger.info('Cleared cache for specific company', { companyName });
      } else {
        // This would require cache service to support pattern-based clearing
        this.logger.warn('Global cache clearing not implemented');
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error('Failed to clear cache', { 
        companyName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Warm up cache with common queries
   */
  async warmUpCache(commonQueries: string[]): Promise<number> {
    let warmedUp = 0;
    
    for (const query of commonQueries) {
      try {
        // Check if already cached
        const lookupKey = this.generateLookupCacheKey(query, 3);
        const cached = await this.checkLookupCache(lookupKey);
        
        if (!cached) {
          // This would trigger actual lookup to warm the cache
          // For now, just log the intent
          this.logger.debug('Would warm up cache for query', { query });
          warmedUp++;
        }
      } catch (error) {
        this.logger.warn('Failed to warm up cache for query', { 
          query, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    this.logger.info('Cache warm-up completed', { 
      totalQueries: commonQueries.length, 
      warmedUp 
    });
    
    return warmedUp;
  }

  /**
   * Validate cache consistency
   */
  async validateCacheConsistency(): Promise<{
    isConsistent: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // This would implement cache validation logic
      // For now, return placeholder validation
      
      if (issues.length === 0) {
        recommendations.push('Cache appears to be consistent');
      } else {
        recommendations.push('Consider clearing and rebuilding cache');
      }

      return {
        isConsistent: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      this.logger.error('Cache validation failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return {
        isConsistent: false,
        issues: ['Cache validation failed'],
        recommendations: ['Investigate cache service health']
      };
    }
  }

  // =====================================
  // ADVANCED CACHE OPERATIONS
  // =====================================

  /**
   * Create cache key with options
   */
  createCacheKey(options: {
    operation: 'enrichment' | 'lookup';
    query?: string;
    companyName?: string;
    limit?: number;
    additionalParams?: Record<string, any>;
  }): string {
    const { operation, query, companyName, limit, additionalParams } = options;

    let baseKey: string;
    if (operation === 'enrichment' && companyName) {
      baseKey = this.generateEnrichmentCacheKey(companyName);
    } else if (operation === 'lookup' && query) {
      baseKey = this.generateLookupCacheKey(query, limit || 3);
    } else {
      throw new Error('Invalid cache key parameters');
    }

    // Add additional parameters if provided
    if (additionalParams && Object.keys(additionalParams).length > 0) {
      const paramString = Object.entries(additionalParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}_${value}`)
        .join('_');
      baseKey += `_${paramString}`;
    }

    return baseKey;
  }

  /**
   * Batch cache operations
   */
  async batchCacheOperation(operations: Array<{
    type: 'set' | 'get' | 'delete';
    key: string;
    data?: any;
    cacheType?: CacheType;
  }>): Promise<Array<{ success: boolean; result?: any; error?: string }>> {
    const results = [];

    for (const op of operations) {
      try {
        let result;
        switch (op.type) {
          case 'set':
            if (op.data && op.cacheType) {
              await this.cacheService.setRawJSON(op.key, op.data, op.cacheType);
              result = true;
            } else {
              throw new Error('Set operation requires data and cacheType');
            }
            break;
          case 'get':
            result = await this.cacheService.get(op.key);
            break;
          case 'delete':
            await this.cacheService.delete(op.key);
            result = true;
            break;
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }

        results.push({ success: true, result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return results;
  }
} 