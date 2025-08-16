import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration } from 'aws-cdk-lib';

export interface ApiGatewayProps {
  allowedOrigins: string[];
  coreFunctions: {
    searchFunction: NodejsFunction;
    chatFunction: NodejsFunction;
    bedrockParseFunction: NodejsFunction;
    vendorContextFunction: NodejsFunction;
    customerIntelligenceFunction: NodejsFunction;
    companyOverviewFunction: NodejsFunction;
    companyLookupFunction: NodejsFunction;
    cacheManagementFunction: NodejsFunction;
    cacheListByTypeFunction: NodejsFunction;
    cacheClearByTypeFunction: NodejsFunction;
    healthFunction: NodejsFunction;
    profileFunction: NodejsFunction;
    getAsyncRequestFunction: NodejsFunction;
    getWorkflowStatusFunction: NodejsFunction;
    researchStreamingFunction: NodejsFunction;
    researchHistoryFunction: NodejsFunction;
    sessionFunction: NodejsFunction;
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
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'x-user-id', 'X-Session-ID'],
        allowCredentials: true,
        maxAge: Duration.seconds(86400), // 24 hours
      },
    });

    // Create API integrations
    const searchIntegration = new apigateway.LambdaIntegration(props.coreFunctions.searchFunction);
    const chatIntegration = new apigateway.LambdaIntegration(props.coreFunctions.chatFunction);
    const bedrockParseIntegration = new apigateway.LambdaIntegration(props.coreFunctions.bedrockParseFunction);
    
    // Clean Context-Aware Integrations
    const vendorContextIntegration = new apigateway.LambdaIntegration(props.coreFunctions.vendorContextFunction);
    const customerIntelligenceIntegration = new apigateway.LambdaIntegration(props.coreFunctions.customerIntelligenceFunction);
    const companyOverviewIntegration = new apigateway.LambdaIntegration(props.coreFunctions.companyOverviewFunction);
    const companyLookupIntegration = new apigateway.LambdaIntegration(props.coreFunctions.companyLookupFunction);
    const cacheManagementIntegration = new apigateway.LambdaIntegration(props.coreFunctions.cacheManagementFunction);
    
    // Utility Integrations
    const healthIntegration = new apigateway.LambdaIntegration(props.coreFunctions.healthFunction);
    const profileIntegration = new apigateway.LambdaIntegration(props.coreFunctions.profileFunction);

    // Create API resources and routes
    
    // =================================================================
    // CLEAN CONTEXT-AWARE ENDPOINTS
    // =================================================================
    
    // Vendor Context - POST /vendor/context
    const vendorResource = this.api.root.addResource('vendor');
    vendorResource.addResource('context').addMethod('POST', vendorContextIntegration, {
      apiKeyRequired: true,
    });
    
    // Customer Intelligence - POST /customer/intelligence (Now ASYNC)
    const customerResource = this.api.root.addResource('customer');
    customerResource.addResource('intelligence').addMethod('POST', customerIntelligenceIntegration, {
      apiKeyRequired: true,
    });
    
    // =================================================================
    // INTERACTIVE WORKFLOW POLLING ENDPOINTS
    // =================================================================
    
    // DynamoDB-based request status (Company Overview)
    const requestsResource = this.api.root.addResource('requests');
    const requestIdResource = requestsResource.addResource('{requestId}');
    
    // GET /requests/{requestId}/status - DynamoDB request tracking (Company Overview)
    const requestStatusIntegration = new apigateway.LambdaIntegration(props.coreFunctions.getAsyncRequestFunction);
    requestIdResource.addResource('status').addMethod('GET', requestStatusIntegration, {
      apiKeyRequired: true,
    });
    
    // GET /requests/{requestId}/result - DynamoDB request results
    requestIdResource.addResource('result').addMethod('GET', requestStatusIntegration, {
      apiKeyRequired: true,
    });
    
    // Step Functions-based workflow status (Vendor Context & Customer Intelligence)
    const workflowsResource = this.api.root.addResource('workflows');
    const workflowIdResource = workflowsResource.addResource('{requestId}');
    
    // GET /workflows/{requestId}/status - Step Functions workflow tracking
    const workflowStatusIntegration = new apigateway.LambdaIntegration(props.coreFunctions.getWorkflowStatusFunction);
    workflowIdResource.addResource('status').addMethod('GET', workflowStatusIntegration, {
      apiKeyRequired: true,
    });
    
    // GET /workflows/{requestId}/result - Step Functions workflow results
    workflowIdResource.addResource('result').addMethod('GET', workflowStatusIntegration, {
      apiKeyRequired: true,
    });
    
    // Companies endpoints
    const companiesResource = this.api.root.addResource('companies');
    
    // GET /companies/lookup - dedicated company search/autocomplete
    companiesResource.addResource('lookup').addMethod('GET', companyLookupIntegration, {
      apiKeyRequired: true,
    });
    
    // Company Overview - POST /companies/{domain}/overview (ASYNC)
    const companiesDomainResource = companiesResource.addResource('{domain}');
    companiesDomainResource.addResource('overview').addMethod('POST', companyOverviewIntegration, {
      apiKeyRequired: true,
    });
    
    // Cache Management
    const cacheResource = this.api.root.addResource('cache');
    cacheResource.addMethod('DELETE', cacheManagementIntegration, { apiKeyRequired: true }); // Clear cache
    cacheResource.addResource('stats').addMethod('GET', cacheManagementIntegration, { apiKeyRequired: true }); // Cache stats
    
    // Cache Management by Type
    const cacheListByTypeIntegration = new apigateway.LambdaIntegration(props.coreFunctions.cacheListByTypeFunction);
    const cacheClearByTypeIntegration = new apigateway.LambdaIntegration(props.coreFunctions.cacheClearByTypeFunction);
    
    cacheResource.addResource('list').addMethod('GET', cacheListByTypeIntegration, { apiKeyRequired: true }); // List cache by type
    cacheResource.addResource('clear-type').addMethod('DELETE', cacheClearByTypeIntegration, { apiKeyRequired: true }); // Clear cache by type
    
    // =================================================================
    // LEGACY ENDPOINTS (for backward compatibility)
    // =================================================================
    
    // Create legacy company resource for backward compatibility
    const companyResource = this.api.root.addResource('company');
    
    // GET /company/{domain}/search (legacy)
    const companyDomainResource = companyResource.addResource('{domain}');
    companyDomainResource.addResource('search').addMethod('GET', searchIntegration, {
      apiKeyRequired: true,
    });

    // Health check (no API key required)
    this.api.root.addResource('health').addMethod('GET', healthIntegration);

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

    // Session Management endpoints
    const sessionIntegration = new apigateway.LambdaIntegration(props.coreFunctions.sessionFunction);
    const sessionResource = this.api.root.addResource('session');
    
    // POST /session - Create new session
    sessionResource.addMethod('POST', sessionIntegration, { apiKeyRequired: true });
    
    // DELETE /session/{sessionId} - Destroy session  
    const sessionIdResource = sessionResource.addResource('{sessionId}');
    sessionIdResource.addMethod('DELETE', sessionIntegration, { apiKeyRequired: true });
    sessionIdResource.addMethod('GET', sessionIntegration, { apiKeyRequired: true }); // Optional: Get session info

    // Research Streaming endpoints
    const researchResource = apiResource.addResource('research');
    const researchStreamingIntegration = new apigateway.LambdaIntegration(props.coreFunctions.researchStreamingFunction);
    
    // POST /api/research/stream - Initiate research session
    const researchStreamResource = researchResource.addResource('stream');
    researchStreamResource.addMethod('POST', researchStreamingIntegration, {
      apiKeyRequired: true,
    });
    
    // Research Streaming Events, Status, and Results endpoints
    const researchStreamIdResource = researchStreamResource.addResource('{researchSessionId}');
    
    // GET /api/research/stream/{researchSessionId}/events - SSE streaming
    researchStreamIdResource.addResource('events').addMethod('GET', researchStreamingIntegration, {
      apiKeyRequired: true,
    });
    
    // GET /api/research/stream/{researchSessionId}/status - Get research status
    researchStreamIdResource.addResource('status').addMethod('GET', researchStreamingIntegration, {
      apiKeyRequired: true,
    });
    
    // GET /api/research/stream/{researchSessionId}/result - Get research results
    researchStreamIdResource.addResource('result').addMethod('GET', researchStreamingIntegration, {
      apiKeyRequired: true,
    });

    // Research History endpoints (session-based structure)
    const researchHistoryResource = apiResource.addResource('research-history');
    const researchHistoryCompaniesResource = researchHistoryResource.addResource('companies');
    const researchHistoryCompanyResource = researchHistoryCompaniesResource.addResource('{companyName}');
    
    // Add GDPR right to erasure endpoint
    const researchHistoryAllDataResource = researchHistoryResource.addResource('all-data');

    // Research History Lambda integrations (CORS handled automatically)
    researchHistoryCompaniesResource.addMethod('GET', new apigateway.LambdaIntegration(props.coreFunctions.researchHistoryFunction), {
      apiKeyRequired: true,
    });
    researchHistoryCompanyResource.addMethod('GET', new apigateway.LambdaIntegration(props.coreFunctions.researchHistoryFunction), {
      apiKeyRequired: true,
    });
    researchHistoryCompanyResource.addMethod('PUT', new apigateway.LambdaIntegration(props.coreFunctions.researchHistoryFunction), {
      apiKeyRequired: true,
    });
    researchHistoryCompanyResource.addMethod('DELETE', new apigateway.LambdaIntegration(props.coreFunctions.researchHistoryFunction), {
      apiKeyRequired: true,
    });
    
    // GDPR right to erasure endpoint
    researchHistoryAllDataResource.addMethod('DELETE', new apigateway.LambdaIntegration(props.coreFunctions.researchHistoryFunction), {
      apiKeyRequired: true,
    });

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