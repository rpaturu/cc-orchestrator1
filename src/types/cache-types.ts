/**
 * Centralized Cache Type Definitions
 * 
 * This file defines all standardized cache types used throughout the application.
 * All cache operations must use these predefined types for consistency and type safety.
 */

export enum CacheType {
  // Raw Data Cache Types
  SERP_ORGANIC_RAW = 'serp_organic_raw',
  SERP_NEWS_RAW = 'serp_news_raw',
  SERP_JOBS_RAW = 'serp_jobs_raw',
  SERP_LINKEDIN_RAW = 'serp_linkedin_raw',
  SERP_YOUTUBE_RAW = 'serp_youtube_raw',
  SERP_API_RAW_RESPONSE = 'serp_api_raw_response',
  GOOGLE_KNOWLEDGE_GRAPH_RAW = 'google_kg_raw',
  GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT = 'google_kg_enrichment',
  GOOGLE_KNOWLEDGE_GRAPH_LOOKUP = 'google_kg_lookup',
  BRIGHTDATA_RAW = 'brightdata_raw',
  SNOV_CONTACTS_RAW = 'snov_contacts_raw',
  SNOV_VERIFICATION_RAW = 'snov_verification_raw',
  APOLLO_CONTACTS_RAW = 'apollo_contacts_raw',

  // SerpAPI Specific Results
  SERP_API_COMPANY_ENRICHMENT = 'serp_api_company_enrichment',
  SERP_API_COMPANY_LOOKUP = 'serp_api_company_lookup',
  SERP_API_ORGANIC_RESULTS = 'serp_api_organic_results',
  SERP_API_NEWS_RESULTS = 'serp_api_news_results',
  SERP_API_JOBS_RESULTS = 'serp_api_jobs_results',
  SERP_API_LINKEDIN_RESULTS = 'serp_api_linkedin_results',
  SERP_API_YOUTUBE_RESULTS = 'serp_api_youtube_results',
  SERP_API_KNOWLEDGE_GRAPH = 'serp_api_knowledge_graph',

  // Processing Cache Types
  SALES_INTELLIGENCE_CACHE = 'sales_intelligence_cache',
  COMPANY_ENRICHMENT = 'company_enrichment',
  COMPANY_SEARCH = 'company_search',
  COMPANY_LOOKUP = 'company_lookup',
  DOMAIN_SUGGESTIONS = 'domain_suggestions',

  // Analysis Cache Types
  COMPANY_OVERVIEW = 'company_overview',
  COMPANY_DISCOVERY = 'company_discovery', 
  COMPANY_ANALYSIS = 'company_analysis',
  COMPETITOR_ANALYSIS = 'competitor_analysis',
  PRODUCT_SUGGESTIONS = 'product_suggestions',

  // Vendor Context Cache Types (NEW)
  VENDOR_CONTEXT_ENRICHMENT = 'vendor_context_enrichment',
  VENDOR_CONTEXT_PARSED = 'vendor_context_parsed',
  VENDOR_CONTEXT_ANALYSIS = 'vendor_context_analysis',
  VENDOR_CONTEXT_RAW_DATA = 'vendor_context_raw_data',
  VENDOR_CONTEXT_REFERENCE = 'vendor_context_reference',
  
  // Customer Intelligence Cache Types (NEW)
  CUSTOMER_INTELLIGENCE_RAW = 'customer_intelligence_raw',
  CUSTOMER_INTELLIGENCE_PARSED = 'customer_intelligence_parsed',
  CUSTOMER_INTELLIGENCE_ANALYSIS = 'customer_intelligence_analysis',
  CUSTOMER_INTELLIGENCE_ENRICHMENT = 'customer_intelligence_enrichment',
  
  // Decision Makers Research Cache Types
  DECISION_MAKERS_RAW_DATA = 'decision_makers_raw_data',
  DECISION_MAKERS_NORMALIZED = 'decision_makers_normalized',
  DECISION_MAKERS_ANALYSIS = 'decision_makers_analysis',
  DECISION_MAKERS_ENRICHED = 'decision_makers_enriched',
  DECISION_MAKERS_SNOV_CONTACTS = 'decision_makers_snov_contacts',
  DECISION_MAKERS_SERP_LINKEDIN = 'decision_makers_serp_linkedin',
  DECISION_MAKERS_BRIGHTDATA_CONTACTS = 'decision_makers_brightdata_contacts',

  // Tech Stack Research Cache Types
  TECH_STACK_RAW_DATA = 'tech_stack_raw_data',
  TECH_STACK_NORMALIZED = 'tech_stack_normalized',
  TECH_STACK_ANALYSIS = 'tech_stack_analysis',
  TECH_STACK_ENRICHED = 'tech_stack_enriched',
  TECH_STACK_SERP_ORGANIC = 'tech_stack_serp_organic',
  TECH_STACK_BRIGHTDATA_BUILTWITH = 'tech_stack_brightdata_builtwith',
  TECH_STACK_BRIGHTDATA_STACKSHARE = 'tech_stack_brightdata_stackshare',

  // Competitive Positioning Research Cache Types
  COMPETITIVE_RAW_DATA = 'competitive_raw_data',
  COMPETITIVE_NORMALIZED = 'competitive_normalized', 
  COMPETITIVE_ANALYSIS = 'competitive_analysis',
  COMPETITIVE_ENRICHED = 'competitive_enriched',
  COMPETITIVE_SERP_NEWS = 'competitive_serp_news',
  COMPETITIVE_SERP_ORGANIC = 'competitive_serp_organic',
  COMPETITIVE_BRIGHTDATA_CRUNCHBASE = 'competitive_brightdata_crunchbase',

