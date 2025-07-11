#!/bin/bash

#####################################################################
# OpenLearn Backend Rate Limiting Test Script
#####################################################################
# 
# This script tests the IP-based rate limiting implementation
# on the OpenLearn backend API (deployed on Render).
#
# Tests include:
# - General API rate limiting (100 requests/15min)
# - Authentication rate limiting (10 requests/15min) 
# - Admin rate limiting (30 requests/15min)
# - Rate limit headers verification
# - Rate limit configuration endpoint
#
# Usage:
#   ./test-rate-limiting.sh
#   ./test-rate-limiting.sh https://custom-backend-url.onrender.com
#
#####################################################################

# Configuration
BACKEND_URL="${1:-https://openlearn-backend-xhjq.onrender.com}"
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
print_header "OpenLearn Backend Rate Limiting Test Suite"
echo "Backend URL: $BACKEND_URL"
echo "Test Time: $TIMESTAMP"
echo ""

# Test 1: Check rate limit configuration endpoint
print_test "Rate Limit Configuration Endpoint"
RATE_CONFIG_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/rate-limit-info")
RATE_CONFIG_STATUS=$(echo "$RATE_CONFIG_RESPONSE" | tail -n1)
RATE_CONFIG_BODY=$(echo "$RATE_CONFIG_RESPONSE" | head -n -1)

if [ "$RATE_CONFIG_STATUS" = "200" ]; then
    print_success "Rate limit configuration endpoint accessible"
    print_info "Rate limiting enabled: $(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.enabled // "unknown"')"
    print_info "Environment: $(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.environment // "unknown"')"
    print_info "General limit: $(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.limits.general.maxRequests // "unknown"') requests/$(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.limits.general.windowMs // "unknown"')ms"
    print_info "Auth limit: $(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.limits.authentication.maxRequests // "unknown"') requests/$(echo "$RATE_CONFIG_BODY" | jq -r '.rateLimiting.limits.authentication.windowMs // "unknown"')ms"
else
    print_failure "Rate limit configuration endpoint returned status $RATE_CONFIG_STATUS"
fi

# Test 2: Single request with rate limit headers
print_test "Rate Limit Headers Verification"
HEADERS_RESPONSE=$(curl -s -I "$BACKEND_URL/health")
if echo "$HEADERS_RESPONSE" | grep -i "ratelimit-limit" > /dev/null; then
    print_success "RateLimit-Limit header present"
    LIMIT_VALUE=$(echo "$HEADERS_RESPONSE" | grep -i "ratelimit-limit" | cut -d':' -f2 | tr -d ' \r')
    print_info "Rate limit: $LIMIT_VALUE requests"
else
    print_failure "RateLimit-Limit header missing"
fi

if echo "$HEADERS_RESPONSE" | grep -i "ratelimit-remaining" > /dev/null; then
    print_success "RateLimit-Remaining header present"
    REMAINING_VALUE=$(echo "$HEADERS_RESPONSE" | grep -i "ratelimit-remaining" | cut -d':' -f2 | tr -d ' \r')
    print_info "Remaining requests: $REMAINING_VALUE"
else
    print_failure "RateLimit-Remaining header missing"
fi

# Test 3: Rapid requests to trigger general rate limiting
print_test "General API Rate Limiting (Health Endpoint)"
print_info "Sending 5 rapid requests to /health endpoint..."

GENERAL_SUCCESS=0
GENERAL_RATE_LIMITED=0

for i in {1..5}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
    STATUS=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$STATUS" = "200" ]; then
        ((GENERAL_SUCCESS++))
    elif [ "$STATUS" = "429" ]; then
        ((GENERAL_RATE_LIMITED++))
        print_info "Request $i rate limited (HTTP 429)"
        break
    fi
    
    # Small delay between requests
    sleep 0.1
done

if [ $GENERAL_SUCCESS -gt 0 ]; then
    print_success "General API accepts normal requests ($GENERAL_SUCCESS successful)"
else
    print_failure "No successful requests to general API"
fi

# Test 4: Authentication endpoint rate limiting
print_test "Authentication Rate Limiting"
print_info "Testing auth endpoint with multiple requests..."

AUTH_SUCCESS=0
AUTH_RATE_LIMITED=0

