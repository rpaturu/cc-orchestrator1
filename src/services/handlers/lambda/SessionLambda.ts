/**
 * SessionLambda - API endpoints for session management
 * 
 * Endpoints:
 * - POST /session - Create new session after Cognito login
 * - DELETE /session/{sessionId} - Destroy session on logout
 * - GET /session/{sessionId} - Get session info (optional)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { sessionService } from '../../auth/SessionService';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Session-ID',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

export const sessionHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    switch (event.httpMethod) {
      case 'POST':
        return await createSession(event, context);
      case 'DELETE':
        return await deleteSession(event, context);
      case 'GET':
        return await getSession(event, context);
      default:
        return createErrorResponse(405, 'Method not allowed', context.awsRequestId);
    }
  } catch (error) {
    console.error('Session handler error:', error);
    return createErrorResponse(
      500, 
      error instanceof Error ? error.message : 'Internal server error',
      context.awsRequestId
    );
  }
};

/**
 * Create new session after Cognito authentication
 * POST /session
 */
async function createSession(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createErrorResponse(400, 'Request body required', context.awsRequestId);
  }

  try {
    const { userId, email, firstName, lastName } = JSON.parse(event.body);

    // Validate required fields
    if (!userId || !email) {
      return createErrorResponse(400, 'userId and email are required', context.awsRequestId);
    }

    // Create session
    const sessionId = await sessionService.createSession({
      userId,
      email,
      firstName: firstName || '',
      lastName: lastName || ''
    });

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        sessionId,
        message: 'Session created successfully',
        expiresIn: '24 hours',
        requestId: context.awsRequestId
      })
    };

  } catch (error) {
    console.error('Error creating session:', error);
    return createErrorResponse(500, 'Failed to create session', context.awsRequestId);
  }
}

/**
 * Delete session on logout
 * DELETE /session/{sessionId}
 */
async function deleteSession(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return createErrorResponse(400, 'sessionId path parameter required', context.awsRequestId);
  }

  try {
    await sessionService.destroySession(sessionId);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Session deleted successfully',
        requestId: context.awsRequestId
      })
    };

  } catch (error) {
    console.error('Error deleting session:', error);
    return createErrorResponse(500, 'Failed to delete session', context.awsRequestId);
  }
}

/**
 * Get session information (optional endpoint for debugging)
 * GET /session/{sessionId}
 */
async function getSession(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const sessionId = event.pathParameters?.sessionId;

  if (!sessionId) {
    return createErrorResponse(400, 'sessionId path parameter required', context.awsRequestId);
  }

  try {
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      return createErrorResponse(404, 'Session not found', context.awsRequestId);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        sessionId: session.sessionId,
        userId: session.userId,
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        lastAccessedAt: session.lastAccessedAt.toISOString(),
        requestId: context.awsRequestId
      })
    };

  } catch (error) {
    console.error('Error getting session:', error);
    return createErrorResponse(500, 'Failed to get session', context.awsRequestId);
  }
}

/**
 * Helper function to create error responses
 */
function createErrorResponse(statusCode: number, message: string, requestId: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      error: message,
      requestId
    })
  };
}
