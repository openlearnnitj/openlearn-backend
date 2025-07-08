#!/bin/bash

set -e

echo "Starting deployment..."

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
npx prisma migrate deploy

echo "Deployment finished successfully!"
