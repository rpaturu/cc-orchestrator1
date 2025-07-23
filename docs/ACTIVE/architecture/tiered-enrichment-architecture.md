# Tiered Enrichment Architecture

## 🎯 Strategic Intent & Business Problem

### What We're Really Solving

Sales intelligence platforms face a fundamental challenge: **how to provide rich, accurate company data cost-effectively while maintaining quality and speed**. 

Current approaches suffer from:

- **Cost Inefficiency** - Redundant API calls across consumers (profile lookup, vendor enrichment, customer analysis)
- **Inflexible Prioritization** - Hard-coded "tier" systems that can't adapt to changing business priorities
- **Quality Inconsistency** - No systematic approach to ensure data meets minimum thresholds
- **Cache Waste** - Missed opportunities for cross-consumer data sharing
- **Maintenance Burden** - Adding new sources requires architectural changes

### Our Strategic Response

Build an **intelligent orchestration system** that:

- **Thinks before collecting** - Cache-aware planning
- **Adapts to business priorities** - Configurable, not hard-coded
- **Optimizes for value** - Cost vs. quality trade-offs
- **Learns from usage** - Cross-consumer efficiency
- **Evolves with business** - Pluggable architecture

## 🧠 Core Architectural Philosophy

### 1. Data-Centric vs Source-Centric Thinking

| Approach | Strategy |
|----------|----------|
| **Traditional** | "We have SerpAPI, BrightData, Snov → call them all" |
| **Our Approach** | "We need company name, contacts, tech stack → get this data optimally" |

**Why This Matters:**

- **Business agility** - Change priorities without code changes
- **Quality assurance** - Ensure minimum thresholds per data field
- **Cost intelligence** - Automatic fallback strategies
- **Future-proofing** - Add sources without architectural impact

### 2. Intelligence Over Speed

| Approach | Strategy |
|----------|----------|
| **Traditional** | "Call APIs fast, process results" |
| **Our Approach** | "Plan smart, execute minimal work" |

```
Traditional Flow:
Request → Call All APIs → Process → Return

Intelligent Flow:
Request → Analyze Cache → Plan Collection → Execute Minimal Work → Return
```

**Why This Changes Everything:**

- 80% cost reduction through intelligent cache usage
- Cross-consumer value creation
- Quality-driven decision making

### 3. Configuration Over Code

| Approach | Strategy |
|----------|----------|
| **Traditional** | Hard-coded tiers (Tier 1 = Snov, Tier 2 = SerpAPI) |
| **Our Approach** | Business rules in configuration, not code |

**Strategic Value:**

- Business can pivot source strategies instantly
- A/B testing different source combinations
- Vendor negotiations don't require deployments

## 🏗️ Three Core Architectural Insights

### Insight 1: Dataset Requirements Matrix - The Brain

**The Big Idea:** Map what data we need to how we can get it optimally

```typescript
// Not just "call Snov for contacts"
// But "for contacts, try Snov (90% reliable, $0.10), fallback to BrightData (88% reliable, $0.25)"
  key_contacts: {
    sources: [
      { source: 'snov_contacts', priority: 1, cost: 0.10, reliability: 0.90 },
      { source: 'brightdata_people_db', priority: 2, cost: 0.25, reliability: 0.88 },
    { source: 'serp_linkedin', priority: 3, cost: 0.08, reliability: 0.75 }
    ],
    required: false,
    quality_threshold: 0.8
}
```

**Strategic Implications:**

- **Business Agility** - Change source priorities without engineering work
- **Quality Assurance** - Systematic quality control vs. ad-hoc results
- **Cost Optimization** - Intelligent fallback from expensive to cheaper sources
- **Vendor Management** - Data-driven vendor performance evaluation

### Insight 2: Three-Layer Cache Strategy - The Memory

**The Big Idea:** Create institutional memory that gets smarter over time

```
Layer 1 (Orchestrator): "I've seen this exact request before → return complete result"
Layer 2 (Source): "I have raw SerpAPI data for Tesla → reuse across consumers"  
Layer 3 (Processor): "I've analyzed Tesla's tech stack → share LLM insights"
```

**Why Three Layers:**

- **Layer 1** - Avoid entire workflows (vendor enrichment pays, profile lookup benefits)
- **Layer 2** - Share expensive API calls across consumers  
- **Layer 3** - Cache expensive LLM processing

**Business Impact:**

- **Cross-Consumer Efficiency** - First consumer pays, subsequent ones benefit
- **Compound Learning** - System gets smarter with usage
- **Cost Attribution** - Track who originally paid for what data

### Insight 3: Source-Based Naming - The Evolution Strategy

| Problem | Solution |
|---------|----------|
| **The Problem with Tiers** | Today's "Tier 1" becomes tomorrow's "Tier 3" |
| **The Solution** | Name by capability, not priority |

```typescript
// ❌ Brittle: Priority encoded in name
tier1Function, tier2Function, tier3Function

// ✅ Adaptive: Capability-based naming
sniovEnrichmentFunction, serpApiMultiSourceFunction, brightDataMultiDatasetFunction
```

**Strategic Value:**

- **Future-Proof** - Priorities change, capabilities don't
- **Maintainability** - Add/remove sources without refactoring
- **Business Flexibility** - Source strategies can evolve

## 💡 Planning Intelligence Architecture

### Cache-Aware Planning Philosophy

**The Core Innovation:** Plan collection based on what's already available

```typescript
// Intelligent Planning Logic
async createDatasetAwareCollectionPlan(companyName, requester, datasets) {
  // Step 1: Check if we've solved this exact problem before
  const cachedProfile = await checkOrchestoratorCache(companyName, requester);
  if (cachedProfile && meetsQuality(cachedProfile)) {
    return { cost: 0, cacheSavings: $2.50 }; // Complete cache hit
  }

  // Step 2: Check what raw data we already have
  const sourceAvailability = await checkSourceCaches(companyName, datasets);
  
  // Step 3: Plan minimal collection to fill gaps
  const plan = createOptimalPlan(sourceAvailability, datasets, requester);
  
  return plan; // Might cost $0.40 instead of $2.50
}
```

### Smart Redundancy Detection

**The Philosophy:** Understand data relationships, not just API relationships

**Intelligence Examples:**

