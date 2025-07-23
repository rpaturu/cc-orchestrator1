import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { SerpAPIService } from '../../SerpAPIService';
import { getCorsHeaders } from '../../../index';

/**
 * Multi-Source Data Collection Test Handler
 * POST /test/multisource
 */
export const multiSourceTestHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Multi-Source Test Lambda invoked', { requestId: context.awsRequestId });

    // Initialize required services
    const logger = new Logger();
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: false },
      logger
    );

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request body is required',
          requestId: context.awsRequestId,
        }),
      };
    }

    const request = JSON.parse(event.body);
    const { companyName } = request;

    if (!companyName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Company name is required',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize SerpAPIService and call multi-source collection
    const serpAPIService = new SerpAPIService(cacheService, logger);
    const result = await serpAPIService.getMultiSourceCompanyData(companyName);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        companyName,
        multiSourceData: result,
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Multi-Source Test Lambda error:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Enhanced Vendor Enrichment Handler - Integrates with Step Functions workflow
 */
export const enhancedVendorEnrichHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Enhanced vendor enrichment started');

  try {
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { companyName, strategy = 'enhanced' } = body;

    if (!companyName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'companyName is required',
          requestId: context.awsRequestId,
        }),
      };
    }

    console.log('Enhanced vendor enrichment request:', { companyName, strategy });

    if (strategy === 'enhanced') {
      // Import Step Functions client (this dependency was added to package.json)
      const stepFunctionsModule = await import('@aws-sdk/client-sfn');
      const { SFNClient, StartExecutionCommand } = stepFunctionsModule;
      
      const stepFunctions = new SFNClient({ region: process.env.AWS_REGION });
      
      const executionName = `enrichment-${context.awsRequestId}`;
      const input = JSON.stringify({
        companyName,
        requester: 'vendor_context',
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString()
      });

      const command = new StartExecutionCommand({
        stateMachineArn: process.env.STEP_FUNCTION_ARN!,
        name: executionName,
        input
      });

      const execution = await stepFunctions.send(command);
      
      console.log('Step Functions execution started:', execution.executionArn);

      return {
        statusCode: 202,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Enhanced enrichment started',
          executionArn: execution.executionArn,
          requestId: context.awsRequestId,
          company: companyName,
          strategy: 'step_functions_workflow'
        }),
      };
    } else {
      // Fallback to existing vendor enrichment using direct call
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Legacy vendor enrichment not implemented in enhanced handler',
          companyName,
          strategy: 'legacy_workflow',
          requestId: context.awsRequestId,
          note: 'Use the original /vendor/enrich endpoint for legacy workflow'
        }),
      };
    }

  } catch (error) {
    console.error('Enhanced vendor enrichment failed:', error);

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);
    
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
}; 