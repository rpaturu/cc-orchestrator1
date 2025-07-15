import { ContentAnalysis, CacheConfig } from '@/types';
import { Logger } from './Logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

export class CacheService {
  private readonly dynamoClient: DynamoDBDocumentClient;
  private readonly config: CacheConfig;
  private readonly logger: Logger;
  private readonly tableName: string;

  constructor(config: CacheConfig, logger: Logger, region?: string) {
    this.config = config;
    this.logger = logger;
    this.tableName = process.env.CACHE_TABLE_NAME!;
    
    // Initialize DynamoDB client
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
  }

  /**
   * Get cached result if available and not expired
   */
  async get(key: string): Promise<ContentAnalysis | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { cacheKey: key }
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        this.logger.debug('Cache miss', { key });
        return null;
      }

      // DynamoDB TTL will automatically remove expired items, but let's double-check
      const now = Math.floor(Date.now() / 1000);
      if (result.Item.ttl && result.Item.ttl < now) {
        this.logger.debug('Cache expired', { key });
        return null;
      }

      // Deserialize Date objects from strings
      const deserializedData = {
        ...result.Item.data,
        generatedAt: new Date(result.Item.data.generatedAt)
      };

      this.logger.debug('Cache hit', { key });
      return deserializedData as ContentAnalysis;
    } catch (error) {
      this.logger.error('Cache get error', { 
        key, 
        tableName: this.tableName,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Store result in cache
   */
  async set(key: string, data: ContentAnalysis): Promise<void> {
    try {
      const ttlSeconds = Math.floor(Date.now() / 1000) + (this.config.ttlHours * 60 * 60);
      
      // Serialize Date objects to strings for DynamoDB
      const serializedData = {
        ...data,
        generatedAt: data.generatedAt.toISOString()
      };
      
      // Remove undefined values to prevent DynamoDB errors
      const cleanedData = this.removeUndefinedValues(serializedData);
      
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          cacheKey: key,
          data: cleanedData,
          ttl: ttlSeconds,
          createdAt: new Date().toISOString()
        }
      });

      await this.dynamoClient.send(command);
      this.logger.debug('Cached result', { key, ttl: new Date(ttlSeconds * 1000) });
    } catch (error) {
      this.logger.error('Cache set error', { 
        key, 
        tableName: this.tableName,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
    }
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
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    try {
      // Note: This is expensive for large tables. In production, consider using batch operations.
      const scanCommand = new ScanCommand({
        TableName: this.tableName,
        ProjectionExpression: 'cacheKey'
      });

      const result = await this.dynamoClient.send(scanCommand);
      
      if (result.Items && result.Items.length > 0) {
        // Delete items in batches
        const deletePromises = result.Items.map((item: any) => 
          this.dynamoClient.send(new DeleteCommand({
            TableName: this.tableName,
            Key: { cacheKey: item.cacheKey }
          }))
        );

        await Promise.all(deletePromises);
        this.logger.info('Cache cleared', { deletedCount: result.Items.length });
      } else {
        this.logger.info('Cache already empty');
      }
    } catch (error) {
      this.logger.error('Cache clear error', { error });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ size: number; maxSize: number; hitRate?: number }> {
    try {
      const scanCommand = new ScanCommand({
        TableName: this.tableName,
        Select: 'COUNT'
      });

      const result = await this.dynamoClient.send(scanCommand);
      
      return {
        size: result.Count || 0,
        maxSize: this.config.maxEntries // Note: DynamoDB doesn't have a hard limit like in-memory cache
      };
    } catch (error) {
      this.logger.error('Cache stats error', { error });
      return {
        size: 0,
        maxSize: this.config.maxEntries
      };
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to get stats
      await this.getStats();
      return true;
    } catch (error) {
      this.logger.error('Cache health check failed', { error });
      return false;
    }
  }

  /**
   * Remove a specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { cacheKey: key }
      });

      await this.dynamoClient.send(command);
      this.logger.debug('Cache entry deleted', { key });
    } catch (error) {
      this.logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Get multiple cache entries by keys
   */
  async getMultiple(keys: string[]): Promise<Map<string, ContentAnalysis>> {
    const results = new Map<string, ContentAnalysis>();
    
    try {
      // DynamoDB BatchGet is more efficient for multiple items
      const getPromises = keys.map(async (key) => {
        const data = await this.get(key);
        if (data) {
          results.set(key, data);
        }
      });

      await Promise.all(getPromises);
      this.logger.debug('Batch cache get', { requestedKeys: keys.length, foundKeys: results.size });
    } catch (error) {
      this.logger.error('Cache batch get error', { keys, error });
    }

    return results;
  }
} 