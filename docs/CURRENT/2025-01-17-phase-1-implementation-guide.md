# Phase 1 Implementation Guide: User Profile-Driven Guided Intelligence
**Date:** January 17, 2025  
**Phase:** Foundation (Weeks 1-2)  
**Status:** Implementation Ready  
**Related:** [Implementation Sequence Planning](./2025-01-17-implementation-sequence-planning.md)

---

## 🎯 **Phase 1 Objective**

Build foundational SSE infrastructure and minimal interactive frontend to validate **user profile-driven guided intelligence** with real customer research workflows.

**Core Innovation**: Every interaction is contextually aware of user's role, company, and vendor context - making each guided question and response specifically relevant to the user's situation.

---

## 🔄 **Phase 1 Workflow**

### **Step 1: Customer Search & Selection**
**UX Pattern**: Similar to vendor identification in onboarding flow

**User Experience:**
```
User types: "Acme Corp"
→ Autocomplete suggestions appear with basic info
→ User selects "Acme Corp - FinTech, 500 employees, San Francisco"
→ System confirms selection and prepares context
```

**Technical Implementation:**
- Search input with company name autocomplete
- Company suggestions with industry, size, location
- User confirms selection to proceed

**Data Sources**: 
- Existing cached companies first (if available)
- Fallback to real-time company search APIs (Clearbit, etc.)

---

### **Step 2: Real-Time Basic Customer Details Collection**
**Trigger**: Once customer is selected  
**Purpose**: Establish customer context for guided questions

**Data Collection Strategy:**
```typescript
// Basic customer context datasets
const BASIC_CONTEXT_DATASETS = [
  'company_overview',     // Industry, size, description
  'recent_activities',    // Latest news, funding, hiring
  'basic_tech_signals'    // High-level tech stack if cached
];
```

**Display**: Clean summary card showing customer context
```
📊 Acme Corp | FinTech | 500 employees
🏢 San Francisco, CA
📈 Recent: $50M Series B funding (Dec 2024)
⚡ Tech: AWS, Salesforce, React (if available)
```

**Response Time Target**: < 3 seconds

#### **Cache Warming Strategy for Popular Companies**
```typescript
// Proactive cache warming for instant responses
export class CacheWarmingService {
  async warmPopularCompanies() {
    const top100Companies = await this.getPopularCompanies(); // Fortune 500 + unicorns
    
    for (const companyName of top100Companies) {
      // Pre-warm essential datasets for guided questions
      const essentialDatasets = ['company_overview', 'tech_stack', 'decision_makers'];
      await this.orchestrator.createDatasetAwareCollectionPlan(
        companyName, 'cache_warming', essentialDatasets
      );
    }
  }
  
  // Trigger: User starts typing company name → warm top suggestions
  async onCompanySearchStarted(searchTerm: string) {
    const suggestions = await this.getCompanySuggestions(searchTerm);
    suggestions.slice(0, 3).forEach(company => 
      this.warmCompanyEssentials(company.name) // Background warming
    );
  }
}
```

**Business Impact**: 85%+ cache hit rate = instant responses for popular companies

---

### **Step 3: Profile-Driven Research Areas (Based on Figma Design)**
**KEY DIFFERENTIATOR**: 11 structured research areas that adapt to User Profile + Customer Context

