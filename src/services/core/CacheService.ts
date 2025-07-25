import { ContentAnalysis, CacheConfig } from '@/types';
import { Logger } from './Logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { CacheType, CACHE_TYPE_DISPLAY_NAMES } from '@/types/cache-types';

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

      // Check if data is stored as JSON string (from setRawJSON)
      if (typeof result.Item.data === 'string') {
        try {
          const parsedData = JSON.parse(result.Item.data);
          this.logger.debug('Cache hit (JSON string)', { key });
          return parsedData;
        } catch (parseError) {
          this.logger.warn('Failed to parse JSON string from cache', { key, error: String(parseError) });
          return null;
        }
      }

      // Deserialize Date objects from strings (for ContentAnalysis objects)
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
   * Get raw JSON data from cache (for simple data that doesn't need ContentAnalysis wrapping)
   */
  async getRawJSON(key: string): Promise<any | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { cacheKey: key }
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        this.logger.debug('Cache miss (raw JSON)', { key });
        return null;
      }

      // DynamoDB TTL will automatically remove expired items, but let's double-check
      const now = Math.floor(Date.now() / 1000);
      if (result.Item.ttl && result.Item.ttl < now) {
        this.logger.debug('Cache expired (raw JSON)', { key });
        return null;
      }

      // Parse JSON string data
      if (typeof result.Item.data === 'string') {
        try {
          return JSON.parse(result.Item.data);
        } catch (parseError) {
          this.logger.warn('Failed to parse cached JSON data', { key, parseError });
          return null;
        }
      }

      // If not string, return as-is (legacy format)
      return result.Item.data || result.Item;

    } catch (error) {
      this.logger.error('Cache getRawJSON error', { 
        key, 
        tableName: this.tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Store raw JSON data in cache (for simple data that doesn't need ContentAnalysis wrapping)
   */
  async setRawJSON(key: string, data: any, cacheType: CacheType): Promise<void> {
    try {
      const ttlHours = this.calculateTTLByType(cacheType);
      const ttlSeconds = Math.floor(Date.now() / 1000) + (ttlHours * 60 * 60);
      
      // Serialize any Date objects to strings to prevent DynamoDB errors
      const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
      
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          cacheKey: key,
          cacheType: cacheType,
          data: JSON.stringify(serializedData), // Store as JSON string to avoid DynamoDB format
          ttl: ttlSeconds,
          createdAt: new Date().toISOString()
        }
      });

      await this.dynamoClient.send(command);
      this.logger.debug('Cached raw JSON data', { 
        key, 
        cacheType,
        ttlHours,
        expiresAt: new Date(ttlSeconds * 1000).toISOString()
      });
    } catch (error) {
      this.logger.error('Cache setRawJSON error', { 
        key, 
        tableName: this.tableName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Store result in cache with explicit type classification
   */
  async set(key: string, data: ContentAnalysis, cacheType: CacheType): Promise<void> {
    try {
      // IMPROVED: Calculate TTL based on cache type for optimal cleanup
      const ttlHours = this.calculateTTLByType(cacheType);
      const ttlSeconds = Math.floor(Date.now() / 1000) + (ttlHours * 60 * 60);
      
      // Serialize Date objects to strings for DynamoDB
      const serializedData = {
        ...data,
        generatedAt: data.generatedAt ? data.generatedAt.toISOString() : new Date().toISOString()
      };
      
      // Remove undefined values to prevent DynamoDB errors
      const cleanedData = this.removeUndefinedValues(serializedData);
      
      // Determine cache type if not provided - use standardized inference
      const finalCacheType = cacheType;
      
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          cacheKey: key,
          cacheType: finalCacheType,
          data: cleanedData,
          ttl: ttlSeconds,
          createdAt: new Date().toISOString()
        }
      });

      await this.dynamoClient.send(command);
      this.logger.debug('Cached result with optimized TTL', { 
        key, 
        cacheType: finalCacheType,
        ttlHours,
        expiresAt: new Date(ttlSeconds * 1000).toISOString()
      });
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
   * Calculate optimal TTL based on cache type (IMPROVED)
   */
  private calculateTTLByType(cacheType: CacheType): number {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Base TTL multipliers based on cache type characteristics
    const baseTTL = isDevelopment ? 24 : 1; // 24 hours dev, 1 hour prod as base
    
    switch (cacheType) {
      // Raw external API responses - shorter TTL (high volume, lower long-term value)
      case CacheType.SERP_API_RAW_RESPONSE:
        return baseTTL * (isDevelopment ? 7 : 6); // 7 days dev, 6 hours prod
        
      // Multi-source raw data cache types (NEW)
      case CacheType.SERP_ORGANIC_RAW:
        return baseTTL * (isDevelopment ? 7 : 24); // 7 days dev, 24 hours prod
      case CacheType.SERP_NEWS_RAW:
        return baseTTL * (isDevelopment ? 3 : 1); // 3 days dev, 1 hour prod (news changes fast)
      case CacheType.SERP_JOBS_RAW:
        return baseTTL * (isDevelopment ? 7 : 6); // 7 days dev, 6 hours prod (jobs change daily)
      case CacheType.SERP_LINKEDIN_RAW:
        return baseTTL * (isDevelopment ? 14 : 12); // 14 days dev, 12 hours prod (professional data)
      case CacheType.SERP_YOUTUBE_RAW:
        return baseTTL * (isDevelopment ? 30 : 24); // 30 days dev, 24 hours prod (content stable)
      case CacheType.BRIGHTDATA_RAW:
        return baseTTL * (isDevelopment ? 30 : 168); // 30 days dev, 7 days prod (expensive API)
      case CacheType.SNOV_CONTACTS_RAW:
      case CacheType.APOLLO_CONTACTS_RAW:
        return baseTTL * (isDevelopment ? 60 : 720); // 60 days dev, 30 days prod (contact data stable)
        
      // Company enrichment - longer TTL (high reuse value, stable data)  
      case CacheType.COMPANY_ENRICHMENT:
        return baseTTL * (isDevelopment ? 30 : 72); // 30 days dev, 72 hours (3 days) prod
        
      // Lookup results - medium TTL (good reuse, but can change)
      case CacheType.SERP_API_COMPANY_LOOKUP:
      case CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP:
      case CacheType.COMPANY_SEARCH:
        return baseTTL * (isDevelopment ? 14 : 24); // 14 days dev, 24 hours prod
        
      // Analysis and intelligence - longer TTL (expensive to generate)
      case CacheType.COMPANY_OVERVIEW:
      case CacheType.COMPANY_ANALYSIS: 
      case CacheType.SALES_INTELLIGENCE_CACHE:
        return baseTTL * (isDevelopment ? 30 : 48); // 30 days dev, 48 hours prod
        
      // Feature suggestions - medium TTL (useful but can evolve)
      case CacheType.COMPETITOR_ANALYSIS:
      case CacheType.PRODUCT_SUGGESTIONS:
      case CacheType.DOMAIN_SUGGESTIONS:
        return baseTTL * (isDevelopment ? 21 : 36); // 21 days dev, 36 hours prod
        
      // External API enrichment - medium TTL (valuable but can update)
      case CacheType.SERP_API_COMPANY_ENRICHMENT:
      case CacheType.GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT:
        return baseTTL * (isDevelopment ? 21 : 48); // 21 days dev, 48 hours prod
        
      // Legacy types - shorter TTL (encourage migration)
      case CacheType.COMPANY_LOOKUP_LEGACY:
      case CacheType.COMPANY_ENRICHMENT_LEGACY:
        return baseTTL * (isDevelopment ? 3 : 12); // 3 days dev, 12 hours prod
        
      // Discovery and processing - shorter TTL (can change frequently)
      case CacheType.COMPANY_DISCOVERY:
        return baseTTL * (isDevelopment ? 7 : 12); // 7 days dev, 12 hours prod
        
      // LLM Analysis Types - medium TTL (useful for debugging/auditing)
      case CacheType.LLM_ANALYSIS:
      case CacheType.LLM_CUSTOMER_INTELLIGENCE:
        return baseTTL * (isDevelopment ? 14 : 24); // 14 days dev, 24 hours prod
      case CacheType.LLM_RAW_RESPONSE:
        return baseTTL * (isDevelopment ? 7 : 12); // 7 days dev, 12 hours prod (debugging)
        
      // Unknown/fallback - conservative TTL
      case CacheType.UNKNOWN:
      default:
        return baseTTL * (isDevelopment ? 1 : 6); // 1 day dev, 6 hours prod
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
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<{
    overview: {
      totalEntries: number;
      totalSizeBytes: number;
      averageEntrySize: number;
      maxSize: number;
    };
    byType: Array<{
      type: string;
      count: number;
      totalSizeBytes: number;
      averageSizeBytes: number;
      percentage: number;
    }>;
    expiration: {
      expired: number;
      expiringIn1Hour: number;
      expiringIn24Hours: number;
      validEntries: number;
    };
    recent: Array<{
      key: string;
      type: string;
      createdAt: string;
      sizeBytes: number;
    }>;
    largest: Array<{
      key: string;
      type: string;
      sizeBytes: number;
      createdAt: string;
    }>;
  }> {
    try {
      const scanCommand = new ScanCommand({
        TableName: this.tableName,
        ProjectionExpression: 'cacheKey, #data, #ttl, cacheType, createdAt',
        ExpressionAttributeNames: {
          '#data': 'data',
          '#ttl': 'ttl'
        }
      });

      const result = await this.dynamoClient.send(scanCommand);
      
      if (!result.Items || result.Items.length === 0) {
        return this.getEmptyStats();
      }

      // Process all entries
      const now = Math.floor(Date.now() / 1000);
      const oneHour = 3600;
      const twentyFourHours = 86400;
      
              const entries = result.Items.map((item: any) => {
        const key = item.cacheKey;
        const type = this.getCacheType(item);
        
        // Handle different data formats robustly
        let dataStr: string;
        let createdAt: string;
        let sizeBytes: number;
        
        try {
          // Convert data to string for size calculation
          dataStr = JSON.stringify(item.data || {});
          sizeBytes = Buffer.byteLength(dataStr, 'utf8');
          
          // Extract creation timestamp from different possible locations
          createdAt = this.extractCreatedAt(item);
          
        } catch (error) {
          this.logger.warn('Error processing cache entry', { key, error: String(error) });
          dataStr = '{}';
          sizeBytes = 2; // Empty JSON object
          createdAt = new Date().toISOString();
        }
        
        const ttl = item.ttl || 0;
        
        return {
          key,
          type,
          sizeBytes,
          createdAt,
          ttl,
          isExpired: ttl > 0 && ttl < now,
          expiresInHours: ttl > 0 ? (ttl - now) / 3600 : Infinity
        };
      });

      // Calculate overview stats
      const totalEntries = entries.length;
      const totalSizeBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
      const averageEntrySize = totalEntries > 0 ? Math.round(totalSizeBytes / totalEntries) : 0;

      // Group by type
      const typeMap = new Map();
      entries.forEach(entry => {
        if (!typeMap.has(entry.type)) {
          typeMap.set(entry.type, {
            type: entry.type,
            count: 0,
            totalSizeBytes: 0,
            entries: []
          });
        }
        const typeData = typeMap.get(entry.type);
        typeData.count++;
        typeData.totalSizeBytes += entry.sizeBytes;
        typeData.entries.push(entry);
      });

      // Calculate type statistics
      const byType = Array.from(typeMap.values()).map(typeData => ({
        type: typeData.type,
        count: typeData.count,
        totalSizeBytes: typeData.totalSizeBytes,
        averageSizeBytes: Math.round(typeData.totalSizeBytes / typeData.count),
        percentage: Math.round((typeData.count / totalEntries) * 100)
      })).sort((a, b) => b.count - a.count);

      // Calculate expiration stats
      const expired = entries.filter(e => e.isExpired).length;
      const expiringIn1Hour = entries.filter(e => !e.isExpired && e.expiresInHours <= 1).length;
      const expiringIn24Hours = entries.filter(e => !e.isExpired && e.expiresInHours <= 24).length;
      const validEntries = entries.filter(e => !e.isExpired).length;

      // Get recent entries (last 10)
      const recent = entries
        .filter(e => !e.isExpired)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map(e => ({
          key: e.key,
          type: e.type,
          createdAt: e.createdAt,
          sizeBytes: e.sizeBytes
        }));

      // Get largest entries
      const largest = entries
        .filter(e => !e.isExpired)
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 10)
        .map(e => ({
          key: e.key,
          type: e.type,
          sizeBytes: e.sizeBytes,
          createdAt: e.createdAt
        }));

      this.logger.info('Generated comprehensive cache statistics', { 
        totalEntries,
        typeCount: byType.length,
        totalSizeKB: Math.round(totalSizeBytes / 1024)
      });
      
      return {
        overview: {
          totalEntries,
          totalSizeBytes,
          averageEntrySize,
          maxSize: this.config.maxEntries
        },
        byType,
        expiration: {
          expired,
          expiringIn1Hour,
          expiringIn24Hours,
          validEntries
        },
        recent,
        largest
      };

    } catch (error) {
      this.logger.error('Cache stats error', { error });
      return this.getEmptyStats();
    }
  }

  /**
   * Extract creation timestamp from cache entry, handling different data formats
   */
  private extractCreatedAt(item: any): string {
    // Try different possible locations for creation timestamp
    
    // Method 1: Direct createdAt field
    if (item.createdAt) {
      return item.createdAt;
    }
    
    // Method 2: data.generatedAt (plain format)
    if (item.data?.generatedAt) {
      // Handle both string and Date formats
      if (typeof item.data.generatedAt === 'string') {
        return item.data.generatedAt;
      }
      if (item.data.generatedAt instanceof Date) {
        return item.data.generatedAt.toISOString();
      }
    }
    
    // Method 3: DynamoDB format data.generatedAt.S
    if (item.data?.generatedAt?.S) {
      return item.data.generatedAt.S;
    }
    
    // Method 4: Try to find generatedAt in nested DynamoDB structures
    if (typeof item.data === 'object') {
      try {
        const dataStr = JSON.stringify(item.data);
        const generatedAtMatch = dataStr.match(/"generatedAt":\{"S":"([^"]+)"/);
        if (generatedAtMatch) {
          return generatedAtMatch[1];
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
    
    // Method 5: Use TTL to estimate creation time (TTL - cache duration)
    if (item.ttl) {
      try {
        // Assume 30 days for development, 24 hours for production
        const cacheDurationHours = process.env.NODE_ENV === 'development' ? 720 : 24;
        const cacheDurationSeconds = cacheDurationHours * 3600;
        const estimatedCreatedAt = new Date((item.ttl - cacheDurationSeconds) * 1000);
        return estimatedCreatedAt.toISOString();
      } catch (error) {
        // Ignore calculation errors
      }
    }
    
    // Fallback: current time
    return new Date().toISOString();
  }

  /**
   * Get empty stats structure
   */
  private getEmptyStats() {
      return {
      overview: {
        totalEntries: 0,
        totalSizeBytes: 0,
        averageEntrySize: 0,
        maxSize: this.config.maxEntries
      },
      byType: [],
      expiration: {
        expired: 0,
        expiringIn1Hour: 0,
        expiringIn24Hours: 0,
        validEntries: 0
      },
      recent: [],
      largest: []
      };
    }

  /**
   * List cache keys with optional pattern and type filtering
   */
  async listKeys(pattern?: string, limit: number = 50, cacheType?: string): Promise<{
    keys: Array<{
      key: string;
      type: string;
      size: number;
      ttl: number;
      createdAt: string;
    }>;
    total: number;
    filtered: boolean;
  }> {
    try {
      const scanCommand = new ScanCommand({
        TableName: this.tableName,
        ProjectionExpression: 'cacheKey, #data, #ttl, cacheType, createdAt',
        ExpressionAttributeNames: {
          '#data': 'data',
          '#ttl': 'ttl'
        },
        Limit: limit * 2 // Get more to filter, then trim
      });

      const result = await this.dynamoClient.send(scanCommand);
      
      if (!result.Items) {
        return { keys: [], total: 0, filtered: false };
      }

      // Process and filter results
      let keys = result.Items.map((item: any) => {
        const key = item.cacheKey;
        const type = this.getCacheType(item);
        const dataSize = JSON.stringify(item.data).length;
        const createdAt = item.data?.generatedAt || new Date().toISOString();

        return {
          key,
          type,
          size: dataSize,
          ttl: item.ttl || 0,
          createdAt
        };
      });

      // Apply filters if provided
      const filtered = !!(pattern || cacheType);
      
      // Apply pattern filter
      if (pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
        keys = keys.filter(item => regex.test(item.key) || regex.test(item.type));
      }
      
      // Apply cache type filter
      if (cacheType) {
        keys = keys.filter(item => item.type === cacheType);
      }

      // Limit results
      const limitedKeys = keys.slice(0, limit);

      this.logger.info('Cache keys listed', { 
        total: keys.length, 
        returned: limitedKeys.length, 
        pattern: pattern || 'none',
        cacheType: cacheType || 'none'
      });

      return {
        keys: limitedKeys,
        total: keys.length,
        filtered
      };
    } catch (error) {
      this.logger.error('Cache list keys error', { error, pattern, cacheType });
      return { keys: [], total: 0, filtered: false };
    }
  }

  /**
   * Inspect a specific cache entry
   */
  async inspect(key: string): Promise<{
    key: string;
    type: string;
    data: any;
    metadata: {
      size: number;
      ttl: number;
      createdAt: string;
      expiresAt: string;
    };
  } | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { cacheKey: key }
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        this.logger.debug('Cache entry not found for inspection', { key });
        return null;
      }

      const type = this.getCacheType(result.Item);
      const dataStr = JSON.stringify(result.Item.data);
      const size = dataStr.length;
      const ttl = result.Item.ttl || 0;
      const createdAt = result.Item.data?.generatedAt || new Date().toISOString();
      const expiresAt = new Date(ttl * 1000).toISOString();

      this.logger.info('Cache entry inspected', { key, type, size });

      return {
        key,
        type,
        data: result.Item.data,
        metadata: {
          size,
          ttl,
          createdAt,
          expiresAt
        }
      };
    } catch (error) {
      this.logger.error('Cache inspect error', { key, error });
      return null;
    }
  }

  /**
   * Get summary of cache types
   */
  async getTypeSummary(): Promise<{
    types: Array<{
      type: string;
      count: number;
      totalSize: number;
      examples: string[];
    }>;
    totalEntries: number;
  }> {
    try {
      const scanCommand = new ScanCommand({
        TableName: this.tableName,
        ProjectionExpression: 'cacheKey, #data, cacheType, createdAt',
        ExpressionAttributeNames: {
          '#data': 'data'
        }
      });

      const result = await this.dynamoClient.send(scanCommand);
      
      if (!result.Items) {
        return { types: [], totalEntries: 0 };
      }

      // Group by cache type
      const typeMap = new Map<string, {
        count: number;
        totalSize: number;
        examples: string[];
      }>();

      result.Items.forEach((item: any) => {
        const key = item.cacheKey;
        const type = this.getCacheType(item);
        const size = JSON.stringify(item.data).length;

        if (!typeMap.has(type)) {
          typeMap.set(type, {
            count: 0,
            totalSize: 0,
            examples: []
          });
        }

        const typeData = typeMap.get(type)!;
        typeData.count++;
        typeData.totalSize += size;
        
        // Add example if we have less than 3
        if (typeData.examples.length < 3) {
          typeData.examples.push(key);
        }
      });

      // Convert to array
      const types = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        ...data
      }));

      // Sort by count descending
      types.sort((a, b) => b.count - a.count);

      this.logger.info('Cache type summary generated', { 
        typeCount: types.length, 
        totalEntries: result.Items.length 
      });

      return {
        types,
        totalEntries: result.Items.length
      };
    } catch (error) {
      this.logger.error('Cache type summary error', { error });
      return { types: [], totalEntries: 0 };
    }
  }

  /**
   * Get cache type from explicit attribute or infer from key pattern
   */
  private getCacheType(item: any): string {
      // Return the raw cache type for filtering/API compatibility
      return item.cacheType || 'unknown';
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