#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:3000"
TEST_EMAIL="rishia.it.24@nitj.ac.in"
TEST_PASSWORD="TempPassword123!"

echo -e "${BLUE}=== Password Reset End-to-End Test ===${NC}"
echo -e "${YELLOW}Creating a real user and testing password reset with actual OTP${NC}"
echo ""

# Step 1: Create a test user
echo -e "${BLUE}Step 1: Create Test User${NC}"
CREATE_USER_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"Password Test User\",
    \"institute\": \"Test University\",
    \"department\": \"Computer Science\"
  }")

echo "Request: POST /api/auth/register"
echo "Response: $CREATE_USER_RESPONSE"

if echo "$CREATE_USER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Test user created successfully${NC}"
else
    echo -e "${YELLOW}! User might already exist or registration failed${NC}"
fi
echo ""

# Step 2: Send password reset OTP
echo -e "${BLUE}Step 2: Send Password Reset OTP${NC}"
SEND_OTP_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Request: POST /api/auth/password-reset/send-otp"
echo "Response: $SEND_OTP_RESPONSE"

if echo "$SEND_OTP_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ OTP sent successfully${NC}"
else
    echo -e "${RED}✗ Failed to send OTP${NC}"
    exit 1
fi
echo ""

# Step 3: Check pending OTP status
echo -e "${BLUE}Step 3: Check Pending OTP Status${NC}"
STATUS_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/auth/password-reset/status?email=$TEST_EMAIL")

echo "Request: GET /api/auth/password-reset/status?email=$TEST_EMAIL"
echo "Response: $STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | grep -q '"hasPendingOTP":true'; then
    echo -e "${GREEN}✓ Pending OTP status correctly shows true${NC}"
else
    echo -e "${RED}✗ Pending OTP status not correct${NC}"
fi
echo ""

# Step 4: Test rate limiting with real user
echo -e "${BLUE}Step 4: Test Rate Limiting${NC}"
sleep 1 # Small delay
RATE_LIMIT_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Request: POST /api/auth/password-reset/send-otp (second request)"
echo "Response: $RATE_LIMIT_RESPONSE"

if echo "$RATE_LIMIT_RESPONSE" | grep -q "wait"; then
    echo -e "${GREEN}✓ Rate limiting is working correctly${NC}"
else
    echo -e "${YELLOW}! Rate limiting might not be triggered (check timing)${NC}"
fi
echo ""

# Step 5: Login to verify current password still works
echo -e "${BLUE}Step 5: Verify Current Password Still Works${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

echo "Request: POST /api/auth/login"
echo "Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Original password still works${NC}"
else
    echo -e "${RED}✗ Original password not working${NC}"
fi
echo ""

echo -e "${BLUE}=== Manual Testing Instructions ===${NC}"
echo -e "${YELLOW}To complete the end-to-end test, you need to:${NC}"
echo -e "${YELLOW}1. Check your email logs/service for the OTP sent to: $TEST_EMAIL${NC}"
echo -e "${YELLOW}2. Use the OTP with these curl commands:${NC}"
echo ""
echo -e "${BLUE}Verify OTP:${NC}"
echo "curl -X POST $SERVER_URL/api/auth/password-reset/verify-otp \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\": \"$TEST_EMAIL\", \"otp\": \"YOUR_OTP_HERE\"}'"
echo ""
echo -e "${BLUE}Reset Password:${NC}"
echo "curl -X POST $SERVER_URL/api/auth/password-reset/reset-password \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\": \"$TEST_EMAIL\", \"otp\": \"YOUR_OTP_HERE\", \"newPassword\": \"NewSecurePassword123!\"}'"
echo ""
echo -e "${BLUE}Test New Password:${NC}"
echo "curl -X POST $SERVER_URL/api/auth/login \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\": \"$TEST_EMAIL\", \"password\": \"NewSecurePassword123!\"}'"
echo ""
echo -e "${YELLOW}Note: Check your email service logs to see the actual OTP that was sent.${NC}"
