#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3000"
# API_URL="http://localhost:3000"

echo -e "${BLUE}🔒 Testing Hierarchical League Permissions${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Step 1: Login as CHIEF_PATHFINDER
echo -e "${BLUE}📝 Step 1: Login as CHIEF_PATHFINDER${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "ckesharwani4@gmail.com", "password": "Chahat@1234"}')

echo "Login Response: $LOGIN_RESPONSE"

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Failed to login as Chief Pathfinder${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Chief Pathfinder authenticated${NC}"
echo ""

# Step 2: Get a list of leagues to test against
echo -e "${BLUE}📝 Step 2: Get Available Leagues${NC}"
LEAGUES_RESPONSE=$(curl -s -X GET "$API_URL/api/leagues" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Leagues Response: $LEAGUES_RESPONSE"

# Extract league IDs for testing
LEAGUE_ID_1=$(echo "$LEAGUES_RESPONSE" | jq -r '.data.leagues[0].id // empty')
LEAGUE_ID_2=$(echo "$LEAGUES_RESPONSE" | jq -r '.data.leagues[1].id // empty')
LEAGUE_NAME_1=$(echo "$LEAGUES_RESPONSE" | jq -r '.data.leagues[0].name // empty')
LEAGUE_NAME_2=$(echo "$LEAGUES_RESPONSE" | jq -r '.data.leagues[1].name // empty')

if [ -z "$LEAGUE_ID_1" ] || [ -z "$LEAGUE_ID_2" ]; then
    echo -e "${RED}❌ Need at least 2 leagues to test hierarchical permissions${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found leagues to test:${NC}"
echo -e "${YELLOW}  League 1: $LEAGUE_NAME_1 ($LEAGUE_ID_1)${NC}"
echo -e "${YELLOW}  League 2: $LEAGUE_NAME_2 ($LEAGUE_ID_2)${NC}"
echo ""

# Step 3: Test week creation WITHOUT league permissions (should fail)
echo -e "${BLUE}📝 Step 3: Test Week Creation Without League Permissions${NC}"
WEEK_CREATION_RESPONSE=$(curl -s -X POST "$API_URL/api/weeks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"name\": \"Test Week - Unauthorized\",
    \"description\": \"This should fail if authorization is working\",
    \"order\": 999,
    \"leagueId\": \"$LEAGUE_ID\"
  }")

echo "Week Creation Response: $WEEK_CREATION_RESPONSE"

# Check if week creation was properly blocked
if echo "$WEEK_CREATION_RESPONSE" | grep -q '"success":false'; then
    if echo "$WEEK_CREATION_RESPONSE" | grep -q "No access to this league"; then
        echo -e "${GREEN}✅ EXCELLENT: Chief Pathfinder properly blocked from creating weeks without league permissions${NC}"
    else
        echo -e "${YELLOW}! Week creation blocked, but for different reason: $(echo "$WEEK_CREATION_RESPONSE" | jq -r '.error')${NC}"
    fi
else
    echo -e "${RED}❌ CRITICAL SECURITY ISSUE: Chief Pathfinder can create weeks without league permissions!${NC}"
fi
echo ""

# Step 4: Test section creation WITHOUT league permissions (should fail)
echo -e "${BLUE}📝 Step 4: Test Section Creation Without League Permissions${NC}"

# First get a week ID from the league
WEEKS_RESPONSE=$(curl -s -X GET "$API_URL/api/weeks/league/$LEAGUE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

WEEK_ID=$(echo "$WEEKS_RESPONSE" | jq -r '.data[0].id // empty')

if [ -n "$WEEK_ID" ]; then
    SECTION_CREATION_RESPONSE=$(curl -s -X POST "$API_URL/api/sections" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d "{
        \"name\": \"Test Section - Unauthorized\",
        \"description\": \"This should fail if authorization is working\",
        \"order\": 999,
        \"weekId\": \"$WEEK_ID\"
      }")

    echo "Section Creation Response: $SECTION_CREATION_RESPONSE"

    # Check if section creation was properly blocked
    if echo "$SECTION_CREATION_RESPONSE" | grep -q '"success":false'; then
        if echo "$SECTION_CREATION_RESPONSE" | grep -q "No access to this league"; then
            echo -e "${GREEN}✅ EXCELLENT: Chief Pathfinder properly blocked from creating sections without league permissions${NC}"
        else
            echo -e "${YELLOW}! Section creation blocked, but for different reason: $(echo "$SECTION_CREATION_RESPONSE" | jq -r '.error')${NC}"
        fi
    else
        echo -e "${RED}❌ CRITICAL SECURITY ISSUE: Chief Pathfinder can create sections without league permissions!${NC}"
    fi
else
    echo -e "${YELLOW}! No weeks found in league to test section creation${NC}"
fi
echo ""

# Step 5: Test with GRAND_PATHFINDER (should succeed)
echo -e "${BLUE}📝 Step 5: Login as GRAND_PATHFINDER (should have god-mode access)${NC}"
GRAND_LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "grand@openlearn.org.in", "password": "grand@123"}')

echo "Grand Login Response: $GRAND_LOGIN_RESPONSE"

GRAND_ACCESS_TOKEN=$(echo "$GRAND_LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -n "$GRAND_ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✅ Grand Pathfinder authenticated${NC}"
    
    # Test week creation with Grand Pathfinder (should succeed)
    GRAND_WEEK_RESPONSE=$(curl -s -X POST "$API_URL/api/weeks" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $GRAND_ACCESS_TOKEN" \
      -d "{
        \"name\": \"Test Week - Grand Pathfinder\",
        \"description\": \"This should succeed with god-mode access\",
        \"order\": 998,
        \"leagueId\": \"$LEAGUE_ID\"
      }")

    echo "Grand Week Creation Response: $GRAND_WEEK_RESPONSE"

    if echo "$GRAND_WEEK_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ EXCELLENT: Grand Pathfinder can create weeks (god-mode working)${NC}"
        
        # Clean up the test week
        CREATED_WEEK_ID=$(echo "$GRAND_WEEK_RESPONSE" | jq -r '.data.id // empty')
        if [ -n "$CREATED_WEEK_ID" ]; then
            curl -s -X DELETE "$API_URL/api/weeks/$CREATED_WEEK_ID" \
              -H "Authorization: Bearer $GRAND_ACCESS_TOKEN" > /dev/null
            echo -e "${BLUE}🧹 Cleaned up test week${NC}"
        fi
    else
        echo -e "${RED}❌ ISSUE: Grand Pathfinder cannot create weeks (god-mode not working)${NC}"
    fi
else
    echo -e "${YELLOW}! Could not test Grand Pathfinder access (login failed)${NC}"
fi
echo ""

echo -e "${BLUE}🔍 Summary:${NC}"
echo -e "${BLUE}==========${NC}"
echo -e "${YELLOW}✅ If Chief Pathfinder is blocked from creating weeks/sections: SECURITY IS WORKING${NC}"
echo -e "${YELLOW}❌ If Chief Pathfinder can create weeks/sections: CRITICAL SECURITY ISSUE${NC}"
echo -e "${YELLOW}✅ If Grand Pathfinder can create weeks/sections: GOD-MODE IS WORKING${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${YELLOW}1. If tests pass: Chief Pathfinders need explicit league assignments to create content${NC}"
echo -e "${YELLOW}2. Use GRAND_PATHFINDER to assign Chief Pathfinders to specific leagues${NC}"
echo -e "${YELLOW}3. Test that assigned Chief Pathfinders can then create content in their assigned leagues${NC}"