#### **Research Areas Framework (From Figma Analysis)**
```typescript
interface ResearchArea {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  datasets: DatasetType[];
  roleRelevance: {
    AE: number;      // 0-10 relevance score
    SE: number;
    CSM: number;
  };
}

const CORE_RESEARCH_AREAS: ResearchArea[] = [
  {
    id: "decision_makers",
    title: "Decision Makers",
    description: "Key contacts and stakeholders",
    icon: <Users className="w-4 h-4" />,
    datasets: ["decision_makers", "org_structure"],
    roleRelevance: { AE: 10, SE: 8, CSM: 9 }
  },
  {
    id: "tech_stack", 
    title: "Tech Stack",
    description: "Current technology usage and preferences",
    icon: <Zap className="w-4 h-4" />,
    datasets: ["tech_stack", "infrastructure"],
    roleRelevance: { AE: 7, SE: 10, CSM: 6 }
  },
  {
    id: "business_challenges",
    title: "Business Challenges", 
    description: "Pain points and operational challenges",
    icon: <Target className="w-4 h-4" />,
    datasets: ["business_challenges", "recent_activities"],
    roleRelevance: { AE: 10, SE: 8, CSM: 10 }
  },
  {
    id: "competitive_positioning",
    title: "Competitive Positioning",
    description: "Value propositions vs competitors", 
    icon: <Swords className="w-4 h-4" />,
    datasets: ["competitive_landscape", "vendor_relationships"],
    roleRelevance: { AE: 10, SE: 7, CSM: 8 }
  },
  {
    id: "recent_activities",
    title: "Recent Activities",
    description: "News, hiring, expansion signals",
    icon: <Activity className="w-4 h-4" />,
    datasets: ["recent_news", "hiring_signals", "expansion_activities"],
    roleRelevance: { AE: 9, SE: 6, CSM: 8 }
  },
  {
    id: "budget_indicators", 
    title: "Budget Indicators",
    description: "Financial health and spending signals",
    icon: <DollarSign className="w-4 h-4" />,
    datasets: ["financial_data", "funding_rounds", "spending_signals"],
    roleRelevance: { AE: 10, SE: 5, CSM: 7 }
  },
  {
    id: "buying_signals",
    title: "Buying Signals", 
    description: "Intent data and purchase indicators",
    icon: <TrendingUp className="w-4 h-4" />,
    datasets: ["buying_intent", "vendor_research", "rfp_signals"],
    roleRelevance: { AE: 10, SE: 7, CSM: 6 }
  },
  {
    id: "competitive_usage",
    title: "Current Vendors",
    description: "Current vendor relationships",
    icon: <Briefcase className="w-4 h-4" />,
    datasets: ["vendor_stack", "competitive_intel"],
    roleRelevance: { AE: 9, SE: 8, CSM: 7 }
  },
  {
    id: "digital_footprint",
    title: "Digital Footprint",
    description: "Online presence and marketing activity", 
    icon: <Globe className="w-4 h-4" />,
    datasets: ["web_presence", "marketing_activities", "social_signals"],
    roleRelevance: { AE: 6, SE: 5, CSM: 4 }
  },
  {
    id: "growth_signals",
    title: "Growth Signals",
    description: "Expansion and scaling indicators",
    icon: <BarChart3 className="w-4 h-4" />,
    datasets: ["growth_metrics", "expansion_plans", "hiring_growth"],
    roleRelevance: { AE: 9, SE: 6, CSM: 9 }
  },
  {
    id: "compliance_requirements",
    title: "Compliance & Security",
    description: "Regulatory and security needs",
    icon: <Shield className="w-4 h-4" />,
    datasets: ["compliance_data", "security_posture", "certifications"],
    roleRelevance: { AE: 8, SE: 9, CSM: 7 }
  }
];
```

#### **Context-Aware Research Area Prioritization**
```typescript
const prioritizeResearchAreas = (
  userProfile: UserProfile,
  customerContext: CustomerContext
): ResearchArea[] => {
  return CORE_RESEARCH_AREAS
    .map(area => ({
      ...area,
      priority: calculatePriority(area, userProfile, customerContext)
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6); // Show top 6 most relevant
};

const calculatePriority = (area: ResearchArea, user: UserProfile, customer: CustomerContext) => {
  let score = area.roleRelevance[user.role];
  
  // Industry-specific adjustments
  if (customer.industry === 'FinTech' && area.id === 'compliance_requirements') score += 2;
  if (customer.industry === 'Healthcare' && area.id === 'compliance_requirements') score += 3;
  if (customer.size === 'Enterprise' && area.id === 'tech_stack') score += 1;
  
  // Vendor-specific adjustments  
  if (user.company === 'Okta' && area.id === 'decision_makers') score += 1;
  if (user.company === 'Okta' && area.id === 'competitive_positioning') score += 1;
  
  return Math.min(score, 10);
};
```

#### **Example Context-Aware Research Areas**

**Scenario A: Sarah (AE at Okta) researching Acme Corp (FinTech)**
```
Top Research Areas (sorted by relevance):
🏆 Decision Makers (Priority: 10)
🏆 Business Challenges (Priority: 10) 
🏆 Buying Signals (Priority: 10)
🥈 Competitive Positioning (Priority: 9)
🥈 Current Vendors (Priority: 9)
🥉 Compliance & Security (Priority: 8) - FinTech boost
```

