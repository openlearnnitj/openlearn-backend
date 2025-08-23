#!/bin/bash

# Production Authorization Test Script
# Tests if the new league-based authorization is working in production

echo "🔍 Testing Production Authorization System"
echo "=========================================="

# Configuration - REPLACE WITH YOUR PRODUCTION VALUES
PROD_URL="https://api.openlearn.org.in"  # Replace with your actual domain
CHIEF_EMAIL="ckesharwani4@gmail.com"             # Replace with your chief pathfinder email
CHIEF_PASSWORD="Chahat@1234"           # Replace with your chief pathfinder password

echo ""
echo "📝 Step 1: Login as CHIEF_PATHFINDER"

LOGIN_RESPONSE=$(curl -s -X POST "$PROD_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$CHIEF_EMAIL\",
    \"password\": \"$CHIEF_PASSWORD\"
  }")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token
CHIEF_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // empty')

if [ -z "$CHIEF_TOKEN" ] || [ "$CHIEF_TOKEN" = "null" ]; then
    echo "❌ Login failed or no token received"
    exit 1
fi

echo "✅ Chief Pathfinder authenticated"

echo ""
echo "📝 Step 2: Test access to restricted endpoints (should be FORBIDDEN)"

# Test 1: League assignments (should be forbidden)
echo "Testing league assignments endpoint..."
ASSIGNMENTS_RESPONSE=$(curl -s -X GET "$PROD_URL/api/admin/pathfinder-assignments" \
  -H "Authorization: Bearer $CHIEF_TOKEN")

echo "Assignments Response: $ASSIGNMENTS_RESPONSE"

# Test 2: League creation (should be forbidden)
echo ""
echo "Testing league creation endpoint..."
LEAGUE_RESPONSE=$(curl -s -X POST "$PROD_URL/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHIEF_TOKEN" \
  -d "{
    \"name\": \"Test League\",
    \"description\": \"Should not be allowed\"
  }")

echo "League Creation Response: $LEAGUE_RESPONSE"

# Test 3: User promotion (should be forbidden)
echo ""
echo "Testing user promotion endpoint..."
USER_RESPONSE=$(curl -s -X PUT "$PROD_URL/api/admin/users/test-id/role" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHIEF_TOKEN" \
  -d "{
    \"role\": \"PATHFINDER\"
  }")

echo "User Promotion Response: $USER_RESPONSE"

echo ""
echo "🔍 Analysis:"
echo "============"

# Check if responses contain success or forbidden
if [[ "$ASSIGNMENTS_RESPONSE" == *"success"* ]]; then
    echo "❌ CRITICAL: Chief Pathfinder can still access assignments (SECURITY ISSUE)"
else
    echo "✅ GOOD: Chief Pathfinder properly blocked from assignments"
fi

if [[ "$LEAGUE_RESPONSE" == *"success"* ]]; then
    echo "❌ CRITICAL: Chief Pathfinder can still create leagues (SECURITY ISSUE)"
else
    echo "✅ GOOD: Chief Pathfinder properly blocked from league creation"
fi

if [[ "$USER_RESPONSE" == *"success"* ]]; then
    echo "❌ CRITICAL: Chief Pathfinder can still promote users (SECURITY ISSUE)"
else
    echo "✅ GOOD: Chief Pathfinder properly blocked from user promotion"
fi

echo ""
echo "🎯 If any tests show 'CRITICAL', the new authorization is NOT working in production!"
echo "======================================================================================"
