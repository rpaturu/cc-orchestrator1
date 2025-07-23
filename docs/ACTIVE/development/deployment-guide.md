# Deployment Guide

## Overview

This guide covers deployment procedures for the Sales Intelligence platform to AWS infrastructure.

## Prerequisites

- AWS CLI configured with appropriate permissions
- CDK CLI installed (`npm install -g aws-cdk`)
- Environment variables configured
- Docker installed (for asset building)

## Deployment Process

### 1. Pre-deployment Checks
```bash
# Run tests
npm test

# Build TypeScript
npm run build

# Check CDK diff
cdk diff
```

### 2. Deploy Infrastructure
```bash
# Deploy with the included script
./deploy

# Or manually with CDK
cdk deploy --require-approval never
```

### 3. Post-deployment Verification
```bash
# Test API endpoints
./test-api

# Check cache statistics
# Select option 12 in test-api menu
```

## Environment Configuration

### Development
- Longer cache TTLs (7-30 days)
- Enhanced logging
- Debug mode enabled

### Production  
- Optimized cache TTLs (6-72 hours)
- Performance monitoring
- Cost optimization

## Cache Management

The system includes automatic cache management with differentiated TTL values. See [Cache TTL Configuration](../architecture/cache-ttl-configuration.md) for details.

## Monitoring

### Key Metrics
- API response times
- Cache hit rates
- DynamoDB usage
- Lambda function performance

### Alarms
- High error rates
- Timeout exceptions
- Cache miss rates

## Rollback Procedures

In case of deployment issues:

```bash
# Quick rollback using CDK
cdk deploy --previous-version

# Or redeploy from last known good commit
git checkout <last-good-commit>
./deploy
```

## Troubleshooting

### Common Issues
1. **Cache TTL Issues**: Check [TTL Configuration](../architecture/cache-ttl-configuration.md)
2. **API Key Problems**: Verify environment variables
3. **DynamoDB Errors**: Check table permissions and capacity

---

*This guide will be expanded with detailed deployment procedures and troubleshooting steps.* 