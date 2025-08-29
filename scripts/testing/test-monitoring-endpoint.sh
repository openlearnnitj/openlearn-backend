#!/bin/bash

# Test script for the monitoring health status endpoint
# Usage: ./test-monitoring-endpoint.sh [API_SECRET]

API_SECRET=${1:-"test-monitoring-secret-key"}
BASE_URL=${2:-"http://localhost:3000"}

echo "🔍 Testing Monitoring Health Status Endpoint"
echo "📍 URL: ${BASE_URL}/api/monitoring/health-status"
echo "🔑 Secret: ${API_SECRET}"
echo ""

# Test 1: Without secret header (should return 401)
echo "🧪 Test 1: Request without secret header (expecting 401)"
response1=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/api/monitoring/health-status")
echo "Response: $response1"
echo ""

# Test 2: With wrong secret (should return 401)
echo "🧪 Test 2: Request with wrong secret (expecting 401)"
response2=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "X-API-Secret: wrong-secret" "${BASE_URL}/api/monitoring/health-status")
echo "Response: $response2"
echo ""

# Test 3: With correct secret (should return 200 with health data)
echo "🧪 Test 3: Request with correct secret (expecting 200 with health data)"
response3=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "X-API-Secret: ${API_SECRET}" "${BASE_URL}/api/monitoring/health-status")
echo "Response: $response3"
echo ""

# Test 4: Measure response time
echo "🧪 Test 4: Measuring response time"
time_output=$(curl -s -w "Time: %{time_total}s\nHTTP_CODE:%{http_code}" -H "X-API-Secret: ${API_SECRET}" "${BASE_URL}/api/monitoring/health-status" | tail -2)
echo "$time_output"
echo ""

echo "✅ Testing completed!"
echo ""
echo "📋 To use this endpoint:"
echo "   1. Set MONITORING_API_SECRET environment variable"
echo "   2. Include X-API-Secret header in requests"
echo "   3. POST requests to /api/monitoring/health-status"
echo ""
echo "🔒 Security Note: This endpoint is protected and not rate-limited"
