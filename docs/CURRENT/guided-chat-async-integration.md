# Guided Interactive Chat + Async Processing Integration

## Overview

This document details the **exact implementation** of how guided interactive chat works with async step functions, showing the complete user journey from customer selection to detailed intelligence gathering.

**Key Principle:** Chat provides immediate interactivity while async processes gather deep intelligence in the background.

---

## 🔄 **Complete 7-Step User Flow**

### **Step 1: Customer Lookup & Confirmation**

#### **User Input:**
```
"Help me prepare for my meeting with Acme"
```

#### **Frontend Action:**
```typescript
// Immediate customer search - no async needed
const handleCustomerSearch = async (query: string) => {
  const response = await fetch('/api/customers/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit: 5 })
  });
  const customers = await response.json();
  
  // Show interactive selection immediately
  addChatMessage({
    type: 'assistant',
    content: `Found ${customers.length} customers matching "Acme":`,
    actions: customers.map(customer => ({
      id: customer.id,
      label: `${customer.name} (${customer.domain}) - ${customer.industry}`,
      action: 'select_customer',
      payload: customer
    }))
  });
};
```

#### **Chat Interface:**
```
🔍 Found 3 customers matching "Acme":

🔘 Acme Corp (acmecorp.com) - FinTech
🔘 Acme Industries (acme-ind.com) - Manufacturing  
🔘 Acme Solutions (acmesol.io) - Software

Which customer are you meeting with?
```

---

### **Step 2: Trigger Customer Intelligence Async**

#### **User Selection:**
```
User clicks: "Acme Corp (acmecorp.com) - FinTech"
```

#### **Frontend + Backend Coordination:**
```typescript
// Frontend: Handle customer selection
const handleCustomerSelection = async (customer: Customer) => {
  // 1. Add confirmation message
  addChatMessage({
    type: 'assistant',
    content: `Perfect! Researching ${customer.name} for your meeting.`
  });
  
  // 2. Start async customer intelligence immediately
  const response = await fetch('/api/intelligence/customer', {
    method: 'POST',
    body: JSON.stringify({
      customer,
      userPersona: currentUser.persona,
      chatSessionId: chatSession.id
    })
  });
  
  const { executionArn, estimatedDuration } = await response.json();
  
  // 3. Show progress tracking
  addChatMessage({
    type: 'assistant',
    content: `🔄 Deep research started (${estimatedDuration} minutes)
             
             While that processes, here's what I can tell you now:`,
    metadata: { executionArn }
  });
  
  // 4. Connect to WebSocket for real-time updates
  connectToWorkflowUpdates(executionArn);
};
```

#### **Backend: CustomerIntelligenceLambda**
```typescript
// CustomerIntelligenceLambda.ts - Enhanced with chat integration
export const handler = async (event: any) => {
  const { customer, userPersona, chatSessionId } = JSON.parse(event.body);
  
  // 1. Check cache first (immediate response)
  const cachedProfile = await cacheService.get(`customer:${customer.domain}:profile`);
  
  if (cachedProfile && !isStale(cachedProfile)) {
    // Send immediate high-level summary to chat
    await chatProgressService.sendImmediateSummary(chatSessionId, cachedProfile);
    return { statusCode: 200, body: JSON.stringify(cachedProfile) };
  }
  
  // 2. Start async step function for deep intelligence
  const execution = await stepFunctions.startExecution({
    stateMachineArn: process.env.CUSTOMER_INTELLIGENCE_STEP_FUNCTION_ARN,
    input: JSON.stringify({
      customer,
      userPersona,
      chatSessionId, // Pass chat session for real-time updates
      requestId: generateRequestId()
    })
  }).promise();
  
  return {
    statusCode: 202,
    body: JSON.stringify({
      executionArn: execution.executionArn,
      estimatedDuration: '2-3'
    })
  };
};
```

---

### **Step 3: Interactive High-Level Summary (While Processing)**

#### **Immediate Chat Response (from cache/basic lookup):**
```typescript
// ChatProgressService.ts - Send immediate summary
export class ChatProgressService {
  
  async sendImmediateSummary(chatSessionId: string, customer: Customer) {
    const basicSummary = await this.generateBasicSummary(customer);
    
    const message = {
      type: 'partial_results',
      content: `📊 **${customer.name} - Quick Overview**
      
      🏢 **Company Basics**
      • Industry: ${customer.industry}
      • Size: ~${customer.employeeCount} employees
      • Location: ${customer.location}
      • Website: ${customer.domain}
      
      🔄 **Gathering deeper intelligence...**
      • News & market signals
      • Recent hiring patterns  
      • Technology stack analysis
      • Decision maker profiles`,
      
      actions: [
        { id: 'explore_basics', label: 'Tell me more about their business', action: 'explore_company_details' },
        { id: 'show_contacts', label: 'Who should I talk to?', action: 'explore_contacts' },
        { id: 'tech_stack', label: 'What technology do they use?', action: 'explore_technology' },
        { id: 'wait_full', label: 'Wait for complete analysis', action: 'wait_for_completion' }
      ]
    };
    
    await this.wsManager.sendToSession(chatSessionId, message);
  }
}
```

#### **Real-Time Progress Updates:**
```typescript
// As step function progresses, stream updates to chat
// SmartCollectionHandler.ts - Enhanced with chat updates

