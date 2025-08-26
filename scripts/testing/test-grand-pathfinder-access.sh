#!/usr/bin/env bash

# Comprehensive GRAND_PATHFINDER Access Testing
# This script tests all major endpoints to identify scope-based access issues

echo "🔱 Testing GRAND_PATHFINDER Access to All Endpoints"
echo "=================================================="

# Configuration
BASE_URL="http://localhost:3000"
GRAND_EMAIL="grand.pathfinder@openlearn.org.in"
GRAND_PASSWORD="GrandPath123!"

echo "🔐 Logging in as GRAND_PATHFINDER..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$GRAND_EMAIL'",
    "password": "'$GRAND_PASSWORD'"
  }')

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Extract token
GRAND_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$GRAND_TOKEN" ]; then
    echo "❌ Failed to get GRAND_PATHFINDER token"
    exit 1
fi

echo "✅ Got GRAND_PATHFINDER token: ${GRAND_TOKEN:0:30}..."
echo ""

# Test 1: Admin Routes
echo "1️⃣ Testing Admin Routes"
echo "======================"

echo "📊 Getting all users..."
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Users Response: ${USERS_RESPONSE:0:200}..."
echo ""

echo "📈 Getting user statistics..."
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/users/stats" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Stats Response: $STATS_RESPONSE"
echo ""

# Test 2: Cohort Management
echo "2️⃣ Testing Cohort Management"
echo "============================"

echo "📚 Getting all cohorts..."
COHORTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cohorts" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Cohorts Response: $COHORTS_RESPONSE"
echo ""

echo "➕ Creating a new cohort..."
NEW_COHORT=$(curl -s -X POST "$BASE_URL/api/cohorts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{
    "name": "Test Cohort from Grand Pathfinder",
    "description": "Testing cohort creation with grand pathfinder access",
    "startDate": "2025-09-01T00:00:00.000Z",
    "endDate": "2025-12-01T00:00:00.000Z",
    "maxStudents": 50,
    "isActive": true
  }')
echo "New Cohort Response: $NEW_COHORT"
echo ""

# Test 3: League Management
echo "3️⃣ Testing League Management"
echo "============================"

echo "🏆 Getting all leagues..."
LEAGUES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/leagues" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Leagues Response: $LEAGUES_RESPONSE"
echo ""

echo "➕ Creating a new league..."
NEW_LEAGUE=$(curl -s -X POST "$BASE_URL/api/leagues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{
    "name": "Grand Pathfinder Test League",
    "description": "Testing league creation with grand pathfinder access",
    "type": "COMPETITIVE",
    "startDate": "2025-09-01T00:00:00.000Z",
    "endDate": "2025-11-01T00:00:00.000Z",
    "maxParticipants": 100,
    "isActive": true
  }')
echo "New League Response: $NEW_LEAGUE"
echo ""

# Test 4: Specialization Management
echo "4️⃣ Testing Specialization Management"
echo "===================================="

echo "🎯 Getting all specializations..."
SPECS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/specializations" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Specializations Response: $SPECS_RESPONSE"
echo ""

echo "➕ Creating a new specialization..."
NEW_SPEC=$(curl -s -X POST "$BASE_URL/api/specializations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAND_TOKEN" \
  -d '{
    "name": "Grand Pathfinder Test Specialization",
    "description": "Testing specialization creation",
    "isActive": true
  }')
echo "New Specialization Response: $NEW_SPEC"
echo ""

# Test 5: PathfinderScope Management (This is where we expect issues)
echo "5️⃣ Testing PathfinderScope Management"
echo "====================================="

echo "🔍 Getting all pathfinder scopes..."
SCOPES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/pathfinder-scopes" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Scopes Response: $SCOPES_RESPONSE"
echo ""

# Test 6: Analytics Access
echo "6️⃣ Testing Analytics Access"
echo "==========================="

echo "📊 Getting platform analytics..."
ANALYTICS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/analytics/platform" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Analytics Response: $ANALYTICS_RESPONSE"
echo ""

# Test 7: Email Management
echo "7️⃣ Testing Email Management"
echo "==========================="

echo "📧 Getting email templates..."
EMAIL_TEMPLATES=$(curl -s -X GET "$BASE_URL/api/emails/templates" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Email Templates Response: $EMAIL_TEMPLATES"
echo ""

# Test 8: Badge Management
echo "8️⃣ Testing Badge Management"
echo "==========================="

echo "🏅 Getting all badges..."
BADGES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/badges" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Badges Response: $BADGES_RESPONSE"
echo ""

# Test 9: Assignment Management
echo "9️⃣ Testing Assignment Management"
echo "================================"

echo "📝 Getting all assignments..."
ASSIGNMENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/assignments" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Assignments Response: $ASSIGNMENTS_RESPONSE"
echo ""

# Test 10: Leaderboard Access
echo "🔟 Testing Leaderboard Access"
echo "============================="

echo "🏆 Getting global leaderboard..."
LEADERBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/api/leaderboard/global" \
  -H "Authorization: Bearer $GRAND_TOKEN")
echo "Leaderboard Response: $LEADERBOARD_RESPONSE"
echo ""

# Summary
echo ""
echo "🎉 GRAND_PATHFINDER Access Test Complete!"
echo "=========================================="
echo "✅ Login: Success"
echo "📊 Admin Routes: Tested"
echo "📚 Cohort Management: Tested" 
echo "🏆 League Management: Tested"
echo "🎯 Specialization Management: Tested"
echo "🔍 PathfinderScope Management: Tested"
echo "📈 Analytics: Tested"
echo "📧 Email Management: Tested"
echo "🏅 Badge Management: Tested"
echo "📝 Assignment Management: Tested"
echo "🏆 Leaderboard: Tested"
echo ""
echo "🔍 Check the responses above for any authorization failures!"
echo "❗ Pay special attention to newly created resources access issues"
