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
    
    // Check Layer 1: Complete enriched profile cache (workflow-specific keys)
    let profileKey: string;
    
    if (event.workflowType === 'vendor_context') {
      profileKey = `enriched_vendor_profile:${companyName.toLowerCase().replace(/\s+/g, '_')}:${requester}`;
    } else if (event.workflowType === 'customer_intelligence') {
      const vendorCompany = event.vendorCompany || 'unknown';
      const personaRole = event.userPersona?.role || 'unknown';
      profileKey = `enriched_customer_profile:${companyName.toLowerCase().replace(/\s+/g, '_')}:${vendorCompany.toLowerCase().replace(/\s+/g, '_')}:${personaRole}:${requester}`;
    } else {
      // Fallback to legacy key
      profileKey = `enriched_profile:${companyName}:${requester}`;
    }
    
    console.log('Checking workflow-specific cache key:', profileKey, 'for workflow:', event.workflowType);
    
    const cachedProfile = await cacheService.getRawJSON(profileKey);
    
    if (cachedProfile) {
      console.log('Cache hit - returning cached profile for:', companyName);
      return {
        hit: true,
        source: 'orchestrator_cache',
        data: cachedProfile,
        cost: 0,
        companyName,
        requester,
        // Preserve key fields for consistency
        workflowType: event.workflowType,
        requestId: event.requestId,
        timestamp: event.timestamp,
        vendorCompany: event.vendorCompany,
        userPersona: event.userPersona
      };
    }
    
    console.log('Cache miss - proceeding to data collection for:', companyName);
    return { 
      hit: false, 
      companyName, 
      requester,
      // Preserve key fields for downstream handlers  
      workflowType: event.workflowType,
      requestId: event.requestId,
      timestamp: event.timestamp,
      vendorCompany: event.vendorCompany,
      userPersona: event.userPersona,
      interactionMode: event.interactionMode,
      refresh: event.refresh
    };

  } catch (error) {
    console.error('Cache check failed:', error);
    throw error;
  }
}; 