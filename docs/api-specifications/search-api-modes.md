# Sales Intelligence Search API - Three Search Modes

## Quick Summary

### 🚀 Key Features
- **GET endpoint** with three intelligent search modes
- **Fast processing** (5-15 seconds) for immediate results
- **Strategic 3-query approach** inspired by Perplexity methodology
- **Raw search results** with minimal processing
- **Context-aware queries** based on seller-target relationships

### 📈 When to Use
- **Content gathering** for further analysis
- **Fast initial research** with raw search results
- **Two-step workflow** preparation (search → analyze)
- **Relationship-aware prospecting** with seller context
- **Interactive query generation** via chat interface

### ⚖️ Comparison with Other Endpoints
| Aspect | Search | Discovery | Analysis | Overview |
|--------|--------|-----------|----------|----------|
| **Method** | GET | GET | POST | GET (async) |
| **Input** | Domain + optional seller context | Automatic research | Search results required | Automatic research |
| **Speed** | 5-15 seconds | 15-30 seconds | 30-60 seconds | 60+ seconds |
| **Output** | Raw search results | Focused insights | Deep AI analysis | Comprehensive data |
| **Use Case** | Content gathering | Initial research | Advanced analysis | Complete overview |

### 🎯 Three Search Modes
1. **Generic Mode** - Basic company research without seller context
2. **Relationship-Aware Mode** - Partnership and integration-focused queries
3. **Chat Interface Mode** - Natural language intent-based search

---

## Overview

The Sales Intelligence API provides three distinct search modes to gather company intelligence, each optimized for different use cases and contexts. All modes use a strategic 3-query approach inspired by Perplexity's methodology to maximize information quality while respecting API quota limits.

## Mode 1: Generic Mode (Default)

### Description
Basic company overview search without seller context. Uses general research queries to gather comprehensive company information.

### Usage
```
GET /search?target=shopify.com
```

### Query Strategy
When no seller company is provided, the system generates 3 generic research queries:
1. `"[Company] company overview 2024"`
2. `"[Company] business model revenue"`
3. `"[Company] news challenges opportunities"`

### Example Request
```bash
curl -X GET "https://your-api-endpoint/search?target=shopify.com"
```

### Response Focus
- General company information
- Business model and revenue details
- Recent news and market position
- Generic challenges and opportunities

---

## Mode 2: Relationship-Aware Mode (Enhanced)

### Description
Contextual search that considers the relationship between seller and target companies. Generates queries focused on partnerships, integrations, and business relationships.

### Usage
```
GET /search?target=shopify.com&sellerCompany=Atlassian
```

### Parameters
- `target`: Target company domain or name (required)
- `sellerCompany`: Your company name (optional, enables enhanced mode)
- `sellerDomain`: Your company domain (optional)
- `sellerProducts`: Your products/services (optional)

### Query Strategy
When seller company is provided, generates relationship-focused queries:
1. `"[SellerCompany] [TargetCompany] partnership integration"`
2. `"[TargetCompany] [seller industry] solutions challenges"`
3. `"[TargetCompany] company overview business model"`

### Example Request
```bash
curl -X GET "https://your-api-endpoint/search?target=shopify.com&sellerCompany=Atlassian&sellerProducts=Jira,Confluence"
```

### Response Focus
- Partnership opportunities and existing integrations
- How seller's solutions could address target's challenges
- Industry-specific insights relevant to the relationship
- Competitive landscape and positioning

---

## Mode 3: Chat Interface Mode (Dynamic)

### Description
Natural language processing mode that interprets user intent and generates dynamic, context-aware search queries based on conversational input.

### Usage
```
POST /chat
Content-Type: application/json

{
  "message": "Tell me about Shopify's challenges with inventory management",
  "sellerCompany": "Atlassian",
  "context": "previous conversation context"
}
```

### Intent Detection
The system analyzes natural language input to detect intent and generate appropriate queries:

#### Supported Intent Types
- **Challenges**: Problems, pain points, difficulties
- **Technology**: Technical stack, integrations, tools
- **Competitive**: Competitors, market position
- **Financial**: Revenue, funding, growth
- **Leadership**: Key personnel, decision makers
- **Partnership**: Existing partnerships, collaboration opportunities

### Query Generation Examples

#### User Input: "What are Shopify's main challenges?"
Generated Queries:
1. `"Shopify challenges problems issues 2024"`
2. `"Shopify pain points difficulties"`
3. `"Shopify competitive threats market"`

#### User Input: "How could Atlassian help Shopify with project management?"
Generated Queries:
1. `"Shopify project management challenges"`
2. `"Atlassian Shopify integration partnership"`
3. `"Shopify development workflow tools"`

### Example Request
```bash
curl -X POST "https://your-api-endpoint/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I work for Atlassian and want to understand Shopifys development workflow challenges",
    "sellerCompany": "Atlassian",
    "sellerProducts": "Jira, Confluence, Bitbucket"
  }'
```

### Response Focus
- Intent-specific information extraction
- Dynamic query generation based on user needs
- Contextual relationship analysis
- Conversation-aware follow-up capabilities

---

## Technical Implementation

### Query Optimization Strategy
All modes follow these principles:
- **3 queries maximum** per request (quota-efficient)
- **Simple, natural language** queries (1-6 words when possible)
- **Trust Google's algorithm** rather than complex operators
- **Sequential execution** with rate limiting (0.5 RPS)

### Rate Limiting
- **0.5 requests per second** to Google Custom Search API
- **Sequential query execution** to prevent 429 errors
- **Built-in delays** between requests

### Content Processing
1. **Search Execution**: 3 strategic queries per mode
2. **Content Fetching**: Top 2 results per query (up to 6 URLs)
3. **AI Analysis**: Claude analysis for intelligence extraction
4. **Response Formatting**: Structured JSON with insights

### Error Handling
- **Quota management**: Efficient 3-query approach
- **Rate limit compliance**: Sequential execution with delays
- **Graceful degradation**: Fallback to available results
- **Comprehensive logging**: Detailed timing and error tracking

---

## API Response Format

All modes return a consistent response structure:

```json
{
  "success": true,
  "data": {
    "companyOverview": {
      "name": "Shopify Inc.",
      "domain": "shopify.com",
      "description": "...",
      "keyMetrics": {...},
      "recentNews": [...],
      "challenges": [...],
      "opportunities": [...]
    },
    "searchStrategy": {
      "mode": "relationship-aware|generic|chat",
      "queriesUsed": ["query1", "query2", "query3"],
      "totalResults": 15,
      "processingTime": "8.2s"
    }
  }
}
```

---

## Usage Recommendations

### When to Use Each Mode

**Generic Mode**: 
- Cold outreach scenarios
- Initial company research
- No existing relationship context

**Relationship-Aware Mode**:
- Existing business relationships
- Partnership development
- Solution-specific prospecting
- Account-based marketing

**Chat Interface Mode**:
- Interactive research sessions
- Specific question answering
- Dynamic information discovery
- Conversational sales preparation

### Quota Considerations

With Google Custom Search API billing enabled:
- **Free tier**: 100 queries/day
- **Paid tier**: $5 per 1,000 additional queries
- **Our 3-query approach**: ~33 company searches per day on free tier
- **Cost at scale**: ~$0.015 per company overview with paid tier

---

## Examples and Use Cases

### Sales Scenario 1: Account Research
```bash
# Generic research first
GET /search?target=hubspot.com

# Then relationship-aware follow-up
GET /search?target=hubspot.com&sellerCompany=Salesforce&sellerProducts=Sales Cloud
```

### Sales Scenario 2: Interactive Discovery
```bash
POST /chat
{
  "message": "What integration challenges does HubSpot face?",
  "sellerCompany": "Zapier"
}
```

### Sales Scenario 3: Partnership Development
```bash
GET /search?target=stripe.com&sellerCompany=Square&sellerProducts=Point of Sale,Payment Processing
```

This multi-mode approach ensures optimal information gathering while maintaining efficiency and respecting API constraints. 