  // Buying Signals Research Cache Types
  BUYING_SIGNALS_RAW_DATA = 'buying_signals_raw_data',
  BUYING_SIGNALS_NORMALIZED = 'buying_signals_normalized',
  BUYING_SIGNALS_ANALYSIS = 'buying_signals_analysis', 
  BUYING_SIGNALS_ENRICHED = 'buying_signals_enriched',
  BUYING_SIGNALS_SERP_NEWS = 'buying_signals_serp_news',
  BUYING_SIGNALS_BRIGHTDATA_NEWS = 'buying_signals_brightdata_news',

  // Growth Signals Research Cache Types  
  GROWTH_SIGNALS_RAW_DATA = 'growth_signals_raw_data',
  GROWTH_SIGNALS_NORMALIZED = 'growth_signals_normalized',
  GROWTH_SIGNALS_ANALYSIS = 'growth_signals_analysis',
  GROWTH_SIGNALS_ENRICHED = 'growth_signals_enriched',
  GROWTH_SIGNALS_SERP_JOBS = 'growth_signals_serp_jobs',
  GROWTH_SIGNALS_BRIGHTDATA_GLASSDOOR = 'growth_signals_brightdata_glassdoor',

  // Digital Footprint Research Cache Types
  DIGITAL_FOOTPRINT_RAW_DATA = 'digital_footprint_raw_data',
  DIGITAL_FOOTPRINT_NORMALIZED = 'digital_footprint_normalized',
  DIGITAL_FOOTPRINT_ANALYSIS = 'digital_footprint_analysis',
  DIGITAL_FOOTPRINT_ENRICHED = 'digital_footprint_enriched',
  DIGITAL_FOOTPRINT_SERP_ORGANIC = 'digital_footprint_serp_organic',
  DIGITAL_FOOTPRINT_BRIGHTDATA_SOCIAL = 'digital_footprint_brightdata_social',

  // Recent Activities Research Cache Types
  RECENT_ACTIVITIES_RAW_DATA = 'recent_activities_raw_data', 
  RECENT_ACTIVITIES_NORMALIZED = 'recent_activities_normalized',
  RECENT_ACTIVITIES_ANALYSIS = 'recent_activities_analysis',
  RECENT_ACTIVITIES_ENRICHED = 'recent_activities_enriched',
  RECENT_ACTIVITIES_SERP_NEWS = 'recent_activities_serp_news',
  RECENT_ACTIVITIES_SERP_YOUTUBE = 'recent_activities_serp_youtube',

  // Integration Needs Research Cache Types
  INTEGRATION_NEEDS_RAW_DATA = 'integration_needs_raw_data',
  INTEGRATION_NEEDS_NORMALIZED = 'integration_needs_normalized', 
  INTEGRATION_NEEDS_ANALYSIS = 'integration_needs_analysis',
  INTEGRATION_NEEDS_ENRICHED = 'integration_needs_enriched',
  INTEGRATION_NEEDS_SERP_ORGANIC = 'integration_needs_serp_organic',
  INTEGRATION_NEEDS_BRIGHTDATA_STACKSHARE = 'integration_needs_brightdata_stackshare',

  // Compliance Requirements Research Cache Types
  COMPLIANCE_RAW_DATA = 'compliance_raw_data',
  COMPLIANCE_NORMALIZED = 'compliance_normalized',
  COMPLIANCE_ANALYSIS = 'compliance_analysis', 
  COMPLIANCE_ENRICHED = 'compliance_enriched',
  COMPLIANCE_SERP_ORGANIC = 'compliance_serp_organic',
  COMPLIANCE_BRIGHTDATA_REGULATORY = 'compliance_brightdata_regulatory',

  // Business Challenges Research Cache Types
  BUSINESS_CHALLENGES_RAW_DATA = 'business_challenges_raw_data',
  BUSINESS_CHALLENGES_NORMALIZED = 'business_challenges_normalized',
  BUSINESS_CHALLENGES_ANALYSIS = 'business_challenges_analysis',
  BUSINESS_CHALLENGES_ENRICHED = 'business_challenges_enriched', 
  BUSINESS_CHALLENGES_SERP_NEWS = 'business_challenges_serp_news',
  BUSINESS_CHALLENGES_SERP_ORGANIC = 'business_challenges_serp_organic',

  // Budget Indicators Research Cache Types
  BUDGET_INDICATORS_RAW_DATA = 'budget_indicators_raw_data',
  BUDGET_INDICATORS_NORMALIZED = 'budget_indicators_normalized',
  BUDGET_INDICATORS_ANALYSIS = 'budget_indicators_analysis',
  BUDGET_INDICATORS_ENRICHED = 'budget_indicators_enriched',
  BUDGET_INDICATORS_SERP_FINANCE = 'budget_indicators_serp_finance',
  BUDGET_INDICATORS_BRIGHTDATA_FINANCIAL = 'budget_indicators_brightdata_financial',
  
  // LLM Analysis Cache Types (NEW)
  LLM_ANALYSIS = 'llm_analysis',
  LLM_CUSTOMER_INTELLIGENCE = 'llm_customer_intelligence',
  LLM_RAW_RESPONSE = 'llm_raw_response',

  // Enhanced Enrichment Cache Types (NEW)
  BRIGHTDATA_COMPANY_ENRICHMENT = 'brightdata_company_enrichment',
  APOLLO_CONTACT_ENRICHMENT = 'apollo_contact_enrichment',
  ZOOMINFO_CONTACT_ENRICHMENT = 'zoominfo_contact_enrichment',
  CLEARBIT_COMPANY_ENRICHMENT = 'clearbit_company_enrichment',
  HUNTER_EMAIL_ENRICHMENT = 'hunter_email_enrichment',
  COMPANY_DATABASE_ENRICHMENT = 'company_database_enrichment',

  // Legacy Cache Types
  COMPANY_LOOKUP_LEGACY = 'company_lookup_legacy',
  COMPANY_ENRICHMENT_LEGACY = 'company_enrichment_legacy',

  // Request Tracking
  ASYNC_REQUEST_TRACKING = 'async_request_tracking',
  STEP_FUNCTION_EXECUTION = 'step_function_execution',
  
