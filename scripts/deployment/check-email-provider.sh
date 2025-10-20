#!/bin/bash
# Script to check and fix EMAIL_PROVIDER environment variable

echo "=== Email Provider Environment Check ==="
echo ""

# Check if EMAIL_PROVIDER is set in environment
if [ -n "$EMAIL_PROVIDER" ]; then
    echo "✓ EMAIL_PROVIDER is set in environment: $EMAIL_PROVIDER"
else
    echo "✗ EMAIL_PROVIDER is NOT set in environment"
fi

echo ""
echo "=== Checking .env file ==="

# Find .env file
if [ -f ".env" ]; then
    echo "✓ Found .env file in current directory"
    echo ""
    echo "Current EMAIL_PROVIDER in .env:"
    grep "EMAIL_PROVIDER" .env || echo "  (not found in .env)"
else
    echo "✗ No .env file found in current directory"
fi

echo ""
echo "=== Available Email Provider Configurations ==="
echo ""
echo "Found in .env or environment:"
echo "  - RESEND_API_KEY: $([ -n "$RESEND_API_KEY" ] && echo '✓ Set' || echo '✗ Not set')"
echo "  - MAILTRAP_API_TOKEN: $([ -n "$MAILTRAP_API_TOKEN" ] && echo '✓ Set' || echo '✗ Not set')"
echo "  - SES_ACCESS_KEY_ID: $([ -n "$SES_ACCESS_KEY_ID" ] && echo '✓ Set' || echo '✗ Not set')"

echo ""
echo "=== Recommended Actions ==="
echo ""
echo "To use RESEND (recommended):"
echo "  1. Edit .env file: nano .env"
echo "  2. Set: EMAIL_PROVIDER=resend"
echo "  3. Restart: docker-compose restart app"
echo ""
echo "Or set environment variable directly:"
echo "  export EMAIL_PROVIDER=resend"
echo "  docker-compose restart app"
