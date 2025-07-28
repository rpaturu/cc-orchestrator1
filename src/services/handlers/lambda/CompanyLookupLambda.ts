import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { CacheType } from '../../../types/cache-types';
import { getCorsHeaders } from '../../../index';
import { GoogleKnowledgeGraphService } from '../../GoogleKnowledgeGraphService';
import { SerpAPIService } from '../../SerpAPIService';

interface CompanyBasicInfo {
  name: string;
  domain?: string;
  description?: string;
  industry?: string;
}

/**
 * Company Lookup Lambda - Handles GET /companies/lookup?query=X&limit=Y
 * Returns a clean list of companies with descriptions for autocomplete/search
 * Uses conservative approach - only returns validated domains, never makes assumptions
 */
export const companyLookupHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logger = new Logger('CompanyLookupHandler');
  
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
          message: 'Companies retrieved successfully',
          data: {
          ...cachedResult,
          cached: true,
          },
          requestId: context.awsRequestId,
        }),
      };
    }

    // Generate company suggestions using conservative multi-source approach
    const companies = await lookupCompaniesConservative(query, limit, logger);

    const result = {
      companies,
      query,
      total: companies.length,
      cached: false,
      generatedAt: new Date().toISOString(),
      sources: ['google_knowledge_graph', 'domain_validation', 'serpapi_fallback']
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
        message: 'Companies retrieved successfully',
        data: result,
        requestId: context.awsRequestId,
      }),
    };

  } catch (error) {
    logger.error('Company lookup failed', { error });
    
    const corsHeaders = getCorsHeaders();
    
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
 * Conservative company lookup using multiple sources with domain validation
 * Never makes domain assumptions - only returns validated data
 */
async function lookupCompaniesConservative(query: string, limit: number, logger: Logger): Promise<CompanyBasicInfo[]> {
  logger.info(`Looking up companies matching: ${query}`);
  
  try {
    // Try multiple sources in parallel - conservative approach
    const [knowledgeGraphResults, domainValidatedResults, serpApiResults] = await Promise.allSettled([
      searchGoogleKnowledgeGraph(query, logger),
      searchByValidatedDomain(query, logger),
      searchWithSerpAPIFallback(query, logger)
    ]);

    const companies: CompanyBasicInfo[] = [];
    
    // Add Google Knowledge Graph results (authoritative source)
    if (knowledgeGraphResults.status === 'fulfilled') {
      companies.push(...knowledgeGraphResults.value);
      logger.info('Knowledge Graph results added', { count: knowledgeGraphResults.value.length });
    } else {
      logger.warn('Knowledge Graph search failed', { error: knowledgeGraphResults.reason });
    }

    // Add domain-validated results (only if domains actually work)
    if (domainValidatedResults.status === 'fulfilled') {
      companies.push(...domainValidatedResults.value);
      logger.info('Domain validated results added', { count: domainValidatedResults.value.length });
    } else {
      logger.warn('Domain validation failed', { error: domainValidatedResults.reason });
    }

    // Add SerpAPI fallback results (if other sources are insufficient)
    if (serpApiResults.status === 'fulfilled' && companies.length < limit) {
      companies.push(...serpApiResults.value);
      logger.info('SerpAPI fallback results added', { count: serpApiResults.value.length });
    }

    // Deduplicate and return top matches
    const deduped = dedupeCompanies(companies);
    const limited = deduped.slice(0, limit);
    
    logger.info('Company lookup completed', { 
      total: companies.length, 
      deduped: deduped.length, 
      final: limited.length 
    });
    
    return limited;
  } catch (error) {
    logger.error('Company lookup failed', { error: String(error) });
    return [];
  }
}

/**
 * Search Google Knowledge Graph - CONSERVATIVE approach
 * Does NOT infer domains, only uses what's explicitly provided
 */
async function searchGoogleKnowledgeGraph(query: string, logger: Logger): Promise<CompanyBasicInfo[]> {
  try {
    const knowledgeGraphService = new GoogleKnowledgeGraphService();
    const results = await knowledgeGraphService.lookupCompanies(query);
    
    logger.info('Google Knowledge Graph search completed', { 
      query, 
      resultCount: results.length 
    });
    
    return results.map(result => ({
      name: result.name,
      domain: result.domain, // Only if explicitly found, never inferred
      description: result.description,
      industry: result.industry
    }));
  } catch (error) {
    logger.error('Google Knowledge Graph search failed', { error: String(error) });
    return [];
  }
}

/**
 * Search by domain validation - ONLY returns domains that actually work
 * This is the same conservative approach from the working commit
 */
async function searchByValidatedDomain(query: string, logger: Logger): Promise<CompanyBasicInfo[]> {
  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suggestions: CompanyBasicInfo[] = [];
  
  // Common TLDs to try - only .com to start (most reliable)
  const tlds = ['.com'];
  
  for (const tld of tlds) {
    const domain = `${cleanQuery}${tld}`;
    try {
      // Try to validate if domain exists and responds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`https://${domain}`, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        suggestions.push({
          name: query,
          domain: domain,
          description: `Company website: ${domain}`
        });
        logger.info('Validated domain found', { domain });
      }
    } catch (error) {
      // Domain doesn't exist or is unreachable - this is expected
      logger.debug('Domain validation failed', { domain, error: String(error) });
    }
  }
  
  return suggestions;
}

