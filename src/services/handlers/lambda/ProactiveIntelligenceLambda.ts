/**
 * Proactive Intelligence Lambda
 * 
 * Triggers comprehensive intelligence gathering when a customer is selected
 * Provides context-aware insights for all 13 research areas
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { ProfileService } from '../../ProfileService';
import { getCorsHeaders } from '../../../index';

interface ProactiveIntelligenceRequest {
  customerName: string;
  userId: string; // Use userId to get profile from database
  priorityAreas?: string[]; // Specific research areas to prioritize
  refresh?: boolean;
}

export const proactiveIntelligenceHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('ProactiveIntelligence');
  
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

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Method not allowed. Use POST.',
          requestId: context.awsRequestId,
        }),
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

    const request: ProactiveIntelligenceRequest = JSON.parse(event.body);
    const { customerName, userId, priorityAreas, refresh = false } = request;

    if (!customerName || !userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'customerName and userId are required',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Get user profile for context awareness
    const profileService = new ProfileService();
    const userProfile = await profileService.getProfile(userId);
    
    if (!userProfile) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'User profile not found',
          message: 'Please complete your profile setup first',
          requestId: context.awsRequestId,
          userId
        }),
      };
    }

    logger.info('Starting proactive intelligence workflow', {
      customerName,
      userRole: userProfile.role,
      vendorCompany: userProfile.company,
      priorityAreas,
      refresh
    });

    // Check if comprehensive intelligence already exists
    if (!refresh) {
      const cacheService = new CacheService(
        { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
        logger,
        process.env.AWS_REGION
      );

      const intelligenceKey = `comprehensive_intelligence:${customerName.toLowerCase().replace(/\s+/g, '_')}:${userProfile.company.toLowerCase().replace(/\s+/g, '_')}:${userProfile.role}`;
      const cachedIntelligence = await cacheService.getRawJSON(intelligenceKey);

      if (cachedIntelligence) {
        logger.info('Comprehensive intelligence found in cache', {
          customerName,
          vendorCompany: userProfile.company,
          userRole: userProfile.role
        });

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            message: 'Comprehensive intelligence retrieved from cache',
            requestId: context.awsRequestId,
            customerName,
            userProfile,
            status: 'completed',
            source: 'cache',
            data: cachedIntelligence,
            cached: true,
            generatedAt: cachedIntelligence.generatedAt || new Date().toISOString(),
            metrics: {
              totalCost: 0,
              cacheSavings: cachedIntelligence.metrics?.totalCost || 5.0,
              cacheHit: true
            }
          }),
        };
      }
    }

    // Start comprehensive intelligence Step Function workflow
    const stepFunctions = new SFNClient({ region: process.env.AWS_REGION });
    
    const executionName = `proactive-intelligence-${context.awsRequestId}`;
    const input = JSON.stringify({
      customerName: customerName.trim(),
      userProfile,
      priorityAreas: priorityAreas || [
        'decision_makers',
        'tech_stack', 
        'competitive_positioning',
        'buying_signals',
        'business_challenges'
      ],
      requester: 'customer_intelligence',
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString(),
      workflowType: 'comprehensive_intelligence',
      refresh
    });

    const command = new StartExecutionCommand({
      stateMachineArn: process.env.STEP_FUNCTION_ARN!,
      name: executionName,
      input
    });

    const execution = await stepFunctions.send(command);
    
    logger.info('Proactive intelligence Step Function started', {
      executionArn: execution.executionArn,
      customerName,
      vendorCompany: userProfile.company,
      userRole: userProfile.role
    });

    // Return immediately with execution details for frontend polling
    return {
      statusCode: 202, // Accepted - processing started
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Comprehensive intelligence analysis started',
        requestId: context.awsRequestId,
        executionArn: execution.executionArn,
        customerName,
        userProfile,
        status: 'processing',
        estimatedTimeMinutes: 5,
        source: 'step_function',
        // Provide polling endpoints
        statusEndpoint: `/intelligence/${context.awsRequestId}/status`,
        progressEndpoint: `/intelligence/${context.awsRequestId}/progress`,
        resultEndpoint: `/intelligence/${context.awsRequestId}/result`,
        // Comprehensive workflow support
        workflow: {
          type: 'comprehensive_intelligence',
          steps: [
            { name: 'cache_check', status: 'pending', description: 'Checking existing intelligence' },
            { name: 'vendor_context', status: 'pending', description: 'Analyzing vendor context' },
            { name: 'data_collection', status: 'pending', description: 'Gathering comprehensive data' },
            { name: 'llm_analysis', status: 'pending', description: 'AI-powered intelligence analysis' },
            { name: 'context_awareness', status: 'pending', description: 'Generating personalized insights' },
            { name: 'finalization', status: 'pending', description: 'Structuring comprehensive intelligence' }
          ]
        }
      }),
    };

  } catch (error) {
    logger.error('Proactive intelligence workflow failed', { error });
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
