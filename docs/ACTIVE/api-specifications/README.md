# API Specifications

This directory contains detailed specifications for all Sales Intelligence Orchestrator API endpoints.

## 📋 Endpoint Overview

| Endpoint | Pattern | Purpose | Handler |
|----------|---------|---------|---------|
| Overview | Async | Company overview with snippet-first approach | `OverviewHandler` |
| Discovery | Async | Sales discovery insights for prospecting | `DiscoveryHandler` |
| Analysis | Async | Deep AI analysis of search results | `AnalysisHandler` |
| Search | Sync | Raw search results with optional context | `SearchHandler` |

## 📄 Specifications

### 🏢 [Overview Endpoint](./overview-endpoint-specification.md)
- **Purpose**: Comprehensive company overview generation
- **Pattern**: Async (~1 min processing)
- **Response**: Company details, growth indicators, sources
- **Implementation**: `OverviewHandler` + `OverviewResponseFormatter`

### 🎯 [Discovery Endpoint](./discovery-endpoint-specification.md)
- **Purpose**: Sales discovery insights for prospecting
- **Pattern**: Async (~3 min processing)
- **Response**: Pain points, opportunities, key contacts, tech stack
- **Implementation**: `DiscoveryHandler` + `DiscoveryResponseFormatter`

### 🔍 [Analysis Endpoint](./analysis-endpoint-specification.md)
- **Purpose**: Deep AI analysis of search results
- **Pattern**: Async (~5 min processing)
- **Response**: Full sales intelligence with insights
- **Implementation**: `AnalysisHandler` + `AnalysisResponseFormatter`

### 🔎 [Search API Modes](./search-api-modes.md)
- **Purpose**: Fast search with optional relationship context
- **Pattern**: Sync (<2s response)
- **Response**: Raw search results with metadata
- **Implementation**: `SearchHandler` + `SearchResponseFormatter`

### 🚀 [Async Endpoints Summary](./async-endpoints-summary.md)
- **Purpose**: Comprehensive guide to async pattern implementation
- **Pattern**: Async request/response flow
- **Response**: Usage examples, migration guide, performance comparison
- **Implementation**: All async endpoints follow consistent pattern

## 🔧 Implementation Status

- ✅ **Overview Endpoint** - Fully implemented with async pattern and caching
- ✅ **Discovery Endpoint** - Implemented with async pattern and enhanced response structure
- ✅ **Analysis Endpoint** - Implemented with async pattern and comprehensive insights
- ✅ **Search Endpoint** - Implemented with sync pattern and relationship-aware queries

## 📊 Common Patterns

### Request Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

### Error Response Format
```json
{
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2024-01-XX",
  "endpoint": "/api/endpoint"
}
```

### Success Response Metadata
All endpoints include:
- `generatedAt`: Response generation timestamp
- `sources`: Array of authoritative sources
- `confidenceScore`: AI confidence level (0-1)
- `cacheKey`: Unique cache identifier

## 🚀 Usage Examples

Each specification includes:
- Complete request/response examples
- Error handling scenarios
- Rate limiting considerations
- Caching behavior
- Performance characteristics

---

*These specifications reflect the current implementation in the Sales Intelligence Orchestrator.* 