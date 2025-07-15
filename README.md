# Sales Intelligence AI - TypeScript Edition

An AI-powered sales intelligence platform that helps sales professionals prepare for customer meetings with context-driven insights, competitive positioning, and personalized engagement strategies using a Perplexity-style approach.

## 🚀 Features

- **Real-time Intelligence**: Perplexity-style search and analysis for always-fresh data
- **Context-Aware Analysis**: Tailored insights based on sales context (discovery, competitive, renewal, etc.)
- **Competitive Intelligence**: Dynamic battle cards and positioning strategies
- **Pain Point Identification**: AI-powered analysis of customer challenges
- **Stakeholder Mapping**: Key contacts and approach strategies
- **Legal Compliance**: Fair use through analysis, not data redistribution

## 🏗️ Architecture

```
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── services/        # Core business logic
│   │   ├── SearchEngine.ts      # Google Custom Search integration
│   │   ├── ContentFetcher.ts    # Respectful web scraping
│   │   ├── AIAnalyzer.ts        # AWS Bedrock integration
│   │   ├── CacheService.ts      # Caching layer (to be created)
│   │   └── Logger.ts            # Logging service
│   └── index.ts         # Main entry point
├── package.json         # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── env.example         # Environment variables template
```

## 📦 Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
# For development/runtime:
cp env.example .env
# Edit .env with your API keys

# For deployment:
cp env.example .env.local
# Edit .env.local with your deployment configuration
```

3. **Build the project:**
```bash
npm run build
```

## 🔑 Required API Keys

### Google Custom Search API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Custom Search API
3. Create credentials (API key)
4. Set up a Custom Search Engine at [CSE](https://cse.google.com/)

### AWS Bedrock
1. Ensure you have AWS credentials configured (AWS CLI, environment variables, or IAM roles)
2. Enable Bedrock model access in your AWS account for the models you want to use
3. Ensure your AWS credentials have `bedrock:InvokeModel` permissions

## 🚀 Usage

### Command Line
```bash
# Development mode
npm run dev

# Production build and run
npm run build
npm start
```

### Programmatic Usage
```typescript
import { SalesIntelligenceService } from './src';

const config = {
  search: {
    maxResultsPerQuery: 10,
    timeoutMs: 10000,
    retryAttempts: 3,
    rateLimitRps: 1
  },
  ai: {
    model: 'anthropic.claude-3-sonnet-20240229-v1:0',
    maxTokens: 2000,
    temperature: 0.3,
    systemPrompt: 'You are a sales intelligence analyst.'
  },
  cache: {
    ttlHours: 1,
    maxEntries: 1000,
    compressionEnabled: true
  },
  apis: {
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY!,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!
  }
};

const service = new SalesIntelligenceService(config);

const result = await service.generateIntelligence({
  companyDomain: 'example.com',
  salesContext: 'discovery',
  additionalContext: 'Enterprise software evaluation'
});

console.log(result.insights);
```

## 🎯 Sales Contexts

The system supports different sales contexts for tailored intelligence:

- **`discovery`**: Initial research, pain points, growth indicators
- **`competitive`**: Competitor analysis, vendor evaluation criteria
- **`renewal`**: Contract renewal process, satisfaction metrics
- **`demo`**: Technical requirements, use cases, integration needs
- **`negotiation`**: Procurement process, budget approval, terms
- **`closing`**: Implementation timeline, stakeholder buy-in

## 📊 Example Output

```typescript
{
  insights: {
    companyOverview: {
      name: "Example Corp",
      industry: "Technology",
      size: "500-1000 employees",
      revenue: "$50M-100M",
      recentNews: [...],
      growth: { hiring: true, funding: false, ... }
    },
    painPoints: [
      "Legacy system modernization challenges",
      "Scalability issues with current infrastructure"
    ],
    technologyStack: {
      current: ["AWS", "React", "Node.js"],
      planned: ["Kubernetes", "GraphQL"],
      vendors: ["Salesforce", "HubSpot"]
    },
    keyContacts: [
      {
        name: "John Smith",
        title: "CTO",
        influence: "high",
        approachStrategy: "Focus on technical architecture"
      }
    ],
    competitiveLandscape: {
      competitors: [...],
      marketPosition: "Mid-market leader",
      differentiators: [...]
    },
    talkingPoints: [...],
    potentialObjections: [...],
    dealProbability: 75
  },
  sources: ["https://example.com/news", ...],
  confidenceScore: 0.85,
  generatedAt: "2024-01-15T10:30:00Z"
}
```

## 🔧 Configuration

### Search Configuration
```typescript
search: {
  maxResultsPerQuery: 10,    // Max results per search query
  timeoutMs: 10000,          // Request timeout
  retryAttempts: 3,          // Retry failed requests
  rateLimitRps: 1            // Requests per second limit
}
```

### AI Configuration
```typescript
ai: {
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',  // Bedrock model to use
  maxTokens: 2000,           // Max tokens per analysis
  temperature: 0.3,          // Creativity vs consistency
  systemPrompt: '...'        // System instruction
}
```

### Cache Configuration
```typescript
cache: {
  ttlHours: 1,               // Time to live in hours
  maxEntries: 1000,          // Max cached entries
  compressionEnabled: true   // Enable compression
}
```

## 🔌 API Endpoints

The Sales Intelligence platform provides REST API endpoints for different use cases:

### Company Overview

**Asynchronous (recommended pattern):**
```bash
# 1. Start processing (returns immediately)
GET /company/{domain}/overview-async

