import { CacheService } from '../../core/CacheService';
import { Logger } from '../../core/Logger';
import { SerpAPIService } from '../../SerpAPIService';
import { CacheType } from '../../../types/cache-types';
import { 
  SourceType, 
  OrchestrationConfig, 
  OrchestrationHealth,
  MultiSourceData,
  SourceAvailability,
  DEFAULT_SOURCE_COSTS
} from '../types/OrchestrationTypes';

export abstract class OrchestrationCore {
  protected cacheService: CacheService;
  protected logger: Logger;
  protected serpAPIService: SerpAPIService;
  protected config: OrchestrationConfig;

  constructor(
    cacheService: CacheService,
    logger: Logger,
    serpAPIService: SerpAPIService,
    config?: Partial<OrchestrationConfig>
  ) {
    this.cacheService = cacheService;
    this.logger = logger;
    this.serpAPIService = serpAPIService;
    
    // Enhanced parallel execution configuration
    this.config = {
      maxParallelSources: 5, // Increased from 3 for better performance
      defaultTimeout: 30000, // 30 seconds
      retryAttempts: 2,
      cacheEnabled: true,
      qualityThreshold: 70,
      costOptimizationEnabled: true,
      redundancyOptimizationEnabled: true,
      ...config
    };
  }

  /**
   * Generate cache key for consistent caching across orchestration
   */
  protected generateCacheKey(source: SourceType, companyName: string): string {
    const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `orchestration_${source}_${cleanName}`;
  }

  /**
   * Get cost for a specific source
   */
  protected getSourceCost(source: SourceType): number {
    return DEFAULT_SOURCE_COSTS[source] || 1.0;
  }

  /**
   * Get estimated duration for a source collection
   */
  protected getEstimatedDuration(source: SourceType): number {
    const durations: Record<SourceType, number> = {
      serp_organic: 2000,
      serp_news: 2000,
      serp_jobs: 2000,
      serp_linkedin: 2500,
      serp_youtube: 2000,
      serp_api: 2000,
      // Enhanced SerpAPI sources
      serp_google_finance: 2500,
      serp_google_trends: 2000,
      serp_google_images: 2500,
      serp_google_videos: 2500,
      serp_google_local: 3000,
      serp_google_maps: 3000,
      serp_google_shopping: 2500,
      serp_google_patents: 3000,
      serp_bing_search: 2500,
      serp_duckduckgo: 2000,
      // Enhanced Snov.io APIs
      snov_email_finder: 3000,
      snov_email_verifier: 2000,
      snov_domain_search: 4000,
      snov_data_enrichment: 3000,
      snov_linkedin_enrichment: 3500,
      snov_bulk_email_finder: 5000,
      snov_bulk_email_verifier: 4000,
      // Bright Data specific datasets
      brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info: 4000,
      brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info: 3500,
      brightdata_gd_l1vilsfd1xpsndbtpr_ventureradar_company_info: 3000,
      brightdata_gd_m0ci4a4ivx3j5l6nx_zoominfo_companies: 4500,
      brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies: 4000,
      brightdata_gd_m4ijiqfp2n9oe3oluj_pitchbook_companies: 5000,
      brightdata_gd_l1vilaxi10wutoage7_owler_companies: 3000,
      brightdata_gd_m3fl0mwzmfpfn4cw4_companies_enriched: 3500,
      brightdata_gd_l1viktl72bvl7bjuj0_linkedin_people_profiles: 4000,
      brightdata_gd_m5zhkpdgryvlxn8zg_pitchbook_people_profiles: 5000,
      brightdata_gd_m2a6waqv18439a8thq_b2b_contacts_companies: 4000,
      brightdata_gd_m18zt6ec11wfqohyrs_employees_business_enriched: 3500,
      brightdata_gd_l7j0bx501ockwldaqf_glassdoor_companies_overview: 3000,
      brightdata_gd_l7j1po0921hbu0ri1z_glassdoor_companies_reviews: 3000,
      brightdata_gd_lpfbbndm1xnopbrcr0_glassdoor_job_listings: 3000,
      brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings: 3000,
      brightdata_gd_l88xp4k01qnhvyqlvw_g2_software_product_overview: 3000,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_product_reviews: 3000,
      brightdata_gd_lztojazw1389985ops_trustradius_product_reviews: 3000,
      brightdata_gd_lm5zmhwd2sni130p_trustpilot_business_reviews: 3000,
      brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings: 3000,
      brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info: 3000,
      brightdata_gd_m487ihp32jtc4ujg45_linkedin_profiles_jobs_listings: 3500,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_reviews: 3000,
      brightdata_gd_lnsxoxzi1omrwnka5r_google_news: 3000,
      snov_contacts: 3000,
      apollo_contacts: 3000,
      apollo: 3000,
      zoominfo: 4000,
      hunter: 2500,
      company_db: 1500,
    };
    return durations[source] || 3000;
  }

