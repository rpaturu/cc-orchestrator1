#!/bin/bash

# Sales Intelligence Company Overview Script
# Usage: ./async-overview.sh <domain>
# Example: ./async-overview.sh shopify.com

set -e

# Configuration
API_ENDPOINT="https://fgmdbn6upg.execute-api.us-west-2.amazonaws.com/prod"
API_KEY="Al9hn5KzP5aaa5Miq6gNN6rjy9gccjwW3tyigXRf"
POLL_INTERVAL=5  # seconds between status checks
MAX_WAIT_TIME=300  # maximum wait time in seconds (5 minutes)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"
}

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <domain>"
    print_error "Example: $0 shopify.com"
    exit 1
fi

DOMAIN="$1"
print_status "Starting overview request for domain: $DOMAIN"

# Step 1: Make overview request
print_status "Step 1: Initiating overview request..."
OVERVIEW_RESPONSE=$(curl -s -X GET \
    "$API_ENDPOINT/company/$DOMAIN/overview-async" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json")

# Check if request was successful
if [ $? -ne 0 ]; then
    print_error "Failed to make overview request"
    exit 1
fi

# Extract request ID
REQUEST_ID=$(echo "$OVERVIEW_RESPONSE" | jq -r '.requestId // empty')

if [ -z "$REQUEST_ID" ] || [ "$REQUEST_ID" = "null" ]; then
    print_error "Failed to extract request ID from response:"
    echo "$OVERVIEW_RESPONSE" | jq .
    exit 1
fi

print_success "✓ Overview request created successfully"
print_status "Request ID: $REQUEST_ID"
print_status "Estimated processing time: 1-2 minutes"

# Step 2: Poll for results
print_status "Step 2: Polling for results..."
START_TIME=$(date +%s)
ELAPSED_TIME=0

while [ $ELAPSED_TIME -lt $MAX_WAIT_TIME ]; do
    # Get current status
    STATUS_RESPONSE=$(curl -s -X GET \
        "$API_ENDPOINT/requests/$REQUEST_ID" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json")
    
    if [ $? -ne 0 ]; then
        print_warning "Failed to check status, retrying in $POLL_INTERVAL seconds..."
        sleep $POLL_INTERVAL
        continue
    fi
    
    # Extract status
    STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status // empty')
    
    case "$STATUS" in
        "pending"|"processing")
            print_status "Status: $STATUS (${ELAPSED_TIME}s elapsed)"
            ;;
        "completed")
            print_success "✓ Processing completed!"
            
            # Extract processing time
            PROCESSING_TIME=$(echo "$STATUS_RESPONSE" | jq -r '.processingTimeMs // empty')
            if [ -n "$PROCESSING_TIME" ] && [ "$PROCESSING_TIME" != "null" ]; then
                PROCESSING_SECONDS=$((PROCESSING_TIME / 1000))
                print_status "Processing time: ${PROCESSING_SECONDS}s"
            fi
            
            # Extract and display result
            print_status "Company Overview Results:"
            echo "$STATUS_RESPONSE" | jq '.result'
            
            # Save to file
            OUTPUT_FILE="overview-${DOMAIN}-$(date +%Y%m%d-%H%M%S).json"
            echo "$STATUS_RESPONSE" | jq '.result' > "$OUTPUT_FILE"
            print_success "✓ Results saved to: $OUTPUT_FILE"
            exit 0
            ;;
        "failed")
            print_error "✗ Processing failed!"
            ERROR_MESSAGE=$(echo "$STATUS_RESPONSE" | jq -r '.error // "Unknown error"')
            print_error "Error: $ERROR_MESSAGE"
            exit 1
            ;;
        *)
            print_warning "Unknown status: $STATUS"
            echo "$STATUS_RESPONSE" | jq .
            ;;
    esac
    
    # Wait before next poll
    sleep $POLL_INTERVAL
    
    # Update elapsed time
    CURRENT_TIME=$(date +%s)
    ELAPSED_TIME=$((CURRENT_TIME - START_TIME))
done

# Timeout reached
print_error "✗ Timeout reached after ${MAX_WAIT_TIME}s"
print_error "Request may still be processing. Check manually with:"
print_error "curl -X GET \"$API_ENDPOINT/requests/$REQUEST_ID\" -H \"X-API-Key: $API_KEY\" | jq"
exit 1 