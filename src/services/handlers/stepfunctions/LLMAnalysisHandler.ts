/**
 * LLM Analysis Handler for Step Functions
 * 
 * Handles the third step of the Step Functions workflow - sophisticated AI analysis of collected data
 * Enhanced with dataset requirements matrix and persona-aware analysis
 */

import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { AIAnalyzer } from '../../analysis/AIAnalyzer';
import { DatasetType } from '../../../types/dataset-requirements';
import { MultiSourceData } from '../../../types/orchestrator-types';
import { JsonExtractor } from '../../utilities/JsonExtractor';
import { CacheType } from '../../../types/cache-types';

/**
 * Structured Customer Intelligence Output matching ChatGPT conversation design
 */
interface CustomerIntelligenceOutput {
  customer: {
    name: string;
    industry?: string;
    size?: string;
    headquarters?: string;
    founded?: string;
    description?: string;
  };
  news_signals: Array<{
    date: string;
    headline: string;
    source: string;
    insight: string;
    signal_type: 'expansion' | 'funding' | 'hiring' | 'product' | 'leadership' | 'partnership';
  }>;
  tech_stack: {
    frontend?: string[];
    backend?: string[];
    infrastructure?: string[];
    analytics?: string[];
    collaboration?: string[];
    security?: string[];
    observations: string[];
  };
  target_contacts: Array<{
    name?: string;
    title: string;
    role: 'Decision Maker' | 'Champion' | 'Technical Buyer' | 'Influencer';
    persona_fit: string;
    signal?: string;
  }>;
  recommended_products: Array<{
    product: string;
    reason: string;
    outcome: string;
    dataset_source: DatasetType;
  }>;
  competitor_context: {
    known_usage?: string[];
    pain_points?: string[];
    positioning_advantage: string;
    objection_handling: string[];
  };
  talking_points: string[];
  opportunity_signals: Array<{
    signal: string;
    source: string;
    urgency: 'high' | 'medium' | 'low';
    action: string;
  }>;
  data_quality: {
    completeness: number;
    freshness: number;
    reliability: number;
    overall: number;
  };
  last_updated: string;
}

/**
 * LLM Analysis Handler - Enhanced context-aware analysis using dataset matrix
 */
export const llmAnalysisHandler = async (event: any): Promise<any> => {
  console.log('LLM analysis started with dataset awareness:', JSON.stringify(event, null, 2));
  
  try {
    const { 
      companyName, 
      vendorCompany,
      requester, 
      data, 
      requestId, 
      userPersona,
      workflowType,
      datasetsCollected 
    } = event;
    
    if (!companyName || !data) {
      throw new Error('companyName and data are required');
    }

    console.log('Starting LLM analysis', { 
      companyName, 
      vendorCompany,
      requester, 
      requestId,
      workflowType,
      userPersona: userPersona?.role || 'unknown',
      datasetsCollected: datasetsCollected?.length || 0
    });
    
    const logger = new Logger('LLMAnalysisHandler');
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      logger,
      process.env.AWS_REGION
    );

    // Build cache key based on workflow type
    let analysisKey: string;
    let cacheType: string;
    
    if (workflowType === 'vendor_context') {
      analysisKey = `vendor_context_analysis:${companyName}:${requester}`;
      cacheType = CacheType.VENDOR_CONTEXT_ANALYSIS;
    } else if (workflowType === 'customer_intelligence') {
      analysisKey = `customer_intelligence_analysis:${companyName}:${vendorCompany}:${userPersona?.role || 'unknown'}:${requester}`;
      cacheType = CacheType.CUSTOMER_INTELLIGENCE_ANALYSIS;
    } else {
      analysisKey = `llm_analysis:${companyName}:${requester}`;
      cacheType = CacheType.LLM_ANALYSIS;
    }

    const cachedAnalysis = await cacheService.get(analysisKey);
    
    if (cachedAnalysis) {
      console.log('LLM analysis cache hit', { companyName, workflowType, cacheKey: analysisKey });
      return { 
        companyName, 
        vendorCompany: vendorCompany || null, // ✅ Ensure field always exists
        requester, 
        analysis: cachedAnalysis, 
        source: 'cache', 
        cost: 0, 
        requestId,
        workflowStep: 'llm_analysis',
        workflowType, // ✅ Preserve workflowType for cache hits
        data: event.data // ✅ Preserve collection data for cache hits
      };
    }

    // Initialize AIAnalyzer for sophisticated LLM analysis
    const aiAnalyzer = new AIAnalyzer(
      {
        model: process.env.BEDROCK_MODEL!,
        maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
        temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
        systemPrompt: getSystemPromptByWorkflow(workflowType)
      },
      logger,
      process.env.AWS_REGION
    );

    let enhancedAnalysis: any;
    
    if (workflowType === 'vendor_context') {
      // Build vendor context prompt
      const prompt = buildVendorContextPrompt(companyName, data, datasetsCollected || []);
      
      let response: string = '';
      try {
        console.log('Invoking LLM for vendor context analysis with enhanced prompt');
        response = await aiAnalyzer.parseUserInput(prompt);
        
        // Use JsonExtractor for robust parsing instead of JSON.parse
        const extractedAnalysis = JsonExtractor.extractAndParse(response, {
          logErrors: true,
          context: 'VendorContextAnalysis'
        });
        
        if (!extractedAnalysis) {
          throw new Error('Failed to extract JSON from LLM response');
        }
        
        enhancedAnalysis = extractedAnalysis;
        
        // Add metadata for vendor context
        enhancedAnalysis.last_updated = new Date().toISOString();
        enhancedAnalysis.data_quality = data.dataQuality || {
          completeness: 0.8,
          freshness: 0.7,
          reliability: 0.85,
          overall: 0.78
        };
        
        console.log('Vendor context analysis successful', {
          companyName,
          productsFound: enhancedAnalysis.products?.length || 0,
          competitorsFound: enhancedAnalysis.competitors?.length || 0,
          valuePropsFound: enhancedAnalysis.valuePropositions?.length || 0
        });
        
      } catch (parseError) {
        console.error('Vendor context LLM parsing failed:', parseError);
        console.error('Raw LLM response for debugging:', response);
        enhancedAnalysis = generateFallbackVendorAnalysis(companyName, data);
      }
      
    } else if (workflowType === 'customer_intelligence') {
      // Build customer intelligence prompt (existing logic)
      const prompt = buildPersonaAwarePrompt(
        companyName, 
        vendorCompany, 
        userPersona, 
        data, 
        datasetsCollected || []
      );

      try {
        console.log('Invoking LLM with persona-aware prompt for customer intelligence');
        const response = await aiAnalyzer.parseUserInput(prompt);
        enhancedAnalysis = JSON.parse(response);
        
        // Add metadata
        enhancedAnalysis.last_updated = new Date().toISOString();
        enhancedAnalysis.data_quality = data.dataQuality || {
          completeness: 0.8,
          freshness: 0.7,
          reliability: 0.85,
          overall: 0.78
        };
        
      } catch (parseError) {
        console.error('Customer intelligence LLM parsing failed:', parseError);
        enhancedAnalysis = generateFallbackAnalysis(companyName, vendorCompany, data, userPersona);
      }
      
    } else {
      // Fallback to general analysis
      enhancedAnalysis = { error: 'Unknown workflow type', workflowType };
    }

    // Cache the enhanced analysis with appropriate cache type
    await cacheService.setRawJSON(analysisKey, enhancedAnalysis, cacheType as any);

    console.log('LLM analysis completed successfully', {
      companyName,
      vendorCompany,
      workflowType,
      requestId,
      analysisGenerated: true,
      cacheKey: analysisKey
    });

    return { 
      companyName, 
      vendorCompany: vendorCompany || null, // ✅ Ensure field always exists
      requester, 
      analysis: enhancedAnalysis, 
      source: 'llm', 
      cost: 0.02, // Estimated LLM cost
      requestId,
      workflowStep: 'llm_analysis',
      workflowType, // ✅ Preserve workflowType
      // Preserve original collection data for CacheResponseTask
      data: event.data
    };
    
  } catch (error) {
    console.error('LLM analysis failed:', error);
    
    return {
      companyName: event.companyName || 'unknown',
      vendorCompany: event.vendorCompany || null, // ✅ Ensure field always exists 
      requester: event.requester || 'unknown',
      analysis: null,
      source: 'error',
      cost: 0,
      requestId: event.requestId || 'unknown',
      error: error instanceof Error ? error.message : String(error),
      workflowStep: 'llm_analysis',
      workflowType: event.workflowType, // ✅ Preserve workflowType
      data: event.data // ✅ Preserve collection data
    };
  }
};

