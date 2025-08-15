/**
 * BrightData Service - Integration with BrightData Marketplace Dataset API
 * 
 * Handles async operations with polling support for dataset queries
 * Supports tech stack, company info, news, and other dataset types
 */

import { Logger } from './core/Logger';

export interface BrightDataDataset {
  id: string;
  name: string;
  size: number;
}

export interface BrightDataFilterRequest {
  dataset_id: string;
  query?: any;
  output_format?: 'json' | 'csv';
  delivery_method?: 'download' | 'webhook';
  webhook_url?: string;
}

export interface BrightDataFilterResponse {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  progress?: number;
  result_url?: string;
  error?: string;
}

export interface BrightDataCompanyInfo {
  name: string;
  domain?: string;
  industry?: string;
  employee_count?: number;
  revenue?: string;
  founded?: number;
  description?: string;
  linkedin_url?: string;
  crunchbase_url?: string;
}

export interface BrightDataTechStack {
  domain: string;
  technologies: Array<{
    name: string;
    category: string;
    confidence: number;
  }>;
  last_updated: string;
}

export class BrightDataService {
  private apiKey: string;
  private baseUrl: string;
  private logger: Logger;
  private maxPollingAttempts: number;
  private pollingIntervalMs: number;

  constructor(
    apiKey: string,
    logger: Logger,
    baseUrl: string = 'https://api.brightdata.com/datasets',
    maxPollingAttempts: number = 30,
    pollingIntervalMs: number = 2000
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.maxPollingAttempts = maxPollingAttempts;
    this.pollingIntervalMs = pollingIntervalMs;
  }

  /**
   * Get list of available datasets
   */
  async getDatasetList(): Promise<BrightDataDataset[]> {
    try {
      this.logger.debug('Fetching BrightData dataset list');
      
      const response = await fetch(`${this.baseUrl}/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`BrightData API error: ${response.status} ${response.statusText}`);
      }

      const datasets = await response.json() as BrightDataDataset[];
      this.logger.debug('BrightData dataset list retrieved', { count: datasets.length });
      
      return datasets;
    } catch (error) {
      this.logger.error('Failed to fetch BrightData dataset list', { error });
      throw error;
    }
  }

  /**
   * Filter a dataset with polling support
   */
  async filterDataset(
    datasetId: string, 
    query: any, 
    outputFormat: 'json' | 'csv' = 'json'
  ): Promise<any> {
    try {
      this.logger.debug('Starting BrightData dataset filter', { datasetId, query });
      
      // Step 1: Submit filter request
      const filterRequest: BrightDataFilterRequest = {
        dataset_id: datasetId,
        query,
        output_format: outputFormat,
        delivery_method: 'download'
      };

      const response = await fetch(`${this.baseUrl}/filter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filterRequest)
      });

      if (!response.ok) {
        throw new Error(`BrightData filter API error: ${response.status} ${response.statusText}`);
      }

      const filterResponse = await response.json() as BrightDataFilterResponse;
      this.logger.debug('BrightData filter request submitted', { 
        filterId: filterResponse.id, 
        status: filterResponse.status 
      });

      // Step 2: Poll for completion
      const result = await this.pollForCompletion(filterResponse.id);
      
      this.logger.debug('BrightData dataset filter completed', { 
        datasetId, 
        filterId: filterResponse.id,
        resultCount: Array.isArray(result) ? result.length : 1
      });