- If we have SerpAPI organic + news → Skip BrightData company DB for basic needs
- If we have Snov contacts → Skip Apollo contacts for same company  
- If we have cached technographics → Skip general tech searches

**Business Value:** Prevent redundant spending while maintaining quality

## 🌐 BrightData as Multi-Dataset Platform

### Strategic Recognition: BrightData isn't just "scraping"

| View | Description |
|------|-------------|
| **Traditional View** | "BrightData = expensive web scraping" |
| **Strategic View** | "BrightData = multiple specialized datasets" |

```typescript
type BrightDataDataset = 
  | 'company_db'        // Company intelligence database
  | 'people_db'         // People/contact database  
  | 'technographics'    // Technology stack data
  | 'firmographics'     // Company firmographic data
  | 'intent_data'       // Purchase intent signals
  | 'web_scraping';     // Custom web scraping
```

**Caching Strategy:** Different datasets, different value, different TTLs

```typescript
const BRIGHTDATA_INTELLIGENCE = {
  company_db: { cost: 0.15, ttl: '7 days', priority: 2 },      // Stable company info
  technographics: { cost: 0.20, ttl: '30 days', priority: 3 }, // Tech changes slowly
  intent_data: { cost: 0.30, ttl: '3 days', priority: 4 },     // Intent changes fast
};
```

## 🎯 Consumer-Specific Intelligence

### Understanding Different Consumer Needs

```typescript
export const CONSUMER_DATASET_REQUIREMENTS = {
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

**Strategic Insight:** Each consumer type has different value thresholds

- **Profile lookup** - Basic info, optimize for speed
- **Vendor enrichment** - Detailed context, optimize for quality  
- **Customer analysis** - Comprehensive data, optimize for completeness

## 🚀 Hybrid Orchestration Strategy: Single Step Function with Smart Lambda Orchestration

### Hybrid Architecture Philosophy

The hybrid approach combines **Step Functions for high-level orchestration** with **intelligent Lambda functions for detailed coordination**. This creates a system that provides workflow visibility while maintaining the efficiency and flexibility of Lambda-based parallel processing.

**Key Components:**

- **Step Function Layer** - Manages workflow state, error handling, and retry logic
- **Smart Lambda Layer** - Handles complex data collection orchestration and parallel execution
- **Unified Intelligence** - Leverages our Phase 1 dataset-aware planning as the orchestration core

## 🏗️ Detailed Hybrid Implementation

### Architecture Overview

```typescript
// High-Level Flow
API Gateway → Step Function → Smart Orchestrator Lambda → [Parallel Data Collection] → LLM Analysis → Cache & Return

// Step Function Responsibilities (5-8 transitions):
1. Cache Check Task
2. Smart Data Collection Task  
3. LLM Analysis Task
4. Cache & Response Task

// Smart Lambda Responsibilities (Internal):
- Dataset-aware planning (our existing DataSourceOrchestrator)
- Parallel source collection with async coordination
- Graceful fallback handling
- Result aggregation
```

### Step Function Workflow Design

```typescript
// src/stacks/sales-intelligence-stack.ts - Hybrid Step Function
const definition = 
  // Intelligence Layer: High-level control
  cacheCheckTask
    .next(new sfn.Choice(this, 'CacheHitChoice')
      .when(sfn.Condition.booleanEquals('$.cacheHit', true), 
        returnCachedResultTask)
      .otherwise(
        // Execution Layer: Smart Lambda orchestration
        smartDataCollectionTask
          .next(llmAnalysisTask)
          .next(cacheAndResponseTask)));

const stateMachine = new sfn.StateMachine(this, 'SalesIntelligenceWorkflow', {
  stateMachineName: 'SalesIntelligenceWorkflow',
  definitionBody: sfn.DefinitionBody.fromChainable(definition),
  timeout: Duration.minutes(15)
});
```

### Smart Lambda Orchestration

```typescript
// Enhanced DataSourceOrchestrator as Step Function Task
export class SmartDataCollectionHandler {
  
  async handle(event: DataCollectionEvent): Promise<MultiSourceData> {
    const { companyName, requester, requestId } = event;
    
    // Use our existing dataset-aware planning
    const plan = await this.dataOrchestrator.createCollectionPlan(
      companyName, 
      requester
    );
    
    // Execute collection plan with internal async coordination
    return await this.executeCollectionPlan(plan);
  }
  
  private async executeCollectionPlan(plan: DataCollectionPlan): Promise<MultiSourceData> {
    const collectionPromises: Promise<RawDataResult>[] = [];
    
    // Phase 1: Parallel source collection (internal to Lambda)
    for (const source of plan.toCollect) {
      collectionPromises.push(this.collectFromSource(source));
    }
    
    // Phase 2: Intelligent error handling with graceful fallbacks
    const results = await this.executeWithFallbacks(collectionPromises);
    
    // Phase 3: Aggregate and return to Step Function
    return this.aggregateResults(results, plan);
  }
  
  private async executeWithFallbacks(
    promises: Promise<RawDataResult>[]
  ): Promise<RawDataResult[]> {
    
    // Use Promise.allSettled for graceful degradation
    const settledResults = await Promise.allSettled(promises);
    
    const results: RawDataResult[] = [];
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Log error but continue with other sources
        this.logger.warn(`Source ${index} failed: ${result.reason}`);
        results.push(this.createErrorResult(index, result.reason));
      }
    });
    
    return results;
  }
}
```

### Internal Source Clients

```typescript
// Source-specific clients operate within the Smart Lambda
export class SerpAPIClient {
  async collectMultiSource(companyName: string, datasets: DatasetType[]): Promise<SerpAPIResults> {
    // Internal parallel collection (no separate Lambda functions)
    const tasks = datasets.map(dataset => this.collectDataset(companyName, dataset));
    const results = await Promise.allSettled(tasks);
    
    return this.aggregateResults(results);
  }
  
