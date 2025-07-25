import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { getCorsHeaders } from '../../../index';

/**
 * Async Vendor Context Lambda - Starts Step Function workflow
 * POST /vendor/context
 * CRITICAL: Checks cache first to avoid unnecessary step function executions
 */
export const vendorContextHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('VendorContextAsync');
  
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

    // Handle both GET and POST requests
    let companyName: string;
    let refresh = false;

    if (event.httpMethod === 'GET') {
      companyName = event.queryStringParameters?.companyName || '';
      refresh = event.queryStringParameters?.refresh === 'true';
    } else if (event.httpMethod === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Request body is required for POST',
            requestId: context.awsRequestId,
          }),
        };
      }
      const body = JSON.parse(event.body);
      companyName = body.companyName || '';
      refresh = body.refresh || false;
    } else {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Method not allowed. Use GET or POST.',
          requestId: context.awsRequestId,
        }),
      };
    }
    
    if (!companyName || companyName.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'companyName is required',
          requestId: context.awsRequestId,
        }),
      };
    }

    logger.info('Starting vendor context workflow with cache check', { 
      companyName: companyName.trim(),
      refresh
    });

    // CRITICAL: Check cache first to avoid unnecessary step function costs
    if (!refresh) {
      const cacheService = new CacheService(
        { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
        logger,
        process.env.AWS_REGION
      );

      // PRIORITY 1: Check for rich analysis cache first (contains the actual intelligence)
      const analysisKey = `vendor_context_analysis:${companyName.trim()}:vendor_context`;
      const richAnalysis = await cacheService.getRawJSON(analysisKey);

      if (richAnalysis) {
        logger.info('Vendor context rich analysis cache hit - returning analysis data', { 
          companyName: companyName.trim(),
          cacheKey: analysisKey 
        });

        // Return the rich analysis data directly
        const workflowData = {
          companyName: companyName.trim(),
          requester: 'vendor_context',
          workflowType: 'vendor_context',
          rawData: {},
          analysis: richAnalysis,  // ✅ Direct rich analysis data
          metrics: {
            totalCost: 0,
            cacheHits: 1,
            cacheSavings: 1.50,
            llmCost: 0,
            datasetsCollected: Object.keys(richAnalysis).length
          },
          generatedAt: richAnalysis.last_updated || new Date().toISOString(),
          requestId: context.awsRequestId,
          workflowMetadata: {
            type: 'vendor_context',
            datasetsCollected: ['analysis_cache'],
            processedAt: richAnalysis.last_updated || new Date().toISOString()
          }
        };

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            message: 'Vendor context retrieved from analysis cache',
            requestId: context.awsRequestId,
            companyName: companyName.trim(),
            status: 'completed',
            source: 'analysis_cache',
            data: workflowData,
            cached: true,
            generatedAt: richAnalysis.last_updated || new Date().toISOString(),
            metrics: {
              totalCost: 0,
              cacheSavings: 1.50,
              cacheHit: true
            }
          }),
        };
      }

      // PRIORITY 2: Check for cached enriched vendor profile (workflow envelope)
      const cacheKey = `enriched_vendor_profile:${companyName.toLowerCase().replace(/\s+/g, '_')}:vendor_context`;
      const cachedResult = await cacheService.getRawJSON(cacheKey);

      if (cachedResult) {
        logger.info('Vendor context cache hit - returning cached result', { 
          companyName: companyName.trim(),
          cacheKey 
        });

        // Extract the analysis data from the cached workflow envelope
        const analysisData = cachedResult.analysis || cachedResult;
        const workflowData = {
          companyName: cachedResult.companyName || companyName.trim(),
          requester: cachedResult.requester || 'vendor_context',
          workflowType: cachedResult.workflowType || 'vendor_context',
          rawData: cachedResult.rawData || {},
          analysis: analysisData,  // ✅ Extract the rich analysis data
          metrics: cachedResult.metrics || {
            totalCost: 0,
            cacheHits: 1,
            cacheSavings: 1.50,
            llmCost: 0,
            datasetsCollected: 0
          },
          generatedAt: cachedResult.generatedAt || new Date().toISOString(),
          requestId: cachedResult.requestId || context.awsRequestId,
          workflowMetadata: cachedResult.workflowMetadata || {
            type: 'vendor_context',
            datasetsCollected: [],
            processedAt: cachedResult.generatedAt || new Date().toISOString()
          }
        };

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            message: 'Vendor context retrieved from cache',
            requestId: context.awsRequestId,
            companyName: companyName.trim(),
            status: 'completed',
            source: 'cache',
            data: workflowData,  // ✅ Properly structured data with analysis
            cached: true,
            generatedAt: cachedResult.generatedAt || new Date().toISOString(),
            // Show cost savings from cache hit
            metrics: {
              totalCost: 0,
              cacheSavings: cachedResult.metrics?.totalCost || 1.50, // Estimated step function cost
              cacheHit: true
            }
          }),
        };
      }

      logger.info('Vendor context cache miss (both analysis and workflow layers) - proceeding with step function', { 
        companyName: companyName.trim(),
        analysisKey,
        workflowKey: cacheKey 
      });
    } else {
      logger.info('Vendor context refresh requested - bypassing cache', { 
        companyName: companyName.trim()
      });
    }

    // Initialize Step Functions client
    const stepFunctions = new SFNClient({ region: process.env.AWS_REGION });
    
    const executionName = `vendor-context-${context.awsRequestId}`;
    const input = JSON.stringify({
      companyName: companyName.trim(),
      requester: 'vendor_context',
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString(),
      // Vendor context specific workflow parameters
      workflowType: 'vendor_context',
      interactionMode: 'comprehensive', // vs 'quick_scan'
      refresh: refresh
    });

    const command = new StartExecutionCommand({
      stateMachineArn: process.env.STEP_FUNCTION_ARN!,
      name: executionName,
      input
    });

    const execution = await stepFunctions.send(command);
    
    logger.info('Vendor context step function started after cache miss', {
      executionArn: execution.executionArn,
      companyName: companyName.trim()
    });

    // Return immediately with execution details for frontend polling
    return {
      statusCode: 202, // Accepted - processing started
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Vendor context analysis started',
        requestId: context.awsRequestId,
        executionArn: execution.executionArn,
        companyName: companyName.trim(),
        status: 'processing',
        estimatedTimeMinutes: 2,
        source: 'step_function',
        // Provide polling endpoints for interactive frontend
        statusEndpoint: `/workflows/${context.awsRequestId}/status`,
        progressEndpoint: `/workflows/${context.awsRequestId}/progress`,
        resultEndpoint: `/workflows/${context.awsRequestId}/result`,
        // Interactive workflow support for vendor context
        workflow: {
          type: 'vendor_context',
          steps: [
            { name: 'cache_check', status: 'pending', description: 'Checking existing vendor data' },
            { name: 'data_collection', status: 'pending', description: 'Gathering vendor intelligence' },
            { name: 'llm_analysis', status: 'pending', description: 'AI-powered vendor analysis' },
            { name: 'finalization', status: 'pending', description: 'Structuring vendor context' }
          ]
        }
      }),
    };

  } catch (error) {
    logger.error('Vendor context workflow failed', { error });
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