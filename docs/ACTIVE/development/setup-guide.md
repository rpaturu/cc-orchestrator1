# Development Setup Guide

## Prerequisites

- Node.js 18+
- AWS CLI configured
- TypeScript knowledge
- Docker (for local DynamoDB)

## Local Environment Setup

### 1. Repository Setup
```bash
git clone <repository-url>
cd cc-orchestrator1
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Configure required environment variables:
# - SERPAPI_API_KEY
# - GOOGLE_API_KEY
# - AWS_REGION
```

### 3. Local DynamoDB
```bash
# Using Docker
docker run -p 8000:8000 amazon/dynamodb-local

# Or install locally
# Follow AWS DynamoDB local installation guide
```

### 4. Development Server
```bash
npm run dev
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### API Testing
Use the included `test-api` script:
```bash
./test-api
```

## Architecture Overview

See [Architecture Documentation](../architecture/README.md) for system design details.

## Cache Management

For cache development and testing, see [Cache Management Guide](../operations/cache-management-guide.md).

---

*This guide will be expanded with detailed setup instructions.* 