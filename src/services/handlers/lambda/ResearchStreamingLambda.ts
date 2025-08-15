/**
 * Note: This Lambda provides SSE research streaming endpoints.
 * 
 * Architecture:
 * 1. Pure API handler - no business logic or data generation
 * 2. Always delegates data collection to DataSourceOrchestrator
 * 3. Session management for SSE progress tracking
 * 4. Clean error handling and response formatting
 * 
 * Integration points:
 * 1. DataSourceOrchestrator - autonomous intelligent data collection with internal caching
 * 2. CacheService - session state management
 * 3. Frontend SSE clients - real-time streaming
 * 
 * Note: Uses direct DataSourceOrchestrator approach for simplicity and performance.
 * Step Functions workflow was removed to avoid duplication with orchestrator's internal caching.
 */

import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { getCorsHeaders } from '../../../index';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { DataSourceOrchestrator } from '../../DataSourceOrchestrator';
import { ProfileService } from '../../ProfileService';
import { CacheType } from '../../../types/cache-types';

/**
 * Research Session Interface
 */
interface ResearchSession {
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  areaId: string;
  companyId: string;
  userRole: string;
  userCompany: string;
  datasets: string[];
  startTime: string;
  progress: number;
  steps: Array<{
    dataset: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    completed: boolean;
  }>;
}

/**
 * Main Research Streaming Lambda Handler
 * Routes requests to appropriate handlers based on HTTP method and path
 */
export const researchStreamingHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('ResearchStreaming');
  
  try {
    const { httpMethod, path, pathParameters } = event;
    
    // Route based on HTTP method and path
    if (httpMethod === 'POST' && path.endsWith('/research/stream')) {
      return await initiateResearchHandler(event, context);
    } else if (httpMethod === 'GET' && path.includes('/events')) {
      return await researchStreamingEventsHandler(event, context);
    } else if (httpMethod === 'GET' && path.includes('/status')) {
      return await researchStatusHandler(event, context);
    } else if (httpMethod === 'GET' && path.includes('/result')) {
      return await researchResultsHandler(event, context);
    } else {
      return {
        statusCode: 404,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          error: 'Endpoint not found',
          message: `Unsupported method: ${httpMethod} ${path}`,
          requestId: context.awsRequestId,
        }),
      };
    }
  } catch (error) {
    logger.error('Research streaming routing failed', { error });
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

/**
 * Initiate Research Handler - Start a new research session
 * POST /api/research/stream
 */
async function initiateResearchHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const logger = new Logger('InitiateResearch');
  
  try {
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // Extract query parameters
    const { areaId, companyId, userRole, userCompany } = event.queryStringParameters || {};

    if (!areaId || !companyId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'areaId and companyId are required',
          requestId: context.awsRequestId,
        }),
      };
    }

    logger.info('Starting research streaming', { 
      areaId, 
      companyId, 
      userRole, 
      userCompany,
      requestId: context.awsRequestId 
    });

    // Create a unique research session ID (just use the request ID)
    const researchSessionId = context.awsRequestId;
    
    // Store research session in cache for progress tracking
    const cacheService = new CacheService({
      ttlHours: 24,
      maxEntries: 1000,
      compressionEnabled: false
    }, logger, process.env.AWS_REGION);
    
    const cacheKey = `research:${researchSessionId}`;
    logger.info('Storing research session in cache', { 
      researchSessionId, 
      cacheKey,
      requestId: context.awsRequestId 
    });
    
    const researchSession: ResearchSession = {
      status: 'initiated',
      areaId,
      companyId,
      userRole: userRole || 'unknown',
      userCompany: userCompany || 'unknown',
      datasets: [], // Datasets will be determined by DataSourceOrchestrator
      startTime: new Date().toISOString(),
      progress: 0,
      steps: [] // Steps will be managed by the research workflow
    };
    
    await cacheService.setRawJSON(cacheKey, researchSession, CacheType.ASYNC_REQUEST_TRACKING);
    
    logger.info('Research session stored successfully', { 
      researchSessionId, 
      cacheKey,
      requestId: context.awsRequestId 
    });

    // Return streaming instructions and workflow details
    // The frontend will use this to establish SSE connection and monitor progress
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        type: 'collection_started',
        message: `🔍 Starting ${areaId} research for ${companyId}...`,
        requestId: context.awsRequestId,
        researchSessionId,
        areaId,
        companyId,
        userRole,
        userCompany,
        streaming: {
          // SSE endpoint for real-time updates
          sseEndpoint: `/api/research/stream/${researchSessionId}/events`,
          // Workflow status endpoint
          statusEndpoint: `/api/research/stream/${researchSessionId}/status`,
          // Results endpoint
          resultEndpoint: `/api/research/stream/${researchSessionId}/result`,
          // Estimated completion time
          estimatedTimeMinutes: 3,
          // Supported event types
          eventTypes: [
            'collection_started',
            'progress_update', 
            'research_findings',
            'sources_found',
            'vendor_insights',
            'follow_up_options',
            'research_complete'
          ]
        }
      }),
    };

  } catch (error) {
    logger.error('Research streaming failed', { error });
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
}

/**
 * Research Streaming Events Handler - Provide SSE updates
 * GET /api/research/stream/{researchSessionId}/events
 */