  private async collectDataset(companyName: string, dataset: DatasetType): Promise<any> {
    switch(dataset) {
      case 'company_overview':
        return this.serpAPI.search({
          engine: 'google',
          q: `"${companyName}" company overview`,
          num: 10
        });
      case 'company_news':
        return this.serpAPI.search({
          engine: 'google_news', 
          q: companyName,
          tbm: 'nws'
        });
      // ... other datasets collected in parallel
    }
  }
}
```

## 🎯 Hybrid Implementation Architecture

### **Component Responsibilities**

#### **Step Function Orchestrator**
- **Workflow State Management**: Maintains overall request state and flow control
- **Error Handling & Retries**: Manages timeouts, failures, and retry policies
- **Cost Attribution**: Tracks workflow-level costs and execution metrics
- **Audit Trail**: Provides complete execution history for debugging and compliance

#### **Smart Data Collection Lambda**
- **Intelligence Core**: Uses our Phase 1 DataSourceOrchestrator for dataset-aware planning
- **Parallel Coordination**: Manages concurrent data collection from multiple sources
- **Graceful Degradation**: Handles source failures without stopping the entire workflow
- **Result Aggregation**: Combines multi-source data into coherent intelligence

#### **Cache Management System**
- **Layer 1 (Orchestrator)**: Complete enriched profiles for instant responses
- **Layer 2 (Source)**: Raw API responses shared across consumers
- **Layer 3 (Processor)**: Expensive LLM analysis results for reuse

### **Execution Flow Architecture**

```typescript
// High-Level Request Flow
1. API Request → Step Function Entry Point
2. Cache Check → DynamoDB Layer 1 lookup
3. Cache Miss → Smart Data Collection Lambda
4. Internal Planning → Dataset requirements analysis
5. Parallel Collection → Multi-source data gathering
6. Result Aggregation → Intelligent data combination
7. LLM Analysis → Enhanced processing
8. Cache Storage → Multi-layer cache updates
9. Response → Enriched company intelligence
```

### **Smart Lambda Internal Architecture**

```typescript
// Internal Coordination within Smart Collection Lambda
export class SmartDataCollectionHandler {
  
  // Phase 1: Intelligent Planning
  async planDataCollection(companyName: string, requester: ConsumerType): Promise<CollectionPlan> {
    // Use Phase 1 dataset-aware planning
    const datasets = CONSUMER_DATASET_REQUIREMENTS[requester];
    const plan = await this.orchestrator.createDatasetAwareCollectionPlan(
      companyName, 
      requester, 
      datasets
    );
    
    return plan;
  }
  
  // Phase 2: Parallel Source Coordination
  async executeCollectionPlan(plan: CollectionPlan): Promise<MultiSourceData> {
    // Create collection promises for each required source
    const collectionPromises = plan.toCollect.map(sourceTask => {
      return this.collectFromSource(sourceTask);
    });
    
    // Execute all sources in parallel with graceful error handling
    const results = await Promise.allSettled(collectionPromises);
    
    // Aggregate results with intelligent fallback strategies
    return this.aggregateWithFallbacks(results, plan);
  }
  
  // Phase 3: Intelligent Result Aggregation
  private async aggregateWithFallbacks(
    results: PromiseSettledResult<RawDataResult>[], 
    plan: CollectionPlan
  ): Promise<MultiSourceData> {
    
    const successfulResults: RawDataResult[] = [];
    const failedSources: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        const sourceName = plan.toCollect[index].source;
        failedSources.push(sourceName);
        this.logger.warn(`Source ${sourceName} failed: ${result.reason}`);
      }
    });
    
    // Apply intelligent fallback strategies
    const enhancedResults = await this.applyFallbackStrategies(
      successfulResults, 
      failedSources, 
      plan
    );
    
    return {
      data: enhancedResults,
      metrics: this.calculateMetrics(results, plan),
      quality: this.assessDataQuality(enhancedResults)
    };
  }
}
```

### **Project Structure**

```
src/
├── stacks/
│   └── sales-intelligence-stack.ts         # Single CDK stack with Step Functions
├── handlers/
│   ├── CacheCheckHandler.ts                # Layer 1 cache verification
│   ├── SmartDataCollectionHandler.ts       # Core orchestration logic
│   ├── LLMAnalysisHandler.ts              # Enhanced AI processing
│   └── CacheResponseHandler.ts            # Multi-layer cache storage
├── services/
│   ├── DataSourceOrchestrator.ts          # Enhanced from Phase 1
│   └── clients/
│       ├── SerpAPIClient.ts               # Internal SerpAPI coordination
│       ├── SnovClient.ts                  # Internal Snov coordination
│       └── BrightDataClient.ts            # Internal BrightData coordination
└── types/
    └── hybrid-workflow-types.ts           # Workflow-specific types
```

### **Enhanced Debugging & Monitoring**

#### **Single Execution Trace**
```
Request ID: vendor-enrichment-abc123
├── Step Function Execution: arn:aws:states:us-west-2:123:execution:SalesIntelligence:abc123
├── 🔍 Cache Check (100ms)
│   └── Result: MISS - No cached profile for Tesla:vendor_enrichment
├── 🧠 Smart Data Collection (4.2s)
│   ├── Planning Phase (50ms)
│   │   ├── Required Datasets: [company_overview, key_contacts, recent_news, tech_stack]
│   │   ├── Cache Analysis: serp_organic cached, snov_contacts expired
│   │   └── Collection Plan: 3 API calls, estimated cost $0.45
│   ├── Parallel Collection (3.8s)
│   │   ├── SerpAPI Multi-Source (2.1s) ✅
│   │   │   ├── Organic Search: 10 results
│   │   │   ├── News Search: 5 articles
│   │   │   └── Jobs Search: 3 openings
│   │   ├── Snov Contact Lookup (1.8s) ✅
│   │   │   └── Found: 12 contacts (8 verified emails)
│   │   └── BrightData Tech Stack (timeout) ❌
│   │       └── Fallback: Using SerpAPI organic for tech mentions
│   └── Aggregation (300ms)
│       ├── Data Quality Score: 0.87
│       ├── Completeness: 95% (tech_stack partial)
│       └── Confidence: High
├── 🤖 LLM Analysis (2.1s)
│   ├── Context Analysis: Vendor positioning, competitive landscape
│   ├── Contact Prioritization: C-level and IT decision makers
│   └── Intelligence Summary: Generated
└── 💾 Cache & Response (200ms)
    ├── Layer 1: Stored enriched profile (30-day TTL)
    ├── Layer 2: Updated source caches
    └── Response: 1.2MB enriched company intelligence