**Scenario B: Mike (CSM at Okta) researching existing customer Acme Corp**
```
Top Research Areas (sorted by relevance):
🏆 Business Challenges (Priority: 10)
🏆 Growth Signals (Priority: 9) 
🥈 Decision Makers (Priority: 9)
🥈 Competitive Positioning (Priority: 8)
🥉 Recent Activities (Priority: 8)
🥉 Current Vendors (Priority: 7)
```

**Scenario C: Alex (SE at Microsoft) researching Acme Corp**
```
Top Research Areas (sorted by relevance):
🏆 Tech Stack (Priority: 10)
🥈 Compliance & Security (Priority: 9) - FinTech boost
🥈 Decision Makers (Priority: 8)
🥈 Business Challenges (Priority: 8)
🥈 Current Vendors (Priority: 8)
🥉 Competitive Positioning (Priority: 7)
```

---

### **Step 4: Interactive Research with SSE Streaming**
**User clicks research area** → **Real-time SSE streaming** → **Tabbed findings + sources + follow-ups**

#### **SSE Response Flow (Aligned with Figma Design)**
```typescript
// User clicks: "Decision Makers" research area
→ SSE Events:
data: {"type": "collection_started", "message": "🔍 Finding key decision makers and stakeholders..."}
data: {"type": "progress_update", "step": "Analyzing org structure", "completed": true}
data: {"type": "progress_update", "step": "Identifying contact information", "completed": true}
data: {"type": "progress_update", "step": "Mapping reporting relationships", "completed": false}
data: {"type": "research_findings", "content": {...researchFindings}}
data: {"type": "sources_found", "sources": [...sourcesList]}
data: {"type": "follow_up_options", "options": [...followUpOptions]}
data: {"type": "vendor_insights", "insights": [...vendorSpecificInsights]}
data: {"type": "research_complete"}
```

#### **Research Findings Response Structure (From Figma)**
```typescript
interface ResearchFindingsResponse {
  id: string;
  title: string;
  researchArea: string;
  items: Array<{
    title: string;
    description: string;
    details?: string[];
    contact?: {
      name: string;
      role: string;
      email?: string;
      phone?: string;
      linkedin?: string;
    };
    valueProps?: Array<{
      competitor: string;
      ourAdvantage: string;
      talkingPoints: string[];
      objectionHandling?: string;
    }>;
    citations?: number[]; // Reference to source IDs
  }>;
  sources: Array<{
    id: number;
    title: string;
    url: string;
    domain: string;
    type: "article" | "press_release" | "report" | "social" | "company_page";
    relevance: "high" | "medium" | "low";
    publishedDate?: string;
  }>;
  vendorInsights: {
    opportunities: string[];
    challenges: string[];
    competitiveAdvantage: string;
    nextSteps: string[];
  };
  followUpOptions: Array<{
    id: string;
    text: string;
    icon: React.ReactNode;
    category: "research" | "action" | "explore";
  }>;
}

#### **Error Handling for Data Collection Failures**
```typescript
// Graceful degradation when data collection fails
export class RobustDataCollection {
  async handleGuidedQuestion(questionId: string, companyName: string) {
    try {
      // Primary: Fresh data collection
      const result = await this.collectFreshData(companyName, questionId);
      return this.streamSuccessResponse(result);
      
    } catch (primaryError) {
      this.logger.warn('Primary collection failed', { questionId, error: primaryError });
      
      try {
        // Fallback 1: Use cached data (even if stale)
        const cachedData = await this.getCachedData(companyName, questionId, { allowStale: true });
        if (cachedData) {
          return this.streamCachedResponse(cachedData, { isStale: true });
        }
        
        // Fallback 2: Partial response with available data
        const partialData = await this.getPartialData(companyName);
        return this.streamPartialResponse(partialData, questionId);
        
      } catch (fallbackError) {
        // Fallback 3: Helpful error with suggested alternatives
        return this.streamErrorResponse(questionId, {
          message: "I'm having trouble gathering that specific information right now.",
          alternatives: this.suggestAlternativeQuestions(questionId),
          retry: true
        });
      }
    }
  }
  
