# Sales Intelligence Orchestrator (Backend API)

A serverless, AI-powered backend orchestrator built on AWS Lambda that provides comprehensive sales intelligence through advanced data aggregation, AI analysis, and real-time company insights. This backend powers the [cc-intelligence](../cc-intelligence) frontend application.

## 🚀 M4 Release Features

### Enhanced Backend Architecture
- **🔧 Improved Company Lookup**: Enhanced caching and response formatting
- **⚡ Serverless Optimization**: Optimized Lambda functions for better performance
- **🏢 Multi-Consumer Support**: Advanced data processing for multiple frontend clients
- **🤖 AI Analysis Engine**: Enhanced LLM integration with context-aware responses
- **📊 Real-time Processing**: Asynchronous workflow support with polling mechanisms
- **🔄 Cache Management**: Intelligent TTL-based caching with freshness indicators

### API Improvements
- **📈 Company Intelligence API**: Comprehensive company data aggregation
- **🔍 Enhanced Search**: Improved company lookup with fuzzy matching
- **⚙️ Async Processing**: Long-running analysis with status tracking
- **📱 CORS Support**: Enhanced frontend integration with proper headers
- **🛡️ Security**: API key validation and request sanitization

## 🏗️ Architecture

### Serverless Infrastructure
```
AWS Lambda Functions:
├── CompanyLookupLambda          # Company search and discovery
├── VendorContextLambda          # Comprehensive company intelligence
├── AsyncAnalysisLambda          # Long-running AI analysis
├── StatusCheckLambda            # Request status tracking
└── HealthCheckLambda            # System health monitoring

AWS Services:
├── API Gateway                  # RESTful API endpoints
├── DynamoDB                     # Data persistence and caching
├── S3                          # Document and file storage
├── CloudWatch                   # Logging and monitoring
├── Secrets Manager             # API keys and configuration
└── EventBridge                 # Event-driven workflows
```

### Core Components
```
src/
├── services/
│   ├── handlers/lambda/         # Lambda function handlers
│   │   ├── CompanyLookupLambda.ts
│   │   ├── VendorContextLambda.ts
│   │   ├── AsyncAnalysisLambda.ts
│   │   └── StatusCheckLambda.ts
│   ├── analysis/               # AI analysis engines
│   │   ├── AIAnalyzer.ts
│   │   ├── IntentAnalyzer.ts
│   │   └── SourceAnalyzer.ts
│   ├── content/                # Data fetching services
│   │   ├── ContentFetcher.ts
│   │   └── ContentFilter.ts
│   ├── enrichment/             # Data enrichment engines
│   │   ├── engines/
│   │   ├── processors/
│   │   └── sources/
│   └── core/
│       ├── CacheService.ts     # Redis/DynamoDB caching
│       └── Logger.ts           # Structured logging
├── stacks/                     # CDK infrastructure
│   ├── constructs/
│   │   ├── api/               # API Gateway constructs
│   │   ├── compute/           # Lambda constructs
│   │   ├── data/              # Database constructs
│   │   └── storage/           # S3 constructs
│   └── SalesIntelligenceStack.ts
└── types/                      # TypeScript definitions
    ├── api-types.ts
    ├── cache-types.ts
    └── dataset-requirements.ts
```

## 📡 API Endpoints

### Company Intelligence
```typescript
// GET /company/{domain}/lookup
// Search and discover companies
GET /company/okta.com/lookup
Response: {
  companies: CompanySearchResult[],
  cached: boolean,
  requestId: string
}

// POST /company/{domain}/vendor-context  
// Comprehensive company intelligence
POST /company/okta.com/vendor-context
Body: { userRole: "account-executive" }
Response: {
  companyIntelligence: {
    companyName: string,
    industry: string,
    products: string[],
    targetMarkets: string[],
    competitors: string[],
    valuePropositions: string[],
    // ... extensive company data
  },
  metadata: {
    requestId: string,
    fromCache: boolean,
    processingTimeMs: number
  }
}
```

### Analysis & Discovery
```typescript
// POST /analysis/async
// Long-running AI analysis
POST /analysis/async
Body: {
  domain: "example.com",
  context: "discovery",
  searchResults: SearchResult[]
}
Response: {
  statusEndpoint: string,
  workflow: string,
  requestId: string
}

// GET /analysis/status/{requestId}
// Check analysis status
GET /analysis/status/abc-123-def
Response: {
  status: "processing" | "completed" | "failed",
  progress: number,
  data?: AnalysisResult,
  estimatedCompletion?: string
}
```

### System Health
```typescript
// GET /health
// System health check
GET /health
Response: {
  status: "healthy",
  timestamp: string,
  services: {
    database: "operational",
    cache: "operational", 
    ai: "operational"
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# AWS Configuration
AWS_REGION=us-west-2
AWS_ACCOUNT_ID=123456789012

# API Configuration
API_STAGE=prod
CORS_ORIGIN=https://your-frontend-domain.com
API_KEY_REQUIRED=true

# Database Configuration
DYNAMODB_TABLE_NAME=sales-intelligence-cache
CACHE_TTL_HOURS=24

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
BEDROCK_REGION=us-west-2

# External APIs
SERPAPI_KEY=...
BRIGHT_DATA_TOKEN=...
SNOV_API_KEY=...
```

### Infrastructure Deployment
```bash
# Install dependencies
npm install

# Deploy infrastructure
npx cdk deploy SalesIntelligenceStack

# Deploy with specific stage
npx cdk deploy --context stage=prod

# Update Lambda functions only
npx cdk deploy --hotswap
```

