# Company Discovery Endpoint Specification

## Quick Summary

### 🚀 Key Features
- **GET endpoint** with automatic discovery research
- **Medium-speed processing** (15-30 seconds)
- **Discovery-focused intelligence** for sales preparation
- **Automated 3-query strategy** (challenges, opportunities, contacts)
- **Ready-to-use insights** for immediate sales conversations

### 📈 When to Use
- **Initial account research** before first contact
- **Sales call preparation** and discovery planning
- **Lead qualification** and opportunity sizing
- **Quick company intelligence** for prospecting
- **Stakeholder mapping** and contact identification

### ⚖️ Comparison with Other Endpoints
| Aspect | Discovery | Analysis | Overview |
|--------|-----------|----------|----------|
| **Method** | GET | POST | GET (async) |
| **Input** | Automatic research | Search results required | Automatic research |
| **Speed** | 15-30 seconds | 30-60 seconds | 60+ seconds |
| **Depth** | Focused insights | Deep AI analysis | Comprehensive data |
| **Use Case** | Initial research | Advanced analysis | Complete overview |

---

## Endpoint: `GET /company/{domain}/discovery`

This document defines the expected response structure for the discovery insights endpoint.

## Overview

The discovery endpoint provides **focused sales intelligence** specifically designed for the **discovery phase** of the sales process. It's a "medium-speed" endpoint that combines automated search with AI analysis to extract key insights about company challenges, opportunities, contacts, and technology stack.

## Request Structure

### Method
`GET`

### Path Parameters
- `domain`: Company domain (e.g., `shopify.com`)

### Headers
- `X-API-Key`: Required API key for authentication

### Query Parameters
None required - this endpoint automatically performs discovery-focused research.

## Response Structure

### Success Response (200)

```json
{
  "painPoints": [
    "Merchant acquisition costs rising due to market saturation",
    "Competition from Amazon and TikTok Shop intensifying",
    "Need to improve international expansion capabilities",
    "Increasing pressure on transaction fees and pricing",
    "Merchant churn in competitive segments"
  ],
  "opportunities": [
    "Expand into enterprise B2B commerce market",
    "Develop AI-powered merchant analytics platform",
    "Build stronger social commerce integrations",
    "Enhance international payment processing",
    "Create industry-specific commerce solutions"
  ],
  "keyContacts": [
    "Tobi Lütke - CEO",
    "Amy Shapero - CFO",
    "Kaz Nejatian - VP of Product",
    "Harley Finkelstein - President",
    "Jean-Michel Lemieux - CTO"
  ],
  "technologyStack": [
    "Ruby on Rails",
    "React",
    "GraphQL",
    "Kubernetes",
    "MySQL",
    "Redis",
    "Elasticsearch",
    "AWS",
    "Google Cloud Platform"
  ],
  "sources": [
    {
      "id": 1,
      "url": "https://investors.shopify.com/news/news-details/2024/Shopify-Reports-Fourth-Quarter-and-Full-Year-2024-Results",
      "title": "Shopify Reports Fourth Quarter and Full Year 2024 Results",
      "domain": "investors.shopify.com",
      "sourceType": "financial",
      "snippet": "Shopify Inc. reports strong Q4 2024 results with 31% revenue growth year-over-year, driven by merchant success and platform expansion...",
      "credibilityScore": 0.95,
      "lastUpdated": "2024-02-14T10:00:00Z"
    },
    {
      "id": 2,
      "url": "https://techcrunch.com/2024/02/01/shopify-challenges-2024",
      "title": "Shopify Faces Growing Competition in E-commerce Platform Market",
      "domain": "techcrunch.com",
      "sourceType": "news",
      "snippet": "As the e-commerce platform market matures, Shopify confronts increasing competition from established players like Amazon and emerging social commerce platforms...",
      "credibilityScore": 0.82,
      "lastUpdated": "2024-02-01T14:30:00Z"
    },
    {
      "id": 3,
      "url": "https://www.linkedin.com/company/shopify/people/",
      "title": "Shopify Leadership Team",
      "domain": "linkedin.com",
      "sourceType": "social",
      "snippet": "Key leadership at Shopify includes CEO Tobi Lütke, CFO Amy Shapero, and President Harley Finkelstein, driving the company's growth strategy...",
      "credibilityScore": 0.78,
      "lastUpdated": "2024-02-10T09:15:00Z"
    },
    {
      "id": 4,
      "url": "https://shopify.engineering/tech-stack",
      "title": "Shopify's Engineering Stack and Architecture",
      "domain": "shopify.engineering",
      "sourceType": "company",
      "snippet": "Shopify's platform is built on Ruby on Rails with React frontends, using GraphQL APIs and Kubernetes for scalability...",
      "credibilityScore": 0.92,
      "lastUpdated": "2024-01-15T11:20:00Z"
    }
  ],
  "requestId": "req_discovery_67890"
}
```

## Key Features

### 1. **Discovery-Focused Research**
- Automatically performs 3 strategic searches:
  - Company challenges and problems
  - Growth initiatives and opportunities  
  - Leadership team and key contacts

### 2. **Pain Point Identification**
- Current business challenges
- Market pressures and competitive threats
- Operational inefficiencies
- Technology gaps and limitations
- Strategic obstacles

