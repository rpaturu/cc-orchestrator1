# Snov.io Integration Summary

## Overview

Successfully implemented comprehensive Snov.io service integration into the Sales Intelligence platform, providing advanced email intelligence and contact discovery capabilities.

## Implementation Components

### 1. Core SnovService (`src/services/serpapi/snov/SnovService.ts`)

**Key Features:**
- OAuth-based authentication with automatic token refresh
- Rate limiting (60 requests/minute) with intelligent backoff
- Comprehensive error handling with retry logic
- Automatic caching with appropriate TTL based on data type
- Support for all major Snov.io API endpoints

**Implemented Methods:**
- `findEmails()` - Find emails for a domain with position/department filtering
- `verifyEmails()` - Bulk email verification with confidence scoring
- `searchDomain()` - Domain-wide email search with pagination
- `enrichData()` - Profile enrichment using email/name/domain
- `enrichLinkedIn()` - LinkedIn profile enrichment
- `bulkFindEmails()` - Asynchronous bulk email discovery
- `bulkVerifyEmails()` - Asynchronous bulk email verification
- `getBulkJobStatus()` - Monitor bulk operation progress
- `healthCheck()` - Service health validation

**Configuration:**
```typescript
interface SnovConfig {
  apiKey: string;          // From SNOV_API_KEY env var
  apiSecret: string;       // From SNOV_API_SECRET env var
  baseUrl?: string;        // Default: https://api.snov.io/v1
  rateLimitPerMinute?: number;  // Default: 60
  retryAttempts?: number;  // Default: 3
  timeoutMs?: number;      // Default: 30000
}
```

### 2. DataCollectionEngine Integration

**New Source Types Supported:**
- `snov_email_finder` - Email discovery for domains
- `snov_email_verifier` - Email verification service
- `snov_domain_search` - Domain-wide email search
- `snov_data_enrichment` - Profile data enrichment
- `snov_linkedin_enrichment` - LinkedIn profile enrichment
- `snov_bulk_email_finder` - Bulk email discovery (async)
- `snov_bulk_email_verifier` - Bulk email verification (async)

**Data Collection Methods:**
- `collectSnovData()` - Primary contact collection using email finder + domain search
- `collectSnovEmailVerification()` - Email validation for sample addresses
- `collectSnovDomainSearch()` - Comprehensive domain email search
- `collectSnovDataEnrichment()` - Executive profile enrichment
- `collectSnovLinkedInEnrichment()` - LinkedIn profile data extraction
- `collectSnovBulkEmailFinder()` - Large-scale email discovery
- `collectSnovBulkEmailVerifier()` - Large-scale email validation

### 3. Dataset Requirements Integration

**Updated Dataset Requirements:**
- Added Snov.io sources to 30+ datasets in `DATASET_REQUIREMENTS_MAP`
- Integrated cost optimization with `cost_tier`, `cost_per_quality`, `fallback_priority`
- Established redundancy rules with SerpAPI and Bright Data sources
- Configured appropriate cache TTL and quality thresholds

**Key Datasets Enhanced:**
- `decision_makers` - Executive contact discovery
- `email_intelligence` - New dataset for email verification and enrichment
- `leadership_team` - C-suite and VP-level contact collection
- `sales_contacts` - Sales team identification
- `marketing_contacts` - Marketing team discovery

### 4. Caching Strategy

**Cache Types:**
- `SNOV_CONTACTS_RAW` - Contact discovery results (24-hour TTL)
- `SNOV_VERIFICATION_RAW` - Email verification results (7-day TTL)
- Access token caching (50-minute TTL)

**Cache Keys:**
- `snov_email_finder_{domain}_{params}` - Email finder results
- `snov_email_verifier_{emails}` - Verification results
- `snov_domain_search_{domain}_{params}` - Domain search results
- `snov_access_token_{apiKey}` - OAuth access tokens

### 5. Testing Integration

**Enhanced `./test-api` Script:**
- **Option 6**: Research Streaming - SSE (tests SSE with Snov.io data sources)
- **Option 7**: Snov.io Email Finder (tests email discovery via data collection)
- **Option 8**: Snov.io Email Verification (tests email validation)
- **Option 9**: Snov.io Domain Search (tests domain-wide search)

**API Endpoints & Expected Responses:**

