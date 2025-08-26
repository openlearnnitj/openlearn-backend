#!/bin/bash

echo "🔒 Testing Enhanced Authorization System"
echo "========================================"

# Base URL
BASE_URL="http://localhost:3000"

# Function to get auth token
get_token() {
    local email=$1
    local password=$2
    curl -s -X POST "${BASE_URL}/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" | \
        jq -r '.data.access_token // .access_token // empty'
}

# Function to test endpoint access
test_endpoint() {
    local method=$1
    local endpoint=$2
    local token=$3
    local description=$4
    
    local response=$(curl -s -X "${method}" "${BASE_URL}${endpoint}" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json")
    
    local status=$(echo "$response" | jq -r '.status // .error // "unknown"')
    
    if [[ "$status" == "success" || "$status" == "error" ]]; then
        echo "✅ ${description}: Accessible"
    elif [[ "$status" == "forbidden" || "$response" == *"Forbidden"* || "$response" == *"unauthorized"* ]]; then
        echo "❌ ${description}: Forbidden (Expected for lower roles)"
    else
        echo "❓ ${description}: ${status}"
    fi
}

echo ""
echo "🔐 Getting authentication tokens..."

# Get tokens for different user types
GRAND_TOKEN=$(get_token "admin@openlearn.org.in" "admin123!")
PATHFINDER_TOKEN=$(get_token "developer@openlearn.org.in" "dev123!")
PIONEER_TOKEN=$(get_token "test.pioneer@openlearn.org.in" "pioneer123!")

if [[ -z "$GRAND_TOKEN" ]]; then
    echo "❌ Failed to get GRAND_PATHFINDER token"
    exit 1
fi

if [[ -z "$PATHFINDER_TOKEN" ]]; then
    echo "❌ Failed to get PATHFINDER token"
    exit 1
fi

if [[ -z "$PIONEER_TOKEN" ]]; then
    echo "❌ Failed to get PIONEER token"
    exit 1
fi

echo "✅ Got all authentication tokens"
echo ""

echo "1️⃣ Testing GRAND_PATHFINDER access..."
test_endpoint "GET" "/api/admin/leagues" "$GRAND_TOKEN" "Leagues management"
test_endpoint "GET" "/api/admin/assignments" "$GRAND_TOKEN" "Assignments management"
test_endpoint "GET" "/api/admin/analytics/overview" "$GRAND_TOKEN" "Analytics overview"
test_endpoint "GET" "/api/admin/cohorts" "$GRAND_TOKEN" "Cohorts management"
test_endpoint "GET" "/api/admin/specializations" "$GRAND_TOKEN" "Specializations management"
test_endpoint "GET" "/api/admin/league-assignments/all" "$GRAND_TOKEN" "League assignments management"

echo ""
echo "2️⃣ Testing PATHFINDER access..."
test_endpoint "GET" "/api/admin/leagues" "$PATHFINDER_TOKEN" "Leagues management"
test_endpoint "GET" "/api/admin/assignments" "$PATHFINDER_TOKEN" "Assignments management"
test_endpoint "GET" "/api/admin/analytics/overview" "$PATHFINDER_TOKEN" "Analytics overview"
test_endpoint "GET" "/api/admin/cohorts" "$PATHFINDER_TOKEN" "Cohorts management"
test_endpoint "GET" "/api/admin/specializations" "$PATHFINDER_TOKEN" "Specializations management"
test_endpoint "GET" "/api/admin/league-assignments/all" "$PATHFINDER_TOKEN" "League assignments management"

echo ""
echo "3️⃣ Testing PIONEER access (should be mostly forbidden)..."
test_endpoint "GET" "/api/admin/leagues" "$PIONEER_TOKEN" "Leagues management"
test_endpoint "GET" "/api/admin/assignments" "$PIONEER_TOKEN" "Assignments management"
test_endpoint "GET" "/api/admin/analytics/overview" "$PIONEER_TOKEN" "Analytics overview"
test_endpoint "GET" "/api/admin/cohorts" "$PIONEER_TOKEN" "Cohorts management"
test_endpoint "GET" "/api/admin/specializations" "$PIONEER_TOKEN" "Specializations management"

echo ""
echo "4️⃣ Testing role hierarchy..."
echo "GRAND_PATHFINDER should have god-mode access to all endpoints"
echo "PATHFINDER should have access to assigned leagues only"
echo "PIONEER should have very limited admin access"

echo ""
echo "🎉 Enhanced Authorization Test Complete!"
echo "========================================="
