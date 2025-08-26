#!/bin/bash

#####################################################################
# Local Rate Limiting Test Script
#####################################################################

# Configuration
LOCAL_URL="http://localhost:3000"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=====================================${NC}"
}

print_test() {
    echo -e "\n${PURPLE}TEST $((TOTAL + 1)):${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED++))
    ((TOTAL++))
}

print_failure() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED++))
    ((TOTAL++))
}

print_info() {
    echo -e "${YELLOW}ℹ️  INFO:${NC} $1"
}

# Start testing
print_header "Local Rate Limiting Test Suite"
echo "Local URL: $LOCAL_URL"
echo "Test Time: $TIMESTAMP"
echo ""

# Test 1: Check if server is running
print_test "Server Health Check"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$LOCAL_URL/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n1)

if [ "$HEALTH_STATUS" = "200" ]; then
    print_success "Server is running and healthy"
else
    print_failure "Server is not running or unhealthy (status: $HEALTH_STATUS)"
    echo "Please start the server with: npm run dev"
    exit 1
fi

# Test 2: Check rate limit configuration endpoint
print_test "Rate Limit Configuration"
RATE_CONFIG_RESPONSE=$(curl -s -w "\n%{http_code}" "$LOCAL_URL/rate-limit-info")
RATE_CONFIG_STATUS=$(echo "$RATE_CONFIG_RESPONSE" | tail -n1)
RATE_CONFIG_BODY=$(echo "$RATE_CONFIG_RESPONSE" | head -n -1)

if [ "$RATE_CONFIG_STATUS" = "200" ]; then
    print_success "Rate limit configuration endpoint accessible"
    if command -v jq > /dev/null; then
        print_info "Rate limiting enabled: $(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.enabled // "unknown"')"
        print_info "Environment: $(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.environment // "unknown"')"
        print_info "Auth limit: $(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.limits.authentication.maxRequests // "unknown"') requests/$(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.limits.authentication.windowMs // "unknown"')ms"
    else
        print_info "jq not available, showing raw response:"
        echo "$RATE_CONFIG_BODY"
    fi
else
    print_failure "Rate limit configuration endpoint returned status $RATE_CONFIG_STATUS"
fi

# Test 3: Check rate limit headers
print_test "Rate Limit Headers"
HEADERS_RESPONSE=$(curl -s -I "$LOCAL_URL/health")
if echo "$HEADERS_RESPONSE" | grep -i "ratelimit-limit" > /dev/null; then
    print_success "RateLimit-Limit header present"
    LIMIT_VALUE=$(echo "$HEADERS_RESPONSE" | grep -i "ratelimit-limit" | cut -d':' -f2 | tr -d ' \r')
    print_info "Rate limit: $LIMIT_VALUE requests"
else
    print_failure "RateLimit-Limit header missing"
fi

# Test 4: Authentication rate limiting test
print_test "Authentication Rate Limiting (should trigger after 5 requests)"
print_info "Sending rapid auth requests..."

AUTH_SUCCESS=0
AUTH_RATE_LIMITED=0

for i in {1..8}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"wrongpassword"}' \
        "$LOCAL_URL/api/auth/login")
    STATUS=$(echo "$RESPONSE" | tail -n1)
    
    echo "Request $i: Status $STATUS"
    
    if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
        ((AUTH_SUCCESS++))
    elif [ "$STATUS" = "429" ]; then
        ((AUTH_RATE_LIMITED++))
        print_success "Auth rate limiting triggered on request $i (HTTP 429)"
        
        # Check rate limit response format
        BODY=$(echo "$RESPONSE" | head -n -1)
        if command -v jq > /dev/null && echo "$BODY" | jq -e '.retryAfter' > /dev/null 2>&1; then
            RETRY_AFTER=$(echo "$BODY" | jq -r '.retryAfter')
            print_info "Retry-After: ${RETRY_AFTER} seconds"
        fi
        break
    else
        print_info "Unexpected status: $STATUS"
    fi
    
    # Small delay between requests
    sleep 0.1
done

if [ $AUTH_RATE_LIMITED -eq 0 ]; then
    print_failure "Auth rate limiting was NOT triggered after $AUTH_SUCCESS requests"
    print_info "This indicates rate limiting may not be working properly"
else
    print_success "Auth rate limiting is working correctly"
fi

# Test 5: General API rate limiting test
print_test "General API Rate Limiting (should trigger after 10 requests)"
print_info "Sending rapid API requests..."

GENERAL_SUCCESS=0
GENERAL_RATE_LIMITED=0

for i in {1..15}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" "$LOCAL_URL/ping")
    STATUS=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$STATUS" = "200" ]; then
        ((GENERAL_SUCCESS++))
    elif [ "$STATUS" = "429" ]; then
        ((GENERAL_RATE_LIMITED++))
        print_success "General rate limiting triggered on request $i (HTTP 429)"
        break
    fi
    
    sleep 0.05
done

if [ $GENERAL_RATE_LIMITED -eq 0 ]; then
    print_failure "General rate limiting was NOT triggered after $GENERAL_SUCCESS requests"
else
    print_success "General rate limiting is working correctly"
fi

# Test Summary
print_header "Test Summary"
echo "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Rate limiting is working correctly.${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Some tests failed. Rate limiting may need adjustment.${NC}"
    exit 1
fi
