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

### **Step 3: Profile-Driven Guided Questions**
**KEY DIFFERENTIATOR**: Questions adapt to User Profile + Customer Context

#### **Context-Aware Question Generation**
```typescript
interface GuidedQuestionContext {
  userProfile: {
    role: 'AE' | 'CSM' | 'SE';
    company: 'Okta' | 'Salesforce' | 'Microsoft';
    vendorContext: VendorContext;
  };
  customerContext: {
    company: string;
    industry: string;
    size: string;
    recentNews: string[];
    basicTech: string[];
  };
}

const generateContextAwareQuestions = (context: GuidedQuestionContext) => {
  // Role-specific question templates
  const roleQuestions = QUESTION_TEMPLATES[context.userProfile.role];
  
  // Vendor-specific adaptations
  const vendorFocus = VENDOR_CONTEXT[context.userProfile.company];
  
  // Customer context integration
  const customerAdaptations = adaptForCustomer(context.customerContext);
  
  return personalizeQuestions(roleQuestions, vendorFocus, customerAdaptations);
};
```

#### **Example Context-Aware Flows**

**Scenario A: Sarah (AE at Okta) researching Acme Corp (FinTech)**
```
Customer Context: 500 employees, $50M funding, AWS/Salesforce stack
→ Generated Questions:
🔘 "What's their current identity management solution?"
🔘 "Who leads security and compliance decisions?"
🔘 "How do they handle employee onboarding at scale?"
🔘 "What integrations do they need with Salesforce?"
```

**Scenario B: Mike (CSM at Okta) researching existing customer Acme Corp**
```
Customer Context: Same company, but user role = CSM
→ Generated Questions:
🔘 "How are they currently using Okta features?"
🔘 "What's their user adoption and engagement?"
🔘 "Any expansion opportunities or use cases?"
🔘 "Who are the day-to-day Okta administrators?"
```

**Scenario C: Alex (SE at Microsoft) researching Acme Corp**
```
Customer Context: Same company, different vendor
→ Generated Questions:
🔘 "What's their current Azure/Microsoft usage?"
🔘 "What technical integration challenges exist?"
🔘 "How complex is their current tech architecture?"
🔘 "What are their cloud migration plans?"
```

---

### **Step 4: Interactive Discovery with SSE Streaming**
**User clicks guided question** → **Real-time SSE streaming** → **Context-aware response + follow-ups**

#### **SSE Response Flow**
```typescript
// User clicks: "What's their current identity management solution?"
→ SSE Events:
data: {"type": "collection_started", "message": "🔍 Analyzing identity infrastructure..."}
data: {"type": "data_found", "source": "brightdata", "insight": "Found 3 identity tools"}
data: {"type": "answer_streaming", "content": "Based on our analysis, Acme Corp uses..."}
data: {"type": "vendor_insight", "content": "Perfect opportunity for Okta because..."}
data: {"type": "follow_up_questions", "questions": ["Integration complexity?", "Migration timeline?"]}
```

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

#### **2. Guided Chat Interface**
```typescript
// Using shadcn Card, Button, Badge components
export const GuidedChatInterface = ({ customer, userContext }) => {
  const { messages, availableQuestions, askQuestion, isStreaming } = useGuidedChat(
    customer.id, 
    userContext
  );
  
  return (
    <div className="space-y-6">
      {/* Customer Context Header */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="font-semibold">{customer.name}</h3>
            <div className="flex space-x-2">
              <Badge variant="secondary">{customer.industry}</Badge>
              <Badge variant="outline">{customer.size}</Badge>
            </div>
          </div>
        </div>
        {customer.recentNews && (
          <p className="text-sm text-muted-foreground mt-2">
            📈 {customer.recentNews}
          </p>
        )}
      </Card>
      
      {/* Chat Messages */}
      <div className="space-y-4">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isStreaming && <TypingIndicator />}
      </div>
      
      {/* Guided Questions */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">💡 Suggested questions:</h4>
        <div className="grid gap-2">
          {availableQuestions.map(question => (
            <Button
              key={question.id}
              variant="outline"
              className="justify-start text-left h-auto p-3"
              onClick={() => askQuestion(question.id)}
            >
              {question.text}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};
```

