/**
 * Company and Domain Extraction Utility
 * 
 * Handles extraction of company names from domains, URLs, and text processing
 * related to company identification.
 */

export class CompanyExtractor {
  
  /**
   * Extract company name from domain
   */
  static extractCompanyName(domain: string): string {
    // Remove common prefixes and suffixes
    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('.')[0];
    
    // Convert to title case and handle common cases
    return cleanDomain
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Extract domain from URL
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Extract company names from user input
   */
  static extractCompaniesFromInput(
    input: string, 
    defaultTarget?: string, 
    defaultSeller?: string
  ): { target: string; seller?: string } {
    // Simple extraction - could be enhanced with NER
    const words = input.toLowerCase().split(/\s+/);
    
    // Look for company names in input
    const knownCompanies = [
      'shopify', 'atlassian', 'google', 'microsoft', 'amazon', 'apple', 
      'meta', 'salesforce', 'stripe', 'zoom', 'slack', 'notion', 'figma',
      'spotify', 'netflix', 'uber', 'airbnb', 'tesla', 'nvidia', 'adobe'
    ];
    
    const foundCompanies = words.filter(word => 
      knownCompanies.some(company => company.includes(word) || word.includes(company))
    );
    
    return {
      target: foundCompanies[0] || defaultTarget || 'target company',
      seller: foundCompanies[1] || defaultSeller
    };
  }

  /**
   * Extract author information from content
   */
  static extractAuthor(content: string, url: string): string | undefined {
    try {
      // Common author patterns in content
      const authorPatterns = [
        /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /author[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /written\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /"author":\s*"([^"]+)"/i,
        /'author':\s*'([^']+)'/i
      ];

      for (const pattern of authorPatterns) {
        const match = content.match(pattern);
        if (match && match[1] && match[1].length > 2 && match[1].length < 50) {
          return match[1].trim();
        }
      }

      // Check for LinkedIn profiles as authors
      if (url.includes('linkedin.com')) {
        const linkedinMatch = url.match(/linkedin\.com\/in\/([^/]+)/);
        if (linkedinMatch) {
          return linkedinMatch[1].replace(/-/g, ' ');
        }
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extract publication date from content
   */
  static extractPublicationDate(content: string): string | undefined {
    try {
      // Common date patterns
      const datePatterns = [
        /"datePublished":\s*"([^"]+)"/i,
        /"publishedAt":\s*"([^"]+)"/i,
        /"date":\s*"([^"]+)"/i,
        /published[:\s]+(\d{4}-\d{2}-\d{2})/i,
        /(\w+\s+\d{1,2},\s+\d{4})/i, // "January 15, 2025"
        /(\d{1,2}\/\d{1,2}\/\d{4})/i, // "01/15/2025"
        /(\d{4}-\d{2}-\d{2})/i // "2025-01-15"
      ];

      for (const pattern of datePatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1];
          // Validate it's a reasonable date
          const date = new Date(dateStr);
          if (date.getFullYear() >= 2020 && date.getFullYear() <= new Date().getFullYear() + 1) {
            return date.toISOString();
          }
        }
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Generate cache key for request
   */
  static generateCacheKey(request: {
    companyDomain: string;
    salesContext: string;
    additionalContext?: string;
  }): string {
    const keyData = `${request.companyDomain}:${request.salesContext}:${request.additionalContext || ''}`;
    
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `sales_intel_${Math.abs(hash).toString(36)}`;
  }
} 