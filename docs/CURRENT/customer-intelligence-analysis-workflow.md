# Customer Intelligence Analysis - Complete Workflow Documentation

## Overview

### What is Customer Intelligence Analysis?
Understanding **WHO the sales rep is targeting** - their prospect's business challenges, tech stack, decision makers, buying signals, and competitive context. This combines with vendor context for fully context-aware sales insights.

**Purpose:** Analyze the prospect company (e.g., Acme Corp) to understand their business needs, decision makers, technology fit, and buying signals for personalized sales conversations.

**Workflow Type:** Async Step Function with 8-layer caching strategy and persona-aware processing

---

## 🔄 Complete Workflow Stages

### Stage 1: Lambda Entry Point (CustomerIntelligenceLambda.ts)

#### Request Flow
```typescript
POST /customer/intelligence
{
  "prospectCompany": "Acme Corp",
  "vendorCompany": "Okta",
  "userPersona": {
    "name": "Taylor",
    "role": "AE",
    "segment": "Mid-Market",
    "region": "EMEA"
  },
  "refresh": false  // Optional: bypass cache
}
```

#### 🎯 Cache Layer 1: Pre-Execution Check
```typescript
// Cache Key: enriched_customer_profile:acme_corp:okta:customer_intelligence
const cacheKey = `enriched_customer_profile:${prospectCompany.toLowerCase()}:${vendorCompany.toLowerCase()}:customer_intelligence`;
const cachedResult = await cacheService.getRawJSON(cacheKey);

if (cachedResult && !refresh) {
  // ✅ CACHE HIT: Return immediately (statusCode: 200)
  return {
    data: cachedResult,
    source: 'cache',
    totalCost: 0,
    cacheSavings: 2.50  // Saved step function cost
  };
}
```

**🔥 If Cache Miss:** Start async step function workflow

---

### Stage 2: Step Function Workflow

The step function executes 4 sequential handlers:

#### Step 2.1: CacheCheckHandler.ts

**Purpose:** Check if any cached data exists at the raw data level

##### 🎯 Cache Layer 2: Raw Data Check
```typescript
// Cache Key: enriched_profile:acme_corp:customer_intelligence
const profileKey = `enriched_profile:${companyName}:${requester}`;
const cachedProfile = await cacheService.get(profileKey);

if (cachedProfile) {
  // ✅ CACHE HIT: Skip all remaining steps
  return { hit: true, source: 'orchestrator_cache', data: cachedProfile };
}

// ❌ CACHE MISS: Proceed to data collection
return { hit: false, companyName, requester: 'customer_intelligence' };
```

---

#### Step 2.2: SmartCollectionHandler.ts

**Purpose:** Intelligent multi-source data collection with dataset-aware caching and vendor context integration

##### 🎯 Cache Layer 3: Customer Intelligence Data Cache
```typescript
// Check customer intelligence cache before expensive API calls
const customerCacheKey = `customer_intelligence_data:${companyName.toLowerCase()}:${vendorCompany.toLowerCase()}`;
const cachedCustomerData = await cacheService.getRawJSON(customerCacheKey);

if (cachedCustomerData && !event.refresh) {
  // ✅ CACHE HIT: Reuse collected data
  result = cachedCustomerData;
  result.fromCache = true;
  result.cacheHits = requiredDatasets.length;
  result.totalNewCost = 0;
  result.totalCacheSavings = 2.50;
}
```

##### 🔗 Vendor Context Integration
```typescript
// Check for existing vendor context to enhance customer analysis
const vendorContextRef = await cacheService.getRawJSON(`vendor_context_ref:${vendorCompany}`);

if (vendorContextRef) {
  // Use vendor products, positioning, competitors in customer analysis
  result.vendorContext = vendorContextRef.analysis;
}
```

##### 📊 Required Datasets (from dataset-requirements.ts)
```typescript
// Required datasets for customer_intelligence:
CONSUMER_DATASET_REQUIREMENTS['customer_intelligence'] = [
  'company_name',           // Basic company info
  'company_domain',
  'industry',
  'employee_count',
  'company_overview',
  'decision_makers',        // 🎯 Core: Key contacts and decision makers
  'tech_stack',            // 🎯 Core: Current technology usage
  'business_challenges',   // 🎯 Core: Pain points and challenges
  'recent_activities',     // 🎯 Core: News, hiring, expansion signals  
  'buying_signals',        // 🎯 Core: Intent data and purchase indicators
  'growth_signals',        // 🎯 Core: Expansion and scaling indicators
  'competitive_usage',     // 🎯 Core: Current vendor relationships
  'budget_indicators'      // Financial health and spending signals
];
```

