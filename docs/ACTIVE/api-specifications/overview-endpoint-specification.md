# Company Overview Endpoint Specification

## Quick Summary

### 🚀 Key Features
- **Asynchronous GET endpoint** with comprehensive business intelligence
- **Most detailed analysis** (60+ seconds) with complete company profiles
- **Comprehensive data structure** including financial, market, leadership, and competitive data
- **Citation-based information** with transparent source attribution
- **Confidence scoring** for data reliability assessment

### 📈 When to Use
- **Complete company profiles** for detailed research
- **Comprehensive intelligence** for strategic planning
- **Financial and market analysis** for investment decisions
- **Leadership and competitive mapping** for account strategies
- **Long-term relationship building** with thorough preparation

### ⚖️ Comparison with Other Endpoints
| Aspect | Overview | Discovery | Analysis | Search |
|--------|----------|-----------|----------|--------|
| **Method** | GET (async) | GET | POST | GET |
| **Input** | Automatic research | Automatic research | Search results required | Domain + optional context |
| **Speed** | 60+ seconds | 15-30 seconds | 30-60 seconds | 5-15 seconds |
| **Depth** | Comprehensive data | Focused insights | Deep AI analysis | Raw search results |
| **Use Case** | Complete overview | Initial research | Advanced analysis | Content gathering |

### 🎯 Key Data Categories
- **Core Information** - Company basics, industry, description
- **Financial Data** - Revenue, funding, market cap, stock information
- **Leadership** - Executive team and key personnel
- **Market Intelligence** - Position, competitors, advantages
- **Business Model** - Products, services, pricing structure
- **Performance Metrics** - Growth indicators and KPIs

---

## Endpoint: `/company/{domain}/overview`

This document defines the expected response structure for the asynchronous company overview endpoint.

## Overview

The overview endpoint provides comprehensive business intelligence about a company by analyzing multiple authoritative sources. It returns structured data suitable for sales intelligence, market research, and business development purposes.

## Response Structure

### Core Company Information

```json
{
  "name": "Shopify Inc. [1]",
  "domain": "shopify.com",
  "industry": "Commerce Technology [1,2]",
  "description": "Shopify is the leading global commerce company that provides essential internet infrastructure for commerce, offering trusted tools to start, scale, market, and run retail businesses of any size [1]",
  "foundedYear": 2006
}
```

**Required Fields:**
- `name`: Official company name with citation numbers
- `domain`: Company domain
- `industry`: Primary industry classification with citations
- `description`: Comprehensive company description with citations

**Optional Fields:**
- `foundedYear`: Year the company was founded

### Financial Data

```json
{
  "financialData": {
    "stockSymbol": "SHOP",
    "stockExchange": "NYSE, TSX [1]",
    "marketCap": "$145.3B [1]",
    "revenue": {
      "growth": "31% (Q4 2024), 26% (FY 2024) [1]",
      "metrics": "Free Cash Flow Margin 22% Q4 2024 [1]"
    },
    "revenueGrowth": "31% YoY in Q4 2024 [1]",
    "totalFunding": "$122M [2]",
    "latestFundingRound": {
      "type": "Series C",
      "amount": "$100M",
      "date": "2023-01-15",
      "investors": ["Investor A", "Investor B"],
      "citations": [1, 2]
    },
    "peRatio": 91.9,
    "citations": [1, 2, 3]
  }
}
```

**Financial Fields:**
- `stockSymbol`: Stock ticker symbol
- `stockExchange`: Exchange(s) where stock is traded
- `marketCap`: Market capitalization
- `revenue`: Revenue information object
- `revenueGrowth`: Revenue growth percentage
- `totalFunding`: Total funding raised
- `latestFundingRound`: Most recent funding round details
- `peRatio`: Price-to-earnings ratio
- `citations`: Source citations for financial data

### Leadership Information

```json
{
  "leadership": [
    {
      "name": "Harley Finkelstein",
      "title": "President",
      "department": "Executive",
      "background": "Former entrepreneur and investor",
      "citations": [1]
    },
    {
      "name": "Jeff Hoffmeister",
      "title": "Chief Financial Officer",
      "department": "Executive",
      "citations": [1]
    }
  ]
}
```

**Leadership Fields:**
- `name`: Executive name
- `title`: Job title
- `department`: Department or division
- `background`: Professional background (optional)
- `citations`: Source citations

