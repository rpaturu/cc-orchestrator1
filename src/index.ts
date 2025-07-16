import { config } from 'dotenv';
import { SalesIntelligenceOrchestrator } from './services/SalesIntelligenceOrchestrator';
import { AppConfig, SalesIntelligenceRequest } from './types';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { RequestService } from './services/utilities/RequestService';
import { Logger } from './services/core/Logger';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { CacheService } from './services/core/CacheService';
import { ProfileService, UserProfile } from './services/ProfileService';

// Load environment variables
config();

/**
 * Application configuration
 */
const appConfig: AppConfig = {
  search: {
    maxResultsPerQuery: 10,  // Google's API maximum (was 15, but Google limits to 10 per request)
    timeoutMs: 10000,
    retryAttempts: 1,  // Minimal retries - Google is reliable
    rateLimitRps: 0.5  // Very conservative - 1 request every 2 seconds
  },
  ai: {
    model: process.env.BEDROCK_MODEL!,
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
    systemPrompt: 'You are a sales intelligence analyst. Provide actionable insights for sales professionals.'
  },
  cache: {
    ttlHours: process.env.NODE_ENV === 'development' ? 96 : 1, // 96 hours for development, 1 hour for production
    maxEntries: 1000,
    compressionEnabled: true
  },
  apis: {
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY!,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!
  }
};

/**
 * Example usage of the Sales Intelligence Service
 */
