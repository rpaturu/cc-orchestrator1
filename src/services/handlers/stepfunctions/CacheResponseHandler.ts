/**
 * Cache Response Handler for Step Functions
 * 
 * Handles the final step of the Step Functions workflow - storing enriched data in cache
 * Enhanced to support both vendor_context and customer_intelligence workflows
 */

import { Logger } from '../../core/Logger';
import { CacheService } from '../../core/CacheService';
import { CacheType } from '../../../types/cache-types';

/**
 * Cache Response Handler - Stores final enriched data in Layer 1 cache
 */
export const cacheResponseHandler = async (event: any): Promise<any> => {
  console.log('Cache response started:', JSON.stringify(event, null, 2));
  
  try {
    const { 
      companyName, 
      vendorCompany,
      requester, 
      analysisResult, 
      collectionResult, 
      requestId,
      workflowType
    } = event;
    
    // Extract userPersona from collectionResult data when available (customer intelligence workflows)
    // For vendor context workflows, this will be undefined and default to 'system'
    const userPersona = collectionResult?.userPersona || collectionResult?.data?.userPersona;
    
    if (!companyName || !analysisResult) {
      throw new Error('companyName and analysisResult are required');
    }

    console.log('Caching final response for:', companyName, 'requester:', requester, 'workflow:', workflowType, 'persona:', userPersona?.role || 'none');

    // Initialize cache service
    const logger = new Logger('CacheResponseHandler');
    const cacheService = new CacheService(
      { ttlHours: 24, maxEntries: 1000, compressionEnabled: true },
      logger,
      process.env.AWS_REGION
    );
    
    // Build cache key and type based on workflow
    let profileKey: string;
    let cacheType: CacheType;
    
    if (workflowType === 'vendor_context') {
      profileKey = `enriched_vendor_profile:${companyName.toLowerCase().replace(/\s+/g, '_')}:${requester}`;
      cacheType = CacheType.VENDOR_CONTEXT_ENRICHMENT;
    } else if (workflowType === 'customer_intelligence') {
      const personaRole = userPersona?.role || 'system';  // Default to 'system' instead of 'unknown'
      profileKey = `enriched_customer_profile:${companyName.toLowerCase().replace(/\s+/g, '_')}:${vendorCompany?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}:${personaRole}:${requester}`;
      cacheType = CacheType.CUSTOMER_INTELLIGENCE_ENRICHMENT;
    } else {
      // Fallback for legacy workflows
      profileKey = `enriched_profile:${companyName.toLowerCase().replace(/\s+/g, '_')}:${requester}`;
      cacheType = CacheType.VENDOR_CONTEXT_ENRICHMENT;
    }
    
    // Combine collection data and analysis into final enriched profile
    // ✅ Handle both full analysis and cache reference formats
    let analysisData: any;
    
    if (analysisResult.analysisRef) {
      // ✅ New cache reference format - retrieve full analysis from cache
      console.log('Retrieving analysis from cache reference:', analysisResult.analysisRef);
      analysisData = await cacheService.getRawJSON(analysisResult.analysisRef);
      
      if (!analysisData) {
        console.error('Failed to retrieve analysis from cache:', analysisResult.analysisRef);
        throw new Error(`Analysis not found in cache: ${analysisResult.analysisRef}`);
      }
      
      console.log('Successfully retrieved analysis from cache', {
        cacheKey: analysisResult.analysisRef,
        hasAnalysis: !!analysisData,
        analysisType: typeof analysisData,
        newsSignals: analysisData.news_signals?.length || 0,
        targetContacts: analysisData.target_contacts?.length || 0
      });
    } else {
      // Legacy format - analysis is directly embedded
      analysisData = analysisResult.analysis || analysisResult;
    }
    
    const enrichedProfile = {
      companyName,
      vendorCompany: vendorCompany || undefined,
      requester,
      workflowType: workflowType || 'unknown',
      rawData: collectionResult?.data || {},
      analysis: analysisData,  // ✅ Use retrieved analysis data
      metrics: {
        totalCost: (collectionResult?.data?.totalNewCost || 0) + (analysisResult.cost || 0),
        cacheHits: collectionResult?.data?.cacheHits || 0,
        cacheSavings: collectionResult?.data?.totalCacheSavings || 0,
        llmCost: analysisResult.cost || 0,
        datasetsCollected: collectionResult?.data?.datasetsCollected?.length || 0,
        dataQuality: collectionResult?.data?.dataQuality || analysisData.data_quality
      },
      generatedAt: new Date().toISOString(),
      requestId,
      // Store workflow-specific metadata
      workflowMetadata: {
        type: workflowType,
        userPersona: collectionResult?.data?.userPersona,
        datasetsCollected: collectionResult?.data?.datasetsCollected || [],
        processedAt: new Date().toISOString()
      }
    };
    
    console.log('Storing enriched profile with key:', profileKey);
    
    // Store in Layer 1 orchestrator cache with workflow-specific cache type
    await cacheService.setRawJSON(profileKey, enrichedProfile, cacheType);
    
    // For vendor context, also cache a cross-reference for customer intelligence to use
    if (workflowType === 'vendor_context') {
      const vendorContextRefKey = `vendor_context_ref:${companyName.toLowerCase().replace(/\s+/g, '_')}`;
      const vendorContextRef = {
        companyName,
        analysis: analysisResult,  // ✅ analysisResult IS the analysis data
        lastUpdated: new Date().toISOString(),
        cacheKey: profileKey
      };
      await cacheService.setRawJSON(vendorContextRefKey, vendorContextRef, CacheType.VENDOR_CONTEXT_REFERENCE);
      console.log('Vendor context reference cached for customer intelligence use:', vendorContextRefKey);
    }
    
    console.log('Response cached successfully for:', companyName, {
      profileKey,
      workflowType,
      totalCost: enrichedProfile.metrics.totalCost,
      cacheSavings: enrichedProfile.metrics.cacheSavings,
      datasetsCollected: enrichedProfile.metrics.datasetsCollected
    });

    return {
      success: true,
      companyName,
      vendorCompany,
      requester,
      workflowType,
      data: enrichedProfile,
      cached: true,
      cacheKey: profileKey,
      requestId,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Cache response failed:', error);
    throw error;
  }
}; 