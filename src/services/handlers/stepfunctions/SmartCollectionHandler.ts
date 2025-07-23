/**
 * Smart Collection Handler for Step Functions
 * 
 * Handles the second step of the Step Functions workflow - intelligent multi-source data collection
 */

import { DataSourceOrchestrator } from '../../DataSourceOrchestrator';
import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { SerpAPIService } from '../../SerpAPIService';
// Define Step Function types locally since they're not exported from main types
interface StepFunctionEvent {
  companyName: string;
  consumerType: string;
  maxCost?: number;
  sources?: string[];
  requester?: string;
  requestId?: string;
}

interface StepFunctionResult {
  statusCode: number;
  body: string;
  companyName?: string;
  requester?: string;
  requestId?: string;
  data?: any;
  timestamp?: string;
}

/**
 * Smart Data Collection Handler - Step 2 of the Step Functions workflow
 */
export const smartDataCollectionHandler = async (
  event: StepFunctionEvent
): Promise<StepFunctionResult> => {
  const logger = new Logger('SmartCollectionHandler');
  
  try {
    // Extract parameters from Step Function event
    const { companyName, requester, requestId } = event;
    
    logger.info('Starting smart data collection', { 
      companyName,
      consumerType: event.consumerType 
    });

    // Initialize services
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: false },
      logger, 
      process.env.AWS_REGION
    );
    
    const serpAPIService = new SerpAPIService(cacheService, logger);
    const orchestrator = new DataSourceOrchestrator(cacheService, logger, serpAPIService);
    
    // Execute real intelligent data collection using our Phase 1 system
    logger.info('Executing DataSourceOrchestrator.getMultiSourceData', { companyName });
    const result = await orchestrator.getMultiSourceData(
      companyName,
      requester as any
    );
    
    logger.info('Data collection completed', {
      companyName,
      sourcesUsed: result.newApiCalls || 0,
      totalCost: result.totalNewCost || 0,
      cacheHits: result.cacheHits || 0,
      cacheSavings: result.totalCacheSavings || 0
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        companyName,
        requester,
        data: result,
        requestId,
        timestamp: new Date().toISOString()
      }),
      companyName,
      requester,
      data: result,
      requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Smart data collection failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        companyName: event.companyName || 'unknown',
        requester: event.requester || 'unknown',
        data: null,
        requestId: event.requestId || 'unknown',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      }),
      companyName: event.companyName || 'unknown',
      requester: event.requester || 'unknown',
      data: null,
      requestId: event.requestId || 'unknown',
      timestamp: new Date().toISOString()
    };
  }
}; 