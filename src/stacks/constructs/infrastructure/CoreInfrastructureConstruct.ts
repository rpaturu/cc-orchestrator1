import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface CoreInfrastructureProps {
  allowedOriginsString: string;
}

export class CoreInfrastructureConstruct extends Construct {
  public readonly cacheTable: dynamodb.Table;
  public readonly requestsTable: dynamodb.Table;
  public readonly profilesTable: dynamodb.Table;
  public readonly apiKeysSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: CoreInfrastructureProps) {
    super(scope, id);

    // DynamoDB Tables
    this.cacheTable = new dynamodb.Table(this, 'CacheTable', {
      tableName: 'sales-intelligence-cache',
      partitionKey: { name: 'cacheKey', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for efficient cache type queries
    this.cacheTable.addGlobalSecondaryIndex({
      indexName: 'CacheTypeIndex',
      partitionKey: { name: 'cacheType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.requestsTable = new dynamodb.Table(this, 'RequestsTable', {
      tableName: 'sales-intelligence-requests',
      partitionKey: { name: 'requestId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for company domain lookup
    this.requestsTable.addGlobalSecondaryIndex({
      indexName: 'CompanyDomainIndex',
      partitionKey: { name: 'companyDomain', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.profilesTable = new dynamodb.Table(this, 'ProfilesTable', {
      tableName: 'sales-intelligence-profiles',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for email lookup
    this.profilesTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Secrets Manager for API keys
    this.apiKeysSecret = new secretsmanager.Secret(this, 'ApiKeysSecret', {
      secretName: 'sales-intelligence-api-keys',
      description: 'API keys for external services (Google, Bright Data, etc.)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          googleApiKey: '',
          brightDataApiKey: '',
          serpApiKey: '',
        }),
        generateStringKey: 'placeholder',
      },
    });
  }
} 