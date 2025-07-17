// Using console for logging - replace with proper Logger if available
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
};

export interface CompanyBasicInfo {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  description?: string;
  logo?: string;
  headquarters?: string;
  founded?: string;
}

export interface ProductSuggestion {
  name: string;
  category?: string;
  description?: string;
  confidence: number; // 0-1 score
}

export interface CompetitorSuggestion {
  name: string;
  domain?: string;
  category?: string;
  reason?: string;
  confidence: number; // 0-1 score
}

export interface CompanyEnrichmentResult {
  basicInfo: CompanyBasicInfo;
  suggestedProducts: ProductSuggestion[];
  suggestedCompetitors: CompetitorSuggestion[];
  suggestedIndustries: string[];
  sources: string[];
  confidence: number; // Overall confidence 0-1
}

export interface DataSource {
  name: string;
  priority: number;
  isAvailable: boolean;
  rateLimitRemaining?: number;
}

export class CompanyEnrichmentService {
  private logger = logger;
  private dataSources: DataSource[];

  constructor() {
    this.dataSources = [
      { name: 'website_scraping', priority: 1, isAvailable: true },
      { name: 'google_knowledge', priority: 2, isAvailable: !!process.env.GOOGLE_API_KEY },
      { name: 'bright_data', priority: 3, isAvailable: !!process.env.BRIGHT_DATA_API_KEY },
      { name: 'domain_intelligence', priority: 4, isAvailable: true },
      { name: 'industry_mapping', priority: 5, isAvailable: true }
    ];
  }

  /**
   * Main enrichment method - orchestrates multiple data sources
   */
  async enrichCompany(companyName: string, domain?: string): Promise<CompanyEnrichmentResult> {
    this.logger.info(`Starting enrichment for company: ${companyName}`);
    
    const results = await Promise.allSettled([
      this.getWebsiteData(domain || (await this.guessDomain(companyName)) || ''),
      this.getGoogleKnowledgeData(companyName),
      this.getBrightData(companyName, domain),
      this.getDomainIntelligence(domain || (await this.guessDomain(companyName)) || ''),
      this.getIndustryMapping(companyName)
    ]);

    return this.mergeResults(results, companyName);
  }

  /**
   * Quick company lookup for autocomplete/validation
   */
  async lookupCompany(query: string): Promise<CompanyBasicInfo[]> {
    this.logger.info(`Looking up companies matching: ${query}`);
    
    try {
      // Try multiple sources for company matching
      const [googleResults, domainResults, brightDataResults] = await Promise.allSettled([
        this.searchGoogleKnowledge(query),
        this.searchByDomain(query),
        this.searchBrightData(query)
      ]);

      const companies: CompanyBasicInfo[] = [];
      
      if (googleResults.status === 'fulfilled') {
        companies.push(...googleResults.value);
      }

      if (domainResults.status === 'fulfilled') {
        companies.push(...domainResults.value);
      }

      if (brightDataResults.status === 'fulfilled') {
        companies.push(...brightDataResults.value);
      }

      // Dedupe and return top 5 matches
      return this.dedupeCompanies(companies).slice(0, 5);
    } catch (error) {
      this.logger.error('Company lookup failed:', error);
      return [];
    }
  }