```

### **Performance Characteristics**

```
Execution Timeline:
┌─────────────────────────────────────────────────────────────┐
│ Total Request Time: 6.7 seconds                            │
├─────────────────────────────────────────────────────────────┤
│ Step Function Overhead: 150ms (2.2%)                       │
│ Cache Check: 100ms (1.5%)                                  │
│ Smart Collection: 4200ms (62.7%)                           │
│   ├── Planning: 50ms                                       │
│   ├── Parallel APIs: 3800ms (longest source)              │
│   └── Aggregation: 300ms                                   │
│ LLM Analysis: 2100ms (31.3%)                               │
│ Cache Storage: 200ms (3.0%)                                │
└─────────────────────────────────────────────────────────────┘

Cost Breakdown:
┌─────────────────────────────────────────────────────────────┐
│ Total Cost: $0.47 per request                              │
├─────────────────────────────────────────────────────────────┤
│ Step Function: $0.0001 (0.02%)                             │
│ Lambda Execution: $0.02 (4.3%)                             │
│ API Calls: $0.25 (53.2%)                                   │
│   ├── SerpAPI: $0.15                                       │
│   └── Snov: $0.10                                          │
│ LLM Processing: $0.20 (42.6%)                              │
└─────────────────────────────────────────────────────────────┘
```

## 📈 Strategic Value & Business Impact

### **Cost Optimization Through Intelligence**

**Before**: $2.50 per request average
- SerpAPI: $0.60
- BrightData: $1.20  
- Snov: $0.40
- LLM Processing: $0.30

**After**: $0.40 per request average (84% reduction)
- Cache hit rate: 75%
- Smart source selection: Skip redundant calls
- Cross-consumer sharing: First pays, others benefit

### **Quality Assurance Through Systematic Approach**

**Before**: Ad-hoc quality, inconsistent results
**After**: Systematic quality thresholds per dataset
- Minimum reliability requirements
- Automatic fallback strategies
- Quality tracking and improvement

### **Business Agility Through Configuration**

**Before**: Engineering work to change source priorities
**After**: Business configuration changes
- A/B testing different source combinations
- Instant response to vendor pricing changes
- Data-driven vendor performance evaluation

## 🔧 Hybrid Implementation Strategy

### **Phase 1: Intelligence Foundation ✅ COMPLETED**
**Goal**: Build the "brain" - dataset requirements matrix and cache-aware planning
**Status**: Dataset-aware planning implemented and migrated
**Achievement**: Enhanced DataSourceOrchestrator with intelligent orchestration

### **Phase 2: Hybrid Step Function Orchestration**  
**Goal**: Build the "nervous system" - Single Step Function with Smart Lambda coordination
**Why Hybrid**: Combines Step Function visibility with Lambda efficiency
**Success Metric**: Single execution trace with 75% cost reduction

### **Phase 3: Smart Lambda Enhancement**
**Goal**: Enhance existing DataSourceOrchestrator as Step Function task
**Why Enhancement**: Leverage Phase 1 investment, add internal coordination
**Success Metric**: Parallel collection with graceful fallbacks

### **Phase 4: Integration & Performance Optimization**
**Goal**: Connect to existing APIs and validate hybrid benefits
**Why Last**: Prove hybrid approach delivers promised improvements
**Success Metric**: Sub-8s response times with >50% cost reduction

## 📋 Detailed Implementation Roadmap

### **Phase 2: Hybrid Step Function Orchestration (Week 3-4)**

#### **Week 3: CDK Infrastructure Setup**
```typescript
// 2.1 Add Step Functions to existing CDK stack
// src/stacks/sales-intelligence-stack.ts

import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

// 2.2 Create handler Lambda functions
const cacheCheckHandler = new NodejsFunction(this, 'CacheCheckFunction', {
  functionName: 'sales-intelligence-cache-check',
  handler: 'cacheCheckHandler',
  timeout: Duration.seconds(30)
});

const smartCollectionHandler = new NodejsFunction(this, 'SmartCollectionFunction', {
  functionName: 'sales-intelligence-smart-collection',
  handler: 'smartDataCollectionHandler',
  timeout: Duration.minutes(10)  // Longer timeout for data collection
});

const llmAnalysisHandler = new NodejsFunction(this, 'LLMAnalysisFunction', {
  functionName: 'sales-intelligence-llm-analysis',
  handler: 'llmAnalysisHandler',
  timeout: Duration.minutes(5)
});

const cacheResponseHandler = new NodejsFunction(this, 'CacheResponseFunction', {
  functionName: 'sales-intelligence-cache-response',
  handler: 'cacheResponseHandler',
  timeout: Duration.seconds(30)
});
```

#### **Week 4: Step Functions Workflow**
```typescript
// 2.3 Create workflow definition
const cacheCheckTask = new stepfunctionsTasks.LambdaInvoke(this, 'CacheCheck', {
  lambdaFunction: cacheCheckHandler,
  resultPath: '$.cacheResult'
});

const smartCollectionTask = new stepfunctionsTasks.LambdaInvoke(this, 'SmartCollection', {
  lambdaFunction: smartCollectionHandler,
  resultPath: '$.collectionResult'
});

const llmAnalysisTask = new stepfunctionsTasks.LambdaInvoke(this, 'LLMAnalysis', {
  lambdaFunction: llmAnalysisHandler,
  resultPath: '$.analysisResult'
});

const cacheResponseTask = new stepfunctionsTasks.LambdaInvoke(this, 'CacheResponse', {
  lambdaFunction: cacheResponseHandler,
  resultPath: '$.cacheResponse'
});

// 2.4 Define workflow
const definition = cacheCheckTask
  .next(new stepfunctions.Choice(this, 'CacheHitChoice')
    .when(stepfunctions.Condition.booleanEquals('$.cacheResult.Payload.hit', true),
      new stepfunctions.Succeed(this, 'ReturnCached'))
      .otherwise(
      smartCollectionTask
        .next(llmAnalysisTask)
        .next(cacheResponseTask)
        .next(new stepfunctions.Succeed(this, 'Complete'))
    )
  );

