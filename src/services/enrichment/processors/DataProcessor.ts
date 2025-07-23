/**
 * DataProcessor - Handles data processing, merging, and validation for enrichment
 */

import { Logger } from '../../core/Logger';

import {
  CompanyBasicInfo,
  ProductSuggestion,
  CompetitorSuggestion,
  CompanyEnrichmentResult,
  ProcessingResult,
  ValidationResult,
  QualityMetrics,
  DeduplicationOptions
} from '../types/EnrichmentTypes';

export class DataProcessor {
  constructor(private logger: Logger) {}

  /**
   * Merge multiple enrichment results into a single result
   */
  mergeResults(results: PromiseSettledResult<Partial<CompanyEnrichmentResult>>[], companyName: string): CompanyEnrichmentResult {
    this.logger.debug('Merging enrichment results', { companyName, resultCount: results.length });

    const mergedResult: CompanyEnrichmentResult = {
      basicInfo: { name: companyName },
      suggestedProducts: [],
      suggestedCompetitors: [],
      suggestedIndustries: [],
      sources: [],
      confidence: 0
    };

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<Partial<CompanyEnrichmentResult>> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    if (successfulResults.length === 0) {
      this.logger.warn('No successful enrichment results to merge', { companyName });
      return mergedResult;
    }

    // Merge basic info with priority (later sources override earlier ones)
    for (const result of successfulResults) {
      if (result.basicInfo) {
        mergedResult.basicInfo = {
          ...mergedResult.basicInfo,
          ...result.basicInfo,
          name: companyName // Always preserve the search name
        };
      }

      // Collect products
      if (result.suggestedProducts) {
        mergedResult.suggestedProducts.push(...result.suggestedProducts);
      }

      // Collect competitors  
      if (result.suggestedCompetitors) {
        mergedResult.suggestedCompetitors.push(...result.suggestedCompetitors);
      }

      // Collect industries
      if (result.suggestedIndustries) {
        mergedResult.suggestedIndustries.push(...result.suggestedIndustries);
      }

      // Collect sources
      if (result.sources) {
        mergedResult.sources.push(...result.sources);
      }
    }

    // Deduplicate and sort collections
    mergedResult.suggestedProducts = this.dedupeProducts(mergedResult.suggestedProducts)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    mergedResult.suggestedCompetitors = this.dedupeCompetitors(mergedResult.suggestedCompetitors)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    mergedResult.suggestedIndustries = [...new Set(mergedResult.suggestedIndustries)]
      .slice(0, 5);

    mergedResult.sources = [...new Set(mergedResult.sources)];

    // Calculate overall confidence
    mergedResult.confidence = this.calculateOverallConfidence(mergedResult, successfulResults.length);

    this.logger.info('Merged enrichment results', {
      companyName,
      sources: mergedResult.sources.length,
      products: mergedResult.suggestedProducts.length,
      competitors: mergedResult.suggestedCompetitors.length,
      confidence: mergedResult.confidence
    });

    return mergedResult;
  }

