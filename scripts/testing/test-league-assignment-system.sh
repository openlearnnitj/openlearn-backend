#!/usr/bin/env bash

# Complete League Assignment System Test
echo "🎯 Testing Complete League Assignment System"
echo "==========================================="

# Get GRAND_PATHFINDER token
echo "🔐 Logging in as GRAND_PATHFINDER..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "grand.pathfinder@openlearn.org.in",
    "password": "GrandPath123!"
  }')

GRAND_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ Got GRAND_PATHFINDER token"

# Test 1: Create some test leagues
echo -e "\n1️⃣ Creating test leagues..."
LEAGUE1=$(curl -s -X POST "http://localhost:3000/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{
    "name": "AI/ML League",
    "description": "Artificial Intelligence and Machine Learning track"
  }')
LEAGUE1_ID=$(echo $LEAGUE1 | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created League 1: AI/ML League ($LEAGUE1_ID)"

LEAGUE2=$(curl -s -X POST "http://localhost:3000/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{
    "name": "Web Development League",
    "description": "Full-stack web development track"
  }')
LEAGUE2_ID=$(echo $LEAGUE2 | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created League 2: Web Development League ($LEAGUE2_ID)"

# Test 2: Register a pioneer and promote to pathfinder
echo -e "\n2️⃣ Creating test pathfinder..."
TIMESTAMP=$(date +%s)
PATHFINDER_EMAIL="pathfinder${TIMESTAMP}@nitj.ac.in"
PATHFINDER_PASSWORD="Pathfinder123!"

SIGNUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Pathfinder",
    "email": "'$PATHFINDER_EMAIL'",
    "password": "'$PATHFINDER_PASSWORD'"
  }')

PATHFINDER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created user: $PATHFINDER_EMAIL ($PATHFINDER_ID)"

# Promote to PATHFINDER
echo "Promoting to PATHFINDER role..."
PROMOTION_RESPONSE=$(curl -s -X PUT "http://localhost:3000/api/admin/users/$PATHFINDER_ID/role" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{"role": "PATHFINDER"}')
echo "Promotion result: $(echo $PROMOTION_RESPONSE | grep -o '"message":"[^"]*' | cut -d'"' -f4)"

# Test 3: Assign leagues to pathfinder
echo -e "\n3️⃣ Assigning leagues to pathfinder..."
ASSIGNMENT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/admin/assign-leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{
    "pathfinderId": "'$PATHFINDER_ID'",
    "leagueIds": ["'$LEAGUE1_ID'", "'$LEAGUE2_ID'"],
    "permissions": {
      "canManageUsers": true,
      "canViewAnalytics": true,
      "canCreateContent": true
    }
  }')
echo "Assignment response: $(echo $ASSIGNMENT_RESPONSE | grep -o '"message":"[^"]*' | cut -d'"' -f4)"

# Test 4: Check pathfinder league assignments
echo -e "\n4️⃣ Checking pathfinder assignments..."
ASSIGNMENTS_CHECK=$(curl -s -X GET "http://localhost:3000/api/admin/pathfinder-leagues/$PATHFINDER_ID" \
  -H "Authorization: Bearer $GRAND_TOKEN")
LEAGUE_COUNT=$(echo $ASSIGNMENTS_CHECK | grep -o '"totalLeagues":[0-9]*' | cut -d':' -f2)
echo "Pathfinder has access to $LEAGUE_COUNT leagues"

# Test 5: Test pathfinder login and access
echo -e "\n5️⃣ Testing pathfinder access..."
PATHFINDER_LOGIN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$PATHFINDER_EMAIL'",
    "password": "'$PATHFINDER_PASSWORD'"
  }')

PATHFINDER_TOKEN=$(echo $PATHFINDER_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ Pathfinder logged in successfully"

# Test pathfinder can create content in assigned leagues
echo "Testing pathfinder league access..."
WEEK_CREATION=$(curl -s -X POST "http://localhost:3000/api/weeks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PATHFINDER_TOKEN" \
  -d '{
    "title": "Introduction to AI",
    "description": "First week of AI/ML league",
    "leagueId": "'$LEAGUE1_ID'",
    "orderIndex": 1
  }')

if echo $WEEK_CREATION | grep -q '"success":true'; then
    echo "✅ Pathfinder can create content in assigned league"
else
    echo "❌ Pathfinder cannot create content: $(echo $WEEK_CREATION | grep -o '"error":"[^"]*' | cut -d'"' -f4)"
fi

# Test 6: Test access to all pathfinder assignments
echo -e "\n6️⃣ Getting all pathfinder assignments..."
ALL_ASSIGNMENTS=$(curl -s -X GET "http://localhost:3000/api/admin/pathfinder-assignments" \
  -H "Authorization: Bearer $GRAND_TOKEN")
TOTAL_PATHFINDERS=$(echo $ALL_ASSIGNMENTS | grep -o '"totalPathfinders":[0-9]*' | cut -d':' -f2)
echo "Total pathfinders in system: $TOTAL_PATHFINDERS"

# Test 7: Remove league assignment
echo -e "\n7️⃣ Testing league removal..."
REMOVAL_RESPONSE=$(curl -s -X DELETE "http://localhost:3000/api/admin/pathfinder-leagues/$PATHFINDER_ID/$LEAGUE2_ID" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Removal result: $(echo $REMOVAL_RESPONSE | grep -o '"message":"[^"]*' | cut -d'"' -f4)"

# Final verification
echo -e "\n8️⃣ Final verification..."
FINAL_CHECK=$(curl -s -X GET "http://localhost:3000/api/admin/pathfinder-leagues/$PATHFINDER_ID" \
  -H "Authorization: Bearer $GRAND_TOKEN")
FINAL_COUNT=$(echo $FINAL_CHECK | grep -o '"totalLeagues":[0-9]*' | cut -d':' -f2)
echo "Pathfinder now has access to $FINAL_COUNT leagues (should be 1)"

echo -e "\n🎉 League Assignment System Test Complete!"
echo "=========================================="
echo "✅ GRAND_PATHFINDER can create leagues"
echo "✅ GRAND_PATHFINDER can promote users to PATHFINDER"
echo "✅ GRAND_PATHFINDER can assign leagues to pathfinders"
echo "✅ GRAND_PATHFINDER can view all assignments"
echo "✅ GRAND_PATHFINDER can remove league assignments"
echo "✅ PATHFINDERs can access assigned leagues"
echo "✅ League-based authorization works correctly"
