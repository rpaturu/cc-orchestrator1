/**
 * Source Analysis Service
 * 
 * Handles credibility scoring, source type determination, and domain authority analysis
 * for web sources and content.
 */

import { CompanyExtractor } from '../utilities/CompanyExtractor';

export interface SourcePriority {
  url: string;
  priority: number;
  sourceType: 'news' | 'company' | 'blog' | 'social' | 'press_release' | 'report' | 'financial' | 'educational' | 'other';
}

export class SourceAnalyzer {
  
  /**
   * Enhanced source type determination to better categorize sources
   */
  static determineSourceType(url: string): 'news' | 'company' | 'blog' | 'social' | 'press_release' | 'report' | 'financial' | 'educational' | 'other' {
    const domain = CompanyExtractor.extractDomain(url);
    const urlLower = url.toLowerCase();
    
    // Financial and stock sites
    if (domain.includes('finance.yahoo.com') || 
        domain.includes('marketwatch.com') || 
        domain.includes('bloomberg.com') || 
        domain.includes('reuters.com') || 
        domain.includes('sec.gov') ||
        domain.includes('nasdaq.com') ||
        domain.includes('crunchbase.com') ||
        urlLower.includes('stock') || 
        urlLower.includes('investor') || 
        urlLower.includes('earnings')) {
      return 'financial';
    }
    
    // Educational and tutorial sites
    if (domain.includes('wikipedia.org') || 
        domain.includes('simplilearn.com') || 
        domain.includes('coursera.org') || 
        domain.includes('udemy.com') ||
        domain.includes('youtube.com') ||
        urlLower.includes('tutorial') || 
        urlLower.includes('guide') || 
        urlLower.includes('learn') ||
        urlLower.includes('explained')) {
      return 'educational';
    }
    
    // News sites
    if (domain.includes('techcrunch.com') || 
        domain.includes('venturebeat.com') || 
        domain.includes('businessinsider.com') || 
        domain.includes('forbes.com') || 
        domain.includes('reuters.com') || 
        domain.includes('cnn.com') || 
        domain.includes('bbc.com') || 
        domain.includes('wsj.com') || 
        domain.includes('nytimes.com') ||
        urlLower.includes('news') || 
        urlLower.includes('press')) {
      return 'news';
    }
    
    // Press releases
    if (urlLower.includes('press-release') || 
        urlLower.includes('press_release') || 
        urlLower.includes('newsroom') || 
        urlLower.includes('/news/') ||
        domain.includes('prnewswire.com') || 
        domain.includes('businesswire.com')) {
      return 'press_release';
    }
    
    // Company/official sources
    if (urlLower.includes('/about') || 
        urlLower.includes('/company') || 
        urlLower.includes('/investor') || 
        urlLower.includes('careers') ||
        urlLower.includes('/our-') ||
        domain.includes('.com') && !domain.includes('blog')) {
      return 'company';
    }
    
    // Social media
    if (domain.includes('linkedin.com') || 
        domain.includes('twitter.com') || 
        domain.includes('facebook.com') || 
        domain.includes('instagram.com') || 
        domain.includes('youtube.com')) {
      return 'social';
    }
    
    // Blog sites
    if (domain.includes('medium.com') || 
        urlLower.includes('blog') || 
        urlLower.includes('/post/') || 
        urlLower.includes('/article/')) {
      return 'blog';
    }
    
    // Research and reports
    if (domain.includes('gartner.com') || 
        domain.includes('forrester.com') || 
        domain.includes('mckinsey.com') || 
        urlLower.includes('research') || 
        urlLower.includes('report') || 
        urlLower.includes('analysis')) {
      return 'report';
    }
    
    return 'other';
  }

  /**
   * Calculate enhanced credibility score for a domain with detailed authority assessment
   */
  static calculateCredibilityScore(domain: string): number {
    const domainLower = domain.toLowerCase();
    
    // Tier 1: Highest credibility sources (financial, government, major news)
    const tier1Domains = [
      // Financial & Business Authority
      'sec.gov', 'edgar.gov', 'irs.gov', 'treasury.gov',
      'bloomberg.com', 'reuters.com', 'wsj.com', 'ft.com', 'economist.com',
      'marketwatch.com', 'barrons.com', 'morningstar.com',
      
      // Major News Organizations
      'nytimes.com', 'washingtonpost.com', 'bbc.com', 'cnn.com', 'npr.org',
      'apnews.com', 'usatoday.com', 'abcnews.go.com',
      
      // Professional Research & Analysis
      'mckinsey.com', 'bcg.com', 'bain.com', 'deloitte.com', 'pwc.com',
      'kpmg.com', 'ey.com', 'accenture.com',
      
      // Industry Authority
      'crunchbase.com', 'pitchbook.com', 'cbinsights.com'
    ];
    
    // Tier 2: High credibility sources (tech news, industry publications)
    const tier2Domains = [
      // Technology & Business News
      'techcrunch.com', 'venturebeat.com', 'wired.com', 'arstechnica.com',
      'engadget.com', 'theverge.com', 'zdnet.com', 'cnet.com',
      'forbes.com', 'businessinsider.com', 'cnbc.com', 'fortune.com',
      'inc.com', 'fastcompany.com', 'hbr.org',
      
      // Industry Specific
      'salesforce.com', 'hubspot.com', 'gartner.com', 'forrester.com',
      'idc.com', 'statista.com'
    ];
    
    // Tier 3: Medium credibility sources (professional networks, specialized sites)
    const tier3Domains = [
      // Professional Networks
      'linkedin.com', 'glassdoor.com', 'indeed.com', 'angel.co',
      
      // Information Resources
      'wikipedia.org', 'github.com', 'stackoverflow.com',
      
      // Academic & Educational
      'edu', '.ac.uk', '.edu.au', 'harvard.edu', 'mit.edu', 'stanford.edu'
    ];
    
    // Tier 4: Company websites and PR sources
    const tier4Patterns = [
      'investor', 'ir.', 'about.', 'newsroom.', 'press.',
      '.com', '.co', '.org', '.net'
    ];
    
    // Check domain tiers
    if (tier1Domains.includes(domainLower)) {
      return 0.95; // Highest authority
    }
    
    if (tier2Domains.includes(domainLower)) {
      return 0.85; // High authority
    }
    
    if (tier3Domains.some(domain => domainLower.includes(domain))) {
      return 0.75; // Medium-high authority
    }
    
    // Check for educational domains
    if (domainLower.includes('.edu') || domainLower.includes('.ac.')) {
      return 0.80; // Academic sources get high credibility
    }
    
    // Check for government domains
    if (domainLower.includes('.gov') || domainLower.includes('.mil')) {
      return 0.90; // Government sources get very high credibility
    }
    
    // Check for investor relations and official company sources
    if (tier4Patterns.some(pattern => domainLower.includes(pattern))) {
      // Company official sources get medium credibility
      if (domainLower.includes('investor') || domainLower.includes('ir.')) {
        return 0.70; // IR pages are more credible
      }
      return 0.60; // General company pages
    }
    
    return 0.50; // Default credibility for unknown sources
  }

