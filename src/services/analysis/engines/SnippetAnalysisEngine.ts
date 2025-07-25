import { Logger } from '../../core/Logger';
import { BedrockCore } from '../core/BedrockCore';
import { JsonExtractor } from '../../utilities/JsonExtractor';
import {
  SnippetAnalysisRequest,
  ParsedSnippetAnalysis,
  AnalysisConfig
} from '../types/AnalysisTypes';

export class SnippetAnalysisEngine {
  private bedrockCore: BedrockCore;
  private logger: Logger;

  constructor(config: AnalysisConfig, logger: Logger, region?: string) {
    this.logger = logger;
    this.bedrockCore = new BedrockCore(config, logger, region);
    
    // Set logger for JsonExtractor utility
    JsonExtractor.setLogger(logger);
  }

  /**
   * Analyze snippets and identify information gaps
   */
  async analyzeSnippetsAndIdentifyGaps(request: SnippetAnalysisRequest): Promise<ParsedSnippetAnalysis> {
    const { snippets, companyName, analysisType } = request;

    try {
      this.logger.info('Starting snippet analysis', {
        companyName,
        analysisType,
        snippetCount: snippets.length,
      });

      const systemPrompt = this.buildSnippetAnalysisSystemPrompt(analysisType);
      const userPrompt = this.buildSnippetAnalysisUserPrompt(snippets, companyName, analysisType);

      const response = await this.bedrockCore.invokeModel({
        systemPrompt,
        userPrompt,
      });

      const analysis = this.parseSnippetAnalysisResponse(response);

      this.logger.info('Snippet analysis completed', {
        companyName,
        analysisType,
        gapsCount: analysis.identifiedGaps?.length || 0,
        insightsCount: analysis.keyInsights?.length || 0,
      });

      return analysis;
    } catch (error) {
      this.logger.error('Snippet analysis failed', {
        companyName,
        analysisType,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty analysis on failure
      return {
        summary: '',
        keyInsights: [],
        identifiedGaps: [],
        dataQuality: 'poor',
        confidenceLevel: 'low',
        additionalQuestionsNeeded: [],
      };
    }
  }

  /**
   * Build system prompt for snippet analysis
   */
  private buildSnippetAnalysisSystemPrompt(analysisType: string): string {
    return `You are an expert research analyst specializing in information gap analysis and data quality assessment.

Your task is to analyze brief content snippets and:
1. Extract key insights from the available information
2. Identify specific information gaps that limit comprehensive analysis
3. Assess the quality and completeness of the data
4. Suggest specific questions needed to fill the gaps
5. Provide a confidence assessment based on available information

Analysis Type: ${analysisType}

Key Principles:
- Be honest about limitations in the available data
- Clearly distinguish between what is known vs. unknown
- Identify specific, actionable information gaps
- Suggest targeted questions to address each gap
- Assess data quality objectively
- Provide insights only when supported by available evidence

Output Requirements:
- Structured analysis with clear sections
- Specific gap identification with reasoning
- Actionable recommendations for additional research
- Honest confidence assessment based on data completeness`;
  }

  /**
   * Build user prompt for snippet analysis
   */
  private buildSnippetAnalysisUserPrompt(
    snippets: string[],
    companyName: string,
    analysisType: string
  ): string {
    const snippetSections = snippets.map((snippet, index) => 
      `--- Snippet ${index + 1} ---\n${snippet}\n`
    ).join('\n');

    return `Please analyze the following content snippets about ${companyName} for ${analysisType} purposes.

CONTENT SNIPPETS:
${snippetSections}

Provide your analysis in the following JSON format:
{
  "summary": "Brief summary of what we know from the snippets",
  "keyInsights": ["Insight 1", "Insight 2", ...],
  "identifiedGaps": ["Gap 1: What's missing", "Gap 2: What's missing", ...],
  "dataQuality": "excellent|good|fair|poor",
  "confidenceLevel": "high|medium|low",
  "additionalQuestionsNeeded": ["Question 1", "Question 2", ...]
}

Guidelines:
- Base insights only on information present in the snippets
- Be specific about what information is missing
- Suggest concrete questions to fill each gap
- Assess quality based on completeness, relevance, and recency
- Consider what additional context would improve the analysis`;
  }

  /**
   * Parse snippet analysis response
   */
  private parseSnippetAnalysisResponse(response: string): ParsedSnippetAnalysis {
    try {
      // Use shared JsonExtractor utility
      const parsed = JsonExtractor.extractAndParse(response, {
        logErrors: true,
        context: 'SnippetAnalysisEngine'
      });
      
      if (!parsed) {
        throw new Error('No JSON found in response');
      }
      
      // Validate and ensure all required fields exist
      return {
        summary: parsed.summary || '',
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        identifiedGaps: Array.isArray(parsed.identifiedGaps) ? parsed.identifiedGaps : [],
        dataQuality: parsed.dataQuality || 'fair',
        confidenceLevel: parsed.confidenceLevel || 'medium',
        additionalQuestionsNeeded: Array.isArray(parsed.additionalQuestionsNeeded) ? parsed.additionalQuestionsNeeded : [],
      };
    } catch (error) {
      this.logger.warn('Failed to parse snippet analysis JSON, falling back to text parsing', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback: extract information from text
      return this.parseAnalysisFromText(response);
    }
  }

  /**
   * Fallback method to parse analysis from unstructured text
   */
  private parseAnalysisFromText(response: string): ParsedSnippetAnalysis {
    const extractValue = (pattern: RegExp): string => {
      const match = response.match(pattern);
      return match ? match[1].trim() : '';
    };

    const extractList = (pattern: RegExp): string[] => {
      const matches = response.match(pattern);
      if (!matches) return [];
      
      return matches[1]
        .split(/\n|;/)
        .map(item => item.trim().replace(/^[-•*]\s*/, ''))
        .filter(item => item.length > 0)
        .slice(0, 5);
    };

    return {
      summary: extractValue(/summary:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\nkey insights|\ngaps|$)/i),
      keyInsights: extractList(/key insights?:?\s*([\s\S]*?)(?=gaps|quality|confidence|questions|$)/i),
      identifiedGaps: extractList(/(?:identified )?gaps?:?\s*([\s\S]*?)(?=quality|confidence|questions|$)/i),
      dataQuality: extractValue(/data quality:?\s*(\w+)/i) || 'fair',
      confidenceLevel: extractValue(/confidence level?:?\s*(\w+)/i) || 'medium',
      additionalQuestionsNeeded: extractList(/(?:additional )?questions? needed:?\s*([\s\S]*?)$/i),
    };
  }

  /**
   * Quick gap assessment for rapid analysis
   */
  async quickGapAssessment(snippets: string[], requiredInfo: string[]): Promise<{
    coverage: number;
    missingInfo: string[];
    recommendations: string[];
  }> {
    const combinedContent = snippets.join('\n\n');
    
    const systemPrompt = `You are a data completeness analyst. Assess how well the provided content covers the required information areas.`;

    const userPrompt = `Content to analyze:
${combinedContent}

Required information areas:
${requiredInfo.map((info, i) => `${i + 1}. ${info}`).join('\n')}

Assess coverage and provide response in JSON format:
{
  "coverage": 0-100,
  "missingInfo": ["Missing area 1", "Missing area 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

    try {
      const response = await this.bedrockCore.invokeModel({
        systemPrompt,
        userPrompt,
        maxTokens: this.bedrockCore.maxTokens,  // ✅ Use configured maxTokens instead of hardcoded 1000
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          coverage: parsed.coverage || 0,
          missingInfo: parsed.missingInfo || [],
          recommendations: parsed.recommendations || [],
        };
      }
    } catch (error) {
      this.logger.warn('Quick gap assessment failed', { error: error instanceof Error ? error.message : String(error) });
    }

    // Fallback: simple coverage calculation
    const coverage = Math.floor((snippets.length / requiredInfo.length) * 100);
    return {
      coverage: Math.min(coverage, 100),
      missingInfo: requiredInfo.slice(snippets.length),
      recommendations: ['Gather more comprehensive data sources'],
    };
  }


} 