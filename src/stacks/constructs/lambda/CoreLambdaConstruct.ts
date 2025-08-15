import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export interface CoreLambdaProps {
  cacheTable: dynamodb.Table;
  requestsTable: dynamodb.Table;
  profilesTable: dynamodb.Table;
  researchHistoryTable: dynamodb.Table;
  apiKeysSecret: secretsmanager.Secret;
  allowedOriginsString: string;
  nodeEnv: string;
  stepFunctionArn?: string; // Optional - can be set after Step Functions are created
}

export interface CoreLambdaFunctions {
  // Core Application
  searchFunction: NodejsFunction;
  chatFunction: NodejsFunction;
  bedrockParseFunction: NodejsFunction;
  
  // Clean Context-Aware Endpoints
  vendorContextFunction: NodejsFunction;
  customerIntelligenceFunction: NodejsFunction;
  companyOverviewFunction: NodejsFunction;
  companyLookupFunction: NodejsFunction;
  cacheManagementFunction: NodejsFunction;
  cacheListByTypeFunction: NodejsFunction;
  cacheClearByTypeFunction: NodejsFunction;
  
  // Utility Functions
  healthFunction: NodejsFunction;
  profileFunction: NodejsFunction;
  getAsyncRequestFunction: NodejsFunction; // DynamoDB-based requests (Company Overview)
  getWorkflowStatusFunction: NodejsFunction; // Step Functions-based workflows (Vendor/Customer)
  
  // Background Processing Functions
  processOverviewFunction: NodejsFunction;
  processDiscoveryFunction: NodejsFunction;
  processAnalysisFunction: NodejsFunction;
  
  // Research Functions
  researchStreamingFunction: NodejsFunction;
  researchHistoryFunction: NodejsFunction;
}

export class CoreLambdaConstruct extends Construct {
  public readonly functions: CoreLambdaFunctions;