#### **3. SSE Hook Implementation**
```typescript
export const useGuidedChat = (companyId: string, userContext: UserContext) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<GuidedQuestion[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const askQuestion = async (questionId: string) => {
    setIsStreaming(true);
    
    // Open SSE connection for this question
    const eventSource = new EventSource(
      `/api/guided-chat/stream?questionId=${questionId}&companyId=${companyId}&userRole=${userContext.role}&userCompany=${userContext.company}`
    );
    
    eventSource.addEventListener('collection_started', (event) => {
      const data = JSON.parse(event.data);
      addMessage({ type: 'system', content: data.message });
    });
    
    eventSource.addEventListener('answer_streaming', (event) => {
      const data = JSON.parse(event.data);
      updateStreamingMessage(data.content);
    });
    
    eventSource.addEventListener('vendor_insight', (event) => {
      const data = JSON.parse(event.data);
      addVendorInsight(data.content);
    });
    
    eventSource.addEventListener('follow_up_questions', (event) => {
      const data = JSON.parse(event.data);
      setAvailableQuestions(data.questions);
      setIsStreaming(false);
      eventSource.close();
    });
    
    return () => eventSource.close();
  };
  
  return { messages, availableQuestions, askQuestion, isStreaming };
};
```

---

## 📋 **Phase 1 Deliverables**

### **Backend Deliverables**
- [ ] **SSE Streaming Lambda**: `/api/guided-chat/stream` endpoint
- [ ] **Profile-Aware Question Engine**: Context-aware question generation
- [ ] **Real-Time Data Collector**: Lightweight dataset collection API
- [ ] **Basic Context API**: Customer search + basic details collection
- [ ] **Cache Warming Service**: Proactive popular company data pre-loading
- [ ] **Error Handling Framework**: Graceful fallbacks with alternative suggestions

### **Frontend Deliverables**
- [ ] **Customer Search Page**: Company search with autocomplete
- [ ] **Guided Chat Interface**: SSE-powered interactive questioning
- [ ] **Message Components**: Chat bubbles, typing indicators, progress states
- [ ] **Question Templates**: 2-3 core guided questions per role (MVP focus)
- [ ] **Error State Components**: Graceful fallback UX for data collection failures

### **Integration Deliverables**
- [ ] **Dataset Integration**: Reuse existing `DATASET_REQUIREMENTS_MAP`
- [ ] **Cache Integration**: Leverage existing DynamoDB caching layers
- [ ] **User Context Flow**: Integration with cc-intelligence user profiles

---

## 🎯 **Success Criteria**

### **Functional Success**
- [ ] **End-to-end workflow**: Search → Select → Basic Details → Guided Questions → Answers
- [ ] **Context awareness**: Different questions for AE vs CSM vs SE roles
- [ ] **Vendor specificity**: Okta-specific insights vs generic responses
- [ ] **Real-time performance**: < 3s for basic details, < 5s for guided responses

### **Technical Success**
- [ ] **SSE stability**: Reliable streaming with reconnection handling
- [ ] **Error handling**: 3-tier fallback system (fresh → stale cache → partial → alternatives)
- [ ] **Cache utilization**: 85%+ hit rate for popular companies via warming
- [ ] **Mobile responsive**: Works on shadcn responsive design
- [ ] **Graceful degradation**: Users never hit dead ends, always get helpful responses

### **User Experience Success**
- [ ] **Intuitive flow**: Non-technical users can navigate easily
- [ ] **Relevant questions**: Questions feel contextually appropriate
- [ ] **Actionable insights**: Responses include next steps for user's role
- [ ] **Visual clarity**: Clean interface using shadcn components

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