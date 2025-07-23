/**
 * Core types for the Sales Intelligence AI platform
 */

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  sourceDomain: string;
  relevanceScore?: number;
}

export interface AuthoritativeSource {
  id: number;
  url: string;
  title: string;
  domain: string;
  publishedDate?: string;
  author?: string;
  sourceType: 'news' | 'company' | 'blog' | 'social' | 'press_release' | 'report' | 'financial' | 'educational' | 'other';
  domainAuthority?: number;
  snippet: string;
  lastUpdated?: string;
  credibilityScore: number;
  relevancyScore?: number;
}

export interface CitedContent {
  text: string;
  citations: number[];
}

export interface ContentAnalysis {
  insights: SalesInsights;
  sources: AuthoritativeSource[];
  confidenceScore: number;
  generatedAt: Date;
  cacheKey: string;
  totalSources: number;
  citationMap: Record<string, number[]>;
}

export interface SalesInsights {
  companyOverview: CompanyInsights;
  painPoints: CitedContent[];
  keyInsights?: string[];  // Added missing property
  opportunities?: CitedContent[];  // Added missing property
  competitiveAdvantages?: CitedContent[];  // Added missing property
  riskFactors?: CitedContent[];  // Added missing property
  nextSteps?: CitedContent[];  // Added missing property
  technologyStack: TechStack;
  keyContacts: Contact[];
  competitiveLandscape: CompetitiveIntel;
  talkingPoints: CitedContent[];
  potentialObjections: Objection[];
  recommendedActions: CitedContent[];
  dealProbability: number;
  dealProbabilityCitations: number[];
  confidence?: {  // Added missing confidence property
    overall: number;
    dataQuality: number;
    sourceReliability: number;
  };
}

export interface CompanyInsights {
  name: string;
  size: string;
  sizeCitations: number[];
  industry: string;
  revenue?: string;
  revenueCitations: number[];
  recentNews: NewsItem[];
  growth: GrowthIndicators;
  challenges: CitedContent[];
}

// Enhanced comprehensive company overview
export interface CompanyOverview {
  // Basic Information
  name: string;
  domain: string;
  industry: string;
  description: string;
  foundedYear?: number;
  
  // Financial Information
  financialData?: FinancialData;
  
  // Company Size & Scale
  employeeCount?: number;
  employeeRange?: string;
  locations?: CompanyLocation[];
  
  // Leadership
  leadership?: KeyPersonnel[];
  
  // Market Information
  marketData?: MarketData;
  
  // Products & Services
  products?: string[];
  services?: string[];
  
  // Recent Developments
  recentNews?: NewsItem[];
  recentUpdates?: CompanyUpdate[];
  
  // Customer Information
  majorCustomers?: string[];
  customerSegments?: string[];
  
  // Technology & Innovation
  technologyStack?: string[];
  innovations?: string[];
  
  // Business Model
  businessModel?: string;
  revenueModel?: string;
  pricingStructure?: PricingTier[];
  
  // Performance Metrics
  performanceMetrics?: PerformanceMetric[];
  
  // Competitive Position
  competitivePosition?: string;
  keyDifferentiators?: string[];
  
  // Sources and Metadata
  sources: AuthoritativeSource[];
  confidence: ConfidenceScores;
  lastUpdated: string;
}

export interface FinancialData {
  // Stock Information (if public)
  stockSymbol?: string;
  stockExchange?: string;
  marketCap?: string;
  stockPrice?: StockPrice;
  
  // Financial Metrics
  revenue?: string;
  revenueGrowth?: string;
  profit?: string;
  valuation?: string;
  
  // Investment Information
  totalFunding?: string;
  latestFundingRound?: FundingRound;
  investors?: string[];
  
  // Financial Health
  peRatio?: number;
  priceToSales?: number;
  dividendYield?: number;
  
  // Citations for financial data
  citations: number[];
}

export interface StockPrice {
  current: number;
  change: number;
  changePercent: number;
  currency: string;
  afterHours?: {
    price: number;
    change: number;
    changePercent: number;
  };
  dayRange: {
    low: number;
    high: number;
  };
  yearRange: {
    low: number;
    high: number;
  };
  volume?: string;
  avgVolume?: string;
  lastUpdated: string;
}

export interface FundingRound {
  type: string; // Series A, B, C, etc.
  amount: string;
  date: string;
  investors: string[];
  valuation?: string;
  citations: number[];
}

export interface KeyPersonnel {
  name: string;
  title: string;
  department?: string;
  startDate?: string;
  background?: string;
  linkedin?: string;
  email?: string;
  bio?: string;
  achievements?: string[];
  citations: number[];
}