  constructor(scope: Construct, id: string, props: CoreLambdaProps) {
    super(scope, id);

    // Initialize the functions object
    this.functions = {} as CoreLambdaFunctions;

    const commonEnvironment = {
      CACHE_TABLE_NAME: props.cacheTable.tableName,
      REQUESTS_TABLE_NAME: props.requestsTable.tableName,
      PROFILES_TABLE_NAME: props.profilesTable.tableName,
      RESEARCH_HISTORY_TABLE_NAME: props.researchHistoryTable.tableName,
      API_KEYS_SECRET_NAME: props.apiKeysSecret.secretName,
      BEDROCK_MODEL: scope.node.tryGetContext('bedrockModel')!,
      BEDROCK_MAX_TOKENS: scope.node.tryGetContext('bedrockMaxTokens')!,
      BEDROCK_TEMPERATURE: scope.node.tryGetContext('bedrockTemperature')!,
      GOOGLE_SEARCH_API_KEY: scope.node.tryGetContext('googleSearchApiKey') || '',
      GOOGLE_SEARCH_ENGINE_ID: scope.node.tryGetContext('googleSearchEngineId') || '',
      SERPAPI_API_KEY: scope.node.tryGetContext('serpApiKey') || '',
      SNOV_API_KEY: scope.node.tryGetContext('snovApiKey') || '',
      SNOV_API_SECRET: scope.node.tryGetContext('snovApiSecret') || '',
      BRIGHTDATA_API_KEY: scope.node.tryGetContext('brightDataApiKey') || '',
      LOG_LEVEL: scope.node.tryGetContext('logLevel') || 'INFO',
      ALLOWED_ORIGINS: props.allowedOriginsString,
      NODE_ENV: props.nodeEnv
    };

    const bundlingConfig = {
      tsconfig: path.join(__dirname, '../../../../tsconfig.json'),
    };

    // Core endpoint Lambda functions
    this.functions.searchFunction = new NodejsFunction(this, 'SearchFunction', {
      functionName: 'sales-intelligence-search',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/CoreApplicationLambda.ts'),
      handler: 'searchHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.chatFunction = new NodejsFunction(this, 'ChatFunction', {
      functionName: 'sales-intelligence-chat',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/CoreApplicationLambda.ts'),
      handler: 'chatHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.bedrockParseFunction = new NodejsFunction(this, 'BedrockParseFunction', {
      functionName: 'sales-intelligence-bedrock-parse',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/CoreApplicationLambda.ts'),
      handler: 'bedrockParseHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    // Clean Context-Aware Lambda functions
    this.functions.vendorContextFunction = new NodejsFunction(this, 'VendorContextFunction', {
      functionName: 'sales-intelligence-vendor-context',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/VendorContextLambda.ts'),
      handler: 'vendorContextHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ...commonEnvironment,
        STEP_FUNCTION_ARN: 'placeholder', // Will be updated with real ARN after step functions are created
      },
      bundling: bundlingConfig,
    });

    this.functions.customerIntelligenceFunction = new NodejsFunction(this, 'CustomerIntelligenceFunction', {
      functionName: 'sales-intelligence-customer-intelligence',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/CustomerIntelligenceLambda.ts'),
      handler: 'customerIntelligenceHandler',
      timeout: cdk.Duration.seconds(30), // Quick start for async workflow
      memorySize: 512,
      environment: {
        ...commonEnvironment,
        STEP_FUNCTION_ARN: 'placeholder', // Will be updated with real ARN after step functions are created
      },
      bundling: bundlingConfig,
    });

    this.functions.companyOverviewFunction = new NodejsFunction(this, 'CompanyOverviewFunction', {
      functionName: 'sales-intelligence-company-overview',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/AsyncProcessingLambda.ts'),
      handler: 'companyOverviewAsyncHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.companyLookupFunction = new NodejsFunction(this, 'CompanyLookupFunction', {
      functionName: 'sales-intelligence-company-lookup',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/CompanyLookupLambda.ts'),
      handler: 'companyLookupHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.cacheManagementFunction = new NodejsFunction(this, 'CacheManagementFunction', {
      functionName: 'sales-intelligence-cache-management',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/CacheManagementLambda.ts'),
      handler: 'cacheHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.cacheListByTypeFunction = new NodejsFunction(this, 'CacheListByTypeFunction', {
      functionName: 'sales-intelligence-cache-list-by-type',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/CacheManagementLambda.ts'),
      handler: 'cacheListByTypeHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.cacheClearByTypeFunction = new NodejsFunction(this, 'CacheClearByTypeFunction', {
      functionName: 'sales-intelligence-cache-clear-by-type',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/CacheManagementLambda.ts'),
      handler: 'cacheClearByTypeHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    // Interactive workflow polling functions
    this.functions.getAsyncRequestFunction = new NodejsFunction(this, 'GetAsyncRequestFunction', {
      functionName: 'sales-intelligence-get-async-request',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/AsyncProcessingLambda.ts'),
      handler: 'getAsyncRequestHandler', // DynamoDB-based request status handler (Company Overview)
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.getWorkflowStatusFunction = new NodejsFunction(this, 'GetWorkflowStatusFunction', {
      functionName: 'sales-intelligence-get-workflow-status',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/AsyncProcessingLambda.ts'),
      handler: 'getWorkflowStatusHandler', // Step Functions-based workflow status handler
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        ...commonEnvironment,
        AWS_ACCOUNT_ID: cdk.Aws.ACCOUNT_ID, // Needed for step function ARN construction
      },
      bundling: bundlingConfig,
    });

    // Utility functions
    this.functions.healthFunction = new NodejsFunction(this, 'HealthFunction', {
      functionName: 'sales-intelligence-health',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/UtilityLambda.ts'),
      handler: 'healthHandler',
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.profileFunction = new NodejsFunction(this, 'ProfileFunction', {
      functionName: 'sales-intelligence-profile',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/ProfileLambda.ts'),
      handler: 'profileHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    // Background Processing Functions
    this.functions.processOverviewFunction = new NodejsFunction(this, 'ProcessOverviewFunction', {
      functionName: 'sales-intelligence-process-overview',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/AsyncProcessingLambda.ts'),
      handler: 'processOverviewHandler',
      timeout: cdk.Duration.minutes(5), // Longer timeout for processing
      memorySize: 1024, // More memory for processing
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.processDiscoveryFunction = new NodejsFunction(this, 'ProcessDiscoveryFunction', {
      functionName: 'sales-intelligence-process-discovery',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/AsyncProcessingLambda.ts'),
      handler: 'processDiscoveryHandler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    this.functions.processAnalysisFunction = new NodejsFunction(this, 'ProcessAnalysisFunction', {
      functionName: 'sales-intelligence-process-analysis',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/AsyncProcessingLambda.ts'),
      handler: 'processAnalysisHandler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    // Research Streaming Function
    this.functions.researchStreamingFunction = new NodejsFunction(this, 'ResearchStreamingFunction', {
      functionName: 'sales-intelligence-research-streaming',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/ResearchStreamingLambda.ts'),
      handler: 'researchStreamingHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    // Research History Function
    this.functions.researchHistoryFunction = new NodejsFunction(this, 'ResearchHistoryFunction', {
      functionName: 'sales-intelligence-research-history',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/lambda/ResearchHistoryLambda.ts'),
      handler: 'researchHistoryHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    // Grant DynamoDB permissions to research streaming function
    props.cacheTable.grantReadWriteData(this.functions.researchStreamingFunction);
  }
} 