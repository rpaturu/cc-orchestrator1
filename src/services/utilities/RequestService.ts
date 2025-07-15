import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '../core/Logger';

export interface AsyncRequest {
  requestId: string;
  timestamp: number;
  companyDomain: string;
  requestType: 'overview' | 'search' | 'analysis' | 'discovery';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  processingTime?: number;
  expiresAt?: string;
}

export class RequestService {
  private readonly dynamoClient: DynamoDBDocumentClient;
  private readonly logger: Logger;
  private readonly tableName: string;

  constructor(logger: Logger, region?: string) {
    this.logger = logger;
    this.tableName = process.env.REQUESTS_TABLE_NAME!;
    
    // Initialize DynamoDB client
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
  }

  /**
   * Create a new async request
   */
  async createRequest(
    companyDomain: string,
    requestType: 'overview' | 'search' | 'analysis' | 'discovery'
  ): Promise<string> {
    const requestId = this.generateRequestId();
    const timestamp = Date.now();
    const now = new Date().toISOString();
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const request: AsyncRequest = {
      requestId,
      timestamp,
      companyDomain,
      requestType,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt
    };

    try {
      // Clean the request object to remove any undefined values
      const cleanedRequest = this.removeUndefinedValues(request);
      
      const command = new PutCommand({
        TableName: this.tableName,
        Item: cleanedRequest
      });

      await this.dynamoClient.send(command);
      
      this.logger.info('Async request created', { 
        requestId, 
        companyDomain, 
        requestType,
        expiresAt
      });
      
      return requestId;
    } catch (error) {
      this.logger.error('Failed to create async request', {
        requestId,
        companyDomain,
        requestType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string,
    status: 'processing' | 'completed' | 'failed',
    result?: any,
    error?: string
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    
    try {
      // Get the original request to get the timestamp for the update
      const originalRequest = await this.getRequest(requestId);
      if (!originalRequest) {
        throw new Error(`Request ${requestId} not found for update`);
      }
      
      let updateExpression = 'SET #status = :status, #updatedAt = :updatedAt';
      const expressionAttributeNames: any = {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      };
      const expressionAttributeValues: any = {
        ':status': status,
        ':updatedAt': updatedAt
      };

      if (result !== undefined) {
        updateExpression += ', #result = :result';
        expressionAttributeNames['#result'] = 'result';
        expressionAttributeValues[':result'] = this.removeUndefinedValues(result);
      }

      if (error !== undefined) {
        updateExpression += ', #error = :error';
        expressionAttributeNames['#error'] = 'error';
        expressionAttributeValues[':error'] = error;
      }

      if (status === 'completed' || status === 'failed') {
        // Calculate processing time
        const processingTime = Date.now() - originalRequest.timestamp;
        updateExpression += ', #processingTime = :processingTime';
        expressionAttributeNames['#processingTime'] = 'processingTime';
        expressionAttributeValues[':processingTime'] = processingTime;
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { requestId, timestamp: originalRequest.timestamp },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });

      await this.dynamoClient.send(command);
      
      this.logger.info('Async request updated', { 
        requestId, 
        status,
        hasResult: result !== undefined,
        hasError: error !== undefined
      });
    } catch (error) {
      this.logger.error('Failed to update async request', {
        requestId,
        status,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get request by ID
   */
  async getRequest(requestId: string): Promise<AsyncRequest | null> {
    try {
      // Since we don't have the timestamp, we need to query
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'requestId = :requestId',
        ExpressionAttributeValues: {
          ':requestId': requestId
        },
        ScanIndexForward: false, // Get most recent first
        Limit: 1
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Items || result.Items.length === 0) {
        this.logger.debug('Async request not found', { requestId });
        return null;
      }

      const request = result.Items[0] as AsyncRequest;
      
      // Check if request has expired
      if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
        this.logger.debug('Async request expired', { requestId, expiresAt: request.expiresAt });
        return null;
      }

      return request;
    } catch (error) {
      this.logger.error('Failed to get async request', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get requests by company domain
   */
  async getRequestsByCompany(companyDomain: string, limit = 10): Promise<AsyncRequest[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'CompanyDomainIndex',
        KeyConditionExpression: 'companyDomain = :companyDomain',
        ExpressionAttributeValues: {
          ':companyDomain': companyDomain
        },
        ScanIndexForward: false, // Get most recent first
        Limit: limit
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Items) {
        return [];
      }

      // Filter out expired requests
      const now = new Date();
      const validRequests = result.Items.filter((item: any) => {
        const request = item as AsyncRequest;
        return !request.expiresAt || new Date(request.expiresAt) > now;
      });

      return validRequests as AsyncRequest[];
    } catch (error) {
      this.logger.error('Failed to get requests by company', {
        companyDomain,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `req_${timestamp}_${randomPart}`;
  }

  /**
   * Remove undefined values from nested objects for DynamoDB compatibility
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item)).filter(item => item !== null && item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Health check for request service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to query the table to ensure it's accessible
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'requestId = :requestId',
        ExpressionAttributeValues: {
          ':requestId': 'health-check-non-existent'
        },
        Limit: 1
      });

      await this.dynamoClient.send(command);
      return true;
    } catch (error) {
      this.logger.error('Request service health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
} 