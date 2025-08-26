#!/usr/bin/env bash

# Complete Migration Test - Create user and test migration
# This creates a fresh user and tests the full migration flow

echo "🚀 Complete Migration Test with Fresh User"
echo "=========================================="

TIMESTAMP=$(date +%s)
EMAIL="migration${TIMESTAMP}@nitj.ac.in"
PASSWORD="MigrationTest123!"
NAME="Migration Test User ${TIMESTAMP}"

echo "📧 Email: $EMAIL"
echo "👤 Name: $NAME"
echo ""

# Step 1: Create new user
echo "1️⃣ Creating new user..."
SIGNUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'$NAME'",
    "email": "'$EMAIL'",
    "password": "'$PASSWORD'"
  }')

echo "Signup Response: $SIGNUP_RESPONSE"
echo ""

# Step 2: Login to get token
echo "2️⃣ Logging in..."
USER_LOGIN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$EMAIL'",
    "password": "'$PASSWORD'"
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

# Step 3: Check migration status
echo "3️⃣ Checking migration status..."
MIGRATION_STATUS=$(curl -s -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Migration Status: $MIGRATION_STATUS"
echo ""

# Step 4: Perform migration
echo "4️⃣ Attempting migration..."
MIGRATION_RESULT=$(curl -s -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "institute": "NIT Jalandhar",
    "department": "Computer Science & Engineering",
    "graduationYear": 2026,
    "phoneNumber": "+91-9876543210",
    "studentId": "MIGRATION'$TIMESTAMP'",
    "discordUsername": "migration_test_'$TIMESTAMP'",
    "portfolioUrl": "https://github.com/migrationtest'$TIMESTAMP'"
  }')

echo "Migration Result: $MIGRATION_RESULT"
echo ""

# Step 5: Check final status
echo "5️⃣ Checking final migration status..."
FINAL_STATUS=$(curl -s -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Final Status: $FINAL_STATUS"
echo ""

if echo "$MIGRATION_RESULT" | grep -q '"success":true'; then
    echo "✅ Migration test completed successfully!"
else
    echo "❌ Migration test failed"
    echo "Check the migration result above for details"
fi