export const smartDataCollectionHandler = async (event: StepFunctionEvent) => {
  const { customer, chatSessionId, datasetRequirements } = event;
  
  if (chatSessionId) {
    await chatProgressService.sendProgressUpdate(chatSessionId, {
      step: 'data_collection',
      status: 'started',
      message: '🔍 Collecting fresh market signals...'
    });
  }
  
  // Collect data from multiple sources
  const results = await Promise.allSettled([
    serpApiService.searchNews(customer.name),
    serpApiService.searchJobs(customer.domain),
    brightDataService.getCompanyProfile(customer.domain),
    snovService.findContacts(customer.domain)
  ]);
  
  // Send partial results as they complete
  if (chatSessionId) {
    const partialData = this.formatPartialResults(results);
    await chatProgressService.sendPartialResults(chatSessionId, partialData);
  }
  
  return this.consolidateResults(results);
};
```

---

### **Step 4: User Asks Specific Question**

#### **User Input (while async processing continues):**
```
"What's their technology stack?"
```

#### **Frontend: Question Routing**
```typescript
// ChatInterface.tsx - Handle user questions during processing
const handleUserQuestion = async (question: string) => {
  // 1. Add user message to chat
  addChatMessage({ type: 'user', content: question });
  
  // 2. Send to chat orchestration service
  const response = await fetch('/api/chat/question', {
    method: 'POST',
    body: JSON.stringify({
      question,
      customer: currentCustomer,
      chatSessionId: chatSession.id,
      workflowStatus: stepFunctionStatus
    })
  });
  
  const result = await response.json();
  
  // 3. Add response to chat
  addChatMessage({
    type: 'assistant',
    content: result.content,
    actions: result.actions,
    metadata: { sources: result.sources }
  });
};
```

---

### **Step 5: Cache-First Response Strategy**

#### **Backend: Question Processing**
```typescript
// ChatOrchestrationService.ts - Enhanced with cache-first strategy
export class ChatOrchestrationService {
  
  async processQuestion(
    question: string,
    customer: Customer,
    chatSessionId: string,
    workflowStatus: WorkflowStatus
  ): Promise<ChatResponse> {
    
    // 1. Parse question intent and map to data source
    const intent = await this.parseQuestionIntent(question);
    const requiredSources = this.mapQuestionToSources(intent);
    
    // 2. Check cache first for each required source
    const cachedData = await this.getCachedData(customer, requiredSources);
    
    if (cachedData.isComplete) {
      // We have all needed data in cache
      return this.formatCachedResponse(intent, cachedData);
    }
    
    // 3. Check if async workflow has the data
    const workflowData = await this.getWorkflowData(chatSessionId, requiredSources);
    
    if (workflowData.isAvailable) {
      // Step function has collected this data
      return this.formatWorkflowResponse(intent, workflowData);
    }
    
    // 4. Need to query specific data sources
    return this.queryMissingData(intent, requiredSources, customer);
  }
  
