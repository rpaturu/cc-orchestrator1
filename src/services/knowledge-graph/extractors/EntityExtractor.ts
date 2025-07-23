/**
 * EntityExtractor - Comprehensive Google Knowledge Graph entity data extraction
 */

import { Logger } from '../../core/Logger';

import {
  GoogleKnowledgeGraphResult,
  GoogleKnowledgeGraphLookupResult,
  EntityDetails,
  ExtractionResult,
  EntityExtractionContext,
  ValidationResult,
  QualityAssessment
} from '../types/KnowledgeGraphTypes';

export class EntityExtractor {
  constructor(private logger: Logger) {}

  /**
   * Extract comprehensive metadata from a Knowledge Graph entity
   */
  extractComprehensiveMetadata(entity: EntityDetails, companyName: string): GoogleKnowledgeGraphResult {
    this.logger.debug('Starting comprehensive metadata extraction', { companyName });

    // Initialize result with basic identity
    const result: GoogleKnowledgeGraphResult = {
      name: entity.name || companyName,
      description: entity.description || entity.detailedDescription?.articleBody,
      alternateName: entity.alternateName,
      legalName: entity.legalName,
      sources: ['google_knowledge_graph'],
      extractionMetrics: {
        totalFieldsFound: 0,
        sectionsExtracted: 0,
        qualityScore: 0
      }
    };

    // Extract domain with fallback strategies
    result.domain = this.extractDomain(entity, companyName);

    // Extract all sections
    result.contactInfo = this.extractContactInfo(entity);
    result.businessDetails = this.extractBusinessDetails(entity);
    result.businessIdentifiers = this.extractBusinessIdentifiers(entity);
    result.industries = this.extractIndustries(entity);
    result.branding = this.extractBranding(entity);
    result.relationships = this.extractRelationships(entity);
    result.qualityIndicators = this.extractQualityIndicators(entity);
    result.commercialInfo = this.extractCommercialInfo(entity);
    result.governance = this.extractGovernance(entity);
    result.externalReferences = this.extractExternalReferences(entity);
    result.expertise = this.extractExpertise(entity);

    // Calculate extraction metrics
    result.extractionMetrics = this.calculateExtractionMetrics(result, entity);

    this.logger.info('Comprehensive metadata extraction completed', {
      companyName,
      sectionsExtracted: result.extractionMetrics.sectionsExtracted,
      qualityScore: result.extractionMetrics.qualityScore
    });

    return result;
  }

  /**
   * Extract basic info for lookup operations
   */
  extractBasicInfo(entity: EntityDetails, query: string): GoogleKnowledgeGraphLookupResult {
    this.logger.debug('Extracting basic info for lookup', { query });

    const result: GoogleKnowledgeGraphLookupResult = {
      name: entity.name || query
    };

    // Extract domain
    result.domain = this.extractDomain(entity, query);

    // Extract description
    result.description = entity.description || entity.detailedDescription?.articleBody;

    // Extract industry (use first if array)
    if (entity.industry) {
      result.industry = Array.isArray(entity.industry) ? entity.industry[0] : entity.industry;
    }

    // Extract size from employee count
    if (entity.numberOfEmployees) {
      result.size = this.categorizeCompanySize(entity.numberOfEmployees);
    }

    // Extract logo
    result.logo = entity.logo?.contentUrl || entity.image?.contentUrl;

    // Extract headquarters
    result.headquarters = this.extractHeadquarters(entity);

    // Extract founding date
    result.founded = entity.foundingDate;

    return result;
  }

  // =====================================
  // PRIVATE EXTRACTION METHODS
  // =====================================

  private extractDomain(entity: EntityDetails, companyName: string): string | undefined {
    // Primary strategy: Extract from official URL
    if (entity.url) {
      try {
        const url = new URL(entity.url);
        const domain = url.hostname.replace('www.', '');
        this.logger.debug('Extracted domain from URL field', { companyName, domain });
        return domain;
      } catch (error) {
        this.logger.warn('Failed to parse URL from entity', { companyName, url: entity.url });
      }
    }

    // Fallback: Extract from sameAs URLs
    if (entity.sameAs && Array.isArray(entity.sameAs)) {
      for (const url of entity.sameAs) {
        try {
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname.toLowerCase();
          
          // Skip social media and reference sites - look for actual company domains
          if (!this.isSocialMediaOrReference(hostname)) {
            const domain = hostname.replace('www.', '');
            this.logger.debug('Extracted domain from sameAs fallback', { companyName, domain });
            return domain;
          }
        } catch (error) {
          this.logger.warn('Failed to parse sameAs URL', { url, error: String(error) });
        }
      }
    }

    this.logger.debug('No domain found for entity', { companyName });
    return undefined;
  }

