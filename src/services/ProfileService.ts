import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from './core/Logger';

export interface UserProfile {
  // Personal Information
  name: string;
  role: string;
  email?: string;
  department?: string;
  
  // Company Information
  company: string;
  companyDomain?: string;
  industry?: string;
  
  // Product Information
  primaryProducts: string[];
  keyValueProps: string[];
  
  // Competitive Intelligence
  mainCompetitors: string[];
  
  // Sales Context
  territory?: string;
  targetIndustries: string[];
  salesFocus?: 'enterprise' | 'smb' | 'mid-market' | 'startup';
  
  // Preferences
  defaultResearchContext?: 'discovery' | 'competitive' | 'partnership' | 'renewal';
  
  // Metadata
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

export class ProfileService {
  private readonly dynamoClient: DynamoDBDocumentClient;
  private readonly logger: Logger;
  private readonly tableName: string;

  constructor() {
    this.tableName = process.env.PROFILES_TABLE_NAME!;
    this.logger = new Logger('ProfileService');

    // Initialize DynamoDB client - let AWS SDK auto-detect region from Lambda environment
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);

    this.logger.info('ProfileService initialized', { 
      tableName: this.tableName 
    });
  }

  /**
   * Get user profile by userId
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      this.logger.info('Getting profile', { userId });

      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { userId }
      }));

      if (!result.Item) {
        this.logger.info('Profile not found', { userId });
        return null;
      }

      const profile = result.Item as UserProfile;
      this.logger.info('Profile retrieved successfully', { userId, hasProfile: true });
      
      return profile;
    } catch (error) {
      this.logger.error('Error getting profile', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Save or update user profile
   */
  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      this.logger.info('Saving profile', { userId: profile.userId });

      // Add timestamps
      const now = new Date().toISOString();
      const profileWithTimestamps = {
        ...profile,
        updatedAt: now,
        createdAt: profile.createdAt || now
      };

      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: profileWithTimestamps
      }));

      this.logger.info('Profile saved successfully', { userId: profile.userId });
      
      return profileWithTimestamps;
    } catch (error) {
      this.logger.error('Error saving profile', { 
        userId: profile.userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Delete user profile
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      this.logger.info('Deleting profile', { userId });

      await this.dynamoClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { userId }
      }));

      this.logger.info('Profile deleted successfully', { userId });
    } catch (error) {
      this.logger.error('Error deleting profile', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Validate profile data
   */
  validateProfile(profile: Partial<UserProfile>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.userId) {
      errors.push('userId is required');
    }

    if (!profile.name || !profile.name.trim()) {
      errors.push('name is required');
    }

    if (!profile.role || !profile.role.trim()) {
      errors.push('role is required');
    }

    if (!profile.company || !profile.company.trim()) {
      errors.push('company is required');
    }

    if (!profile.primaryProducts || profile.primaryProducts.length === 0) {
      errors.push('at least one primary product is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple query to check if the table is accessible
      await this.dynamoClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { userId: 'health-check-non-existent' }
      }));
      
      return true;
    } catch (error) {
      this.logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
} 