/**
 * SessionMiddleware - Clean session handling for Lambda functions
 * 
 * Handles the complete session lifecycle:
 * 1. Extracts sessionId from headers
 * 2. Validates session and extends TTL
 * 3. Provides user context to handlers
 * 4. Returns 401 for invalid/expired sessions
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sessionService, UserContext } from '../services/auth/SessionService';

export interface SessionAwareLambdaEvent extends APIGatewayProxyEvent {
  userContext: UserContext;
  sessionId: string;
}

export class SessionMiddleware {
  private static instance: SessionMiddleware;

  private constructor() {}

  static getInstance(): SessionMiddleware {
    if (!SessionMiddleware.instance) {
      SessionMiddleware.instance = new SessionMiddleware();
    }
    return SessionMiddleware.instance;
  }

  /**
   * Process Lambda event and validate session
   */
  async processEvent(event: APIGatewayProxyEvent): Promise<SessionAwareLambdaEvent> {
    // Extract sessionId from headers
    const sessionId = this.extractSessionId(event);
    
    if (!sessionId) {
      throw new Error('Session ID required. Please include X-Session-ID header.');
    }

    // Validate session and extend TTL
    const userContext = await sessionService.validateSession(sessionId);
    
    if (!userContext) {
      throw new Error('Invalid or expired session. Please sign in again.');
    }

    // Create session-aware event
    const sessionAwareEvent = event as SessionAwareLambdaEvent;
    sessionAwareEvent.sessionId = sessionId;
    sessionAwareEvent.userContext = userContext;
    
    return sessionAwareEvent;
  }

  /**
   * Wrap Lambda handler with session validation
   */
  withSession<TResult = APIGatewayProxyResult>(
    handler: (event: SessionAwareLambdaEvent, context?: any) => Promise<TResult>
  ) {
    return async (event: APIGatewayProxyEvent, context?: any): Promise<TResult> => {
      try {
        const sessionAwareEvent = await this.processEvent(event);
        return await handler(sessionAwareEvent, context);
      } catch (error) {
        console.error('SessionMiddleware error:', error);
        
        // Return 401 for session-related errors
        if (error instanceof Error && 
            (error.message.includes('Session') || error.message.includes('session'))) {
          return {
            statusCode: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Session-ID',
              'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            body: JSON.stringify({
              error: 'Authentication required',
              message: error.message
            })
          } as TResult;
        }
        
        throw error;
      }
    };
  }

  /**
   * Extract sessionId from request headers
   */
  private extractSessionId(event: APIGatewayProxyEvent): string | null {
    const headers = event.headers || {};
    
    return (
      headers['X-Session-ID'] ||
      headers['x-session-id'] ||
      headers['sessionId'] ||
      null
    );
  }
}

// Export singleton and convenience function
export const sessionMiddleware = SessionMiddleware.getInstance();
export const withSession = sessionMiddleware.withSession.bind(sessionMiddleware);