  private extractContactInfo(entity: EntityDetails): GoogleKnowledgeGraphResult['contactInfo'] {
    const contactInfo: NonNullable<GoogleKnowledgeGraphResult['contactInfo']> = {};

    if (entity.telephone) contactInfo.phone = entity.telephone;
    if (entity.email) contactInfo.email = entity.email;
    if (entity.faxNumber) contactInfo.fax = entity.faxNumber;

    // Extract address
    if (entity.address) {
      contactInfo.address = this.formatAddress(entity.address);
    } else if (entity.location) {
      contactInfo.address = this.formatAddress(entity.location);
    }

    return Object.keys(contactInfo).length > 0 ? contactInfo : undefined;
  }

  private extractBusinessDetails(entity: EntityDetails): GoogleKnowledgeGraphResult['businessDetails'] {
    const businessDetails: NonNullable<GoogleKnowledgeGraphResult['businessDetails']> = {};

    if (entity.foundingDate) businessDetails.foundingDate = entity.foundingDate;
    if (entity.foundingLocation) {
      businessDetails.foundingLocation = typeof entity.foundingLocation === 'string' ? 
        entity.foundingLocation : entity.foundingLocation.name;
    }
    if (entity.dissolutionDate) businessDetails.dissolutionDate = entity.dissolutionDate;

    // Extract employee count
    if (entity.numberOfEmployees) {
      const empCount = typeof entity.numberOfEmployees === 'string' ? 
        parseInt(entity.numberOfEmployees) : entity.numberOfEmployees;
      businessDetails.employeeCount = empCount;
      businessDetails.companySize = this.categorizeCompanySize(empCount);
    }

    return Object.keys(businessDetails).length > 0 ? businessDetails : undefined;
  }

  private extractBusinessIdentifiers(entity: EntityDetails): GoogleKnowledgeGraphResult['businessIdentifiers'] {
    const identifiers: NonNullable<GoogleKnowledgeGraphResult['businessIdentifiers']> = {};

    if (entity.naics) identifiers.naicsCode = entity.naics;
    if (entity.duns) identifiers.dunsNumber = entity.duns;
    if (entity.leiCode) identifiers.leiCode = entity.leiCode;
    if (entity.taxID) identifiers.taxId = entity.taxID;
    if (entity.vatID) identifiers.vatId = entity.vatID;

    return Object.keys(identifiers).length > 0 ? identifiers : undefined;
  }

  private extractIndustries(entity: EntityDetails): string[] | undefined {
    const industries: string[] = [];

    if (entity.industry) {
      if (Array.isArray(entity.industry)) {
        industries.push(...entity.industry);
      } else {
        industries.push(entity.industry);
      }
    }

    // Extract from knowsAbout field
    if (entity.knowsAbout) {
      const knowledge = Array.isArray(entity.knowsAbout) ? entity.knowsAbout : [entity.knowsAbout];
      industries.push(...knowledge.filter(k => typeof k === 'string'));
    }

    return industries.length > 0 ? [...new Set(industries)] : undefined;
  }

  private extractBranding(entity: EntityDetails): GoogleKnowledgeGraphResult['branding'] {
    const branding: NonNullable<GoogleKnowledgeGraphResult['branding']> = {};

    if (entity.logo?.contentUrl) branding.logo = entity.logo.contentUrl;
    if (entity.image?.contentUrl) branding.image = entity.image.contentUrl;
    if (entity.slogan) branding.slogan = entity.slogan;

    return Object.keys(branding).length > 0 ? branding : undefined;
  }

  private extractRelationships(entity: EntityDetails): GoogleKnowledgeGraphResult['relationships'] {
    const relationships: NonNullable<GoogleKnowledgeGraphResult['relationships']> = {};

    // Parent organization
    if (entity.parentOrganization) {
      relationships.parentOrganization = typeof entity.parentOrganization === 'string' ? 
        entity.parentOrganization : entity.parentOrganization.name;
    }

    // Subsidiaries
    if (entity.subOrganization && Array.isArray(entity.subOrganization)) {
      relationships.subsidiaries = entity.subOrganization.map(sub => 
        typeof sub === 'string' ? sub : sub.name
      ).filter(Boolean);
    }

    // Departments
    if (entity.department && Array.isArray(entity.department)) {
      relationships.departments = entity.department.map(dept => 
        typeof dept === 'string' ? dept : dept.name
      ).filter(Boolean);
    }

    // Founders
    if (entity.founder && Array.isArray(entity.founder)) {
      relationships.founders = entity.founder.map(founder => 
        typeof founder === 'string' ? founder : founder.name
      ).filter(Boolean);
    }

    // Key employees
    if (entity.employee && Array.isArray(entity.employee)) {
      relationships.keyEmployees = entity.employee.slice(0, 10).map(emp => 
        typeof emp === 'string' ? emp : emp.name
      ).filter(Boolean);
    }

    // Member of
    if (entity.memberOf && Array.isArray(entity.memberOf)) {
      relationships.memberOf = entity.memberOf.map(org => 
        typeof org === 'string' ? org : org.name
      ).filter(Boolean);
    }

    return Object.keys(relationships).length > 0 ? relationships : undefined;
  }

