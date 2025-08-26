#!/bin/bash

# Test League Assignment Flow with Grand Pathfinder

echo "🔥 Testing League Assignment Flow with GRAND_PATHFINDER"
echo "=================================================="

# Server URL
BASE_URL="http://localhost:3000"

# Grand Pathfinder credentials (from database check)
GRAND_EMAIL="grand.pathfinder@openlearn.org.in"
GRAND_PASSWORD="GrandPath123!"

echo "📝 Step 1: Login as GRAND_PATHFINDER"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$GRAND_EMAIL\",
    \"password\": \"$GRAND_PASSWORD\"
  }")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token
GRAND_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // empty')

if [ -z "$GRAND_TOKEN" ] || [ "$GRAND_TOKEN" = "null" ]; then
    echo "❌ Login failed or no token received"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Login successful! Token: ${GRAND_TOKEN:0:20}..."

echo ""
echo "📝 Step 2: Create a new league"
CREATE_LEAGUE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d "{
    \"name\": \"Test League $(date +%s)\",
    \"description\": \"A test league for league assignment testing\"
  }")

echo "Create League Response: $CREATE_LEAGUE_RESPONSE"

# Extract league ID
LEAGUE_ID=$(echo $CREATE_LEAGUE_RESPONSE | jq -r '.data.id // empty')

if [ -z "$LEAGUE_ID" ] || [ "$LEAGUE_ID" = "null" ]; then
    echo "❌ League creation failed"
    echo "Response: $CREATE_LEAGUE_RESPONSE"
    exit 1
fi

echo "✅ League created! ID: $LEAGUE_ID"

echo ""
echo "📝 Step 3: Find a pathfinder to assign to the league"
# Look for the pathfinder from our database check - User 18
PATHFINDER_ID="cmeonr0r8000mg8rniypzz1c6"

echo "Using Pathfinder ID: $PATHFINDER_ID"

echo ""
echo "📝 Step 4: Assign pathfinder to the new league"
ASSIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/assign-leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d "{
    \"pathfinderId\": \"$PATHFINDER_ID\",
    \"leagueIds\": [\"$LEAGUE_ID\"]
  }")

echo "Assign League Response: $ASSIGN_RESPONSE"

echo ""
echo "📝 Step 5: List pathfinder's leagues"
LIST_LEAGUES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/pathfinder-leagues/$PATHFINDER_ID" \
  -H "Authorization: Bearer $GRAND_TOKEN")

echo "Pathfinder's Leagues: $LIST_LEAGUES_RESPONSE"

echo ""
echo "📝 Step 6: Get all pathfinder assignments"
ALL_ASSIGNMENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/pathfinder-assignments" \
  -H "Authorization: Bearer $GRAND_TOKEN")

echo "All Assignments: $ALL_ASSIGNMENTS_RESPONSE"

echo ""
echo "📝 Step 7: Test removing pathfinder from the league we just assigned"
# Use the league we just created and assigned

REMOVE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/admin/pathfinder-leagues/$PATHFINDER_ID/$LEAGUE_ID" \
  -H "Authorization: Bearer $GRAND_TOKEN")

echo "Remove from League Response: $REMOVE_RESPONSE"

echo ""
echo "📝 Step 8: Verify removal - List pathfinder's leagues again"
FINAL_LEAGUES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/pathfinder-leagues/$PATHFINDER_ID" \
  -H "Authorization: Bearer $GRAND_TOKEN")

echo "Final Pathfinder's Leagues: $FINAL_LEAGUES_RESPONSE"

echo ""
echo "🎉 League Assignment Flow Test Complete!"
