#!/usr/bin/env bash

# Simple GRAND_PATHFINDER test to debug server issues
echo "🔍 Debugging GRAND_PATHFINDER Access"
echo "=================================="

echo "1. Testing server health..."
curl -m 5 http://localhost:3000/health 2>/dev/null || echo "❌ Health check failed"

echo -e "\n2. Testing GRAND_PATHFINDER login..."
LOGIN_RESPONSE=$(curl -m 10 -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "grand.pathfinder@openlearn.org.in",
    "password": "GrandPath123!"
  }' 2>/dev/null)

if [ -z "$LOGIN_RESPONSE" ]; then
    echo "❌ No response from login endpoint"
    exit 1
fi

echo "Login Response: $LOGIN_RESPONSE"

# Extract token
GRAND_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$GRAND_TOKEN" ]; then
    echo "❌ Failed to extract token from login response"
    exit 1
fi

echo "✅ Successfully got token: ${GRAND_TOKEN:0:30}..."

echo -e "\n3. Testing a simple admin endpoint..."
USERS_RESPONSE=$(curl -m 10 -s -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer $GRAND_TOKEN" 2>/dev/null)

echo "Users Response: ${USERS_RESPONSE:0:200}..."

echo -e "\n4. Testing league creation..."
NEW_LEAGUE=$(curl -m 10 -s -X POST "http://localhost:3000/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{
    "name": "Test League from Grand Pathfinder",
    "description": "Testing league creation"
  }' 2>/dev/null)

echo "New League Response: $NEW_LEAGUE"

echo -e "\n✅ Debug test completed!"
