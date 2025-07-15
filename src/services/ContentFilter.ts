/**
 * Content Filter Service
 * 
 * Handles relevancy filtering, content quality assessment, and relevancy scoring
 * for fetched content based on company context.
 */

import { Logger } from './Logger';

export interface RelevancyResult {
  filteredResults: { content: string | null; [key: string]: any }[];
  filteredUrls: string[];
  relevancyScores: number[];
}

export interface ConfidenceMetrics {
  overall: number;
  contentVolume: number;
  successRate: number;
  averageRelevancy: number;
}

export class ContentFilter {
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('ContentFilter');
  }

  /**
   * Calculate relevancy score for content based on company mention and context
   */
  calculateRelevancyScore(
    content: string, 
    companyName: string, 
    url: string, 
    snippet: string
  ): number {
    let relevancyScore = 0.0;
    const contentLower = content.toLowerCase();
    const companyLower = companyName.toLowerCase();
    const snippetLower = snippet.toLowerCase();
    
    // Company name mentions (highest relevancy indicator)
    const exactMatches = (contentLower.match(new RegExp(`\\b${companyLower}\\b`, 'g')) || []).length;
    if (exactMatches > 0) {
      relevancyScore += Math.min(exactMatches * 0.3, 0.6); // Up to 0.6 for company mentions
    }
    
    // Company name in URL or title
    if (url.toLowerCase().includes(companyLower)) {
      relevancyScore += 0.2;
    }
    
    // Company name in snippet
    if (snippetLower.includes(companyLower)) {
      relevancyScore += 0.15;
    }
    
    // Business-relevant keywords
    const businessKeywords = [
      'revenue', 'funding', 'growth', 'employees', 'strategy', 'expansion',
      'acquisition', 'merger', 'leadership', 'ceo', 'cfo', 'executives',
      'market', 'industry', 'competition', 'customers', 'products', 'services',
      'technology', 'innovation', 'investment', 'valuation', 'ipo'
    ];
    
    const keywordMatches = businessKeywords.filter(keyword => 
      contentLower.includes(keyword)
    ).length;
    
    relevancyScore += Math.min(keywordMatches * 0.02, 0.2); // Up to 0.2 for business keywords
    
    // Content length factor (very short content is often not useful)
    if (content.length < 200) {
      relevancyScore *= 0.5; // Penalize very short content
    } else if (content.length > 1000) {
      relevancyScore += 0.1; // Bonus for substantial content
    }
    
    return Math.min(relevancyScore, 1.0);
  }

  /**
   * Filter content by relevancy threshold
   */
  filterByRelevancy(
    fetchResults: { content: string | null; [key: string]: any }[],
    urls: string[],
    searchResults: any[],
    companyName: string,
    threshold: number = 0.3
  ): RelevancyResult {
    const relevancyData: Array<{
      result: { content: string | null; [key: string]: any };
      url: string;
      score: number;
      index: number;
    }> = [];

    // Calculate relevancy scores for all successful fetches
    for (let i = 0; i < fetchResults.length; i++) {
      if (fetchResults[i].content !== null) {
        const url = urls[i];
        const searchResult = searchResults.find(r => r.url === url);
        const snippet = searchResult?.snippet || '';
        
        const score = this.calculateRelevancyScore(
          fetchResults[i].content!,
          companyName,
          url,
          snippet
        );
        
        relevancyData.push({
          result: fetchResults[i],
          url: url,
          score: score,
          index: i
        });
      }
    }

    // Sort by relevancy score (highest first) and filter by threshold
    const filtered = relevancyData
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score);

    this.logger.info('Content relevancy filtering', {
      totalContent: relevancyData.length,
      filteredContent: filtered.length,
      averageRelevancy: relevancyData.reduce((sum, item) => sum + item.score, 0) / relevancyData.length,
      threshold
    });

    return {
      filteredResults: filtered.map(item => item.result),
      filteredUrls: filtered.map(item => item.url),
      relevancyScores: filtered.map(item => item.score)
    };
  }

  /**
   * Calculate confidence score based on available data
   */
  calculateConfidenceScore(contentCount: number, successfulFetches: number): number {
    // Base score on content volume and fetch success rate
    const volumeScore = Math.min(contentCount / 10, 1); // Max at 10 pieces of content
    const successRate = successfulFetches > 0 ? contentCount / successfulFetches : 0;
    
    return Math.round((volumeScore * 0.7 + successRate * 0.3) * 100) / 100;
  }

  /**
   * Calculate comprehensive confidence metrics
   */
  calculateComprehensiveConfidence(
    contentCount: number,
    successfulFetches: number,
    totalUrls: number,
    relevancyScores: number[]
  ): ConfidenceMetrics {
    const volumeScore = Math.min(contentCount / 10, 1);
    const successRate = totalUrls > 0 ? successfulFetches / totalUrls : 0;
    const averageRelevancy = relevancyScores.length > 0 
      ? relevancyScores.reduce((sum, score) => sum + score, 0) / relevancyScores.length 
      : 0;
    
    const overall = (volumeScore * 0.4 + successRate * 0.3 + averageRelevancy * 0.3);
    
    return {
      overall: Math.round(overall * 100) / 100,
      contentVolume: Math.round(volumeScore * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      averageRelevancy: Math.round(averageRelevancy * 100) / 100
    };
  }

  /**
   * Assess content quality based on various factors
   */
  assessContentQuality(content: string, url: string): {
    score: number;
    factors: {
      length: number;
      structure: number;
      informationDensity: number;
      readability: number;
    };
  } {
    const factors = {
      length: this.assessContentLength(content),
      structure: this.assessContentStructure(content),
      informationDensity: this.assessInformationDensity(content),
      readability: this.assessReadability(content)
    };
    
    // Weighted average
    const score = (
      factors.length * 0.2 +
      factors.structure * 0.3 +
      factors.informationDensity * 0.3 +
      factors.readability * 0.2
    );
    
    return {
      score: Math.round(score * 100) / 100,
      factors
    };
  }

  /**
   * Assess content length appropriateness
   */
  private assessContentLength(content: string): number {
    const length = content.length;
    
    if (length < 100) return 0.2; // Too short
    if (length < 500) return 0.6; // Short but acceptable
    if (length < 2000) return 1.0; // Good length
    if (length < 5000) return 0.9; // Long but still good
    if (length < 10000) return 0.7; // Very long
    return 0.5; // Extremely long, potentially problematic
  }

  /**
   * Assess content structure quality
   */
  private assessContentStructure(content: string): number {
    let score = 0.5; // Base score
    
    // Check for paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
    if (paragraphs.length >= 2) score += 0.2;
    
    // Check for headers or titles
    if (/^[A-Z][^.!?]*$/m.test(content)) score += 0.1;
    
    // Check for bullet points or lists
    if (/^\s*[•\-\*\d+\.]/m.test(content)) score += 0.1;
    
    // Check for proper sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 3) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Assess information density
   */
  private assessInformationDensity(content: string): number {
    const words = content.split(/\s+/).filter(word => word.length > 2);
    const uniqueWords = new Set(words.map(word => word.toLowerCase()));
    
    // Information keywords that indicate dense content
    const infoKeywords = [
      'revenue', 'profit', 'growth', 'market', 'customers', 'products',
      'technology', 'strategy', 'CEO', 'founded', 'headquarters', 'employees',
      'funding', 'investment', 'acquisition', 'partnership', 'competition'
    ];
    
    const infoKeywordCount = infoKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    
    // Numbers and dates indicate factual content
    const numberCount = (content.match(/\b\d+/g) || []).length;
    const dateCount = (content.match(/\b\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) || []).length;
    
    // Calculate density score
    const uniqueWordRatio = uniqueWords.size / words.length;
    const infoScore = Math.min(infoKeywordCount / 10, 1);
    const factualScore = Math.min((numberCount + dateCount) / 20, 1);
    
    return (uniqueWordRatio * 0.3 + infoScore * 0.4 + factualScore * 0.3);
  }

  /**
   * Assess readability (simplified version)
   */
  private assessReadability(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(word => word.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Optimal ranges for readability
    let score = 1.0;
    
    // Penalize very long sentences
    if (avgWordsPerSentence > 25) score -= 0.3;
    else if (avgWordsPerSentence > 20) score -= 0.1;
    
    // Penalize very long words (might be technical jargon)
    if (avgCharsPerWord > 7) score -= 0.2;
    else if (avgCharsPerWord > 6) score -= 0.1;
    
    // Penalize very short sentences (might be fragments)
    if (avgWordsPerSentence < 5) score -= 0.2;
    
    return Math.max(score, 0);
  }

  /**
   * Filter out low-quality content based on quality assessment
   */
  filterByQuality(
    contents: string[],
    urls: string[],
    qualityThreshold: number = 0.5
  ): {
    filteredContents: string[];
    filteredUrls: string[];
    qualityScores: number[];
  } {
    const qualityData: Array<{
      content: string;
      url: string;
      score: number;
    }> = [];

    for (let i = 0; i < contents.length; i++) {
      const quality = this.assessContentQuality(contents[i], urls[i]);
      qualityData.push({
        content: contents[i],
        url: urls[i],
        score: quality.score
      });
    }

    const filtered = qualityData
      .filter(item => item.score >= qualityThreshold)
      .sort((a, b) => b.score - a.score);

    this.logger.info('Content quality filtering', {
      totalContent: qualityData.length,
      filteredContent: filtered.length,
      averageQuality: qualityData.reduce((sum, item) => sum + item.score, 0) / qualityData.length,
      threshold: qualityThreshold
    });

    return {
      filteredContents: filtered.map(item => item.content),
      filteredUrls: filtered.map(item => item.url),
      qualityScores: filtered.map(item => item.score)
    };
  }
} 