  // Profile Management
  USER_PROFILE = 'user_profile',
  ORGANIZATION_PROFILE = 'organization_profile',
  
  // Performance Monitoring
  PERFORMANCE_METRICS = 'performance_metrics',
  ERROR_TRACKING = 'error_tracking',
  USAGE_TRACKING = 'usage_tracking',

  // Fallback
  UNKNOWN = 'unknown'
}

// Human-readable display names for cache types
export const CACHE_TYPE_DISPLAY_NAMES: Record<CacheType, string> = {
  // Raw Data Types
  [CacheType.SERP_ORGANIC_RAW]: 'SerpAPI Organic Raw Data',
  [CacheType.SERP_NEWS_RAW]: 'SerpAPI News Raw Data',
  [CacheType.SERP_JOBS_RAW]: 'SerpAPI Jobs Raw Data',
  [CacheType.SERP_LINKEDIN_RAW]: 'SerpAPI LinkedIn Raw Data',
  [CacheType.SERP_YOUTUBE_RAW]: 'SerpAPI YouTube Raw Data',
  [CacheType.SERP_API_RAW_RESPONSE]: 'SerpAPI Raw Response',
  [CacheType.GOOGLE_KNOWLEDGE_GRAPH_RAW]: 'Google Knowledge Graph Raw',
  [CacheType.GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT]: 'Google Knowledge Graph Enrichment',
  [CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP]: 'Google Knowledge Graph Lookup',
  [CacheType.BRIGHTDATA_RAW]: 'BrightData Raw Response',
  [CacheType.SNOV_CONTACTS_RAW]: 'Snov.io Contacts Raw Data',
  [CacheType.SNOV_VERIFICATION_RAW]: 'Snov.io Verification Raw Data',
  [CacheType.APOLLO_CONTACTS_RAW]: 'Apollo Contacts Raw Data',

  // SerpAPI Specific Results
  [CacheType.SERP_API_COMPANY_ENRICHMENT]: 'SerpAPI Company Enrichment',
  [CacheType.SERP_API_COMPANY_LOOKUP]: 'SerpAPI Company Lookup',
  [CacheType.SERP_API_ORGANIC_RESULTS]: 'SerpAPI Organic Results',
  [CacheType.SERP_API_NEWS_RESULTS]: 'SerpAPI News Results',
  [CacheType.SERP_API_JOBS_RESULTS]: 'SerpAPI Jobs Results',
  [CacheType.SERP_API_LINKEDIN_RESULTS]: 'SerpAPI LinkedIn Results',
  [CacheType.SERP_API_YOUTUBE_RESULTS]: 'SerpAPI YouTube Results',
  [CacheType.SERP_API_KNOWLEDGE_GRAPH]: 'SerpAPI Knowledge Graph',

  // Processing Types
  [CacheType.SALES_INTELLIGENCE_CACHE]: 'Sales Intelligence Cache',
  [CacheType.COMPANY_ENRICHMENT]: 'Company Enrichment',
  [CacheType.COMPANY_SEARCH]: 'Company Search',
  [CacheType.COMPANY_LOOKUP]: 'Company Lookup',
  [CacheType.DOMAIN_SUGGESTIONS]: 'Domain Suggestions',

  // Analysis Types
  [CacheType.COMPANY_OVERVIEW]: 'Company Overview',
  [CacheType.COMPANY_DISCOVERY]: 'Company Discovery',
  [CacheType.COMPANY_ANALYSIS]: 'Company Analysis',
  [CacheType.COMPETITOR_ANALYSIS]: 'Competitor Analysis',
  [CacheType.PRODUCT_SUGGESTIONS]: 'Product Suggestions',

  // Vendor Context Types
  [CacheType.VENDOR_CONTEXT_ENRICHMENT]: 'Vendor Context Enrichment',
  [CacheType.VENDOR_CONTEXT_PARSED]: 'Vendor Context Parsed',
  [CacheType.VENDOR_CONTEXT_ANALYSIS]: 'Vendor Context Analysis',
  [CacheType.VENDOR_CONTEXT_RAW_DATA]: 'Vendor Context Raw Data',
  [CacheType.VENDOR_CONTEXT_REFERENCE]: 'Vendor Context Reference',

  // Customer Intelligence Types
  [CacheType.CUSTOMER_INTELLIGENCE_RAW]: 'Customer Intelligence Raw',
  [CacheType.CUSTOMER_INTELLIGENCE_PARSED]: 'Customer Intelligence Parsed',
  [CacheType.CUSTOMER_INTELLIGENCE_ANALYSIS]: 'Customer Intelligence Analysis',
  [CacheType.CUSTOMER_INTELLIGENCE_ENRICHMENT]: 'Customer Intelligence Enrichment',
  
  // Decision Makers Research Types
  [CacheType.DECISION_MAKERS_RAW_DATA]: 'Decision Makers Raw Data',
  [CacheType.DECISION_MAKERS_NORMALIZED]: 'Decision Makers Normalized',
  [CacheType.DECISION_MAKERS_ANALYSIS]: 'Decision Makers Analysis',
  [CacheType.DECISION_MAKERS_ENRICHED]: 'Decision Makers Enriched',
  [CacheType.DECISION_MAKERS_SNOV_CONTACTS]: 'Decision Makers Snov Contacts',
  [CacheType.DECISION_MAKERS_SERP_LINKEDIN]: 'Decision Makers SerpAPI LinkedIn',
  [CacheType.DECISION_MAKERS_BRIGHTDATA_CONTACTS]: 'Decision Makers BrightData Contacts',

  // Tech Stack Research Types
  [CacheType.TECH_STACK_RAW_DATA]: 'Tech Stack Raw Data',
  [CacheType.TECH_STACK_NORMALIZED]: 'Tech Stack Normalized',
  [CacheType.TECH_STACK_ANALYSIS]: 'Tech Stack Analysis',
  [CacheType.TECH_STACK_ENRICHED]: 'Tech Stack Enriched',
  [CacheType.TECH_STACK_SERP_ORGANIC]: 'Tech Stack SerpAPI Organic',
  [CacheType.TECH_STACK_BRIGHTDATA_BUILTWITH]: 'Tech Stack BrightData BuiltWith',
  [CacheType.TECH_STACK_BRIGHTDATA_STACKSHARE]: 'Tech Stack BrightData StackShare',

  // Competitive Positioning Research Types
  [CacheType.COMPETITIVE_RAW_DATA]: 'Competitive Raw Data',
  [CacheType.COMPETITIVE_NORMALIZED]: 'Competitive Normalized',
  [CacheType.COMPETITIVE_ANALYSIS]: 'Competitive Analysis',
  [CacheType.COMPETITIVE_ENRICHED]: 'Competitive Enriched',
  [CacheType.COMPETITIVE_SERP_NEWS]: 'Competitive SerpAPI News',
  [CacheType.COMPETITIVE_SERP_ORGANIC]: 'Competitive SerpAPI Organic',
  [CacheType.COMPETITIVE_BRIGHTDATA_CRUNCHBASE]: 'Competitive BrightData Crunchbase',

  // Buying Signals Research Types
  [CacheType.BUYING_SIGNALS_RAW_DATA]: 'Buying Signals Raw Data',
  [CacheType.BUYING_SIGNALS_NORMALIZED]: 'Buying Signals Normalized',
  [CacheType.BUYING_SIGNALS_ANALYSIS]: 'Buying Signals Analysis',
  [CacheType.BUYING_SIGNALS_ENRICHED]: 'Buying Signals Enriched',
  [CacheType.BUYING_SIGNALS_SERP_NEWS]: 'Buying Signals SerpAPI News',
  [CacheType.BUYING_SIGNALS_BRIGHTDATA_NEWS]: 'Buying Signals BrightData News',

  // Growth Signals Research Types  
  [CacheType.GROWTH_SIGNALS_RAW_DATA]: 'Growth Signals Raw Data',
  [CacheType.GROWTH_SIGNALS_NORMALIZED]: 'Growth Signals Normalized',
  [CacheType.GROWTH_SIGNALS_ANALYSIS]: 'Growth Signals Analysis',
  [CacheType.GROWTH_SIGNALS_ENRICHED]: 'Growth Signals Enriched',
  [CacheType.GROWTH_SIGNALS_SERP_JOBS]: 'Growth Signals SerpAPI Jobs',
  [CacheType.GROWTH_SIGNALS_BRIGHTDATA_GLASSDOOR]: 'Growth Signals BrightData Glassdoor',

  // Digital Footprint Research Types
  [CacheType.DIGITAL_FOOTPRINT_RAW_DATA]: 'Digital Footprint Raw Data',
  [CacheType.DIGITAL_FOOTPRINT_NORMALIZED]: 'Digital Footprint Normalized',
  [CacheType.DIGITAL_FOOTPRINT_ANALYSIS]: 'Digital Footprint Analysis',
  [CacheType.DIGITAL_FOOTPRINT_ENRICHED]: 'Digital Footprint Enriched',
  [CacheType.DIGITAL_FOOTPRINT_SERP_ORGANIC]: 'Digital Footprint SerpAPI Organic',
  [CacheType.DIGITAL_FOOTPRINT_BRIGHTDATA_SOCIAL]: 'Digital Footprint BrightData Social',

  // Recent Activities Research Types
  [CacheType.RECENT_ACTIVITIES_RAW_DATA]: 'Recent Activities Raw Data',
  [CacheType.RECENT_ACTIVITIES_NORMALIZED]: 'Recent Activities Normalized',
  [CacheType.RECENT_ACTIVITIES_ANALYSIS]: 'Recent Activities Analysis',
  [CacheType.RECENT_ACTIVITIES_ENRICHED]: 'Recent Activities Enriched',
  [CacheType.RECENT_ACTIVITIES_SERP_NEWS]: 'Recent Activities SerpAPI News',
  [CacheType.RECENT_ACTIVITIES_SERP_YOUTUBE]: 'Recent Activities SerpAPI YouTube',

  // Integration Needs Research Types
  [CacheType.INTEGRATION_NEEDS_RAW_DATA]: 'Integration Needs Raw Data',
  [CacheType.INTEGRATION_NEEDS_NORMALIZED]: 'Integration Needs Normalized',
  [CacheType.INTEGRATION_NEEDS_ANALYSIS]: 'Integration Needs Analysis',
  [CacheType.INTEGRATION_NEEDS_ENRICHED]: 'Integration Needs Enriched',
  [CacheType.INTEGRATION_NEEDS_SERP_ORGANIC]: 'Integration Needs SerpAPI Organic',
  [CacheType.INTEGRATION_NEEDS_BRIGHTDATA_STACKSHARE]: 'Integration Needs BrightData StackShare',

  // Compliance Requirements Research Types
  [CacheType.COMPLIANCE_RAW_DATA]: 'Compliance Raw Data',
  [CacheType.COMPLIANCE_NORMALIZED]: 'Compliance Normalized',
  [CacheType.COMPLIANCE_ANALYSIS]: 'Compliance Analysis',
  [CacheType.COMPLIANCE_ENRICHED]: 'Compliance Enriched',
  [CacheType.COMPLIANCE_SERP_ORGANIC]: 'Compliance SerpAPI Organic',
  [CacheType.COMPLIANCE_BRIGHTDATA_REGULATORY]: 'Compliance BrightData Regulatory',

  // Business Challenges Research Types
  [CacheType.BUSINESS_CHALLENGES_RAW_DATA]: 'Business Challenges Raw Data',
  [CacheType.BUSINESS_CHALLENGES_NORMALIZED]: 'Business Challenges Normalized',
  [CacheType.BUSINESS_CHALLENGES_ANALYSIS]: 'Business Challenges Analysis',
  [CacheType.BUSINESS_CHALLENGES_ENRICHED]: 'Business Challenges Enriched',
  [CacheType.BUSINESS_CHALLENGES_SERP_NEWS]: 'Business Challenges SerpAPI News',
  [CacheType.BUSINESS_CHALLENGES_SERP_ORGANIC]: 'Business Challenges SerpAPI Organic',

  // Budget Indicators Research Types
  [CacheType.BUDGET_INDICATORS_RAW_DATA]: 'Budget Indicators Raw Data',
  [CacheType.BUDGET_INDICATORS_NORMALIZED]: 'Budget Indicators Normalized',
  [CacheType.BUDGET_INDICATORS_ANALYSIS]: 'Budget Indicators Analysis',
  [CacheType.BUDGET_INDICATORS_ENRICHED]: 'Budget Indicators Enriched',
  [CacheType.BUDGET_INDICATORS_SERP_FINANCE]: 'Budget Indicators SerpAPI Finance',
  [CacheType.BUDGET_INDICATORS_BRIGHTDATA_FINANCIAL]: 'Budget Indicators BrightData Financial',

  // LLM Analysis Types
  [CacheType.LLM_ANALYSIS]: 'LLM Analysis',
  [CacheType.LLM_CUSTOMER_INTELLIGENCE]: 'LLM Customer Intelligence',
  [CacheType.LLM_RAW_RESPONSE]: 'LLM Raw Response',

  // Enhanced Enrichment Types
  [CacheType.BRIGHTDATA_COMPANY_ENRICHMENT]: 'BrightData Company Enrichment',
  [CacheType.APOLLO_CONTACT_ENRICHMENT]: 'Apollo Contact Enrichment',
  [CacheType.ZOOMINFO_CONTACT_ENRICHMENT]: 'ZoomInfo Contact Enrichment',
  [CacheType.CLEARBIT_COMPANY_ENRICHMENT]: 'Clearbit Company Enrichment',
  [CacheType.HUNTER_EMAIL_ENRICHMENT]: 'Hunter Email Enrichment',
  [CacheType.COMPANY_DATABASE_ENRICHMENT]: 'Company Database Enrichment',

  // Legacy Types
  [CacheType.COMPANY_LOOKUP_LEGACY]: 'Company Lookup (Legacy)',
  [CacheType.COMPANY_ENRICHMENT_LEGACY]: 'Company Enrichment (Legacy)',

  // Request Tracking
  [CacheType.ASYNC_REQUEST_TRACKING]: 'Async Request Tracking',
  [CacheType.STEP_FUNCTION_EXECUTION]: 'Step Function Execution',

  // Profile Management
  [CacheType.USER_PROFILE]: 'User Profile',
  [CacheType.ORGANIZATION_PROFILE]: 'Organization Profile',

  // Performance Monitoring
  [CacheType.PERFORMANCE_METRICS]: 'Performance Metrics',
  [CacheType.ERROR_TRACKING]: 'Error Tracking',
  [CacheType.USAGE_TRACKING]: 'Usage Tracking',

  // Fallback
  [CacheType.UNKNOWN]: 'Unknown Cache Type'
};