#### **Research Streaming - SSE Workflow**
**POST** `/api/research/stream`

**Request:**
```bash
curl -X POST "$API_ENDPOINT/api/research/stream?areaId=decision_makers&companyId=shopify.com" \
  -H "X-API-Key: $API_KEY"
```

**Response:**
```json
{
  "researchSessionId": "cc8b4622-80e5-2e00-5426-0f56-decision_makers-shopify.com",
  "areaId": "decision_makers",
  "companyId": "shopify.com",
  "status": "initiated",
  "message": "Research session created successfully"
}
```

**GET** `/api/research/stream/{researchSessionId}/result`

**Response:**
```json
{
  "researchSessionId": "cc8b4622-80e5-2e00-5426-0f56-decision_makers-shopify.com",
  "areaId": "decision_makers",
  "companyId": "shopify.com",
  "results": {
    "contacts": [
      {
        "email": "tobi.lutke@shopify.com",
        "firstName": "Tobi",
        "lastName": "Lütke",
        "position": "CEO",
        "department": "executive",
        "linkedin": "https://linkedin.com/in/tobi",
        "verified": true,
        "confidence": 0.95
      },
      {
        "email": "harley.finkelstein@shopify.com",
        "firstName": "Harley",
        "lastName": "Finkelstein",
        "position": "President",
        "department": "executive",
        "verified": true,
        "confidence": 0.92
      }
    ],
    "totalFound": 25,
    "verifiedCount": 23,
    "sources": ["snov_email_finder", "snov_domain_search", "snov_email_verifier"]
  }
}
```

#### **Snov.io Email Finder**
**Internal Data Collection Trigger**

**Expected Response:**
```json
{
  "source": "snov_email_finder",
  "domain": "shopify.com",
  "contacts": [
    {
      "email": "tobi.lutke@shopify.com",
      "firstName": "Tobi",
      "lastName": "Lütke",
      "position": "CEO",
      "type": "personal",
      "confidence": 0.95,
      "sources": ["linkedin", "public_records"]
    },
    {
      "email": "careers@shopify.com",
      "firstName": "Shopify",
      "lastName": "Careers",
      "position": "Careers Team",
      "type": "generic",
      "confidence": 0.85,
      "sources": ["domain_search", "website_crawl"]
    }
  ],
  "totalFound": 45,
  "timestamp": "2025-01-17T10:30:15Z"
}
```

#### **Snov.io Email Verification**
**Internal Data Collection Trigger**

**Expected Response:**
```json
{
  "source": "snov_email_verifier",
  "domain": "shopify.com",
  "verificationResults": [
    {
      "email": "info@shopify.com",
      "status": "valid",
      "confidence": 0.95,
      "reason": "mailbox_exists"
    },
    {
      "email": "contact@shopify.com",
      "status": "valid",
      "confidence": 0.92,
      "reason": "deliverable"
    },
    {
      "email": "support@shopify.com",
      "status": "catch-all",
      "confidence": 0.70,
      "reason": "catch_all_detected"
    }
  ],
  "validEmails": [
    {
      "email": "info@shopify.com",
      "status": "valid",
      "confidence": 0.95
    },
    {
      "email": "contact@shopify.com",
      "status": "valid",
      "confidence": 0.92
    }
  ],
  "timestamp": "2025-01-17T10:30:10Z"
}
```

#### **Snov.io Domain Search**
**Internal Data Collection Trigger**

**Expected Response:**
```json
{
  "source": "snov_domain_search",
  "domain": "shopify.com",
  "companyName": "Shopify Inc.",
  "emails": [
    {
      "email": "tobi.lutke@shopify.com",
      "firstName": "Tobi",
      "lastName": "Lütke",
      "position": "Chief Executive Officer",
      "socialUrl": "https://linkedin.com/in/tobi",
      "companyName": "Shopify"
    },
    {
      "email": "harley.finkelstein@shopify.com",
      "firstName": "Harley",
      "lastName": "Finkelstein",
      "position": "President",
      "socialUrl": "https://linkedin.com/in/harleyf",
      "companyName": "Shopify"
    },
    {
      "email": "amy.shapero@shopify.com",
      "firstName": "Amy",
      "lastName": "Shapero",
      "position": "CFO",
      "companyName": "Shopify"
    }
  ],
  "totalEmails": 50,
  "timestamp": "2025-01-17T10:30:12Z"
}
```

