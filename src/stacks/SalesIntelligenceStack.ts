import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

// Import CDK constructs
import { CoreInfrastructureConstruct } from './constructs/infrastructure/CoreInfrastructureConstruct';
import { CoreLambdaConstruct } from './constructs/lambda/CoreLambdaConstruct';
import { ApiGatewayConstruct } from './constructs/api/ApiGatewayConstruct';
import { StepFunctionsConstruct } from './constructs/stepfunctions/StepFunctionsConstruct';

export class SalesIntelligenceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get configuration from context
    const allowedOrigins = this.node.tryGetContext('allowedOrigins') || [
      'https://d1uaf0b61i39e.cloudfront.net',
    ];
    const allowedOriginsString = allowedOrigins.join(',');
    const nodeEnv = this.node.tryGetContext('nodeEnv') || 'production';

    // 1. Core Infrastructure (DynamoDB, Secrets Manager)
    const infrastructure = new CoreInfrastructureConstruct(this, 'Infrastructure', {
      allowedOriginsString,
    });

    // 2. Core Lambda Functions
    const coreLambda = new CoreLambdaConstruct(this, 'CoreLambda', {
      cacheTable: infrastructure.cacheTable,
      requestsTable: infrastructure.requestsTable,
      profilesTable: infrastructure.profilesTable,
      apiKeysSecret: infrastructure.apiKeysSecret,
      allowedOriginsString,
      nodeEnv,
    });

    // 3. Step Functions Workflow
    const stepFunctions = new StepFunctionsConstruct(this, 'StepFunctions', {
      cacheTable: infrastructure.cacheTable,
      requestsTable: infrastructure.requestsTable,
      profilesTable: infrastructure.profilesTable,
      apiKeysSecret: infrastructure.apiKeysSecret,
      allowedOriginsString,
      nodeEnv,
    });

    // 4. Add Step Function ARN to Core Lambda functions that need it
    // (but not to the Step Function's own Lambda functions to avoid circular dependency)
    Object.values(coreLambda.functions).forEach(fn => {
      fn.addEnvironment('STEP_FUNCTION_ARN', stepFunctions.resources.stateMachine.stateMachineArn);
    });

    // 5. API Gateway
    const apiConstruct = new ApiGatewayConstruct(this, 'ApiGateway', {
      allowedOrigins,
      coreFunctions: coreLambda.functions,
    });

    // 6. Grant necessary permissions
    this.grantPermissions(infrastructure, coreLambda, stepFunctions);

    // Output important ARNs and URLs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: apiConstruct.api.url,
      description: 'Sales Intelligence API URL',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: apiConstruct.api.url,
      description: 'Sales Intelligence API Gateway endpoint URL',
      exportName: 'SalesIntelligence-ApiEndpoint'
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiConstruct.apiKey.keyId,
      description: 'API Key ID for external access',
    });

    new cdk.CfnOutput(this, 'ApiKeysSecretName', {
      value: infrastructure.apiKeysSecret.secretName,
      description: 'Secrets Manager secret name for API keys',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stepFunctions.resources.stateMachine.stateMachineArn,
      description: 'Step Functions State Machine ARN',
    });
  }

  private grantPermissions(
    infrastructure: CoreInfrastructureConstruct,
    coreLambda: CoreLambdaConstruct,
    stepFunctions: StepFunctionsConstruct
  ): void {
    // Grant Lambda functions access to DynamoDB tables
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.searchFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.chatFunction);
    infrastructure.requestsTable.grantReadWriteData(coreLambda.functions.searchFunction);
    infrastructure.profilesTable.grantReadWriteData(coreLambda.functions.profileFunction);

    // Grant Step Functions access to DynamoDB tables
    infrastructure.cacheTable.grantReadWriteData(stepFunctions.resources.cacheCheckFunction);
    infrastructure.cacheTable.grantReadWriteData(stepFunctions.resources.smartCollectionFunction);
    infrastructure.cacheTable.grantReadWriteData(stepFunctions.resources.llmAnalysisFunction);
    infrastructure.cacheTable.grantReadWriteData(stepFunctions.resources.cacheResponseFunction);

    // Grant Secrets Manager access
    infrastructure.apiKeysSecret.grantRead(coreLambda.functions.searchFunction);
    infrastructure.apiKeysSecret.grantRead(stepFunctions.resources.smartCollectionFunction);
    infrastructure.apiKeysSecret.grantRead(stepFunctions.resources.llmAnalysisFunction);

    // Grant Bedrock access to analysis functions
    coreLambda.functions.bedrockParseFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    stepFunctions.resources.llmAnalysisFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );
  }
} 