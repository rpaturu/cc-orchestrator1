import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface ApiGatewayProps {
  allowedOrigins: string[];
  coreFunctions: {
    searchFunction: NodejsFunction;
    chatFunction: NodejsFunction;
    bedrockParseFunction: NodejsFunction;
    healthFunction: NodejsFunction;
    debugFunction: NodejsFunction;
    profileFunction: NodejsFunction;
  };
  // Will add other function groups as we create more constructs
}

export class ApiGatewayConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly apiKey: apigateway.IApiKey;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    // Create REST API
    this.api = new apigateway.RestApi(this, 'SalesIntelligenceApi', {
      restApiName: 'Sales Intelligence API',
      description: 'API for sales intelligence and company research',
      defaultCorsPreflightOptions: {
        allowOrigins: props.allowedOrigins,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      },
    });

    // Create API integrations
    const searchIntegration = new apigateway.LambdaIntegration(props.coreFunctions.searchFunction);
    const chatIntegration = new apigateway.LambdaIntegration(props.coreFunctions.chatFunction);
    const bedrockParseIntegration = new apigateway.LambdaIntegration(props.coreFunctions.bedrockParseFunction);
    const healthIntegration = new apigateway.LambdaIntegration(props.coreFunctions.healthFunction);
    const debugIntegration = new apigateway.LambdaIntegration(props.coreFunctions.debugFunction);
    const profileIntegration = new apigateway.LambdaIntegration(props.coreFunctions.profileFunction);

    // Create API resources and routes
    
    // Company routes
    const companyResource = this.api.root.addResource('company');
    const companyDomainResource = companyResource.addResource('{domain}');
    
    // GET /company/{domain}/search
    companyDomainResource.addResource('search').addMethod('GET', searchIntegration, {
      apiKeyRequired: true,
    });

    // Health check (no API key required)
    this.api.root.addResource('health').addMethod('GET', healthIntegration);

    // Debug endpoint
    this.api.root.addResource('debug').addMethod('GET', debugIntegration, {
      apiKeyRequired: true,
    });

    // Chat endpoint
    this.api.root.addResource('chat').addMethod('POST', chatIntegration, {
      apiKeyRequired: true,
    });

    // Bedrock parse endpoint
    const apiResource = this.api.root.addResource('api');
    apiResource.addResource('bedrock-parse').addMethod('POST', bedrockParseIntegration, {
      apiKeyRequired: true,
    });

    // Profile endpoints
    const profileResource = this.api.root.addResource('profile');
    const userProfileResource = profileResource.addResource('{userId}');
    userProfileResource.addMethod('GET', profileIntegration, { apiKeyRequired: true });
    userProfileResource.addMethod('PUT', profileIntegration, { apiKeyRequired: true });
    userProfileResource.addMethod('DELETE', profileIntegration, { apiKeyRequired: true });

    // Create API key for external access
    this.apiKey = this.api.addApiKey('SalesIntelligenceApiKey', {
      apiKeyName: 'sales-intelligence-api-key',
    });

    // Create usage plan
    const usagePlan = this.api.addUsagePlan('SalesIntelligenceUsagePlan', {
      name: 'Sales Intelligence Usage Plan',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiKey(this.apiKey);
    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // Output API information
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'Sales Intelligence API endpoint',
    });

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: this.apiKey.keyId,
      description: 'API Key ID for external access',
    });
  }
} 