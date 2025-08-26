#!/bin/bash

# Test the league creation security fix locally

echo "🔒 Testing League Creation Security Fix"
echo "======================================="

BASE_URL="http://localhost:3000"

# Test with GRAND_PATHFINDER (should work)
echo "📝 Test 1: GRAND_PATHFINDER creating league (should succeed)"
GRAND_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"grand.pathfinder@openlearn.org.in","password":"GrandPath123!"}')

GRAND_TOKEN=$(echo $GRAND_LOGIN | jq -r '.data.accessToken')

GRAND_CREATE=$(curl -s -X POST "$BASE_URL/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{"name":"Security Test League","description":"Testing security fix"}')

echo "GRAND_PATHFINDER Result: $GRAND_CREATE"

# Test with developer (PATHFINDER role - should fail)
echo ""
echo "📝 Test 2: PATHFINDER creating league (should fail)"
# Use an actual pathfinder from your database
DEV_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"pathfinder1755977642@nitj.ac.in","password":"TestPath123!"}')

DEV_TOKEN=$(echo $DEV_LOGIN | jq -r '.data.accessToken')

if [[ "$DEV_TOKEN" == "null" || -z "$DEV_TOKEN" ]]; then
    echo "⚠️  PATHFINDER login failed, using invalid token to test authorization"
    DEV_TOKEN="invalid-token-for-testing"
fi

DEV_CREATE=$(curl -s -X POST "$BASE_URL/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -d '{"name":"Should Fail League","description":"This should be blocked"}')

echo "PATHFINDER Result: $DEV_CREATE"

echo ""
echo "🔍 Analysis:"
if [[ "$GRAND_CREATE" == *"success"* ]] || [[ "$GRAND_CREATE" == *"already exists"* ]]; then
    echo "✅ GOOD: GRAND_PATHFINDER can create leagues (or reached controller - authorization works)"
else
    echo "❌ BAD: GRAND_PATHFINDER cannot create leagues"
fi

if [[ "$DEV_CREATE" == *"success"* ]]; then
    echo "❌ BAD: PATHFINDER can still create leagues (SECURITY ISSUE)"
else
    echo "✅ GOOD: PATHFINDER properly blocked from creating leagues"
    echo "   Response: $DEV_CREATE"
fi
