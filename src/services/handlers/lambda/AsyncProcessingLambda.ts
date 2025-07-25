/**
 * Async Processing Lambda Functions
 * 
 * Consolidates all asynchronous processing operations into a single file for better organization
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '../../core/Logger';
import { RequestService } from '../../utilities/RequestService';
import { SalesIntelligenceOrchestrator } from '../../SalesIntelligenceOrchestrator';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { getCorsHeaders } from '../../../index';

// App configuration for orchestrator
const appConfig = {
  search: {
    maxResultsPerQuery: 10,
    timeoutMs: 10000,
    retryAttempts: 1,
    rateLimitRps: 0.5
  },
  ai: {
    model: process.env.BEDROCK_MODEL!,
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
    systemPrompt: 'You are a sales intelligence analyst. Provide actionable insights for sales professionals.'
  },
  cache: {
    ttlHours: process.env.NODE_ENV === 'development' ? 96 : 1,
    maxEntries: 1000,
    compressionEnabled: true
  },
  apis: {
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY!,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!
  }
};

/**
 * Lambda handler for async company overview processing
 * POST /api/companies/{domain}/overview/async
 */
export const companyOverviewAsyncHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Company Overview Async Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract domain from path parameters
    const domain = event.pathParameters?.domain;
    if (!domain) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Company domain is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service
    const logger = new Logger('CompanyOverviewAsync');
    const requestService = new RequestService(logger);
    
    // Create async request
    const asyncRequestId = await requestService.createRequest(domain, 'overview');
    
    // Invoke dedicated processing lambda (proper async pattern)
    try {
      await invokeProcessingLambda(asyncRequestId, domain, context.awsRequestId, 'overview');
      logger.info('Processing Lambda invoked successfully', { asyncRequestId, domain });
    } catch (error) {
      logger.error('Failed to invoke processing Lambda', { asyncRequestId, domain, error });
      // Mark as failed if we can't even start processing
      await requestService.updateRequestStatus(asyncRequestId, 'failed', 'Failed to start processing');
    }
    
    return {
      statusCode: 202, // Accepted
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: asyncRequestId,
        status: 'processing',
        message: 'Company overview is being processed. Use the requestId to check status.',
        estimatedTimeMinutes: 1,
        statusCheckEndpoint: `/requests/${asyncRequestId}/status`,
      }),
    };

  } catch (error) {
    console.error('Company Overview Async Lambda error:', error);
    
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
 * Lambda handler for discovery async processing
 */
export const discoveryAsyncHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Discovery Async Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract domain from path parameters
    const domain = event.pathParameters?.domain;
    if (!domain) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Company domain is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service
    const logger = new Logger('DiscoveryAsync');
    const requestService = new RequestService(logger);
    
    // Create async request  
    const asyncRequestId = await requestService.createRequest(domain, 'discovery');
    
    // TODO: Implement discovery processing - for now return immediately
    await requestService.updateRequestStatus(asyncRequestId, 'completed', { 
      message: 'Discovery endpoint not yet implemented', 
      domain 
    });
    
    return {
      statusCode: 202, // Accepted
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: asyncRequestId,
        status: 'processing',
        message: 'Company discovery is being processed. Use the requestId to check status.',
        estimatedTimeMinutes: 2,
        statusCheckEndpoint: `/requests/${asyncRequestId}/status`,
      }),
    };

  } catch (error) {
    console.error('Discovery Async Lambda error:', error);
    
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
 * Lambda handler for analysis async processing
 */
export const analysisAsyncHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Analysis Async Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract domain from path parameters
    const domain = event.pathParameters?.domain;
    if (!domain) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Company domain is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service
    const logger = new Logger('AnalysisAsync');
    const requestService = new RequestService(logger);
    
    // Create async request
    const asyncRequestId = await requestService.createRequest(domain, 'analysis');
    
    // TODO: Implement analysis processing - for now return immediately  
    await requestService.updateRequestStatus(asyncRequestId, 'completed', {
      message: 'Analysis endpoint not yet implemented',
      domain
    });
    
    return {
      statusCode: 202, // Accepted
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: asyncRequestId,
        status: 'processing',
        message: 'Company analysis is being processed. Use the requestId to check status.',
        estimatedTimeMinutes: 3,
        statusCheckEndpoint: `/requests/${asyncRequestId}/status`,
      }),
    };

  } catch (error) {
    console.error('Analysis Async Lambda error:', error);
    
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
 * Lambda handler for getting async request status and results (Step Functions)
 * GET /requests/{requestId}/status and GET /requests/{requestId}/result
 */
export const getAsyncRequestHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Get Async Request Lambda invoked', { requestId: context.awsRequestId });

    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    // Extract requestId from path parameters
    const requestId = event.pathParameters?.requestId;
    if (!requestId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request ID is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Initialize request service for DynamoDB-based async requests (Company Overview)
    const logger = new Logger('GetAsyncRequest');
    const requestService = new RequestService(logger);
    
    // Get request details from DynamoDB
    const request = await requestService.getRequest(requestId);
    
    if (!request) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request not found or expired',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Calculate processing time if completed
    let processingTimeMs;
    if (request.status === 'completed' || request.status === 'failed') {
      const createdAt = new Date(request.createdAt).getTime();
      const updatedAt = new Date(request.updatedAt).getTime();
      processingTimeMs = updatedAt - createdAt;
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        requestId: request.requestId,
        status: request.status,
        companyDomain: request.companyDomain,
        requestType: request.requestType,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        processingTimeMs,
        result: request.result,
        error: request.error,
        additionalData: request.additionalData,
      }),
    };

  } catch (error) {
    console.error('Get Async Request Lambda error:', error);
    
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
 * Calculate step-based progress information
 */
function getStepProgress(currentStep: string): { stepNumber: number, totalSteps: number, stepDescription: string } {
  const stepMap: Record<string, { stepNumber: number, description: string }> = {
    'cache_check': { stepNumber: 1, description: 'Checking existing data' },
    'data_collection': { stepNumber: 2, description: 'Gathering intelligence' },
    'llm_analysis': { stepNumber: 3, description: 'Generating AI insights' },
    'finalization': { stepNumber: 4, description: 'Finalizing results' },
    'completed': { stepNumber: 4, description: 'Completed' },
    'failed': { stepNumber: 0, description: 'Failed' }
  };
  
  const stepInfo = stepMap[currentStep] || { stepNumber: 1, description: 'Processing' };
  return {
    stepNumber: stepInfo.stepNumber,
    totalSteps: 4,
    stepDescription: stepInfo.description
  };
}

/**
 * Lambda handler for workflow status checking
 */
export const getWorkflowStatusHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const logger = new Logger('WorkflowStatus');
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = getCorsHeaders(origin);

    const requestId = event.pathParameters?.requestId;
    if (!requestId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request ID is required in path',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Determine if this is a status or result request
    const isResultEndpoint = event.resource?.includes('/result');

    // Use Step Functions client to get execution status
    const { SFNClient, DescribeExecutionCommand } = await import('@aws-sdk/client-sfn');
    const stepFunctions = new SFNClient({ region: process.env.AWS_REGION });
    
    // Try both execution name patterns (vendor-context and customer-intelligence)
    const baseArn = `arn:aws:states:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID || 'UNKNOWN'}:execution:sales-intelligence-enrichment`;
    const executionPatterns = [
      `${baseArn}:vendor-context-${requestId}`,
      `${baseArn}:customer-intelligence-${requestId}`
    ];
    
    logger.info('Searching for Step Functions execution', { 
      requestId, 
      region: process.env.AWS_REGION,
      accountId: process.env.AWS_ACCOUNT_ID || 'UNKNOWN',
      baseArn,
      executionPatterns 
    });
    
    let execution;
    let executionArn;
    
    // Try to find the execution with either pattern
    for (const arn of executionPatterns) {
      try {
        logger.info('Trying execution ARN', { arn });
        const command = new DescribeExecutionCommand({ executionArn: arn });
        execution = await stepFunctions.send(command);
        executionArn = arn;
        logger.info('Found execution!', { 
          arn, 
          status: execution.status,
          startDate: execution.startDate,
          stopDate: execution.stopDate 
        });
        break; // Found it!
      } catch (error) {
        logger.warn('Execution not found with this ARN', { arn, error: error instanceof Error ? error.message : String(error) });
        continue;
      }
    }
    
    if (!execution) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Workflow not found',
          requestId,
          message: 'No Step Functions execution found for this request ID'
        }),
      };
    }
    
    // If this is a result endpoint, only return when completed
    if (isResultEndpoint && execution.status !== 'SUCCEEDED') {
      return {
        statusCode: 202, // Still processing
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Workflow not yet completed',
          status: execution.status?.toLowerCase() === 'RUNNING' ? 'processing' : 
                 execution.status?.toLowerCase() === 'SUCCEEDED' ? 'completed' : 
                 execution.status?.toLowerCase() === 'FAILED' ? 'failed' : 'unknown',
          requestId,
        }),
      };
    }
    
    // Parse the current step and progress
    let currentStep = 'cache_check';
    let progress = 25;
    let status = 'processing';
    
    logger.info('Determining workflow status', { 
      executionStatus: execution.status,
      requestId 
    });
    
    if (execution.status === 'SUCCEEDED') {
      currentStep = 'completed';
      progress = 100;
      status = 'completed';
      logger.info('Workflow marked as completed', { requestId, executionStatus: execution.status });
    } else if (execution.status === 'FAILED') {
      currentStep = 'failed';
      progress = 0;
      status = 'failed';
      logger.warn('Workflow marked as failed', { requestId, executionStatus: execution.status });
    } else if (execution.status === 'RUNNING') {
      // Get actual current step from execution history
      try {
        const { GetExecutionHistoryCommand } = await import('@aws-sdk/client-sfn');
        const historyCommand = new GetExecutionHistoryCommand({ 
          executionArn: executionArn,
          reverseOrder: true, // Get most recent events first
          maxResults: 10 
        });
        const history = await stepFunctions.send(historyCommand);
        
        // Log all events for debugging
        logger.info('Step Functions execution history received', {
          requestId,
          eventCount: history.events?.length || 0,
          events: history.events?.slice(0, 5).map(e => ({
            type: e.type,
            timestamp: e.timestamp,
            stateName: e.stateEnteredEventDetails?.name || e.stateExitedEventDetails?.name
          }))
        });
        
        // Find the most recent state that started but hasn't completed
        let currentStateName = 'CacheCheckTask'; // Default fallback
        
        if (history.events) {
          for (const event of history.events) {
            logger.debug('Processing history event', {
              eventType: event.type,
              stateName: event.stateEnteredEventDetails?.name || event.stateExitedEventDetails?.name,
              timestamp: event.timestamp
            });
            
            if (event.type === 'TaskStateEntered' || event.type === 'PassStateEntered') {
              const details = event.stateEnteredEventDetails;
              if (details?.name) {
                currentStateName = details.name;
                logger.info('Found current state from execution history', { 
                  stateName: currentStateName, 
                  eventType: event.type,
                  timestamp: event.timestamp,
                  requestId
                });
                break;
              }
            }
          }
        }
        
        logger.info('Using state name for progress mapping', {
          currentStateName,
          requestId
        });
        
        // Map Step Functions state names to our progress steps
        logger.info('Mapping state name to progress', {
          currentStateName,
          requestId
        });
        
        if (currentStateName.includes('CacheCheck')) {
          currentStep = 'cache_check';
          progress = 25;
          logger.info('Mapped to cache_check', { currentStateName, requestId });
        } else if (currentStateName.includes('SmartCollection')) {
          currentStep = 'data_collection';
          progress = 50;
          logger.info('Mapped to data_collection', { currentStateName, requestId });
        } else if (currentStateName.includes('LLMAnalysis')) {
          currentStep = 'llm_analysis';
          progress = 75;
          logger.info('Mapped to llm_analysis', { currentStateName, requestId });
        } else if (currentStateName.includes('CacheResponse')) {
          currentStep = 'finalization';
          progress = 90;
          logger.info('Mapped to finalization', { currentStateName, requestId });
        } else {
          logger.warn('State name did not match any known patterns, using time-based fallback', {
            currentStateName,
            requestId
          });
          
          // Fallback to time-based if we can't identify the state
          const startTime = execution.startDate;
          const now = new Date();
          const elapsedMs = now.getTime() - (startTime?.getTime() || now.getTime());
          
          if (elapsedMs < 30000) {
            currentStep = 'cache_check';
            progress = 25;
          } else if (elapsedMs < 120000) {
            currentStep = 'data_collection';
            progress = 50;
          } else if (elapsedMs < 180000) {
            currentStep = 'llm_analysis';
            progress = 75;
          } else {
            currentStep = 'finalization';
            progress = 90;
          }
          
          logger.info('Time-based fallback result', {
            currentStep,
            progress,
            elapsedMs,
            requestId
          });
        }
        
        logger.info('Mapped current step', { 
          stateName: currentStateName, 
          currentStep, 
          progress,
          requestId 
        });
        
      } catch (historyError) {
        logger.error('Failed to get execution history, using time-based fallback', { 
          error: historyError instanceof Error ? historyError.message : String(historyError),
          errorStack: historyError instanceof Error ? historyError.stack : undefined,
          executionArn,
          requestId 
        });
        
        // Fallback to time-based estimation
        const startTime = execution.startDate;
        const now = new Date();
        const elapsedMs = now.getTime() - (startTime?.getTime() || now.getTime());
        
        if (elapsedMs < 30000) {
          currentStep = 'cache_check';
          progress = 25;
        } else if (elapsedMs < 120000) {
          currentStep = 'data_collection';
          progress = 50;
        } else if (elapsedMs < 180000) {
          currentStep = 'llm_analysis';
          progress = 75;
        } else {
          currentStep = 'finalization';
          progress = 90;
        }
      }
      
      status = 'processing';
    }

    // Build response
    const stepProgress = getStepProgress(currentStep);
    
    const response: any = {
      requestId,
      executionArn: execution.executionArn,
      status,
      currentStep,
      progress,  // Keep numeric for UI compatibility
      stepProgress: `Step ${stepProgress.stepNumber} of ${stepProgress.totalSteps}`,
      stepDescription: stepProgress.stepDescription,
      startTime: execution.startDate,
      endTime: execution.stopDate,
      // Interactive workflow status
      workflow: {
        type: executionArn?.includes('vendor-context') ? 'vendor_context' : 'customer_intelligence',
        steps: [
          { 
            name: 'cache_check', 
            status: currentStep === 'cache_check' ? 'running' : 
                   ['data_collection', 'llm_analysis', 'finalization', 'completed'].includes(currentStep) ? 'completed' : 'pending',
            description: 'Checking existing data'
          },
          { 
            name: 'data_collection', 
            status: currentStep === 'data_collection' ? 'running' : 
                   ['llm_analysis', 'finalization', 'completed'].includes(currentStep) ? 'completed' : 'pending',
            description: 'Gathering intelligence from multiple sources'
          },
          { 
            name: 'llm_analysis', 
            status: currentStep === 'llm_analysis' ? 'running' : 
                   ['finalization', 'completed'].includes(currentStep) ? 'completed' : 'pending',
            description: 'AI-powered insight generation'
          },
          { 
            name: 'finalization', 
            status: currentStep === 'finalization' ? 'running' : 
                   currentStep === 'completed' ? 'completed' : 'pending',
            description: 'Structuring results'
          }
        ]
      }
    };
    
    // Add result if completed and this is a result endpoint
    if (isResultEndpoint && execution.status === 'SUCCEEDED') {
      try {
        response.result = execution.output ? JSON.parse(execution.output) : null;
      } catch (parseError) {
        response.result = { error: 'Failed to parse execution output' };
      }
      
      response.processingTimeMs = execution.stopDate && execution.startDate ? 
        execution.stopDate.getTime() - execution.startDate.getTime() : null;
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };

  } catch (error) {
    const logger = new Logger('WorkflowStatus');
    logger.error('Workflow status check failed', { error });
    return {
      statusCode: 500,
      headers: getCorsHeaders(),
      body: JSON.stringify({
        error: 'Failed to get workflow status',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: context.awsRequestId,
      }),
    };
  }
};

