/**
 * DataSourceOrchestrator - Refactored
 * 
 * Central orchestrator for multi-source data collection with smart planning and cost optimization.
 * Now using modular architecture with specialized engines and processors.
 */

import { CacheService } from './core/CacheService';
import { Logger } from './core/Logger';
import { SerpAPIService } from './SerpAPIService';

// Import refactored components
import { DataCollectionEngine } from './orchestration/engines/DataCollectionEngine';
import { OrchestrationCore } from './orchestration/core/OrchestrationCore';

// Import types
import {
  DataCollectionPlan,
  RawDataAvailability,
  MultiSourceData,
  CollectionMetrics,
  ConsumerType,
  SourceType,
  VendorContext,
  ContextAwareCollectionPlan,
  CustomerIntelligenceRequest,
  CustomerIntelligenceResponse,
  OrchestrationConfig,
  OrchestrationHealth
} from './orchestration/types/OrchestrationTypes';

import {
  CONSUMER_DATASET_REQUIREMENTS,
  DatasetType
} from '../types/dataset-requirements';

/**
 * Main DataSourceOrchestrator - Orchestrates all collection engines
 * 
 * This refactored service maintains backward compatibility while using
 * the new modular architecture underneath.
 */
export class DataSourceOrchestrator extends OrchestrationCore {
  private dataCollectionEngine: DataCollectionEngine;

  // Cost budgets by consumer type (in USD)
  private readonly costBudgets: Record<ConsumerType, number> = {
    profile: 2.0,      // Basic profile lookup
    vendor_context: 5.0,  // Deep vendor analysis
    customer_intelligence: 7.0, // Comprehensive prospect intelligence  
    test: 1.0          // Minimal test cost
  };

  // Default cache configurations by consumer type
  private readonly cacheConfigs: Record<ConsumerType, { ttlHours: number; quality: number }> = {
    profile: { ttlHours: 168, quality: 0.7 },    // 1 week, basic quality
    vendor_context: { ttlHours: 72, quality: 0.8 },  // 3 days, good quality
    customer_intelligence: { ttlHours: 24, quality: 0.85 }, // 1 day, high quality
    test: { ttlHours: 1, quality: 0.6 }          // 1 hour, minimal quality
  };

  constructor(
    cacheService: CacheService,
    logger: Logger,
    serpAPIService: SerpAPIService,
    config?: Partial<OrchestrationConfig>
  ) {
    super(cacheService, logger, serpAPIService, config);
    
    // Initialize specialized engines
    this.dataCollectionEngine = new DataCollectionEngine(
      cacheService,
      logger,
      serpAPIService,
      config
    );
  }

  // =====================================
  // MAIN PUBLIC API METHODS (Backward Compatible)
  // =====================================