// 2.5 Create state machine
const stateMachine = new stepfunctions.StateMachine(this, 'SalesIntelligenceWorkflow', {
  stateMachineName: 'SalesIntelligenceWorkflow',
  definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
  timeout: Duration.minutes(15)
});
```

### **Phase 3: Smart Lambda Enhancement (Week 5-6)**

#### **Week 5: Handler Implementation**
```typescript
// 3.1 Cache Check Handler
// src/index.ts
export const cacheCheckHandler = async (event: any) => {
  const { companyName, requester } = event;
  
  // Layer 1: Complete enriched profile cache
  const profileKey = `enriched_profile:${companyName}:${requester}`;
  const cachedProfile = await cacheService.get(profileKey);
  
  if (cachedProfile) {
    return {
      hit: true,
      source: 'orchestrator_cache',
      data: cachedProfile,
      cost: 0
    };
  }
  
  return { hit: false };
};

// 3.2 Smart Data Collection Handler (Core Orchestration)
export const smartDataCollectionHandler = async (event: any) => {
  const { companyName, requester, requestId } = event;
  
  // Use enhanced DataSourceOrchestrator from Phase 1
  const orchestrator = new DataSourceOrchestrator(
    cacheService, 
    serpApiService, 
    logger
  );
  
  // Intelligent planning and execution
  const result = await orchestrator.getMultiSourceData(
    companyName, 
    requester
  );
  
  return {
    companyName,
    requester,
    data: result.data,
    metrics: result.metrics,
    requestId
  };
};
```

#### **Week 6: Internal Client Enhancement**
```typescript
// 3.3 Enhance existing services for internal coordination
// src/services/SerpAPIService.ts - Enhanced for internal parallel collection
export class SerpAPIService {
  async collectMultipleDatasets(companyName: string, datasets: DatasetType[]): Promise<any> {
    // Create collection tasks for each dataset
    const collectionTasks = datasets.map(dataset => 
      this.collectSingleDataset(companyName, dataset)
    );
    
    // Execute in parallel with error handling
    const results = await Promise.allSettled(collectionTasks);
    
    // Aggregate results with fallback handling
    return this.aggregateResults(results, datasets);
  }
  
  private async collectSingleDataset(companyName: string, dataset: DatasetType): Promise<any> {
    // Cache check at source level (Layer 2)
    const cacheKey = `serp_${dataset}_raw:${companyName}`;
    const cached = await this.cache.getRawJSON(cacheKey);
    
    if (cached && !this.isExpired(cached)) {
      return { source: 'cache', data: cached.rawResponse, cost: 0 };
    }
    
    // API call based on dataset type
    const apiResult = await this.makeDatasetAPICall(companyName, dataset);
    
    // Cache the result
    await this.cache.setRawJSON(cacheKey, {
      rawResponse: apiResult,
      collectedAt: new Date().toISOString(),
      apiCost: this.getDatasetCost(dataset)
    });
    
    return { source: 'api', data: apiResult, cost: this.getDatasetCost(dataset) };
  }
}
```

### **Phase 4: Integration & Performance Optimization (Week 7-8)**

#### **Week 7: API Integration**
```typescript
// 4.1 Update vendor enrichment endpoint to use Step Functions
// src/services/handlers/VendorEnrichmentHandler.ts
export class VendorEnrichmentHandler extends BaseEndpointHandler {
  
  async handleEnrichment(companyName: string, tier?: string): Promise<any> {
    const requestId = uuidv4();
    
    if (tier === 'enhanced' || !tier) {
      // Use hybrid Step Functions workflow
      return await this.executeStepFunctionWorkflow(companyName, requestId);
    } else {
      // Keep legacy logic for backward compatibility
      return await this.legacyEnrichment(companyName);
    }
  }
  
