/**
 * Instant Topic Response Handler
 * 
 * Provides pre-processed, context-aware insights for any research topic
 * Returns results in <100ms from comprehensive intelligence cache
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { getCorsHeaders } from '../../../index';

interface UserContext {
  role: string;
  vendorCompany: string;
  territory?: string;
  focusAreas?: string[];
  experience?: string;
}

interface TopicRequest {
  customerName: string;
  topic: string; // e.g., 'decision_makers', 'tech_stack', etc.
  userContext: UserContext;
}

export const instantTopicHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('InstantTopic');
  
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

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Method not allowed. Use GET.',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Extract parameters from query string
    const customerName = event.queryStringParameters?.customerName;
    const topic = event.queryStringParameters?.topic;
    const userContextStr = event.queryStringParameters?.userContext;

    if (!customerName || !topic || !userContextStr) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'customerName, topic, and userContext are required',
          requestId: context.awsRequestId,
        }),
      };
    }

    let userContext: UserContext;
    try {
      userContext = JSON.parse(decodeURIComponent(userContextStr));
    } catch (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid userContext JSON',
          requestId: context.awsRequestId,
        }),
      };
    }

    logger.info('Instant topic request', {
      customerName,
      topic,
      userRole: userContext.role,
      vendorCompany: userContext.vendorCompany,
      requestId: context.awsRequestId
    });

    // Check comprehensive intelligence cache
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      logger,
      process.env.AWS_REGION
    );

    const intelligenceKey = `comprehensive_intelligence:${customerName.toLowerCase().replace(/\s+/g, '_')}:${userContext.vendorCompany.toLowerCase().replace(/\s+/g, '_')}:${userContext.role}`;
    const comprehensiveIntelligence = await cacheService.getRawJSON(intelligenceKey);

    if (!comprehensiveIntelligence) {
      // Comprehensive intelligence not found - trigger proactive collection
      logger.info('Comprehensive intelligence not found, triggering proactive collection', {
        customerName,
        topic,
        userRole: userContext.role,
        vendorCompany: userContext.vendorCompany
      });

      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Comprehensive intelligence not available',
          message: 'Please trigger proactive intelligence collection first',
          requestId: context.awsRequestId,
          customerName,
          topic,
          userContext,
          recommendation: {
            action: 'POST /intelligence/proactive',
            body: {
              customerName,
              userContext,
              priorityAreas: [topic]
            }
          }
        }),
      };
    }

    // Extract topic-specific insights from comprehensive intelligence
    const topicInsights = extractTopicInsights(comprehensiveIntelligence, topic, userContext);

    logger.info('Instant topic response generated', {
      customerName,
      topic,
      userRole: userContext.role,
      vendorCompany: userContext.vendorCompany,
      insightsFound: !!topicInsights,
      responseTime: 'instant'
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Instant topic insights retrieved',
        requestId: context.awsRequestId,
        customerName,
        topic,
        userContext,
        status: 'completed',
        source: 'comprehensive_intelligence_cache',
        data: topicInsights,
        cached: true,
        responseTime: 'instant',
        generatedAt: comprehensiveIntelligence.generatedAt || new Date().toISOString(),
        metadata: {
          comprehensiveIntelligenceKey: intelligenceKey,
          topicExtracted: topic,
          contextAware: true,
          personalized: true
        }
      }),
    };

  } catch (error) {
    logger.error('Instant topic handler failed', { error });
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

/**
 * Extract topic-specific insights from comprehensive intelligence
 */
function extractTopicInsights(comprehensiveIntelligence: any, topic: string, userContext: UserContext): any {
  const { role, vendorCompany } = userContext;
  
  // Get topic-specific data from comprehensive intelligence
  const topicData = comprehensiveIntelligence.topics?.[topic] || comprehensiveIntelligence[topic];
  
  if (!topicData) {
    return {
      error: `Topic '${topic}' not found in comprehensive intelligence`,
      availableTopics: Object.keys(comprehensiveIntelligence.topics || comprehensiveIntelligence)
    };
  }

  // Apply context-aware filtering and enhancement
  const contextAwareInsights = applyContextAwareness(topicData, userContext);

  return {
    topic,
    insights: contextAwareInsights,
    context: {
      userRole: role,
      vendorCompany,
      personalized: true,
      relevanceScore: calculateRelevanceScore(topicData, userContext)
    },
    metadata: {
      source: 'comprehensive_intelligence',
      extractedAt: new Date().toISOString(),
      contextApplied: true
    }
  };
}

/**
 * Apply context-aware filtering and enhancement
 */
function applyContextAwareness(topicData: any, userContext: UserContext): any {
  const { role, vendorCompany, focusAreas } = userContext;
  
  // Enhance insights based on user role
  let enhancedInsights = { ...topicData };
  
  if (role === 'AE') {
    // Add sales-specific insights
    enhancedInsights.salesOpportunities = identifySalesOpportunities(topicData, vendorCompany);
    enhancedInsights.competitivePositioning = analyzeCompetitivePositioning(topicData, vendorCompany);
    enhancedInsights.nextSteps = generateNextSteps(topicData, userContext);
  } else if (role === 'SE') {
    // Add technical insights
    enhancedInsights.technicalFit = analyzeTechnicalFit(topicData, vendorCompany);
    enhancedInsights.integrationOpportunities = identifyIntegrationOpportunities(topicData, vendorCompany);
    enhancedInsights.technicalRecommendations = generateTechnicalRecommendations(topicData, userContext);
  }

  // Filter based on focus areas
  if (focusAreas && focusAreas.length > 0) {
    enhancedInsights = filterByFocusAreas(enhancedInsights, focusAreas);
  }

  return enhancedInsights;
}

/**
 * Calculate relevance score for the topic based on user context
 */
function calculateRelevanceScore(topicData: any, userContext: UserContext): number {
  const { role, vendorCompany, focusAreas } = userContext;
  let score = 0.5; // Base score

  // Role-based relevance
  if (role === 'AE' && topicData.salesOpportunities) score += 0.2;
  if (role === 'SE' && topicData.technicalDetails) score += 0.2;

  // Focus area relevance
  if (focusAreas && focusAreas.some(area => topicData.keywords?.includes(area))) {
    score += 0.3;
  }

  return Math.min(1.0, score);
}

// Placeholder functions for context-aware analysis
function identifySalesOpportunities(data: any, vendorCompany: string): any[] {
  return []; // Implementation needed
}

function analyzeCompetitivePositioning(data: any, vendorCompany: string): any {
  return {}; // Implementation needed
}

function generateNextSteps(data: any, userContext: UserContext): any[] {
  return []; // Implementation needed
}

function analyzeTechnicalFit(data: any, vendorCompany: string): any {
  return {}; // Implementation needed
}

function identifyIntegrationOpportunities(data: any, vendorCompany: string): any[] {
  return []; // Implementation needed
}

function generateTechnicalRecommendations(data: any, userContext: UserContext): any[] {
  return []; // Implementation needed
}

function filterByFocusAreas(data: any, focusAreas: string[]): any {
  return data; // Implementation needed
}