### Market Data

```json
{
  "marketData": {
    "marketSize": "$6.56 trillion by 2025 (e-commerce market) [1]",
    "marketShare": "10% of global e-commerce platforms [1]",
    "marketPosition": "Leading global commerce company [1]",
    "majorCompetitors": ["WooCommerce", "Magento", "BigCommerce"],
    "competitiveAdvantages": ["Ease of use", "Scalability", "App ecosystem"],
    "citations": [1, 2]
  }
}
```

**Market Fields:**
- `marketSize`: Total addressable market
- `marketShare`: Company's market share
- `marketPosition`: Competitive position description
- `majorCompetitors`: Array of main competitors
- `competitiveAdvantages`: Array of competitive advantages
- `citations`: Source citations for market data

### Products & Services

```json
{
  "products": [
    "E-commerce platform [2]",
    "Shopify Payments [2]",
    "Shopify POS [2]",
    "Shopify Shipping [2]",
    "Shopify Fulfillment Network [2]",
    "Shop Pay [2]"
  ],
  "services": [
    "Online store building [2]",
    "Payment processing [2]",
    "Shipping and fulfillment [2]",
    "Marketing tools [2]",
    "Financial services [2]"
  ]
}
```

**Product/Service Fields:**
- `products`: Array of main products with citations
- `services`: Array of services offered with citations

### Business Model & Pricing

```json
{
  "businessModel": "Subscription-based commerce platform with additional merchant services [2]",
  "revenueModel": "Monthly/yearly subscriptions with transaction fees [2]",
  "pricingStructure": [
    {
      "name": "Basic",
      "description": "For solo entrepreneurs",
      "price": "$29/month",
      "period": "monthly",
      "features": ["Online store", "Unlimited products"],
      "citations": [2]
    },
    {
      "name": "Shopify",
      "description": "For small teams",
      "citations": [2]
    },
    {
      "name": "Advanced",
      "description": "For scaling businesses",
      "citations": [2]
    },
    {
      "name": "Plus",
      "description": "For complex business needs",
      "citations": [2]
    }
  ]
}
```

**Business Model Fields:**
- `businessModel`: How the company operates
- `revenueModel`: How the company generates revenue
- `pricingStructure`: Array of pricing tiers

### Performance Metrics

```json
{
  "performanceMetrics": [
    {
      "name": "GMV Growth",
      "value": "24%",
      "trend": "up",
      "period": "2024",
      "description": "Highest GMV growth in three years",
      "citations": [1]
    },
    {
      "name": "Monthly Recurring Revenue",
      "value": "$150M",
      "trend": "up",
      "period": "Q4 2024",
      "citations": [1]
    }
  ]
}
```

**Performance Metrics Fields:**
- `name`: Metric name
- `value`: Metric value
- `trend`: "up", "down", or "stable"
- `period`: Time period
- `description`: Metric description (optional)
- `citations`: Source citations

### Customer Information

```json
{
  "majorCustomers": [
    "BarkBox",
    "Vuori",
    "BevMo",
    "Carrier",
    "Meta",
    "SKIMS",
    "Supreme",
    "Staples",
    "Converse",
    "Glossier"
  ],
  "customerSegments": [
    "Small to medium businesses",
    "Enterprise clients",
    "Direct-to-consumer brands"
  ]
}
```

**Customer Fields:**
- `majorCustomers`: Array of notable customers
- `customerSegments`: Array of customer segments served

### Recent News & Updates

```json
{
  "recentNews": [
    {
      "title": "Shopify Merchant Success Powers Q4 Outperformance",
      "summary": "Shopify announced strong Q4 results with 31% revenue growth",
      "date": "2025-02-11",
      "source": "Shopify Press Release",
      "relevance": "high",
      "citations": [1]
    }
  ],
  "recentUpdates": [
    {
      "type": "product_launch",
      "title": "New AI-powered analytics feature",
      "date": "2024-12-15",
      "impact": "Enhanced merchant insights",
      "citations": [2]
    }
  ]
}
```

**News/Updates Fields:**
- `recentNews`: Array of recent news items
- `recentUpdates`: Array of recent company updates

### Competitive Position

```json
{
  "competitivePosition": "Market leader in SMB e-commerce [1]",
  "keyDifferentiators": [
    "Ease of use",
    "Comprehensive ecosystem",
    "Strong app store",
    "Integrated payment processing"
  ]
}
```

