import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { getCorsHeaders } from '../../../index';
import { ContentFilter } from '../../content/ContentFilter';
import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { DataSourceOrchestrator } from '../../DataSourceOrchestrator';
import { CustomerIntelligenceHandler } from '../business/CustomerIntelligenceHandler';
import { SerpAPIService } from '../../SerpAPIService';


export const customerIntelligenceHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const logger = new Logger('CustomerIntelligenceHandler');
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      logger,
      process.env.AWS_REGION
    );
    const contentFilter = new ContentFilter();
    const serpAPIService = new SerpAPIService(cacheService, logger);
    const orchestrator = new DataSourceOrchestrator(cacheService, logger, serpAPIService);

    const handler = new CustomerIntelligenceHandler(cacheService, logger, contentFilter, orchestrator);
    return await handler.handleRequest(event);
  } catch (error) {
    console.error('Customer intelligence handler error:', error);
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