  private async executeStepFunctionWorkflow(companyName: string, requestId: string): Promise<any> {
    const stepFunctions = new AWS.StepFunctions();
    
    const execution = await stepFunctions.startExecution({
      stateMachineArn: process.env.SALES_INTELLIGENCE_WORKFLOW_ARN!,
      name: `enrichment-${requestId}`,
      input: JSON.stringify({
        companyName,
        requester: 'vendor_enrichment',
        requestId,
        timestamp: new Date().toISOString()
      })
    }).promise();
    
    // For synchronous API, wait for completion
    const result = await this.pollForCompletion(execution.executionArn!);
    return result;
  }
}
```

#### **Week 8: Performance Testing & Optimization**
```typescript
// 4.2 Performance monitoring and optimization
// Add CloudWatch metrics to each handler
export const addPerformanceMetrics = (
  handlerName: string, 
  duration: number, 
  cost: number,
  cacheHit: boolean
) => {
  const cloudwatch = new AWS.CloudWatch();
  
  const metrics = [
    {
      MetricName: 'HandlerDuration',
      Value: duration,
      Unit: 'Milliseconds',
      Dimensions: [
        { Name: 'Handler', Value: handlerName },
        { Name: 'CacheHit', Value: cacheHit.toString() }
      ]
    },
    {
      MetricName: 'RequestCost',
      Value: cost,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Handler', Value: handlerName }
      ]
    }
  ];
  
  return cloudwatch.putMetricData({
    Namespace: 'SalesIntelligence/HybridWorkflow',
    MetricData: metrics
  }).promise();
};
```

## 🎯 Phase Success Criteria

### **Phase 2 Success Metrics**
- ✅ Step Function workflow deployed and executable
- ✅ All handler functions created and connected
- ✅ Single execution trace visible in AWS Console
- ✅ Workflow completes end-to-end with test data

### **Phase 3 Success Metrics**  
- ✅ Smart collection handler uses existing DataSourceOrchestrator
- ✅ Internal parallel collection working with graceful fallbacks
- ✅ All three cache layers functioning (orchestrator, source, processor)
- ✅ Response times under 8 seconds for typical requests

### **Phase 4 Success Metrics**
- ✅ Existing /vendor/enrich endpoint integrated with Step Functions
- ✅ >50% cost reduction demonstrated with real company data
- ✅ Performance metrics showing hybrid benefits
- ✅ Backward compatibility maintained for legacy requests

## 🎯 Success Criteria & Validation

### **Business Metrics**
- **Cost Reduction**: >50% reduction in API costs per request
- **Response Time**: Maintain <5s average response time
- **Cache Efficiency**: >70% cache hit rate within 30 days
- **Quality Consistency**: >80% data quality scores across all consumers

### **Technical Metrics**  
- **Maintainability**: Adding new sources requires <1 day development
- **Reliability**: 99.9% orchestration success rate
- **Debuggability**: <10 minutes to diagnose workflow issues
- **Scalability**: Linear cost scaling with volume

### **Strategic Metrics**
- **Business Agility**: Source priority changes without engineering
- **Vendor Flexibility**: Evaluate and switch vendors based on data
- **Innovation Speed**: New consumer types launch in <1 week

---

## 🔑 Key Architectural Decisions

**These weren't just technical choices, but strategic business decisions:**

1. **Dataset-Driven Planning**: Business agility over technical simplicity
2. **Three-Layer Caching**: Long-term efficiency over short-term speed  
3. **Source-Based Naming**: Evolution capability over current convenience
4. **Step Functions Orchestration**: Visibility and control over raw performance

**The Ultimate Goal**: Build a system that **gets smarter over time**, **adapts to business needs**, and **optimizes for value** - not just a faster way to call APIs.

---

*This architecture transforms sales intelligence from a cost center into a strategic advantage through intelligent orchestration, systematic quality assurance, and compound learning effects.*

## 💻 Strategic Insights → Concrete Implementation

### Dataset Requirements Implementation

```typescript
// src/types/dataset-requirements.ts
export const DATASET_REQUIREMENTS_MAP: Record<string, DatasetRequirement> = {
  company_name: {
    sources: [
      { source: 'google_knowledge_graph', priority: 1, cost: 0.02, reliability: 0.95 },
      { source: 'serp_organic', priority: 2, cost: 0.05, reliability: 0.85 },
      { source: 'brightdata_company_db', priority: 3, cost: 0.15, reliability: 0.90 }
    ],
    required: true,
    quality_threshold: 0.8
  },
  key_contacts: {
    sources: [
      { source: 'snov_contacts', priority: 1, cost: 0.10, reliability: 0.90 },
      { source: 'brightdata_people_db', priority: 2, cost: 0.25, reliability: 0.88 },
      { source: 'serp_linkedin', priority: 3, cost: 0.08, reliability: 0.75 }
    ],
    required: false,
    quality_threshold: 0.8
  }
};
```

### How Planning Intelligence Uses This

```typescript
// Enhanced DataSourceOrchestrator.createCollectionPlan()
async createDatasetAwareCollectionPlan(companyName: string, requester: ConsumerType) {
  const requiredDatasets = CONSUMER_DATASET_REQUIREMENTS[requester];
  const plan = { toCollect: [], fromCache: [], estimatedCost: 0 };

  for (const dataset of requiredDatasets) {
    const requirement = DATASET_REQUIREMENTS_MAP[dataset];
    
    // Check cache for each source option
    for (const sourceOption of requirement.sources) {
      const cacheKey = `${sourceOption.source}_raw:${companyName}`;
      const cached = await this.cache.getRawJSON(cacheKey);
      
      if (cached && !isExpired(cached)) {
        plan.fromCache.push({ dataset, source: sourceOption.source });
        break; // Found cached data, no need to check other sources
      }
    }
    
    // If no cache hit, plan collection from best available source
    if (!plan.fromCache.find(c => c.dataset === dataset)) {
      const bestSource = requirement.sources[0]; // Highest priority
      plan.toCollect.push({ dataset, source: bestSource.source, cost: bestSource.cost });
      plan.estimatedCost += bestSource.cost;
    }
  }
  
  return plan;
}
```

### How Three-Layer Cache Strategy Works

#### Layer 1 Implementation - Orchestrator Cache

```typescript
// Cache complete enriched profiles
const cacheKey = `enriched_profile:${companyName}:${requester}`;
const cachedProfile = await this.cache.get(cacheKey, CacheType.COMPANY_ENRICHMENT_PROCESSED);

if (cachedProfile) {
  return cachedProfile; // Skip entire workflow
}
```

#### Layer 2 Implementation - Source Cache

```typescript
// Each source handler checks its own cache
export const sniovEnrichmentHandler = async (event: any) => {
  const cacheKey = `snov_contacts_raw:${event.companyName}`;
  const cached = await cacheService.getRawJSON(cacheKey);
  
  if (cached && !isExpired(cached)) {
    return { source: 'cache', data: cached.rawResponse, cost: 0 };
  }
  
  // Call Snov API and cache result
  const result = await sniovAPI.getContacts(event.companyName);
  await cacheService.setRawJSON(cacheKey, {
    rawResponse: result,
    apiCost: 0.10,
    collectedAt: new Date().toISOString()
  }, CacheType.SNOV_CONTACTS_RAW);
  
  return { source: 'api', data: result, cost: 0.10 };
};
```

#### Layer 3 Implementation - Processor Cache

```typescript
// Cache expensive LLM analysis
export const llmAnalysisHandler = async (event: any) => {
  const cacheKey = `llm_analysis:${event.companyName}:vendor_context`;
  const cached = await cacheService.get(cacheKey);
  
  if (cached) {
    return { source: 'cache', data: cached, cost: 0 };
  }
  
  // Expensive LLM processing
  const analysis = await aiAnalyzer.analyzeCompanyData(event.rawData);
  await cacheService.set(cacheKey, analysis, CacheType.LLM_ANALYSIS_PROCESSED);
  
  return { source: 'llm', data: analysis, cost: 0.25 };
};
```

### How Step Functions Orchestration Works

#### CDK Infrastructure Setup

```typescript
// src/stacks/sales-intelligence-stack.ts
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

// Source-based Lambda functions (not tier-based)
const sniovEnrichmentFunction = new NodejsFunction(this, 'SniovEnrichmentFunction', {
  functionName: 'sales-intelligence-snov-enrichment',
  handler: 'sniovEnrichmentHandler'
});

const serpApiMultiSourceFunction = new NodejsFunction(this, 'SerpApiMultiSourceFunction', {
  functionName: 'sales-intelligence-serpapi-multisource',
  handler: 'serpApiMultiSourceHandler'
});

// Orchestration functions
const cacheCheckerFunction = new NodejsFunction(this, 'CacheCheckerFunction', {
  functionName: 'sales-intelligence-cache-checker', 
  handler: 'cacheCheckerHandler'
});

