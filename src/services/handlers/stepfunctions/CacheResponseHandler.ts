/**
 * Cache Response Handler for Step Functions
 * 
 * Handles the final step of the Step Functions workflow - storing enriched data in cache
 */

import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';

/**
 * Cache Response Handler - Stores final enriched data in Layer 1 cache
 */
export const cacheResponseHandler = async (event: any): Promise<any> => {
  console.log('Cache response started:', JSON.stringify(event, null, 2));
  
  try {
    const { companyName, requester, analysisResult, collectionResult, requestId } = event;
    
    if (!companyName || !analysisResult) {
      throw new Error('companyName and analysisResult are required');
    }

    console.log('Caching final response for:', companyName, 'requester:', requester);

    // Initialize cache service
    const logger = new Logger('CacheResponseHandler');
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      logger,
      process.env.AWS_REGION
    );
    
    // Combine collection data and analysis into final enriched profile
    const enrichedProfile = {
      companyName,
      requester,
      rawData: collectionResult?.data || {},
      analysis: analysisResult.analysis,
      metrics: {
        totalCost: (collectionResult?.data?.totalNewCost || 0) + (analysisResult.cost || 0),
        cacheHits: collectionResult?.data?.cacheHits || 0,
        cacheSavings: collectionResult?.data?.totalCacheSavings || 0,
        llmCost: analysisResult.cost || 0
      },
      generatedAt: new Date().toISOString(),
      requestId
    };
    
    // Store in Layer 1 orchestrator cache
    const profileKey = `enriched_profile:${companyName}:${requester}`;
    console.log('Storing enriched profile with key:', profileKey);
    
    await cacheService.setRawJSON(profileKey, enrichedProfile, 'VENDOR_CONTEXT_ENRICHMENT' as any);
    
    console.log('Response cached successfully for:', companyName, {
      profileKey,
      totalCost: enrichedProfile.metrics.totalCost,
      cacheSavings: enrichedProfile.metrics.cacheSavings
    });

    return {
      success: true,
      companyName,
      requester,
      data: enrichedProfile,
      cached: true,
      requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Cache response failed:', error);
    throw error;
  }
}; 