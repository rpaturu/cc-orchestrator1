/**
 * Async Processing Lambda Functions
 * 
 * Consolidates all asynchronous processing operations into a single file for better organization
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '../../core/Logger';
import { RequestService } from '../../utilities/RequestService';
import { SalesIntelligenceOrchestrator } from '../../SalesIntelligenceOrchestrator';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { getCorsHeaders } from '../../../index';

// App configuration for orchestrator
const appConfig = {
  search: {
    maxResultsPerQuery: 10,
    timeoutMs: 10000,
    retryAttempts: 1,
    rateLimitRps: 0.5
  },
  ai: {
    model: process.env.BEDROCK_MODEL!,
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
    systemPrompt: 'You are a sales intelligence analyst. Provide actionable insights for sales professionals.'
  },
  cache: {
    ttlHours: process.env.NODE_ENV === 'development' ? 96 : 1,
    maxEntries: 1000,
    compressionEnabled: true
  },
  apis: {
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY!,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!
  }
};

/**
 * Lambda handler for async company overview processing
 * POST /api/companies/{domain}/overview/async
 */
export const companyOverviewAsyncHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Company Overview Async Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract domain from path parameters
    const domain = event.pathParameters?.domain;
    if (!domain) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Company domain is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service
    const logger = new Logger('CompanyOverviewAsync');
    const requestService = new RequestService(logger);
    
    // Create async request
    const asyncRequestId = await requestService.createRequest(domain, 'overview');
    
    // Invoke processing Lambda asynchronously
    await invokeProcessingLambda(asyncRequestId, domain, context.awsRequestId, 'overview');
    
    return {
      statusCode: 202, // Accepted
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: asyncRequestId,
        status: 'processing',
        message: 'Company overview is being processed. Use the requestId to check status.',
        estimatedTimeMinutes: 1,
        statusCheckEndpoint: `/requests/${asyncRequestId}`,
      }),
    };

  } catch (error) {
    console.error('Company Overview Async Lambda error:', error);
    
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
 * Lambda handler for discovery async processing
 */
export const discoveryAsyncHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Discovery Async Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract domain from path parameters
    const domain = event.pathParameters?.domain;
    if (!domain) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Company domain is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service
    const logger = new Logger('DiscoveryAsync');
    const requestService = new RequestService(logger);
    
    // Create async request
    const asyncRequestId = await requestService.createRequest(domain, 'discovery');
    
    // Invoke processing Lambda asynchronously
    await invokeProcessingLambda(asyncRequestId, domain, context.awsRequestId, 'discovery');
    
    return {
      statusCode: 202, // Accepted
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: asyncRequestId,
        status: 'processing',
        message: 'Company discovery is being processed. Use the requestId to check status.',
        estimatedTimeMinutes: 2,
        statusCheckEndpoint: `/requests/${asyncRequestId}`,
      }),
    };

  } catch (error) {
    console.error('Discovery Async Lambda error:', error);
    
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
 * Lambda handler for analysis async processing
 */
export const analysisAsyncHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Analysis Async Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract domain from path parameters
    const domain = event.pathParameters?.domain;
    if (!domain) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Company domain is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service
    const logger = new Logger('AnalysisAsync');
    const requestService = new RequestService(logger);
    
    // Create async request
    const asyncRequestId = await requestService.createRequest(domain, 'analysis');
    
    // Invoke processing Lambda asynchronously
    await invokeProcessingLambda(asyncRequestId, domain, context.awsRequestId, 'analysis');
    
    return {
      statusCode: 202, // Accepted
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: asyncRequestId,
        status: 'processing',
        message: 'Company analysis is being processed. Use the requestId to check status.',
        estimatedTimeMinutes: 3,
        statusCheckEndpoint: `/requests/${asyncRequestId}`,
      }),
    };

  } catch (error) {
    console.error('Analysis Async Lambda error:', error);
    
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
 * Lambda handler for getting async request status and results
 * GET /requests/{requestId}
 */
export const getAsyncRequestHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Get Async Request Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract requestId from path parameters
    const requestId = event.pathParameters?.requestId;
    if (!requestId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request ID is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service
    const logger = new Logger('GetAsyncRequest');
    const requestService = new RequestService(logger);
    
    // Get request details
    const request = await requestService.getRequest(requestId);
    
    if (!request) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request not found or expired',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Calculate processing time if completed
    let processingTimeMs;
    if (request.status === 'completed' || request.status === 'failed') {
      const createdAt = new Date(request.createdAt).getTime();
      const updatedAt = new Date(request.updatedAt).getTime();
      processingTimeMs = updatedAt - createdAt;
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: request.requestId,
        status: request.status,
        companyDomain: request.companyDomain,
        requestType: request.requestType,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        processingTimeMs,
        result: request.result,
        error: request.error,
        additionalData: request.additionalData,
      }),
    };

  } catch (error) {
    console.error('Get Async Request Lambda error:', error);
    
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
 * Process overview handler - Background processing
 */
export const processOverviewHandler = async (
  event: any,
  context: Context
): Promise<void> => {
  const { asyncRequestId, domain, awsRequestId } = event;
  
  console.log('Process Overview Lambda invoked', { 
    asyncRequestId, 
    domain, 
    awsRequestId,
    requestId: context.awsRequestId 
  });
  
  await processOverviewAsync(asyncRequestId, domain, awsRequestId);
};

/**
 * Process discovery handler - Background processing
 */
export const processDiscoveryHandler = async (
  event: any,
  context: Context
): Promise<void> => {
  const { asyncRequestId, domain, awsRequestId } = event;
  
  console.log('Process Discovery Lambda invoked', { 
    asyncRequestId, 
    domain, 
    awsRequestId,
    requestId: context.awsRequestId 
  });
  
  await processDiscoveryAsync(asyncRequestId, domain, awsRequestId);
};

/**
 * Process analysis handler - Background processing
 */
export const processAnalysisHandler = async (
  event: any,
  context: Context
): Promise<void> => {
  const { asyncRequestId, domain, awsRequestId } = event;
  
  console.log('Process Analysis Lambda invoked', { 
    asyncRequestId, 
    domain, 
    awsRequestId,
    requestId: context.awsRequestId 
  });
  
  await processAnalysisAsync(asyncRequestId, domain, awsRequestId);
};

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Helper function to invoke processing Lambda
 */
async function invokeProcessingLambda(asyncRequestId: string, domain: string, awsRequestId: string, requestType: string = 'overview'): Promise<void> {
  const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
  
  const functionNameMap = {
    overview: 'sales-intelligence-process-overview',
    discovery: 'sales-intelligence-process-discovery',
    analysis: 'sales-intelligence-process-analysis'
  };

  const functionName = functionNameMap[requestType as keyof typeof functionNameMap];
  
  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'Event', // Asynchronous
    Payload: JSON.stringify({
      asyncRequestId,
      domain,
      awsRequestId
    }),
  });

  try {
    await lambdaClient.send(command);
    console.log(`Processing Lambda ${functionName} invoked successfully for request ${asyncRequestId}`);
  } catch (error) {
    console.error(`Failed to invoke processing Lambda ${functionName}:`, error);
    throw error;
  }
}

