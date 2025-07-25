/**
 * Customer LLM Analysis Handler
 * 
 * Specialized handler for customer intelligence analysis with persona-aware prompts and data processing
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
  CustomerIntelligenceOutput 
} from './shared/LLMAnalysisTypes';
import { DatasetType } from '../../../types/dataset-requirements';
import { MultiSourceData } from '../../../types/orchestrator-types';

/**
 * Enhanced Customer Intelligence Analysis Handler
 */
export class CustomerLLMAnalysisHandler {
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

    // Initialize AIAnalyzer for customer intelligence analysis
    this.aiAnalyzer = new AIAnalyzer(
      {
        model: process.env.BEDROCK_MODEL!,
        maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
        temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
        systemPrompt: 'You are a context-aware sales intelligence analyst specializing in generating structured customer insights for B2B sales optimization.'
      },
      logger,
      region || process.env.AWS_REGION
    );
  }

  /**
   * Process customer intelligence analysis
   */
  async processCustomerAnalysis(event: LLMAnalysisEvent): Promise<LLMAnalysisResponse> {
    const { 
      companyName, 
      vendorCompany, 
      requester, 
      data, 
      requestId, 
      userPersona,
      datasetsCollected 
    } = event;
    
    this.logger.info('Starting customer intelligence analysis', { 
      companyName, 
      vendorCompany,
      requester, 
      requestId,
      userPersona: userPersona?.role || 'unknown',
      datasetsCollected: datasetsCollected?.length || 0
    });

    // Build customer-specific cache key
    const analysisKey = `customer_intelligence_analysis:${companyName}:${vendorCompany}:${userPersona?.role || 'unknown'}:${requester}`;
    
    // Check cache first
    const cachedAnalysis = await this.cacheService.get(analysisKey);
    
    if (cachedAnalysis) {
      this.logger.info('Customer intelligence analysis cache hit', { companyName, cacheKey: analysisKey });
      return { 
        companyName, 
        vendorCompany: vendorCompany || null,
        requester, 
        analysis: cachedAnalysis, 
        source: 'cache', 
        cost: 0, 
        requestId,
        workflowStep: 'llm_analysis',
        workflowType: 'customer_intelligence',
        data: event.data
      };
    }

    // Retrieve vendor context data if available for enhanced analysis
    let vendorContext = null;
    if (vendorCompany) {
      try {
        // Use normalized case (same as VendorLLMAnalysisHandler)
        const normalizedVendor = vendorCompany.charAt(0).toUpperCase() + vendorCompany.slice(1).toLowerCase();
        let vendorAnalysisKey = `vendor_context_analysis:${normalizedVendor}:vendor_context`;
        vendorContext = await this.cacheService.getRawJSON(vendorAnalysisKey);
        
        this.logger.info('Looking for vendor context with normalized key', { 
          vendorCompany,
          normalizedVendor,
          vendorAnalysisKey,
          found: !!vendorContext
        });
        
        if (!vendorContext) {
          // Try vendor context reference as fallback
          const vendorRefKey = `vendor_context_ref:${vendorCompany.toLowerCase().replace(/\s+/g, '_')}`;
          const vendorRef = await this.cacheService.getRawJSON(vendorRefKey);
          vendorContext = vendorRef?.analysis;
        }
        
        if (vendorContext) {
          this.logger.info('Retrieved vendor context for enhanced customer intelligence', {
            vendorCompany,
            cacheKey: vendorAnalysisKey,
            hasProducts: !!vendorContext.products,
            hasValueProps: !!vendorContext.valuePropositions,
            hasCompetitors: !!vendorContext.competitors,
            productsCount: vendorContext.products?.length || 0,
            valuePropsCount: vendorContext.valuePropositions?.length || 0,
            competitorsCount: vendorContext.competitors?.length || 0
          });
        } else {
          this.logger.warn('No vendor context found despite trying multiple keys', {
            vendorCompany,
            keysAttempted: [
              `vendor_context_analysis:${vendorCompany}:vendor_context`,
              `vendor_context_analysis:${vendorCompany.charAt(0).toUpperCase() + vendorCompany.slice(1).toLowerCase()}:vendor_context`,
              `vendor_context_ref:${vendorCompany.toLowerCase().replace(/\s+/g, '_')}`
            ]
          });
        }
      } catch (error) {
        this.logger.error('Error retrieving vendor context', { vendorCompany, error: String(error) });
      }
    }

    // Build persona-aware customer intelligence prompt with vendor context
    const prompt = this.buildPersonaAwarePrompt(
      companyName, 
      vendorCompany || '', 
      userPersona, 
      data, 
      datasetsCollected || [],
      vendorContext  // ✅ Pass rich vendor context data
    );
    
    // Log prompt size and token estimates for debugging
    const promptLength = prompt.length;
    const estimatedInputTokens = Math.ceil(promptLength / 4); // Rough estimate: 4 chars per token
    const maxTokens = parseInt(process.env.BEDROCK_MAX_TOKENS!);
    const remainingTokensForResponse = maxTokens - estimatedInputTokens;
    
    this.logger.info('Prompt size analysis for token debugging', {
      companyName,
      vendorCompany,
      promptLength,
      estimatedInputTokens,
      maxTokens,
      remainingTokensForResponse,
      hasVendorContext: !!vendorContext,
      vendorContextSize: vendorContext ? JSON.stringify(vendorContext).length : 0,
      datasetsCount: datasetsCollected?.length || 0
    });
    
    if (remainingTokensForResponse < 2000) {
      this.logger.warn('Very few tokens remaining for response - may cause truncation', {
        remainingTokensForResponse,
        promptLength,
        maxTokens
      });
    }
    
    let response: string = '';
    let enhancedAnalysis: any;
    let rawResponseKey: string = '';  // ✅ Declare outside try block for scope access
    
    try {
      this.logger.info('Invoking LLM with persona-aware prompt for customer intelligence');
      const startTime = Date.now();
      
      response = await this.aiAnalyzer.parseUserInput(prompt);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log the raw LLM response for debugging
      this.logger.info('Raw LLM response received for customer intelligence', {
        companyName,
        vendorCompany,
        responseLength: response.length,
        responsePreview: response.substring(0, 500),
        responseSuffix: response.length > 500 ? response.substring(response.length - 200) : null,
        duration,
        estimatedResponseTokens: Math.ceil(response.length / 4),
        isResponseComplete: response.includes('"}') || response.includes('"]\n}'),
        endsAbruptly: !response.trim().endsWith('}') && !response.trim().endsWith(']')
      });
      
      // Store raw LLM response in cache first (bypass Step Functions payload limits)
      rawResponseKey = `customer_intelligence_raw:${companyName}:${vendorCompany || 'unknown'}:${userPersona?.role || 'unknown'}:${requester}`;
      await this.cacheService.setRawJSON(rawResponseKey, {
        rawResponse: response,
        metadata: {
          companyName,
          vendorCompany,
          userPersona: userPersona?.role || 'unknown',
          requestId,
          timestamp: new Date().toISOString(),
          responseLength: response.length,
          estimatedTokens: Math.ceil(response.length / 4)
        }
      }, CacheType.LLM_RAW_RESPONSE);
      
      this.logger.info('Raw LLM response cached for debugging', {
        companyName,
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
        context: 'CustomerIntelligenceAnalysis'
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
      
      // Add metadata for customer intelligence
      enhancedAnalysis.last_updated = new Date().toISOString();
      enhancedAnalysis.data_quality = {
        completeness: (data as any).dataQuality?.completeness || 0.8,
        freshness: (data as any).dataQuality?.freshness || 0.7,
        reliability: (data as any).dataQuality?.reliability || 0.85,
        overall: (data as any).dataQuality?.overall || 0.78
      };
      
      this.logger.info('Customer intelligence analysis successful', {
        companyName,
        vendorCompany,
        newsSignalsFound: enhancedAnalysis.news_signals?.length || 0,
        contactsFound: enhancedAnalysis.target_contacts?.length || 0,
        opportunitiesFound: enhancedAnalysis.opportunity_signals?.length || 0
      });
      
    } catch (parseError) {
      this.logger.error('Customer intelligence LLM parsing failed', { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
        companyName,
        vendorCompany,
        responseLength: response?.length || 0,
        maxTokens,
        promptLength,
        estimatedInputTokens,
        remainingTokensForResponse,
        responseEndsAbruptly: response ? !response.trim().endsWith('}') && !response.trim().endsWith(']') : true,
        responsePreview: response ? response.substring(0, 1000) : null,
        responseSuffix: response && response.length > 1000 ? response.substring(response.length - 500) : null
      });
      this.logger.error('Raw LLM response for debugging', { response: response.substring(0, 500) });
      enhancedAnalysis = this.generateFallbackAnalysis(companyName, vendorCompany || '', data, userPersona);
    }

    // Cache the enhanced analysis
    await this.cacheService.setRawJSON(analysisKey, enhancedAnalysis, CacheType.CUSTOMER_INTELLIGENCE_ANALYSIS);

    this.logger.info('Customer intelligence analysis completed', {
      companyName,
      vendorCompany,
      requestId,
      analysisGenerated: true,
      cacheKey: analysisKey
    });

    // ✅ Return only cache reference to avoid 4KB Step Functions payload limit
    return { 
      companyName, 
      vendorCompany: vendorCompany || null,
      requester, 
      analysisRef: analysisKey,  // ✅ Cache reference instead of full analysis
      source: 'llm', 
      cost: 0.02,
      requestId,
      workflowStep: 'llm_analysis',
      workflowType: 'customer_intelligence',
      data: event.data,
      rawResponseRef: rawResponseKey  // ✅ Also include raw response reference for debugging
    };
  }

  /**
   * Build persona-aware prompt using dataset context and user persona
   */
  private buildPersonaAwarePrompt(
    companyName: string,
    vendorCompany: string,
    userPersona: any,
    data: MultiSourceData,
    datasetsCollected: DatasetType[],
    vendorContext?: any  // ✅ Rich vendor analysis data
  ): string {
    const personaContext = userPersona ? `
You are helping a ${userPersona.role} (${userPersona.name}) in the ${userPersona.segment || 'General'} segment 
covering the ${userPersona.region || 'Global'} region. They represent ${vendorCompany}.

Tailor your analysis for a ${userPersona.role}:
- AE: Focus on opportunity development, decision makers, and competitive positioning
- CSM: Focus on expansion signals, health indicators, and stakeholder mapping  
- SE: Focus on technical fit, integration challenges, and architecture alignment
` : '';

    const datasetContext = datasetsCollected.length > 0 ? `
Based on the collected datasets: ${datasetsCollected.join(', ')}
` : '';

    // Build vendor context section if available
    const vendorContextSection = vendorContext ? `

VENDOR CONTEXT (${vendorCompany}):
- Products/Solutions: ${vendorContext.products?.join(', ') || 'Not specified'}
- Value Propositions: ${vendorContext.valuePropositions?.join(', ') || 'Not specified'}
- Target Markets: ${vendorContext.targetMarkets?.join(', ') || 'Not specified'}
- Positioning: ${vendorContext.positioningStrategy || 'Not specified'}
- Pricing Model: ${vendorContext.pricingModel || 'Not specified'}
- Key Competitors: ${vendorContext.competitors?.join(', ') || 'Not specified'}
- Tech Stack: ${vendorContext.techStack?.join(', ') || 'Not specified'}

Use this vendor context to provide specific, actionable recommendations rather than generic suggestions.
Focus particularly on:
- Recommending specific vendor products that match customer needs
- Positioning vendor value props against customer pain points  
- Leveraging vendor competitive advantages
- Creating relevant talking points based on vendor strengths
` : `

VENDOR CONTEXT: Limited vendor context available for ${vendorCompany}. Focus on general recommendations.
`;

    return `
${personaContext}

You are analyzing ${companyName} for sales intelligence. Generate a comprehensive customer intelligence report 
using the following data sources:

${this.prepareDataForAnalysis(data)}

${datasetContext}
${vendorContextSection}

Return ONLY valid JSON in this exact structure:

{
  "customer": {
    "name": "${companyName}",
    "industry": "Primary industry",
    "size": "Employee count or size category", 
    "headquarters": "Location",
    "founded": "Year founded",
    "description": "Company description"
  },
  "news_signals": [
    {
      "date": "YYYY-MM",
      "headline": "Recent news headline",
      "source": "News source",
      "insight": "Strategic insight from this news",
      "signal_type": "expansion|funding|hiring|product|leadership|partnership"
    }
  ],
  "tech_stack": {
    "frontend": ["Technologies"],
    "backend": ["Technologies"], 
    "infrastructure": ["Cloud/infra"],
    "analytics": ["Analytics tools"],
    "collaboration": ["Collaboration tools"],
    "security": ["Security tools"],
    "observations": ["Key technical insights for ${vendorCompany} positioning"]
  },
  "target_contacts": [
    {
      "name": "Contact name if available",
      "title": "Job title",
      "role": "Decision Maker|Champion|Technical Buyer|Influencer",
      "persona_fit": "Why this person matters for ${userPersona?.role || 'sales rep'}",
      "signal": "Recent activity or relevance signal"
    }
  ],
  "recommended_products": [
    {
      "product": "Specific ${vendorCompany} product/solution from vendor context",
      "reason": "Why this specific product fits their business needs and challenges",
      "outcome": "Expected business outcome aligned with their goals",
      "dataset_source": "Which dataset informed this recommendation",
      "vendor_alignment": "How this leverages ${vendorCompany}'s positioning and value props"
    }
  ],
  "competitor_context": {
    "known_usage": ["Current vendors they use based on tech stack analysis"],
    "pain_points": ["Issues with current solutions that ${vendorCompany} can solve"],
    "positioning_advantage": "How ${vendorCompany}'s specific value propositions address their needs vs competitors",
    "objection_handling": ["Common objections and how to address them using vendor strengths"],
    "competitive_intel": "Analysis of how ${vendorCompany} compares to their likely current solutions"
  },
  "talking_points": [
    "Conversation starters that connect their business challenges to ${vendorCompany}'s specific value propositions",
    "Questions about their current tech stack and pain points that align with vendor solutions",
    "Strategic insights based on vendor context analysis and their business needs",
    "Competitive positioning statements using ${vendorCompany}'s differentiation factors"
  ],
  "opportunity_signals": [
    {
      "signal": "Specific opportunity indicator",
      "source": "Where this signal came from",
      "urgency": "high|medium|low",
      "action": "Recommended next step"
    }
  ]
}

Focus on actionable insights. Be specific and avoid generic advice.
`;
  }

  /**
   * Prepare collected data for LLM analysis
   */
  private prepareDataForAnalysis(data: MultiSourceData): string {
    const sections = [];
    
    if (data.organic?.organic_results) {
      sections.push(`Company Search Results: ${JSON.stringify(data.organic.organic_results.slice(0, 5))}`);
    }
    
    if (data.organic?.knowledge_graph) {
      sections.push(`Knowledge Graph: ${JSON.stringify(data.organic.knowledge_graph)}`);
    }
    
    if (data.news?.news_results) {
      sections.push(`Recent News: ${JSON.stringify(data.news.news_results.slice(0, 5))}`);
    }
    
    if (data.jobs?.jobs_results) {
      sections.push(`Job Postings: ${JSON.stringify(data.jobs.jobs_results.slice(0, 5))}`);
    }
    
    if (data.linkedin?.linkedin_results) {
      sections.push(`LinkedIn Data: ${JSON.stringify(data.linkedin.linkedin_results)}`);
    }
    
    return sections.join('\n\n');
  }

  /**
   * Generate fallback analysis if LLM fails
   */
  private generateFallbackAnalysis(
    companyName: string, 
    vendorCompany: string, 
    data: MultiSourceData,
    userPersona: any
  ): CustomerIntelligenceOutput {
    return {
      customer: {
        name: companyName,
        industry: undefined,
        size: undefined,
        description: `Analysis target: ${companyName}`
      },
      news_signals: [],
      tech_stack: {
        observations: ['Technical analysis requires additional data collection']
      },
      target_contacts: [
        {
          title: 'Decision Maker',
          role: 'Decision Maker',
          persona_fit: `Key contact for ${userPersona?.role || 'sales'} outreach`
        }
      ],
      recommended_products: [],
      competitor_context: {
        positioning_advantage: `${vendorCompany} positioning analysis requires additional data`,
        objection_handling: []
      },
      talking_points: [
        `Research ${companyName}'s current challenges and initiatives`,
        `Understand their technology preferences and constraints`,
        `Identify decision-making process and timeline`
      ],
      opportunity_signals: [],
      data_quality: {
        completeness: 0.5,
        freshness: 0.6,
        reliability: 0.7,
        overall: 0.6
      },
      last_updated: new Date().toISOString()
    };
  }
} 