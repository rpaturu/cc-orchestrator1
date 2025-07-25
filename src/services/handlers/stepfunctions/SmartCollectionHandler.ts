/**
 * Smart Collection Handler for Step Functions
 * 
 * Handles the second step of the Step Functions workflow - intelligent multi-source data collection
 * Enhanced for Customer Intelligence workflow with dataset requirements matrix
 */

import { DataSourceOrchestrator } from '../../DataSourceOrchestrator';
import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { SerpAPIService } from '../../SerpAPIService';
import { CONSUMER_DATASET_REQUIREMENTS, DatasetType } from '../../../types/dataset-requirements';
import { ConsumerType, MultiSourceData } from '../../../types/orchestrator-types';
import { CacheType } from '../../../types/cache-types';

// Define Step Function types locally since they're not exported from main types
interface StepFunctionEvent {
  companyName: string;
  vendorCompany?: string;
  userPersona?: {
    name: string;
    role: 'AE' | 'CSM' | 'SE';
    segment?: string;
    region?: string;
  };
  consumerType: string;
  workflowType?: string;
  interactionMode?: string;
  maxCost?: number;
  sources?: string[];
  requester?: string;
  requestId?: string;
  priorityDatasets?: DatasetType[]; // Allow override of required datasets
  refresh?: boolean; // Added for vendor context refresh
}

interface StepFunctionResult {
  statusCode: number;
  body: string;
  companyName?: string;
  vendorCompany?: string;
  requester?: string;
  requestId?: string;
  data?: any;
  timestamp?: string;
  workflowStep: string;
  workflowType?: string;
  userPersona?: {        // ✅ Add userPersona to interface
    name: string;
    role: 'AE' | 'CSM' | 'SE';
    segment?: string;
    region?: string;
  };
  datasetsCollected?: DatasetType[];
  dataQuality?: {
    completeness: number;
    freshness: number;
    reliability: number;
  };
  error?: string;          // ✅ Add error field for error responses
  message?: string;        // ✅ Add message field for error details
}

/**
 * Smart Data Collection Handler - Enhanced for Customer Intelligence workflow
 * Uses dataset requirements matrix to ensure comprehensive data collection
 */
