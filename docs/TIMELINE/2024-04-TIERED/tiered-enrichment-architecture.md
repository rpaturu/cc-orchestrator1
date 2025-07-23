# Tiered Enrichment Architecture

## Overview

This document outlines the comprehensive tiered enrichment architecture for the sales intelligence platform, focusing on **dataset-driven** collection strategies, **source-based** naming (avoiding hard-coded tiers), and **intelligent cache management** across three layers.

## 🏗️ Architecture Principles

### 1. **Data-Centric Approach**
- Focus on **what data we need** (datasets) rather than **which APIs to call** (sources)
- Use a **Dataset Requirements Matrix** to map data fields to optimal sources
- Enable **intelligent source selection** based on cache availability, cost, and quality

### 2. **Source-Based Naming (Future-Proof)**
- Use descriptive source names: `sniovEnrichmentFunction`, `serpApiMultiSourceFunction`
- Avoid tier-based naming: ~~`tier1Function`~~, ~~`tier2Function`~~
- Allow **flexible priority reconfiguration** without code changes

### 3. **Three-Layer Cache Strategy**
- **Layer 1**: Orchestrator Cache (enriched profiles, 24-hour TTL)
- **Layer 2**: Source Cache (raw API responses, variable TTL by source)
- **Layer 3**: Processor Cache (LLM analysis, 7-day TTL)

## 📊 Dataset Requirements Matrix

### Core Data Fields and Source Mapping

```typescript
export const DATASET_REQUIREMENTS_MAP: Record<string, DatasetRequirement> = {
  // Company Basic Info
  company_name: {
    sources: [
      { source: 'google_knowledge_graph', priority: 1, cost: 0.02, reliability: 0.95 },
      { source: 'serp_organic', priority: 2, cost: 0.05, reliability: 0.85 },
      { source: 'brightdata_company_db', priority: 3, cost: 0.15, reliability: 0.90 }
    ],
    required: true,
    quality_threshold: 0.8
  },

  // Contact Information  
  key_contacts: {
    sources: [
      { source: 'snov_contacts', priority: 1, cost: 0.10, reliability: 0.90 },
      { source: 'brightdata_people_db', priority: 2, cost: 0.25, reliability: 0.88 },
      { source: 'serp_linkedin', priority: 3, cost: 0.08, reliability: 0.75 },
      { source: 'apollo_contacts', priority: 4, cost: 0.12, reliability: 0.85 }
    ],
    required: false,
    quality_threshold: 0.8
  },

  // Technology Stack
  tech_stack: {
    sources: [
      { source: 'brightdata_technographics', priority: 1, cost: 0.20, reliability: 0.92 },
      { source: 'brightdata_web_scraping', priority: 2, cost: 0.40, reliability: 0.85 },
      { source: 'serp_organic', priority: 3, cost: 0.05, reliability: 0.60 }
    ],
    required: false,
    quality_threshold: 0.75
  }
};
```

### Consumer-Specific Dataset Requirements

```typescript
export const CONSUMER_DATASET_REQUIREMENTS: Record<ConsumerType, string[]> = {
  profile: [
    'company_name', 'domain', 'industry', 'employee_count'
  ],
  
  vendor_enrichment: [
    'company_name', 'domain', 'industry', 'employee_count',
    'key_contacts', 'tech_stack', 'recent_news'
  ],
  
  customer_enrichment: [
    'company_name', 'domain', 'industry', 'employee_count', 
    'key_contacts', 'tech_stack', 'recent_news',
    'hiring_trends', 'purchase_intent'
  ]
};
```

## 🏗️ Step Functions Architecture

### Source-Based Lambda Functions

```typescript
// ✅ Good: Source-based naming (future-proof)
const sniovEnrichmentFunction = new NodejsFunction(this, 'SniovEnrichmentFunction', {
  functionName: 'sales-intelligence-snov-enrichment',
  handler: 'sniovEnrichmentHandler'
});

const serpApiMultiSourceFunction = new NodejsFunction(this, 'SerpApiMultiSourceFunction', {
  functionName: 'sales-intelligence-serpapi-multisource', 
  handler: 'serpApiMultiSourceHandler'
});

const brightDataMultiDatasetFunction = new NodejsFunction(this, 'BrightDataMultiDatasetFunction', {
  functionName: 'sales-intelligence-brightdata-datasets',
  handler: 'brightDataMultiDatasetHandler'
});

const llmAnalysisFunction = new NodejsFunction(this, 'LlmAnalysisFunction', {
  functionName: 'sales-intelligence-llm-analysis',
  handler: 'llmAnalysisHandler'
});
```

### Orchestration Functions