**Response Characteristics:**
- **Contact Volume**: 20-100 contacts per domain depending on company size
- **Confidence Scores**: 0.7-0.95 for high-quality contacts
- **Response Times**: 5-30 seconds depending on data complexity
- **Data Sources**: Combines Snov.io, LinkedIn, public records, website crawling

## Integration Benefits

### 1. Enhanced Contact Discovery
- **Email Finding**: Discover executive and team member emails by domain
- **Position Filtering**: Target specific roles (CEO, CTO, Sales Director, etc.)
- **Department Filtering**: Focus on sales, marketing, engineering teams
- **Confidence Scoring**: Quality assessment for each discovered contact

### 2. Email Intelligence
- **Verification**: Validate email deliverability before outreach
- **Enrichment**: Add social profiles, location, and company data
- **LinkedIn Integration**: Extract comprehensive professional profiles
- **Bulk Operations**: Process large contact lists efficiently

### 3. Cost Optimization
- **Tiered Pricing**: Primary (Snov.io) → Secondary (SerpAPI) → Tertiary (Bright Data)
- **Quality Metrics**: Cost-per-quality optimization (Snov.io: $0.015/point)
- **Caching Strategy**: Minimize API calls through intelligent caching
- **Fallback Rules**: Automatic failover to alternative sources

### 4. Seamless Integration
- **Research Areas**: Automatically triggered during customer intelligence research
- **SSE Streaming**: Real-time progress updates for contact discovery
- **Cache Management**: Consistent with existing cache architecture
- **Error Handling**: Graceful degradation with detailed logging

## Environment Configuration

**Required Environment Variables in `.env.local`:**
```bash
# Snov.io API credentials
SNOV_API_KEY=your_snov_api_key
SNOV_API_SECRET=your_snov_api_secret

# Optional configuration
SNOV_BASE_URL=https://api.snov.io/v1
```

**Enhanced Deploy Script:**
The `./deploy` script now automatically:
- Reads Snov.io credentials from `.env.local`
- Passes credentials to CDK via context parameters
- Sets up Lambda environment variables
- Stores credentials in AWS Secrets Manager
- Provides deployment status and test commands

**Deployment Process:**
```bash
# Ensure credentials are in .env.local
echo "SNOV_API_KEY=your_key" >> .env.local
echo "SNOV_API_SECRET=your_secret" >> .env.local

# Deploy with automatic Snov.io integration
./deploy

# Expected output includes:
# "Using Snov.io API Key: [HIDDEN]"
# "📧 Email Intelligence: ✅ Snov.io integration enabled"
```

## Next Steps

### Immediate
1. **Deployment**: Deploy with Snov.io credentials configured
2. **Testing**: Validate integration using `./test-api` options 6-9
3. **Monitoring**: Monitor API usage and cost optimization

### Future Enhancements
1. **Webhook Integration**: Real-time notifications for bulk operations
2. **Advanced Filtering**: Industry, company size, technology stack filters
3. **Social Media Integration**: Twitter, Facebook profile enrichment
4. **Custom Audiences**: Build targeted prospect lists
5. **CRM Integration**: Direct export to Salesforce, HubSpot, etc.

## Architecture Impact

### Data Flow
```
Research Request → DataCollectionEngine → SnovService → Snov.io API
                                     ↓
                                 CacheService (DynamoDB)
                                     ↓
                               Research Results (SSE)
```

### Cost Structure
- **Snov.io**: $350/year → ~$0.96/day → Primary email intelligence
- **SerpAPI**: $40/month → $1.33/day → Secondary search augmentation  
- **Bright Data**: Usage-based → Tertiary comprehensive data

### Quality Metrics
- **Snov.io Reliability**: 0.85 (primary contact source)
- **Cache TTL**: 24 hours (contacts) / 7 days (verification)
- **Expected Cost per Quality**: $0.015 per quality point

## Conclusion

The Snov.io integration significantly enhances the platform's contact discovery and email intelligence capabilities while maintaining cost efficiency through intelligent source prioritization and caching. The implementation follows established patterns and integrates seamlessly with existing research workflows and SSE streaming infrastructure.
