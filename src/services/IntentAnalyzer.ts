/**
 * Intent Analyzer Service
 * 
 * Handles natural language processing, intent detection, and dynamic query generation
 * for the chat interface and conversational AI features.
 */

import { CompanyExtractor } from './CompanyExtractor';
import { SearchQueryBuilder } from './SearchQueryBuilder';

export interface UserIntent {
  type: string;
  confidence: number;
  entities: {
    companies: string[];
    keywords: string[];
    timeframe?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
}

export interface DynamicQueryResult {
  queries: string[];
  intent: string;
  confidence: number;
  strategy: string;
  extractedCompanies: {
    target?: string;
    seller?: string;
  };
}

export class IntentAnalyzer {
  
  /**
   * Parse natural language input and generate dynamic search queries
   * Examples: 
   * - "Tell me about Shopify's challenges" -> generates challenge-focused queries
   * - "How can Atlassian help Shopify?" -> generates relationship queries
   * - "What's Shopify's technology stack?" -> generates tech-focused queries
   */
  static async generateDynamicQueries(
    userInput: string, 
    targetCompany?: string, 
    sellerCompany?: string
  ): Promise<DynamicQueryResult> {
    const intent = this.detectUserIntent(userInput);
    const extractedCompanies = this.extractCompaniesFromInput(userInput, targetCompany, sellerCompany);
    
    const queries = SearchQueryBuilder.buildQueriesFromIntent(
      intent, 
      extractedCompanies.target!, 
      extractedCompanies.seller
    );
    
    return {
      queries,
      intent: intent.type,
      confidence: intent.confidence,
      strategy: extractedCompanies.seller ? 'relationship-aware' : 'context-specific',
      extractedCompanies
    };
  }

  /**
   * Detect user intent from natural language input
   */
  static detectUserIntent(input: string): UserIntent {
    const inputLower = input.toLowerCase();
    
    // Intent patterns with confidence scores
    const intentPatterns = [
      { pattern: /(?:challenge|problem|issue|pain|difficult|struggle|obstacle)/i, type: 'challenges', confidence: 0.9 },
      { pattern: /(?:partnership|integration|work together|collaborate|partner)/i, type: 'relationship', confidence: 0.9 },
      { pattern: /(?:technology|tech stack|software|tools|platform|system)/i, type: 'technology', confidence: 0.8 },
      { pattern: /(?:competitor|competition|versus|vs|compare|competitive)/i, type: 'competitive', confidence: 0.8 },
      { pattern: /(?:financial|revenue|funding|valuation|money|profit|earnings)/i, type: 'financial', confidence: 0.8 },
      { pattern: /(?:news|recent|latest|update|development|announcement)/i, type: 'news', confidence: 0.7 },
      { pattern: /(?:leadership|ceo|executive|team|management|founder)/i, type: 'leadership', confidence: 0.7 },
      { pattern: /(?:how can|help|solution|benefit|assist|support)/i, type: 'solution', confidence: 0.8 },
      { pattern: /(?:overview|about|summary|profile|information)/i, type: 'overview', confidence: 0.6 },
      { pattern: /(?:growth|expand|scale|increase|market share)/i, type: 'growth', confidence: 0.7 },
      { pattern: /(?:customer|client|user|market|audience)/i, type: 'market', confidence: 0.6 }
    ];
    
    // Extract entities
    const entities = this.extractEntities(input);
    
    // Find the best matching intent
    for (const { pattern, type, confidence } of intentPatterns) {
      if (pattern.test(input)) {
        return { 
          type, 
          confidence,
          entities
        };
      }
    }
    
    return { 
      type: 'overview', 
      confidence: 0.5,
      entities
    }; // Default fallback
  }