// Cache type groupings for management and analysis
export const CACHE_TYPE_GROUPS = {
  serp_api: [
    CacheType.SERP_API_RAW_RESPONSE,
    CacheType.SERP_API_COMPANY_ENRICHMENT,
    CacheType.SERP_API_COMPANY_LOOKUP,
    CacheType.SERP_API_ORGANIC_RESULTS,
    CacheType.SERP_API_NEWS_RESULTS,
    CacheType.SERP_API_JOBS_RESULTS,
    CacheType.SERP_API_LINKEDIN_RESULTS,
    CacheType.SERP_API_YOUTUBE_RESULTS,
    CacheType.SERP_API_KNOWLEDGE_GRAPH
  ],
  raw_data: [
    CacheType.SERP_NEWS_RAW,
    CacheType.SERP_JOBS_RAW,
    CacheType.SERP_LINKEDIN_RAW,
    CacheType.SERP_YOUTUBE_RAW,
    CacheType.SERP_ORGANIC_RAW,
    CacheType.BRIGHTDATA_RAW,
    CacheType.SNOV_CONTACTS_RAW,
    CacheType.SNOV_VERIFICATION_RAW,
    CacheType.APOLLO_CONTACTS_RAW
  ],
  google_services: [
    CacheType.GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT,
    CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP
  ],
  company_processing: [
    CacheType.COMPANY_ENRICHMENT,
    CacheType.COMPANY_SEARCH,
    CacheType.DOMAIN_SUGGESTIONS
  ],
  analysis: [
    CacheType.COMPANY_OVERVIEW,
    CacheType.COMPANY_DISCOVERY,
    CacheType.COMPANY_ANALYSIS,
    CacheType.COMPETITOR_ANALYSIS,
    CacheType.PRODUCT_SUGGESTIONS
  ],
  vendor_context: [
    CacheType.VENDOR_CONTEXT_ENRICHMENT,
    CacheType.VENDOR_CONTEXT_PARSED,
    CacheType.VENDOR_CONTEXT_ANALYSIS,
    CacheType.VENDOR_CONTEXT_RAW_DATA,
    CacheType.VENDOR_CONTEXT_REFERENCE
  ],
  customer_intelligence: [
    CacheType.CUSTOMER_INTELLIGENCE_RAW,
    CacheType.CUSTOMER_INTELLIGENCE_PARSED,
    CacheType.CUSTOMER_INTELLIGENCE_ANALYSIS,
    CacheType.CUSTOMER_INTELLIGENCE_ENRICHMENT
  ],
  decision_makers_research: [
    CacheType.DECISION_MAKERS_RAW_DATA,
    CacheType.DECISION_MAKERS_NORMALIZED,
    CacheType.DECISION_MAKERS_ANALYSIS,
    CacheType.DECISION_MAKERS_ENRICHED,
    CacheType.DECISION_MAKERS_SNOV_CONTACTS,
    CacheType.DECISION_MAKERS_SERP_LINKEDIN,
    CacheType.DECISION_MAKERS_BRIGHTDATA_CONTACTS
  ],
  tech_stack_research: [
    CacheType.TECH_STACK_RAW_DATA,
    CacheType.TECH_STACK_NORMALIZED,
    CacheType.TECH_STACK_ANALYSIS,
    CacheType.TECH_STACK_ENRICHED,
    CacheType.TECH_STACK_SERP_ORGANIC,
    CacheType.TECH_STACK_BRIGHTDATA_BUILTWITH,
    CacheType.TECH_STACK_BRIGHTDATA_STACKSHARE
  ],
  competitive_research: [
    CacheType.COMPETITIVE_RAW_DATA,
    CacheType.COMPETITIVE_NORMALIZED,
    CacheType.COMPETITIVE_ANALYSIS,
    CacheType.COMPETITIVE_ENRICHED,
    CacheType.COMPETITIVE_SERP_NEWS,
    CacheType.COMPETITIVE_SERP_ORGANIC,
    CacheType.COMPETITIVE_BRIGHTDATA_CRUNCHBASE
  ],
  buying_signals_research: [
    CacheType.BUYING_SIGNALS_RAW_DATA,
    CacheType.BUYING_SIGNALS_NORMALIZED,
    CacheType.BUYING_SIGNALS_ANALYSIS,
    CacheType.BUYING_SIGNALS_ENRICHED,
    CacheType.BUYING_SIGNALS_SERP_NEWS,
    CacheType.BUYING_SIGNALS_BRIGHTDATA_NEWS
  ],
  growth_signals_research: [
    CacheType.GROWTH_SIGNALS_RAW_DATA,
    CacheType.GROWTH_SIGNALS_NORMALIZED,
    CacheType.GROWTH_SIGNALS_ANALYSIS,
    CacheType.GROWTH_SIGNALS_ENRICHED,
    CacheType.GROWTH_SIGNALS_SERP_JOBS,
    CacheType.GROWTH_SIGNALS_BRIGHTDATA_GLASSDOOR
  ],
  digital_footprint_research: [
    CacheType.DIGITAL_FOOTPRINT_RAW_DATA,
    CacheType.DIGITAL_FOOTPRINT_NORMALIZED,
    CacheType.DIGITAL_FOOTPRINT_ANALYSIS,
    CacheType.DIGITAL_FOOTPRINT_ENRICHED,
    CacheType.DIGITAL_FOOTPRINT_SERP_ORGANIC,
    CacheType.DIGITAL_FOOTPRINT_BRIGHTDATA_SOCIAL
  ],
  recent_activities_research: [
    CacheType.RECENT_ACTIVITIES_RAW_DATA,
    CacheType.RECENT_ACTIVITIES_NORMALIZED,
    CacheType.RECENT_ACTIVITIES_ANALYSIS,
    CacheType.RECENT_ACTIVITIES_ENRICHED,
    CacheType.RECENT_ACTIVITIES_SERP_NEWS,
    CacheType.RECENT_ACTIVITIES_SERP_YOUTUBE
  ],
  integration_needs_research: [
    CacheType.INTEGRATION_NEEDS_RAW_DATA,
    CacheType.INTEGRATION_NEEDS_NORMALIZED,
    CacheType.INTEGRATION_NEEDS_ANALYSIS,
    CacheType.INTEGRATION_NEEDS_ENRICHED,
    CacheType.INTEGRATION_NEEDS_SERP_ORGANIC,
    CacheType.INTEGRATION_NEEDS_BRIGHTDATA_STACKSHARE
  ],
  compliance_research: [
    CacheType.COMPLIANCE_RAW_DATA,
    CacheType.COMPLIANCE_NORMALIZED,
    CacheType.COMPLIANCE_ANALYSIS,
    CacheType.COMPLIANCE_ENRICHED,
    CacheType.COMPLIANCE_SERP_ORGANIC,
    CacheType.COMPLIANCE_BRIGHTDATA_REGULATORY
  ],
  business_challenges_research: [
    CacheType.BUSINESS_CHALLENGES_RAW_DATA,
    CacheType.BUSINESS_CHALLENGES_NORMALIZED,
    CacheType.BUSINESS_CHALLENGES_ANALYSIS,
    CacheType.BUSINESS_CHALLENGES_ENRICHED,
    CacheType.BUSINESS_CHALLENGES_SERP_NEWS,
    CacheType.BUSINESS_CHALLENGES_SERP_ORGANIC
  ],
  budget_indicators_research: [
    CacheType.BUDGET_INDICATORS_RAW_DATA,
    CacheType.BUDGET_INDICATORS_NORMALIZED,
    CacheType.BUDGET_INDICATORS_ANALYSIS,
    CacheType.BUDGET_INDICATORS_ENRICHED,
    CacheType.BUDGET_INDICATORS_SERP_FINANCE,
    CacheType.BUDGET_INDICATORS_BRIGHTDATA_FINANCIAL
  ],
  llm_analysis: [
    CacheType.LLM_ANALYSIS,
    CacheType.LLM_CUSTOMER_INTELLIGENCE
  ],
  legacy: [
    CacheType.COMPANY_LOOKUP_LEGACY,
    CacheType.COMPANY_ENRICHMENT_LEGACY
  ]
};