      return result;
    } catch (error) {
      this.logger.error('BrightData dataset filter failed', { datasetId, query, error });
      throw error;
    }
  }

  /**
   * Poll for filter completion
   */
  private async pollForCompletion(filterId: string): Promise<any> {
    let attempts = 0;
    
    while (attempts < this.maxPollingAttempts) {
      try {
        const response = await fetch(`${this.baseUrl}/filter/${filterId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`BrightData status API error: ${response.status} ${response.statusText}`);
        }

        const status = await response.json() as BrightDataFilterResponse;
        
        this.logger.debug('BrightData filter status check', { 
          filterId, 
          status: status.status, 
          progress: status.progress,
          attempt: attempts + 1
        });

        if (status.status === 'completed') {
          // Download the result
          if (status.result_url) {
            return await this.downloadResult(status.result_url);
          } else {
            throw new Error('No result URL provided for completed filter');
          }
        } else if (status.status === 'failed') {
          throw new Error(`BrightData filter failed: ${status.error || 'Unknown error'}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.pollingIntervalMs));
        attempts++;
      } catch (error) {
        this.logger.error('BrightData polling error', { filterId, attempt: attempts + 1, error });
        attempts++;
        
        if (attempts >= this.maxPollingAttempts) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.pollingIntervalMs));
      }
    }

    throw new Error(`BrightData filter timed out after ${this.maxPollingAttempts} attempts`);
  }

  /**
   * Download filter result
   */
  private async downloadResult(resultUrl: string): Promise<any> {
    try {
      const response = await fetch(resultUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`BrightData download error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.debug('BrightData result downloaded', { resultCount: Array.isArray(result) ? result.length : 1 });
      
      return result;
    } catch (error) {
      this.logger.error('BrightData result download failed', { resultUrl, error });
      throw error;
    }
  }

  /**
   * Get company information from Crunchbase dataset
   */
  async getCompanyInfo(companyName: string): Promise<BrightDataCompanyInfo | null> {
    try {
      this.logger.debug('Getting company info from BrightData', { companyName });
      
      const query = {
        name: { $regex: companyName, $options: 'i' }
      };

      const results = await this.filterDataset(
        'gd_l1vijqt9jfj7olije', // Crunchbase companies dataset
        query
      );

      if (results && results.length > 0) {
        const company = results[0];
        return {
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          employee_count: company.employee_count,
          revenue: company.revenue,
          founded: company.founded,
          description: company.description,
          linkedin_url: company.linkedin_url,
          crunchbase_url: company.crunchbase_url
        };
      }

      this.logger.debug('No company info found in BrightData', { companyName });
      return null;
    } catch (error) {
      this.logger.error('BrightData company info failed', { companyName, error });
      return null;
    }
  }

  /**
   * Get tech stack from BuiltWith dataset
   */
  async getTechStack(domain: string): Promise<BrightDataTechStack | null> {
    try {
      this.logger.debug('Getting tech stack from BrightData', { domain });
      
      const query = {
        domain: domain.toLowerCase()
      };

      const results = await this.filterDataset(
        'gd_l1s0r2vy8rj3dxp7n8w', // BuiltWith dataset
        query
      );

      if (results && results.length > 0) {
        const techData = results[0];
        return {
          domain: techData.domain,
          technologies: techData.technologies || [],
          last_updated: techData.last_updated || new Date().toISOString()
        };
      }

      this.logger.debug('No tech stack found in BrightData', { domain });
      return null;
    } catch (error) {
      this.logger.error('BrightData tech stack failed', { domain, error });
      return null;
    }
  }

  /**
   * Get tech stack from StackShare dataset
   */
  async getStackShareTechStack(domain: string): Promise<BrightDataTechStack | null> {
    try {
      this.logger.debug('Getting StackShare tech stack from BrightData', { domain });
      
      const query = {
        domain: domain.toLowerCase()
      };

      const results = await this.filterDataset(
        'gd_l17ib13hb5j20b36gy2', // StackShare dataset
        query
      );

      if (results && results.length > 0) {
        const techData = results[0];
        return {
          domain: techData.domain,
          technologies: techData.technologies || [],
          last_updated: techData.last_updated || new Date().toISOString()
        };
      }

      this.logger.debug('No StackShare tech stack found in BrightData', { domain });
      return null;
    } catch (error) {
      this.logger.error('BrightData StackShare tech stack failed', { domain, error });
      return null;
    }
  }

  /**
   * Get news data
   */
  async getNewsData(companyName: string, limit: number = 10): Promise<any[]> {
    try {
      this.logger.debug('Getting news data from BrightData', { companyName, limit });
      
      const query = {
        title: { $regex: companyName, $options: 'i' },
        $limit: limit
      };

      const results = await this.filterDataset(
        'gd_l1oojs36kb59w6jg8i1', // News dataset
        query
      );

      this.logger.debug('BrightData news data retrieved', { 
        companyName, 
        resultCount: results?.length || 0 
      });

      return results || [];
    } catch (error) {
      this.logger.error('BrightData news data failed', { companyName, error });
      return [];
    }
  }

  /**
   * Get LinkedIn company information
   */
  async getLinkedInCompanyInfo(companyName: string): Promise<any> {
    try {
      this.logger.debug('Getting LinkedIn company info from BrightData', { companyName });
      
      const query = {
        name: { $regex: companyName, $options: 'i' }
      };

      const results = await this.filterDataset(
        'gd_l1vikfnt1wgvvqz95w', // LinkedIn company info dataset
        query
      );

      this.logger.debug('BrightData LinkedIn company info retrieved', { 
        companyName, 
        resultCount: results?.length || 0 
      });

      return results?.[0] || null;
    } catch (error) {
      this.logger.error('BrightData LinkedIn company info failed', { companyName, error });
      return null;
    }
  }

  /**
   * Health check for BrightData service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getDatasetList();
      return true;
    } catch (error) {
      this.logger.error('BrightData health check failed', { error });
      return false;
    }
  }
}
