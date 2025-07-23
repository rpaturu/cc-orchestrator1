import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export interface StepFunctionsProps {
  cacheTable: dynamodb.Table;
  requestsTable: dynamodb.Table;
  profilesTable: dynamodb.Table;
  apiKeysSecret: secretsmanager.Secret;
  allowedOriginsString: string;
  nodeEnv: string;
}

export interface StepFunctionResources {
  cacheCheckFunction: NodejsFunction;
  smartCollectionFunction: NodejsFunction;
  llmAnalysisFunction: NodejsFunction;
  cacheResponseFunction: NodejsFunction;
  stateMachine: stepfunctions.StateMachine;
}

export class StepFunctionsConstruct extends Construct {
  public readonly resources: StepFunctionResources;

  constructor(scope: Construct, id: string, props: StepFunctionsProps) {
    super(scope, id);

    const commonEnvironment = {
      CACHE_TABLE_NAME: props.cacheTable.tableName,
      REQUESTS_TABLE_NAME: props.requestsTable.tableName,
      PROFILES_TABLE_NAME: props.profilesTable.tableName,
      API_KEYS_SECRET_NAME: props.apiKeysSecret.secretName,
      BEDROCK_MODEL_ID: scope.node.tryGetContext('bedrockModel') || 'anthropic.claude-3-haiku-20240307-v1:0',
      BEDROCK_MAX_TOKENS: scope.node.tryGetContext('bedrockMaxTokens') || '4000',
      BEDROCK_TEMPERATURE: scope.node.tryGetContext('bedrockTemperature') || '0.1',
      SERPAPI_API_KEY: scope.node.tryGetContext('serpApiKey') || '',
      LOG_LEVEL: scope.node.tryGetContext('logLevel') || 'INFO',
      ALLOWED_ORIGINS: props.allowedOriginsString,
      NODE_ENV: props.nodeEnv,
    };

    const bundlingConfig = {
      tsconfig: path.join(__dirname, '../../../../tsconfig.json'),
    };

    // Step Functions Lambda handlers
    const cacheCheckFunction = new NodejsFunction(this, 'CacheCheckFunction', {
      functionName: 'sales-intelligence-cache-check',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/stepfunctions/CacheCheckHandler.ts'),
      handler: 'cacheCheckHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    const smartCollectionFunction = new NodejsFunction(this, 'SmartCollectionFunction', {
      functionName: 'sales-intelligence-smart-collection',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/stepfunctions/SmartCollectionHandler.ts'),
      handler: 'smartDataCollectionHandler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    const llmAnalysisFunction = new NodejsFunction(this, 'LLMAnalysisFunction', {
      functionName: 'sales-intelligence-llm-analysis',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/stepfunctions/LLMAnalysisHandler.ts'),
      handler: 'llmAnalysisHandler',
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    const cacheResponseFunction = new NodejsFunction(this, 'CacheResponseFunction', {
      functionName: 'sales-intelligence-cache-response',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../services/handlers/stepfunctions/CacheResponseHandler.ts'),
      handler: 'cacheResponseHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: bundlingConfig,
    });

    // Create Step Functions tasks
    const cacheCheckTask = new stepfunctionsTasks.LambdaInvoke(this, 'CacheCheckTask', {
      lambdaFunction: cacheCheckFunction,
      outputPath: '$.Payload',
    });

    const smartCollectionTask = new stepfunctionsTasks.LambdaInvoke(this, 'SmartCollectionTask', {
      lambdaFunction: smartCollectionFunction,
      outputPath: '$.Payload',
    });

    const llmAnalysisTask = new stepfunctionsTasks.LambdaInvoke(this, 'LLMAnalysisTask', {
      lambdaFunction: llmAnalysisFunction,
      inputPath: '$.collectionResult',
      outputPath: '$.Payload',
    });

    const cacheResponseTask = new stepfunctionsTasks.LambdaInvoke(this, 'CacheResponseTask', {
      lambdaFunction: cacheResponseFunction,
      payload: stepfunctions.TaskInput.fromObject({
        'companyName.$': '$.companyName',
        'requester.$': '$.requester',
        'analysis.$': '$.analysis',
        'requestId.$': '$.requestId'
      }),
      outputPath: '$.Payload',
    });

    // Define Step Functions workflow
    const cacheHitChoice = new stepfunctions.Choice(this, 'CacheHitChoice')
      .when(stepfunctions.Condition.booleanEquals('$.hit', true), 
        new stepfunctions.Pass(this, 'ReturnCachedResult', {
          result: stepfunctions.Result.fromObject({ source: 'cache' }),
          outputPath: '$.data'
        })
      )
      .otherwise(
        smartCollectionTask
          .next(llmAnalysisTask
            .next(cacheResponseTask)
          )
      );

    const definition = cacheCheckTask.next(cacheHitChoice);

    // Create State Machine
    const stateMachine = new stepfunctions.StateMachine(this, 'EnrichmentStateMachine', {
      definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(15),
      stateMachineName: 'sales-intelligence-enrichment',
    });

    this.resources = {
      cacheCheckFunction,
      smartCollectionFunction,
      llmAnalysisFunction,
      cacheResponseFunction,
      stateMachine,
    };
  }
} 