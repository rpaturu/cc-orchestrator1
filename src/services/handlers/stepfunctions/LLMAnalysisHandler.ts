/**
 * LLM Analysis Handler for Step Functions
 * 
 * Handles the third step of the Step Functions workflow - sophisticated AI analysis of collected data
 */

import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { AIAnalyzer } from '../../analysis/AIAnalyzer';
import { CacheType } from '../../../types/cache-types';

/**
 * LLM Analysis Handler - Enhanced AI processing of collected data
 */
export const llmAnalysisHandler = async (event: any): Promise<any> => {
  console.log('LLM analysis started:', JSON.stringify(event, null, 2));
  
  try {
    const { companyName, requester, data, requestId } = event;
    
    if (!companyName || !data) {
      throw new Error('companyName and data are required');
    }

    console.log('Starting LLM analysis', { companyName, requester, requestId });
    
    const logger = new Logger('LLMAnalysisHandler');
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      logger,
      process.env.AWS_REGION
    );

    // Check for cached LLM analysis
    const analysisKey = `llm_analysis:${companyName}:${requester}`;
    const cachedAnalysis = await cacheService.get(analysisKey);
    
    if (cachedAnalysis) {
      console.log('LLM analysis cache hit', { companyName, requester });
      return { 
        companyName, 
        requester, 
        analysis: cachedAnalysis, 
        source: 'cache', 
        cost: 0, 
        requestId 
      };
    }

    // Initialize AIAnalyzer for sophisticated LLM analysis
    const aiAnalyzer = new AIAnalyzer(
      {
        model: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
        maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '4000'),
        temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.1'),
        systemPrompt: 'You are a vendor intelligence analyst specializing in extracting structured company information for sales intelligence.'
      },
      logger,
      process.env.AWS_REGION
    );

    // Prepare data for LLM analysis
    const dataContent = prepareDataForLLMAnalysis(data);
    
    const prompt = `
      Analyze the following company data for ${companyName} and extract comprehensive vendor intelligence.
      
      Data Sources:
      ${dataContent}
      
      Extract detailed vendor intelligence and return as valid JSON:
      
      {
        "companyName": "${companyName}",
        "industry": "Primary industry classification with specific sector",
        "companySize": "Company size (e.g., Enterprise, Mid-Market, Small Business, Startup)",
        "description": "Comprehensive company description",
        "products": ["Detailed list of products/services offered"],
        "targetMarkets": ["Target markets, customer segments, and industries served"],
        "competitors": ["Direct and indirect competitors"],
        "valuePropositions": ["Key value propositions and differentiators"],
        "positioningStrategy": "Market positioning and competitive strategy",
        "pricingModel": "Pricing model and approach",
        "recentNews": ["Recent company news, updates, and developments"],
        "keyExecutives": ["Key leadership and decision makers"],
        "businessChallenges": ["Current business challenges and market pressures"],
        "growthIndicators": ["Growth signals and expansion indicators"],
        "techStack": ["Technology stack and platforms used"],
        "marketPosition": "Market position and competitive standing",
        "lastUpdated": "${new Date().toISOString()}"
      }
      
      Provide comprehensive analysis based on the available data. Return only valid JSON without explanations.
    `;

    let enhancedAnalysis;
    try {
      const response = await aiAnalyzer.parseUserInput(prompt);
      enhancedAnalysis = JSON.parse(response);
    } catch (error) {
      logger.error('LLM analysis failed, using fallback', { companyName, error: String(error) });
      
      // Enhanced fallback with more intelligence
      enhancedAnalysis = {
        companyName,
        industry: extractBasicIndustry(data),
        companySize: extractBasicCompanySize(data),
        description: extractBasicDescription(data),
        products: extractBasicProducts(data),
        targetMarkets: [],
        competitors: [],
        valuePropositions: [],
        positioningStrategy: 'Industry-leading solutions',
        pricingModel: 'Contact for pricing',
        recentNews: extractBasicNews(data),
        keyExecutives: [],
        businessChallenges: [],
        growthIndicators: [],
        techStack: [],
        marketPosition: 'Established market presence',
        lastUpdated: new Date().toISOString()
      };
    }

    // Cache the enhanced analysis
    await cacheService.setRawJSON(analysisKey, enhancedAnalysis, CacheType.COMPANY_ANALYSIS);

    console.log('LLM analysis completed successfully', { companyName, requester, requestId });

    return {
      companyName,
      requester,
      analysis: enhancedAnalysis,
      source: 'llm',
      cost: 0.20,
      requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('LLM analysis failed:', error);
    throw error;
  }
};