##### 🔌 Data Sources Used
| Source | Cost | Priority | Purpose | Data Collected |
|--------|------|----------|---------|----------------|
| **serp_news** | $0.02 | 1 | Recent signals, hiring, funding | Press releases, funding news |
| **serp_jobs** | $0.02 | 2 | Hiring signals, growth indicators | Job postings, skill requirements |
| **serp_organic** | $0.02 | 3 | Company info, tech stack | Homepage, case studies, product pages |
| **serp_linkedin** | $0.03 | 4 | Decision makers, org structure | Executive profiles, company updates |
| **snov_contacts** | $0.10 | 5 | Contact enrichment | Email addresses, titles, departments |
| **brightdata** | $0.08 | 6 | Structured company data | Employee data, technology usage |

##### 🎯 Cache Layer 4: Individual API Response Caching
```typescript
// Each API response is cached separately
await cacheService.setRawJSON(`serp_news_raw:${companyName}`, newsResponse, 'SERP_NEWS_RAW');
await cacheService.setRawJSON(`serp_jobs_raw:${companyName}`, jobsResponse, 'SERP_JOBS_RAW');
await cacheService.setRawJSON(`serp_organic_raw:${companyName}`, organicResponse, 'SERP_ORGANIC_RAW');
await cacheService.setRawJSON(`serp_linkedin_raw:${companyName}`, linkedinResponse, 'SERP_LINKEDIN_RAW');
await cacheService.setRawJSON(`snov_contacts_raw:${companyName}`, snovResponse, 'SNOV_CONTACTS_RAW');

// Cache the combined customer intelligence data
await cacheService.setRawJSON(customerCacheKey, result, 'CUSTOMER_INTELLIGENCE_RAW');
```

---

#### Step 2.3: LLMAnalysisHandler.ts

**Purpose:** Persona-aware AI analysis of collected data into structured customer intelligence

##### 🎯 Cache Layer 5: Persona-Aware LLM Analysis Cache
```typescript
// Persona + customer + vendor specific cache
const analysisKey = `customer_intelligence_analysis:${companyName}:${vendorCompany}:${userPersona?.role || 'unknown'}:${requester}`;
const cachedAnalysis = await cacheService.get(analysisKey);

if (cachedAnalysis) {
  // ✅ CACHE HIT: Skip expensive LLM call
  return { analysis: cachedAnalysis, source: 'cache', cost: 0 };
}
```

##### 🧠 Persona-Aware LLM Analysis Configuration

**Model:** Bedrock Claude 3 Haiku
**System Prompt (Persona-Aware):**
```typescript
function getSystemPromptByWorkflow(workflowType: string): string {
  return 'You are a context-aware sales intelligence analyst specializing in generating structured customer insights for B2B sales optimization.';
}
```

**Analysis Prompt Structure (Persona-Aware):**
```typescript
function buildPersonaAwarePrompt(
  companyName: string,
  vendorCompany: string,
  userPersona: UserPersona,
  data: MultiSourceData,
  datasetsCollected: DatasetType[]
): string {
  return `
You are analyzing ${companyName} for ${vendorCompany} sales rep (${userPersona.role} in ${userPersona.segment}).

VENDOR CONTEXT (from cache):
- Products: ${vendorContext?.products || 'Unknown'}
- Value Props: ${vendorContext?.valuePropositions || 'Unknown'}
- Competitors: ${vendorContext?.competitors || 'Unknown'}

PROSPECT DATA:
- Recent news: ${data.news?.news_results}
- Job postings: ${data.jobs?.jobs_results}
- Tech signals: ${data.organic?.organic_results}
- Key people: ${data.linkedin?.linkedin_results}
- Contact data: ${data.snov?.contacts}

PERSONA: ${userPersona.role} - Focus on ${getPersonaFocus(userPersona.role)}

Return ONLY valid JSON in this exact structure:

{
  "customer": {
    "name": "${companyName}",
    "industry": "Primary industry",
    "size": "Employee count category", 
    "headquarters": "Location",
    "description": "Business overview"
  },
  "news_signals": [
    {
      "date": "2024-01-15",
      "headline": "Signal headline",
      "source": "Source name",
      "insight": "Why this matters for sales",
      "signal_type": "expansion|funding|hiring|product|leadership|partnership"
    }
  ],
  "tech_stack": {
    "frontend": ["React", "Angular"],
    "backend": ["Node.js", "Python"],
    "infrastructure": ["AWS", "Kubernetes"],
    "analytics": ["Segment", "Amplitude"], 
    "collaboration": ["Slack", "Notion"],
    "security": ["Current security tools"],
    "observations": ["Key tech insights for ${vendorCompany} positioning"]
  },
  "target_contacts": [
    {
      "name": "Contact name or null",
      "title": "Job title",
      "role": "Decision Maker|Champion|Technical Buyer|Influencer",
      "persona_fit": "Why relevant for ${userPersona.role}",
      "signal": "Recent activity or hiring signal"
    }
  ],
  "recommended_products": [
    {
      "product": "${vendorCompany} product name",
      "reason": "Why it fits this customer",
      "outcome": "Expected business outcome",
      "dataset_source": "Which dataset supports this"
    }
  ],
  "competitor_context": {
    "known_usage": ["Current vendors in use"],
    "pain_points": ["Issues with current solutions"],
    "positioning_advantage": "How ${vendorCompany} wins vs competitors",
    "objection_handling": ["Anticipated objections and responses"]
  },
  "talking_points": [
    "Persona-specific conversation starters for ${userPersona.role}",
    "Questions that uncover ${vendorCompany} opportunities"
  ],
  "opportunity_signals": [
    {
      "signal": "Specific opportunity indicator",
      "source": "news|jobs|tech|contact",
      "urgency": "high|medium|low",
      "action": "Recommended next step for ${userPersona.role}"
    }
  ]
}

Focus on insights that help ${userPersona.role} in ${userPersona.segment} have contextual conversations about ${vendorCompany} solutions.
`;
}

function getPersonaFocus(role: string): string {
  switch (role) {
    case 'AE': return 'opportunity development, expansion, and competitive positioning';
    case 'CSM': return 'customer success, adoption, renewals, and risk signals';
    case 'SE': return 'technical fit, architecture, integration requirements';
    default: return 'general sales enablement';
  }
}
```

##### 🔥 LLM Processing Flow
```typescript
// Bedrock Claude 3 Haiku processing with persona awareness
const response = await aiAnalyzer.parseUserInput(prompt);
enhancedAnalysis = JSON.parse(response);

// Add metadata
enhancedAnalysis.last_updated = new Date().toISOString();
enhancedAnalysis.data_quality = {
  completeness: 0.8,
  freshness: 0.9,  // Customer data changes more frequently
  reliability: 0.85,
  overall: 0.85
};
enhancedAnalysis.persona = userPersona;
enhancedAnalysis.vendor_context_used = !!vendorContext;
```

##### 🎯 Cache Layer 6: LLM Analysis Result Cache
```typescript
// Cache the persona-aware structured analysis (TTL: 24 hours)
await cacheService.setRawJSON(analysisKey, enhancedAnalysis, 'CUSTOMER_INTELLIGENCE_ANALYSIS');
```

---

#### Step 2.4: CacheResponseHandler.ts

**Purpose:** Store final enriched customer profile with persona and vendor context

##### 🎯 Cache Layer 7: Final Enriched Customer Profile Cache
```typescript
// Store complete customer intelligence profile
const profileKey = `enriched_customer_profile:${companyName}:${vendorCompany}:customer_intelligence`;
const enrichedProfile = {
  companyName,
  vendorCompany,
  workflowType: 'customer_intelligence',
  rawData: collectionResult?.data || {},
  analysis: analysisResult.analysis,
  metrics: {
    totalCost: (collectionResult?.data?.totalNewCost || 0) + (analysisResult.cost || 0),
    cacheHits: collectionResult?.data?.cacheHits || 0,
    cacheSavings: collectionResult?.data?.totalCacheSavings || 0,
    datasetsCollected: collectionResult?.data?.datasetsCollected?.length || 0
  },
  generatedAt: new Date().toISOString(),
  // Store persona and vendor context metadata
  workflowMetadata: {
    type: 'customer_intelligence',
    userPersona: collectionResult?.data?.userPersona,
    vendorContextUsed: !!collectionResult?.data?.vendorContext,
    datasetsCollected: collectionResult?.data?.datasetsCollected || []
  }
};

await cacheService.setRawJSON(profileKey, enrichedProfile, 'CUSTOMER_INTELLIGENCE_ENRICHMENT');
```

##### 🎯 Cache Layer 8: Cross-Reference Cache
```typescript
// Create reference for future customer intelligence requests
const customerRefKey = `customer_intelligence_ref:${companyName}:${vendorCompany}`;
const customerRef = {
  companyName,
  vendorCompany,
  analysis: analysisResult.analysis,
  lastUpdated: new Date().toISOString(),
  cacheKey: profileKey,
  persona: userPersona
};

await cacheService.setRawJSON(customerRefKey, customerRef, 'CUSTOMER_INTELLIGENCE_REFERENCE');
```

---

## 📊 Example Output Structure (Persona-Aware)

