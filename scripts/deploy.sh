#!/bin/bash

set -e

echo "Starting deployment..."

# Load environment variables for docker-compose
set -a
source ../.env
set +a

# Pull the latest code
git pull

# Install dependencies
npm install

# Build the application
npm run build

# Restart the containers
docker-compose down
docker-compose up -d --build

# Run database migrations
docker-compose exec -T app npx prisma migrate deploy --schema prisma/schema.prisma

echo "Deployment finished successfully!"