  /**
   * Get cache type for a specific source
   */
  protected getCacheTypeForSource(source: SourceType): CacheType {
    const cacheTypeMap: Record<SourceType, CacheType> = {
      serp_organic: CacheType.SERP_ORGANIC_RAW,
      serp_news: CacheType.SERP_NEWS_RAW,
      serp_jobs: CacheType.SERP_JOBS_RAW,
      serp_linkedin: CacheType.SERP_LINKEDIN_RAW,
      serp_youtube: CacheType.SERP_YOUTUBE_RAW,
      serp_api: CacheType.SERP_API_RAW_RESPONSE,
      // Enhanced SerpAPI sources
      serp_google_finance: CacheType.SERP_API_RAW_RESPONSE,
      serp_google_trends: CacheType.SERP_API_RAW_RESPONSE,
      serp_google_images: CacheType.SERP_API_RAW_RESPONSE,
      serp_google_videos: CacheType.SERP_API_RAW_RESPONSE,
      serp_google_local: CacheType.SERP_API_RAW_RESPONSE,
      serp_google_maps: CacheType.SERP_API_RAW_RESPONSE,
      serp_google_shopping: CacheType.SERP_API_RAW_RESPONSE,
      serp_google_patents: CacheType.SERP_API_RAW_RESPONSE,
      serp_bing_search: CacheType.SERP_API_RAW_RESPONSE,
      serp_duckduckgo: CacheType.SERP_API_RAW_RESPONSE,
      // Enhanced Snov.io APIs
      snov_email_finder: CacheType.SNOV_CONTACTS_RAW,
      snov_email_verifier: CacheType.SNOV_CONTACTS_RAW,
      snov_domain_search: CacheType.SNOV_CONTACTS_RAW,
      snov_data_enrichment: CacheType.SNOV_CONTACTS_RAW,
      snov_linkedin_enrichment: CacheType.SNOV_CONTACTS_RAW,
      snov_bulk_email_finder: CacheType.SNOV_CONTACTS_RAW,
      snov_bulk_email_verifier: CacheType.SNOV_CONTACTS_RAW,
      // Bright Data specific datasets
      brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l1vilsfd1xpsndbtpr_ventureradar_company_info: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_m0ci4a4ivx3j5l6nx_zoominfo_companies: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_m4ijiqfp2n9oe3oluj_pitchbook_companies: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l1vilaxi10wutoage7_owler_companies: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_m3fl0mwzmfpfn4cw4_companies_enriched: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l1viktl72bvl7bjuj0_linkedin_people_profiles: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_m5zhkpdgryvlxn8zg_pitchbook_people_profiles: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_m2a6waqv18439a8thq_b2b_contacts_companies: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_m18zt6ec11wfqohyrs_employees_business_enriched: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l7j0bx501ockwldaqf_glassdoor_companies_overview: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l7j1po0921hbu0ri1z_glassdoor_companies_reviews: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_lpfbbndm1xnopbrcr0_glassdoor_job_listings: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l88xp4k01qnhvyqlvw_g2_software_product_overview: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_product_reviews: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_lztojazw1389985ops_trustradius_product_reviews: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_lm5zmhwd2sni130p_trustpilot_business_reviews: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_m487ihp32jtc4ujg45_linkedin_profiles_jobs_listings: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_reviews: CacheType.BRIGHTDATA_COMPANY_ENRICHMENT,
      brightdata_gd_lnsxoxzi1omrwnka5r_google_news: CacheType.BUYING_SIGNALS_BRIGHTDATA_NEWS,
      snov_contacts: CacheType.SNOV_CONTACTS_RAW,
      apollo_contacts: CacheType.APOLLO_CONTACT_ENRICHMENT,
      apollo: CacheType.APOLLO_CONTACT_ENRICHMENT,
      zoominfo: CacheType.ZOOMINFO_CONTACT_ENRICHMENT,
      hunter: CacheType.HUNTER_EMAIL_ENRICHMENT,
      company_db: CacheType.COMPANY_DATABASE_ENRICHMENT,
    };
    return cacheTypeMap[source] || CacheType.UNKNOWN;
  }

