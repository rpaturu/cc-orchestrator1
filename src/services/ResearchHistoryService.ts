import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

export interface CompanyResearch {
  userId: string;
  company: string;
  lastUpdated: string;
  messages: Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    companySummary?: any;
    options?: any;
  }>;
  completedResearch: Array<{
    id: string;
    areaId: string;
    title: string;
    status: 'completed' | 'in_progress';
    completedAt?: string;
    data?: any;
  }>;
  metadata?: {
    userRole?: string;
    userCompany?: string;
    lastActivity?: string;
  };
}

export interface CompanyResearchSummary {
  company: string;
  lastUpdated: string;
  completedAreas: number;
  lastActivity?: string;
}

export class ResearchHistoryService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.tableName = process.env.RESEARCH_HISTORY_TABLE_NAME || 'sales-intelligence-research-history';
  }

  async saveCompanyResearch(userId: string, company: string, data: any): Promise<CompanyResearch> {
    const timestamp = new Date().toISOString();
    
    const researchData: CompanyResearch = {
      userId,
      company,
      lastUpdated: timestamp,
      messages: data.messages || [],
      completedResearch: data.completedResearch || [],
      metadata: {
        ...data.metadata,
        lastActivity: timestamp,
      },
    };

    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: researchData,
    }));

    return researchData;
  }

  async getCompanyResearch(userId: string, company: string): Promise<CompanyResearch | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        userId,
        company,
      },
    }));

    return result.Item as CompanyResearch || null;
  }

  async getUserCompanies(userId: string): Promise<{ companies: CompanyResearchSummary[] }> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }));

    const companies = (result.Items || []).map(item => ({
      company: item.company,
      lastUpdated: item.lastUpdated,
      completedAreas: item.completedResearch?.length || 0,
      lastActivity: item.metadata?.lastActivity,
    }));

    return { companies };
  }

  async deleteCompanyResearch(userId: string, company: string): Promise<{ message: string }> {
    await this.client.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        userId,
        company,
      },
    }));

    return { message: `Research data for ${company} deleted successfully` };
  }

  /**
   * GDPR Right to Erasure: Delete all research data for a user
   */
  async deleteAllUserData(userId: string): Promise<{ message: string; deletedCount: number }> {
    // First, get all companies for the user
    const userCompanies = await this.getUserCompanies(userId);
    
    // Delete each company's research data
    const deletePromises = userCompanies.companies.map(company => 
      this.deleteCompanyResearch(userId, company.company)
    );
    
    await Promise.all(deletePromises);
    
    return { 
      message: `All research data for user ${userId} deleted successfully`,
      deletedCount: userCompanies.companies.length
    };
  }
}
