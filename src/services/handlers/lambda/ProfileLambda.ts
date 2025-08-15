import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { ProfileService } from '../../ProfileService';
import { Logger } from '../../core/Logger';

/**
 * Profile Lambda Handler
 * GET /profile/{userId} - Get user profile
 * PUT /profile/{userId} - Update user profile  
 * DELETE /profile/{userId} - Delete user profile
 */
export const profileHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('Profile');
  
  try {
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    const userId = event.pathParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'userId is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize profile service
    const profileService = new ProfileService();

    let result;

    switch (event.httpMethod) {
      case 'GET':
        logger.info('Getting user profile', { userId });
        result = await profileService.getProfile(userId);
        
        if (!result) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'Profile not found',
              userId,
              requestId: context.awsRequestId,
            }),
          };
        }
        break;

      case 'PUT':
        if (!event.body) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              error: 'Request body is required for profile update',
              requestId: context.awsRequestId,
            }),
          };
        }

        const updateData = JSON.parse(event.body);
        logger.info('Updating user profile', { userId, updateData: Object.keys(updateData) });
        
        // Ensure userId is included in the profile data
        const profileData = {
          ...updateData,
          userId,
          updatedAt: new Date().toISOString()
        };
        
        result = await profileService.saveProfile(profileData);
        break;

      case 'DELETE':
        logger.info('Deleting user profile', { userId });
        await profileService.deleteProfile(userId);
        result = { message: 'Profile deleted successfully', userId };
        break;

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Method not allowed',
            method: event.httpMethod,
            requestId: context.awsRequestId,
          }),
        };
    }

    logger.info('Profile operation completed successfully', {
      method: event.httpMethod,
      userId,
      hasResult: !!result
    });

    // Format response based on operation type
    let responseData;
    if (event.httpMethod === 'GET') {
      // GET returns profile wrapped in profile property
      responseData = {
        profile: result,
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString()
      };
    } else if (event.httpMethod === 'PUT') {
      // PUT returns saved profile wrapped in profile property
      responseData = {
        profile: result,
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString()
      };
    } else if (event.httpMethod === 'DELETE') {
      // DELETE returns message directly
      responseData = {
        ...result,
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString()
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    logger.error('Profile operation failed', { 
      method: event.httpMethod,
      userId: event.pathParameters?.userId,
      error 
    });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json',
    };
    
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