/**
 * Process overview handler - Background processing
 */
export const processOverviewHandler = async (
  event: any,
  context: Context
): Promise<void> => {
  const { asyncRequestId, domain, awsRequestId } = event;
  
  console.log('Process Overview Lambda invoked', { 
    asyncRequestId, 
    domain, 
    awsRequestId,
    requestId: context.awsRequestId 
  });
  
  await processOverviewAsync(asyncRequestId, domain, awsRequestId);
};

/**
 * Process discovery handler - Background processing
 */
export const processDiscoveryHandler = async (
  event: any,
  context: Context
): Promise<void> => {
  const { asyncRequestId, domain, awsRequestId } = event;
  
  console.log('Process Discovery Lambda invoked', { 
    asyncRequestId, 
    domain, 
    awsRequestId,
    requestId: context.awsRequestId 
  });
  
  await processDiscoveryAsync(asyncRequestId, domain, awsRequestId);
};

/**
 * Process analysis handler - Background processing
 */
export const processAnalysisHandler = async (
  event: any,
  context: Context
): Promise<void> => {
  const { asyncRequestId, domain, awsRequestId } = event;
  
  console.log('Process Analysis Lambda invoked', { 
    asyncRequestId, 
    domain, 
    awsRequestId,
    requestId: context.awsRequestId 
  });
  
  await processAnalysisAsync(asyncRequestId, domain, awsRequestId);
};

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Helper function to invoke processing Lambda
 */
