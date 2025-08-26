#!/bin/bash

# Test V2 Migration Endpoints
# Run this script to test the new migration functionality

echo "Testing V2 Migration Endpoints"
echo "=================================="

BASE_URL="http://localhost:3000/api"

# Test 1: Check migration status (requires auth)
echo ""
echo "Test 1: Migration Status Endpoint"
echo "GET $BASE_URL/migration/status"
echo "Note: This requires authentication. Test manually with valid JWT token."
echo ""

# Test 2: Enhanced signup with V2 fields
echo "Test 2: Enhanced Signup (V2 Fields)"
echo "POST $BASE_URL/auth/signup"

curl -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testv2@example.com",
    "password": "SecurePass123!",
    "name": "V2 Test User",
    "institute": "MIT",
    "department": "Computer Science", 
    "graduationYear": 2026,
    "phoneNumber": "+1234567890",
    "studentId": "MIT2026001",
    "discordUsername": "testuser#1234",
    "portfolioUrl": "https://testuser.dev"
  }' \
  --silent | jq '.'

echo ""
echo "Enhanced signup test completed"
echo ""

# Test 3: Old signup (backward compatibility)
echo "Test 3: Legacy Signup (Backward Compatibility)"
echo "POST $BASE_URL/auth/signup"

curl -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testlegacy@example.com", 
    "password": "SecurePass123!",
    "name": "Legacy Test User"
  }' \
  --silent | jq '.'

echo ""
echo "Legacy signup test completed"
echo ""

echo "All tests completed!"
echo ""
echo "Manual Tests Required:"
echo "1. Login with created users to get JWT tokens"
echo "2. Test GET /api/migration/status with Authorization header"
echo "3. Test POST /api/migration/migrate-to-v2 with legacy user"
echo ""
echo "Example authenticated request:"
echo 'curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/migration/status'
