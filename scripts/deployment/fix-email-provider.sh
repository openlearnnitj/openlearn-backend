#!/bin/bash
# Quick fix script for email provider issue
# Run this on your production server

set -e  # Exit on error

echo "=========================================="
echo "Email Provider Fix Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in the correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: docker-compose.yml not found in current directory${NC}"
    echo "Please run this script from the openlearn-backend directory"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking current environment${NC}"
echo "----------------------------------------"
if [ -f ".env" ]; then
    echo "Current EMAIL_PROVIDER in .env:"
    grep "EMAIL_PROVIDER" .env || echo "  (not found)"
else
    echo -e "${RED}Warning: .env file not found${NC}"
fi
echo ""

echo -e "${YELLOW}Step 2: Checking docker-compose.yml${NC}"
echo "----------------------------------------"
if grep -q "EMAIL_PROVIDER" docker-compose.yml; then
    echo -e "${GREEN}✓ EMAIL_PROVIDER found in docker-compose.yml${NC}"
else
    echo -e "${RED}✗ EMAIL_PROVIDER NOT found in docker-compose.yml${NC}"
    echo "You need to update docker-compose.yml to include EMAIL_PROVIDER"
    echo "Please pull the latest changes from the repository"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 3: Backing up current configuration${NC}"
echo "----------------------------------------"
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

echo -e "${YELLOW}Step 4: Stopping containers${NC}"
echo "----------------------------------------"
docker-compose down
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

echo -e "${YELLOW}Step 5: Rebuilding and starting containers${NC}"
echo "----------------------------------------"
docker-compose up -d --build
echo -e "${GREEN}✓ Containers rebuilt and started${NC}"
echo ""

echo -e "${YELLOW}Step 6: Waiting for services to start...${NC}"
sleep 10
echo ""

echo -e "${YELLOW}Step 7: Verifying email provider${NC}"
echo "----------------------------------------"
echo "Checking logs for email provider initialization..."
docker-compose logs app | grep -i "EmailProviderFactory" | tail -5 || echo "No logs found yet"
echo ""
echo "Checking environment variable in container..."
docker-compose exec -T app sh -c 'echo $EMAIL_PROVIDER' || echo "Could not check"
echo ""

echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Monitor logs: docker-compose logs -f app"
echo "2. Test email sending through your API"
echo "3. Verify emails are sent via Resend"
echo ""
echo "If you still see issues, check:"
echo "  - docker-compose logs app | grep -i email"
echo "  - docker-compose exec app env | grep EMAIL"