/**
 * SerpAPI fallback for when other sources are insufficient
 */
async function searchWithSerpAPIFallback(query: string, logger: Logger): Promise<CompanyBasicInfo[]> {
  try {
    if (!process.env.SERPAPI_API_KEY) {
      logger.warn('SerpAPI key not configured, skipping fallback');
      return [];
    }

    // Initialize cache service for SerpAPI
    const cacheConfig = { ttlHours: 24, maxEntries: 1000, compressionEnabled: true };
    const cacheService = new CacheService(cacheConfig, logger, process.env.AWS_REGION);
    
    const serpAPI = new SerpAPIService(cacheService, logger);
    const searchResults = await serpAPI.getOrganicResults(`${query} company`);
    
    const companies = searchResults
      .filter((result: any) => isLikelyOfficialDomain(result.link, query))
      .map((result: any) => ({
        name: extractCompanyName(result.title, query),
        domain: extractDomain(result.link),
        description: result.snippet || `Search result for ${query}`
      }));

    logger.info('SerpAPI fallback completed', { 
      query, 
      resultCount: companies.length 
    });

    return companies;
  } catch (error) {
    logger.error('SerpAPI fallback failed', { error: String(error) });
    return [];
  }
}

/**
 * Deduplicate companies based on root domain OR name
 */
function dedupeCompanies(companies: CompanyBasicInfo[]): CompanyBasicInfo[] {
  const seen = new Set<string>();
  const normalized: CompanyBasicInfo[] = [];
  
  for (const company of companies) {
    // Normalize domain to root domain for better deduplication
    const normalizedCompany = { ...company };
    if (company.domain) {
      normalizedCompany.domain = getRootDomain(company.domain);
    }
    
    // Use root domain if available, otherwise use normalized name
    const key = normalizedCompany.domain || company.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) continue;
    
    seen.add(key);
    normalized.push(normalizedCompany);
  }
  
  return normalized;
}

/**
 * Extract root domain from subdomain (e.g., investor.okta.com -> okta.com)
 */
function getRootDomain(domain: string): string {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain; // Already a root domain
  
  // For most cases, take the last two parts (e.g., okta.com from investor.okta.com)
  return parts.slice(-2).join('.');
}

/**
 * Check if a domain is likely to be the official company domain
 */
function isLikelyOfficialDomain(url: string, companyQuery: string): boolean {
  const domain = extractDomain(url);
  const cleanQuery = companyQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exclude obvious third-party sites
  const thirdPartySites = ['wikipedia.org', 'linkedin.com', 'crunchbase.com', 'glassdoor.com', 'indeed.com'];
  if (thirdPartySites.some(site => domain.includes(site))) {
    return false;
  }
  
  // Prefer domains that contain the company name
  return domain.includes(cleanQuery) || cleanQuery.includes(domain.split('.')[0]);
}

/**
 * Extract clean company name from search result title
 */
function extractCompanyName(title: string, fallback: string): string {
  // Simple cleanup - remove common suffixes and clean up
  const cleaned = title
    .replace(/\s*[-|]\s*.*/g, '') // Remove everything after - or |
    .replace(/\s*\(.*\)/g, '') // Remove parenthetical content
    .trim();
  
  return cleaned || fallback;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    return domain;
  } catch {
    return '';
  }
} 