  /**
   * Get API endpoint for a specific source
   */
  protected getEndpointForSource(source: SourceType): string {
    const endpoints: Record<SourceType, string> = {
      serp_organic: '/api/serp/organic',
      serp_news: '/api/serp/news',
      serp_jobs: '/api/serp/jobs',
      serp_linkedin: '/api/serp/linkedin',
      serp_youtube: '/api/serp/youtube',
      serp_api: '/api/serp',
      // Enhanced SerpAPI sources
      serp_google_finance: '/api/serp/google-finance',
      serp_google_trends: '/api/serp/google-trends',
      serp_google_images: '/api/serp/google-images',
      serp_google_videos: '/api/serp/google-videos',
      serp_google_local: '/api/serp/google-local',
      serp_google_maps: '/api/serp/google-maps',
      serp_google_shopping: '/api/serp/google-shopping',
      serp_google_patents: '/api/serp/google-patents',
      serp_bing_search: '/api/serp/bing',
      serp_duckduckgo: '/api/serp/duckduckgo',
      // Enhanced Snov.io APIs
      snov_email_finder: '/api/snov/email-finder',
      snov_email_verifier: '/api/snov/email-verifier',
      snov_domain_search: '/api/snov/domain-search',
      snov_data_enrichment: '/api/snov/data-enrichment',
      snov_linkedin_enrichment: '/api/snov/linkedin-enrichment',
      snov_bulk_email_finder: '/api/snov/bulk-email-finder',
      snov_bulk_email_verifier: '/api/snov/bulk-email-verifier',
      // Bright Data specific datasets
      brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info: '/api/brightdata/linkedin-company',
      brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info: '/api/brightdata/slintel-company',
      brightdata_gd_l1vilsfd1xpsndbtpr_ventureradar_company_info: '/api/brightdata/ventureradar-company',
      brightdata_gd_m0ci4a4ivx3j5l6nx_zoominfo_companies: '/api/brightdata/zoominfo-companies',
      brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies: '/api/brightdata/crunchbase-companies',
      brightdata_gd_m4ijiqfp2n9oe3oluj_pitchbook_companies: '/api/brightdata/pitchbook-companies',
      brightdata_gd_l1vilaxi10wutoage7_owler_companies: '/api/brightdata/owler-companies',
      brightdata_gd_m3fl0mwzmfpfn4cw4_companies_enriched: '/api/brightdata/companies-enriched',
      brightdata_gd_l1viktl72bvl7bjuj0_linkedin_people_profiles: '/api/brightdata/linkedin-people',
      brightdata_gd_m5zhkpdgryvlxn8zg_pitchbook_people_profiles: '/api/brightdata/pitchbook-people',
      brightdata_gd_m2a6waqv18439a8thq_b2b_contacts_companies: '/api/brightdata/b2b-contacts',
      brightdata_gd_m18zt6ec11wfqohyrs_employees_business_enriched: '/api/brightdata/employees-enriched',
      brightdata_gd_l7j0bx501ockwldaqf_glassdoor_companies_overview: '/api/brightdata/glassdoor-overview',
      brightdata_gd_l7j1po0921hbu0ri1z_glassdoor_companies_reviews: '/api/brightdata/glassdoor-reviews',
      brightdata_gd_lpfbbndm1xnopbrcr0_glassdoor_job_listings: '/api/brightdata/glassdoor-jobs',
      brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings: '/api/brightdata/linkedin-jobs',
      brightdata_gd_l88xp4k01qnhvyqlvw_g2_software_product_overview: '/api/brightdata/g2-overview',
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_product_reviews: '/api/brightdata/g2-reviews',
      brightdata_gd_lztojazw1389985ops_trustradius_product_reviews: '/api/brightdata/trustradius-reviews',
      brightdata_gd_lm5zmhwd2sni130p_trustpilot_business_reviews: '/api/brightdata/trustpilot-reviews',
      brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings: '/api/brightdata/indeed-jobs',
      brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info: '/api/brightdata/indeed-companies',
      brightdata_gd_m487ihp32jtc4ujg45_linkedin_profiles_jobs_listings: '/api/brightdata/linkedin-jobs',
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_reviews: '/api/brightdata/g2-software-reviews',
      brightdata_gd_lnsxoxzi1omrwnka5r_google_news: '/api/brightdata/google-news',
      snov_contacts: '/api/snov',
      apollo_contacts: '/api/apollo',
      apollo: '/api/apollo',
      zoominfo: '/api/zoominfo',
      hunter: '/api/hunter',
      company_db: '/api/company-db',
    };
    return endpoints[source] || '/api/unknown';
  }

