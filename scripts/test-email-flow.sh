#!/usr/bin/env bash

# Complete Email Verification Flow Test
# This test covers: Registration → Migration → Email OTP → Verification

echo "🚀 Testing Email Verification Flow with Real Email"
echo "=================================================="

EMAIL="rishi.it.24@nitj.ac.in"
PASSWORD="RishiTest123!"
NAME="Rishi"

echo "📧 Email: $EMAIL"
echo "👤 Name: $NAME"
echo ""

# Step 1: Create new user
echo "1️⃣ Creating new user..."
SIGNUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'"$NAME"'",
    "email": "'"$EMAIL"'",
    "password": "'"$PASSWORD"'"
  }')

echo "Signup Response:"
echo "$SIGNUP_RESPONSE" | jq .
echo ""

# Extract user token
USER_TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.accessToken // empty')
USER_ID=$(echo $SIGNUP_RESPONSE | jq -r '.data.user.id // empty')

if [ -z "$USER_TOKEN" ]; then
    echo "❌ Failed to create user or get token"
    exit 1
fi

echo "✅ User created successfully!"
echo "🆔 User ID: $USER_ID"
echo "🔑 Token: ${USER_TOKEN:0:20}..."
echo ""

# Step 2: Check migration status
echo "2️⃣ Checking migration status..."
MIGRATION_STATUS=$(curl -s -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Migration Status:"
echo "$MIGRATION_STATUS" | jq .
echo ""

# Step 3: Perform migration
echo "3️⃣ Performing migration to V2..."
MIGRATION_RESULT=$(curl -s -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "institute": "Indian Institute of Technology",
    "department": "Computer Science and Engineering",
    "graduationYear": 2025,
    "phoneNumber": "+91-9876543210",
    "studentId": "RISHI001",
    "discordUsername": "rishi#1234",
    "portfolioUrl": "https://github.com/rishi"
  }')

echo "Migration Result:"
echo "$MIGRATION_RESULT" | jq .
echo ""

# Step 4: Check email verification status
echo "4️⃣ Checking email verification status..."
EMAIL_STATUS=$(curl -s -X GET "http://localhost:3000/api/auth/email-verification/verification-status" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Email Verification Status:"
echo "$EMAIL_STATUS" | jq .
echo ""

# Step 5: Send OTP email
echo "5️⃣ Sending OTP email..."
SEND_OTP_RESULT=$(curl -s -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Send OTP Result:"
echo "$SEND_OTP_RESULT" | jq .
echo ""

if echo "$SEND_OTP_RESULT" | jq -e '.success' > /dev/null; then
    echo "✅ OTP email sent successfully!"
    echo ""
    echo "📧 Please check your email: $EMAIL"
    echo "📱 Look for an email from OpenLearn Platform"
    echo "🔢 Find the 6-digit OTP code in the email"
    echo ""
    echo "📋 Next steps:"
    echo "1. Check your email for the OTP"
    echo "2. Run the verification command when you have the OTP:"
    echo ""
    echo "   curl -X POST \"http://localhost:3000/api/auth/email-verification/verify-otp\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -H \"Authorization: Bearer $USER_TOKEN\" \\"
    echo "     -d '{\"otp\": \"YOUR_OTP_HERE\"}'"
    echo ""
    echo "3. Or save this token and wait for instructions:"
    echo "   TOKEN=\"$USER_TOKEN\""
    echo ""
else
    echo "❌ Failed to send OTP email"
    echo "Error: $(echo "$SEND_OTP_RESULT" | jq -r '.error // "Unknown error"')"
fi

# Save token to a file for easy access
echo "$USER_TOKEN" > /tmp/rishi_user_token.txt
echo "💾 User token saved to /tmp/rishi_user_token.txt"
