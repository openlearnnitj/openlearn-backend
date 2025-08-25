#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:3000"
TEST_EMAIL="www.rishiahuja@gmail.com"

echo -e "${BLUE}=== Password Reset Flow Test ===${NC}"
echo -e "${YELLOW}Testing OTP-based password reset functionality${NC}"
echo ""

# Test 1: Send Password Reset OTP
echo -e "${BLUE}Test 1: Send Password Reset OTP${NC}"
SEND_OTP_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "Request: POST /api/auth/password-reset/send-otp"
echo "Body: {\"email\": \"$TEST_EMAIL\"}"
echo "Response: $SEND_OTP_RESPONSE"

# Check if OTP send was successful
if echo "$SEND_OTP_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ OTP send request successful${NC}"
else
    echo -e "${RED}✗ OTP send request failed${NC}"
fi
echo ""

# Test 2: Check Password Reset Status
echo -e "${BLUE}Test 2: Check Password Reset Status${NC}"
STATUS_RESPONSE=$(curl -s -X GET "$SERVER_URL/api/auth/password-reset/status?email=$TEST_EMAIL")

echo "Request: GET /api/auth/password-reset/status?email=$TEST_EMAIL"
echo "Response: $STATUS_RESPONSE"

# Check if status check was successful
if echo "$STATUS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Status check successful${NC}"
else
    echo -e "${RED}✗ Status check failed${NC}"
fi
echo ""

# Test 3: Try to verify OTP with invalid OTP
echo -e "${BLUE}Test 3: Verify OTP with Invalid Code${NC}"
VERIFY_INVALID_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"otp\": \"123456\"}")

echo "Request: POST /api/auth/password-reset/verify-otp"
echo "Body: {\"email\": \"$TEST_EMAIL\", \"otp\": \"123456\"}"
echo "Response: $VERIFY_INVALID_RESPONSE"

# Check if invalid OTP is properly rejected
if echo "$VERIFY_INVALID_RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ Invalid OTP properly rejected${NC}"
else
    echo -e "${RED}✗ Invalid OTP not properly rejected${NC}"
fi
echo ""

# Test 4: Try to reset password with invalid OTP
echo -e "${BLUE}Test 4: Reset Password with Invalid OTP${NC}"
RESET_INVALID_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"otp\": \"123456\", \"newPassword\": \"NewSecurePassword123!\"}")

echo "Request: POST /api/auth/password-reset/reset-password"
echo "Body: {\"email\": \"$TEST_EMAIL\", \"otp\": \"123456\", \"newPassword\": \"NewSecurePassword123!\"}"
echo "Response: $RESET_INVALID_RESPONSE"

# Check if invalid OTP is properly rejected for password reset
if echo "$RESET_INVALID_RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ Password reset with invalid OTP properly rejected${NC}"
else
    echo -e "${RED}✗ Password reset with invalid OTP not properly rejected${NC}"
fi
echo ""

# Test 5: Test validation errors
echo -e "${BLUE}Test 5: Test Input Validation${NC}"

# Test invalid email format
echo -e "${YELLOW}5a: Invalid email format${NC}"
INVALID_EMAIL_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"invalid-email\"}")

echo "Request: POST /api/auth/password-reset/send-otp"
echo "Body: {\"email\": \"invalid-email\"}"
echo "Response: $INVALID_EMAIL_RESPONSE"

if echo "$INVALID_EMAIL_RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ Invalid email format properly rejected${NC}"
else
    echo -e "${RED}✗ Invalid email format not properly rejected${NC}"
fi
echo ""

# Test weak password
echo -e "${YELLOW}5b: Weak password${NC}"
WEAK_PASSWORD_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"otp\": \"123456\", \"newPassword\": \"weak\"}")

echo "Request: POST /api/auth/password-reset/reset-password"
echo "Body: {\"email\": \"$TEST_EMAIL\", \"otp\": \"123456\", \"newPassword\": \"weak\"}"
echo "Response: $WEAK_PASSWORD_RESPONSE"

if echo "$WEAK_PASSWORD_RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ Weak password properly rejected${NC}"
else
    echo -e "${RED}✗ Weak password not properly rejected${NC}"
fi
echo ""

# Test 6: Rate limiting (send multiple OTPs quickly)
echo -e "${BLUE}Test 6: Rate Limiting${NC}"
echo -e "${YELLOW}Sending multiple OTP requests quickly to test rate limiting${NC}"

# Send first OTP
OTP1_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"ratelimit@example.com\"}")
echo "First OTP request: $OTP1_RESPONSE"

# Immediately send second OTP
OTP2_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/password-reset/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"ratelimit@example.com\"}")
echo "Second OTP request (immediate): $OTP2_RESPONSE"

if echo "$OTP2_RESPONSE" | grep -q "wait"; then
    echo -e "${GREEN}✓ Rate limiting is working${NC}"
else
    echo -e "${YELLOW}! Rate limiting might not be working (or user doesn't exist)${NC}"
fi
echo ""

echo -e "${BLUE}=== Password Reset Flow Test Complete ===${NC}"
echo -e "${YELLOW}Note: This test uses non-existent emails, so actual OTPs won't be sent.${NC}"
echo -e "${YELLOW}The service returns success for non-existent emails for security.${NC}"
echo -e "${YELLOW}To test with real emails, create a test user first and use their email.${NC}"