```typescript
const cacheCheckerFunction = new NodejsFunction(this, 'CacheCheckerFunction', {
  functionName: 'sales-intelligence-cache-checker',
  handler: 'cacheCheckerHandler'
});

const datasetPlannerFunction = new NodejsFunction(this, 'DatasetPlannerFunction', {
  functionName: 'sales-intelligence-dataset-planner',
  handler: 'datasetPlannerHandler'
});

const costValidatorFunction = new NodejsFunction(this, 'CostValidatorFunction', {
  functionName: 'sales-intelligence-cost-validator',
  handler: 'costValidatorHandler'
});
```

### Step Functions Workflow

```typescript
const definition = 
  // Layer 1: Check orchestrator cache
  cacheCheckTask
    .next(new stepfunctions.Choice(this, 'CheckCacheHit')
      .when(stepfunctions.Condition.booleanEquals('$.cacheHit', true), 
        new stepfunctions.Succeed(this, 'ReturnCachedData'))
      .otherwise(
        // Layer 2: Dataset-aware planning
        datasetPlanningTask
          .next(costValidationTask)
          .next(
            // Layer 3: Parallel source collection
            new stepfunctions.Parallel(this, 'ParallelSourceCollection')
              .branch(sniovCollectionBranch)
              .branch(serpApiCollectionBranch)
              .branch(brightDataCollectionBranch)
          )
          .next(
            // Layer 4: Processing based on extraction complexity
            processingRouter
              .next(aggregateAndCacheTask)
          )
      )
    );
```

## 🗂️ Three-Layer Cache Strategy

### Layer 1: Orchestrator Cache (High-Level Results)
```
Cache Keys: enriched_profile:${companyName}:${requester}
TTL: 24 hours
Purpose: Avoid entire workflows for known results
```

### Layer 2: Source Cache (Raw API Data)  
```
Cache Keys: ${source}_raw:${companyName}
Examples:
- snov_contacts_raw:tesla
- serp_organic_raw:tesla  
- brightdata_company_db_raw:tesla
TTL: Variable by source (3-30 days)
Purpose: Avoid expensive API calls per source
```

### Layer 3: Processor Cache (Intermediate Processing)
```
Cache Keys: ${processor}:${companyName}:${analysisType}
Examples:
- llm_analysis:tesla:vendor_context
- contact_extraction:tesla:processed
- tech_stack_analysis:tesla:extracted
TTL: 7 days (expensive processing, cache longer)
Purpose: Avoid expensive LLM/processing operations
```

## 💡 Intelligent Collection Planning

### Cache-Aware Planning Flow

```typescript
async createDatasetAwareCollectionPlan(
  companyName: string,
  requester: ConsumerType,
  customDatasets?: string[]
): Promise<DatasetAwareCollectionPlan> {
  
  // Step 1: Check Layer 1 Cache (Orchestrator Level)
  const profileCacheKey = `enriched_profile:${companyName}:${requester}`;
  const cachedProfile = await this.cache.get(profileCacheKey);
  
  if (cachedProfile && this.meetsQualityThreshold(cachedProfile)) {
    return {
      toCollect: [], // No collection needed!
      fromCache: ['orchestrator_profile'],
      estimatedCost: 0,
      cacheSavings: this.calculateFullWorkflowCost(requestedSources)
    };
  }

  // Step 2: Determine required datasets
  const requiredDatasets = customDatasets || CONSUMER_DATASET_REQUIREMENTS[requester];
  
  // Step 3: Check cache availability for each dataset
  const datasetAvailability = await this.checkDatasetAvailability(companyName, requiredDatasets);
  
  // Step 4: Create optimal source collection plan
  const plan = await this.createOptimalSourcePlan(datasetAvailability, requester);
  
  return plan;
}
```

### Smart Redundancy Detection

```typescript
// Example: If we have cached SerpAPI organic + news data, 
// we might skip BrightData scraping for basic vendor enrichment
private isSourceRedundant(source: SourceType, cachedSources: SourceType[], requester: ConsumerType): boolean {
  const redundancyRules = {
    vendor_enrichment: {
      brightdata_company_db: ['serp_organic', 'serp_news'].every(s => cachedSources.includes(s as SourceType)),
      apollo_contacts: cachedSources.includes('snov_contacts' as SourceType)
    },
    profile: {
      brightdata_company_db: cachedSources.includes('serp_organic' as SourceType)
    }
  };

  return redundancyRules[requester]?.[source] || false;
}
```

## 🌐 BrightData as Multi-Dataset Platform

### BrightData Dataset Types

```typescript
type BrightDataDataset = 
  | 'company_db'        // Company intelligence database
  | 'people_db'         // People/contact database  
  | 'technographics'    // Technology stack data
  | 'firmographics'     // Company firmographic data
  | 'intent_data'       // Purchase intent signals
  | 'web_scraping';     // Custom web scraping
```

