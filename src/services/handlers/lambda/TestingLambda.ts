import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getCorsHeaders } from '../../../index';

/**
 * Testing Lambda for Vendor Enrichment Step Functions Workflow
 * 
 * This lambda tests the existing Customer Intelligence Step Functions workflow
 * for vendor context enrichment. Research streaming testing is handled by
 * ResearchStreamingLambda via ./test-api option 6.
 */

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