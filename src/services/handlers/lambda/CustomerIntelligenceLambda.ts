import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { getCorsHeaders } from '../../../index';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';

/**
 * Async Customer Intelligence Lambda - Starts Step Function workflow
 * POST /customer/intelligence
 * CRITICAL: Checks cache first to avoid unnecessary step function executions
 */
export const customerIntelligenceHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('CustomerIntelligenceAsync');
  
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

    const { prospectCompany, vendorCompany, userPersona, refresh } = JSON.parse(event.body);

    if (!prospectCompany || !vendorCompany) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'prospectCompany and vendorCompany are required',
          requestId: context.awsRequestId,
        }),
      };
    }

    logger.info('Starting customer intelligence workflow with cache check', { 
      prospectCompany, 
      vendorCompany,
      userPersona: userPersona?.role || 'unknown',
      refresh: refresh || false
    });

    // CRITICAL: Check cache first to avoid unnecessary step function costs
    if (!refresh) {
      const cacheService = new CacheService(
        { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
        logger,
        process.env.AWS_REGION
      );

      // PRIORITY 1: Check for rich customer intelligence analysis cache first
      const analysisKey = `customer_intelligence_analysis:${prospectCompany.trim()}:${vendorCompany.trim()}:${userPersona?.role || 'unknown'}:customer_intelligence`;
      const richAnalysis = await cacheService.getRawJSON(analysisKey);

      if (richAnalysis) {
        logger.info('Customer intelligence rich analysis cache hit - returning analysis data', { 
          prospectCompany,
          vendorCompany,
          userPersona: userPersona?.role,
          cacheKey: analysisKey 
        });

        // Return the rich analysis data directly
        const workflowData = {
          companyName: prospectCompany.trim(),
          vendorCompany: vendorCompany.trim(),
          requester: 'customer_intelligence',
          workflowType: 'customer_intelligence',
          rawData: {},
          analysis: richAnalysis,  // ✅ Direct rich analysis data
          metrics: {
            totalCost: 0,
            cacheHits: 1,
            cacheSavings: 2.50,
            llmCost: 0,
            datasetsCollected: Object.keys(richAnalysis).length
          },
          generatedAt: richAnalysis.last_updated || new Date().toISOString(),
          requestId: context.awsRequestId,
          workflowMetadata: {
            type: 'customer_intelligence',
            userPersona: userPersona,
            datasetsCollected: ['analysis_cache'],
            processedAt: richAnalysis.last_updated || new Date().toISOString()
          }
        };

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            message: 'Customer intelligence retrieved from analysis cache',
            requestId: context.awsRequestId,
            prospectCompany,
            vendorCompany,
            userPersona,
            status: 'completed',
            source: 'analysis_cache',
            data: workflowData,
            cached: true,
            generatedAt: richAnalysis.last_updated || new Date().toISOString(),
            metrics: {
              totalCost: 0,
              cacheSavings: 2.50,
              cacheHit: true
            }
          }),
        };
      }

      // PRIORITY 2: Check for cached enriched customer intelligence (persona + customer + vendor specific)
      const cacheKey = `enriched_customer_profile:${prospectCompany.toLowerCase().replace(/\s+/g, '_')}:${vendorCompany.toLowerCase().replace(/\s+/g, '_')}:customer_intelligence`;
      const cachedResult = await cacheService.getRawJSON(cacheKey);

      if (cachedResult) {
        logger.info('Customer intelligence cache hit - returning cached result', { 
          prospectCompany,
          vendorCompany,
          userPersona: userPersona?.role,
          cacheKey 
        });

        // Extract the analysis data from the cached workflow envelope
        const analysisData = cachedResult.analysis || cachedResult;
        const workflowData = {
          companyName: cachedResult.companyName || prospectCompany,
          vendorCompany: cachedResult.vendorCompany || vendorCompany,
          requester: cachedResult.requester || 'customer_intelligence',
          workflowType: cachedResult.workflowType || 'customer_intelligence',
          rawData: cachedResult.rawData || {},
          analysis: analysisData,  // ✅ Extract the rich analysis data
          metrics: cachedResult.metrics || {
            totalCost: 0,
            cacheHits: 1,
            cacheSavings: 2.50,
            llmCost: 0,
            datasetsCollected: 0
          },
          generatedAt: cachedResult.generatedAt || new Date().toISOString(),
          requestId: cachedResult.requestId || context.awsRequestId,
          workflowMetadata: cachedResult.workflowMetadata || {
            type: 'customer_intelligence',
            userPersona: userPersona,
            datasetsCollected: [],
            processedAt: cachedResult.generatedAt || new Date().toISOString()
          }
        };

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            message: 'Customer intelligence retrieved from cache',
            requestId: context.awsRequestId,
            prospectCompany,
            vendorCompany,
            userPersona,
            status: 'completed',
            source: 'cache',
            data: workflowData,  // ✅ Properly structured data with analysis
            cached: true,
            generatedAt: cachedResult.generatedAt || new Date().toISOString(),
            // Show cost savings from cache hit
            metrics: {
              totalCost: 0,
              cacheSavings: cachedResult.metrics?.totalCost || 2.50, // Estimated step function cost
              cacheHit: true
            }
          }),
        };
      }

      logger.info('Customer intelligence cache miss (both analysis and workflow layers) - proceeding with step function', { 
        prospectCompany,
        vendorCompany,
        userPersona: userPersona?.role,
        analysisKey,
        workflowKey: cacheKey 
      });
    } else {
      logger.info('Customer intelligence refresh requested - bypassing cache', { 
        prospectCompany,
        vendorCompany
      });
    }

    // Initialize Step Functions client
    const stepFunctions = new SFNClient({ region: process.env.AWS_REGION });
    
    const executionName = `customer-intelligence-${context.awsRequestId}`;
    const input = JSON.stringify({
      companyName: prospectCompany,
      vendorCompany,
      userPersona, // For persona-aware processing
      requester: 'customer_intelligence',
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString(),
      // Add context for interactive workflow
      workflowType: 'customer_intelligence',
      interactionMode: 'deep_dive', // vs 'quick_scan'
      refresh: refresh || false
    });

    const command = new StartExecutionCommand({
      stateMachineArn: process.env.STEP_FUNCTION_ARN!,
      name: executionName,
      input
    });

    const execution = await stepFunctions.send(command);
    
    logger.info('Customer intelligence step function started', {
      executionArn: execution.executionArn,
      prospectCompany,
      vendorCompany
    });

    // Return immediately with execution details for frontend polling
    return {
      statusCode: 202, // Accepted - processing started
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Customer intelligence analysis started',
        requestId: context.awsRequestId,
        executionArn: execution.executionArn,
        prospectCompany,
        vendorCompany,
        status: 'processing',
        estimatedTimeMinutes: 3,
        // Provide polling endpoints for interactive frontend
        statusEndpoint: `/workflows/${context.awsRequestId}/status`,
        progressEndpoint: `/workflows/${context.awsRequestId}/progress`,
        resultEndpoint: `/workflows/${context.awsRequestId}/result`,
        // Interactive workflow support
        workflow: {
          type: 'customer_intelligence',
          steps: [
            { name: 'cache_check', status: 'pending', description: 'Checking existing data' },
            { name: 'data_collection', status: 'pending', description: 'Gathering intel from multiple sources' },
            { name: 'llm_analysis', status: 'pending', description: 'AI-powered insight generation' },
            { name: 'finalization', status: 'pending', description: 'Structuring results' }
          ]
        }
      }),
    };

  } catch (error) {
    logger.error('Customer intelligence async start failed', { error });
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
