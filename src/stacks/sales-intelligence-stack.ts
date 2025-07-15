import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class SalesIntelligenceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get configuration from context
    const allowedOrigins = this.node.tryGetContext('allowedOrigins') || [
      'https://d1uaf0b61i39e.cloudfront.net',
      'http://localhost:3000'
    ];
    const allowedOriginsString = allowedOrigins.join(',');

    // DynamoDB Tables
    const cacheTable = new dynamodb.Table(this, 'SalesIntelligenceCacheTable', {
      tableName: 'sales-intelligence-cache',
      partitionKey: { name: 'cacheKey', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const requestsTable = new dynamodb.Table(this, 'SalesIntelligenceRequestsTable', {
      tableName: 'sales-intelligence-requests',
      partitionKey: { name: 'requestId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for company domain lookup
    requestsTable.addGlobalSecondaryIndex({
      indexName: 'CompanyDomainIndex',
      partitionKey: { name: 'companyDomain', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Secrets Manager for API keys
    const apiKeysSecret = new secretsmanager.Secret(this, 'SalesIntelligenceApiKeys', {
      secretName: 'sales-intelligence-api-keys',
      description: 'API keys for Sales Intelligence services (Google Search)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          googleSearchApiKey: '',
          googleSearchEngineId: ''
        }),
        generateStringKey: 'placeholder',
        excludeCharacters: '"\\/@',
      },
    });



    // Search Lambda Function (fast endpoint)
    const searchFunction = new NodejsFunction(this, 'SearchFunction', {
      functionName: 'sales-intelligence-search',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'searchHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        API_KEYS_SECRET_NAME: apiKeysSecret.secretName,
        BEDROCK_MODEL: this.node.tryGetContext('bedrockModel')!,
        BEDROCK_MAX_TOKENS: this.node.tryGetContext('bedrockMaxTokens')!,
        BEDROCK_TEMPERATURE: this.node.tryGetContext('bedrockTemperature')!,
        GOOGLE_SEARCH_API_KEY: this.node.tryGetContext('googleSearchApiKey')!,
        GOOGLE_SEARCH_ENGINE_ID: this.node.tryGetContext('googleSearchEngineId')!,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Analysis Lambda Function (slower endpoint)
    const analysisFunction = new NodejsFunction(this, 'AnalysisFunction', {
      functionName: 'sales-intelligence-analysis',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'analysisHandler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        API_KEYS_SECRET_NAME: apiKeysSecret.secretName,
        BEDROCK_MODEL: this.node.tryGetContext('bedrockModel')!,
        BEDROCK_MAX_TOKENS: this.node.tryGetContext('bedrockMaxTokens')!,
        BEDROCK_TEMPERATURE: this.node.tryGetContext('bedrockTemperature')!,
        GOOGLE_SEARCH_API_KEY: this.node.tryGetContext('googleSearchApiKey')!,
        GOOGLE_SEARCH_ENGINE_ID: this.node.tryGetContext('googleSearchEngineId')!,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Discovery Lambda Function (medium speed endpoint)
    const discoveryFunction = new NodejsFunction(this, 'DiscoveryFunction', {
      functionName: 'sales-intelligence-discovery',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'discoveryHandler',
      timeout: cdk.Duration.minutes(3),
      memorySize: 768,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        API_KEYS_SECRET_NAME: apiKeysSecret.secretName,
        BEDROCK_MODEL: this.node.tryGetContext('bedrockModel')!,
        BEDROCK_MAX_TOKENS: this.node.tryGetContext('bedrockMaxTokens')!,
        BEDROCK_TEMPERATURE: this.node.tryGetContext('bedrockTemperature')!,
        GOOGLE_SEARCH_API_KEY: this.node.tryGetContext('googleSearchApiKey')!,
        GOOGLE_SEARCH_ENGINE_ID: this.node.tryGetContext('googleSearchEngineId')!,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Chat Interface Lambda Function (dynamic query generation)
    const chatFunction = new NodejsFunction(this, 'ChatFunction', {
      functionName: 'sales-intelligence-chat',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'chatHandler',
      timeout: cdk.Duration.minutes(3),
      memorySize: 768,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        API_KEYS_SECRET_NAME: apiKeysSecret.secretName,
        BEDROCK_MODEL: this.node.tryGetContext('bedrockModel')!,
        BEDROCK_MAX_TOKENS: this.node.tryGetContext('bedrockMaxTokens')!,
        BEDROCK_TEMPERATURE: this.node.tryGetContext('bedrockTemperature')!,
        GOOGLE_SEARCH_API_KEY: this.node.tryGetContext('googleSearchApiKey')!,
        GOOGLE_SEARCH_ENGINE_ID: this.node.tryGetContext('googleSearchEngineId')!,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Health Check Lambda Function
    const healthCheckFunction = new NodejsFunction(this, 'HealthCheckFunction', {
      functionName: 'sales-intelligence-health-check',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'healthHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Bedrock Parse Lambda Function
    const bedrockParseFunction = new NodejsFunction(this, 'BedrockParseFunction', {
      functionName: 'sales-intelligence-bedrock-parse',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'bedrockParseHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        API_KEYS_SECRET_NAME: apiKeysSecret.secretName,
        BEDROCK_MODEL: this.node.tryGetContext('bedrockModel')!,
        BEDROCK_MAX_TOKENS: this.node.tryGetContext('bedrockMaxTokens')!,
        BEDROCK_TEMPERATURE: this.node.tryGetContext('bedrockTemperature')!,
        GOOGLE_SEARCH_API_KEY: this.node.tryGetContext('googleSearchApiKey')!,
        GOOGLE_SEARCH_ENGINE_ID: this.node.tryGetContext('googleSearchEngineId')!,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Debug Lambda Function  
    const debugFunction = new NodejsFunction(this, 'DebugFunction', {
      functionName: 'sales-intelligence-debug',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'debugHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        API_KEYS_SECRET_NAME: apiKeysSecret.secretName,
        GOOGLE_SEARCH_API_KEY: this.node.tryGetContext('googleSearchApiKey')!,
        GOOGLE_SEARCH_ENGINE_ID: this.node.tryGetContext('googleSearchEngineId')!,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Async Company Overview Lambda Function
    const asyncOverviewFunction = new NodejsFunction(this, 'AsyncOverviewFunction', {
      functionName: 'sales-intelligence-async-overview',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'companyOverviewAsyncHandler',
      timeout: cdk.Duration.seconds(30), // Short timeout as it only creates request
      memorySize: 512,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        API_KEYS_SECRET_NAME: apiKeysSecret.secretName,
        BEDROCK_MODEL: this.node.tryGetContext('bedrockModel')!,
        BEDROCK_MAX_TOKENS: this.node.tryGetContext('bedrockMaxTokens')!,
        BEDROCK_TEMPERATURE: this.node.tryGetContext('bedrockTemperature')!,
        GOOGLE_SEARCH_API_KEY: this.node.tryGetContext('googleSearchApiKey')!,
        GOOGLE_SEARCH_ENGINE_ID: this.node.tryGetContext('googleSearchEngineId')!,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Get Async Request Lambda Function
    const getAsyncRequestFunction = new NodejsFunction(this, 'GetAsyncRequestFunction', {
      functionName: 'sales-intelligence-get-async-request',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'getAsyncRequestHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Process Overview Lambda Function (for async processing)
    const processOverviewFunction = new NodejsFunction(this, 'ProcessOverviewFunction', {
      functionName: 'sales-intelligence-process-overview',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'processOverviewHandler',
      timeout: cdk.Duration.minutes(15), // Long timeout for processing
      memorySize: 1024,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        REQUESTS_TABLE_NAME: requestsTable.tableName,
        API_KEYS_SECRET_NAME: apiKeysSecret.secretName,
        BEDROCK_MODEL: this.node.tryGetContext('bedrockModel')!,
        BEDROCK_MAX_TOKENS: this.node.tryGetContext('bedrockMaxTokens')!,
        BEDROCK_TEMPERATURE: this.node.tryGetContext('bedrockTemperature')!,
        GOOGLE_SEARCH_API_KEY: this.node.tryGetContext('googleSearchApiKey')!,
        GOOGLE_SEARCH_ENGINE_ID: this.node.tryGetContext('googleSearchEngineId')!,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Cache Management Lambda Functions (for development)
    const cacheClearFunction = new NodejsFunction(this, 'CacheClearFunction', {
      functionName: 'sales-intelligence-cache-clear',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'cacheClearHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    const cacheDeleteFunction = new NodejsFunction(this, 'CacheDeleteFunction', {
      functionName: 'sales-intelligence-cache-delete',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'cacheDeleteHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    const cacheStatsFunction = new NodejsFunction(this, 'CacheStatsFunction', {
      functionName: 'sales-intelligence-cache-stats',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../index.ts'),
      handler: 'cacheStatsHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        CACHE_TABLE_NAME: cacheTable.tableName,
        LOG_LEVEL: this.node.tryGetContext('logLevel')!,
        ALLOWED_ORIGINS: allowedOriginsString,
        NODE_ENV: 'production'
      },
      bundling: {
        tsconfig: path.join(__dirname, '../../tsconfig.json'),
      },
    });

    // Grant permissions for all functions
    [searchFunction, analysisFunction, discoveryFunction, chatFunction, bedrockParseFunction, debugFunction, asyncOverviewFunction, getAsyncRequestFunction, processOverviewFunction].forEach(func => {
      cacheTable.grantReadWriteData(func);
      requestsTable.grantReadWriteData(func);
      apiKeysSecret.grantRead(func);
    });

    // Cache management functions only need cache table access
    [cacheClearFunction, cacheDeleteFunction, cacheStatsFunction].forEach(func => {
      cacheTable.grantReadWriteData(func);
    });

    cacheTable.grantReadData(healthCheckFunction);
    requestsTable.grantReadData(healthCheckFunction);

    // Additional IAM permissions for web scraping and external APIs
    [analysisFunction, discoveryFunction, chatFunction, processOverviewFunction].forEach(func => {
      func.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));
    });

    // Bedrock permissions for AI analysis - only for the configured model
    const bedrockModel = this.node.tryGetContext('bedrockModel');
    if (!bedrockModel) {
      throw new Error('bedrockModel context parameter is required');
    }
    
    [analysisFunction, discoveryFunction, chatFunction, bedrockParseFunction, asyncOverviewFunction, processOverviewFunction].forEach(func => {
      func.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
        resources: [`arn:aws:bedrock:*::foundation-model/${bedrockModel}`],
    }));
    });

    // Grant permission for async overview function to invoke processing function
    asyncOverviewFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'lambda:InvokeFunction',
      ],
      resources: [processOverviewFunction.functionArn],
    }));

    // Create REST API
    const api = new apigateway.RestApi(this, 'SalesIntelligenceApi', {
      restApiName: 'Sales Intelligence API',
      description: 'API for sales intelligence and company research',
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        allowCredentials: true,
      },
    });

    // Create API Key and Usage Plan
    const apiKey = api.addApiKey('SalesIntelligenceApiKey', {
      apiKeyName: 'sales-intelligence-key',
    });

    const usagePlan = api.addUsagePlan('SalesIntelligenceUsagePlan', {
      name: 'sales-intelligence-usage-plan',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // Company resource with domain parameter
    const companyResource = api.root.addResource('company');
    const domainResource = companyResource.addResource('{domain}');



    // /company/{domain}/search endpoint
    const searchResource = domainResource.addResource('search');
    const searchIntegration = new apigateway.LambdaIntegration(searchFunction);
    searchResource.addMethod('GET', searchIntegration, {
      apiKeyRequired: true,
    });

    // /company/{domain}/analysis endpoint
    const analysisResource = domainResource.addResource('analysis');
    const analysisIntegration = new apigateway.LambdaIntegration(analysisFunction);
    analysisResource.addMethod('POST', analysisIntegration, {
      apiKeyRequired: true,
    });

    // /company/{domain}/discovery endpoint
    const discoveryResource = domainResource.addResource('discovery');
    const discoveryIntegration = new apigateway.LambdaIntegration(discoveryFunction);
    discoveryResource.addMethod('GET', discoveryIntegration, {
      apiKeyRequired: true,
    });

    // /company/{domain}/overview-async endpoint
    const asyncOverviewResource = domainResource.addResource('overview-async');
    const asyncOverviewIntegration = new apigateway.LambdaIntegration(asyncOverviewFunction);
    asyncOverviewResource.addMethod('GET', asyncOverviewIntegration, {
      apiKeyRequired: true,
    });

    // /requests/{requestId} endpoint
    const requestsResource = api.root.addResource('requests');
    const requestIdResource = requestsResource.addResource('{requestId}');
    const getAsyncRequestIntegration = new apigateway.LambdaIntegration(getAsyncRequestFunction);
    requestIdResource.addMethod('GET', getAsyncRequestIntegration, {
      apiKeyRequired: true,
    });

    // Legacy /intelligence endpoint for backward compatibility
    const intelligenceResource = api.root.addResource('intelligence');
    const intelligenceIntegration = new apigateway.LambdaIntegration(analysisFunction);
    intelligenceResource.addMethod('POST', intelligenceIntegration, {
      apiKeyRequired: true,
    });

    // /health endpoint
    const healthResource = api.root.addResource('health');
    const healthIntegration = new apigateway.LambdaIntegration(healthCheckFunction);
    healthResource.addMethod('GET', healthIntegration);

    // /debug endpoint (for development/testing)
    const debugResource = api.root.addResource('debug');
    const debugIntegration = new apigateway.LambdaIntegration(debugFunction);
    debugResource.addMethod('GET', debugIntegration);

    // /chat endpoint
    const chatResource = api.root.addResource('chat');
    const chatIntegration = new apigateway.LambdaIntegration(chatFunction);
    chatResource.addMethod('POST', chatIntegration, {
      apiKeyRequired: true,
    });

    // /api/bedrock-parse endpoint
    const apiResource = api.root.addResource('api');
    const bedrockParseResource = apiResource.addResource('bedrock-parse');
    const bedrockParseIntegration = new apigateway.LambdaIntegration(bedrockParseFunction);
    bedrockParseResource.addMethod('POST', bedrockParseIntegration);

    // Cache management endpoints (for development)
    const cacheResource = api.root.addResource('cache');
    
    // /cache/clear endpoint (clear entire cache)
    const cacheClearResource = cacheResource.addResource('clear');
    const cacheClearIntegration = new apigateway.LambdaIntegration(cacheClearFunction);
    cacheClearResource.addMethod('POST', cacheClearIntegration, {
      apiKeyRequired: true,
    });

    // /cache/delete/{cacheKey} endpoint (delete specific cache entry)
    const cacheDeleteResource = cacheResource.addResource('delete');
    const cacheKeyResource = cacheDeleteResource.addResource('{cacheKey}');
    const cacheDeleteIntegration = new apigateway.LambdaIntegration(cacheDeleteFunction);
    cacheKeyResource.addMethod('DELETE', cacheDeleteIntegration, {
      apiKeyRequired: true,
    });

    // /cache/stats endpoint (get cache statistics)
    const cacheStatsResource = cacheResource.addResource('stats');
    const cacheStatsIntegration = new apigateway.LambdaIntegration(cacheStatsFunction);
    cacheStatsResource.addMethod('GET', cacheStatsIntegration, {
      apiKeyRequired: true,
    });

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'Sales Intelligence API endpoint',
      exportName: 'SalesIntelligenceApiEndpoint',
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID for Sales Intelligence platform',
      exportName: 'SalesIntelligenceApiKeyId',
    });

    new cdk.CfnOutput(this, 'CacheTableName', {
      value: cacheTable.tableName,
      description: 'DynamoDB cache table name',
      exportName: 'SalesIntelligenceCacheTableName',
    });

    new cdk.CfnOutput(this, 'RequestsTableName', {
      value: requestsTable.tableName,
      description: 'DynamoDB requests table name',
      exportName: 'SalesIntelligenceRequestsTableName',
    });

    new cdk.CfnOutput(this, 'ApiKeysSecretName', {
      value: apiKeysSecret.secretName,
      description: 'Secrets Manager secret name for API keys',
      exportName: 'SalesIntelligenceApiKeysSecretName',
    });

    new cdk.CfnOutput(this, 'SalesIntelligenceFunctionName', {
      value: asyncOverviewFunction.functionName,
      description: 'Main Sales Intelligence Lambda function name',
      exportName: 'SalesIntelligenceFunctionName',
    });
  }
} 