# Response:
{
  "requestId": "req_abc123",
  "status": "processing",
  "message": "Company overview is being processed. Use the requestId to check status.",
  "estimatedTimeMinutes": 1,
  "statusCheckEndpoint": "/requests/req_abc123"
}

# 2. Check status and get results
GET /requests/{requestId}

# Response (when completed):
{
  "requestId": "req_abc123",
  "status": "completed",
  "companyDomain": "shopify.com",
  "processingTimeMs": 45000,
  "result": {
    "name": "Shopify Inc.",
    "domain": "shopify.com",
    "industry": "E-commerce Technology",
    // ... full company overview data
  }
}
```

### Other Endpoints

**Company Search:**
```bash
GET /company/{domain}/search?context=discovery
```

**AI Analysis:**
```bash
POST /company/{domain}/analysis
```

**Discovery Insights:**
```bash
GET /company/{domain}/discovery
```

**Cache Management (Development):**
```bash
# Get cache statistics
GET /cache/stats

# Clear entire cache
POST /cache/clear

# Delete specific cache entry
DELETE /cache/delete/{cacheKey}
```

**Health Check:**
```bash
GET /health
```

### Authentication

All endpoints require an API key:
```bash
curl -H "X-API-Key: your-api-key" \
     https://api.example.com/company/shopify.com/overview-async
```

### Status Codes

- `200` - Success
- `202` - Accepted (async request created)
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

### Rate Limits

- 100 requests per minute per API key
- 200 burst capacity
- Async endpoints recommended for heavy usage

## 🛡️ Legal & Ethical Considerations

This application follows Perplexity's approach for legal compliance:

- **Fair Use**: Content is analyzed, not republished
- **No Redistribution**: Users receive insights, not raw scraped data
- **Research Purpose**: Transformative use for sales intelligence
- **Attribution**: Sources are always cited
- **Rate Limiting**: Respectful of website resources
- **Robots.txt**: Compliance with website policies

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint
```

## 📈 Performance Metrics

The system tracks:
- Search time
- Content fetch time
- AI analysis time
- Cache hit rates
- Source reliability scores

## 🔄 Development

### Adding New Services
1. Create service in `src/services/`
2. Add types to `src/types/index.ts`
3. Update main service integration
4. Add tests

### Extending Sales Contexts
1. Update `SalesContext` type
2. Add context-specific queries in `SalesIntelligenceService`
3. Update AI prompts for new context

## 🚀 Deployment

### Docker (Recommended)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Environment Variables
```bash
GOOGLE_SEARCH_API_KEY=your_key
GOOGLE_SEARCH_ENGINE_ID=your_id
AWS_REGION=us-east-1
AWS_PROFILE=default  # Or use AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
REDIS_URL=redis://localhost:6379  # Optional
LOG_LEVEL=info
NODE_ENV=production
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🆘 Support

For questions and support:
- Create an issue on GitHub
- Check the documentation
- Review example usage in `src/index.ts`

## 🔮 Roadmap

- [ ] Complete remaining service implementations
- [x] Add REST API endpoints
- [x] Async request/response pattern for long-running operations
- [ ] Web dashboard UI
- [ ] Advanced caching with Redis
- [ ] Webhook integrations
- [ ] Real-time monitoring alerts
- [ ] Multi-language support
- [ ] Enterprise SSO integration 