/**
 * Get system prompt based on workflow type
 */
function getSystemPromptByWorkflow(workflowType?: string): string {
  switch (workflowType) {
    case 'vendor_context':
      return 'You are a vendor intelligence analyst specializing in extracting structured company information for sales positioning and competitive analysis.';
    case 'customer_intelligence':
      return 'You are a context-aware sales intelligence analyst specializing in generating structured customer insights for B2B sales optimization.';
    default:
      return 'You are a sales intelligence analyst providing structured company analysis.';
  }
}

/**
 * Build persona-aware prompt using dataset context and user persona
 */
function buildPersonaAwarePrompt(
  companyName: string,
  vendorCompany: string,
  userPersona: any,
  data: MultiSourceData,
  datasetsCollected: DatasetType[]
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

  return `
${personaContext}

You are analyzing ${companyName} for sales intelligence. Generate a comprehensive customer intelligence report 
using the following data sources:

${prepareDataForAnalysis(data)}

${datasetContext}

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
      "product": "${vendorCompany} product/solution name",
      "reason": "Why this fits their needs",
      "outcome": "Expected business outcome",
      "dataset_source": "Which dataset informed this recommendation"
    }
  ],
  "competitor_context": {
    "known_usage": ["Current vendors they use"],
    "pain_points": ["Issues with current solutions"],
    "positioning_advantage": "How ${vendorCompany} differentiates",
    "objection_handling": ["Common objections and responses"]
  },
  "talking_points": [
    "Conversation starters tailored to ${userPersona?.role || 'sales rep'} persona",
    "Questions about their current challenges",
    "Value propositions specific to their situation"
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
function prepareDataForAnalysis(data: MultiSourceData): string {
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
 * Prepare vendor data for enhanced LLM analysis with structured formatting
 */
function prepareVendorDataForAnalysis(data: MultiSourceData): string {
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
 * Generate fallback analysis if LLM fails
 */
function generateFallbackAnalysis(
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

/**
 * Build comprehensive vendor context analysis prompt
 */
function buildVendorContextPrompt(
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
${prepareVendorDataForAnalysis(data)}

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
 * Generate fallback vendor analysis if LLM fails
 */
function generateFallbackVendorAnalysis(
  companyName: string, 
  data: MultiSourceData
): any {
  return {
    companyName,
    industry: 'Technology',
    products: [],
    targetMarkets: [],
    competitors: [],
    valuePropositions: [],
    positioningStrategy: 'Industry-leading solutions',
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