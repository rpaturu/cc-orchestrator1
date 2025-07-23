# ADR-002: Tiered Enrichment with Dataset Requirements Matrix

**Status**: ✅ Accepted  
**Date**: 2024-04-15  
**Deciders**: Architecture Team  
**Technical Story**: Multi-source data enrichment optimization

## Context

The sales intelligence platform needs to collect data from multiple sources (SerpAPI, BrightData, Snov.io, Apollo) while optimizing for cost, performance, and data quality. The previous approach had several limitations:

1. **Hard-coded source prioritization** - Tier 1/2/3 naming made it difficult to reorder priorities
2. **Source-centric planning** - Focused on which APIs to call rather than what data to collect
3. **Limited cache optimization** - Single-layer caching missed opportunities for cost savings
4. **Manual redundancy management** - No automatic detection of overlapping data collection

## Decision

We will implement a **Dataset Requirements Matrix** approach with **source-based naming** and **three-layer cache strategy**.

### Core Components

1. **Dataset Requirements Matrix**
   ```typescript
   export const DATASET_REQUIREMENTS_MAP: Record<string, DatasetRequirement> = {
     company_name: {
       sources: [
         { source: 'google_knowledge_graph', priority: 1, cost: 0.02, reliability: 0.95 },
         { source: 'serp_organic', priority: 2, cost: 0.05, reliability: 0.85 }
       ],
       required: true,
       quality_threshold: 0.8
     }
   };
   ```

2. **Source-Based Function Naming**
   ```typescript
   // ✅ Future-proof naming
   sniovEnrichmentFunction
   serpApiMultiSourceFunction
   brightDataMultiDatasetFunction
   
   // ❌ Avoid tier-based naming
   tier1Function, tier2Function
   ```

3. **Three-Layer Cache Strategy**
   - **Layer 1**: Orchestrator cache (enriched profiles)
   - **Layer 2**: Source cache (raw API responses)  
   - **Layer 3**: Processor cache (LLM analysis)

4. **Step Functions Orchestration**
   - Cache-aware planning
   - Parallel source collection
   - Intelligent redundancy detection

## Alternatives Considered

### Alternative 1: Continue with Tier-Based Approach
- **Pros**: Simple, already partially implemented
- **Cons**: Inflexible prioritization, requires code changes for reordering
- **Rejected**: Poor maintainability and flexibility

### Alternative 2: Simple Multi-Source Parallel Collection
- **Pros**: Faster implementation, less complexity
- **Cons**: No cost optimization, redundant API calls, poor cache utilization
- **Rejected**: Cost efficiency is critical for scalability

### Alternative 3: Event-Driven Collection with SNS/SQS
- **Pros**: Highly scalable, decoupled components
- **Cons**: Complex debugging, eventual consistency issues, overkill for current scale
- **Rejected**: Premature complexity for current requirements

## Consequences

### Positive
- **Cost Optimization**: Multi-layer caching reduces API costs by 60-80%
- **Flexibility**: Configuration-driven priorities enable business rule changes without deployment
- **Quality Assurance**: Dataset-driven approach ensures minimum quality thresholds
- **Maintainability**: Source-based naming allows adding/removing sources without refactoring
- **Performance**: Cache-aware planning minimizes unnecessary work

### Negative
- **Initial Complexity**: More complex implementation than simple parallel collection
- **Learning Curve**: Team needs to understand dataset matrix and cache strategy
- **Step Functions Overhead**: Additional AWS service complexity and costs
- **Testing Complexity**: More sophisticated testing required for orchestration logic

### Neutral
- **Migration Required**: Existing vendor enrichment logic needs refactoring
- **Documentation Update**: Comprehensive documentation needed for new approach

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Create Dataset Requirements Matrix types
- [ ] Implement DataSourceOrchestrator enhancements
- [ ] Add source-based Lambda function definitions to CDK

### Phase 2: Step Functions (Week 3-4)
- [ ] Implement orchestration functions (cache checker, planner, validator)
- [ ] Create Step Functions workflow with dataset routing
- [ ] Add processing complexity routing logic

### Phase 3: Integration (Week 5-6)
- [ ] Implement individual source handlers
- [ ] Add extraction processors for different complexity levels
- [ ] Integrate with existing cache management system

### Phase 4: Migration & Testing (Week 7-8)
- [ ] Migrate existing vendor enrichment to new system
- [ ] Comprehensive testing and performance validation
- [ ] Documentation and team training

## Validation Criteria

This decision will be considered successful if:

1. **Cost Reduction**: API costs per request reduced by >50%
2. **Performance**: Response times maintained or improved despite additional complexity
3. **Cache Hit Rate**: Cache hit rate increased to >70%
4. **Maintainability**: Adding new data sources requires <1 day of development
5. **Quality**: Data quality scores maintain >80% threshold

## Monitoring & Review

- **Cost Metrics**: Track API costs per consumer type and source
- **Performance Metrics**: Monitor cache hit rates and response times
- **Quality Metrics**: Track data completeness and accuracy scores
- **Review Date**: 2024-05-15 (30 days post-implementation)

## References

- [Tiered Enrichment Architecture](../architecture/tiered-enrichment-architecture.md)
- [Multi-Consumer Cache Architecture](../architecture/multi-consumer-raw-data-architecture.md)
- [Cache Management Guide](../operations/cache-management-guide.md)
- [Evolution Log](../EVOLUTION-LOG.md)

---

**Notes**:
- This ADR replaces the previous tier-based approach documented in legacy strategy documents
- Implementation should prioritize backward compatibility during migration
- Success metrics will be reviewed in 30 days and may trigger architecture refinements 