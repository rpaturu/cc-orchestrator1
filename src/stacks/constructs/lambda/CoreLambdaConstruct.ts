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
  apiKeysSecret: secretsmanager.Secret;
  allowedOriginsString: string;
  nodeEnv: string;
}

export interface CoreLambdaFunctions {
  // Core Application
  searchFunction: NodejsFunction;
  chatFunction: NodejsFunction;
  bedrockParseFunction: NodejsFunction;
  
  // Utility Functions
  healthFunction: NodejsFunction;
  debugFunction: NodejsFunction;
  profileFunction: NodejsFunction;
}

export class CoreLambdaConstruct extends Construct {
  public readonly functions: CoreLambdaFunctions;

  constructor(scope: Construct, id: string, props: CoreLambdaProps) {
    super(scope, id);

    const commonEnvironment = {
      CACHE_TABLE_NAME: props.cacheTable.tableName,
      REQUESTS_TABLE_NAME: props.requestsTable.tableName,
      PROFILES_TABLE_NAME: props.profilesTable.tableName,
      API_KEYS_SECRET_NAME: props.apiKeysSecret.secretName,
      BEDROCK_MODEL: scope.node.tryGetContext('bedrockModel') || 'anthropic.claude-3-haiku-20240307-v1:0',
      BEDROCK_MAX_TOKENS: scope.node.tryGetContext('bedrockMaxTokens') || '4000',
      BEDROCK_TEMPERATURE: scope.node.tryGetContext('bedrockTemperature') || '0.1',
      GOOGLE_SEARCH_API_KEY: scope.node.tryGetContext('googleSearchApiKey') || '',
      GOOGLE_SEARCH_ENGINE_ID: scope.node.tryGetContext('googleSearchEngineId') || '',
      SERPAPI_API_KEY: scope.node.tryGetContext('serpApiKey') || '',
      LOG_LEVEL: scope.node.tryGetContext('logLevel') || 'INFO',
      ALLOWED_ORIGINS: props.allowedOriginsString,
      NODE_ENV: props.nodeEnv
    };

    const bundlingConfig = {
      tsconfig: path.join(__dirname, '../../../../tsconfig.json'),
    };

    // Core Application Functions
    this.functions = {
      searchFunction: new NodejsFunction(this, 'SearchFunction', {
        functionName: 'sales-intelligence-search',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../../../services/handlers/lambda/CoreApplicationLambda.ts'),
        handler: 'searchHandler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: commonEnvironment,
        bundling: bundlingConfig,
      }),

      chatFunction: new NodejsFunction(this, 'ChatFunction', {
        functionName: 'sales-intelligence-chat',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../../../services/handlers/lambda/CoreApplicationLambda.ts'),
        handler: 'chatHandler',
        timeout: cdk.Duration.minutes(3),
        memorySize: 1024,
        environment: commonEnvironment,
        bundling: bundlingConfig,
      }),

      bedrockParseFunction: new NodejsFunction(this, 'BedrockParseFunction', {
        functionName: 'sales-intelligence-bedrock-parse',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../../../services/handlers/lambda/CoreApplicationLambda.ts'),
        handler: 'bedrockParseHandler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: commonEnvironment,
        bundling: bundlingConfig,
      }),

      // Utility Functions
      healthFunction: new NodejsFunction(this, 'HealthFunction', {
        functionName: 'sales-intelligence-health-check',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../../../services/handlers/lambda/UtilityLambda.ts'),
        handler: 'healthHandler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: commonEnvironment,
        bundling: bundlingConfig,
      }),

      debugFunction: new NodejsFunction(this, 'DebugFunction', {
        functionName: 'sales-intelligence-debug',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../../../services/handlers/lambda/UtilityLambda.ts'),
        handler: 'debugHandler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: commonEnvironment,
        bundling: bundlingConfig,
      }),

      profileFunction: new NodejsFunction(this, 'ProfileFunction', {
        functionName: 'sales-intelligence-profile',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../../../services/handlers/lambda/UtilityLambda.ts'),
        handler: 'profileHandler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: commonEnvironment,
        bundling: bundlingConfig,
      }),
    };
  }
} 