  /**
   * Check if cached data is expired based on source configuration
   */
  protected isExpired(cached: any, maxAgeHours: number): boolean {
    if (!cached || !cached.timestamp) {
      return true;
    }

    const cachedTime = new Date(cached.timestamp);
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
    const now = new Date();

    return (now.getTime() - cachedTime.getTime()) > maxAge;
  }

  /**
   * Validate cost limits for orchestration operations
   */
  protected validateCostLimits(estimatedCost: number, maxCost: number): void {
    if (estimatedCost > maxCost) {
      throw new Error(`Estimated cost ($${estimatedCost}) exceeds maximum allowed cost ($${maxCost})`);
    }
  }

  /**
   * Calculate data quality score based on completeness and source reliability
   */
  protected calculateDataQuality(data: MultiSourceData, primarySource: SourceType): number {
    const reliabilityScores: Record<SourceType, number> = {
      serp_organic: 85,
      serp_news: 75,
      serp_jobs: 70,
      serp_linkedin: 90,
      serp_youtube: 60,
      serp_api: 85,
      // Enhanced SerpAPI sources
      serp_google_finance: 88,
      serp_google_trends: 85,
      serp_google_images: 80,
      serp_google_videos: 75,
      serp_google_local: 85,
      serp_google_maps: 90,
      serp_google_shopping: 85,
      serp_google_patents: 92,
      serp_bing_search: 80,
      serp_duckduckgo: 75,
      // Enhanced Snov.io APIs
      snov_email_finder: 85,
      snov_email_verifier: 90,
      snov_domain_search: 88,
      snov_data_enrichment: 85,
      snov_linkedin_enrichment: 88,
      snov_bulk_email_finder: 85,
      snov_bulk_email_verifier: 90,
      // Bright Data specific datasets
      brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info: 92,
      brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info: 88,
      brightdata_gd_l1vilsfd1xpsndbtpr_ventureradar_company_info: 85,
      brightdata_gd_m0ci4a4ivx3j5l6nx_zoominfo_companies: 90,
      brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies: 92,
      brightdata_gd_m4ijiqfp2n9oe3oluj_pitchbook_companies: 95,
      brightdata_gd_l1vilaxi10wutoage7_owler_companies: 85,
      brightdata_gd_m3fl0mwzmfpfn4cw4_companies_enriched: 88,
      brightdata_gd_l1viktl72bvl7bjuj0_linkedin_people_profiles: 92,
      brightdata_gd_m5zhkpdgryvlxn8zg_pitchbook_people_profiles: 95,
      brightdata_gd_m2a6waqv18439a8thq_b2b_contacts_companies: 88,
      brightdata_gd_m18zt6ec11wfqohyrs_employees_business_enriched: 85,
      brightdata_gd_l7j0bx501ockwldaqf_glassdoor_companies_overview: 88,
      brightdata_gd_l7j1po0921hbu0ri1z_glassdoor_companies_reviews: 85,
      brightdata_gd_lpfbbndm1xnopbrcr0_glassdoor_job_listings: 85,
      brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings: 85,
      brightdata_gd_l88xp4k01qnhvyqlvw_g2_software_product_overview: 88,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_product_reviews: 85,
      brightdata_gd_lztojazw1389985ops_trustradius_product_reviews: 85,
      brightdata_gd_lm5zmhwd2sni130p_trustpilot_business_reviews: 85,
      brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings: 85,
      brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info: 85,
      brightdata_gd_m487ihp32jtc4ujg45_linkedin_profiles_jobs_listings: 88,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_reviews: 88,
      brightdata_gd_lnsxoxzi1omrwnka5r_google_news: 90,
      snov_contacts: 80,
      apollo_contacts: 85,
      apollo: 85,
      zoominfo: 88,
      hunter: 78,
      company_db: 75,
    };

    const baseScore = reliabilityScores[primarySource] || 70;
    
    // Additional quality factors could be calculated here
    let qualityScore = baseScore;
    
    // Adjust based on data completeness
    const sourceCount = Object.keys(data).length;
    if (sourceCount > 1) {
      qualityScore += 5; // Bonus for multiple sources
    }
    
    return Math.min(100, qualityScore);
  }