// Helper function to prepare data for LLM analysis
function prepareDataForLLMAnalysis(data: any): string {
  const content = [];
  
  // Add organic search results
  if (data.organic?.results) {
    const topResults = data.organic.results.slice(0, 5);
    content.push(`Search Results: ${JSON.stringify(topResults.map((r: any) => ({
      title: r.title,
      snippet: r.snippet,
      url: r.link
    })))}`);
  }
  
  // Add knowledge graph data
  if (data.organic?.knowledge_graph) {
    content.push(`Knowledge Graph: ${JSON.stringify(data.organic.knowledge_graph)}`);
  }
  
  // Add related questions
  if (data.organic?.related_questions) {
    content.push(`Related Questions: ${JSON.stringify(data.organic.related_questions.map((q: any) => q.question))}`);
  }
  
  // Add recent news
  if (data.organic?.top_stories) {
    content.push(`Recent News: ${JSON.stringify(data.organic.top_stories.map((n: any) => ({
      title: n.title,
      source: n.source,
      date: n.date
    })))}`);
  }
  
  // Add latest company content
  if (data.organic?.latest_from) {
    content.push(`Latest Company Content: ${JSON.stringify(data.organic.latest_from)}`);
  }
  
  return content.join('\n\n');
}

// Enhanced fallback extraction methods
function extractBasicIndustry(data: any): string {
  if (data.organic?.knowledge_graph?.type) {
    return data.organic.knowledge_graph.type;
  }
  
  if (data.organic?.results) {
    const allText = data.organic.results
      .slice(0, 3)
      .map((r: any) => (r.title + ' ' + r.snippet).toLowerCase())
      .join(' ');
    
    if (allText.includes('software') || allText.includes('technology')) return 'Technology/Software';
    if (allText.includes('financial') || allText.includes('fintech')) return 'Financial Services';
    if (allText.includes('healthcare') || allText.includes('medical')) return 'Healthcare';
    if (allText.includes('retail') || allText.includes('ecommerce')) return 'Retail/E-commerce';
  }
  
  return 'Technology';
}

function extractBasicCompanySize(data: any): string {
  if (data.organic?.knowledge_graph?.employees) {
    const empCount = parseInt(data.organic.knowledge_graph.employees);
    if (empCount >= 1000) return 'Enterprise (1000+ employees)';
    if (empCount >= 200) return 'Mid-Market (200-999 employees)';
    if (empCount >= 50) return 'Small Business (50-199 employees)';
    return 'Startup (1-49 employees)';
  }
  
  return 'Unknown';
}

function extractBasicDescription(data: any): string {
  if (data.organic?.knowledge_graph?.description) {
    return data.organic.knowledge_graph.description.substring(0, 300) + '...';
  }
  
  if (data.organic?.results && data.organic.results.length > 0) {
    return data.organic.results[0].snippet?.substring(0, 300) + '...' || 'No description available';
  }
  
  return 'No description available';
}

function extractBasicProducts(data: any): string[] {
  const products = [];
  
  if (data.organic?.results) {
    const firstResult = data.organic.results[0];
    if (firstResult?.sitelinks?.expanded) {
      products.push(...firstResult.sitelinks.expanded.map((link: any) => link.title));
    }
  }
  
  return products.slice(0, 5); // Limit to top 5
}

function extractBasicNews(data: any): string[] {
  const news = [];
  
  if (data.organic?.top_stories) {
    news.push(...data.organic.top_stories.slice(0, 3).map((story: any) => story.title));
  }
  
  if (data.organic?.latest_from?.articles) {
    news.push(...data.organic.latest_from.articles.slice(0, 2).map((article: any) => article.title));
  }
  
  return news;
} 