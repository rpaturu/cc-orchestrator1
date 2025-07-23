import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SalesIntelligenceOrchestrator } from '../../SalesIntelligenceOrchestrator';
import { ProfileService, UserProfile } from '../../ProfileService';
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