  /**
   * Calculate completeness score based on data fields
   */
  private calculateCompleteness(data: any): number {
    if (!data) return 0;

    const expectedFields = [
      'companyName', 'industry', 'description', 'website',
      'employees', 'revenue', 'location', 'founded'
    ];

    const presentFields = expectedFields.filter(field => 
      data[field] && data[field] !== '' && data[field] !== null
    );

    return Math.round((presentFields.length / expectedFields.length) * 100);
  }

  /**
   * Get reliability score for a specific source
   */
  private getSourceReliability(source: SourceType): number {
    const reliabilityScores: Record<SourceType, number> = {
      serp_organic: 85,
      serp_news: 75,
      serp_jobs: 70,
      serp_linkedin: 90,
      serp_youtube: 60,
      serp_api: 85,
      // Enhanced SerpAPI sources
      serp_google_finance: 88,
      serp_google_trends: 85,
      serp_google_images: 80,
      serp_google_videos: 75,
      serp_google_local: 85,
      serp_google_maps: 90,
      serp_google_shopping: 85,
      serp_google_patents: 92,
      serp_bing_search: 80,
      serp_duckduckgo: 75,
      // Enhanced Snov.io APIs
      snov_email_finder: 85,
      snov_email_verifier: 90,
      snov_domain_search: 88,
      snov_data_enrichment: 85,
      snov_linkedin_enrichment: 88,
      snov_bulk_email_finder: 85,
      snov_bulk_email_verifier: 90,
      // Bright Data specific datasets
      brightdata_gd_l1vikfnt1wgvvqz95w_linkedin_company_info: 92,
      brightdata_gd_l1vilg5a1decoahvgq_slintel_6sense_company_info: 88,
      brightdata_gd_l1vilsfd1xpsndbtpr_ventureradar_company_info: 85,
      brightdata_gd_m0ci4a4ivx3j5l6nx_zoominfo_companies: 90,
      brightdata_gd_l1vijqt9jfj7olije_crunchbase_companies: 92,
      brightdata_gd_m4ijiqfp2n9oe3oluj_pitchbook_companies: 95,
      brightdata_gd_l1vilaxi10wutoage7_owler_companies: 85,
      brightdata_gd_m3fl0mwzmfpfn4cw4_companies_enriched: 88,
      brightdata_gd_l1viktl72bvl7bjuj0_linkedin_people_profiles: 92,
      brightdata_gd_m5zhkpdgryvlxn8zg_pitchbook_people_profiles: 95,
      brightdata_gd_m2a6waqv18439a8thq_b2b_contacts_companies: 88,
      brightdata_gd_m18zt6ec11wfqohyrs_employees_business_enriched: 85,
      brightdata_gd_l7j0bx501ockwldaqf_glassdoor_companies_overview: 88,
      brightdata_gd_l7j1po0921hbu0ri1z_glassdoor_companies_reviews: 85,
      brightdata_gd_lpfbbndm1xnopbrcr0_glassdoor_job_listings: 85,
      brightdata_gd_lpfll7v5hcqtkxl6l_linkedin_job_listings: 85,
      brightdata_gd_l88xp4k01qnhvyqlvw_g2_software_product_overview: 88,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_product_reviews: 85,
      brightdata_gd_lztojazw1389985ops_trustradius_product_reviews: 85,
      brightdata_gd_lm5zmhwd2sni130p_trustpilot_business_reviews: 85,
      brightdata_gd_l4dx9j9sscpvs7no2_indeed_job_listings: 85,
      brightdata_gd_l7qekxkv2i7ve6hx1s_indeed_companies_info: 85,
      brightdata_gd_m487ihp32jtc4ujg45_linkedin_profiles_jobs_listings: 88,
      brightdata_gd_l88xvdka1uao86xvlb_g2_software_reviews: 88,
      brightdata_gd_lnsxoxzi1omrwnka5r_google_news: 90,
      snov_contacts: 80,
      apollo_contacts: 85,
      apollo: 88,
      zoominfo: 92,
      hunter: 83,
      company_db: 80,
    };
    return reliabilityScores[source] || 75;
  }

