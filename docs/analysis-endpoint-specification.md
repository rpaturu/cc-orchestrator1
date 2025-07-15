# Company Analysis Endpoint Specification

## Quick Summary

### 🚀 Key Features
- **POST endpoint** requiring search results as input
- **Context-aware AI analysis** (discovery, competitive, renewal, demo, negotiation, closing)
- **Deep sales intelligence** with battle cards, objection handling, and deal probability
- **Citation-based insights** with transparent source attribution
- **AWS Bedrock Claude** for advanced natural language processing

### 📈 When to Use
- **Advanced analysis** of specific search results
- **Custom sales context** insights for different deal stages
- **Competitive intelligence** with detailed battle cards
- **Complex deal strategies** requiring deep AI analysis
- **Objection handling** and negotiation preparation

### ⚖️ Comparison with Other Endpoints
| Aspect | Analysis | Discovery | Overview |
|--------|----------|-----------|----------|
| **Method** | POST | GET | GET (async) |
| **Input** | Search results required | Automatic research | Automatic research |
| **Speed** | 30-60 seconds | 15-30 seconds | 60+ seconds |
| **Depth** | Deep AI analysis | Focused insights | Comprehensive data |
| **Use Case** | Advanced analysis | Initial research | Complete overview |

---

## Endpoint: `POST /company/{domain}/analysis`

This document defines the expected request structure and response for the AI analysis endpoint.

## Overview

The analysis endpoint provides **deep AI-powered sales intelligence** by analyzing provided search results within a specific sales context. It's designed as a "slower but smarter" endpoint that performs comprehensive AI analysis on content to extract actionable sales insights.

## Request Structure

### Method
`POST`

### Path Parameters
- `domain`: Company domain (e.g., `shopify.com`)

### Headers
- `X-API-Key`: Required API key for authentication
- `Content-Type`: application/json

### Request Body
```json
{
  "context": "discovery",
  "searchResults": [
    {
      "results": [
        {
          "url": "https://example.com/article",
          "title": "Company News Article",
          "snippet": "Article snippet content...",
          "sourceDomain": "example.com",
          "relevanceScore": 0.85
        }
      ],
      "totalResults": 5,
      "searchTime": 1200,
      "query": "Shopify company overview"
    }
  ]
}
```

**Required Fields:**
- `context`: Sales context (discovery, competitive, renewal, demo, negotiation, closing)
- `searchResults`: Array of search engine responses from the search endpoint

## Response Structure

### Success Response (200)

```json
{
  "insights": {
    "companyOverview": {
      "name": "Shopify Inc. [1]",
      "size": "10,000+ employees [2]",
      "sizeCitations": [2, 3],
      "industry": "E-commerce Technology [1]",
      "revenue": "$5.6B annual revenue [1]",
      "revenueCitations": [1, 4],
      "recentNews": [
        {
          "title": "Shopify Announces Q4 2024 Results",
          "summary": "Strong revenue growth of 31% year-over-year",
          "date": "2024-02-14",
          "source": "Shopify Investor Relations",
          "relevance": "high",
          "citations": [1]
        }
      ],
      "growth": {
        "hiring": true,
        "hiringCitations": [2],
        "funding": false,
        "fundingCitations": [],
        "expansion": true,
        "expansionCitations": [3],
        "newProducts": true,
        "partnerships": true
      },
      "challenges": [
        {
          "text": "Increasing competition from Amazon and TikTok Shop [5]",
          "citations": [5, 6]
        }
      ]
    },
    "painPoints": [
      {
        "text": "Merchant acquisition costs rising due to market saturation [7]",
        "citations": [7, 8]
      }
    ],
    "technologyStack": {
      "current": ["Ruby on Rails", "React", "GraphQL", "Kubernetes"],
      "planned": ["AI/ML infrastructure", "Edge computing"],
      "vendors": ["AWS", "Google Cloud", "Stripe"],
      "modernizationAreas": ["Payment processing", "Analytics platform"]
    },
    "keyContacts": [
      {
        "name": "Tobi Lütke",
        "title": "CEO",
        "department": "Executive",
        "linkedin": "https://linkedin.com/in/tobil",
        "influence": "high",
        "approachStrategy": "Focus on technical innovation and merchant success"
      }
    ],
    "competitiveLandscape": {
      "competitors": [
        {
          "name": "Amazon",
          "strength": "high",
          "marketShare": "38% of e-commerce",
          "advantages": ["Scale", "Logistics", "Prime ecosystem"],
          "weaknesses": ["Generic experience", "High fees"]
        }
      ],
      "marketPosition": "Leading platform for independent merchants",
      "differentiators": ["Ease of use", "Customization", "App ecosystem"],
      "vulnerabilities": ["Competition from social commerce", "Rising costs"],
      "battleCards": [
        {
          "competitor": "Amazon",
          "keyMessages": ["Brand control", "Direct customer relationship"],
          "objectionHandling": ["Address scale concerns", "Highlight merchant success"],
          "winStrategies": ["Focus on brand building", "Customization capabilities"]
        }
      ]
    },
    "talkingPoints": [
      {
        "text": "Shopify's 31% revenue growth indicates strong market opportunity [1]",
        "citations": [1]
      }
    ],
    "potentialObjections": [
      {
        "objection": "Shopify might prefer building in-house solutions",
        "response": "Their focus on merchant success creates partnership opportunities",
        "supporting_data": "Recent acquisitions show openness to external solutions"
      }
    ],
    "recommendedActions": [
      {
        "text": "Target their expansion into enterprise segments with our B2B solutions [9]",
        "citations": [9]
      }
    ],
    "dealProbability": 0.75,
    "dealProbabilityCitations": [1, 2, 9]
  },
  "sources": [
    {
      "id": 1,
      "url": "https://investors.shopify.com/news",
      "title": "Shopify Reports Fourth Quarter and Full Year 2024 Results",
      "domain": "investors.shopify.com",
      "sourceType": "financial",
      "snippet": "Shopify Inc. reports strong Q4 2024 results with 31% revenue growth...",
      "credibilityScore": 0.95,
      "publishedDate": "2024-02-14",
      "author": "Shopify Investor Relations",
      "domainAuthority": 0.90,
      "lastUpdated": "2024-02-14T10:00:00Z",
      "relevancyScore": 0.92
    }
  ],
  "confidenceScore": 0.87,
  "generatedAt": "2024-02-15T14:30:00Z",
  "cacheKey": "company-shopify.com-analysis-discovery",
  "totalSources": 12,
  "citationMap": {
    "financial_data": [1, 4],
    "leadership": [2, 3],
    "competition": [5, 6]
  },
  "requestId": "req_analysis_12345"
}
```

