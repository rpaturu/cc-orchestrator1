/**
 * Cache Management Lambda Functions
 * 
 * Consolidates all cache-related operations into a single file for better organization
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { getCorsHeaders } from '../../../index';

// Cache configuration
const cacheConfig = {
  ttlHours: process.env.NODE_ENV === 'development' ? 96 : 1,
  maxEntries: 1000,
  compressionEnabled: true
};

/**
 * Lambda handler for clearing entire cache (dev purposes)
 */
export const cacheClearHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cache Clear Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Initialize cache service
    const logger = new Logger('CacheClearHandler');
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);

    // Clear cache
    await cacheService.clear();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Cache cleared successfully',
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Cache Clear Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Lambda handler for deleting specific cache entry (dev purposes)
 */
export const cacheDeleteHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cache Delete Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract cache key from path parameters
    const cacheKey = event.pathParameters?.cacheKey;
    if (!cacheKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Cache key is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize cache service
    const logger = new Logger('CacheDeleteHandler');
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);

    // Delete cache entry
    await cacheService.delete(decodeURIComponent(cacheKey));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Cache entry deleted successfully',
        cacheKey: decodeURIComponent(cacheKey),
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Cache Delete Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Lambda handler for getting cache statistics (dev purposes)
 */
export const cacheStatsHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cache Stats Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Initialize cache service
    const logger = new Logger('CacheStatsHandler');
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);

    // Get cache statistics
    const stats = await cacheService.getStats();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        stats,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Cache Stats Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Lambda handler for listing cache entries with filtering (dev purposes)
 */
export const cacheListHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cache List Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Get query parameters
    const pattern = event.queryStringParameters?.pattern;
    const cacheType = event.queryStringParameters?.type;
    const limitStr = event.queryStringParameters?.limit;
    const limit = limitStr ? parseInt(limitStr) : 50;

    // Initialize cache service
    const logger = new Logger('CacheListHandler');
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);

    // List cache entries
    const result = await cacheService.listKeys(pattern, limit, cacheType);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...result,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Cache List Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Lambda handler for inspecting specific cache entry (dev purposes)
 */
export const cacheInspectHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cache Inspect Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract cache key from path parameters
    const cacheKey = event.pathParameters?.cacheKey;
    if (!cacheKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Cache key is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize cache service
    const logger = new Logger('CacheInspectHandler');
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);

    // Inspect cache entry
    const result = await cacheService.inspect(decodeURIComponent(cacheKey));

    if (!result) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Cache entry not found',
          cacheKey: decodeURIComponent(cacheKey),
          requestId: context.awsRequestId,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...result,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Cache Inspect Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Lambda handler for getting cache types summary (dev purposes)
 */
export const cacheTypesHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cache Types Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Initialize cache service
    const logger = new Logger('CacheTypesHandler');
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);

    // Get cache types summary
    const result = await cacheService.getTypeSummary();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...result,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Cache Types Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Lambda handler for viewing cache by type
 */
export const cacheListByTypeHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cache List By Type Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Get cache type from query parameters
    const cacheType = event.queryStringParameters?.type;
    const limit = parseInt(event.queryStringParameters?.limit || '20');

    if (!cacheType) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Cache type is required',
          message: 'Please provide a cache type as a query parameter: ?type=company_overview',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize cache service
    const logger = new Logger('CacheListByTypeHandler');
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);

    // Get cache entries by type
    const result = await cacheService.listKeys(undefined, limit, cacheType);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...result,
        cacheType,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Cache List By Type Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Lambda handler for clearing cache by type
 */
export const cacheClearByTypeHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Cache Clear By Type Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Get cache type from query parameters or body
    let cacheType = event.queryStringParameters?.type;
    
    if (!cacheType && event.body) {
      try {
        const body = JSON.parse(event.body);
        cacheType = body.type;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (!cacheType) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Cache type is required',
          message: 'Please provide a cache type as a query parameter: ?type=company_overview',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize cache service
    const logger = new Logger('CacheClearByTypeHandler');
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);

    // Get all keys for this cache type
    const keysResult = await cacheService.listKeys(undefined, 1000, cacheType);
    
    if (keysResult.total === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: `No cache entries found for type: ${cacheType}`,
          cleared: 0,
          cacheType,
          requestId: context.awsRequestId,
        }),
      };
    }

    // Delete all keys for this cache type
    const deletePromises = keysResult.keys.map(item => cacheService.delete(item.key));
    await Promise.all(deletePromises);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: `Successfully cleared ${keysResult.total} cache entries for type: ${cacheType}`,
        cleared: keysResult.total,
        cacheType,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Cache Clear By Type Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
}; 