  /**
   * Get customer intelligence with vendor context awareness
   */
  async getCustomerIntelligence(request: CustomerIntelligenceRequest): Promise<CustomerIntelligenceResponse> {
    const { customerCompany, vendorCompany, consumerType, maxCost, urgency, requiredDatasets } = request;

    try {
      this.logger.info('Starting customer intelligence collection', {
        customerCompany,
        vendorCompany,
        consumerType,
        urgency,
      });

      // Get vendor context first
      const vendorContext = await this.getVendorContext(vendorCompany);

      // Create context-aware collection plan
      const plan = await this.createContextAwareCollectionPlan(
        customerCompany,
        consumerType,
        vendorContext,
        maxCost || this.costBudgets[consumerType],
        requiredDatasets
      );

      // Execute data collection
      const data = await this.dataCollectionEngine.executeParallelCollection(plan);

      // Calculate metrics and quality
      const qualityScore = this.calculateDataQuality(data, 'serp_api' as SourceType); // Use primary source for quality
      const basePlan = plan as DataCollectionPlan; // Cast to access inherited properties
      const metrics: CollectionMetrics = {
        totalRequests: 1,
        cacheHits: 0,
        apiCalls: 1,
        totalCost: basePlan.estimatedCost || 0,
        totalSavings: 0,
        averageResponseTime: basePlan.estimatedDuration || 0,
        requestsByConsumer: { [consumerType]: 1 } as Record<ConsumerType, number>,
        costsByConsumer: { [consumerType]: basePlan.estimatedCost || 0 } as Record<ConsumerType, number>,
        savingsByConsumer: { [consumerType]: 0 } as Record<ConsumerType, number>,
      };

      const recommendations = this.generateRecommendations(data, vendorContext, qualityScore);

      this.logger.info('Customer intelligence collection completed', {
        customerCompany,
        vendorCompany,
        qualityScore,
        sourcesUsed: (plan as DataCollectionPlan).toCollect?.length || 0,
      });

      return {
        plan,
        data,
        metrics,
        vendorContext,
        qualityScore,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Customer intelligence collection failed', {
        customerCompany,
        vendorCompany,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get multi-source data for a company
   */
  async getMultiSourceData(
    companyName: string,
    consumerType: ConsumerType,
    maxCost?: number,
    requiredSources?: SourceType[]
  ): Promise<MultiSourceData> {
    const plan = await this.createCollectionPlan(
      companyName,
      consumerType,
      maxCost || this.costBudgets[consumerType],
      requiredSources
    );

    return this.dataCollectionEngine.executeParallelCollection(plan);
  }

  /**
   * Create a data collection plan
   */
  async createCollectionPlan(
    companyName: string,
    consumerType: ConsumerType,
    maxCost: number,
    requiredSources?: SourceType[]
  ): Promise<DataCollectionPlan> {
    const requiredDatasets = CONSUMER_DATASET_REQUIREMENTS[consumerType] || [];
    const availableSources: SourceType[] = requiredSources || ['serp_api' as SourceType, 'bright_data' as SourceType, 'apollo' as SourceType];

    // Calculate estimated costs and select sources within budget
    const selectedSources: SourceType[] = [];
    let totalCost = 0;

    for (const source of availableSources) {
      const sourceCost = this.getSourceCost(source);
      if (totalCost + sourceCost <= maxCost) {
        selectedSources.push(source);
        totalCost += sourceCost;
      }
    }

    const estimatedDuration = Math.max(
      ...selectedSources.map(source => this.getEstimatedDuration(source))
    );

    return {
      companyName,
      requester: consumerType,
      toCollect: selectedSources,
      fromCache: [],
      estimatedCost: totalCost,
      estimatedDuration,
      cacheSavings: 0,
      costsAttribution: {
        profile: 0,
        vendor_context: 0,
        customer_intelligence: 0,
        test: 0,
      },
    };
  }

  /**
   * Get raw data availability status
   */
  async getRawDataStatus(companyName: string, sources?: SourceType[]): Promise<RawDataAvailability> {
    const checkSources = sources || ['serp_api' as SourceType, 'bright_data' as SourceType, 'apollo' as SourceType];
    const availability: Record<SourceType, boolean> = {} as Record<SourceType, boolean>;

    await Promise.all(
      checkSources.map(async (source) => {
        try {
          const cacheKey = this.generateCacheKey(source, companyName);
          const cached = await this.cacheService.get(cacheKey);
          availability[source] = !!cached && !this.isExpired(cached, 24);
        } catch {
          availability[source] = false;
        }
      })
    );

    const availableCount = Object.values(availability).filter(Boolean).length;
    const totalCount = checkSources.length;

    return {
      companyName,
      sources: availability,
      overallAvailability: availableCount / totalCount,
      lastChecked: new Date().toISOString(),
      cacheAge: '24h', // This would be calculated from actual cache timestamps
    };
  }

  // =====================================
  // CONTEXT-AWARE METHODS
  // =====================================

  /**
   * Get vendor context for strategic analysis
   */
  private async getVendorContext(vendorCompany: string): Promise<VendorContext> {
    try {
      // Try to get existing vendor context from cache
      const cacheKey = `vendor_context_${vendorCompany.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached && !this.isExpired(cached, 168)) { // 1 week cache
        // Check if cached data is VendorContext or needs conversion
        if (cached && typeof cached === 'object' && 'companyName' in cached && 'lastUpdated' in cached) {
          return cached as unknown as VendorContext;
        }
      }

      // Collect vendor data for context analysis
      const vendorData = await this.getMultiSourceData(vendorCompany, 'vendor_context');

      // Extract context from collected data
      const vendorContext: VendorContext = {
        companyName: vendorCompany,
        industry: this.extractIndustry(vendorData),
        products: this.extractProducts(vendorData),
        targetMarkets: this.extractTargetMarkets(vendorData),
        competitors: this.extractCompetitors(vendorData),
        valuePropositions: this.extractValuePropositions(vendorData),
        positioningStrategy: this.extractPositioningStrategy(vendorData),
        pricingModel: this.extractPricingModel(vendorData),
        lastUpdated: new Date().toISOString(),
      };

      // Cache the vendor context
      await this.cacheService.setRawJSON(cacheKey, vendorContext, this.getCacheTypeForSource('serp_api' as SourceType));

      return vendorContext;
    } catch (error) {
      this.logger.warn('Failed to get vendor context', {
        vendorCompany,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return minimal context on failure
      return {
        companyName: vendorCompany,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Create context-aware collection plan
   */
  private async createContextAwareCollectionPlan(
    customerCompany: string,
    consumerType: ConsumerType,
    vendorContext: VendorContext,
    maxCost: number,
    requiredDatasets?: DatasetType[]
  ): Promise<ContextAwareCollectionPlan> {
    // Start with base plan
    const basePlan = await this.createCollectionPlan(customerCompany, consumerType, maxCost);

    // Enhance with context-aware datasets
    const contextualDatasets = this.determineContextualDatasets(vendorContext, requiredDatasets || []);
    const contextualPriorities = this.calculateContextualPriorities(vendorContext, contextualDatasets);

    return {
      ...basePlan,
      vendorContext,
      customerSpecificDatasets: requiredDatasets || contextualDatasets,
      contextualPriorities,
    };
  }

  // =====================================
  // PRIVATE HELPER METHODS
  // =====================================

  /**
   * Determine contextual datasets based on vendor context
   */
  private determineContextualDatasets(vendorContext: VendorContext, baseDatasets: DatasetType[]): DatasetType[] {
    const contextualDatasets = [...baseDatasets];

    // Add industry-specific datasets
    if (vendorContext.industry) {
      contextualDatasets.push('INDUSTRY_ANALYSIS' as DatasetType, 'COMPETITIVE_LANDSCAPE' as DatasetType);
    }

    // Add product-specific datasets
    if (vendorContext.products && vendorContext.products.length > 0) {
      contextualDatasets.push('TECHNOLOGY_STACK' as DatasetType, 'PRODUCT_REVIEWS' as DatasetType);
    }

    // Add market-specific datasets
    if (vendorContext.targetMarkets && vendorContext.targetMarkets.length > 0) {
      contextualDatasets.push('MARKET_PRESENCE' as DatasetType, 'GEOGRAPHIC_DISTRIBUTION' as DatasetType);
    }

    return Array.from(new Set(contextualDatasets)); // Remove duplicates - ES5 compatible
  }

  /**
   * Calculate contextual priorities for datasets
   */
  private calculateContextualPriorities(vendorContext: VendorContext, datasets: DatasetType[]): Partial<Record<DatasetType, number>> {
    const priorities: Partial<Record<DatasetType, number>> = {};

    datasets.forEach(dataset => {
      let priority = 50; // Base priority

      // Adjust based on vendor context
      if (vendorContext.industry && ['INDUSTRY_ANALYSIS', 'COMPETITIVE_LANDSCAPE'].includes(dataset as string)) {
        priority += 20;
      }
      if (vendorContext.products && ['TECHNOLOGY_STACK', 'PRODUCT_REVIEWS'].includes(dataset as string)) {
        priority += 15;
      }
      if (vendorContext.competitors && String(dataset) === 'COMPETITIVE_LANDSCAPE') {
        priority += 25;
      }

      priorities[dataset] = Math.min(100, priority);
    });

    return priorities;
  }

  /**
   * Extract various context elements from vendor data
   */
  private extractIndustry(vendorData: MultiSourceData): string | undefined {
    // Placeholder - would implement intelligent extraction
    const serpData = vendorData as any; // Type assertion for dynamic property access
    return serpData?.serp_api?.knowledge_graph?.industry?.[0];
  }

  private extractProducts(_vendorData: MultiSourceData): string[] {
    // Placeholder - would implement intelligent extraction
    return [];
  }

  private extractTargetMarkets(_vendorData: MultiSourceData): string[] {
    // Placeholder - would implement intelligent extraction
    return [];
  }

  private extractCompetitors(_vendorData: MultiSourceData): string[] {
    // Placeholder - would implement intelligent extraction
    return [];
  }

  private extractValuePropositions(_vendorData: MultiSourceData): string[] {
    // Placeholder - would implement intelligent extraction
    return [];
  }

  private extractPositioningStrategy(_vendorData: MultiSourceData): string {
    // Placeholder - would implement intelligent extraction
    return '';
  }

  private extractPricingModel(_vendorData: MultiSourceData): string {
    // Placeholder - would implement intelligent extraction
    return '';
  }

  /**
   * Generate recommendations based on data and context
   */
  private generateRecommendations(
    data: MultiSourceData,
    vendorContext: VendorContext,
    qualityScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (qualityScore < 70) {
      recommendations.push('Consider collecting additional data sources to improve data quality');
    }

    const serpData = data as any; // Type assertion for dynamic property access
    if (!serpData.serp_api) {
      recommendations.push('SerpAPI data unavailable - consider using alternative sources');
    }

    if (vendorContext.competitors && vendorContext.competitors.length === 0) {
      recommendations.push('Enhance vendor context with competitive analysis');
    }

    return recommendations;
  }

  /**
   * Get orchestration health status
   */
  async getHealthStatus(): Promise<OrchestrationHealth> {
    return this.checkOrchestrationHealth();
  }
} 