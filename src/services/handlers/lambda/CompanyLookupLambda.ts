import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { CacheType } from '../../../types/cache-types';
import { getCorsHeaders } from '../../../index';
import { GoogleKnowledgeGraphService } from '../../GoogleKnowledgeGraphService';
import { SerpAPIService } from '../../SerpAPIService';
import { BedrockCore } from '../../analysis/core/BedrockCore';
import { AnalysisConfig } from '../../analysis/types/AnalysisTypes';

interface CompanyBasicInfo {
  name: string;
  domain?: string;
  description?: string;   // ENHANCED: Comprehensive company description
  industry?: string;      // ENHANCED: Company industry/sector
  location?: string;      // ENHANCED: Company headquarters location
  employees?: string;     // ENHANCED: Employee count with year
  size?: string;          // ENHANCED: Company size/revenue information
  founded?: string;       // ENHANCED: Founding year
  headquarters?: string;  // ENHANCED: Detailed headquarters address
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

    // Add SerpAPI fallback results (prioritize LLM-enhanced data)
    if (serpApiResults.status === 'fulfilled') {
      // If SerpAPI returns enhanced results, use those instead of basic domain validation
      if (serpApiResults.value.length > 0) {
        // Check if SerpAPI results have enhanced data (location, employees, etc.)
        const hasEnhancedData = serpApiResults.value.some(company => 
          company.location || company.employees || company.size || company.industry
        );
        
        if (hasEnhancedData) {
          // Replace basic results with enhanced ones
          companies.length = 0; // Clear basic results
          companies.push(...serpApiResults.value);
          logger.info('SerpAPI enhanced results replacing basic results', { count: serpApiResults.value.length });
        } else {
          // Add SerpAPI results if no enhanced data
          companies.push(...serpApiResults.value);
          logger.info('SerpAPI basic results added', { count: serpApiResults.value.length });
        }
      }
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
 * SerpAPI fallback with enhanced data extraction using optimized queries
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
    
    // ENHANCED: Use optimized query for rich data extraction
    const optimizedQuery = `${query} company location size headquarters employees revenue`;
    logger.info('Using optimized SerpAPI query for rich data', { optimizedQuery });
    
    let searchResults = await serpAPI.getOrganicResults(optimizedQuery);
    
    logger.info('SerpAPI search results', { 
      query: optimizedQuery, 
      resultCount: searchResults.length,
      firstResult: searchResults.length > 0 ? searchResults[0] : null
    });
    
    // If no results found, try with common spelling corrections
    if (searchResults.length === 0) {
      const correctedQuery = getCorrectedQuery(query);
      if (correctedQuery && correctedQuery !== query) {
        logger.info('Trying corrected query', { original: query, corrected: correctedQuery });
        const correctedOptimizedQuery = `${correctedQuery} company location size headquarters employees revenue`;
        searchResults = await serpAPI.getOrganicResults(correctedOptimizedQuery);
        logger.info('Corrected SerpAPI search results', { 
          query: correctedOptimizedQuery, 
          resultCount: searchResults.length 
        });
      }
    }
    
    // Use LLM to extract rich company data directly from search results
    if (searchResults && searchResults.length > 0) {
      logger.info('Calling LLM with SerpAPI results', { 
        resultCount: searchResults.length,
        firstResultTitle: searchResults[0]?.title || 'No title'
      });
      
      try {
        // First, try to extract domain from organic search results
        const extractedDomain = extractDomainFromOrganicResults(query, searchResults, logger);
        
        const enhancedData = await extractRichCompanyData(query, searchResults, logger);
        if (enhancedData) {
          // Create company object with LLM-extracted data
          const company = {
            name: query,
            description: enhancedData.description || `Company information for ${query}`,
            domain: enhancedData.domain || extractedDomain, // Use LLM domain or fallback to extracted domain
            ...enhancedData
          };
          
          logger.info('Enhanced company data extracted', { 
            company: query, 
            domain: company.domain,
            location: enhancedData.location,
            employees: enhancedData.employees,
            size: enhancedData.size
          });
          return [company];
        }
      } catch (llmError) {
        logger.warn('LLM enhancement failed, returning basic data', { 
          company: query, 
          error: String(llmError) 
        });
      }
    } else {
      logger.warn('No SerpAPI results available for LLM extraction', { 
        query, 
        searchResultsLength: searchResults?.length || 0 
      });
    }

    logger.info('SerpAPI fallback completed', { 
      query, 
      resultCount: 0 
    });

    return [];
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
 * Enhanced to handle spelling variations and common misspellings
 */
function isLikelyOfficialDomain(url: string, companyQuery: string): boolean {
  const domain = extractDomain(url);
  const cleanQuery = companyQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Exclude obvious third-party sites
  const thirdPartySites = ['wikipedia.org', 'linkedin.com', 'crunchbase.com', 'glassdoor.com', 'indeed.com', 'forbes.com', 'fortune.com', 'pitchbook.com', 'growjo.com', 'ibisworld.com', 'runrepeat.com', 'zoominfo.com'];
  if (thirdPartySites.some(site => domain.includes(site))) {
    return false;
  }
  
  // Get the main part of the domain (before .com, .org, etc.)
  const domainMain = domain.split('.')[0];
  
  // Direct match
  if (domain.includes(cleanQuery) || cleanQuery.includes(domainMain)) {
    return true;
  }
  
  // Handle common misspellings and variations
  const commonMisspellings: Record<string, string[]> = {
    'addidas': ['adidas'],
    'adidas': ['addidas'],
    'nike': ['nikee', 'nikke'],
    'nikee': ['nike'],
    'nikke': ['nike'],
    'shopify': ['shopifiy', 'shopifi'],
    'shopifiy': ['shopify'],
    'shopifi': ['shopify'],
    'microsoft': ['microsft', 'mircosoft'],
    'microsft': ['microsoft'],
    'mircosoft': ['microsoft'],
    'google': ['gooogle', 'gogle'],
    'gooogle': ['google'],
    'gogle': ['google'],
    'amazon': ['amazn', 'amazoon'],
    'amazn': ['amazon'],
    'amazoon': ['amazon']
  };
  
  // Check for misspellings
  if (commonMisspellings[cleanQuery]) {
    return commonMisspellings[cleanQuery].some(correct => 
      domain.includes(correct) || domainMain.includes(correct)
    );
  }
  
  // Check if any known correct spelling matches the domain
  for (const [misspelled, corrects] of Object.entries(commonMisspellings)) {
    if (corrects.includes(cleanQuery)) {
      return domain.includes(misspelled) || domainMain.includes(misspelled);
    }
  }
  
  // For very short queries (3-4 chars), be more lenient
  if (cleanQuery.length <= 4) {
    return domainMain.length <= 6 && (
      domainMain.includes(cleanQuery) || 
      cleanQuery.includes(domainMain) ||
      levenshteinDistance(cleanQuery, domainMain) <= 1
    );
  }
  
  return false;
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

/**
 * Extract domain from organic search results
 */
function extractDomainFromOrganicResults(companyName: string, searchResults: any[], logger: Logger): string | undefined {
  const cleanCompanyName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const result of searchResults) {
    if (result.link) {
      try {
        const url = new URL(result.link);
        const hostname = url.hostname.toLowerCase().replace('www.', '');
        
        // Check if the domain matches the company name
        if (hostname.includes(cleanCompanyName) || cleanCompanyName.includes(hostname.split('.')[0])) {
          // Skip social media and reference sites
          if (!isSocialMediaOrReference(hostname)) {
            logger.info('Found matching domain in organic results', { 
              company: companyName, 
              domain: hostname,
              source: result.link 
            });
            return hostname;
          }
        }
      } catch (error) {
        logger.debug('Failed to parse URL from organic result', { url: result.link });
      }
    }
  }
  
  logger.debug('No matching domain found in organic results', { company: companyName });
  return undefined;
}

/**
 * Check if a hostname is a social media or reference site
 */
function isSocialMediaOrReference(hostname: string): boolean {
  const patterns = [
    'wikipedia.org', 'facebook.com', 'twitter.com', 'linkedin.com',
    'instagram.com', 'youtube.com', 'crunchbase.com', 'bloomberg.com',
    'reuters.com', 'forbes.com', 'techcrunch.com', 'glassdoor.com',
    'indeed.com', 'pitchbook.com', 'growjo.com', 'ibisworld.com'
  ];
  return patterns.some(pattern => hostname.includes(pattern));
}

/**
 * Extract rich company data from SerpAPI response using LLM
 */
async function extractRichCompanyData(companyName: string, serpResponse: any, logger: Logger): Promise<Partial<CompanyBasicInfo> | null> {
  try {
    // Initialize Bedrock for LLM extraction
    const config: AnalysisConfig = {
      model: process.env.BEDROCK_MODEL!,
      maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
      temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
    };
    
    const bedrockCore = new BedrockCore(config, logger, process.env.AWS_REGION);
    
    const systemPrompt = `You are a company data extraction specialist. Extract and validate company information from SerpAPI search results. You must return ONLY valid JSON format with no additional text, explanations, or markdown formatting. Focus on the company "${companyName}" specifically.`;

    const userPrompt = `Extract company information for "${companyName}" from this SerpAPI response:

${JSON.stringify(serpResponse, null, 2)}

Return ONLY a JSON object with these exact fields (no additional text, no markdown):
{
  "domain": "Official company website domain (e.g., 'okta.com', 'shopify.com') - extract from organic results, knowledge graph, or official website links",
  "description": "Brief company description (max 120 characters)",
  "industry": "Company industry/sector (e.g., 'Sportswear', 'Technology', 'Finance')",
  "location": "City, State/Province, Country (e.g., 'Herzogenaurach, Germany')",
  "employees": "Employee count with year (e.g., '61,055 as of 2025')",
  "size": "Company size/revenue information (e.g., '$14.9B revenue')",
  "founded": "Founding year (e.g., '1949')",
  "headquarters": "Detailed headquarters address (e.g., 'Adi-dassler-strasse 1, Herzogenaurach, Bavaria, 91074, Germany')"
}

Rules:
- Return ONLY the JSON object, no other text
- Focus on information specifically about "${companyName}"
- Extract the most recent/reliable data
- For domain: Look for official company websites in organic results, knowledge graph data, or any official website links
- Check organic results for domains that match the company name (e.g., if company is "okta", look for "okta.com")
- If a field cannot be determined, use null for that field
- Do not include any explanations or markdown formatting
- The description should be brief and professional (max 120 characters)`;

    const response = await bedrockCore.invokeModel({
      systemPrompt,
      userPrompt,
      maxTokens: 1000,
      temperature: 0.1
    });

    // Clean and parse the JSON response
    let cleanedResponse = response.trim();
    
    // Remove any markdown formatting if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to parse the JSON
    let extractedData;
    try {
      extractedData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      logger.error('JSON parsing failed, trying to extract JSON from response', { 
        response: cleanedResponse.substring(0, 500), // Log first 500 chars
        error: String(parseError) 
      });
      
      // Try to extract JSON from the response if it's wrapped in other text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch (secondError) {
          logger.error('Second JSON parsing attempt failed', { 
            jsonMatch: jsonMatch[0].substring(0, 500),
            error: String(secondError) 
          });
          return null;
        }
      } else {
        logger.error('No JSON object found in response', { 
          response: cleanedResponse.substring(0, 500) 
        });
        return null;
      }
    }
    
    logger.info('LLM extraction completed', { 
      company: companyName, 
      extractedFields: Object.keys(extractedData).filter(key => extractedData[key] !== null)
    });

    return extractedData;
  } catch (error) {
    logger.error('LLM extraction failed', { 
      company: companyName, 
      error: String(error) 
    });
    return null;
  }
}

/**
 * Get corrected query for common misspellings
 */
function getCorrectedQuery(query: string): string | null {
  const commonMisspellings: Record<string, string> = {
    'addidas': 'adidas',
    'nikee': 'nike',
    'nikke': 'nike',
    'shopifiy': 'shopify',
    'shopifi': 'shopify',
    'microsft': 'microsoft',
    'mircosoft': 'microsoft',
    'gooogle': 'google',
    'gogle': 'google',
    'amazn': 'amazon',
    'amazoon': 'amazon'
  };
  
  return commonMisspellings[query.toLowerCase()] || null;
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}