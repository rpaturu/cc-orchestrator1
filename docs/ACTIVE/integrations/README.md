# External Integrations Documentation

This directory contains documentation for third-party service integrations and external APIs used by the Sales Intelligence platform.

## 📋 Integration Overview

The Sales Intelligence platform integrates with several external services to provide comprehensive company data and insights:

### 🔍 **Search & Data Providers**
- **SerpAPI** - Primary search and knowledge graph data
- **Google Knowledge Graph** - Structured company information
- **Bright Data** - Web scraping and data collection
- **Google Custom Search** - Additional search capabilities

### ☁️ **AWS Services**
- **DynamoDB** - Primary database with TTL
- **Lambda** - Serverless computing
- **API Gateway** - REST API management
- **CloudWatch** - Monitoring and logging

## 📁 Integration Documentation

### 🐍 [SerpAPI Integration](./serpapi/)
Comprehensive documentation for SerpAPI integration:
- Authentication and API key management
- Search endpoints and parameters
- Knowledge graph data extraction
- Caching strategy for SerpAPI responses
- Rate limiting and error handling

### 🔍 **Google Knowledge Graph** *(Coming Soon)*
Documentation for Google Knowledge Graph API:
- Entity search and lookup
- Data structure mapping
- Quality assessment
- Usage optimization

### 🌐 **AWS Services Integration** *(Coming Soon)*
AWS service configuration and best practices:
- DynamoDB table design and TTL configuration
- Lambda function optimization
- API Gateway CORS and security
- CloudWatch monitoring setup

## 🔧 Integration Architecture

### Data Flow
```
User Request → API Gateway → Lambda → Multiple Data Sources → Cache → Response
                                    ↓
                            [SerpAPI, Google KG, Bright Data]
                                    ↓
                            DynamoDB (with TTL)
```

### Caching Strategy
Each integration has optimized caching based on data characteristics:
- **SerpAPI Raw Responses**: 6 hours (production)
- **Google Knowledge Graph**: 24-48 hours
- **Company Profiles**: 72 hours (highest retention)

See [Cache TTL Configuration](../architecture/cache-ttl-configuration.md) for details.

## 🔑 API Key Management

### Environment Variables
```bash
# Required API keys
SERPAPI_API_KEY=your_serpapi_key
GOOGLE_API_KEY=your_google_api_key
BRIGHT_DATA_API_KEY=your_bright_data_key

# AWS Configuration
AWS_REGION=us-west-2
CACHE_TABLE_NAME=sales-intelligence-cache
```

### Security Best Practices
- Store API keys in AWS Secrets Manager (production)
- Use environment variables for development
- Rotate keys regularly
- Monitor API usage and quotas

## 📊 Integration Monitoring

### Key Metrics
- **API Response Times**: Track latency per provider
- **Success Rates**: Monitor error rates and timeouts
- **Usage Quotas**: Track API usage against limits
- **Cache Hit Rates**: Optimize for cost and performance

### Error Handling
- **Graceful Degradation**: Continue with available data sources
- **Retry Logic**: Implement exponential backoff
- **Fallback Sources**: Use alternative providers when primary fails
- **Error Logging**: Comprehensive error tracking in CloudWatch

## 🧪 Testing Integrations

### SerpAPI Testing
```bash
./test-api
# Option 7: Company Lookup (tests SerpAPI integration)
# Option 12: Cache Statistics (verify caching)
```

### Integration Health Checks
```bash
./test-api
# Option 1: Health Check (tests all integrations)
```

### Data Quality Validation
- Test with known companies (Tier 1: Shopify, Tesla, Microsoft)
- Verify data consistency across providers
- Check response format compliance

## 🔗 Integration Dependencies

### Primary Dependencies
```json
{
  "@aws-sdk/client-dynamodb": "^3.x",
  "@aws-sdk/lib-dynamodb": "^3.x",
  "axios": "^1.x",
  "node-fetch": "^3.x"
}
```

### Configuration Files
- `src/services/SerpAPIService.ts` - SerpAPI integration
- `src/services/GoogleKnowledgeGraphService.ts` - Google KG
- `src/services/core/CacheService.ts` - Cache management
- `src/stacks/sales-intelligence-stack.ts` - AWS infrastructure

## 🚨 Common Integration Issues

### SerpAPI Issues
- **Rate Limiting**: Implement proper request throttling
- **API Key Errors**: Verify key configuration and quota
- **Response Format Changes**: Monitor for API updates

### Cache Issues
- **TTL Expiration**: Check cache configuration
- **Connection Errors**: Verify DynamoDB connectivity
- **Performance**: Monitor cache hit rates

### AWS Issues
- **Permission Errors**: Check IAM roles and policies
- **Region Configuration**: Verify AWS region settings
- **Resource Limits**: Monitor Lambda and DynamoDB limits

## 🔄 Integration Updates

### Monitoring for Changes
- Subscribe to provider API change notifications
- Regular testing with known data sets
- Version compatibility checks

### Update Procedures
1. Test changes in development environment
2. Update integration documentation
3. Deploy with gradual rollout
4. Monitor performance and error rates

## 🔗 Related Documentation

- [Architecture Overview](../architecture/README.md) - System design
- [Cache Management](../operations/cache-management-guide.md) - Cache operations
- [API Testing](../testing/api-testing-guide.md) - Integration testing
- [Development Setup](../development/setup-guide.md) - Local configuration

---

*External integration documentation for robust and reliable data sourcing.* 