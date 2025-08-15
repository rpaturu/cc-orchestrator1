import { Logger } from './core/Logger';
import { CacheService } from './core/CacheService';
import { ProfileService } from './ProfileService';
import { CacheType } from '../types/cache-types';

export interface ResearchStreamingEvent {
  type: 'collection_started' | 'progress_update' | 'research_findings' | 'sources_found' | 'vendor_insights' | 'follow_up_options' | 'research_complete';
  message: string;
  requestId: string;
  areaId: string;
  companyId: string;
  userRole?: string;
  userCompany?: string;
  progress?: number;
  timestamp: string;
  data?: any;
}

export interface ResearchStreamingConfig {
  areaId: string;
  companyId: string;
  userRole?: string;
  userCompany?: string;
  requestId: string;
}

export class ResearchStreamingService {
  private logger: Logger;
  private cacheService: CacheService;
  private profileService: ProfileService;

  constructor() {
    this.logger = new Logger('ResearchStreamingService');
    this.cacheService = new CacheService({
      ttlHours: 24,
      maxEntries: 1000,
      compressionEnabled: false
    }, this.logger);
    this.profileService = new ProfileService();
  }

  /**
   * Initialize research streaming for a specific area and company
   */
  async initializeResearch(config: ResearchStreamingConfig): Promise<ResearchStreamingEvent> {
    this.logger.info('Initializing research streaming', config);

    const event: ResearchStreamingEvent = {
      type: 'collection_started',
      message: `🔍 Starting ${config.areaId} research for ${config.companyId}...`,
      requestId: config.requestId,
      areaId: config.areaId,
      companyId: config.companyId,
      userRole: config.userRole,
      userCompany: config.userCompany,
      progress: 0,
      timestamp: new Date().toISOString(),
      data: {
        estimatedTimeMinutes: 3,
        statusEndpoint: `/workflows/${config.requestId}/status`,
        resultEndpoint: `/workflows/${config.requestId}/result`
      }
    };

    // Cache the initial event using setRawJSON for custom data types
    await this.cacheService.setRawJSON(`research:${config.requestId}:events`, [event], CacheType.ASYNC_REQUEST_TRACKING);

    return event;
  }

  /**
   * Generate progress update events based on research area
   */
  async generateProgressUpdates(config: ResearchStreamingConfig): Promise<ResearchStreamingEvent[]> {
    const events: ResearchStreamingEvent[] = [];
    
    // Generate progress updates based on research area
    const progressSteps = this.getProgressSteps(config.areaId);
    
    for (let i = 0; i < progressSteps.length; i++) {
      const step = progressSteps[i];
      const progress = Math.round(((i + 1) / progressSteps.length) * 100);
      
      const event: ResearchStreamingEvent = {
        type: 'progress_update',
        message: step.message,
        requestId: config.requestId,
        areaId: config.areaId,
        companyId: config.companyId,
        userRole: config.userRole,
        userCompany: config.userCompany,
        progress,
        timestamp: new Date().toISOString(),
        data: {
          step: i + 1,
          totalSteps: progressSteps.length,
          currentStep: step.name
        }
      };
      
      events.push(event);
    }

    return events;
  }

  /**
   * Get progress steps for a specific research area
   */
  private getProgressSteps(areaId: string): Array<{ name: string; message: string }> {
    const progressSteps: { [key: string]: Array<{ name: string; message: string }> } = {
      'company_overview': [
        { name: 'company_lookup', message: '🔍 Looking up company information...' },
        { name: 'industry_analysis', message: '🏭 Analyzing industry context...' },
        { name: 'company_profile', message: '📊 Building company profile...' }
      ],
      'decision_makers': [
        { name: 'executive_search', message: '👔 Searching for key executives...' },
        { name: 'contact_validation', message: '✅ Validating contact information...' },
        { name: 'influence_mapping', message: '🗺️ Mapping decision influence...' }
      ],
      'tech_stack': [
        { name: 'technology_scan', message: '🔧 Scanning technology stack...' },
        { name: 'integration_analysis', message: '🔗 Analyzing integrations...' },
        { name: 'migration_opportunities', message: '🚀 Identifying migration opportunities...' }
      ],
      'business_challenges': [
        { name: 'challenge_research', message: '🎯 Researching business challenges...' },
        { name: 'pain_point_analysis', message: '💡 Analyzing pain points...' },
        { name: 'solution_mapping', message: '🧩 Mapping solution opportunities...' }
      ],
      'competitive_positioning_value_props': [
        { name: 'competitive_analysis', message: '⚔️ Analyzing competitive landscape...' },
        { name: 'value_prop_research', message: '💎 Researching value propositions...' },
        { name: 'positioning_strategy', message: '🎯 Developing positioning strategy...' }
      ]
    };

    return progressSteps[areaId] || [
      { name: 'data_collection', message: '📊 Collecting research data...' },
      { name: 'analysis', message: '🔍 Analyzing findings...' },
      { name: 'insights', message: '💡 Generating insights...' }
    ];
  }

  /**
   * Get all research events for a specific request
   */
  async getResearchEvents(requestId: string): Promise<ResearchStreamingEvent[]> {
    const events = await this.cacheService.getRawJSON(`research:${requestId}:events`);
    return events || [];
  }

  /**
   * Add a new research event to the cache
   */
  async addResearchEvent(requestId: string, event: ResearchStreamingEvent): Promise<void> {
    const events = await this.getResearchEvents(requestId);
    events.push(event);
    await this.cacheService.setRawJSON(`research:${requestId}:events`, events, CacheType.ASYNC_REQUEST_TRACKING);
  }

  /**
   * Complete research and generate final insights
   */
  async completeResearch(config: ResearchStreamingConfig, findings: any): Promise<ResearchStreamingEvent> {
    const event: ResearchStreamingEvent = {
      type: 'research_complete',
      message: `✅ Research complete for ${config.areaId} - ${config.companyId}`,
      requestId: config.requestId,
      areaId: config.areaId,
      companyId: config.companyId,
      userRole: config.userRole,
      userCompany: config.userCompany,
      progress: 100,
      timestamp: new Date().toISOString(),
      data: {
        findings,
        summary: `Research completed successfully for ${config.companyId}`,
        nextSteps: this.generateNextSteps(config.areaId, config.userRole)
      }
    };

    await this.addResearchEvent(config.requestId, event);
    return event;
  }

  /**
   * Generate next steps based on research area and user role
   */
  private generateNextSteps(areaId: string, userRole?: string): string[] {
    const nextSteps: { [key: string]: string[] } = {
      'company_overview': [
        'Schedule discovery call',
        'Prepare company briefing',
        'Identify key stakeholders'
      ],
      'decision_makers': [
        'Reach out to key contacts',
        'Schedule executive meetings',
        'Build relationship map'
      ],
      'tech_stack': [
        'Technical assessment call',
        'Integration planning',
        'Migration roadmap'
      ],
      'business_challenges': [
        'Solution presentation',
        'ROI calculation',
        'Implementation timeline'
      ]
    };

    return nextSteps[areaId] || [
      'Follow up with prospect',
      'Schedule next meeting',
      'Prepare proposal'
    ];
  }
}