  private extractQualityIndicators(entity: EntityDetails): GoogleKnowledgeGraphResult['qualityIndicators'] {
    const indicators: NonNullable<GoogleKnowledgeGraphResult['qualityIndicators']> = {};

    // Ratings
    if (entity.aggregateRating) {
      indicators.rating = {
        ratingValue: entity.aggregateRating.ratingValue || 0,
        reviewCount: entity.aggregateRating.reviewCount,
        bestRating: entity.aggregateRating.bestRating,
        worstRating: entity.aggregateRating.worstRating
      };
    }

    // Awards
    if (entity.award) {
      indicators.awards = Array.isArray(entity.award) ? entity.award : [entity.award];
    }

    return Object.keys(indicators).length > 0 ? indicators : undefined;
  }

  private extractCommercialInfo(entity: EntityDetails): GoogleKnowledgeGraphResult['commercialInfo'] {
    const commercial: NonNullable<GoogleKnowledgeGraphResult['commercialInfo']> = {};

    // Markets served
    if (entity.areaServed && Array.isArray(entity.areaServed)) {
      commercial.marketsServed = entity.areaServed.map(area => 
        typeof area === 'string' ? area : area.name
      ).filter(Boolean);
    }

    // Payment methods
    if (entity.paymentAccepted) {
      commercial.paymentMethods = Array.isArray(entity.paymentAccepted) ? 
        entity.paymentAccepted : [entity.paymentAccepted];
    }

    return Object.keys(commercial).length > 0 ? commercial : undefined;
  }

  private extractGovernance(entity: EntityDetails): GoogleKnowledgeGraphResult['governance'] {
    const governance: NonNullable<GoogleKnowledgeGraphResult['governance']> = {};

    // Funders
    if (entity.funder && Array.isArray(entity.funder)) {
      governance.funders = entity.funder.map(funder => 
        typeof funder === 'string' ? funder : funder.name
      ).filter(Boolean);
    }

    // Sponsors
    if (entity.sponsor && Array.isArray(entity.sponsor)) {
      governance.sponsors = entity.sponsor.map(sponsor => 
        typeof sponsor === 'string' ? sponsor : sponsor.name
      ).filter(Boolean);
    }

    // Policies
    if (entity.ethicsPolicy) governance.ethicsPolicy = entity.ethicsPolicy;
    if (entity.diversityPolicy) governance.diversityPolicy = entity.diversityPolicy;
    if (entity.correctionsPolicy) governance.correctionsPolicy = entity.correctionsPolicy;

    return Object.keys(governance).length > 0 ? governance : undefined;
  }

  private extractExternalReferences(entity: EntityDetails): GoogleKnowledgeGraphResult['externalReferences'] {
    const references: NonNullable<GoogleKnowledgeGraphResult['externalReferences']> = {};

    if (entity.sameAs && Array.isArray(entity.sameAs)) {
      const socialMedia: string[] = [];
      const referenceSites: string[] = [];

      entity.sameAs.forEach(url => {
        try {
          const hostname = new URL(url).hostname.toLowerCase();
          if (this.isSocialMediaOrReference(hostname)) {
            if (hostname.includes('wikipedia') || hostname.includes('crunchbase')) {
              referenceSites.push(url);
            } else {
              socialMedia.push(url);
            }
          }
        } catch (error) {
          this.logger.warn('Failed to parse sameAs URL for categorization', { url });
        }
      });

      if (socialMedia.length > 0) references.socialMedia = socialMedia;
      if (referenceSites.length > 0) references.referenceSites = referenceSites;
    }

    return Object.keys(references).length > 0 ? references : undefined;
  }

