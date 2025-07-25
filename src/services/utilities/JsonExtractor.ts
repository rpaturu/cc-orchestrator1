import { Logger } from '../core/Logger';

/**
 * Utility class for robust JSON extraction from LLM responses
 * Handles various response formats: pure JSON, JSON in code blocks, JSON with explanatory text
 */
export class JsonExtractor {
  private static logger?: Logger;

  /**
   * Set logger instance for debugging
   */
  static setLogger(logger: Logger): void {
    JsonExtractor.logger = logger;
  }

  /**
   * Extract and validate JSON from LLM response with robust error handling
   * 
   * @param response Raw LLM response text
   * @param options Optional configuration for extraction
   * @returns Parsed JSON object or null if extraction fails
   */
  static extractAndParse<T = any>(response: string, options?: {
    logErrors?: boolean;
    context?: string;
  }): T | null {
    const context = options?.context || 'LLM response';
    
    try {
      const jsonString = this.extractJsonString(response);
      if (!jsonString) {
        if (options?.logErrors && this.logger) {
          this.logger.warn('No valid JSON found in response', {
            context,
            responseLength: response.length,
            firstChars: response.substring(0, 200)
          });
          
          // Log the full response for debugging (with size limit to avoid overwhelming logs)
          if (response.length <= 10000) {
            this.logger.error('FULL LLM RESPONSE FOR DEBUGGING', {
              context,
              fullResponse: response
            });
          } else {
            this.logger.error('LARGE LLM RESPONSE FOR DEBUGGING (truncated)', {
              context,
              responseLength: response.length,
              firstPart: response.substring(0, 5000),
              lastPart: response.substring(response.length - 1000)
            });
          }
        }
        return null;
      }

      const parsed = JSON.parse(jsonString);
      
      if (this.logger) {
        this.logger.debug('Successfully parsed JSON from response', {
          context,
          jsonLength: jsonString.length,
          hasValidStructure: typeof parsed === 'object' && parsed !== null
        });
      }
      
      return parsed;
    } catch (error) {
      if (options?.logErrors && this.logger) {
        this.logger.warn('JSON parsing failed', {
          context,
          error: error instanceof Error ? error.message : String(error),
          responseLength: response.length,
          firstChars: response.substring(0, 200)
        });
      }
      return null;
    }
  }

  /**
   * Extract JSON string from response (without parsing)
   * 
   * @param response Raw LLM response text
   * @returns JSON string or null if extraction fails
   */
  static extractJsonString(response: string): string | null {
    try {
      // FIRST: Check if response is already valid JSON (most common with modern prompts)
      const trimmed = response.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          JSON.parse(trimmed);
          return trimmed;
        } catch (directParseError) {
          // Continue to pattern matching
        }
      }

      // FALLBACK: Enhanced patterns to handle various response formats
      const jsonPatterns = [
        /```json\s*(\{[\s\S]*?\})\s*```/,  // JSON in ```json blocks
        /```\s*(\{[\s\S]*?\})\s*```/,      // JSON in any ``` blocks  
        /(?:Here.*?:|Analysis.*?:|format.*?:)?\s*(\{[\s\S]*\})/s, // JSON with explanatory prefix
        /(\{[\s\S]*\})/s                   // Raw JSON anywhere in text
      ];

      for (const pattern of jsonPatterns) {
        const match = response.match(pattern);
        if (match) {
          let jsonString = match[1];
          
          // Clean and validate the extracted JSON
          jsonString = this.cleanJsonString(jsonString);
          jsonString = this.extractValidJsonPortion(jsonString);
          
          // Validate by parsing
          JSON.parse(jsonString);
          return jsonString;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean common JSON formatting issues from LLM responses
   */
  private static cleanJsonString(jsonString: string): string {
    // Remove explanatory text before the JSON
    const jsonStart = jsonString.indexOf('{');
    if (jsonStart > 0) {
      jsonString = jsonString.substring(jsonStart);
    }
    
    // Find the position of the LAST closing brace and trim after that
    const lastBraceIndex = jsonString.lastIndexOf('}');
    if (lastBraceIndex > 0) {
      jsonString = jsonString.substring(0, lastBraceIndex + 1);
    }
    
    return jsonString.trim();
  }

  /**
   * Extract valid JSON portion using brace matching
   */
  private static extractValidJsonPortion(jsonString: string): string {
    try {
      let braceCount = 0;
      let startIndex = -1;
      let endIndex = -1;
      let inString = false;
      let escaped = false;
      
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];
        
        if (escaped) {
          escaped = false;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            if (startIndex === -1) startIndex = i;
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
              endIndex = i;
              break;
            }
          }
        }
      }
      
      if (startIndex !== -1 && endIndex !== -1) {
        return jsonString.substring(startIndex, endIndex + 1);
      }
      
      return jsonString;
    } catch (error) {
      return jsonString;
    }
  }

  /**
   * Validate that a string contains valid JSON
   */
  static isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract multiple JSON objects from response (for batched responses)
   */
  static extractMultipleJson<T = any>(response: string): T[] {
    const results: T[] = [];
    const jsonPattern = /\{[\s\S]*?\}/g;
    let match;
    
    while ((match = jsonPattern.exec(response)) !== null) {
      try {
        const parsed = JSON.parse(match[0]);
        results.push(parsed);
      } catch {
        // Skip invalid JSON blocks
      }
    }
    
    return results;
  }
} 