### 3. **Opportunity Mapping**
- Growth initiatives and expansion plans
- New market opportunities
- Technology modernization needs
- Partnership and collaboration possibilities
- Innovation areas and R&D focus

### 4. **Key Contact Discovery**
- Executive leadership team
- Decision makers and influencers
- Department heads and managers
- Technical leaders and architects
- Procurement and vendor management contacts

### 5. **Technology Stack Analysis**
- Current technology infrastructure
- Development frameworks and tools
- Cloud platforms and services
- Database and storage solutions
- Integration and API technologies

## Use Cases

### Sales Discovery Phase
- **Initial Research**: Understand company challenges before first contact
- **Preparation**: Gather talking points for discovery calls
- **Qualification**: Identify fit and opportunity size
- **Stakeholder Mapping**: Understand decision-making structure

### Account Research
- **Competitive Analysis**: Understand competitive landscape
- **Solution Mapping**: Align solutions with identified pain points
- **Approach Strategy**: Develop targeted outreach approach
- **Value Proposition**: Craft relevant value propositions

### Relationship Building
- **Contact Identification**: Find the right people to engage
- **Conversation Starters**: Use pain points and opportunities
- **Credibility Building**: Reference authoritative sources
- **Timing**: Understand current initiatives and priorities

## Performance Characteristics

- **Response Time**: 15-30 seconds (optimized for discovery)
- **Timeout**: 2 minutes maximum
- **Search Strategy**: 3 focused queries for comprehensive coverage
- **Content Processing**: Analyzes filtered, relevant content
- **AI Model**: AWS Bedrock Claude for insight extraction
- **Caching**: Results cached for 4 hours in production

## Data Sources

### Primary Sources
- **Company websites**: Official information and press releases
- **Financial reports**: Investor relations and SEC filings
- **News articles**: Industry publications and business news
- **Social media**: LinkedIn profiles and company pages
- **Technical blogs**: Engineering and product updates

### Source Prioritization
1. **Official company sources** (highest credibility)
2. **Financial and investor relations** (high credibility)
3. **Established news outlets** (medium-high credibility)
4. **Industry publications** (medium credibility)
5. **Social media and blogs** (medium credibility)

## Error Responses

### 400 Bad Request
```json
{
  "error": "Company domain is required in path",
  "requestId": "req_discovery_error_123"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid API key",
  "requestId": "req_discovery_error_124"
}
```

### 404 Not Found
```json
{
  "error": "Company not found or insufficient data available",
  "requestId": "req_discovery_error_125"
}
```

### 500 Internal Server Error
```json
{
  "error": "Discovery insights generation failed",
  "message": "Unable to process company data",
  "requestId": "req_discovery_error_126"
}
```

## Rate Limits

- **100 requests per minute** per API key
- **200 burst capacity**
- Discovery endpoints balance speed with comprehensive analysis

## Comparison with Other Endpoints

### Discovery vs. Overview
- **Discovery**: Focused on sales intelligence and immediate actionable insights
- **Overview**: Comprehensive business intelligence with financial, market, and operational data

### Discovery vs. Analysis
- **Discovery**: Automated research with predefined focus areas
- **Analysis**: Deep AI analysis of provided search results with customizable context

### Discovery vs. Search
- **Discovery**: Processed insights ready for sales conversations
- **Search**: Raw search results requiring additional analysis

## Best Practices

### 1. **Timing Usage**
- Use early in the sales process for initial research
- Refresh insights periodically for updated information
- Combine with other endpoints for comprehensive intelligence

### 2. **Insight Application**
- **Pain Points**: Use as conversation starters and problem validation
- **Opportunities**: Align with your solution capabilities
- **Contacts**: Prioritize outreach based on influence and relevance
- **Technology**: Identify integration points and technical fit

### 3. **Source Validation**
- Review source credibility scores for reliability assessment
- Cross-reference insights across multiple sources
- Prioritize recent information for current relevance

### 4. **Follow-up Research**
- Use specific insights to drive targeted search queries
- Combine with analysis endpoint for deeper investigation
- Validate insights through direct engagement when possible

## Integration Examples

### CRM Integration
```javascript
// Fetch discovery insights for account research
const insights = await salesAPI.getDiscoveryInsights('shopify.com');

// Update CRM with pain points and opportunities
await crm.updateAccount(accountId, {
  painPoints: insights.painPoints,
  opportunities: insights.opportunities,
  keyContacts: insights.keyContacts
});
```

### Sales Automation
```javascript
// Automated discovery for new leads
const leads = await getNewLeads();
for (const lead of leads) {
  const insights = await salesAPI.getDiscoveryInsights(lead.domain);
  await enrichLead(lead, insights);
  await prioritizeLead(lead, insights.opportunities);
}
```

## Security & Compliance

- **Public Information Only**: Analyzes publicly available data
- **No Personal Data**: Focuses on business intelligence, not personal information
- **Fair Use Compliance**: Follows fair use guidelines for research purposes
- **Data Retention**: Cached results follow data retention policies
- **Privacy Respect**: Respects robots.txt and site policies

## Roadmap & Future Enhancements

### Planned Features
- **Real-time Updates**: Continuous monitoring of company changes
- **Industry-Specific Insights**: Tailored analysis for different verticals
- **Competitive Intelligence**: Deeper competitive analysis integration
- **Predictive Analytics**: Forecasting based on current trends
- **Multi-language Support**: Global company analysis capabilities 