**Competitive Fields:**
- `competitivePosition`: Market position description
- `keyDifferentiators`: Array of key differentiators

### Sources & Citations

```json
{
  "sources": [
    {
      "id": 1,
      "url": "https://www.shopify.com/news/shopify-merchant-success-powers-q4-outperformance",
      "title": "Shopify Merchant Success Powers Q4 Outperformance",
      "domain": "www.shopify.com",
      "sourceType": "news",
      "snippet": "Shopify Inc. announced today financial results for the fourth quarter...",
      "credibilityScore": 0.67,
      "domainAuthority": 0.6,
      "author": "Shopify Share this story",
      "lastUpdated": "2025-07-14T20:12:09.999Z",
      "relevancyScore": 1
    },
    {
      "id": 2,
      "url": "https://www.shopify.com/blog/what-is-shopify",
      "title": "What Is Shopify and How Does It Work? (2025)",
      "domain": "www.shopify.com",
      "sourceType": "company",
      "snippet": "Discover how Shopify helps you sell online and in person...",
      "credibilityScore": 0.72,
      "domainAuthority": 0.6,
      "author": "Joe Hitchcock",
      "publishedDate": "2025-03-05T00:00:00.000Z",
      "lastUpdated": "2025-07-14T20:12:09.999Z",
      "relevancyScore": 1
    }
  ]
}
```

**Source Fields:**
- `id`: Source identifier used for citations
- `url`: Source URL
- `title`: Source title
- `domain`: Source domain
- `sourceType`: Type of source (news, company, financial, etc.)
- `snippet`: Relevant snippet from source
- `credibilityScore`: Credibility assessment (0-1)
- `domainAuthority`: Domain authority score (0-1)
- `author`: Content author (optional)
- `publishedDate`: Publication date (optional)
- `lastUpdated`: Last update timestamp
- `relevancyScore`: Relevance to company (0-1)

### Confidence Scores

```json
{
  "confidence": {
    "overall": 0.85,
    "financial": 0.95,
    "leadership": 0.90,
    "market": 0.85,
    "products": 0.90,
    "size": 0.70,
    "revenue": 0.95
  }
}
```

**Confidence Fields:**
- `overall`: Overall confidence in the data
- `financial`: Confidence in financial information
- `leadership`: Confidence in leadership data
- `market`: Confidence in market information
- `products`: Confidence in product/service data
- `size`: Confidence in company size information
- `revenue`: Confidence in revenue data

**Confidence Score Ranges:**
- `0.9+`: Direct, authoritative statement from official sources
- `0.7-0.9`: Strong indicators from credible sources
- `0.5-0.7`: Reasonable estimates based on available data
- `0.3-0.5`: Weak indicators, best guess
- `0.1-0.3`: Very limited or unreliable data

## Complete Example Response

