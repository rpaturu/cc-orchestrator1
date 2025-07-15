# Architecture Documentation

This directory contains technical architecture documentation, design patterns, and implementation approaches for the Sales Intelligence Orchestrator.

## 🏗️ Architecture Overview

The Sales Intelligence Orchestrator follows a clean, modular architecture with focused services and handlers:

```
src/services/
├── core/          # Core services (CacheService, Logger)
├── search/        # Search services (SearchEngine, SearchQueryBuilder)
├── analysis/      # Analysis services (AIAnalyzer, IntentAnalyzer, SourceAnalyzer)
├── content/       # Content services (ContentFetcher, ContentFilter)
├── utilities/     # Utility services (CompanyExtractor, RequestService)
├── handlers/      # Endpoint handlers (4 handlers)
├── formatters/    # Response formatters (4 formatters)
└── SalesIntelligenceOrchestrator.ts  # Main orchestrator
```

## 📄 Technical Documentation

### 🚀 [Snippet-First Approach](./snippet-first-approach.md)
- **Purpose**: Efficient processing strategy for company overview
- **Benefits**: Faster response times, reduced API costs, better user experience
- **Implementation**: Analyze search snippets first, then selectively fetch critical content
- **Usage**: Overview endpoint optimization

### 🤖 [LLM Search and Response](./llm-search-and-response.md)
- **Purpose**: AI integration patterns and response generation
- **Components**: Bedrock integration, prompt engineering, response parsing
- **Implementation**: AI analysis workflows and content processing

## 🎯 Design Principles

### 1. **Separation of Concerns**
- **Handlers**: Business logic for specific endpoints
- **Formatters**: Response formatting and validation
- **Services**: Focused functionality (search, analysis, content)
- **Utilities**: Common helper functions

### 2. **Modular Architecture**
- Each service has a single responsibility
- Clear interfaces between components
- Easy to test and maintain
- Extensible for new features

### 3. **Performance Optimization**
- Snippet-first approach for fast responses
- Intelligent caching strategies
- Selective content fetching
- Batched operations with rate limiting

### 4. **Error Handling**
- Graceful degradation
- Consistent error responses
- Logging and monitoring
- Fallback mechanisms

## 🔄 Processing Flows

### Overview Generation
1. **Cache Check** → 2. **Search Queries** → 3. **Snippet Analysis** → 4. **Gap Identification** → 5. **Selective Fetching** → 6. **Response Formatting**

### Discovery Insights
1. **Cache Check** → 2. **Multi-Query Search** → 3. **Content Fetching** → 4. **AI Analysis** → 5. **Response Enhancement** → 6. **Formatting**

### Analysis Processing
1. **Input Validation** → 2. **Content Fetching** → 3. **Relevancy Filtering** → 4. **AI Analysis** → 5. **Insights Generation** → 6. **Response Formatting**

### Search Operations
1. **Query Building** → 2. **Relationship Context** → 3. **Search Execution** → 4. **Result Aggregation** → 5. **Metadata Addition**

## 🛠️ Implementation Patterns

### Handler Pattern
```typescript
export class EndpointHandler extends BaseEndpointHandler {
  async handleRequest(params): Promise<FormattedResponse> {
    // 1. Cache check
    // 2. Business logic
    // 3. Cache result
    // 4. Format response
  }
}
```

### Formatter Pattern
```typescript
export class ResponseFormatter {
  static formatResponse(data): FormattedResponse {
    // 1. Validate data
    // 2. Add metadata
    // 3. Apply transformations
    // 4. Return formatted response
  }
}
```

### Service Pattern
```typescript
export class FocusedService {
  async processData(input): Promise<ProcessedData> {
    // 1. Input validation
    // 2. Core processing
    // 3. Error handling
    // 4. Return results
  }
}
```

## 📊 Performance Characteristics

| Component | Response Time | Cache Strategy | Optimization |
|-----------|---------------|----------------|--------------|
| Overview | < 3s | Aggressive | Snippet-first |
| Discovery | < 8s | Moderate | Selective fetching |
| Analysis | < 15s | Standard | Content filtering |
| Search | < 2s | Minimal | Direct API |

## 🔧 Configuration

### Environment Variables
- `AWS_REGION`: AWS region for services
- `GOOGLE_SEARCH_API_KEY`: Google Search API key
- `SEARCH_ENGINE_ID`: Google Custom Search Engine ID
- `CACHE_TTL`: Cache time-to-live settings

### Service Configuration
- Search rate limiting
- Content fetching timeouts
- AI analysis parameters
- Cache policies

---

*This architecture documentation reflects the current state of the Sales Intelligence Orchestrator implementation.* 