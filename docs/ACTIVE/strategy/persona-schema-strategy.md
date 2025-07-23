# Persona-Specific JSON Schema Strategy

## Overview
This document outlines the strategic approach for persona-aware JSON schemas that drive the AI sales assistant's LLM chaining and data population strategy. Each schema is optimized for specific sales roles and their unique information needs.

## Key Schema Differentiations

### AE Schema - Revenue Focus
- **Unique Fields**: `buyingSignals`, `opportunityIntel`, `estimatedARR`, `competitiveBattlecards`
- **Decision Maker Classification**: Economic buyer vs technical buyer vs champion
- **Business Metrics**: Revenue, growth rate, estimated budget, timeline
- **Output**: Selling strategy, proof points, objection handlers

### CSM Schema - Health Focus
- **Unique Fields**: `healthMetrics`, `renewalRisk`, `expansionOpportunities`, `usageInsights`
- **Stakeholder Classification**: Champion vs satisfied user vs detractor
- **Success Metrics**: Adoption rate, satisfaction scores, support health
- **Output**: Health summary, success planning, risk mitigation

### SE Schema - Technical Focus
- **Unique Fields**: `techStack` (detailed), `integrationComplexity`, `proofOfConcept`, `implementationPlanning`
- **Technical Classification**: Architect vs admin vs implementer
- **Architecture Details**: Integration patterns, security frameworks, compliance
- **Output**: Technical validation, POC scope, implementation roadmap

## Strategic Implications

### Data Source Requirements by Persona

| Data Category | AE Needs | CSM Needs | SE Needs |
|---------------|----------|-----------|----------|
| **External APIs** | High (funding, news, competitive intel) | Medium (org changes, industry trends) | Medium (tech stack, security frameworks) |
| **Internal Systems** | Medium (CRM opportunity data) | High (usage analytics, support tickets) | Low (technical architecture docs) |
| **Technical Discovery** | Low (basic stack only) | Low (adoption metrics) | High (detailed integrations, APIs) |

### Pricing Strategy Implications

**Free Tier** - Basic company info + news (works for all personas)

**Starter ($15)** - Persona-aware light version:
- AE: Basic competitive context + 3 decision makers
- CSM: Health summary + renewal risk indicators
- SE: Tech stack overview + integration complexity

**Pro ($39)** - Full persona schema:
- AE: Complete buying signals + competitive battlecards
- CSM: Full health metrics + expansion opportunities
- SE: Detailed technical mapping + POC recommendations

**Team ($99)** - Multi-persona views + CRM integration

### LLM Prompt Strategy

Each persona needs different prompt weighting:

```typescript
const promptWeights = {
  AE: {
    business_value: 0.4,
    competitive: 0.3, 
    technical: 0.1,
    relationship: 0.2
  },
  CSM: {
    business_value: 0.2,
    competitive: 0.1,
    technical: 0.1, 
    relationship: 0.6
  },
  SE: {
    business_value: 0.1,
    competitive: 0.1,
    technical: 0.7,
    relationship: 0.1
  }
}
```

## Questions for Discussion

1. **Schema Flexibility**: Should we allow users to toggle between personas mid-conversation, or lock them into one schema per session?

2. **Data Depth Control**: Within each persona, should we have "light" vs "deep" modes that populate different subsets of the schema?

3. **Cross-Persona Insights**: Should there be a "universal" base schema that all personas inherit from, plus their specialized fields?

4. **Freemium Strategy**: Which fields should be gated behind paid tiers for each persona?

## Implementation Notes

The beauty of this approach is that your existing Bedrock integration can use different prompt templates and chain different LLM calls based on the persona, while the UI can render different components based on which schema fields are populated.

## Schema Files

- `schemas/ae-deep-dive-schema.json` - Account Executive focused schema
- `schemas/csm-deep-dive-schema.json` - Customer Success Manager focused schema  
- `schemas/se-deep-dive-schema.json` - Solutions Engineer focused schema

## Next Steps

1. Refine persona schemas based on stakeholder feedback
2. Design data sourcing strategy for each persona's unique requirements
3. Implement persona-aware prompt templates for Bedrock LLM chaining
4. Create UI components that render schema-specific information cards
5. Establish pricing tier gates for premium schema fields

---
*Document created: $(date)*  
*Related to: M2 Milestone - Persona-Aware Conversational Intelligence* 