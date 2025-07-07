#!/bin/bash

# OpenLearn Backend - Simple Deployment Script
# This script runs the micro deployment from the project root

echo "🚀 OpenLearn Backend - Micro Instance Deployment"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Make deployment script executable
chmod +x deployment/scripts/deploy-micro.sh

# Run the deployment
cd "$(dirname "$0")"
./deployment/scripts/deploy-micro.sh

echo ""
echo "🔗 Quick Access Commands:"
echo "   View status: docker-compose -f deployment/docker/docker-compose.micro.yml ps"
echo "   View logs: docker-compose -f deployment/docker/docker-compose.micro.yml logs -f"
echo "   Test API: curl http://localhost:3000/health"
