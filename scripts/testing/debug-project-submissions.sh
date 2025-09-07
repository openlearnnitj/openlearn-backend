#!/bin/bash

# Debug script for project submission issues

echo "🔍 Debugging Project Submission System"
echo "======================================"

BASE_URL="${1:-https://api.openlearn.org.in}"

echo "Testing against: $BASE_URL"
echo ""

echo "📋 Step 1: Health Check"
echo "----------------------"
curl -s "$BASE_URL/api/project-submissions/health" | jq .

echo ""
echo "📋 Step 2: Test with Known Registered Users"
echo "------------------------------------------"

# Test with the failing case
curl -s -X POST "$BASE_URL/api/project-submissions/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "teamNumber": 999,
    "teamName": "Debug Team",
    "teamLead": {
      "name": "Chahat Kesharwani",
      "email": "ckesharwani4@gmail.com"
    },
    "member2": {
      "name": "Rishi Ahuja",
      "email": "www.rishiahuja@gmail.com"
    },
    "projectTitle": "Debug Test",
    "projectDescription": "Testing the system",
    "demoYoutubeLink": "https://youtube.com/watch?v=test",
    "githubUrl": "https://github.com/test/test"
  }' | jq .

echo ""
echo "📋 Step 3: Test with Simpler Data"
echo "--------------------------------"

# Test with minimal data
curl -s -X POST "$BASE_URL/api/project-submissions/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "teamNumber": 998,
    "teamName": "Simple Test",
    "teamLead": {
      "name": "Test Lead",
      "email": "ckesharwani4@gmail.com"
    },
    "member2": {
      "name": "Test Member",
      "email": "www.rishiahuja@gmail.com"
    },
    "projectTitle": "Simple Test Project",
    "projectDescription": "Simple test description",
    "demoYoutubeLink": "https://youtube.com/watch?v=test123",
    "githubUrl": "https://github.com/test/simple"
  }' | jq .

echo ""
echo "✅ Debug testing complete!"