```json
{
  "customer": {
    "name": "Acme Corp",
    "industry": "FinTech",
    "size": "~500 employees",
    "headquarters": "San Francisco, CA",
    "description": "API security and embedded finance platform"
  },
  "news_signals": [
    {
      "date": "2024-01-10",
      "headline": "Acme Corp raises $50M Series C for European expansion",
      "source": "TechCrunch",
      "insight": "Scaling GTM team internationally indicates identity scaling needs",
      "signal_type": "funding"
    },
    {
      "date": "2024-01-08", 
      "headline": "Acme hires new CISO from Palo Alto Networks",
      "source": "The Verge",
      "insight": "Security leadership change suggests identity modernization initiative",
      "signal_type": "leadership"
    }
  ],
  "tech_stack": {
    "frontend": ["React", "Next.js"],
    "backend": ["Node.js", "Python", "PostgreSQL"],
    "infrastructure": ["AWS", "Kubernetes", "Terraform"],
    "analytics": ["Segment", "Amplitude"],
    "collaboration": ["Slack", "Notion"],
    "security": ["Azure AD (partial)", "Current SSO challenges"],
    "observations": [
      "Multi-cloud identity needed for AWS + SaaS apps",
      "Current Azure AD causing MFA friction",
      "Perfect fit for Okta's federation capabilities"
    ]
  },
  "target_contacts": [
    {
      "name": "Alicia Tran",
      "title": "VP, Infrastructure", 
      "role": "Decision Maker",
      "persona_fit": "Primary IDP decision maker for AE engagement",
      "signal": "Previously led IAM transformation at Okta customer"
    },
    {
      "name": "Mark Yu",
      "title": "Director, Security Ops",
      "role": "Champion", 
      "persona_fit": "Can advocate for identity modernization",
      "signal": "Posted about Zero Trust on LinkedIn"
    },
    {
      "name": null,
      "title": "IAM Architect",
      "role": "Technical Buyer",
      "persona_fit": "Technical evaluation lead",
      "signal": "Currently hiring for this role"
    }
  ],
  "recommended_products": [
    {
      "product": "Workforce Identity Cloud",
      "reason": "Unifies identity across Salesforce, Slack, AWS workloads",
      "outcome": "Reduces identity friction, improves security posture",
      "dataset_source": "tech_stack"
    },
    {
      "product": "Lifecycle Management (SCIM)",
      "reason": "Supports rapid provisioning for European expansion",
      "outcome": "Automated onboarding, reduced IT overhead",
      "dataset_source": "recent_activities"
    }
  ],
  "competitor_context": {
    "known_usage": ["Azure AD for internal SSO", "Struggling with MFA rollout"],
    "pain_points": [
      "Complex conditional access policies",
      "Poor federation with SaaS apps",
      "Manual onboarding processes"
    ],
    "positioning_advantage": "Okta overlays Azure AD, extends federation with better UX",
    "objection_handling": [
      "'We already have AD' → Okta enhances rather than replaces",
      "'Too expensive' → Show ROI from reduced IT overhead",
      "'Integration complexity' → 7000+ pre-built connectors"
    ]
  },
  "talking_points": [
    "How are you managing identity federation across Salesforce, Slack, and AWS today?",
    "With European expansion, how are you planning to scale secure onboarding?",
    "We've helped similar FinTechs reduce MFA friction by 60% - interested in how?",
    "Your new CISO likely has experience with identity modernization - shall we discuss?"
  ],
  "opportunity_signals": [
    {
      "signal": "Hiring IAM Architect role", 
      "source": "jobs",
      "urgency": "high",
      "action": "Connect with hiring manager before they make technology decisions"
    },
    {
      "signal": "$50M funding for international expansion",
      "source": "news", 
      "urgency": "medium",
      "action": "Position identity scalability for rapid growth"
    },
    {
      "signal": "New CISO from security-focused company",
      "source": "news",
      "urgency": "high", 
      "action": "Leverage security modernization initiative"
    }
  ],
  "data_quality": {
    "completeness": 0.90,
    "freshness": 0.95,
    "reliability": 0.85,
    "overall": 0.90
  },
  "persona": {
    "name": "Taylor",
    "role": "AE",
    "segment": "Mid-Market",
    "region": "EMEA"
  },
  "vendor_context_used": true,
  "last_updated": "2024-01-15T10:30:00Z"
}
```

---

## 💰 Cost & Caching Summary