### Dataset-Specific Caching Strategy

```typescript
const BRIGHTDATA_SOURCE_COSTS = {
  brightdata_company_db: { cost: 0.15, ttl: 7 * 24 * 60 * 60 * 1000, priority: 2 },      // 7 days
  brightdata_people_db: { cost: 0.25, ttl: 14 * 24 * 60 * 60 * 1000, priority: 3 },     // 14 days  
  brightdata_technographics: { cost: 0.20, ttl: 30 * 24 * 60 * 60 * 1000, priority: 3 }, // 30 days
  brightdata_intent_data: { cost: 0.30, ttl: 3 * 24 * 60 * 60 * 1000, priority: 4 },     // 3 days (fresh)
  brightdata_web_scraping: { cost: 0.40, ttl: 24 * 60 * 60 * 1000, priority: 4 }         // 1 day (custom)
};
```

## 🎯 Tiered Extraction Strategy

### Extraction Complexity Levels

```typescript
export const EXTRACTION_STRATEGIES = {
  simple: {
    processor: 'direct_mapping',        // Direct API response mapping
    cache_ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    requires_llm: false
  },
  
  moderate: {
    processor: 'pattern_extraction',    // Simple parsing + pattern matching
    cache_ttl: 3 * 24 * 60 * 60 * 1000, // 3 days
    requires_llm: false
  },
  
  complex: {
    processor: 'llm_extraction',        // LLM-powered extraction
    cache_ttl: 7 * 24 * 60 * 60 * 1000, // 7 days (expensive, cache longer)
    requires_llm: true
  }
};
```

### Processing Route Selection

```typescript
// Route to appropriate processors based on extraction complexity
const routeToProcessor = new stepfunctions.Choice(this, 'RouteToProcessor')
  .when(
    stepfunctions.Condition.stringEquals('$.extraction_complexity', 'simple'),
    new stepfunctionsTasks.LambdaInvoke(this, 'SimpleExtraction', {
      lambdaFunction: directMappingFunction
    })
  )
  .when(
    stepfunctions.Condition.stringEquals('$.extraction_complexity', 'moderate'), 
    new stepfunctionsTasks.LambdaInvoke(this, 'ModerateExtraction', {
      lambdaFunction: patternExtractionFunction
    })
  )
  .when(
    stepfunctions.Condition.stringEquals('$.extraction_complexity', 'complex'),
    new stepfunctionsTasks.LambdaInvoke(this, 'ComplexExtraction', {
      lambdaFunction: llmExtractionFunction
    })
  );
```

## 📈 Benefits and Outcomes

### 1. **Cost Optimization**
- **Multi-layer caching** reduces redundant API calls and processing
- **Intelligent source selection** prefers lower-cost sources when quality is sufficient  
- **Cross-consumer efficiency** allows sharing cached data across different request types

### 2. **Quality Assurance**
- **Dataset-driven approach** ensures minimum quality thresholds per data field
- **Source reliability scoring** guides selection of most trustworthy sources
- **Fallback strategies** provide resilience when primary sources fail

### 3. **Scalability & Flexibility**
- **Source-based naming** allows adding/removing sources without code changes
- **Configuration-driven priorities** enable business rule changes without deployment
- **Modular architecture** supports independent scaling of collection vs. processing

### 4. **Performance**
- **Parallel execution** of independent data sources
- **Cache-aware planning** minimizes unnecessary work
- **Tiered processing** routes to appropriate complexity level

### 5. **Maintainability**
- **Clear separation of concerns** between collection, processing, and caching
- **Standardized interfaces** between components
- **Comprehensive monitoring** and cost attribution per consumer

## 🚀 Implementation Roadmap

### Phase 1: Foundation
1. Create Dataset Requirements Matrix types and configuration
2. Enhance DataSourceOrchestrator with dataset-aware planning
3. Add source-based Lambda function definitions to CDK stack

### Phase 2: Step Functions
1. Implement orchestration Lambda functions (cache checker, planner, validator)
2. Create Step Functions workflow with dataset routing
3. Add processing complexity routing logic

### Phase 3: Source Integration
1. Implement individual source handlers (Snov, SerpAPI multi-source, BrightData datasets)
2. Add extraction processors for different complexity levels
3. Integrate with existing cache management system

### Phase 4: Integration & Testing
1. Connect Step Functions to existing API endpoints
2. Add monitoring and metrics collection
3. Performance testing and optimization

This architecture provides a robust, scalable, and cost-effective foundation for multi-source data enrichment while maintaining flexibility for future enhancements and source additions. 