const datasetPlannerFunction = new NodejsFunction(this, 'DatasetPlannerFunction', {
  functionName: 'sales-intelligence-dataset-planner',
  handler: 'datasetPlannerHandler'
});
```

Step Functions Workflow Definition:
// Intelligence Layer Tasks
const cacheCheckTask = new stepfunctionsTasks.LambdaInvoke(this, 'CheckCache', {
  lambdaFunction: cacheCheckerFunction,
  resultPath: '$.cacheStatus'
});

const planDatasetTask = new stepfunctionsTasks.LambdaInvoke(this, 'PlanDataset', {
  lambdaFunction: datasetPlannerFunction,
  resultPath: '$.collectionPlan'
});

// Conditional Source Collection
const sniovTask = new stepfunctionsTasks.LambdaInvoke(this, 'SniovCollection', {
  lambdaFunction: sniovEnrichmentFunction
});

const serpApiTask = new stepfunctionsTasks.LambdaInvoke(this, 'SerpApiCollection', {
  lambdaFunction: serpApiMultiSourceFunction
});

// Workflow Definition
const definition = cacheCheckTask
  .next(new stepfunctions.Choice(this, 'CheckCacheHit')
    .when(stepfunctions.Condition.booleanEquals('$.cacheStatus.hit', true),
      new stepfunctions.Succeed(this, 'ReturnCached'))
    .otherwise(
      planDatasetTask
        .next(new stepfunctions.Parallel(this, 'ParallelCollection')
          .branch(
            new stepfunctions.Choice(this, 'NeedSnov')
              .when(stepfunctions.Condition.isPresent('$.collectionPlan.snov'),
                sniovTask)
              .otherwise(new stepfunctions.Pass(this, 'SkipSnov'))
          )
          .branch(
            new stepfunctions.Choice(this, 'NeedSerpApi')
              .when(stepfunctions.Condition.isPresent('$.collectionPlan.serpapi'),
                serpApiTask)
              .otherwise(new stepfunctions.Pass(this, 'SkipSerpApi'))
          )
        )
    )
  );

// Create State Machine
const stateMachine = new stepfunctions.StateMachine(this, 'TieredEnrichmentWorkflow', {
  definition,
  timeout: cdk.Duration.minutes(10)
});

How Handler Functions Implement the Strategy
Cache Checker Handler:

// src/index.ts
export const cacheCheckerHandler = async (event: any) => {
  const { companyName, requester } = event;
  
  // Check Layer 1: Complete enriched profile
  const profileKey = `enriched_profile:${companyName}:${requester}`;
  const cachedProfile = await cacheService.get(profileKey);
  
  if (cachedProfile) {
    return {
      hit: true,
      source: 'orchestrator',
      data: cachedProfile,
      cost: 0
    };
  }
  
  return { hit: false };
};

Dataset Planner Handler:
export const datasetPlannerHandler = async (event: any) => {
  const { companyName, requester } = event;
  const orchestrator = new DataSourceOrchestrator();
  
  // Use our intelligent planning logic
  const plan = await orchestrator.createDatasetAwareCollectionPlan(companyName, requester);
  
  return {
    companyName,
    requester,
    toCollect: plan.toCollect,
    fromCache: plan.fromCache,
    estimatedCost: plan.estimatedCost,
    // Map to Step Functions conditional logic
    snov: plan.toCollect.find(item => item.source === 'snov_contacts'),
    serpapi: plan.toCollect.find(item => item.source.startsWith('serp_')),
    brightdata: plan.toCollect.find(item => item.source.startsWith('brightdata_'))
  };
};

How Smart Redundancy Detection Works
// In DataSourceOrchestrator
private isSourceRedundant(source: SourceType, cachedSources: SourceType[], requester: ConsumerType): boolean {
  const redundancyRules = {
    vendor_enrichment: {
      // If we have SerpAPI organic + news, skip BrightData company DB
      brightdata_company_db: ['serp_organic', 'serp_news'].every(s => 
        cachedSources.includes(s as SourceType)
      ),
      // If we have Snov contacts, skip Apollo
      apollo_contacts: cachedSources.includes('snov_contacts' as SourceType)
    },
    profile: {
      // For basic profile, SerpAPI organic is sufficient
      brightdata_company_db: cachedSources.includes('serp_organic' as SourceType)
    }
  };

  return redundancyRules[requester]?.[source] || false;
}

How Source-Based Naming Enables Evolution
Current Configuration:
const CURRENT_PRIORITIES = {
  contacts: ['snov_contacts', 'brightdata_people_db', 'apollo_contacts'],
  company_info: ['google_knowledge_graph', 'serp_organic', 'brightdata_company_db']
};

Business Changes Priority (no code changes needed):
const NEW_PRIORITIES = {
  contacts: ['apollo_contacts', 'snov_contacts', 'brightdata_people_db'], // Apollo now first
  company_info: ['brightdata_company_db', 'google_knowledge_graph', 'serp_organic'] // BrightData promoted
};

The Lambda functions (sniovEnrichmentFunction, apolloContactsFunction, etc.) remain unchanged - only configuration changes.

This shows exactly HOW the strategic insights become concrete, working architecture that delivers the business value we outlined.


🚀 Phased Implementation Strategy
Phase 1: Intelligence Foundation (Weeks 1-2)
Goal: Build the "brain" - dataset requirements matrix and cache-aware planning
Week 1: Type System & Configuration

// 1.1 Create dataset requirements types
// src/types/dataset-requirements.ts
export interface DatasetRequirement {
  sources: SourceOption[];
  required: boolean;
  quality_threshold: number;
}

export interface SourceOption {
  source: SourceType;
  priority: number;
  cost: number;
  reliability: number;
  freshness_needed: 'high' | 'medium' | 'low';
  extraction_complexity: 'simple' | 'moderate' | 'complex';
}

// 1.2 Create the dataset requirements matrix
export const DATASET_REQUIREMENTS_MAP = { /* configuration */ };
export const CONSUMER_DATASET_REQUIREMENTS = { /* consumer mapping */ };

Week 2: Enhanced DataSourceOrchestrator

// 1.3 Add dataset-aware planning to existing orchestrator
class DataSourceOrchestrator {
  // NEW: Dataset-driven planning method
  async createDatasetAwareCollectionPlan(companyName, requester, customDatasets?) {
    // Implementation from our design
  }
  
  // NEW: Smart redundancy detection
  private isSourceRedundant(source, cachedSources, requester) {
    // Implementation from our design
  }
  
  // ENHANCED: Existing methods use new planning logic
  async getMultiSourceData(companyName, requester, sources?) {
    // Use new dataset-aware planning instead of fixed source list
  }
}

Success Metrics for Phase 1:
[ ] 50% reduction in redundant API calls
[ ] Dataset requirements matrix drives all collection decisions
[ ] Existing vendor enrichment uses new planning logic
Phase 2: Orchestration Workflow (Weeks 3-4)
Goal: Build the "nervous system" - Step Functions workflow with CDK
Week 3: CDK Infrastructure Setup

// 2.1 Add Step Functions to CDK stack
// src/stacks/sales-intelligence-stack.ts

// Import Step Functions constructs
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctionsTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

// 2.2 Create orchestration Lambda functions
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

Week 4: Step Functions Workflow Definition

// 2.3 Create workflow definition
const definition = cacheCheckTask
  .next(new stepfunctions.Choice(this, 'CheckCacheHit')
    .when(stepfunctions.Condition.booleanEquals('$.cacheStatus.hit', true),
      new stepfunctions.Succeed(this, 'ReturnCached'))
    .otherwise(
      planDatasetTask
        .next(costValidationTask)
        .next(parallelSourceCollection)
        .next(aggregateAndCacheTask)
    )
  );

// 2.4 Create state machine
const stateMachine = new stepfunctions.StateMachine(this, 'TieredEnrichmentWorkflow', {
  definition,
  timeout: cdk.Duration.minutes(10)
});

Success Metrics for Phase 2:
[ ] Complete workflow visibility in Step Functions console
[ ] Orchestration functions deployed and working
[ ] Can trace exact cost and time per workflow execution
Phase 3: Source Integration (Weeks 5-6)
Goal: Build the "muscles" - individual source handlers using source-based naming
Week 5: Source-Based Lambda Functions

// 3.1 Create source-specific handlers in CDK
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

Week 6: Handler Implementation

// 3.2 Implement handlers in src/index.ts
export const sniovEnrichmentHandler = async (event: any) => {
  // Layer 2 cache check + API call + cache storage
};

export const serpApiMultiSourceHandler = async (event: any) => {
  // Enhanced SerpAPI with multiple engines
};

export const brightDataMultiDatasetHandler = async (event: any) => {
  // BrightData multiple datasets (not just scraping)
};

// 3.3 Implement orchestration handlers
export const cacheCheckerHandler = async (event: any) => {
  // Layer 1 cache checking logic
};

export const datasetPlannerHandler = async (event: any) => {
  // Use DataSourceOrchestrator planning logic
};

Success Metrics for Phase 3:
[ ] All source handlers follow cache-first pattern
[ ] Source-based naming allows priority reconfiguration
[ ] BrightData treated as multi-dataset platform
Phase 4: Integration & Testing (Weeks 7-8)
Goal: Build the "feedback loop" - connect to existing APIs and optimize

Week 7: API Integration
// 4.1 Update existing vendor enrichment endpoint
export const vendorEnrichHandler = async (event: any) => {
  const useStepFunctions = event.tier || 'enhanced'; // Allow opt-in
  
  if (useStepFunctions === 'enhanced') {
    // 4.2 Trigger Step Functions workflow
    const stepFunctions = new AWS.StepFunctions();
    const execution = await stepFunctions.startExecution({
      stateMachineArn: TIERED_ENRICHMENT_STATE_MACHINE_ARN,
      input: JSON.stringify(event)
    }).promise();
    
    return { requestId: execution.executionArn };
  } else {
    // 4.3 Keep existing logic for backward compatibility
    return await existingVendorEnrichment(event);
  }
};

Week 8: Monitoring & Optimization
// 4.4 Add CloudWatch metrics
const costMetric = new cloudwatch.Metric({
  namespace: 'SalesIntelligence/TieredEnrichment',
  metricName: 'WorkflowCost',
  dimensionsMap: {
    'Consumer': requester,
    'CacheHit': cacheHit ? 'true' : 'false'
  }
});

// 4.5 Performance testing and optimization
// - Load testing with various company data
// - Cache hit rate analysis  
// - Cost per request tracking
// - Response time optimization

Success Metrics for Phase 4:
[ ] Existing /vendor/enrich endpoint works with new system
[ ] Cost reduction >50% demonstrated with real data
[ ] Cache hit rate >70% within testing period
[ ] Response times maintained or improved

🔄 Migration Strategy
Backward Compatibility Approach

// Allow gradual migration with feature flags
const ENRICHMENT_STRATEGY = {
  legacy: 'use existing VendorEnrichmentHandler',
  enhanced: 'use Step Functions workflow',
  hybrid: 'use Step Functions for new requests, legacy for existing'
};

// API consumers can opt-in gradually
POST /vendor/enrich
{
  "companyName": "Tesla",
  "strategy": "enhanced"  // Optional parameter
}

Risk Mitigation
Phase 1: No changes to existing APIs, only internal logic
Phase 2: Step Functions deployed but not used by production APIs
Phase 3: Source handlers can be tested independently
Phase 4: Gradual rollout with feature flags and monitoring

Rollback Strategy
Each phase can be independently rolled back
Feature flags allow instant fallback to legacy behavior
Existing vendor enrichment logic preserved throughout

📊 Success Validation per Phase
Phase 1 Validation
Run existing vendor enrichment with new planning logic
Measure redundant API call reduction
Verify dataset requirements matrix drives decisions
Phase 2 Validation
Deploy Step Functions without production traffic
Test workflow execution with sample data
Verify complete execution visibility
Phase 3 Validation
Test each source handler independently
Verify cache-first behavior
Test source priority reconfiguration
Phase 4 Validation
A/B testing: legacy vs. enhanced workflows
Performance benchmarking under load
Cost tracking and optimization validation
This phased approach minimizes risk while building toward the complete intelligent orchestration system we've designed.
