/**
 * Cache Check Handler for Step Functions
 * 
 * Handles the first step of the Step Functions workflow - checking if data already exists in cache
 */

import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';

/**
 * Cache Check Handler - First step in Step Functions workflow
 */
export const cacheCheckHandler = async (event: any): Promise<any> => {
  console.log('Cache check started:', JSON.stringify(event, null, 2));
  
  try {
    const { companyName, requester = 'vendor_context' } = event;
    
    if (!companyName) {
      throw new Error('companyName is required');
    }

    console.log('Checking orchestrator cache for:', companyName, 'requester:', requester);

    // Initialize cache service
    const logger = new Logger('CacheCheckHandler');
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      logger,
      process.env.AWS_REGION
    );
    
    // Check Layer 1: Complete enriched profile cache
    const profileKey = `enriched_profile:${companyName}:${requester}`;
    console.log('Checking cache key:', profileKey);
    
    const cachedProfile = await cacheService.get(profileKey);
    
    if (cachedProfile) {
      console.log('Cache hit - returning cached profile for:', companyName);
      return {
        hit: true,
        source: 'orchestrator_cache',
        data: cachedProfile,
        cost: 0,
        companyName,
        requester
      };
    }
    
    console.log('Cache miss - proceeding to data collection for:', companyName);
    return { 
      hit: false, 
      companyName, 
      requester 
    };

  } catch (error) {
    console.error('Cache check failed:', error);
    throw error;
  }
}; 