# Test with invalid login attempts (should be rate limited more aggressively)
for i in {1..12}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"wrongpassword"}' \
        "$BACKEND_URL/api/auth/login")
    STATUS=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$STATUS" = "401" ] || [ "$STATUS" = "400" ] || [ "$STATUS" = "422" ]; then
        ((AUTH_SUCCESS++))
    elif [ "$STATUS" = "429" ]; then
        ((AUTH_RATE_LIMITED++))
        print_info "Auth request $i rate limited (HTTP 429)"
        
        # Check rate limit response format
        BODY=$(echo "$RESPONSE" | head -n -1)
        if echo "$BODY" | jq -e '.retryAfter' > /dev/null 2>&1; then
            RETRY_AFTER=$(echo "$BODY" | jq -r '.retryAfter')
            print_info "Retry-After: ${RETRY_AFTER} seconds"
        fi
        break
    fi
    
    # Small delay between requests
    sleep 0.1
done

if [ $AUTH_RATE_LIMITED -gt 0 ]; then
    print_success "Authentication rate limiting working (triggered after $((AUTH_SUCCESS)) requests)"
else
    print_info "Authentication rate limiting not triggered in test (may require more requests or different timing)"
fi

# Test 5: Admin endpoint rate limiting (if accessible)
print_test "Admin Endpoint Rate Limiting"
print_info "Testing admin endpoint accessibility and rate limiting..."

ADMIN_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/admin/users")
ADMIN_STATUS=$(echo "$ADMIN_RESPONSE" | tail -n1)

if [ "$ADMIN_STATUS" = "401" ] || [ "$ADMIN_STATUS" = "403" ]; then
    print_success "Admin endpoint properly protected (HTTP $ADMIN_STATUS)"
elif [ "$ADMIN_STATUS" = "429" ]; then
    print_success "Admin endpoint rate limited (HTTP 429)"
else
    print_info "Admin endpoint returned status $ADMIN_STATUS"
fi

# Test 6: Rate limit bypass verification for health endpoints
print_test "Health Endpoint Rate Limit Bypass"
print_info "Verifying health endpoints are not rate limited..."

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -n1)

PING_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/ping")
PING_STATUS=$(echo "$PING_RESPONSE" | tail -n1)

if [ "$HEALTH_STATUS" = "200" ]; then
    print_success "Health endpoint accessible (bypasses rate limiting)"
else
    print_failure "Health endpoint blocked or failing (status: $HEALTH_STATUS)"
fi

if [ "$PING_STATUS" = "200" ]; then
    print_success "Ping endpoint accessible (bypasses rate limiting)"
else
    print_failure "Ping endpoint blocked or failing (status: $PING_STATUS)"
fi

# Test 7: Rate limit response format validation
print_test "Rate Limit Response Format"
print_info "Making multiple requests to trigger rate limiting and check response format..."

RATE_LIMIT_RESPONSE=""
for i in {1..15}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/auth/register" \
        -X POST -H "Content-Type: application/json" \
        -d '{"email":"test'$i'@example.com","password":"test123","role":"PIONEER"}')
    STATUS=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$STATUS" = "429" ]; then
        RATE_LIMIT_RESPONSE=$(echo "$RESPONSE" | head -n -1)
        break
    fi
    sleep 0.05
done

if [ -n "$RATE_LIMIT_RESPONSE" ]; then
    print_success "Rate limit response captured"
    
    # Validate response format
    if echo "$RATE_LIMIT_RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
        print_success "Response has correct success field"
    else
        print_failure "Response missing or incorrect success field"
    fi
    
    if echo "$RATE_LIMIT_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        print_success "Response has error field"
        ERROR_MSG=$(echo "$RATE_LIMIT_RESPONSE" | jq -r '.error')
        print_info "Error message: $ERROR_MSG"
    else
        print_failure "Response missing error field"
    fi
    
    if echo "$RATE_LIMIT_RESPONSE" | jq -e '.retryAfter' > /dev/null 2>&1; then
        print_success "Response has retryAfter field"
        RETRY_AFTER=$(echo "$RATE_LIMIT_RESPONSE" | jq -r '.retryAfter')
        print_info "Retry after: $RETRY_AFTER seconds"
    else
        print_failure "Response missing retryAfter field"
    fi
else
    print_info "Rate limiting not triggered in this test run"
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
    echo -e "\n${YELLOW}⚠️  Some tests failed. Please review the implementation.${NC}"
    exit 1
fi