  /**
   * Extract entities from user input (companies, keywords, timeframes, etc.)
   */
  static extractEntities(input: string): {
    companies: string[];
    keywords: string[];
    timeframe?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  } {
    const inputLower = input.toLowerCase();
    
    // Extract companies
    const companies = this.extractCompanyNames(input);
    
    // Extract business keywords
    const businessKeywords = [
      'revenue', 'profit', 'growth', 'market', 'customers', 'products',
      'technology', 'strategy', 'funding', 'investment', 'competition',
      'leadership', 'innovation', 'digital transformation', 'cloud',
      'ai', 'machine learning', 'automation', 'integration'
    ];
    
    const keywords = businessKeywords.filter(keyword => 
      inputLower.includes(keyword)
    );
    
    // Extract timeframe
    const timeframe = this.extractTimeframe(input);
    
    // Basic sentiment analysis
    const sentiment = this.analyzeSentiment(input);
    
    return {
      companies,
      keywords,
      timeframe,
      sentiment
    };
  }

  /**
   * Extract company names from user input
   */
  static extractCompaniesFromInput(
    input: string, 
    defaultTarget?: string, 
    defaultSeller?: string
  ): { target?: string; seller?: string } {
    const companies = this.extractCompanyNames(input);
    
    return {
      target: companies[0] || defaultTarget,
      seller: companies[1] || defaultSeller
    };
  }

  /**
   * Extract known company names from text
   */
  static extractCompanyNames(input: string): string[] {
    const inputLower = input.toLowerCase();
    const words = inputLower.split(/\s+/);
    
    // Extended list of known companies
    const knownCompanies = [
      'shopify', 'atlassian', 'google', 'microsoft', 'amazon', 'apple', 
      'meta', 'salesforce', 'stripe', 'zoom', 'slack', 'notion', 'figma',
      'spotify', 'netflix', 'uber', 'airbnb', 'tesla', 'nvidia', 'adobe',
      'oracle', 'sap', 'workday', 'servicenow', 'snowflake', 'databricks',
      'hubspot', 'zendesk', 'twilio', 'okta', 'auth0', 'mongodb',
      'elastic', 'docker', 'kubernetes', 'aws', 'azure', 'gcp'
    ];
    
    const foundCompanies = words.filter(word => 
      knownCompanies.some(company => company.includes(word) || word.includes(company))
    );
    
    // Also check for multi-word company names
    const multiWordCompanies = [
      'amazon web services', 'google cloud', 'microsoft azure',
      'salesforce einstein', 'adobe creative cloud'
    ];
    
    multiWordCompanies.forEach(company => {
      if (inputLower.includes(company)) {
        foundCompanies.push(company);
      }
    });
    
    return [...new Set(foundCompanies)]; // Remove duplicates
  }

  /**
   * Extract timeframe references from input
   */
  static extractTimeframe(input: string): string | undefined {
    const inputLower = input.toLowerCase();
    
    const timeframePatterns = [
      { pattern: /(?:today|now|current|currently)/i, value: 'current' },
      { pattern: /(?:yesterday|last day)/i, value: 'day' },
      { pattern: /(?:last week|past week|this week)/i, value: 'week' },
      { pattern: /(?:last month|past month|this month)/i, value: 'month' },
      { pattern: /(?:last quarter|past quarter|this quarter)/i, value: 'quarter' },
      { pattern: /(?:last year|past year|this year|2024|2023)/i, value: 'year' },
      { pattern: /(?:recent|recently|latest)/i, value: 'recent' }
    ];
    
    for (const { pattern, value } of timeframePatterns) {
      if (pattern.test(input)) {
        return value;
      }
    }
    
    return undefined;
  }

  /**
   * Basic sentiment analysis
   */
  static analyzeSentiment(input: string): 'positive' | 'negative' | 'neutral' {
    const inputLower = input.toLowerCase();
    
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic',
      'success', 'growth', 'opportunity', 'improve', 'better', 'best',
      'love', 'like', 'happy', 'excited', 'positive', 'strong'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'problem', 'issue', 'challenge',
      'difficult', 'struggle', 'fail', 'failure', 'worse', 'worst',
      'hate', 'dislike', 'unhappy', 'negative', 'weak', 'poor'
    ];
    