export const smartDataCollectionHandler = async (
  event: StepFunctionEvent
): Promise<StepFunctionResult> => {
  const logger = new Logger('SmartCollectionHandler');
  
  try {
    // Extract parameters from Step Function event
    const { companyName, vendorCompany, userPersona, requester, requestId, workflowType } = event;
    
    logger.info('Starting smart data collection with dataset requirements', { 
      companyName,
      vendorCompany,
      workflowType,
      userPersona: userPersona?.role || 'unknown'
    });

    // Initialize services
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: false },
      logger, 
      process.env.AWS_REGION
    );
    
    const serpAPIService = new SerpAPIService(cacheService, logger);
    const orchestrator = new DataSourceOrchestrator(cacheService, logger, serpAPIService);
    
    let result: any;
    let datasetsCollected: DatasetType[] = [];
    
    // Handle different workflow types with proper dataset requirements
    if (workflowType === 'customer_intelligence') {
      logger.info('Executing Customer Intelligence data collection with dataset matrix', { 
        companyName, 
        vendorCompany 
      });
      
      // Get required datasets for customer intelligence from the matrix
      const requiredDatasets = event.priorityDatasets || 
        CONSUMER_DATASET_REQUIREMENTS['customer_intelligence' as ConsumerType];
      
      logger.info('Required datasets for customer intelligence', { 
        datasets: requiredDatasets,
        count: requiredDatasets.length 
      });
      
      // Use the enhanced customer intelligence collection with dataset awareness
      result = await orchestrator.getCustomerIntelligence({
        customerCompany: companyName,
        vendorCompany: vendorCompany || 'Unknown',
        consumerType: 'customer_intelligence',
        // Pass dataset requirements to orchestrator
        requiredDatasets: requiredDatasets
      });
      
      // Check if vendor context is required
      if (result.error === 'VENDOR_CONTEXT_REQUIRED') {
        logger.warn('Customer intelligence requires vendor context first', {
          companyName,
          vendorCompany,
          error: result.error,
          message: result.message
        });
        
        // Return error response to Step Function
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: result.error,
            message: result.message,
            recommendation: result.recommendation,
            nextSteps: result.nextSteps,
            companyName,
            vendorCompany,
            workflowType,
            guidance: {
              summary: `Vendor context analysis required for ${vendorCompany}`,
              action: `Please run vendor context analysis for '${vendorCompany}' before customer intelligence`,
              benefit: "This will enable specific product recommendations, competitive positioning, and actionable insights"
            }
          }),
          error: result.error,
          message: result.message,
          companyName,
          vendorCompany,
          workflowType,
          workflowStep: 'data_collection'  // ✅ Add required workflowStep field
        };
      }
      
      datasetsCollected = requiredDatasets;
      
      // Add persona context and workflow metadata for LLM processing
      (result as any).userPersona = userPersona;
      (result as any).workflowType = workflowType;
      (result as any).vendorCompany = vendorCompany;
      (result as any).datasetsCollected = datasetsCollected;
      
      // Calculate data quality based on dataset requirements matrix
      (result as any).dataQuality = calculateDataQuality(result as MultiSourceData, requiredDatasets);
      
    } else if (workflowType === 'vendor_context') {
      logger.info('Executing Vendor Context data collection with dataset matrix', { 
        companyName 
      });
      
      // Get required datasets for vendor context from the matrix
      const requiredDatasets = event.priorityDatasets || 
        CONSUMER_DATASET_REQUIREMENTS['vendor_context' as ConsumerType];
      
      logger.info('Required datasets for vendor context', { 
        datasets: requiredDatasets,
        count: requiredDatasets.length 
      });
      
      // Check for cached vendor context first (before expensive data collection)
      const vendorCacheKey = `vendor_context_data:${companyName.toLowerCase().replace(/\s+/g, '_')}`;
      const cachedVendorData = await cacheService.getRawJSON(vendorCacheKey);
      
      if (cachedVendorData && !event.refresh) {
        logger.info('Vendor context data found in cache', { companyName, cacheKey: vendorCacheKey });
        result = cachedVendorData;
        datasetsCollected = requiredDatasets;
        
        // Mark as cache hit
        (result as any).fromCache = true;
        (result as any).cacheHits = requiredDatasets.length;
        (result as any).newApiCalls = 0;
        (result as any).totalNewCost = 0;
        (result as any).totalCacheSavings = 1.50; // Estimated vendor context cost
      } else {
        // Collect vendor context data
        result = await orchestrator.getMultiSourceData(
          companyName,
          'vendor_context' as ConsumerType
        );
        
        datasetsCollected = requiredDatasets;
        
        // Cache the vendor context data for reuse
        await cacheService.setRawJSON(vendorCacheKey, result, CacheType.VENDOR_CONTEXT_RAW_DATA);
        logger.info('Vendor context data cached for reuse', { companyName, cacheKey: vendorCacheKey });
      }
      
      // Add workflow metadata for LLM processing
      (result as any).userPersona = userPersona;  // ✅ Add missing userPersona
      (result as any).vendorCompany = vendorCompany;  // ✅ Add missing vendorCompany
      (result as any).workflowType = workflowType;
      (result as any).datasetsCollected = datasetsCollected;
      (result as any).dataQuality = calculateDataQuality(result as MultiSourceData, requiredDatasets);
      
    } else {
      // Fallback to general multi-source data collection
      logger.info('Executing general data collection', { companyName });
      result = await orchestrator.getMultiSourceData(
        companyName,
        (requester as ConsumerType) || 'profile'
      );
      
      // Try to infer datasets collected from general collection
      datasetsCollected = ['company_name', 'company_domain', 'industry', 'company_overview'];
    }
    
    logger.info('Data collection completed with dataset tracking', {
      companyName,
      vendorCompany,
      sourcesUsed: (result as any).newApiCalls || 0,
      totalCost: (result as any).totalNewCost || 0,
      cacheHits: (result as any).cacheHits || 0,
      cacheSavings: (result as any).totalCacheSavings || 0,
      workflowType,
      datasetsCollected: datasetsCollected.length,
      dataQuality: (result as any).dataQuality
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        companyName,
        vendorCompany,
        requester,
        data: result,
        requestId,
        timestamp: new Date().toISOString(),
        workflowStep: 'data_collection',
        workflowType,
        datasetsCollected,
        dataQuality: (result as any).dataQuality
      }),
      // ✅ Clean structure: put userPersona at root level for LLMAnalysisDispatcher
      companyName,
      vendorCompany,
      requester,
      userPersona,        // ✅ Extract to root level
      workflowType,
      requestId,
      timestamp: new Date().toISOString(),
      workflowStep: 'data_collection',
      datasetsCollected,
      dataQuality: (result as any).dataQuality,
      data: result       // ✅ Keep original data structure
    };

  } catch (error) {
    logger.error('Smart data collection failed', { 
      error: error instanceof Error ? error.message : String(error),
      companyName: event.companyName || 'unknown',
      workflowType: event.workflowType || 'unknown'
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        companyName: event.companyName || 'unknown',
        vendorCompany: event.vendorCompany || 'unknown',
        requester: event.requester || 'unknown',
        data: null,
        requestId: event.requestId || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        workflowStep: 'data_collection',
        datasetsCollected: []
      }),
      companyName: event.companyName || 'unknown',
      vendorCompany: event.vendorCompany || 'unknown',
      requester: event.requester || 'unknown',
      data: null,
      requestId: event.requestId || 'unknown',
      timestamp: new Date().toISOString(),
      workflowStep: 'data_collection',
      datasetsCollected: []
    };
  }
};

/**
 * Calculate data quality based on collected datasets and requirements matrix
 */
function calculateDataQuality(result: MultiSourceData, requiredDatasets: DatasetType[]): {
  completeness: number;
  freshness: number;
  reliability: number;
  overall: number;
} {
  // Use existing data quality from result if available
  if (result.dataQuality) {
    return {
      ...result.dataQuality,
      overall: (result.dataQuality.completeness + result.dataQuality.freshness + result.dataQuality.reliability) / 3
    };
  }
  
  // Fallback quality calculation
  const completeness = requiredDatasets.length > 0 ? 
    Math.min(1.0, (result.newApiCalls + result.cacheHits) / requiredDatasets.length) : 0.8;
  
  const freshness = result.cacheHits > 0 ? 0.7 : 0.9; // Fresh data if mostly from APIs
  const reliability = 0.85; // Average reliability across sources
  
  return {
    completeness,
    freshness,
    reliability,
    overall: (completeness + freshness + reliability) / 3
  };
} 