export interface CompanyLocation {
  type: 'headquarters' | 'office' | 'branch' | 'manufacturing' | 'retail';
  address: string;
  city: string;
  state?: string;
  country: string;
  employeeCount?: number;
  description?: string;
  citations: number[];
}

export interface MarketData {
  marketSize?: string;
  marketShare?: string;
  marketPosition?: string;
  targetMarket?: string;
  marketGrowthRate?: string;
  industryTrends?: string[];
  majorCompetitors?: string[];
  competitiveAdvantages?: string[];
  marketChallenges?: string[];
  citations: number[];
}

export interface PricingTier {
  name: string;
  price: string;
  period: string; // monthly, yearly, etc.
  features?: string[];
  targetSegment?: string;
  citations: number[];
}

export interface CompanyUpdate {
  type: 'product_launch' | 'partnership' | 'acquisition' | 'expansion' | 'funding' | 'leadership' | 'other';
  title: string;
  description: string;
  date: string;
  impact: 'high' | 'medium' | 'low';
  citations: number[];
}

export interface PerformanceMetric {
  name: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  period?: string;
  context?: string;
  citations: number[];
}

export interface ConfidenceScores {
  overall: number;
  financial: number;
  leadership: number;
  market: number;
  products: number;
  size: number;
  revenue: number;
}

export interface TechStack {
  current: string[];
  planned: string[];
  vendors: string[];
  modernizationAreas: string[];
}

export interface Contact {
  name: string;
  title: string;
  department: string;
  linkedin?: string;
  email?: string;
  influence: 'high' | 'medium' | 'low';
  approachStrategy: string;
}

export interface CompetitiveIntel {
  competitors: Competitor[];
  marketPosition: string;
  differentiators: string[];
  vulnerabilities: string[];
  battleCards: BattleCard[];
}

export interface Competitor {
  name: string;
  strength: 'high' | 'medium' | 'low';
  marketShare?: string;
  advantages: string[];
  weaknesses: string[];
}

export interface BattleCard {
  competitor: string;
  keyMessages: string[];
  objectionHandling: string[];
  winStrategies: string[];
}

export interface Objection {
  objection: string;
  response: string;
  supporting_data?: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  relevance: 'high' | 'medium' | 'low';
  citations: number[];
}

export interface GrowthIndicators {
  hiring: boolean;
  hiringCitations: number[];
  funding: boolean;
  fundingCitations: number[];
  expansion: boolean;
  expansionCitations: number[];
  newProducts: boolean;
  partnerships: boolean;
}

export type SalesContext = 
  | 'discovery' 
  | 'competitive' 
  | 'renewal' 
  | 'demo' 
  | 'negotiation' 
  | 'closing';

export interface SalesIntelligenceRequest {
  companyDomain: string; // Target company (who you're selling to)
  salesContext: SalesContext;
  meetingType?: string;
  additionalContext?: string;
  urgency?: 'low' | 'medium' | 'high';
  
  // Seller company information (Perplexity-style context awareness)
  sellerCompany?: string; // Your company name (e.g., "Atlassian")
  sellerDomain?: string;  // Your company domain (e.g., "atlassian.com") 
  sellerProducts?: string[]; // Key products you're selling (e.g., ["Jira", "Confluence"])
}

export interface CacheConfig {
  ttlHours: number;
  maxEntries: number;
  compressionEnabled: boolean;
}

export interface SearchConfig {
  maxResultsPerQuery: number;
  timeoutMs: number;
  retryAttempts: number;
  rateLimitRps: number;
}

export interface AIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

export interface AppConfig {
  search: SearchConfig;
  ai: AIConfig;
  cache: CacheConfig;
  apis: {
    googleSearchApiKey: string;
    googleSearchEngineId: string;
  };
}

export interface RateLimitInfo {
  requestsPerSecond: number;
  lastRequestTime: number;
  currentBurst: number;
}

export interface FetchResult {
  content: string | null;
  error?: string;
  fetchTime: number;
  statusCode?: number;
}

export interface SearchEngineResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
}

export interface AIAnalysisResult {
  analysis: string;
  modelUsed: string;
  tokensUsed: number;
  processingTime: number;
  confidence: number;
}

export interface PerformanceMetrics {
  searchTime: number;
  fetchTime: number;
  analysisTime: number;
  totalTime: number;
  sourcesAnalyzed: number;
  cacheHit: boolean;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  metrics?: PerformanceMetrics;
}

// API Response types
export interface SalesIntelligenceResponse extends ServiceResponse<ContentAnalysis> {
  requestId: string;
  cached: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>; 