/**
 * NEW: Base cache entry interface - all cached data extends this
 */
export interface BaseCacheEntry {
  cacheKey: string;
  cacheType: CacheType;
  createdAt: string;
  expiresAt: string;
  lastAccessed: string;
  accessCount: number;
  dataSize: number;
}

/**
 * NEW: Raw API response cache entry
 */
export interface RawApiCacheEntry extends BaseCacheEntry {
  companyName: string;
  source: string;
  apiEndpoint: string;
  rawResponse: any;                    // The actual API response
  requestParams: Record<string, any>;  // Parameters used for the request
  apiCost: number;
  responseTime: number;
  firstRequester: string;              // Which consumer first requested this data
  requestCount: number;                // How many times this data has been requested
}

/**
 * NEW: Processed data cache entry (for enriched/analyzed content)
 */
export interface ProcessedCacheEntry extends BaseCacheEntry {
  companyName: string;
  processor: string;                   // Which service processed this data
  sourceData: string[];               // Keys of raw data used as input
  processingCost: number;              // Cost to process (e.g., LLM costs)
  confidence: number;                  // Processing confidence score
  version: string;                     // Processing version for invalidation
}

/**
 * NEW: Content Analysis cache entry (for sales intelligence)
 */
export interface ContentAnalysisCacheEntry extends ProcessedCacheEntry {
  insights: any;                       // Sales insights data
  sources: any[];                      // Authoritative sources
  confidenceScore: number;
  totalSources: number;
  citationMap: Record<string, number[]>;
}

