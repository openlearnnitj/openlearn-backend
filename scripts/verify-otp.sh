#!/usr/bin/env bash

# Quick OTP Verification Script
# Usage: ./verify-otp.sh 123456

if [ -z "$1" ]; then
    echo "❌ Please provide the OTP code"
    echo "Usage: ./verify-otp.sh YOUR_OTP_CODE"
    echo ""
    echo "💡 Check your email for the 6-digit OTP code"
    exit 1
fi

OTP="$1"

# Get the saved token
if [ -f "/tmp/rishi_user_token.txt" ]; then
    USER_TOKEN=$(cat /tmp/rishi_user_token.txt)
else
    echo "❌ User token not found. Run the email flow test first."
    exit 1
fi

echo "🔢 Verifying OTP: $OTP"
echo "🔑 Using saved token..."
echo ""

# Verify OTP
VERIFY_RESULT=$(curl -s -X POST "http://localhost:3000/api/auth/email-verification/verify-email-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "otp": "'"$OTP"'"
  }')

echo "Verification Result:"
echo "$VERIFY_RESULT" | jq .
echo ""

if echo "$VERIFY_RESULT" | jq -e '.success' > /dev/null; then
    echo "✅ Email verification successful!"
    
    # Check final email verification status
    echo ""
    echo "📊 Checking final email verification status..."
    FINAL_STATUS=$(curl -s -X GET "http://localhost:3000/api/auth/email-verification/verification-status" \
      -H "Authorization: Bearer $USER_TOKEN")
    
    echo "Final Status:"
    echo "$FINAL_STATUS" | jq .
    echo ""
    
    echo "🎉 Email verification flow completed successfully!"
else
    echo "❌ Email verification failed"
    ERROR_MSG=$(echo "$VERIFY_RESULT" | jq -r '.error // "Unknown error"')
    echo "Error: $ERROR_MSG"
    
    echo ""
    echo "💡 Possible issues:"
    echo "   - OTP might be expired (valid for 10 minutes)"
    echo "   - OTP might be incorrect"
    echo "   - You can request a new OTP if needed"
fi
