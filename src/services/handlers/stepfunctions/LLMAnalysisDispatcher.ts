/**
 * LLM Analysis Dispatcher
 * 
 * Lightweight dispatcher that routes LLM analysis requests to the appropriate specialized handler.
 * Replaces the monolithic LLMAnalysisHandler.ts for better code organization and file size management.
 */

import { Logger } from '../../core/Logger';
import { VendorLLMAnalysisHandler } from './VendorLLMAnalysisHandler';
import { CustomerLLMAnalysisHandler } from './CustomerLLMAnalysisHandler';
import { 
  LLMAnalysisEvent, 
  LLMAnalysisResponse 
} from './shared/LLMAnalysisTypes';

/**
 * Main LLM Analysis Handler - Dispatches to specialized handlers
 */
export const llmAnalysisHandler = async (event: any): Promise<any> => {
  const logger = new Logger('LLMAnalysisDispatcher');
  
  try {
    const { 
      companyName, 
      vendorCompany,
      requester, 
      data, 
      requestId, 
      userPersona,
      workflowType,
      datasetsCollected 
    } = event;
    
    if (!companyName || !data) {
      throw new Error('companyName and data are required');
    }

    logger.info('LLM analysis request received', { 
      companyName, 
      vendorCompany,
      requester, 
      requestId,
      workflowType,
      userPersona: userPersona?.role || 'unknown',
      datasetsCollected: datasetsCollected?.length || 0
    });

    // Create typed event for handlers
    const analysisEvent: LLMAnalysisEvent = {
      companyName,
      vendorCompany,
      requester,
      data,
      requestId,
      userPersona,
      workflowType: workflowType as 'vendor_context' | 'customer_intelligence',
      datasetsCollected,
      refresh: event.refresh
    };

    // Route to appropriate specialized handler
    let result: LLMAnalysisResponse;
    
    if (workflowType === 'vendor_context') {
      logger.info('Routing to vendor context analysis handler', { companyName });
      const vendorHandler = new VendorLLMAnalysisHandler(logger, process.env.AWS_REGION);
      result = await vendorHandler.processVendorAnalysis(analysisEvent);
      
    } else if (workflowType === 'customer_intelligence') {
      logger.info('Routing to customer intelligence analysis handler', { 
        companyName, 
        vendorCompany,
        userPersona: userPersona?.role 
      });
      const customerHandler = new CustomerLLMAnalysisHandler(logger, process.env.AWS_REGION);
      result = await customerHandler.processCustomerAnalysis(analysisEvent);
      
    } else {
      // Fallback for unknown workflow types
      logger.warn('Unknown workflow type, using fallback analysis', { workflowType });
      result = {
        companyName,
        vendorCompany: vendorCompany || null,
        requester,
        analysis: { 
          error: 'Unknown workflow type', 
          workflowType,
          fallback: true 
        },
        source: 'error',
        cost: 0,
        requestId,
        workflowStep: 'llm_analysis',
        workflowType: workflowType || 'unknown',
        data: event.data
      };
    }

    logger.info('LLM analysis completed successfully', {
      companyName,
      vendorCompany,
      workflowType,
      requestId,
      source: result.source,
      cost: result.cost
    });

    return result;
    
  } catch (error) {
    logger.error('LLM analysis dispatcher failed', { 
      error: error instanceof Error ? error.message : String(error),
      workflowType: event.workflowType,
      companyName: event.companyName 
    });
    
    return {
      companyName: event.companyName || 'unknown',
      vendorCompany: event.vendorCompany || null,
      requester: event.requester || 'unknown',
      analysis: null,
      source: 'error',
      cost: 0,
      requestId: event.requestId || 'unknown',
      error: error instanceof Error ? error.message : String(error),
      workflowStep: 'llm_analysis',
      workflowType: event.workflowType || 'unknown',
      data: event.data
    };
  }
}; 