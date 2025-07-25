#!/bin/bash

# Script to check Step Functions workflow status
# Usage: ./check-execution.sh <REQUEST_ID>

# Check if REQUEST_ID is provided as parameter
if [ $# -eq 0 ]; then
    echo "❌ Error: REQUEST_ID parameter is required"
    echo ""
    echo "Usage: $0 <REQUEST_ID>"
    echo ""
    echo "Example:"
    echo "  $0 fd85d694-c85f-4c16-b0c9-fd866562529e"
    echo ""
    echo "💡 Get the REQUEST_ID from your test-api output or Step Functions console"
    exit 1
fi

REQUEST_ID="$1"

echo "🔍 Checking workflow status for: $REQUEST_ID"
echo ""

# Check what the workflow status endpoint returns
echo "📊 Status endpoint response:"
curl -s -X GET "https://282jty27j5.execute-api.us-west-2.amazonaws.com/prod/workflows/$REQUEST_ID/status" \
  -H "X-API-Key: s2XGiRMmTO4hiJEHAAffn886l0LGJ8GF5cf8Nn8q" | jq .

echo ""
echo "📋 Result endpoint response:"
curl -s -X GET "https://282jty27j5.execute-api.us-west-2.amazonaws.com/prod/workflows/$REQUEST_ID/result" \
  -H "X-API-Key: s2XGiRMmTO4hiJEHAAffn886l0LGJ8GF5cf8Nn8q" | jq .