  private streamErrorResponse(questionId: string, errorInfo: any) {
    return {
      type: 'error_with_alternatives',
      message: errorInfo.message,
      alternatives: errorInfo.alternatives,
      canRetry: errorInfo.retry
    };
  }
}
```

**Error Handling Philosophy**: Never leave users stuck - always provide graceful fallbacks and helpful alternatives.

#### **Context-Aware Response Format**
```typescript
interface ContextAwareResponse {
  answer: string;                    // Core answer to the question
  vendorSpecificInsights: string[];  // Okta-specific opportunities/challenges
  roleSpecificActions: string[];     // Next steps for AE vs CSM vs SE
  competitiveIntel: string;          // vs. Azure AD, Ping Identity, etc.
  followUpQuestions: string[];       // Contextual next questions
  sourceAttribution: Source[];      // Perplexity-style transparency
}
```

---

## 🏗️ **Technical Architecture**

### **Backend Components**

#### **1. SSE Streaming Service**
```typescript
// New Lambda function: GuidedChatStreamingLambda
export class GuidedChatStreamingService {
  async handleGuidedQuestion(
    questionId: string,
    companyId: string,
    userContext: UserContext
  ): Promise<SSEStream> {
    // 1. Map question to datasets
    const datasets = this.mapQuestionToDatasets(questionId, userContext);
    
    // 2. Check cache for instant response
    const cachedData = await this.checkCache(companyId, datasets);
    
    // 3. Stream response or collection progress
    if (cachedData) {
      return this.streamCachedResponse(cachedData, userContext);
    } else {
      return this.streamLiveCollection(companyId, datasets, userContext);
    }
  }
}
```

#### **2. Profile-Aware Question Engine**
```typescript
export class ProfileAwareQuestionEngine {
  generateInitialQuestions(
    customerContext: CustomerContext,
    userProfile: UserProfile
  ): GuidedQuestion[] {
    // Template-based generation (80%)
    const baseQuestions = QUESTION_TEMPLATES[userProfile.role][customerContext.industry];
    
    // LLM personalization (20%)
    const personalizedQuestions = await this.llmPersonalize(
      baseQuestions,
      userProfile,
      customerContext
    );
    
    return personalizedQuestions;
  }
  