| Cache Layer | Purpose | Cost Savings | TTL | Cache Type |
|-------------|---------|--------------|-----|------------|
| **L1: Pre-execution** | Skip entire workflow | $2.50 | 48 hours | `CUSTOMER_INTELLIGENCE_ENRICHMENT` |
| **L2: Raw profile** | Skip data collection + LLM | $2.25 | 24 hours | `CUSTOMER_INTELLIGENCE_ENRICHMENT` |
| **L3: Customer data** | Reuse collected datasets | $1.50 | 24 hours | `CUSTOMER_INTELLIGENCE_RAW` |
| **L4: API responses** | Individual source cache | $0.25 | 1-24 hours | `SERP_NEWS_RAW`, `SERP_JOBS_RAW`, etc. |
| **L5: LLM analysis** | Skip AI processing | $0.02 | 24 hours | `CUSTOMER_INTELLIGENCE_ANALYSIS` |
| **L6: Analysis result** | Persona-aware output cache | $0.02 | 24 hours | `CUSTOMER_INTELLIGENCE_ANALYSIS` |
| **L7: Final profile** | Complete customer intelligence | $2.50 | 48 hours | `CUSTOMER_INTELLIGENCE_ENRICHMENT` |
| **L8: Cross-reference** | Future customer lookups | Workflow reuse | 48 hours | `CUSTOMER_INTELLIGENCE_REFERENCE` |

### Total Potential Cost Savings
- **First request:** $2.50 (normal cost)
- **Cached requests:** $0.00 (100% savings)
- **Cache hit ratio:** ~70% in production (changes more frequently than vendor context)
- **Average cost per request:** ~$0.75

---

## 🔗 Integration with Vendor Context

Customer Intelligence leverages vendor context for context-aware analysis:

```typescript
// Check for vendor context to enhance customer analysis
const vendorContextRef = await cacheService.getRawJSON(`vendor_context_ref:${vendorCompany}`);

if (vendorContextRef) {
  // Use vendor's products, positioning, competitors in customer analysis
  const vendorProducts = vendorContextRef.analysis.products;
  const vendorCompetitors = vendorContextRef.analysis.competitors;
  const vendorValueProps = vendorContextRef.analysis.valuePropositions;
  
  // Enhance LLM prompt with vendor context
  prompt += `
  
VENDOR CONTEXT (${vendorCompany}):
- Products: ${vendorProducts.join(', ')}
- Key Competitors: ${vendorCompetitors.join(', ')}
- Value Propositions: ${vendorValueProps.join(', ')}

Focus recommendations on how ${vendorCompany} products address ${companyName}'s needs.
  `;
}
```

## 👥 Persona-Aware Processing

Different outputs based on user persona:

| Persona | Focus Areas | Talking Points | Recommendations |
|---------|-------------|----------------|-----------------|
| **AE (Account Executive)** | Opportunity development, expansion, competitive positioning | Revenue growth, competitive differentiation | Product fit, pricing, objection handling |
| **CSM (Customer Success)** | Adoption, renewals, risk signals | Usage patterns, success metrics | Expansion opportunities, risk mitigation |
| **SE (Sales Engineer)** | Technical fit, architecture, integration | Technical requirements, implementation | Architecture alignment, integration complexity |

---

## 🎯 Key Benefits

1. **Persona Awareness:** Tailored insights for AE, CSM, SE roles
2. **Context Integration:** Combines vendor understanding with customer analysis  
3. **Real-time Signals:** Fresh hiring, funding, and growth indicators
4. **Contact Intelligence:** Decision maker identification and engagement guidance
5. **Competitive Positioning:** Informed competitive strategy based on current vendor usage
6. **Cost Optimization:** 8-layer caching reduces costs by 70%+
7. **Interactive Workflow:** Real-time polling and progress updates

---

## 🚀 Advanced Features

### Multi-Source Signal Correlation
```typescript
// Correlate signals across data sources
if (newsSignals.funding && jobSignals.hiring && techSignals.integration) {
  // High-priority expansion opportunity
  priority = 'high';
  action = 'Schedule executive alignment meeting';
}
```

### Dynamic Dataset Selection
```typescript
// Adjust datasets based on persona and use case
if (userPersona.role === 'SE') {
  priorityDatasets.push('integration_needs', 'tech_stack');
} else if (userPersona.role === 'CSM') {
  priorityDatasets.push('business_challenges', 'growth_signals');
}
```

### Cross-Workflow Intelligence
```typescript
// Customer Intelligence informs future Vendor Context updates
if (competitorContext.known_usage.includes('Microsoft')) {
  // Update vendor competitive positioning for Microsoft challenges
  vendorContext.competitorFocus = 'Microsoft differentiation';
}
```

---

*Last Updated: 2024-01-15*
*Version: M2 Enhanced Multi-Layer Caching with Persona Awareness* 