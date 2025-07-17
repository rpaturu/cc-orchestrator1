# Sales Intelligence API Documentation

## Base Configuration

All requests require the `X-API-Key` header with your API key.

```bash
export API_ENDPOINT="YOUR_API_ENDPOINT"
export API_KEY="YOUR_API_KEY"
```

## Core Sales Intelligence APIs

### 1. Company Overview (Asynchronous)
Get comprehensive company analysis and insights.

```bash
# Request company overview (returns immediately with request ID)
curl -X GET "$API_ENDPOINT/company/shopify.com/overview" \
  -H "X-API-Key: $API_KEY" | jq

# Response: {"requestId": "uuid", "status": "processing", "estimatedTime": 30}
```

### 2. Company Discovery (Asynchronous)
Discover key information and recent developments.

```bash
# Request company discovery (returns immediately with request ID)
curl -X GET "$API_ENDPOINT/company/shopify.com/discovery" \
  -H "X-API-Key: $API_KEY" | jq

# Response: {"requestId": "uuid", "status": "processing", "estimatedTime": 25}
```

### 3. Company Analysis (Asynchronous)
Perform deep AI analysis on provided search results.

```bash
# Request company analysis (returns immediately with request ID)
curl -X POST "$API_ENDPOINT/company/shopify.com/analysis" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "discovery",
    "searchResults": [
      {
        "title": "Shopify Q3 2024 Results",
        "url": "https://investors.shopify.com/news",
        "snippet": "Strong Q3 performance with 26% revenue growth..."
      }
    ]
  }' | jq

# Response: {"requestId": "uuid", "status": "processing", "estimatedTime": 45}
```

### 4. Company Search (Synchronous)
Quick search for specific company information.

```bash
# Get immediate search results
curl -X GET "$API_ENDPOINT/company/shopify.com/search?query=latest+news" \
  -H "X-API-Key: $API_KEY" | jq

# Response: Immediate results with search snippets
```

### 5. Request Status Check
Check the status of asynchronous requests.

```bash
# Check request status (replace REQUEST_ID with actual value)
curl -X GET "$API_ENDPOINT/requests/REQUEST_ID" \
  -H "X-API-Key: $API_KEY" | jq

# Response: 
# - Processing: {"status": "processing", "progress": 65}
# - Complete: {"status": "completed", "result": {...}}
# - Failed: {"status": "failed", "error": "..."}
```

## Company Lookup APIs

### 1. Company Lookup/Search
Search for companies by name (autocomplete/validation).

```bash
# Search for companies matching query
curl -X GET "$API_ENDPOINT/api/companies/lookup?query=acme&limit=5" \
  -H "X-API-Key: $API_KEY" | jq

# Response:
{
  "companies": [
    {
      "name": "Acme Corporation",
      "domain": "acme.com",
      "industry": "Technology",
      "size": "1000-5000 employees",
      "description": "Leading enterprise software provider"
    }
  ],
  "total": 5,
  "query": "acme",
  "cached": false
}
```

### 2. Company Enrichment
Get full company details with products and competitors.

```bash
# Enrich company with full details
curl -X POST "$API_ENDPOINT/api/companies/enrich" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Shopify",
    "domain": "shopify.com",
    "includeProducts": true,
    "includeCompetitors": true
  }' | jq

# Response:
{
  "basicInfo": {
    "name": "Shopify Inc.",
    "domain": "shopify.com",
    "industry": "E-commerce Platform",
    "size": "10000+ employees",
    "headquarters": "Ottawa, Canada",
    "founded": "2006"
  },
  "suggestedProducts": [
    {
      "name": "Shopify Plus",
      "category": "Enterprise E-commerce",
      "confidence": 0.95
    }
  ],
  "suggestedCompetitors": [
    {
      "name": "WooCommerce",
      "domain": "woocommerce.com",
      "reason": "WordPress e-commerce plugin",
      "confidence": 0.88
    }
  ],
  "confidence": 0.92,
  "cached": false
}
```

### 3. Product Suggestions
Get product recommendations based on company profile.

```bash
# Get product suggestions for company
curl -X POST "$API_ENDPOINT/api/products/suggest" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Tesla",
    "domain": "tesla.com",
    "industry": "Automotive",
    "size": "large"
  }' | jq

# Response:
{
  "products": [
    {
      "name": "Electric Vehicle Management Platform",
      "category": "Fleet Management",
      "description": "Enterprise EV fleet optimization",
      "confidence": 0.87,
      "reasoning": "Large automotive company with EV focus"
    }
  ],
  "companyProfile": {
    "industry": "Automotive",
    "size": "large",
    "focus": ["Electric Vehicles", "Clean Energy"]
  },
  "cached": false
}
```

### 4. Competitor Discovery
Find competitors and analyze competitive landscape.

```bash
# Find competitors for company
curl -X POST "$API_ENDPOINT/api/competitors/find" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Slack",
    "domain": "slack.com",
    "industry": "Business Communication"
  }' | jq

# Response:
{
  "competitors": [
    {
      "name": "Microsoft Teams",
      "domain": "teams.microsoft.com",
      "category": "Enterprise Communication",
      "reason": "Direct competitor in team collaboration space",
      "confidence": 0.95
    },
    {
      "name": "Discord",
      "domain": "discord.com", 
      "category": "Communication Platform",
      "reason": "Growing presence in business communication",
      "confidence": 0.73
    }
  ],
  "competitiveAnalysis": {
    "marketPosition": "Leader in team communication",
    "keyDifferentiators": ["Enterprise focus", "Integration ecosystem"]
  },
  "cached": false
}
```

### 5. Domain Suggestions
Get domain suggestions for company names.

```bash
# Get domain suggestions for company name
curl -X GET "$API_ENDPOINT/api/companies/suggest-domain?name=Acme%20Corp" \
  -H "X-API-Key: $API_KEY" | jq

# Response:
{
  "companyName": "Acme Corp",
  "domainSuggestions": [
    "acmecorp.com",
    "acme.com", 
    "acme-corp.com",
    "getacme.com",
    "acme.io"
  ],
  "cached": false
}
```

## Cache Management (Development)

### Cache Statistics
```bash
# Get cache statistics
curl -X GET "$API_ENDPOINT/cache/stats" \
  -H "X-API-Key: $API_KEY" | jq
```

### Clear Cache
```bash
# Clear entire cache
curl -X POST "$API_ENDPOINT/cache/clear" \
  -H "X-API-Key: $API_KEY" | jq
```

### Delete Specific Cache Entry
```bash
# Delete specific cache entry (replace CACHE_KEY with actual cache key)
curl -X DELETE "$API_ENDPOINT/cache/delete/CACHE_KEY" \
  -H "X-API-Key: $API_KEY" | jq
```

## Health Check

### System Health
```bash
# Check API health
curl "$API_ENDPOINT/health" | jq

# Response: {"status": "healthy", "timestamp": "2024-01-15T10:30:00Z"}
```

## Response Format

### Success Response
```json
{
  "data": {...},
  "cached": true|false,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Rate Limits & Caching

- **Cache TTL**: 24 hours for all company data
- **Rate Limits**: Standard AWS API Gateway limits apply
- **Cost Optimization**: Cached responses return `"cached": true`
- **Google API Costs**: ~$0.005 per new company lookup (cached responses are free)

## Authentication

All endpoints require the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key-here" ...
```

API keys are managed through AWS API Gateway and can be rotated as needed. 