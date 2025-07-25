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

    // 4. Add Step Function ARN only to Lambda functions that start step functions
    // (but not to the Step Function's own Lambda functions to avoid circular dependency)
    coreLambda.functions.vendorContextFunction.addEnvironment('STEP_FUNCTION_ARN', stepFunctions.resources.stateMachine.stateMachineArn);
    coreLambda.functions.customerIntelligenceFunction.addEnvironment('STEP_FUNCTION_ARN', stepFunctions.resources.stateMachine.stateMachineArn);

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
    
    // Legacy Core Functions
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.searchFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.chatFunction);
    infrastructure.requestsTable.grantReadWriteData(coreLambda.functions.searchFunction);
    infrastructure.profilesTable.grantReadWriteData(coreLambda.functions.profileFunction);

    // Clean Context-Aware Functions - DynamoDB Permissions
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.vendorContextFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.customerIntelligenceFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.companyOverviewFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.companyLookupFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.cacheManagementFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.cacheListByTypeFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.cacheClearByTypeFunction);
    
    infrastructure.requestsTable.grantReadWriteData(coreLambda.functions.customerIntelligenceFunction);
    infrastructure.requestsTable.grantReadWriteData(coreLambda.functions.companyOverviewFunction);
    
    // Grant async request handler access to requests table for status polling
    infrastructure.requestsTable.grantReadWriteData(coreLambda.functions.getAsyncRequestFunction);
    
    // Grant processing functions access to DynamoDB tables
    infrastructure.requestsTable.grantReadWriteData(coreLambda.functions.processOverviewFunction);
    infrastructure.requestsTable.grantReadWriteData(coreLambda.functions.processDiscoveryFunction);
    infrastructure.requestsTable.grantReadWriteData(coreLambda.functions.processAnalysisFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.processOverviewFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.processDiscoveryFunction);
    infrastructure.cacheTable.grantReadWriteData(coreLambda.functions.processAnalysisFunction);
    
    // Grant lambda invocation permissions for async processing
    coreLambda.functions.processOverviewFunction.grantInvoke(coreLambda.functions.companyOverviewFunction);
    coreLambda.functions.processDiscoveryFunction.grantInvoke(coreLambda.functions.companyOverviewFunction);
    coreLambda.functions.processAnalysisFunction.grantInvoke(coreLambda.functions.companyOverviewFunction);
    
    // Grant Bedrock permissions for processing functions
    coreLambda.functions.processOverviewFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    coreLambda.functions.processDiscoveryFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    coreLambda.functions.processAnalysisFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // Grant Step Functions access to DynamoDB tables
    infrastructure.cacheTable.grantReadWriteData(stepFunctions.resources.cacheCheckFunction);
    infrastructure.cacheTable.grantReadWriteData(stepFunctions.resources.smartCollectionFunction);
    infrastructure.cacheTable.grantReadWriteData(stepFunctions.resources.llmAnalysisFunction);
    infrastructure.cacheTable.grantReadWriteData(stepFunctions.resources.cacheResponseFunction);
    
    // Grant Step Functions execution permissions to context-aware lambdas
    stepFunctions.resources.stateMachine.grantStartExecution(coreLambda.functions.vendorContextFunction);
    stepFunctions.resources.stateMachine.grantStartExecution(coreLambda.functions.customerIntelligenceFunction);

    // Grant Secrets Manager access
    
    // Legacy Functions
    infrastructure.apiKeysSecret.grantRead(coreLambda.functions.searchFunction);
    
    // Clean Context-Aware Functions - Secrets Manager Access
    infrastructure.apiKeysSecret.grantRead(coreLambda.functions.vendorContextFunction);
    infrastructure.apiKeysSecret.grantRead(coreLambda.functions.customerIntelligenceFunction);
    infrastructure.apiKeysSecret.grantRead(coreLambda.functions.companyOverviewFunction);
    infrastructure.apiKeysSecret.grantRead(coreLambda.functions.companyLookupFunction);
    
    // Step Functions
    infrastructure.apiKeysSecret.grantRead(stepFunctions.resources.smartCollectionFunction);
    infrastructure.apiKeysSecret.grantRead(stepFunctions.resources.llmAnalysisFunction);

    // Grant Bedrock access to analysis functions
    
    // Legacy Functions
    coreLambda.functions.bedrockParseFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // Clean Context-Aware Functions - Bedrock Access
    coreLambda.functions.vendorContextFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    coreLambda.functions.customerIntelligenceFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    coreLambda.functions.companyOverviewFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // Step Functions
    stepFunctions.resources.llmAnalysisFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // Smart Collection Function - Bedrock Access (for auto-trigger vendor context analysis)
    stepFunctions.resources.smartCollectionFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // Workflow Status Function - Step Functions Access
    coreLambda.functions.getWorkflowStatusFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'states:DescribeExecution',
          'states:GetExecutionHistory'  // ✅ Added for progress tracking
        ],
        resources: [
          `arn:aws:states:${this.region}:${this.account}:execution:sales-intelligence-enrichment:*`
        ],
      })
    );
  }
} 