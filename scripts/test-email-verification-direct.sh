#!/usr/bin/env bash

# Simple Email Verification Test
# This test bypasses migration and directly tests email verification on a new user

echo "🚀 Testing Email Verification Flow (No Migration)"
echo "================================================"

TIMESTAMP=$(date +%s)
EMAIL="www.rishiahuja@gmail.com"
PASSWORD="My*54007#"
NAME="Rishi Direct Test"

echo "📧 Email: $EMAIL"
echo "👤 Name: $NAME"
echo ""

# # Step 1: Create new user
# echo "1️⃣ Creating new user..."
# SIGNUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/signup" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "name": "'"$NAME"'",
#     "email": "'"$EMAIL"'",
#     "password": "'"$PASSWORD"'"
#   }')

# echo "Signup Response:"
# echo "$SIGNUP_RESPONSE" | jq .
# echo ""
# Test with existing test pioneer
echo "🔐 Login as existing test pioneer..."
USER_LOGIN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "www.rishiahuja@gmail.com",
    "password": "My*54007#"
  }')

echo "Login Response: $USER_LOGIN"
echo ""
# Extract user token
USER_TOKEN=$(echo $USER_LOGIN | jq -r '.data.accessToken // empty')
USER_ID=$(echo $USER_LOGIN | jq -r '.data.user.id // empty')

if [ -z "$USER_TOKEN" ]; then
    echo "❌ Failed to create user or get token"
    exit 1
fi

echo "✅ User created successfully!"
echo "🆔 User ID: $USER_ID"
echo "🔑 Token: ${USER_TOKEN:0:20}..."
echo ""

# Step 2: Check initial email verification status (should be false)
echo "2️⃣ Checking initial email verification status..."
EMAIL_STATUS=$(curl -s -X GET "http://localhost:3000/api/auth/email-verification/verification-status" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "Initial Email Verification Status:"
echo "$EMAIL_STATUS" | jq .
echo ""

# Step 3: Send OTP email
echo "3️⃣ Sending OTP email..."
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
    echo "3. Or verify manually with:"
    echo "   curl -X POST \"http://localhost:3000/api/auth/email-verification/verify-otp\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -H \"Authorization: Bearer $USER_TOKEN\" \\"
    echo "     -d '{\"otp\": \"YOUR_OTP_HERE\"}'"
    echo ""
else
    echo "❌ Failed to send OTP email"
    echo "Error: $(echo "$SEND_OTP_RESULT" | jq -r '.error // "Unknown error"')"
fi

# Save token to a file for easy access
echo "$USER_TOKEN" > /tmp/rishi_user_token.txt
echo "💾 User token saved to /tmp/rishi_user_token.txt"
