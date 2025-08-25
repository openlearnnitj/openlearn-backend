#!/bin/bash

# Test Authorization Flow
# This script tests the complete authorization flow for different user roles

echo "🔐 Testing Authorization Flow..."
echo "=================================="

# Read configuration
source scripts/config.sh

# Test endpoints
WEEKS_ENDPOINT="$BASE_URL/api/weeks"
SECTIONS_ENDPOINT="$BASE_URL/api/sections"

echo
echo "📊 Getting user data and league info..."

# Get users
GRAND_USER=$(curl -s -X POST "$AUTH_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "grand@openlearn.edu",
    "password": "password123"
  }' | jq -r '.data.token // empty')

CHIEF_USER=$(curl -s -X POST "$AUTH_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "chief@openlearn.edu", 
    "password": "password123"
  }' | jq -r '.data.token // empty')

PATHFINDER_USER=$(curl -s -X POST "$AUTH_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pathfinder@openlearn.edu",
    "password": "password123"
  }' | jq -r '.data.token // empty')

if [[ -z "$GRAND_USER" || -z "$CHIEF_USER" || -z "$PATHFINDER_USER" ]]; then
  echo "❌ Failed to get user tokens"
  exit 1
fi

echo "✅ Got user tokens"

# Get leagues 
LEAGUES=$(curl -s -X GET "$BASE_URL/api/leagues" \
  -H "Authorization: Bearer $GRAND_USER" | jq -r '.data[0:2] | .[].id')

LEAGUE_ARRAY=($LEAGUES)
LEAGUE1=${LEAGUE_ARRAY[0]}
LEAGUE2=${LEAGUE_ARRAY[1]}

if [[ -z "$LEAGUE1" || -z "$LEAGUE2" ]]; then
  echo "❌ Failed to get leagues"
  exit 1
fi

echo "✅ Testing with League 1: $LEAGUE1"
echo "✅ Testing with League 2: $LEAGUE2"

# Get PathfinderScope info
echo
echo "📋 Checking PathfinderScope assignments..."
SCOPES=$(curl -s -X GET "$BASE_URL/api/pathfinder-scope" \
  -H "Authorization: Bearer $GRAND_USER" | jq -r '.data[]')

echo "Current PathfinderScope assignments:"
echo "$SCOPES" | jq -r 'select(.leagueId != null) | "User: \(.pathfinderId) → League: \(.leagueId)"'

echo
echo "🧪 TESTING AUTHORIZATION FLOW"
echo "=============================="

# Test function
test_authorization() {
  local TEST_NAME="$1"
  local TOKEN="$2" 
  local LEAGUE_ID="$3"
  local EXPECTED_STATUS="$4"
  
  echo
  echo "🔍 Test: $TEST_NAME"
  echo "   League: $LEAGUE_ID"
  echo "   Expected: $EXPECTED_STATUS"
  
  # Test week creation
  RESPONSE=$(curl -s -w "%{http_code}" -X POST "$WEEKS_ENDPOINT" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Week $(date +%s)\",
      \"description\": \"Test week for authorization\",
      \"order\": 999,
      \"leagueId\": \"$LEAGUE_ID\"
    }")
    
  HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)
  BODY=$(echo "$RESPONSE" | head -c -4)
  
  if [[ "$HTTP_CODE" == "$EXPECTED_STATUS" ]]; then
    echo "   ✅ PASSED: HTTP $HTTP_CODE"
    if [[ "$HTTP_CODE" == "201" ]]; then
      WEEK_ID=$(echo "$BODY" | jq -r '.data.id // empty')
      echo "   📝 Created week: $WEEK_ID"
      
      # Clean up - delete the test week
      if [[ -n "$WEEK_ID" ]]; then
        curl -s -X DELETE "$WEEKS_ENDPOINT/$WEEK_ID" \
          -H "Authorization: Bearer $TOKEN" > /dev/null
        echo "   🗑️  Cleaned up test week"
      fi
    fi
  else
    echo "   ❌ FAILED: Expected $EXPECTED_STATUS, got $HTTP_CODE"
    echo "   Response: $BODY" | jq -r '.error // .message // .'
  fi
}

# Test scenarios
echo "1️⃣ GRAND_PATHFINDER Tests (Should have god-mode access)"
test_authorization "Grand → League 1" "$GRAND_USER" "$LEAGUE1" "201"
test_authorization "Grand → League 2" "$GRAND_USER" "$LEAGUE2" "201"

echo
echo "2️⃣ CHIEF_PATHFINDER Tests (Should need league access)"
test_authorization "Chief → League 1" "$CHIEF_USER" "$LEAGUE1" "201"
test_authorization "Chief → League 2" "$CHIEF_USER" "$LEAGUE2" "403"

echo  
echo "3️⃣ PATHFINDER Tests (Should need league access)"
test_authorization "Pathfinder → League 1" "$PATHFINDER_USER" "$LEAGUE1" "201"
test_authorization "Pathfinder → League 2" "$PATHFINDER_USER" "$LEAGUE2" "403"

echo
echo "🎯 AUTHORIZATION FLOW TEST COMPLETE"
echo "=================================="