  /**
   * Suggest products based on company info
   */
  async suggestProducts(companyInfo: CompanyBasicInfo): Promise<ProductSuggestion[]> {
    const suggestions: ProductSuggestion[] = [];

    try {
      // Website scraping for product pages
      if (companyInfo.domain) {
        const websiteProducts = await this.scrapeProductsFromWebsite(companyInfo.domain);
        suggestions.push(...websiteProducts);
      }

      // G2 profile scraping
      const g2Products = await this.getG2Products(companyInfo.name);
      suggestions.push(...g2Products);

      // Industry-based suggestions
      if (companyInfo.industry) {
        const industryProducts = await this.getIndustryTypicalProducts(companyInfo.industry);
        suggestions.push(...industryProducts);
      }

      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);
    } catch (error) {
      this.logger.error('Product suggestion failed:', error);
      return [];
    }
  }

  /**
   * Find competitors based on company info
   */
  async findCompetitors(companyInfo: CompanyBasicInfo): Promise<CompetitorSuggestion[]> {
    const competitors: CompetitorSuggestion[] = [];

    try {
      // G2 alternatives
      const g2Competitors = await this.getG2Competitors(companyInfo.name);
      competitors.push(...g2Competitors);

      // SimilarWeb competitors (if domain available)
      if (companyInfo.domain) {
        const similarWebCompetitors = await this.getSimilarWebCompetitors(companyInfo.domain);
        competitors.push(...similarWebCompetitors);
      }

      // Industry-based competitors
      if (companyInfo.industry) {
        const industryCompetitors = await this.getIndustryCompetitors(companyInfo.industry);
        competitors.push(...industryCompetitors);
      }

      return competitors
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);
    } catch (error) {
      this.logger.error('Competitor finding failed:', error);
      return [];
    }
  }

  // Private helper methods for each data source

  private async getClearbitData(companyName: string, domain?: string): Promise<Partial<CompanyEnrichmentResult>> {
    try {
      // Check if Clearbit API key is available
      const apiKey = process.env.CLEARBIT_API_KEY;
      if (!apiKey) {
        this.logger.warn('Clearbit API key not configured');
        return { sources: [] };
      }

      const lookupDomain = domain || await this.guessDomain(companyName);
      if (!lookupDomain) {
        return { sources: [] };
      }

      const response = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${lookupDomain}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!response.ok) {
        throw new Error(`Clearbit API error: ${response.status}`);
      }

      const data = await response.json() as any;
      
      return {
        basicInfo: {
          name: data.name,
          domain: data.domain,
          industry: data.category?.industry,
          size: data.metrics?.employees ? `${data.metrics.employees} employees` : undefined,
          description: data.description,
          logo: data.logo,
          headquarters: data.location ? `${data.location.city}, ${data.location.country}` : undefined,
          founded: data.foundedYear?.toString()
        },
        sources: ['clearbit']
      };
    } catch (error) {
      this.logger.error('Clearbit enrichment failed:', error);
      return { sources: [] };
    }
  }

  private async getGoogleKnowledgeData(companyName: string): Promise<Partial<CompanyEnrichmentResult>> {
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        this.logger.warn('Google Knowledge Graph API key not configured');
        return { sources: [] };
      }

      const response = await fetch(
        `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(companyName)}&types=Corporation&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Google Knowledge Graph API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const entity = data.itemListElement?.[0]?.result;

      if (!entity) {
        return { sources: [] };
      }

      return {
        basicInfo: {
          name: entity.name,
          description: entity.description,
          // Extract more fields as available
        },
        sources: ['google_knowledge']
      };
    } catch (error) {
      this.logger.error('Google Knowledge Graph enrichment failed:', error);
      return { sources: [] };
    }
  }

  private async getWebsiteData(domain: string): Promise<Partial<CompanyEnrichmentResult>> {
    try {
      if (!domain) return { sources: [] };

      // Scrape company website for basic info and products
      const response = await fetch(`https://${domain}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CompanyBot/1.0)' }
      });

      if (!response.ok) {
        return { sources: [] };
      }

      const html = await response.text();
      
      // Extract meta tags and structured data
      const basicInfo = this.extractCompanyInfoFromHTML(html);
      const products = await this.extractProductsFromHTML(html, domain);

      return {
        basicInfo: { name: 'Unknown', ...basicInfo },
        suggestedProducts: products,
        sources: ['company_website']
      };
    } catch (error) {
      this.logger.error('Website scraping failed:', error);
      return { sources: [] };
    }
  }

  private async getG2Data(companyName: string): Promise<Partial<CompanyEnrichmentResult>> {
    // Implementation for G2 scraping
    // This would involve searching G2 for the company and extracting:
    // - Products they offer
    // - Competitors listed
    // - Category information
    return { sources: [] };
  }

  private async getLinkedInData(companyName: string): Promise<Partial<CompanyEnrichmentResult>> {
    // Implementation for LinkedIn company page scraping
    // - Company size
    // - Industry
    // - Recent updates
    return { sources: [] };
  }

  // Helper methods

  private async guessDomain(companyName: string): Promise<string | null> {
    // Simple domain guessing logic
    const cleaned = companyName.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
    
    const commonDomains = ['.com', '.io', '.ai', '.co'];
    
    for (const tld of commonDomains) {
      const domain = `${cleaned}${tld}`;
      if (await this.isDomainValid(domain)) {
        return domain;
      }
    }
    
    return null;
  }

  private async isDomainValid(domain: string): Promise<boolean> {
    try {
      const response = await fetch(`https://${domain}`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private mergeResults(results: PromiseSettledResult<Partial<CompanyEnrichmentResult>>[], companyName: string): CompanyEnrichmentResult {
    const merged: CompanyEnrichmentResult = {
      basicInfo: { name: companyName },
      suggestedProducts: [],
      suggestedCompetitors: [],
      suggestedIndustries: [],
      sources: [],
      confidence: 0
    };

    let successfulSources = 0;

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.sources?.length) {
        successfulSources++;
        
        // Merge basic info (prefer higher confidence sources)
        if (result.value.basicInfo) {
          merged.basicInfo = { ...merged.basicInfo, ...result.value.basicInfo };
        }

        // Aggregate suggestions
        if (result.value.suggestedProducts) {
          merged.suggestedProducts.push(...result.value.suggestedProducts);
        }

        if (result.value.suggestedCompetitors) {
          merged.suggestedCompetitors.push(...result.value.suggestedCompetitors);
        }

        merged.sources.push(...result.value.sources);
      }
    });

    // Calculate overall confidence based on successful sources
    merged.confidence = Math.min(successfulSources / this.dataSources.length, 1);

    // Dedupe and sort suggestions
    merged.suggestedProducts = this.dedupeProducts(merged.suggestedProducts);
    merged.suggestedCompetitors = this.dedupeCompetitors(merged.suggestedCompetitors);

    return merged;
  }

  private dedupeCompanies(companies: CompanyBasicInfo[]): CompanyBasicInfo[] {
    const seen = new Set<string>();
    return companies.filter(company => {
      const key = company.domain || company.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private dedupeProducts(products: ProductSuggestion[]): ProductSuggestion[] {
    const seen = new Set<string>();
    return products
      .filter(product => {
        const key = product.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  private dedupeCompetitors(competitors: CompetitorSuggestion[]): CompetitorSuggestion[] {
    const seen = new Set<string>();
    return competitors
      .filter(competitor => {
        const key = competitor.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  private extractCompanyInfoFromHTML(html: string): Partial<CompanyBasicInfo> {
    // Extract meta tags, JSON-LD, and other structured data
    // This is a simplified implementation
    const info: Partial<CompanyBasicInfo> = {};
    
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
    if (descMatch) {
      info.description = descMatch[1];
    }

    // Extract title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch) {
      info.name = titleMatch[1].split(' - ')[0]; // Clean up title
    }

    return info;
  }

  private async extractProductsFromHTML(html: string, domain: string): Promise<ProductSuggestion[]> {
    const products: ProductSuggestion[] = [];
    
    // Look for product/solution pages
    const productLinks = html.match(/href="([^"]*(?:product|solution|service)[^"]*)"([^>]*>([^<]*)<\/a>)?/gi) || [];
    
    productLinks.forEach(link => {
      const hrefMatch = link.match(/href="([^"]*)"/);
      const textMatch = link.match(/>([^<]*)</);
      
      if (hrefMatch && textMatch) {
        const productName = textMatch[1].trim();
        if (productName && productName.length > 2) {
          products.push({
            name: productName,
            confidence: 0.6 // Medium confidence from website scraping
          });
        }
      }
    });

    return products.slice(0, 10);
  }

  // Placeholder methods for additional data sources
  private async searchByDomain(query: string): Promise<CompanyBasicInfo[]> { 
    // Simple domain-based company suggestions
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suggestions: CompanyBasicInfo[] = [];
    
    // Common TLDs to try
    const tlds = ['.com', '.io', '.co', '.ai'];
    
    for (const tld of tlds) {
      const domain = `${cleanQuery}${tld}`;
      try {
        // Try to validate if domain exists
        const response = await fetch(`https://${domain}`, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          suggestions.push({
            name: query,
            domain: domain
          });
        }
      } catch {
        // Domain doesn't exist or is unreachable
      }
    }
    
    return suggestions;
  }
  
  private async searchGoogleKnowledge(query: string): Promise<CompanyBasicInfo[]> { 
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        this.logger.warn('Google Knowledge Graph API key not configured');
        return [];
      }

      const response = await fetch(
        `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&types=Corporation&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Google Knowledge Graph API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const entities = data.itemListElement || [];

      return entities.slice(0, 3).map((item: any) => ({
        name: item.result?.name || query,
        description: item.result?.description,
        industry: item.result?.['@type']?.includes('Corporation') ? 'Corporation' : undefined
      }));
    } catch (error) {
      this.logger.error('Google Knowledge Graph search failed:', { error: String(error) });
      return [];
    }
  }

  private async searchBrightData(query: string): Promise<CompanyBasicInfo[]> {
    try {
      const apiKey = process.env.BRIGHT_DATA_API_KEY;
      if (!apiKey) {
        this.logger.warn('Bright Data API key not configured');
        return [];
      }

      // TODO: Implement Bright Data company search
      // This would use Bright Data's company database or LinkedIn scraping
      this.logger.info('Bright Data search - placeholder implementation');
      return [];
    } catch (error) {
      this.logger.error('Bright Data search failed:', { error: String(error) });
      return [];
    }
  }

  private async getBrightData(companyName: string, domain?: string): Promise<Partial<CompanyEnrichmentResult>> {
    try {
      const apiKey = process.env.BRIGHT_DATA_API_KEY;
      if (!apiKey) {
        return { sources: [] };
      }

      // TODO: Implement Bright Data company enrichment
      // This would scrape LinkedIn company pages, G2 profiles, etc.
      this.logger.info('Bright Data enrichment - placeholder implementation');
      return { sources: [] };
    } catch (error) {
      this.logger.error('Bright Data enrichment failed:', { error: String(error) });
      return { sources: [] };
    }
  }

  private async getDomainIntelligence(domain: string): Promise<Partial<CompanyEnrichmentResult>> {
    try {
      if (!domain) return { sources: [] };

      // Basic domain intelligence - tech stack detection, DNS analysis
      const suggestions: CompanyBasicInfo = {
        name: 'Unknown',
        domain: domain
      };

      // TODO: Add tech stack detection, DNS MX record analysis
      // This could detect email providers, hosting providers, etc.
      
      return {
        basicInfo: suggestions,
        sources: ['domain_intelligence']
      };
    } catch (error) {
      this.logger.error('Domain intelligence failed:', { error: String(error) });
      return { sources: [] };
    }
  }

  private async getIndustryMapping(companyName: string): Promise<Partial<CompanyEnrichmentResult>> {
    try {
      // Static industry mapping based on company name patterns
      const industries = this.guessIndustryFromName(companyName);
      
      return {
        suggestedIndustries: industries,
        sources: ['industry_mapping']
      };
    } catch (error) {
      this.logger.error('Industry mapping failed:', { error: String(error) });
      return { sources: [] };
    }
  }

  private guessIndustryFromName(companyName: string): string[] {
    const name = companyName.toLowerCase();
    const industries: string[] = [];

    // Simple pattern matching for industry classification
    if (name.includes('tech') || name.includes('software') || name.includes('ai')) {
      industries.push('Technology');
    }
    if (name.includes('bank') || name.includes('financial') || name.includes('capital')) {
      industries.push('Financial Services');
    }
    if (name.includes('health') || name.includes('medical') || name.includes('pharma')) {
      industries.push('Healthcare');
    }
    if (name.includes('retail') || name.includes('store') || name.includes('shop')) {
      industries.push('Retail');
    }

    return industries.length > 0 ? industries : ['Unknown'];
  }

  // Product and competitor placeholder methods
  private async scrapeProductsFromWebsite(domain: string): Promise<ProductSuggestion[]> { return []; }
  private async getG2Products(companyName: string): Promise<ProductSuggestion[]> { return []; }
  private async getIndustryTypicalProducts(industry: string): Promise<ProductSuggestion[]> { return []; }
  private async getG2Competitors(companyName: string): Promise<CompetitorSuggestion[]> { return []; }
  private async getSimilarWebCompetitors(domain: string): Promise<CompetitorSuggestion[]> { return []; }
  private async getIndustryCompetitors(industry: string): Promise<CompetitorSuggestion[]> { return []; }
} 