/**
 * NEW: Vendor Context cache entry
 */
export interface VendorContextCacheEntry extends ProcessedCacheEntry {
  vendorContext: {
    enrichedCompanyData: any;
    coreProducts: any[];
    competitorInsights: any[];
    marketPosition: any;
    businessIntelligence: any;
  };
  costAttribution: {
    profile: number;
    vendor_context: number;
    customer_intelligence: number;
    test: number;
  };
  dataSourcesUsed: string[];
}

/**
 * Union type for all possible cache entry types
 */
export type CacheEntry = 
  | RawApiCacheEntry 
  | ProcessedCacheEntry 
  | ContentAnalysisCacheEntry 
  | VendorContextCacheEntry;

/**
 * Helper to determine cache entry type from CacheType enum
 */
export function getCacheEntryType(cacheType: CacheType): 'raw' | 'processed' | 'content_analysis' | 'vendor_context' {
  if (CACHE_TYPE_GROUPS.raw_data.includes(cacheType)) {
    return 'raw';
  }
  
  if (cacheType === CacheType.VENDOR_CONTEXT_ENRICHMENT || cacheType === CacheType.VENDOR_CONTEXT_PARSED ||
      cacheType === CacheType.VENDOR_CONTEXT_ANALYSIS || cacheType === CacheType.VENDOR_CONTEXT_RAW_DATA ||
      cacheType === CacheType.VENDOR_CONTEXT_REFERENCE) {
    return 'vendor_context';
  }
  
  if (cacheType === CacheType.SALES_INTELLIGENCE_CACHE || 
      cacheType === CacheType.COMPANY_ANALYSIS ||
      cacheType === CacheType.LLM_ANALYSIS || cacheType === CacheType.LLM_CUSTOMER_INTELLIGENCE) {
    return 'content_analysis';
  }
  
  return 'processed';
}

