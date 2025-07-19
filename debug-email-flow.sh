#!/bin/bash
# 🚨 Production Email Debugging Flow
# This script runs a complete debugging flow for email delivery issues

set -e

echo "🚨 OpenLearn Production Email Debug Flow"
echo "========================================"
echo

# Check if email argument is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide an email address to test"
    echo "Usage: ./debug-email-flow.sh your-email@domain.com"
    exit 1
fi

TEST_EMAIL="$1"
echo "🎯 Target email: $TEST_EMAIL"
echo

# Step 1: Check environment
echo "📋 Step 1: Checking production environment..."
node src/scripts/checkProductionEnv.js
if [ $? -ne 0 ]; then
    echo "💀 Environment check failed. Fix the issues above before continuing."
    exit 1
fi
echo "✅ Environment check passed!"
echo

# Step 2: Check if application is running
echo "📊 Step 2: Checking if application is running..."
if docker ps | grep -q openlearn-backend; then
    echo "✅ Docker container is running"
    CONTAINER_NAME=$(docker ps --format "table {{.Names}}" | grep openlearn-backend | head -1)
    echo "   Container: $CONTAINER_NAME"
elif pgrep -f "node.*server" > /dev/null; then
    echo "✅ Node.js server is running"
elif systemctl is-active --quiet openlearn-backend 2>/dev/null; then
    echo "✅ Systemd service is running"
else
    echo "⚠️  Cannot detect running application. This may cause issues."
fi
echo

# Step 3: Check recent logs for errors
echo "📝 Step 3: Checking recent logs for email-related errors..."
echo "Looking for recent email errors..."

# Try different log sources
if docker logs openlearn-backend-app-1 --tail=100 2>/dev/null | grep -i "error.*email\|failed.*email\|resend.*error" | head -5; then
    echo "⚠️  Found email-related errors in Docker logs (showing last 5)"
elif journalctl -u openlearn-backend --lines=100 --no-pager 2>/dev/null | grep -i "error.*email\|failed.*email\|resend.*error" | head -5; then
    echo "⚠️  Found email-related errors in systemd logs (showing last 5)"
else
    echo "✅ No recent email errors found in logs"
fi
echo

# Step 4: Test the email service directly
echo "📧 Step 4: Testing email service with debug script..."
npm run debug:email "$TEST_EMAIL"
if [ $? -eq 0 ]; then
    echo "✅ Email debug script completed successfully!"
else
    echo "❌ Email debug script failed. Check the output above for details."
fi
echo

# Step 5: Test the actual API endpoint
echo "🌐 Step 5: Testing password reset API endpoint..."
echo "Sending request to password reset endpoint..."

# Detect the application URL
if [ -f ".env" ] && grep -q "PORT" .env; then
    PORT=$(grep "PORT" .env | cut -d '=' -f2)
else
    PORT=3000
fi

API_URL="http://localhost:$PORT"

# Test the endpoint
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/password-reset/request-otp" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\"}" \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "Response Status: $HTTP_CODE"
echo "Response Body: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API endpoint responded successfully!"
elif [ "$HTTP_CODE" = "429" ]; then
    echo "⚠️  Rate limit hit - this is normal behavior"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ Cannot connect to application. Is it running on port $PORT?"
else
    echo "❌ API endpoint returned error code: $HTTP_CODE"
fi
echo

# Step 6: Check Resend dashboard (manual step)
echo "💼 Step 6: Manual Resend Dashboard Check"
echo "----------------------------------------"
echo "Please manually check your Resend dashboard:"
echo "1. Go to: https://resend.com/dashboard"
echo "2. Navigate to 'Logs' section"
echo "3. Look for recent email attempts to: $TEST_EMAIL"
echo "4. Check if emails are being sent successfully"
echo

# Step 7: Monitor logs in real-time
echo "📊 Step 7: Real-time log monitoring"
echo "-----------------------------------"
echo "To monitor logs in real-time for email attempts:"
echo

if docker ps | grep -q openlearn-backend; then
    echo "Docker monitoring:"
    echo "docker logs openlearn-backend-app-1 -f | grep -i 'email\\|resend\\|password'"
elif systemctl is-active --quiet openlearn-backend 2>/dev/null; then
    echo "Systemd monitoring:"
    echo "journalctl -u openlearn-backend -f | grep -i 'email\\|resend\\|password'"
else
    echo "Manual monitoring:"
    echo "tail -f /var/log/your-app/*.log | grep -i 'email\\|resend\\|password'"
fi
echo

# Summary
echo "📋 Debug Summary"
echo "==============="
echo "✅ Environment variables checked"
echo "✅ Application status verified"
echo "✅ Recent logs reviewed"
echo "✅ Email service tested directly"
echo "✅ API endpoint tested"
echo "⏳ Manual Resend dashboard check required"
echo
echo "🎯 Next Steps:"
echo "1. Check your email inbox (including spam folder) for the test email"
echo "2. Review Resend dashboard for delivery status"
echo "3. If issues persist, check the specific error messages above"
echo
echo "💡 Common Issues:"
echo "- Template file not found (check template paths)"
echo "- Invalid Resend API key (verify in dashboard)"
echo "- Domain not verified (check domain settings)"
echo "- Rate limiting (wait and try again)"
echo
echo "📞 For more help, share the output of this script!"