/**
 * Background function to process overview async (fire and forget)
 */
async function processOverviewAsync(asyncRequestId: string, domain: string, awsRequestId: string): Promise<void> {
  const logger = new Logger('ProcessOverviewAsync');
  const requestService = new RequestService(logger);
  
  try {
    // Mark as processing
    await requestService.updateRequestStatus(asyncRequestId, 'processing');
    
    // Initialize orchestrator
    const orchestrator = new SalesIntelligenceOrchestrator(appConfig);
    
    // Process company overview
    const result = await orchestrator.getCompanyOverview(domain);
    
    // Store result and mark complete
    await requestService.updateRequestStatus(asyncRequestId, 'completed', result);
    
    console.log('Overview processing completed successfully', { asyncRequestId, domain });
    
  } catch (error) {
    console.error('Overview processing failed', { asyncRequestId, domain, error });
    
    // Mark as failed
    await requestService.updateRequestStatus(asyncRequestId, 'failed', String(error));
  }
}

/**
 * Background function to process discovery async (fire and forget)
 */
async function processDiscoveryAsync(asyncRequestId: string, domain: string, awsRequestId: string): Promise<void> {
  const logger = new Logger('ProcessDiscoveryAsync');
  const requestService = new RequestService(logger);
  
  try {
    // Mark as processing
    await requestService.updateRequestStatus(asyncRequestId, 'processing');
    
    // Initialize orchestrator
    const orchestrator = new SalesIntelligenceOrchestrator(appConfig);
    
    // Legacy discovery endpoint is deprecated
    const result = {
      error: 'Discovery endpoint is deprecated. Use /vendor/context or /customer/intelligence instead.',
      status: 'deprecated'
    };
    
    // Store result and mark complete
    await requestService.updateRequestStatus(asyncRequestId, 'completed', result);
    
    console.log('Discovery processing completed (deprecated)', { asyncRequestId, domain });
    
  } catch (error) {
    console.error('Discovery processing failed', { asyncRequestId, domain, error });
    
    // Mark as failed
    await requestService.updateRequestStatus(asyncRequestId, 'failed', String(error));
  }
}

/**
 * Background function to process analysis async (fire and forget)
 */
async function processAnalysisAsync(asyncRequestId: string, domain: string, awsRequestId: string): Promise<void> {
  const logger = new Logger('ProcessAnalysisAsync');
  const requestService = new RequestService(logger);
  
  try {
    // Mark as processing
    await requestService.updateRequestStatus(asyncRequestId, 'processing');
    
    // Initialize orchestrator
    const orchestrator = new SalesIntelligenceOrchestrator(appConfig);
    
    // Process company analysis using sales context
    const searchResults = await orchestrator.performSearch(domain, 'discovery');
    const result = await orchestrator.performAnalysis(domain, 'discovery', searchResults.results);
    
    // Store result and mark complete
    await requestService.updateRequestStatus(asyncRequestId, 'completed', result);
    
    console.log('Analysis processing completed successfully', { asyncRequestId, domain });
    
  } catch (error) {
    console.error('Analysis processing failed', { asyncRequestId, domain, error });
    
    // Mark as failed
    await requestService.updateRequestStatus(asyncRequestId, 'failed', String(error));
  }
} 