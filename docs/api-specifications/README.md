# API Specifications

This directory contains detailed specifications for all Sales Intelligence Orchestrator API endpoints.

## 📋 Endpoint Overview

| Endpoint | Speed | Purpose | Handler |
|----------|-------|---------|---------|
| Overview | Fast | Company overview with snippet-first approach | `OverviewHandler` |
| Discovery | Medium | Sales discovery insights for prospecting | `DiscoveryHandler` |
| Analysis | Slow | Deep AI analysis of search results | `AnalysisHandler` |
| Search | Fast | Raw search results with optional context | `SearchHandler` |

## 📄 Specifications

### 🏢 [Overview Endpoint](./overview-endpoint-specification.md)
- **Purpose**: Comprehensive company overview generation
- **Speed**: Fast (snippet-first approach)
- **Response**: Company details, growth indicators, sources
- **Implementation**: `OverviewHandler` + `OverviewResponseFormatter`

### 🎯 [Discovery Endpoint](./discovery-endpoint-specification.md)
- **Purpose**: Sales discovery insights for prospecting
- **Speed**: Medium (focused content processing)
- **Response**: Pain points, opportunities, key contacts, tech stack
- **Implementation**: `DiscoveryHandler` + `DiscoveryResponseFormatter`

### 🔍 [Analysis Endpoint](./analysis-endpoint-specification.md)
- **Purpose**: Deep AI analysis of search results
- **Speed**: Slow (comprehensive content analysis)
- **Response**: Full sales intelligence with insights
- **Implementation**: `AnalysisHandler` + `AnalysisResponseFormatter`

### 🔎 [Search API Modes](./search-api-modes.md)
- **Purpose**: Fast search with optional relationship context
- **Speed**: Fast (no content analysis)
- **Response**: Raw search results with metadata
- **Implementation**: `SearchHandler` + `SearchResponseFormatter`

## 🔧 Implementation Status

- ✅ **Overview Endpoint** - Fully implemented with caching
- ✅ **Discovery Endpoint** - Implemented with enhanced response structure
- ✅ **Analysis Endpoint** - Implemented with comprehensive insights
- ✅ **Search Endpoint** - Implemented with relationship-aware queries

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