  /**
   * Check health of orchestration system
   */
  async checkOrchestrationHealth(): Promise<OrchestrationHealth> {
    const sources: SourceType[] = ['serp_api', 'apollo', 'zoominfo', 'hunter', 'company_db'];
    const sourceAvailability: SourceAvailability[] = [];

    for (const source of sources) {
      try {
        const startTime = Date.now();
        // Simple health check - could be enhanced with actual API calls
        const available = await this.checkSourceAvailability(source);
        const responseTime = Date.now() - startTime;

        sourceAvailability.push({
          source,
          available,
          responseTime,
          lastChecked: new Date().toISOString(),
          errorRate: 0, // Would be calculated from historical data
        });
      } catch (error) {
        sourceAvailability.push({
          source,
          available: false,
          lastChecked: new Date().toISOString(),
          errorRate: 100,
        });
      }
    }

    const healthySources = sourceAvailability.filter(s => s.available).length;
    const totalSources = sourceAvailability.length;
    const healthRatio = healthySources / totalSources;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthRatio >= 0.8) overall = 'healthy';
    else if (healthRatio >= 0.5) overall = 'degraded';
    else overall = 'unhealthy';

    return {
      isHealthy: overall === 'healthy',
      components: {
        cache: true, // Would check cache service health
        serpAPI: true, // Would check SerpAPI service health
        dataCollection: true, // Would check data collection health
      },
      lastCheck: new Date().toISOString(),
      overall: overall === 'healthy',
    };
  }

  /**
   * Check if a specific source is available
   */
  private async checkSourceAvailability(_source: SourceType): Promise<boolean> {
    // This would implement actual health checks for each source
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Generate health recommendations based on source availability
   */
  private generateHealthRecommendations(sources: SourceAvailability[]): string[] {
    const recommendations: string[] = [];
    
    const unavailableSources = sources.filter(s => !s.available);
    if (unavailableSources.length > 0) {
      recommendations.push(`${unavailableSources.length} sources are unavailable. Consider using fallback sources.`);
    }

    const slowSources = sources.filter(s => s.responseTime && s.responseTime > 5000);
    if (slowSources.length > 0) {
      recommendations.push(`${slowSources.length} sources have slow response times. Consider reducing parallelism.`);
    }

    return recommendations;
  }

  /**
   * Sleep utility for rate limiting
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry mechanism for failed operations
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryAttempts || 2,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt <= maxRetries) {
          this.logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
            error: lastError.message,
            delay,
          });
          await this.sleep(delay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }
} 