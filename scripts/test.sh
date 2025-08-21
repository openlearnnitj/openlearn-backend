#!/usr/bin/env bash

# OpenLearn Backend Testing Helper
# Usage: ./scripts/test.sh [flow_type]

set -e

API_BASE_URL=${API_BASE_URL:-"http://localhost:3000/api"}
FLOW_TYPE=${1:-"quick"}

echo "🚀 OpenLearn API Testing Helper"
echo "Base URL: $API_BASE_URL"
echo "Flow Type: $FLOW_TYPE"
echo ""

# Check if server is running
if ! curl -s "$API_BASE_URL/../health" > /dev/null; then
    echo "❌ Server not running at $API_BASE_URL"
    echo "💡 Start the server with: npm run dev"
    exit 1
fi

# Run the test flow
case $FLOW_TYPE in
    "quick")
        echo "⚡ Running quick user setup..."
        npx tsx src/scripts/testApiFlows.ts --flow=quick
        ;;
    "migration")
        echo "🔄 Running migration flow..."
        npx tsx src/scripts/testApiFlows.ts --flow=migration
        ;;
    "registration")
        echo "👤 Running registration flow..."
        npx tsx src/scripts/testApiFlows.ts --flow=registration
        ;;
    "admin")
        echo "🔐 Running admin flow..."
        npx tsx src/scripts/testApiFlows.ts --flow=admin
        ;;
    "email")
        echo "📧 Running email verification flow..."
        npx tsx src/scripts/testApiFlows.ts --flow=email
        ;;
    "full")
        echo "🎯 Running complete flow test..."
        npx tsx src/scripts/testApiFlows.ts --flow=full
        ;;
    *)
        echo "❌ Unknown flow type: $FLOW_TYPE"
        echo ""
        echo "Available flows:"
        echo "  quick       - Quick user setup (30s)"
        echo "  migration   - Migration testing"
        echo "  registration- Registration & approval flow"
        echo "  admin       - Admin functionality tests"
        echo "  email       - Email verification flow"
        echo "  full        - Complete test suite"
        exit 1
        ;;
esac