  generateFollowUpQuestions(
    previousAnswer: string,
    userProfile: UserProfile
  ): GuidedQuestion[] {
    // Dynamic follow-up generation based on discovered data
    return await this.llmGenerateFollowUps(previousAnswer, userProfile);
  }
}
```

#### **3. Real-Time Dataset Collection API**
```typescript
// Lightweight alternative to Step Functions for targeted collection
export class RealtimeDataCollector {
  async collectDatasets(
    companyId: string,
    datasets: DatasetType[],
    userContext: UserContext
  ): Promise<CollectionResult> {
    // Use existing DatasetRequirementsMap for source optimization
    const plan = await this.createCollectionPlan(datasets);
    
    // Parallel collection with progress streaming
    const results = await this.executeParallelCollection(plan, companyId);
    
    // Context-aware analysis
    return this.analyzeWithUserContext(results, userContext);
  }
}
```

### **Frontend Components (shadcn)**

#### **1. Customer Search Component**
```typescript
// Using shadcn Input + Command components
export const CustomerSearch = ({ onCustomerSelect, userContext }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  // Autocomplete with company suggestions
  const handleSearch = async (term: string) => {
    const companies = await searchCompanies(term);
    setSuggestions(companies);
  };
  
  return (
    <div className="space-y-4">
      <Command>
        <CommandInput 
          placeholder="Search for a company..."
          value={searchTerm}
          onValueChange={handleSearch}
        />
        <CommandList>
          {suggestions.map(company => (
            <CommandItem 
              key={company.id}
              onSelect={() => onCustomerSelect(company)}
            >
              <div>
                <p className="font-medium">{company.name}</p>
                <p className="text-sm text-muted-foreground">
                  {company.industry} • {company.size} • {company.location}
                </p>
              </div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  );
};
```

#### **2. Research Chat Interface (Based on Figma Design)**
```typescript
// Chat-based research interface with specialized cards
export const ResearchChatInterface = ({ customer, userContext }) => {
  const { 
    messages, 
    availableResearchAreas, 
    startResearch, 
    isStreaming,
    completedResearch,
    exportResearch
  } = useResearchChat(customer.id, userContext);
  
  return (
    <div className="max-w-4xl mx-auto px-4 pb-4 pt-32 md:pt-20 min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pt-8">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-3 max-w-3xl ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <Avatar className="w-8 h-8 flex-shrink-0">
                {message.type === "user" ? (
                  <AvatarFallback className="text-xs">
                    {getInitials(userContext.firstName, userContext.lastName)}
                  </AvatarFallback>
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    AI
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="space-y-2">
                {/* Vendor Profile Card - Welcome Message */}
                {message.vendorProfile && (
                  <VendorProfileCard 
                    vendorProfile={message.vendorProfile}
                    userContext={userContext}
                  />
                )}
                
                {/* Company Summary Card - Customer Discovery */}
                {message.companySummary && (
                  <CompanySummaryCard 
                    companySummary={message.companySummary}
                  />
                )}
                
                {/* Research Findings Card - Tabbed Interface */}
                {message.researchFindings && (
                  <ResearchFindingsCard
                    researchFindings={message.researchFindings}
                    sources={message.sources}
                    messageId={message.id}
                    activeTab={activeTabsState[message.id] || "findings"}
                    onTabChange={(value) => setActiveTabsState(prev => ({ ...prev, [message.id]: value }))}
                    onCitationClick={handleCitationClick}
                    highlightedSource={highlightedSource}
                    vendorInsights={message.vendorInsights}
                    followUpOptions={message.followUpOptions}
                    onFollowUpClick={handleFollowUpClick}
                  />
                )}
                
                {/* Regular Message Content */}
                {message.content && (
                  <Card className={message.type === "user" ? "bg-primary text-primary-foreground" : ""}>
                    <CardContent className="p-3">
                      <p>{message.content}</p>
                      
                      {/* Streaming Progress Steps */}
                      {message.isStreaming && message.streamingSteps && (
                        <div className="mt-3 space-y-2">
                          {message.streamingSteps.map((step, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              {step.completed ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />
                              )}
                              <span className={step.completed ? "text-foreground" : "text-muted-foreground"}>
                                {step.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Research Area Selection */}
                      {message.researchAreas && !message.isStreaming && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {message.researchAreas.map((area) => (
                            <Button
                              key={area.id}
                              variant="outline"
                              className="justify-start text-left h-auto p-3"
                              onClick={() => startResearch(area.id)}
                              disabled={isStreaming}
                            >
                              <div className="flex items-center gap-2">
                                {area.icon}
          <div>
                                  <div className="font-medium">{area.title}</div>
                                  <div className="text-xs text-muted-foreground">{area.description}</div>
            </div>
          </div>
                            </Button>
                          ))}
        </div>
        )}
                    </CardContent>
      </Card>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-3xl">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      
      {/* Input Interface */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to research a company, e.g., 'Research Acme Corp'"
            className="flex-1"
            disabled={isStreaming}
          />
          <Button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isStreaming}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendMessage("Research Acme Corp")}
            disabled={isStreaming}
          >
            Research Acme Corp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendMessage("Research Tesla")}
            disabled={isStreaming}
          >
            Research Tesla
          </Button>
          {completedResearch.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportResearch()}
              disabled={isStreaming}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Research
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### **3. Research Card Components (From Figma Analysis)**
```typescript
// Vendor Profile Card - Welcome message showing user's company capabilities
export const VendorProfileCard = ({ vendorProfile, userContext }) => {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/30 border-l-4 border-l-primary">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          {vendorProfile.company} Intelligence Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Overview */}
        <div>
          <p className="text-sm text-muted-foreground">{vendorProfile.overview}</p>
        </div>

        {/* Product Portfolio */}
        <div>
          <h4 className="mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Product Portfolio
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vendorProfile.products.map((product, index) => (
              <div key={index} className="bg-background/50 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{product.category}</Badge>
                </div>
                <p className="text-sm text-foreground mb-1">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Persona Insights - Role-specific success profile */}
        <div>
          <h4 className="mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            {vendorProfile.persona.role} Success Profile
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background/50 rounded p-3">
              <p className="text-xs text-muted-foreground mb-2">Key Focus Areas</p>
              <ul className="text-xs space-y-1">
                {vendorProfile.persona.keyFocus.map((focus, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{focus}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background/50 rounded p-3">
              <p className="text-xs text-muted-foreground mb-2">Success Metrics</p>
              <ul className="text-xs space-y-1">
                {vendorProfile.persona.successMetrics.map((metric, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background/50 rounded p-3">
              <p className="text-xs text-muted-foreground mb-2">Common Challenges</p>
              <ul className="text-xs space-y-1">
                {vendorProfile.persona.commonChallenges.map((challenge, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Company Summary Card - Quick customer snapshot  
export const CompanySummaryCard = ({ companySummary }) => {
  return (
    <Card className="bg-accent/50 border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="text-foreground">{companySummary.name}</span>
            <Badge variant="secondary">{companySummary.industry}</Badge>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">{companySummary.size}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{companySummary.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>Recent: {companySummary.recentNews}</span>
          </div>
          
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex flex-wrap gap-1">
              <span className="text-muted-foreground">Tech:</span>
              {companySummary.techStack.map((tech, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Research Findings Card - Tabbed interface with findings, sources, follow-ups
export const ResearchFindingsCard = ({ 
  researchFindings, 
  sources, 
  messageId, 
  activeTab, 
  onTabChange, 
  onCitationClick,
  highlightedSource,
  vendorInsights,
  followUpOptions,
  onFollowUpClick
}) => {
  return (
    <Card className="bg-background border">
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <div className="flex items-center justify-between p-4 pb-0">
            <h3 className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              {researchFindings.title}
            </h3>
            <TabsList className="grid w-auto grid-cols-3 bg-muted/50">
              <TabsTrigger value="findings" className="text-xs">
                Findings
              </TabsTrigger>
              <TabsTrigger value="sources" className="text-xs">
                Sources
                {sources && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {sources.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs">
                Insights
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Findings Tab */}
          <TabsContent value="findings" className="p-4 pt-4">
      <div className="space-y-4">
              {researchFindings.items.map((item, index) => (
                <div key={index} className="border-l-2 border-primary/20 pl-4">
                  <h4 className="text-foreground mb-1">{item.title}</h4>
                  <p className="text-muted-foreground text-sm mb-2">{item.description}</p>
                  
                  {/* Contact Information */}
                  {item.contact && (
                    <div className="bg-accent/30 rounded p-3 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{item.contact.name} - {item.contact.role}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {item.contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>{item.contact.email}</span>
                          </div>
                        )}
                        {item.contact.linkedin && (
                          <div className="flex items-center gap-1">
                            <Linkedin className="w-3 h-3" />
                            <span>{item.contact.linkedin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Value Propositions vs Competitors */}
                  {item.valueProps && (
                    <div className="space-y-3 mb-2">
                      {item.valueProps.map((valueProp, vpIndex) => (
                        <div key={vpIndex} className="bg-primary/5 rounded p-3 border-l-4 border-l-primary">
                          <div className="flex items-center gap-2 mb-2">
                            <Swords className="w-4 h-4 text-primary" />
                            <span className="text-sm">{valueProp.ourAdvantage}</span>
                            <Badge variant="outline" className="text-xs">vs {valueProp.competitor}</Badge>
                          </div>
                          
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground mb-1">Key Talking Points:</p>
                            <ul className="text-xs space-y-0.5">
                              {valueProp.talkingPoints.map((point, pointIndex) => (
                                <li key={pointIndex} className="flex items-start gap-1">
                                  <span className="text-primary mt-0.5">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
      </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          {/* Sources Tab */}
          <TabsContent value="sources" className="p-4 pt-4">
            <div className="space-y-3">
              {sources?.map((source) => (
                <div 
                  key={source.id}
                  className={`p-3 rounded border transition-colors ${
                    highlightedSource === source.id ? 'bg-primary/10 border-primary' : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{source.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{source.type}</Badge>
                        <Badge 
                          variant={source.relevance === 'high' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {source.relevance}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{source.domain}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Vendor Insights Tab */}
          <TabsContent value="insights" className="p-4 pt-4">
            {vendorInsights && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Opportunities</h4>
                  <ul className="text-sm space-y-1">
                    {vendorInsights.opportunities.map((opportunity, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{opportunity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Recommended Next Steps</h4>
        <div className="grid gap-2">
                    {followUpOptions?.map((option) => (
            <Button
                        key={option.id}
              variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => onFollowUpClick(option.id)}
                      >
                        {option.icon}
                        <span className="ml-2">{option.text}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {option.category}
                        </Badge>
            </Button>
          ))}
        </div>
    </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
```

#### **4. SSE Hook Implementation**
```typescript
export const useResearchChat = (companyId: string, userContext: UserContext) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableResearchAreas, setAvailableResearchAreas] = useState<ResearchArea[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [completedResearch, setCompletedResearch] = useState<CompletedResearch[]>([]);
  const [activeTabsState, setActiveTabsState] = useState<Record<string, string>>({});
  
  const startResearch = async (researchAreaId: string) => {
    setIsStreaming(true);
    
    // Open SSE connection for this research area
    const eventSource = new EventSource(
      `/api/research/stream?areaId=${researchAreaId}&companyId=${companyId}&userRole=${userContext.role}&userCompany=${userContext.company}`
    );
    
    eventSource.addEventListener('collection_started', (event) => {
      const data = JSON.parse(event.data);
      addMessage({ type: 'system', content: data.message });
    });
    
    eventSource.addEventListener('progress_update', (event) => {
      const data = JSON.parse(event.data);
      updateStreamingProgress(data.step, data.completed);
    });
    
    eventSource.addEventListener('research_findings', (event) => {
      const data = JSON.parse(event.data);
      addResearchFindings(data.content);
    });
    
    eventSource.addEventListener('sources_found', (event) => {
      const data = JSON.parse(event.data);
      updateSources(data.sources);
    });
    
    eventSource.addEventListener('vendor_insights', (event) => {
      const data = JSON.parse(event.data);
      addVendorInsights(data.insights);
    });
    
    eventSource.addEventListener('follow_up_options', (event) => {
      const data = JSON.parse(event.data);
      setFollowUpOptions(data.options);
    });
    
    eventSource.addEventListener('research_complete', (event) => {
      setIsStreaming(false);
      eventSource.close();
    });
    
    return () => eventSource.close();
  };
  
  return { 
    messages, 
    availableResearchAreas, 
    startResearch, 
    isStreaming,
    completedResearch,
    activeTabsState,
    setActiveTabsState
  };
};
```

---

## 📋 **Phase 1 Deliverables**

### **Backend Deliverables**
- [ ] **SSE Research Streaming Lambda**: `/api/research/stream` endpoint for real-time research
- [ ] **Research Area Engine**: 11 structured research areas with role-based prioritization  
- [ ] **Real-Time Dataset Collector**: Lightweight collection API mapped to research areas
- [ ] **Customer Discovery API**: Company search + basic context collection (< 3s target)
- [ ] **Vendor Profile Generator**: Role-specific company capabilities and persona insights
- [ ] **Source Attribution System**: Citation tracking with relevance scoring and metadata
- [ ] **Follow-up Options Engine**: Contextual next steps based on research findings
- [ ] **Export Service**: Research report generation with completed findings aggregation
- [ ] **Cache Warming Service**: Proactive popular company data pre-loading
- [ ] **Error Handling Framework**: 3-tier fallback system with alternative suggestions

### **Frontend Deliverables**
- [ ] **Customer Search Page**: Company search with autocomplete suggestions
- [ ] **Research Chat Interface**: SSE-powered conversational research experience
- [ ] **VendorProfileCard**: Welcome message showing user's company capabilities and role-specific insights
- [ ] **CompanySummaryCard**: Quick customer snapshot with industry, size, location, recent news
- [ ] **ResearchFindingsCard**: Tabbed interface (Findings | Sources | Insights) with citation support
- [ ] **Research Area Selection**: 11 core research areas with icons and role-based prioritization
- [ ] **Progress Indicators**: Real-time streaming steps with completion status
- [ ] **Source Attribution**: Citation system with relevance scoring and external links
- [ ] **Follow-up Actions**: Categorized next steps (research | action | explore)
- [ ] **Export Functionality**: Research report generation with slide-out interface
- [ ] **Error State Components**: Graceful fallback UX for data collection failures

### **Integration Deliverables**
- [ ] **Dataset Integration**: Reuse existing `DATASET_REQUIREMENTS_MAP`
- [ ] **Cache Integration**: Leverage existing DynamoDB caching layers
- [ ] **User Context Flow**: Integration with cc-intelligence user profiles

---

## 🎯 **Success Criteria**

### **Functional Success**
- [ ] **End-to-end research workflow**: Search → Select → Customer Summary → Research Areas → Findings
- [ ] **Context awareness**: Different research area priorities for AE vs CSM vs SE roles  
- [ ] **Vendor specificity**: Role-specific vendor profile + competitive insights vs generic responses
- [ ] **Tabbed findings interface**: Findings | Sources | Insights with citation support
- [ ] **Real-time performance**: < 3s for customer discovery, < 8s for research area completion

### **Technical Success**
- [ ] **SSE streaming stability**: Reliable research progress streaming with reconnection handling
- [ ] **Source attribution**: Every finding linked to credible sources with relevance scoring
- [ ] **Error handling**: 3-tier fallback system (fresh → stale cache → partial → alternatives)
- [ ] **Cache utilization**: 85%+ hit rate for popular companies via proactive warming
- [ ] **Export functionality**: Research report generation with aggregated findings
- [ ] **Mobile responsive**: Works on shadcn responsive design with chat interface
- [ ] **Graceful degradation**: Users never hit dead ends, always get helpful alternatives

### **User Experience Success**
- [ ] **Intuitive research flow**: Non-technical users can navigate chat-based research easily
- [ ] **Relevant research areas**: 11 areas prioritized by role + industry context
- [ ] **Rich findings display**: Contact info, value props, competitive advantages clearly presented
- [ ] **Actionable follow-ups**: Categorized next steps (research | action | explore) based on findings
- [ ] **Visual clarity**: Clean chat interface using shadcn components with proper card hierarchy
- [ ] **Source transparency**: Users can verify findings through cited sources (Figma model)

---

## 🔄 **Phase 1 Testing Strategy**

### **Development Testing**
1. **Unit Tests**: Question generation, dataset mapping, SSE handling
2. **Integration Tests**: End-to-end workflow from search to response
3. **Performance Tests**: Response time targets under load

### **User Validation**
1. **Internal Testing**: Test with Okta sales scenarios
2. **Role Validation**: Verify AE vs CSM get different experiences
3. **Company Validation**: Test with different customer industries/sizes

### **Technical Validation**
1. **SSE Reliability**: Connection stability across different browsers
2. **Cache Performance**: Verify cache hit rates and response times
3. **Error Recovery**: Test network failures and reconnection

---

## 🚀 **Phase 2 Preparation**

**What Phase 1 Enables for Phase 2:**
- Proven SSE infrastructure for advanced streaming
- User profile integration for enhanced personalization
- Basic question templates for LLM enhancement
- Customer context framework for deeper analysis

**Phase 2 Focus Areas:**
- Advanced LLM personalization (20% enhancement)
- Contextual follow-up generation
- Progressive intelligence building
- Source transparency and citation

---

**This Phase 1 guide provides the foundation for building truly differentiated, user profile-driven guided intelligence that no other platform offers.** 

---

## 📋 **Document Revision Notes**

**Updated:** January 17, 2025 - Revised based on Figma design analysis  
**Key Changes:**
- ✅ **Research Areas Framework**: Replaced guided questions with 11 structured research areas from Figma analysis
- ✅ **Chat Interface Design**: Aligned with proven conversational UI patterns (VendorProfileCard, CompanySummaryCard, ResearchFindingsCard)
- ✅ **Tabbed Findings Interface**: Added Findings | Sources | Insights tabs with citation support
- ✅ **Source Attribution System**: Integrated transparency model with relevance scoring
- ✅ **Follow-up Actions**: Categorized next steps (research | action | explore)
- ✅ **Export Functionality**: Research report generation for CRM integration
- ✅ **Role-based Prioritization**: Research areas prioritized by role relevance scores

**Design Reference**: Based on analysis of functional AI Intelligence Figma prototype with proven UX patterns and comprehensive research workflow. 