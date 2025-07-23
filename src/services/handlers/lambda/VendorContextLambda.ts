import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { ContentFilter } from '../../content/ContentFilter';
import { DataSourceOrchestrator } from '../../DataSourceOrchestrator';
import { VendorContextHandler } from '../business/VendorContextHandler';
import { SerpAPIService } from '../../SerpAPIService';
import { getCorsHeaders } from '../../../index';

/**
 * AWS Lambda entry point for vendor context operations
 */
export const vendorContextHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('VendorContextLambda');
  
  try {
    // Initialize services
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: false },
      logger, 
      process.env.AWS_REGION
    );
    
    const serpAPIService = new SerpAPIService(cacheService, logger);
    const orchestrator = new DataSourceOrchestrator(cacheService, logger, serpAPIService);

    const contentFilter = new ContentFilter();
    
    const handler = new VendorContextHandler(cacheService, logger, contentFilter, orchestrator);
    return await handler.handleRequest(event);
  } catch (error) {
    console.error('Vendor context handler error:', error);
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
}; 