async function invokeProcessingLambda(asyncRequestId: string, domain: string, awsRequestId: string, requestType: string = 'overview'): Promise<void> {
  const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
  
  const functionNameMap = {
    overview: 'sales-intelligence-process-overview',
    discovery: 'sales-intelligence-process-discovery',
    analysis: 'sales-intelligence-process-analysis'
  };

  const functionName = functionNameMap[requestType as keyof typeof functionNameMap];
  
  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'Event', // Asynchronous
    Payload: JSON.stringify({
      asyncRequestId,
      domain,
      awsRequestId
    }),
  });

  try {
    await lambdaClient.send(command);
    console.log(`Processing Lambda ${functionName} invoked successfully for request ${asyncRequestId}`);
  } catch (error) {
    console.error(`Failed to invoke processing Lambda ${functionName}:`, error);
    throw error;
  }
}

/**
 * Background function to process overview async (fire and forget)
 */
async function processOverviewAsync(asyncRequestId: string, domain: string, awsRequestId: string): Promise<void> {
  const logger = new Logger('ProcessOverviewAsync');
  const requestService = new RequestService(logger);
  
  try {
    // Mark as processing
    await requestService.updateRequestStatus(asyncRequestId, 'processing');
    
    // Initialize orchestrator
    const orchestrator = new SalesIntelligenceOrchestrator(appConfig);
    
    // Process company overview
    const result = await orchestrator.getCompanyOverview(domain);
    
    // Store result and mark complete
    await requestService.updateRequestStatus(asyncRequestId, 'completed', result);
    
    console.log('Overview processing completed successfully', { asyncRequestId, domain });
    
  } catch (error) {
    console.error('Overview processing failed', { asyncRequestId, domain, error });
    
    // Mark as failed
    await requestService.updateRequestStatus(asyncRequestId, 'failed', String(error));
  }
}