```json
{
  "name": "Shopify Inc. [1]",
  "domain": "shopify.com",
  "industry": "Commerce Technology [1,2]",
  "description": "Shopify is the leading global commerce company that provides essential internet infrastructure for commerce, offering trusted tools to start, scale, market, and run retail businesses of any size [1]",
  "foundedYear": 2006,
  "financialData": {
    "stockSymbol": "SHOP",
    "stockExchange": "NYSE, TSX [1]",
    "revenue": {
      "growth": "31% (Q4 2024), 26% (FY 2024) [1]",
      "metrics": "Free Cash Flow Margin 22% Q4 2024 [1]"
    },
    "revenueGrowth": "31% YoY in Q4 2024 [1]",
    "citations": [1]
  },
  "leadership": [
    {
      "name": "Harley Finkelstein",
      "title": "President",
      "department": "Executive",
      "citations": [1]
    },
    {
      "name": "Jeff Hoffmeister",
      "title": "Chief Financial Officer",
      "department": "Executive",
      "citations": [1]
    }
  ],
  "marketData": {
    "marketSize": "$6.56 trillion by 2025 (e-commerce market) [1]",
    "marketPosition": "Leading global commerce company [1]",
    "majorCompetitors": [],
    "competitiveAdvantages": [],
    "citations": [1]
  },
  "products": [
    "E-commerce platform [2]",
    "Shopify Payments [2]",
    "Shopify POS [2]",
    "Shopify Shipping [2]",
    "Shopify Fulfillment Network [2]",
    "Shop Pay [2]"
  ],
  "services": [
    "Online store building [2]",
    "Payment processing [2]",
    "Shipping and fulfillment [2]",
    "Marketing tools [2]",
    "Financial services [2]"
  ],
  "businessModel": "Subscription-based commerce platform with additional merchant services [2]",
  "pricingStructure": [
    {
      "name": "Basic",
      "description": "For solo entrepreneurs",
      "citations": [2]
    },
    {
      "name": "Shopify",
      "description": "For small teams",
      "citations": [2]
    },
    {
      "name": "Advanced",
      "description": "For scaling businesses",
      "citations": [2]
    },
    {
      "name": "Plus",
      "description": "For complex business needs",
      "citations": [2]
    }
  ],
  "performanceMetrics": [
    {
      "name": "GMV Growth",
      "value": "24%",
      "period": "2024",
      "description": "Highest GMV growth in three years",
      "citations": [1]
    }
  ],
  "majorCustomers": [
    "BarkBox",
    "Vuori",
    "BevMo",
    "Carrier",
    "Meta",
    "SKIMS",
    "Supreme",
    "Staples",
    "Converse",
    "Glossier"
  ],
  "confidence": {
    "overall": 0.85,
    "financial": 0.95,
    "leadership": 0.90,
    "market": 0.85,
    "products": 0.90,
    "size": 0.70,
    "revenue": 0.95
  },
  "sources": [
    {
      "id": 1,
      "url": "https://www.shopify.com/news/shopify-merchant-success-powers-q4-outperformance",
      "title": "Shopify Merchant Success Powers Q4 Outperformance Across Both ...",
      "domain": "www.shopify.com",
      "sourceType": "news",
      "snippet": "Feb 11, 2025 ... Internet, Everywhere - February 11, 2025 - Shopify Inc. (NYSE, TSX: SHOP), a leading commerce technology company announced today financial results for the ...",
      "credibilityScore": 0.67,
      "domainAuthority": 0.6,
      "author": "Shopify Share this story",
      "lastUpdated": "2025-07-14T20:12:09.999Z",
      "relevancyScore": 1
    },
    {
      "id": 2,
      "url": "https://www.shopify.com/blog/what-is-shopify",
      "title": "What Is Shopify and How Does It Work? (2025) - Shopify",
      "domain": "www.shopify.com",
      "sourceType": "company",
      "snippet": "Oct 2, 2024 ... Discover how Shopify helps you sell online and in person. Explore features and pricing plans. Start your business journey with a free trial today.",
      "credibilityScore": 0.72,
      "domainAuthority": 0.6,
      "author": "Joe HitchcockPublished on Mar",
      "publishedDate": "2025-03-05T00:00:00.000Z",
      "lastUpdated": "2025-07-14T20:12:09.999Z",
      "relevancyScore": 1
    },
    {
      "id": 3,
      "url": "https://shopifyinvestors.com/financial-reports/",
      "title": "Financials - Shopify",
      "domain": "shopifyinvestors.com",
      "sourceType": "financial",
      "snippet": "8 days ago ... SEC Filings · 2025 · 2024 · 2023 · 2022 · 2021 · 2020 · 2019 · 2018 ...",
      "credibilityScore": 0.7,
      "domainAuthority": 0.7,
      "lastUpdated": "2025-07-14T20:12:10.000Z",
      "relevancyScore": 0.8
    }
  ]
}
```

## Key Requirements

1. **Citations**: All factual claims must include citation numbers in brackets [N] or [N,M]
2. **Comprehensive Coverage**: Response should include as many relevant sections as possible
3. **Authoritative Sources**: Sources should be credible and relevant to the company
4. **Confidence Scoring**: Confidence scores should reflect data quality and source reliability
5. **Structured Data**: All data should be properly structured and typed
6. **Recency**: Information should be as recent as possible with appropriate timestamps

## Fallback Behavior

If insufficient data is available, the endpoint should return:
- Basic company information with low confidence scores
- Available sources even if limited
- Clear indication of data limitations through confidence scores
- Minimal required fields: name, domain, industry, description, confidence, sources

## Performance Expectations

- **Processing Time**: 1-2 minutes for comprehensive analysis
- **Source Count**: 3-20 authoritative sources
- **Confidence Threshold**: Overall confidence should be >0.7 for high-quality responses
- **Data Freshness**: Sources should be recent (within 1-2 years) when possible 