  private mapQuestionToSources(intent: QuestionIntent): DataSource[] {
    const sourceMapping = {
      'technology_stack': ['bright_data', 'builtwith_api'],
      'funding_news': ['serpapi_news', 'crunchbase'],
      'hiring_patterns': ['serpapi_jobs', 'linkedin_jobs'],
      'decision_makers': ['snov_contacts', 'apollo_contacts'],
      'competitors': ['serpapi_search', 'google_knowledge_graph'],
      'company_overview': ['bright_data', 'clearbit']
    };
    
    return sourceMapping[intent.category] || ['serpapi_search'];
  }
}
```

---

### **Step 6: Targeted Data Source Queries**

#### **Example: Technology Stack Question**
```typescript
// If not in cache, query specific sources based on question type
async queryMissingData(intent: QuestionIntent, sources: DataSource[], customer: Customer) {
  
  if (intent.category === 'technology_stack') {
    // Send immediate "researching" message
    await chatProgressService.sendSearchingMessage(
      chatSessionId, 
      '🔍 Analyzing their technology stack...'
    );
    
    // Query specific tech stack sources
    const [brightData, builtwithData] = await Promise.allSettled([
      brightDataService.getTechStack(customer.domain),
      builtWithService.getTechnologies(customer.domain)
    ]);
    
    // Format and cache results
    const techStack = this.consolidateTechStack(brightData, builtwithData);
    await cacheService.set(`customer:${customer.domain}:tech_stack`, techStack, 86400);
    
    return this.formatTechStackResponse(techStack, customer);
  }
}
```

#### **Real-Time Source Queries:**
```typescript
// Example response for technology stack
formatTechStackResponse(techStack: TechStack, customer: Customer) {
  return {
    content: `🛠️ **${customer.name} Technology Stack**
    
    **Core Infrastructure:**
    • Cloud: ${techStack.cloud.join(', ')}
    • CDN: ${techStack.cdn}
    • Analytics: ${techStack.analytics.join(', ')}
    
    **Development Stack:**
    • Languages: ${techStack.languages.join(', ')}
    • Frameworks: ${techStack.frameworks.join(', ')}
    • Databases: ${techStack.databases.join(', ')}
    
    **Business Applications:**
    • CRM: ${techStack.crm}
    • Marketing: ${techStack.marketing.join(', ')}
    • Communication: ${techStack.communication.join(', ')}`,
    
    actions: [
      { id: 'okta_fit', label: 'How does Okta fit?', action: 'analyze_okta_fit' },
      { id: 'integration_points', label: 'Integration opportunities', action: 'show_integrations' },
      { id: 'competitive_analysis', label: 'vs current identity solution', action: 'competitive_comparison' }
    ],
    
    sources: [
      { name: 'BuiltWith', confidence: 0.9, lastUpdated: '2025-01-10' },
      { name: 'BrightData', confidence: 0.85, lastUpdated: '2025-01-09' }
    ]
  };
}
```

---

### **Step 7: Surface Info with Source References**

#### **Enhanced Response with Sources:**
```typescript
// MessageBubble.tsx - Enhanced with source references
export const MessageBubble = ({ message, onActionClick }) => (
  <div className="assistant-message bg-gray-100 p-4 rounded-lg">
    <div className="content whitespace-pre-wrap mb-3">
      {message.content}
    </div>
    
    {/* Interactive action buttons */}
    {message.actions && (
      <div className="actions flex flex-wrap gap-2 mb-3">
        {message.actions.map(action => (
          <button
            key={action.id}
            onClick={() => onActionClick(action)}
            className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
          >
            {action.label}
          </button>
        ))}
      </div>
    )}
    
    {/* Source references */}
    {message.metadata?.sources && (
      <div className="sources border-t pt-2 mt-2">
        <div className="text-xs text-gray-500 mb-1">Sources:</div>
        <div className="flex flex-wrap gap-2">
          {message.metadata.sources.map(source => (
            <SourceBadge key={source.name} source={source} />
          ))}
        </div>
      </div>
    )}
  </div>
);

const SourceBadge = ({ source }) => (
  <div className="flex items-center gap-1 px-2 py-1 bg-gray-200 rounded text-xs">
    <span>{source.name}</span>
    <div className={`w-2 h-2 rounded-full ${
      source.confidence > 0.8 ? 'bg-green-400' : 
      source.confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
    }`} />
    <span className="text-gray-500">{source.lastUpdated}</span>
  </div>
);
```

---

## 🔄 **Complete Integration Architecture**

### **Data Flow Diagram:**
```
User Question → Intent Parsing → Source Mapping → Cache Check → Live Query → Formatted Response → Source Attribution

Parallel:
Customer Selection → Async Step Function → Background Intelligence → Real-time Updates → Progressive Enhancement
```

### **Cache Strategy:**
```typescript
// Multi-layer cache hierarchy
interface CacheStrategy {
  // Layer 1: Immediate responses (chat optimized)
  chat_summaries: `customer:${domain}:summary` // TTL: 1 hour
  
  // Layer 2: Question-specific data
  tech_stack: `customer:${domain}:tech_stack` // TTL: 24 hours
  funding_news: `customer:${domain}:funding` // TTL: 6 hours
  hiring_data: `customer:${domain}:hiring` // TTL: 12 hours
  
  // Layer 3: Full intelligence profiles
  full_profile: `customer:${domain}:profile` // TTL: 48 hours
  
  // Layer 4: Source-specific raw data
  serpapi_news: `source:serpapi:news:${domain}` // TTL: 2 hours
  bright_data: `source:bright:${domain}` // TTL: 24 hours
}
```

### **WebSocket Message Types:**
```typescript
interface ChatWebSocketMessage {
  type: 'workflow_progress' | 'partial_results' | 'source_update' | 'question_response';
  chatSessionId: string;
  data: {
    step?: string;
    status?: 'started' | 'completed' | 'failed';
    content?: string;
    actions?: ChatAction[];
    sources?: SourceReference[];
    confidence?: number;
  };
  timestamp: Date;
}
```

---

## 🎯 **Key Benefits of This Integration**

1. **Immediate Interactivity** - Users get instant responses, no waiting
2. **Progressive Enhancement** - More data streams in as async completes
3. **Cache-First Performance** - Common questions answered immediately
4. **Source Transparency** - Users see exactly where data comes from
5. **Flexible Depth** - Users control how deep to explore each topic
6. **Background Intelligence** - Full analysis happens without blocking interaction
7. **Real-Time Updates** - Step function progress streams to chat

This creates a **conversational intelligence experience** where users feel like they're talking to an expert researcher who has instant access to information and is continuously discovering more insights in the background!

*Next: Would you like me to implement specific components of this integrated chat + async system?* 