/**
 * Get the appropriate cache type for a research area and processing stage
 */
export function getResearchCacheType(
  areaId: string, 
  stage: 'raw_data' | 'normalized' | 'analysis' | 'enriched',
  source?: string
): CacheType {
  // Handle Snov.io specific areas
  if (areaId.startsWith('snov_')) {
    // For Snov.io areas, map to decision_makers cache types
    switch (stage) {
      case 'raw_data': return CacheType.DECISION_MAKERS_RAW_DATA;
      case 'normalized': return CacheType.DECISION_MAKERS_NORMALIZED;
      case 'analysis': return CacheType.DECISION_MAKERS_ANALYSIS;
      case 'enriched': return CacheType.DECISION_MAKERS_ENRICHED;
    }
  }

  // Map area IDs to their specific cache type prefixes
  const areaMapping: Record<string, string> = {
    'decision_makers': 'DECISION_MAKERS',
    'tech_stack': 'TECH_STACK',
    'competitive_positioning': 'COMPETITIVE',
    'buying_signals': 'BUYING_SIGNALS',
    'growth_signals': 'GROWTH_SIGNALS',
    'digital_footprint': 'DIGITAL_FOOTPRINT',
    'recent_activities': 'RECENT_ACTIVITIES',
    'integration_needs': 'INTEGRATION_NEEDS',
    'compliance_requirements': 'COMPLIANCE',
    'business_challenges': 'BUSINESS_CHALLENGES',
    'budget_indicators': 'BUDGET_INDICATORS'
  };

  const prefix = areaMapping[areaId];
  if (!prefix) {
    // Fallback to decision makers for unknown areas
    return CacheType.DECISION_MAKERS_RAW_DATA;
  }

  // Build the cache type name
  const stageSuffix = stage.toUpperCase().replace('_DATA', '_DATA');
  const cacheTypeName = `${prefix}_${stageSuffix}` as keyof typeof CacheType;
  
  return CacheType[cacheTypeName] || CacheType.DECISION_MAKERS_RAW_DATA;
}

/**
 * Get source-specific cache type for a research area
 */
