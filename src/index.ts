import { config } from 'dotenv';
import { SalesIntelligenceOrchestrator } from './services/SalesIntelligenceOrchestrator';
import { AppConfig, SalesIntelligenceRequest } from './types';

// Load environment variables
config();

/**
 * Application configuration
 */
const appConfig: AppConfig = {
  search: {
    maxResultsPerQuery: 10,  // Google's API maximum (was 15, but Google limits to 10 per request)
    timeoutMs: 10000,
    retryAttempts: 1,  // Minimal retries - Google is reliable
    rateLimitRps: 0.5  // Very conservative - 1 request every 2 seconds
  },
  ai: {
    model: process.env.BEDROCK_MODEL!,
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS!),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE!),
    systemPrompt: 'You are a sales intelligence analyst. Provide actionable insights for sales professionals.'
  },
  cache: {
    ttlHours: process.env.NODE_ENV === 'development' ? 96 : 1, // 96 hours for development, 1 hour for production
    maxEntries: 1000,
    compressionEnabled: true
  },
  apis: {
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY!,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!
  }
};

/**
 * Example usage of the Sales Intelligence Service
 */
async function main() {
  try {
    console.log('🚀 Starting Sales Intelligence AI...');
    
    // Validate required environment variables
    if (!appConfig.apis.googleSearchApiKey) {
      console.error('❌ Missing required environment variables:');
      console.error('   - GOOGLE_SEARCH_API_KEY');
      console.error('   - GOOGLE_SEARCH_ENGINE_ID');
      console.error('Note: Using AWS Bedrock for AI (no API key required if using IAM roles)');
      process.exit(1);
    }

    // Initialize the service
    const salesIntelligence = new SalesIntelligenceOrchestrator(appConfig);

    // Health check
    console.log('🔍 Performing health check...');
    const health = await salesIntelligence.healthCheck();
    console.log('Health status:', health);

    // Example sales intelligence request
    const request: SalesIntelligenceRequest = {
      companyDomain: 'shopify.com',
      salesContext: 'discovery',
      additionalContext: 'Looking to understand their e-commerce platform challenges'
    };

    console.log('📊 Generating sales intelligence for Shopify...');
    console.log('Request:', request);

    const startTime = Date.now();
    const intelligence = await salesIntelligence.generateIntelligence(request);
    const endTime = Date.now();

    console.log('\n✅ Sales Intelligence Generated Successfully!');
    console.log(`⏱️  Total time: ${endTime - startTime}ms`);
    console.log(`🔗 Sources analyzed: ${intelligence.sources.length}`);
    console.log(`📈 Confidence score: ${intelligence.confidenceScore}`);
    console.log(`📅 Generated at: ${intelligence.generatedAt}`);

    // Display insights summary
    console.log('\n📋 Company Overview:');
    console.log(`   Name: ${intelligence.insights.companyOverview.name}`);
    console.log(`   Industry: ${intelligence.insights.companyOverview.industry}`);
    console.log(`   Size: ${intelligence.insights.companyOverview.size}`);

    console.log('\n🎯 Key Pain Points:');
    intelligence.insights.painPoints.forEach((point, index) => {
      console.log(`   ${index + 1}. ${point}`);
    });

    console.log('\n💬 Talking Points:');
    intelligence.insights.talkingPoints.forEach((point, index) => {
      console.log(`   ${index + 1}. ${point}`);
    });

    console.log('\n🏆 Competitive Landscape:');
    console.log(`   Market Position: ${intelligence.insights.competitiveLandscape.marketPosition}`);
    console.log(`   Competitors: ${intelligence.insights.competitiveLandscape.competitors.map(c => c.name).join(', ')}`);

    console.log('\n📊 Deal Probability:', `${intelligence.insights.dealProbability}%`);

    console.log('\n🔗 Sources:');
    intelligence.sources.slice(0, 5).forEach((source, index) => {
      console.log(`   ${index + 1}. ${source}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

/**
 * Helper function to get CORS headers based on the request origin
 */
export const getCorsHeaders = (origin?: string) => {
  // Get allowed origins from environment variable, fallback to defaults
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'https://d1uaf0b61i39e.cloudfront.net,http://localhost:3000,http://localhost:5173';
  const allowedOrigins = allowedOriginsEnv.split(',').map(o => o.trim());
  
  // If origin is in allowed list, return it; otherwise return * for development
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token',
    'Access-Control-Allow-Credentials': 'false',
  };
};

export { SalesIntelligenceOrchestrator, appConfig };
export * from './types'; 