#!/bin/bash

# Test Project Submission System

echo "🚀 Testing Project Submission System"
echo "===================================="

BASE_URL="http://localhost:3001"

echo ""
echo "📋 Test 1: Submit Valid Project (with registered users)"
echo "------------------------------------------------------"

# Test submission with mock data
curl -s -X POST "${BASE_URL}/api/project-submissions/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "teamNumber": 1,
    "teamName": "Team Alpha",
    "teamLead": {
      "name": "John Doe",
      "email": "www.rishiahuja@gmail.com"
    },
    "member2": {
      "name": "Jane Smith", 
      "email": "ckesharwani4@gmail.com"
    },
    "projectTitle": "AI-Powered Learning Platform",
    "projectDescription": "An innovative platform that uses AI to personalize learning experiences for students.",
    "demoYoutubeLink": "https://youtube.com/watch?v=demo123",
    "githubUrl": "https://github.com/team-alpha/project",
    "deployedUrl": "https://project.team-alpha.com"
  }' | jq .

echo ""
echo "📋 Test 2: Submit with Invalid Email"
echo "-----------------------------------"

curl -s -X POST "${BASE_URL}/api/project-submissions/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "teamNumber": 2,
    "teamName": "Team Beta",
    "teamLead": {
      "name": "Invalid User",
      "email": "notregistered@nowhere.com"
    },
    "member2": {
      "name": "Another Invalid",
      "email": "alsofake@nowhere.com"
    },
    "projectTitle": "Test Project",
    "projectDescription": "This should fail validation",
    "demoYoutubeLink": "https://youtube.com/watch?v=test",
    "githubUrl": "https://github.com/test/test"
  }' | jq .

echo ""
echo "📋 Test 3: Missing Required Fields"
echo "---------------------------------"

curl -s -X POST "${BASE_URL}/api/project-submissions/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "teamNumber": 3,
    "teamName": "Team Gamma"
  }' | jq .

echo ""
echo "✅ Project submission testing complete!"
echo "Note: Replace the test emails with actual registered user emails to test successfully."