async function main() {
  try {
    console.log('🚀 Starting Sales Intelligence AI...');
    
    // Validate required environment variables
    if (!appConfig.apis.googleSearchApiKey) {
      console.error('❌ Missing required environment variables:');
      console.error('   - GOOGLE_SEARCH_API_KEY');
      console.error('   - GOOGLE_SEARCH_ENGINE_ID');
      console.error('Note: Using AWS Bedrock for AI (no API key required if using IAM roles)');
      process.exit(1);
    }

    // Initialize the service
    const salesIntelligence = new SalesIntelligenceOrchestrator(appConfig);

    // Health check
    console.log('🔍 Performing health check...');
    const health = await salesIntelligence.healthCheck();
    console.log('Health status:', health);

    // Example sales intelligence request
    const request: SalesIntelligenceRequest = {
      companyDomain: 'shopify.com',
      salesContext: 'discovery',
      additionalContext: 'Looking to understand their e-commerce platform challenges'
    };

    console.log('📊 Generating sales intelligence for Shopify...');
    console.log('Request:', request);

    const startTime = Date.now();
    const intelligence = await salesIntelligence.generateIntelligence(request);
    const endTime = Date.now();

    console.log('\n✅ Sales Intelligence Generated Successfully!');
    console.log(`⏱️  Total time: ${endTime - startTime}ms`);
    console.log(`🔗 Sources analyzed: ${intelligence.sources.length}`);
    console.log(`📈 Confidence score: ${intelligence.confidenceScore}`);
    console.log(`📅 Generated at: ${intelligence.generatedAt}`);

    // Display insights summary
    console.log('\n📋 Company Overview:');
    console.log(`   Name: ${intelligence.insights.companyOverview.name}`);
    console.log(`   Industry: ${intelligence.insights.companyOverview.industry}`);
    console.log(`   Size: ${intelligence.insights.companyOverview.size}`);

    console.log('\n🎯 Key Pain Points:');
    intelligence.insights.painPoints.forEach((point, index) => {
      console.log(`   ${index + 1}. ${point}`);
    });

    console.log('\n💬 Talking Points:');
    intelligence.insights.talkingPoints.forEach((point, index) => {
      console.log(`   ${index + 1}. ${point}`);
    });

    console.log('\n🏆 Competitive Landscape:');
    console.log(`   Market Position: ${intelligence.insights.competitiveLandscape.marketPosition}`);
    console.log(`   Competitors: ${intelligence.insights.competitiveLandscape.competitors.map(c => c.name).join(', ')}`);

    console.log('\n📊 Deal Probability:', `${intelligence.insights.dealProbability}%`);

    console.log('\n🔗 Sources:');
    intelligence.sources.slice(0, 5).forEach((source, index) => {
      console.log(`   ${index + 1}. ${source}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

/**
 * Helper function to get CORS headers based on the request origin
 */
const getCorsHeaders = (origin?: string) => {
  // Get allowed origins from environment variable, fallback to defaults
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'https://d1uaf0b61i39e.cloudfront.net,http://localhost:3000,http://localhost:5173';
  const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());
  
  // If origin is in allowed list, return it; otherwise return * for development
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token',
    'Access-Control-Allow-Credentials': 'false',
  };
};



/**
 * Lambda handler for search results (fast endpoint)
 */
export const searchHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Search Lambda invoked', { requestId: context.awsRequestId });

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

    // Extract context from query parameters
    const context_param = event.queryStringParameters?.context || 'discovery';
    if (!['discovery', 'competitive', 'renewal', 'demo', 'negotiation', 'closing'].includes(context_param)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid sales context',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Extract optional seller company info for relationship-aware queries
    const sellerCompany = event.queryStringParameters?.sellerCompany;
    const sellerDomain = event.queryStringParameters?.sellerDomain;

    // Initialize the service
    const salesIntelligence = new SalesIntelligenceOrchestrator(appConfig);
    
    // Perform enhanced search with optional seller context
    const searchResults = await salesIntelligence.performSearchWithContext(
      domain, 
      context_param as any, 
      sellerCompany,
      sellerDomain
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...searchResults,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    console.error('Search Lambda error:', error);

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
 * Lambda handler for health checks
 */
export const healthHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Health Check Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Initialize the service
    const salesIntelligence = new SalesIntelligenceOrchestrator(appConfig);
    
    // Perform health check
    const health = await salesIntelligence.healthCheck();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...health,
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString(),
      }),
    };

  } catch (error) {
    console.error('Health Check Lambda error:', error);
    
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * Debug/Info Handler - Development information about mock data and configuration
 */
export const debugHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Debug Info Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    const debugInfo = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isLambda: !!process.env.AWS_EXECUTION_ENV
      },
      api: {
        hasGoogleApiKey: !!process.env.GOOGLE_SEARCH_API_KEY,
        hasGoogleEngineId: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
        quotaInfo: {
          freeDaily: 100,
          costPer1000: 5.00,
          ourQueriesPerSearch: 3
        }
      },
      endpoints: {
        search: '/company/{domain}/search',
        analysis: '/company/{domain}/analysis', 
        discovery: '/company/{domain}/discovery',
        chat: '/chat',
        health: '/health',
        debug: '/debug'
      },
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(debugInfo, null, 2),
    };

  } catch (error) {
    console.error('Debug Info Lambda error:', error);
    
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Debug info error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

// Bedrock parsing handler for natural language input
/**
 * Chat Interface Handler - Dynamic query generation from natural language
 * Supports chat-like interactions for flexible sales intelligence
 */
export const chatHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const corsHeaders = getCorsHeaders(event.headers.origin);
  
  try {
    console.log('📝 Chat request received:', {
      path: event.path,
      httpMethod: event.httpMethod,
      origin: event.headers.origin
    });

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: 'Method not allowed. Use POST.' 
        })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: 'Request body is required' 
        })
      };
    }

    const body = JSON.parse(event.body);
    const { message, targetCompany, sellerCompany, executeSearch = false } = body;

    if (!message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: 'Message field is required' 
        })
      };
    }

    console.log('🤖 Processing chat message:', { 
      message: message.substring(0, 100) + '...',
      targetCompany,
      sellerCompany,
      executeSearch 
    });

    const service = new SalesIntelligenceOrchestrator(appConfig);
    
    // Generate dynamic queries based on user input
    const queryResult = await service.generateDynamicQueries(
      message, 
      targetCompany, 
      sellerCompany
    );

    let searchResults = null;
    
    // Optionally execute the search if requested
    if (executeSearch && targetCompany) {
      console.log('🔍 Executing search with generated queries...');
      const searchResponses = await Promise.all(
        queryResult.queries.map(query => 
          service.performSearch(targetCompany, 'discovery')
        )
      );
      
      searchResults = {
        results: searchResponses.flatMap(r => r.results),
        totalQueries: queryResult.queries.length,
        totalResults: searchResponses.reduce((sum, r) => sum + r.totalResults, 0)
      };
    }

    const response = {
      message: `I understand you're asking about ${queryResult.intent} (confidence: ${Math.round(queryResult.confidence * 100)}%)`,
      intent: queryResult.intent,
      confidence: queryResult.confidence,
      generatedQueries: queryResult.queries,
      searchResults,
      suggestions: [
        `Tell me more about ${targetCompany || 'the company'}'s challenges`,
        `How can ${sellerCompany || 'we'} help ${targetCompany || 'them'}?`,
        `What's ${targetCompany || 'the company'}'s technology stack?`,
        `Show me recent news about ${targetCompany || 'the company'}`
      ]
    };

    console.log('✅ Chat response generated:', {
      intent: queryResult.intent,
      confidence: queryResult.confidence,
      queriesGenerated: queryResult.queries.length,
      searchExecuted: !!searchResults
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('❌ Chat handler error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};

export const bedrockParseHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Bedrock Parse Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { prompt, message, maxTokens = 500 } = JSON.parse(event.body);
    
    if (!prompt || !message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'prompt and message are required' }),
      };
    }

    const salesIntelligence = new SalesIntelligenceOrchestrator(appConfig);
    
    // Use the AI analyzer to parse the input
    const response = await salesIntelligence.parseUserInput(prompt);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        content: response,
        timestamp: new Date().toISOString(),
        requestId: context.awsRequestId
      }),
    };
  } catch (error) {
    console.error('Bedrock Parse Lambda error:', error);
    
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Bedrock parsing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * Lambda handler for async company overview (returns request ID immediately)
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
        message: 'Discovery insights are being processed. Use the requestId to check status.',
        estimatedTimeMinutes: 3,
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

    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request body with search results is required',
          requestId: context.awsRequestId,
        }),
      };
    }

    const requestBody = JSON.parse(event.body);
    const { context: salesContext, searchResults } = requestBody;

    if (!salesContext || !searchResults) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'salesContext and searchResults are required',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service
    const logger = new Logger('AnalysisAsync');
    const requestService = new RequestService(logger);
    
    // Create async request with additional data
    const asyncRequestId = await requestService.createRequest(domain, 'analysis', {
      salesContext,
      searchResults
    });
    
    // Invoke processing Lambda asynchronously
    await invokeProcessingLambda(asyncRequestId, domain, context.awsRequestId, 'analysis');
    
    return {
      statusCode: 202, // Accepted
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: asyncRequestId,
        status: 'processing',
        message: 'Analysis is being processed. Use the requestId to check status.',
        estimatedTimeMinutes: 5,
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
    
    // Get request status
    const asyncRequest = await requestService.getRequest(requestId);
    
    if (!asyncRequest) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request not found or expired',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Return appropriate response based on status
    const response: any = {
      requestId: asyncRequest.requestId,
      status: asyncRequest.status,
      companyDomain: asyncRequest.companyDomain,
      createdAt: asyncRequest.createdAt,
      updatedAt: asyncRequest.updatedAt,
    };

    if (asyncRequest.processingTime) {
      response.processingTimeMs = asyncRequest.processingTime;
    }

    if (asyncRequest.status === 'completed' && asyncRequest.result) {
      response.result = asyncRequest.result;
    }

    if (asyncRequest.status === 'failed' && asyncRequest.error) {
      response.error = asyncRequest.error;
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
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
 * Invoke processing Lambda asynchronously
 */
async function invokeProcessingLambda(asyncRequestId: string, domain: string, awsRequestId: string, requestType: string = 'overview'): Promise<void> {
  const logger = new Logger('InvokeProcessingLambda');
  
  try {
    const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-west-2' });
    
    const payload = {
      asyncRequestId,
      domain,
      awsRequestId,
      requestType
    };
    
    // Map request type to Lambda function name
    const functionNameMap: { [key: string]: string } = {
      'overview': 'sales-intelligence-process-overview',
      'discovery': 'sales-intelligence-process-discovery',
      'analysis': 'sales-intelligence-process-analysis'
    };
    
    const functionName = functionNameMap[requestType] || 'sales-intelligence-process-overview';
    
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify(payload)
    });

    await lambdaClient.send(command);
    
    logger.info('Processing Lambda invoked successfully', { 
      asyncRequestId, 
      domain,
      requestType,
      functionName
    });
    
  } catch (error) {
    logger.error('Failed to invoke processing Lambda', { 
      asyncRequestId, 
      domain, 
      error: error instanceof Error ? error.message : String(error) 
    });
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
    
    logger.info('Starting async overview processing', { 
      asyncRequestId, 
      domain, 
      awsRequestId 
    });

    // Initialize the service
    const salesIntelligence = new SalesIntelligenceOrchestrator(appConfig);
    
    // Get company overview
    const overview = await salesIntelligence.getCompanyOverview(domain);
    
    // Mark as completed with result
    await requestService.updateRequestStatus(asyncRequestId, 'completed', overview);
    
    logger.info('Async overview processing completed', { 
      asyncRequestId, 
      domain 
    });

  } catch (error) {
    logger.error('Async overview processing failed', { 
      asyncRequestId, 
      domain, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Mark as failed with error
    await requestService.updateRequestStatus(
      asyncRequestId, 
      'failed', 
      undefined, 
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Lambda handler for processing overview in background
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
 * Background function to process discovery async (fire and forget)
 */
async function processDiscoveryAsync(asyncRequestId: string, domain: string, awsRequestId: string): Promise<void> {
  const logger = new Logger('ProcessDiscoveryAsync');
  const requestService = new RequestService(logger);
  
  try {
    // Mark as processing
    await requestService.updateRequestStatus(asyncRequestId, 'processing');
    
    logger.info('Starting async discovery processing', { 
      asyncRequestId, 
      domain, 
      awsRequestId 
    });

    // Initialize the service
    const salesIntelligence = new SalesIntelligenceOrchestrator(appConfig);
    
    // Get discovery insights
    const insights = await salesIntelligence.getDiscoveryInsights(domain);
    
    // Mark as completed with result
    await requestService.updateRequestStatus(asyncRequestId, 'completed', insights);
    
    logger.info('Async discovery processing completed', { 
      asyncRequestId, 
      domain 
    });

  } catch (error) {
    logger.error('Async discovery processing failed', { 
      asyncRequestId, 
      domain, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Mark as failed with error
    await requestService.updateRequestStatus(
      asyncRequestId, 
      'failed', 
      undefined, 
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Lambda handler for processing discovery in background
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
 * Background function to process analysis async (fire and forget)
 */
async function processAnalysisAsync(asyncRequestId: string, domain: string, awsRequestId: string): Promise<void> {
  const logger = new Logger('ProcessAnalysisAsync');
  const requestService = new RequestService(logger);
  
  try {
    // Mark as processing
    await requestService.updateRequestStatus(asyncRequestId, 'processing');
    
    logger.info('Starting async analysis processing', { 
      asyncRequestId, 
      domain, 
      awsRequestId 
    });

    // Get the request to retrieve additional data
    const requestData = await requestService.getRequest(asyncRequestId);
    if (!requestData || !requestData.additionalData) {
      throw new Error('Request data or additional data not found');
    }

    const { salesContext, searchResults } = requestData.additionalData;
    
    // Initialize the service
    const salesIntelligence = new SalesIntelligenceOrchestrator(appConfig);
    
    // Perform analysis
    const analysis = await salesIntelligence.performAnalysis(domain, salesContext, searchResults);
    
    // Mark as completed with result
    await requestService.updateRequestStatus(asyncRequestId, 'completed', analysis);
    
    logger.info('Async analysis processing completed', { 
      asyncRequestId, 
      domain 
    });

  } catch (error) {
    logger.error('Async analysis processing failed', { 
      asyncRequestId, 
      domain, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Mark as failed with error
    await requestService.updateRequestStatus(
      asyncRequestId, 
      'failed', 
      undefined, 
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Lambda handler for processing analysis in background
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
    const cacheService = new CacheService(appConfig.cache, logger, process.env.AWS_REGION);

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
    const cacheService = new CacheService(appConfig.cache, logger, process.env.AWS_REGION);

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
    const cacheService = new CacheService(appConfig.cache, logger, process.env.AWS_REGION);

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
 * Lambda handler for profile management
 */
export const profileHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Profile Lambda invoked', { 
      requestId: context.awsRequestId,
      method: event.httpMethod,
      path: event.path 
    });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract userId from path parameters
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'User ID is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    const profileService = new ProfileService();

    switch (event.httpMethod) {
      case 'GET':
        // Get user profile
        try {
          const profile = await profileService.getProfile(userId);
          
          if (!profile) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({
                error: 'Profile not found',
                requestId: context.awsRequestId,
              }),
            };
          }

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              profile,
              requestId: context.awsRequestId,
            }),
          };
        } catch (error) {
          console.error('Error getting profile:', error);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'Failed to get profile',
              message: error instanceof Error ? error.message : 'Unknown error',
              requestId: context.awsRequestId,
            }),
          };
        }

      case 'PUT':
        // Save/update user profile
        try {
          if (!event.body) {
            return {
              statusCode: 400,
              headers: corsHeaders,
              body: JSON.stringify({
                error: 'Request body is required',
                requestId: context.awsRequestId,
              }),
            };
          }

          const profileData = JSON.parse(event.body) as Partial<UserProfile>;
          
          // Ensure userId matches the path parameter
          profileData.userId = userId;

          // Validate profile data
          const validation = profileService.validateProfile(profileData);
          if (!validation.isValid) {
            return {
              statusCode: 400,
              headers: corsHeaders,
              body: JSON.stringify({
                error: 'Invalid profile data',
                errors: validation.errors,
                requestId: context.awsRequestId,
              }),
            };
          }

          const savedProfile = await profileService.saveProfile(profileData as UserProfile);

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              profile: savedProfile,
              message: 'Profile saved successfully',
              requestId: context.awsRequestId,
            }),
          };
        } catch (error) {
          console.error('Error saving profile:', error);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'Failed to save profile',
              message: error instanceof Error ? error.message : 'Unknown error',
              requestId: context.awsRequestId,
            }),
          };
        }

      case 'DELETE':
        // Delete user profile
        try {
          await profileService.deleteProfile(userId);

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              message: 'Profile deleted successfully',
              requestId: context.awsRequestId,
            }),
          };
        } catch (error) {
          console.error('Error deleting profile:', error);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'Failed to delete profile',
              message: error instanceof Error ? error.message : 'Unknown error',
              requestId: context.awsRequestId,
            }),
          };
        }

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Method not allowed',
            allowedMethods: ['GET', 'PUT', 'DELETE'],
            requestId: context.awsRequestId,
          }),
        };
    }
  } catch (error) {
    console.error('Profile Lambda error:', error);
    
    const corsHeaders = getCorsHeaders();
    
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

export { SalesIntelligenceOrchestrator, appConfig };
export * from './types'; 