  /**
   * Validate enrichment result quality
   */
  validateEnrichmentResult(result: CompanyEnrichmentResult): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!result.basicInfo?.name) {
      errors.push('Company name is required');
    }

    // Data quality checks
    if (!result.basicInfo?.domain && !result.basicInfo?.description) {
      warnings.push('No domain or description available - limited data quality');
    }

    if (result.suggestedProducts.length === 0) {
      warnings.push('No products identified');
    }

    if (result.suggestedCompetitors.length === 0) {
      warnings.push('No competitors identified');
    }

    if (result.sources.length === 0) {
      errors.push('No data sources used');
    }

    if (result.confidence < 0.3) {
      warnings.push('Low confidence score - data may be unreliable');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: result.confidence
    };
  }

  /**
   * Calculate quality metrics for enrichment result
   */
  calculateQualityMetrics(result: CompanyEnrichmentResult): QualityMetrics {
    const completeness = this.calculateCompleteness(result);
    const accuracy = this.estimateAccuracy(result);
    const freshness = this.estimateFreshness(result);
    const consistency = this.checkConsistency(result);

    const overall = (completeness + accuracy + freshness + consistency) / 4;

    return {
      completeness,
      accuracy,
      freshness,
      consistency,
      overall
    };
  }

  /**
   * Extract company info from HTML content
   */
  extractCompanyInfoFromHTML(html: string): Partial<CompanyBasicInfo> {
    const info: Partial<CompanyBasicInfo> = {};

    try {
      // Extract title (company name)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        info.name = titleMatch[1].trim();
      }

      // Extract meta description
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
      if (descMatch) {
        info.description = descMatch[1].trim();
      }

      // Extract keywords for industry hints
      const keywordsMatch = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]+)"/i);
      if (keywordsMatch) {
        const keywords = keywordsMatch[1].toLowerCase();
        // Simple industry detection based on keywords
        if (keywords.includes('software') || keywords.includes('technology')) {
          info.industry = 'Software';
        } else if (keywords.includes('healthcare') || keywords.includes('medical')) {
          info.industry = 'Healthcare';
        } else if (keywords.includes('finance') || keywords.includes('banking')) {
          info.industry = 'Finance';
        }
      }

      this.logger.debug('Extracted company info from HTML', { info });
      return info;
    } catch (error) {
      this.logger.warn('HTML extraction failed', { error: String(error) });
      return {};
    }
  }

  // =====================================
  // PRIVATE CALCULATION METHODS
  // =====================================

  private calculateOverallConfidence(result: CompanyEnrichmentResult, sourceCount: number): number {
    let confidence = 0;
    let factors = 0;

    // Source diversity factor (0-0.3)
    confidence += Math.min(sourceCount * 0.1, 0.3);
    factors++;

    // Data completeness factor (0-0.3)
    const completeness = this.calculateCompleteness(result);
    confidence += completeness * 0.3;
    factors++;

    // Product confidence factor (0-0.2)
    if (result.suggestedProducts.length > 0) {
      const avgProductConfidence = result.suggestedProducts.reduce((sum, p) => sum + p.confidence, 0) / result.suggestedProducts.length;
      confidence += avgProductConfidence * 0.2;
    }
    factors++;

    // Competitor confidence factor (0-0.2)
    if (result.suggestedCompetitors.length > 0) {
      const avgCompetitorConfidence = result.suggestedCompetitors.reduce((sum, c) => sum + c.confidence, 0) / result.suggestedCompetitors.length;
      confidence += avgCompetitorConfidence * 0.2;
    }
    factors++;

    return Math.min(confidence, 1.0);
  }

  private calculateCompleteness(result: CompanyEnrichmentResult): number {
    const fields = ['name', 'domain', 'industry', 'size', 'description', 'headquarters', 'founded'];
    const presentFields = fields.filter(field => result.basicInfo[field as keyof CompanyBasicInfo]);
    
    let completeness = presentFields.length / fields.length;

    // Bonus for having products and competitors
    if (result.suggestedProducts.length > 0) completeness += 0.1;
    if (result.suggestedCompetitors.length > 0) completeness += 0.1;

    return Math.min(completeness, 1.0);
  }

  private estimateAccuracy(result: CompanyEnrichmentResult): number {
    // This is a simplified accuracy estimation
    // In production, this would use validation against known data sources
    
    let accuracy = 0.7; // Base accuracy assumption

    // Higher accuracy if multiple sources agree
    if (result.sources.length >= 2) accuracy += 0.1;
    if (result.sources.length >= 3) accuracy += 0.1;

    // Lower accuracy if confidence is low
    if (result.confidence < 0.5) accuracy -= 0.2;

    return Math.max(0.1, Math.min(accuracy, 1.0));
  }

  private estimateFreshness(result: CompanyEnrichmentResult): number {
    // This is a simplified freshness estimation
    // In production, this would check data source timestamps
    
    let freshness = 0.8; // Assume data is relatively fresh

    // Founded date can indicate age of available data
    if (result.basicInfo.founded) {
      const foundedYear = parseInt(result.basicInfo.founded);
      const currentYear = new Date().getFullYear();
      const age = currentYear - foundedYear;
      
      if (age > 20) freshness -= 0.1;
      if (age > 50) freshness -= 0.2;
    }

    return Math.max(0.1, Math.min(freshness, 1.0));
  }

  private checkConsistency(result: CompanyEnrichmentResult): number {
    // Check internal consistency of the data
    let consistency = 1.0;

    // Check if industry matches product categories
    if (result.basicInfo.industry && result.suggestedProducts.length > 0) {
      const industryMatches = result.suggestedProducts.some(product => 
        product.category?.toLowerCase().includes(result.basicInfo.industry!.toLowerCase())
      );
      if (!industryMatches) consistency -= 0.2;
    }

    // Check if competitors are in similar industry
    if (result.basicInfo.industry && result.suggestedCompetitors.length > 0) {
      const competitorMatches = result.suggestedCompetitors.some(competitor => 
        competitor.category?.toLowerCase().includes(result.basicInfo.industry!.toLowerCase())
      );
      if (!competitorMatches) consistency -= 0.2;
    }

    return Math.max(0.1, consistency);
  }

  // =====================================
  // DEDUPLICATION METHODS
  // =====================================

  private dedupeProducts(products: ProductSuggestion[], options: DeduplicationOptions = {}): ProductSuggestion[] {
    const { threshold = 0.8, mergeStrategy = 'highest_confidence' } = options;
    const seen = new Map<string, ProductSuggestion>();

    for (const product of products) {
      const key = product.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!seen.has(key)) {
        seen.set(key, product);
      } else {
        const existing = seen.get(key)!;
        
        if (mergeStrategy === 'highest_confidence' && product.confidence > existing.confidence) {
          seen.set(key, product);
        } else if (mergeStrategy === 'merge_data') {
          seen.set(key, {
            ...existing,
            confidence: Math.max(existing.confidence, product.confidence),
            description: existing.description && product.description ? 
              `${existing.description}; ${product.description}` : 
              existing.description || product.description
          });
        }
      }
    }

    return Array.from(seen.values());
  }

  private dedupeCompetitors(competitors: CompetitorSuggestion[], options: DeduplicationOptions = {}): CompetitorSuggestion[] {
    const { threshold = 0.8, mergeStrategy = 'highest_confidence' } = options;
    const seen = new Map<string, CompetitorSuggestion>();

    for (const competitor of competitors) {
      const key = competitor.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!seen.has(key)) {
        seen.set(key, competitor);
      } else {
        const existing = seen.get(key)!;
        
        if (mergeStrategy === 'highest_confidence' && competitor.confidence > existing.confidence) {
          seen.set(key, competitor);
        } else if (mergeStrategy === 'merge_data') {
          seen.set(key, {
            ...existing,
            confidence: Math.max(existing.confidence, competitor.confidence),
            reason: existing.reason && competitor.reason ? 
              `${existing.reason}; ${competitor.reason}` : 
              existing.reason || competitor.reason
          });
        }
      }
    }

    return Array.from(seen.values());
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Check if enrichment was successful
   */
  isEnrichmentSuccessful(result: CompanyEnrichmentResult): boolean {
    return (result.confidence || 0) > 0.3 && 
           result.sources.length > 0 && 
           !!(result.basicInfo.domain || result.basicInfo.description);
  }

  /**
   * Get failure indicators for troubleshooting
   */
  getEnrichmentFailureIndicators(result: CompanyEnrichmentResult): string[] {
    const indicators: string[] = [];

    if (result.confidence < 0.3) {
      indicators.push('Low confidence score');
    }

    if (result.sources.length === 0) {
      indicators.push('No data sources responded');
    }

    if (!result.basicInfo.domain && !result.basicInfo.description) {
      indicators.push('No basic company information found');
    }

    if (result.suggestedProducts.length === 0) {
      indicators.push('No products identified');
    }

    if (result.suggestedCompetitors.length === 0) {
      indicators.push('No competitors identified');
    }

    return indicators;
  }
} 