  /**
   * Calculate comprehensive credibility score including author and date factors
   */
  static calculateComprehensiveCredibilityScore(
    domain: string, 
    content: string, 
    url: string
  ): number {
    let baseScore = this.calculateCredibilityScore(domain);
    
    // Author factor
    const author = CompanyExtractor.extractAuthor(content, url);
    if (author) {
      baseScore += 0.05; // Small boost for having an identifiable author
    }
    
    // Recency factor
    const publishDate = CompanyExtractor.extractPublicationDate(content);
    if (publishDate) {
      const pubDate = new Date(publishDate);
      const now = new Date();
      const daysDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 90) {
        baseScore += 0.10; // Recent content gets significant boost
      } else if (daysDiff <= 365) {
        baseScore += 0.05; // Moderately recent gets small boost
      }
      // Older content doesn't get penalized, just no boost
    }
    
    // Content quality indicators
    if (content.length > 1000) {
      baseScore += 0.02; // Longer content often indicates more thorough reporting
    }
    
    // Cap at 1.0
    return Math.min(baseScore, 1.0);
  }

  /**
   * Prioritize sources by type to improve coverage and credibility.
   * This returns URLs in priority order based on source types and authority.
   */
  static prioritizeSourcesByType(
    urls: string[],
    searchResults: any[],
    companyDomain: string
  ): string[] {
    const prioritized: string[] = [];
    const companyLower = CompanyExtractor.extractCompanyName(companyDomain).toLowerCase();

    // 1. Official company sources (highest priority)
    const officialSources = searchResults.filter(r => 
      r.url.includes(companyDomain) || r.url.includes(`site:${companyDomain}`)
    );
    prioritized.push(...officialSources.map(r => r.url));

    // 2. News and authoritative news sites
    const newsSources = searchResults.filter(r => 
      this.determineSourceType(r.url) === 'news' || 
      this.determineSourceType(r.url) === 'press_release' || 
      this.determineSourceType(r.url) === 'report'
    );
    prioritized.push(...newsSources.map(r => r.url));

    // 3. Financial sources
    const financialSources = searchResults.filter(r => 
      this.determineSourceType(r.url) === 'financial'
    );
    prioritized.push(...financialSources.map(r => r.url));

    // 4. Educational and research sources
    const educationalSources = searchResults.filter(r => 
      this.determineSourceType(r.url) === 'educational'
    );
    prioritized.push(...educationalSources.map(r => r.url));

    // 5. Blogs and industry publications
    const blogSources = searchResults.filter(r => 
      this.determineSourceType(r.url) === 'blog'
    );
    prioritized.push(...blogSources.map(r => r.url));

    // 6. Professional networks and directories
    const professionalSources = searchResults.filter(r => 
      this.determineSourceType(r.url) === 'social' || 
      this.determineSourceType(r.url) === 'company'
    );
    prioritized.push(...professionalSources.map(r => r.url));

    // 7. General web pages (fallback)
    const remainingUrls = urls.filter(url => !prioritized.includes(url));
    prioritized.push(...remainingUrls);

    return prioritized;
  }

  /**
   * Analyze a batch of sources and return priority scores
   */
  static analyzeSources(urls: string[], searchResults: any[]): SourcePriority[] {
    return urls.map(url => {
      const sourceType = this.determineSourceType(url);
      const credibilityScore = this.calculateCredibilityScore(CompanyExtractor.extractDomain(url));
      
      // Calculate priority based on source type and credibility
      let priority = credibilityScore;
      
      // Boost priority based on source type
      switch (sourceType) {
        case 'financial':
          priority += 0.2;
          break;
        case 'news':
          priority += 0.15;
          break;
        case 'company':
          priority += 0.1;
          break;
        case 'report':
          priority += 0.15;
          break;
        case 'educational':
          priority += 0.1;
          break;
        default:
          // No additional boost
      }
      
      return {
        url,
        priority: Math.min(priority, 1.0),
        sourceType
      };
    }).sort((a, b) => b.priority - a.priority); // Sort by priority descending
  }
} 