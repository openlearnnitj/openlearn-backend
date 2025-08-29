#!/bin/bash

# Test Mailtrap Email Provider Integration
# This script tests the Mailtrap email provider functionality

echo "🚀 Testing Mailtrap Email Provider Integration"
echo "=============================================="

# Test environment setup
echo "📧 Current EMAIL_PROVIDER: $(grep EMAIL_PROVIDER .env | cut -d'=' -f2)"
echo "🔑 Mailtrap API Token: $(grep MAILTRAP_API_TOKEN .env | cut -d'=' -f2 | cut -c1-8)..."

# Test 1: Email provider factory
echo
echo "📋 Test 1: Email Provider Factory"
echo "--------------------------------"
curl -s -X POST "http://localhost:3000/api/debug/test-email-provider" \
  -H "Content-Type: application/json" \
  -d '{"provider": "mailtrap"}' | jq .

# Test 2: Connection test
echo
echo "📋 Test 2: Mailtrap Connection Test" 
echo "----------------------------------"
curl -s -X GET "http://localhost:3000/api/debug/test-email-connection" | jq .

# Test 3: Send test email
echo
echo "📋 Test 3: Send Test Email via Mailtrap"
echo "---------------------------------------"
curl -s -X POST "http://localhost:3000/api/debug/send-test-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@openlearn.org.in",
    "subject": "Mailtrap Integration Test",
    "html": "<h1>Test Email</h1><p>This is a test email sent via Mailtrap provider.</p>",
    "text": "Test Email\n\nThis is a test email sent via Mailtrap provider."
  }' | jq .

# Test 4: Monitoring health check (includes email service)
echo
echo "📋 Test 4: Health Check (Email Service)"
echo "---------------------------------------"
curl -s -H "X-API-Secret: $(grep MONITORING_API_SECRET .env | cut -d'=' -f2 | tr -d '"')" \
  "http://localhost:3000/api/monitoring/health-status" | jq '.components[] | select(.name == "email_service")'

echo
echo "✅ Mailtrap integration testing complete!"
echo "Check your Mailtrap inbox for the test email."