## 🤖 AI Analysis Engine

### Multi-Model Architecture
```typescript
// Enhanced AI analysis with multiple providers
class AIAnalyzer {
  async analyzeCompany(data: CompanyData, context: AnalysisContext) {
    const engines = [
      new OpenAIEngine(),
      new AnthropicEngine(), 
      new BedrockEngine()
    ];
    
    return await this.orchestrateAnalysis(engines, data, context);
  }
}
```

### Context-Aware Processing
- **Role-Based Analysis**: Tailored insights for AE, SE, BDR, CSM roles
- **Intent Detection**: Automatic context classification (discovery, competitive, renewal)
- **Source Credibility**: AI-powered source reliability scoring
- **Real-time Updates**: Incremental analysis with live data streams

## 📊 Data Processing Pipeline

### Multi-Stage Enrichment
```
1. Company Discovery
   ├── Domain validation
   ├── Company search
   └── Basic info retrieval

2. Data Aggregation  
   ├── Web scraping
   ├── API integrations
   ├── Public data sources
   └── Social media signals

3. AI Analysis
   ├── Content processing
   ├── Entity extraction
   ├── Sentiment analysis
   └── Insight generation

4. Response Formation
   ├── Data structuring
   ├── Cache optimization
   └── API response
```

### Caching Strategy
- **Multi-Level Caching**: DynamoDB + Redis for optimal performance
- **TTL Management**: Intelligent cache expiration based on data type
- **Cache Invalidation**: Event-driven cache updates
- **Freshness Indicators**: Real-time data age tracking

## 🔒 Security & Compliance

### API Security
- **Authentication**: API key-based access control
- **Authorization**: Role-based permissions
- **Rate Limiting**: Request throttling per client
- **Input Validation**: Comprehensive request sanitization
- **CORS**: Configurable cross-origin policies

### Data Protection
- **Encryption**: At-rest and in-transit encryption
- **Data Retention**: Configurable TTL policies
- **Privacy**: PII detection and anonymization
- **Compliance**: GDPR and CCPA ready

## 🚀 Performance Optimization

### Serverless Benefits
- **Auto-scaling**: Automatic capacity management
- **Cold Start Optimization**: Provisioned concurrency for critical functions
- **Cost Efficiency**: Pay-per-request pricing model
- **Global Distribution**: Multi-region deployment support

### Monitoring & Observability
```typescript
// Enhanced logging and metrics
class Logger {
  logApiRequest(endpoint: string, duration: number, status: number) {
    CloudWatch.putMetric({
      MetricName: 'ApiLatency',
      Value: duration,
      Dimensions: [
        { Name: 'Endpoint', Value: endpoint },
        { Name: 'Status', Value: status.toString() }
      ]
    });
  }
}
```

## 🧪 Testing

### Test Coverage
```bash
# Unit tests
npm test

# Integration tests  
npm run test:integration

# Load testing
npm run test:load

# API contract tests
npm run test:contract
```

### Test Environment
```bash
# Deploy test stack
npx cdk deploy TestStack --context stage=test

# Run full test suite
npm run test:full

# Performance benchmarks
npm run benchmark
```

## 📈 Metrics & Analytics

### Key Performance Indicators
- **Response Time**: P95 < 2s for company lookup
- **Throughput**: 1000+ requests/minute capacity
- **Accuracy**: 95%+ data quality score
- **Availability**: 99.9% uptime SLA
- **Cache Hit Rate**: 80%+ for frequent queries

### Business Metrics
- **API Usage**: Request patterns and growth
- **Feature Adoption**: Endpoint utilization
- **Data Quality**: Source reliability tracking
- **User Satisfaction**: Response accuracy scores

## 🔄 Release History

### M4 (Current)
- ✅ Enhanced company lookup with improved caching
- ✅ Optimized Lambda performance and cost
- ✅ Advanced AI analysis with multi-model support
- ✅ Real-time processing with async workflows
- ✅ Improved CORS and frontend integration

### M3.1
- ✅ Async analysis processing
- ✅ Enhanced error handling
- ✅ Performance optimizations

### M3
- ✅ Multi-consumer architecture
- ✅ Advanced caching strategies
- ✅ AI analysis improvements

### M2
- ✅ Core API endpoints
- ✅ Basic company intelligence
- ✅ DynamoDB integration

### M1-backend
- ✅ Initial serverless architecture
- ✅ Basic Lambda functions
- ✅ API Gateway setup

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Start local development
npm run dev

# Deploy to dev environment
npm run deploy:dev

# Run tests
npm test
```

### Contributing Guidelines
1. **Feature Branches**: Use descriptive branch names
2. **Code Standards**: Follow TypeScript best practices  
3. **Testing**: Maintain 90%+ test coverage
4. **Documentation**: Update API docs for changes
5. **Performance**: Consider cold start impact

## 📞 Support

### Troubleshooting
- **Lambda Timeouts**: Check CloudWatch logs for performance bottlenecks
- **Cache Issues**: Verify DynamoDB TTL configurations
- **API Errors**: Review API Gateway logs and error responses
- **AI Analysis**: Monitor token usage and model availability

### Resources
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [API Documentation](./docs/api-reference.md)

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- [cc-intelligence](../cc-intelligence): React frontend application
- [Infrastructure Documentation](./docs/infrastructure.md): Detailed AWS setup guide
- [API Reference](./docs/api-reference.md): Complete endpoint documentation