export function getResearchSourceCacheType(areaId: string, sourceType: string): CacheType {
  // Handle Snov.io sources
  if (sourceType.startsWith('snov_')) {
    return CacheType.DECISION_MAKERS_SNOV_CONTACTS;
  }

  // Map area + source combinations to specific cache types
  const areaSourceMapping: Record<string, Record<string, CacheType>> = {
    'decision_makers': {
      'serp_linkedin': CacheType.DECISION_MAKERS_SERP_LINKEDIN,
      'brightdata_contacts': CacheType.DECISION_MAKERS_BRIGHTDATA_CONTACTS
    },
    'tech_stack': {
      'serp_organic': CacheType.TECH_STACK_SERP_ORGANIC,
      'brightdata_builtwith': CacheType.TECH_STACK_BRIGHTDATA_BUILTWITH,
      'brightdata_stackshare': CacheType.TECH_STACK_BRIGHTDATA_STACKSHARE
    },
    'competitive_positioning': {
      'serp_news': CacheType.COMPETITIVE_SERP_NEWS,
      'serp_organic': CacheType.COMPETITIVE_SERP_ORGANIC,
      'brightdata_crunchbase': CacheType.COMPETITIVE_BRIGHTDATA_CRUNCHBASE
    },
    'buying_signals': {
      'serp_news': CacheType.BUYING_SIGNALS_SERP_NEWS,
      'brightdata_news': CacheType.BUYING_SIGNALS_BRIGHTDATA_NEWS
    },
    'growth_signals': {
      'serp_jobs': CacheType.GROWTH_SIGNALS_SERP_JOBS,
      'brightdata_glassdoor': CacheType.GROWTH_SIGNALS_BRIGHTDATA_GLASSDOOR
    }
    // Add more mappings as needed
  };

  return areaSourceMapping[areaId]?.[sourceType] || CacheType.DECISION_MAKERS_RAW_DATA;
}

/**
 * Infer cache type from legacy key pattern (for migration only)
 * @deprecated Use explicit CacheType enum values instead
 */
export function inferCacheTypeFromKeyPattern(key: string): CacheType {
  // Multi-source raw data patterns (NEW)
  if (key.startsWith('serp_organic_raw:')) return CacheType.SERP_ORGANIC_RAW;
  if (key.startsWith('serp_news_raw:')) return CacheType.SERP_NEWS_RAW;
  if (key.startsWith('serp_jobs_raw:')) return CacheType.SERP_JOBS_RAW;
  if (key.startsWith('serp_linkedin_raw:')) return CacheType.SERP_LINKEDIN_RAW;
  if (key.startsWith('serp_youtube_raw:')) return CacheType.SERP_YOUTUBE_RAW;
  if (key.startsWith('brightdata_raw:')) return CacheType.BRIGHTDATA_RAW;
  if (key.startsWith('snov_contacts_raw:')) return CacheType.SNOV_CONTACTS_RAW;
  if (key.startsWith('snov_verification_raw:')) return CacheType.SNOV_VERIFICATION_RAW;
  if (key.startsWith('apollo_contacts_raw:')) return CacheType.APOLLO_CONTACTS_RAW;
  
  // SerpAPI patterns
  if (key.startsWith('serp_raw:')) return CacheType.SERP_API_RAW_RESPONSE;
  if (key.startsWith('serp_enrichment:')) return CacheType.SERP_API_COMPANY_ENRICHMENT;
  if (key.startsWith('serp_lookup:')) return CacheType.SERP_API_COMPANY_LOOKUP;
  
  // Google Knowledge Graph patterns  
  if (key.startsWith('gkg_enrichment:')) return CacheType.GOOGLE_KNOWLEDGE_GRAPH_ENRICHMENT;
  if (key.startsWith('gkg_lookup:')) return CacheType.GOOGLE_KNOWLEDGE_GRAPH_LOOKUP;
  
  // Company processing patterns
  if (key.startsWith('enrichment:')) return CacheType.COMPANY_ENRICHMENT;
  if (key.startsWith('overview:')) return CacheType.COMPANY_OVERVIEW;
  if (key.startsWith('discovery:')) return CacheType.COMPANY_DISCOVERY;
  if (key.startsWith('analysis:')) return CacheType.COMPANY_ANALYSIS;
  if (key.startsWith('search:')) return CacheType.COMPANY_SEARCH;
  
  // Hash-based cache keys from CompanyExtractor
  if (key.startsWith('sales_intel_')) return CacheType.SALES_INTELLIGENCE_CACHE;
  
  // Legacy patterns
  if (key.startsWith('lookup:')) return CacheType.COMPANY_LOOKUP_LEGACY;
  if (key.startsWith('enrich:')) return CacheType.COMPANY_ENRICHMENT_LEGACY;
  
  // Vendor context patterns
  if (key.startsWith('vendor_context:')) return CacheType.VENDOR_CONTEXT_ENRICHMENT;
  if (key.startsWith('vendor_parsed:')) return CacheType.VENDOR_CONTEXT_PARSED;
  if (key.startsWith('vendor_analysis:')) return CacheType.VENDOR_CONTEXT_ANALYSIS;
  if (key.startsWith('vendor_raw_data:')) return CacheType.VENDOR_CONTEXT_RAW_DATA;
  if (key.startsWith('vendor_reference:')) return CacheType.VENDOR_CONTEXT_REFERENCE;
  
  // Customer Intelligence patterns
  if (key.startsWith('customer_intelligence_raw:')) return CacheType.CUSTOMER_INTELLIGENCE_RAW;
  if (key.startsWith('customer_intelligence_parsed:')) return CacheType.CUSTOMER_INTELLIGENCE_PARSED;
  if (key.startsWith('customer_intelligence_analysis:')) return CacheType.CUSTOMER_INTELLIGENCE_ANALYSIS;
  if (key.startsWith('customer_intelligence_enrichment:')) return CacheType.CUSTOMER_INTELLIGENCE_ENRICHMENT;

  // LLM Analysis patterns
  if (key.startsWith('llm_analysis:')) return CacheType.LLM_ANALYSIS;
  if (key.startsWith('llm_customer_intelligence:')) return CacheType.LLM_CUSTOMER_INTELLIGENCE;
  if (key.startsWith('llm_raw_response:')) return CacheType.LLM_RAW_RESPONSE;
  
  // Specific feature patterns
  if (key.includes('competitor')) return CacheType.COMPETITOR_ANALYSIS;
  if (key.includes('product')) return CacheType.PRODUCT_SUGGESTIONS;
  if (key.includes('domain')) return CacheType.DOMAIN_SUGGESTIONS;
  
  return CacheType.UNKNOWN;
} 