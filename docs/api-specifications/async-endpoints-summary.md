# Async Endpoints Summary

All complex endpoints now follow a consistent async pattern for better performance and user experience.

## 🔄 **Async Pattern Overview**

### Flow
1. **Submit Request** → Get immediate `requestId`
2. **Check Status** → Use `requestId` to check processing status
3. **Get Results** → Retrieve results when `status: 'completed'`

### Benefits
- **No timeouts** - Requests process in background
- **Better UX** - Immediate response with tracking
- **Consistent** - All complex endpoints work the same way
- **Scalable** - Better resource utilization

## 📋 **Async Endpoints**

| Endpoint | Method | Path | Time | Description |
|----------|--------|------|------|-------------|
| **Overview** | `GET` | `/company/{domain}/overview-async` | ~1 min | Company overview with snippet-first approach |
| **Discovery** | `GET` | `/company/{domain}/discovery-async` | ~3 min | Sales discovery insights |
| **Analysis** | `POST` | `/company/{domain}/analysis-async` | ~5 min | AI analysis of search results |

## 🔍 **Status Checking**

### Get Request Status
```http
GET /requests/{requestId}
```

### Response States
- `pending` - Request queued for processing
- `processing` - Currently being processed
- `completed` - Processing finished successfully
- `failed` - Processing failed with error

## 📖 **Usage Examples**

### 1. Company Overview Async
```bash
# Submit request
curl -X GET "https://api.example.com/company/shopify.com/overview-async" \
  -H "X-API-Key: your-api-key"

# Response
{
  "requestId": "req_abc123",
  "status": "processing",
  "message": "Company overview is being processed. Use the requestId to check status.",
  "estimatedTimeMinutes": 1,
  "statusCheckEndpoint": "/requests/req_abc123"
}

# Check status
curl -X GET "https://api.example.com/requests/req_abc123" \
  -H "X-API-Key: your-api-key"

# Response when completed
{
  "requestId": "req_abc123",
  "status": "completed",
  "companyDomain": "shopify.com",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:45Z",
  "processingTimeMs": 45000,
  "result": {
    "name": "Shopify",
    "domain": "shopify.com",
    "sources": [...],
    "confidence": { "overall": 0.95 }
  }
}
```

### 2. Discovery Insights Async
```bash
# Submit request
curl -X GET "https://api.example.com/company/shopify.com/discovery-async" \
  -H "X-API-Key: your-api-key"

# Response
{
  "requestId": "req_def456",
  "status": "processing",
  "message": "Discovery insights are being processed. Use the requestId to check status.",
  "estimatedTimeMinutes": 3,
  "statusCheckEndpoint": "/requests/req_def456"
}
```

### 3. Analysis Async
```bash
# Submit request
curl -X POST "https://api.example.com/company/shopify.com/analysis-async" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "competitive",
    "searchResults": [...]
  }'

# Response
{
  "requestId": "req_ghi789",
  "status": "processing",
  "message": "Analysis is being processed. Use the requestId to check status.",
  "estimatedTimeMinutes": 5,
  "statusCheckEndpoint": "/requests/req_ghi789"
}
```

## 🛠️ **Implementation Details**

### Lambda Functions
- `sales-intelligence-overview-async` - Accepts overview requests
- `sales-intelligence-process-overview` - Processes overview in background
- `sales-intelligence-discovery-async` - Accepts discovery requests
- `sales-intelligence-process-discovery` - Processes discovery in background
- `sales-intelligence-analysis-async` - Accepts analysis requests
- `sales-intelligence-process-analysis` - Processes analysis in background
- `sales-intelligence-get-request` - Gets request status and results

### Database Storage
- Request tracking in DynamoDB
- 24-hour TTL for automatic cleanup
- Additional data storage for analysis requests

### Error Handling
- Graceful error responses
- Failed requests marked with error details
- Proper status codes and messages

## 🚀 **Migration Guide**

### From Sync to Async

**Before (Sync):**
```javascript
const response = await fetch('/company/shopify.com/discovery');
const insights = await response.json();
```

**After (Async):**
```javascript
// Submit request
const submitResponse = await fetch('/company/shopify.com/discovery-async');
const { requestId } = await submitResponse.json();

// Poll for completion
const checkStatus = async () => {
  const statusResponse = await fetch(`/requests/${requestId}`);
  const status = await statusResponse.json();
  
  if (status.status === 'completed') {
    return status.result;
  } else if (status.status === 'failed') {
    throw new Error(status.error);
  }
  
  // Wait and check again
  await new Promise(resolve => setTimeout(resolve, 5000));
  return checkStatus();
};

const insights = await checkStatus();
```

## 📊 **Performance Comparison**

| Endpoint | Sync Time | Async Submit | Async Total | Improvement |
|----------|-----------|--------------|-------------|-------------|
| Overview | 3s | 100ms | 60s | ✅ Immediate response |
| Discovery | 8s | 100ms | 3m | ✅ No connection blocking |
| Analysis | 15s | 100ms | 5m | ✅ No timeout risk |

---

*All async endpoints provide better reliability, user experience, and system performance compared to their synchronous counterparts.* 