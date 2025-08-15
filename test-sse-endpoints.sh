#!/bin/bash

set -e;

# Load environment variables from .env if it exists
if [ -f .env ]; then
  source .env
fi

# Load environment variables from .env.local if it exists (for local development)
if [ -f .env.local ]; then
  source .env.local
fi

# Parse arguments
AWS_PROFILE=${AWS_PROFILE:-default}
AWS_REGION=${AWS_REGION:-us-west-2}
while [[ "$#" -gt 0 ]]; do case $1 in
  --profile) AWS_PROFILE="$2"; shift;;
  --region) AWS_REGION="$2"; shift;;
  --api-url) API_ENDPOINT="$2"; shift;;
  --api-key) API_KEY="$2"; shift;;
esac; shift; done

# Check if API_ENDPOINT is set
if [ -z "$API_ENDPOINT" ]; then
  echo "Error: API_ENDPOINT is required"
  echo "Usage: ./test-sse-endpoints.sh [--profile <aws_profile>] [--region <aws_region>] [--api-url <url>] [--api-key <key>]"
  echo "Example: ./test-sse-endpoints.sh --profile dev --region us-west-2"
  echo "The script will try to read API_ENDPOINT and API_KEY from .env file first"
  echo "You can also set them as environment variables or pass them as arguments"
  exit 1
fi

# Check if API_KEY is set
if [ -z "$API_KEY" ]; then
  echo "Error: API_KEY is required"
  echo "Usage: ./test-sse-endpoints.sh [--profile <aws_profile>] [--region <aws_region>] [--api-url <url>] [--api-key <key>]"
  echo "Example: ./test-sse-endpoints.sh --profile dev --region us-west-2"
  echo "The script will try to read API_ENDPOINT and API_KEY from .env file first"
  echo "You can also set them as environment variables or pass them as arguments"
  exit 1
fi

echo "🧪 Testing Research Streaming SSE Endpoints"
echo "=========================================="
echo "API Endpoint: $API_ENDPOINT"
echo "API Key: ${API_KEY:0:8}..."
echo "AWS Profile: $AWS_PROFILE"
echo "AWS Region: $AWS_REGION"
echo ""

# Test 1: Initiate Research Session
echo -e "\n1️⃣ Testing POST /api/research/stream"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  "$API_ENDPOINT/api/research/stream?areaId=decision_makers&companyId=shopify.com&userRole=AE&userCompany=Okta")

echo "Response: $RESPONSE"

# Extract researchSessionId from response
RESEARCH_SESSION_ID=$(echo $RESPONSE | grep -o '"researchSessionId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$RESEARCH_SESSION_ID" ]; then
    echo "✅ Research Session ID: $RESEARCH_SESSION_ID"
    
    # Test 2: Get Research Status
    echo -e "\n2️⃣ Testing GET /api/research/stream/$RESEARCH_SESSION_ID/status"
    STATUS_RESPONSE=$(curl -s -X GET \
      -H "X-API-Key: $API_KEY" \
      "$API_ENDPOINT/api/research/stream/$RESEARCH_SESSION_ID/status")
    
    echo "Status Response: $STATUS_RESPONSE"
    
    # Test 3: Get Research Events (SSE)
    echo -e "\n3️⃣ Testing GET /api/research/stream/$RESEARCH_SESSION_ID/events"
    SSE_RESPONSE=$(curl -s -X GET \
      -H "X-API-Key: $API_KEY" \
      "$API_ENDPOINT/api/research/stream/$RESEARCH_SESSION_ID/events")
    echo "SSE Response (should show progress_update event):"
    echo "$SSE_RESPONSE"
    
    # Test 4: Get Research Results
    echo -e "\n4️⃣ Testing GET /api/research/stream/$RESEARCH_SESSION_ID/result"
    RESULT_RESPONSE=$(curl -s -X GET \
      -H "X-API-Key: $API_KEY" \
      "$API_ENDPOINT/api/research/stream/$RESEARCH_SESSION_ID/result")
    
    echo "Result Response: $RESULT_RESPONSE"
    
else
    echo "❌ Failed to get Research Session ID"
fi

echo -e "\n✅ SSE Endpoint Testing Complete!"
echo ""
echo "📚 For more information, see: docs/CURRENT/backend-sse-implementation-summary.md"
