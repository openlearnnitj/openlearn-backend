#!/usr/bin/env bash

# Quick Migration Test using existing test user
# This tests the migration endpoint that was originally failing

echo "🚀 Quick Migration Test with Existing User"
echo ""

# Test with existing test pioneer
echo "🔐 Login as existing test pioneer..."
USER_LOGIN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.pioneer@openlearn.org.in",
    "password": "pioneer123!"
  }')

echo "Login Response: $USER_LOGIN"
echo ""

# Extract token
USER_TOKEN=$(echo $USER_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_TOKEN" ]; then
    echo "❌ Failed to get user token"
    exit 1
fi

echo "✅ Got user token: ${USER_TOKEN:0:20}..."
echo ""

# Check migration status
echo "📊 Checking migration status..."
MIGRATION_STATUS=$(curl -s -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Migration Status: $MIGRATION_STATUS"
echo ""

# Perform migration if needed
echo "🔄 Attempting migration..."
MIGRATION_RESULT=$(curl -s -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "institute": "Test Institute via Script",
    "department": "Computer Science",
    "graduationYear": 2026,
    "phoneNumber": "+91-9876543210",
    "studentId": "SCRIPT001",
    "discordUsername": "script_test#1234",
    "portfolioUrl": "https://github.com/scripttest"
  }')

echo "Migration Result: $MIGRATION_RESULT"
echo ""

# Check final status
echo "📊 Checking final migration status..."
FINAL_STATUS=$(curl -s -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Final Status: $FINAL_STATUS"
echo ""

if echo "$MIGRATION_RESULT" | grep -q '"success":true'; then
    echo "✅ Migration test completed successfully!"
else
    echo "❌ Migration test failed"
fi