## Key Features

### 1. **Context-Aware Analysis**
- Tailors insights based on sales context (discovery, competitive, etc.)
- Provides different types of intelligence for different sales stages

### 2. **Comprehensive Sales Intelligence**
- **Pain Points**: Specific challenges the company faces
- **Technology Stack**: Current and planned technology infrastructure
- **Key Contacts**: Decision makers and influencers
- **Competitive Landscape**: Market position and competitive threats
- **Talking Points**: Conversation starters and value propositions
- **Objection Handling**: Anticipated objections and responses
- **Recommended Actions**: Specific next steps and strategies

### 3. **Citation-Based Insights**
- Every insight includes citation numbers linking to sources
- Transparent source attribution for credibility
- Detailed source metadata including credibility scores

### 4. **AI-Powered Analysis**
- Uses AWS Bedrock for advanced natural language processing
- Extracts nuanced insights from complex content
- Provides confidence scores for reliability assessment

## Usage Pattern

This endpoint is designed for the **two-step analysis workflow**:

1. **First**: Use the search endpoint to gather relevant content
2. **Second**: Use this analysis endpoint to extract sales insights

```bash
# Step 1: Search for content
curl -X GET "https://api.example.com/company/shopify.com/search?context=discovery" \
  -H "X-API-Key: your-api-key"

# Step 2: Analyze the search results
curl -X POST "https://api.example.com/company/shopify.com/analysis" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "discovery",
    "searchResults": [/* results from step 1 */]
  }'
```

## Sales Context Types

### Discovery
- Focus on company challenges and opportunities
- Identify key stakeholders and decision-making process
- Understanding current technology and vendor relationships

### Competitive
- Detailed competitive analysis and battle cards
- Market positioning and differentiation strategies
- Competitive threats and opportunities

### Renewal
- Usage patterns and satisfaction indicators
- Expansion opportunities within existing account
- Risk factors and retention strategies

### Demo
- Specific use cases and requirements
- Technical decision criteria
- Stakeholder interests and concerns

### Negotiation
- Budget and pricing sensitivity
- Decision timeline and approval process
- Alternative options and competitive pressure

### Closing
- Final objections and concerns
- Decision-making authority and process
- Implementation and onboarding considerations

## Performance Characteristics

- **Response Time**: 30-60 seconds (depends on content volume)
- **Timeout**: 5 minutes maximum
- **Content Processing**: Analyzes full content, not just snippets
- **AI Model**: AWS Bedrock Claude for advanced reasoning
- **Caching**: Results cached for 1 hour in production

## Error Responses

### 400 Bad Request
```json
{
  "error": "Request body with search results is required",
  "requestId": "req_analysis_error_123"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid API key",
  "requestId": "req_analysis_error_124"
}
```

### 500 Internal Server Error
```json
{
  "error": "AI analysis failed",
  "message": "Unable to process content",
  "requestId": "req_analysis_error_125"
}
```

## Rate Limits

- **100 requests per minute** per API key
- **200 burst capacity**
- Analysis endpoints consume more quota due to processing intensity

## Best Practices

1. **Combine with Search**: Always use search results as input
2. **Context Selection**: Choose appropriate sales context for targeted insights
3. **Result Caching**: Cache results to avoid redundant analysis
4. **Citation Validation**: Verify insights using provided citations
5. **Progressive Analysis**: Start with discovery, then move to specific contexts

## Security & Compliance

- All analysis is performed on publicly available information
- No proprietary or confidential data is accessed
- Content is analyzed for insights, not redistributed
- Complies with fair use guidelines for research purposes 