    const positiveCount = positiveWords.filter(word => inputLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => inputLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Classify question type for better query generation
   */
  static classifyQuestionType(input: string): {
    type: 'what' | 'how' | 'when' | 'where' | 'who' | 'why' | 'which' | 'statement';
    specificity: 'general' | 'specific' | 'detailed';
  } {
    const inputLower = input.toLowerCase().trim();
    
    // Question type detection
    let type: 'what' | 'how' | 'when' | 'where' | 'who' | 'why' | 'which' | 'statement' = 'statement';
    
    if (inputLower.startsWith('what')) type = 'what';
    else if (inputLower.startsWith('how')) type = 'how';
    else if (inputLower.startsWith('when')) type = 'when';
    else if (inputLower.startsWith('where')) type = 'where';
    else if (inputLower.startsWith('who')) type = 'who';
    else if (inputLower.startsWith('why')) type = 'why';
    else if (inputLower.startsWith('which')) type = 'which';
    
    // Specificity detection
    let specificity: 'general' | 'specific' | 'detailed' = 'general';
    
    const specificIndicators = ['specific', 'detailed', 'exact', 'precise', 'particular'];
    const detailedIndicators = ['comprehensive', 'thorough', 'complete', 'full', 'in-depth'];
    
    if (detailedIndicators.some(indicator => inputLower.includes(indicator))) {
      specificity = 'detailed';
    } else if (specificIndicators.some(indicator => inputLower.includes(indicator))) {
      specificity = 'specific';
    }
    
    return { type, specificity };
  }

  /**
   * Generate context-aware follow-up questions
   */
  static generateFollowUpQuestions(intent: UserIntent, companies: string[]): string[] {
    const targetCompany = companies[0] || 'the company';
    
    const followUpMap: Record<string, string[]> = {
      challenges: [
        `What specific technology challenges is ${targetCompany} facing?`,
        `How are competitors addressing similar challenges?`,
        `What solutions has ${targetCompany} tried before?`
      ],
      technology: [
        `What is ${targetCompany}'s current technology architecture?`,
        `How does ${targetCompany}'s tech stack compare to competitors?`,
        `What technology modernization initiatives is ${targetCompany} pursuing?`
      ],
      financial: [
        `What are ${targetCompany}'s recent financial highlights?`,
        `How has ${targetCompany}'s revenue growth compared to industry average?`,
        `What are ${targetCompany}'s key financial metrics?`
      ],
      competitive: [
        `Who are ${targetCompany}'s main competitors?`,
        `What is ${targetCompany}'s competitive advantage?`,
        `How does ${targetCompany} differentiate in the market?`
      ],
      leadership: [
        `Who are the key decision makers at ${targetCompany}?`,
        `What is the leadership structure at ${targetCompany}?`,
        `What are the backgrounds of ${targetCompany}'s executives?`
      ],
      overview: [
        `What is ${targetCompany}'s business model?`,
        `What products and services does ${targetCompany} offer?`,
        `What is ${targetCompany}'s market position?`
      ]
    };
    
    return followUpMap[intent.type] || followUpMap.overview;
  }

  /**
   * Validate and improve user queries
   */
  static validateAndImproveQuery(input: string): {
    isValid: boolean;
    improved: string;
    suggestions: string[];
  } {
    const trimmed = input.trim();
    
    // Basic validation
    if (trimmed.length < 3) {
      return {
        isValid: false,
        improved: trimmed,
        suggestions: ['Please provide a more detailed question or request.']
      };
    }
    
    // Check for company mention
    const hasCompany = this.extractCompanyNames(input).length > 0;
    const suggestions: string[] = [];
    
    if (!hasCompany) {
      suggestions.push('Consider mentioning a specific company for more targeted results.');
    }
    
    // Improve clarity
    let improved = trimmed;
    
    // Add question mark if it's a question without one
    if (/^(what|how|when|where|who|why|which)/i.test(improved) && !improved.endsWith('?')) {
      improved += '?';
    }
    
    // Capitalize first letter
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);
    
    return {
      isValid: true,
      improved,
      suggestions
    };
  }
} 