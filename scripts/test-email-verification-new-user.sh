#!/usr/bin/env bash

# Email Verification Flow Test for New Users
# This test creates a user, migrates them, then manually resets email verification to test the OTP flow

echo "🚀 Testing Email Verification Flow for New User"
echo "==============================================="

TIMESTAMP=$(date +%s)
EMAIL="emailverify${TIMESTAMP}@nitj.ac.in"
PASSWORD="EmailVerify123!"
NAME="Email Verify Test ${TIMESTAMP}"

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

# Step 2: Perform migration
echo "2️⃣ Performing migration to V2..."
MIGRATION_RESULT=$(curl -s -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "institute": "Test Institute for Email Verification",
    "department": "Computer Science",
    "graduationYear": 2025,
    "phoneNumber": "+91-9876543210",
    "studentId": "TEST001",
    "discordUsername": "test#1234",
    "portfolioUrl": "https://github.com/test"
  }')

echo "Migration Result:"
echo "$MIGRATION_RESULT" | jq .
echo ""

# Step 3: Manually reset email verification (simulate a user who needs verification)
echo "3️⃣ Manually resetting email verification status..."
RESET_RESULT=$(curl -s -X POST "http://localhost:3000/api/admin/users/$USER_ID/reset-email-verification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Reset Result:"
echo "$RESET_RESULT" | jq .
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
    echo "   ./scripts/verify-otp.sh YOUR_OTP_HERE"
    echo ""
else
    echo "❌ Failed to send OTP email"
    echo "Error: $(echo "$SEND_OTP_RESULT" | jq -r '.error // "Unknown error"')"
fi

# Save token to a file for easy access
echo "$USER_TOKEN" > /tmp/rishi_user_token.txt
echo "💾 User token saved to /tmp/rishi_user_token.txt"
