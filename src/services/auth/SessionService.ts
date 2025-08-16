/**
 * SessionService - Backend session management
 * 
 * Clean implementation following complete lifecycle:
 * 1. Session creation after Cognito login
 * 2. Session validation on API requests  
 * 3. Sliding window TTL extension
 * 4. Session cleanup on logout/expiration
 */

import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

export interface UserContext {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
}

export class SessionService {
  private static instance: SessionService;
  private sessions: Map<string, SessionData> = new Map(); // Fallback for local dev
  private readonly SESSION_TTL_HOURS = 24; // 24 hours sliding window
  private cleanupInterval?: NodeJS.Timeout;
  private readonly tableName: string;
  private readonly dynamoClient: DynamoDBDocumentClient;

  private constructor() {
    // Use existing profile table name as base - sessions will be stored with prefix
    this.tableName = process.env.PROFILE_TABLE_NAME || 'sales-intelligence-profiles';
    
    // Initialize DynamoDB client
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-west-2' });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    
    // Start cleanup process - runs every hour
    this.startCleanupProcess();
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Create a new session after successful Cognito authentication
   */
  async createSession(userContext: UserContext): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TTL_HOURS * 60 * 60 * 1000);

    const sessionData: SessionData = {
      sessionId,
      userId: userContext.userId,
      email: userContext.email,
      firstName: userContext.firstName,
      lastName: userContext.lastName,
      createdAt: now,
      expiresAt,
      lastAccessedAt: now
    };

    // Store in both memory (fast local cache) and DynamoDB (persistent)
    this.sessions.set(sessionId, sessionData);
    
    try {
      // Store in DynamoDB with TTL (using userId as key for profiles table)
      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          userId: `SESSION#${sessionId}`, // Use SESSION# prefix to distinguish from user profiles
          sessionId,
          originalUserId: userContext.userId, // Store the actual userId separately
          email: userContext.email,
          firstName: userContext.firstName,
          lastName: userContext.lastName,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          lastAccessedAt: now.toISOString(),
          ttl: Math.floor(expiresAt.getTime() / 1000) // DynamoDB TTL in seconds
        }
      }));
      
      console.log('Session created in DynamoDB:', { 
        sessionId, 
        userId: userContext.userId,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error('Failed to store session in DynamoDB:', error);
      // Continue with in-memory fallback
    }
    
    return sessionId;
  }

  /**
   * Validate session and extend TTL (sliding window)
   */
  async validateSession(sessionId: string): Promise<UserContext | null> {
    if (!sessionId) return null;

    // First check memory cache
    let session = this.sessions.get(sessionId);
    
    // If not in memory, check DynamoDB
    if (!session) {
      try {
        const result = await this.dynamoClient.send(new GetCommand({
          TableName: this.tableName,
          Key: {
            userId: `SESSION#${sessionId}`
          }
        }));
        
        if (result.Item) {
          // Reconstruct session data from DynamoDB
          session = {
            sessionId: result.Item.sessionId,
            userId: result.Item.originalUserId, // Use the original userId, not the SESSION# key
            email: result.Item.email,
            firstName: result.Item.firstName,
            lastName: result.Item.lastName,
            createdAt: new Date(result.Item.createdAt),
            expiresAt: new Date(result.Item.expiresAt),
            lastAccessedAt: new Date(result.Item.lastAccessedAt)
          };
          
          // Cache in memory for subsequent requests
          this.sessions.set(sessionId, session);
          console.log('Session loaded from DynamoDB:', sessionId);
        }
      } catch (error) {
        console.error('Failed to load session from DynamoDB:', error);
      }
    }

    if (!session) {
      console.log('Session not found in memory or DynamoDB:', sessionId);
      return null;
    }

    // Check if session is expired
    const now = new Date();
    if (now > session.expiresAt) {
      console.log('Session expired:', { sessionId, expiredAt: session.expiresAt });
      await this.destroySession(sessionId);
      return null;
    }

    // Extend session TTL (sliding window)
    const newExpiresAt = new Date(now.getTime() + this.SESSION_TTL_HOURS * 60 * 60 * 1000);
    session.expiresAt = newExpiresAt;
    session.lastAccessedAt = now;
    
    this.sessions.set(sessionId, session);

    console.log('Session validated and extended:', { 
      sessionId, 
      userId: session.userId,
      newExpiresAt: newExpiresAt.toISOString()
    });

    return {
      userId: session.userId,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName
    };
  }

  /**
   * Get session data without extending TTL
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!sessionId) return null;

    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if expired but don't auto-cleanup here
    if (new Date() > session.expiresAt) {
      return null;
    }

    return session;
  }

  /**
   * Destroy a specific session (logout)
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    
    // Also remove from DynamoDB
    try {
      await this.dynamoClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          userId: `SESSION#${sessionId}`
        }
      }));
      console.log('Session destroyed from DynamoDB:', sessionId);
    } catch (error) {
      console.error('Failed to delete session from DynamoDB:', error);
    }
    
    console.log('Session destroyed:', { 
      sessionId,
      userId: session?.userId 
    });
  }

  /**
   * Destroy all sessions for a specific user
   */
  async destroyUserSessions(userId: string): Promise<number> {
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId);

    userSessions.forEach(([sessionId, _]) => {
      this.sessions.delete(sessionId);
    });

    console.log('All user sessions destroyed:', { 
      userId, 
      count: userSessions.length 
    });

    return userSessions.length;
  }

  /**
   * Get active session count for monitoring
   */
  getActiveSessionCount(): number {
    const now = new Date();
    return Array.from(this.sessions.values())
      .filter(session => session.expiresAt > now).length;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    active: number;
    expired: number;
  } {
    const now = new Date();
    const allSessions = Array.from(this.sessions.values());
    const activeSessions = allSessions.filter(session => session.expiresAt > now);
    
    return {
      total: allSessions.length,
      active: activeSessions.length,
      expired: allSessions.length - activeSessions.length
    };
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const uuid = randomUUID().replace(/-/g, '');
    return `sess_${timestamp}_${uuid}`;
  }

  /**
   * Start automatic cleanup of expired sessions
   */
  private startCleanupProcess(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);

    console.log('Session cleanup process started (runs every hour)');
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.expiresAt <= now);

    expiredSessions.forEach(([sessionId, _]) => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log('Expired sessions cleaned up:', { 
        count: expiredSessions.length,
        remainingActive: this.getActiveSessionCount()
      });
    }
  }

  /**
   * Stop cleanup process (for testing/shutdown)
   */
  stopCleanupProcess(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      console.log('Session cleanup process stopped');
    }
  }
}

// Export singleton instance
export const sessionService = SessionService.getInstance();
