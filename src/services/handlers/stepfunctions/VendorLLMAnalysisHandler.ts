/**
 * Vendor LLM Analysis Handler
 * 
 * Specialized handler for vendor context analysis with enhanced prompts and data processing
 * Extracted from LLMAnalysisHandler.ts for better code organization and file size management
 */

import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { AIAnalyzer } from '../../analysis/AIAnalyzer';
import { JsonExtractor } from '../../utilities/JsonExtractor';
import { CacheType } from '../../../types/cache-types';
import { 
  LLMAnalysisEvent, 
  LLMAnalysisResponse, 
  VendorContextOutput,
  DataQuality 
} from './shared/LLMAnalysisTypes';
import { DatasetType } from '../../../types/dataset-requirements';
import { MultiSourceData } from '../../../types/orchestrator-types';

/**
 * Enhanced Vendor Context Analysis Handler
 */
export class VendorLLMAnalysisHandler {
  private logger: Logger;
  private cacheService: CacheService;
  private aiAnalyzer: AIAnalyzer;

  constructor(logger: Logger, region?: string) {
    this.logger = logger;
    this.cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      logger,
      region || process.env.AWS_REGION
    );

    // Initialize AIAnalyzer for vendor context analysis
    this.aiAnalyzer = new AIAnalyzer(
      {
        model: process.env.BEDROCK_MODEL!,
        maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
        temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
        systemPrompt: 'You are a vendor intelligence analyst specializing in extracting structured company information for sales positioning and competitive analysis.'
      },
      logger,
      region || process.env.AWS_REGION
    );
  }

  /**
   * Process vendor context analysis
   */
  async processVendorAnalysis(event: LLMAnalysisEvent): Promise<LLMAnalysisResponse> {
    const { companyName, requester, data, requestId, datasetsCollected } = event;
    
    // Build vendor-specific cache key (normalize case for consistency)
    const normalizedCompanyName = companyName.charAt(0).toUpperCase() + companyName.slice(1).toLowerCase();
    const analysisKey = `vendor_context_analysis:${normalizedCompanyName}:${requester}`;
    const cacheType = CacheType.VENDOR_CONTEXT_ANALYSIS;
    
    this.logger.info('Starting vendor context analysis', { 
      companyName, 
      normalizedCompanyName,
      requester, 
      requestId,
      datasetsCollected: datasetsCollected?.length || 0,
      cacheKey: analysisKey
    });

    // Check cache first
    const cachedAnalysis = await this.cacheService.get(analysisKey);
    
    if (cachedAnalysis) {
      this.logger.info('Vendor context analysis cache hit', { companyName, cacheKey: analysisKey });
      return { 
        companyName, 
        vendorCompany: null,
        requester, 
        analysis: cachedAnalysis, 
        source: 'cache', 
        cost: 0, 
        requestId,
        workflowStep: 'llm_analysis',
        workflowType: 'vendor_context',
        data: event.data
      };
    }

    // Build comprehensive vendor context prompt
    const prompt = this.buildVendorContextPrompt(companyName, data, datasetsCollected || []);
    
    let response: string = '';
    let enhancedAnalysis: any;
    let rawResponseKey: string = '';  // ✅ Declare outside try block for scope access
    
    try {
      this.logger.info('Invoking LLM for vendor context analysis');
      const startTime = Date.now();
      
      response = await this.aiAnalyzer.parseUserInput(prompt);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log the raw LLM response for debugging
      this.logger.info('Raw LLM response received for vendor context', {
        companyName,
        normalizedCompanyName,
        responseLength: response.length,
        responsePreview: response.substring(0, 500)
      });
      
      // Store raw LLM response in cache first (bypass Step Functions payload limits)
      rawResponseKey = `vendor_context_raw:${normalizedCompanyName}:${requester}`;
      await this.cacheService.setRawJSON(rawResponseKey, {
        rawResponse: response,
        metadata: {
          companyName,
          normalizedCompanyName,
          requester,
          requestId,
          timestamp: new Date().toISOString(),
          responseLength: response.length,
          estimatedTokens: Math.ceil(response.length / 4)
        }
      }, CacheType.LLM_RAW_RESPONSE);
      
      this.logger.info('Raw LLM response cached for debugging', {
        companyName,
        normalizedCompanyName,
        rawResponseKey,
        responseLength: response.length,
        estimatedTokens: Math.ceil(response.length / 4)
      });

      // ✅ Parse JSON from cached raw response (not truncated Step Functions response)
      // Retrieve the full raw response from cache to ensure we parse complete JSON
      const cachedRawData = await this.cacheService.getRawJSON(rawResponseKey);
      const fullRawResponse = cachedRawData?.rawResponse || response;
      
      this.logger.info('Parsing JSON from cached raw response', {
        companyName,
        originalResponseLength: response.length,
        cachedResponseLength: fullRawResponse.length,
        usedCachedVersion: fullRawResponse.length > response.length
      });

      // Use JsonExtractor for robust parsing of the FULL response
      const extractedAnalysis = JsonExtractor.extractAndParse(fullRawResponse, {
        logErrors: true,
        context: 'VendorContextAnalysis'
      });
      
      if (!extractedAnalysis) {
        // If JSON parsing fails, we still have the raw response in cache
        this.logger.error('JSON parsing failed but raw response preserved', {
          rawResponseKey,
          responseLength: fullRawResponse.length,
          originalLength: response.length
        });
        throw new Error(`Failed to extract JSON from LLM response. Raw response cached at: ${rawResponseKey}`);
      }
      
      enhancedAnalysis = extractedAnalysis;
      
      // Add metadata for vendor context
      enhancedAnalysis.last_updated = new Date().toISOString();
      enhancedAnalysis.data_quality = {
        completeness: (data as any).dataQuality?.completeness || 0.8,
        freshness: (data as any).dataQuality?.freshness || 0.7,
        reliability: (data as any).dataQuality?.reliability || 0.85,
        overall: (data as any).dataQuality?.overall || 0.78
      };
      
      this.logger.info('Vendor context analysis successful', {
        companyName,
        productsFound: enhancedAnalysis.products?.length || 0,
        competitorsFound: enhancedAnalysis.competitors?.length || 0,
        valuePropsFound: enhancedAnalysis.valuePropositions?.length || 0
      });
      
    } catch (parseError) {
      this.logger.error('Vendor context LLM parsing failed', { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
        companyName 
      });
      this.logger.error('Raw LLM response for debugging', { response: response.substring(0, 500) });
      enhancedAnalysis = this.generateFallbackVendorAnalysis(companyName, data);
    }

    // Cache the enhanced analysis
    await this.cacheService.setRawJSON(analysisKey, enhancedAnalysis, CacheType.VENDOR_CONTEXT_ANALYSIS);

    this.logger.info('Vendor context analysis completed', {
      companyName,
      normalizedCompanyName,
      requestId,
      analysisGenerated: true,
      cacheKey: analysisKey
    });

    // ✅ Return only cache reference to avoid 4KB Step Functions payload limit
    return { 
      companyName, 
      vendorCompany: null,
      requester, 
      analysisRef: analysisKey,  // ✅ Cache reference instead of full analysis
      source: 'llm', 
      cost: 0.02,
      requestId,
      workflowStep: 'llm_analysis',
      workflowType: 'vendor_context',
      data: event.data,
      rawResponseRef: rawResponseKey  // ✅ Also include raw response reference for debugging
    };
  }

  /**
   * Build comprehensive vendor context analysis prompt
   */
  private buildVendorContextPrompt(
    companyName: string,
    data: MultiSourceData,
    datasetsCollected: DatasetType[]
  ): string {
    const datasetContext = datasetsCollected.length > 0 ? `
Based on the collected datasets: ${datasetsCollected.join(', ')}
` : '';

    return `
You are a senior vendor intelligence analyst specializing in extracting comprehensive company intelligence for B2B sales positioning and competitive analysis.

Your task: Analyze ${companyName} to create a complete vendor profile that sales teams can use to understand their competitive position and sales approach.

Data Sources Available:
${this.prepareVendorDataForAnalysis(data)}

${datasetContext}

EXTRACTION GUIDELINES:
1. **Products/Services**: Look for specific product names, features, and capabilities mentioned in content
2. **Target Markets**: Identify customer segments, industries, and company sizes they serve
3. **Competitors**: Extract direct mentions of competitors and competitive comparisons
4. **Value Propositions**: Find unique selling points, benefits, and competitive advantages
5. **Market Position**: Understand their positioning strategy and market approach
6. **Recent Developments**: Identify news, product launches, partnerships, funding, or strategic changes
7. **Leadership**: Look for executive names, titles, and recent changes
8. **Business Context**: Understand challenges, growth signals, and market pressures
9. **Technology**: Identify tech stack, platforms, and technical capabilities
10. **Partnerships**: Find integration partners, channel partners, and strategic alliances

PRIORITIZE SPECIFIC, ACTIONABLE INFORMATION over generic descriptions.

Return ONLY valid JSON in this exact structure:

{
  "companyName": "${companyName}",
  "industry": "Specific industry classification (e.g., E-commerce Platform, CRM Software, Cloud Infrastructure)",
  "products": [
    "List specific products/services with names (e.g., 'Shopify Plus for Enterprise', 'Payment Gateway', 'POS System')"
  ],
  "targetMarkets": [
    "Specific target segments (e.g., 'Small to Medium E-commerce Businesses', 'Enterprise Retailers', 'DTC Brands')"
  ],
  "competitors": [
    "Direct competitors mentioned (e.g., 'WooCommerce', 'Magento', 'BigCommerce', 'Salesforce Commerce Cloud')"
  ],
  "valuePropositions": [
    "Specific value propositions (e.g., 'All-in-one e-commerce platform', 'No transaction fees', 'Easy setup and scaling')"
  ],
  "positioningStrategy": "Specific positioning approach (e.g., 'Democratizing e-commerce for entrepreneurs and SMBs')",
  "pricingModel": "Actual pricing model if mentioned (e.g., 'Subscription-based with transaction fees', 'Freemium with paid plans')",
  "companySize": "Actual size category based on data (e.g., 'Large Enterprise (10,000+ employees)', 'Public Company', 'Startup')",
  "marketPresence": "Geographic footprint (e.g., 'Global with strong presence in North America and Europe')",
  "recentNews": [
    "Recent developments with dates if available (e.g., 'Q2 2024: Launched new AI-powered analytics features')"
  ],
  "keyExecutives": [
    "Executive names and titles if mentioned (e.g., 'Tobias Lütke - CEO', 'Amy Shapero - CFO')"
  ],
  "businessChallenges": [
    "Current challenges mentioned (e.g., 'Increasing competition from Amazon', 'Economic downturn affecting SMB customers')"
  ],
  "growthIndicators": [
    "Growth signals mentioned (e.g., 'Expanding internationally', 'New product launches', 'Increased hiring')"
  ],
  "techStack": [
    "Technology platforms mentioned (e.g., 'Ruby on Rails', 'React', 'GraphQL', 'Kubernetes')"
  ],
  "partnerships": [
    "Key partnerships mentioned (e.g., 'Facebook for social selling', 'Google for ads integration', 'Stripe for payments')"
  ]
}

CRITICAL: If information is not found in the data, use empty arrays [] or "Not specified" rather than making assumptions. Be specific and evidence-based.
`;
  }

  /**
   * Prepare vendor data for enhanced LLM analysis with structured formatting
   */
  private prepareVendorDataForAnalysis(data: MultiSourceData): string {
    const sections = [];
    
    // Enhanced Knowledge Graph Processing
    if (data.organic?.knowledge_graph) {
      const kg = data.organic.knowledge_graph;
      sections.push(`=== COMPANY KNOWLEDGE GRAPH ===
Company: ${kg.title || 'N/A'}
Description: ${kg.description || 'N/A'}
Founded: ${kg.founded || 'N/A'}
Headquarters: ${kg.headquarters || 'N/A'}
Website: ${kg.website || 'N/A'}
Parent Company: ${kg.parent_company || 'N/A'}
Subsidiaries: ${kg.subsidiaries ? kg.subsidiaries.join(', ') : 'N/A'}`);
    }
    
    // Enhanced Organic Results Processing  
    if (data.organic?.organic_results) {
      const organicResults = data.organic.organic_results.slice(0, 5);
      sections.push(`=== COMPANY SEARCH RESULTS ===`);
      
      organicResults.forEach((result: any, index: number) => {
        sections.push(`
--- Result ${index + 1} ---
Title: ${result.title || 'N/A'}
URL: ${result.link || 'N/A'}
Snippet: ${result.snippet || 'N/A'}
Source: ${result.source || 'N/A'}`);
        
        // Extract sitelinks for product information
        if (result.sitelinks?.expanded) {
          sections.push(`Product/Service Links: ${JSON.stringify(result.sitelinks.expanded)}`);
        }
      });
    }
    
    // Enhanced News Processing
    if (data.news?.news_results) {
      const newsResults = data.news.news_results.slice(0, 5);
      sections.push(`=== RECENT NEWS & DEVELOPMENTS ===`);
      
      newsResults.forEach((news: any, index: number) => {
        sections.push(`
--- News ${index + 1} ---
Headline: ${news.title || 'N/A'}
Date: ${news.date || 'N/A'}
Source: ${news.source || 'N/A'}
Summary: ${news.snippet || 'N/A'}
URL: ${news.link || 'N/A'}`);
      });
    }
    
    // Enhanced Jobs Processing for Tech Stack & Growth
    if (data.jobs?.jobs_results) {
      const jobResults = data.jobs.jobs_results.slice(0, 5);
      sections.push(`=== JOB POSTINGS & TECH STACK ===`);
      
      jobResults.forEach((job: any, index: number) => {
        sections.push(`
--- Job ${index + 1} ---
Title: ${job.title || 'N/A'}
Location: ${job.location || 'N/A'}
Company: ${job.company_name || 'N/A'}
Description: ${job.description?.substring(0, 300) || 'N/A'}...
Posted: ${job.detected_extensions?.posted_at || 'N/A'}`);
      });
    }
    
    // Related Questions for Competitive Intelligence
    if (data.organic?.related_questions) {
      sections.push(`=== RELATED QUESTIONS & COMPARISONS ===`);
      data.organic.related_questions.slice(0, 5).forEach((question: any, index: number) => {
        sections.push(`
--- Question ${index + 1} ---
Q: ${question.question || 'N/A'}
Snippet: ${question.snippet || 'N/A'}
Source: ${question.source || 'N/A'}`);
      });
    }
    
    // LinkedIn Data for Leadership
    if (data.linkedin?.linkedin_results) {
      sections.push(`=== LINKEDIN & LEADERSHIP ===
${JSON.stringify(data.linkedin.linkedin_results)}`);
    }
    
    return sections.join('\n\n');
  }

  /**
   * Generate fallback vendor analysis if LLM fails
   */
  private generateFallbackVendorAnalysis(
    companyName: string, 
    data: MultiSourceData
  ): VendorContextOutput {
    return {
      companyName,
      industry: 'Technology',
      products: [],
      targetMarkets: [],
      competitors: [],
      valuePropositions: [],
      positioningStrategy: 'Market-leading solutions provider',
      pricingModel: 'Contact for pricing',
      companySize: 'Unknown',
      marketPresence: 'Established market presence',
      recentNews: [],
      keyExecutives: [],
      businessChallenges: [],
      growthIndicators: [],
      techStack: [],
      partnerships: [],
      data_quality: {
        completeness: 0.4,
        freshness: 0.5,
        reliability: 0.6,
        overall: 0.5
      },
      last_updated: new Date().toISOString()
    };
  }
} 