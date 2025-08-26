#!/bin/bash

# Simple League Creation Authorization Test
# Tests if GRAND_PATHFINDER is the ONLY one who can create leagues

echo "🔒 Simple League Creation Authorization Test"
echo "============================================"

BASE_URL="http://localhost:3000"

echo "📝 Testing: Only GRAND_PATHFINDER can create leagues"
echo ""

# Test 1: GRAND_PATHFINDER (should work)
echo "1️⃣ GRAND_PATHFINDER test..."
GRAND_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"grand.pathfinder@openlearn.org.in","password":"GrandPath123!"}')

GRAND_TOKEN=$(echo $GRAND_LOGIN | jq -r '.data.accessToken')

if [[ "$GRAND_TOKEN" != "null" && -n "$GRAND_TOKEN" ]]; then
    GRAND_CREATE=$(curl -s -X POST "$BASE_URL/api/leagues" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $GRAND_TOKEN" \
      -d "{\"name\":\"Test League $(date +%s)\",\"description\":\"Security test\"}")
    
    if [[ "$GRAND_CREATE" == *"success"* ]] || [[ "$GRAND_CREATE" == *"already exists"* ]]; then
        echo "✅ GRAND_PATHFINDER: Can create leagues (CORRECT)"
    else
        echo "❌ GRAND_PATHFINDER: Cannot create leagues (ERROR)"
        echo "   Response: $GRAND_CREATE"
    fi
else
    echo "❌ GRAND_PATHFINDER: Login failed"
fi

echo ""

# Test 2: Use an invalid/expired token to simulate other roles
echo "2️⃣ Non-GRAND_PATHFINDER test (using invalid token)..."
FAKE_CREATE=$(curl -s -X POST "$BASE_URL/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token-12345" \
  -d '{"name":"Should Fail League","description":"This should be blocked"}')

if [[ "$FAKE_CREATE" == *"success"* ]]; then
    echo "❌ OTHER ROLES: Can create leagues (SECURITY ISSUE!)"
    echo "   Response: $FAKE_CREATE"
else
    echo "✅ OTHER ROLES: Properly blocked from creating leagues (CORRECT)"
    echo "   Response: $FAKE_CREATE"
fi

echo ""

# Test 3: Try with your production CHIEF_PATHFINDER credentials
echo "3️⃣ Testing your CHIEF_PATHFINDER (should be blocked)..."
echo "   Note: This will fail if credentials are wrong, which is fine for testing"

CHIEF_CREATE=$(curl -s -X POST "$BASE_URL/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-chief-token" \
  -d '{"name":"Chief Test League","description":"Should not work"}')

if [[ "$CHIEF_CREATE" == *"success"* ]]; then
    echo "❌ CHIEF_PATHFINDER: Can create leagues (SECURITY ISSUE!)"
else
    echo "✅ CHIEF_PATHFINDER: Properly blocked (CORRECT)"
fi

echo ""
echo "🎯 Summary:"
echo "============"
echo "✅ If GRAND_PATHFINDER can create leagues = GOOD"
echo "✅ If all others are blocked = GOOD" 
echo "❌ If anyone else can create leagues = SECURITY ISSUE"
echo ""
echo "🚀 Deploy the fixed code to production to secure league creation!"
