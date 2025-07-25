import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SalesIntelligenceOrchestrator } from '../../SalesIntelligenceOrchestrator';
import { AppConfig } from '../../../types';
import { getCorsHeaders } from '../../../index';
import { config } from 'dotenv';

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
 * Lambda handler for search operations
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
 * Lambda handler for chat operations
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

/**
 * Lambda handler for Bedrock parsing operations
 */
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

    const { prompt, message, maxTokens = parseInt(process.env.BEDROCK_MAX_TOKENS!)} = JSON.parse(event.body);
    
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