  private extractExpertise(entity: EntityDetails): GoogleKnowledgeGraphResult['expertise'] {
    const expertise: NonNullable<GoogleKnowledgeGraphResult['expertise']> = {};

    // Knowledge areas
    if (entity.knowsAbout) {
      expertise.knowledgeAreas = Array.isArray(entity.knowsAbout) ? 
        entity.knowsAbout : [entity.knowsAbout];
    }

    // Languages
    if (entity.knowsLanguage) {
      expertise.languages = Array.isArray(entity.knowsLanguage) ? 
        entity.knowsLanguage : [entity.knowsLanguage];
    }

    return Object.keys(expertise).length > 0 ? expertise : undefined;
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  private isSocialMediaOrReference(hostname: string): boolean {
    const patterns = [
      'wikipedia.org', 'facebook.com', 'twitter.com', 'linkedin.com',
      'instagram.com', 'youtube.com', 'crunchbase.com', 'bloomberg.com',
      'reuters.com', 'forbes.com', 'techcrunch.com'
    ];
    return patterns.some(pattern => hostname.includes(pattern));
  }

  private categorizeCompanySize(empCount: number | string): string {
    const count = typeof empCount === 'string' ? parseInt(empCount) : empCount;
    
    if (count < 10) return 'Startup (1-9)';
    if (count < 50) return 'Small (10-49)';
    if (count < 250) return 'Medium (50-249)';
    if (count < 1000) return 'Large (250-999)';
    if (count < 10000) return 'Enterprise (1K-10K)';
    return 'Mega Enterprise (10K+)';
  }

  private extractHeadquarters(entity: EntityDetails): string | undefined {
    if (entity.address) {
      return this.formatAddress(entity.address);
    }
    if (entity.location) {
      return this.formatAddress(entity.location);
    }
    return undefined;
  }

  private formatAddress(address: any): string {
    if (typeof address === 'string') return address;
    
    if (address && typeof address === 'object') {
      const parts = [];
      if (address.streetAddress) parts.push(address.streetAddress);
      if (address.addressLocality) parts.push(address.addressLocality);
      if (address.addressRegion) parts.push(address.addressRegion);
      if (address.addressCountry) parts.push(address.addressCountry);
      return parts.join(', ');
    }
    
    return '';
  }

  private calculateExtractionMetrics(result: GoogleKnowledgeGraphResult, entity: EntityDetails): GoogleKnowledgeGraphResult['extractionMetrics'] {
    const allEntityKeys = Object.keys(entity || {});
    const sectionsExtracted = [
      result.contactInfo,
      result.businessDetails,
      result.businessIdentifiers,
      result.industries,
      result.branding,
      result.relationships,
      result.qualityIndicators,
      result.commercialInfo,
      result.governance,
      result.externalReferences,
      result.expertise
    ].filter(Boolean).length;

    // Calculate quality score based on completeness and entity richness
    const completeness = sectionsExtracted / 11; // 11 total sections
    const entityRichness = Math.min(allEntityKeys.length / 20, 1); // Normalize based on 20 fields
    const qualityScore = (completeness * 0.7 + entityRichness * 0.3);

    return {
      totalFieldsFound: allEntityKeys.length,
      sectionsExtracted,
      qualityScore: Math.round(qualityScore * 100) / 100
    };
  }

  // =====================================
  // VALIDATION AND QUALITY
  // =====================================

  /**
   * Validate extraction result quality
   */
  validateExtractionResult(result: GoogleKnowledgeGraphResult): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!result.name) errors.push('Company name is required');
    if (!result.sources || result.sources.length === 0) errors.push('Sources are required');

    // Quality checks
    if (!result.domain && !result.description) {
      warnings.push('No domain or description available - limited data quality');
    }

    if (result.extractionMetrics.qualityScore < 0.3) {
      warnings.push('Low extraction quality score - data may be incomplete');
    }

    if (result.extractionMetrics.sectionsExtracted < 3) {
      warnings.push('Few sections extracted - consider alternative sources');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore: result.extractionMetrics.qualityScore
    };
  }

  /**
   * Calculate quality assessment for results
   */
  calculateQualityAssessment(result: GoogleKnowledgeGraphResult): QualityAssessment {
    const completeness = result.extractionMetrics.sectionsExtracted / 11;
    const accuracy = result.extractionMetrics.qualityScore; // Use quality score as accuracy proxy
    const freshness = 0.8; // Assume relatively fresh data from Google
    const consistency = this.checkInternalConsistency(result);
    const overall = (completeness + accuracy + freshness + consistency) / 4;

    return {
      completeness,
      accuracy,
      freshness,
      consistency,
      overall
    };
  }

  private checkInternalConsistency(result: GoogleKnowledgeGraphResult): number {
    let consistency = 1.0;

    // Check if business details are consistent
    if (result.businessDetails?.foundingDate && result.businessDetails?.dissolutionDate) {
      const founding = new Date(result.businessDetails.foundingDate);
      const dissolution = new Date(result.businessDetails.dissolutionDate);
      if (founding > dissolution) consistency -= 0.3;
    }

    // Check if employee count matches company size
    if (result.businessDetails?.employeeCount && result.businessDetails?.companySize) {
      const expectedSize = this.categorizeCompanySize(result.businessDetails.employeeCount);
      if (expectedSize !== result.businessDetails.companySize) consistency -= 0.2;
    }

    return Math.max(0, consistency);
  }
} 