async function researchStreamingEventsHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const logger = new Logger('ResearchStreamingEvents');
  
  try {
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    const { researchSessionId } = event.pathParameters || {};
    if (!researchSessionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'researchSessionId is required',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Set SSE headers
    const sseHeaders = {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    };

    // Get current research session status from cache
    const cacheService = new CacheService({
      ttlHours: 24,
      maxEntries: 1000,
      compressionEnabled: false
    }, logger, process.env.AWS_REGION);
    const sessionData = await cacheService.getRawJSON(`research:${researchSessionId}`);
    
    if (!sessionData) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Research session not found',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Simulate real-time progress updates
    // In production, this would be updated by the CustomerIntelligenceLambda workflow
    const progressEvent = `data: ${JSON.stringify({
      type: 'progress_update',
      message: `🔍 Researching ${sessionData.areaId} for ${sessionData.companyId}...`,
      researchSessionId,
      progress: sessionData.progress || 0,
      currentStep: getCurrentStep(sessionData.steps),
      timestamp: new Date().toISOString()
    })}\n\n`;

    return {
      statusCode: 200,
      headers: sseHeaders,
      body: progressEvent,
    };

  } catch (error) {
    logger.error('Research streaming events failed', { error });
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
}

/**
 * Research Status Handler - Get current research progress
 * GET /api/research/stream/{researchSessionId}/status
 */
async function researchStatusHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const logger = new Logger('ResearchStatus');
  
  try {
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    const { researchSessionId } = event.pathParameters || {};
    if (!researchSessionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'researchSessionId is required',
          requestId: context.awsRequestId,
        }),
      };
    }

    const cacheService = new CacheService({
      ttlHours: 24,
      maxEntries: 1000,
      compressionEnabled: false
    }, logger, process.env.AWS_REGION);
    
    const cacheKey = `research:${researchSessionId}`;
    logger.info('Attempting to retrieve research session', { 
      researchSessionId, 
      cacheKey,
      requestId: context.awsRequestId 
    });
    
    const sessionData = await cacheService.getRawJSON(cacheKey);
    
    logger.info('Cache retrieval result', { 
      researchSessionId, 
      cacheKey,
      sessionDataFound: !!sessionData,
      requestId: context.awsRequestId 
    });
    
    if (!sessionData) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Research session not found',
          requestId: context.awsRequestId,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(sessionData),
    };

  } catch (error) {
    logger.error('Research status failed', { error });
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
}

/**
 * Research Results Handler - Get completed research findings
 * GET /api/research/stream/{researchSessionId}/result
 */
async function researchResultsHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const logger = new Logger('ResearchResults');
  
  try {
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    const { researchSessionId } = event.pathParameters || {};
    if (!researchSessionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'researchSessionId is required',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Get session metadata from cache instead of parsing session ID
    const cacheService = new CacheService({
      ttlHours: 24,
      maxEntries: 1000,
      compressionEnabled: false
    }, logger, process.env.AWS_REGION);
    
    const cacheKey = `research:${researchSessionId}`;
    let sessionData;
    
    try {
      sessionData = await cacheService.getRawJSON(cacheKey);
      logger.info('Session data retrieved from cache', { 
        researchSessionId, 
        cacheKey, 
        sessionDataFound: !!sessionData,
        requestId: context.awsRequestId 
      });
    } catch (error) {
      logger.error('Failed to retrieve session data from cache', { 
        researchSessionId, 
        cacheKey, 
        error,
        requestId: context.awsRequestId 
      });
      
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Failed to retrieve research session',
          requestId: context.awsRequestId,
        }),
      };
    }
    
    if (!sessionData) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Research session not found',
          requestId: context.awsRequestId,
        }),
      };
    }
    
    const { areaId, companyId, status } = sessionData as ResearchSession;

    logger.info('Processing research area with DataSourceOrchestrator', { 
      researchSessionId, 
      areaId, 
      companyId,
      requestId: context.awsRequestId 
    });
    
    try {
      // Use DataSourceOrchestrator for intelligent data collection
      const orchestrator = new DataSourceOrchestrator(logger);
      
      // Delegate ALL collection decisions to orchestrator
      const researchResults = await orchestrator.getMultiSourceData(
        companyId,
        'research', // Use research consumer type  
        5.0, // Max cost for operations
        undefined, // No manual source selection - let orchestrator decide
        areaId // Research area context for intelligent source selection
      );
      
      logger.info('Research data collection completed', { 
        researchSessionId, 
        areaId, 
        companyId,
        totalNewCost: researchResults.totalNewCost,
        newApiCalls: researchResults.newApiCalls,
        cacheHits: researchResults.cacheHits,
        requestId: context.awsRequestId 
      });
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          researchSessionId,
          areaId,
          companyId,
          status: 'completed',
          completedAt: new Date().toISOString(),
          results: researchResults,
          metadata: {
            source: 'data_orchestrator',
            generatedAt: new Date().toISOString(),
            note: 'Real data from DataSourceOrchestrator with intelligent source selection',
            costSpent: researchResults.totalNewCost,
            cacheHits: researchResults.cacheHits,
            newApiCalls: researchResults.newApiCalls
          }
        }),
      };
      
    } catch (error) {
      logger.error('Research data collection failed', { 
        researchSessionId, 
        areaId, 
        companyId, 
        error,
        requestId: context.awsRequestId 
      });
      
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Failed to collect research data',
          message: error instanceof Error ? error.message : 'Unknown error',
          requestId: context.awsRequestId,
        }),
      };
    }

  } catch (error) {
    logger.error('Research results failed', { error });
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
}

/**
 * Helper Functions
 */

/**
 * Get current step from research progress
 */
function getCurrentStep(steps: any[]): string {
  if (!steps || steps.length === 0) return 'initializing';
  const currentStep = steps.find(step => !step.completed);
  return currentStep ? currentStep.dataset : 'completed';
}