/**
 * Background function to process discovery async (fire and forget)
 */
async function processDiscoveryAsync(asyncRequestId: string, domain: string, awsRequestId: string): Promise<void> {
  const logger = new Logger('ProcessDiscoveryAsync');
  const requestService = new RequestService(logger);
  
  try {
    // Mark as processing
    await requestService.updateRequestStatus(asyncRequestId, 'processing');
    
    // Initialize orchestrator
    const orchestrator = new SalesIntelligenceOrchestrator(appConfig);
    
    // Legacy discovery endpoint is deprecated
    const result = {
      error: 'Discovery endpoint is deprecated. Use /vendor/context or /customer/intelligence instead.',
      status: 'deprecated'
    };
    
    // Store result and mark complete
    await requestService.updateRequestStatus(asyncRequestId, 'completed', result);
    
    console.log('Discovery processing completed (deprecated)', { asyncRequestId, domain });
    
  } catch (error) {
    console.error('Discovery processing failed', { asyncRequestId, domain, error });
    
    // Mark as failed
    await requestService.updateRequestStatus(asyncRequestId, 'failed', String(error));
  }
}

/**
 * Background function to process analysis async (fire and forget)
 */
async function processAnalysisAsync(asyncRequestId: string, domain: string, awsRequestId: string): Promise<void> {
  const logger = new Logger('ProcessAnalysisAsync');
  const requestService = new RequestService(logger);
  
  try {
    // Mark as processing
    await requestService.updateRequestStatus(asyncRequestId, 'processing');
    
    // Initialize orchestrator
    const orchestrator = new SalesIntelligenceOrchestrator(appConfig);
    
    // Process company analysis using sales context
    const searchResults = await orchestrator.performSearch(domain, 'discovery');
    const result = await orchestrator.performAnalysis(domain, 'discovery', searchResults.results);
    
    // Store result and mark complete
    await requestService.updateRequestStatus(asyncRequestId, 'completed', result);
    
    console.log('Analysis processing completed successfully', { asyncRequestId, domain });
    
  } catch (error) {
    console.error('Analysis processing failed', { asyncRequestId, domain, error });
    
    // Mark as failed
    await requestService.updateRequestStatus(asyncRequestId, 'failed', String(error));
  }
} 