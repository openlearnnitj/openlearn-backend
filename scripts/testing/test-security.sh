#!/bin/bash

# OpenLearn Backend Security Testing Suite
# Target: https://openlearn-backend.onrender.com/
# This script tests various security features of the OpenLearn backend

BASE_URL="http://localhost:3000/"
RESULTS_FILE="security_test_results_$(date +%Y%m%d_%H%M%S).log"

echo "========================================"
echo "  OpenLearn Backend Security Test Suite"
echo "========================================"
echo "Target: $BASE_URL"
echo "Results will be saved to: $RESULTS_FILE"
echo ""

# Function to log results
log_result() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$RESULTS_FILE"
}

# Function to test endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local expected_status="$4"
    local headers="$5"
    
    echo "Testing: $description"
    echo "Endpoint: $method $endpoint"
    
    if [ -n "$headers" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" -H "$headers")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    echo "Status Code: $http_code"
    echo "Response: $body" | head -c 200
    if [ ${#body} -gt 200 ]; then echo "..."; fi
    
    if [ "$http_code" = "$expected_status" ]; then
        log_result "✅ PASS: $description (Status: $http_code)"
    else
        log_result "❌ FAIL: $description (Expected: $expected_status, Got: $http_code)"
    fi
    echo ""
}

# Function to test rate limiting
test_rate_limiting() {
    echo "========================================"
    echo "  Testing Rate Limiting"
    echo "========================================"
    
    # Test if rate limiting is configured (should return same response for first few requests)
    echo "Sending 100 rapid requests to test rate limiting..."
    
    for i in {1..100}; do
        response=$(curl -s -w "%{http_code}" "$BASE_URL/api/status")
        http_code=$(echo "$response" | tail -c 4)
        echo "Request $i: HTTP $http_code"
        
        if [ "$http_code" = "429" ]; then
            log_result "✅ PASS: Rate limiting active - got 429 Too Many Requests on request $i"
            return
        fi
        
        sleep 0.1
    done
    
    log_result "⚠️ INFO: Rate limiting not triggered with 100 requests (may be configured with higher limits)"
}

# Function to test CORS
test_cors() {
    echo "========================================"
    echo "  Testing CORS Configuration"
    echo "========================================"
    
    # Test CORS preflight
    echo "Testing CORS preflight request..."
    response=$(curl -s -w "\n%{http_code}" -X OPTIONS "$BASE_URL/api/status" \
        -H "Origin: https://malicious-site.com" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type")
    
    http_code=$(echo "$response" | tail -n1)
    headers=$(echo "$response" | head -n -1)
    
    echo "CORS Preflight Response Code: $http_code"
    echo "Headers: $headers"
    
    if echo "$headers" | grep -q "Access-Control-Allow-Origin"; then
        log_result "✅ PASS: CORS headers present"
    else
        log_result "❌ FAIL: CORS headers missing"
    fi
}

# Function to test authentication
test_authentication() {
    echo "========================================"
    echo "  Testing Authentication"
    echo "========================================"
    
    # Test accessing protected endpoint without token
    test_endpoint "GET" "/api/admin/dashboard" "Access protected endpoint without auth" "401" ""
    
    # Test with invalid token
    test_endpoint "GET" "/api/admin/dashboard" "Access protected endpoint with invalid token" "401" "Authorization: Bearer invalid_token_here"
    
    # Test token extraction
    test_endpoint "GET" "/api/admin/dashboard" "Access protected endpoint with malformed auth header" "401" "Authorization: invalid_format"
}

# Function to test security headers
test_security_headers() {
    echo "========================================"
    echo "  Testing Security Headers"
    echo "========================================"
    
    echo "Checking security headers..."
    headers=$(curl -s -I "$BASE_URL/api/status")
    
    echo "Response Headers:"
    echo "$headers"
    echo ""
    
    # Check for important security headers
    if echo "$headers" | grep -qi "x-content-type-options"; then
        log_result "✅ PASS: X-Content-Type-Options header present"
    else
        log_result "❌ FAIL: X-Content-Type-Options header missing"
    fi
    
    if echo "$headers" | grep -qi "x-frame-options"; then
        log_result "✅ PASS: X-Frame-Options header present"
    else
        log_result "❌ FAIL: X-Frame-Options header missing"
    fi
    
    if echo "$headers" | grep -qi "x-xss-protection"; then
        log_result "✅ PASS: X-XSS-Protection header present"
    else
        log_result "❌ FAIL: X-XSS-Protection header missing"
    fi
    
    if echo "$headers" | grep -qi "strict-transport-security"; then
        log_result "✅ PASS: Strict-Transport-Security header present"
    else
        log_result "⚠️ INFO: Strict-Transport-Security header missing (may be handled by reverse proxy)"
    fi
    
    if echo "$headers" | grep -qi "content-security-policy"; then
        log_result "✅ PASS: Content-Security-Policy header present"
    else
        log_result "❌ FAIL: Content-Security-Policy header missing"
    fi
}

# Function to test input validation
test_input_validation() {
    echo "========================================"
    echo "  Testing Input Validation"
    echo "========================================"
    
    # Test SQL injection attempt
    test_endpoint "GET" "/api/status?id=' OR '1'='1" "SQL injection attempt in query parameter" "200" ""
    
    # Test XSS attempt
    test_endpoint "GET" "/api/status?name=<script>alert('xss')</script>" "XSS attempt in query parameter" "200" ""
    
    # Test large payload
    large_payload='{"data":"'$(printf 'A%.0s' {1..100000})'"}'
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "$large_payload")
    
    http_code=$(echo "$response" | tail -n1)
    echo "Large payload test - Status Code: $http_code"
    
    if [ "$http_code" = "413" ] || [ "$http_code" = "400" ]; then
        log_result "✅ PASS: Large payload rejected (Status: $http_code)"
    else
        log_result "⚠️ INFO: Large payload not explicitly rejected (Status: $http_code)"
    fi
}

# Function to test API endpoints security
test_api_endpoints() {
    echo "========================================"
    echo "  Testing API Endpoints Security"
    echo "========================================"
    
    # Test public endpoints
    test_endpoint "GET" "/api/status" "Public status endpoint" "200" ""
    test_endpoint "GET" "/health" "Health check endpoint" "200" ""
    
    # Test protected endpoints
    test_endpoint "GET" "/api/admin/users" "Protected admin endpoint" "401" ""
    test_endpoint "POST" "/api/admin/courses" "Protected admin creation endpoint" "401" ""
    
    # Test non-existent endpoints
    test_endpoint "GET" "/api/nonexistent" "Non-existent endpoint" "404" ""
    
    # Test method not allowed
    test_endpoint "DELETE" "/api/status" "Method not allowed test" "405" ""
}

# Function to test HTTPS and SSL
test_https_ssl() {
    echo "========================================"
    echo "  Testing HTTPS/SSL Configuration"
    echo "========================================"
    
    # Test if HTTPS is enforced
    http_response=$(curl -s -w "%{http_code}" "http://openlearn-backend.onrender.com/api/status" 2>/dev/null || echo "000")
    
    if [ "$http_response" = "301" ] || [ "$http_response" = "302" ]; then
        log_result "✅ PASS: HTTP redirects to HTTPS"
    elif [ "$http_response" = "000" ]; then
        log_result "✅ PASS: HTTP requests blocked (HTTPS only)"
    else
        log_result "⚠️ INFO: HTTP requests allowed (Status: $http_response)"
    fi
    
    # Test SSL certificate
    ssl_info=$(echo | openssl s_client -servername openlearn-backend.onrender.com -connect openlearn-backend.onrender.com:443 2>/dev/null | openssl x509 -noout -text 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        log_result "✅ PASS: Valid SSL certificate"
    else
        log_result "❌ FAIL: SSL certificate issues"
    fi
}

# Main execution
echo "Starting security tests..."
echo ""

test_security_headers
test_cors
test_authentication
test_rate_limiting
test_input_validation
test_api_endpoints
test_https_ssl

echo "========================================"
echo "  Security Test Summary"
echo "========================================"
echo "Results saved to: $RESULTS_FILE"
echo ""
echo "View detailed results:"
echo "cat $RESULTS_FILE"
echo ""

# Summary
passes=$(grep -c "✅ PASS" "$RESULTS_FILE" 2>/dev/null || echo "0")
fails=$(grep -c "❌ FAIL" "$RESULTS_FILE" 2>/dev/null || echo "0")
info=$(grep -c "⚠️ INFO" "$RESULTS_FILE" 2>/dev/null || echo "0")

echo "Summary:"
echo "  Passed: $passes"
echo "  Failed: $fails"
echo "  Info/Warnings: $info"

if [ "$fails" -eq 0 ]; then
    echo ""
    echo "✅ All critical security tests passed!"
else
    echo ""
    echo "❌ Some security tests failed. Review the results above."
fi
