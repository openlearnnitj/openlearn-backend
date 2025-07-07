#!/bin/bash

# OpenLearn Backend - File Organization Script
# This script cleans up and organizes the project structure

echo "🧹 Organizing OpenLearn Backend Project Structure..."

# Create clean directory structure
mkdir -p {deployment/{docker,scripts,nginx},environments,docs,logs,uploads}

# Move deployment files to proper locations
echo "📁 Moving deployment files..."

# Move Docker Compose files
mv docker-compose.micro.yml deployment/docker/ 2>/dev/null || true
mv docker-compose.production.yml deployment/docker/ 2>/dev/null || true
cp docker-compose.yml deployment/docker/docker-compose.dev.yml 2>/dev/null || true

# Move scripts
mv deploy-micro.sh deployment/scripts/ 2>/dev/null || true
mv restart-deployment.sh deployment/scripts/ 2>/dev/null || true
mv load-env.sh deployment/scripts/ 2>/dev/null || true

# Move Nginx config if exists
mv deployment/nginx/* deployment/nginx/ 2>/dev/null || true

# Move environment files
mv .env.micro environments/ 2>/dev/null || true
mv environments/.env.* environments/ 2>/dev/null || true

# Move PostgreSQL config
mv postgres-low-memory.conf deployment/docker/ 2>/dev/null || true

# Clean up duplicate files
echo "🗑️  Removing duplicates and unnecessary files..."
rm -f docker-compose.*.yml 2>/dev/null || true
rm -f deploy-*.sh 2>/dev/null || true
rm -f load-env.sh restart-deployment.sh 2>/dev/null || true

# Remove old deployment folders
rm -rf docker 2>/dev/null || true

echo "✅ File organization complete!"
echo ""
echo "📁 New project structure:"
echo "├── deployment/"
echo "│   ├── docker/"
echo "│   │   ├── docker-compose.micro.yml"
echo "│   │   ├── docker-compose.production.yml"
echo "│   │   └── postgres-low-memory.conf"
echo "│   ├── scripts/"
echo "│   │   ├── deploy-micro.sh"
echo "│   │   └── restart-deployment.sh"
echo "│   └── nginx/"
echo "├── environments/"
echo "│   └── .env.micro"
echo "├── src/"
echo "├── prisma/"
echo "└── package.json"
