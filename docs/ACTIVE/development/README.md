# Development Documentation

This directory contains developer guides and implementation details for the Sales Intelligence platform.

## 📋 Documents

### 🚀 [Setup Guide](./setup-guide.md)
Complete guide for setting up your local development environment:
- Prerequisites and dependencies
- Environment configuration
- Local DynamoDB setup
- Development server startup
- Testing and debugging procedures

### 🚢 [Deployment Guide](./deployment-guide.md)
Production deployment procedures and best practices:
- Pre-deployment checks
- CDK deployment process
- Environment-specific configurations
- Post-deployment verification
- Rollback procedures
- Monitoring and troubleshooting

### 📝 [Contributing Guidelines](./contributing.md) *(Coming Soon)*
Code contribution standards and review process:
- Coding standards and style guide
- Git workflow and branching strategy
- Pull request guidelines
- Documentation requirements
- Testing requirements

## 🛠️ Development Workflow

### 1. **Initial Setup**
```bash
# Clone and setup
git clone <repository-url>
cd cc-orchestrator1
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development
npm run dev
```

### 2. **Development Process**
```bash
# Run tests during development
npm test

# Test API changes
./test-api

# Check cache behavior
./test-api # Option 12 (Cache Statistics)
```

### 3. **Pre-commit Checklist**
- [ ] All tests passing (`npm test`)
- [ ] API endpoints tested (`./test-api`)
- [ ] TypeScript compilation clean (`npm run build`)
- [ ] Documentation updated if needed

### 4. **Deployment Process**
```bash
# Pre-deployment validation
npm test
npm run build
cdk diff

# Deploy
./deploy

# Post-deployment verification
./test-api # Options 1, 11, 12
```

## 🏗️ Architecture Overview

### Key Components
- **Cache System**: Optimized TTL-based caching with type differentiation
- **API Gateway**: RESTful endpoints with CORS support
- **Lambda Functions**: Serverless business logic
- **DynamoDB**: Primary data storage with TTL
- **External APIs**: SerpAPI, Google Knowledge Graph

### Important Files
- `src/services/core/CacheService.ts` - Cache management with TTL optimization
- `src/services/handlers/` - API endpoint handlers
- `src/services/CompanyEnrichmentService.ts` - Company data enrichment
- `src/stacks/sales-intelligence-stack.ts` - AWS infrastructure

## 🧪 Testing During Development

### Local Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Interactive API testing
./test-api
```

### Cache Testing
```bash
# Test cache behavior
./test-api
# Option 7: Test company lookup (cache miss)
# Option 7: Test same company (cache hit)
# Option 12: Verify cache statistics
```

### Quality Assurance
- Test with [Data Quality Testing Strategy](../testing/data-quality-testing-strategy.md)
- Verify cache TTL behavior
- Check response times and performance

## 🔧 Development Tools

### Essential Tools
- **Node.js 18+** - Runtime environment
- **TypeScript** - Primary language
- **AWS CDK** - Infrastructure as code
- **AWS CLI** - AWS service management
- **Docker** - Local DynamoDB (optional)

### IDE Recommendations
- **VS Code** with TypeScript extensions
- **IntelliJ** with Node.js plugin
- **AWS Toolkit** for CDK support

### Debugging
- **CloudWatch Logs** - Production debugging
- **Local DynamoDB** - Cache testing
- **test-api script** - Interactive testing

## 📊 Performance Considerations

### Cache Optimization
- Use appropriate [Cache TTL Configuration](../architecture/cache-ttl-configuration.md)
- Monitor cache hit rates
- Balance storage costs vs performance

### API Performance
- Target response times: < 2s uncached, < 500ms cached
- Implement proper error handling
- Use efficient data structures

## 🔗 Related Documentation

- [Architecture Documentation](../architecture/) - System design
- [API Specifications](../api-specifications/) - Endpoint details
- [Testing Documentation](../testing/) - Quality assurance
- [Operations Documentation](../operations/) - Production maintenance

## 📞 Development Support

### Common Issues
- **Cache Problems**: See [Cache Management Guide](../operations/cache-management-guide.md)
- **API Issues**: See [API Testing Guide](../testing/api-testing-guide.md)
- **Deployment Issues**: Check CloudWatch logs and CDK output

### Getting Help
1. Check existing documentation
2. Review test results and logs
3. Use the interactive test script for debugging
4. Consult architecture documentation for system understanding

---

*Developer resources for building and maintaining the Sales Intelligence platform.* 