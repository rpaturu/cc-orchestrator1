import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { CacheType } from '../../../types/cache-types';
import { getCorsHeaders } from '../../../index';

/**
 * Company Lookup Lambda - Handles GET /companies/lookup?query=X&limit=Y
 * Returns a clean list of companies with descriptions for autocomplete/search
 */
export const companyLookupHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('CompanyLookup');
  
  try {
    const origin = event.headers.Origin || event.headers.origin;
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };

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
          error: 'Method not allowed. Use GET /companies/lookup?query=X&limit=Y',
          requestId: context.awsRequestId,
        }),
      };
    }

    // Extract query parameters
    const query = event.queryStringParameters?.query;
    const limit = parseInt(event.queryStringParameters?.limit || '5');

    if (!query) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Query parameter "query" is required',
          example: '/companies/lookup?query=shopify&limit=5',
          requestId: context.awsRequestId,
        }),
      };
    }

    logger.info('Company lookup request', { query, limit });

    // Initialize cache
    const cacheConfig = { ttlHours: 24, maxEntries: 1000, compressionEnabled: true };
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);
    
    const cacheKey = `company_lookup:${query.toLowerCase()}:${limit}`;
    
    // Check cache first
    const cachedResult = await cacheService.getRawJSON(cacheKey);
    if (cachedResult) {
      logger.info('Company lookup cache hit', { query, limit });
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          ...cachedResult,
          cached: true,
          requestId: context.awsRequestId,
        }),
      };
    }

    // Generate company suggestions based on query
    const companies = generateCompanySuggestions(query, limit);

    const result = {
      companies,
      query,
      total: companies.length,
      cached: false,
      generatedAt: new Date().toISOString()
    };

    // Cache the result  
    await cacheService.setRawJSON(cacheKey, result, CacheType.COMPANY_SEARCH);

    logger.info('Company lookup completed', { 
      query, 
      limit, 
      resultCount: companies.length 
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...result,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    logger.error('Company lookup failed', { error });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    };
    
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
 * Generate company suggestions based on query
 * In production, this would query a company database or external API
 */
function generateCompanySuggestions(query: string, limit: number) {
  const lowerQuery = query.toLowerCase();
  
  // Sample company database - in production this would be a real database
  const companies = [
    { name: 'Shopify', domain: 'shopify.com', description: 'E-commerce platform for online stores and retail point-of-sale systems', industry: 'E-commerce' },
    { name: 'Shopify Plus', domain: 'shopifyplus.com', description: 'Enterprise e-commerce platform for high-volume merchants', industry: 'E-commerce' },
    { name: 'Shop Pay', domain: 'shop.app', description: 'Mobile shopping assistant and payment platform', industry: 'Fintech' },
    { name: 'Amazon', domain: 'amazon.com', description: 'Global e-commerce and cloud computing company', industry: 'E-commerce' },
    { name: 'Microsoft', domain: 'microsoft.com', description: 'Technology company developing software, hardware, and cloud services', industry: 'Technology' },
    { name: 'Google', domain: 'google.com', description: 'Search engine and technology company', industry: 'Technology' },
    { name: 'Apple', domain: 'apple.com', description: 'Consumer electronics and software company', industry: 'Technology' },
    { name: 'Salesforce', domain: 'salesforce.com', description: 'Customer relationship management (CRM) platform', industry: 'SaaS' },
    { name: 'HubSpot', domain: 'hubspot.com', description: 'Inbound marketing, sales, and service platform', industry: 'SaaS' },
    { name: 'Slack', domain: 'slack.com', description: 'Business communication and collaboration platform', industry: 'SaaS' },
  ];

  // Filter companies based on query
  const filtered = companies.filter(company => 
    company.name.toLowerCase().includes(lowerQuery) ||
    company.description.toLowerCase().includes(lowerQuery) ||
    company.domain.toLowerCase().includes(lowerQuery)
  );

  // Sort by relevance (exact matches first, then partial)
  const sorted = filtered.sort((a, b) => {
    const aExact = a.name.toLowerCase().startsWith(lowerQuery) ? 1 : 0;
    const bExact = b.name.toLowerCase().startsWith(lowerQuery) ? 1 : 0;
    return bExact - aExact;
  });

  return sorted.slice(0, limit);
} 